import type { ProjectShellResponse } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import { buildEmptyProjectShellResponse, type PlatformStore } from './platform-store.js';

export class ProjectCreateService {
  constructor(private readonly platformStore: PlatformStore) {}

  async createProject(args: {
    actor: AuthenticatedActor;
    name: string | undefined;
  }): Promise<ProjectShellResponse> {
    const name = args.name?.trim() ?? '';

    if (name.length === 0) {
      throw new AppError({
        code: 'INVALID_PROJECT_NAME',
        message: 'Project name is required.',
        statusCode: 422,
      });
    }

    const result = await this.platformStore.createProject({
      ownerUserId: args.actor.userId,
      name,
    });

    if (result.kind === 'name_conflict') {
      throw new AppError({
        code: 'PROJECT_NAME_CONFLICT',
        message: `You already own a project named "${name}".`,
        statusCode: 409,
      });
    }

    return buildEmptyProjectShellResponse(result.project);
  }
}
