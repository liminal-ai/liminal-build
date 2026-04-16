import type { EnvironmentSummary } from '../../../../shared/contracts/index.js';
import type { PlatformStore } from '../../projects/platform-store.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import { buildProcessSurfaceSummary } from '../process-work-surface.service.js';
import type { CheckpointPlanner } from './checkpoint-planner.js';
import type { CodeCheckpointWriter } from './code-checkpoint-writer.js';
import type { ProviderAdapter } from './provider-adapter.js';
import type { ScriptExecutionService } from './script-execution.service.js';

export class ProcessEnvironmentService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly providerAdapter: ProviderAdapter,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly scriptExecutionService?: ScriptExecutionService,
    private readonly checkpointPlanner?: CheckpointPlanner,
    private readonly codeCheckpointWriter?: CodeCheckpointWriter,
    private readonly artifactCheckpointPersistence: Pick<
      PlatformStore,
      'persistCheckpointArtifacts'
    > = platformStore,
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
    const scriptExecutionService = this.scriptExecutionService;

    if (scriptExecutionService === undefined || args.environmentId === null) {
      return;
    }

    const environmentId = args.environmentId;

    setTimeout(() => {
      void this.executeExecution({
        ...args,
        environmentId,
        scriptExecutionService,
      });
    }, 0);
  }

  private async executeExecution(args: {
    projectId: string;
    processId: string;
    environmentId: string;
    scriptExecutionService: ScriptExecutionService;
  }): Promise<void> {
    const currentProcess = await this.platformStore.getProcessRecord({
      processId: args.processId,
    });

    if (currentProcess === null) {
      return;
    }

    let lastHydratedAt: string | null = null;

    try {
      const existingEnvironment = await this.platformStore.getProcessEnvironmentSummary({
        processId: args.processId,
      });
      lastHydratedAt = existingEnvironment.lastHydratedAt;
      const runningEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'running',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt,
      });
      this.processLiveHub.publish({
        projectId: args.projectId,
        processId: args.processId,
        publication: {
          messageType: 'upsert',
          process: buildProcessSurfaceSummary(currentProcess, runningEnvironment),
          environment: runningEnvironment,
        },
      });

      const executionResult = await args.scriptExecutionService.executeFor({
        processId: args.processId,
        environmentId: args.environmentId,
      });

      if (executionResult.outcome === 'failed') {
        const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: executionResult.failureReason ?? 'Execution failed.',
          lastHydratedAt: runningEnvironment.lastHydratedAt,
        });
        this.processLiveHub.publish({
          projectId: args.projectId,
          processId: args.processId,
          publication: {
            messageType: 'upsert',
            process: buildProcessSurfaceSummary(currentProcess, failedEnvironment),
            environment: failedEnvironment,
          },
        });
        return;
      }

      const checkpointingEnvironment = await this.platformStore.upsertProcessEnvironmentState({
        processId: args.processId,
        providerKind: null,
        state: 'checkpointing',
        environmentId: args.environmentId,
        blockedReason: null,
        lastHydratedAt: runningEnvironment.lastHydratedAt,
      });
      this.processLiveHub.publish({
        projectId: args.projectId,
        processId: args.processId,
        publication: {
          messageType: 'upsert',
          process: buildProcessSurfaceSummary(currentProcess, checkpointingEnvironment),
          environment: checkpointingEnvironment,
        },
      });

      if (
        this.checkpointPlanner !== undefined ||
        this.codeCheckpointWriter !== undefined ||
        this.artifactCheckpointPersistence !== this.platformStore
      ) {
        this.runCheckpointAsync({
          projectId: args.projectId,
          processId: args.processId,
          environmentId: args.environmentId,
        });
      }
    } catch (error) {
      try {
        const failedEnvironment = await this.platformStore.upsertProcessEnvironmentState({
          processId: args.processId,
          providerKind: null,
          state: 'failed',
          environmentId: args.environmentId,
          blockedReason: error instanceof Error ? error.message : 'Unknown execution error',
          lastHydratedAt,
        });
        this.processLiveHub.publish({
          projectId: args.projectId,
          processId: args.processId,
          publication: {
            messageType: 'upsert',
            process: buildProcessSurfaceSummary(currentProcess, failedEnvironment),
            environment: failedEnvironment,
          },
        });
      } catch {
        // Execution failures must not escape the fire-and-forget path.
      }
    }
  }

  private runCheckpointAsync(args: {
    projectId: string;
    processId: string;
    environmentId: string;
  }): void {
    void args;
    throw new Error('NOT_IMPLEMENTED: ProcessEnvironmentService.runCheckpointAsync');
  }
}
