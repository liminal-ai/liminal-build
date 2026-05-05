import type {
  ArchiveBodyFormat,
  ArchiveEntryKind,
  ProcessHistoryItem,
} from '../../../shared/contracts/index.js';
import type { ArchiveEntryWriteInput } from '../projects/platform-store.js';

const compatibleHistoryKindToArchiveKind = {
  user_message: 'user_message',
  process_message: 'model_message',
  process_event: 'process_event',
} as const satisfies Partial<Record<ProcessHistoryItem['kind'], ArchiveEntryKind>>;

export class ProcessHistoryCompatService {
  mapHistoryKindToArchiveKind(kind: ProcessHistoryItem['kind']): ArchiveEntryKind | null {
    if (kind in compatibleHistoryKindToArchiveKind) {
      return compatibleHistoryKindToArchiveKind[
        kind as keyof typeof compatibleHistoryKindToArchiveKind
      ];
    }

    return null;
  }

  mapHistoryItemToArchiveSeed(args: {
    projectId: string;
    processId: string;
    historyItem: ProcessHistoryItem;
  }): ArchiveEntryWriteInput | null {
    const entryKind = this.mapHistoryKindToArchiveKind(args.historyItem.kind);

    if (args.historyItem.lifecycleState !== 'finalized' || entryKind === null) {
      return null;
    }

    const bodyFormat: ArchiveBodyFormat =
      args.historyItem.text.trim().length > 0 ? 'plain_text' : 'none';

    return {
      projectId: args.projectId,
      processId: args.processId,
      entryKind,
      finalizationKey: buildHistoryItemArchiveFinalizationKey({
        entryKind,
        sourceObjectId: args.historyItem.historyItemId,
      }),
      sourceObjectId: args.historyItem.historyItemId,
      bodyText: bodyFormat === 'none' ? null : args.historyItem.text,
      bodyData: null,
      bodyFormat,
      relatedArtifactVersionId: null,
      relatedSourceProvenanceId: null,
      relatedToolCallId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: args.historyItem.createdAt,
    };
  }
}

export function buildHistoryItemArchiveFinalizationKey(args: {
  entryKind: ArchiveEntryKind;
  sourceObjectId: string;
}): string {
  switch (args.entryKind) {
    case 'user_message':
      return buildAcceptedUserResponseArchiveFinalizationKey(args.sourceObjectId);
    case 'model_message':
      return `model:${args.sourceObjectId}`;
    case 'process_event':
      return `event:${args.sourceObjectId}`;
    default:
      return `history:${args.sourceObjectId}`;
  }
}

export function buildAcceptedUserResponseArchiveFinalizationKey(historyItemId: string): string {
  return `response:${historyItemId}`;
}
