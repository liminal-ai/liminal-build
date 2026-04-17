import { describe, expect, it } from 'vitest';
import {
  computeWorkingSetFingerprint,
  getProcessHydrationPlan,
  getProcessEnvironmentSummary,
  setProcessHydrationPlan,
  upsertProcessEnvironmentState,
} from './processEnvironmentStates.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const upsertProcessEnvironmentStateHandler = getHandler<
  {
    processId: string;
    providerKind: 'daytona' | 'local';
    state:
      | 'absent'
      | 'preparing'
      | 'rehydrating'
      | 'ready'
      | 'running'
      | 'checkpointing'
      | 'stale'
      | 'failed'
      | 'lost'
      | 'rebuilding'
      | 'unavailable';
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: {
      checkpointId: string;
      checkpointKind: 'artifact' | 'code' | 'mixed';
      outcome: 'succeeded' | 'failed';
      targetLabel: string;
      targetRef: string | null;
      completedAt: string;
      failureReason: string | null;
    } | null;
  },
  {
    environmentId: string | null;
    state: string;
    statusLabel: string;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt: string | null;
    lastCheckpointResult: {
      checkpointId: string;
      checkpointKind: 'artifact' | 'code' | 'mixed';
      outcome: 'succeeded' | 'failed';
      targetLabel: string;
      targetRef: string | null;
      completedAt: string;
      failureReason: string | null;
    } | null;
  }
>(upsertProcessEnvironmentState);

const getProcessHydrationPlanHandler = getHandler<
  { processId: string },
  {
    artifactIds: string[];
    sourceAttachmentIds: string[];
    outputIds: string[];
  } | null
>(getProcessHydrationPlan);

const setProcessHydrationPlanHandler = getHandler<
  {
    processId: string;
    providerKind: 'daytona' | 'local';
    plan: {
      artifactIds: string[];
      sourceAttachmentIds: string[];
      outputIds: string[];
    };
  },
  {
    artifactIds: string[];
    sourceAttachmentIds: string[];
    outputIds: string[];
  }
>(setProcessHydrationPlan);

const getProcessEnvironmentSummaryHandler = getHandler<
  { processId: string },
  {
    environmentId: string | null;
    state: string;
    statusLabel: string;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt: string | null;
    lastCheckpointResult: {
      checkpointId: string;
      checkpointKind: 'artifact' | 'code' | 'mixed';
      outcome: 'succeeded' | 'failed';
      targetLabel: string;
      targetRef: string | null;
      completedAt: string;
      failureReason: string | null;
    } | null;
  }
>(getProcessEnvironmentSummary);

