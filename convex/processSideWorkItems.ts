import type { SideWorkItem } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';
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

const replaceSideWorkInputValidator = v.object({
  sideWorkId: v.optional(v.id('processSideWorkItems')),
  displayLabel: v.string(),
  purposeSummary: v.string(),
  status: processSideWorkStatusValidator,
  resultSummary: v.union(v.string(), v.null()),
  updatedAt: v.optional(v.string()),
});

export const listProcessSideWorkItems = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<SideWorkItem[]> => {
    return readCurrentProcessSideWorkItems(ctx, args.processId as Id<'processes'>);
  },
});

export const replaceCurrentProcessSideWorkItems = mutation({
  args: {
    processId: v.string(),
    items: v.array(replaceSideWorkInputValidator),
  },
  handler: async (ctx, args): Promise<SideWorkItem[]> => {
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId);
    const now = new Date().toISOString();
    const existingItems = await ctx.db
      .query('processSideWorkItems')
      .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processRecord._id))
      .take(50);
    const existingItemsById = new Map(existingItems.map((item) => [item._id, item]));
    const keptItemIds = new Set<Id<'processSideWorkItems'>>();

    for (const item of args.items) {
      const nextFields = {
        displayLabel: item.displayLabel,
        purposeSummary: item.purposeSummary,
        status: item.status,
        resultSummary: item.resultSummary,
        updatedAt: item.updatedAt ?? now,
      };

      if (item.sideWorkId !== undefined) {
        const existingItem = existingItemsById.get(item.sideWorkId);

        if (existingItem === undefined || existingItem.processId !== processRecord._id) {
          throw new Error('Current side work must already belong to the same process.');
        }

        await ctx.db.patch(existingItem._id, nextFields);
        keptItemIds.add(existingItem._id);
        continue;
      }

      const sideWorkId = await ctx.db.insert('processSideWorkItems', {
        processId: processRecord._id,
        ...nextFields,
      });
      keptItemIds.add(sideWorkId);
    }

    for (const existingItem of existingItems) {
      if (!keptItemIds.has(existingItem._id)) {
        await ctx.db.delete(existingItem._id);
      }
    }

    await touchProcessAndProject(ctx, processRecord, now);

    return readCurrentProcessSideWorkItems(ctx, processRecord._id);
  },
});

function sortCurrentSideWork(items: SideWorkItem[]): SideWorkItem[] {
  const runningItems = items
    .filter((item) => item.status === 'running')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const settledItems = items
    .filter((item) => item.status !== 'running')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return [...runningItems, ...settledItems];
}

async function readCurrentProcessSideWorkItems(
  ctx: QueryCtx | MutationCtx,
  processId: Id<'processes'>,
): Promise<SideWorkItem[]> {
  const items = await ctx.db
    .query('processSideWorkItems')
    .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processId))
    .order('desc')
    .take(20);

  return sortCurrentSideWork(
    items.map((item) => ({
      sideWorkId: item._id,
      displayLabel: item.displayLabel,
      purposeSummary: item.purposeSummary,
      status: item.status,
      resultSummary: item.resultSummary,
      updatedAt: item.updatedAt,
    })),
  );
}

async function getProcessRecordOrThrow(
  ctx: MutationCtx,
  processIdValue: string,
): Promise<Doc<'processes'>> {
  let processRecord: Doc<'processes'> | null = null;

  try {
    processRecord = await ctx.db.get(processIdValue as Id<'processes'>);
  } catch {
    throw new Error('Process not found.');
  }

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  return processRecord;
}

async function touchProcessAndProject(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  now: string,
): Promise<void> {
  await ctx.db.patch(processRecord._id, {
    updatedAt: now,
  });

  try {
    await ctx.db.patch(processRecord.projectId as Id<'projects'>, {
      lastUpdatedAt: now,
      updatedAt: now,
    });
  } catch {
    // Keep the current side-work update durable even if the project lookup is stale.
  }
}
