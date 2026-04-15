import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProcessWorkSurfacePage } from '../../../apps/platform/client/features/processes/process-work-surface-page.js';
import {
  processAccessDeniedErrorFixture,
  readyProcessWorkSurfaceFixture,
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
});
