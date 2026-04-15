import type { ResumeProcessResponse } from '../../../shared/contracts/index.js';
import { resumeProcessResponseSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessLiveHub } from './live/process-live-hub.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { buildProcessSurfaceSummary } from './process-work-surface.service.js';
import type { ProcessAccessService } from './process-access.service.js';

export class ProcessResumeService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    private readonly processLiveHub: ProcessLiveHub,
  ) {}

  async resume(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<ResumeProcessResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);

    if (access.process.status !== 'paused' && access.process.status !== 'interrupted') {
      throw new AppError({
        code: 'PROCESS_ACTION_NOT_AVAILABLE',
        message: 'Resume is not available for this process right now.',
        statusCode: 409,
      });
    }

    const result = await this.platformStore.resumeProcess({
      processId: access.process.processId,
    });
    const process = buildProcessSurfaceSummary(result.process);

    this.processLiveHub.publish({
      projectId: access.project.projectId,
      processId: access.process.processId,
      publication: {
        messageType: isTerminalProcessStatus(process.status) ? 'complete' : 'upsert',
        completedAt: isTerminalProcessStatus(process.status) ? process.updatedAt : null,
        process,
        currentRequest: result.currentRequest,
      },
    });

    return resumeProcessResponseSchema.parse({
      process,
      currentRequest: result.currentRequest,
    });
  }
}

function isTerminalProcessStatus(status: ResumeProcessResponse['process']['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'interrupted';
}
