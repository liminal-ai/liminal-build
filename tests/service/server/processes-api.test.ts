import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import type {
  CurrentProcessMaterialRefs,
  PlatformProcessOutputSummary,
  PlatformStore,
  ProcessActionStoreResult,
  ProcessCreateResult,
  ProcessResponseStoreResult,
  ProjectAccessResult,
  ProjectCreateResult,
  StoredPlatformUser,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  defaultEnvironmentSummary,
  type ArtifactSummary,
  type CurrentProcessRequest,
  type EnvironmentSummary,
  type ProcessHistoryItem,
  type ProcessSummary,
  type ProjectSummary,
  processSummarySchema,
  type SideWorkItem,
  type SourceAttachmentSummary,
} from '../../../apps/platform/shared/contracts/index.js';
import { memberProjectSummary, ownerProjectSummary } from '../../fixtures/projects.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story4',
        cookiePassword: 'story4-cookie-password-story4-cookie-password',
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

class RecordingPlatformStore implements PlatformStore {
  readonly productDefinitionStateProcessIds: string[] = [];
  readonly featureSpecificationStateProcessIds: string[] = [];
  readonly featureImplementationStateProcessIds: string[] = [];
  readonly artifactsByProjectId = new Map<string, ArtifactSummary[]>();
  readonly sourcesByProjectId = new Map<string, SourceAttachmentSummary[]>();

  constructor(
    private readonly projectsByUserId: Map<string, ProjectSummary[]>,
    private readonly accessByProjectId: Map<string, ProjectAccessResult>,
    private readonly processesByProjectId = new Map<string, ProcessSummary[]>(),
  ) {}

  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    return {
      userId: `user:${args.workosUserId}`,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
  }

