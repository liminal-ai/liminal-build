import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { type QueryCtx, query } from './_generated/server.js';

export const sourceAttachmentsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  displayName: v.string(),
  purpose: v.union(
    v.literal('research'),
    v.literal('review'),
    v.literal('implementation'),
    v.literal('other'),
  ),
  accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
  targetRef: v.union(v.string(), v.null()),
  hydrationState: v.union(
    v.literal('not_hydrated'),
    v.literal('hydrated'),
    v.literal('stale'),
    v.literal('unavailable'),
  ),
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
          displayName: sourceAttachment.displayName,
          purpose: sourceAttachment.purpose,
          accessMode: sourceAttachment.accessMode,
          targetRef: sourceAttachment.targetRef,
          hydrationState: sourceAttachment.hydrationState,
          attachmentScope: sourceAttachment.processId === null ? 'project' : 'process',
          processId: sourceAttachment.processId,
          processDisplayLabel: attachedProcess?.displayLabel ?? null,
          updatedAt: sourceAttachment.updatedAt,
        };
      }),
    );
  },
});
