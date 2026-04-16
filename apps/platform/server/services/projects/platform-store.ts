import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import {
  type ArtifactSummary,
  type CurrentProcessRequest,
  defaultEnvironmentSummary,
  deriveEnvironmentStatusLabel,
  type EnvironmentSummary,
  environmentSummarySchema,
  type ProcessHistoryItem,
  type ProcessOutputReference,
  type ProcessSummary,
  type ProjectShellResponse,
  type ProjectSummary,
  processSummarySchema,
  type SideWorkItem,
  type SourceAttachmentSummary,
} from '../../../shared/contracts/index.js';
import type { ArtifactCheckpointTarget } from '../processes/environment/checkpoint-types.js';

export interface StoredPlatformUser {
  userId: string;
  workosUserId: string;
  email: string | null;
  displayName: string | null;
}

export type ProjectAccessResult =
  | {
      kind: 'accessible';
      project: ProjectSummary;
    }
  | {
      kind: 'forbidden';
    }
  | {
      kind: 'not_found';
    };

export type ProjectCreateResult =
  | {
      kind: 'created';
      project: ProjectSummary;
    }
  | {
      kind: 'name_conflict';
    };

export type ProcessCreateResult = {
  kind: 'created';
  process: ProcessSummary;
};

export interface ProcessActionStoreResult {
  process: ProcessSummary;
  currentRequest: CurrentProcessRequest | null;
}

export interface ProcessResponseStoreResult extends ProcessActionStoreResult {
  accepted: true;
  historyItem: ProcessHistoryItem;
}

export interface CurrentProcessMaterialRefs {
  artifactIds: string[];
  sourceAttachmentIds: string[];
}

export interface WorkingSetPlan {
  artifactIds: string[];
  sourceAttachmentIds: string[];
  outputIds: string[];
}

export type PlatformProcessOutputSummary = ProcessOutputReference & {
  linkedArtifactId: string | null;
};

type PlatformProcessOutputSeed = ProcessOutputReference & {
  linkedArtifactId?: string | null;
};

export type PlatformProcessOutputWriteInput = {
  outputId?: string;
  linkedArtifactId: string | null;
  displayName: string;
  revisionLabel: string | null;
  state: string;
  updatedAt?: string;
};

export type PlatformSideWorkWriteInput = {
  sideWorkId?: string;
  displayLabel: string;
  purposeSummary: string;
  status: SideWorkItem['status'];
  resultSummary: string | null;
  updatedAt?: string;
};

export interface PlatformStore {
  upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser>;
  listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]>;
  getProjectAccess(args: { userId: string; projectId: string }): Promise<ProjectAccessResult>;
  createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult>;
  createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult>;
  startProcess(args: { processId: string }): Promise<ProcessActionStoreResult>;
  resumeProcess(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult>;
  getSubmittedProcessResponse(args: {
    processId: string;
    clientRequestId: string;
  }): Promise<ProcessResponseStoreResult | null>;
  submitProcessResponse(args: {
    processId: string;
    clientRequestId: string;
    message: string;
  }): Promise<ProcessResponseStoreResult>;
  getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null>;
  listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]>;
  listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]>;
  listProjectSourceAttachments(args: { projectId: string }): Promise<SourceAttachmentSummary[]>;
  listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]>;
  getCurrentProcessRequest(args: { processId: string }): Promise<CurrentProcessRequest | null>;
  getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary>;
  upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary>;
  getCurrentProcessMaterialRefs(args: { processId: string }): Promise<CurrentProcessMaterialRefs>;
  setCurrentProcessMaterialRefs(args: {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  }): Promise<CurrentProcessMaterialRefs>;
  getProcessHydrationPlan(args: { processId: string }): Promise<WorkingSetPlan | null>;
  setProcessHydrationPlan(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan>;
  listProcessOutputs(args: { processId: string }): Promise<PlatformProcessOutputSummary[]>;
  replaceCurrentProcessOutputs(args: {
    processId: string;
    outputs: PlatformProcessOutputWriteInput[];
  }): Promise<PlatformProcessOutputSummary[]>;
  persistCheckpointArtifacts(args: {
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  }): Promise<PlatformProcessOutputSummary[]>;
  listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]>;
  replaceCurrentProcessSideWorkItems(args: {
    processId: string;
    items: PlatformSideWorkWriteInput[];
  }): Promise<SideWorkItem[]>;
  hasCanonicalRecoveryMaterials(args: { processId: string }): Promise<boolean>;
}

function buildDefaultEnvironmentSummary(): EnvironmentSummary {
  return environmentSummarySchema.parse({
    ...defaultEnvironmentSummary,
  });
}

function cloneEnvironmentSummary(summary: EnvironmentSummary): EnvironmentSummary {
  return environmentSummarySchema.parse(summary);
}

const upsertUserMutation = makeFunctionReference<
  'mutation',
  {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  },
  StoredPlatformUser
>('users:upsertUserFromWorkOS');

const listAccessibleProjectsQuery = makeFunctionReference<
  'query',
  { userId: string },
  ProjectSummary[]
>('projects:listAccessibleProjectSummaries');

const getProjectAccessQuery = makeFunctionReference<
  'query',
  { userId: string; projectId: string },
  ProjectAccessResult
>('projects:getProjectAccess');

const createProjectMutation = makeFunctionReference<
  'mutation',
  { ownerUserId: string; name: string },
  ProjectCreateResult
>('projects:createProject');

