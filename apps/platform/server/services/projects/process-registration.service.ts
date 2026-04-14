import {
  type CreateProcessResponse,
  supportedProcessTypeSchema,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from './platform-store.js';
import type { ProcessDisplayLabelService } from './process-display-label.service.js';

export class ProcessRegistrationService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processDisplayLabelService: ProcessDisplayLabelService,
  ) {}

  async createProcess(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processType: string | undefined;
  }): Promise<CreateProcessResponse> {
    void args.actor;

    const parsedProcessType = supportedProcessTypeSchema.safeParse(args.processType);
    if (!parsedProcessType.success) {
      throw new AppError({
        code: 'INVALID_PROCESS_TYPE',
        message: 'The requested process type is not supported.',
        statusCode: 422,
      });
    }

    const displayLabel = await this.processDisplayLabelService.nextLabel({
      projectId: args.projectId,
      processType: parsedProcessType.data,
    });
    const result = await this.platformStore.createProcess({
      projectId: args.projectId,
      processType: parsedProcessType.data,
      displayLabel,
    });

    return {
      process: result.process,
    };
  }
}
