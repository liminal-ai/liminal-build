import type { ExecutionResult, ProviderAdapter } from './provider-adapter.js';

export class ScriptExecutionService {
  constructor(private readonly providerAdapter: ProviderAdapter) {}

  async executeFor(args: { processId: string; environmentId: string }): Promise<ExecutionResult> {
    return this.providerAdapter.executeScript(args);
  }
}
