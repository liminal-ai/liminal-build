import { v } from 'convex/values';
import type {
  EnvironmentSummary,
  LastCheckpointResult,
} from '../apps/platform/shared/contracts/index.js';
import { deriveEnvironmentStatusLabel } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';
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
  providerKind: v.union(v.literal('daytona'), v.literal('local')),
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

/**
 * Environment states that mean a working environment exists (or is being
 * prepared / recovered against). When the env state is one of these, the
 * companion `processes.hasEnvironment` flag must be `true`.
 *
 * `absent` and `lost` mean no working environment exists; in those cases
 * `hasEnvironment` must be `false`.
 */
const ENV_STATES_WITH_ENVIRONMENT: ReadonlyArray<Doc<'processEnvironmentStates'>['state']> = [
  'preparing',
  'ready',
  'running',
  'checkpointing',
  'rehydrating',
  'rebuilding',
  'stale',
  'failed',
  'unavailable',
];

function deriveHasEnvironment(state: Doc<'processEnvironmentStates'>['state']): boolean {
  return ENV_STATES_WITH_ENVIRONMENT.includes(state);
}

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
  options: { stateOverride?: Doc<'processEnvironmentStates'>['state'] } = {},
): EnvironmentSummary {
  if (state === null) {
    return buildAbsentEnvironmentSummary();
  }

  const projectedState = options.stateOverride ?? state.state;

  return {
    environmentId: state.environmentId,
    state: projectedState,
    statusLabel: deriveEnvironmentStatusLabel(projectedState),
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

/**
 * Bytes -> lowercase hex string. Used to format the SHA-256 digest below.
 */
function bytesToHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < view.length; i += 1) {
    const byte = view[i] as number;
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

interface FingerprintArtifactInput {
  artifactId: string;
  versionLabel: string | null;
}

interface FingerprintOutputInput {
  outputId: string;
  revisionLabel: string | null;
}

interface FingerprintSourceInput {
  sourceAttachmentId: string;
  targetRef: string | null;
  hydrationState: string;
}

interface FingerprintInputs {
  artifacts: FingerprintArtifactInput[];
  outputs: FingerprintOutputInput[];
  sources: FingerprintSourceInput[];
  providerKind: 'daytona' | 'local' | null;
}

/**
 * Build the canonical, sort-stable JSON for the working-set fingerprint and
 * return its lowercase SHA-256 hex digest. Sorting each collection by id keeps
 * the digest order-independent so equivalent inputs always hash equal.
 */
async function computeFingerprintHex(inputs: FingerprintInputs): Promise<string> {
  const sortedArtifacts = [...inputs.artifacts].sort((left, right) =>
    left.artifactId.localeCompare(right.artifactId),
  );
  const sortedOutputs = [...inputs.outputs].sort((left, right) =>
    left.outputId.localeCompare(right.outputId),
  );
  const sortedSources = [...inputs.sources].sort((left, right) =>
    left.sourceAttachmentId.localeCompare(right.sourceAttachmentId),
  );

  // Fixed key order in the outer object; ordered arrays inside.
  const canonical = {
    artifacts: sortedArtifacts.map((artifact) => ({
      artifactId: artifact.artifactId,
      versionLabel: artifact.versionLabel,
    })),
    outputs: sortedOutputs.map((output) => ({
      outputId: output.outputId,
      revisionLabel: output.revisionLabel,
    })),
    providerKind: inputs.providerKind,
    sources: sortedSources.map((source) => ({
      hydrationState: source.hydrationState,
      sourceAttachmentId: source.sourceAttachmentId,
      targetRef: source.targetRef,
    })),
  };

  const stableJson = JSON.stringify(canonical);
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(stableJson),
  );
  return bytesToHex(digest);
}

/**
 * Read the canonical inputs for the working-set fingerprint from the database
 * and compute the current fingerprint hex digest for the given process.
 */
export async function computeWorkingSetFingerprint(
  ctx: MutationCtx | QueryCtx,
  processId: Id<'processes'>,
): Promise<string> {
  const processRecord = await ctx.db.get(processId);

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  const materialRefs = await readCurrentProcessMaterialRefs(ctx, processRecord);
  const envState = await ctx.db
    .query('processEnvironmentStates')
    .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
    .unique();

  const artifactInputs: FingerprintArtifactInput[] = [];
  for (const artifactId of materialRefs.artifactIds) {
    const artifact = await ctx.db.get(artifactId as Id<'artifacts'>);
    if (artifact === null) {
      continue;
    }
    const versions = await ctx.db
      .query('artifactVersions')
      .withIndex('by_artifactId_createdAt', (indexQuery) =>
        indexQuery.eq('artifactId', artifact._id),
      )
      .order('desc')
      .take(1);
    artifactInputs.push({
      artifactId: artifact._id,
      versionLabel: versions[0]?.versionLabel ?? null,
    });
  }

  const outputs = await ctx.db
    .query('processOutputs')
    .withIndex('by_processId_and_updatedAt', (indexQuery) =>
      indexQuery.eq('processId', processRecord._id),
    )
    .take(200);
  const outputInputs: FingerprintOutputInput[] = outputs.map((output) => ({
    outputId: output._id,
    revisionLabel: output.revisionLabel,
  }));

  const sourceInputs: FingerprintSourceInput[] = [];
  for (const sourceAttachmentId of materialRefs.sourceAttachmentIds) {
    const source = await ctx.db.get(sourceAttachmentId as Id<'sourceAttachments'>);
    if (source === null) {
      continue;
    }
    sourceInputs.push({
      sourceAttachmentId: source._id,
      targetRef: source.targetRef,
      hydrationState: source.hydrationState,
    });
  }

  return computeFingerprintHex({
    artifacts: artifactInputs,
    outputs: outputInputs,
    sources: sourceInputs,
    providerKind: envState?.providerKind ?? null,
  });
}

async function readCurrentProcessMaterialRefs(
  ctx: MutationCtx | QueryCtx,
  processRecord: Doc<'processes'>,
): Promise<{ artifactIds: string[]; sourceAttachmentIds: string[] }> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();
      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();
      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();
      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    default:
      return {
        artifactIds: [],
        sourceAttachmentIds: [],
      };
  }
}

