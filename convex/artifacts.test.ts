import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteArtifactWithContent,
  fetchArtifactContentForService,
  fetchArtifactContentInternal,
  lookupArtifactStorageIdInternal,
  persistCheckpointArtifactsForService,
  persistCheckpointArtifactsInternal,
  recordCheckpointArtifactsInternal,
} from './artifacts.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

type RuntimeProcess = {
  env?: Record<string, string | undefined>;
};

function readRuntimeApiKey(): string | undefined {
  const runtime = globalThis as {
    process?: unknown;
  };
  const processValue = runtime.process as RuntimeProcess | undefined;
  return processValue?.env?.CONVEX_API_KEY;
}

function writeRuntimeApiKey(value: string | undefined): void {
  const runtime = globalThis as {
    process?: unknown;
  };
  const processValue = (runtime.process as RuntimeProcess | undefined) ?? {};
  processValue.env ??= {};
  runtime.process = processValue;

  if (value === undefined) {
    delete processValue.env.CONVEX_API_KEY;
    return;
  }

  processValue.env.CONVEX_API_KEY = value;
}

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
>(persistCheckpointArtifactsInternal);

const persistCheckpointArtifactsForServiceHandler = getHandler<
  {
    apiKey: string;
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
>(persistCheckpointArtifactsForService);

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

const fetchArtifactContentInternalHandler = getHandler<{ artifactId: string }, string | null>(
  fetchArtifactContentInternal,
);

const fetchArtifactContentForServiceHandler = getHandler<
  { apiKey: string; artifactId: string },
  string | null
>(fetchArtifactContentForService);

const lookupArtifactStorageIdInternalHandler = getHandler<{ artifactId: string }, string | null>(
  lookupArtifactStorageIdInternal,
);

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
  // Wire the internal mutation/query/action references used by the public
  // service wrappers so the fake `ctx.runMutation` / `ctx.runQuery` /
  // `ctx.runAction` can resolve them by canonical Convex name.
  fixture.registry.register(
    'artifacts:recordCheckpointArtifactsInternal',
    recordCheckpointArtifactsInternalHandler as unknown as (
      ctx: unknown,
      args: unknown,
    ) => Promise<unknown>,
  );
  fixture.registry.register(
    'artifacts:persistCheckpointArtifactsInternal',
    persistCheckpointArtifactsHandler as unknown as (
      ctx: unknown,
      args: unknown,
    ) => Promise<unknown>,
  );
  fixture.registry.register(
    'artifacts:fetchArtifactContentInternal',
    fetchArtifactContentInternalHandler as unknown as (
      ctx: unknown,
      args: unknown,
    ) => Promise<unknown>,
  );
  fixture.registry.register(
    'artifacts:lookupArtifactStorageIdInternal',
    lookupArtifactStorageIdInternalHandler as unknown as (
      ctx: unknown,
      args: unknown,
    ) => Promise<unknown>,
  );
  return fixture;
}

describe('convex/artifacts checkpoint persistence with file storage', () => {
  const originalApiKey = readRuntimeApiKey();

  beforeEach(() => {
    writeRuntimeApiKey('test-convex-api-key');
  });

  afterEach(() => {
    writeRuntimeApiKey(originalApiKey);
  });

  it('delegates artifact persistence through the public service wrapper when the api key is valid', async () => {
    const { ctx, db } = buildArtifactCtx();

    const outputs = await persistCheckpointArtifactsForServiceHandler(ctx, {
      apiKey: 'test-convex-api-key',
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:25:00.000Z',
          contents: '# Public Wrapper\n\nBody.',
          targetLabel: 'Service Wrapper Artifact',
        },
      ],
    });

    expect(outputs).toHaveLength(1);
    expect(db.list('artifacts')).toHaveLength(1);
  });

  it('rejects artifact persistence through the public service wrapper when the api key is invalid', async () => {
    const { ctx, storage } = buildArtifactCtx();

    await expect(
      persistCheckpointArtifactsForServiceHandler(ctx, {
        apiKey: 'wrong-api-key',
        processId: 'process-artifacts-1',
        artifacts: [
          {
            producedAt: '2026-04-15T12:26:00.000Z',
            contents: 'should not persist',
            targetLabel: 'Rejected Artifact',
          },
        ],
      }),
    ).rejects.toThrow('Unauthorized service API key.');

    expect(storage.list()).toHaveLength(0);
  });

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

  it('delegates artifact content reads through the public service wrapper when the api key is valid', async () => {
    const { ctx, db } = buildArtifactCtx();

    await persistCheckpointArtifactsHandler(ctx, {
      processId: 'process-artifacts-1',
      artifacts: [
        {
          producedAt: '2026-04-15T12:30:00.000Z',
          contents: 'public fetch body',
          targetLabel: 'Fetch Wrapper Artifact',
        },
      ],
    });

    const artifactId = (db.list('artifacts')[0] as Record<string, unknown>)._id as string;

    await expect(
      fetchArtifactContentForServiceHandler(ctx, {
        apiKey: 'test-convex-api-key',
        artifactId,
      }),
    ).resolves.toBe('public fetch body');
  });

  it('rejects artifact content reads through the public service wrapper when the api key is invalid', async () => {
    const { ctx } = buildArtifactCtx();

    await expect(
      fetchArtifactContentForServiceHandler(ctx, {
        apiKey: 'wrong-api-key',
        artifactId: 'artifacts:1',
      }),
    ).rejects.toThrow('Unauthorized service API key.');
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

  it('rolls back uploaded storage blobs when the internal mutation throws (single artifact)', async () => {
    const { ctx, storage } = buildArtifactCtx();

    await expect(
      persistCheckpointArtifactsHandler(ctx, {
        processId: 'nonexistent-process-id',
        artifacts: [
          {
            producedAt: '2026-04-15T12:40:00.000Z',
            contents: 'body that should be cleaned up',
            targetLabel: 'Orphan Candidate',
          },
        ],
      }),
    ).rejects.toThrow('Process not found.');

    // The mutation threw because the process does not exist. Any blob uploaded
    // before the mutation must be deleted so file storage stays clean.
    expect(storage.list()).toHaveLength(0);
  });

  it('rolls back every previously uploaded blob when the internal mutation throws on a multi-artifact batch', async () => {
    const { ctx, storage } = buildArtifactCtx();

    await expect(
      persistCheckpointArtifactsHandler(ctx, {
        processId: 'nonexistent-process-id',
        artifacts: [
          {
            producedAt: '2026-04-15T12:41:00.000Z',
            contents: 'first body',
            targetLabel: 'Batch Member 1',
          },
          {
            producedAt: '2026-04-15T12:42:00.000Z',
            contents: 'second body',
            targetLabel: 'Batch Member 2',
          },
          {
            producedAt: '2026-04-15T12:43:00.000Z',
            contents: 'third body',
            targetLabel: 'Batch Member 3',
          },
        ],
      }),
    ).rejects.toThrow('Process not found.');

    // All three storage uploads must be rolled back when the row write fails.
    expect(storage.list()).toHaveLength(0);
  });
});
