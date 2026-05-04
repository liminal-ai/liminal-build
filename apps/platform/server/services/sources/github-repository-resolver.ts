import { Octokit } from '@octokit/rest';
import { SourceIdentityService } from './source-identity.service.js';

export type GitHubTargetRefKind = 'none' | 'branch' | 'tag' | 'commit';

export type GitHubRepositoryResolution =
  | {
      kind: 'resolved';
      repositoryUrl: string;
      repositoryFullName: string;
      targetRef: string | null;
      targetRefKind: GitHubTargetRefKind;
      defaultBranch: string;
    }
  | {
      kind: 'invalid';
      message: string;
    }
  | {
      kind: 'inaccessible';
      message: string;
    };

export interface GitHubRepositoryResolver {
  resolveRepository(args: {
    repositoryUrl: string;
    targetRef: string | null;
  }): Promise<GitHubRepositoryResolution>;
}

interface OctokitRepositoryClient {
  repos: {
    get(args: { owner: string; repo: string }): Promise<{
      status: number;
      data: { full_name: string; default_branch: string };
    }>;
    getBranch(args: { owner: string; repo: string; branch: string }): Promise<{ status: number }>;
    getCommit(args: { owner: string; repo: string; ref: string }): Promise<{ status: number }>;
  };
  git: {
    getRef(args: {
      owner: string;
      repo: string;
      ref: string;
    }): Promise<{ status: number; data: { ref: string } }>;
  };
}

export class OctokitGitHubRepositoryResolver implements GitHubRepositoryResolver {
  private readonly client: OctokitRepositoryClient;
  private readonly sourceIdentityService: SourceIdentityService;

  constructor(options: {
    token: string;
    client?: OctokitRepositoryClient;
    sourceIdentityService?: SourceIdentityService;
  }) {
    this.sourceIdentityService = options.sourceIdentityService ?? new SourceIdentityService();
    this.client =
      options.client ??
      (new Octokit({ auth: options.token }) as unknown as OctokitRepositoryClient);
  }

  async resolveRepository(args: {
    repositoryUrl: string;
    targetRef: string | null;
  }): Promise<GitHubRepositoryResolution> {
    const parsedIdentity = this.sourceIdentityService.parseGitHubRepositoryUrl(args.repositoryUrl);

    if (parsedIdentity === null) {
      return {
        kind: 'invalid',
        message: 'Expected an https://github.com/<owner>/<repo> repository URL.',
      };
    }

    const [owner, repo] = parsedIdentity.repositoryFullName.split('/');

    if (owner === undefined || repo === undefined) {
      return {
        kind: 'invalid',
        message: 'Repository URL could not be resolved to a canonical owner/name.',
      };
    }

    let repository: { full_name: string; default_branch: string };
    try {
      const response = await this.client.repos.get({
        owner,
        repo,
      });
      repository = response.data;
    } catch (error) {
      return {
        kind: 'inaccessible',
        message: describeRepositoryLookupFailure(error),
      };
    }

    const canonicalFullName = this.sourceIdentityService.normalizeRepositoryFullName(
      repository.full_name,
    );
    const normalizedTargetRef = this.sourceIdentityService.normalizeTargetRef(args.targetRef);

    if (normalizedTargetRef === null) {
      return {
        kind: 'resolved',
        repositoryUrl: parsedIdentity.repositoryUrl,
        repositoryFullName: canonicalFullName,
        targetRef: null,
        targetRefKind: 'none',
        defaultBranch: repository.default_branch,
      };
    }

    const explicitBranchName = stripPrefix(normalizedTargetRef, 'refs/heads/');
    if (explicitBranchName !== null) {
      return this.resolveBranchRef({
        owner,
        repo,
        repositoryUrl: parsedIdentity.repositoryUrl,
        repositoryFullName: canonicalFullName,
        defaultBranch: repository.default_branch,
        branchName: explicitBranchName,
      });
    }

    const explicitTagName =
      stripPrefix(normalizedTargetRef, 'refs/tags/') ?? stripPrefix(normalizedTargetRef, 'tags/');
    if (explicitTagName !== null) {
      return this.resolveTagRef({
        owner,
        repo,
        repositoryUrl: parsedIdentity.repositoryUrl,
        repositoryFullName: canonicalFullName,
        defaultBranch: repository.default_branch,
        tagName: explicitTagName,
      });
    }

    const branchResolution = await this.resolveBranchRef({
      owner,
      repo,
      repositoryUrl: parsedIdentity.repositoryUrl,
      repositoryFullName: canonicalFullName,
      defaultBranch: repository.default_branch,
      branchName: normalizedTargetRef,
    });
    if (branchResolution.kind === 'resolved') {
      return branchResolution;
    }

    const tagResolution = await this.resolveTagRef({
      owner,
      repo,
      repositoryUrl: parsedIdentity.repositoryUrl,
      repositoryFullName: canonicalFullName,
      defaultBranch: repository.default_branch,
      tagName: normalizedTargetRef,
    });
    if (tagResolution.kind === 'resolved') {
      return tagResolution;
    }

    if (/^[0-9a-f]{7,40}$/i.test(normalizedTargetRef)) {
      return this.resolveCommitRef({
        owner,
        repo,
        repositoryUrl: parsedIdentity.repositoryUrl,
        repositoryFullName: canonicalFullName,
        defaultBranch: repository.default_branch,
        commitish: normalizedTargetRef,
      });
    }

    return {
      kind: 'inaccessible',
      message: `GitHub could not resolve the requested target ref '${normalizedTargetRef}'.`,
    };
  }

