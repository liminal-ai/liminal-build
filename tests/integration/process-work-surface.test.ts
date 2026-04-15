import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
} from '../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';
import { waitingProcessFixture } from '../fixtures/processes.js';
import { currentProcessRequestFixture } from '../fixtures/process-surface.js';
import { buildApp } from '../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story3_process_surface',
        cookiePassword: 'story3-process-surface-cookie-password-12345',
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

async function startApp(store: InMemoryPlatformStore) {
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
    authUserSyncService: new AuthUserSyncService(store),
    platformStore: store,
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
  delete process.env.LIMINAL_VITE_RUNTIME_MODE;
});

describe('process work surface integration', () => {
  it('TC-3.3b submitted responses remain visible after reload and return', async () => {
    const projectSummary = projectSummarySchema.parse({
      projectId: 'project-story3-integration-001',
      name: 'Liminal Build Platform',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 0,
      sourceAttachmentCount: 0,
      lastUpdatedAt: '2026-04-13T12:00:00.000Z',
    });
    const waitingProcessSummary = processSummarySchema.parse({
      ...waitingProcessFixture,
      processId: 'process-story3-integration-001',
      displayLabel: 'Feature Specification #3',
      updatedAt: '2026-04-13T12:02:00.000Z',
    });
    const store = new InMemoryPlatformStore({
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
        [projectSummary.projectId]: [waitingProcessSummary],
      },
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: currentProcessRequestFixture,
      },
    });

    const firstServer = await startApp(store);
    const submitResponse = await fetch(
      `${firstServer.baseUrl}/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      {
        method: 'POST',
        headers: {
          cookie: 'lb_session=integration-session-a',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          clientRequestId: 'client-request-story3-integration-001',
          message: 'We should narrow the scope to technical founders.',
        }),
      },
    );

    expect(submitResponse.status).toBe(200);
    await firstServer.app.close();

    const secondServer = await startApp(store);
    const bootstrapResponse = await fetch(
      `${secondServer.baseUrl}/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session-b',
        },
      },
    );
    const bootstrap = await bootstrapResponse.json();

    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrap.process).toMatchObject({
      processId: waitingProcessSummary.processId,
      status: 'running',
      availableActions: ['review'],
    });
    expect(bootstrap.currentRequest).toBeNull();
    expect(bootstrap.history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'user_message',
          text: 'We should narrow the scope to technical founders.',
        }),
      ]),
    );

    await secondServer.app.close();
  });
});
