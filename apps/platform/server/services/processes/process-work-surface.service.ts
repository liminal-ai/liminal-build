import type {
  CurrentProcessRequest,
  EnvironmentSummary,
  ProcessArtifactReference,
  ProcessMaterialsSectionEnvelope,
  ProcessHistorySectionEnvelope,
  ProcessHistoryItem,
  ProcessSurfaceControlActionId,
  ProcessSourceReference,
  ProcessSurfaceSummary,
  ProcessWorkSurfaceResponse,
  ProcessSummary,
  SideWorkItem,
  SideWorkSectionEnvelope,
} from '../../../shared/contracts/index.js';
import {
  buildProcessSurfaceControls,
  deriveEnvironmentStatusLabel,
  defaultEnvironmentSummary,
  environmentSummarySchema,
  processSurfaceControlOrder,
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
import { EnvironmentSectionReader } from './readers/environment-section.reader.js';
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

const fallbackEnvironmentSummary = environmentSummarySchema.parse({
  ...defaultEnvironmentSummary,
});

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

function isRestartEligible(status: ProcessSummary['status']): boolean {
  return status === 'failed' || status === 'interrupted';
}

function disabledState(reason: string): { enabled: false; disabledReason: string } {
  return {
    enabled: false,
    disabledReason: reason,
  };
}

function enabledState(): { enabled: true; disabledReason: null } {
  return {
    enabled: true,
    disabledReason: null,
  };
}

function resolveStartControlState(environment: EnvironmentSummary): {
  enabled: boolean;
  disabledReason: string | null;
} {
  switch (environment.state) {
    case 'absent':
    case 'ready':
      return enabledState();
    case 'preparing':
      return disabledState('Start is unavailable while the environment is preparing.');
    case 'running':
      return disabledState('Start is unavailable while the environment is already running.');
    case 'checkpointing':
      return disabledState('Start is unavailable while checkpointing is settling.');
    case 'stale':
      return disabledState('Rehydrate the environment before starting the process.');
    case 'failed':
      return disabledState('Recover the environment before starting the process.');
    case 'lost':
      return disabledState('Rebuild the environment before starting the process.');
    case 'rebuilding':
      return disabledState('Start is unavailable while the environment is rebuilding.');
    case 'unavailable':
      return disabledState(
        environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
      );
  }
}

function resolveResumeControlState(environment: EnvironmentSummary): {
  enabled: boolean;
  disabledReason: string | null;
} {
  switch (environment.state) {
    case 'absent':
    case 'ready':
      return enabledState();
    case 'preparing':
      return disabledState('Resume is unavailable while the environment is preparing.');
    case 'running':
      return disabledState('Resume is unavailable while the environment is already running.');
    case 'checkpointing':
      return disabledState('Resume is unavailable while checkpointing is settling.');
    case 'stale':
      return disabledState('Rehydrate the environment before resuming the process.');
    case 'failed':
      return disabledState('Recover the environment before resuming the process.');
    case 'lost':
      return disabledState('Rebuild the environment before resuming the process.');
    case 'rebuilding':
      return disabledState('Resume is unavailable while the environment is rebuilding.');
    case 'unavailable':
      return disabledState(
        environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
      );
  }
}

function resolveRestartControlState(args: {
  process: ProcessSummary;
  environment: EnvironmentSummary;
}): { enabled: boolean; disabledReason: string | null } {
  if (!isRestartEligible(args.process.status)) {
    return disabledState('Restart is only available after the process fails or is interrupted.');
  }

  switch (args.environment.state) {
    case 'preparing':
      return disabledState('Restart is unavailable while the environment is preparing.');
    case 'running':
      return disabledState('Restart is unavailable while the environment is actively running.');
    case 'checkpointing':
      return disabledState('Restart is unavailable while checkpointing is settling.');
    case 'rebuilding':
      return disabledState('Restart is unavailable while the environment is rebuilding.');
    default:
      return enabledState();
  }
}

function resolveRehydrateControlState(environment: EnvironmentSummary): {
  enabled: boolean;
  disabledReason: string | null;
} {
  switch (environment.state) {
    case 'stale':
      return enabledState();
    case 'failed':
      return environment.environmentId === null
        ? disabledState('Rehydrate is unavailable because no recoverable working copy remains.')
        : enabledState();
    case 'lost':
      return disabledState('Rehydrate is unavailable because no recoverable working copy remains.');
    case 'absent':
      return disabledState('Rehydrate is unavailable because no working copy exists yet.');
    case 'preparing':
      return disabledState('Rehydrate is unavailable while the environment is preparing.');
    case 'ready':
      return disabledState(
        'Rehydrate is only available when the environment is stale or recoverably failed.',
      );
    case 'running':
      return disabledState('Rehydrate is unavailable while the environment is actively running.');
    case 'checkpointing':
      return disabledState('Rehydrate is unavailable while checkpointing is settling.');
    case 'rebuilding':
      return disabledState('Rehydrate is unavailable while the environment is rebuilding.');
    case 'unavailable':
      return disabledState(
        environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
      );
  }
}

function resolveRebuildControlState(environment: EnvironmentSummary): {
  enabled: boolean;
  disabledReason: string | null;
} {
  switch (environment.state) {
    case 'lost':
    case 'failed':
      return enabledState();
    case 'absent':
      return disabledState(
        'Rebuild is unavailable because no prior working copy has been created.',
      );
    case 'preparing':
      return disabledState('Rebuild is unavailable while the environment is preparing.');
    case 'ready':
      return disabledState(
        'Rebuild is only available after the environment is lost or unrecoverable.',
      );
    case 'running':
      return disabledState('Rebuild is unavailable while the environment is actively running.');
    case 'checkpointing':
      return disabledState('Rebuild is unavailable while checkpointing is settling.');
    case 'stale':
      return disabledState(
        'Rebuild is only available after the environment is lost or unrecoverable.',
      );
    case 'rebuilding':
      return disabledState('Rebuild is already in progress.');
    case 'unavailable':
      return disabledState(
        environment.blockedReason ?? 'Environment lifecycle work is currently unavailable.',
      );
  }
}

function resolveControlState(args: {
  actionId: ProcessSurfaceControlActionId;
  process: ProcessSummary;
  environment: EnvironmentSummary;
}): { enabled: boolean; disabledReason: string | null } {
  switch (args.actionId) {
    case 'start':
      return args.process.status === 'draft'
        ? resolveStartControlState(args.environment)
        : disabledState('Start is only available while the process is in Draft.');
    case 'respond':
      return args.process.status === 'waiting'
        ? enabledState()
        : disabledState('Respond is only available when the process is waiting for input.');
    case 'resume':
      return args.process.status === 'paused' || args.process.status === 'interrupted'
        ? resolveResumeControlState(args.environment)
        : disabledState('Resume is only available when the process is paused or interrupted.');
    case 'rehydrate':
      return resolveRehydrateControlState(args.environment);
    case 'rebuild':
      return resolveRebuildControlState(args.environment);
    case 'review':
      return args.process.status === 'running' ||
        args.process.status === 'completed' ||
        args.process.status === 'failed' ||
        args.process.status === 'interrupted'
        ? enabledState()
        : disabledState('Review is only available once the process has produced work to inspect.');
    case 'restart':
      return resolveRestartControlState(args);
  }
}

function deriveProcessSurfaceHasEnvironment(
  process: ProcessSummary,
  environment: EnvironmentSummary,
): boolean {
  switch (environment.state) {
    case 'absent':
    case 'lost':
      return false;
    case 'unavailable':
      return process.hasEnvironment || environment.environmentId !== null;
    default:
      return true;
  }
}

export function buildProcessSurfaceSummary(
  process: ProcessSummary,
  environment: EnvironmentSummary = fallbackEnvironmentSummary,
): ProcessSurfaceSummary {
  const controlStates = processSurfaceControlOrder.map((actionId) => ({
    actionId,
    ...resolveControlState({
      actionId,
      process,
      environment,
    }),
  }));
  const availableActions = controlStates
    .filter((control) => control.enabled)
    .map((control) => control.actionId);
  const disabledReasons = Object.fromEntries(
    controlStates
      .filter((control) => !control.enabled && control.disabledReason !== null)
      .map((control) => [control.actionId, control.disabledReason]),
  ) as Partial<Record<ProcessSurfaceControlActionId, string>>;

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
      disabledReasons,
    }),
    hasEnvironment: deriveProcessSurfaceHasEnvironment(process, environment),
    updatedAt: process.updatedAt,
  });
}

