import type {
  ArchiveEntry,
  ArchivePage,
  ArchiveTurnPage,
  DerivedTurn,
} from '../../../shared/contracts/index.js';
import { archiveTurnPageSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { invalidArchiveRequestErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { SourceProvenanceService } from '../sources/source-provenance.service.js';
import { enrichArchiveEntries } from './archive-entry-enrichment.js';

const DEFAULT_TURN_PAGE_LIMIT = 50;
const MAX_TURN_PAGE_LIMIT = 100;
const ARCHIVE_REBUILD_PAGE_LIMIT = 200;

type DraftTurn = {
  archiveEntryIds: string[];
  degradationReasons: string[];
  endedAt: string;
  processId: string;
  startedAt: string;
  turnId: string;
  turnIndex: number;
};

export interface TurnDerivationService {
  rebuildTurns(args: { projectId: string; processId: string }): Promise<DerivedTurn[]>;
  getTurns(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchiveTurnPage>;
}

export class DefaultTurnDerivationService implements TurnDerivationService {
  constructor(
    private readonly platformStore: Pick<
      PlatformStore,
      'getArtifactVersion' | 'listArchiveEntries' | 'listArchiveTurns' | 'upsertArchiveTurns'
    >,
    private readonly processAccessService: Pick<ProcessAccessService, 'assertProcessAccess'>,
    private readonly sourceProvenanceService?: Pick<
      SourceProvenanceService,
      'listProcessSourceProvenance'
    >,
  ) {}

  async rebuildTurns(args: { projectId: string; processId: string }): Promise<DerivedTurn[]> {
    const entries = await listAllArchiveEntries(this.platformStore, args.processId);
    const enrichedEntries = await enrichArchiveEntries({
      entries,
      projectId: args.projectId,
      processId: args.processId,
      platformStore: this.platformStore,
      sourceProvenanceService: this.sourceProvenanceService,
    });
    const turns = deriveTurnsFromArchiveEntries(enrichedEntries, args.processId);

    await this.platformStore.upsertArchiveTurns({
      projectId: args.projectId,
      processId: args.processId,
      turns,
    });

    return turns;
  }

  async getTurns(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    cursor?: string | null;
    limit?: number;
  }): Promise<ArchiveTurnPage> {
    await this.processAccessService.assertProcessAccess({
      actor: args.actor,
      projectId: args.projectId,
      processId: args.processId,
    });

    const cursor = normalizeTurnCursor(args.cursor);
    const limit = normalizeTurnLimit(args.limit);
    const storedPage = await this.platformStore.listArchiveTurns({
      processId: args.processId,
      cursor,
      limit,
    });

    if (cursor !== null) {
      return archiveTurnPageSchema.parse(storedPage);
    }

    if (storedPage.turns.length > 0) {
      return archiveTurnPageSchema.parse(storedPage);
    }

    if (await hasStoredTurns(this.platformStore, args.processId)) {
      return archiveTurnPageSchema.parse(storedPage);
    }

    if (!(await hasArchiveEntries(this.platformStore, args.processId))) {
      return archiveTurnPageSchema.parse(storedPage);
    }

    await this.warmTurnsCacheOnMiss({
      projectId: args.projectId,
      processId: args.processId,
    });

    const rebuiltPage = await this.platformStore.listArchiveTurns({
      processId: args.processId,
      cursor,
      limit,
    });

    return archiveTurnPageSchema.parse(rebuiltPage);
  }

  private async warmTurnsCacheOnMiss(args: {
    projectId: string;
    processId: string;
  }): Promise<void> {
    await this.rebuildTurns(args);
  }
}

async function hasStoredTurns(
  platformStore: Pick<PlatformStore, 'listArchiveTurns'>,
  processId: string,
): Promise<boolean> {
  const firstPage = await platformStore.listArchiveTurns({
    processId,
    cursor: null,
    limit: 1,
  });

  return firstPage.turns.length > 0;
}

async function hasArchiveEntries(
  platformStore: Pick<PlatformStore, 'listArchiveEntries'>,
  processId: string,
): Promise<boolean> {
  const firstPage = await platformStore.listArchiveEntries({
    processId,
    cursor: null,
    limit: 1,
  });

  return firstPage.entries.length > 0;
}

async function listAllArchiveEntries(
  platformStore: Pick<PlatformStore, 'listArchiveEntries'>,
  processId: string,
): Promise<ArchiveEntry[]> {
  const entries: ArchiveEntry[] = [];
  let cursor: string | null = null;

  for (;;) {
    const page: ArchivePage = await platformStore.listArchiveEntries({
      processId,
      cursor,
      limit: ARCHIVE_REBUILD_PAGE_LIMIT,
    });
    entries.push(...page.entries);

    if (!page.page.hasMore || page.page.nextCursor === null) {
      break;
    }

    cursor = page.page.nextCursor;
  }

  return entries.sort((left, right) => left.sequence - right.sequence);
}

export function deriveTurnsFromArchiveEntries(
  entries: ArchiveEntry[],
  processId: string,
): DerivedTurn[] {
  const drafts: DraftTurn[] = [];
  const toolCallTurnIndexes = new Map<string, number>();
  let activeTurn: DraftTurn | null = null;

  const createTurn = (): DraftTurn => {
    const turnIndex = drafts.length;
    const nextTurn: DraftTurn = {
      archiveEntryIds: [],
      degradationReasons: [],
      endedAt: '',
      processId,
      startedAt: '',
      turnId: `${processId}:turn:${turnIndex}`,
      turnIndex,
    };
    drafts.push(nextTurn);
    activeTurn = nextTurn;
    return nextTurn;
  };

  const ensureActiveTurn = (): DraftTurn => activeTurn ?? createTurn();

  const attachEntry = (turn: DraftTurn, entry: ArchiveEntry): void => {
    turn.archiveEntryIds.push(entry.archiveEntryId);
    if (turn.startedAt.length === 0 || entry.recordedAt < turn.startedAt) {
      turn.startedAt = entry.recordedAt;
    }
    if (turn.endedAt.length === 0 || entry.recordedAt > turn.endedAt) {
      turn.endedAt = entry.recordedAt;
    }

    if (entry.entryStatus === 'degraded') {
      addDegradationReason(
        turn,
        entry.degradationReason ?? `Archive entry ${entry.archiveEntryId} is degraded.`,
      );
    }
  };

  for (const entry of entries) {
    if (entry.entryKind === 'user_message') {
      const lastDraft = drafts[drafts.length - 1];
      const hasActiveEntries = lastDraft !== undefined && lastDraft.archiveEntryIds.length > 0;
      const targetTurn = hasActiveEntries ? createTurn() : ensureActiveTurn();
      attachEntry(targetTurn, entry);
      continue;
    }

    if (entry.entryKind === 'tool_result') {
      const correlationKey = entry.relatedToolCallId ?? entry.sourceObjectId;
      if (correlationKey !== null) {
        const correlatedTurnIndex = toolCallTurnIndexes.get(correlationKey);
        if (correlatedTurnIndex !== undefined) {
          const correlatedTurn = drafts[correlatedTurnIndex];
          if (correlatedTurn !== undefined) {
            attachEntry(correlatedTurn, entry);
            continue;
          }
        }
      }

      const fallbackTurn = ensureActiveTurn();
      attachEntry(fallbackTurn, entry);
      addDegradationReason(
        fallbackTurn,
        correlationKey === null
          ? `Tool result ${entry.archiveEntryId} is missing related tool-call context.`
          : `Tool result ${entry.archiveEntryId} could not match tool call ${correlationKey}.`,
      );
      continue;
    }

    const targetTurn = ensureActiveTurn();
    attachEntry(targetTurn, entry);

    if (entry.entryKind === 'tool_call') {
      const correlationKey = entry.relatedToolCallId ?? entry.sourceObjectId;
      if (correlationKey !== null) {
        toolCallTurnIndexes.set(correlationKey, targetTurn.turnIndex);
      } else {
        addDegradationReason(
          targetTurn,
          `Tool call ${entry.archiveEntryId} is missing stable correlation metadata.`,
        );
      }
    }
  }

  return drafts.map((draft) => ({
    turnId: draft.turnId,
    processId: draft.processId,
    turnIndex: draft.turnIndex,
    archiveEntryIds: draft.archiveEntryIds,
    startedAt: draft.startedAt,
    endedAt: draft.endedAt,
    turnStatus: draft.degradationReasons.length > 0 ? 'degraded' : 'ready',
    degradationReason:
      draft.degradationReasons.length > 0 ? draft.degradationReasons.join(' ') : null,
  }));
}

function addDegradationReason(turn: DraftTurn, reason: string): void {
  if (turn.degradationReasons.includes(reason)) {
    return;
  }

  turn.degradationReasons.push(reason);
}

function normalizeTurnCursor(cursor: string | null | undefined): string | null {
  if (cursor === undefined || cursor === null) {
    return null;
  }

  if (!/^\d+$/.test(cursor)) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return cursor;
}

function normalizeTurnLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_TURN_PAGE_LIMIT;
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_TURN_PAGE_LIMIT) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return limit;
}
