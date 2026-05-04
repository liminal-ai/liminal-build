import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import {
  InMemoryProviderAdapter,
  type ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { SingleAdapterRegistry } from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import {
  InMemoryPlatformStore,
  type ProjectAccessResult,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import { SourceSectionReader } from '../../../apps/platform/server/services/projects/readers/source-section.reader.js';
import { MaterialsSectionReader } from '../../../apps/platform/server/services/processes/readers/materials-section.reader.js';
import type {
  GitHubRepositoryResolution,
  GitHubRepositoryResolver,
} from '../../../apps/platform/server/services/sources/github-repository-resolver.js';
import {
  DefaultSourceRefreshService,
  RuntimeSourceHydrationExecutor,
  type SourceRefreshService,
} from '../../../apps/platform/server/services/sources/source-refresh.service.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { buildSourceAttachmentSummaryFixture } from '../../fixtures/sources.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_source_management_api',
        cookiePassword: 'source-management-api-cookie-password-123456',
        redirectUri: 'http://localhost:5001/auth/callback',
        loginReturnUri: 'http://localhost:5001/projects',
      });
    }

    override async resolveSession(): Promise<SessionResolution> {
      return resolution;
    }
  }

  return new TestAuthSessionService();
}

class StubGitHubRepositoryResolver implements GitHubRepositoryResolver {
  constructor(
    private readonly handler: (args: {
      repositoryUrl: string;
      targetRef: string | null;
    }) => Promise<GitHubRepositoryResolution> | GitHubRepositoryResolution,
  ) {}

  async resolveRepository(args: {
    repositoryUrl: string;
    targetRef: string | null;
  }): Promise<GitHubRepositoryResolution> {
    return this.handler(args);
  }
}

class RecordingProviderAdapter extends InMemoryProviderAdapter {
  ensureCalls = 0;
  hydrateCalls = 0;
  rehydrateCalls = 0;

  override async ensureEnvironment(
    args: Parameters<InMemoryProviderAdapter['ensureEnvironment']>[0],
  ) {
    this.ensureCalls += 1;
    return super.ensureEnvironment(args);
  }

  override async hydrateEnvironment(
    args: Parameters<InMemoryProviderAdapter['hydrateEnvironment']>[0],
  ) {
    this.hydrateCalls += 1;
    return super.hydrateEnvironment(args);
  }

  override async rehydrateEnvironment(
    args: Parameters<InMemoryProviderAdapter['rehydrateEnvironment']>[0],
  ) {
    this.rehydrateCalls += 1;
    return super.rehydrateEnvironment(args);
  }
}

class FailingRefreshProviderAdapter extends RecordingProviderAdapter {
  override async hydrateEnvironment(
    _args: Parameters<InMemoryProviderAdapter['hydrateEnvironment']>[0],
  ): ReturnType<InMemoryProviderAdapter['hydrateEnvironment']> {
    this.hydrateCalls += 1;
    throw new Error('Hydration failed in the provider runtime.');
  }
}

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-source-api-001',
  name: 'Source API Project',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-05-01T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-source-api-001',
  displayLabel: 'Feature Implementation #1',
  processType: 'FeatureImplementation',
  status: 'draft',
  phaseLabel: 'Draft',
  nextActionLabel: 'Open the process',
  availableActions: ['open'],
  hasEnvironment: false,
  updatedAt: '2026-05-01T12:00:00.000Z',
});

function buildStore(
  projectAccess: ProjectAccessResult = { kind: 'accessible', project: projectSummary },
) {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [projectSummary],
    },
    projectAccessByProjectId: {
      [projectSummary.projectId]: projectAccess,
    },
    processesByProjectId: {
      [projectSummary.projectId]: [processSummary],
    },
  });
}

function buildResolver(
  handler?: (args: {
    repositoryUrl: string;
    targetRef: string | null;
  }) => Promise<GitHubRepositoryResolution> | GitHubRepositoryResolution,
) {
  return new StubGitHubRepositoryResolver(
    handler ??
      (({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: targetRef === null ? 'none' : 'branch',
        defaultBranch: 'main',
        resolvedRef: targetRef === null ? null : 'a'.repeat(40),
      })),
  );
}

