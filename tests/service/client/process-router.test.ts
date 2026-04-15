import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import {
  processSummarySchema,
  projectShellResponseSchema,
  projectSummarySchema,
  shellBootstrapPayloadSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  processAccessDeniedErrorFixture,
  processUnavailableErrorFixture,
  readyProcessWorkSurfaceFixture,
} from '../../fixtures/process-surface.js';

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

const projectSummary = projectSummarySchema.parse({
  projectId: readyProcessWorkSurfaceFixture.project.projectId,
  name: readyProcessWorkSurfaceFixture.project.name,
  ownerDisplayName: 'Lee Moore',
  role: readyProcessWorkSurfaceFixture.project.role,
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: readyProcessWorkSurfaceFixture.process.updatedAt,
});

const shellProcessSummary = processSummarySchema.parse({
  processId: readyProcessWorkSurfaceFixture.process.processId,
  displayLabel: readyProcessWorkSurfaceFixture.process.displayLabel,
  processType: readyProcessWorkSurfaceFixture.process.processType,
  status: readyProcessWorkSurfaceFixture.process.status,
  phaseLabel: readyProcessWorkSurfaceFixture.process.phaseLabel,
  nextActionLabel: readyProcessWorkSurfaceFixture.process.nextActionLabel,
  availableActions: ['respond'],
  hasEnvironment: false,
  updatedAt: readyProcessWorkSurfaceFixture.process.updatedAt,
});

const shellResponse = projectShellResponseSchema.parse({
  project: projectSummary,
  processes: {
    status: 'ready',
    items: [shellProcessSummary],
  },
  artifacts: {
    status: 'empty',
    items: [],
  },
  sourceAttachments: {
    status: 'empty',
    items: [],
  },
});

function installFetchMock() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, 'http://localhost:5001');
    const pathname = url.pathname;

    if (pathname === '/auth/me') {
      return buildJsonResponse({
        user: {
          id: 'user:workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
      });
    }

    if (
      pathname ===
      `/api/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`
    ) {
      return buildJsonResponse(readyProcessWorkSurfaceFixture);
    }

    if (pathname === `/api/projects/${projectSummary.projectId}/processes/missing-process`) {
      return buildJsonResponse(
        processUnavailableErrorFixture,
        processUnavailableErrorFixture.status,
      );
    }

    if (pathname === `/api/projects/${projectSummary.projectId}/processes/forbidden-process`) {
      return buildJsonResponse(
        processAccessDeniedErrorFixture,
        processAccessDeniedErrorFixture.status,
      );
    }

    if (pathname === `/api/projects/${projectSummary.projectId}`) {
      return buildJsonResponse(shellResponse);
    }

    throw new Error(`Unexpected fetch request in process-router test: ${pathname}`);
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

describe('process router', () => {
  it('TC-1.1a opening a process from the project shell navigates to the dedicated process route', async () => {
    installFetchMock();
    const dom = await renderApp(`http://localhost:5001/projects/${projectSummary.projectId}`);
    const openButton = [...dom.window.document.querySelectorAll('button')].find(
      (element) => element.textContent === 'Open process',
    );

    if (!(openButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the project shell to render an Open process button.');
    }

    openButton.click();
    await flush();

    expect(dom.window.location.pathname).toBe(
      `/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );
    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.process.displayLabel,
    );
  });

  it('TC-1.1b direct process URL mounts the process work surface', async () => {
    const fetchMock = installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );

    expect(dom.window.document.querySelector('[data-process-work-surface="true"]')).not.toBeNull();
    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.project.name,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
      {
        credentials: 'include',
      },
    );
  });

  it('TC-6.1a browser reload preserves the current process route', async () => {
    const fetchMock = installFetchMock();

    await renderApp(
      `http://localhost:5001/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );
    await renderApp(
      `http://localhost:5001/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );

    const surfaceRequests = fetchMock.mock.calls.filter(
      ([input]) =>
        input ===
        `/api/projects/${projectSummary.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );

    expect(surfaceRequests).toHaveLength(2);
  });

  it('TC-6.4a missing process shows a safe unavailable state', async () => {
    installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${projectSummary.projectId}/processes/missing-process`,
    );

    expect(dom.window.document.body.textContent).toContain('Process unavailable');
    expect(dom.window.document.body.textContent).not.toContain(
      readyProcessWorkSurfaceFixture.process.displayLabel,
    );
  });

  it('TC-6.4b revoked access blocks the process surface without leaking content', async () => {
    installFetchMock();
    const dom = await renderApp(
      `http://localhost:5001/projects/${projectSummary.projectId}/processes/forbidden-process`,
    );

    expect(dom.window.document.body.textContent).toContain('Access denied');
    expect(dom.window.document.body.textContent).not.toContain(
      readyProcessWorkSurfaceFixture.process.displayLabel,
    );
  });
});
