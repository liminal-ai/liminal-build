import { ConvexHttpClient } from 'convex/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
} from '../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../apps/platform/server/services/auth/auth-user-sync.service.js';
import type { ProcessAccessService } from '../../apps/platform/server/services/processes/process-access.service.js';
import { ConvexPlatformStore } from '../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';
import { getArtifactVersion, getLatestArtifactVersion } from '../../convex/artifactVersions.js';
import { listProjectArtifactSummaries } from '../../convex/artifacts.js';
import { listPackageSnapshotMembers } from '../../convex/packageSnapshotMembers.js';
import {
  getPackageSnapshot,
  listPackageSnapshotsForProcess,
  publishPackageSnapshot,
} from '../../convex/packageSnapshots.js';
import { getCurrentProcessMaterialRefs, getProcessRecord } from '../../convex/processes.js';
import { createFakeConvexContext } from '../../convex/test_helpers/fake_convex_context.js';
import { buildApp } from '../utils/build-app.js';

const FUNCTION_NAME_SYMBOL = Symbol.for('functionName');

function readFunctionName(ref: unknown): string | undefined {
  if (ref === null || typeof ref !== 'object') {
    return undefined;
  }

  const direct = (ref as Record<symbol, unknown>)[FUNCTION_NAME_SYMBOL];
  if (typeof direct === 'string') {
    return direct;
  }

  for (const symbol of Object.getOwnPropertySymbols(ref)) {
    if (symbol.description === 'functionName') {
      const value = (ref as Record<symbol, unknown>)[symbol];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return undefined;
}

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_review_workspace_integration',
        cookiePassword: 'review-workspace-integration-cookie-password',
        redirectUri: 'http://localhost:5001/auth/callback',
        loginReturnUri: 'http://localhost:5001/projects',
      });
    }

    override async resolveSession(sessionData?: string): Promise<SessionResolution> {
      if (sessionData === undefined) {
        return {
          actor: null,
          reason: 'missing_session',
        };
      }

      return resolution;
    }
  }

  return new TestAuthSessionService();
}

class PassthroughAuthUserSyncService extends AuthUserSyncService {
  constructor() {
    super({
      upsertUserFromWorkOS: async () => {
        throw new Error('upsertUserFromWorkOS should not be called in this integration test.');
      },
    } as never);
  }

  override async syncActor(actor: {
    userId: string;
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }) {
    return actor;
  }
}

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-review-convex-001',
  name: 'Artifact Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 2,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-convex-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

function buildReviewWorkspaceSeed() {
  return {
    projects: [
      {
        _id: projectSummary.projectId,
        _creationTime: 1,
        ownerUserId: 'user:workos-user-1',
        name: projectSummary.name,
        lastUpdatedAt: projectSummary.lastUpdatedAt,
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: processSummary.processId,
        _creationTime: 2,
        projectId: projectSummary.projectId,
        processType: processSummary.processType,
        displayLabel: processSummary.displayLabel,
        status: processSummary.status,
        phaseLabel: processSummary.phaseLabel,
        nextActionLabel: processSummary.nextActionLabel,
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: processSummary.updatedAt,
      },
    ],
    processFeatureSpecificationStates: [
      {
        _id: 'process-state-review-convex-001',
        _creationTime: 3,
        processId: processSummary.processId,
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-review-convex-001',
        _creationTime: 4,
        projectId: projectSummary.projectId,
        processId: processSummary.processId,
        displayName: 'Specification Markdown',
        createdAt: '2026-04-23T12:01:00.000Z',
      },
      {
        _id: 'artifact-review-convex-002',
        _creationTime: 5,
        projectId: projectSummary.projectId,
        processId: processSummary.processId,
        displayName: 'Implementation Notes',
        createdAt: '2026-04-23T12:02:00.000Z',
      },
    ],
    artifactVersions: [
      {
        _id: 'artifact-version-review-convex-001',
        _creationTime: 6,
        artifactId: 'artifact-review-convex-001',
        versionLabel: 'spec-v1',
        contentStorageId: 'storage-review-convex-001',
        contentKind: 'markdown',
        bytes: 128,
        createdAt: '2026-04-23T12:03:00.000Z',
        createdByProcessId: processSummary.processId,
      },
      {
        _id: 'artifact-version-review-convex-002',
        _creationTime: 7,
        artifactId: 'artifact-review-convex-002',
        versionLabel: 'notes-v1',
        contentStorageId: 'storage-review-convex-002',
        contentKind: 'markdown',
        bytes: 96,
        createdAt: '2026-04-23T12:04:00.000Z',
        createdByProcessId: processSummary.processId,
      },
    ],
  };
}

