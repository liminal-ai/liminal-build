import { AppError } from '../../../errors/app-error.js';
import { notImplementedErrorCode } from '../../../errors/codes.js';
import type { ExecutionResult, ProviderAdapter } from './provider-adapter.js';

export class ScriptExecutionService {
  constructor(private readonly providerAdapter: ProviderAdapter) {}

  async executeFor(args: { processId: string; environmentId: string }): Promise<ExecutionResult> {
    void this.providerAdapter;
    void args;

    throw new AppError({
      code: notImplementedErrorCode,
      message: 'Script execution is not implemented yet.',
      statusCode: 501,
    });
  }
}
