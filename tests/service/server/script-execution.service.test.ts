import { describe, expect, it, vi } from 'vitest';
import { SingleAdapterRegistry } from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import type {
  ExecutionResult,
  ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { ScriptExecutionService } from '../../../apps/platform/server/services/processes/environment/script-execution.service.js';

function buildProvider(result: ExecutionResult): ProviderAdapter {
  return {
    providerKind: 'local',
    ensureEnvironment: vi.fn(async ({ providerKind }) => ({
      providerKind,
      environmentId: 'environment-ensured-001',
      workspaceHandle: 'workspace-ensured-001',
    })),
    hydrateEnvironment: vi.fn(async ({ plan }) => ({
      environmentId: 'environment-hydrated-001',
      hydratedAt: '2026-04-15T12:00:00.000Z',
      fingerprint: plan.fingerprint,
    })),
    executeScript: vi.fn(async () => result),
    rehydrateEnvironment: vi.fn(async ({ plan }) => ({
      environmentId: 'environment-hydrated-001',
      hydratedAt: '2026-04-15T12:00:00.000Z',
      fingerprint: plan.fingerprint,
    })),
    rebuildEnvironment: vi.fn(async ({ providerKind, plan }) => ({
      providerKind,
      environmentId: 'environment-rebuilt-001',
      workspaceHandle: 'workspace-rebuilt-001',
      hydratedAt: '2026-04-15T12:00:00.000Z',
      fingerprint: plan.fingerprint,
    })),
    teardownEnvironment: vi.fn(async () => undefined),
  };
}

describe('script execution service', () => {
  it('calls provider.executeScript with the env id and a script payload, resolving the adapter from the registry', async () => {
    const provider = buildProvider({
      processStatus: 'completed',
      processHistoryItems: [],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [],
      codeCheckpointCandidates: [],
    });
    const service = new ScriptExecutionService(new SingleAdapterRegistry(provider));

    await service.executeFor({
      providerKind: 'local',
      environmentId: 'environment-execution-001',
    });

    expect(provider.executeScript).toHaveBeenCalledWith({
      environmentId: 'environment-execution-001',
      scriptPayload: expect.objectContaining({
        format: 'ts-module-source',
        entrypoint: 'default',
        source: expect.any(String),
      }),
    });
  });

  it("returns the provider's ExecutionResult unchanged", async () => {
    const providerResult: ExecutionResult = {
      processStatus: 'failed',
      processHistoryItems: [
        {
          historyItemId: 'failure-event-1',
          kind: 'process_event',
          lifecycleState: 'finalized',
          text: 'Execution failed in the provider.',
          createdAt: '2026-04-15T12:02:00.000Z',
          relatedSideWorkId: null,
          relatedArtifactId: null,
        },
      ],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [],
      codeCheckpointCandidates: [],
    };
    const provider = buildProvider(providerResult);
    const service = new ScriptExecutionService(new SingleAdapterRegistry(provider));

    await expect(
      service.executeFor({
        providerKind: 'local',
        environmentId: 'environment-execution-002',
      }),
    ).resolves.toEqual(providerResult);
  });
});
