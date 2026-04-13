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
import {
  inaccessibleProjectId,
  memberProjectSummary,
  ownerProjectSummary,
  sameNameDifferentOwnerProjectSummaries,
} from '../../fixtures/projects.js';
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
});