const createProcessMutation = makeFunctionReference<
  'mutation',
  {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  },
  ProcessCreateResult
>('processes:createProcess');

const startProcessMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:startProcess');

const resumeProcessMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:resumeProcess');

const markProcessRunningMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:markProcessRunning');

const submitProcessResponseMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    clientRequestId: string;
    message: string;
  },
  ProcessResponseStoreResult
>('processes:submitProcessResponse');

const getSubmittedProcessResponseQuery = makeFunctionReference<
  'query',
  {
    processId: string;
    clientRequestId: string;
  },
  ProcessResponseStoreResult | null
>('processes:getSubmittedProcessResponse');

const listProjectProcessesQuery = makeFunctionReference<
  'query',
  { projectId: string },
  ProcessSummary[]
>('processes:listProjectProcessSummaries');

const getProcessRecordQuery = makeFunctionReference<
  'query',
  { processId: string },
  (ProcessSummary & { projectId: string }) | null
>('processes:getProcessRecord');

const listProjectArtifactsQuery = makeFunctionReference<
  'query',
  { projectId: string },
  ArtifactSummary[]
>('artifacts:listProjectArtifactSummaries');

const listProjectSourceAttachmentsQuery = makeFunctionReference<
  'query',
  { projectId: string },
  SourceAttachmentSummary[]
>('sourceAttachments:listProjectSourceAttachmentSummaries');

const listProcessHistoryItemsQuery = makeFunctionReference<
  'query',
  { processId: string },
  ProcessHistoryItem[]
>('processHistoryItems:listProcessHistoryItems');

const getCurrentProcessRequestQuery = makeFunctionReference<
  'query',
  { processId: string },
  CurrentProcessRequest | null
>('processes:getCurrentProcessRequest');

const getProcessEnvironmentSummaryQuery = makeFunctionReference<
  'query',
  { processId: string },
  EnvironmentSummary
>('processEnvironmentStates:getProcessEnvironmentSummary');

const upsertProcessEnvironmentStateMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  },
  EnvironmentSummary
>('processEnvironmentStates:upsertProcessEnvironmentState');

const getCurrentProcessMaterialRefsQuery = makeFunctionReference<
  'query',
  { processId: string },
  CurrentProcessMaterialRefs
>('processes:getCurrentProcessMaterialRefs');

const setCurrentProcessMaterialRefsMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  },
  CurrentProcessMaterialRefs
>('processes:setCurrentProcessMaterialRefs');

const listProcessOutputsQuery = makeFunctionReference<
  'query',
  { processId: string },
  PlatformProcessOutputSummary[]
>('processOutputs:listProcessOutputs');

const replaceCurrentProcessOutputsMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    outputs: Array<{
      outputId?: string;
      linkedArtifactId: string | null;
      displayName: string;
      revisionLabel: string | null;
      state: string;
      updatedAt?: string;
    }>;
  },
  PlatformProcessOutputSummary[]
>('processOutputs:replaceCurrentProcessOutputs');

const persistCheckpointArtifactsMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  },
  PlatformProcessOutputSummary[]
>('artifacts:persistCheckpointArtifacts');

const listProcessSideWorkItemsQuery = makeFunctionReference<
  'query',
  { processId: string },
  SideWorkItem[]
>('processSideWorkItems:listProcessSideWorkItems');

const replaceCurrentProcessSideWorkItemsMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    items: Array<{
      sideWorkId?: string;
      displayLabel: string;
      purposeSummary: string;
      status: SideWorkItem['status'];
      resultSummary: string | null;
      updatedAt?: string;
    }>;
  },
  SideWorkItem[]
>('processSideWorkItems:replaceCurrentProcessSideWorkItems');

export class NullPlatformStore implements PlatformStore {
  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    return {
      userId: args.workosUserId,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
  }

  async listAccessibleProjects(): Promise<ProjectSummary[]> {
    return [];
  }

  async getProjectAccess(): Promise<ProjectAccessResult> {
    return {
      kind: 'not_found',
    };
  }

  async createProject(): Promise<ProjectCreateResult> {
    return {
      kind: 'name_conflict',
    };
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    const now = new Date().toISOString();
    const availableActions: ProcessSummary['availableActions'] = ['open'];

    return {
      kind: 'created',
      process: {
        processId: `process:${args.projectId}:1`,
        displayLabel: args.displayLabel,
        processType: args.processType,
        status: 'draft',
        phaseLabel: 'Draft',
        nextActionLabel: 'Open the process',
        availableActions,
        hasEnvironment: false,
        updatedAt: now,
      },
    };
  }

