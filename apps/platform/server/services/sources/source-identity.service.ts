export interface ParsedGitHubRepositoryIdentity {
  repositoryUrl: string;
  repositoryFullName: string;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function stripDotGitSegment(value: string): string {
  return value.endsWith('.git') ? value.slice(0, -'.git'.length) : value;
}

export class SourceIdentityService {
  normalizeRepositoryFullName(repositoryFullName: string): string {
    return repositoryFullName.trim().toLowerCase();
  }

  normalizeTargetRef(targetRef: string | null | undefined): string | null {
    if (targetRef === null || targetRef === undefined) {
      return null;
    }

    const normalized = targetRef.trim();
    return normalized.length > 0 ? normalized : null;
  }

  parseGitHubRepositoryUrl(repositoryUrl: string): ParsedGitHubRepositoryIdentity | null {
    const trimmedUrl = repositoryUrl.trim();

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return null;
    }

    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'github.com') {
      return null;
    }

    const pathSegments = parsedUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (pathSegments.length !== 2) {
      return null;
    }

    const owner = pathSegments[0];
    const repo = stripDotGitSegment(pathSegments[1] ?? '');

    if (owner === undefined || owner.length === 0 || repo.length === 0) {
      return null;
    }

    const canonicalUrl = trimTrailingSlash(`${parsedUrl.protocol}//github.com/${owner}/${repo}`);

    return {
      repositoryUrl: canonicalUrl,
      repositoryFullName: this.normalizeRepositoryFullName(`${owner}/${repo}`),
    };
  }
}
