import { describe, expect, it } from 'vitest';
import {
  createProjectSourceAttachment,
  detachSourceAttachment,
  getProjectSourceAttachmentSummary,
  listProjectSourceAttachmentSummaries,
  updateSourceAttachment,
} from './sourceAttachments.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

type SourceAttachmentSummaryShape = {
  sourceAttachmentId: string;
  provider: 'github';
  displayName: string;
  purpose: 'research' | 'review' | 'implementation' | 'other';
  accessMode: 'read_only' | 'read_write';
  repositoryUrl: string;
  repositoryFullName: string;
  targetRef: string | null;
  hydrationState: 'not_hydrated' | 'hydrated' | 'stale' | 'unavailable';
  lastHydratedAt: string | null;
  lastHydratedResolvedRef: string | null;
  lastObservedRemoteResolvedRef: string | null;
  freshnessReason: string | null;
  refreshStatus?: 'idle' | 'pending' | 'failed';
  refreshRequestedAt?: string | null;
  attachmentScope: 'project' | 'process';
  processId: string | null;
  processDisplayLabel: string | null;
  detachedAt?: string | null;
  updatedAt: string;
};

const listProjectSourceAttachmentSummariesHandler = getHandler<
  { projectId: string },
  SourceAttachmentSummaryShape[]
>(listProjectSourceAttachmentSummaries);
const createProjectSourceAttachmentHandler = getHandler<
  {
    projectId: string;
    provider: 'github';
    displayName: string;
    purpose: 'research' | 'review' | 'implementation' | 'other';
    accessMode: 'read_only' | 'read_write';
    repositoryUrl: string;
    repositoryFullName: string;
    targetRef: string | null;
  },
  SourceAttachmentSummaryShape
>(createProjectSourceAttachment);
const getProjectSourceAttachmentSummaryHandler = getHandler<
  { projectId: string; sourceAttachmentId: string },
  SourceAttachmentSummaryShape | null
>(getProjectSourceAttachmentSummary);
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
const updateSourceAttachmentHandler = getHandler<
  {
    projectId: string;
    sourceAttachmentId: string;
    purpose: 'research' | 'review' | 'implementation' | 'other';
    accessMode: 'read_only' | 'read_write';
    targetRef: string | null;
    hydrationState?: 'not_hydrated' | 'hydrated' | 'stale' | 'unavailable';
    freshnessReason?: string | null;
  },
  SourceAttachmentSummaryShape
>(updateSourceAttachment);

