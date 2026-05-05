import type { SourceAttachmentSummary } from '../../../shared/contracts/index.js';

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function buildSourceAttachmentShadowKey(
  sourceAttachment: Pick<SourceAttachmentSummary, 'repositoryFullName' | 'targetRef'>,
): string {
  return `${sourceAttachment.repositoryFullName}:${sourceAttachment.targetRef ?? ''}`;
}

type ResolveActiveProcessSourceAttachmentsArgs = {
  sourceAttachments: SourceAttachmentSummary[];
  processId: string;
  currentSourceAttachmentIds: string[];
};

function buildVisibleActiveSourceAttachments(
  args: ResolveActiveProcessSourceAttachmentsArgs,
): Map<string, SourceAttachmentSummary> {
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
  const processScopedRows = sortByUpdatedAtDesc(
    activeAttachments.filter((sourceAttachment) => sourceAttachment.processId === args.processId),
  );
  const processScopedRowByShadowKey = new Map<string, SourceAttachmentSummary>();

  for (const sourceAttachment of processScopedRows) {
    const shadowKey = buildSourceAttachmentShadowKey(sourceAttachment);
    if (!processScopedRowByShadowKey.has(shadowKey)) {
      processScopedRowByShadowKey.set(shadowKey, sourceAttachment);
    }
  }

  const visibleByShadowKey = new Map<string, SourceAttachmentSummary>();

  for (const sourceAttachment of processScopedRows) {
    if (!currentSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId)) {
      continue;
    }

    const shadowKey = buildSourceAttachmentShadowKey(sourceAttachment);
    if (!visibleByShadowKey.has(shadowKey)) {
      visibleByShadowKey.set(shadowKey, sourceAttachment);
    }
  }

  for (const sourceAttachment of sortByUpdatedAtDesc(activeAttachments)) {
    if (
      sourceAttachment.attachmentScope !== 'project' ||
      !currentSourceAttachmentIds.has(sourceAttachment.sourceAttachmentId)
    ) {
      continue;
    }

    const shadowKey = buildSourceAttachmentShadowKey(sourceAttachment);
    const processScopedShadow = processScopedRowByShadowKey.get(shadowKey);

    if (processScopedShadow !== undefined) {
      visibleByShadowKey.set(shadowKey, processScopedShadow);
      continue;
    }

    if (!visibleByShadowKey.has(shadowKey)) {
      visibleByShadowKey.set(shadowKey, sourceAttachment);
    }
  }

  return visibleByShadowKey;
}

export function resolveActiveProcessSourceAttachments(
  args: ResolveActiveProcessSourceAttachmentsArgs,
): SourceAttachmentSummary[] {
  return sortByUpdatedAtDesc([...buildVisibleActiveSourceAttachments(args).values()]);
}

export function resolveCanonicalProcessSourceAttachment(args: {
  sourceAttachments: SourceAttachmentSummary[];
  processId: string;
  currentSourceAttachmentIds: string[];
  repositoryFullName: string;
  targetRef: string | null;
}): SourceAttachmentSummary | null {
  return (
    buildVisibleActiveSourceAttachments(args).get(
      buildSourceAttachmentShadowKey({
        repositoryFullName: args.repositoryFullName,
        targetRef: args.targetRef,
      }),
    ) ?? null
  );
}
