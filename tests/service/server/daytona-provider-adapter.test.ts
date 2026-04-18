import { describe, expect, it } from 'vitest';
import {
  DAYTONA_WORKSPACE_ROOT,
  DAYTONA_ARTIFACTS_SUBDIR,
  DAYTONA_SCRIPT_ENTRYPOINT,
  DAYTONA_SCRIPT_RESULT,
  DAYTONA_SOURCES_SUBDIR,
  DaytonaProviderAdapter,
  type DaytonaClientLike,
  type DaytonaProviderAdapterOptions,
  type DaytonaSandboxLike,
} from '../../../apps/platform/server/services/processes/environment/daytona-provider-adapter.js';
import { ProviderLifecycleError } from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';

function createFakeSandbox(overrides: Partial<DaytonaSandboxLike> = {}): DaytonaSandboxLike & {
  uploadCalls: Array<{ destination: string; contents: string }>;
  cloneCalls: Array<{
    url: string;
    path: string;
    branch?: string;
    commitId?: string;
    username?: string;
    password?: string;
  }>;
  executeCalls: Array<{ command: string; cwd?: string }>;
  deleted: boolean;
} {
  const files = new Map<string, Buffer>();
  const uploadCalls: Array<{ destination: string; contents: string }> = [];
  const cloneCalls: Array<{
    url: string;
    path: string;
    branch?: string;
    commitId?: string;
    username?: string;
    password?: string;
  }> = [];
  const executeCalls: Array<{ command: string; cwd?: string }> = [];
  let deleted = false;

  const sandbox: DaytonaSandboxLike & {
    uploadCalls: Array<{ destination: string; contents: string }>;
    cloneCalls: Array<{
      url: string;
      path: string;
      branch?: string;
      commitId?: string;
      username?: string;
      password?: string;
    }>;
    executeCalls: Array<{ command: string; cwd?: string }>;
    deleted: boolean;
  } = {
    id: 'daytona-sandbox-1',
    state: 'started',
    recoverable: false,
    async start() {
      sandbox.state = 'started';
    },
    async recover() {
      sandbox.state = 'started';
    },
    async delete() {
      deleted = true;
      sandbox.deleted = true;
    },
    async getUserHomeDir() {
      return '/home/daytona';
    },
    fs: {
      async createFolder() {
        return;
      },
      async deleteFile(path) {
        files.delete(path);
      },
      async uploadFile(file, remotePath) {
        const contents = typeof file === 'string' ? file : file.toString('utf8');
        files.set(remotePath, Buffer.from(contents, 'utf8'));
        uploadCalls.push({ destination: remotePath, contents });
      },
      async downloadFile(remotePath) {
        const file = files.get(remotePath);
        if (file === undefined) {
          throw new Error(`missing file: ${remotePath}`);
        }
        return file;
      },
      async getFileDetails(path) {
        if (!files.has(path)) {
          throw new Error(`missing file details: ${path}`);
        }
        return { path };
      },
    },
    git: {
      async clone(url, path, branch, commitId, username, password) {
        cloneCalls.push({ url, path, branch, commitId, username, password });
      },
    },
    process: {
      async executeCommand(command, cwd) {
        executeCalls.push({ command, cwd });
        return {
          exitCode: 0,
          result: 'ok',
        };
      },
    },
    uploadCalls,
    cloneCalls,
    executeCalls,
    deleted,
    ...overrides,
  };

  return sandbox;
}

function buildOptions(
  sandbox: DaytonaSandboxLike,
  overrides: Partial<DaytonaProviderAdapterOptions> = {},
): DaytonaProviderAdapterOptions {
  const client: DaytonaClientLike = {
    async create() {
      return sandbox;
    },
    async get() {
      return sandbox;
    },
  };

  return {
    apiKey: 'daytona-api-key',
    gitHubToken: 'github_pat_test_token',
    clientFactory: () => client,
    ...overrides,
  };
}

