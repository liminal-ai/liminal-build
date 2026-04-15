import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProcessWorkSurfacePage } from '../../../apps/platform/client/features/processes/process-work-surface-page.js';
import { shellBootstrapPayloadSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  currentProcessRequestFixture,
  earlyProcessWorkSurfaceFixture,
  interruptedProcessWorkSurfaceFixture,
  processAccessDeniedErrorFixture,
  processProjectNotFoundErrorFixture,
  processResumeNotAvailableErrorFixture,
  processStartNotAvailableErrorFixture,
  processUnavailableErrorFixture,
  resumedInterruptedToFailedProcessResponseFixture,
  resumedInterruptedProcessResponseFixture,
  resumedPausedToCompletedProcessResponseFixture,
  resumedPausedProcessResponseFixture,
  pausedProcessWorkSurfaceFixture,
  readyProcessWorkSurfaceFixture,
  startedProcessResponseFixture,
  startedWaitingProcessResponseFixture,
  unauthenticatedRequestErrorFixture,
  unexpectedProcessActionErrorFixture,
} from '../../fixtures/process-surface.js';

function buildStore(overrides: Parameters<typeof createAppStore>[0] = {}) {
  return createAppStore({
    auth: {
      actor: {
        id: 'user:workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      isResolved: true,
      csrfToken: 'csrf-token',
    },
    route: {
      pathname: `/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
      projectId: readyProcessWorkSurfaceFixture.project.projectId,
      selectedProcessId: null,
    },
    processSurface: {
      projectId: readyProcessWorkSurfaceFixture.project.projectId,
      processId: readyProcessWorkSurfaceFixture.process.processId,
      project: readyProcessWorkSurfaceFixture.project,
      process: readyProcessWorkSurfaceFixture.process,
      history: readyProcessWorkSurfaceFixture.history,
      materials: readyProcessWorkSurfaceFixture.materials,
      currentRequest: readyProcessWorkSurfaceFixture.currentRequest,
      sideWork: readyProcessWorkSurfaceFixture.sideWork,
      isLoading: false,
      error: null,
      actionError: null,
      live: {
        connectionState: 'idle',
        subscriptionId: null,
        lastSequenceNumber: null,
        error: null,
      },
    },
    ...overrides,
  });
}

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

async function captureUnhandledRejections(action: () => void | Promise<void>): Promise<unknown[]> {
  const unhandledRejections: unknown[] = [];
  const handler = (reason: unknown) => {
    unhandledRejections.push(reason);
  };

  process.on('unhandledRejection', handler);

  try {
    await action();
    await flush();
    await flush();
  } finally {
    process.off('unhandledRejection', handler);
  }

  return unhandledRejections;
}

function installInteractiveFetchMock(args: {
  surface:
    | typeof earlyProcessWorkSurfaceFixture
    | typeof pausedProcessWorkSurfaceFixture
    | typeof interruptedProcessWorkSurfaceFixture;
  actionPayload: unknown;
  actionStatus?: number;
  actionFailure?: Error;
  action: 'start' | 'resume';
}) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, 'http://localhost:5001');
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

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
      method === 'GET' &&
      url.pathname ===
        `/api/projects/${args.surface.project.projectId}/processes/${args.surface.process.processId}`
    ) {
      return buildJsonResponse(args.surface);
    }

    if (
      method === 'POST' &&
      url.pathname ===
        `/api/projects/${args.surface.project.projectId}/processes/${args.surface.process.processId}/${args.action}`
    ) {
      if (args.actionFailure !== undefined) {
        throw args.actionFailure;
      }

      return buildJsonResponse(args.actionPayload, args.actionStatus ?? 200);
    }

    throw new Error(
      `Unexpected fetch request in process-work-surface-page test: ${method} ${url.pathname}`,
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function countSurfaceBootstrapRequests(
  fetchMock: ReturnType<typeof vi.fn>,
  args: {
    projectId: string;
    processId: string;
  },
): number {
  return fetchMock.mock.calls.filter(([input, init]) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, 'http://localhost:5001');
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

    return (
      method === 'GET' &&
      url.pathname === `/api/projects/${args.projectId}/processes/${args.processId}`
    );
  }).length;
}

async function renderInteractiveProcessSurface(
  startUrl: string,
  options: {
    locationAssign?: (url: string) => void;
  } = {},
) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: startUrl,
  });
  const url = new URL(startUrl);
  const targetWindow = {
    document: dom.window.document,
    history: dom.window.history,
    location: {
      href: url.href,
      pathname: url.pathname,
      search: url.search,
      assign: options.locationAssign ?? dom.window.location.assign.bind(dom.window.location),
    },
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
    setTimeout: dom.window.setTimeout.bind(dom.window),
    clearTimeout: dom.window.clearTimeout.bind(dom.window),
  } as unknown as Window & typeof globalThis;

  targetWindow.__SHELL_BOOTSTRAP__ = shellBootstrapPayloadSchema.parse({
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

  await bootstrapApp(targetWindow);
  await flush();

  return dom;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('process work surface page', () => {
  it('TC-1.2a renders active project and process identity', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.textContent).toContain(readyProcessWorkSurfaceFixture.project.name);
    expect(view.textContent).toContain(readyProcessWorkSurfaceFixture.process.displayLabel);
    expect(view.textContent).toContain('Feature Specification');
    expect(view.textContent).toContain(
      `Phase: ${readyProcessWorkSurfaceFixture.process.phaseLabel}`,
    );
    expect(view.textContent).toContain('Waiting');
  });

  it('TC-1.3a and TC-1.3b render the next action and current blocker on load', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.textContent).toContain(
      `Next action: ${readyProcessWorkSurfaceFixture.process.nextActionLabel}`,
    );
    expect(view.textContent).toContain(
      readyProcessWorkSurfaceFixture.currentRequest?.promptText ?? '',
    );
  });

  it('TC-1.4a renders history, materials, and side-work sections together', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.textContent).toContain('Process history');
    expect(view.textContent).toContain('Current materials');
    expect(view.textContent).toContain('Side work');
    expect(view.textContent).toContain(readyProcessWorkSurfaceFixture.history.items[0]?.text ?? '');
    expect(view.textContent).toContain(
      readyProcessWorkSurfaceFixture.materials.currentArtifacts[0]?.displayName ?? '',
    );
    expect(view.textContent).toContain(
      readyProcessWorkSurfaceFixture.sideWork.items[0]?.displayLabel ?? '',
    );
  });

  it('renders request-level unavailable state without stale process content', () => {
    const store = buildStore({
      processSurface: {
        projectId: readyProcessWorkSurfaceFixture.project.projectId,
        processId: readyProcessWorkSurfaceFixture.process.processId,
        project: null,
        process: null,
        history: null,
        materials: null,
        currentRequest: null,
        sideWork: null,
        isLoading: false,
        error: processAccessDeniedErrorFixture,
        actionError: null,
        live: {
          connectionState: 'idle',
          subscriptionId: null,
          lastSequenceNumber: null,
          error: null,
        },
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: vi.fn(),
    });

    expect(view.textContent).toContain('Access denied');
    expect(view.textContent).not.toContain(readyProcessWorkSurfaceFixture.process.displayLabel);
  });

  it('does not render start or resume controls when neither action is available', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: vi.fn(),
    });

    const actionButtons = [...view.querySelectorAll('button')].filter(
      (button) => button.textContent === 'Start process' || button.textContent === 'Resume process',
    );

    expect(actionButtons).toHaveLength(0);
  });

  it('TC-2.1a and TC-2.5a clicking Start applies the returned process state without a manual refresh', async () => {
    const fetchMock = installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: startedProcessResponseFixture,
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    startButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Running');
    expect(dom.window.document.body.textContent).toContain(
      startedProcessResponseFixture.process.nextActionLabel ?? '',
    );

    expect(
      countSurfaceBootstrapRequests(fetchMock, {
        projectId: earlyProcessWorkSurfaceFixture.project.projectId,
        processId: earlyProcessWorkSurfaceFixture.process.processId,
      }),
    ).toBe(1);
  });

  it('TC-2.1b and TC-2.5b clicking Resume on a paused process applies the returned process state without a manual refresh', async () => {
    installInteractiveFetchMock({
      surface: pausedProcessWorkSurfaceFixture,
      actionPayload: resumedPausedProcessResponseFixture,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Running');
    expect(dom.window.document.body.textContent).toContain(
      resumedPausedProcessResponseFixture.process.nextActionLabel ?? '',
    );
  });

  it('TC-2.1c clicking Resume on an interrupted process applies the returned process state in-session', async () => {
    installInteractiveFetchMock({
      surface: interruptedProcessWorkSurfaceFixture,
      actionPayload: resumedInterruptedProcessResponseFixture,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${interruptedProcessWorkSurfaceFixture.project.projectId}/processes/${interruptedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Running');
    expect(dom.window.document.body.textContent).toContain(
      resumedInterruptedProcessResponseFixture.process.nextActionLabel ?? '',
    );
  });

  it('preserves the draft surface and shows an inline error when Start returns PROCESS_ACTION_NOT_AVAILABLE', async () => {
    const fetchMock = installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: processStartNotAvailableErrorFixture,
      actionStatus: 409,
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    startButton.click();
    await flush();

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');

    expect(actionError?.textContent).toContain(processStartNotAvailableErrorFixture.message);
    expect(dom.window.document.body.textContent).toContain(
      earlyProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain('Draft');
    expect(dom.window.document.body.textContent).toContain(
      `Next action: ${earlyProcessWorkSurfaceFixture.process.nextActionLabel}`,
    );
    expect(
      countSurfaceBootstrapRequests(fetchMock, {
        projectId: earlyProcessWorkSurfaceFixture.project.projectId,
        processId: earlyProcessWorkSurfaceFixture.process.processId,
      }),
    ).toBe(1);
  });

  it('preserves the paused surface and shows an inline error when Resume returns PROCESS_ACTION_NOT_AVAILABLE', async () => {
    const fetchMock = installInteractiveFetchMock({
      surface: pausedProcessWorkSurfaceFixture,
      actionPayload: processResumeNotAvailableErrorFixture,
      actionStatus: 409,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');

    expect(actionError?.textContent).toContain(processResumeNotAvailableErrorFixture.message);
    expect(dom.window.document.body.textContent).toContain(
      pausedProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain('Paused');
    expect(dom.window.document.body.textContent).toContain(
      `Next action: ${pausedProcessWorkSurfaceFixture.process.nextActionLabel}`,
    );
    expect(
      countSurfaceBootstrapRequests(fetchMock, {
        projectId: pausedProcessWorkSurfaceFixture.project.projectId,
        processId: pausedProcessWorkSurfaceFixture.process.processId,
      }),
    ).toBe(1);
  });

  it('shows a process unavailable state when Start returns PROCESS_NOT_FOUND without dropping the rejection', async () => {
    installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: processUnavailableErrorFixture,
      actionStatus: 404,
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    const unhandledRejections = await captureUnhandledRejections(() => {
      startButton.click();
    });

    expect(unhandledRejections).toEqual([]);
    expect(dom.window.document.body.textContent).toContain('Process unavailable');
    expect(dom.window.document.body.textContent).not.toContain(
      earlyProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.querySelector('[data-process-action-error="true"]')).toBeNull();
  });

  it('shows an access denied state when Resume returns PROJECT_FORBIDDEN', async () => {
    installInteractiveFetchMock({
      surface: pausedProcessWorkSurfaceFixture,
      actionPayload: processAccessDeniedErrorFixture,
      actionStatus: 403,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Access denied');
    expect(dom.window.document.body.textContent).not.toContain(
      pausedProcessWorkSurfaceFixture.process.displayLabel,
    );
  });

  it('shows a project unavailable state when Start returns PROJECT_NOT_FOUND', async () => {
    installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: processProjectNotFoundErrorFixture,
      actionStatus: 404,
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    startButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Project not found');
    expect(dom.window.document.body.textContent).not.toContain(
      earlyProcessWorkSurfaceFixture.process.displayLabel,
    );
  });

  it('redirects to login when Resume returns UNAUTHENTICATED', async () => {
    installInteractiveFetchMock({
      surface: pausedProcessWorkSurfaceFixture,
      actionPayload: unauthenticatedRequestErrorFixture,
      actionStatus: 401,
      action: 'resume',
    });
    const assign = vi.fn();
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
      {
        locationAssign: assign,
      },
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    expect(assign).toHaveBeenCalledWith(
      `/auth/login?returnTo=${encodeURIComponent(
        `/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
      )}`,
    );
  });

  it('shows a bounded inline error when Start fails unexpectedly without dropping the rejection', async () => {
    installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: startedProcessResponseFixture,
      actionFailure: new TypeError('network unavailable'),
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    const unhandledRejections = await captureUnhandledRejections(() => {
      startButton.click();
    });

    expect(unhandledRejections).toEqual([]);
    expect(dom.window.document.body.textContent).toContain(
      earlyProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain('Draft');

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');

    expect(actionError?.textContent).toContain(unexpectedProcessActionErrorFixture.message);
  });

  it('TC-2.4a shows a returned waiting state and current request at the Story 2 action boundary', async () => {
    installInteractiveFetchMock({
      surface: earlyProcessWorkSurfaceFixture,
      actionPayload: startedWaitingProcessResponseFixture,
      action: 'start',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${earlyProcessWorkSurfaceFixture.project.projectId}/processes/${earlyProcessWorkSurfaceFixture.process.processId}`,
    );
    const startButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Start process',
    );

    if (!(startButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Start process button.');
    }

    startButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Waiting');
    expect(dom.window.document.body.textContent).toContain(
      startedWaitingProcessResponseFixture.process.nextActionLabel ?? '',
    );
    expect(dom.window.document.body.textContent).toContain(
      startedWaitingProcessResponseFixture.currentRequest?.promptText ??
        currentProcessRequestFixture.promptText,
    );
  });

  it('TC-2.4b shows a returned completed state at the Story 2 action boundary', async () => {
    installInteractiveFetchMock({
      surface: pausedProcessWorkSurfaceFixture,
      actionPayload: resumedPausedToCompletedProcessResponseFixture,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${pausedProcessWorkSurfaceFixture.project.projectId}/processes/${pausedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    const actionButtons = [...dom.window.document.querySelectorAll('button')].filter(
      (button) => button.textContent === 'Start process' || button.textContent === 'Resume process',
    );

    expect(dom.window.document.body.textContent).toContain('Completed');
    expect(dom.window.document.body.textContent).not.toContain('Next action:');
    expect(dom.window.document.body.textContent).toContain('No unresolved request right now.');
    expect(actionButtons).toHaveLength(0);
  });

  it('TC-2.4c shows a returned failed state and next path at the Story 2 action boundary', async () => {
    installInteractiveFetchMock({
      surface: interruptedProcessWorkSurfaceFixture,
      actionPayload: resumedInterruptedToFailedProcessResponseFixture,
      action: 'resume',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${interruptedProcessWorkSurfaceFixture.project.projectId}/processes/${interruptedProcessWorkSurfaceFixture.process.processId}`,
    );
    const resumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    if (!(resumeButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Resume process button.');
    }

    resumeButton.click();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Failed');
    expect(dom.window.document.body.textContent).toContain(
      resumedInterruptedToFailedProcessResponseFixture.process.nextActionLabel ?? '',
    );
    expect(dom.window.document.body.textContent).not.toContain('Resume process');
  });
});
