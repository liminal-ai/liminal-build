import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import {
  FailingProviderAdapter,
  type ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { InMemoryProcessLiveHub } from '../../../apps/platform/server/services/processes/live/process-live-hub.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  lostEnvironmentFixture,
  staleEnvironmentFixture,
} from '../../fixtures/process-environment.js';
import {
  draftProcessFixture,
  interruptedProcessFixture,
  pausedProcessFixture,
} from '../../fixtures/processes.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_fire_and_forget',
        cookiePassword: 'fire-and-forget-cookie-password-12345',
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

const projectId = 'project-fire-and-forget-1';
const projectSummary = projectSummarySchema.parse({
  projectId,
  name: 'Fire and Forget Test',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-15T11:00:00.000Z',
});
const actor = {
  userId: 'workos-user-1',
  workosUserId: 'workos-user-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

async function waitForFailedDurable(args: {
  store: InMemoryPlatformStore;
  processId: string;
  reasonContains: string;
  timeoutMs?: number;
}): Promise<void> {
  const startedAt = Date.now();
  const timeoutMs = args.timeoutMs ?? 1500;
  // The fire-and-forget paths transition the env state synchronously after
  // their adapter call rejects; we just need to wait one or two microtask
  // turns. Polling with a small sleep keeps the test stable.
  while (Date.now() - startedAt < timeoutMs) {
    const summary = await args.store.getProcessEnvironmentSummary({ processId: args.processId });
    if (summary.state === 'failed' && (summary.blockedReason ?? '').includes(args.reasonContains)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const final = await args.store.getProcessEnvironmentSummary({ processId: args.processId });
  throw new Error(
    `Timed out waiting for env to transition to failed with reason containing '${args.reasonContains}'. Final state=${final.state}, reason=${final.blockedReason}`,
  );
}

describe('process environment fire-and-forget cleanup', () => {
  it('runHydrationAsync transitions environment to failed when the adapter rejects', async () => {
    const draft = processSummarySchema.parse({
      ...draftProcessFixture,
      processId: 'process-hydration-failure-1',
      updatedAt: '2026-04-15T11:00:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: { 'user:workos-user-1': [projectSummary] },
      projectAccessByProjectId: {
        [projectId]: { kind: 'accessible', project: projectSummary },
      },
      processesByProjectId: { [projectId]: [draft] },
    });
    const failureProvider: ProviderAdapter = new FailingProviderAdapter('hydration kaboom');
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapter: failureProvider,
    });

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${draft.processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitForFailedDurable({
      store: platformStore,
      processId: draft.processId,
      reasonContains: 'hydration kaboom',
    });

    await app.close();
  });

  it('runRehydrateAsync transitions environment to failed when the adapter rejects', async () => {
    const paused = processSummarySchema.parse({
      ...pausedProcessFixture,
      processId: 'process-rehydrate-failure-1',
      updatedAt: '2026-04-15T11:05:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: { 'user:workos-user-1': [projectSummary] },
      projectAccessByProjectId: {
        [projectId]: { kind: 'accessible', project: projectSummary },
      },
      processesByProjectId: { [projectId]: [paused] },
      processEnvironmentSummariesByProcessId: {
        [paused.processId]: staleEnvironmentFixture,
      },
    });
    const failureProvider: ProviderAdapter = new FailingProviderAdapter('rehydrate kaboom');
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapter: failureProvider,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${paused.processId}/rehydrate`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    expect(response.statusCode).toBe(200);

    await waitForFailedDurable({
      store: platformStore,
      processId: paused.processId,
      reasonContains: 'rehydrate kaboom',
    });

    await app.close();
  });

  it('runRebuildAsync transitions environment to failed when the adapter rejects', async () => {
    const interrupted = processSummarySchema.parse({
      ...interruptedProcessFixture,
      processId: 'process-rebuild-failure-1',
      updatedAt: '2026-04-15T11:10:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: { 'user:workos-user-1': [projectSummary] },
      projectAccessByProjectId: {
        [projectId]: { kind: 'accessible', project: projectSummary },
      },
      processesByProjectId: { [projectId]: [interrupted] },
      processEnvironmentSummariesByProcessId: {
        [interrupted.processId]: lostEnvironmentFixture,
      },
      currentMaterialRefsByProcessId: {
        [interrupted.processId]: {
          artifactIds: ['artifact-rebuild-1'],
          sourceAttachmentIds: [],
        },
      },
    });
    const failureProvider: ProviderAdapter = new FailingProviderAdapter('rebuild kaboom');
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapter: failureProvider,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${interrupted.processId}/rebuild`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    expect(response.statusCode).toBe(200);

    await waitForFailedDurable({
      store: platformStore,
      processId: interrupted.processId,
      reasonContains: 'rebuild kaboom',
    });

    await app.close();
  });
});