  async startProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'draft',
        phaseLabel: 'Preparing environment',
        nextActionLabel: 'Waiting for environment to be ready',
        availableActions: [],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
  }

  async resumeProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.startProcess(args);
  }

  async transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
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
        historyItemId: `${args.processId}:history-response`,
        kind: 'user_message',
        lifecycleState: 'finalized',
        text: args.message.trim(),
        createdAt: now,
        relatedSideWorkId: null,
        relatedArtifactId: null,
      },
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
  }

  async getSubmittedProcessResponse(): Promise<ProcessResponseStoreResult | null> {
    return null;
  }

  async getProcessRecord(): Promise<(ProcessSummary & { projectId: string }) | null> {
    return null;
  }

  async listProjectProcesses(): Promise<ProcessSummary[]> {
    return [];
  }

  async listProjectArtifacts(): Promise<ArtifactSummary[]> {
    return [];
  }

  async listProjectSourceAttachments(): Promise<SourceAttachmentSummary[]> {
    return [];
  }

  async listProcessHistoryItems(): Promise<ProcessHistoryItem[]> {
    return [];
  }

  async getCurrentProcessRequest(): Promise<CurrentProcessRequest | null> {
    return null;
  }

  async getProcessEnvironmentSummary(): Promise<EnvironmentSummary> {
    return buildDefaultEnvironmentSummary();
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary> {
    return environmentSummarySchema.parse({
      environmentId: args.environmentId,
      state: args.state,
      statusLabel: deriveEnvironmentStatusLabel(args.state),
      blockedReason: args.blockedReason,
      lastHydratedAt: args.lastHydratedAt,
      lastCheckpointAt: args.lastCheckpointAt ?? null,
      lastCheckpointResult: args.lastCheckpointResult ?? null,
    });
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

  async getProcessHydrationPlan(): Promise<WorkingSetPlan | null> {
    return null;
  }

  async setProcessHydrationPlan(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan> {
    return {
      artifactIds: [...args.plan.artifactIds],
      sourceAttachmentIds: [...args.plan.sourceAttachmentIds],
      outputIds: [...args.plan.outputIds],
    };
  }

  async listProcessOutputs(): Promise<PlatformProcessOutputSummary[]> {
    return [];
  }

  async replaceCurrentProcessOutputs(args: {
    outputs: PlatformProcessOutputWriteInput[];
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

  async persistCheckpointArtifacts(args: {
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  }): Promise<PlatformProcessOutputSummary[]> {
    return args.artifacts.map((artifact, index) => ({
      outputId: `${args.processId}:checkpoint-output-${index + 1}`,
      linkedArtifactId: artifact.artifactId ?? `${args.processId}:checkpoint-artifact-${index + 1}`,
      displayName: artifact.targetLabel,
      revisionLabel: null,
      state: 'published_to_artifact',
      updatedAt: artifact.producedAt,
    }));
  }

  async listProcessSideWorkItems(): Promise<SideWorkItem[]> {
    return [];
  }

  async replaceCurrentProcessSideWorkItems(args: {
    items: PlatformSideWorkWriteInput[];
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
}

export class ConvexPlatformStore implements PlatformStore {
  private readonly client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    return this.client.mutation(upsertUserMutation, args, {
      skipQueue: true,
    });
  }

  async listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]> {
    return this.client.query(listAccessibleProjectsQuery, args);
  }

  async getProjectAccess(args: {
    userId: string;
    projectId: string;
  }): Promise<ProjectAccessResult> {
    return this.client.query(getProjectAccessQuery, args);
  }

  async createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult> {
    return this.client.mutation(createProjectMutation, args, {
      skipQueue: true,
    });
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    return this.client.mutation(createProcessMutation, args, {
      skipQueue: true,
    });
  }

  async startProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(startProcessMutation, args, {
      skipQueue: true,
    });
  }

  async resumeProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(resumeProcessMutation, args, {
      skipQueue: true,
    });
  }

  async transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(markProcessRunningMutation, args, {
      skipQueue: true,
    });
  }

  async submitProcessResponse(args: {
    processId: string;
    clientRequestId: string;
    message: string;
  }): Promise<ProcessResponseStoreResult> {
    return this.client.mutation(submitProcessResponseMutation, args, {
      skipQueue: true,
    });
  }

  async getSubmittedProcessResponse(args: {
    processId: string;
    clientRequestId: string;
  }): Promise<ProcessResponseStoreResult | null> {
    return this.client.query(getSubmittedProcessResponseQuery, args);
  }

  async listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]> {
    return this.client.query(listProjectProcessesQuery, args);
  }

  async getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null> {
    return this.client.query(getProcessRecordQuery, args);
  }

  async listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]> {
    return this.client.query(listProjectArtifactsQuery, args);
  }

  async listProjectSourceAttachments(args: {
    projectId: string;
  }): Promise<SourceAttachmentSummary[]> {
    return this.client.query(listProjectSourceAttachmentsQuery, args);
  }

  async listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]> {
    return this.client.query(listProcessHistoryItemsQuery, args);
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.client.query(getCurrentProcessRequestQuery, args);
  }

  async getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary> {
    return this.client.query(getProcessEnvironmentSummaryQuery, args);
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary> {
    return this.client.mutation(upsertProcessEnvironmentStateMutation, args, {
      skipQueue: true,
    });
  }

  async getCurrentProcessMaterialRefs(args: {
    processId: string;
  }): Promise<CurrentProcessMaterialRefs> {
    return this.client.query(getCurrentProcessMaterialRefsQuery, args);
  }

  async setCurrentProcessMaterialRefs(args: {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  }): Promise<CurrentProcessMaterialRefs> {
    return this.client.mutation(setCurrentProcessMaterialRefsMutation, {
      processId: args.processId,
      artifactIds: args.artifactIds,
      sourceAttachmentIds: args.sourceAttachmentIds,
    });
  }

  async getProcessHydrationPlan(): Promise<WorkingSetPlan | null> {
    return null;
  }

  async setProcessHydrationPlan(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan> {
    return args.plan;
  }

  async listProcessOutputs(args: { processId: string }): Promise<PlatformProcessOutputSummary[]> {
    return this.client.query(listProcessOutputsQuery, args);
  }

  async replaceCurrentProcessOutputs(args: {
    processId: string;
    outputs: PlatformProcessOutputWriteInput[];
  }): Promise<PlatformProcessOutputSummary[]> {
    return this.client.mutation(replaceCurrentProcessOutputsMutation, {
      processId: args.processId,
      outputs: args.outputs.map((output) => ({
        outputId: output.outputId,
        linkedArtifactId: output.linkedArtifactId,
        displayName: output.displayName,
        revisionLabel: output.revisionLabel,
        state: output.state,
        updatedAt: output.updatedAt,
      })),
    });
  }

  async persistCheckpointArtifacts(args: {
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  }): Promise<PlatformProcessOutputSummary[]> {
    return this.client.mutation(
      persistCheckpointArtifactsMutation,
      {
        processId: args.processId,
        artifacts: args.artifacts.map((artifact) => ({
          artifactId: artifact.artifactId,
          producedAt: artifact.producedAt,
          contents:
            typeof artifact.contents === 'string'
              ? artifact.contents
              : Buffer.from(artifact.contents).toString('base64'),
          targetLabel: artifact.targetLabel,
        })),
      },
      {
        skipQueue: true,
      },
    );
  }

  async listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]> {
    return this.client.query(listProcessSideWorkItemsQuery, args);
  }

  async replaceCurrentProcessSideWorkItems(args: {
    processId: string;
    items: PlatformSideWorkWriteInput[];
  }): Promise<SideWorkItem[]> {
    return this.client.mutation(replaceCurrentProcessSideWorkItemsMutation, {
      processId: args.processId,
      items: args.items.map((item) => ({
        sideWorkId: item.sideWorkId,
        displayLabel: item.displayLabel,
        purposeSummary: item.purposeSummary,
        status: item.status,
        resultSummary: item.resultSummary,
        updatedAt: item.updatedAt,
      })),
    });
  }

  async hasCanonicalRecoveryMaterials(): Promise<boolean> {
    // Stub: real canonical-material availability check deferred to integration hardening
    return true;
  }
}

