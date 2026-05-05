import type {
  ArchiveEntry,
  ArchivePage,
  DerivedArchiveView,
  DerivedArchiveViewListResponse,
  DerivedArchiveViewRefreshResponse,
  DerivedTurn,
} from '../../../shared/contracts/index.js';
import {
  derivedArchiveViewListResponseSchema,
  derivedArchiveViewRefreshResponseSchema,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import {
  archiveDerivationConflictErrorCode,
  invalidArchiveRequestErrorCode,
} from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { TurnDerivationService } from './turn-derivation.service.js';

const ARCHIVE_REBUILD_PAGE_LIMIT = 200;
const CHUNK_CANDIDATE_GROUP_SIZE = 2;
const MAX_DERIVED_ARCHIVE_VIEWS = 50;

export interface DerivedArchiveViewService {
  listViews(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<DerivedArchiveViewListResponse>;
  refreshViews(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<DerivedArchiveViewRefreshResponse>;
}

export class DefaultDerivedArchiveViewService implements DerivedArchiveViewService {
  constructor(
    private readonly platformStore: Pick<
      PlatformStore,
      'listArchiveEntries' | 'listDerivedArchiveViews' | 'replaceDerivedArchiveViews'
    >,
    private readonly turnDerivationService: Pick<TurnDerivationService, 'rebuildTurns'>,
    private readonly processAccessService: Pick<ProcessAccessService, 'assertProcessAccess'>,
  ) {}

  async listViews(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<DerivedArchiveViewListResponse> {
    await this.processAccessService.assertProcessAccess({
      actor: args.actor,
      projectId: args.projectId,
      processId: args.processId,
    });

    try {
      const turns = await this.turnDerivationService.rebuildTurns({
        projectId: args.projectId,
        processId: args.processId,
      });
      const views = limitDerivedArchiveViews(buildDerivedArchiveViews(turns, args.processId));

      await this.platformStore.replaceDerivedArchiveViews({
        projectId: args.projectId,
        processId: args.processId,
        views,
      });

      return derivedArchiveViewListResponseSchema.parse({ views });
    } catch (error) {
      const storedViews = await this.platformStore.listDerivedArchiveViews({
        processId: args.processId,
      });
      if (storedViews.length > 0) {
        return derivedArchiveViewListResponseSchema.parse({
          views: limitDerivedArchiveViews(storedViews),
        });
      }

      throw error;
    }
  }

  async refreshViews(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<DerivedArchiveViewRefreshResponse> {
    await this.processAccessService.assertProcessAccess({
      actor: args.actor,
      projectId: args.projectId,
      processId: args.processId,
    });

    const archiveSignatureBeforeRefresh = await computeArchiveSignature(
      this.platformStore,
      args.processId,
    );
    const turns = await this.turnDerivationService.rebuildTurns({
      projectId: args.projectId,
      processId: args.processId,
    });
    const archiveSignatureAfterTurnRebuild = await computeArchiveSignature(
      this.platformStore,
      args.processId,
    );

    if (archiveSignatureAfterTurnRebuild !== archiveSignatureBeforeRefresh) {
      throw new AppError({
        code: archiveDerivationConflictErrorCode,
        message: 'Derived views could not be refreshed safely from the current archive state.',
        statusCode: 409,
      });
    }

    const views = limitDerivedArchiveViews(buildDerivedArchiveViews(turns, args.processId));
    await this.platformStore.replaceDerivedArchiveViews({
      projectId: args.projectId,
      processId: args.processId,
      views,
    });

    const archiveSignatureAfterRefresh = await computeArchiveSignature(
      this.platformStore,
      args.processId,
    );

    if (archiveSignatureAfterRefresh !== archiveSignatureBeforeRefresh) {
      throw new AppError({
        code: archiveDerivationConflictErrorCode,
        message: 'Derived views could not be refreshed safely from the current archive state.',
        statusCode: 409,
      });
    }

    return derivedArchiveViewRefreshResponseSchema.parse({
      views,
      refreshStatus: views.some((view) => view.viewStatus === 'degraded') ? 'degraded' : 'settled',
    });
  }
}

async function computeArchiveSignature(
  platformStore: Pick<PlatformStore, 'listArchiveEntries'>,
  processId: string,
): Promise<string> {
  const entries = await listAllArchiveEntries(platformStore, processId);

  return entries
    .map((entry) => `${entry.archiveEntryId}:${entry.sequence}:${entry.recordedAt}`)
    .join('|');
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

    cursor = normalizeArchiveCursor(page.page.nextCursor);
  }

  return entries.sort((left, right) => left.sequence - right.sequence);
}

function buildDerivedArchiveViews(turns: DerivedTurn[], processId: string): DerivedArchiveView[] {
  if (turns.length === 0) {
    return [];
  }

  const now = Date.now();
  const turnRangeViews = turns.map((turn, index) =>
    buildStructuralView({
      processId,
      viewKind: 'turn_range',
      rangeTurns: [turn],
      updatedAt: new Date(now - index).toISOString(),
    }),
  );
  const chunkCandidateViews = groupTurnsForChunkCandidates(turns).map((group, index) =>
    buildStructuralView({
      processId,
      viewKind: 'chunk_candidate',
      rangeTurns: group,
      updatedAt: new Date(now - turnRangeViews.length - index).toISOString(),
    }),
  );

  return [...turnRangeViews, ...chunkCandidateViews];
}

function limitDerivedArchiveViews(views: DerivedArchiveView[]): DerivedArchiveView[] {
  return views.slice(0, MAX_DERIVED_ARCHIVE_VIEWS);
}

function groupTurnsForChunkCandidates(turns: DerivedTurn[]): DerivedTurn[][] {
  const groups: DerivedTurn[][] = [];

  for (let index = 0; index < turns.length; index += CHUNK_CANDIDATE_GROUP_SIZE) {
    groups.push(turns.slice(index, index + CHUNK_CANDIDATE_GROUP_SIZE));
  }

  return groups;
}

function buildStructuralView(args: {
  processId: string;
  viewKind: DerivedArchiveView['viewKind'];
  rangeTurns: DerivedTurn[];
  updatedAt: string;
}): DerivedArchiveView {
  const firstTurn = args.rangeTurns[0];
  const lastTurn = args.rangeTurns[args.rangeTurns.length - 1];

  if (firstTurn === undefined || lastTurn === undefined) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Derived archive views require at least one source turn.',
      statusCode: 422,
    });
  }

  const turnRange = {
    startIndex: firstTurn.turnIndex,
    endIndex: lastTurn.turnIndex,
  };
  const label =
    args.viewKind === 'turn_range'
      ? formatTurnRangeLabel(turnRange.startIndex, turnRange.endIndex)
      : formatChunkCandidateLabel(turnRange.startIndex, turnRange.endIndex);
  const degradationReasons = dedupeStrings(
    args.rangeTurns
      .filter((turn) => turn.turnStatus === 'degraded')
      .map(
        (turn) =>
          turn.degradationReason ?? `Turn ${turn.turnIndex} degraded during derived-view refresh.`,
      ),
  );
  const hasGap = !args.rangeTurns.every((turn, index) =>
    index === 0 ? true : turn.turnIndex === firstTurn.turnIndex + index,
  );

  if (hasGap) {
    degradationReasons.push(
      `Turn indexes ${turnRange.startIndex}-${turnRange.endIndex} were not contiguous during derived-view refresh.`,
    );
  }

  return {
    derivedViewId: `${args.processId}:derived-view:${args.viewKind}:${turnRange.startIndex}-${turnRange.endIndex}`,
    processId: args.processId,
    viewKind: args.viewKind,
    turnRange,
    sourceTurnIds: args.rangeTurns.map((turn) => turn.turnId),
    sourceArchiveEntryIds: dedupeStrings(args.rangeTurns.flatMap((turn) => turn.archiveEntryIds)),
    title: label,
    bodyText: label,
    viewStatus: degradationReasons.length > 0 ? 'degraded' : 'ready',
    degradationReason: degradationReasons.length > 0 ? degradationReasons.join(' ') : null,
    updatedAt: args.updatedAt,
  };
}

function formatTurnRangeLabel(startIndex: number, endIndex: number): string {
  return startIndex === endIndex ? `Turn ${startIndex}` : `Turns ${startIndex}-${endIndex}`;
}

function formatChunkCandidateLabel(startIndex: number, endIndex: number): string {
  return startIndex === endIndex
    ? `Chunk candidate turn ${startIndex}`
    : `Chunk candidate turns ${startIndex}-${endIndex}`;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeArchiveCursor(cursor: string): string {
  if (!/^\d+$/.test(cursor)) {
    throw new AppError({
      code: invalidArchiveRequestErrorCode,
      message: 'Archive pagination parameters were invalid.',
      statusCode: 422,
    });
  }

  return cursor;
}
