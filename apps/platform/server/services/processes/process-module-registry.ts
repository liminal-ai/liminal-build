import type {
  ProcessArtifactReference,
  ProcessHistoryItem,
  ProcessOutputReference,
  ProcessSourceReference,
  SideWorkItem,
  SupportedProcessType,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { notImplementedErrorCode } from '../../errors/codes.js';
import type {
  ProcessActionResult,
  ProcessSurfaceProjection,
} from './process-work-surface.service.js';

export interface ProcessWorkSurfaceModule<TState = unknown> {
  processType: SupportedProcessType;
  getState(args: { processId: string }): Promise<TState | null>;
  buildSurfaceProjection(args: {
    processId: string;
    state: TState;
    visibleHistory: ProcessHistoryItem[];
    sideWork: SideWorkItem[];
    outputs: ProcessOutputReference[];
    artifactLookup: Map<ProcessArtifactReference['artifactId'], ProcessArtifactReference>;
    sourceLookup: Map<ProcessSourceReference['sourceAttachmentId'], ProcessSourceReference>;
  }): Promise<ProcessSurfaceProjection> | ProcessSurfaceProjection;
  start(args: { processId: string; state: TState; actorId: string }): Promise<ProcessActionResult>;
  resume(args: { processId: string; state: TState; actorId: string }): Promise<ProcessActionResult>;
  respond(args: {
    processId: string;
    state: TState;
    actorId: string;
    message: string;
    clientRequestId: string;
  }): Promise<ProcessActionResult>;
}

export class ProcessModuleRegistry {
  private readonly modules = new Map<SupportedProcessType, ProcessWorkSurfaceModule<unknown>>();

  constructor(modules: ProcessWorkSurfaceModule<unknown>[] = []) {
    for (const module of modules) {
      this.register(module);
    }
  }

  register(module: ProcessWorkSurfaceModule<unknown>): void {
    this.modules.set(module.processType, module);
  }

  get(processType: SupportedProcessType): ProcessWorkSurfaceModule<unknown> {
    const module = this.modules.get(processType);

    if (module === undefined) {
      throw new AppError({
        code: notImplementedErrorCode,
        message: `No process work-surface module is registered for ${processType}.`,
        statusCode: 501,
      });
    }

    return module;
  }

  list(): SupportedProcessType[] {
    return [...this.modules.keys()];
  }
}
