import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
} from '../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../apps/platform/server/services/projects/platform-store.js';
import {
  currentVersionArtifactFixture,
  processScopedArtifactFixture,
} from '../fixtures/artifacts.js';
import { interruptedProcessFixture, waitingProcessFixture } from '../fixtures/processes.js';
import { populatedProjectSummary } from '../fixtures/projects.js';
import { hydratedSourceFixture, processScopedSourceFixture } from '../fixtures/sources.js';
import { buildApp } from '../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story5',
        cookiePassword: 'story5-cookie-password-story5-cookie-password',
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

describe('platform shell integration', () => {
  it('TC-5.1b user can return later and reopen a prior project with durable state intact', async () => {
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [populatedProjectSummary],
      },
      projectAccessByProjectId: {
        [populatedProjectSummary.projectId]: {
          kind: 'accessible',
          project: populatedProjectSummary,
        },
      },
      processesByProjectId: {
        [populatedProjectSummary.projectId]: [interruptedProcessFixture, waitingProcessFixture],
      },
      artifactsByProjectId: {
        [populatedProjectSummary.projectId]: [
          processScopedArtifactFixture,
          currentVersionArtifactFixture,
        ],
      },
      sourceAttachmentsByProjectId: {
        [populatedProjectSummary.projectId]: [processScopedSourceFixture, hydratedSourceFixture],
      },
    });

    const firstServer = await startApp(store);
    const firstResponse = await fetch(
      `${firstServer.baseUrl}/api/projects/${populatedProjectSummary.projectId}?processId=${interruptedProcessFixture.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session-a',
        },
      },
    );
    const firstShell = await firstResponse.json();
    await firstServer.app.close();

    const secondServer = await startApp(store);
    const secondResponse = await fetch(
      `${secondServer.baseUrl}/api/projects/${populatedProjectSummary.projectId}?processId=${interruptedProcessFixture.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session-b',
        },
      },
    );
    const secondShell = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondShell).toEqual(firstShell);
    expect(
      secondShell.processes.items.map((item: { processId: string }) => item.processId),
    ).toEqual([waitingProcessFixture.processId, interruptedProcessFixture.processId]);

    await secondServer.app.close();
  });

  it('TC-5.1c shell data survives an application server restart', async () => {
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [populatedProjectSummary],
      },
      projectAccessByProjectId: {
        [populatedProjectSummary.projectId]: {
          kind: 'accessible',
          project: populatedProjectSummary,
        },
      },
      processesByProjectId: {
        [populatedProjectSummary.projectId]: [interruptedProcessFixture],
      },
      artifactsByProjectId: {
        [populatedProjectSummary.projectId]: [currentVersionArtifactFixture],
      },
      sourceAttachmentsByProjectId: {
        [populatedProjectSummary.projectId]: [hydratedSourceFixture],
      },
    });

    const firstServer = await startApp(store);
    const htmlBeforeRestart = await fetch(
      `${firstServer.baseUrl}/projects/${populatedProjectSummary.projectId}?processId=${interruptedProcessFixture.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session',
        },
      },
    );
    const apiBeforeRestart = await fetch(
      `${firstServer.baseUrl}/api/projects/${populatedProjectSummary.projectId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session',
        },
      },
    );
    const shellBeforeRestart = await apiBeforeRestart.json();
    await firstServer.app.close();

    const secondServer = await startApp(store);
    const htmlAfterRestart = await fetch(
      `${secondServer.baseUrl}/projects/${populatedProjectSummary.projectId}?processId=${interruptedProcessFixture.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session',
        },
      },
    );
    const apiAfterRestart = await fetch(
      `${secondServer.baseUrl}/api/projects/${populatedProjectSummary.projectId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session',
        },
      },
    );
    const shellAfterRestart = await apiAfterRestart.json();

    expect(htmlBeforeRestart.status).toBe(200);
    expect(htmlAfterRestart.status).toBe(200);
    expect(shellAfterRestart).toEqual(shellBeforeRestart);
    expect(shellAfterRestart.project.projectId).toBe(populatedProjectSummary.projectId);

    await secondServer.app.close();
  });

  it('serves the built shell through Fastify in production mode', async () => {
    process.env.LIMINAL_VITE_RUNTIME_MODE = 'production';
    const store = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [populatedProjectSummary],
      },
      projectAccessByProjectId: {
        [populatedProjectSummary.projectId]: {
          kind: 'accessible',
          project: populatedProjectSummary,
        },
      },
    });
    const server = await startApp(store);
    const response = await fetch(
      `${server.baseUrl}/projects/${populatedProjectSummary.projectId}`,
      {
        headers: {
          cookie: 'lb_session=integration-session',
        },
      },
    );
    const html = await response.text();
    const assetMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);

    expect(response.status).toBe(200);
    expect(html).toContain('window.__SHELL_BOOTSTRAP__');

    if (assetMatch?.[1] === undefined) {
      throw new Error('Expected production shell HTML to reference a built client asset.');
    }

    const assetResponse = await fetch(`${server.baseUrl}${assetMatch[1]}`);
    const assetBody = await assetResponse.text();
    const builtIndex = await fs.readFile(
      path.join('/Users/leemoore/code/liminal-build/apps/platform/dist/client/index.html'),
      'utf8',
    );

    expect(builtIndex).toContain(assetMatch[1]);
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get('content-type')).toContain('application/javascript');
    expect(assetBody.length).toBeGreaterThan(0);

    await server.app.close();
  });
});
