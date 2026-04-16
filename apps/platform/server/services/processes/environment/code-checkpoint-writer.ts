import { Octokit } from '@octokit/rest';

/**
 * Single-file code checkpoint write boundary. The orchestrator hands one code
 * checkpoint candidate at a time; the writer commits the file content directly
 * to the attached writable target ref of the source attachment's GitHub repo.
 *
 * Spec: Epic 3 tech-design-server.md:939-959 (Canonical Code Write Boundary).
 * No branch invention, no PR workflow — direct write only. If the target ref
 * is not writable, the writer returns `outcome: 'failed'` with a meaningful
 * `failureReason` so the planner records a blocked checkpoint result rather
 * than the orchestrator inventing alternatives.
 */
export interface CodeCheckpointWriter {
  writeFor(args: {
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
    commitSha?: string;
    targetRef?: string;
  }>;
}

/**
 * Test seam — succeeds without touching any external system. Used by tests
 * that need to drive the orchestrator's checkpoint flow without exercising the
 * real GitHub boundary. NOT wired as the production default.
 */
export class StubCodeCheckpointWriter implements CodeCheckpointWriter {
  async writeFor(_args: {
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
    commitSha?: string;
    targetRef?: string;
  }> {
    return {
      outcome: 'succeeded',
    };
  }
}

/**
 * Test seam that always fails. Used to drive the orchestrator's failed
 * checkpoint result path in unit/service tests.
 */
export class FailingCodeCheckpointWriter implements CodeCheckpointWriter {
  constructor(private readonly reason: string = 'Code checkpoint failed.') {}

  async writeFor(_args: {
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
    commitSha?: string;
    targetRef?: string;
  }> {
    return {
      outcome: 'failed',
      failureReason: this.reason,
    };
  }
}

/**
 * Minimal Octokit surface the writer relies on. Declared here so unit tests
 * can substitute a fake without depending on the real Octokit's full type
 * graph.
 */
export interface OctokitClient {
  repos: {
    getContent(args: {
      owner: string;
      repo: string;
      path: string;
      ref?: string;
    }): Promise<OctokitResponse<unknown>>;
    createOrUpdateFileContents(args: {
      owner: string;
      repo: string;
      path: string;
      message: string;
      content: string;
      sha?: string;
      branch?: string;
    }): Promise<OctokitResponse<{ commit: { sha: string } }>>;
  };
}

export interface OctokitResponse<TData> {
  status: number;
  data: TData;
}

export interface OctokitCodeCheckpointWriterOptions {
  /**
   * Authentication token. Required. The default `createApp` wiring reads this
   * from `env.GITHUB_TOKEN`. The constructor throws if `token` is missing or
   * empty so production paths fail loud rather than silently falling back to
   * the stub.
   */
  token: string;
  /**
   * Optional injected client. Tests pass a fake Octokit-shaped object that
   * records calls and returns canned responses. Production omits this and the
   * writer constructs a real `Octokit` instance from `@octokit/rest`.
   */
  client?: OctokitClient;
}

/**
 * Octokit-backed implementation. Wired as the production default by
 * `createApp`. Every call commits one file to the attached writable target
 * ref of the source attachment's GitHub repository — no branch invention, no
 * PR workflow.
 */
export class OctokitCodeCheckpointWriter implements CodeCheckpointWriter {
  private readonly client: OctokitClient;

  constructor(options: OctokitCodeCheckpointWriterOptions) {
    if (typeof options.token !== 'string' || options.token.length === 0) {
      throw new Error(
        'OctokitCodeCheckpointWriter requires a non-empty `token` (set the `GITHUB_TOKEN` env var).',
      );
    }
    this.client =
      options.client ?? (new Octokit({ auth: options.token }) as unknown as OctokitClient);
  }

