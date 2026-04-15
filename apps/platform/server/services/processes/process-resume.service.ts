import type { ResumeProcessResponse } from '../../../shared/contracts/index.js';
import { resumeProcessResponseSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { buildProcessSurfaceSummary } from './process-work-surface.service.js';
import type { ProcessAccessService } from './process-access.service.js';

export class ProcessResumeService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
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

    return resumeProcessResponseSchema.parse({
      process: buildProcessSurfaceSummary(result.process),
      currentRequest: result.currentRequest,
    });
  }
}
