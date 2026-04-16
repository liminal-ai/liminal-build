import type { WorkingSetPlan } from '../../projects/platform-store.js';

export interface HydrationResult {
  environmentId: string;
  lastHydratedAt: string;
}

export interface ProviderAdapter {
  hydrateEnvironment(args: { processId: string; plan: WorkingSetPlan }): Promise<HydrationResult>;
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
}
