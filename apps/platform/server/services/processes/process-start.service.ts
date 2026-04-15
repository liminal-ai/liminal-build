import type { StartProcessResponse } from '../../../shared/contracts/index.js';
import { startProcessResponseSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { buildProcessSurfaceSummary } from './process-work-surface.service.js';
import type { ProcessAccessService } from './process-access.service.js';

export class ProcessStartService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
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

    return startProcessResponseSchema.parse({
      process: buildProcessSurfaceSummary(result.process),
      currentRequest: result.currentRequest,
    });
  }
}
