import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
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
        clientId: 'client_test_process_html',
        cookiePassword: 'story1-process-html-cookie-password-123456',
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

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-process-route-001',
  name: 'Liminal Build Platform',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-13T12:18:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-process-route-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'waiting',
  phaseLabel: 'Clarifying scope',
  nextActionLabel: 'Respond to the current request',
  availableActions: ['respond'],
  hasEnvironment: false,
  updatedAt: '2026-04-13T12:18:00.000Z',
});

function buildStore() {
  return new InMemoryPlatformStore({
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
  });
}

describe('process html routes', () => {
  it('TC-1.1a and TC-1.1b return the authenticated shell for an accessible process route', async () => {
    const platformStore = buildStore();
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
      url: `/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('window.__SHELL_BOOTSTRAP__');
    expect(response.body).toContain(
      `/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
    );

    await app.close();
  });

  it('TC-6.4a missing process route returns a process unavailable shell', async () => {
    const platformStore = buildStore();
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
      url: `/projects/${projectSummary.projectId}/processes/missing-process`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Process unavailable');
    expect(response.body).not.toContain(processSummary.displayLabel);

    await app.close();
  });

  it('TC-6.4b revoked access blocks the process surface shell', async () => {
    const platformStore = new InMemoryPlatformStore({
      projectAccessByProjectId: {
        [projectSummary.projectId]: { kind: 'forbidden' },
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
      url: `/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Access denied');
    expect(response.body).not.toContain(processSummary.displayLabel);

    await app.close();
  });

  it('redirects unauthenticated process routes to sign-in', async () => {
    const platformStore = buildStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: null,
        reason: 'missing_session',
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      `/auth/login?returnTo=${encodeURIComponent(
        `/projects/${projectSummary.projectId}/processes/${processSummary.processId}`,
      )}`,
    );

    await app.close();
  });
});
