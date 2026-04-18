import type { StartProcessResponse } from '../../../shared/contracts/index.js';
import { startProcessResponseSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessLiveHub } from './live/process-live-hub.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { buildProcessSurfaceSummary } from './process-work-surface.service.js';
import type { ProcessAccessService } from './process-access.service.js';
import { planHydrationWorkingSet } from './environment/hydration-planner.js';
import type { ProcessEnvironmentService } from './environment/process-environment.service.js';

export class ProcessStartService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly processEnvironmentService?: ProcessEnvironmentService,
    private readonly defaultEnvironmentProviderKind: 'daytona' | 'local' = 'daytona',
  ) {}

  async start(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<StartProcessResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);

    if (access.process.status !== 'draft') {
      throw new AppError({
        code: 'PROCESS_ACTION_NOT_AVAILABLE',
        message: 'Start is not available for this process right now.',
        statusCode: 409,
      });
    }

    const result = await this.platformStore.startProcess({
      processId: access.process.processId,
    });
    const persistedProviderKind = await this.platformStore.getProcessEnvironmentProviderKind({
      processId: access.process.processId,
    });
    const providerKind = persistedProviderKind ?? this.defaultEnvironmentProviderKind;
    const environment = requiresEnvironmentPreparation(result.process.status)
      ? await this.platformStore.upsertProcessEnvironmentState({
          processId: access.process.processId,
          providerKind,
          state: 'preparing',
          environmentId: null,
          blockedReason: null,
          lastHydratedAt: null,
        })
      : await this.platformStore.getProcessEnvironmentSummary({
          processId: access.process.processId,
        });

    if (requiresEnvironmentPreparation(result.process.status)) {
      const [materialRefs, currentOutputs] = await Promise.all([
        this.platformStore.getCurrentProcessMaterialRefs({
          processId: access.process.processId,
        }),
        this.platformStore.listProcessOutputs({
          processId: access.process.processId,
        }),
      ]);
      await this.platformStore.setProcessHydrationPlan({
        processId: access.process.processId,
        providerKind,
        plan: planHydrationWorkingSet({
          ...materialRefs,
          outputIds: currentOutputs.map((o) => o.outputId),
        }),
      });
      this.processEnvironmentService?.runHydrationAsync({
        projectId: access.project.projectId,
        processId: access.process.processId,
      });
    }

    const process = buildProcessSurfaceSummary(result.process, environment);

    this.processLiveHub.publish({
      projectId: access.project.projectId,
      processId: access.process.processId,
      publication: {
        messageType: isTerminalProcessStatus(process.status) ? 'complete' : 'upsert',
        completedAt: isTerminalProcessStatus(process.status) ? process.updatedAt : null,
        process,
        currentRequest: result.currentRequest,
        environment,
      },
    });

    return startProcessResponseSchema.parse({
      process,
      currentRequest: result.currentRequest,
      environment,
    });
  }
}

function isTerminalProcessStatus(status: StartProcessResponse['process']['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'interrupted';
}

function requiresEnvironmentPreparation(
  status: StartProcessResponse['process']['status'],
): boolean {
  return status !== 'completed' && status !== 'failed' && status !== 'waiting';
}
