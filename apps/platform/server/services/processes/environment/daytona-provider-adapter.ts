import { AppError } from '../../../errors/app-error.js';
import { notImplementedErrorCode } from '../../../errors/codes.js';
import type {
  EnsureEnvironmentArgs,
  EnsuredEnvironment,
  ExecuteEnvironmentScriptArgs,
  ExecutionResult,
  HydrationPlan,
  HydrationResult,
  ProviderAdapter,
  ProviderKind,
} from './provider-adapter.js';

const notImplementedMessage =
  "Daytona provider not implemented yet — see Epic 3 Implementation Addendum, 'out of scope (still)'";

function notImplemented(): never {
  throw new AppError({
    code: notImplementedErrorCode,
    message: notImplementedMessage,
    statusCode: 503,
  });
}

/**
 * Typed skeleton for the hosted Daytona provider. Every method throws
 * `NOT_IMPLEMENTED` so the registry can resolve `providerKind: 'daytona'`
 * to a real type-checked adapter while real hosted-Daytona auth/SDK work
 * remains research-gated. Real implementation is post-Epic-3.
 */
export class DaytonaProviderAdapter implements ProviderAdapter {
  readonly providerKind: ProviderKind = 'daytona';

  async ensureEnvironment(_args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment> {
    return notImplemented();
  }

  async hydrateEnvironment(_args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return notImplemented();
  }

  async executeScript(_args: ExecuteEnvironmentScriptArgs): Promise<ExecutionResult> {
    return notImplemented();
  }

  async rehydrateEnvironment(_args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return notImplemented();
  }

  async rebuildEnvironment(_args: {
    processId: string;
    providerKind: ProviderKind;
    plan: HydrationPlan;
  }): Promise<HydrationResult & EnsuredEnvironment> {
    return notImplemented();
  }

  async teardownEnvironment(_args: { environmentId: string }): Promise<void> {
    return notImplemented();
  }
}
