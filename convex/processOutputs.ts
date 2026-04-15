import { v } from 'convex/values';
import type { ProcessOutputReference } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';

export const processOutputsTableFields = {
  processId: v.id('processes'),
  linkedArtifactId: v.union(v.id('artifacts'), v.null()),
  displayName: v.string(),
  revisionLabel: v.union(v.string(), v.null()),
  state: v.string(),
  updatedAt: v.string(),
};

const replaceProcessOutputInputValidator = v.object({
  outputId: v.optional(v.id('processOutputs')),
  linkedArtifactId: v.union(v.id('artifacts'), v.null()),
  displayName: v.string(),
  revisionLabel: v.union(v.string(), v.null()),
  state: v.string(),
  updatedAt: v.optional(v.string()),
});

export const listProcessOutputs = query({
  args: {
    processId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> => {
    return readCurrentProcessOutputs(ctx, args.processId as Id<'processes'>);
  },
});

export const replaceCurrentProcessOutputs = mutation({
  args: {
    processId: v.string(),
    outputs: v.array(replaceProcessOutputInputValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> => {
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId);
    const now = new Date().toISOString();
    const existingOutputs = await ctx.db
      .query('processOutputs')
      .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processRecord._id))
      .take(50);
    const existingOutputsById = new Map(existingOutputs.map((output) => [output._id, output]));
    const keptOutputIds = new Set<Id<'processOutputs'>>();

    for (const output of args.outputs) {
      if (output.linkedArtifactId !== null) {
        const linkedArtifact = await ctx.db.get(output.linkedArtifactId);

        if (linkedArtifact === null || linkedArtifact.projectId !== processRecord.projectId) {
          throw new Error('Linked artifact must belong to the same project as the process.');
        }
      }

      const nextFields = {
        linkedArtifactId: output.linkedArtifactId,
        displayName: output.displayName,
        revisionLabel: output.revisionLabel,
        state: output.state,
        updatedAt: output.updatedAt ?? now,
      };

      if (output.outputId !== undefined) {
        const existingOutput = existingOutputsById.get(output.outputId);

        if (existingOutput === undefined || existingOutput.processId !== processRecord._id) {
          throw new Error('Current output must already belong to the same process.');
        }

        await ctx.db.patch(existingOutput._id, nextFields);
        keptOutputIds.add(existingOutput._id);
        continue;
      }

      const outputId = await ctx.db.insert('processOutputs', {
        processId: processRecord._id,
        ...nextFields,
      });
      keptOutputIds.add(outputId);
    }

    for (const existingOutput of existingOutputs) {
      if (!keptOutputIds.has(existingOutput._id)) {
        await ctx.db.delete(existingOutput._id);
      }
    }

    await touchProcessAndProject(ctx, processRecord, now);

    return readCurrentProcessOutputs(ctx, processRecord._id);
  },
});

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
    // Keep the current output update durable even if the project lookup is stale.
  }
}

async function readCurrentProcessOutputs(
  ctx: MutationCtx | QueryCtx,
  processId: Id<'processes'>,
): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> {
  const outputs = await ctx.db
    .query('processOutputs')
    .withIndex('by_processId_and_updatedAt', (query) => query.eq('processId', processId))
    .order('desc')
    .take(20);

  return outputs.map((output) => ({
    outputId: output._id,
    linkedArtifactId: output.linkedArtifactId,
    displayName: output.displayName,
    revisionLabel: output.revisionLabel,
    state: output.state,
    updatedAt: output.updatedAt,
  }));
}
