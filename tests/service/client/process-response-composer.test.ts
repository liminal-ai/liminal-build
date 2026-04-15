import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProcessWorkSurfacePage } from '../../../apps/platform/client/features/processes/process-work-surface-page.js';
import { renderProcessResponseComposer } from '../../../apps/platform/client/features/processes/process-response-composer.js';
import {
  completedProcessSurfaceFixture,
  processSurfaceProjectFixture,
} from '../../fixtures/process-surface.js';

describe('process response composer', () => {
  it('TC-3.4b completed processes do not expose an active response composer', () => {
    const store = createAppStore({
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
        pathname: `/projects/${processSurfaceProjectFixture.projectId}/processes/${completedProcessSurfaceFixture.processId}`,
        projectId: processSurfaceProjectFixture.projectId,
        selectedProcessId: null,
      },
      processSurface: {
        projectId: processSurfaceProjectFixture.projectId,
        processId: completedProcessSurfaceFixture.processId,
        project: processSurfaceProjectFixture,
        process: completedProcessSurfaceFixture,
        history: {
          status: 'empty',
          items: [],
        },
        materials: {
          status: 'empty',
          currentArtifacts: [],
          currentOutputs: [],
          currentSources: [],
        },
        currentRequest: null,
        sideWork: {
          status: 'empty',
          items: [],
        },
        environment: null,
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
      onOpenProject: vi.fn(),
      onSubmitProcessResponse: vi.fn(),
    });

    expect(view.querySelector('[data-process-response-composer="true"]')).toBeNull();
  });

  it('TC-3.5a rejects an empty response before submit', () => {
    const onSubmitResponse = vi.fn<() => Promise<void>>().mockResolvedValue();
    const view = renderProcessResponseComposer({
      targetDocument: document,
      onSubmitResponse,
    });
    const form = view.querySelector('[data-process-response-form="true"]');
    const validation = view.querySelector('[data-process-response-validation="true"]');

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected a response form to be rendered.');
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(onSubmitResponse).not.toHaveBeenCalled();
    expect(validation?.textContent).toContain('Enter a response before submitting.');
  });
});
