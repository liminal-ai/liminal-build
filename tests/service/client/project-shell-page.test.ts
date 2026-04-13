import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProjectShellPage } from '../../../apps/platform/client/features/projects/project-shell-page.js';
import { emptyProjectShellResponse } from '../../fixtures/projects.js';

describe('project shell page', () => {
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
