import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { ProcessAccessService } from '../../../apps/platform/server/services/processes/process-access.service.js';
import { DefaultProcessWorkSurfaceService } from '../../../apps/platform/server/services/processes/process-work-surface.service.js';
import { HistorySectionReader } from '../../../apps/platform/server/services/processes/readers/history-section.reader.js';
import { MaterialsSectionReader } from '../../../apps/platform/server/services/processes/readers/materials-section.reader.js';
import { SideWorkSectionReader } from '../../../apps/platform/server/services/processes/readers/side-work-section.reader.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { ProjectAccessService } from '../../../apps/platform/server/services/projects/project-access.service.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyProcessMaterialsFixture } from '../../fixtures/materials.js';
import { readyProcessHistoryFixture } from '../../fixtures/process-history.js';
import {
  currentProcessRequestFixture,
  earlyProcessWorkSurfaceFixture,
  readyProcessWorkSurfaceFixture,
} from '../../fixtures/process-surface.js';
import { completedProcessFixture, runningProcessFixture } from '../../fixtures/processes.js';
import { readySideWorkFixture } from '../../fixtures/side-work.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_process_surface_api',
        cookiePassword: 'story1-process-api-cookie-password-12345',
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

class ThrowingHistorySectionReader extends HistorySectionReader {
  override async read(): Promise<Awaited<ReturnType<HistorySectionReader['read']>>> {
    throw new Error('Process history could not be loaded.');
  }
}

class ThrowingMaterialsSectionReader extends MaterialsSectionReader {
  override async read(): Promise<Awaited<ReturnType<MaterialsSectionReader['read']>>> {
    throw new Error('Process materials could not be loaded.');
  }
}

class ThrowingSideWorkSectionReader extends SideWorkSectionReader {
  override async read(): Promise<Awaited<ReturnType<SideWorkSectionReader['read']>>> {
    throw new Error('Side-work summaries could not be loaded.');
  }
}

const projectSummary = projectSummarySchema.parse({
  projectId: readyProcessWorkSurfaceFixture.project.projectId,
  name: readyProcessWorkSurfaceFixture.project.name,
  ownerDisplayName: 'Lee Moore',
  role: readyProcessWorkSurfaceFixture.project.role,
  processCount: 1,
  artifactCount: readyProcessWorkSurfaceFixture.materials.currentArtifacts.length,
  sourceAttachmentCount: readyProcessWorkSurfaceFixture.materials.currentSources.length,
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

const draftProcessSummary = processSummarySchema.parse({
  processId: earlyProcessWorkSurfaceFixture.process.processId,
  displayLabel: earlyProcessWorkSurfaceFixture.process.displayLabel,
  processType: earlyProcessWorkSurfaceFixture.process.processType,
  status: earlyProcessWorkSurfaceFixture.process.status,
  phaseLabel: earlyProcessWorkSurfaceFixture.process.phaseLabel,
  nextActionLabel: earlyProcessWorkSurfaceFixture.process.nextActionLabel,
  availableActions: ['open'],
  hasEnvironment: false,
  updatedAt: earlyProcessWorkSurfaceFixture.process.updatedAt,
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
      [projectSummary.projectId]: [waitingProcessSummary, draftProcessSummary],
    },
    artifactsByProjectId: {
      [projectSummary.projectId]: [processArtifact],
    },
    sourceAttachmentsByProjectId: {
      [projectSummary.projectId]: [processSource],
    },
    processHistoryItemsByProcessId: {
      [waitingProcessSummary.processId]: readyProcessHistoryFixture.items,
      [draftProcessSummary.processId]: [],
    },
    currentRequestsByProcessId: {
      [waitingProcessSummary.processId]: currentProcessRequestFixture,
      [draftProcessSummary.processId]: null,
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
      [draftProcessSummary.processId]: {
        artifactIds: [],
        sourceAttachmentIds: [],
      },
    },
    processOutputsByProcessId: {
      [waitingProcessSummary.processId]: readyProcessMaterialsFixture.currentOutputs.map(
        (output) => ({
          ...output,
          linkedArtifactId: null,
        }),
      ),
      [draftProcessSummary.processId]: [],
    },
    processSideWorkItemsByProcessId: {
      [waitingProcessSummary.processId]: readySideWorkFixture.items,
      [draftProcessSummary.processId]: [],
    },
  });
}

