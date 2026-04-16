import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { CheckpointPlanner } from '../../../apps/platform/server/services/processes/environment/checkpoint-planner.js';
import {
  FailingCodeCheckpointWriter,
  StubCodeCheckpointWriter,
} from '../../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';
import {
  FailingProviderAdapter,
  type ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { InMemoryProcessLiveHub } from '../../../apps/platform/server/services/processes/live/process-live-hub.js';
import { buildProcessSurfaceSummary } from '../../../apps/platform/server/services/processes/process-work-surface.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  liveProcessUpdateMessageSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyProcessMaterialsFixture } from '../../fixtures/materials.js';
import {
  lostEnvironmentFixture,
  readyEnvironmentFixture,
  staleEnvironmentFixture,
} from '../../fixtures/process-environment.js';
import {
  progressUpdateHistoryFixture,
  readyProcessHistoryFixture,
} from '../../fixtures/process-history.js';
import {
  currentProcessRequestFixture,
  readyProcessWorkSurfaceFixture,
} from '../../fixtures/process-surface.js';
import {
  draftProcessFixture,
  interruptedProcessFixture,
  pausedProcessFixture,
  runningProcessFixture,
} from '../../fixtures/processes.js';
import { readySideWorkFixture } from '../../fixtures/side-work.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_process_live_ws',
        cookiePassword: 'story6-live-cookie-password-12345',
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
  projectId: readyProcessWorkSurfaceFixture.project.projectId,
  name: readyProcessWorkSurfaceFixture.project.name,
  ownerDisplayName: 'Lee Moore',
  role: readyProcessWorkSurfaceFixture.project.role,
  processCount: 1,
  artifactCount: readyProcessMaterialsFixture.currentArtifacts.length,
  sourceAttachmentCount: readyProcessMaterialsFixture.currentSources.length,
  lastUpdatedAt: readyProcessWorkSurfaceFixture.process.updatedAt,
});

const waitingProcessSummary = processSummarySchema.parse({
  processId: readyProcessWorkSurfaceFixture.process.processId,
  displayLabel: readyProcessWorkSurfaceFixture.process.displayLabel,
  processType: readyProcessWorkSurfaceFixture.process.processType,
  status: readyProcessWorkSurfaceFixture.process.status,
  phaseLabel: readyProcessWorkSurfaceFixture.process.phaseLabel,
  nextActionLabel: readyProcessWorkSurfaceFixture.process.nextActionLabel,
  availableActions: ['respond'],
  hasEnvironment: false,
  updatedAt: readyProcessWorkSurfaceFixture.process.updatedAt,
});

