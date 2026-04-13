import type { CreateProcessResponse } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { story0NotImplementedErrorCode } from '../../errors/codes.js';

export class ProcessRegistrationService {
  async createProcess(): Promise<CreateProcessResponse> {
    throw new AppError({
      code: story0NotImplementedErrorCode,
      message: 'Process registration is intentionally deferred beyond Story 0.',
      statusCode: 501,
    });
  }
}
