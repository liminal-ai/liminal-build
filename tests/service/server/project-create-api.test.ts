import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { ownerProjectSummary } from '../../fixtures/projects.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story2',
        cookiePassword: 'story2-cookie-password-story2-cookie-password',
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

describe('project create api', () => {
  it('TC-2.1a creates a project, assigns the owner, and returns an empty shell response', async () => {
    const platformStore = new InMemoryPlatformStore();
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
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        name: 'New Platform',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      project: {
        projectId: 'project-1',
        name: 'New Platform',
        ownerDisplayName: 'Lee Moore',
        role: 'owner',
        processCount: 0,
        artifactCount: 0,
        sourceAttachmentCount: 0,
        lastUpdatedAt: expect.any(String),
      },
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

  it('TC-2.1b rejects a missing project name with a validation error', async () => {
    const platformStore = new InMemoryPlatformStore();
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
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: 'INVALID_PROJECT_NAME',
      message: 'Project name is required.',
      status: 422,
    });

    await app.close();
  });

  it('TC-2.1d rejects a duplicate owned project name', async () => {
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [ownerProjectSummary],
      },
    });
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
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        name: ownerProjectSummary.name,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'PROJECT_NAME_CONFLICT',
      message: 'You already own a project named "Core Platform".',
      status: 409,
    });

    await app.close();
  });
});
