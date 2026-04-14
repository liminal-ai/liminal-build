import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProjectShellPage } from '../../../apps/platform/client/features/projects/project-shell-page.js';
import {
  emptyProjectShellResponse,
  mixedSectionEnvelopeProjectShellResponse,
  populatedProjectShellResponse,
  processOnlyProjectShellResponse,
} from '../../fixtures/projects.js';

describe('project shell page', () => {
  it('TC-2.3a shows the active project identity and role', () => {
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
        pathname: `/projects/${emptyProjectShellResponse.project.projectId}`,
        projectId: emptyProjectShellResponse.project.projectId,
        selectedProcessId: null,
      },
      shell: {
        project: emptyProjectShellResponse.project,
        processes: emptyProjectShellResponse.processes,
        artifacts: emptyProjectShellResponse.artifacts,
        sourceAttachments: emptyProjectShellResponse.sourceAttachments,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      },
    });
    const view = renderProjectShellPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProcess: async () => {},
      onCancelCreateProcess: () => {},
      onOpenCreateProcess: () => {},
    });

    expect(view.textContent).toContain(emptyProjectShellResponse.project.name);
    expect(view.textContent).toContain(`Role: ${emptyProjectShellResponse.project.role}`);
  });

  it('TC-3.1a renders populated process, artifact, and source sections', () => {
    const store = createAppStore({
      route: {
        pathname: `/projects/${populatedProjectShellResponse.project.projectId}`,
        projectId: populatedProjectShellResponse.project.projectId,
        selectedProcessId: populatedProjectShellResponse.processes.items[0]?.processId ?? null,
      },
      shell: {
        project: populatedProjectShellResponse.project,
        processes: populatedProjectShellResponse.processes,
        artifacts: populatedProjectShellResponse.artifacts,
        sourceAttachments: populatedProjectShellResponse.sourceAttachments,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      },
    });
    const view = renderProjectShellPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProcess: async () => {},
      onCancelCreateProcess: () => {},
      onOpenCreateProcess: () => {},
    });

    expect(view.textContent).toContain(
      populatedProjectShellResponse.processes.items[0]?.displayLabel ?? '',
    );
    expect(view.textContent).toContain(
      populatedProjectShellResponse.artifacts.items[0]?.displayName ?? '',
    );
    expect(view.textContent).toContain(
      populatedProjectShellResponse.sourceAttachments.items[0]?.displayName ?? '',
    );
  });

  it('TC-3.1b renders empty states for empty shell envelopes', () => {
    const store = createAppStore({
      route: {
        pathname: `/projects/${emptyProjectShellResponse.project.projectId}`,
        projectId: emptyProjectShellResponse.project.projectId,
        selectedProcessId: null,
      },
      shell: {
        project: emptyProjectShellResponse.project,
        processes: emptyProjectShellResponse.processes,
        artifacts: emptyProjectShellResponse.artifacts,
        sourceAttachments: emptyProjectShellResponse.sourceAttachments,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      },
    });
    const view = renderProjectShellPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProcess: async () => {},
      onCancelCreateProcess: () => {},
      onOpenCreateProcess: () => {},
    });

    expect(view.textContent).toContain('Processes is currently empty.');
    expect(view.textContent).toContain('Artifacts is currently empty.');
    expect(view.textContent).toContain('Source attachments is currently empty.');
  });

  it('TC-3.1c and TC-6.3a render mixed ready, empty, and error section states coherently', () => {
    const store = createAppStore({
      route: {
        pathname: `/projects/${mixedSectionEnvelopeProjectShellResponse.project.projectId}`,
        projectId: mixedSectionEnvelopeProjectShellResponse.project.projectId,
        selectedProcessId: null,
      },
      shell: {
        project: mixedSectionEnvelopeProjectShellResponse.project,
        processes: processOnlyProjectShellResponse.processes,
        artifacts: mixedSectionEnvelopeProjectShellResponse.artifacts,
        sourceAttachments: processOnlyProjectShellResponse.sourceAttachments,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      },
    });
    const view = renderProjectShellPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProcess: async () => {},
      onCancelCreateProcess: () => {},
      onOpenCreateProcess: () => {},
    });

    expect(view.textContent).toContain(
      processOnlyProjectShellResponse.processes.items[0]?.displayLabel ?? '',
    );
    expect(view.textContent).toContain('Artifact summaries failed to load in the fixture.');
    expect(view.textContent).toContain('Source attachments is currently empty.');
  });

  it('TC-1.4c clears rendered project data after logout success', async () => {
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
        pathname: `/projects/${emptyProjectShellResponse.project.projectId}`,
        projectId: emptyProjectShellResponse.project.projectId,
        selectedProcessId: null,
      },
      shell: {
        project: emptyProjectShellResponse.project,
        processes: emptyProjectShellResponse.processes,
        artifacts: emptyProjectShellResponse.artifacts,
        sourceAttachments: emptyProjectShellResponse.sourceAttachments,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      },
    });
    const assign = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirectUrl: 'https://logout.example/complete' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const view = renderProjectShellPage({
      store,
      targetDocument: document,
      targetWindow: {
        location: {
          assign,
        },
      } as unknown as Window & typeof globalThis,
      onCreateProcess: async () => {},
      onCancelCreateProcess: () => {},
      onOpenCreateProcess: () => {},
    });
    const signOutButton = view.querySelector('button');

    if (!(signOutButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the project shell page to render a sign-out button.');
    }

    signOutButton.click();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-csrf-token': 'csrf-token',
      },
    });
    expect(store.get().auth.actor).toBeNull();
    expect(store.get().auth.csrfToken).toBeNull();
    expect(store.get().route).toEqual({
      pathname: '/projects',
      projectId: null,
      selectedProcessId: null,
    });
    expect(store.get().shell.project).toBeNull();
    expect(store.get().shell.processes).toBeNull();
    expect(store.get().shell.artifacts).toBeNull();
    expect(store.get().shell.sourceAttachments).toBeNull();
    expect(assign).toHaveBeenCalledWith('https://logout.example/complete');

    vi.unstubAllGlobals();
  });
});
