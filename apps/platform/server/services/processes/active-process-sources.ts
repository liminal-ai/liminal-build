import type { SourceAttachmentSummary } from '../../../shared/contracts/index.js';

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function buildShadowKey(
  sourceAttachment: Pick<SourceAttachmentSummary, 'repositoryFullName' | 'targetRef'>,
): string {
  return `${sourceAttachment.repositoryFullName}:${sourceAttachment.targetRef ?? ''}`;
}

export function resolveActiveProcessSourceAttachments(args: {
  sourceAttachments: SourceAttachmentSummary[];
  processId: string;
  currentSourceAttachmentIds: string[];
}): SourceAttachmentSummary[] {
  const currentSourceAttachmentIds = new Set(args.currentSourceAttachmentIds);
  const activeAttachments = args.sourceAttachments.filter((sourceAttachment) => {
    if (sourceAttachment.detachedAt != null) {
      return false;
    }

    return (
      sourceAttachment.attachmentScope === 'project' ||
      sourceAttachment.processId === args.processId
    );
  });
  const processScopedRows = activeAttachments.filter(
    (sourceAttachment) => sourceAttachment.processId === args.processId,
  );
  const visibleByShadowKey = new Map<string, SourceAttachmentSummary>();

  for (const sourceAttachment of processScopedRows) {
    if (!currentSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId)) {
      continue;
    }

    visibleByShadowKey.set(buildShadowKey(sourceAttachment), sourceAttachment);
  }

  for (const sourceAttachment of activeAttachments) {
    if (
      sourceAttachment.attachmentScope !== 'project' ||
      !currentSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId)
    ) {
      continue;
    }

    const processScopedSibling = processScopedRows.find(
      (candidate) =>
        candidate.repositoryFullName === sourceAttachment.repositoryFullName &&
        candidate.targetRef === sourceAttachment.targetRef,
    );

    visibleByShadowKey.set(
      buildShadowKey(sourceAttachment),
      processScopedSibling ?? sourceAttachment,
    );
  }

  return sortByUpdatedAtDesc([...visibleByShadowKey.values()]);
}
