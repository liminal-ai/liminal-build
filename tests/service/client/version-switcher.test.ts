// @vitest-environment jsdom

import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { renderVersionSwitcher } from '../../../apps/platform/client/features/review/version-switcher.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  currentArtifactVersionFixture,
  markdownArtifactVersionDetailFixture,
  priorArtifactVersionFixture,
  priorMarkdownArtifactVersionDetailFixture,
  readyArtifactReviewTargetFixture,
} from '../../fixtures/artifact-versions.js';
import { readyArtifactReviewWorkspaceFixture } from '../../fixtures/review-workspace.js';

type DeferredResponse = {
  promise: Promise<Response>;
  resolve: (body: unknown, status?: number) => void;
};

function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function createDeferredResponse(): DeferredResponse {
  let resolve: DeferredResponse['resolve'] | undefined;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = (body, status) => {
      innerResolve(buildJsonResponse(body, status));
    };
  });

  if (resolve === undefined) {
    throw new Error('Expected deferred response resolver to be initialized.');
  }

  return { promise, resolve };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderReviewApp(fetchMock: typeof fetch) {
  vi.stubGlobal('fetch', fetchMock);
  const startUrl = `http://localhost:5001/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review`;
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

describe('version switcher', () => {
  it('TC-2.3b renders versions newest to oldest', () => {
    const switcher = renderVersionSwitcher({
      versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
      selectedVersionId: currentArtifactVersionFixture.versionId,
      targetDocument: document,
      onSelect: vi.fn(),
    });

    expect(
      [...switcher.querySelectorAll('[data-artifact-version-id]')].map((node) =>
        node.getAttribute('data-artifact-version-id'),
      ),
    ).toEqual([currentArtifactVersionFixture.versionId, priorArtifactVersionFixture.versionId]);
  });

  it('TC-2.3a calls onSelect when the user chooses a prior version', () => {
    const onSelect = vi.fn();
    const switcher = renderVersionSwitcher({
      versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
      selectedVersionId: currentArtifactVersionFixture.versionId,
      targetDocument: document,
      onSelect,
    });
    const priorVersionButton = switcher.querySelector(
      `[data-artifact-version-id="${priorArtifactVersionFixture.versionId}"]`,
    );

    if (!(priorVersionButton instanceof HTMLElement)) {
      throw new Error('Expected the version switcher to render the prior-version option.');
    }

    priorVersionButton.click();

    expect(onSelect).toHaveBeenCalledWith(priorArtifactVersionFixture.versionId);
  });

  it('drops stale artifact version responses when a newer version selection wins', async () => {
    const priorRequest = createDeferredResponse();
    const currentRequest = createDeferredResponse();
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, 'http://localhost:5001');

      if (url.pathname === '/auth/me') {
        return Promise.resolve(
          buildJsonResponse({
            user: {
              id: 'user:workos-user-1',
              email: 'lee@example.com',
              displayName: 'Lee Moore',
            },
          }),
        );
      }

      if (
        url.pathname ===
        `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review`
      ) {
        return Promise.resolve(buildJsonResponse(readyArtifactReviewWorkspaceFixture));
      }

      if (
        url.pathname ===
          `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review/artifacts/${readyArtifactReviewTargetFixture.artifactId}` &&
        url.searchParams.get('versionId') === priorArtifactVersionFixture.versionId
      ) {
        return priorRequest.promise;
      }

      if (
        url.pathname ===
          `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review/artifacts/${readyArtifactReviewTargetFixture.artifactId}` &&
        url.searchParams.get('versionId') === currentArtifactVersionFixture.versionId
      ) {
        return currentRequest.promise;
      }

      return Promise.reject(new Error(`Unexpected fetch request: ${url.pathname}${url.search}`));
    });
    const dom = await renderReviewApp(fetchMock);
    const priorVersionButton = dom.window.document.querySelector(
      `[data-artifact-version-id="${priorArtifactVersionFixture.versionId}"]`,
    );
    const currentVersionButton = dom.window.document.querySelector(
      `[data-artifact-version-id="${currentArtifactVersionFixture.versionId}"]`,
    );

    if (
      !(priorVersionButton instanceof dom.window.HTMLElement) ||
      !(currentVersionButton instanceof dom.window.HTMLElement)
    ) {
      throw new Error('Expected both version options to be rendered.');
    }

    priorVersionButton.click();
    currentVersionButton.click();
    currentRequest.resolve({
      ...readyArtifactReviewTargetFixture,
      selectedVersionId: currentArtifactVersionFixture.versionId,
      selectedVersion: {
        ...markdownArtifactVersionDetailFixture,
        body: '<h1>Current version wins</h1>',
      },
    });
    await flush();
    priorRequest.resolve({
      ...readyArtifactReviewTargetFixture,
      selectedVersionId: priorArtifactVersionFixture.versionId,
      selectedVersion: {
        ...priorMarkdownArtifactVersionDetailFixture,
        body: '<h1>Stale prior version</h1>',
      },
    });
    await flush();

    expect(dom.window.document.body.textContent).toContain('Current version wins');
    expect(dom.window.document.body.textContent).not.toContain('Stale prior version');
    expect(dom.window.location.href).toContain(
      `versionId=${currentArtifactVersionFixture.versionId}`,
    );
  });

  it('drops stale artifact version errors when a newer version selection succeeds', async () => {
    const priorRequest = createDeferredResponse();
    const currentRequest = createDeferredResponse();
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, 'http://localhost:5001');

      if (url.pathname === '/auth/me') {
        return Promise.resolve(
          buildJsonResponse({
            user: {
              id: 'user:workos-user-1',
              email: 'lee@example.com',
              displayName: 'Lee Moore',
            },
          }),
        );
      }

      if (
        url.pathname ===
        `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review`
      ) {
        return Promise.resolve(buildJsonResponse(readyArtifactReviewWorkspaceFixture));
      }

      if (
        url.pathname ===
          `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review/artifacts/${readyArtifactReviewTargetFixture.artifactId}` &&
        url.searchParams.get('versionId') === priorArtifactVersionFixture.versionId
      ) {
        return priorRequest.promise;
      }

      if (
        url.pathname ===
          `/api/projects/${readyArtifactReviewWorkspaceFixture.project.projectId}/processes/${readyArtifactReviewWorkspaceFixture.process.processId}/review/artifacts/${readyArtifactReviewTargetFixture.artifactId}` &&
        url.searchParams.get('versionId') === currentArtifactVersionFixture.versionId
      ) {
        return currentRequest.promise;
      }

      return Promise.reject(new Error(`Unexpected fetch request: ${url.pathname}${url.search}`));
    });
    const dom = await renderReviewApp(fetchMock);
    const priorVersionButton = dom.window.document.querySelector(
      `[data-artifact-version-id="${priorArtifactVersionFixture.versionId}"]`,
    );
    const currentVersionButton = dom.window.document.querySelector(
      `[data-artifact-version-id="${currentArtifactVersionFixture.versionId}"]`,
    );

    if (
      !(priorVersionButton instanceof dom.window.HTMLElement) ||
      !(currentVersionButton instanceof dom.window.HTMLElement)
    ) {
      throw new Error('Expected both version options to be rendered.');
    }

    priorVersionButton.click();
    currentVersionButton.click();
    currentRequest.resolve({
      ...readyArtifactReviewTargetFixture,
      selectedVersionId: currentArtifactVersionFixture.versionId,
      selectedVersion: {
        ...markdownArtifactVersionDetailFixture,
        body: '<h1>Current version survives stale error</h1>',
      },
    });
    await flush();
    priorRequest.resolve(
      {
        code: 'PROCESS_ACTION_FAILED',
        message: 'Stale version load failed.',
        status: 500,
      },
      500,
    );
    await flush();

    expect(dom.window.document.body.textContent).toContain('Current version survives stale error');
    expect(dom.window.document.body.textContent).not.toContain('Stale version load failed.');
    expect(dom.window.location.href).toContain(
      `versionId=${currentArtifactVersionFixture.versionId}`,
    );
  });
});
