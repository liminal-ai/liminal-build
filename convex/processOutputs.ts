import type { ProcessOutputReference } from '../apps/platform/shared/contracts/index.js';
import type { Id } from './_generated/dataModel.js';
import { query } from './_generated/server.js';
import { v } from 'convex/values';

export const processOutputsTableFields = {
  processId: v.id('processes'),
  linkedArtifactId: v.union(v.id('artifacts'), v.null()),
  displayName: v.string(),
  revisionLabel: v.union(v.string(), v.null()),
  state: v.string(),
  updatedAt: v.string(),
};

export const listProcessOutputs = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<ProcessOutputReference[]> => {
    const processId = args.processId as Id<'processes'>;
    const outputs = await ctx.db
      .query('processOutputs')
      .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processId))
      .order('desc')
      .take(20);

    return outputs.map((output) => ({
      outputId: output._id,
      displayName: output.displayName,
      revisionLabel: output.revisionLabel,
      state: output.state,
      updatedAt: output.updatedAt,
    }));
  },
});
