import { queryGeneric as query } from 'convex/server';
import { v } from 'convex/values';

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
  handler: async (ctx: any, args: any) => {
    const sourceAttachments = await ctx.db
      .query('sourceAttachments')
      .withIndex('by_projectId_updatedAt', (query: any) => query.eq('projectId', args.projectId))
      .order('desc')
      .collect();

    return Promise.all(
      sourceAttachments.map(async (sourceAttachment: any) => {
        const attachedProcess =
          sourceAttachment.processId === null ? null : await ctx.db.get(sourceAttachment.processId);

        return {
          sourceAttachmentId: sourceAttachment._id,
          displayName: sourceAttachment.displayName,
          purpose: sourceAttachment.purpose,
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
