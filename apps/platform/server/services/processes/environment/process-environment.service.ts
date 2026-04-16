import type { EnvironmentSummary } from '../../../../shared/contracts/index.js';
import { AppError } from '../../../errors/app-error.js';
import { notImplementedErrorCode } from '../../../errors/codes.js';
import type { PlatformStore } from '../../projects/platform-store.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import { buildProcessSurfaceSummary } from '../process-work-surface.service.js';
import type { ProviderAdapter } from './provider-adapter.js';
import type { ScriptExecutionService } from './script-execution.service.js';

export class ProcessEnvironmentService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly providerAdapter: ProviderAdapter,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly scriptExecutionService?: ScriptExecutionService,
  ) {}

  /**
   * Executes environment hydration work and publishes the outcome (`ready` or
   * `failed`) to live subscribers. On success, also transitions the process to
   * `running` and includes the updated process in the live publication.
   * Designed to be called fire-and-forget after the HTTP handler responds with
   * `preparing` — the caller must NOT await this method.
   */
  runHydrationAsync(args: { projectId: string; processId: string }): void {
    void this.executeHydration(args);
  }

  private async executeHydration(args: { projectId: string; processId: string }): Promise<void> {
    const [plan, existing] = await Promise.all([
      this.platformStore.getProcessHydrationPlan({ processId: args.processId }),
      this.platformStore.getProcessEnvironmentSummary({ processId: args.processId }),
    ]);

    const resolvedPlan = plan ?? { artifactIds: [], sourceAttachmentIds: [], outputIds: [] };

    let hydratedEnvironment: EnvironmentSummary | null = null;
    let hydrationError: string | null = null;

    try {
      const result = await this.providerAdapter.hydrateEnvironment({
        processId: args.processId,
        plan: resolvedPlan,
      });
      hydratedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'ready',
        environmentId: result.environmentId,
        blockedReason: null,
        lastHydratedAt: result.lastHydratedAt,
      });
    } catch (error) {
      hydrationError = error instanceof Error ? error.message : 'Unknown hydration error';
    }

    if (hydratedEnvironment !== null) {
      const transitionResult = await this.platformStore.transitionProcessToRunning({
        processId: args.processId,
      });
      this.processLiveHub.publish({
        projectId: args.projectId,
        processId: args.processId,
        publication: {
          messageType: 'upsert',
          process: buildProcessSurfaceSummary(transitionResult.process, hydratedEnvironment),
          environment: hydratedEnvironment,
        },
      });

      try {
        this.runExecutionAsync({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: hydratedEnvironment.environmentId,
        });
      } catch {
        // RED phase: keep the hydration success path legible while execution is still stubbed.
      }
    } else {
      const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'failed',
        environmentId: existing.environmentId,
        blockedReason: hydrationError,
        lastHydratedAt: existing.lastHydratedAt,
      });
      this.processLiveHub.publish({
        projectId: args.projectId,
        processId: args.processId,
        publication: {
          messageType: 'upsert',
          environment: failedEnvironment,
        },
      });
    }
  }

  private runExecutionAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string | null;
  }): void {
    void this.scriptExecutionService;
    void args;

    throw new AppError({
      code: notImplementedErrorCode,
      message: 'Environment execution is not implemented yet.',
      statusCode: 501,
    });
  }
}
