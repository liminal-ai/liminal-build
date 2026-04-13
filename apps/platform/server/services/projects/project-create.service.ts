import type { ProjectShellResponse } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { story0NotImplementedErrorCode } from '../../errors/codes.js';

export class ProjectCreateService {
  async createProject(): Promise<ProjectShellResponse> {
    throw new AppError({
      code: story0NotImplementedErrorCode,
      message: 'Project creation is intentionally deferred beyond Story 0 scaffolding.',
      statusCode: 501,
    });
  }
}
