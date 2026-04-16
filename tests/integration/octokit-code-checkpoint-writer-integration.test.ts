import { randomBytes } from 'node:crypto';
import { promises as fsAsync, readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { Octokit } from '@octokit/rest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OctokitCodeCheckpointWriter } from '../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';

/**
 * Real-network integration test for `OctokitCodeCheckpointWriter`.
 *
 * Operates directly against `liminal-ai/liminal-build`. Each test creates a
 * disposable test branch off the default branch, exercises the writer, then
 * deletes the branch. Cleanup runs in `afterAll` even if the assertions fail.
 *
 * No silent skipping: if `GITHUB_TOKEN` is missing the test FAILS with a
 * loud error so the integration suite cannot inadvertently green-light the
 * production path with no real coverage.
 */

const TEST_OWNER = 'liminal-ai';
const TEST_REPO = 'liminal-build';
const TEST_REPOSITORY_URL = `https://github.com/${TEST_OWNER}/${TEST_REPO}`;

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = startDirectory;

  while (true) {
    const workspaceMarker = path.join(currentDirectory, 'pnpm-workspace.yaml');

    if (existsSync(workspaceMarker)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return startDirectory;
    }

    currentDirectory = parentDirectory;
  }
}

/**
 * Mirror of `apps/platform/server/index.ts:loadWorkspaceEnvFiles`. Loads the
 * project's `.env` and `.env.local` (`.env.local` wins) and copies their
 * values into `process.env` for keys that are not already set. Lets the
 * integration suite read `GITHUB_TOKEN` from `.env.local` the same way the
 * dev server does.
 */
