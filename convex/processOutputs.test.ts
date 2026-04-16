import { describe, expect, it } from 'vitest';
import { listProcessOutputs, replaceCurrentProcessOutputs } from './processOutputs.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const replaceCurrentProcessOutputsHandler = getHandler<
  {
    processId: string;
    outputs: Array<{
      outputId?: string;
      linkedArtifactId: string | null;
      displayName: string;
      revisionLabel: string | null;
      state: string;
      updatedAt?: string;
    }>;
  },
  Array<{
    outputId: string;
    linkedArtifactId: string | null;
    displayName: string;
    revisionLabel: string | null;
    state: string;
    updatedAt: string;
  }>
>(replaceCurrentProcessOutputs);

const listProcessOutputsHandler = getHandler<
  { processId: string },
  Array<{
    outputId: string;
    linkedArtifactId: string | null;
    displayName: string;
    revisionLabel: string | null;
    state: string;
    updatedAt: string;
  }>
>(listProcessOutputs);

function buildOutputSeed() {
  return {
    projects: [
      {
        _id: 'project-1',
        _creationTime: 1,
        name: 'Project One',
        ownerUserId: 'user-1',
        processCount: 1,
        artifactCount: 1,
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
        hasEnvironment: false,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-linked-1',
        _creationTime: 3,
        projectId: 'project-1',
        processId: 'process-1',
        displayName: 'Feature Spec Draft',
        currentVersionLabel: 'draft-3',
        updatedAt: '2026-04-15T12:10:00.000Z',
      },
      {
        _id: 'artifact-other-project-1',
        _creationTime: 4,
        projectId: 'project-2',
        processId: null,
        displayName: 'Foreign Artifact',
        currentVersionLabel: 'v1',
        updatedAt: '2026-04-15T12:09:00.000Z',
      },
    ],
    processOutputs: [
      {
        _id: 'output-stale-1',
        _creationTime: 5,
        processId: 'process-1',
        linkedArtifactId: null,
        displayName: 'Old Review Notes',
        revisionLabel: 'notes-1',
        state: 'in_progress',
        updatedAt: '2026-04-15T12:05:00.000Z',
      },
      {
        _id: 'output-update-1',
        _creationTime: 6,
        processId: 'process-1',
        linkedArtifactId: null,
        displayName: 'Review Notes',
        revisionLabel: 'notes-1',
        state: 'in_progress',
        updatedAt: '2026-04-15T12:06:00.000Z',
      },
    ],
  };
}

describe('convex/processOutputs current output replacement', () => {
  it('persists current outputs and preserves linkedArtifactId for the reader', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildOutputSeed(),
      processOutputs: [],
    });

    const outputs = await replaceCurrentProcessOutputsHandler(ctx, {
      processId: 'process-1',
      outputs: [
        {
          linkedArtifactId: 'artifact-linked-1',
          displayName: 'Published Spec Snapshot',
          revisionLabel: 'draft-3',
          state: 'published_to_artifact',
          updatedAt: '2026-04-15T12:12:00.000Z',
        },
        {
          linkedArtifactId: null,
          displayName: 'Review Notes',
          revisionLabel: 'notes-2',
          state: 'ready_for_review',
          updatedAt: '2026-04-15T12:13:00.000Z',
        },
      ],
    });

    expect(outputs).toEqual([
      expect.objectContaining({
        displayName: 'Review Notes',
        revisionLabel: 'notes-2',
        state: 'ready_for_review',
        linkedArtifactId: null,
      }),
      expect.objectContaining({
        displayName: 'Published Spec Snapshot',
        revisionLabel: 'draft-3',
        state: 'published_to_artifact',
        linkedArtifactId: 'artifact-linked-1',
      }),
    ]);
    await expect(
      listProcessOutputsHandler(ctx, {
        processId: 'process-1',
      }),
    ).resolves.toEqual(outputs);
  });

  it('replaces stale outputs when the current revision set changes', async () => {
    const { ctx, db } = createFakeConvexContext(buildOutputSeed());

    const outputs = await replaceCurrentProcessOutputsHandler(ctx, {
      processId: 'process-1',
      outputs: [
        {
          outputId: 'output-update-1',
          linkedArtifactId: null,
          displayName: 'Review Notes',
          revisionLabel: 'notes-2',
          state: 'ready_for_review',
          updatedAt: '2026-04-15T12:14:00.000Z',
        },
      ],
    });

    expect(outputs).toEqual([
      {
        outputId: 'output-update-1',
        linkedArtifactId: null,
        displayName: 'Review Notes',
        revisionLabel: 'notes-2',
        state: 'ready_for_review',
        updatedAt: '2026-04-15T12:14:00.000Z',
      },
    ]);
    expect(db.list('processOutputs')).toHaveLength(1);
    expect(db.list('processOutputs')[0]).toMatchObject({
      _id: 'output-update-1',
      revisionLabel: 'notes-2',
      state: 'ready_for_review',
    });
  });

  it('rejects linked artifacts from another project', async () => {
    const { ctx } = createFakeConvexContext({
      ...buildOutputSeed(),
      processOutputs: [],
    });

    await expect(
      replaceCurrentProcessOutputsHandler(ctx, {
        processId: 'process-1',
        outputs: [
          {
            linkedArtifactId: 'artifact-other-project-1',
            displayName: 'Foreign Output',
            revisionLabel: 'v1',
            state: 'published_to_artifact',
          },
        ],
      }),
    ).rejects.toThrow('Linked artifact must belong to the same project as the process.');
  });
});
