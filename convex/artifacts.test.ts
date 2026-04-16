import { describe, expect, it } from 'vitest';
import {
  deleteArtifactWithContent,
  persistCheckpointArtifacts,
  recordCheckpointArtifactsInternal,
} from './artifacts.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const persistCheckpointArtifactsHandler = getHandler<
  {
    processId: string;
    artifacts: Array<{
      artifactId?: string;
      producedAt: string;
      contents: string;
      targetLabel: string;
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
>(persistCheckpointArtifacts);

const recordCheckpointArtifactsInternalHandler = getHandler<
  {
    processId: string;
    artifacts: Array<{
      artifactId?: string;
      producedAt: string;
      contentStorageId: string;
      targetLabel: string;
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
>(recordCheckpointArtifactsInternal);

const deleteArtifactWithContentHandler = getHandler<{ artifactId: string }, null>(
  deleteArtifactWithContent,
);

function buildArtifactSeed() {
  return {
    projects: [
      {
        _id: 'project-artifacts-1',
        _creationTime: 1,
        name: 'Project Artifacts',
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
        _id: 'process-artifacts-1',
        _creationTime: 2,
        projectId: 'project-artifacts-1',
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
        _id: 'state-artifacts-1',
        _creationTime: 3,
        processId: 'process-artifacts-1',
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
  };
}

function buildArtifactCtx() {
  const fixture = createFakeConvexContext(buildArtifactSeed());
  // Wire the internal mutation reference used by `persistCheckpointArtifacts`
  // so the fake `ctx.runMutation` can resolve it by canonical Convex name.
  fixture.registry.register(
    'artifacts:recordCheckpointArtifactsInternal',
    recordCheckpointArtifactsInternalHandler as unknown as (
      ctx: unknown,
      args: unknown,
    ) => Promise<unknown>,
  );
  return fixture;
}

describe('convex/artifacts checkpoint persistence with file storage', () => {
  it('uploads contents through ctx.storage.store and writes the storageId on the row', async () => {
    const { ctx, db, storage } = buildArtifactCtx();

    const outputs = await persistCheckpointArtifactsHandler(ctx, {
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:30:00.000Z',
          contents: '# Feature Spec\n\nDraft body.',
          targetLabel: 'Feature Specification Draft',
        },
      ],
    });

    expect(outputs).toHaveLength(1);
    const artifactRows = db.list('artifacts');
    expect(artifactRows).toHaveLength(1);
    const artifactRow = artifactRows[0] as Record<string, unknown>;

    expect(typeof artifactRow.contentStorageId).toBe('string');
    expect(artifactRow.contentStorageId).not.toBe('');
    expect(storage.list()).toContain(artifactRow.contentStorageId);

    const storedBlob = await storage.get(artifactRow.contentStorageId as string);
    expect(storedBlob).not.toBeNull();
    if (storedBlob !== null) {
      const storedText = await storedBlob.text();
      expect(storedText).toBe('# Feature Spec\n\nDraft body.');
    }
  });

  it('reads back the artifact content by fetching ctx.storage.get(contentStorageId)', async () => {
    const { ctx, db, storage } = buildArtifactCtx();

    await persistCheckpointArtifactsHandler(ctx, {
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:30:00.000Z',
          contents: 'second body',
          targetLabel: 'Round-Trip Artifact',
        },
      ],
    });

    const artifactRow = db.list('artifacts')[0] as Record<string, unknown>;
    const contentStorageId = artifactRow.contentStorageId as string;
    const blob = await storage.get(contentStorageId);

    expect(blob).not.toBeNull();
    if (blob !== null) {
      expect(await blob.text()).toBe('second body');
    }
  });

  it('writes contentStorageId via the internal mutation when called directly', async () => {
    const { ctx, db, storage } = buildArtifactCtx();

    const blob = new Blob(['internal mutation body']);
    const contentStorageId = await storage.store(blob);

    const outputs = await recordCheckpointArtifactsInternalHandler(ctx, {
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:35:00.000Z',
          contentStorageId,
          targetLabel: 'Internal Mutation Artifact',
        },
      ],
    });

    expect(outputs).toHaveLength(1);
    const artifactRows = db.list('artifacts');
    expect(artifactRows).toHaveLength(1);
    expect((artifactRows[0] as Record<string, unknown>).contentStorageId).toBe(contentStorageId);
  });

  it('deletes the storage blob when the artifact row is deleted via deleteArtifactWithContent', async () => {
    const { ctx, db, storage } = buildArtifactCtx();

    await persistCheckpointArtifactsHandler(ctx, {
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:30:00.000Z',
          contents: 'body to delete',
          targetLabel: 'Doomed Artifact',
        },
      ],
    });

    const artifactRow = db.list('artifacts')[0] as Record<string, unknown>;
    const artifactId = artifactRow._id as string;
    const contentStorageId = artifactRow.contentStorageId as string;

    expect(storage.list()).toContain(contentStorageId);

    await deleteArtifactWithContentHandler(ctx, { artifactId });

    expect(db.list('artifacts')).toHaveLength(0);
    expect(storage.list()).not.toContain(contentStorageId);
  });
});
