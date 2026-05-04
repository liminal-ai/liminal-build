import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import {
  InMemoryPlatformStore,
  type ProjectAccessResult,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import type {
  GitHubRepositoryResolver,
  GitHubRepositoryResolution,
} from '../../../apps/platform/server/services/sources/github-repository-resolver.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
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
      })),
  );
}

async function buildAuthenticatedApp(args: {
  store?: InMemoryPlatformStore;
  resolver?: GitHubRepositoryResolver;
}) {
  const platformStore = args.store ?? buildStore();
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
    gitHubRepositoryResolver: args.resolver ?? buildResolver(),
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
});
