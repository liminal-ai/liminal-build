import { describe, expect, it } from 'vitest';
import { computeWorkingSetFingerprint } from './processEnvironmentStates.js';
import {
  createProcess,
  getCurrentProcessMaterialRefs,
  setCurrentProcessMaterialRefs,
} from './processes.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const setCurrentProcessMaterialRefsHandler = getHandler<
  {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  },
  { artifactIds: string[]; sourceAttachmentIds: string[] }
>(setCurrentProcessMaterialRefs);

const getCurrentProcessMaterialRefsHandler = getHandler<
  { processId: string },
  { artifactIds: string[]; sourceAttachmentIds: string[] }
>(getCurrentProcessMaterialRefs);

const createProcessHandler = getHandler<
  {
    projectId: string;
    processType: 'ProductDefinition' | 'FeatureSpecification' | 'FeatureImplementation';
    displayLabel: string;
  },
  {
    kind: 'created';
    process: { processId: string };
  }
>(createProcess);

function buildProcessSeed() {
  return {
    projects: [
      {
        _id: 'project-1',
        _creationTime: 1,
        name: 'Project One',
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
        _id: 'process-1',
        _creationTime: 2,
        projectId: 'project-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Spec #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processFeatureSpecificationStates: [
      {
        _id: 'process-state-1',
        _creationTime: 3,
        processId: 'process-1',
        currentArtifactIds: ['artifact-stale-1'],
        currentSourceAttachmentIds: ['source-stale-1'],
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-process-1',
        _creationTime: 4,
        projectId: 'project-1',
        processId: 'process-1',
        displayName: 'Feature Spec Draft',
        currentVersionLabel: 'draft-3',
        updatedAt: '2026-04-15T12:10:00.000Z',
      },
      {
        _id: 'artifact-shared-1',
        _creationTime: 5,
        projectId: 'project-1',
        processId: null,
        displayName: 'Shared Architecture Notes',
        currentVersionLabel: 'v2',
        updatedAt: '2026-04-15T12:09:00.000Z',
      },
      {
        _id: 'artifact-other-project-1',
        _creationTime: 6,
        projectId: 'project-2',
        processId: null,
        displayName: 'Foreign Artifact',
        currentVersionLabel: 'v1',
        updatedAt: '2026-04-15T12:08:00.000Z',
      },
      {
        _id: 'artifact-stale-1',
        _creationTime: 7,
        projectId: 'project-1',
        processId: 'process-1',
        displayName: 'Stale Artifact',
        currentVersionLabel: 'v0',
        updatedAt: '2026-04-15T12:07:00.000Z',
      },
    ],
    sourceAttachments: [
      {
        _id: 'source-process-1',
        _creationTime: 8,
        projectId: 'project-1',
        processId: 'process-1',
        displayName: 'liminal-build',
        purpose: 'implementation',
        targetRef: 'main',
        hydrationState: 'hydrated',
        updatedAt: '2026-04-15T12:11:00.000Z',
      },
      {
        _id: 'source-stale-1',
        _creationTime: 9,
        projectId: 'project-1',
        processId: 'process-1',
        displayName: 'old-branch',
        purpose: 'review',
        targetRef: 'old-phase',
        hydrationState: 'stale',
        updatedAt: '2026-04-15T12:06:00.000Z',
      },
      {
        _id: 'source-other-project-1',
        _creationTime: 10,
        projectId: 'project-2',
        processId: null,
        displayName: 'foreign-repo',
        purpose: 'research',
        targetRef: 'main',
        hydrationState: 'hydrated',
        updatedAt: '2026-04-15T12:05:00.000Z',
      },
    ],
  };
}

describe('convex/processes current material refs', () => {
  it('persists the exact current artifact and source refs and reads them back', async () => {
    const { ctx, db } = createFakeConvexContext(buildProcessSeed());

    const result = await setCurrentProcessMaterialRefsHandler(ctx, {
      processId: 'process-1',
      artifactIds: ['artifact-process-1', 'artifact-shared-1', 'artifact-process-1'],
      sourceAttachmentIds: ['source-process-1'],
    });

    expect(result).toEqual({
      artifactIds: ['artifact-process-1', 'artifact-shared-1'],
      sourceAttachmentIds: ['source-process-1'],
    });
    await expect(
      getCurrentProcessMaterialRefsHandler(ctx, {
        processId: 'process-1',
      }),
    ).resolves.toEqual({
      artifactIds: ['artifact-process-1', 'artifact-shared-1'],
      sourceAttachmentIds: ['source-process-1'],
    });
    expect(db.list('processFeatureSpecificationStates')[0]).toMatchObject({
      processId: 'process-1',
      currentArtifactIds: ['artifact-process-1', 'artifact-shared-1'],
      currentSourceAttachmentIds: ['source-process-1'],
    });
  });

  it('replaces stale refs with an empty current set', async () => {
    const { ctx } = createFakeConvexContext(buildProcessSeed());

    await setCurrentProcessMaterialRefsHandler(ctx, {
      processId: 'process-1',
      artifactIds: [],
      sourceAttachmentIds: [],
    });

    await expect(
      getCurrentProcessMaterialRefsHandler(ctx, {
        processId: 'process-1',
      }),
    ).resolves.toEqual({
      artifactIds: [],
      sourceAttachmentIds: [],
    });
  });

  it('rejects current material refs from another project', async () => {
    const { ctx } = createFakeConvexContext(buildProcessSeed());

    await expect(
      setCurrentProcessMaterialRefsHandler(ctx, {
        processId: 'process-1',
        artifactIds: ['artifact-other-project-1'],
        sourceAttachmentIds: ['source-other-project-1'],
      }),
    ).rejects.toThrow('Current artifacts must belong to the same project as the process.');
  });
});

describe('convex/processes createProcess initial fingerprint', () => {
  function buildCreateProcessSeed() {
    return {
      projects: [
        {
          _id: 'project-create-1',
          _creationTime: 1,
          name: 'Project Create',
          ownerUserId: 'user-1',
          processCount: 0,
          artifactCount: 0,
          sourceAttachmentCount: 0,
          lastUpdatedAt: '2026-04-15T12:00:00.000Z',
          createdAt: '2026-04-15T12:00:00.000Z',
          updatedAt: '2026-04-15T12:00:00.000Z',
        },
      ],
    };
  }

  it('stores a non-null workingSetFingerprint on the initial env state row that matches computeWorkingSetFingerprint', async () => {
    const { ctx, db } = createFakeConvexContext(buildCreateProcessSeed());

    const created = await createProcessHandler(ctx, {
      projectId: 'project-create-1',
      processType: 'FeatureSpecification',
      displayLabel: 'Created Process',
    });

    const envStateRows = db.list('processEnvironmentStates');
    expect(envStateRows).toHaveLength(1);
    const envStateRow = envStateRows[0] as Record<string, unknown>;

    // The fingerprint must be populated, never null, so read-time stale
    // comparison has a meaningful baseline from creation.
    expect(envStateRow.workingSetFingerprint).not.toBeNull();
    expect(typeof envStateRow.workingSetFingerprint).toBe('string');
    expect(envStateRow.workingSetFingerprint as string).toMatch(/^[0-9a-f]{64}$/);

    // The stored fingerprint must equal a fresh computation against the same
    // process, so subsequent comparisons hold.
    const recomputed = await computeWorkingSetFingerprint(
      ctx as unknown as Parameters<typeof computeWorkingSetFingerprint>[0],
      created.process.processId as never,
    );
    expect(envStateRow.workingSetFingerprint).toBe(recomputed);
  });

  it('stores a non-null fingerprint for every supported process type', async () => {
    const processTypes: Array<
      'ProductDefinition' | 'FeatureSpecification' | 'FeatureImplementation'
    > = ['ProductDefinition', 'FeatureSpecification', 'FeatureImplementation'];

    for (const processType of processTypes) {
      const { ctx, db } = createFakeConvexContext(buildCreateProcessSeed());

      await createProcessHandler(ctx, {
        projectId: 'project-create-1',
        processType,
        displayLabel: `Created ${processType}`,
      });

      const envStateRow = db.list('processEnvironmentStates')[0] as Record<string, unknown>;
      expect(envStateRow.workingSetFingerprint).not.toBeNull();
      expect(envStateRow.workingSetFingerprint as string).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
