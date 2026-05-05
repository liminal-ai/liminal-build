import type {
  SubmitProcessResponseRequest,
  SubmitProcessResponseResponse,
} from '../../../shared/contracts/index.js';
import {
  submitProcessResponseRequestSchema,
  submitProcessResponseResponseSchema,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { ArchiveFinalizationService } from '../archive/archive-finalization.service.js';
import { buildAcceptedUserResponseArchiveFinalizationKey } from '../archive/process-history-compat.service.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { ProcessLiveHub } from './live/process-live-hub.js';
import type { ProcessAccessService } from './process-access.service.js';
import { buildProcessSurfaceSummaryWithReviewability } from './process-work-surface.service.js';

export class ProcessResponseService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    private readonly processLiveHub: ProcessLiveHub,
    private readonly archiveFinalizationService: Pick<
      ArchiveFinalizationService,
      'appendFinalizedEntry'
    > = new ArchiveFinalizationService(platformStore),
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
      await this.archiveAcceptedUserResponse({
        projectId: access.project.projectId,
        processId: access.process.processId,
        historyItem: existing.historyItem,
      });
      const environment = await this.platformStore.getProcessEnvironmentSummary({
        processId: access.process.processId,
      });
      const process = await buildProcessSurfaceSummaryWithReviewability({
        platformStore: this.platformStore,
        projectId: access.project.projectId,
        process: existing.process,
        environment,
      });

      return submitProcessResponseResponseSchema.parse({
        accepted: true,
        historyItemId: existing.historyItem.historyItemId,
        process,
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
      await this.archiveAcceptedUserResponse({
        projectId: access.project.projectId,
        processId: access.process.processId,
        historyItem: result.historyItem,
      });
      const environment = await this.platformStore.getProcessEnvironmentSummary({
        processId: access.process.processId,
      });
      const process = await buildProcessSurfaceSummaryWithReviewability({
        platformStore: this.platformStore,
        projectId: access.project.projectId,
        process: result.process,
        environment,
      });

      this.processLiveHub.publish({
        projectId: access.project.projectId,
        processId: access.process.processId,
        publication: {
          messageType: isTerminalProcessStatus(process.status) ? 'complete' : 'upsert',
          completedAt: isTerminalProcessStatus(process.status) ? process.updatedAt : null,
          process,
          historyItems: [result.historyItem],
          currentRequest: result.currentRequest,
          environment,
        },
      });

      return submitProcessResponseResponseSchema.parse({
        accepted: true,
        historyItemId: result.historyItem.historyItemId,
        process,
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

  private async archiveAcceptedUserResponse(args: {
    projectId: string;
    processId: string;
    historyItem: {
      historyItemId: string;
      text: string;
      createdAt: string;
    };
  }): Promise<void> {
    const bodyText = args.historyItem.text.trim();

    await this.archiveFinalizationService.appendFinalizedEntry({
      projectId: args.projectId,
      processId: args.processId,
      entryKind: 'user_message',
      finalizationKey: buildAcceptedUserResponseArchiveFinalizationKey(
        args.historyItem.historyItemId,
      ),
      sourceObjectId: args.historyItem.historyItemId,
      bodyText,
      bodyData: null,
      bodyFormat: bodyText.length > 0 ? 'plain_text' : 'none',
      relatedArtifactVersionId: null,
      relatedSourceProvenanceId: null,
      relatedToolCallId: null,
      entryStatus: 'ready',
      degradationReason: null,
      recordedAt: args.historyItem.createdAt,
    });
  }
}

function isTerminalProcessStatus(
  status: SubmitProcessResponseResponse['process']['status'],
): boolean {
  return status === 'completed' || status === 'failed' || status === 'interrupted';
}
