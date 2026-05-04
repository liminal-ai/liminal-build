import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { type QueryCtx, query } from './_generated/server.js';

export const sourceAttachmentsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  provider: v.literal('github'),
  displayName: v.string(),
  purpose: v.union(
    v.literal('research'),
    v.literal('review'),
    v.literal('implementation'),
    v.literal('other'),
  ),
  accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
  // Canonical clone URL for the source. Used by `LocalProviderAdapter` to clone
  // the working tree at hydration time and by `OctokitCodeCheckpointWriter` to
  // resolve the GitHub repo coordinates for direct writes back to the attached
  // writable target ref. Must be a full URL the underlying tooling can use
  // directly (e.g., `https://github.com/owner/repo`, `https://github.com/owner/repo.git`).
  repositoryUrl: v.string(),
  repositoryFullName: v.string(),
  targetRef: v.union(v.string(), v.null()),
  hydrationState: v.union(
    v.literal('not_hydrated'),
    v.literal('hydrated'),
    v.literal('stale'),
    v.literal('unavailable'),
  ),
  lastHydratedAt: v.union(v.string(), v.null()),
  lastHydratedResolvedRef: v.union(v.string(), v.null()),
  lastObservedRemoteResolvedRef: v.union(v.string(), v.null()),
  freshnessReason: v.union(v.string(), v.null()),
  refreshStatus: v.union(v.literal('idle'), v.literal('pending'), v.literal('failed')),
  refreshRequestedAt: v.union(v.string(), v.null()),
  detachedAt: v.union(v.string(), v.null()),
  detachedByUserId: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};

export const listProjectSourceAttachmentSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => {
    const sourceAttachments = await ctx.db
      .query('sourceAttachments')
      .withIndex('by_projectId_updatedAt', (indexQuery) =>
        indexQuery.eq('projectId', args.projectId),
      )
      .order('desc')
      .take(200);

    return Promise.all(
      sourceAttachments.map(async (sourceAttachment: Doc<'sourceAttachments'>) => {
        const attachedProcess =
          sourceAttachment.processId === null
            ? null
            : await ctx.db.get(sourceAttachment.processId as Id<'processes'>);

        return {
          sourceAttachmentId: sourceAttachment._id,
          provider: sourceAttachment.provider,
          displayName: sourceAttachment.displayName,
          purpose: sourceAttachment.purpose,
          accessMode: sourceAttachment.accessMode,
          repositoryUrl: sourceAttachment.repositoryUrl,
          repositoryFullName: sourceAttachment.repositoryFullName,
          targetRef: sourceAttachment.targetRef,
          hydrationState: sourceAttachment.hydrationState,
          lastHydratedAt: sourceAttachment.lastHydratedAt,
          lastHydratedResolvedRef: sourceAttachment.lastHydratedResolvedRef,
          lastObservedRemoteResolvedRef: sourceAttachment.lastObservedRemoteResolvedRef,
          freshnessReason: sourceAttachment.freshnessReason,
          refreshStatus: sourceAttachment.refreshStatus,
          refreshRequestedAt: sourceAttachment.refreshRequestedAt,
          attachmentScope: sourceAttachment.processId === null ? 'project' : 'process',
          processId: sourceAttachment.processId,
          processDisplayLabel: attachedProcess?.displayLabel ?? null,
          detachedAt: sourceAttachment.detachedAt,
          updatedAt: sourceAttachment.updatedAt,
        };
      }),
    );
  },
});
