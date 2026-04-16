import { describe, expect, it } from 'vitest';
import {
  OctokitCodeCheckpointWriter,
  type OctokitClient,
} from '../../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';

interface RecordedGetContent {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

interface RecordedCreateOrUpdate {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string;
  sha?: string;
  branch?: string;
}

interface OctokitErrorBody {
  status: number;
  message?: string;
}

class OctokitHttpError extends Error {
  status: number;

  constructor(args: OctokitErrorBody) {
    super(args.message ?? `Octokit error ${args.status}`);
    this.status = args.status;
    this.name = 'OctokitHttpError';
  }
}

interface FakeClientOptions {
  getContent?: {
    error?: OctokitErrorBody;
    sha?: string | null;
  };
  createOrUpdate?: {
    error?: OctokitErrorBody;
    commitSha?: string;
  };
}

function buildFakeClient(options: FakeClientOptions = {}): {
  client: OctokitClient;
  getContentCalls: RecordedGetContent[];
  createOrUpdateCalls: RecordedCreateOrUpdate[];
} {
  const getContentCalls: RecordedGetContent[] = [];
  const createOrUpdateCalls: RecordedCreateOrUpdate[] = [];

  const client: OctokitClient = {
    repos: {
      getContent: async (args) => {
        getContentCalls.push(args);
        if (options.getContent?.error !== undefined) {
          throw new OctokitHttpError(options.getContent.error);
        }
        const sha = options.getContent?.sha;
        return {
          status: 200,
          data: sha === null ? {} : { sha: sha ?? 'sha-existing-file' },
        };
      },
      createOrUpdateFileContents: async (args) => {
        createOrUpdateCalls.push(args);
        if (options.createOrUpdate?.error !== undefined) {
          throw new OctokitHttpError(options.createOrUpdate.error);
        }
        return {
          status: 201,
          data: { commit: { sha: options.createOrUpdate?.commitSha ?? 'sha-commit-new' } },
        };
      },
    },
  };

  return { client, getContentCalls, createOrUpdateCalls };
}

const baseArgs = {
  sourceAttachmentId: 'source-write-001',
  repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
  targetRef: 'main',
  filePath: 'docs/test.md',
  diff: 'updated content',
  commitMessage: 'Update docs/test.md from checkpoint',
};

describe('OctokitCodeCheckpointWriter', () => {
  it('throws a clear error when the constructor is given an empty token', () => {
    expect(() => new OctokitCodeCheckpointWriter({ token: '' })).toThrowError(/GITHUB_TOKEN/);
  });

  it('commits successfully to a writable target ref and returns the resulting commit SHA', async () => {
    const { client, getContentCalls, createOrUpdateCalls } = buildFakeClient({
      getContent: { sha: 'sha-existing' },
      createOrUpdate: { commitSha: 'sha-new-commit-abc123' },
    });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor(baseArgs);

    expect(result).toEqual({
      outcome: 'succeeded',
      commitSha: 'sha-new-commit-abc123',
      targetRef: 'main',
    });
    expect(getContentCalls).toEqual([
      {
        owner: 'liminal-ai',
        repo: 'liminal-build',
        path: 'docs/test.md',
        ref: 'main',
      },
    ]);
    expect(createOrUpdateCalls).toHaveLength(1);
    expect(createOrUpdateCalls[0]).toMatchObject({
      owner: 'liminal-ai',
      repo: 'liminal-build',
      path: 'docs/test.md',
      message: 'Update docs/test.md from checkpoint',
      sha: 'sha-existing',
      branch: 'main',
    });
    expect(createOrUpdateCalls[0]?.content).toBe(
      Buffer.from('updated content', 'utf8').toString('base64'),
    );
  });

  it('creates the file on first commit when getContent returns 404', async () => {
    const { client, createOrUpdateCalls } = buildFakeClient({
      getContent: { error: { status: 404, message: 'Not Found' } },
      createOrUpdate: { commitSha: 'sha-first-commit-def456' },
    });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor(baseArgs);

    expect(result.outcome).toBe('succeeded');
    expect(result.commitSha).toBe('sha-first-commit-def456');
    expect(createOrUpdateCalls[0]?.sha).toBeUndefined();
  });

  it('returns failed with a refresh-suggesting failureReason when GitHub responds 409 conflict', async () => {
    const { client } = buildFakeClient({
      getContent: { sha: 'sha-existing' },
      createOrUpdate: { error: { status: 409, message: 'sha mismatch' } },
    });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor(baseArgs);

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/conflict/i);
    expect(result.failureReason).toMatch(/refresh/i);
  });

  it('returns failed naming the auth issue when GitHub returns 401', async () => {
    const { client } = buildFakeClient({
      getContent: { error: { status: 401, message: 'Bad credentials' } },
    });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor(baseArgs);

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/authentication or permission/i);
    expect(result.failureReason).toMatch(/GITHUB_TOKEN/);
  });

  it('returns failed naming the auth issue when GitHub returns 403', async () => {
    const { client } = buildFakeClient({
      getContent: { sha: 'sha-existing' },
      createOrUpdate: { error: { status: 403, message: 'Resource not accessible by integration' } },
    });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor(baseArgs);

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/authentication or permission/i);
  });

  it('returns failed describing the underlying network error when getContent throws a non-HTTP error', async () => {
    const failingClient: OctokitClient = {
      repos: {
        getContent: async () => {
          throw new Error('connect ETIMEDOUT 140.82.121.6:443');
        },
        createOrUpdateFileContents: async () => {
          throw new Error('Should not be called when getContent fails non-404.');
        },
      },
    };
    const writer = new OctokitCodeCheckpointWriter({
      token: 'test-token',
      client: failingClient,
    });

    const result = await writer.writeFor(baseArgs);

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/Network or unexpected failure/);
    expect(result.failureReason).toMatch(/ETIMEDOUT/);
  });

  it('returns failed when the repositoryUrl is not a github.com URL', async () => {
    const { client } = buildFakeClient();
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor({
      ...baseArgs,
      repositoryUrl: 'https://gitlab.example.com/owner/repo',
    });

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/Could not resolve GitHub repository/);
  });

  it('returns failed when targetRef is null because direct write requires an explicit branch', async () => {
    const { client } = buildFakeClient();
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    const result = await writer.writeFor({
      ...baseArgs,
      targetRef: null,
    });

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/target ref/i);
  });

  it('parses owner/repo from repositoryUrl regardless of trailing .git or path segments', async () => {
    const { client, getContentCalls } = buildFakeClient({ getContent: { sha: 'sha-1' } });
    const writer = new OctokitCodeCheckpointWriter({ token: 'test-token', client });

    await writer.writeFor({
      ...baseArgs,
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build.git',
    });
    await writer.writeFor({
      ...baseArgs,
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build/issues/42',
    });

    expect(getContentCalls.every((c) => c.owner === 'liminal-ai')).toBe(true);
    expect(getContentCalls.every((c) => c.repo === 'liminal-build')).toBe(true);
  });
});
