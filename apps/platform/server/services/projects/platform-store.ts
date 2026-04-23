import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import {
  type ArtifactSummary,
  type CurrentProcessRequest,
  defaultEnvironmentSummary,
  deriveEnvironmentStatusLabel,
  type EnvironmentSummary,
  environmentSummarySchema,
  type PackageReviewTarget,
  type ProcessHistoryItem,
  type ProcessOutputReference,
  type ProcessSummary,
  type ProjectShellResponse,
  type ProjectSummary,
  processSummarySchema,
  type ReviewTargetSummary,
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

export type EnvironmentProviderKind = 'daytona' | 'local';

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
    providerKind: EnvironmentProviderKind;
  }): Promise<ProcessCreateResult>;
  startProcess(args: { processId: string }): Promise<ProcessActionStoreResult>;
  resumeProcess(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToRunning(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToWaiting(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToCompleted(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToFailed(args: { processId: string }): Promise<ProcessActionStoreResult>;
  transitionProcessToInterrupted(args: { processId: string }): Promise<ProcessActionStoreResult>;
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
  appendProcessHistoryItem(args: {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  }): Promise<ProcessHistoryItem>;
  getCurrentProcessRequest(args: { processId: string }): Promise<CurrentProcessRequest | null>;
  getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary>;
  getProcessEnvironmentProviderKind(args: {
    processId: string;
  }): Promise<EnvironmentProviderKind | null>;
  upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  }): Promise<EnvironmentSummary>;
  getProcessWorkingSetFingerprint(args: { processId: string }): Promise<string | null>;
  getCurrentProcessMaterialRefs(args: { processId: string }): Promise<CurrentProcessMaterialRefs>;
  setCurrentProcessMaterialRefs(args: {
    processId: string;
    artifactIds: string[];
    sourceAttachmentIds: string[];
  }): Promise<CurrentProcessMaterialRefs>;
  getProcessHydrationPlan(args: { processId: string }): Promise<WorkingSetPlan | null>;
  setProcessHydrationPlan(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
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
  /**
   * Reads the durable content for one artifact. Used by `LocalProviderAdapter`
   * to materialize artifact content into the working tree during hydration.
   * Returns `null` when the artifact row or its storage blob is missing.
   */
  getArtifactContent(args: { artifactId: string }): Promise<string | null>;
  listProcessReviewTargets(args: {
    projectId: string;
    processId: string;
  }): Promise<ReviewTargetSummary[]>;
  getProcessReviewPackage(args: {
    processId: string;
    packageId: string;
  }): Promise<PackageReviewTarget | null>;
}

function buildDefaultEnvironmentSummary(): EnvironmentSummary {
  return environmentSummarySchema.parse({
    ...defaultEnvironmentSummary,
  });
}

function cloneEnvironmentSummary(summary: EnvironmentSummary): EnvironmentSummary {
  return environmentSummarySchema.parse(summary);
}

function buildArtifactReviewTargetSummary(
  artifact: Pick<ArtifactSummary, 'artifactId' | 'displayName'>,
  position: number,
): ReviewTargetSummary {
  return {
    position,
    targetKind: 'artifact',
    targetId: artifact.artifactId,
    displayName: artifact.displayName,
  };
}

type NodeCryptoModule = {
  createHash(algorithm: 'sha256'): {
    update(value: string): {
      digest(encoding: 'hex'): string;
    };
  };
};

let cachedNodeCryptoModule: NodeCryptoModule | null = null;

function getNodeCryptoModule(): NodeCryptoModule {
  if (cachedNodeCryptoModule !== null) {
    return cachedNodeCryptoModule;
  }

  const builtinModuleLoader = (
    globalThis as typeof globalThis & {
      process?: {
        getBuiltinModule?: (id: string) => unknown;
      };
    }
  ).process?.getBuiltinModule;
  const cryptoModule = builtinModuleLoader?.('node:crypto') as NodeCryptoModule | undefined;

  if (cryptoModule === undefined) {
    throw new Error('node:crypto is unavailable in this runtime.');
  }

  cachedNodeCryptoModule = cryptoModule;
  return cachedNodeCryptoModule;
}

function computeWorkingSetFingerprint(args: {
  artifacts: Array<Pick<ArtifactSummary, 'artifactId' | 'currentVersionLabel'>>;
  outputs: Array<Pick<PlatformProcessOutputSummary, 'outputId' | 'revisionLabel'>>;
  sources: Array<
    Pick<SourceAttachmentSummary, 'sourceAttachmentId' | 'targetRef' | 'hydrationState'>
  >;
  providerKind: EnvironmentProviderKind | null;
}): string {
  const stableJson = JSON.stringify({
    artifacts: [...args.artifacts]
      .sort((left, right) => left.artifactId.localeCompare(right.artifactId))
      .map((artifact) => ({
        artifactId: artifact.artifactId,
        versionLabel: artifact.currentVersionLabel,
      })),
    outputs: [...args.outputs]
      .sort((left, right) => left.outputId.localeCompare(right.outputId))
      .map((output) => ({
        outputId: output.outputId,
        revisionLabel: output.revisionLabel,
      })),
    providerKind: args.providerKind,
    sources: [...args.sources]
      .sort((left, right) => left.sourceAttachmentId.localeCompare(right.sourceAttachmentId))
      .map((source) => ({
        hydrationState: source.hydrationState,
        sourceAttachmentId: source.sourceAttachmentId,
        targetRef: source.targetRef,
      })),
  });

  return getNodeCryptoModule().createHash('sha256').update(stableJson).digest('hex');
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
    providerKind: EnvironmentProviderKind;
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

const markProcessWaitingMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:markProcessWaiting');

const markProcessCompletedMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:markProcessCompleted');

const markProcessFailedMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:markProcessFailed');

const markProcessInterruptedMutation = makeFunctionReference<
  'mutation',
  { processId: string },
  ProcessActionStoreResult
>('processes:markProcessInterrupted');

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

const appendProcessHistoryItemMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  },
  ProcessHistoryItem
>('processHistoryItems:appendProcessHistoryItem');

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

const getProcessEnvironmentProviderKindQuery = makeFunctionReference<
  'query',
  { processId: string },
  EnvironmentProviderKind | null
>('processEnvironmentStates:getProcessEnvironmentProviderKind');

const upsertProcessEnvironmentStateMutation = makeFunctionReference<
  'mutation',
  {
    processId: string;
    providerKind: EnvironmentProviderKind;
    state: EnvironmentSummary['state'];
    environmentId: string | null;
    blockedReason: string | null;
    lastHydratedAt: string | null;
    lastCheckpointAt?: string | null;
    lastCheckpointResult?: EnvironmentSummary['lastCheckpointResult'];
  },
  EnvironmentSummary
>('processEnvironmentStates:upsertProcessEnvironmentState');

const getProcessWorkingSetFingerprintQuery = makeFunctionReference<
  'query',
  { processId: string },
  string | null
>('processEnvironmentStates:getProcessWorkingSetFingerprint');

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

const getProcessHydrationPlanQuery = makeFunctionReference<
  'query',
  { processId: string },
  WorkingSetPlan | null
>('processEnvironmentStates:getProcessHydrationPlan');

const setProcessHydrationPlanMutation = makeFunctionReference<
  'mutation',
  { processId: string; providerKind: EnvironmentProviderKind; plan: WorkingSetPlan },
  WorkingSetPlan
>('processEnvironmentStates:setProcessHydrationPlan');

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

const persistCheckpointArtifactsAction = makeFunctionReference<
  'action',
  {
    apiKey: string;
    processId: string;
    artifacts: ArtifactCheckpointTarget[];
  },
  PlatformProcessOutputSummary[]
>('artifacts:persistCheckpointArtifactsForService');

const fetchArtifactContentAction = makeFunctionReference<
  'action',
  { apiKey: string; artifactId: string },
  string | null
>('artifacts:fetchArtifactContentForService');

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
    providerKind: EnvironmentProviderKind;
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

  async transitionProcessToWaiting(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'waiting',
        phaseLabel: 'Working',
        nextActionLabel: 'Waiting for user response',
        availableActions: ['respond'],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
  }

  async transitionProcessToCompleted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'completed',
        phaseLabel: 'Working',
        nextActionLabel: null,
        availableActions: ['review'],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
  }

  async transitionProcessToFailed(args: { processId: string }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'failed',
        phaseLabel: 'Failed',
        nextActionLabel: 'Investigate failure',
        availableActions: ['review', 'restart'],
        hasEnvironment: false,
        updatedAt: now,
      },
      currentRequest: null,
    };
  }

  async transitionProcessToInterrupted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    const now = new Date().toISOString();

    return {
      process: {
        processId: args.processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status: 'interrupted',
        phaseLabel: 'Working',
        nextActionLabel: 'Choose resume, review, rehydrate, or restart',
        availableActions: ['resume', 'review', 'rehydrate', 'restart'],
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

  async appendProcessHistoryItem(args: {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  }): Promise<ProcessHistoryItem> {
    const now = new Date().toISOString();

    return {
      historyItemId: `${args.processId}:history:${args.kind}:${now}`,
      kind: args.kind,
      lifecycleState: args.lifecycleState ?? 'finalized',
      text: args.text,
      createdAt: now,
      relatedSideWorkId: args.relatedSideWorkId ?? null,
      relatedArtifactId: args.relatedArtifactId ?? null,
    };
  }

  async getCurrentProcessRequest(): Promise<CurrentProcessRequest | null> {
    return null;
  }

  async getProcessEnvironmentSummary(): Promise<EnvironmentSummary> {
    return buildDefaultEnvironmentSummary();
  }

  async getProcessEnvironmentProviderKind(): Promise<EnvironmentProviderKind | null> {
    return null;
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
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

  async getProcessWorkingSetFingerprint(_args: { processId: string }): Promise<string | null> {
    return null;
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
    providerKind: EnvironmentProviderKind;
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

  async hasCanonicalRecoveryMaterials(_args: { processId: string }): Promise<boolean> {
    // `NullPlatformStore` has no durable backing state, so it cannot
    // truthfully claim canonical recovery materials exist.
    return false;
  }

  async getArtifactContent(_args: { artifactId: string }): Promise<string | null> {
    return null;
  }

  async listProcessReviewTargets(): Promise<ReviewTargetSummary[]> {
    return [];
  }

  async getProcessReviewPackage(): Promise<PackageReviewTarget | null> {
    return null;
  }
}

export class ConvexPlatformStore implements PlatformStore {
  private readonly client: ConvexHttpClient;
  private readonly apiKey: string;

  /**
   * `apiKey` authenticates the Fastify control plane to the service-only
   * Convex artifact wrappers. Runtime auth stays scoped to those public
   * wrappers instead of relying on Convex admin auth.
   */
  constructor(convexUrl: string, apiKey: string) {
    this.client = new ConvexHttpClient(convexUrl);
    this.apiKey = apiKey;
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
    providerKind: EnvironmentProviderKind;
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

  async transitionProcessToWaiting(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(markProcessWaitingMutation, args, {
      skipQueue: true,
    });
  }

  async transitionProcessToCompleted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(markProcessCompletedMutation, args, {
      skipQueue: true,
    });
  }

  async transitionProcessToFailed(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(markProcessFailedMutation, args, {
      skipQueue: true,
    });
  }

  async transitionProcessToInterrupted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    return this.client.mutation(markProcessInterruptedMutation, args, {
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

  async appendProcessHistoryItem(args: {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  }): Promise<ProcessHistoryItem> {
    return this.client.mutation(appendProcessHistoryItemMutation, args, {
      skipQueue: true,
    });
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.client.query(getCurrentProcessRequestQuery, args);
  }

  async getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary> {
    return this.client.query(getProcessEnvironmentSummaryQuery, args);
  }

  async getProcessEnvironmentProviderKind(args: {
    processId: string;
  }): Promise<EnvironmentProviderKind | null> {
    return this.client.query(getProcessEnvironmentProviderKindQuery, args);
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
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

  async getProcessWorkingSetFingerprint(args: { processId: string }): Promise<string | null> {
    return this.client.query(getProcessWorkingSetFingerprintQuery, args);
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

  async getProcessHydrationPlan(args: { processId: string }): Promise<WorkingSetPlan | null> {
    return this.client.query(getProcessHydrationPlanQuery, args);
  }

  async setProcessHydrationPlan(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan> {
    return this.client.mutation(setProcessHydrationPlanMutation, args, {
      skipQueue: true,
    });
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
    return this.client.action(persistCheckpointArtifactsAction, {
      apiKey: this.apiKey,
      processId: args.processId,
      artifacts: args.artifacts.map((artifact) => ({
        artifactId: artifact.artifactId,
        producedAt: artifact.producedAt,
        contents: artifact.contents,
        targetLabel: artifact.targetLabel,
      })),
    });
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

  async hasCanonicalRecoveryMaterials(args: { processId: string }): Promise<boolean> {
    const [refs, outputs] = await Promise.all([
      this.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.listProcessOutputs({
        processId: args.processId,
      }),
    ]);

    return refs.artifactIds.length > 0 || refs.sourceAttachmentIds.length > 0 || outputs.length > 0;
  }

  async getArtifactContent(args: { artifactId: string }): Promise<string | null> {
    return this.client.action(fetchArtifactContentAction, {
      apiKey: this.apiKey,
      artifactId: args.artifactId,
    });
  }

  async listProcessReviewTargets(args: {
    projectId: string;
    processId: string;
  }): Promise<ReviewTargetSummary[]> {
    const [artifacts, currentMaterialRefs] = await Promise.all([
      this.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
    ]);
    const reviewableArtifactIds = new Set(currentMaterialRefs.artifactIds);
    const reviewableArtifacts = artifacts
      .filter(
        (artifact) =>
          reviewableArtifactIds.has(artifact.artifactId) && artifact.currentVersionLabel !== null,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const contents = await Promise.all(
      reviewableArtifacts.map((artifact) =>
        this.getArtifactContent({
          artifactId: artifact.artifactId,
        }),
      ),
    );

    return reviewableArtifacts
      .filter((_, index) => contents[index] !== null)
      .map((artifact, index) => buildArtifactReviewTargetSummary(artifact, index));
  }

  async getProcessReviewPackage(): Promise<PackageReviewTarget | null> {
    return null;
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
  private readonly processEnvironmentProviderKindsByProcessId = new Map<
    string,
    EnvironmentProviderKind | null
  >();
  private readonly processWorkingSetFingerprintsByProcessId = new Map<string, string>();
  private readonly currentMaterialRefsByProcessId = new Map<string, CurrentProcessMaterialRefs>();
  private readonly processHydrationPlansByProcessId = new Map<string, WorkingSetPlan>();
  private readonly processOutputsByProcessId = new Map<string, PlatformProcessOutputSummary[]>();
  private readonly reviewPackagesByProcessId = new Map<string, PackageReviewTarget[]>();
  private readonly artifactContentsByArtifactId = new Map<string, string>();
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
      processEnvironmentProviderKindsByProcessId?: Record<string, EnvironmentProviderKind | null>;
      processWorkingSetFingerprintsByProcessId?: Record<string, string | null>;
      currentMaterialRefsByProcessId?: Record<string, CurrentProcessMaterialRefs>;
      processOutputsByProcessId?: Record<string, PlatformProcessOutputSeed[]>;
      reviewPackagesByProcessId?: Record<string, PackageReviewTarget[]>;
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

    for (const [processId, providerKind] of Object.entries(
      args.processEnvironmentProviderKindsByProcessId ?? {},
    )) {
      this.processEnvironmentProviderKindsByProcessId.set(processId, providerKind);
    }

    for (const [processId, fingerprint] of Object.entries(
      args.processWorkingSetFingerprintsByProcessId ?? {},
    )) {
      if (fingerprint !== null) {
        this.processWorkingSetFingerprintsByProcessId.set(processId, fingerprint);
      }
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

    for (const [processId, packages] of Object.entries(args.reviewPackagesByProcessId ?? {})) {
      this.reviewPackagesByProcessId.set(processId, packages);
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

  private findProcessRecord(processId: string): (ProcessSummary & { projectId: string }) | null {
    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      const match = processes.find((process) => process.processId === processId);

      if (match !== undefined) {
        return {
          ...match,
          projectId,
        };
      }
    }

    return null;
  }

  private computeCurrentWorkingSetFingerprint(processId: string): string | null {
    const processRecord = this.findProcessRecord(processId);

    if (processRecord === null) {
      return null;
    }

    const refs = this.currentMaterialRefsByProcessId.get(processId) ?? {
      artifactIds: [],
      sourceAttachmentIds: [],
    };
    const projectArtifacts = this.artifactsByProjectId.get(processRecord.projectId) ?? [];
    const projectSources = this.sourceAttachmentsByProjectId.get(processRecord.projectId) ?? [];
    const artifactIds = new Set(refs.artifactIds);
    const sourceAttachmentIds = new Set(refs.sourceAttachmentIds);

    return computeWorkingSetFingerprint({
      artifacts: projectArtifacts.filter((artifact) => artifactIds.has(artifact.artifactId)),
      outputs: this.processOutputsByProcessId.get(processId) ?? [],
      sources: projectSources.filter((source) =>
        sourceAttachmentIds.has(source.sourceAttachmentId),
      ),
      providerKind: this.processEnvironmentProviderKindsByProcessId.get(processId) ?? null,
    });
  }

  private refreshStoredWorkingSetFingerprint(processId: string): void {
    const fingerprint = this.computeCurrentWorkingSetFingerprint(processId);

    if (fingerprint !== null) {
      this.processWorkingSetFingerprintsByProcessId.set(processId, fingerprint);
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
    providerKind: EnvironmentProviderKind;
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
    this.processEnvironmentProviderKindsByProcessId.set(process.processId, args.providerKind);
    void this.refreshStoredWorkingSetFingerprint(process.processId);
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
    return this.transitionProcessLifecycleInternal(args.processId, 'running');
  }

  async transitionProcessToWaiting(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.transitionProcessLifecycleInternal(args.processId, 'waiting');
  }

  async transitionProcessToCompleted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    return this.transitionProcessLifecycleInternal(args.processId, 'completed');
  }

  async transitionProcessToFailed(args: { processId: string }): Promise<ProcessActionStoreResult> {
    return this.transitionProcessLifecycleInternal(args.processId, 'failed');
  }

  async transitionProcessToInterrupted(args: {
    processId: string;
  }): Promise<ProcessActionStoreResult> {
    return this.transitionProcessLifecycleInternal(args.processId, 'interrupted');
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
    return this.findProcessRecord(args.processId);
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

  async appendProcessHistoryItem(args: {
    processId: string;
    kind: ProcessHistoryItem['kind'];
    lifecycleState?: ProcessHistoryItem['lifecycleState'];
    text: string;
    relatedSideWorkId?: string | null;
    relatedArtifactId?: string | null;
    clientRequestId?: string | null;
  }): Promise<ProcessHistoryItem> {
    const existingHistory = this.processHistoryItemsByProcessId.get(args.processId) ?? [];
    const historyItem: ProcessHistoryItem = {
      historyItemId: `${args.processId}:history-${args.kind}-${existingHistory.length + 1}`,
      kind: args.kind,
      lifecycleState: args.lifecycleState ?? 'finalized',
      text: args.text,
      createdAt: new Date().toISOString(),
      relatedSideWorkId: args.relatedSideWorkId ?? null,
      relatedArtifactId: args.relatedArtifactId ?? null,
    };
    const nextHistory = [...existingHistory, historyItem].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
    this.processHistoryItemsByProcessId.set(args.processId, nextHistory);

    return historyItem;
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.currentRequestsByProcessId.get(args.processId) ?? null;
  }

  async getProcessEnvironmentSummary(args: { processId: string }): Promise<EnvironmentSummary> {
    const summary =
      this.processEnvironmentSummariesByProcessId.get(args.processId) ??
      buildDefaultEnvironmentSummary();
    if (
      summary.state === 'ready' &&
      !this.processWorkingSetFingerprintsByProcessId.has(args.processId)
    ) {
      this.refreshStoredWorkingSetFingerprint(args.processId);
    }
    const storedFingerprint = this.processWorkingSetFingerprintsByProcessId.get(args.processId);
    const currentFingerprint =
      summary.state === 'ready' ? this.computeCurrentWorkingSetFingerprint(args.processId) : null;

    if (
      summary.state === 'ready' &&
      storedFingerprint !== undefined &&
      currentFingerprint !== null &&
      currentFingerprint !== storedFingerprint
    ) {
      return environmentSummarySchema.parse({
        ...summary,
        state: 'stale',
        statusLabel: deriveEnvironmentStatusLabel('stale'),
      });
    }

    return cloneEnvironmentSummary(summary);
  }

  async getProcessEnvironmentProviderKind(args: {
    processId: string;
  }): Promise<EnvironmentProviderKind | null> {
    return this.processEnvironmentProviderKindsByProcessId.get(args.processId) ?? null;
  }

  async upsertProcessEnvironmentState(args: {
    processId: string;
    providerKind: EnvironmentProviderKind;
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
    this.processEnvironmentProviderKindsByProcessId.set(args.processId, args.providerKind);
    void this.refreshStoredWorkingSetFingerprint(args.processId);
    return cloneEnvironmentSummary(next);
  }

  async getProcessWorkingSetFingerprint(args: { processId: string }): Promise<string | null> {
    if (!this.processWorkingSetFingerprintsByProcessId.has(args.processId)) {
      this.refreshStoredWorkingSetFingerprint(args.processId);
    }
    return this.processWorkingSetFingerprintsByProcessId.get(args.processId) ?? null;
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
    providerKind: EnvironmentProviderKind;
    plan: WorkingSetPlan;
  }): Promise<WorkingSetPlan> {
    const next: WorkingSetPlan = {
      artifactIds: [...args.plan.artifactIds],
      sourceAttachmentIds: [...args.plan.sourceAttachmentIds],
      outputIds: [...args.plan.outputIds],
    };
    this.processHydrationPlansByProcessId.set(args.processId, next);
    this.processEnvironmentProviderKindsByProcessId.set(
      args.processId,
      this.processEnvironmentProviderKindsByProcessId.get(args.processId) ?? args.providerKind,
    );
    void this.refreshStoredWorkingSetFingerprint(args.processId);
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

      // Retain content in-memory; in-memory has no separate File Storage layer,
      // but the durability path must not silently drop the contents either.
      this.artifactContentsByArtifactId.set(artifactId, artifact.contents);

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
    const refs = this.currentMaterialRefsByProcessId.get(args.processId) ?? {
      artifactIds: [],
      sourceAttachmentIds: [],
    };
    const outputs = this.processOutputsByProcessId.get(args.processId) ?? [];

    return refs.artifactIds.length > 0 || refs.sourceAttachmentIds.length > 0 || outputs.length > 0;
  }

  /**
   * Test seam: read back artifact content captured by `persistCheckpointArtifacts`.
   * Mirrors the durable Convex `_storage` path so tests can verify content
   * round-trips rather than being silently dropped.
   */
  getArtifactContentForTesting(artifactId: string): string | null {
    return this.artifactContentsByArtifactId.get(artifactId) ?? null;
  }

  async getArtifactContent(args: { artifactId: string }): Promise<string | null> {
    return this.artifactContentsByArtifactId.get(args.artifactId) ?? null;
  }

  async listProcessReviewTargets(args: {
    projectId: string;
    processId: string;
  }): Promise<ReviewTargetSummary[]> {
    const currentMaterialRefs = this.currentMaterialRefsByProcessId.get(args.processId) ?? {
      artifactIds: [],
      sourceAttachmentIds: [],
    };
    const reviewableArtifactIds = new Set(currentMaterialRefs.artifactIds);
    const reviewableArtifacts = (this.artifactsByProjectId.get(args.projectId) ?? [])
      .filter(
        (artifact) =>
          reviewableArtifactIds.has(artifact.artifactId) && artifact.currentVersionLabel !== null,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .filter((artifact) => this.artifactContentsByArtifactId.has(artifact.artifactId));
    const targets = reviewableArtifacts.map((artifact, index) =>
      buildArtifactReviewTargetSummary(artifact, index),
    );
    const packages = this.reviewPackagesByProcessId.get(args.processId) ?? [];

    return [
      ...targets,
      ...packages.map((target, index) => ({
        position: targets.length + index,
        targetKind: 'package' as const,
        targetId: target.packageId,
        displayName: target.displayName,
      })),
    ];
  }

  async getProcessReviewPackage(args: {
    processId: string;
    packageId: string;
  }): Promise<PackageReviewTarget | null> {
    return (
      this.reviewPackagesByProcessId
        .get(args.processId)
        ?.find((target) => target.packageId === args.packageId) ?? null
    );
  }

  /**
   * Test seam: pre-seed artifact content keyed by artifactId so unit tests
   * exercising `LocalProviderAdapter.hydrateEnvironment` can drive the
   * read path without depending on a prior checkpoint write.
   */
  seedArtifactContentForTesting(artifactId: string, content: string): void {
    this.artifactContentsByArtifactId.set(artifactId, content);
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

  private transitionProcessLifecycleInternal(
    processId: string,
    status: 'running' | 'waiting' | 'completed' | 'failed' | 'interrupted',
  ): ProcessActionStoreResult {
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
      const currentRequest =
        status === 'waiting' ? (this.currentRequestsByProcessId.get(processId) ?? null) : null;
      const nextProcess = processSummarySchema.parse({
        ...existing,
        status,
        phaseLabel: resolveLifecyclePhaseLabel(existing.phaseLabel, status),
        nextActionLabel: resolveLifecycleNextActionLabel(status),
        availableActions: resolveLifecycleAvailableActions(status),
        updatedAt: now,
      });
      const nextProcesses = [...processes];
      nextProcesses[index] = nextProcess;
      this.processesByProjectId.set(projectId, nextProcesses);
      this.currentRequestsByProcessId.set(processId, currentRequest);
      this.updateProjectSummary(projectId, (project) => ({
        ...project,
        lastUpdatedAt: now,
      }));

      return {
        process: nextProcess,
        currentRequest,
      };
    }

    const now = new Date().toISOString();
    const currentRequest =
      status === 'waiting' ? (this.currentRequestsByProcessId.get(processId) ?? null) : null;

    return {
      process: processSummarySchema.parse({
        processId,
        displayLabel: 'Unavailable process',
        processType: 'FeatureSpecification',
        status,
        phaseLabel: status === 'failed' ? 'Failed' : 'Working',
        nextActionLabel: resolveLifecycleNextActionLabel(status),
        availableActions: resolveLifecycleAvailableActions(status),
        hasEnvironment: false,
        updatedAt: now,
      }),
      currentRequest,
    };
  }
}

function resolveLifecyclePhaseLabel(
  phaseLabel: string,
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'interrupted',
): string {
  if (status === 'failed') {
    return 'Failed';
  }

  return phaseLabel === 'Draft' || phaseLabel === 'Preparing environment' ? 'Working' : phaseLabel;
}

function resolveLifecycleNextActionLabel(
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'interrupted',
): string | null {
  switch (status) {
    case 'running':
      return 'Monitor progress in the work surface';
    case 'waiting':
      return 'Waiting for user response';
    case 'completed':
      return null;
    case 'failed':
      return 'Investigate failure';
    case 'interrupted':
      return 'Choose resume, review, rehydrate, or restart';
  }
}

function resolveLifecycleAvailableActions(
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'interrupted',
): ProcessSummary['availableActions'] {
  switch (status) {
    case 'running':
      return ['open', 'review'];
    case 'waiting':
      return ['respond'];
    case 'completed':
      return ['review'];
    case 'failed':
      return ['review', 'restart'];
    case 'interrupted':
      return ['resume', 'review', 'rehydrate', 'restart'];
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