/**
 * Cross-table write: keep `processes.hasEnvironment` aligned with the env state
 * row's `state` value. Called from every mutation that touches the env state.
 */
async function maintainProcessHasEnvironment(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  state: Doc<'processEnvironmentStates'>['state'],
): Promise<void> {
  const nextHasEnvironment = deriveHasEnvironment(state);
  if (processRecord.hasEnvironment !== nextHasEnvironment) {
    await ctx.db.patch(processRecord._id, { hasEnvironment: nextHasEnvironment });
  }
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

    if (state === null) {
      return buildAbsentEnvironmentSummary();
    }

    // Read-time stale projection: if stored fingerprint diverges from the
    // current canonical fingerprint AND the stored state would otherwise be
    // `ready`, project as `stale`. The next mutation that touches env state
    // recomputes the fingerprint and the projection becomes consistent.
    if (state.state === 'ready' && state.workingSetFingerprint !== null) {
      const currentFingerprint = await computeWorkingSetFingerprint(ctx, processRecord._id);
      if (currentFingerprint !== state.workingSetFingerprint) {
        return buildEnvironmentSummary(state, { stateOverride: 'stale' });
      }
    }

    return buildEnvironmentSummary(state);
  },
});

export const getProcessEnvironmentProviderKind = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<'daytona' | 'local' | null> => {
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

    return state?.providerKind ?? null;
  },
});

export const upsertProcessEnvironmentState = mutation({
  args: {
    processId: v.string(),
    providerKind: v.union(v.literal('daytona'), v.literal('local')),
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
        providerKind: args.providerKind,
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

    // Compute the fingerprint AFTER the env state row is in its final state so
    // the digest sees the correct providerKind for the current row.
    const fingerprint = await computeWorkingSetFingerprint(ctx, processRecord._id);
    const writtenRow = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();
    if (writtenRow !== null) {
      await ctx.db.patch(writtenRow._id, { workingSetFingerprint: fingerprint });
    }

    await maintainProcessHasEnvironment(ctx, processRecord, args.state);

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

export const getProcessWorkingSetFingerprint = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
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

    return state?.workingSetFingerprint ?? null;
  },
});

export const setProcessHydrationPlan = mutation({
  args: {
    processId: v.string(),
    providerKind: v.union(v.literal('daytona'), v.literal('local')),
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
        providerKind: args.providerKind,
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
      await maintainProcessHasEnvironment(ctx, processRecord, 'absent');
    } else {
      await ctx.db.patch(existing._id, {
        workingSetPlan: args.plan,
        updatedAt: now,
      });
      await maintainProcessHasEnvironment(ctx, processRecord, existing.state);
    }

    // Compute fingerprint after the row is in its final state.
    const fingerprint = await computeWorkingSetFingerprint(ctx, processRecord._id);
    const writtenRow = await ctx.db
      .query('processEnvironmentStates')
      .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
      .unique();
    if (writtenRow !== null) {
      await ctx.db.patch(writtenRow._id, { workingSetFingerprint: fingerprint });
    }

    return {
      artifactIds: [...args.plan.artifactIds],
      sourceAttachmentIds: [...args.plan.sourceAttachmentIds],
      outputIds: [...args.plan.outputIds],
    };
  },
});
