import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import {
  requestErrorSchema,
  shellBootstrapPayloadSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyArchivePageFixture, readyArchiveTurnPageFixture } from '../../fixtures/archive.js';
import { buildProcessWorkSurfaceFixture } from '../../fixtures/process-surface.js';

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

const projectId = readyArchivePageFixture.entries[0]?.projectId ?? 'project-archive-001';
const processId = readyArchivePageFixture.entries[0]?.processId ?? 'process-archive-001';

const archiveProcessSurfaceFixture = buildProcessWorkSurfaceFixture({
  project: {
    projectId,
    name: 'Archive Story Project',
    role: 'owner',
  },
  process: {
    processId,
    displayLabel: 'Archive replay process',
    processType: 'FeatureSpecification',
    status: 'completed',
    phaseLabel: 'Completed',
    nextActionLabel: null,
    availableActions: ['review'],
    controls: [],
    hasEnvironment: false,
    updatedAt: '2026-05-05T09:05:00.000Z',
  },
});

const derivedViewFailure = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_FAILED',
  message: 'The process archive could not be loaded right now. Try again or reload the page.',
  status: 500,
});

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

    if (url.pathname === `/api/projects/${projectId}/processes/${processId}`) {
      return buildJsonResponse(archiveProcessSurfaceFixture);
    }

    if (url.pathname === `/api/projects/${projectId}/processes/${processId}/archive`) {
      return buildJsonResponse(readyArchivePageFixture);
    }

    if (url.pathname === `/api/projects/${projectId}/processes/${processId}/archive/turns`) {
      return buildJsonResponse(readyArchiveTurnPageFixture);
    }

    if (
      url.pathname === `/api/projects/${projectId}/processes/${processId}/archive/derived-views`
    ) {
      return buildJsonResponse(derivedViewFailure, 503);
    }

    throw new Error(`Unexpected fetch request in archive-router test: ${url.pathname}`);
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

describe('archive router', () => {
  it('keeps canonical archive entries visible when the derived-view route fails', async () => {
    const fetchMock = installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${projectId}/processes/${processId}/archive`,
    );

    expect(dom.window.document.querySelector('[data-process-archive-page="true"]')).not.toBeNull();
    expect(dom.window.document.body.textContent).toContain('Archive replay process archive');
    expect(dom.window.document.body.textContent).toContain(
      readyArchivePageFixture.entries[0]?.bodyText ?? '',
    );
    expect(
      dom.window.document.querySelector(
        `[data-archive-turn-id="${readyArchiveTurnPageFixture.turns[0]?.turnId ?? ''}"]`,
      ),
    ).not.toBeNull();
    expect(
      dom.window.document.querySelector('[data-derived-archive-views-error="true"]')?.textContent,
    ).toContain(derivedViewFailure.message);
    expect(dom.window.document.querySelector('[data-derived-archive-view-id]')).toBeNull();
    expect(dom.window.document.body.textContent).toContain(derivedViewFailure.message);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${projectId}/processes/${processId}/archive/derived-views`,
      {
        credentials: 'include',
      },
    );
  });
});
