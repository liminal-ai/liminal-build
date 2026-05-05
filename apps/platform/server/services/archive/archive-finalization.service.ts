import type {
  ArchiveBodyFormat,
  ArchiveEntry,
  ArchiveEntryKind,
  ProcessHistoryItem,
} from '../../../shared/contracts/index.js';
import type { ArchiveEntryWriteInput, PlatformStore } from '../projects/platform-store.js';
import {
  buildHistoryItemArchiveFinalizationKey,
  ProcessHistoryCompatService,
} from './process-history-compat.service.js';

export class ArchiveFinalizationService {
  constructor(
    private readonly platformStore: Pick<
      PlatformStore,
      'appendArchiveEntry' | 'listArchiveEntries'
    >,
    private readonly processHistoryCompatService = new ProcessHistoryCompatService(),
  ) {}

  async appendFinalizedEntry(args: ArchiveEntryWriteInput): Promise<ArchiveEntry> {
    const finalizationKey = args.finalizationKey.trim();
    const sourceObjectId = normalizeOptionalString(args.sourceObjectId);
    const relatedToolCallId = normalizeOptionalString(args.relatedToolCallId);

    if (finalizationKey.length === 0) {
      throw new Error('Finalized archive entries require a non-empty finalizationKey.');
    }

    if (sourceObjectId === null) {
      throw new Error(`Finalized ${args.entryKind} entries require a sourceObjectId.`);
    }

    if (
      (args.entryKind === 'tool_call' || args.entryKind === 'tool_result') &&
      relatedToolCallId === null
    ) {
      throw new Error(`Finalized ${args.entryKind} entries require relatedToolCallId.`);
    }

    return this.platformStore.appendArchiveEntry({
      ...args,
      finalizationKey,
      sourceObjectId,
      relatedToolCallId,
      bodyText: args.bodyText ?? null,
      bodyData: args.bodyData ?? null,
      relatedArtifactVersionId: args.relatedArtifactVersionId ?? null,
      relatedSourceProvenanceId: args.relatedSourceProvenanceId ?? null,
      entryStatus: args.entryStatus ?? 'ready',
      degradationReason: args.degradationReason ?? null,
      recordedAt: args.recordedAt,
    });
  }

  async appendFromProcessHistoryItem(args: {
    projectId: string;
    processId: string;
    historyItem: ProcessHistoryItem;
  }): Promise<ArchiveEntry | null> {
    const entryKind = this.processHistoryCompatService.mapHistoryKindToArchiveKind(
      args.historyItem.kind,
    );

    if (args.historyItem.lifecycleState !== 'finalized' || entryKind === null) {
      return null;
    }

    const bodyFormat = toBodyFormat(args.historyItem.text);
    const sourceObjectId = args.historyItem.historyItemId;

    if (entryKind === 'user_message') {
      const existingAcceptedResponse = await this.findExistingEntryBySourceObjectId({
        processId: args.processId,
        entryKind,
        sourceObjectId,
      });

      if (existingAcceptedResponse !== null) {
        return existingAcceptedResponse;
      }
    }

    return this.appendFinalizedEntry({
      projectId: args.projectId,
      processId: args.processId,
      entryKind,
      finalizationKey: buildHistoryItemArchiveFinalizationKey({
        entryKind,
        sourceObjectId,
      }),
      sourceObjectId,
      bodyText: bodyFormat === 'none' ? null : args.historyItem.text,
      bodyData: null,
      bodyFormat,
      relatedArtifactVersionId: null,
      relatedSourceProvenanceId: null,
      relatedToolCallId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: args.historyItem.createdAt,
    });
  }

  private async findExistingEntryBySourceObjectId(args: {
    processId: string;
    entryKind: ArchiveEntryKind;
    sourceObjectId: string;
  }): Promise<ArchiveEntry | null> {
    let cursor: string | null = null;

    do {
      const page = await this.platformStore.listArchiveEntries({
        processId: args.processId,
        cursor,
        limit: 200,
      });
      const existingEntry =
        page.entries.find(
          (entry) =>
            entry.entryKind === args.entryKind && entry.sourceObjectId === args.sourceObjectId,
        ) ?? null;

      if (existingEntry !== null) {
        return existingEntry;
      }

      cursor = page.page.nextCursor;
    } while (cursor !== null);

    return null;
  }
}

function toBodyFormat(text: string): ArchiveBodyFormat {
  return text.trim().length > 0 ? 'plain_text' : 'none';
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
