import { describe, expect, it } from 'vitest';
import { detachSourceAttachment } from './sourceAttachments.js';
import { createSourceProvenance, listProcessSourceProvenanceEntries } from './sourceProvenance.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const createSourceProvenanceHandler = getHandler<
  {
    projectId: string;
    processId: string;
    sourceAttachmentId: string | null;
    relationshipKind: 'informed_work' | 'received_code_update';
    repositoryFullName: string;
    repositoryUrl: string;
    targetRef: string | null;
    eventId: string | null;
    entryStatus: 'ready' | 'degraded';
    degradationReason: string | null;
    recordedAt?: string;
  },
  {
    provenanceId: string;
    projectId: string;
    processId: string;
    sourceAttachmentId: string | null;
    relationshipKind: 'informed_work' | 'received_code_update';
    repositoryFullName: string;
    repositoryUrl: string;
    targetRef: string | null;
    eventId: string | null;
    entryStatus: 'ready' | 'degraded';
    degradationReason: string | null;
    recordedAt: string;
  }
>(createSourceProvenance);
const listProcessSourceProvenanceEntriesHandler = getHandler<
  { processId: string },
  Array<{
    provenanceId: string;
    projectId: string;
    processId: string;
    sourceAttachmentId: string | null;
    relationshipKind: 'informed_work' | 'received_code_update';
    repositoryFullName: string;
    repositoryUrl: string;
    targetRef: string | null;
    eventId: string | null;
    entryStatus: 'ready' | 'degraded';
    degradationReason: string | null;
    recordedAt: string;
  }>
>(listProcessSourceProvenanceEntries);
const detachSourceAttachmentHandler = getHandler<
  {
    projectId: string;
    sourceAttachmentId: string;
    detachedByUserId: string;
  },
  {
    detached: true;
    sourceAttachmentId: string;
    detachedAt: string;
  }
>(detachSourceAttachment);

describe('convex/sourceProvenance', () => {
  it('TC-5.2a prior provenance remains after detach', async () => {
    const { ctx } = createFakeConvexContext({
      projects: [
        {
          _id: 'project-source-provenance-1',
          _creationTime: 1,
          name: 'Project Source Provenance',
          ownerUserId: 'user-1',
          processCount: 1,
          artifactCount: 0,
          sourceAttachmentCount: 1,
          lastUpdatedAt: '2026-05-02T10:00:00.000Z',
          createdAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
      ],
      processes: [
        {
          _id: 'process-source-provenance-1',
          _creationTime: 2,
          projectId: 'project-source-provenance-1',
          processType: 'FeatureImplementation',
          displayLabel: 'Feature Implementation #1',
          status: 'running',
          phaseLabel: 'Working',
          nextActionLabel: 'Monitor progress in the work surface',
          currentRequestHistoryItemId: null,
          hasEnvironment: true,
          createdAt: '2026-05-02T10:00:00.000Z',
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
      ],
      sourceAttachments: [
        {
          _id: 'source-provenance-1',
          _creationTime: 3,
          projectId: 'project-source-provenance-1',
          processId: 'process-source-provenance-1',
          provider: 'github',
          displayName: 'liminal-build',
          purpose: 'implementation',
          accessMode: 'read_write',
          repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
          repositoryFullName: 'liminal-ai/liminal-build',
          targetRef: 'feature/story-5',
          hydrationState: 'hydrated',
          lastHydratedAt: '2026-05-02T10:00:00.000Z',
          lastHydratedResolvedRef: 'a'.repeat(40),
          lastObservedRemoteResolvedRef: 'a'.repeat(40),
          freshnessReason: null,
          refreshStatus: 'idle',
          refreshRequestedAt: null,
          detachedAt: null,
          detachedByUserId: null,
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
      ],
      sourceProvenance: [],
    });

    await createSourceProvenanceHandler(ctx, {
      projectId: 'project-source-provenance-1',
      processId: 'process-source-provenance-1',
      sourceAttachmentId: 'source-provenance-1',
      relationshipKind: 'received_code_update',
      repositoryFullName: 'liminal-ai/liminal-build',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      targetRef: 'feature/story-5',
      eventId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: '2026-05-02T10:05:00.000Z',
    });

    await detachSourceAttachmentHandler(ctx, {
      projectId: 'project-source-provenance-1',
      sourceAttachmentId: 'source-provenance-1',
      detachedByUserId: 'user-1',
    });

    const entries = await listProcessSourceProvenanceEntriesHandler(ctx, {
      processId: 'process-source-provenance-1',
    });

    expect(entries).toEqual([
      expect.objectContaining({
        sourceAttachmentId: 'source-provenance-1',
        relationshipKind: 'received_code_update',
        repositoryFullName: 'liminal-ai/liminal-build',
        recordedAt: '2026-05-02T10:05:00.000Z',
      }),
    ]);
  });
});
