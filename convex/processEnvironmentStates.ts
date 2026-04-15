import { v } from 'convex/values';
import type {
  EnvironmentSummary,
  LastCheckpointResult,
} from '../apps/platform/shared/contracts/index.js';
import { deriveEnvironmentStatusLabel } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { query } from './_generated/server.js';

export const checkpointKindValidator = v.union(
  v.literal('artifact'),
  v.literal('code'),
  v.literal('mixed'),
);

export const checkpointOutcomeValidator = v.union(v.literal('succeeded'), v.literal('failed'));

export const environmentStateValidator = v.union(
  v.literal('absent'),
  v.literal('preparing'),
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

export const processEnvironmentStatesTableFields = {
  processId: v.id('processes'),
  providerKind: v.union(v.literal('daytona'), v.literal('local'), v.null()),
  environmentId: v.union(v.string(), v.null()),
  state: environmentStateValidator,
  blockedReason: v.union(v.string(), v.null()),
  lastHydratedAt: v.union(v.string(), v.null()),
  lastCheckpointAt: v.union(v.string(), v.null()),
  lastCheckpointResult: v.union(checkpointResultValidator, v.null()),
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