function buildSourceAttachmentsSeed() {
  return {
    projects: [
      {
        _id: 'project-sources-1',
        _creationTime: 1,
        name: 'Project Sources',
        ownerUserId: 'user-1',
        processCount: 1,
        artifactCount: 0,
        sourceAttachmentCount: 3,
        lastUpdatedAt: '2026-04-15T12:00:00.000Z',
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-sources-1',
        _creationTime: 2,
        projectId: 'project-sources-1',
        processType: 'FeatureImplementation',
        displayLabel: 'Feature Implementation #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        currentRequestHistoryItemId: null,
        hasEnvironment: true,
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processFeatureImplementationStates: [
      {
        _id: 'process-feature-implementation-state-sources-1',
        _creationTime: 3,
        processId: 'process-sources-1',
        currentArtifactIds: [],
        currentSourceAttachmentIds: ['source-readonly-project-1', 'source-writable-process-1'],
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    processEnvironmentStates: [
      {
        _id: 'process-environment-state-sources-1',
        _creationTime: 4,
        processId: 'process-sources-1',
        providerKind: 'local',
        environmentId: 'env-sources-1',
        state: 'ready',
        blockedReason: null,
        lastHydratedAt: '2026-04-15T12:00:00.000Z',
        lastCheckpointAt: null,
        lastCheckpointResult: null,
        workingSetPlan: {
          artifactIds: [],
          sourceAttachmentIds: ['source-readonly-project-1', 'source-writable-process-1'],
          outputIds: [],
        },
        workingSetFingerprint: 'seeded-fingerprint',
        createdAt: '2026-04-15T12:00:00.000Z',
        updatedAt: '2026-04-15T12:00:00.000Z',
      },
    ],
    sourceAttachments: [
      {
        _id: 'source-readonly-project-1',
        _creationTime: 10,
        projectId: 'project-sources-1',
        processId: null,
        provider: 'github',
        displayName: 'reference-repo',
        purpose: 'research',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/reference-repo',
        repositoryFullName: 'liminal-ai/reference-repo',
        targetRef: 'main',
        hydrationState: 'hydrated',
        lastHydratedAt: '2026-04-15T12:01:00.000Z',
        lastHydratedResolvedRef: 'a'.repeat(40),
        lastObservedRemoteResolvedRef: 'a'.repeat(40),
        freshnessReason: null,
        refreshStatus: 'idle',
        refreshRequestedAt: null,
        detachedAt: null,
        detachedByUserId: null,
        updatedAt: '2026-04-15T12:05:00.000Z',
      },
      {
        _id: 'source-writable-process-1',
        _creationTime: 11,
        projectId: 'project-sources-1',
        processId: 'process-sources-1',
        provider: 'github',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef: 'feature/epic-03',
        hydrationState: 'hydrated',
        lastHydratedAt: '2026-04-15T12:08:00.000Z',
        lastHydratedResolvedRef: 'b'.repeat(40),
        lastObservedRemoteResolvedRef: 'b'.repeat(40),
        freshnessReason: null,
        refreshStatus: 'idle',
        refreshRequestedAt: null,
        detachedAt: null,
        detachedByUserId: null,
        updatedAt: '2026-04-15T12:10:00.000Z',
      },
      {
        _id: 'source-readonly-stale-1',
        _creationTime: 12,
        projectId: 'project-sources-1',
        processId: null,
        provider: 'github',
        displayName: 'stale-branch',
        purpose: 'review',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/stale-branch-repo',
        repositoryFullName: 'liminal-ai/stale-branch-repo',
        targetRef: 'old-phase',
        hydrationState: 'stale',
        lastHydratedAt: '2026-04-15T11:55:00.000Z',
        lastHydratedResolvedRef: 'c'.repeat(40),
        lastObservedRemoteResolvedRef: 'd'.repeat(40),
        freshnessReason: 'target_ref_changed',
        refreshStatus: 'pending',
        refreshRequestedAt: '2026-04-15T12:04:00.000Z',
        detachedAt: null,
        detachedByUserId: null,
        updatedAt: '2026-04-15T12:03:00.000Z',
      },
    ],
  };
}

describe('convex/sourceAttachments summaries', () => {
  it('returns accessMode in the durable source attachment projection', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });

    expect(summaries).toHaveLength(3);
    for (const summary of summaries) {
      expect(summary.accessMode === 'read_only' || summary.accessMode === 'read_write').toBe(true);
    }
  });

  it('preserves hydrationState and targetRef alongside the new accessMode field', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });
    const byId = new Map(summaries.map((summary) => [summary.sourceAttachmentId, summary]));

    expect(byId.get('source-readonly-project-1')).toMatchObject({
      hydrationState: 'hydrated',
      targetRef: 'main',
      accessMode: 'read_only',
    });
    expect(byId.get('source-writable-process-1')).toMatchObject({
      hydrationState: 'hydrated',
      targetRef: 'feature/epic-03',
      accessMode: 'read_write',
    });
    expect(byId.get('source-readonly-stale-1')).toMatchObject({
      hydrationState: 'stale',
      targetRef: 'old-phase',
      accessMode: 'read_only',
    });
  });

  it('keeps process linkage fields while adding accessMode', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });
    const writable = summaries.find(
      (summary) => summary.sourceAttachmentId === 'source-writable-process-1',
    );
    const projectScoped = summaries.find(
      (summary) => summary.sourceAttachmentId === 'source-readonly-project-1',
    );

    expect(writable).toMatchObject({
      attachmentScope: 'process',
      processId: 'process-sources-1',
      processDisplayLabel: 'Feature Implementation #1',
      accessMode: 'read_write',
    });
    expect(projectScoped).toMatchObject({
      attachmentScope: 'project',
      processId: null,
      processDisplayLabel: null,
      accessMode: 'read_only',
    });
  });

  it('returns repositoryUrl on every projected source attachment summary', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });
    const byId = new Map(summaries.map((summary) => [summary.sourceAttachmentId, summary]));

    expect(byId.get('source-readonly-project-1')?.repositoryUrl).toBe(
      'https://github.com/liminal-ai/reference-repo',
    );
    expect(byId.get('source-writable-process-1')?.repositoryUrl).toBe(
      'https://github.com/liminal-ai/liminal-build',
    );
    expect(byId.get('source-readonly-stale-1')?.repositoryUrl).toBe(
      'https://github.com/liminal-ai/stale-branch-repo',
    );
  });

  it('projects canonical identity and freshness snapshot fields for each source', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });
    const byId = new Map(summaries.map((summary) => [summary.sourceAttachmentId, summary]));

    expect(byId.get('source-readonly-project-1')).toMatchObject({
      provider: 'github',
      repositoryFullName: 'liminal-ai/reference-repo',
      lastHydratedAt: '2026-04-15T12:01:00.000Z',
      lastHydratedResolvedRef: 'a'.repeat(40),
      lastObservedRemoteResolvedRef: 'a'.repeat(40),
      freshnessReason: null,
      refreshStatus: 'idle',
      refreshRequestedAt: null,
      detachedAt: null,
    });
    expect(byId.get('source-readonly-stale-1')).toMatchObject({
      repositoryFullName: 'liminal-ai/stale-branch-repo',
      freshnessReason: 'target_ref_changed',
      refreshStatus: 'pending',
      refreshRequestedAt: '2026-04-15T12:04:00.000Z',
    });
  });

  it('projects mixed read_only and read_write attachments distinctly', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });

    const readOnly = summaries.filter((summary) => summary.accessMode === 'read_only');
    const readWrite = summaries.filter((summary) => summary.accessMode === 'read_write');

    expect(readOnly).toHaveLength(2);
    expect(readWrite).toHaveLength(1);
    expect(readWrite[0]?.sourceAttachmentId).toBe('source-writable-process-1');
  });

  it('TC-1.3b treats missing target ref as a duplicate missing target ref', async () => {
    const { ctx, db } = createFakeConvexContext(buildSourceAttachmentsSeed());

    await createProjectSourceAttachmentHandler(ctx, {
      projectId: 'project-sources-1',
      provider: 'github',
      displayName: 'missing-target-ref',
      purpose: 'research',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/missing-target-ref',
      repositoryFullName: 'liminal-ai/missing-target-ref',
      targetRef: null,
    });

    await expect(
      createProjectSourceAttachmentHandler(ctx, {
        projectId: 'project-sources-1',
        provider: 'github',
        displayName: 'missing-target-ref duplicate',
        purpose: 'research',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/missing-target-ref',
        repositoryFullName: 'liminal-ai/missing-target-ref',
        targetRef: null,
      }),
    ).rejects.toThrow('SOURCE_ATTACHMENT_CONFLICT');

    const duplicates = db
      .list('sourceAttachments')
      .filter(
        (sourceAttachment) =>
          sourceAttachment.projectId === 'project-sources-1' &&
          sourceAttachment.processId === null &&
          sourceAttachment.repositoryFullName === 'liminal-ai/missing-target-ref' &&
          sourceAttachment.targetRef === null &&
          sourceAttachment.detachedAt === null,
      );

    expect(duplicates).toHaveLength(1);
  });

  it('TC-2.4a target-ref change marks a hydrated source stale', async () => {
    const { ctx, db } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const updated = await updateSourceAttachmentHandler(ctx, {
      projectId: 'project-sources-1',
      sourceAttachmentId: 'source-readonly-project-1',
      purpose: 'research',
      accessMode: 'read_only',
      targetRef: 'release/next',
      hydrationState: 'stale',
      freshnessReason: 'target_ref_changed',
    });

    expect(updated).toMatchObject({
      sourceAttachmentId: 'source-readonly-project-1',
      targetRef: 'release/next',
      hydrationState: 'stale',
      freshnessReason: 'target_ref_changed',
    });

    const storedAttachment = db
      .list('sourceAttachments')
      .find((attachment) => attachment._id === 'source-readonly-project-1');
    expect(storedAttachment).toMatchObject({
      targetRef: 'release/next',
      hydrationState: 'stale',
      freshnessReason: 'target_ref_changed',
    });
  });

  it('detached rows are excluded from active lookups but still exist durably', async () => {
    const { ctx, db } = createFakeConvexContext(buildSourceAttachmentsSeed());

    const detached = await detachSourceAttachmentHandler(ctx, {
      projectId: 'project-sources-1',
      sourceAttachmentId: 'source-readonly-project-1',
      detachedByUserId: 'user-1',
    });

    expect(detached).toMatchObject({
      detached: true,
      sourceAttachmentId: 'source-readonly-project-1',
    });

    await expect(
      getProjectSourceAttachmentSummaryHandler(ctx, {
        projectId: 'project-sources-1',
        sourceAttachmentId: 'source-readonly-project-1',
      }),
    ).resolves.toBeNull();

    const storedAttachment = db
      .list('sourceAttachments')
      .find((attachment) => attachment._id === 'source-readonly-project-1');
    expect(storedAttachment).toMatchObject({
      detachedAt: detached.detachedAt,
      detachedByUserId: 'user-1',
    });
    expect(db.list('processFeatureImplementationStates')[0]).toMatchObject({
      currentSourceAttachmentIds: ['source-writable-process-1'],
    });
    expect(db.list('processEnvironmentStates')[0]).toMatchObject({
      workingSetPlan: {
        artifactIds: [],
        sourceAttachmentIds: ['source-writable-process-1'],
        outputIds: [],
      },
    });
  });

  it('lists more than 200 project source attachments without dropping older rows', async () => {
    const { ctx } = createFakeConvexContext(buildSourceAttachmentsSeed());

    for (let index = 0; index < 205; index += 1) {
      await createProjectSourceAttachmentHandler(ctx, {
        projectId: 'project-sources-1',
        provider: 'github',
        displayName: `bulk-source-${index}`,
        purpose: 'research',
        accessMode: 'read_only',
        repositoryUrl: `https://github.com/liminal-ai/bulk-source-${index}`,
        repositoryFullName: `liminal-ai/bulk-source-${index}`,
        targetRef: `feature/bulk-${index}`,
      });
    }

    const summaries = await listProjectSourceAttachmentSummariesHandler(ctx, {
      projectId: 'project-sources-1',
    });

    expect(summaries).toHaveLength(208);
    expect(
      summaries.some(
        (summary) =>
          summary.repositoryFullName === 'liminal-ai/reference-repo' &&
          summary.sourceAttachmentId === 'source-readonly-project-1',
      ),
    ).toBe(true);
    expect(
      summaries.some(
        (summary) =>
          summary.repositoryFullName === 'liminal-ai/bulk-source-204' &&
          summary.targetRef === 'feature/bulk-204',
      ),
    ).toBe(true);
  });
});
