import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  currentProcessRequestSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  draftProcessFixture,
  interruptedProcessFixture,
  pausedProcessFixture,
  waitingProcessFixture,
} from '../../fixtures/processes.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story2_process_actions',
        cookiePassword: 'story2-process-actions-cookie-password-12345',
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

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-story2-actions-001',
  name: 'Liminal Build Platform',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 4,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-13T12:00:00.000Z',
});

const draftProcessSummary = processSummarySchema.parse({
  ...draftProcessFixture,
  updatedAt: '2026-04-13T12:00:00.000Z',
});

const pausedProcessSummary = processSummarySchema.parse({
  ...pausedProcessFixture,
  updatedAt: '2026-04-13T12:03:00.000Z',
});

const interruptedProcessSummary = processSummarySchema.parse({
  ...interruptedProcessFixture,
  updatedAt: '2026-04-13T12:06:00.000Z',
});

const waitingProcessSummary = processSummarySchema.parse({
  ...waitingProcessFixture,
  updatedAt: '2026-04-13T12:09:00.000Z',
});

const waitingCurrentRequest = currentProcessRequestSchema.parse({
  requestId: 'request-story2-actions-001',
  requestKind: 'clarification',
  promptText: 'Choose the launch scope before the process can continue.',
  requiredActionLabel: 'Respond to unblock this process',
  createdAt: '2026-04-13T12:10:00.000Z',
});

const waitingAfterStartProcessSummary = processSummarySchema.parse({
  ...draftProcessSummary,
  status: 'waiting',
  phaseLabel: 'Waiting for scope confirmation',
  nextActionLabel: 'Respond to unblock the process',
  availableActions: ['respond'],
  updatedAt: '2026-04-13T12:10:00.000Z',
});

const completedAfterResumeProcessSummary = processSummarySchema.parse({
  ...pausedProcessSummary,
  status: 'completed',
  phaseLabel: 'Completed',
  nextActionLabel: null,
  availableActions: ['review'],
  updatedAt: '2026-04-13T12:11:00.000Z',
});

const failedAfterResumeProcessSummary = processSummarySchema.parse({
  ...interruptedProcessSummary,
  status: 'failed',
  phaseLabel: 'Failed',
  nextActionLabel: 'Investigate failure',
  availableActions: ['review', 'restart'],
  updatedAt: '2026-04-13T12:12:00.000Z',
});

function buildStore(overrides: ConstructorParameters<typeof InMemoryPlatformStore>[0] = {}) {
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
      [projectSummary.projectId]: [
        draftProcessSummary,
        pausedProcessSummary,
        interruptedProcessSummary,
        waitingProcessSummary,
      ],
    },
    ...overrides,
  });
}

async function buildAuthenticatedApp(
  storeOverrides: ConstructorParameters<typeof InMemoryPlatformStore>[0] = {},
) {
  const platformStore = buildStore(storeOverrides);
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

  return {
    app,
    platformStore,
  };
}

describe('process actions api', () => {
  it('TC-2.1a and TC-2.5a start a draft process and persist the running surface state', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: draftProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: draftProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-2.1b and TC-2.5b resume a paused process and persist the running surface state', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: pausedProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: pausedProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-2.1c resumes an interrupted process and persists the running surface state', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${interruptedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: interruptedProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${interruptedProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: interruptedProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-2.4a carries a returned waiting state and current request through the start API boundary', async () => {
    const { app } = await buildAuthenticatedApp({
      startProcessResultsByProcessId: {
        [draftProcessSummary.processId]: {
          process: waitingAfterStartProcessSummary,
          currentRequest: waitingCurrentRequest,
        },
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: draftProcessSummary.processId,
        status: 'waiting',
        nextActionLabel: 'Respond to unblock the process',
        availableActions: ['respond'],
      },
      currentRequest: waitingCurrentRequest,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: draftProcessSummary.processId,
        status: 'waiting',
        nextActionLabel: 'Respond to unblock the process',
        availableActions: ['respond'],
      },
      currentRequest: waitingCurrentRequest,
    });

    await app.close();
  });

  it('TC-2.4b carries a returned completed state through the resume API boundary', async () => {
    const { app } = await buildAuthenticatedApp({
      resumeProcessResultsByProcessId: {
        [pausedProcessSummary.processId]: {
          process: completedAfterResumeProcessSummary,
          currentRequest: null,
        },
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: pausedProcessSummary.processId,
        status: 'completed',
        nextActionLabel: null,
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: pausedProcessSummary.processId,
        status: 'completed',
        nextActionLabel: null,
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-2.4c carries a returned failed state and next path through the resume API boundary', async () => {
    const { app } = await buildAuthenticatedApp({
      resumeProcessResultsByProcessId: {
        [interruptedProcessSummary.processId]: {
          process: failedAfterResumeProcessSummary,
          currentRequest: null,
        },
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${interruptedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: interruptedProcessSummary.processId,
        status: 'failed',
        nextActionLabel: 'Investigate failure',
        availableActions: ['review', 'restart'],
      },
      currentRequest: null,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${interruptedProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: interruptedProcessSummary.processId,
        status: 'failed',
        nextActionLabel: 'Investigate failure',
        availableActions: ['review', 'restart'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('returns PROCESS_ACTION_NOT_AVAILABLE when start is attempted outside the draft state', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'PROCESS_ACTION_NOT_AVAILABLE',
      message: 'Start is not available for this process right now.',
      status: 409,
    });

    await app.close();
  });

  it('returns PROCESS_ACTION_NOT_AVAILABLE when resume is attempted outside the paused or interrupted states', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'PROCESS_ACTION_NOT_AVAILABLE',
      message: 'Resume is not available for this process right now.',
      status: 409,
    });

    await app.close();
  });
});