function buildPopulatedStore() {
  const processArtifact = {
    artifactId:
      readyProcessMaterialsFixture.currentArtifacts[0]?.artifactId ?? 'artifact-process-001',
    displayName: readyProcessMaterialsFixture.currentArtifacts[0]?.displayName ?? 'Artifact',
    currentVersionLabel:
      readyProcessMaterialsFixture.currentArtifacts[0]?.currentVersionLabel ?? null,
    attachmentScope: 'process' as const,
    processId: waitingProcessSummary.processId,
    processDisplayLabel: waitingProcessSummary.displayLabel,
    updatedAt:
      readyProcessMaterialsFixture.currentArtifacts[0]?.updatedAt ??
      waitingProcessSummary.updatedAt,
  };

  const processSource = {
    sourceAttachmentId:
      readyProcessMaterialsFixture.currentSources[0]?.sourceAttachmentId ?? 'source-process-001',
    displayName: readyProcessMaterialsFixture.currentSources[0]?.displayName ?? 'liminal-build',
    purpose: readyProcessMaterialsFixture.currentSources[0]?.purpose ?? 'implementation',
    accessMode: readyProcessMaterialsFixture.currentSources[0]?.accessMode ?? 'read_only',
    targetRef: readyProcessMaterialsFixture.currentSources[0]?.targetRef ?? null,
    hydrationState: readyProcessMaterialsFixture.currentSources[0]?.hydrationState ?? 'hydrated',
    attachmentScope: 'process' as const,
    processId: waitingProcessSummary.processId,
    processDisplayLabel: waitingProcessSummary.displayLabel,
    updatedAt:
      readyProcessMaterialsFixture.currentSources[0]?.updatedAt ?? waitingProcessSummary.updatedAt,
  };

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
      [projectSummary.projectId]: [waitingProcessSummary],
    },
    artifactsByProjectId: {
      [projectSummary.projectId]: [processArtifact],
    },
    sourceAttachmentsByProjectId: {
      [projectSummary.projectId]: [processSource],
    },
    processHistoryItemsByProcessId: {
      [waitingProcessSummary.processId]: readyProcessHistoryFixture.items,
    },
    currentRequestsByProcessId: {
      [waitingProcessSummary.processId]: currentProcessRequestFixture,
    },
    currentMaterialRefsByProcessId: {
      [waitingProcessSummary.processId]: {
        artifactIds: [
          readyProcessMaterialsFixture.currentArtifacts[0]?.artifactId ?? 'artifact-process-001',
        ],
        sourceAttachmentIds: [
          readyProcessMaterialsFixture.currentSources[0]?.sourceAttachmentId ??
            'source-process-001',
        ],
      },
    },
    processOutputsByProcessId: {
      [waitingProcessSummary.processId]: readyProcessMaterialsFixture.currentOutputs.map(
        (output) => ({
          ...output,
          linkedArtifactId: null,
        }),
      ),
    },
    processSideWorkItemsByProcessId: {
      [waitingProcessSummary.processId]: readySideWorkFixture.items,
    },
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out while waiting for websocket condition.');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(() => {});

describe('process live updates websocket', () => {
  it('sends an immediate snapshot after subscribe and publishes later updates', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildPopulatedStore();
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
      processLiveHub,
    });
    await app.listen({
      port: 0,
      host: '127.0.0.1',
    });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages = [] as Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>>;
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() => messages.length >= 11);

    expect(messages[0]).toMatchObject({
      messageType: 'snapshot',
      entityType: 'process',
      processId: waitingProcessSummary.processId,
      entityId: waitingProcessSummary.processId,
    });
    expect(messages.some((message) => message.entityType === 'current_request')).toBe(true);
    expect(messages.some((message) => message.entityType === 'materials')).toBe(true);
    expect(messages.some((message) => message.entityType === 'side_work')).toBe(true);
    expect(messages.some((message) => message.entityType === 'environment')).toBe(true);

    processLiveHub.publish({
      projectId: projectSummary.projectId,
      processId: waitingProcessSummary.processId,
      publication: {
        messageType: 'upsert',
        process: buildProcessSurfaceSummary({
          ...runningProcessFixture,
          processId: waitingProcessSummary.processId,
          displayLabel: waitingProcessSummary.displayLabel,
          processType: waitingProcessSummary.processType,
          hasEnvironment: waitingProcessSummary.hasEnvironment,
        }),
        historyItems: [
          {
            ...progressUpdateHistoryFixture,
            historyItemId: 'history-progress-live-002',
            createdAt: '2026-04-13T12:12:00.000Z',
          },
        ],
        currentRequest: null,
        environment: readyEnvironmentFixture,
      },
    });

    await waitFor(() => messages.length >= 14);

    expect(messages.slice(-4)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          messageType: 'upsert',
          entityType: 'process',
        }),
        expect.objectContaining({
          messageType: 'upsert',
          entityType: 'history',
          entityId: 'history-progress-live-002',
        }),
        expect.objectContaining({
          messageType: 'upsert',
          entityType: 'current_request',
          entityId: 'current_request',
          payload: null,
        }),
        expect.objectContaining({
          messageType: 'upsert',
          entityType: 'environment',
          entityId: 'environment',
          payload: readyEnvironmentFixture,
        }),
      ]),
    );

    socket.close();
    await app.close();
  });

  it('rejects websocket subscribe without an authenticated session', async () => {
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: null,
        reason: 'missing_session',
      }),
      authUserSyncService: new AuthUserSyncService(buildPopulatedStore()),
      platformStore: buildPopulatedStore(),
      processLiveHub: new InMemoryProcessLiveHub(),
    });
    await app.listen({
      port: 0,
      host: '127.0.0.1',
    });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const opened = { value: false };
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
    );

    socket.addEventListener('open', () => {
      opened.value = true;
    });

    await waitFor(
      () => socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING,
    );

    expect(opened.value).toBe(false);

    await app.close();
  });

  it('rejects websocket subscribe for an inaccessible process', async () => {
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
      processLiveHub: new InMemoryProcessLiveHub(),
    });
    await app.listen({
      port: 0,
      host: '127.0.0.1',
    });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const opened = { value: false };
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
    );

    socket.addEventListener('open', () => {
      opened.value = true;
    });

    await waitFor(
      () => socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING,
    );

    expect(opened.value).toBe(false);

    await app.close();
  });
});