describe('process work surface api', () => {
  it('TC-1.2a, TC-1.3a, TC-1.3b, and TC-1.4a return the populated process bootstrap', async () => {
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
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: readyProcessWorkSurfaceFixture.project,
      process: readyProcessWorkSurfaceFixture.process,
      history: readyProcessWorkSurfaceFixture.history,
      materials: readyProcessWorkSurfaceFixture.materials,
      currentRequest: readyProcessWorkSurfaceFixture.currentRequest,
      sideWork: readyProcessWorkSurfaceFixture.sideWork,
    });

    await app.close();
  });

  it('TC-1.4b returns stable empty section envelopes for an early process', async () => {
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
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${draftProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      history: {
        status: 'empty',
        items: [],
      },
      materials: {
        status: 'empty',
        currentArtifacts: [],
        currentOutputs: [],
        currentSources: [],
      },
      sideWork: {
        status: 'empty',
        items: [],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-4.3a and TC-4.4b bootstrap reads only the current material refs, so stale prior rows do not return and shared materials can surface', async () => {
    const staleArtifact = {
      artifactId: 'artifact-stale-process-001',
      displayName: 'Old Discovery Notes',
      currentVersionLabel: 'v1',
      attachmentScope: 'process' as const,
      processId: waitingProcessSummary.processId,
      processDisplayLabel: waitingProcessSummary.displayLabel,
      updatedAt: '2026-04-13T12:09:00.000Z',
    };
    const sharedCurrentArtifact = {
      artifactId: 'artifact-shared-current-001',
      displayName: 'Shared Architecture Notes',
      currentVersionLabel: 'v3',
      attachmentScope: 'project' as const,
      processId: null,
      processDisplayLabel: null,
      updatedAt: '2026-04-13T12:30:00.000Z',
    };
    const staleSource = {
      sourceAttachmentId: 'source-stale-process-001',
      displayName: 'old-branch',
      purpose: 'implementation' as const,
      targetRef: 'old-phase',
      hydrationState: 'stale' as const,
      attachmentScope: 'process' as const,
      processId: waitingProcessSummary.processId,
      processDisplayLabel: waitingProcessSummary.displayLabel,
      updatedAt: '2026-04-13T12:08:00.000Z',
    };
    const sharedCurrentSource = {
      sourceAttachmentId: 'source-shared-current-001',
      displayName: 'shared-research-repo',
      purpose: 'research' as const,
      targetRef: 'main',
      hydrationState: 'hydrated' as const,
      attachmentScope: 'project' as const,
      processId: null,
      processDisplayLabel: null,
      updatedAt: '2026-04-13T12:31:00.000Z',
    };
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
        [projectSummary.projectId]: [waitingProcessSummary],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [staleArtifact, sharedCurrentArtifact],
      },
      sourceAttachmentsByProjectId: {
        [projectSummary.projectId]: [staleSource, sharedCurrentSource],
      },
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: currentProcessRequestFixture,
      },
      currentMaterialRefsByProcessId: {
        [waitingProcessSummary.processId]: {
          artifactIds: [sharedCurrentArtifact.artifactId],
          sourceAttachmentIds: [sharedCurrentSource.sourceAttachmentId],
        },
      },
      processOutputsByProcessId: {
        [waitingProcessSummary.processId]: [],
      },
      processSideWorkItemsByProcessId: {
        [waitingProcessSummary.processId]: readySideWorkFixture.items,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().materials).toEqual({
      status: 'ready',
      currentArtifacts: [
        {
          artifactId: sharedCurrentArtifact.artifactId,
          displayName: sharedCurrentArtifact.displayName,
          currentVersionLabel: sharedCurrentArtifact.currentVersionLabel,
          roleLabel: 'Current shared artifact',
          updatedAt: sharedCurrentArtifact.updatedAt,
        },
      ],
      currentOutputs: [],
      currentSources: [
        {
          sourceAttachmentId: sharedCurrentSource.sourceAttachmentId,
          displayName: sharedCurrentSource.displayName,
          purpose: sharedCurrentSource.purpose,
          targetRef: sharedCurrentSource.targetRef,
          hydrationState: sharedCurrentSource.hydrationState,
          updatedAt: sharedCurrentSource.updatedAt,
        },
      ],
    });

    await app.close();
  });

  it('dedupes outputs against current artifacts only when linkedArtifactId points at the current artifact', async () => {
    const currentArtifact = {
      artifactId: 'artifact-current-001',
      displayName: 'Feature Specification Draft',
      currentVersionLabel: 'draft-7',
      attachmentScope: 'process' as const,
      processId: waitingProcessSummary.processId,
      processDisplayLabel: waitingProcessSummary.displayLabel,
      updatedAt: '2026-04-13T12:20:00.000Z',
    };
    const linkedPublishedOutput = {
      outputId: 'output-linked-001',
      linkedArtifactId: currentArtifact.artifactId,
      displayName: 'Published Spec Snapshot',
      revisionLabel: 'artifact-copy-9',
      state: 'published_to_artifact',
      updatedAt: '2026-04-13T12:21:00.000Z',
    };
    const unlinkedCollisionOutput = {
      outputId: 'output-unlinked-002',
      linkedArtifactId: null,
      displayName: currentArtifact.displayName,
      revisionLabel: currentArtifact.currentVersionLabel,
      state: 'published_to_artifact',
      updatedAt: '2026-04-13T12:22:00.000Z',
    };
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
        [projectSummary.projectId]: [waitingProcessSummary],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [currentArtifact],
      },
      currentRequestsByProcessId: {
        [waitingProcessSummary.processId]: currentProcessRequestFixture,
      },
      currentMaterialRefsByProcessId: {
        [waitingProcessSummary.processId]: {
          artifactIds: [currentArtifact.artifactId],
          sourceAttachmentIds: [],
        },
      },
      processOutputsByProcessId: {
        [waitingProcessSummary.processId]: [linkedPublishedOutput, unlinkedCollisionOutput],
      },
      processSideWorkItemsByProcessId: {
        [waitingProcessSummary.processId]: readySideWorkFixture.items,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().materials.currentArtifacts).toEqual([
      {
        artifactId: currentArtifact.artifactId,
        displayName: currentArtifact.displayName,
        currentVersionLabel: currentArtifact.currentVersionLabel,
        roleLabel: 'Current working artifact',
        updatedAt: currentArtifact.updatedAt,
      },
    ]);
    expect(response.json().materials.currentOutputs).toEqual([
      {
        outputId: unlinkedCollisionOutput.outputId,
        displayName: unlinkedCollisionOutput.displayName,
        revisionLabel: unlinkedCollisionOutput.revisionLabel,
        state: unlinkedCollisionOutput.state,
        updatedAt: unlinkedCollisionOutput.updatedAt,
      },
    ]);

    await app.close();
  });

  it('TC-6.4b omits project data from a forbidden bootstrap response', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      code: 'PROJECT_FORBIDDEN',
      message: 'You do not have access to this process.',
      status: 403,
    });

    await app.close();
  });

  it('TC-3.2a, TC-5.1a, and TC-5.2a keep the outstanding attention request visible beside routine progress', async () => {
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
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      currentRequest: currentProcessRequestFixture,
    });
    expect(response.json().history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'progress_update' }),
        expect.objectContaining({ kind: 'attention_request' }),
      ]),
    );

    await app.close();
  });

  it('TC-3.4a does not invent a waiting reply state when the process is running without a current request', async () => {
    const runningProcessSummary = processSummarySchema.parse({
      ...runningProcessFixture,
      processId: 'process-running-surface-001',
      updatedAt: '2026-04-13T12:15:00.000Z',
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
        [projectSummary.projectId]: [runningProcessSummary],
      },
      processHistoryItemsByProcessId: {
        [runningProcessSummary.processId]: readyProcessHistoryFixture.items,
      },
      currentRequestsByProcessId: {
        [runningProcessSummary.processId]: null,
      },
      processOutputsByProcessId: {
        [runningProcessSummary.processId]: readyProcessMaterialsFixture.currentOutputs,
      },
      processSideWorkItemsByProcessId: {
        [runningProcessSummary.processId]: readySideWorkFixture.items,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${runningProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: runningProcessSummary.processId,
        status: 'running',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('TC-3.4b completed processes omit an active respond action from bootstrap', async () => {
    const completedProcessSummary = processSummarySchema.parse({
      ...completedProcessFixture,
      processId: 'process-completed-surface-001',
      updatedAt: '2026-04-13T12:16:00.000Z',
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
        [projectSummary.projectId]: [completedProcessSummary],
      },
      currentRequestsByProcessId: {
        [completedProcessSummary.processId]: null,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${completedProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: completedProcessSummary.processId,
        status: 'completed',
        availableActions: ['review'],
      },
      currentRequest: null,
    });

    await app.close();
  });

  it('returns stable section error envelopes without collapsing the whole surface', async () => {
    const platformStore = buildPopulatedStore();
    const processAccessService = new ProcessAccessService(
      platformStore,
      new ProjectAccessService(platformStore),
    );
    const processWorkSurfaceService = new DefaultProcessWorkSurfaceService(
      platformStore,
      processAccessService,
      {
        historySectionReader: new ThrowingHistorySectionReader(platformStore),
        materialsSectionReader: new ThrowingMaterialsSectionReader(platformStore),
        sideWorkSectionReader: new ThrowingSideWorkSectionReader(platformStore),
      },
    );
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
      processAccessService,
      processWorkSurfaceService,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${waitingProcessSummary.processId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().project.name).toBe(projectSummary.name);
    expect(response.json().process.displayLabel).toBe(waitingProcessSummary.displayLabel);
    expect(response.json().history).toEqual({
      status: 'error',
      items: [],
      error: {
        code: 'PROCESS_SURFACE_HISTORY_LOAD_FAILED',
        message: 'Process history could not be loaded.',
      },
    });
    expect(response.json().materials).toEqual({
      status: 'error',
      currentArtifacts: [],
      currentOutputs: [],
      currentSources: [],
      error: {
        code: 'PROCESS_SURFACE_MATERIALS_LOAD_FAILED',
        message: 'Process materials could not be loaded.',
      },
    });
    expect(response.json().sideWork).toEqual({
      status: 'error',
      items: [],
      error: {
        code: 'PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED',
        message: 'Side-work summaries could not be loaded.',
      },
    });

    await app.close();
  });
});
