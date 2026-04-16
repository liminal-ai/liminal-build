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
  processHistoryItemSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { waitingProcessControlsFixture } from '../../fixtures/process-controls.js';
import { readyEnvironmentFixture } from '../../fixtures/process-environment.js';
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

const followUpWaitingProcessSummary = processSummarySchema.parse({
  ...waitingProcessSummary,
  nextActionLabel: 'Clarify the target user before proceeding.',
  updatedAt: '2026-04-13T12:13:00.000Z',
});

const followUpCurrentRequest = currentProcessRequestSchema.parse({
  requestId: 'request-story3-actions-002',
  requestKind: 'clarification',
  promptText: 'Clarify the target user before the process can continue.',
  requiredActionLabel: 'Clarify target user',
  createdAt: '2026-04-13T12:13:00.000Z',
});

const submittedResponseHistoryItem = processHistoryItemSchema.parse({
  historyItemId: 'history-story3-actions-001',
  kind: 'user_message',
  lifecycleState: 'finalized',
  text: 'Let us focus on technical founders first.',
  createdAt: '2026-04-13T12:13:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: null,
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
  it('TC-2.1a and TC-2.5a start a draft process — response shows preparing state, bootstrap shows running after hydration', async () => {
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
        status: 'draft',
        availableActions: [],
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

  it('TC-2.1b and TC-2.5b resume a paused process — response shows preparing state, bootstrap shows running after hydration', async () => {
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
        status: 'paused',
        availableActions: [],
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

  it('resume always enters environment preparing state and the response reflects it', async () => {
    const { app } = await buildAuthenticatedApp({
      processEnvironmentSummariesByProcessId: {
        [pausedProcessSummary.processId]: readyEnvironmentFixture,
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
        status: 'paused',
        hasEnvironment: true,
        controls: expect.arrayContaining([
          expect.objectContaining({
            actionId: 'rehydrate',
            enabled: false,
            disabledReason: 'Rehydrate is unavailable while the environment is preparing.',
          }),
          expect.objectContaining({
            actionId: 'rebuild',
            enabled: false,
            disabledReason: 'Rebuild is unavailable while the environment is preparing.',
          }),
        ]),
      },
      environment: {
        state: 'preparing',
        statusLabel: 'Preparing environment',
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-2.1c resumes an interrupted process — response shows preparing state, bootstrap shows running after hydration', async () => {
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
        status: 'interrupted',
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

  it('returns PROCESS_ACTION_NOT_AVAILABLE when respond is attempted outside a waiting state', async () => {
    const { app } = await buildAuthenticatedApp();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-001',
        message: 'Please continue.',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'PROCESS_ACTION_NOT_AVAILABLE',
      message: 'Respond is not available for this process right now.',
      status: 409,
    });

    await app.close();
  });

  it('TC-3.2b, TC-3.3a, TC-3.6a, and TC-5.2b accept a valid response, persist history, and clear the current request', async () => {
    const { app } = await buildAuthenticatedApp({
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: waitingCurrentRequest,
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-002',
        message: 'Let us focus on technical founders first.',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accepted: true,
      process: {
        processId: waitingProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });
    expect(response.json().historyItemId).toEqual(expect.any(String));

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toMatchObject({
      process: {
        processId: waitingProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
      history: {
        status: 'ready',
      },
    });
    expect(
      bootstrap
        .json()
        .history.items.find(
          (item: { historyItemId: string }) => item.historyItemId === response.json().historyItemId,
        ),
    ).toMatchObject({
      kind: 'user_message',
      text: 'Let us focus on technical founders first.',
    });

    await app.close();
  });

  it('TC-3.6b can keep the process waiting when a follow-up request is returned', async () => {
    const { app } = await buildAuthenticatedApp({
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: waitingCurrentRequest,
      },
      submitProcessResponseResultsByProcessId: {
        [waitingProcessSummary.processId]: {
          accepted: true,
          historyItem: submittedResponseHistoryItem,
          process: followUpWaitingProcessSummary,
          currentRequest: followUpCurrentRequest,
        },
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-003',
        message: submittedResponseHistoryItem.text,
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accepted: true,
      historyItemId: submittedResponseHistoryItem.historyItemId,
      process: {
        processId: waitingProcessSummary.processId,
        displayLabel: followUpWaitingProcessSummary.displayLabel,
        processType: followUpWaitingProcessSummary.processType,
        status: 'waiting',
        phaseLabel: followUpWaitingProcessSummary.phaseLabel,
        nextActionLabel: followUpWaitingProcessSummary.nextActionLabel,
        availableActions: ['respond'],
        controls: waitingProcessControlsFixture,
        hasEnvironment: followUpWaitingProcessSummary.hasEnvironment,
        updatedAt: followUpWaitingProcessSummary.updatedAt,
      },
      currentRequest: followUpCurrentRequest,
    });

    await app.close();
  });

  it('TC-3.5a rejects an empty response without creating history', async () => {
    const { app } = await buildAuthenticatedApp({
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: waitingCurrentRequest,
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-004',
        message: '   ',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: 'INVALID_PROCESS_RESPONSE',
      message: 'Submitted response must include a non-empty clientRequestId and message.',
      status: 422,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.json().history.items).toEqual([]);

    await app.close();
  });

  it('TC-3.5b does not create partial visible history when response submission fails downstream', async () => {
    const { app } = await buildAuthenticatedApp({
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: waitingCurrentRequest,
      },
      submitProcessResponseFailuresByProcessId: {
        [waitingProcessSummary.processId]: new Error('downstream rejected response'),
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-005',
        message: 'Please continue with the focused scope.',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'PROCESS_ACTION_FAILED',
      message:
        'The process response could not be completed right now. Try again or reload the page.',
      status: 500,
    });

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(bootstrap.json().history.items).toEqual([]);
    expect(bootstrap.json().currentRequest).toEqual(waitingCurrentRequest);

    await app.close();
  });

  it('response deduplicates repeated clientRequestId within one process', async () => {
    const { app } = await buildAuthenticatedApp({
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: waitingCurrentRequest,
      },
    });
    const firstResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-006',
        message: 'Keep the focused scope.',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const secondResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}/responses`,
      payload: {
        clientRequestId: 'client-request-story3-006',
        message: 'Keep the focused scope.',
      },
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json().historyItemId).toBe(firstResponse.json().historyItemId);

    const bootstrap = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(
      bootstrap
        .json()
        .history.items.filter((item: { kind: string }) => item.kind === 'user_message'),
    ).toHaveLength(1);

    await app.close();
  });

  it('S2-TC-2.1a: start returns environment.state = preparing in the same session', async () => {
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
        status: 'draft',
        hasEnvironment: true,
      },
      environment: {
        state: 'preparing',
        statusLabel: 'Preparing environment',
        blockedReason: null,
        lastHydratedAt: null,
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('S2-TC-2.1a: start hydration completes and the ready state is durable in the bootstrap', async () => {
    const { app } = await buildAuthenticatedApp();
    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
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
        hasEnvironment: true,
      },
      environment: {
        state: 'ready',
        statusLabel: 'Ready for work',
        environmentId: `env-mem-${draftProcessSummary.processId}`,
      },
    });

    await app.close();
  });

  it('S2-TC-2.1b: resume returns environment.state = preparing when environment work is required', async () => {
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
        status: 'paused',
        hasEnvironment: true,
      },
      environment: {
        state: 'preparing',
        statusLabel: 'Preparing environment',
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('S2-TC-2.1b: resume preserves prior hydration context when entering preparing state', async () => {
    const { app } = await buildAuthenticatedApp({
      processEnvironmentSummariesByProcessId: {
        [pausedProcessSummary.processId]: readyEnvironmentFixture,
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
      environment: {
        state: 'preparing',
        environmentId: readyEnvironmentFixture.environmentId,
        lastHydratedAt: readyEnvironmentFixture.lastHydratedAt,
      },
    });

    await app.close();
  });

  it('S2-TC-2.4b: start does not enter preparation state when the action result is terminal', async () => {
    const completedResult = {
      process: {
        ...draftProcessSummary,
        status: 'completed' as const,
        phaseLabel: 'Completed',
        nextActionLabel: null,
        availableActions: ['review' as const],
        updatedAt: '2026-04-13T12:30:00.000Z',
      },
      currentRequest: null,
    };
    const { app } = await buildAuthenticatedApp({
      startProcessResultsByProcessId: {
        [draftProcessSummary.processId]: completedResult,
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
      process: { status: 'completed' },
      environment: { state: 'absent' },
    });

    await app.close();
  });

  it('S2-HC-1: start seeds hydration plan from current artifacts and sources', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({
      currentMaterialRefsByProcessId: {
        [draftProcessSummary.processId]: {
          artifactIds: ['artifact-hydration-001', 'artifact-hydration-002'],
          sourceAttachmentIds: ['source-hydration-001'],
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
    const plan = await platformStore.getProcessHydrationPlan({
      processId: draftProcessSummary.processId,
    });
    expect(plan).toEqual({
      artifactIds: ['artifact-hydration-001', 'artifact-hydration-002'],
      sourceAttachmentIds: ['source-hydration-001'],
      outputIds: [],
    });

    await app.close();
  });

  it('S2-HC-2: partial working set with only artifacts omits source attachment ids cleanly', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({
      currentMaterialRefsByProcessId: {
        [draftProcessSummary.processId]: {
          artifactIds: ['artifact-partial-001'],
          sourceAttachmentIds: [],
        },
      },
    });

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    const plan = await platformStore.getProcessHydrationPlan({
      processId: draftProcessSummary.processId,
    });
    expect(plan).toEqual({
      artifactIds: ['artifact-partial-001'],
      sourceAttachmentIds: [],
      outputIds: [],
    });

    await app.close();
  });

  it('TC-2.2a: start seeds hydration plan with output ids when outputs are present', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({
      processOutputsByProcessId: {
        [draftProcessSummary.processId]: [
          {
            outputId: 'output-hydration-001',
            displayName: 'Feature Spec',
            revisionLabel: null,
            state: 'draft',
            updatedAt: '2026-04-13T12:00:00.000Z',
            linkedArtifactId: null,
          },
          {
            outputId: 'output-hydration-002',
            displayName: 'Tech Design',
            revisionLabel: null,
            state: 'draft',
            updatedAt: '2026-04-13T12:01:00.000Z',
            linkedArtifactId: null,
          },
        ],
      },
    });

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}/start`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    const plan = await platformStore.getProcessHydrationPlan({
      processId: draftProcessSummary.processId,
    });
    expect(plan).toEqual({
      artifactIds: [],
      sourceAttachmentIds: [],
      outputIds: ['output-hydration-001', 'output-hydration-002'],
    });

    await app.close();
  });

  it('TC-2.2b: resume seeds hydration plan with empty outputIds when no outputs are present', async () => {
    const { app, platformStore } = await buildAuthenticatedApp();

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    const plan = await platformStore.getProcessHydrationPlan({
      processId: pausedProcessSummary.processId,
    });
    expect(plan).toEqual({
      artifactIds: [],
      sourceAttachmentIds: [],
      outputIds: [],
    });

    await app.close();
  });

  it('S2-HC-3: partial working set with only sources omits artifact ids cleanly', async () => {
    const { app, platformStore } = await buildAuthenticatedApp({
      currentMaterialRefsByProcessId: {
        [pausedProcessSummary.processId]: {
          artifactIds: [],
          sourceAttachmentIds: ['source-partial-001', 'source-partial-002'],
        },
      },
    });

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedProcessSummary.processId}/resume`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    const plan = await platformStore.getProcessHydrationPlan({
      processId: pausedProcessSummary.processId,
    });
    expect(plan).toEqual({
      artifactIds: [],
      sourceAttachmentIds: ['source-partial-001', 'source-partial-002'],
      outputIds: [],
    });

    await app.close();
  });
});
