import type { WorkingSetPlan } from '../../projects/platform-store.js';
import type { CheckpointCandidate } from './checkpoint-types.js';

export interface HydrationResult {
  environmentId: string;
  lastHydratedAt: string;
}

export interface EnsuredEnvironment {
  environmentId: string;
  createdAt?: string;
  workspaceHandle?: string;
}

export interface ExecutionResult {
  outcome: 'succeeded' | 'failed';
  completedAt: string;
  failureReason?: string;
}

export interface ProviderAdapter {
  hydrateEnvironment(args: { processId: string; plan: WorkingSetPlan }): Promise<HydrationResult>;
  executeScript(args: { processId: string; environmentId: string }): Promise<ExecutionResult>;
  collectCheckpointCandidate(args: {
    processId: string;
    environmentId: string;
  }): Promise<CheckpointCandidate>;
  rehydrateEnvironment(args: {
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<HydrationResult>;
  rebuildEnvironment(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<EnsuredEnvironment>;
}

/**
 * In-memory fake provider. Resolves immediately with a deterministic
 * environmentId derived from the processId. Used in tests and as the default
 * when no real provider is configured.
 */
export class InMemoryProviderAdapter implements ProviderAdapter {
  async hydrateEnvironment(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<HydrationResult> {
    return {
      environmentId: `env-mem-${args.processId}`,
      lastHydratedAt: new Date().toISOString(),
    };
  }

  async executeScript(_args: {
    processId: string;
    environmentId: string;
  }): Promise<ExecutionResult> {
    return {
      outcome: 'succeeded',
      completedAt: new Date().toISOString(),
    };
  }

  async collectCheckpointCandidate(args: {
    processId: string;
    environmentId: string;
  }): Promise<CheckpointCandidate> {
    return {
      artifacts: [
        {
          artifactId: `${args.processId}:artifact-checkpoint-1`,
          producedAt: new Date().toISOString(),
          contents: `artifact checkpoint contents for ${args.environmentId}`,
          targetLabel: 'Generated artifact checkpoint',
        },
      ],
      codeDiffs: [
        {
          sourceAttachmentId: `${args.processId}:source-checkpoint-1`,
          targetRef: 'main',
          diff: `diff --git a/${args.processId}.md b/${args.processId}.md`,
        },
      ],
    };
  }

  async rehydrateEnvironment(args: {
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<HydrationResult> {
    return {
      environmentId: args.environmentId,
      lastHydratedAt: new Date().toISOString(),
    };
  }

  async rebuildEnvironment(args: {
    processId: string;
    plan: WorkingSetPlan;
  }): Promise<EnsuredEnvironment> {
    return {
      environmentId: `env-rebuilt-${args.processId}`,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Always-failing provider adapter. Used in tests to drive the `failed`
 * environment state path without any external dependencies.
 */
export class FailingProviderAdapter implements ProviderAdapter {
  constructor(private readonly reason: string = 'Hydration failed in test') {}

  async hydrateEnvironment(_args: { processId: string; plan: WorkingSetPlan }): Promise<never> {
    throw new Error(this.reason);
  }

  async executeScript(_args: { processId: string; environmentId: string }): Promise<never> {
    throw new Error(this.reason);
  }

  async collectCheckpointCandidate(_args: {
    processId: string;
    environmentId: string;
  }): Promise<never> {
    throw new Error(this.reason);
  }

  async rehydrateEnvironment(_args: {
    processId: string;
    environmentId: string;
    plan: WorkingSetPlan;
  }): Promise<never> {
    throw new Error(this.reason);
  }

  async rebuildEnvironment(_args: { processId: string; plan: WorkingSetPlan }): Promise<never> {
    throw new Error(this.reason);
  }
}