export class DefaultProcessWorkSurfaceService implements ProcessWorkSurfaceService {
  private readonly historySectionReader: HistorySectionReader;
  private readonly materialsSectionReader: MaterialsSectionReader;
  private readonly sideWorkSectionReader: SideWorkSectionReader;
  private readonly environmentSectionReader: EnvironmentSectionReader;

  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    readers: {
      historySectionReader?: HistorySectionReader;
      materialsSectionReader?: MaterialsSectionReader;
      sideWorkSectionReader?: SideWorkSectionReader;
      environmentSectionReader?: EnvironmentSectionReader;
    } = {},
  ) {
    this.historySectionReader =
      readers.historySectionReader ?? new HistorySectionReader(platformStore);
    this.materialsSectionReader =
      readers.materialsSectionReader ?? new MaterialsSectionReader(platformStore);
    this.sideWorkSectionReader =
      readers.sideWorkSectionReader ?? new SideWorkSectionReader(platformStore);
    this.environmentSectionReader =
      readers.environmentSectionReader ?? new EnvironmentSectionReader(platformStore);
  }

  async getSurface(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<ProcessWorkSurfaceResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const [history, materials, currentRequest, sideWork, environment] = await Promise.all([
      this.readHistory(args.processId),
      this.readMaterials(args.projectId, args.processId),
      this.platformStore.getCurrentProcessRequest({
        processId: args.processId,
      }),
      this.readSideWork(args.processId),
      this.readEnvironment(args.processId),
    ]);

    return processWorkSurfaceResponseSchema.parse({
      project: processSurfaceProjectSchema.parse({
        projectId: access.project.projectId,
        name: access.project.name,
        role: access.project.role,
      }),
      process: buildProcessSurfaceSummary(access.process, environment),
      history,
      materials,
      currentRequest,
      sideWork,
      environment,
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

  private async readEnvironment(processId: string): Promise<EnvironmentSummary> {
    try {
      return await this.environmentSectionReader.read({ processId });
    } catch (error) {
      return environmentSummarySchema.parse({
        ...defaultEnvironmentSummary,
        state: 'unavailable',
        statusLabel: deriveEnvironmentStatusLabel('unavailable'),
        blockedReason: this.getSectionMessage(
          error,
          'Environment lifecycle work is currently unavailable.',
        ),
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