export class InMemoryPlatformStore implements PlatformStore {
  private readonly usersByWorkosId = new Map<string, StoredPlatformUser>();
  private readonly projectsByUserId = new Map<string, ProjectSummary[]>();
  private readonly accessByProjectId = new Map<string, ProjectAccessResult>();
  private readonly processesByProjectId = new Map<string, ProcessSummary[]>();
  private readonly artifactsByProjectId = new Map<string, ArtifactSummary[]>();
  private readonly sourceAttachmentsByProjectId = new Map<string, SourceAttachmentSummary[]>();
  private readonly processHistoryItemsByProcessId = new Map<string, ProcessHistoryItem[]>();
  private readonly currentRequestsByProcessId = new Map<string, CurrentProcessRequest | null>();
  private readonly processEnvironmentSummariesByProcessId = new Map<string, EnvironmentSummary>();
  private readonly currentMaterialRefsByProcessId = new Map<string, CurrentProcessMaterialRefs>();
  private readonly processHydrationPlansByProcessId = new Map<string, WorkingSetPlan>();
  private readonly processOutputsByProcessId = new Map<string, PlatformProcessOutputSummary[]>();
  private readonly processSideWorkItemsByProcessId = new Map<string, SideWorkItem[]>();
  private readonly startProcessResultsByProcessId = new Map<string, ProcessActionStoreResult>();
  private readonly resumeProcessResultsByProcessId = new Map<string, ProcessActionStoreResult>();
  private readonly submitProcessResponseResultsByProcessId = new Map<
    string,
    ProcessResponseStoreResult
  >();
  private readonly submitProcessResponseFailuresByProcessId = new Map<string, Error>();
  private readonly responseResultsByProcessId = new Map<
    string,
    Map<string, ProcessResponseStoreResult>
  >();

