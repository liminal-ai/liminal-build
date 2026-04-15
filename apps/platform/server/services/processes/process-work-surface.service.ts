import type {
  CurrentProcessRequest,
  ProcessArtifactReference,
  ProcessMaterialsSectionEnvelope,
  ProcessHistorySectionEnvelope,
  ProcessHistoryItem,
  ProcessSourceReference,
  ProcessSurfaceSummary,
  ProcessWorkSurfaceResponse,
  ProcessSummary,
  SideWorkItem,
  SideWorkSectionEnvelope,
} from '../../../shared/contracts/index.js';
import {
  buildProcessSurfaceControls,
  defaultEnvironmentSummary,
  processHistorySectionEnvelopeSchema,
  processMaterialsSectionEnvelopeSchema,
  processSurfaceProjectSchema,
  processSurfaceSummarySchema,
  processWorkSurfaceResponseSchema,
  sideWorkSectionEnvelopeSchema,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { notImplementedErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import { HistorySectionReader } from './readers/history-section.reader.js';
import { MaterialsSectionReader } from './readers/materials-section.reader.js';
import { SideWorkSectionReader } from './readers/side-work-section.reader.js';
import { SectionError } from '../../errors/section-error.js';
import type { ProcessAccessService } from './process-access.service.js';

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
      code: notImplementedErrorCode,
      message: 'Process work-surface bootstrap is not implemented in Story 0.',
      statusCode: 501,
    });
  }
}

export function deriveProcessSurfaceAvailableActions(
  status: ProcessSummary['status'],
): ProcessSurfaceSummary['availableActions'] {
  switch (status) {
    case 'draft':
      return ['start'];
    case 'running':
      return ['review'];
    case 'waiting':
      return ['respond'];
    case 'paused':
      return ['resume'];
    case 'completed':
      return ['review'];
    case 'failed':
      return ['review', 'restart'];
    case 'interrupted':
      return ['resume', 'review', 'restart'];
    default:
      return [];
  }
}

export function buildProcessSurfaceSummary(process: ProcessSummary): ProcessSurfaceSummary {
  const availableActions = deriveProcessSurfaceAvailableActions(process.status);

  return processSurfaceSummarySchema.parse({
    processId: process.processId,
    displayLabel: process.displayLabel,
    processType: process.processType,
    status: process.status,
    phaseLabel: process.phaseLabel,
    nextActionLabel: process.nextActionLabel,
    availableActions,
    controls: buildProcessSurfaceControls({
      availableActions,
    }),
    hasEnvironment: process.hasEnvironment,
    updatedAt: process.updatedAt,
  });
}

export class DefaultProcessWorkSurfaceService implements ProcessWorkSurfaceService {
  private readonly historySectionReader: HistorySectionReader;
  private readonly materialsSectionReader: MaterialsSectionReader;
  private readonly sideWorkSectionReader: SideWorkSectionReader;

  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    readers: {
      historySectionReader?: HistorySectionReader;
      materialsSectionReader?: MaterialsSectionReader;
      sideWorkSectionReader?: SideWorkSectionReader;
    } = {},
  ) {
    this.historySectionReader =
      readers.historySectionReader ?? new HistorySectionReader(platformStore);
    this.materialsSectionReader =
      readers.materialsSectionReader ?? new MaterialsSectionReader(platformStore);
    this.sideWorkSectionReader =
      readers.sideWorkSectionReader ?? new SideWorkSectionReader(platformStore);
  }

  async getSurface(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<ProcessWorkSurfaceResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const [history, materials, currentRequest, sideWork] = await Promise.all([
      this.readHistory(args.processId),
      this.readMaterials(args.projectId, args.processId),
      this.platformStore.getCurrentProcessRequest({
        processId: args.processId,
      }),
      this.readSideWork(args.processId),
    ]);

    return processWorkSurfaceResponseSchema.parse({
      project: processSurfaceProjectSchema.parse({
        projectId: access.project.projectId,
        name: access.project.name,
        role: access.project.role,
      }),
      process: buildProcessSurfaceSummary(access.process),
      history,
      materials,
      currentRequest,
      sideWork,
      environment: defaultEnvironmentSummary,
    });
  }

  private async readHistory(processId: string): Promise<ProcessHistorySectionEnvelope> {
    try {
      return await this.historySectionReader.read({ processId });
    } catch (error) {
      return processHistorySectionEnvelopeSchema.parse({
        status: 'error',
        items: [],
        error: {
          code: 'PROCESS_SURFACE_HISTORY_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Process history failed to load.'),
        },
      });
    }
  }

  private async readMaterials(
    projectId: string,
    processId: string,
  ): Promise<ProcessMaterialsSectionEnvelope> {
    try {
      return await this.materialsSectionReader.read({
        projectId,
        processId,
      });
    } catch (error) {
      return processMaterialsSectionEnvelopeSchema.parse({
        status: 'error',
        currentArtifacts: [],
        currentOutputs: [],
        currentSources: [],
        error: {
          code: 'PROCESS_SURFACE_MATERIALS_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Process materials failed to load.'),
        },
      });
    }
  }

  private async readSideWork(processId: string): Promise<SideWorkSectionEnvelope> {
    try {
      return await this.sideWorkSectionReader.read({ processId });
    } catch (error) {
      return sideWorkSectionEnvelopeSchema.parse({
        status: 'error',
        items: [],
        error: {
          code: 'PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Side work failed to load.'),
        },
      });
    }
  }

  private getSectionMessage(error: unknown, fallback: string): string {
    if (error instanceof SectionError) {
      return error.message;
    }

    if (error instanceof Error && error.message.length > 0) {
      return error.message;
    }

    return fallback;
  }
}
