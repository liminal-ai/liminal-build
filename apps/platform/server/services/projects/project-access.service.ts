import { AppError } from '../../errors/app-error.js';
import { story0NotImplementedErrorCode } from '../../errors/codes.js';

export class ProjectAccessService {
  async assertProjectAccess(_args: { actorId: string; projectId: string }): Promise<void> {
    throw new AppError({
      code: story0NotImplementedErrorCode,
      message: 'Project access checks are scaffolded in Story 0 but not implemented yet.',
      statusCode: 501,
    });
  }
}
