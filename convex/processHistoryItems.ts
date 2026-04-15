import type { ProcessHistoryItem } from '../apps/platform/shared/contracts/index.js';
import type { Id } from './_generated/dataModel.js';
import { query } from './_generated/server.js';
import { v } from 'convex/values';

export const processHistoryItemKindValidator = v.union(
  v.literal('user_message'),
  v.literal('process_message'),
  v.literal('progress_update'),
  v.literal('attention_request'),
  v.literal('side_work_update'),
  v.literal('process_event'),
);

export const processHistoryItemLifecycleValidator = v.union(
  v.literal('current'),
  v.literal('finalized'),
);

export const processHistoryItemRequestStateValidator = v.union(
  v.literal('none'),
  v.literal('unresolved'),
  v.literal('resolved'),
  v.literal('superseded'),
);

export const processHistoryItemsTableFields = {
  processId: v.id('processes'),
  kind: processHistoryItemKindValidator,
  lifecycleState: processHistoryItemLifecycleValidator,
  requestState: processHistoryItemRequestStateValidator,
  text: v.string(),
  relatedSideWorkId: v.union(v.id('processSideWorkItems'), v.null()),
  relatedArtifactId: v.union(v.id('artifacts'), v.null()),
  clientRequestId: v.union(v.string(), v.null()),
  createdAt: v.string(),
  finalizedAt: v.union(v.string(), v.null()),
};

export const listProcessHistoryItems = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<ProcessHistoryItem[]> => {
    const processId = args.processId as Id<'processes'>;
    const items = await ctx.db
      .query('processHistoryItems')
      .withIndex('by_processId_and_createdAt', (query) => query.eq('processId', processId))
      .take(200);

    return items.map((item) => ({
      historyItemId: item._id,
      kind: item.kind,
      lifecycleState: item.lifecycleState,
      text: item.text,
      createdAt: item.createdAt,
      relatedSideWorkId: item.relatedSideWorkId,
      relatedArtifactId: item.relatedArtifactId,
    }));
  },
});
