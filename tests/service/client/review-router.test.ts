import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  readyArtifactReviewWorkspaceFixture,
  zeroTargetReviewWorkspaceFixture,
} from '../../fixtures/review-workspace.js';

const zeroTargetRouteFixture = {
  ...zeroTargetReviewWorkspaceFixture,
  project: {
    ...zeroTargetReviewWorkspaceFixture.project,
    projectId: 'project-review-empty-001',
  },
  process: {
    ...zeroTargetReviewWorkspaceFixture.process,
    processId: 'process-review-empty-001',
  },
};

function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function installFetchMock() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, 'http://localhost:5001');

    if (url.pathname === '/auth/me') {
      return buildJsonResponse({
        user: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
      });
    }

    if (
      url.pathname ===
        `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review` &&
      url.search === ''
    ) {
      return buildJsonResponse(readyArtifactReviewWorkspaceFixture);
    }

    if (
      url.pathname ===
      `/api/projects/${zeroTargetRouteFixture.project.projectId}/processes/${zeroTargetRouteFixture.process.processId}/review`
    ) {
      return buildJsonResponse(zeroTargetRouteFixture);
    }

    throw new Error(`Unexpected fetch request in review-router test: ${url.pathname}${url.search}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderApp(startUrl: string) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: startUrl,
  });
  const url = new URL(startUrl);
  (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
    shellBootstrapPayloadSchema.parse({
      actor: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      pathname: url.pathname,
      search: url.search,
      csrfToken: 'csrf-token',
      auth: {
        loginPath: '/auth/login',
        logoutPath: '/auth/logout',
      },
    });

  await bootstrapApp(dom.window as unknown as Window & typeof globalThis);
  await flush();

  return dom;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('review router', () => {
  it('TC-1.1a direct review URL mounts the review workspace and fetches the bootstrap API', async () => {
    const fetchMock = installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review`,
    );

    expect(dom.window.document.querySelector('[data-review-workspace="true"]')).not.toBeNull();
    expect(dom.window.document.body.textContent).toContain(
      readyArtifactReviewWorkspaceFixture.process.displayLabel,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review`,
      {
        credentials: 'include',
      },
    );
  });

  it('TC-1.1e zero-target review URL renders the empty review state', async () => {
    installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${zeroTargetRouteFixture.project.projectId}/processes/${zeroTargetRouteFixture.process.processId}/review`,
    );

    expect(dom.window.document.body.textContent).toContain(
      'No review targets are available for this process yet.',
    );
  });
});
