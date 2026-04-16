import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../../apps/platform/client/app/bootstrap.js';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProcessWorkSurfacePage } from '../../../apps/platform/client/features/processes/process-work-surface-page.js';
import type { ProcessWorkSurfaceResponse } from '../../../apps/platform/shared/contracts/index.js';
import {
  liveProcessUpdateMessageSchema,
  shellBootstrapPayloadSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  currentArtifactReferenceFixture,
  emptyProcessMaterialsFixture,
  processSourceReferenceFixture,
  standaloneOutputReferenceFixture,
} from '../../fixtures/materials.js';
import {
  checkpointedAbsentEnvironmentProcessWorkSurfaceFixture,
  currentProcessRequestFixture,
  earlyProcessWorkSurfaceFixture,
  interruptedProcessWorkSurfaceFixture,
  lostEnvironmentProcessWorkSurfaceFixture,
  pausedProcessWorkSurfaceFixture,
  processAccessDeniedErrorFixture,
  processProjectNotFoundErrorFixture,
  processRebuildPrerequisiteMissingErrorFixture,
  processRehydrateNotRecoverableErrorFixture,
  processResumeNotAvailableErrorFixture,
  processStartNotAvailableErrorFixture,
  processUnavailableErrorFixture,
  readyEnvironmentProcessWorkSurfaceFixture,
  readyProcessWorkSurfaceFixture,
  runningProcessSurfaceFixture,
  resumedInterruptedProcessResponseFixture,
  resumedInterruptedToFailedProcessResponseFixture,
  resumedPausedProcessResponseFixture,
  resumedPausedToCompletedProcessResponseFixture,
  staleEnvironmentProcessWorkSurfaceFixture,
  startedProcessResponseFixture,
  startedWaitingProcessResponseFixture,
  submittedProcessResponseWithFollowUpFixture,
  unauthenticatedRequestErrorFixture,
  unavailableEnvironmentProcessWorkSurfaceFixture,
  unexpectedProcessActionErrorFixture,
} from '../../fixtures/process-surface.js';
import { completedSideWorkFixture } from '../../fixtures/side-work.js';

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
      environment: readyProcessWorkSurfaceFixture.environment,
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

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = 0;
  private readonly listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  close(): void {
    this.readyState = 3;
    this.dispatch('close', new Event('close'));
  }

  emitOpen(): void {
    this.readyState = 1;
    this.dispatch('open', new Event('open'));
  }

  emitMessage(data: unknown): void {
    this.dispatch(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify(data),
      }),
    );
  }

  emitError(): void {
    this.dispatch('error', new Event('error'));
  }

  emitClose(): void {
    this.readyState = 3;
    this.dispatch('close', new Event('close'));
  }

  private dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
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
  surface: ProcessWorkSurfaceResponse;
  actionPayload: unknown;
  actionStatus?: number;
  actionFailure?: Error;
  actionBodyAsserter?: (body: unknown) => void;
  action: 'start' | 'resume' | 'rehydrate' | 'rebuild' | 'respond';
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
        `/api/projects/${args.surface.project.projectId}/processes/${args.surface.process.processId}/${args.action === 'respond' ? 'responses' : args.action}`
    ) {
      if (args.actionFailure !== undefined) {
        throw args.actionFailure;
      }

      if (args.actionBodyAsserter !== undefined) {
        const requestBody =
          typeof init?.body === 'string' && init.body.length > 0 ? JSON.parse(init.body) : null;
        args.actionBodyAsserter(requestBody);
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
    WebSocketCtor?: typeof WebSocket;
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
    WebSocket: options.WebSocketCtor,
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
  FakeWebSocket.instances = [];
});

