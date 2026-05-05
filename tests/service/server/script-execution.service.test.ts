import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  LocalProviderAdapter,
  type LocalProviderRuntime,
} from '../../../apps/platform/server/services/processes/environment/local-provider-adapter.js';
import { SingleAdapterRegistry } from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import type {
  ExecutionResult,
  ProviderAdapter,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { ScriptExecutionService } from '../../../apps/platform/server/services/processes/environment/script-execution.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';

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
    resolveCandidateContents: vi.fn(async ({ ref }) => ref),
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

  it('default payload emits workspace outputs without synthetic archive entries on the local execution path', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'liminal-build-script-exec-'));
    const runtime: LocalProviderRuntime = {
      cloneSource: async ({ destination }) => {
        await fs.mkdir(destination, { recursive: true });
        await fs.writeFile(path.join(destination, 'README.md'), '# cloned', 'utf8');
        return null;
      },
      runScript: async ({ workingTree, scriptPath }) =>
        await new Promise<number>((resolve) => {
          const child = spawn('node', ['--experimental-strip-types', scriptPath], {
            cwd: workingTree,
            stdio: 'pipe',
          });
          child.on('error', () => resolve(1));
          child.on('close', (code) => resolve(code ?? 1));
        }),
    };
    const provider = new LocalProviderAdapter(new InMemoryPlatformStore(), {
      workspaceRoot,
      runtime,
    });
    const ensured = await provider.ensureEnvironment({
      processId: 'process-script-exec-default-1',
      providerKind: 'local',
    });

    await provider.hydrateEnvironment({
      environmentId: ensured.environmentId,
      plan: {
        fingerprint: 'fp-script-exec-default-1',
        artifactInputs: [],
        outputInputs: [],
        sourceInputs: [
          {
            sourceAttachmentId: 'source-script-exec-default-1',
            displayName: 'liminal-build',
            repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
            targetRef: 'feature/default-runtime',
            accessMode: 'read_write',
          },
        ],
      },
    });

    try {
      const service = new ScriptExecutionService(new SingleAdapterRegistry(provider));

      await expect(
        service.executeFor({
          providerKind: 'local',
          environmentId: ensured.environmentId,
          processContext: {
            processId: 'process-script-exec-default-1',
            displayLabel: 'Feature implementation sandbox',
            processType: 'FeatureImplementation',
            status: 'running',
          },
          currentSources: [
            {
              sourceAttachmentId: 'source-script-exec-default-1',
              displayName: 'liminal-build',
              targetRef: 'feature/default-runtime',
              accessMode: 'read_write',
            },
          ],
        }),
      ).resolves.toMatchObject({
        processStatus: 'completed',
        usedSourceAttachmentIds: ['source-script-exec-default-1'],
        archiveEntries: [],
        artifactCheckpointCandidates: [
          expect.objectContaining({
            displayName: 'Feature Implementation Runtime Brief',
            revisionLabel: 'feature-implementation-runtime-v1',
            contentsRef: 'artifacts/feature-implementation-runtime-brief.md',
          }),
        ],
        codeCheckpointCandidates: [
          expect.objectContaining({
            sourceAttachmentId: 'source-script-exec-default-1',
            displayName: 'liminal-build',
            targetRef: 'feature/default-runtime',
            accessMode: 'read_write',
            workspaceRef:
              'sources/source-script-exec-default-1-liminal-build/notes/liminal-feature-implementation-runtime.md',
            filePath: 'notes/liminal-feature-implementation-runtime.md',
            commitMessage: 'Record feature implementation runtime note',
          }),
        ],
      });
    } finally {
      await provider.teardownEnvironment({
        environmentId: ensured.environmentId,
      });
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