function buildUnsupportedArtifactSeed() {
  return {
    projects: [
      {
        _id: projectSummary.projectId,
        _creationTime: 1,
        ownerUserId: 'user:workos-user-1',
        name: projectSummary.name,
        lastUpdatedAt: projectSummary.lastUpdatedAt,
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: processSummary.processId,
        _creationTime: 2,
        projectId: projectSummary.projectId,
        processType: processSummary.processType,
        displayLabel: processSummary.displayLabel,
        status: processSummary.status,
        phaseLabel: processSummary.phaseLabel,
        nextActionLabel: processSummary.nextActionLabel,
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: processSummary.updatedAt,
      },
    ],
    processFeatureSpecificationStates: [
      {
        _id: 'process-state-review-convex-unsupported-001',
        _creationTime: 3,
        processId: processSummary.processId,
        currentArtifactIds: ['artifact-review-convex-unsupported-001'],
        currentSourceAttachmentIds: [],
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-review-convex-unsupported-001',
        _creationTime: 4,
        projectId: projectSummary.projectId,
        processId: processSummary.processId,
        displayName: 'Binary Package Manifest',
        createdAt: '2026-04-23T12:05:00.000Z',
      },
    ],
    artifactVersions: [
      {
        _id: 'artifact-version-review-convex-unsupported-001',
        _creationTime: 5,
        artifactId: 'artifact-review-convex-unsupported-001',
        versionLabel: 'manifest-v1',
        contentStorageId: 'storage-review-convex-unsupported-001',
        contentKind: 'unsupported',
        bytes: 64,
        createdAt: '2026-04-23T12:06:00.000Z',
        createdByProcessId: processSummary.processId,
      },
    ],
  };
}

function registerReviewWorkspaceHandlers(fixture: ReturnType<typeof createFakeConvexContext>) {
  const register = <TArgs, TReturn>(functionName: string, registered: unknown) => {
    fixture.registry.register(
      functionName,
      getHandler<TArgs, TReturn>(registered) as unknown as (
        ctx: unknown,
        args: unknown,
      ) => Promise<unknown>,
    );
  };

  register<{ processId: string }, { projectId: string } | null>(
    'processes:getProcessRecord',
    getProcessRecord,
  );
  register<{ processId: string }, { artifactIds: string[]; sourceAttachmentIds: string[] }>(
    'processes:getCurrentProcessMaterialRefs',
    getCurrentProcessMaterialRefs,
  );
  register<{ projectId: string }, unknown[]>(
    'artifacts:listProjectArtifactSummaries',
    listProjectArtifactSummaries,
  );
  register<{ processId: string }, unknown[]>(
    'packageSnapshots:listPackageSnapshotsForProcess',
    listPackageSnapshotsForProcess,
  );
  register<{ packageSnapshotId: string }, unknown | null>(
    'packageSnapshots:getPackageSnapshot',
    getPackageSnapshot,
  );
  register<{ packageSnapshotId: string }, unknown[]>(
    'packageSnapshotMembers:listPackageSnapshotMembers',
    listPackageSnapshotMembers,
  );
  register<{ versionId: string }, unknown | null>(
    'artifactVersions:getArtifactVersion',
    getArtifactVersion,
  );
  register<{ artifactId: string }, unknown | null>(
    'artifactVersions:getLatestArtifactVersion',
    getLatestArtifactVersion,
  );
}

