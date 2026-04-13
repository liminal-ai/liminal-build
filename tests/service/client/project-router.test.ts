import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  emptyProjectShellResponse,
  memberProjectSummary,
  ownerProjectSummary,
} from '../../fixtures/projects.js';

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
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;

    if (pathname === '/auth/me') {
      return buildJsonResponse({
        user: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
      });
    }

    if (pathname === '/api/projects') {
      return buildJsonResponse([ownerProjectSummary, memberProjectSummary]);
    }

    if (pathname === `/api/projects/${ownerProjectSummary.projectId}`) {
      return buildJsonResponse(emptyProjectShellResponse);
    }

    if (pathname === `/api/projects/${memberProjectSummary.projectId}`) {
      return buildJsonResponse({
        ...emptyProjectShellResponse,
        project: memberProjectSummary,
      });
    }

    throw new Error(`Unexpected fetch request in project-router test: ${pathname}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderApp(startUrl: string) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: startUrl,
  });

  (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
    shellBootstrapPayloadSchema.parse({
      actor: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      pathname: new URL(startUrl).pathname,
      search: new URL(startUrl).search,
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

describe('project router', () => {
  it('TC-2.2a opens a project from the index', async () => {
    installFetchMock();
    const dom = await renderApp('http://localhost:5001/projects');
    const link = dom.window.document.querySelector(
      `a[href="/projects/${ownerProjectSummary.projectId}"]`,
    );

    if (!(link instanceof dom.window.HTMLAnchorElement)) {
      throw new Error('Expected project card link to be present on the index page.');
    }

    link.click();
    await flush();

    expect(dom.window.location.pathname).toBe(`/projects/${ownerProjectSummary.projectId}`);
    expect(dom.window.document.body.textContent).toContain(ownerProjectSummary.name);
    expect(dom.window.document.body.textContent).toContain('Role: owner');
  });

  it('TC-2.2b and TC-2.3b load the same project shell from a direct URL on refresh', async () => {
    installFetchMock();
    const dom = await renderApp(`http://localhost:5001/projects/${ownerProjectSummary.projectId}`);

    expect(dom.window.location.pathname).toBe(`/projects/${ownerProjectSummary.projectId}`);
    expect(dom.window.document.body.textContent).toContain(ownerProjectSummary.name);
    expect(dom.window.document.body.textContent).toContain('Role: owner');
  });

  it('TC-2.2c switches cleanly between projects without stale shell data', async () => {
    installFetchMock();
    const dom = await renderApp(`http://localhost:5001/projects/${ownerProjectSummary.projectId}`);

    dom.window.history.pushState({}, '', `/projects/${memberProjectSummary.projectId}`);
    dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
    await flush();

    expect(dom.window.location.pathname).toBe(`/projects/${memberProjectSummary.projectId}`);
    expect(dom.window.document.body.textContent).toContain(memberProjectSummary.name);
    expect(dom.window.document.body.textContent).toContain('Role: member');
    expect(dom.window.document.body.textContent).not.toContain(`Role: ${ownerProjectSummary.role}`);
  });

  it('TC-2.3c restores matching index and shell state with browser navigation', async () => {
    installFetchMock();
    const dom = await renderApp('http://localhost:5001/projects');
    const link = dom.window.document.querySelector(
      `a[href="/projects/${ownerProjectSummary.projectId}"]`,
    );

    if (!(link instanceof dom.window.HTMLAnchorElement)) {
      throw new Error('Expected project card link to be present on the index page.');
    }

    link.click();
    await flush();
    dom.window.history.back();
    await flush();
    await flush();

    expect(dom.window.location.pathname).toBe('/projects');
    expect(dom.window.document.body.textContent).toContain('Projects');

    dom.window.history.forward();
    await flush();
    await flush();

    expect(dom.window.location.pathname).toBe(`/projects/${ownerProjectSummary.projectId}`);
    expect(dom.window.document.body.textContent).toContain(ownerProjectSummary.name);
  });
});
