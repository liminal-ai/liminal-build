import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import {
  InMemoryPlatformStore,
  type PlatformStore,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(args: {
  resolution: SessionResolution;
  authorizationUrl?: string;
  authenticatedActor?: {
    userId: string;
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  };
  sealedSession?: string;
}) {
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
      return args.resolution;
    }

    override async getAuthorizationUrl(state: string): Promise<string> {
      return args.authorizationUrl ?? `https://authkit.example/login?state=${state}`;
    }

    override async authenticateWithCode() {
      return {
        actor: args.authenticatedActor ?? {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        sealedSession: args.sealedSession ?? 'sealed-session-cookie',
      };
    }

    override async getLogoutUrl(): Promise<string> {
      return 'https://logout.example/complete';
    }
  }

  return new TestAuthSessionService();
}

function extractCookies(setCookieHeader: string | string[] | undefined): string {
  const values = typeof setCookieHeader === 'string' ? [setCookieHeader] : (setCookieHeader ?? []);

  return values.map((value) => value.split(';', 1)[0]).join('; ');
}

function extractCsrfToken(html: string): string {
  const match = html.match(/"csrfToken":"([^"]+)"/);

  if (match === null) {
    throw new Error('Expected shell HTML to include a CSRF token.');
  }

  const token = match[1];

  if (token === undefined) {
    throw new Error('Expected shell HTML to include a CSRF token value.');
  }

  return token;
}

