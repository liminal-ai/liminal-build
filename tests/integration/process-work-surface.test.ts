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
import {
  buildEnvironmentSummaryFixture,
  codeCheckpointSucceededEnvironmentFixture,
  readyEnvironmentFixture,
  staleEnvironmentFixture,
} from '../fixtures/process-environment.js';
import { readyProcessHistoryFixture } from '../fixtures/process-history.js';
import { writableProcessMaterialsFixture } from '../fixtures/materials.js';
import { pausedProcessFixture, waitingProcessFixture } from '../fixtures/processes.js';
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

async function fetchProcessBootstrap(args: {
  baseUrl: string;
  projectId: string;
  processId: string;
  cookie: string;
}) {
  const response = await fetch(
    `${args.baseUrl}/api/projects/${args.projectId}/processes/${args.processId}`,
    {
      headers: {
        cookie: args.cookie,
      },
    },
  );

  return {
    response,
    body: await response.json(),
  };
}

function buildDurableCheckpointStore(args: {
  projectSummary: ReturnType<typeof projectSummarySchema.parse>;
  processSummary: ReturnType<typeof processSummarySchema.parse>;
  environment: typeof codeCheckpointSucceededEnvironmentFixture;
}) {
  const materialArtifact = writableProcessMaterialsFixture.currentArtifacts[0];
  const materialSource = writableProcessMaterialsFixture.currentSources[0];

  if (materialArtifact === undefined || materialSource === undefined) {
    throw new Error(
      'Expected writable process materials fixtures to include current artifact and source.',
    );
  }

  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [args.projectSummary],
    },
    projectAccessByProjectId: {
      [args.projectSummary.projectId]: {
        kind: 'accessible',
        project: args.projectSummary,
      },
    },
    processesByProjectId: {
      [args.projectSummary.projectId]: [args.processSummary],
    },
    artifactsByProjectId: {
      [args.projectSummary.projectId]: [
        {
          artifactId: materialArtifact.artifactId,
          displayName: materialArtifact.displayName,
          currentVersionLabel: materialArtifact.currentVersionLabel,
          attachmentScope: 'process',
          processId: args.processSummary.processId,
          processDisplayLabel: args.processSummary.displayLabel,
          updatedAt: materialArtifact.updatedAt,
        },
      ],
    },
    sourceAttachmentsByProjectId: {
      [args.projectSummary.projectId]: [
        {
          sourceAttachmentId: materialSource.sourceAttachmentId,
          displayName: materialSource.displayName,
          purpose: materialSource.purpose,
          accessMode: materialSource.accessMode,
          targetRef: materialSource.targetRef,
          hydrationState: materialSource.hydrationState,
          attachmentScope: 'process',
          processId: args.processSummary.processId,
          processDisplayLabel: args.processSummary.displayLabel,
          updatedAt: materialSource.updatedAt,
        },
      ],
    },
    processHistoryItemsByProcessId: {
      [args.processSummary.processId]: readyProcessHistoryFixture.items,
    },
    currentRequestsByProcessId: {
      [args.processSummary.processId]: null,
    },
    processEnvironmentSummariesByProcessId: {
      [args.processSummary.processId]: args.environment,
    },
    currentMaterialRefsByProcessId: {
      [args.processSummary.processId]: {
        artifactIds: writableProcessMaterialsFixture.currentArtifacts.map(
          (artifact) => artifact.artifactId,
        ),
        sourceAttachmentIds: writableProcessMaterialsFixture.currentSources.map(
          (sourceAttachment) => sourceAttachment.sourceAttachmentId,
        ),
      },
    },
    processOutputsByProcessId: {
      [args.processSummary.processId]: writableProcessMaterialsFixture.currentOutputs.map(
        (output) => ({
          ...output,
          linkedArtifactId: null,
        }),
      ),
    },
    processSideWorkItemsByProcessId: {
      [args.processSummary.processId]: [],
    },
  });
}

afterEach(() => {
  delete process.env.LIMINAL_VITE_RUNTIME_MODE;
});