  constructor(
    args: {
      users?: StoredPlatformUser[];
      accessibleProjectsByUserId?: Record<string, ProjectSummary[]>;
      projectAccessByProjectId?: Record<string, ProjectAccessResult>;
      processesByProjectId?: Record<string, ProcessSummary[]>;
      artifactsByProjectId?: Record<string, ArtifactSummary[]>;
      sourceAttachmentsByProjectId?: Record<string, SourceAttachmentSummary[]>;
      processHistoryItemsByProcessId?: Record<string, ProcessHistoryItem[]>;
      currentRequestsByProcessId?: Record<string, CurrentProcessRequest | null>;
      processEnvironmentSummariesByProcessId?: Record<string, EnvironmentSummary>;
      currentMaterialRefsByProcessId?: Record<string, CurrentProcessMaterialRefs>;
      processOutputsByProcessId?: Record<string, PlatformProcessOutputSeed[]>;
      processSideWorkItemsByProcessId?: Record<string, SideWorkItem[]>;
      startProcessResultsByProcessId?: Record<string, ProcessActionStoreResult>;
      resumeProcessResultsByProcessId?: Record<string, ProcessActionStoreResult>;
      submitProcessResponseResultsByProcessId?: Record<string, ProcessResponseStoreResult>;
      submitProcessResponseFailuresByProcessId?: Record<string, Error>;
    } = {},
  ) {
    for (const user of args.users ?? []) {
      this.usersByWorkosId.set(user.workosUserId, user);
    }

    for (const [userId, projects] of Object.entries(args.accessibleProjectsByUserId ?? {})) {
      this.projectsByUserId.set(userId, projects);
    }

    for (const [projectId, result] of Object.entries(args.projectAccessByProjectId ?? {})) {
      this.accessByProjectId.set(projectId, result);
    }

    for (const [projectId, summaries] of Object.entries(args.processesByProjectId ?? {})) {
      this.processesByProjectId.set(projectId, summaries);
    }

    for (const [projectId, summaries] of Object.entries(args.artifactsByProjectId ?? {})) {
      this.artifactsByProjectId.set(projectId, summaries);
    }

    for (const [projectId, summaries] of Object.entries(args.sourceAttachmentsByProjectId ?? {})) {
      this.sourceAttachmentsByProjectId.set(projectId, summaries);
    }

    for (const [processId, items] of Object.entries(args.processHistoryItemsByProcessId ?? {})) {
      this.processHistoryItemsByProcessId.set(processId, items);
    }

    for (const [processId, request] of Object.entries(args.currentRequestsByProcessId ?? {})) {
      this.currentRequestsByProcessId.set(processId, request);
    }

    for (const [processId, summary] of Object.entries(
      args.processEnvironmentSummariesByProcessId ?? {},
    )) {
      this.processEnvironmentSummariesByProcessId.set(processId, cloneEnvironmentSummary(summary));
    }

    for (const [processId, refs] of Object.entries(args.currentMaterialRefsByProcessId ?? {})) {
      this.currentMaterialRefsByProcessId.set(processId, refs);
    }

    for (const [processId, outputs] of Object.entries(args.processOutputsByProcessId ?? {})) {
      this.processOutputsByProcessId.set(
        processId,
        outputs.map((output) => ({
          ...output,
          linkedArtifactId: output.linkedArtifactId ?? null,
        })),
      );
    }

    for (const [processId, items] of Object.entries(args.processSideWorkItemsByProcessId ?? {})) {
      this.processSideWorkItemsByProcessId.set(processId, items);
    }

    for (const [processId, result] of Object.entries(args.startProcessResultsByProcessId ?? {})) {
      this.startProcessResultsByProcessId.set(processId, result);
    }

    for (const [processId, result] of Object.entries(args.resumeProcessResultsByProcessId ?? {})) {
      this.resumeProcessResultsByProcessId.set(processId, result);
    }

    for (const [processId, result] of Object.entries(
      args.submitProcessResponseResultsByProcessId ?? {},
    )) {
      this.submitProcessResponseResultsByProcessId.set(processId, result);
    }

    for (const [processId, error] of Object.entries(
      args.submitProcessResponseFailuresByProcessId ?? {},
    )) {
      this.submitProcessResponseFailuresByProcessId.set(processId, error);
    }
  }

  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    const existing = this.usersByWorkosId.get(args.workosUserId);

    if (existing !== undefined) {
      const nextUser = {
        ...existing,
        email: args.email,
        displayName: args.displayName,
      };
      this.usersByWorkosId.set(args.workosUserId, nextUser);
      return nextUser;
    }

    const nextUser = {
      userId: `user:${args.workosUserId}`,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
    this.usersByWorkosId.set(args.workosUserId, nextUser);

    return nextUser;
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

    const accessibleProjects = this.projectsByUserId.get(args.userId) ?? [];
    const match = accessibleProjects.find((project) => project.projectId === args.projectId);

    if (match !== undefined) {
      return {
        kind: 'accessible',
        project: match,
      };
    }

    return {
      kind: 'not_found',
    };
  }

  async createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult> {
    const existingProjects = this.projectsByUserId.get(args.ownerUserId) ?? [];

    if (
      existingProjects.some(
        (project) => project.role === 'owner' && project.name.trim() === args.name.trim(),
      )
    ) {
      return {
        kind: 'name_conflict',
      };
    }

    const now = new Date().toISOString();
    const project = {
      projectId: `project-${this.accessByProjectId.size + 1}`,
      name: args.name,
      ownerDisplayName:
        this.usersByWorkosId.get(args.ownerUserId.replace(/^user:/, ''))?.displayName ??
        this.usersByWorkosId.get(args.ownerUserId.replace(/^user:/, ''))?.email ??
        null,
      role: 'owner' as const,
      processCount: 0,
      artifactCount: 0,
      sourceAttachmentCount: 0,
      lastUpdatedAt: now,
    };

    this.projectsByUserId.set(args.ownerUserId, [project, ...existingProjects]);
    this.accessByProjectId.set(project.projectId, {
      kind: 'accessible',
      project,
    });

    return {
      kind: 'created',
      project,
    };
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    const existingProcesses = this.processesByProjectId.get(args.projectId) ?? [];
    const now = new Date().toISOString();
    const availableActions: ProcessSummary['availableActions'] = ['open'];
    const process = {
      processId: `process-${existingProcesses.length + 1}`,
      displayLabel: args.displayLabel,
      processType: args.processType,
      status: 'draft' as const,
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      availableActions,
      hasEnvironment: false,
      updatedAt: now,
    };

    this.processesByProjectId.set(args.projectId, [process, ...existingProcesses]);
    this.processEnvironmentSummariesByProcessId.set(
      process.processId,
      buildDefaultEnvironmentSummary(),
    );
    this.updateProjectSummary(args.projectId, (project) => ({
      ...project,
      processCount: project.processCount + 1,
      lastUpdatedAt: now,
    }));

    return {
      kind: 'created',
      process,
    };
  }

  async startProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const override = this.startProcessResultsByProcessId.get(args.processId);

    if (override !== undefined) {
      return this.applyStoredProcessActionResult(args.processId, override);
    }