function buildSeed() {
  return {
    projects: [
      {
        _id: 'project-1',
        _creationTime: 1,
        name: 'Project One',
        ownerUserId: 'user-1',
        processCount: 1,
        artifactCount: 0,
        sourceAttachmentCount: 0,
        lastUpdatedAt: '2026-04-15T12:00:00.000Z',
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-1',
        _creationTime: 2,
        projectId: 'project-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Spec #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: true,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processEnvironmentStates: [],
  };
}

describe('convex/processEnvironmentStates checkpoint durability', () => {
  it('stores lastCheckpointResult and lastCheckpointAt on environment upsert', async () => {
    const { ctx } = createFakeConvexContext(buildSeed());

    const result = await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'environment-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
      lastCheckpointAt: '2026-04-15T12:12:00.000Z',
      lastCheckpointResult: {
        checkpointId: 'checkpoint-1',
        checkpointKind: 'artifact',
        outcome: 'succeeded',
        targetLabel: 'Feature Specification Draft',
        targetRef: null,
        completedAt: '2026-04-15T12:12:00.000Z',
        failureReason: null,
      },
    });

    expect(result.lastCheckpointAt).toBe('2026-04-15T12:12:00.000Z');
    expect(result.lastCheckpointResult).toMatchObject({
      checkpointId: 'checkpoint-1',
      checkpointKind: 'artifact',
      outcome: 'succeeded',
    });
  });

  it('stores and overwrites lastCheckpointResult with latest-only semantics', async () => {
    const { ctx } = createFakeConvexContext(buildSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-1',
      providerKind: 'local',
      state: 'checkpointing',
      environmentId: 'environment-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
      lastCheckpointAt: '2026-04-15T12:12:00.000Z',
      lastCheckpointResult: {
        checkpointId: 'checkpoint-1',
        checkpointKind: 'artifact',
        outcome: 'succeeded',
        targetLabel: 'Feature Specification Draft',
        targetRef: null,
        completedAt: '2026-04-15T12:12:00.000Z',
        failureReason: null,
      },
    });

    const updated = await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'environment-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
      lastCheckpointAt: '2026-04-15T12:16:00.000Z',
      lastCheckpointResult: {
        checkpointId: 'checkpoint-2',
        checkpointKind: 'code',
        outcome: 'failed',
        targetLabel: 'liminal-build',
        targetRef: 'feature/story-4',
        completedAt: '2026-04-15T12:16:00.000Z',
        failureReason: 'Writable source checkpoint failed.',
      },
    });

    expect(updated.lastCheckpointAt).toBe('2026-04-15T12:16:00.000Z');
    expect(updated.lastCheckpointResult).toEqual({
      checkpointId: 'checkpoint-2',
      checkpointKind: 'code',
      outcome: 'failed',
      targetLabel: 'liminal-build',
      targetRef: 'feature/story-4',
      completedAt: '2026-04-15T12:16:00.000Z',
      failureReason: 'Writable source checkpoint failed.',
    });
  });

  it('TC-4.1b durable-state portion only — reopen exercise in Story 6', async () => {
    const { ctx } = createFakeConvexContext(buildSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'environment-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
      lastCheckpointAt: '2026-04-15T12:18:00.000Z',
      lastCheckpointResult: {
        checkpointId: 'checkpoint-3',
        checkpointKind: 'artifact',
        outcome: 'succeeded',
        targetLabel: 'Checkpointed output',
        targetRef: null,
        completedAt: '2026-04-15T12:18:00.000Z',
        failureReason: null,
      },
    });

    const summary = await getProcessEnvironmentSummaryHandler(ctx, {
      processId: 'process-1',
    });

    expect(summary.lastCheckpointAt).toBe('2026-04-15T12:18:00.000Z');
    expect(summary.lastCheckpointResult).toMatchObject({
      checkpointId: 'checkpoint-3',
      checkpointKind: 'artifact',
      outcome: 'succeeded',
      targetLabel: 'Checkpointed output',
    });
  });

  it('stores and returns the hydration working set plan on the environment row', async () => {
    const { ctx } = createFakeConvexContext(buildSeed());
    const stored = await setProcessHydrationPlanHandler(ctx, {
      processId: 'process-1',
      providerKind: 'local',
      plan: {
        artifactIds: ['artifact-1'],
        sourceAttachmentIds: ['source-1', 'source-2'],
        outputIds: ['output-1'],
      },
    });
    const readBack = await getProcessHydrationPlanHandler(ctx, {
      processId: 'process-1',
    });

    expect(stored).toEqual({
      artifactIds: ['artifact-1'],
      sourceAttachmentIds: ['source-1', 'source-2'],
      outputIds: ['output-1'],
    });
    expect(readBack).toEqual(stored);
  });
});