describe('server-driven environment preparation', () => {
  const envPrepProjectId = 'project-env-prep-ws-001';
  const envPrepProcessId = 'process-draft-env-prep-ws-001';

  const envPrepProject = projectSummarySchema.parse({
    projectId: envPrepProjectId,
    name: 'Env Prep Test Project',
    ownerDisplayName: 'Lee Moore',
    role: 'owner',
    processCount: 1,
    artifactCount: 0,
    sourceAttachmentCount: 0,
    lastUpdatedAt: '2026-04-15T10:00:00.000Z',
  });

  const envPrepDraftProcess = processSummarySchema.parse({
    ...draftProcessFixture,
    processId: envPrepProcessId,
    displayLabel: 'Env Prep Test Process',
    updatedAt: '2026-04-15T10:00:00.000Z',
  });

  function buildEnvPrepStore() {
    return new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [envPrepProject],
      },
      projectAccessByProjectId: {
        [envPrepProjectId]: { kind: 'accessible', project: envPrepProject },
      },
      processesByProjectId: {
        [envPrepProjectId]: [envPrepDraftProcess],
      },
    });
  }

  it('start a draft process drives preparing then ready environment state', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildEnvPrepStore();
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
      processLiveHub,
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${envPrepProjectId}/processes/${envPrepProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${envPrepProjectId}/processes/${envPrepProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );

    const readyMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'ready',
    );

    expect(readyMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      entityId: 'environment',
      payload: {
        state: 'ready',
        environmentId: `env-mem-${envPrepProcessId}`,
      },
    });

    socket.close();
    await app.close();
  });

  it('start with a failing provider drives preparing then failed environment state', async () => {
    const failReason = 'Hydration test failure: provider unavailable';
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildEnvPrepStore();
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
      processLiveHub,
      providerAdapter: new FailingProviderAdapter(failReason),
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${envPrepProjectId}/processes/${envPrepProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${envPrepProjectId}/processes/${envPrepProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'failed',
      ),
    );

    const failedMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'failed',
    );

    expect(failedMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      entityId: 'environment',
      payload: {
        state: 'failed',
        blockedReason: failReason,
      },
    });

    socket.close();
    await app.close();
  });
});