    return this.acceptProcessForPreparation(args.processId);
  }

  async resumeProcess(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const override = this.resumeProcessResultsByProcessId.get(args.processId);

    if (override !== undefined) {
      return this.applyStoredProcessActionResult(args.processId, override);
    }

    return this.acceptProcessForPreparation(args.processId);
  }

  async transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.transitionProcessToRunningInternal(args.processId);
  }

  async submitProcessResponse(args: {
    processId: string;
    clientRequestId: string;
    message: string;
  }): Promise<ProcessResponseStoreResult> {
    const trimmedMessage = args.message.trim();
    const trimmedClientRequestId = args.clientRequestId.trim();
    const existing = this.responseResultsByProcessId
      .get(args.processId)
      ?.get(trimmedClientRequestId);

    if (existing !== undefined) {
      return existing;
    }

    const failure = this.submitProcessResponseFailuresByProcessId.get(args.processId);

    if (failure !== undefined) {
      throw failure;
    }

    const override = this.submitProcessResponseResultsByProcessId.get(args.processId);
    const response =
      override ?? this.buildDefaultSubmitProcessResponseResult(args.processId, trimmedMessage);

    this.storeSubmitProcessResponseResult(
      args.processId,
      trimmedClientRequestId,
      this.applyStoredSubmitProcessResponseResult(args.processId, response),
    );

    const stored = this.responseResultsByProcessId.get(args.processId)?.get(trimmedClientRequestId);

    if (stored === undefined) {
      throw new Error('Process response result was not recorded.');
    }

    return stored;
  }

  async getSubmittedProcessResponse(args: {
    processId: string;
    clientRequestId: string;
  }): Promise<ProcessResponseStoreResult | null> {
    return (
      this.responseResultsByProcessId.get(args.processId)?.get(args.clientRequestId.trim()) ?? null
    );
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

  async listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]> {
    return this.processesByProjectId.get(args.projectId) ?? [];
  }

  async listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]> {
    return this.artifactsByProjectId.get(args.projectId) ?? [];
  }

  async listProjectSourceAttachments(args: {
    projectId: string;
  }): Promise<SourceAttachmentSummary[]> {
    return this.sourceAttachmentsByProjectId.get(args.projectId) ?? [];
  }

  async listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]> {
    return this.processHistoryItemsByProcessId.get(args.processId) ?? [];
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.currentRequestsByProcessId.get(args.processId) ?? null;
  }

  async getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary> {
    return cloneEnvironmentSummary(
      this.processEnvironmentSummariesByProcessId.get(args.processId) ??
        buildDefaultEnvironmentSummary(),
    );
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: 'daytona' | 'local' | null;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary> {
    const existing =
      this.processEnvironmentSummariesByProcessId.get(args.processId) ??
      buildDefaultEnvironmentSummary();
    const next = environmentSummarySchema.parse({
      environmentId: args.environmentId,
      state: args.state,
      statusLabel: deriveEnvironmentStatusLabel(args.state),
      blockedReason: args.blockedReason,
      lastHydratedAt: args.lastHydratedAt ?? existing.lastHydratedAt,
      lastCheckpointAt:
        args.lastCheckpointAt === undefined ? existing.lastCheckpointAt : args.lastCheckpointAt,
      lastCheckpointResult:
        args.lastCheckpointResult === undefined
          ? existing.lastCheckpointResult
          : args.lastCheckpointResult,
    });
    this.processEnvironmentSummariesByProcessId.set(args.processId, next);
    return cloneEnvironmentSummary(next);
  }

  async getCurrentProcessMaterialRefs(args: {
    processId: string;
  }): Promise<CurrentProcessMaterialRefs> {
    return (
      this.currentMaterialRefsByProcessId.get(args.processId) ?? {
        artifactIds: [],
        sourceAttachmentIds: [],
      }
    );
  }

  async setCurrentProcessMaterialRefs(args: {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  }): Promise<CurrentProcessMaterialRefs> {
    const nextRefs = {
      artifactIds: [...args.artifactIds],
      sourceAttachmentIds: [...args.sourceAttachmentIds],
    };
    this.currentMaterialRefsByProcessId.set(args.processId, nextRefs);
    return nextRefs;
  }

  async getProcessHydrationPlan(args: { processId: string }): Promise<WorkingSetPlan | null> {
    return this.processHydrationPlansByProcessId.get(args.processId) ?? null;
  }

  async setProcessHydrationPlan(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan> {
    const next: WorkingSetPlan = {
      artifactIds: [...args.plan.artifactIds],
      sourceAttachmentIds: [...args.plan.sourceAttachmentIds],
      outputIds: [...args.plan.outputIds],
    };
    this.processHydrationPlansByProcessId.set(args.processId, next);
    return next;
  }

  async listProcessOutputs(args: { processId: string }): Promise<PlatformProcessOutputSummary[]> {
    return this.processOutputsByProcessId.get(args.processId) ?? [];
  }

  async replaceCurrentProcessOutputs(args: {
    processId: string;
    outputs: PlatformProcessOutputWriteInput[];
  }): Promise<PlatformProcessOutputSummary[]> {
    const existingOutputIds = new Set(
      (this.processOutputsByProcessId.get(args.processId) ?? []).map((output) => output.outputId),
    );
    const nextOutputs = args.outputs.map((output, index) => {
      const fallbackOutputId = `${args.processId}:output-${existingOutputIds.size + index + 1}`;

      return {
        outputId: output.outputId ?? fallbackOutputId,
        linkedArtifactId: output.linkedArtifactId,
        displayName: output.displayName,
        revisionLabel: output.revisionLabel,
        state: output.state,
        updatedAt: output.updatedAt ?? new Date().toISOString(),
      };
    });

    this.processOutputsByProcessId.set(args.processId, nextOutputs);
    return nextOutputs;
  }

  async persistCheckpointArtifacts(args: {
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  }): Promise<PlatformProcessOutputSummary[]> {
    const processRecord = await this.getProcessRecord({
      processId: args.processId,
    });

    if (processRecord === null) {
      return [];
    }

    const existingArtifacts = this.artifactsByProjectId.get(processRecord.projectId) ?? [];
    const existingOutputs = this.processOutputsByProcessId.get(args.processId) ?? [];
    const checkpointOutputs = args.artifacts.map((artifact, index) => {
      const artifactId =
        artifact.artifactId ??
        `${args.processId}:checkpoint-artifact-${existingArtifacts.length + index + 1}`;
      const existingOutput = existingOutputs.find(
        (output) => output.linkedArtifactId === artifactId,
      );

      return {
        artifact: {
          artifactId,
          displayName: artifact.targetLabel,
          currentVersionLabel: null,
          attachmentScope: 'process' as const,
          processId: args.processId,
          processDisplayLabel: processRecord.displayLabel,
          updatedAt: artifact.producedAt,
        },
        output: {
          outputId:
            existingOutput?.outputId ??
            `${args.processId}:checkpoint-output-${existingOutputs.length + index + 1}`,
          linkedArtifactId: artifactId,
          displayName: artifact.targetLabel,
          revisionLabel: null,
          state: 'published_to_artifact',
          updatedAt: artifact.producedAt,
        },
      };
    });
    const checkpointArtifactIds = new Set(
      checkpointOutputs.map(({ artifact }) => artifact.artifactId),
    );
    const nextArtifacts = [
      ...existingArtifacts.filter((artifact) => !checkpointArtifactIds.has(artifact.artifactId)),
      ...checkpointOutputs.map(({ artifact }) => artifact),
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const nextOutputs = [
      ...existingOutputs.filter(
        (output) =>
          output.linkedArtifactId === null || !checkpointArtifactIds.has(output.linkedArtifactId),
      ),
      ...checkpointOutputs.map(({ output }) => output),
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    this.artifactsByProjectId.set(processRecord.projectId, nextArtifacts);
    this.processOutputsByProcessId.set(args.processId, nextOutputs);

    const existingRefs = await this.getCurrentProcessMaterialRefs({
      processId: args.processId,
    });
    this.currentMaterialRefsByProcessId.set(args.processId, {
      artifactIds: [...new Set([...existingRefs.artifactIds, ...checkpointArtifactIds])],
      sourceAttachmentIds: [...existingRefs.sourceAttachmentIds],
    });

    const nextUpdatedAt =
      checkpointOutputs.reduce<string | null>(
        (latest, { output }) =>
          latest === null || output.updatedAt.localeCompare(latest) > 0 ? output.updatedAt : latest,
        null,
      ) ?? new Date().toISOString();

    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      if (projectId !== processRecord.projectId) {
        continue;
      }

      this.processesByProjectId.set(
        projectId,
        processes.map((process) =>
          process.processId === args.processId
            ? processSummarySchema.parse({
                ...process,
                updatedAt: nextUpdatedAt,
              })
            : process,
        ),
      );
    }

    this.updateProjectSummary(processRecord.projectId, (project) => ({
      ...project,
      artifactCount: nextArtifacts.length,
      lastUpdatedAt: nextUpdatedAt,
    }));

    return nextOutputs;
  }

  async listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]> {
    return this.processSideWorkItemsByProcessId.get(args.processId) ?? [];
  }

  async replaceCurrentProcessSideWorkItems(args: {
    processId: string;
    items: PlatformSideWorkWriteInput[];
  }): Promise<SideWorkItem[]> {
    const existingSideWorkIds = new Set(
      (this.processSideWorkItemsByProcessId.get(args.processId) ?? []).map(
        (item) => item.sideWorkId,
      ),
    );
    const nextItems = args.items.map((item, index) => {
      const fallbackSideWorkId = `${args.processId}:side-work-${existingSideWorkIds.size + index + 1}`;

      return {
        sideWorkId: item.sideWorkId ?? fallbackSideWorkId,
        displayLabel: item.displayLabel,
        purposeSummary: item.purposeSummary,
        status: item.status,
        resultSummary: item.resultSummary,
        updatedAt: item.updatedAt ?? new Date().toISOString(),
      };
    });

    this.processSideWorkItemsByProcessId.set(args.processId, nextItems);
    return nextItems;
  }

  async hasCanonicalRecoveryMaterials(args: { processId: string }): Promise<boolean> {
    const materialRefs = this.currentMaterialRefsByProcessId.get(args.processId);
    const outputs = this.processOutputsByProcessId.get(args.processId);

    // If neither map has an entry, we have no explicit signal — treat as present.
    if (materialRefs === undefined && outputs === undefined) {
      return true;
    }

    const refs = materialRefs ?? { artifactIds: [], sourceAttachmentIds: [] };
    const outs = outputs ?? [];

    return refs.artifactIds.length > 0 || refs.sourceAttachmentIds.length > 0 || outs.length > 0;
  }

  private updateProjectSummary(
    projectId: string,
    update: (project: ProjectSummary) => ProjectSummary,
  ): void {
    for (const [userId, projects] of this.projectsByUserId.entries()) {
      const nextProjects = projects.map((project) =>
        project.projectId === projectId ? update(project) : project,
      );
      this.projectsByUserId.set(userId, nextProjects);
    }

    const directAccess = this.accessByProjectId.get(projectId);
    if (directAccess?.kind === 'accessible') {
      this.accessByProjectId.set(projectId, {
        kind: 'accessible',
        project: update(directAccess.project),
      });
    }
  }

  private applyStoredProcessActionResult(
    processId: string,
    result: ProcessActionStoreResult,
  ): ProcessActionStoreResult {
    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      const index = processes.findIndex((process) => process.processId === processId);

      if (index === -1) {
        continue;
      }

      const nextProcesses = [...processes];
      nextProcesses[index] = result.process;
      this.processesByProjectId.set(projectId, nextProcesses);
      this.currentRequestsByProcessId.set(processId, result.currentRequest);
      this.updateProjectSummary(projectId, (project) => ({
        ...project,
        lastUpdatedAt: result.process.updatedAt,
      }));

      return result;
    }

    return result;
  }

  private applyStoredSubmitProcessResponseResult(
    processId: string,
    result: ProcessResponseStoreResult,
  ): ProcessResponseStoreResult {
    const updated = this.applyStoredProcessActionResult(processId, result);
    const existingHistory = this.processHistoryItemsByProcessId.get(processId) ?? [];
    const nextHistory = existingHistory.filter(
      (item) => item.historyItemId !== result.historyItem.historyItemId,
    );
    nextHistory.push(result.historyItem);
    nextHistory.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    this.processHistoryItemsByProcessId.set(processId, nextHistory);

    return {
      ...result,
      process: updated.process,
      currentRequest: updated.currentRequest,
    };
  }

  private buildDefaultSubmitProcessResponseResult(
    processId: string,
    message: string,
  ): ProcessResponseStoreResult {
    const existingHistory = this.processHistoryItemsByProcessId.get(processId) ?? [];
    const now = new Date().toISOString();
    const historyItem: ProcessHistoryItem = {
      historyItemId: `${processId}:history-response-${existingHistory.length + 1}`,
      kind: 'user_message',
      lifecycleState: 'finalized',
      text: message,
      createdAt: now,
      relatedSideWorkId: null,
      relatedArtifactId: null,
    };

    for (const [, processes] of this.processesByProjectId.entries()) {
      const existing = processes.find((process) => process.processId === processId);

      if (existing === undefined) {
        continue;
      }

      return {
        accepted: true,
        historyItem,
        process: processSummarySchema.parse({
          ...existing,
          status: 'running',
          nextActionLabel: 'Monitor progress in the work surface',
          availableActions: ['open', 'review'],
          updatedAt: now,
        }),
        currentRequest: null,
      };
    }

    return {
      accepted: true,
      historyItem,
      process: processSummarySchema.parse({
        processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        hasEnvironment: false,
        updatedAt: now,
      }),
      currentRequest: null,
    };
  }

  private storeSubmitProcessResponseResult(
    processId: string,
    clientRequestId: string,
    result: ProcessResponseStoreResult,
  ): void {
    const responsesByClientRequestId =
      this.responseResultsByProcessId.get(processId) ??
      new Map<string, ProcessResponseStoreResult>();
    responsesByClientRequestId.set(clientRequestId, result);
    this.responseResultsByProcessId.set(processId, responsesByClientRequestId);
  }

  private acceptProcessForPreparation(processId: string): ProcessActionStoreResult {
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
        phaseLabel: 'Preparing environment',
        nextActionLabel: 'Waiting for environment to be ready',
        availableActions: [],
        updatedAt: now,
      });
      const nextProcesses = [...processes];
      nextProcesses[index] = nextProcess;
      this.processesByProjectId.set(projectId, nextProcesses);
      this.currentRequestsByProcessId.set(processId, null);
      this.updateProjectSummary(projectId, (project) => ({
        ...project,
        lastUpdatedAt: now,
      }));

      return {
        process: nextProcess,
        currentRequest: null,
      };
    }

    const now = new Date().toISOString();

    return {
      process: processSummarySchema.parse({
        processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'draft',
        phaseLabel: 'Preparing environment',
        nextActionLabel: 'Waiting for environment to be ready',
        availableActions: [],
        hasEnvironment: false,
        updatedAt: now,
      }),
      currentRequest: null,
    };
  }

  private transitionProcessToRunningInternal(processId: string): ProcessActionStoreResult {
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
        phaseLabel:
          existing.phaseLabel === 'Preparing environment' ? 'Working' : existing.phaseLabel,
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        updatedAt: now,
      });
      const nextProcesses = [...processes];
      nextProcesses[index] = nextProcess;
      this.processesByProjectId.set(projectId, nextProcesses);
      this.currentRequestsByProcessId.set(processId, null);
      this.updateProjectSummary(projectId, (project) => ({
        ...project,
        lastUpdatedAt: now,
      }));

      return {
        process: nextProcess,
        currentRequest: null,
      };
    }

    const now = new Date().toISOString();

    return {
      process: processSummarySchema.parse({
        processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Monitor progress in the work surface',
        availableActions: ['open', 'review'],
        hasEnvironment: false,
        updatedAt: now,
      }),
      currentRequest: null,
    };
  }
}

export function buildEmptyProjectShellResponse(project: ProjectSummary): ProjectShellResponse {
  return {
    project,
    processes: {
      status: 'empty',
      items: [],
    },
    artifacts: {
      status: 'empty',
      items: [],
    },
    sourceAttachments: {
      status: 'empty',
      items: [],
    },
  };
}
