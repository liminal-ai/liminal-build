import { describe, expect, it } from 'vitest';
import { listProjectSourceAttachmentSummaries } from './sourceAttachments.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

type SourceAttachmentSummaryShape = {
  sourceAttachmentId: string;
  displayName: string;
  purpose: 'research' | 'review' | 'implementation' | 'other';
  accessMode: 'read_only' | 'read_write';
  repositoryUrl: string;
  targetRef: string | null;
  hydrationState: 'not_hydrated' | 'hydrated' | 'stale' | 'unavailable';
  attachmentScope: 'project' | 'process';
  processId: string | null;
  processDisplayLabel: string | null;
  updatedAt: string;
};

const listProjectSourceAttachmentSummariesHandler = getHandler<
  { projectId: string },
  SourceAttachmentSummaryShape[]
>(listProjectSourceAttachmentSummaries);

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
    sourceAttachments: [
      {
        _id: 'source-readonly-project-1',
        _creationTime: 10,
        projectId: 'project-sources-1',
        processId: null,
        displayName: 'reference-repo',
        purpose: 'research',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/reference-repo',
        targetRef: 'main',
        hydrationState: 'hydrated',
        updatedAt: '2026-04-15T12:05:00.000Z',
      },
      {
        _id: 'source-writable-process-1',
        _creationTime: 11,
        projectId: 'project-sources-1',
        processId: 'process-sources-1',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        targetRef: 'feature/epic-03',
        hydrationState: 'hydrated',
        updatedAt: '2026-04-15T12:10:00.000Z',
      },
      {
        _id: 'source-readonly-stale-1',
        _creationTime: 12,
        projectId: 'project-sources-1',
        processId: null,
        displayName: 'stale-branch',
        purpose: 'review',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/stale-branch-repo',
        targetRef: 'old-phase',
        hydrationState: 'stale',
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
});
