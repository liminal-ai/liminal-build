import type { ProcessHistoryItem, SourceAccessMode } from '../../../../shared/contracts/index.js';

export type ProviderKind = 'daytona' | 'local';

export interface EnsureEnvironmentArgs {
  processId: string;
  providerKind: ProviderKind;
}

export interface EnsuredEnvironment {
  providerKind: ProviderKind;
  environmentId: string;
  workspaceHandle: string;
}

export interface HydrationPlanArtifactInput {
  artifactId: string;
  displayName: string;
  versionLabel: string | null;
}

export interface HydrationPlanOutputInput {
  outputId: string;
  displayName: string;
  revisionLabel: string | null;
}

export interface HydrationPlanSourceInput {
  sourceAttachmentId: string;
  displayName: string;
  targetRef: string | null;
  accessMode: SourceAccessMode;
}

export interface HydrationPlan {
  fingerprint: string;
  artifactInputs: HydrationPlanArtifactInput[];
  outputInputs: HydrationPlanOutputInput[];
  sourceInputs: HydrationPlanSourceInput[];
}

export interface HydrationResult {
  environmentId: string;
  hydratedAt: string;
  fingerprint: string;
}

export interface ScriptPayload {
  format: 'ts-module-source';
  entrypoint: 'default';
  source: string;
}

export interface ExecuteEnvironmentScriptArgs {
  environmentId: string;
  scriptPayload: ScriptPayload;
}

export interface PlatformProcessOutputWriteInput {
  outputId?: string;
  linkedArtifactId: string | null;
  displayName: string;
  revisionLabel: string | null;
  state: string;
  updatedAt?: string;
}

export interface PlatformSideWorkWriteInput {
  sideWorkId?: string;
  displayLabel: string;
  purposeSummary: string;
  status: 'running' | 'completed' | 'failed';
  resultSummary: string | null;
  updatedAt?: string;
}

export interface ArtifactCheckpointCandidate {
  artifactId: string;
  displayName: string;
  revisionLabel: string | null;
  contentsRef: string;
}

export interface CodeCheckpointCandidate {
  sourceAttachmentId: string;
  displayName: string;
  targetRef: string | null;
  accessMode: SourceAccessMode;
  workspaceRef: string;
}

export type ProcessExecutionStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'interrupted';

export interface ExecutionResult {
  processStatus: ProcessExecutionStatus;
  processHistoryItems: ProcessHistoryItem[];
  outputWrites: PlatformProcessOutputWriteInput[];
  sideWorkWrites: PlatformSideWorkWriteInput[];
  artifactCheckpointCandidates: ArtifactCheckpointCandidate[];
  codeCheckpointCandidates: CodeCheckpointCandidate[];
}

export interface ProviderAdapter {
  readonly providerKind: ProviderKind;
  ensureEnvironment(args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment>;
  hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult>;
  executeScript(args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult>;
  rehydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult>;
  rebuildEnvironment(args: {
    processId: string;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<HydrationResult & EnsuredEnvironment>;
  teardownEnvironment(args: { environmentId: string }): Promise<void>;
}

/**
 * In-memory test fake. Produces deterministic results in the new spec'd
 * `ExecutionResult` shape for unit tests and fixture-driven scenarios. NOT
 * wired as the production provider — production resolves a real adapter via
 * the registry.
 */
export class InMemoryProviderAdapter implements ProviderAdapter {
  readonly providerKind: ProviderKind = 'local';
  private readonly processIdByEnvironmentId = new Map<string, string>();

  async ensureEnvironment(args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment> {
    const environmentId = `env-mem-${args.processId}`;
    this.processIdByEnvironmentId.set(environmentId, args.processId);
    return {
      providerKind: args.providerKind,
      environmentId,
      workspaceHandle: `workspace-mem-${args.processId}`,
    };
  }

  async hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return {
      environmentId: args.environmentId,
      hydratedAt: new Date().toISOString(),
      fingerprint: args.plan.fingerprint,
    };
  }

  async executeScript(args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult> {
    const recordedProcessId = this.processIdByEnvironmentId.get(args.environmentId);
    const processId =
      recordedProcessId ??
      (args.environmentId.startsWith('env-mem-')
        ? args.environmentId.slice('env-mem-'.length)
        : args.environmentId.startsWith('env-rebuilt-')
          ? args.environmentId.slice('env-rebuilt-'.length)
          : args.environmentId);

    return {
      processStatus: 'completed',
      processHistoryItems: [],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [
        {
          artifactId: `${processId}:artifact-checkpoint-1`,
          displayName: 'Generated artifact checkpoint',
          revisionLabel: null,
          contentsRef: `mem://${args.environmentId}/${processId}-artifact-1.md`,
        },
      ],
      codeCheckpointCandidates: [
        {
          sourceAttachmentId: `${processId}:source-checkpoint-1`,
          displayName: `${processId} source`,
          targetRef: 'main',
          accessMode: 'read_write',
          workspaceRef: `mem://${args.environmentId}/${processId}-source-1.diff`,
        },
      ],
    };
  }

  async rehydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return {
      environmentId: args.environmentId,
      hydratedAt: new Date().toISOString(),
      fingerprint: args.plan.fingerprint,
    };
  }

  async rebuildEnvironment(args: {
    processId: string;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<HydrationResult & EnsuredEnvironment> {
    const environmentId = `env-rebuilt-${args.processId}`;
    this.processIdByEnvironmentId.set(environmentId, args.processId);
    return {
      providerKind: args.providerKind,
      environmentId,
      workspaceHandle: `workspace-rebuilt-${args.processId}`,
      hydratedAt: new Date().toISOString(),
      fingerprint: args.plan.fingerprint,
    };
  }

  async teardownEnvironment(args: { environmentId: string }): Promise<void> {
    this.processIdByEnvironmentId.delete(args.environmentId);
  }
}

/**
 * Always-failing provider adapter. Used in tests to drive the `failed`
 * environment state path without any external dependencies. Like
 * `InMemoryProviderAdapter`, NOT wired as the production provider.
 */
export class FailingProviderAdapter implements ProviderAdapter {
  readonly providerKind: ProviderKind = 'local';

  constructor(private readonly reason: string = 'Hydration failed in test') {}

  async ensureEnvironment(_args: EnsureEnvironmentArgs): Promise<never> {
    throw new Error(this.reason);
  }

  async hydrateEnvironment(_args: { environmentId: string; plan: HydrationPlan }): Promise<never> {
    throw new Error(this.reason);
  }

  async executeScript(_args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult> {
    return {
      processStatus: 'failed',
      processHistoryItems: [
        {
          historyItemId: `failing-provider:${Date.now()}`,
          kind: 'process_event',
          lifecycleState: 'finalized',
          text: this.reason,
          createdAt: new Date().toISOString(),
          relatedSideWorkId: null,
          relatedArtifactId: null,
        } satisfies ProcessHistoryItem,
      ],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [],
      codeCheckpointCandidates: [],
    };
  }

  async rehydrateEnvironment(_args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<never> {
    throw new Error(this.reason);
  }

  async rebuildEnvironment(_args: {
    processId: string;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<never> {
    throw new Error(this.reason);
  }

  async teardownEnvironment(_args: { environmentId: string }): Promise<void> {
    return;
  }
}
