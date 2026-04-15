import type { SideWorkItem } from '../apps/platform/shared/contracts/index.js';
import type { Id } from './_generated/dataModel.js';
import { query } from './_generated/server.js';
import { v } from 'convex/values';

export const processSideWorkStatusValidator = v.union(
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
);

export const processSideWorkItemsTableFields = {
  processId: v.id('processes'),
  displayLabel: v.string(),
  purposeSummary: v.string(),
  status: processSideWorkStatusValidator,
  resultSummary: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};

export const listProcessSideWorkItems = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<SideWorkItem[]> => {
    const processId = args.processId as Id<'processes'>;
    const items = await ctx.db
      .query('processSideWorkItems')
      .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processId))
      .order('desc')
      .take(20);

    return items.map((item) => ({
      sideWorkId: item._id,
      displayLabel: item.displayLabel,
      purposeSummary: item.purposeSummary,
      status: item.status,
      resultSummary: item.resultSummary,
      updatedAt: item.updatedAt,
    }));
  },
});
