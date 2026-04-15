import type {
  SubmitProcessResponseRequest,
  SubmitProcessResponseResponse,
} from '../../../shared/contracts/index.js';
import {
  submitProcessResponseRequestSchema,
  submitProcessResponseResponseSchema,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { buildProcessSurfaceSummary } from './process-work-surface.service.js';
import type { ProcessAccessService } from './process-access.service.js';

export class ProcessResponseService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
  ) {}

  async respond(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    body: unknown;
  }): Promise<SubmitProcessResponseResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const parsedBody = submitProcessResponseRequestSchema.safeParse(args.body);

    if (!parsedBody.success) {
      throw new AppError({
        code: 'INVALID_PROCESS_RESPONSE',
        message: 'Submitted response must include a non-empty clientRequestId and message.',
        statusCode: 422,
      });
    }

    const normalizedRequest = this.normalizeRequest(parsedBody.data);
    const existing = await this.platformStore.getSubmittedProcessResponse({
      processId: access.process.processId,
      clientRequestId: normalizedRequest.clientRequestId,
    });

    if (existing !== null) {
      return submitProcessResponseResponseSchema.parse({
        accepted: true,
        historyItemId: existing.historyItem.historyItemId,
        process: buildProcessSurfaceSummary(existing.process),
        currentRequest: existing.currentRequest,
      });
    }

    if (!access.process.availableActions.includes('respond')) {
      throw new AppError({
        code: 'PROCESS_ACTION_NOT_AVAILABLE',
        message: 'Respond is not available for this process right now.',
        statusCode: 409,
      });
    }

    try {
      const result = await this.platformStore.submitProcessResponse({
        processId: access.process.processId,
        ...normalizedRequest,
      });

      return submitProcessResponseResponseSchema.parse({
        accepted: true,
        historyItemId: result.historyItem.historyItemId,
        process: buildProcessSurfaceSummary(result.process),
        currentRequest: result.currentRequest,
      });
    } catch (_error) {
      throw new AppError({
        code: 'PROCESS_ACTION_FAILED',
        message:
          'The process response could not be completed right now. Try again or reload the page.',
        statusCode: 500,
      });
    }
  }

  private normalizeRequest(request: SubmitProcessResponseRequest): SubmitProcessResponseRequest {
    return {
      clientRequestId: request.clientRequestId.trim(),
      message: request.message.trim(),
    };
  }
}
