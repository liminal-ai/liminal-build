import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { ProjectAccessService } from '../projects/project-access.service.js';
import type { ProcessSummary, ProjectSummary } from '../../../shared/contracts/index.js';

export type ProcessAccessResult =
  | {
      kind: 'accessible';
      project: ProjectSummary;
      process: ProcessSummary;
    }
  | {
      kind: 'forbidden';
    }
  | {
      kind: 'project_not_found';
    }
  | {
      kind: 'process_not_found';
    };

export class ProcessAccessService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getProcessAccess(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<ProcessAccessResult> {
    const projectAccess = await this.projectAccessService.getProjectAccess({
      actor: args.actor,
      projectId: args.projectId,
    });

    if (projectAccess.kind === 'forbidden') {
      return {
        kind: 'forbidden',
      };
    }

    if (projectAccess.kind === 'not_found') {
      return {
        kind: 'project_not_found',
      };
    }

    const processRecord = await this.platformStore.getProcessRecord({
      processId: args.processId,
    });

    if (processRecord === null || processRecord.projectId !== args.projectId) {
      return {
        kind: 'process_not_found',
      };
    }

    return {
      kind: 'accessible',
      project: projectAccess.project,
      process: processRecord,
    };
  }

  async assertProcessAccess(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
  }): Promise<Extract<ProcessAccessResult, { kind: 'accessible' }>> {
    const access = await this.getProcessAccess(args);

    if (access.kind === 'accessible') {
      return access;
    }

    if (access.kind === 'forbidden') {
      throw new AppError({
        code: 'PROJECT_FORBIDDEN',
        message: 'You do not have access to this process.',
        statusCode: 403,
      });
    }

    if (access.kind === 'project_not_found') {
      throw new AppError({
        code: 'PROJECT_NOT_FOUND',
        message: 'The requested project was not found.',
        statusCode: 404,
      });
    }

    throw new AppError({
      code: 'PROCESS_NOT_FOUND',
      message: 'The requested process could not be found.',
      statusCode: 404,
    });
  }
}
