import type {
  ProcessSourceReference,
  SourceAttachmentSummary,
} from '../../../shared/contracts/index.js';

function isUnavailableSourceAttachment(sourceAttachment: SourceAttachmentSummary): boolean {
  return sourceAttachment.hydrationState === 'unavailable';
}

export function buildSourceAttachmentReadSummary(
  sourceAttachment: SourceAttachmentSummary,
): SourceAttachmentSummary {
  if (!isUnavailableSourceAttachment(sourceAttachment)) {
    return sourceAttachment;
  }

  const {
    refreshStatus: _refreshStatus,
    refreshRequestedAt: _refreshRequestedAt,
    ...safeSource
  } = sourceAttachment;

  return {
    ...safeSource,
    lastHydratedAt: null,
    lastHydratedResolvedRef: null,
    lastObservedRemoteResolvedRef: null,
    freshnessReason: null,
  };
}

export function buildProcessSourceReadReference(
  sourceAttachment: SourceAttachmentSummary,
): ProcessSourceReference {
  const safeSourceAttachment = buildSourceAttachmentReadSummary(sourceAttachment);

  return {
    sourceAttachmentId: safeSourceAttachment.sourceAttachmentId,
    displayName: safeSourceAttachment.displayName,
    purpose: safeSourceAttachment.purpose,
    accessMode: safeSourceAttachment.accessMode,
    repositoryUrl: safeSourceAttachment.repositoryUrl,
    repositoryFullName: safeSourceAttachment.repositoryFullName,
    attachmentScope: safeSourceAttachment.attachmentScope,
    targetRef: safeSourceAttachment.targetRef,
    hydrationState: safeSourceAttachment.hydrationState,
    ...(safeSourceAttachment.hydrationState === 'unavailable'
      ? {}
      : {
          ...(safeSourceAttachment.lastHydratedAt === null
            ? {}
            : { lastHydratedAt: safeSourceAttachment.lastHydratedAt }),
          ...(safeSourceAttachment.freshnessReason === null
            ? {}
            : { freshnessReason: safeSourceAttachment.freshnessReason }),
          ...(safeSourceAttachment.refreshStatus === undefined ||
          safeSourceAttachment.refreshStatus === 'idle'
            ? {}
            : { refreshStatus: safeSourceAttachment.refreshStatus }),
          ...(safeSourceAttachment.refreshRequestedAt === null ||
          safeSourceAttachment.refreshRequestedAt === undefined
            ? {}
            : { refreshRequestedAt: safeSourceAttachment.refreshRequestedAt }),
        }),
    updatedAt: safeSourceAttachment.updatedAt,
  };
}