  async listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]> {
    return this.projectsByUserId.get(args.userId) ?? [];
  }

  async getProjectAccess(args: {
    userId: string;
    projectId: string;
  }): Promise<ProjectAccessResult> {
    const direct = this.accessByProjectId.get(args.projectId);
    if (direct !== undefined) {
      return direct;
    }

    const projects = this.projectsByUserId.get(args.userId) ?? [];
    const project = projects.find((candidate) => candidate.projectId === args.projectId);

    return project === undefined ? { kind: 'not_found' } : { kind: 'accessible', project };
  }

  async createProject(_args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult> {
    return {
      kind: 'name_conflict',
    };
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    const existing = this.processesByProjectId.get(args.projectId) ?? [];
    const now = `2026-04-13T12:00:0${existing.length}.000Z`;
    const availableActions: ProcessSummary['availableActions'] = ['open'];
    const process = {
      processId: `process-${args.projectId}-${existing.length + 1}`,
      displayLabel: args.displayLabel,
      processType: args.processType,
      status: 'draft' as const,
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      availableActions,
      hasEnvironment: false,
      updatedAt: now,
    };

    this.processesByProjectId.set(args.projectId, [process, ...existing]);
    this.updateProjectSummary(args.projectId, (project) => ({
      ...project,
      processCount: project.processCount + 1,
      lastUpdatedAt: now,
    }));

    if (args.processType === 'ProductDefinition') {
      this.productDefinitionStateProcessIds.push(process.processId);
    }

    if (args.processType === 'FeatureSpecification') {
      this.featureSpecificationStateProcessIds.push(process.processId);
    }

    if (args.processType === 'FeatureImplementation') {
      this.featureImplementationStateProcessIds.push(process.processId);
    }

    return {
      kind: 'created',
      process,
    };
  }

  async startProcess(args: { processId: string }) {
    return this._applyRunningTransition(args.processId);
  }

  async resumeProcess(args: { processId: string }) {
    return this._applyRunningTransition(args.processId);
  }

  async transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this._applyRunningTransition(args.processId);
  }

  async getSubmittedProcessResponse() {
    return null;
  }

  async submitProcessResponse(args: {
    processId: string;
    clientRequestId: string;
    message: string;
  }): Promise<ProcessResponseStoreResult> {
    const now = new Date().toISOString();

    return {
      accepted: true,
      historyItem: {
        historyItemId: `history:${args.processId}:${args.clientRequestId}`,
        kind: 'user_message',
        lifecycleState: 'finalized',
        text: args.message,
        createdAt: now,
        relatedSideWorkId: null,
        relatedArtifactId: null,
      },
      process: this._applyRunningTransition(args.processId).process,
      currentRequest: null,
    };
  }

  async listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]> {
    return this.processesByProjectId.get(args.projectId) ?? [];
  }

  async getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null> {
    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      const match = processes.find((process) => process.processId === args.processId);

      if (match !== undefined) {
        return {
          ...match,
          projectId,
        };
      }
    }

    return null;
  }

  async listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]> {
    return this.artifactsByProjectId.get(args.projectId) ?? [];
  }

  async listProjectSourceAttachments(args: {
    projectId: string;
  }): Promise<SourceAttachmentSummary[]> {
    return this.sourcesByProjectId.get(args.projectId) ?? [];
  }

  async listProcessHistoryItems(): Promise<ProcessHistoryItem[]> {
    return [];
  }

  async appendProcessHistoryItem(args: {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  }): Promise<ProcessHistoryItem> {
    return {
      historyItemId: `history:${args.processId}:${args.kind}`,
      kind: args.kind,
      lifecycleState: args.lifecycleState ?? 'finalized',
      text: args.text,
      createdAt: new Date().toISOString(),
      relatedSideWorkId: args.relatedSideWorkId ?? null,
      relatedArtifactId: args.relatedArtifactId ?? null,
    };
  }

  async getCurrentProcessRequest(): Promise<CurrentProcessRequest | null> {
    return null;
  }

  async getProcessEnvironmentSummary() {
    return {
      ...defaultEnvironmentSummary,
    };
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
  }): Promise<EnvironmentSummary> {
    return {
      ...defaultEnvironmentSummary,
      state: args.state,
      environmentId: args.environmentId,
      blockedReason: args.blockedReason,
      lastHydratedAt: args.lastHydratedAt,
    };
  }

  async getProcessHydrationPlan(): Promise<{
    artifactIds: string[];
    sourceAttachmentIds: string[];
    outputIds: string[];
  } | null> {
    return null;
  }

  async setProcessHydrationPlan(args: {
    processId: string;
    plan: { artifactIds: string[]; sourceAttachmentIds: string[]; outputIds: string[] };
  }): Promise<{ artifactIds: string[]; sourceAttachmentIds: string[]; outputIds: string[] }> {
    return {
      artifactIds: args.plan.artifactIds,
      sourceAttachmentIds: args.plan.sourceAttachmentIds,
      outputIds: args.plan.outputIds,
    };
  }

  async getCurrentProcessMaterialRefs(): Promise<CurrentProcessMaterialRefs> {
    return {
      artifactIds: [],
      sourceAttachmentIds: [],
    };
  }

  async setCurrentProcessMaterialRefs(args: {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  }): Promise<CurrentProcessMaterialRefs> {
    return {
      artifactIds: args.artifactIds,
      sourceAttachmentIds: args.sourceAttachmentIds,
    };
  }

  async listProcessOutputs(): Promise<PlatformProcessOutputSummary[]> {
    return [];
  }

  async replaceCurrentProcessOutputs(args: {
    outputs: Array<{
      outputId?: string;
      linkedArtifactId: string | null;
      displayName: string;
      revisionLabel: string | null;
      state: string;
      updatedAt?: string;
    }>;
  }): Promise<PlatformProcessOutputSummary[]> {
    return args.outputs.map((output, index) => ({
      outputId: output.outputId ?? `output-${index + 1}`,
      linkedArtifactId: output.linkedArtifactId,
      displayName: output.displayName,
      revisionLabel: output.revisionLabel,
      state: output.state,
      updatedAt: output.updatedAt ?? new Date().toISOString(),
    }));
  }

  async persistCheckpointArtifacts(): Promise<PlatformProcessOutputSummary[]> {
    throw new Error('NOT_IMPLEMENTED: RecordingPlatformStore.persistCheckpointArtifacts');
  }

  async listProcessSideWorkItems(): Promise<SideWorkItem[]> {
    return [];
  }

  async replaceCurrentProcessSideWorkItems(args: {
    items: Array<{
      sideWorkId?: string;
      displayLabel: string;
      purposeSummary: string;
      status: SideWorkItem['status'];
      resultSummary: string | null;
      updatedAt?: string;
    }>;
  }): Promise<SideWorkItem[]> {
    return args.items.map((item, index) => ({
      sideWorkId: item.sideWorkId ?? `side-work-${index + 1}`,
      displayLabel: item.displayLabel,
      purposeSummary: item.purposeSummary,
      status: item.status,
      resultSummary: item.resultSummary,
      updatedAt: item.updatedAt ?? new Date().toISOString(),
    }));
  }

  async hasCanonicalRecoveryMaterials(): Promise<boolean> {
    return true;
  }

  private updateProjectSummary(
    projectId: string,
    update: (project: ProjectSummary) => ProjectSummary,
  ): void {
    for (const [userId, projects] of this.projectsByUserId.entries()) {
      this.projectsByUserId.set(
        userId,
        projects.map((project) => (project.projectId === projectId ? update(project) : project)),
      );
    }

    const direct = this.accessByProjectId.get(projectId);
    if (direct?.kind === 'accessible') {
      this.accessByProjectId.set(projectId, {
        kind: 'accessible',
        project: update(direct.project),
      });
    }
  }

  private _applyRunningTransition(processId: string): ProcessActionStoreResult {
    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      const index = processes.findIndex((process) => process.processId === processId);

      if (index === -1) {
        continue;
      }

      const existing = processes[index];

      if (existing === undefined) {
        continue;
      }

      const now = new Date().toISOString();
      const nextProcess = processSummarySchema.parse({
        ...existing,
        status: 'running',
        phaseLabel: existing.phaseLabel === 'Draft' ? 'Working' : existing.phaseLabel,
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        updatedAt: now,
      });
      const nextProcesses = [...processes];
      nextProcesses[index] = nextProcess;
      this.processesByProjectId.set(projectId, nextProcesses);

      return {
        process: nextProcess,
        currentRequest: null,
      };
    }

    throw new Error(`Unknown process ${processId}`);
  }
}

