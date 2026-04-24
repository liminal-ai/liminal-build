import { ConvexHttpClient } from 'convex/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
} from '../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../apps/platform/server/services/auth/auth-user-sync.service.js';
import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderKind,
} from '../../apps/platform/server/services/processes/environment/provider-adapter.js';
import type { ProcessAccessService } from '../../apps/platform/server/services/processes/process-access.service.js';
import {
  ConvexPlatformStore,
  InMemoryPlatformStore,
} from '../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';
import {
  getArtifactVersion,
  getArtifactVersionContentUrl,
  getLatestArtifactVersion,
  insertArtifactVersion,
  listArtifactsByProducingProcess,
} from '../../convex/artifactVersions.js';
import { listArtifactVersions } from '../../convex/artifactVersions.js';
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

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2_000,
  message = 'Timed out while waiting for asynchronous condition.',
): Promise<void> {
  const startedAt = Date.now();

  while (!(await predicate())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(message);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
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
  register<
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
  >('packageSnapshots:publishPackageSnapshot', publishPackageSnapshot);
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
  register<{ versionId: string }, string | null>(
    'artifactVersions:getArtifactVersionContentUrl',
    getArtifactVersionContentUrl,
  );
  register<{ artifactId: string; limit?: number }, unknown[]>(
    'artifactVersions:listArtifactVersions',
    listArtifactVersions,
  );
  register<{ artifactId: string }, unknown | null>(
    'artifactVersions:getLatestArtifactVersion',
    getLatestArtifactVersion,
  );
  register<{ processId: string }, string[]>(
    'artifactVersions:listArtifactsByProducingProcess',
    listArtifactsByProducingProcess,
  );
}

function createReviewWorkspaceProcessAccessService() {
  return {
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
  const server = await startApp({
    store,
    processAccessService: createReviewWorkspaceProcessAccessService(),
  });

  return { actionSpy, querySpy, server };
}

async function startApp(args: {
  store: ConvexPlatformStore | InMemoryPlatformStore;
  processAccessService?: ProcessAccessService;
  providerAdapter?: ProviderAdapter;
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
    providerAdapter: args.providerAdapter,
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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockArtifactVersionFetch(fixture: ReturnType<typeof createFakeConvexContext>) {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);

    if (url.startsWith('fake://storage/')) {
      const storageId = url.slice('fake://storage/'.length);
      const blob = await fixture.storage.get(storageId);

      if (blob === null) {
        return new Response('Missing artifact content.', {
          status: 404,
        });
      }

      return new Response(await blob.text(), {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }

    return nativeFetch(input, init);
  });
}

async function seedArtifactVersion(args: {
  fixture: ReturnType<typeof createFakeConvexContext>;
  artifactId: string;
  versionLabel: string;
  body: string;
  createdAt: string;
}) {
  const insertArtifactVersionHandler = getHandler<
    {
      artifactId: string;
      versionLabel: string;
      contentStorageId: string;
      contentKind: 'markdown';
      bytes: number;
      createdByProcessId: string;
    },
    string
  >(insertArtifactVersion);
  const blob = new Blob([args.body], {
    type: 'text/markdown',
  });
  const contentStorageId = await args.fixture.storage.store(blob);

  vi.setSystemTime(new Date(args.createdAt));

  return insertArtifactVersionHandler(args.fixture.ctx, {
    artifactId: args.artifactId,
    versionLabel: args.versionLabel,
    contentStorageId,
    contentKind: 'markdown',
    bytes: new TextEncoder().encode(args.body).length,
    createdByProcessId: processSummary.processId,
  });
}

function buildSequentialArtifactCheckpointProvider(args: {
  providerKind?: ProviderKind;
  artifactId: string;
  displayName: string;
  revisions: Array<{
    body: string;
  }>;
}): ProviderAdapter {
  let executionIndex = 0;

  return {
    providerKind: args.providerKind ?? 'local',
    async ensureEnvironment({ processId, providerKind }) {
      return {
        providerKind,
        environmentId: `${providerKind}-review-env-${processId}`,
        workspaceHandle: `${providerKind}-review-workspace-${processId}`,
      };
    },
    async hydrateEnvironment({ environmentId, plan }) {
      return {
        environmentId,
        hydratedAt: new Date().toISOString(),
        fingerprint: plan.fingerprint,
      };
    },
    async executeScript(): Promise<ExecutionResult> {
      const revision =
        args.revisions[executionIndex] ?? args.revisions[args.revisions.length - 1] ?? null;

      if (revision === null) {
        throw new Error('Expected at least one checkpoint revision in test provider.');
      }

      executionIndex += 1;

      return {
        processStatus: 'completed',
        processHistoryItems: [],
        outputWrites: [],
        sideWorkWrites: [],
        artifactCheckpointCandidates: [
          {
            artifactId: args.artifactId,
            displayName: args.displayName,
            revisionLabel: null,
            contentsRef: revision.body,
          },
        ],
        codeCheckpointCandidates: [],
      };
    },
    async rehydrateEnvironment({ environmentId, plan }) {
      return {
        environmentId,
        hydratedAt: new Date().toISOString(),
        fingerprint: plan.fingerprint,
      };
    },
    async rebuildEnvironment({ processId, providerKind, plan }) {
      return {
        providerKind,
        environmentId: `${providerKind}-review-rebuild-${processId}`,
        workspaceHandle: `${providerKind}-review-rebuild-workspace-${processId}`,
        hydratedAt: new Date().toISOString(),
        fingerprint: plan.fingerprint,
      };
    },
    async teardownEnvironment() {
      return;
    },
    async resolveCandidateContents({ ref }) {
      return ref;
    },
  };
}

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
    expect(body.availableTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetKind: 'package',
          targetId: packageId,
          displayName: 'Feature Specification Package',
        }),
      ]),
    );
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

  it('preserves snapshot-time member display names after the artifact is renamed', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    await fixture.ctx.db.patch('artifact-review-convex-001', {
      displayName: 'A-v1',
    });

    const querySpy = vi
      .spyOn(ConvexHttpClient.prototype, 'query')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runQuery(ref, params);
      });
    const mutationSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'mutation')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runMutation(ref, params);
      });
    const actionSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'action')
      .mockRejectedValue(
        new Error('Unexpected Convex action call in review workspace integration.'),
      );
    const store = new ConvexPlatformStore('https://test.example.convex.cloud', 'test-api-key');
    const packageId = await store.publishPackageSnapshot({
      processId: processSummary.processId,
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-001',
          artifactVersionId: 'artifact-version-review-convex-001',
          position: 0,
        },
      ],
    });

    await fixture.ctx.db.patch('artifact-review-convex-001', {
      displayName: 'A-v2',
    });

    const { app, baseUrl } = await startApp({
      store,
      processAccessService: createReviewWorkspaceProcessAccessService(),
    });

    try {
      const response = await fetch(
        `${baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${packageId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-convex-immutability',
          },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.target).toMatchObject({
        targetKind: 'package',
        displayName: 'Feature Specification Package',
        status: 'ready',
        package: {
          packageId,
          members: [
            {
              artifactId: 'artifact-review-convex-001',
              displayName: 'A-v1',
              status: 'ready',
            },
          ],
          selectedMember: {
            status: 'ready',
            artifact: {
              artifactId: 'artifact-review-convex-001',
              displayName: 'A-v1',
            },
          },
        },
      });
      expect(mutationSpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
        expect.arrayContaining(['packageSnapshots:publishPackageSnapshot']),
      );
      expect(querySpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
        expect.arrayContaining([
          'artifacts:listProjectArtifactSummaries',
          'packageSnapshots:getPackageSnapshot',
          'packageSnapshotMembers:listPackageSnapshotMembers',
        ]),
      );
      expect(actionSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('preserves snapshot-time member version labels after the pinned version becomes unavailable', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    await fixture.ctx.db.patch('artifact-version-review-convex-001', {
      versionLabel: 'v1.2',
    });

    const querySpy = vi
      .spyOn(ConvexHttpClient.prototype, 'query')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runQuery(ref, params);
      });
    const mutationSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'mutation')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runMutation(ref, params);
      });
    const actionSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'action')
      .mockRejectedValue(
        new Error('Unexpected Convex action call in review workspace integration.'),
      );
    const store = new ConvexPlatformStore('https://test.example.convex.cloud', 'test-api-key');
    const packageId = await store.publishPackageSnapshot({
      processId: processSummary.processId,
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-001',
          artifactVersionId: 'artifact-version-review-convex-001',
          position: 0,
        },
      ],
    });

    await fixture.ctx.db.delete('artifact-version-review-convex-001');

    const { app, baseUrl } = await startApp({
      store,
      processAccessService: createReviewWorkspaceProcessAccessService(),
    });

    try {
      const response = await fetch(
        `${baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${packageId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-convex-version-label-immutability',
          },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.target).toMatchObject({
        targetKind: 'package',
        displayName: 'Feature Specification Package',
        status: 'ready',
        package: {
          packageId,
          members: [
            {
              artifactId: 'artifact-review-convex-001',
              versionId: 'artifact-version-review-convex-001',
              versionLabel: 'v1.2',
              status: 'unavailable',
            },
          ],
          selectedMember: {
            status: 'unavailable',
            error: {
              code: 'REVIEW_MEMBER_UNAVAILABLE',
            },
          },
        },
      });
      expect(mutationSpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
        expect.arrayContaining(['packageSnapshots:publishPackageSnapshot']),
      );
      expect(querySpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
        expect.arrayContaining([
          'packageSnapshots:getPackageSnapshot',
          'packageSnapshotMembers:listPackageSnapshotMembers',
          'artifactVersions:getArtifactVersion',
        ]),
      );
      expect(actionSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
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

  it('TC-6.1a reopens artifact review from durable route state after a reload', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    const { server } = await startConvexReviewWorkspaceServer(fixture);
    const artifactId = 'artifact-review-convex-001';
    const url = `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=artifact&targetId=${artifactId}`;

    try {
      const firstResponse = await fetch(url, {
        headers: {
          cookie: 'lb_session=review-workspace-convex-reopen-artifact',
        },
      });
      const firstBody = await firstResponse.json();
      const secondResponse = await fetch(url, {
        headers: {
          cookie: 'lb_session=review-workspace-convex-reopen-artifact',
        },
      });
      const secondBody = await secondResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(secondBody).toMatchObject(firstBody);
    } finally {
      await server.app.close();
    }
  });

  it('TC-6.1b reopens package review from durable route state after a reload', async () => {
    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);

    const querySpy = vi
      .spyOn(ConvexHttpClient.prototype, 'query')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runQuery(ref, params);
      });
    const mutationSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'mutation')
      .mockImplementation(async (...args) => {
        const [ref, params] = args;
        return fixture.ctx.runMutation(ref, params);
      });
    const actionSpy = vi
      .spyOn(ConvexHttpClient.prototype, 'action')
      .mockRejectedValue(
        new Error('Unexpected Convex action call in review workspace integration.'),
      );
    const store = new ConvexPlatformStore('https://test.example.convex.cloud', 'test-api-key');
    const packageId = await store.publishPackageSnapshot({
      processId: processSummary.processId,
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-review-convex-001',
          artifactVersionId: 'artifact-version-review-convex-001',
          position: 0,
        },
      ],
    });
    const { app, baseUrl } = await startApp({
      store,
      processAccessService: createReviewWorkspaceProcessAccessService(),
    });
    const url = `${baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${packageId}`;

    try {
      const firstResponse = await fetch(url, {
        headers: {
          cookie: 'lb_session=review-workspace-convex-reopen-package',
        },
      });
      const firstBody = await firstResponse.json();
      const secondResponse = await fetch(url, {
        headers: {
          cookie: 'lb_session=review-workspace-convex-reopen-package',
        },
      });
      const secondBody = await secondResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(secondBody).toMatchObject(firstBody);
      expect(mutationSpy.mock.calls.map(([ref]) => readFunctionName(ref))).toEqual(
        expect.arrayContaining(['packageSnapshots:publishPackageSnapshot']),
      );
      expect(querySpy).toHaveBeenCalled();
      expect(actionSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('keeps process-produced artifacts reviewable after current material refs drop them from the working set', async () => {
    const scopedProjectSummary = projectSummarySchema.parse({
      projectId: 'project-review-scoping-001',
      name: 'Review Scoping',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 3,
      sourceAttachmentCount: 0,
      lastUpdatedAt: '2026-04-23T12:10:00.000Z',
    });
    const scopedProcessSummary = processSummarySchema.parse({
      processId: 'process-review-scoping-001',
      displayLabel: 'Feature Specification #9',
      processType: 'FeatureSpecification',
      status: 'running',
      phaseLabel: 'Working',
      nextActionLabel: 'Review the latest output',
      availableActions: ['review'],
      hasEnvironment: false,
      updatedAt: '2026-04-23T12:10:00.000Z',
    });
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [scopedProjectSummary],
      },
      projectAccessByProjectId: {
        [scopedProjectSummary.projectId]: {
          kind: 'accessible',
          project: scopedProjectSummary,
        },
      },
      processesByProjectId: {
        [scopedProjectSummary.projectId]: [scopedProcessSummary],
      },
      artifactsByProjectId: {
        [scopedProjectSummary.projectId]: [
          {
            artifactId: 'artifact-review-scope-001',
            displayName: 'Specification Draft',
            currentVersionLabel: 'spec-v1',
            attachmentScope: 'process',
            processId: scopedProcessSummary.processId,
            processDisplayLabel: scopedProcessSummary.displayLabel,
            updatedAt: '2026-04-23T12:05:00.000Z',
          },
          {
            artifactId: 'artifact-review-scope-002',
            displayName: 'Implementation Plan',
            currentVersionLabel: 'impl-v1',
            attachmentScope: 'process',
            processId: scopedProcessSummary.processId,
            processDisplayLabel: scopedProcessSummary.displayLabel,
            updatedAt: '2026-04-23T12:06:00.000Z',
          },
          {
            artifactId: 'artifact-review-scope-003',
            displayName: 'Launch Checklist',
            currentVersionLabel: 'launch-v1',
            attachmentScope: 'process',
            processId: scopedProcessSummary.processId,
            processDisplayLabel: scopedProcessSummary.displayLabel,
            updatedAt: '2026-04-23T12:07:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-review-scope-001': [
          {
            versionId: 'artifact-version-review-scope-001',
            artifactId: 'artifact-review-scope-001',
            versionLabel: 'spec-v1',
            contentStorageId: 'storage-review-scope-001',
            contentKind: 'markdown',
            bytes: 64,
            createdAt: '2026-04-23T12:05:00.000Z',
            createdByProcessId: scopedProcessSummary.processId,
          },
        ],
        'artifact-review-scope-002': [
          {
            versionId: 'artifact-version-review-scope-002',
            artifactId: 'artifact-review-scope-002',
            versionLabel: 'impl-v1',
            contentStorageId: 'storage-review-scope-002',
            contentKind: 'markdown',
            bytes: 64,
            createdAt: '2026-04-23T12:06:00.000Z',
            createdByProcessId: scopedProcessSummary.processId,
          },
        ],
        'artifact-review-scope-003': [
          {
            versionId: 'artifact-version-review-scope-003',
            artifactId: 'artifact-review-scope-003',
            versionLabel: 'launch-v1',
            contentStorageId: 'storage-review-scope-003',
            contentKind: 'markdown',
            bytes: 64,
            createdAt: '2026-04-23T12:07:00.000Z',
            createdByProcessId: scopedProcessSummary.processId,
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-version-review-scope-001': '# Specification Draft',
        'artifact-version-review-scope-002': '# Implementation Plan',
        'artifact-version-review-scope-003': '# Launch Checklist',
      },
      currentMaterialRefsByProcessId: {
        [scopedProcessSummary.processId]: {
          artifactIds: ['artifact-review-scope-001'],
          sourceAttachmentIds: [],
        },
      },
    });
    const { app, baseUrl } = await startApp({
      store,
    });

    try {
      const workspaceResponse = await fetch(
        `${baseUrl}/api/projects/${scopedProjectSummary.projectId}/processes/${scopedProcessSummary.processId}/review`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-scope-regression',
          },
        },
      );
      const workspaceBody = await workspaceResponse.json();

      expect(workspaceResponse.status).toBe(200);
      expect(
        workspaceBody.availableTargets.map((target: { targetId: string }) => target.targetId),
      ).toEqual([
        'artifact-review-scope-003',
        'artifact-review-scope-002',
        'artifact-review-scope-001',
      ]);

      const droppedArtifactResponse = await fetch(
        `${baseUrl}/api/projects/${scopedProjectSummary.projectId}/processes/${scopedProcessSummary.processId}/review/artifacts/artifact-review-scope-003`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-scope-regression',
          },
        },
      );
      const droppedArtifactBody = await droppedArtifactResponse.json();

      expect(droppedArtifactResponse.status).toBe(200);
      expect(droppedArtifactBody).toMatchObject({
        artifactId: 'artifact-review-scope-003',
        currentVersionId: 'artifact-version-review-scope-003',
        selectedVersion: {
          versionId: 'artifact-version-review-scope-003',
          bodyStatus: 'ready',
        },
      });
      expect(droppedArtifactBody.selectedVersion.body).toContain('<h1>Launch Checklist</h1>');
    } finally {
      await app.close();
    }
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

  it('keeps two durable revisions of the same artifact reviewable through the Convex-backed route', async () => {
    vi.useFakeTimers();

    const fixture = createFakeConvexContext(buildReviewWorkspaceSeed());
    registerReviewWorkspaceHandlers(fixture);
    mockArtifactVersionFetch(fixture);
    const artifactId = await fixture.ctx.db.insert('artifacts', {
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      displayName: 'Checkpointed Spec',
      createdAt: '2026-04-23T12:04:00.000Z',
    });
    await fixture.ctx.db.patch('process-state-review-convex-001', {
      currentArtifactIds: [artifactId],
    });
    const firstVersionId = await seedArtifactVersion({
      fixture,
      artifactId,
      versionLabel: 'spec-v1',
      body: '# Specification v1\n\nOriginal durable body.',
      createdAt: '2026-04-23T12:05:00.000Z',
    });
    const secondVersionId = await seedArtifactVersion({
      fixture,
      artifactId,
      versionLabel: 'spec-v2',
      body: '# Specification v2\n\nCurrent durable body.',
      createdAt: '2026-04-23T12:06:00.000Z',
    });

    const { server } = await startConvexReviewWorkspaceServer(fixture);

    try {
      const workspaceResponse = await fetch(
        `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=artifact&targetId=${artifactId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-convex-two-revisions',
          },
        },
      );
      const workspaceBody = await workspaceResponse.json();

      expect(workspaceResponse.status).toBe(200);
      expect(workspaceBody.target).toMatchObject({
        targetKind: 'artifact',
        status: 'ready',
        artifact: {
          artifactId,
          displayName: 'Checkpointed Spec',
          currentVersionId: secondVersionId,
          selectedVersionId: secondVersionId,
          versions: [
            {
              versionId: secondVersionId,
              versionLabel: 'spec-v2',
              isCurrent: true,
              createdAt: '2026-04-23T12:06:00.000Z',
            },
            {
              versionId: firstVersionId,
              versionLabel: 'spec-v1',
              isCurrent: false,
              createdAt: '2026-04-23T12:05:00.000Z',
            },
          ],
          selectedVersion: {
            versionId: secondVersionId,
            bodyStatus: 'ready',
          },
        },
      });
      expect(workspaceBody.target.artifact.selectedVersion.body).toContain(
        '<h1>Specification v2</h1>',
      );
      expect(workspaceBody.target.artifact.versions).toHaveLength(2);
      expect(
        workspaceBody.target.artifact.versions[0].createdAt >
          workspaceBody.target.artifact.versions[1].createdAt,
      ).toBe(true);

      const priorRevisionResponse = await fetch(
        `${server.baseUrl}/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/${artifactId}?versionId=${firstVersionId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-convex-two-revisions',
          },
        },
      );
      const priorRevisionBody = await priorRevisionResponse.json();

      expect(priorRevisionResponse.status).toBe(200);
      expect(priorRevisionBody).toMatchObject({
        artifactId,
        currentVersionId: secondVersionId,
        selectedVersionId: firstVersionId,
        selectedVersion: {
          versionId: firstVersionId,
          bodyStatus: 'ready',
        },
      });
      expect(priorRevisionBody.selectedVersion.body).toContain('<h1>Specification v1</h1>');
      expect(priorRevisionBody.selectedVersion.body).not.toBe(
        workspaceBody.target.artifact.selectedVersion.body,
      );
    } finally {
      await server.app.close();
    }
  });

  it('appends two checkpoint-writer revisions for the same artifact and exposes both through review APIs', async () => {
    const reviewProjectSummary = projectSummarySchema.parse({
      projectId: 'project-review-checkpoint-flow-001',
      name: 'Checkpoint Review Flow',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 0,
      sourceAttachmentCount: 0,
      lastUpdatedAt: '2026-04-23T12:00:00.000Z',
    });
    const reviewProcessSummary = processSummarySchema.parse({
      processId: 'process-review-checkpoint-flow-001',
      displayLabel: 'Feature Specification #7',
      processType: 'FeatureSpecification',
      status: 'draft',
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      availableActions: ['open'],
      hasEnvironment: false,
      updatedAt: '2026-04-23T12:00:00.000Z',
    });
    const checkpointArtifactId = 'artifact-review-checkpoint-flow-001';
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [reviewProjectSummary],
      },
      projectAccessByProjectId: {
        [reviewProjectSummary.projectId]: {
          kind: 'accessible',
          project: reviewProjectSummary,
        },
      },
      processesByProjectId: {
        [reviewProjectSummary.projectId]: [reviewProcessSummary],
      },
      currentMaterialRefsByProcessId: {
        [reviewProcessSummary.processId]: {
          artifactIds: [],
          sourceAttachmentIds: [],
        },
      },
    });
    const providerAdapter = buildSequentialArtifactCheckpointProvider({
      artifactId: checkpointArtifactId,
      displayName: 'Checkpointed Spec',
      revisions: [
        {
          body: '# Checkpoint v1\n\nOriginal checkpoint body.',
        },
        {
          body: '# Checkpoint v2\n\nAppended checkpoint body.',
        },
      ],
    });
    const { app, baseUrl } = await startApp({
      store,
      providerAdapter,
    });

    try {
      app.processEnvironmentService.runHydrationAsync({
        projectId: reviewProjectSummary.projectId,
        processId: reviewProcessSummary.processId,
      });
      await waitFor(async () => {
        const versions = await store.listArtifactVersions({
          artifactId: checkpointArtifactId,
        });
        return versions.length === 1;
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      app.processEnvironmentService.runHydrationAsync({
        projectId: reviewProjectSummary.projectId,
        processId: reviewProcessSummary.processId,
      });
      await waitFor(async () => {
        const versions = await store.listArtifactVersions({
          artifactId: checkpointArtifactId,
        });
        return versions.length === 2;
      });

      const versions = await store.listArtifactVersions({
        artifactId: checkpointArtifactId,
      });

      expect(versions).toHaveLength(2);
      expect(versions[0]?.createdAt.localeCompare(versions[1]?.createdAt ?? '')).toBeGreaterThan(0);

      const workspaceResponse = await fetch(
        `${baseUrl}/api/projects/${reviewProjectSummary.projectId}/processes/${reviewProcessSummary.processId}/review?targetKind=artifact&targetId=${checkpointArtifactId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-inmemory-checkpoints',
          },
        },
      );
      const workspaceBody = await workspaceResponse.json();

      expect(workspaceResponse.status).toBe(200);
      expect(workspaceBody.target).toMatchObject({
        targetKind: 'artifact',
        status: 'ready',
        artifact: {
          artifactId: checkpointArtifactId,
          currentVersionId: versions[0]?.versionId,
          selectedVersionId: versions[0]?.versionId,
          versions: [
            {
              versionId: versions[0]?.versionId,
              isCurrent: true,
            },
            {
              versionId: versions[1]?.versionId,
              isCurrent: false,
            },
          ],
          selectedVersion: {
            versionId: versions[0]?.versionId,
            bodyStatus: 'ready',
          },
        },
      });
      expect(workspaceBody.target.artifact.selectedVersion.body).toContain(
        '<h1>Checkpoint v2</h1>',
      );
      expect(workspaceBody.target.artifact.versions).toHaveLength(2);

      const firstRevisionResponse = await fetch(
        `${baseUrl}/api/projects/${reviewProjectSummary.projectId}/processes/${reviewProcessSummary.processId}/review/artifacts/${checkpointArtifactId}?versionId=${versions[1]?.versionId}`,
        {
          headers: {
            cookie: 'lb_session=review-workspace-inmemory-checkpoints',
          },
        },
      );
      const firstRevisionBody = await firstRevisionResponse.json();

      expect(firstRevisionResponse.status).toBe(200);
      expect(firstRevisionBody).toMatchObject({
        artifactId: checkpointArtifactId,
        currentVersionId: versions[0]?.versionId,
        selectedVersionId: versions[1]?.versionId,
        selectedVersion: {
          versionId: versions[1]?.versionId,
          bodyStatus: 'ready',
        },
      });
      expect(firstRevisionBody.selectedVersion.body).toContain('<h1>Checkpoint v1</h1>');
      expect(firstRevisionBody.selectedVersion.body).not.toBe(
        workspaceBody.target.artifact.selectedVersion.body,
      );
    } finally {
      await app.close();
    }
  });
});