describe('process work surface page', () => {
  it('TC-1.1a environment state is visible on first load', () => {
    const store = buildStore({
      processSurface: {
        ...buildStore().get().processSurface,
        project: readyEnvironmentProcessWorkSurfaceFixture.project,
        process: readyEnvironmentProcessWorkSurfaceFixture.process,
        history: readyEnvironmentProcessWorkSurfaceFixture.history,
        materials: readyEnvironmentProcessWorkSurfaceFixture.materials,
        currentRequest: readyEnvironmentProcessWorkSurfaceFixture.currentRequest,
        sideWork: readyEnvironmentProcessWorkSurfaceFixture.sideWork,
        environment: readyEnvironmentProcessWorkSurfaceFixture.environment,
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.querySelector('[data-process-environment-panel="true"]')?.textContent).toContain(
      'State: Ready for work',
    );
    expect(view.textContent).toContain(readyEnvironmentProcessWorkSurfaceFixture.project.name);
    expect(view.textContent).toContain(
      readyEnvironmentProcessWorkSurfaceFixture.process.displayLabel,
    );
  });

  it('TC-1.1b absent environment still renders a legible state', () => {
    const store = buildStore({
      processSurface: {
        ...buildStore().get().processSurface,
        project: earlyProcessWorkSurfaceFixture.project,
        process: earlyProcessWorkSurfaceFixture.process,
        history: earlyProcessWorkSurfaceFixture.history,
        materials: earlyProcessWorkSurfaceFixture.materials,
        currentRequest: earlyProcessWorkSurfaceFixture.currentRequest,
        sideWork: earlyProcessWorkSurfaceFixture.sideWork,
        environment: earlyProcessWorkSurfaceFixture.environment,
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.querySelector('[data-process-environment-panel="true"]')?.textContent).toContain(
      'State: Not prepared',
    );
    expect(view.textContent).toContain(earlyProcessWorkSurfaceFixture.process.displayLabel);
  });

  it('TC-1.5a process remains visible without environment', () => {
    const store = buildStore({
      processSurface: {
        ...buildStore().get().processSurface,
        project: lostEnvironmentProcessWorkSurfaceFixture.project,
        process: lostEnvironmentProcessWorkSurfaceFixture.process,
        history: lostEnvironmentProcessWorkSurfaceFixture.history,
        materials: lostEnvironmentProcessWorkSurfaceFixture.materials,
        currentRequest: lostEnvironmentProcessWorkSurfaceFixture.currentRequest,
        sideWork: lostEnvironmentProcessWorkSurfaceFixture.sideWork,
        environment: lostEnvironmentProcessWorkSurfaceFixture.environment,
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.textContent).toContain(
      lostEnvironmentProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(view.textContent).toContain('State: Environment lost');
    expect(view.textContent).toContain(
      lostEnvironmentProcessWorkSurfaceFixture.materials.currentArtifacts[0]?.displayName ?? '',
    );
  });

  it('renders the stable control area from process.controls rather than hiding disabled actions', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.querySelector('[data-process-controls="true"]')).not.toBeNull();
    expect(view.querySelector('[data-process-control="start"] button')).not.toBeNull();
    expect(view.querySelector('[data-process-control="resume"] button')).not.toBeNull();
    expect(view.querySelector('[data-process-control-disabled-reason="start"]')?.textContent).toBe(
      'Start is only available while the process is in Draft.',
    );
  });

  it('renders latest durable checkpoint context inside the environment panel', () => {
    const store = buildStore({
      processSurface: {
        ...buildStore().get().processSurface,
        project: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.project,
        process: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.process,
        history: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.history,
        materials: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.materials,
        currentRequest: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.currentRequest,
        sideWork: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.sideWork,
        environment: checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.environment,
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.querySelector('[data-process-checkpoint-result="true"]')?.textContent).toContain(
      checkpointedAbsentEnvironmentProcessWorkSurfaceFixture.environment.lastCheckpointResult
        ?.targetLabel ?? '',
    );
  });

  it('renders unavailable environment state without hiding the durable process surface', () => {
    const store = buildStore({
      processSurface: {
        ...buildStore().get().processSurface,
        project: unavailableEnvironmentProcessWorkSurfaceFixture.project,
        process: unavailableEnvironmentProcessWorkSurfaceFixture.process,
        history: unavailableEnvironmentProcessWorkSurfaceFixture.history,
        materials: unavailableEnvironmentProcessWorkSurfaceFixture.materials,
        currentRequest: unavailableEnvironmentProcessWorkSurfaceFixture.currentRequest,
        sideWork: unavailableEnvironmentProcessWorkSurfaceFixture.sideWork,
        environment: unavailableEnvironmentProcessWorkSurfaceFixture.environment,
      },
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });

    expect(view.textContent).toContain(
      unavailableEnvironmentProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(view.textContent).toContain('State: Environment unavailable');
    expect(view.textContent).toContain('Current materials');
  });

  it('renders history, materials, and side-work sections together', () => {
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

  it('TC-4.1a keeps current materials visible alongside active process work', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const materialsSection = view.querySelector('[data-process-materials-section="true"]');

    expect(view.textContent).toContain(readyProcessWorkSurfaceFixture.history.items[0]?.text ?? '');
    expect(materialsSection?.textContent).toContain(currentArtifactReferenceFixture.displayName);
    expect(materialsSection?.textContent).toContain(standaloneOutputReferenceFixture.displayName);
  });

  it('TC-4.1b shows relevant source attachments in the materials panel', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const materialsSection = view.querySelector('[data-process-materials-section="true"]');

    expect(materialsSection?.textContent).toContain(processSourceReferenceFixture.displayName);
    expect(materialsSection?.textContent).toContain(
      `Target ref: ${processSourceReferenceFixture.targetRef}`,
    );
  });

  it('TC-4.2a shows artifact identity and current revision context', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const materialsSection = view.querySelector('[data-process-materials-section="true"]');

    expect(materialsSection?.textContent).toContain(
      `Artifact ID: ${currentArtifactReferenceFixture.artifactId}`,
    );
    expect(materialsSection?.textContent).toContain(
      `Current version: ${currentArtifactReferenceFixture.currentVersionLabel}`,
    );
  });

  it('TC-4.2b shows output identity and revision context', () => {
    const store = buildStore();
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const materialsSection = view.querySelector('[data-process-materials-section="true"]');

    expect(materialsSection?.textContent).toContain(
      `Output ID: ${standaloneOutputReferenceFixture.outputId}`,
    );
    expect(materialsSection?.textContent).toContain(
      `Current revision: ${standaloneOutputReferenceFixture.revisionLabel}`,
    );
    expect(materialsSection?.textContent).toContain(
      `State: ${standaloneOutputReferenceFixture.state}`,
    );
  });

  it('TC-4.4a shows a clear empty materials state without stale context', () => {
    const store = buildStore({
      processSurface: {
        projectId: readyProcessWorkSurfaceFixture.project.projectId,
        processId: readyProcessWorkSurfaceFixture.process.processId,
        project: readyProcessWorkSurfaceFixture.project,
        process: readyProcessWorkSurfaceFixture.process,
        history: readyProcessWorkSurfaceFixture.history,
        materials: emptyProcessMaterialsFixture,
        currentRequest: readyProcessWorkSurfaceFixture.currentRequest,
        sideWork: readyProcessWorkSurfaceFixture.sideWork,
        environment: readyProcessWorkSurfaceFixture.environment,
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
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const materialsSection = view.querySelector('[data-process-materials-section="true"]');

    expect(materialsSection?.textContent).toContain('No current materials apply right now.');
    expect(materialsSection?.textContent).not.toContain(
      currentArtifactReferenceFixture.displayName,
    );
    expect(materialsSection?.textContent).not.toContain(
      standaloneOutputReferenceFixture.displayName,
    );
    expect(materialsSection?.textContent).not.toContain(processSourceReferenceFixture.displayName);
  });

  it('TC-5.4c shows the parent-process change after a side-work outcome is applied', () => {
    const store = buildStore({
      processSurface: {
        projectId: readyProcessWorkSurfaceFixture.project.projectId,
        processId: readyProcessWorkSurfaceFixture.process.processId,
        project: readyProcessWorkSurfaceFixture.project,
        process: {
          ...readyProcessWorkSurfaceFixture.process,
          phaseLabel: 'Reviewing returned references',
          nextActionLabel: 'Review the refreshed direction',
          updatedAt: '2026-04-13T12:19:00.000Z',
        },
        history: readyProcessWorkSurfaceFixture.history,
        materials: readyProcessWorkSurfaceFixture.materials,
        currentRequest: readyProcessWorkSurfaceFixture.currentRequest,
        sideWork: {
          status: 'ready',
          items: [completedSideWorkFixture],
        },
        environment: readyProcessWorkSurfaceFixture.environment,
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
    });
    const view = renderProcessWorkSurfacePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProject: () => {},
    });
    const sideWorkSection = view.querySelector('[data-side-work-section="true"]');

    expect(view.textContent).toContain('Phase: Reviewing returned references');
    expect(view.textContent).toContain('Next action: Review the refreshed direction');
    expect(sideWorkSection?.textContent).toContain(completedSideWorkFixture.displayLabel);
    expect(sideWorkSection?.textContent).toContain(completedSideWorkFixture.resultSummary ?? '');
  });

  it('TC-6.5a and TC-6.5b keep the durable surface visible when live setup fails and show a retry path', async () => {
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
          `/api/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`
      ) {
        return buildJsonResponse(readyProcessWorkSurfaceFixture);
      }

      throw new Error(`Unexpected fetch request: ${method} ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
      {
        WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      },
    );
    const socket = FakeWebSocket.instances[0];

    if (socket === undefined) {
      throw new Error('Expected bootstrap to start a live websocket.');
    }

    socket.emitError();
    socket.emitClose();
    await flush();

    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain(
      'Live updates are currently unavailable.',
    );
    expect(dom.window.document.body.textContent).toContain('Retry live updates');
  });

  it('TC-6.2a and TC-6.2b preserve visible state on connection loss and show reconnecting status', async () => {
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
          `/api/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`
      ) {
        return buildJsonResponse(readyProcessWorkSurfaceFixture);
      }

      throw new Error(`Unexpected fetch request: ${method} ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
      {
        WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      },
    );
    const socket = FakeWebSocket.instances[0];

    if (socket === undefined) {
      throw new Error('Expected bootstrap to start a live websocket.');
    }

    socket.emitOpen();
    socket.emitMessage(
      liveProcessUpdateMessageSchema.parse({
        subscriptionId: 'subscription-001',
        processId: readyProcessWorkSurfaceFixture.process.processId,
        sequenceNumber: 2,
        correlationId: null,
        completedAt: null,
        messageType: 'upsert',
        entityType: 'process',
        entityId: readyProcessWorkSurfaceFixture.process.processId,
        payload: {
          ...runningProcessSurfaceFixture,
          processId: readyProcessWorkSurfaceFixture.process.processId,
        },
      }),
    );
    await flush();
    socket.emitClose();
    await flush();

    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.process.displayLabel,
    );
    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.history.items[0]?.text ?? '',
    );
    expect(dom.window.document.body.textContent).toContain(
      'Live updates are reconnecting. Visible state remains available.',
    );
  });

  it('TC-6.3a retry re-fetches the latest durable state without duplicating finalized history items', async () => {
    const refreshedSurface = {
      ...readyProcessWorkSurfaceFixture,
      process: {
        ...readyProcessWorkSurfaceFixture.process,
        status: 'running' as const,
        phaseLabel: 'Recovered after reconnect',
        nextActionLabel: 'Monitor the reconciled process',
        availableActions: ['review'],
        updatedAt: '2026-04-13T12:40:00.000Z',
      },
    };
    let bootstrapCount = 0;
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
          `/api/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`
      ) {
        bootstrapCount += 1;
        return buildJsonResponse(
          bootstrapCount === 1 ? readyProcessWorkSurfaceFixture : refreshedSurface,
        );
      }

      throw new Error(`Unexpected fetch request: ${method} ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
      {
        WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      },
    );
    const firstSocket = FakeWebSocket.instances[0];

    if (firstSocket === undefined) {
      throw new Error('Expected bootstrap to start a live websocket.');
    }

    firstSocket.emitError();
    firstSocket.emitClose();
    await flush();

    const retryButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Retry live updates',
    );

    if (!(retryButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected a retry live updates button.');
    }

    retryButton.click();
    await flush();
    await flush();

    expect(dom.window.document.body.textContent).toContain('Recovered after reconnect');
    expect(dom.window.document.body.textContent).toContain('Monitor the reconciled process');
    expect(
      dom.window.document.querySelectorAll('[data-process-history-kind="user_message"]').length,
    ).toBe(1);
    expect(bootstrapCount).toBe(2);
    expect(FakeWebSocket.instances).toHaveLength(2);
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
        environment: null,
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

  it('keeps start and resume visible but disabled when neither action is available', () => {
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

    expect(actionButtons).toHaveLength(2);
    expect(
      actionButtons.every((button) => button instanceof HTMLButtonElement && button.disabled),
    ).toBe(true);
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

    expect(dom.window.document.body.textContent).toContain('State: Preparing environment');

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

    expect(dom.window.document.body.textContent).toContain('State: Preparing environment');
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

  it('TC-5.5a rebuild blocked by missing canonical prerequisite keeps the blocked recovery reason visible on the surface', async () => {
    installInteractiveFetchMock({
      surface: lostEnvironmentProcessWorkSurfaceFixture,
      actionPayload: processRebuildPrerequisiteMissingErrorFixture,
      actionStatus: 422,
      action: 'rebuild',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${lostEnvironmentProcessWorkSurfaceFixture.project.projectId}/processes/${lostEnvironmentProcessWorkSurfaceFixture.process.processId}`,
    );
    const rebuildButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Rebuild environment',
    );

    if (!(rebuildButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error('Expected the process work surface to render a Rebuild environment button.');
    }

    rebuildButton.click();
    await flush();

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');
    const environmentPanel = dom.window.document.querySelector(
      '[data-process-environment-panel="true"]',
    );

    expect(actionError?.textContent).toContain(
      processRebuildPrerequisiteMissingErrorFixture.message,
    );
    expect(environmentPanel?.textContent).toContain(
      processRebuildPrerequisiteMissingErrorFixture.message,
    );
  });

  it('TC-5.5b rehydrate blocked when rebuild is required promotes rebuild guidance on the visible recovery controls', async () => {
    installInteractiveFetchMock({
      surface: staleEnvironmentProcessWorkSurfaceFixture,
      actionPayload: processRehydrateNotRecoverableErrorFixture,
      actionStatus: 409,
      action: 'rehydrate',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${staleEnvironmentProcessWorkSurfaceFixture.project.projectId}/processes/${staleEnvironmentProcessWorkSurfaceFixture.process.processId}`,
    );
    const rehydrateButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Rehydrate environment',
    );

    if (!(rehydrateButton instanceof dom.window.HTMLButtonElement)) {
      throw new Error(
        'Expected the process work surface to render a Rehydrate environment button.',
      );
    }

    rehydrateButton.click();
    await flush();

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');
    const rebuildButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Rebuild environment',
    );

    expect(actionError?.textContent).toContain(processRehydrateNotRecoverableErrorFixture.message);
    expect(rebuildButton).toBeInstanceOf(dom.window.HTMLButtonElement);
    expect((rebuildButton as HTMLButtonElement).disabled).toBe(false);
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
    expect(actionButtons).toHaveLength(2);
    expect(actionButtons.every((button) => button.disabled)).toBe(true);
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
    const disabledResumeButton = [...dom.window.document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Resume process',
    );

    expect(disabledResumeButton).toBeInstanceOf(dom.window.HTMLButtonElement);
    expect((disabledResumeButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('TC-3.1a, TC-3.6a, and TC-3.6b keep response submission in the same process surface and update history plus follow-up state in-session', async () => {
    const fetchMock = installInteractiveFetchMock({
      surface: readyProcessWorkSurfaceFixture,
      actionPayload: submittedProcessResponseWithFollowUpFixture,
      action: 'respond',
      actionBodyAsserter: (body) => {
        expect(body).toMatchObject({
          clientRequestId: expect.any(String),
          message: 'We should focus on technical founders first.',
        });
      },
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );
    const textarea = dom.window.document.querySelector('[data-process-response-input="true"]');
    const form = dom.window.document.querySelector('[data-process-response-form="true"]');

    if (!(textarea instanceof dom.window.HTMLTextAreaElement)) {
      throw new Error('Expected the process work surface to render a response textarea.');
    }

    if (!(form instanceof dom.window.HTMLFormElement)) {
      throw new Error('Expected the process work surface to render a response form.');
    }

    textarea.value = 'We should focus on technical founders first.';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    await flush();

    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.project.name,
    );
    expect(dom.window.document.body.textContent).toContain(
      readyProcessWorkSurfaceFixture.history.items[0]?.text ?? '',
    );
    expect(dom.window.document.body.textContent).toContain(
      'We should focus on technical founders first.',
    );
    expect(dom.window.document.body.textContent).toContain(
      submittedProcessResponseWithFollowUpFixture.currentRequest?.promptText ?? '',
    );
    expect(
      countSurfaceBootstrapRequests(fetchMock, {
        projectId: readyProcessWorkSurfaceFixture.project.projectId,
        processId: readyProcessWorkSurfaceFixture.process.processId,
      }),
    ).toBe(1);
  });

  it('TC-2.6a shows preparing environment state in the environment panel immediately after Start without a manual refresh', async () => {
    installInteractiveFetchMock({
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

    const environmentPanel = dom.window.document.querySelector(
      '[data-process-environment-panel="true"]',
    );

    expect(environmentPanel?.textContent).toContain('State: Preparing environment');
    expect(dom.window.document.body.textContent).toContain('Running');
  });

  it('TC-2.6b shows preparing environment state in the environment panel immediately after Resume from paused without a manual refresh', async () => {
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

    const environmentPanel = dom.window.document.querySelector(
      '[data-process-environment-panel="true"]',
    );

    expect(environmentPanel?.textContent).toContain('State: Preparing environment');
    expect(dom.window.document.body.textContent).toContain('Running');
  });

  it('TC-2.6c shows preparing environment state in the environment panel immediately after Resume from interrupted without a manual refresh', async () => {
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

    const environmentPanel = dom.window.document.querySelector(
      '[data-process-environment-panel="true"]',
    );

    expect(environmentPanel?.textContent).toContain('State: Preparing environment');
    expect(dom.window.document.body.textContent).toContain('Running');
  });

  it('TC-3.5b shows a bounded error and does not create partial visible history when response submission fails', async () => {
    installInteractiveFetchMock({
      surface: readyProcessWorkSurfaceFixture,
      actionPayload: unexpectedProcessActionErrorFixture,
      actionStatus: 500,
      action: 'respond',
    });
    const dom = await renderInteractiveProcessSurface(
      `http://localhost:5001/projects/${readyProcessWorkSurfaceFixture.project.projectId}/processes/${readyProcessWorkSurfaceFixture.process.processId}`,
    );
    const textarea = dom.window.document.querySelector('[data-process-response-input="true"]');
    const form = dom.window.document.querySelector('[data-process-response-form="true"]');

    if (!(textarea instanceof dom.window.HTMLTextAreaElement)) {
      throw new Error('Expected the process work surface to render a response textarea.');
    }

    if (!(form instanceof dom.window.HTMLFormElement)) {
      throw new Error('Expected the process work surface to render a response form.');
    }

    textarea.value = '   ';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(dom.window.document.body.textContent).not.toContain('   ');

    textarea.value = 'Please use the narrow scope.';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    await flush();

    const actionError = dom.window.document.querySelector('[data-process-action-error="true"]');

    expect(actionError?.textContent).toContain(unexpectedProcessActionErrorFixture.message);
    expect(dom.window.document.body.textContent).not.toContain('Please use the narrow scope.');
  });
});
