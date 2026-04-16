import { describe, expect, it, vi } from 'vitest';
import { ScriptExecutionService } from '../../../apps/platform/server/services/processes/environment/script-execution.service.js';
import type {
  ExecutionResult,
  ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';

function buildProvider(result: ExecutionResult): ProviderAdapter {
  return {
    hydrateEnvironment: vi.fn(async () => ({
      environmentId: 'environment-hydrated-001',
      lastHydratedAt: '2026-04-15T12:00:00.000Z',
    })),
    executeScript: vi.fn(async () => result),
    collectCheckpointCandidate: vi.fn(async () => ({
      artifacts: [],
      codeDiffs: [],
    })),
  };
}

describe('script execution service', () => {
  it('calls provider.executeScript with correct args', async () => {
    const provider = buildProvider({
      outcome: 'succeeded',
      completedAt: '2026-04-15T12:01:00.000Z',
    });
    const service = new ScriptExecutionService(provider);

    await service.executeFor({
      processId: 'process-execution-001',
      environmentId: 'environment-execution-001',
    });

    expect(provider.executeScript).toHaveBeenCalledWith({
      processId: 'process-execution-001',
      environmentId: 'environment-execution-001',
    });
  });

  it("returns the provider's result unchanged", async () => {
    const providerResult: ExecutionResult = {
      outcome: 'failed',
      completedAt: '2026-04-15T12:02:00.000Z',
      failureReason: 'Execution failed in the provider.',
    };
    const provider = buildProvider(providerResult);
    const service = new ScriptExecutionService(provider);

    await expect(
      service.executeFor({
        processId: 'process-execution-002',
        environmentId: 'environment-execution-002',
      }),
    ).resolves.toEqual(providerResult);
  });
});
