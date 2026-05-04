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
  GitHubRepositoryResolution,
  GitHubRepositoryResolver,
} from '../../../apps/platform/server/services/sources/github-repository-resolver.js';
import {
  DefaultSourceRefreshService,
  type SourceHydrationExecutor,
} from '../../../apps/platform/server/services/sources/source-refresh.service.js';
import {
  inaccessibleProjectId,
  memberProjectSummary,
  ownerProjectSummary,
  sameNameDifferentOwnerProjectSummaries,
} from '../../fixtures/projects.js';
import { buildSourceAttachmentSummaryFixture } from '../../fixtures/sources.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story1',
        cookiePassword: 'story1-cookie-password-story1-cookie-password',
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

const noOpHydrationExecutor: SourceHydrationExecutor = {
  async refreshRecoverableSource() {
    return {
      kind: 'not_available',
      message: 'Refresh is not exercised in this reader test.',
    };
  },
};

describe('projects api', () => {
  it('TC-1.2a returns only accessible projects sorted by lastUpdatedAt descending', async () => {
    const accessibleProjects = [memberProjectSummary, ...sameNameDifferentOwnerProjectSummaries];
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': accessibleProjects,
      },
    });
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
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    const projects = response.json() as Array<{ projectId: string }>;
    expect(projects[0]?.projectId).toBe(ownerProjectSummary.projectId);
    expect(projects).toHaveLength(3);
    expect(projects.map((project) => project.projectId).sort()).toEqual(
      [
        ownerProjectSummary.projectId,
        memberProjectSummary.projectId,
        sameNameDifferentOwnerProjectSummaries[1]?.projectId,
      ].sort(),
    );

    await app.close();
  });

  it('TC-1.2c omits inaccessible projects', async () => {
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary, memberProjectSummary],
      },
      projectAccessByProjectId: {
        [inaccessibleProjectId]: { kind: 'forbidden' },
      },
    });
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
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    const projects = response.json() as Array<{ projectId: string }>;
    expect(projects.some((project) => project.projectId === inaccessibleProjectId)).toBe(false);

    await app.close();
  });

  it('returns an empty project list for an actor with no memberships', async () => {
    const platformStore = new InMemoryPlatformStore();
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
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);

    await app.close();
  });

  it('TC-1.3c blocks direct project access for unauthorized actor', async () => {
    const forbiddenAccess: ProjectAccessResult = { kind: 'forbidden' };
    const platformStore = new InMemoryPlatformStore({
      projectAccessByProjectId: {
        [inaccessibleProjectId]: forbiddenAccess,
      },
    });
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
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${inaccessibleProjectId}`,
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

  it('returns an empty shell bootstrap for an accessible project', async () => {
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary],
      },
      projectAccessByProjectId: {
        [ownerProjectSummary.projectId]: {
          kind: 'accessible',
          project: ownerProjectSummary,
        },
      },
    });
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
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${ownerProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      project: ownerProjectSummary,
      processes: {
        status: 'empty',
        items: [],
      },
      artifacts: {
        status: 'empty',
        items: [],
      },
      sourceAttachments: {
        status: 'empty',
        items: [],
      },
    });

    await app.close();
  });

  it('TC-6.1a reopens project source attachment state', async () => {
    const restoredSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-project-reopen-001',
      displayName: 'reopened project source',
      updatedAt: '2026-05-03T12:00:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary],
      },
      projectAccessByProjectId: {
        [ownerProjectSummary.projectId]: {
          kind: 'accessible',
          project: ownerProjectSummary,
        },
      },
      sourceAttachmentsByProjectId: {
        [ownerProjectSummary.projectId]: [restoredSource],
      },
    });
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
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${ownerProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sourceAttachments: {
        status: 'ready',
        items: [
          expect.objectContaining({
            sourceAttachmentId: restoredSource.sourceAttachmentId,
            displayName: restoredSource.displayName,
            repositoryFullName: restoredSource.repositoryFullName,
            hydrationState: restoredSource.hydrationState,
          }),
        ],
      },
    });

    await app.close();
  });

  it('TC-6.2a redacts unavailable source metadata in the project shell read payload', async () => {
    const unavailableSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-project-unavailable-001',
      displayName: 'unavailable project source',
      hydrationState: 'unavailable',
      lastHydratedAt: '2026-05-03T11:30:00.000Z',
      lastHydratedResolvedRef: 'a'.repeat(40),
      lastObservedRemoteResolvedRef: 'b'.repeat(40),
      freshnessReason: 'target_ref_unavailable',
      refreshStatus: 'failed',
      refreshRequestedAt: '2026-05-03T11:35:00.000Z',
      updatedAt: '2026-05-03T11:40:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary],
      },
      projectAccessByProjectId: {
        [ownerProjectSummary.projectId]: {
          kind: 'accessible',
          project: ownerProjectSummary,
        },
      },
      sourceAttachmentsByProjectId: {
        [ownerProjectSummary.projectId]: [unavailableSource],
      },
    });
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
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${ownerProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().sourceAttachments).toMatchObject({
      status: 'ready',
      items: [
        {
          sourceAttachmentId: unavailableSource.sourceAttachmentId,
          displayName: unavailableSource.displayName,
          repositoryFullName: unavailableSource.repositoryFullName,
          hydrationState: 'unavailable',
          lastHydratedAt: null,
          lastHydratedResolvedRef: null,
          lastObservedRemoteResolvedRef: null,
          freshnessReason: null,
        },
      ],
    });
    expect(response.json().sourceAttachments.items[0]).not.toHaveProperty('refreshStatus');
    expect(response.json().sourceAttachments.items[0]).not.toHaveProperty('refreshRequestedAt');

    await app.close();
  });

  it('TC-6.3a one failing source does not hide healthy sources', async () => {
    const healthySource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-project-healthy-001',
      displayName: 'healthy source',
      repositoryUrl: 'https://github.com/liminal-ai/healthy-source',
      repositoryFullName: 'liminal-ai/healthy-source',
      updatedAt: '2026-05-03T12:10:00.000Z',
    });
    const failingSource = buildSourceAttachmentSummaryFixture({
      sourceAttachmentId: 'source-project-failing-001',
      displayName: 'failing source',
      repositoryUrl: 'https://github.com/liminal-ai/failing-source',
      repositoryFullName: 'liminal-ai/failing-source',
      updatedAt: '2026-05-03T12:05:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary],
      },
      projectAccessByProjectId: {
        [ownerProjectSummary.projectId]: {
          kind: 'accessible',
          project: ownerProjectSummary,
        },
      },
      sourceAttachmentsByProjectId: {
        [ownerProjectSummary.projectId]: [healthySource, failingSource],
      },
    });
    const sourceRefreshService = new DefaultSourceRefreshService(
      platformStore,
      new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => {
        if (repositoryUrl === failingSource.repositoryUrl) {
          throw new Error('GitHub source lookup failed for one attachment.');
        }

        return {
          kind: 'resolved',
          repositoryUrl,
          repositoryFullName: healthySource.repositoryFullName,
          targetRef,
          targetRefKind: targetRef === null ? 'none' : 'branch',
          defaultBranch: 'main',
          resolvedRef: targetRef === null ? null : 'a'.repeat(40),
        };
      }),
      noOpHydrationExecutor,
    );
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
      sourceRefreshService,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${ownerProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().sourceAttachments.status).toBe('ready');
    expect(response.json().sourceAttachments.items).toHaveLength(2);

    const healthyItem = response
      .json()
      .sourceAttachments.items.find(
        (item: { sourceAttachmentId: string }) =>
          item.sourceAttachmentId === healthySource.sourceAttachmentId,
      );
    const unavailableItem = response
      .json()
      .sourceAttachments.items.find(
        (item: { sourceAttachmentId: string }) =>
          item.sourceAttachmentId === failingSource.sourceAttachmentId,
      );

    expect(healthyItem).toMatchObject({
      sourceAttachmentId: healthySource.sourceAttachmentId,
      hydrationState: 'hydrated',
      lastHydratedAt: healthySource.lastHydratedAt,
      lastHydratedResolvedRef: healthySource.lastHydratedResolvedRef,
      lastObservedRemoteResolvedRef: healthySource.lastObservedRemoteResolvedRef,
      freshnessReason: healthySource.freshnessReason,
    });
    expect(unavailableItem).toMatchObject({
      sourceAttachmentId: failingSource.sourceAttachmentId,
      hydrationState: 'unavailable',
      lastHydratedAt: null,
      lastHydratedResolvedRef: null,
      lastObservedRemoteResolvedRef: null,
      freshnessReason: null,
    });
    expect(unavailableItem).not.toHaveProperty('refreshStatus');
    expect(unavailableItem).not.toHaveProperty('refreshRequestedAt');

    await app.close();
  });
});