  async writeFor(args: {
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }): Promise<{
    outcome: 'succeeded' | 'failed';
    failureReason?: string;
    commitSha?: string;
    targetRef?: string;
  }> {
    let owner: string;
    let repo: string;
    try {
      const parsed = parseGitHubRepository(args.repositoryUrl);
      owner = parsed.owner;
      repo = parsed.repo;
    } catch (error) {
      return {
        outcome: 'failed',
        failureReason:
          error instanceof Error
            ? `Could not resolve GitHub repository from '${args.repositoryUrl}': ${error.message}`
            : `Could not resolve GitHub repository from '${args.repositoryUrl}'.`,
      };
    }

    if (args.targetRef === null || args.targetRef.length === 0) {
      return {
        outcome: 'failed',
        failureReason:
          'Code checkpoint requires a target ref. The attached source must declare the writable branch on its durable record.',
      };
    }

    let existingSha: string | undefined;
    try {
      const existing = await this.client.repos.getContent({
        owner,
        repo,
        path: args.filePath,
        ref: args.targetRef,
      });
      const data = existing.data as { sha?: string } | unknown;
      if (data !== null && typeof data === 'object' && 'sha' in data) {
        existingSha = (data as { sha?: string }).sha;
      }
    } catch (error) {
      const status = readErrorStatus(error);
      if (status === 404) {
        // File doesn't exist yet on the target ref — first commit creates it.
        existingSha = undefined;
      } else {
        return {
          outcome: 'failed',
          failureReason: describeOctokitError({
            error,
            phase: 'getContent',
            owner,
            repo,
            ref: args.targetRef,
            path: args.filePath,
          }),
        };
      }
    }

    let commitSha: string;
    try {
      const writeResult = await this.client.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: args.filePath,
        message: args.commitMessage,
        content: encodeContentBase64(args.diff),
        sha: existingSha,
        branch: args.targetRef,
      });
      commitSha = writeResult.data.commit.sha;
    } catch (error) {
      return {
        outcome: 'failed',
        failureReason: describeOctokitError({
          error,
          phase: 'createOrUpdateFileContents',
          owner,
          repo,
          ref: args.targetRef,
          path: args.filePath,
        }),
      };
    }

    return {
      outcome: 'succeeded',
      commitSha,
      targetRef: args.targetRef,
    };
  }
}

function parseGitHubRepository(repositoryUrl: string): { owner: string; repo: string } {
  // Accept https://github.com/<owner>/<repo>(.git)?(/...)? — the canonical
  // shape we expect on the durable source attachment record. Reject anything
  // that doesn't match so callers see a clear failure rather than a confusing
  // 404 from the API later.
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?(?:\/.*)?$/.exec(
    repositoryUrl,
  );
  if (match === null) {
    throw new Error('Expected an https://github.com/<owner>/<repo> URL.');
  }
  const [, owner, repo] = match;
  if (owner === undefined || repo === undefined || owner.length === 0 || repo.length === 0) {
    throw new Error('Expected an https://github.com/<owner>/<repo> URL.');
  }
  return { owner, repo };
}

function encodeContentBase64(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64');
}

function readErrorStatus(error: unknown): number | null {
  if (error !== null && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return null;
}

function describeOctokitError(args: {
  error: unknown;
  phase: 'getContent' | 'createOrUpdateFileContents';
  owner: string;
  repo: string;
  ref: string;
  path: string;
}): string {
  const status = readErrorStatus(args.error);
  const baseLocation = `${args.owner}/${args.repo}@${args.ref}:${args.path}`;
  if (status === 401 || status === 403) {
    return `GitHub authentication or permission was rejected (${status}) while writing ${baseLocation}. Check that GITHUB_TOKEN has push access to this repo.`;
  }
  if (status === 409 || status === 422) {
    return `GitHub rejected the write to ${baseLocation} as a conflict (${status}). The target ref likely moved between read and write — re-run after refreshing.`;
  }
  if (status === 404) {
    return `GitHub returned 404 for ${baseLocation} during ${args.phase}. The ref or repository may not exist or the token may lack access.`;
  }
  if (typeof status === 'number') {
    const message = args.error instanceof Error ? args.error.message : String(args.error);
    return `GitHub responded ${status} during ${args.phase} on ${baseLocation}: ${message}`;
  }
  if (args.error instanceof Error) {
    return `Network or unexpected failure during ${args.phase} on ${baseLocation}: ${args.error.message}`;
  }
  return `Unknown failure during ${args.phase} on ${baseLocation}.`;
}