function buildRecordingStore() {
  const projectA = {
    ...ownerProjectSummary,
    projectId: 'project-a',
    processCount: 0,
  };
  const projectB = {
    ...memberProjectSummary,
    projectId: 'project-b',
    processCount: 0,
    role: 'owner' as const,
  };
  const projectsByUserId = new Map<string, ProjectSummary[]>([
    ['user:workos-user-1', [projectA, projectB]],
  ]);
  const accessByProjectId = new Map<string, ProjectAccessResult>([
    [projectA.projectId, { kind: 'accessible', project: projectA }],
    [projectB.projectId, { kind: 'accessible', project: projectB }],
  ]);

  return {
    projectA,
    projectB,
    store: new RecordingPlatformStore(projectsByUserId, accessByProjectId),
  };
}

describe('processes api', () => {
  it('TC-4.1b, TC-4.2a, and TC-4.2b create a ProductDefinition process with initial state and no environment', async () => {
    const { projectA, store } = buildRecordingStore();
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
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectA.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'ProductDefinition',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().process.processType).toBe('ProductDefinition');
    expect(response.json().process.status).toBe('draft');
    expect(response.json().process.phaseLabel).toBe('Draft');
    expect(response.json().process.hasEnvironment).toBe(false);
    expect(store.productDefinitionStateProcessIds).toHaveLength(1);
    expect(store.featureSpecificationStateProcessIds).toHaveLength(0);
    expect(store.featureImplementationStateProcessIds).toHaveLength(0);

    await app.close();
  });

  it('TC-4.1c rejects an unsupported process type', async () => {
    const { projectA, store } = buildRecordingStore();
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
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectA.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'UnsupportedProcess',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: 'INVALID_PROCESS_TYPE',
      message: 'The requested process type is not supported.',
      status: 422,
    });

    await app.close();
  });

  it('TC-4.2c creates the process in the requested project only', async () => {
    const { projectA, projectB, store } = buildRecordingStore();
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

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectB.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'FeatureImplementation',
      },
    });

    expect(await store.listProjectProcesses({ projectId: projectA.projectId })).toHaveLength(0);
    expect(await store.listProjectProcesses({ projectId: projectB.projectId })).toHaveLength(1);

    await app.close();
  });

  it('TC-4.3a and TC-4.3b keep different-type and same-type processes distinct with deterministic labels', async () => {
    const { projectA, store } = buildRecordingStore();
    await store.createProcess({
      projectId: projectA.projectId,
      processType: 'FeatureSpecification',
      displayLabel: 'Feature Specification #1',
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
      authUserSyncService: new AuthUserSyncService(store),
      platformStore: store,
    });

    const sameTypeResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectA.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'FeatureSpecification',
      },
    });
    const otherTypeResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectA.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'FeatureImplementation',
      },
    });

    expect(sameTypeResponse.statusCode).toBe(201);
    expect(sameTypeResponse.json().process.displayLabel).toBe('Feature Specification #2');
    expect(otherTypeResponse.statusCode).toBe(201);
    expect(otherTypeResponse.json().process.displayLabel).toBe('Feature Implementation #1');
    expect(await store.listProjectProcesses({ projectId: projectA.projectId })).toHaveLength(3);

    await app.close();
  });

  it('TC-4.3c leaves existing artifact and source associations unchanged after process creation', async () => {
    const { projectA, store } = buildRecordingStore();
    store.artifactsByProjectId.set(projectA.projectId, [
      {
        artifactId: 'artifact-1',
        displayName: 'Artifact',
        currentVersionLabel: 'v1',
        attachmentScope: 'project',
        processId: null,
        processDisplayLabel: null,
        updatedAt: '2026-04-13T12:00:00.000Z',
      },
    ]);
    store.sourcesByProjectId.set(projectA.projectId, [
      {
        sourceAttachmentId: 'source-1',
        displayName: 'repo',
        purpose: 'research',
        accessMode: 'read_only',
        targetRef: 'main',
        hydrationState: 'hydrated',
        attachmentScope: 'project',
        processId: null,
        processDisplayLabel: null,
        updatedAt: '2026-04-13T12:00:00.000Z',
      },
    ]);
    const originalArtifacts = await store.listProjectArtifacts({ projectId: projectA.projectId });
    const originalSources = await store.listProjectSourceAttachments({
      projectId: projectA.projectId,
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
      authUserSyncService: new AuthUserSyncService(store),
      platformStore: store,
    });

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectA.projectId}/processes`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
      payload: {
        processType: 'ProductDefinition',
      },
    });

    expect(await store.listProjectArtifacts({ projectId: projectA.projectId })).toEqual(
      originalArtifacts,
    );
    expect(await store.listProjectSourceAttachments({ projectId: projectA.projectId })).toEqual(
      originalSources,
    );

    await app.close();
  });
});