async function buildAuthenticatedApp(args: {
  store?: InMemoryPlatformStore;
  resolver?: GitHubRepositoryResolver;
  sourceRefreshService?: SourceRefreshService;
  providerAdapter?: ProviderAdapter;
}) {
  const platformStore = args.store ?? buildStore();
  const resolver = args.resolver ?? buildResolver();
  const providerAdapter = args.providerAdapter ?? new InMemoryProviderAdapter();
  const providerAdapterRegistry = new SingleAdapterRegistry(providerAdapter);
  const app = await buildApp({
    authSessionService: createTestAuthSessionService({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      reason: null,
    }),
    authUserSyncService: new AuthUserSyncService(platformStore),
    platformStore,
    providerAdapterRegistry,
    gitHubRepositoryResolver: resolver,
    sourceRefreshService:
      args.sourceRefreshService ??
      new DefaultSourceRefreshService(
        platformStore,
        resolver,
        new RuntimeSourceHydrationExecutor(platformStore, providerAdapterRegistry, 'local'),
      ),
  });

  return {
    app,
    platformStore,
  };
}

describe('source-management api', () => {
  it('TC-1.1a creates a project-scoped source attachment', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      repositoryFullName: 'liminal-ai/liminal-build',
      attachmentScope: 'project',
      processId: null,
      hydrationState: 'not_hydrated',
    });

    const attachments = await platformStore.listProjectSourceAttachments({
      projectId: projectSummary.projectId,
    });
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      repositoryFullName: 'liminal-ai/liminal-build',
      attachmentScope: 'project',
    });

    await app.close();
  });

  it('TC-1.1b creates a process-scoped source attachment and makes it current for that process', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const attachResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        targetRef: null,
      },
    });

    expect(attachResponse.statusCode).toBe(201);
    const created = attachResponse.json() as { sourceAttachmentId: string; targetRef: string };
    expect(created).toMatchObject({
      attachmentScope: 'process',
      processId: processSummary.processId,
      targetRef: 'main',
    });

    const currentRefs = await platformStore.getCurrentProcessMaterialRefs({
      processId: processSummary.processId,
    });
    expect(currentRefs.sourceAttachmentIds).toContain(created.sourceAttachmentId);

    const surfaceResponse = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(surfaceResponse.statusCode).toBe(200);
    expect(surfaceResponse.json()).toMatchObject({
      materials: {
        status: 'ready',
        currentSources: [
          {
            sourceAttachmentId: created.sourceAttachmentId,
            displayName: 'liminal-build',
            repositoryFullName: 'liminal-ai/liminal-build',
            attachmentScope: 'process',
            targetRef: 'main',
          },
        ],
      },
    });

    await app.close();
  });

  it('TC-1.3a blocks duplicate exact attachment', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const payload = {
      provider: 'github',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      displayName: 'liminal-build',
      purpose: 'implementation',
      accessMode: 'read_only',
      targetRef: 'main',
    };

    const firstResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload,
    });

    const duplicateResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload,
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({
      code: 'SOURCE_ATTACHMENT_CONFLICT',
      message:
        'An active source attachment already exists for this repository, scope, and target ref.',
      status: 409,
    });

    const attachments = await platformStore.listProjectSourceAttachments({
      projectId: projectSummary.projectId,
    });
    expect(attachments).toHaveLength(1);

    await app.close();
  });

  it('TC-1.4a rejects invalid repository identity without creating a partial row', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://gitlab.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: 'INVALID_SOURCE_ATTACHMENT',
      message: 'Repository URL must be an https://github.com/<owner>/<repo> repository URL.',
      status: 422,
    });

    expect(
      await platformStore.listProjectSourceAttachments({
        projectId: projectSummary.projectId,
      }),
    ).toHaveLength(0);

    await app.close();
  });

  it('TC-1.4b rejects inaccessible repository without creating a partial row', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({
      resolver: buildResolver(() => ({
        kind: 'inaccessible',
        message: 'GitHub rejected repository access with the current credentials.',
      })),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/private-repo',
        displayName: 'private-repo',
        purpose: 'research',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: 'SOURCE_ATTACHMENT_UNAVAILABLE',
      message: 'GitHub rejected repository access with the current credentials.',
      status: 503,
    });

    expect(
      await platformStore.listProjectSourceAttachments({
        projectId: projectSummary.projectId,
      }),
    ).toHaveLength(0);

    await app.close();
  });

  it('TC-2.2a updates source metadata', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createdAttachment = createResponse.json() as { sourceAttachmentId: string };

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${createdAttachment.sourceAttachmentId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        purpose: 'review',
        accessMode: 'read_write',
        targetRef: 'feature/story-2',
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      sourceAttachmentId: createdAttachment.sourceAttachmentId,
      purpose: 'review',
      accessMode: 'read_write',
      targetRef: 'feature/story-2',
      hydrationState: 'not_hydrated',
    });

    const [updatedAttachment] = await platformStore.listProjectSourceAttachments({
      projectId: projectSummary.projectId,
    });
    expect(updatedAttachment).toMatchObject({
      sourceAttachmentId: createdAttachment.sourceAttachmentId,
      purpose: 'review',
      accessMode: 'read_write',
      targetRef: 'feature/story-2',
    });

    await app.close();
  });

  it('TC-3.3a refresh updates one source in place', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({});

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createdAttachment = createResponse.json() as { sourceAttachmentId: string };

    const refreshResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${createdAttachment.sourceAttachmentId}/refresh`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toMatchObject({
      refreshStatus: 'settled',
      sourceAttachment: {
        sourceAttachmentId: createdAttachment.sourceAttachmentId,
        hydrationState: 'hydrated',
        refreshStatus: 'idle',
        freshnessReason: null,
        lastHydratedResolvedRef: 'a'.repeat(40),
        lastObservedRemoteResolvedRef: 'a'.repeat(40),
      },
    });

    const [storedAttachment] = await platformStore.listProjectSourceAttachments({
      projectId: projectSummary.projectId,
    });
    expect(storedAttachment).toMatchObject({
      sourceAttachmentId: createdAttachment.sourceAttachmentId,
      hydrationState: 'hydrated',
      refreshStatus: 'idle',
    });

    await app.close();
  });

  it('uses the runtime provider seam for production refresh instead of a fake immediate success path', async () => {
    const providerAdapter = new RecordingProviderAdapter();
    const { app } = await buildAuthenticatedApp({
      providerAdapter,
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    const createdAttachment = createResponse.json() as { sourceAttachmentId: string };
    const refreshResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${createdAttachment.sourceAttachmentId}/refresh`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toMatchObject({
      refreshStatus: 'settled',
      sourceAttachment: {
        sourceAttachmentId: createdAttachment.sourceAttachmentId,
        hydrationState: 'hydrated',
      },
    });
    expect(providerAdapter.ensureCalls).toBe(1);
    expect(providerAdapter.hydrateCalls).toBe(1);
    expect(providerAdapter.rehydrateCalls).toBe(0);

    await app.close();
  });

  it('does not record hydrated state when the runtime refresh seam fails', async () => {
    const providerAdapter = new FailingRefreshProviderAdapter();
    const { app, platformStore } = await buildAuthenticatedApp({
      providerAdapter,
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-attachments`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    const createdAttachment = createResponse.json() as { sourceAttachmentId: string };
    const refreshResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${createdAttachment.sourceAttachmentId}/refresh`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toMatchObject({
      refreshStatus: 'failed',
      sourceAttachment: {
        sourceAttachmentId: createdAttachment.sourceAttachmentId,
        hydrationState: 'not_hydrated',
        refreshStatus: 'failed',
      },
    });
    expect(providerAdapter.ensureCalls).toBe(1);
    expect(providerAdapter.hydrateCalls).toBe(1);
    expect(providerAdapter.rehydrateCalls).toBe(0);
    expect(
      await platformStore.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: createdAttachment.sourceAttachmentId,
      }),
    ).toMatchObject({
      sourceAttachmentId: createdAttachment.sourceAttachmentId,
      hydrationState: 'not_hydrated',
      refreshStatus: 'failed',
    });

    await app.close();
  });

  it('request-level refresh errors differ from refreshStatus failed', async () => {
    const failedRefreshService: SourceRefreshService = {
      async synchronizeProjectSourceAttachments(args) {
        return args.sourceAttachments;
      },
      async refreshSource() {
        return {
          refreshStatus: 'failed',
          sourceAttachment: {
            sourceAttachmentId: 'source-failed-refresh-001',
            provider: 'github',
            displayName: 'failed refresh source',
            purpose: 'implementation',
            accessMode: 'read_only',
            repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
            repositoryFullName: 'liminal-ai/liminal-build',
            targetRef: 'main',
            hydrationState: 'stale',
            lastHydratedAt: '2026-05-01T12:00:00.000Z',
            lastHydratedResolvedRef: 'a'.repeat(40),
            lastObservedRemoteResolvedRef: 'b'.repeat(40),
            freshnessReason: 'branch_head_moved',
            refreshStatus: 'failed',
            refreshRequestedAt: '2026-05-01T12:05:00.000Z',
            attachmentScope: 'project',
            processId: null,
            processDisplayLabel: null,
            detachedAt: null,
            updatedAt: '2026-05-01T12:05:00.000Z',
          },
        };
      },
    };
    const { app: failedApp } = await buildAuthenticatedApp({
      sourceRefreshService: failedRefreshService,
    });

    const failedResponse = await failedApp.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/source-failed-refresh-001/refresh`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(failedResponse.statusCode).toBe(200);
    expect(failedResponse.json()).toMatchObject({
      refreshStatus: 'failed',
      sourceAttachment: {
        sourceAttachmentId: 'source-failed-refresh-001',
        refreshStatus: 'failed',
      },
    });

    await failedApp.close();

    const unavailableSource = {
      sourceAttachmentId: 'source-unavailable-refresh-001',
      provider: 'github' as const,
      displayName: 'unavailable source',
      purpose: 'implementation' as const,
      accessMode: 'read_only' as const,
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
      hydrationState: 'unavailable' as const,
      lastHydratedAt: '2026-05-01T12:00:00.000Z',
      lastHydratedResolvedRef: 'a'.repeat(40),
      lastObservedRemoteResolvedRef: null,
      freshnessReason: 'target_ref_unavailable',
      refreshStatus: 'idle' as const,
      refreshRequestedAt: null,
      attachmentScope: 'project' as const,
      processId: null,
      processDisplayLabel: null,
      detachedAt: null,
      updatedAt: '2026-05-01T12:00:00.000Z',
    };
    const seededStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [projectSummary],
      },
      projectAccessByProjectId: {
        [projectSummary.projectId]: {
          kind: 'accessible',
          project: projectSummary,
        },
      },
      processesByProjectId: {
        [projectSummary.projectId]: [processSummary],
      },
      sourceAttachmentsByProjectId: {
        [projectSummary.projectId]: [unavailableSource],
      },
    });
    const { app: unavailableApp, platformStore } = await buildAuthenticatedApp({
      store: seededStore,
      resolver: buildResolver(() => ({
        kind: 'inaccessible',
        message: 'GitHub branch could not be accessed.',
      })),
    });

    const unavailableResponse = await unavailableApp.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${unavailableSource.sourceAttachmentId}/refresh`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(unavailableResponse.statusCode).toBe(409);
    expect(unavailableResponse.json()).toEqual({
      code: 'SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE',
      message: 'Refresh is only available for stale or not-yet-hydrated source attachments.',
      status: 409,
    });

    expect(
      await platformStore.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: unavailableSource.sourceAttachmentId,
      }),
    ).toMatchObject({
      sourceAttachmentId: unavailableSource.sourceAttachmentId,
      hydrationState: 'unavailable',
    });

    await unavailableApp.close();
  });

  it('TC-5.1a detaches a project-scoped source', async () => {
    const store = buildStore();
    const sourceAttachment = await store.createProjectSourceAttachment({
      projectId: projectSummary.projectId,
      provider: 'github',
      displayName: 'detachable project source',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    });
    const { app, platformStore } = await buildAuthenticatedApp({ store });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${sourceAttachment.sourceAttachmentId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      detached: true,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
    });

    const detachedAt = response.json().detachedAt as string;
    expect(
      await platformStore.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      }),
    ).toMatchObject({
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      detachedAt,
    });

    const section = await new SourceSectionReader(platformStore).read({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
    });
    expect(section).toMatchObject({
      status: 'empty',
      items: [],
    });

    await app.close();
  });

  it('TC-5.1b detaches a process-scoped source', async () => {
    const store = buildStore();
    const sourceAttachment = await store.createProcessSourceAttachment({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      provider: 'github',
      displayName: 'detachable process source',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    });
    const { app, platformStore } = await buildAuthenticatedApp({ store });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/${sourceAttachment.sourceAttachmentId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      detached: true,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
    });

    const detachedAt = response.json().detachedAt as string;
    expect(
      await platformStore.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      }),
    ).toMatchObject({
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      detachedAt,
    });

    const materials = await new MaterialsSectionReader(platformStore).read({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
    });
    expect(materials.currentSources).toEqual([]);

    await app.close();
  });

  it('TC-6.2b revoked access blocks source management', async () => {
    const { app } = await buildAuthenticatedApp({
      store: buildStore({ kind: 'forbidden' }),
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectSummary.projectId}/source-attachments/source-revoked-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      code: 'PROJECT_FORBIDDEN',
      message: 'The current actor cannot access this project.',
      status: 403,
    });

    await app.close();
  });

  it('TC-4.1a returns informing source provenance', async () => {
    const store = buildStore();
    const sourceAttachment = await store.createProcessSourceAttachment({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      provider: 'github',
      displayName: 'liminal-build',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    });
    await store.createSourceProvenance({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      relationshipKind: 'informed_work',
      repositoryFullName: sourceAttachment.repositoryFullName,
      repositoryUrl: sourceAttachment.repositoryUrl,
      targetRef: sourceAttachment.targetRef,
      eventId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: '2026-05-02T10:00:00.000Z',
    });
    const { app } = await buildAuthenticatedApp({ store });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-provenance`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      entries: [
        expect.objectContaining({
          relationshipKind: 'informed_work',
          repositoryFullName: 'liminal-ai/liminal-build',
          currentAttachmentDisplayName: 'liminal-build',
          currentAttachmentVisibility: 'available',
          entryStatus: 'ready',
        }),
      ],
    });

    await app.close();
  });

  it('TC-4.2a returns receiving source provenance', async () => {
    const store = buildStore();
    const sourceAttachment = await store.createProcessSourceAttachment({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      provider: 'github',
      displayName: 'liminal-build writable',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'feature/story-4',
    });
    await store.createSourceProvenance({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      relationshipKind: 'received_code_update',
      repositoryFullName: sourceAttachment.repositoryFullName,
      repositoryUrl: sourceAttachment.repositoryUrl,
      targetRef: sourceAttachment.targetRef,
      eventId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: '2026-05-02T11:00:00.000Z',
    });
    const { app } = await buildAuthenticatedApp({ store });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-provenance`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      entries: [
        expect.objectContaining({
          relationshipKind: 'received_code_update',
          repositoryFullName: 'liminal-ai/liminal-build',
          targetRef: 'feature/story-4',
          currentAttachmentDisplayName: 'liminal-build writable',
          currentAttachmentVisibility: 'available',
        }),
      ],
    });

    await app.close();
  });

  it('TC-4.4a degraded provenance entry does not hide healthy entries', async () => {
    const availableSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-provenance-ready-001',
      attachmentScope: 'process',
      processId: processSummary.processId,
      processDisplayLabel: processSummary.displayLabel,
      detachedAt: null,
    });
    const detachedSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-provenance-detached-001',
      attachmentScope: 'process',
      processId: processSummary.processId,
      processDisplayLabel: processSummary.displayLabel,
      detachedAt: '2026-05-02T12:00:00.000Z',
      updatedAt: '2026-05-02T12:00:00.000Z',
    });
    const seededStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [projectSummary],
      },
      projectAccessByProjectId: {
        [projectSummary.projectId]: {
          kind: 'accessible',
          project: projectSummary,
        },
      },
      processesByProjectId: {
        [projectSummary.projectId]: [processSummary],
      },
      sourceAttachmentsByProjectId: {
        [projectSummary.projectId]: [availableSource, detachedSource],
      },
      sourceProvenanceByProcessId: {
        [processSummary.processId]: [
          {
            provenanceId: 'provenance-detached-001',
            projectId: projectSummary.projectId,
            processId: processSummary.processId,
            sourceAttachmentId: detachedSource.sourceAttachmentId,
            relationshipKind: 'received_code_update',
            repositoryFullName: detachedSource.repositoryFullName,
            repositoryUrl: detachedSource.repositoryUrl,
            targetRef: detachedSource.targetRef,
            eventId: null,
            entryStatus: 'ready',
            degradationReason: null,
            recordedAt: '2026-05-02T12:05:00.000Z',
          },
          {
            provenanceId: 'provenance-ready-001',
            projectId: projectSummary.projectId,
            processId: processSummary.processId,
            sourceAttachmentId: availableSource.sourceAttachmentId,
            relationshipKind: 'informed_work',
            repositoryFullName: availableSource.repositoryFullName,
            repositoryUrl: availableSource.repositoryUrl,
            targetRef: availableSource.targetRef,
            eventId: null,
            entryStatus: 'ready',
            degradationReason: null,
            recordedAt: '2026-05-02T11:55:00.000Z',
          },
        ],
      },
    });
    const { app } = await buildAuthenticatedApp({ store: seededStore });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-provenance`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      entries: [
        expect.objectContaining({
          provenanceId: 'provenance-detached-001',
          currentAttachmentVisibility: 'detached',
          entryStatus: 'degraded',
          degradationReason: 'source_detached',
        }),
        expect.objectContaining({
          provenanceId: 'provenance-ready-001',
          currentAttachmentVisibility: 'available',
          entryStatus: 'ready',
        }),
      ],
    });

    await app.close();
  });

  it('S4-NT-1 redacts current attachment details when provenance enrichment access is revoked', async () => {
    const redactedSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-provenance-redacted-001',
      attachmentScope: 'process',
      processId: processSummary.processId,
      processDisplayLabel: processSummary.displayLabel,
      displayName: 'redacted source should not leak',
      detachedAt: null,
    });
    const seededStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [projectSummary],
      },
      projectAccessByProjectId: {
        [projectSummary.projectId]: {
          kind: 'accessible',
          project: projectSummary,
        },
      },
      processesByProjectId: {
        [projectSummary.projectId]: [processSummary],
      },
      sourceAttachmentsByProjectId: {
        [projectSummary.projectId]: [redactedSource],
      },
      sourceProvenanceByProcessId: {
        [processSummary.processId]: [
          {
            provenanceId: 'provenance-redacted-001',
            projectId: projectSummary.projectId,
            processId: processSummary.processId,
            sourceAttachmentId: redactedSource.sourceAttachmentId,
            relationshipKind: 'informed_work',
            repositoryFullName: redactedSource.repositoryFullName,
            repositoryUrl: redactedSource.repositoryUrl,
            targetRef: redactedSource.targetRef,
            eventId: null,
            entryStatus: 'degraded',
            degradationReason: 'access_revoked',
            recordedAt: '2026-05-02T12:10:00.000Z',
          },
        ],
      },
    });
    const { app } = await buildAuthenticatedApp({ store: seededStore });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/source-provenance`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      entries: [
        expect.objectContaining({
          provenanceId: 'provenance-redacted-001',
          currentAttachmentDisplayName: null,
          currentAttachmentScope: null,
          currentAttachmentAccessMode: null,
          currentAttachmentHydrationState: null,
          currentAttachmentVisibility: 'redacted',
          entryStatus: 'degraded',
          degradationReason: 'access_revoked',
        }),
      ],
    });

    await app.close();
  });
});
