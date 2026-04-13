import type { ProjectShellResponse } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { story0NotImplementedErrorCode } from '../../errors/codes.js';

export class ProjectShellService {
  async getShell(): Promise<ProjectShellResponse> {
    throw new AppError({
      code: story0NotImplementedErrorCode,
      message: 'Project shell bootstrap behavior is scaffolded in Story 0 only.',
      statusCode: 501,
    });
  }
}
