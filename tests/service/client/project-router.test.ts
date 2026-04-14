import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  emptyProjectShellResponse,
  memberProjectSummary,
  ownerProjectSummary,
  populatedProjectShellResponse,
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
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const pathname = rawUrl.startsWith('http')
      ? new URL(rawUrl).pathname
      : new URL(rawUrl, 'http://localhost:5001').pathname;

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
        ...populatedProjectShellResponse,
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

  it('TC-6.2b clears a missing selected-process query and shows a banner', async () => {
    installFetchMock();
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: `http://localhost:5001/projects/${memberProjectSummary.projectId}?processId=missing-process`,
    });
    const replaceStateSpy = vi.spyOn(dom.window.history, 'replaceState');

    (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
      shellBootstrapPayloadSchema.parse({
        actor: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        pathname: `/projects/${memberProjectSummary.projectId}`,
        search: '?processId=missing-process',
        csrfToken: 'csrf-token',
        auth: {
          loginPath: '/auth/login',
          logoutPath: '/auth/logout',
        },
      });

    await bootstrapApp(dom.window as unknown as Window & typeof globalThis);
    await flush();

    expect(dom.window.location.pathname).toBe(`/projects/${memberProjectSummary.projectId}`);
    expect(dom.window.location.search).toBe('');
    expect(dom.window.document.body.textContent).toContain(
      'The requested process is unavailable and the shell cleared the selection.',
    );
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      `/projects/${memberProjectSummary.projectId}`,
    );
  });

  it('uses replaceState when clearing stale processId', async () => {
    installFetchMock();
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: `http://localhost:5001/projects/${memberProjectSummary.projectId}?processId=missing-process`,
    });
    const replaceStateSpy = vi.spyOn(dom.window.history, 'replaceState');

    (dom.window as unknown as Window & typeof globalThis).__SHELL_BOOTSTRAP__ =
      shellBootstrapPayloadSchema.parse({
        actor: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        pathname: `/projects/${memberProjectSummary.projectId}`,
        search: '?processId=missing-process',
        csrfToken: 'csrf-token',
        auth: {
          loginPath: '/auth/login',
          logoutPath: '/auth/logout',
        },
      });

    await bootstrapApp(dom.window as unknown as Window & typeof globalThis);
    await flush();

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      `/projects/${memberProjectSummary.projectId}`,
    );
  });

  it('TC-4.4c keeps a valid selected process focused from route state', async () => {
    installFetchMock();
    const selectedProcessId = populatedProjectShellResponse.processes.items[1]?.processId;

    if (selectedProcessId === undefined) {
      throw new Error('Expected the populated project shell fixture to include a second process.');
    }

    const dom = await renderApp(
      `http://localhost:5001/projects/${memberProjectSummary.projectId}?processId=${selectedProcessId}`,
    );

    expect(dom.window.location.search).toBe(`?processId=${selectedProcessId}`);
    const selectedProcess = dom.window.document.querySelector('[data-process-selected="true"]');
    expect(selectedProcess?.textContent).toContain(
      populatedProjectShellResponse.processes.items[1]?.displayLabel ?? '',
    );
  });
});