describe('DaytonaProviderAdapter', () => {
  it('fails fast when apiKey is missing', () => {
    const store = new InMemoryPlatformStore();

    expect(
      () =>
        new DaytonaProviderAdapter(store, {
          apiKey: '',
          clientFactory: () =>
            ({
              async create() {
                throw new Error('unused');
              },
              async get() {
                throw new Error('unused');
              },
            }) as DaytonaClientLike,
        }),
    ).toThrow(/DAYTONA_API_KEY/);
  });

  it('creates a sandbox and returns its id/workspace handle from ensureEnvironment', async () => {
    const store = new InMemoryPlatformStore();
    const sandbox = createFakeSandbox();
    const adapter = new DaytonaProviderAdapter(store, buildOptions(sandbox));

    const ensured = await adapter.ensureEnvironment({
      processId: 'proc-daytona-1',
      providerKind: 'daytona',
    });

    expect(ensured.providerKind).toBe('daytona');
    expect(ensured.environmentId).toBe('daytona-sandbox-1');
    expect(ensured.workspaceHandle).toBe('/home/daytona/workspace');
  });

  it('hydrates artifacts and clones GitHub sources into the stable workspace layout', async () => {
    const store = new InMemoryPlatformStore();
    store.seedArtifactContentForTesting('artifact-daytona-1', '# Daytona artifact');
    const sandbox = createFakeSandbox();
    const adapter = new DaytonaProviderAdapter(store, buildOptions(sandbox));

    const result = await adapter.hydrateEnvironment({
      environmentId: sandbox.id,
      plan: {
        fingerprint: 'fp-daytona-1',
        artifactInputs: [
          {
            artifactId: 'artifact-daytona-1',
            displayName: 'Plan.md',
            versionLabel: 'v1',
          },
        ],
        outputInputs: [],
        sourceInputs: [
          {
            sourceAttachmentId: 'source-daytona-1',
            displayName: 'liminal-build',
            repositoryUrl: 'https://github.com/owner/repo.git',
            targetRef: 'main',
            accessMode: 'read_write',
          },
        ],
      },
    });

    expect(result.environmentId).toBe(sandbox.id);
    expect(result.fingerprint).toBe('fp-daytona-1');
    expect(sandbox.uploadCalls[0]?.destination).toMatch(
      new RegExp(`^${DAYTONA_ARTIFACTS_SUBDIR}/`),
    );
    expect(sandbox.uploadCalls[0]?.contents).toBe('# Daytona artifact');
    expect(sandbox.cloneCalls).toHaveLength(1);
    expect(sandbox.cloneCalls[0]?.path).toMatch(new RegExp(`^${DAYTONA_SOURCES_SUBDIR}/`));
    expect(sandbox.cloneCalls[0]?.username).toBe('git');
    expect(sandbox.cloneCalls[0]?.password).toBe('github_pat_test_token');
  });

  it('uploads the script, executes it in workspace, and parses the downloaded result json', async () => {
    const store = new InMemoryPlatformStore();
    const sandbox = createFakeSandbox();
    sandbox.fs.downloadFile = async (remotePath) => {
      if (remotePath === DAYTONA_SCRIPT_RESULT) {
        return Buffer.from(
          JSON.stringify({
            processStatus: 'completed',
            processHistoryItems: [],
            outputWrites: [],
            sideWorkWrites: [],
            artifactCheckpointCandidates: [],
            codeCheckpointCandidates: [],
          }),
          'utf8',
        );
      }
      throw new Error(`unexpected download: ${remotePath}`);
    };
    const adapter = new DaytonaProviderAdapter(store, buildOptions(sandbox));

    const result = await adapter.executeScript({
      environmentId: sandbox.id,
      scriptPayload: {
        format: 'ts-module-source',
        entrypoint: 'default',
        source: 'console.log("hi")',
      },
    });

    expect(result.processStatus).toBe('completed');
    expect(sandbox.uploadCalls.some((call) => call.destination === DAYTONA_SCRIPT_ENTRYPOINT)).toBe(
      true,
    );
    expect(sandbox.executeCalls[0]).toEqual({
      command: 'node --experimental-strip-types _liminal_exec.ts',
      cwd: DAYTONA_WORKSPACE_ROOT,
    });
  });

  it('rebuild deletes the previous sandbox and creates a fresh one', async () => {
    const store = new InMemoryPlatformStore();
    const previous = createFakeSandbox({ id: 'old-sandbox' });
    const next = createFakeSandbox({ id: 'new-sandbox' });
    const client: DaytonaClientLike = {
      async create() {
        return next;
      },
      async get(id) {
        if (id === 'old-sandbox') {
          return previous;
        }
        return next;
      },
    };
    const adapter = new DaytonaProviderAdapter(store, {
      apiKey: 'daytona-api-key',
      clientFactory: () => client,
    });

    const rebuilt = await adapter.rebuildEnvironment({
      processId: 'proc-rebuild-1',
      previousEnvironmentId: 'old-sandbox',
      providerKind: 'daytona',
      plan: { fingerprint: 'fp', artifactInputs: [], outputInputs: [], sourceInputs: [] },
    });

    expect(previous.deleted).toBe(true);
    expect(rebuilt.environmentId).toBe('new-sandbox');
  });

  it('resolveCandidateContents downloads file data from the sandbox', async () => {
    const store = new InMemoryPlatformStore();
    const sandbox = createFakeSandbox();
    sandbox.fs.downloadFile = async (remotePath) => Buffer.from(`body:${remotePath}`, 'utf8');
    const adapter = new DaytonaProviderAdapter(store, buildOptions(sandbox));

    await expect(
      adapter.resolveCandidateContents({
        environmentId: sandbox.id,
        ref: 'artifacts/result.md',
      }),
    ).resolves.toBe('body:workspace/artifacts/result.md');
  });

  it('maps missing sandboxes to a lost provider failure', async () => {
    const store = new InMemoryPlatformStore();
    const adapter = new DaytonaProviderAdapter(store, {
      apiKey: 'daytona-api-key',
      clientFactory: () =>
        ({
          async create() {
            throw new Error('unused');
          },
          async get() {
            const error = new Error('missing');
            error.name = 'DaytonaNotFoundError';
            throw error;
          },
        }) as DaytonaClientLike,
    });

    let caught: unknown;
    try {
      await adapter.resolveCandidateContents({
        environmentId: 'missing-sandbox',
        ref: 'file.txt',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ProviderLifecycleError);
    expect((caught as ProviderLifecycleError).environmentState).toBe('lost');
  });
});