function buildFingerprintSeed() {
  return {
    projects: [
      {
        _id: 'project-fp-1',
        _creationTime: 1,
        name: 'Fingerprint Project',
        ownerUserId: 'user-1',
        processCount: 1,
        artifactCount: 2,
        sourceAttachmentCount: 1,
        lastUpdatedAt: '2026-04-15T12:00:00.000Z',
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-fp-1',
        _creationTime: 2,
        projectId: 'project-fp-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Spec #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: true,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processFeatureSpecificationStates: [
      {
        _id: 'state-fp-1',
        _creationTime: 3,
        processId: 'process-fp-1',
        currentArtifactIds: ['artifact-fp-1', 'artifact-fp-2'],
        currentSourceAttachmentIds: ['source-fp-1'],
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-fp-1',
        _creationTime: 4,
        projectId: 'project-fp-1',
        processId: 'process-fp-1',
        displayName: 'Spec Draft',
        currentVersionLabel: 'draft-1',
        contentStorageId: 'kg-stub-artifact-fp-1',
        updatedAt: '2026-04-15T12:01:00.000Z',
      },
      {
        _id: 'artifact-fp-2',
        _creationTime: 5,
        projectId: 'project-fp-1',
        processId: 'process-fp-1',
        displayName: 'Notes',
        currentVersionLabel: 'v2',
        contentStorageId: 'kg-stub-artifact-fp-2',
        updatedAt: '2026-04-15T12:02:00.000Z',
      },
    ],
    sourceAttachments: [
      {
        _id: 'source-fp-1',
        _creationTime: 6,
        projectId: 'project-fp-1',
        processId: 'process-fp-1',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        targetRef: 'feature/epic-03',
        hydrationState: 'hydrated',
        updatedAt: '2026-04-15T12:03:00.000Z',
      },
    ],
    processOutputs: [
      {
        _id: 'output-fp-1',
        _creationTime: 7,
        processId: 'process-fp-1',
        linkedArtifactId: 'artifact-fp-1',
        displayName: 'Spec Draft Output',
        revisionLabel: 'rev-a',
        state: 'published_to_artifact',
        updatedAt: '2026-04-15T12:04:00.000Z',
      },
    ],
    processEnvironmentStates: [],
  };
}

describe('convex/processEnvironmentStates working-set fingerprint', () => {
  it('computes a deterministic SHA-256 hex digest of canonical inputs', async () => {
    const { ctx } = createFakeConvexContext(buildFingerprintSeed());

    const fingerprint = await computeWorkingSetFingerprint(
      ctx as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );

    // SHA-256 hex digest is 64 lowercase hex characters.
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);

    const repeat = await computeWorkingSetFingerprint(
      ctx as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );
    expect(repeat).toBe(fingerprint);
  });

  it('produces the same fingerprint when canonical input order changes', async () => {
    const baseSeed = buildFingerprintSeed();
    const { ctx: ctxA } = createFakeConvexContext(baseSeed);
    const reorderedSeed = buildFingerprintSeed();
    const reorderedState = reorderedSeed.processFeatureSpecificationStates[0];
    if (reorderedState === undefined) {
      throw new Error('Expected seeded process state.');
    }
    reorderedState.currentArtifactIds = ['artifact-fp-2', 'artifact-fp-1'];
    const { ctx: ctxB } = createFakeConvexContext(reorderedSeed);

    const fingerprintA = await computeWorkingSetFingerprint(
      ctxA as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );
    const fingerprintB = await computeWorkingSetFingerprint(
      ctxB as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );

    expect(fingerprintB).toBe(fingerprintA);
  });

  it('changes the fingerprint when any canonical input changes', async () => {
    const baseSeed = buildFingerprintSeed();
    const { ctx: ctxA } = createFakeConvexContext(baseSeed);
    const fingerprintA = await computeWorkingSetFingerprint(
      ctxA as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );

    // Mutate one input: change the version label of one artifact.
    const mutatedSeed = buildFingerprintSeed();
    const mutatedArtifact = mutatedSeed.artifacts[0];
    if (mutatedArtifact === undefined) {
      throw new Error('Expected seeded artifact.');
    }
    mutatedArtifact.currentVersionLabel = 'draft-2';
    const { ctx: ctxB } = createFakeConvexContext(mutatedSeed);
    const fingerprintB = await computeWorkingSetFingerprint(
      ctxB as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );

    expect(fingerprintB).not.toBe(fingerprintA);

    // Mutate the source target ref instead.
    const mutatedSourceSeed = buildFingerprintSeed();
    const mutatedSource = mutatedSourceSeed.sourceAttachments[0];
    if (mutatedSource === undefined) {
      throw new Error('Expected seeded source attachment.');
    }
    mutatedSource.targetRef = 'feature/different';
    const { ctx: ctxC } = createFakeConvexContext(mutatedSourceSeed);
    const fingerprintC = await computeWorkingSetFingerprint(
      ctxC as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      'process-fp-1' as never,
    );

    expect(fingerprintC).not.toBe(fingerprintA);
    expect(fingerprintC).not.toBe(fingerprintB);
  });

  it('writes the fingerprint on every env state mutation', async () => {
    const { ctx, db } = createFakeConvexContext(buildFingerprintSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-fp-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
    });

    const stored = db.list('processEnvironmentStates')[0] as Record<string, unknown>;
    expect(typeof stored.workingSetFingerprint).toBe('string');
    expect(stored.workingSetFingerprint as string).toMatch(/^[0-9a-f]{64}$/);
  });

  it('projects state as stale at read time when stored fingerprint diverges from current canonical', async () => {
    const { ctx, db } = createFakeConvexContext(buildFingerprintSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-fp-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
    });

    // Mutate canonical inputs after the fingerprint was stored.
    const stateRow = db.list('processFeatureSpecificationStates')[0] as Record<string, unknown>;
    await db.patch(stateRow._id as string, {
      currentArtifactIds: ['artifact-fp-1'],
    });

    const summary = await getProcessEnvironmentSummaryHandler(ctx, {
      processId: 'process-fp-1',
    });

    expect(summary.state).toBe('stale');
  });

  it('keeps state as ready at read time when fingerprint matches', async () => {
    const { ctx } = createFakeConvexContext(buildFingerprintSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-fp-1',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
    });

    const summary = await getProcessEnvironmentSummaryHandler(ctx, {
      processId: 'process-fp-1',
    });
    expect(summary.state).toBe('ready');
  });
});

