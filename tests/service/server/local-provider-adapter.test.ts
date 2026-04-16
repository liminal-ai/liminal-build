import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ARTIFACTS_SUBDIR,
  LocalProviderAdapter,
  type LocalProviderRuntime,
  SCRIPT_ENTRYPOINT_FILENAME,
  SCRIPT_RESULT_FILENAME,
  SOURCES_SUBDIR,
} from '../../../apps/platform/server/services/processes/environment/local-provider-adapter.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';

async function makeWorkspaceRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'liminal-build-test-local-'));
  return root;
}

async function safeRm(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
}

describe('LocalProviderAdapter', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await makeWorkspaceRoot();
  });

  afterEach(async () => {
    await safeRm(workspaceRoot);
  });

  it('ensureEnvironment creates a directory under the workspace root with the local- env id pattern', async () => {
    const platformStore = new InMemoryPlatformStore();
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });

    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-ensure-1',
      providerKind: 'local',
    });

    expect(ensured.providerKind).toBe('local');
    expect(ensured.environmentId).toMatch(/^local-proc-ensure-1-[0-9a-f]{8}$/);
    expect(ensured.workspaceHandle).toBe(path.join(workspaceRoot, ensured.environmentId));

    const stat = await fs.stat(ensured.workspaceHandle);
    expect(stat.isDirectory()).toBe(true);
  });

  it('hydrateEnvironment writes artifact content from PlatformStore into the working tree', async () => {
    const platformStore = new InMemoryPlatformStore();
    platformStore.seedArtifactContentForTesting('artifact-hydrate-1', '# Hydrated artifact body');
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-hydrate-1',
      providerKind: 'local',
    });

    const result = await adapter.hydrateEnvironment({
      environmentId: ensured.environmentId,
      plan: {
        fingerprint: 'fp-hydrate-1',
        artifactInputs: [
          {
            artifactId: 'artifact-hydrate-1',
            displayName: 'Hydrated Artifact.md',
            versionLabel: 'v1',
          },
        ],
        outputInputs: [],
        sourceInputs: [],
      },
    });

    expect(result.environmentId).toBe(ensured.environmentId);
    expect(result.fingerprint).toBe('fp-hydrate-1');
    expect(typeof result.hydratedAt).toBe('string');

    const artifactsDir = path.join(ensured.workspaceHandle, ARTIFACTS_SUBDIR);
    const entries = await fs.readdir(artifactsDir);
    expect(entries).toHaveLength(1);
    const fileContent = await fs.readFile(path.join(artifactsDir, entries[0] ?? ''), 'utf8');
    expect(fileContent).toBe('# Hydrated artifact body');
  });

  it('hydrateEnvironment clones a source attachment via the runtime hook', async () => {
    const platformStore = new InMemoryPlatformStore();
    const cloneCalls: Array<{ repoUrl: string; targetRef: string | null; destination: string }> =
      [];
    const runtime: LocalProviderRuntime = {
      cloneSource: async (args) => {
        cloneCalls.push(args);
        await fs.mkdir(args.destination, { recursive: true });
        await fs.writeFile(path.join(args.destination, 'README.md'), '# cloned', 'utf8');
        return null;
      },
      runScript: async () => 0,
    };
    const adapter = new LocalProviderAdapter(platformStore, {
      workspaceRoot,
      runtime,
    });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-source-clone-1',
      providerKind: 'local',
    });

    await adapter.hydrateEnvironment({
      environmentId: ensured.environmentId,
      plan: {
        fingerprint: 'fp-clone',
        artifactInputs: [],
        outputInputs: [],
        sourceInputs: [
          {
            sourceAttachmentId: 'source-clone-1',
            displayName: 'https://example.invalid/repo.git',
            targetRef: 'main',
            accessMode: 'read_write',
          },
        ],
      },
    });

    expect(cloneCalls).toHaveLength(1);
    expect(cloneCalls[0]?.repoUrl).toBe('https://example.invalid/repo.git');
    expect(cloneCalls[0]?.targetRef).toBe('main');

    const sourcesDir = path.join(ensured.workspaceHandle, SOURCES_SUBDIR);
    const sourceDirs = await fs.readdir(sourcesDir);
    expect(sourceDirs).toHaveLength(1);
    const cloned = await fs.readFile(
      path.join(sourcesDir, sourceDirs[0] ?? '', 'README.md'),
      'utf8',
    );
    expect(cloned).toBe('# cloned');
  });

  it('hydrateEnvironment fails fast when a source clone returns an error', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => 'git clone failed: simulated network unreachable',
      runScript: async () => 0,
    };
    const adapter = new LocalProviderAdapter(platformStore, {
      workspaceRoot,
      runtime,
    });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-clone-fail-1',
      providerKind: 'local',
    });

    let caught: unknown;
    try {
      await adapter.hydrateEnvironment({
        environmentId: ensured.environmentId,
        plan: {
          fingerprint: 'fp',
          artifactInputs: [],
          outputInputs: [],
          sourceInputs: [
            {
              sourceAttachmentId: 'source-clone-fail-1',
              displayName: 'https://example.invalid/missing.git',
              targetRef: null,
              accessMode: 'read_only',
            },
          ],
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/clone of /);
    expect((caught as Error).message).toMatch(/simulated network unreachable/);
  });

  it('executeScript runs a real Node script that writes a result file and returns the parsed ExecutionResult', async () => {
    const platformStore = new InMemoryPlatformStore();
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-1',
      providerKind: 'local',
    });

    // The default runtime spawns `node --experimental-strip-types`. Provide a
    // valid TS source that writes the result file. Using JSON output keeps the
    // test independent of the local Node TypeScript flag interpretation.
    const source = `
      const { promises: fs } = require('node:fs');
      const path = require('node:path');
      const result = {
        processStatus: 'completed',
        processHistoryItems: [],
        outputWrites: [],
        sideWorkWrites: [],
        artifactCheckpointCandidates: [],
        codeCheckpointCandidates: [],
      };
      fs.writeFile(
        path.join(process.cwd(), '${SCRIPT_RESULT_FILENAME}'),
        JSON.stringify(result),
        'utf8',
      ).then(() => process.exit(0));
    `;

    const adapterWithJsRuntime = new LocalProviderAdapter(platformStore, {
      workspaceRoot,
      runtime: {
        cloneSource: async () => null,
        runScript: async ({ workingTree, scriptPath }) => {
          // Use plain `node` (no strip-types) so the test runtime matches the
          // CommonJS-style script source above; the production default uses
          // `--experimental-strip-types` for TS sources.
          const { spawn } = await import('node:child_process');
          return new Promise<number>((resolve) => {
            const child = spawn('node', [scriptPath], { cwd: workingTree, stdio: 'pipe' });
            child.on('close', (code: number | null) => resolve(code ?? 1));
            child.on('error', () => resolve(1));
          });
        },
      },
    });

    // Re-ensure under the adapter that has the JS runtime so the working tree
    // is tracked there too.
    const ensuredJs = await adapterWithJsRuntime.ensureEnvironment({
      processId: 'proc-exec-1',
      providerKind: 'local',
    });

    const exec = await adapterWithJsRuntime.executeScript({
      environmentId: ensuredJs.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source },
    });

    expect(exec.processStatus).toBe('completed');
    expect(exec.processHistoryItems).toEqual([]);
    expect(exec.artifactCheckpointCandidates).toEqual([]);
    expect(exec.codeCheckpointCandidates).toEqual([]);

    // Verify the script entrypoint was written.
    const scriptPath = path.join(ensuredJs.workspaceHandle, SCRIPT_ENTRYPOINT_FILENAME);
    const written = await fs.readFile(scriptPath, 'utf8');
    expect(written).toBe(source);

    // Cleanup the second environment.
    await adapterWithJsRuntime.teardownEnvironment({ environmentId: ensuredJs.environmentId });
    await adapter.teardownEnvironment({ environmentId: ensured.environmentId });
  });

  it('executeScript returns a failed ExecutionResult when the runtime exits non-zero', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async () => 7,
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-fail-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems).toHaveLength(1);
    expect(exec.processHistoryItems[0]?.text).toContain('non-zero code 7');
  });

  it('executeScript returns a failed ExecutionResult when the script does not write the result file', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async () => 0,
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-missing-result-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems[0]?.text).toContain('did not write expected result file');
  });

  it('executeScript returns a failed ExecutionResult when the result file is invalid JSON', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async ({ workingTree }) => {
        await fs.writeFile(path.join(workingTree, SCRIPT_RESULT_FILENAME), 'not-json {{', 'utf8');
        return 0;
      },
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-bad-json-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems[0]?.text).toContain('not valid JSON');
  });

  it('executeScript rejects candidate refs that point outside the working tree', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async ({ workingTree }) => {
        const result = {
          processStatus: 'completed',
          processHistoryItems: [],
          outputWrites: [],
          sideWorkWrites: [],
          artifactCheckpointCandidates: [
            {
              artifactId: 'artifact-leak-1',
              displayName: 'Leaked artifact',
              revisionLabel: null,
              contentsRef: '/etc/passwd',
            },
          ],
          codeCheckpointCandidates: [],
        };
        await fs.writeFile(
          path.join(workingTree, SCRIPT_RESULT_FILENAME),
          JSON.stringify(result),
          'utf8',
        );
        return 0;
      },
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-leak-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems[0]?.text).toContain('outside the working tree');
  });

  it('executeScript returns a failed ExecutionResult when an artifact contentsRef does not exist', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async ({ workingTree }) => {
        const result = {
          processStatus: 'completed',
          processHistoryItems: [],
          outputWrites: [],
          sideWorkWrites: [],
          artifactCheckpointCandidates: [
            {
              artifactId: 'artifact-missing-1',
              displayName: 'Missing artifact',
              revisionLabel: null,
              contentsRef: 'missing-artifact.md',
            },
          ],
          codeCheckpointCandidates: [],
        };
        await fs.writeFile(
          path.join(workingTree, SCRIPT_RESULT_FILENAME),
          JSON.stringify(result),
          'utf8',
        );
        return 0;
      },
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-missing-artifact-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems[0]?.text).toContain('artifactCheckpointCandidate');
    expect(exec.processHistoryItems[0]?.text).toContain('missing-artifact.md');
    expect(exec.processHistoryItems[0]?.text).toContain('does not exist');
  });

  it('executeScript returns a failed ExecutionResult when a code workspaceRef does not exist', async () => {
    const platformStore = new InMemoryPlatformStore();
    const runtime: LocalProviderRuntime = {
      cloneSource: async () => null,
      runScript: async ({ workingTree }) => {
        const result = {
          processStatus: 'completed',
          processHistoryItems: [],
          outputWrites: [],
          sideWorkWrites: [],
          artifactCheckpointCandidates: [],
          codeCheckpointCandidates: [
            {
              sourceAttachmentId: 'source-missing-1',
              displayName: 'Missing diff',
              targetRef: 'main',
              accessMode: 'read_write',
              workspaceRef: 'missing-workspace.diff',
            },
          ],
        };
        await fs.writeFile(
          path.join(workingTree, SCRIPT_RESULT_FILENAME),
          JSON.stringify(result),
          'utf8',
        );
        return 0;
      },
    };
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot, runtime });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-exec-missing-workspace-1',
      providerKind: 'local',
    });

    const exec = await adapter.executeScript({
      environmentId: ensured.environmentId,
      scriptPayload: { format: 'ts-module-source', entrypoint: 'default', source: 'noop' },
    });

    expect(exec.processStatus).toBe('failed');
    expect(exec.processHistoryItems[0]?.text).toContain('codeCheckpointCandidate');
    expect(exec.processHistoryItems[0]?.text).toContain('missing-workspace.diff');
    expect(exec.processHistoryItems[0]?.text).toContain('does not exist');
  });

  it('teardownEnvironment removes the working tree and is idempotent', async () => {
    const platformStore = new InMemoryPlatformStore();
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-teardown-1',
      providerKind: 'local',
    });
    expect((await fs.stat(ensured.workspaceHandle)).isDirectory()).toBe(true);

    await adapter.teardownEnvironment({ environmentId: ensured.environmentId });

    let removed = false;
    try {
      await fs.stat(ensured.workspaceHandle);
    } catch {
      removed = true;
    }
    expect(removed).toBe(true);

    // Idempotent: second call must not throw.
    await expect(
      adapter.teardownEnvironment({ environmentId: ensured.environmentId }),
    ).resolves.toBeUndefined();
  });

  it('rebuildEnvironment tears down prior environments for the same process before re-ensuring', async () => {
    const platformStore = new InMemoryPlatformStore();
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });
    const first = await adapter.ensureEnvironment({
      processId: 'proc-rebuild-1',
      providerKind: 'local',
    });
    expect((await fs.stat(first.workspaceHandle)).isDirectory()).toBe(true);

    const rebuilt = await adapter.rebuildEnvironment({
      processId: 'proc-rebuild-1',
      providerKind: 'local',
      plan: { fingerprint: 'fp', artifactInputs: [], outputInputs: [], sourceInputs: [] },
    });

    expect(rebuilt.environmentId).not.toBe(first.environmentId);
    expect(rebuilt.environmentId).toMatch(/^local-proc-rebuild-1-/);

    // Prior working tree must be gone.
    let removed = false;
    try {
      await fs.stat(first.workspaceHandle);
    } catch {
      removed = true;
    }
    expect(removed).toBe(true);

    // New working tree must exist.
    expect((await fs.stat(rebuilt.workspaceHandle)).isDirectory()).toBe(true);

    await adapter.teardownEnvironment({ environmentId: rebuilt.environmentId });
  });

  it('getWorkspaceHandle returns the directory while the env exists and null after teardown', async () => {
    const platformStore = new InMemoryPlatformStore();
    const adapter = new LocalProviderAdapter(platformStore, { workspaceRoot });
    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-handle-1',
      providerKind: 'local',
    });

    expect(adapter.getWorkspaceHandle({ environmentId: ensured.environmentId })).toBe(
      ensured.workspaceHandle,
    );

    await adapter.teardownEnvironment({ environmentId: ensured.environmentId });

    expect(adapter.getWorkspaceHandle({ environmentId: ensured.environmentId })).toBeNull();
  });
});