  private async resolveBranchRef(args: {
    owner: string;
    repo: string;
    repositoryUrl: string;
    repositoryFullName: string;
    defaultBranch: string;
    branchName: string;
  }): Promise<GitHubRepositoryResolution> {
    try {
      await this.client.repos.getBranch({
        owner: args.owner,
        repo: args.repo,
        branch: args.branchName,
      });
      return {
        kind: 'resolved',
        repositoryUrl: args.repositoryUrl,
        repositoryFullName: args.repositoryFullName,
        targetRef: args.branchName,
        targetRefKind: 'branch',
        defaultBranch: args.defaultBranch,
      };
    } catch (error) {
      if (readErrorStatus(error) === 404) {
        return {
          kind: 'inaccessible',
          message: `GitHub branch '${args.branchName}' could not be accessed.`,
        };
      }

      return {
        kind: 'inaccessible',
        message: describeRepositoryLookupFailure(error),
      };
    }
  }

  private async resolveTagRef(args: {
    owner: string;
    repo: string;
    repositoryUrl: string;
    repositoryFullName: string;
    defaultBranch: string;
    tagName: string;
  }): Promise<GitHubRepositoryResolution> {
    try {
      await this.client.git.getRef({
        owner: args.owner,
        repo: args.repo,
        ref: `tags/${args.tagName}`,
      });
      return {
        kind: 'resolved',
        repositoryUrl: args.repositoryUrl,
        repositoryFullName: args.repositoryFullName,
        targetRef: args.tagName,
        targetRefKind: 'tag',
        defaultBranch: args.defaultBranch,
      };
    } catch (error) {
      if (readErrorStatus(error) === 404) {
        return {
          kind: 'inaccessible',
          message: `GitHub tag '${args.tagName}' could not be accessed.`,
        };
      }

      return {
        kind: 'inaccessible',
        message: describeRepositoryLookupFailure(error),
      };
    }
  }

  private async resolveCommitRef(args: {
    owner: string;
    repo: string;
    repositoryUrl: string;
    repositoryFullName: string;
    defaultBranch: string;
    commitish: string;
  }): Promise<GitHubRepositoryResolution> {
    try {
      await this.client.repos.getCommit({
        owner: args.owner,
        repo: args.repo,
        ref: args.commitish,
      });
      return {
        kind: 'resolved',
        repositoryUrl: args.repositoryUrl,
        repositoryFullName: args.repositoryFullName,
        targetRef: args.commitish,
        targetRefKind: 'commit',
        defaultBranch: args.defaultBranch,
      };
    } catch (error) {
      if (readErrorStatus(error) === 404) {
        return {
          kind: 'inaccessible',
          message: `GitHub commit '${args.commitish}' could not be accessed.`,
        };
      }

      return {
        kind: 'inaccessible',
        message: describeRepositoryLookupFailure(error),
      };
    }
  }
}

function stripPrefix(value: string, prefix: string): string | null {
  if (!value.startsWith(prefix)) {
    return null;
  }

  const stripped = value.slice(prefix.length).trim();
  return stripped.length > 0 ? stripped : null;
}

function readErrorStatus(error: unknown): number | null {
  if (error !== null && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }

  return null;
}

function describeRepositoryLookupFailure(error: unknown): string {
  const status = readErrorStatus(error);

  if (status === 401 || status === 403) {
    return 'GitHub rejected repository access with the current credentials.';
  }

  if (status === 404) {
    return 'GitHub could not find the requested repository or ref.';
  }

  if (error instanceof Error && error.message.length > 0) {
    return `GitHub repository validation failed: ${error.message}`;
  }

  return 'GitHub repository validation failed.';
}