describe('convex/processEnvironmentStates derives processes.hasEnvironment', () => {
  it('flips hasEnvironment to true when env state row is upserted with a present-environment state', async () => {
    const seed = buildFingerprintSeed();
    const seedProcess = seed.processes[0];
    if (seedProcess === undefined) {
      throw new Error('Expected seeded process.');
    }
    seedProcess.hasEnvironment = false;
    const { ctx, db } = createFakeConvexContext(seed);

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'preparing',
      environmentId: 'env-fp-2',
      blockedReason: null,
      lastHydratedAt: null,
    });

    const processRow = db.list('processes')[0] as Record<string, unknown>;
    expect(processRow.hasEnvironment).toBe(true);
  });

  it('flips hasEnvironment to false when env state moves to absent or lost', async () => {
    const { ctx, db } = createFakeConvexContext(buildFingerprintSeed());

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-fp-3',
      blockedReason: null,
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
    });

    expect((db.list('processes')[0] as Record<string, unknown>).hasEnvironment).toBe(true);

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'lost',
      environmentId: null,
      blockedReason: 'Environment was lost.',
      lastHydratedAt: null,
    });

    expect((db.list('processes')[0] as Record<string, unknown>).hasEnvironment).toBe(false);
  });

  it("treats 'unavailable' as environment-present because the working copy still exists", async () => {
    const seed = buildFingerprintSeed();
    const seedProcess = seed.processes[0];
    if (seedProcess === undefined) {
      throw new Error('Expected seeded process.');
    }
    seedProcess.hasEnvironment = false;
    const { ctx, db } = createFakeConvexContext(seed);

    await upsertProcessEnvironmentStateHandler(ctx, {
      processId: 'process-fp-1',
      providerKind: 'local',
      state: 'unavailable',
      environmentId: 'env-fp-unavailable-1',
      blockedReason: 'Environment lifecycle work is currently unavailable.',
      lastHydratedAt: '2026-04-15T12:10:00.000Z',
    });

    expect((db.list('processes')[0] as Record<string, unknown>).hasEnvironment).toBe(true);
  });
});