describe('auth routes', () => {
  it('TC-1.1a returns shell HTML for authenticated project route', async () => {
    const platformStore = new InMemoryPlatformStore();
    const authSessionService = createTestAuthSessionService({
      resolution: {
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      },
    });
    const authUserSyncService = new AuthUserSyncService(platformStore);
    const app = await buildApp({
      authSessionService,
      authUserSyncService,
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('window.__SHELL_BOOTSTRAP__');

    await app.close();
  });

  it('TC-1.1b redirects unauthenticated project route', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: null,
          reason: 'missing_session',
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/projects',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('/auth/login?returnTo=%2Fprojects');

    await app.close();
  });

  it('TC-1.1c clears invalid session and redirects', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: null,
          reason: 'invalid_session',
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/projects',
      cookies: {
        [sessionCookieName]: 'invalid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('/auth/login?returnTo=%2Fprojects');
    expect(
      response.cookies.some((cookie) => cookie.name === sessionCookieName && cookie.value === ''),
    ).toBe(true);

    await app.close();
  });

  it('returns the authenticated user from /auth/me', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: {
            userId: 'workos-user-1',
            workosUserId: 'workos-user-1',
            email: 'lee@example.com',
            displayName: 'Lee Moore',
          },
          reason: null,
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
    });

    await app.close();
  });

  it('TC-1.4a logout invalidates session', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: {
            userId: 'workos-user-1',
            workosUserId: 'workos-user-1',
            email: 'lee@example.com',
            displayName: 'Lee Moore',
          },
          reason: null,
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const shellResponse = await app.inject({
      method: 'GET',
      url: '/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(shellResponse.cookies.some((cookie) => cookie.path === '/')).toBe(true);

    const csrfToken = extractCsrfToken(shellResponse.body);
    const cookieHeader = extractCookies(shellResponse.headers['set-cookie']);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        cookie: `${cookieHeader}; ${sessionCookieName}=valid-session-cookie`,
        'x-csrf-token': csrfToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      redirectUrl: 'https://logout.example/complete',
    });
    expect(
      response.cookies.some((cookie) => cookie.name === sessionCookieName && cookie.value === ''),
    ).toBe(true);

    await app.close();
  });

  it('rejects logout without a valid CSRF token', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: {
            userId: 'workos-user-1',
            workosUserId: 'workos-user-1',
            email: 'lee@example.com',
            displayName: 'Lee Moore',
          },
          reason: null,
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const shellResponse = await app.inject({
      method: 'GET',
      url: '/projects',
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const cookieHeader = extractCookies(shellResponse.headers['set-cookie']);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        cookie: `${cookieHeader}; ${sessionCookieName}=valid-session-cookie`,
        'x-csrf-token': 'invalid-csrf-token',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(
      response.cookies.some((cookie) => cookie.name === sessionCookieName && cookie.value === ''),
    ).toBe(false);

    await app.close();
  });

  it('TC-1.4b signed-out user cannot reopen bookmarked project', async () => {
    const platformStore = new InMemoryPlatformStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: null,
          reason: 'missing_session',
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/projects/project-owner-001',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain(
      '/auth/login?returnTo=%2Fprojects%2Fproject-owner-001',
    );

    await app.close();
  });

  it('auth callback upserts the actor projection before redirecting into the shell', async () => {
    const syncCalls: Array<{
      workosUserId: string;
      email: string | null;
      displayName: string | null;
    }> = [];
    const platformStore: PlatformStore = {
      async upsertUserFromWorkOS(args) {
        syncCalls.push(args);

        return {
          userId: `user:${args.workosUserId}`,
          workosUserId: args.workosUserId,
          email: args.email,
          displayName: args.displayName,
        };
      },
      async listAccessibleProjects() {
        return [];
      },
      async getProjectAccess() {
        return {
          kind: 'not_found',
        };
      },
      async createProject() {
        return {
          kind: 'name_conflict',
        };
      },
      async createProcess(args) {
        return {
          kind: 'created',
          process: {
            processId: `process:${args.projectId}`,
            displayLabel: args.displayLabel,
            processType: args.processType,
            status: 'draft',
            phaseLabel: 'Draft',
            nextActionLabel: 'Open the process',
            availableActions: ['open'],
            hasEnvironment: false,
            updatedAt: '2026-04-13T12:00:00.000Z',
          },
        };
      },
      async startProcess(args) {
        return {
          process: {
            processId: args.processId,
            displayLabel: 'Feature Specification #1',
            processType: 'FeatureSpecification',
            status: 'running',
            phaseLabel: 'Working',
            nextActionLabel: 'Monitor progress in the work surface',
            availableActions: ['open', 'review'],
            hasEnvironment: false,
            updatedAt: '2026-04-13T12:05:00.000Z',
          },
          currentRequest: null,
        };
      },
      async resumeProcess(args) {
        return {
          process: {
            processId: args.processId,
            displayLabel: 'Feature Specification #1',
            processType: 'FeatureSpecification',
            status: 'running',
            phaseLabel: 'Working',
            nextActionLabel: 'Monitor progress in the work surface',
            availableActions: ['open', 'review'],
            hasEnvironment: false,
            updatedAt: '2026-04-13T12:05:00.000Z',
          },
          currentRequest: null,
        };
      },
      async getSubmittedProcessResponse() {
        return null;
      },
      async submitProcessResponse(args) {
        return {
          accepted: true,
          historyItem: {
            historyItemId: `history:${args.processId}:${args.clientRequestId}`,
            kind: 'user_message',
            lifecycleState: 'finalized',
            text: args.message,
            createdAt: '2026-04-13T12:06:00.000Z',
            relatedSideWorkId: null,
            relatedArtifactId: null,
          },
          process: {
            processId: args.processId,
            displayLabel: 'Feature Specification #1',
            processType: 'FeatureSpecification',
            status: 'running',
            phaseLabel: 'Working',
            nextActionLabel: 'Monitor progress in the work surface',
            availableActions: ['open', 'review'],
            hasEnvironment: false,
            updatedAt: '2026-04-13T12:06:00.000Z',
          },
          currentRequest: null,
        };
      },
      async listProjectProcesses() {
        return [];
      },
      async getProcessRecord() {
        return null;
      },
      async listProjectArtifacts() {
        return [];
      },
      async listProjectSourceAttachments() {
        return [];
      },
      async listProcessHistoryItems() {
        return [];
      },
      async getCurrentProcessRequest() {
        return null;
      },
      async getCurrentProcessMaterialRefs() {
        return {
          artifactIds: [],
          sourceAttachmentIds: [],
        };
      },
      async setCurrentProcessMaterialRefs(args) {
        return {
          artifactIds: args.artifactIds,
          sourceAttachmentIds: args.sourceAttachmentIds,
        };
      },
      async listProcessOutputs() {
        return [];
      },
      async replaceCurrentProcessOutputs(args) {
        return args.outputs.map((output, index) => ({
          outputId: output.outputId ?? `output-${index + 1}`,
          linkedArtifactId: output.linkedArtifactId,
          displayName: output.displayName,
          revisionLabel: output.revisionLabel,
          state: output.state,
          updatedAt: output.updatedAt ?? '2026-04-13T12:06:00.000Z',
        }));
      },
      async listProcessSideWorkItems() {
        return [];
      },
    };
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        resolution: {
          actor: null,
          reason: 'missing_session',
        },
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const loginResponse = await app.inject({
      method: 'GET',
      url: '/auth/login?returnTo=/projects',
    });
    const redirectLocation = loginResponse.headers.location;

    if (redirectLocation === undefined) {
      throw new Error('Expected login redirect location to be set.');
    }

    const state = new URL(redirectLocation).searchParams.get('state');

    if (state === null) {
      throw new Error('Expected login redirect location to include state.');
    }

    const response = await app.inject({
      method: 'GET',
      url: `/auth/callback?code=story1-auth-code&state=${encodeURIComponent(state)}`,
      headers: {
        cookie: extractCookies(loginResponse.headers['set-cookie']),
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/projects');
    expect(syncCalls).toEqual([
      {
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
    ]);
    expect(
      response.cookies.some(
        (cookie) => cookie.name === sessionCookieName && cookie.value === 'sealed-session-cookie',
      ),
    ).toBe(true);

    await app.close();
  });
});
