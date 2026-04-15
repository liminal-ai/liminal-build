import type {
  CurrentProcessRequest,
  ProcessArtifactReference,
  ProcessHistoryItem,
  ProcessSourceReference,
  ProcessSurfaceSummary,
  ProcessWorkSurfaceResponse,
  SideWorkItem,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { story0NotImplementedErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';

export interface ProcessSurfaceProjection {
  process: ProcessSurfaceSummary;
  currentRequest: CurrentProcessRequest | null;
  materialRefs: {
    artifactIds: ProcessArtifactReference['artifactId'][];
    sourceAttachmentIds: ProcessSourceReference['sourceAttachmentId'][];
  };
}

export interface ProcessActionResult {
  process: ProcessSurfaceSummary;
  currentRequest: CurrentProcessRequest | null;
  historyItemsToPublish: ProcessHistoryItem[];
  sideWorkToPublish: SideWorkItem[];
  materialSectionsChanged: boolean;
}

export interface ProcessWorkSurfaceService {
  getSurface(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<ProcessWorkSurfaceResponse>;
}

export class NotImplementedProcessWorkSurfaceService implements ProcessWorkSurfaceService {
  async getSurface(): Promise<ProcessWorkSurfaceResponse> {
    throw new AppError({
      code: story0NotImplementedErrorCode,
      message: 'Process work-surface bootstrap is not implemented in Story 0.',
      statusCode: 501,
    });
  }
}
