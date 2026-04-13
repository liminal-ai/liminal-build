import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from './platform-store.js';

export class ProjectAccessService {
  constructor(private readonly platformStore: PlatformStore) {}

  async assertProjectAccess(args: { actor: AuthenticatedActor; projectId: string }): Promise<void> {
    const access = await this.platformStore.getProjectAccess({
      userId: args.actor.userId,
      projectId: args.projectId,
    });

    if (access.kind === 'accessible') {
      return;
    }

    if (access.kind === 'forbidden') {
      throw new AppError({
        code: 'PROJECT_FORBIDDEN',
        message: 'The current actor cannot access this project.',
        statusCode: 403,
      });
    }

    throw new AppError({
      code: 'PROJECT_NOT_FOUND',
      message: 'The requested project was not found.',
      statusCode: 404,
    });
  }

  async getProjectAccess(args: { actor: AuthenticatedActor; projectId: string }) {
    return this.platformStore.getProjectAccess({
      userId: args.actor.userId,
      projectId: args.projectId,
    });
  }
}