describe('server-driven environment execution', () => {
  const executionProjectId = 'project-env-execution-ws-001';
  const executionProcessId = 'process-draft-env-execution-ws-001';

  const executionProject = projectSummarySchema.parse({
    projectId: executionProjectId,
    name: 'Env Execution Test Project',
    ownerDisplayName: 'Lee Moore',
    role: 'owner',
    processCount: 1,
    artifactCount: 0,
    sourceAttachmentCount: 0,
    lastUpdatedAt: '2026-04-15T10:30:00.000Z',
  });

  const executionDraftProcess = processSummarySchema.parse({
    ...draftProcessFixture,
    processId: executionProcessId,
    displayLabel: 'Env Execution Test Process',
    updatedAt: '2026-04-15T10:30:00.000Z',
  });

  const executionWritableSource = {
    sourceAttachmentId: `${executionProcessId}:source-checkpoint-1`,
    displayName: 'execution-source',
    purpose: 'implementation' as const,
    accessMode: 'read_write' as const,
    targetRef: 'main',
    hydrationState: 'hydrated' as const,
    attachmentScope: 'project' as const,
    processId: null,
    processDisplayLabel: null,
    updatedAt: '2026-04-15T10:30:00.000Z',
  };

  function buildExecutionStore() {
    return new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [executionProject],
      },
      projectAccessByProjectId: {
        [executionProjectId]: { kind: 'accessible', project: executionProject },
      },
      processesByProjectId: {
        [executionProjectId]: [executionDraftProcess],
      },
      sourceAttachmentsByProjectId: {
        [executionProjectId]: [executionWritableSource],
      },
    });
  }

  function buildExecutionFailureProvider(reason: string): ProviderAdapter {
    return {
      hydrateEnvironment: async ({ processId }) => ({
        environmentId: `env-execution-${processId}`,
        lastHydratedAt: '2026-04-15T10:31:00.000Z',
      }),
      executeScript: async () => ({
        outcome: 'failed',
        completedAt: '2026-04-15T10:32:00.000Z',
        failureReason: reason,
      }),
      collectCheckpointCandidate: async () => ({
        artifacts: [],
        codeDiffs: [],
      }),
      rehydrateEnvironment: async ({ environmentId }) => ({
        environmentId,
        lastHydratedAt: '2026-04-15T10:33:00.000Z',
      }),
      rebuildEnvironment: async ({ processId }) => ({
        environmentId: `env-rebuild-${processId}`,
        workspaceHandle: `workspace-rebuild-${processId}`,
      }),
    };
  }

  it('TC-3.1a after hydration completes the environment publishes running state', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
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
      processLiveHub,
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );

    const runningMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'running',
    );

    socket.close();
    await app.close();

    expect(runningMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      entityId: 'environment',
      payload: {
        state: 'running',
        environmentId: `env-mem-${executionProcessId}`,
      },
    });
  });

  it('TC-3.3b execution success publishes checkpointing state', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
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
      processLiveHub,
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));

    const checkpointingMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'checkpointing',
    );

    socket.close();
    await app.close();

    expect(checkpointingMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      entityId: 'environment',
      payload: {
        state: 'checkpointing',
      },
    });
  });

  it('TC-3.4a execution failure publishes failed environment state with blockedReason while keeping the process surface legible', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
    const executionFailureReason = 'Execution failed after hydration completed.';
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
      processLiveHub,
      providerAdapter: buildExecutionFailureProvider(executionFailureReason),
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(messages.some((message) => message.entityType === 'process')).toBe(true);

    const failedMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'failed',
    );

    socket.close();
    await app.close();

    expect(failedMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      entityId: 'environment',
      payload: {
        state: 'failed',
        blockedReason: executionFailureReason,
      },
    });
  });

  it('TC-3.4b execution failure with no failureReason falls back to "Execution failed."', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
    const noReasonProvider: ProviderAdapter = {
      hydrateEnvironment: async ({ processId }) => ({
        environmentId: `env-execution-${processId}`,
        lastHydratedAt: '2026-04-15T10:31:00.000Z',
      }),
      executeScript: async () => ({
        outcome: 'failed',
        completedAt: '2026-04-15T10:32:00.000Z',
        // no failureReason — exercises the ?? 'Execution failed.' fallback
      }),
      collectCheckpointCandidate: async () => ({ artifacts: [], codeDiffs: [] }),
      rehydrateEnvironment: async ({ environmentId }) => ({
        environmentId,
        lastHydratedAt: '2026-04-15T10:33:00.000Z',
      }),
      rebuildEnvironment: async ({ processId }) => ({
        environmentId: `env-rebuild-${processId}`,
      }),
    };
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
      processLiveHub,
      providerAdapter: noReasonProvider,
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.json().environment.state).toBe('preparing');

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));

    const failedMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { state: string }).state === 'failed',
    );

    socket.close();
    await app.close();

    expect(failedMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      payload: {
        state: 'failed',
        blockedReason: 'Execution failed.',
      },
    });
  });

  it('TC-4.1a publishes a successful checkpoint result through the environment upsert', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
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
      processLiveHub,
      checkpointPlanner: new CheckpointPlanner(),
      codeCheckpointWriter: new StubCodeCheckpointWriter(),
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'ready',
      ),
    );

    const successfulCheckpointMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { lastCheckpointResult?: { outcome?: string } | null }).lastCheckpointResult
          ?.outcome === 'succeeded',
    );

    socket.close();
    await app.close();

    expect(successfulCheckpointMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      payload: {
        lastCheckpointResult: {
          checkpointKind: 'artifact',
          outcome: 'succeeded',
        },
      },
    });
  });

  it('TC-4.5b publishes a failed checkpoint result with failureReason through the environment upsert', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildExecutionStore();
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
      processLiveHub,
      checkpointPlanner: new CheckpointPlanner(),
      codeCheckpointWriter: new FailingCodeCheckpointWriter('test code checkpoint failure'),
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected an ephemeral address for websocket tests.');
    }

    const messages: Array<ReturnType<typeof liveProcessUpdateMessageSchema.parse>> = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws/projects/${executionProjectId}/processes/${executionProcessId}`,
    );

    socket.addEventListener('message', (event) => {
      messages.push(liveProcessUpdateMessageSchema.parse(JSON.parse(String(event.data))));
    });

    await waitFor(() =>
      messages.some((m) => m.messageType === 'snapshot' && m.entityType === 'process'),
    );

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${executionProjectId}/processes/${executionProcessId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(startResponse.statusCode).toBe(200);

    await waitFor(() =>
      messages.some(
        (m) =>
          m.entityType === 'environment' &&
          m.payload !== null &&
          (m.payload as { state: string }).state === 'failed',
      ),
    );

    const failedCheckpointMessage = messages.find(
      (m) =>
        m.entityType === 'environment' &&
        m.payload !== null &&
        (m.payload as { lastCheckpointResult?: { outcome?: string } | null }).lastCheckpointResult
          ?.outcome === 'failed',
    );

    socket.close();
    await app.close();

    expect(failedCheckpointMessage).toMatchObject({
      messageType: 'upsert',
      entityType: 'environment',
      payload: {
        lastCheckpointResult: {
          checkpointKind: 'code',
          outcome: 'failed',
          failureReason: expect.any(String),
        },
      },
    });
  });

  it('publishes a rehydrating environment transition with a recomputed process summary when rehydrate is accepted', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const publishSpy = vi.spyOn(processLiveHub, 'publish');
    const pausedRecoveryProcess = processSummarySchema.parse({
      ...pausedProcessFixture,
      updatedAt: '2026-04-15T11:00:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
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
        [projectSummary.projectId]: [pausedRecoveryProcess],
      },
      processEnvironmentSummariesByProcessId: {
        [pausedRecoveryProcess.processId]: staleEnvironmentFixture,
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
      processLiveHub,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${pausedRecoveryProcess.processId}/rehydrate`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: projectSummary.projectId,
        processId: pausedRecoveryProcess.processId,
        publication: expect.objectContaining({
          process: expect.objectContaining({
            processId: pausedRecoveryProcess.processId,
          }),
          environment: expect.objectContaining({
            state: 'rehydrating',
          }),
        }),
      }),
    );

    await app.close();
  });

  it('publishes a rebuilding environment transition with a recomputed process summary when rebuild is accepted', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const publishSpy = vi.spyOn(processLiveHub, 'publish');
    const interruptedRecoveryProcess = processSummarySchema.parse({
      ...interruptedProcessFixture,
      updatedAt: '2026-04-15T11:05:00.000Z',
    });
    const platformStore = new InMemoryPlatformStore({
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
        [projectSummary.projectId]: [interruptedRecoveryProcess],
      },
      processEnvironmentSummariesByProcessId: {
        [interruptedRecoveryProcess.processId]: lostEnvironmentFixture,
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
      processLiveHub,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${interruptedRecoveryProcess.processId}/rebuild`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: projectSummary.projectId,
        processId: interruptedRecoveryProcess.processId,
        publication: expect.objectContaining({
          process: expect.objectContaining({
            processId: interruptedRecoveryProcess.processId,
          }),
          environment: expect.objectContaining({
            state: 'rebuilding',
          }),
        }),
      }),
    );

    await app.close();
  });
});
