import { v } from 'convex/values';
import type {
  EnvironmentSummary,
  LastCheckpointResult,
} from '../apps/platform/shared/contracts/index.js';
import { deriveEnvironmentStatusLabel } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import type { WorkingSetPlan } from '../apps/platform/server/services/projects/platform-store.js';

export const checkpointKindValidator = v.union(
  v.literal('artifact'),
  v.literal('code'),
  v.literal('mixed'),
);

export const checkpointOutcomeValidator = v.union(v.literal('succeeded'), v.literal('failed'));

export const environmentStateValidator = v.union(
  v.literal('absent'),
  v.literal('preparing'),
  v.literal('rehydrating'),
  v.literal('ready'),
  v.literal('running'),
  v.literal('checkpointing'),
  v.literal('stale'),
  v.literal('failed'),
  v.literal('lost'),
  v.literal('rebuilding'),
  v.literal('unavailable'),
);

export const checkpointResultValidator = v.object({
  checkpointId: v.string(),
  checkpointKind: checkpointKindValidator,
  outcome: checkpointOutcomeValidator,
  targetLabel: v.string(),
  targetRef: v.union(v.string(), v.null()),
  completedAt: v.string(),
  failureReason: v.union(v.string(), v.null()),
});

export const workingSetPlanValidator = v.object({
  artifactIds: v.array(v.string()),
  sourceAttachmentIds: v.array(v.string()),
  outputIds: v.array(v.string()),
});

export const processEnvironmentStatesTableFields = {
  processId: v.id('processes'),
  providerKind: v.union(v.literal('daytona'), v.literal('local'), v.null()),
  environmentId: v.union(v.string(), v.null()),
  state: environmentStateValidator,
  blockedReason: v.union(v.string(), v.null()),
  lastHydratedAt: v.union(v.string(), v.null()),
  lastCheckpointAt: v.union(v.string(), v.null()),
  lastCheckpointResult: v.union(checkpointResultValidator, v.null()),
  workingSetPlan: v.union(workingSetPlanValidator, v.null()),
  workingSetFingerprint: v.union(v.string(), v.null()),
  createdAt: v.string(),
  updatedAt: v.string(),
};

function buildAbsentEnvironmentSummary(): EnvironmentSummary {
  return {
    environmentId: null,
    state: 'absent',
    statusLabel: deriveEnvironmentStatusLabel('absent'),
    blockedReason: null,
    lastHydratedAt: null,
    lastCheckpointAt: null,
    lastCheckpointResult: null,
  };
}

function buildCheckpointResult(
  result: Doc<'processEnvironmentStates'>['lastCheckpointResult'],
): LastCheckpointResult | null {
  if (result === null) {
    return null;
  }

  return {
    checkpointId: result.checkpointId,
    checkpointKind: result.checkpointKind,
    outcome: result.outcome,
    targetLabel: result.targetLabel,
    targetRef: result.targetRef,
    completedAt: result.completedAt,
    failureReason: result.failureReason,
  };
}

function buildEnvironmentSummary(
  state: Doc<'processEnvironmentStates'> | null,
): EnvironmentSummary {
  if (state === null) {
    return buildAbsentEnvironmentSummary();
  }

  return {
    environmentId: state.environmentId,
    state: state.state,
    statusLabel: deriveEnvironmentStatusLabel(state.state),
    blockedReason: state.blockedReason,
    lastHydratedAt: state.lastHydratedAt,
    lastCheckpointAt: state.lastCheckpointAt,
    lastCheckpointResult: buildCheckpointResult(state.lastCheckpointResult),
  };
}

function buildWorkingSetPlan(
  plan: Doc<'processEnvironmentStates'>['workingSetPlan'],
): WorkingSetPlan | null {
  if (plan === null) {
    return null;
  }

  return {
    artifactIds: [...plan.artifactIds],
    sourceAttachmentIds: [...plan.sourceAttachmentIds],
    outputIds: [...plan.outputIds],
  };
}

export const getProcessEnvironmentSummary = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<EnvironmentSummary> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return buildAbsentEnvironmentSummary();
    }

    if (processRecord === null) {
      return buildAbsentEnvironmentSummary();
    }

    const state = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();

    return buildEnvironmentSummary(state);
  },
});

export const upsertProcessEnvironmentState = mutation({
  args: {
    processId: v.string(),
    providerKind: v.union(v.literal('daytona'), v.literal('local'), v.null()),
    state: environmentStateValidator,
    environmentId: v.union(v.string(), v.null()),
    blockedReason: v.union(v.string(), v.null()),
    lastHydratedAt: v.union(v.string(), v.null()),
    lastCheckpointAt: v.optional(v.union(v.string(), v.null())),
    lastCheckpointResult: v.optional(v.union(checkpointResultValidator, v.null())),
  },
  handler: async (ctx, args): Promise<EnvironmentSummary> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return buildAbsentEnvironmentSummary();
    }

    if (processRecord === null) {
      return buildAbsentEnvironmentSummary();
    }

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();

    if (existing === null) {
      await ctx.db.insert('processEnvironmentStates', {
        processId: processRecord._id,
        providerKind: args.providerKind,
        environmentId: args.environmentId,
        state: args.state,
        blockedReason: args.blockedReason,
        lastHydratedAt: args.lastHydratedAt,
        lastCheckpointAt: args.lastCheckpointAt ?? null,
        lastCheckpointResult: args.lastCheckpointResult ?? null,
        workingSetPlan: null,
        workingSetFingerprint: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        providerKind: args.providerKind ?? existing.providerKind,
        environmentId: args.environmentId,
        state: args.state,
        blockedReason: args.blockedReason,
        lastHydratedAt: args.lastHydratedAt ?? existing.lastHydratedAt,
        lastCheckpointAt:
          args.lastCheckpointAt === undefined ? existing.lastCheckpointAt : args.lastCheckpointAt,
        lastCheckpointResult:
          args.lastCheckpointResult === undefined
            ? existing.lastCheckpointResult
            : args.lastCheckpointResult,
        updatedAt: now,
      });
    }

    const updated = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();

    return buildEnvironmentSummary(updated);
  },
});

export const getProcessHydrationPlan = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<WorkingSetPlan | null> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return null;
    }

    if (processRecord === null) {
      return null;
    }

    const state = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();

    return buildWorkingSetPlan(state?.workingSetPlan ?? null);
  },
});

export const setProcessHydrationPlan = mutation({
  args: {
    processId: v.string(),
    plan: workingSetPlanValidator,
  },
  handler: async (ctx, args): Promise<WorkingSetPlan> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      throw new Error('Process not found.');
    }

    if (processRecord === null) {
      throw new Error('Process not found.');
    }

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();

    if (existing === null) {
      await ctx.db.insert('processEnvironmentStates', {
        processId: processRecord._id,
        providerKind: null,
        environmentId: null,
        state: 'absent',
        blockedReason: null,
        lastHydratedAt: null,
        lastCheckpointAt: null,
        lastCheckpointResult: null,
        workingSetPlan: args.plan,
        workingSetFingerprint: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        workingSetPlan: args.plan,
        updatedAt: now,
      });
    }

    return {
      artifactIds: [...args.plan.artifactIds],
      sourceAttachmentIds: [...args.plan.sourceAttachmentIds],
      outputIds: [...args.plan.outputIds],
    };
  },
});