function loadWorkspaceEnvFiles(): void {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = findWorkspaceRoot(currentDir);
  const fileValues: Record<string, string> = {};

  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(workspaceRoot, fileName);

    if (existsSync(filePath)) {
      Object.assign(fileValues, parseEnv(readFileSync(filePath, 'utf8')));
    }
  }

  for (const [key, value] of Object.entries(fileValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function generateBranchName(): string {
  return `liminal-checkpoint-test/${randomBytes(8).toString('hex')}`;
}

function generateFileName(): string {
  return `tmp-octokit-checkpoint-test-${randomBytes(6).toString('hex')}.md`;
}

interface CreatedBranch {
  branch: string;
  startSha: string;
  filePath: string;
}

const createdBranches: CreatedBranch[] = [];

let octokit: Octokit | null = null;
let token: string | null = null;
let defaultBranch: string | null = null;

beforeAll(async () => {
  loadWorkspaceEnvFiles();
  token = process.env.GITHUB_TOKEN ?? null;
  if (token === null || token.length === 0) {
    throw new Error(
      'GITHUB_TOKEN env var required for integration test. Set in .env.local. Skipping is not acceptable.',
    );
  }
  octokit = new Octokit({ auth: token });
  const repo = await octokit.repos.get({ owner: TEST_OWNER, repo: TEST_REPO });
  defaultBranch = repo.data.default_branch;
}, 60_000);

afterAll(async () => {
  if (octokit === null) {
    return;
  }
  const orphanedBranches: string[] = [];
  for (const created of createdBranches) {
    try {
      await octokit.git.deleteRef({
        owner: TEST_OWNER,
        repo: TEST_REPO,
        ref: `heads/${created.branch}`,
      });
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 404 || status === 422) {
        // Already deleted — fine.
        continue;
      }
      orphanedBranches.push(created.branch);
      // eslint-disable-next-line no-console
      console.error(
        `[octokit-integration-cleanup] Failed to delete test branch '${created.branch}'. Manual cleanup required. Error:`,
        error,
      );
    }
  }
  if (orphanedBranches.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[octokit-integration-cleanup] Orphaned test branches in ${TEST_OWNER}/${TEST_REPO}: ${orphanedBranches.join(', ')}`,
    );
  }
}, 60_000);

async function createDisposableTestBranch(args: {
  octokit: Octokit;
  baseBranch: string;
}): Promise<string> {
  const { data: baseRef } = await args.octokit.git.getRef({
    owner: TEST_OWNER,
    repo: TEST_REPO,
    ref: `heads/${args.baseBranch}`,
  });
  const branch = generateBranchName();
  await args.octokit.git.createRef({
    owner: TEST_OWNER,
    repo: TEST_REPO,
    ref: `refs/heads/${branch}`,
    sha: baseRef.object.sha,
  });
  createdBranches.push({ branch, startSha: baseRef.object.sha, filePath: '' });
  return branch;
}

async function fetchFileContent(args: {
  octokit: Octokit;
  branch: string;
  filePath: string;
}): Promise<string> {
  const result = await args.octokit.repos.getContent({
    owner: TEST_OWNER,
    repo: TEST_REPO,
    path: args.filePath,
    ref: args.branch,
  });
  const data = result.data as { content?: string; encoding?: string };
  if (data.content === undefined || data.encoding !== 'base64') {
    throw new Error(`Unexpected getContent shape for ${args.filePath} on ${args.branch}.`);
  }
  return Buffer.from(data.content, 'base64').toString('utf8');
}

describe('OctokitCodeCheckpointWriter integration (real GitHub against liminal-ai/liminal-build)', () => {
  it('commits a single file to a writable target ref and the commit lands on the branch', async () => {
    if (octokit === null || token === null || defaultBranch === null) {
      throw new Error('Test setup did not initialize Octokit or default branch.');
    }
    const branch = await createDisposableTestBranch({ octokit, baseBranch: defaultBranch });
    const filePath = `tests/integration/__tmp__/${generateFileName()}`;
    const expectedContent = `# Octokit checkpoint integration test\n\nWritten at ${new Date().toISOString()}.\n`;
    const writer = new OctokitCodeCheckpointWriter({ token });

    const result = await writer.writeFor({
      sourceAttachmentId: 'integration-source-001',
      repositoryUrl: TEST_REPOSITORY_URL,
      targetRef: branch,
      filePath,
      diff: expectedContent,
      commitMessage: `Integration test commit on ${branch}`,
    });

    expect(result.outcome).toBe('succeeded');
    expect(result.targetRef).toBe(branch);
    if (result.outcome !== 'succeeded') {
      throw new Error('Expected outcome succeeded; aborting follow-up assertions.');
    }
    expect(result.commitSha).toMatch(/^[0-9a-f]{40}$/);

    const verifiedContent = await fetchFileContent({ octokit, branch, filePath });
    expect(verifiedContent).toBe(expectedContent);
  }, 60_000);

  it('updates an existing file and returns a new commit SHA distinct from the first commit', async () => {
    if (octokit === null || token === null || defaultBranch === null) {
      throw new Error('Test setup did not initialize Octokit or default branch.');
    }
    const branch = await createDisposableTestBranch({ octokit, baseBranch: defaultBranch });
    const filePath = `tests/integration/__tmp__/${generateFileName()}`;
    const writer = new OctokitCodeCheckpointWriter({ token });

    const firstResult = await writer.writeFor({
      sourceAttachmentId: 'integration-source-002',
      repositoryUrl: TEST_REPOSITORY_URL,
      targetRef: branch,
      filePath,
      diff: 'first revision\n',
      commitMessage: `Integration test create on ${branch}`,
    });
    expect(firstResult.outcome).toBe('succeeded');
    if (firstResult.outcome !== 'succeeded') {
      throw new Error('First write must succeed for the update assertion to be meaningful.');
    }

    const secondResult = await writer.writeFor({
      sourceAttachmentId: 'integration-source-002',
      repositoryUrl: TEST_REPOSITORY_URL,
      targetRef: branch,
      filePath,
      diff: 'second revision\n',
      commitMessage: `Integration test update on ${branch}`,
    });
    expect(secondResult.outcome).toBe('succeeded');
    if (secondResult.outcome !== 'succeeded') {
      throw new Error('Second write must succeed for the update assertion to be meaningful.');
    }
    expect(secondResult.commitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(secondResult.commitSha).not.toBe(firstResult.commitSha);

    const verified = await fetchFileContent({ octokit, branch, filePath });
    expect(verified).toBe('second revision\n');
  }, 60_000);

  it('returns a failed outcome with a meaningful failureReason when the target ref does not exist', async () => {
    if (token === null) {
      throw new Error('Test setup did not initialize the GitHub token.');
    }
    const writer = new OctokitCodeCheckpointWriter({ token });

    const result = await writer.writeFor({
      sourceAttachmentId: 'integration-source-003',
      repositoryUrl: TEST_REPOSITORY_URL,
      targetRef: `liminal-checkpoint-test/branch-that-does-not-exist-${randomBytes(6).toString('hex')}`,
      filePath: 'tests/integration/__tmp__/never-written.md',
      diff: 'should never land',
      commitMessage: 'Should fail because target ref is missing',
    });

    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toMatch(/^GitHub|^Network/);
  }, 30_000);
});

// Best-effort cleanup of test files left on default branch is intentionally
// not implemented — the test commits live exclusively on disposable branches
// that `afterAll` deletes.
void fsAsync;
