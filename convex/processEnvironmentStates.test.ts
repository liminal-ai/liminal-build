import { describe, expect, it } from 'vitest';
import {
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
    providerKind: 'daytona' | 'local' | null;
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