async function startConvexReviewWorkspaceServer(
  fixture: ReturnType<typeof createFakeConvexContext>,
) {
  const querySpy = vi
    .spyOn(ConvexHttpClient.prototype, 'query')
    .mockImplementation(async (...args) => {
      const [ref, params] = args;
      return fixture.ctx.runQuery(ref, params);
    });
  const actionSpy = vi
    .spyOn(ConvexHttpClient.prototype, 'action')
    .mockRejectedValue(new Error('Unexpected Convex action call in review workspace integration.'));
  const store = new ConvexPlatformStore('https://test.example.convex.cloud', 'test-api-key');
  const processAccessService = {
    async getProcessAccess() {
      return {
        kind: 'accessible' as const,
        project: projectSummary,
        process: processSummary,
      };
    },
    async assertProcessAccess() {
      return {
        kind: 'accessible' as const,
        project: projectSummary,
        process: processSummary,
      };
    },
  } as unknown as ProcessAccessService;
  const server = await startApp({
    store,
    processAccessService,
  });

  return { actionSpy, querySpy, server };
}

async function startApp(args: {
  store: ConvexPlatformStore;
  processAccessService: ProcessAccessService;
}) {
  const app = await buildApp({
    authSessionService: createTestAuthSessionService({
      actor: {
        userId: 'user:workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      reason: null,
    }),
    authUserSyncService: new PassthroughAuthUserSyncService(),
    platformStore: args.store,
    processAccessService: args.processAccessService,
  });
  await app.listen({
    port: 0,
    host: '127.0.0.1',
  });
  const address = app.server.address();

  if (address === null || typeof address === 'string') {
    throw new Error('Expected Fastify to listen on a TCP address in integration test.');
  }

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('review workspace integration', () => {
  it('resolves a manually-seeded package snapshot through ConvexPlatformStore reads', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    const publishPackageSnapshotHandler = getHandler<
      {
        processId: string;
        displayName: string;
        packageType: string;
        members: Array<{
          artifactId: string;
          artifactVersionId: string;
          position: number;
        }>;
      },
      string
    >(publishPackageSnapshot);
    const packageId = await publishPackageSnapshotHandler(fixture.ctx, {
      processId: processSummary.processId,
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-001',
          artifactVersionId: 'artifact-version-review-convex-001',
          position: 0,
        },
        {
          artifactId: 'artifact-review-convex-002',
          artifactVersionId: 'artifact-version-review-convex-002',
          position: 1,
        },
      ],
    });

    const { actionSpy, querySpy, server } = await startConvexReviewWorkspaceServer(fixture);
    const response = await fetch(
      `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${packageId}`,
      {
        headers: {
          cookie: 'lb_session=review-workspace-convex-integration',
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      process: {
        processId: processSummary.processId,
        reviewTargetKind: 'package',
        reviewTargetId: packageId,
      },
      availableTargets: [
        {
          targetKind: 'package',
          targetId: packageId,
          displayName: 'Feature Specification Package',
        },
      ],
      target: {
        targetKind: 'package',
        displayName: 'Feature Specification Package',
        status: 'ready',
        package: {
          packageId,
          packageType: 'FeatureSpecificationOutput',
          members: [
            {
              artifactId: 'artifact-review-convex-001',
              status: 'ready',
            },
            {
              artifactId: 'artifact-review-convex-002',
              status: 'ready',
            },
          ],
          selectedMemberId: expect.any(String),
          exportability: {
            available: true,
          },
        },
      },
    });
    expect(body.target.package.members).toHaveLength(2);
    expect(body.target.package.selectedMember).toMatchObject({
      status: 'ready',
      artifact: {
        artifactId: 'artifact-review-convex-001',
      },
    });
    expect(querySpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
      expect.arrayContaining([
        'packageSnapshots:listPackageSnapshotsForProcess',
        'packageSnapshots:getPackageSnapshot',
        'packageSnapshotMembers:listPackageSnapshotMembers',
        'artifactVersions:getArtifactVersion',
        'artifactVersions:getLatestArtifactVersion',
      ]),
    );
    expect(actionSpy).not.toHaveBeenCalled();

    await server.app.close();
  });

  it('surfaces unsupported-kind artifacts as reviewable targets and resolves the unsupported fallback through the route', async () => {
    const fixture = createFakeConvexContext(buildUnsupportedArtifactSeed());
    registerReviewWorkspaceHandlers(fixture);

    const { actionSpy, server } = await startConvexReviewWorkspaceServer(fixture);
    const response = await fetch(
      `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      {
        headers: {
          cookie: 'lb_session=review-workspace-convex-unsupported',
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      availableTargets: [
        {
          targetKind: 'artifact',
          targetId: 'artifact-review-convex-unsupported-001',
          displayName: 'Binary Package Manifest',
        },
      ],
      target: {
        targetKind: 'artifact',
        displayName: 'Binary Package Manifest',
        status: 'unsupported',
        error: {
          code: 'REVIEW_TARGET_UNSUPPORTED',
        },
        artifact: {
          artifactId: 'artifact-review-convex-unsupported-001',
          selectedVersion: {
            contentKind: 'unsupported',
            versionLabel: 'manifest-v1',
          },
        },
      },
    });
    expect(actionSpy).not.toHaveBeenCalled();

    await server.app.close();
  });

  it('orders artifact and package targets newest-first across kinds when no explicit target is selected', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    const publishPackageSnapshotHandler = getHandler<
      {
        processId: string;
        displayName: string;
        packageType: string;
        members: Array<{
          artifactId: string;
          artifactVersionId: string;
          position: number;
        }>;
      },
      string
    >(publishPackageSnapshot);
    await fixture.ctx.db.patch('process-state-review-convex-001', {
      currentArtifactIds: ['artifact-review-convex-001', 'artifact-review-convex-002'],
    });
    await fixture.ctx.db.insert('artifacts', {
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      displayName: 'Architecture Diagram',
      createdAt: '2026-04-23T12:07:00.000Z',
    });
    await fixture.ctx.db.insert('artifactVersions', {
      artifactId: 'artifacts:1',
      versionLabel: 'diagram-v1',
      contentStorageId: 'storage-review-convex-003',
      contentKind: 'unsupported',
      bytes: 48,
      createdAt: '2026-04-23T12:09:00.000Z',
      createdByProcessId: processSummary.processId,
    });
    await fixture.ctx.db.patch('process-state-review-convex-001', {
      currentArtifactIds: [
        'artifact-review-convex-001',
        'artifact-review-convex-002',
        'artifacts:1',
      ],
    });
    const olderPackageId = await publishPackageSnapshotHandler(fixture.ctx, {
      processId: processSummary.processId,
      displayName: 'Older Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-001',
          artifactVersionId: 'artifact-version-review-convex-001',
          position: 0,
        },
      ],
    });
    const newerPackageId = await publishPackageSnapshotHandler(fixture.ctx, {
      processId: processSummary.processId,
      displayName: 'Newest Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-002',
          artifactVersionId: 'artifact-version-review-convex-002',
          position: 0,
        },
      ],
    });
    await fixture.ctx.db.patch(olderPackageId, {
      publishedAt: '2026-04-23T12:05:30.000Z',
    });
    await fixture.ctx.db.patch(newerPackageId, {
      publishedAt: '2026-04-23T12:10:00.000Z',
    });

    const { server } = await startConvexReviewWorkspaceServer(fixture);
    const response = await fetch(
      `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      {
        headers: {
          cookie: 'lb_session=review-workspace-convex-ordering',
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.target).toBeUndefined();
    expect(
      body.availableTargets.map(
        (target: { position: number; targetKind: string; displayName: string }) => ({
          position: target.position,
          targetKind: target.targetKind,
          displayName: target.displayName,
        }),
      ),
    ).toEqual([
      {
        position: 0,
        targetKind: 'package',
        displayName: 'Newest Package',
      },
      {
        position: 1,
        targetKind: 'artifact',
        displayName: 'Architecture Diagram',
      },
      {
        position: 2,
        targetKind: 'package',
        displayName: 'Older Package',
      },
      {
        position: 3,
        targetKind: 'artifact',
        displayName: 'Implementation Notes',
      },
      {
        position: 4,
        targetKind: 'artifact',
        displayName: 'Specification Markdown',
      },
    ]);

    await server.app.close();
  });
});