describe('process work surface integration', () => {
  it('TC-1.4a reload preserves environment truth from durable state', async () => {
    const projectSummary = projectSummarySchema.parse({
      projectId: 'project-story1-integration-001',
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
      processId: 'process-story1-integration-001',
      displayLabel: 'Feature Specification #1',
      updatedAt: '2026-04-13T12:02:00.000Z',
    });
    const firstStore = new InMemoryPlatformStore({
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
      processEnvironmentSummariesByProcessId: {
        [waitingProcessSummary.processId]: readyEnvironmentFixture,
      },
    });
    const firstServer = await startApp(firstStore);
    const firstBootstrapResponse = await fetch(
      `${firstServer.baseUrl}/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-story1-a',
        },
      },
    );
    const firstBootstrap = await firstBootstrapResponse.json();

    expect(firstBootstrapResponse.status).toBe(200);
    expect(firstBootstrap.environment).toMatchObject({
      state: 'ready',
      statusLabel: 'Ready for work',
    });

    await firstServer.app.close();

    const secondStore = new InMemoryPlatformStore({
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
      processEnvironmentSummariesByProcessId: {
        [waitingProcessSummary.processId]: staleEnvironmentFixture,
      },
    });
    const secondServer = await startApp(secondStore);
    const secondBootstrapResponse = await fetch(
      `${secondServer.baseUrl}/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      {
        headers: {
          cookie: 'lb_session=integration-story1-b',
        },
      },
    );
    const secondBootstrap = await secondBootstrapResponse.json();

    expect(secondBootstrapResponse.status).toBe(200);
    expect(secondBootstrap.environment).toMatchObject({
      state: 'stale',
      statusLabel: 'Environment is stale',
      blockedReason: staleEnvironmentFixture.blockedReason,
    });

    await secondServer.app.close();
  });

  it('TC-6.1a and TC-6.2a reopen keeps the Story 4 code checkpoint visible after the active environment is gone', async () => {
    const projectSummary = projectSummarySchema.parse({
      projectId: 'project-story6-integration-001',
      name: 'Liminal Build Platform',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 1,
      sourceAttachmentCount: 1,
      lastUpdatedAt: '2026-04-13T12:40:00.000Z',
    });
    const pausedProcessSummary = processSummarySchema.parse({
      ...pausedProcessFixture,
      processId: 'process-story6-integration-001',
      displayLabel: 'Feature Specification #6',
      updatedAt: '2026-04-13T12:41:00.000Z',
    });
    const firstStore = buildDurableCheckpointStore({
      projectSummary,
      processSummary: pausedProcessSummary,
      environment: codeCheckpointSucceededEnvironmentFixture,
    });
    const firstServer = await startApp(firstStore);
    const firstBootstrap = await fetchProcessBootstrap({
      baseUrl: firstServer.baseUrl,
      projectId: projectSummary.projectId,
      processId: pausedProcessSummary.processId,
      cookie: 'lb_session=integration-story6-a',
    });

    expect(firstBootstrap.response.status).toBe(200);
    expect(firstBootstrap.body.environment).toMatchObject({
      state: 'ready',
      lastCheckpointResult: codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult,
    });

    await firstServer.app.close();

    const reopenedStore = buildDurableCheckpointStore({
      projectSummary,
      processSummary: pausedProcessSummary,
      environment: buildEnvironmentSummaryFixture({
        ...codeCheckpointSucceededEnvironmentFixture,
        environmentId: null,
        state: 'absent',
        statusLabel: 'Not prepared',
        blockedReason: null,
      }),
    });
    const reopenedServer = await startApp(reopenedStore);
    const reopenedBootstrap = await fetchProcessBootstrap({
      baseUrl: reopenedServer.baseUrl,
      projectId: projectSummary.projectId,
      processId: pausedProcessSummary.processId,
      cookie: 'lb_session=integration-story6-b',
    });

    expect(reopenedBootstrap.response.status).toBe(200);
    expect(reopenedBootstrap.body.process).toMatchObject({
      processId: pausedProcessSummary.processId,
      status: 'paused',
      availableActions: ['resume'],
    });
    expect(reopenedBootstrap.body.materials).toMatchObject({
      status: 'ready',
      currentArtifacts: writableProcessMaterialsFixture.currentArtifacts,
      currentOutputs: writableProcessMaterialsFixture.currentOutputs,
      currentSources: writableProcessMaterialsFixture.currentSources,
    });
    expect(reopenedBootstrap.body.environment).toMatchObject({
      state: 'absent',
      lastCheckpointAt: codeCheckpointSucceededEnvironmentFixture.lastCheckpointAt,
      lastCheckpointResult: codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult,
    });
    expect(reopenedBootstrap.body.currentRequest).toBeNull();

    await reopenedServer.app.close();
  });

  it('TC-6.4a finalized history is not duplicated on reopen', async () => {
    const projectSummary = projectSummarySchema.parse({
      projectId: 'project-story6-integration-002',
      name: 'Liminal Build Platform',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 1,
      sourceAttachmentCount: 1,
      lastUpdatedAt: '2026-04-13T12:40:00.000Z',
    });
    const pausedProcessSummary = processSummarySchema.parse({
      ...pausedProcessFixture,
      processId: 'process-story6-integration-002',
      displayLabel: 'Feature Specification #6',
      updatedAt: '2026-04-13T12:41:00.000Z',
    });
    const store = buildDurableCheckpointStore({
      projectSummary,
      processSummary: pausedProcessSummary,
      environment: buildEnvironmentSummaryFixture({
        ...codeCheckpointSucceededEnvironmentFixture,
        environmentId: null,
        state: 'absent',
        statusLabel: 'Not prepared',
        blockedReason: null,
      }),
    });
    const firstServer = await startApp(store);
    const firstBootstrap = await fetchProcessBootstrap({
      baseUrl: firstServer.baseUrl,
      projectId: projectSummary.projectId,
      processId: pausedProcessSummary.processId,
      cookie: 'lb_session=integration-story6-c',
    });

    await firstServer.app.close();

    const secondServer = await startApp(store);
    const secondBootstrap = await fetchProcessBootstrap({
      baseUrl: secondServer.baseUrl,
      projectId: projectSummary.projectId,
      processId: pausedProcessSummary.processId,
      cookie: 'lb_session=integration-story6-d',
    });
    const firstFinalizedIds = firstBootstrap.body.history.items
      .filter((item: { lifecycleState: string }) => item.lifecycleState === 'finalized')
      .map((item: { historyItemId: string }) => item.historyItemId);
    const secondFinalizedIds = secondBootstrap.body.history.items
      .filter((item: { lifecycleState: string }) => item.lifecycleState === 'finalized')
      .map((item: { historyItemId: string }) => item.historyItemId);

    expect(secondBootstrap.response.status).toBe(200);
    expect(secondFinalizedIds).toEqual(firstFinalizedIds);
    expect(new Set(secondFinalizedIds).size).toBe(secondFinalizedIds.length);

    await secondServer.app.close();
  });

  it('TC-6.4b reopen keeps prior checkpoint visibility in environment state instead of replaying it as new history', async () => {
    const projectSummary = projectSummarySchema.parse({
      projectId: 'project-story6-integration-003',
      name: 'Liminal Build Platform',
      ownerDisplayName: 'Lee Moore',
      role: 'owner',
      processCount: 1,
      artifactCount: 1,
      sourceAttachmentCount: 1,
      lastUpdatedAt: '2026-04-13T12:40:00.000Z',
    });
    const pausedProcessSummary = processSummarySchema.parse({
      ...pausedProcessFixture,
      processId: 'process-story6-integration-003',
      displayLabel: 'Feature Specification #6',
      updatedAt: '2026-04-13T12:41:00.000Z',
    });
    const store = buildDurableCheckpointStore({
      projectSummary,
      processSummary: pausedProcessSummary,
      environment: buildEnvironmentSummaryFixture({
        ...codeCheckpointSucceededEnvironmentFixture,
        environmentId: null,
        state: 'absent',
        statusLabel: 'Not prepared',
        blockedReason: null,
      }),
    });
    const server = await startApp(store);
    const bootstrap = await fetchProcessBootstrap({
      baseUrl: server.baseUrl,
      projectId: projectSummary.projectId,
      processId: pausedProcessSummary.processId,
      cookie: 'lb_session=integration-story6-e',
    });

    expect(bootstrap.response.status).toBe(200);
    expect(bootstrap.body.environment.lastCheckpointResult).toEqual(
      codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult,
    );
    expect(bootstrap.body.history.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          createdAt: codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult?.completedAt,
        }),
      ]),
    );
    expect(
      bootstrap.body.history.items.map((item: { text: string }) => item.text).join('\n'),
    ).not.toContain(
      codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult?.targetLabel ?? '',
    );

    await server.app.close();
  });

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
