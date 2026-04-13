import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProjectIndexPage } from '../../../apps/platform/client/features/projects/project-index-page.js';

function renderIndexWithModal(args: {
  onCreateProject?: (name: string) => Promise<void>;
  onCancelCreateProject?: () => void;
}) {
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
    projects: {
      list: [],
      isLoading: false,
      error: null,
    },
    modals: {
      createProjectOpen: true,
      createProcessOpen: false,
    },
  });

  return renderProjectIndexPage({
    store,
    targetDocument: document,
    targetWindow: window,
    onCreateProject: args.onCreateProject ?? (async () => {}),
    onOpenCreateProject: () => {},
    onCancelCreateProject: args.onCancelCreateProject ?? (() => {}),
    onOpenProject: () => {},
  });
}

describe('create project modal', () => {
  it('TC-2.1b blocks submit without a project name', async () => {
    const onCreateProject = vi.fn().mockResolvedValue(undefined);
    const view = renderIndexWithModal({
      onCreateProject,
    });
    const form = view.querySelector('form');

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('Expected create-project modal form to be present.');
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(view.textContent).toContain('Project name is required.');
    expect(onCreateProject).not.toHaveBeenCalled();
  });

  it('TC-2.1c cancelling create-project closes the modal without a write', () => {
    const onCancelCreateProject = vi.fn();
    const onCreateProject = vi.fn().mockResolvedValue(undefined);
    const view = renderIndexWithModal({
      onCreateProject,
      onCancelCreateProject,
    });
    const cancelButton = [...view.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cancel',
    );

    if (!(cancelButton instanceof HTMLButtonElement)) {
      throw new Error('Expected create-project modal cancel button to be present.');
    }

    cancelButton.click();

    expect(onCancelCreateProject).toHaveBeenCalledOnce();
    expect(onCreateProject).not.toHaveBeenCalled();
  });

  it('TC-6.1a cancel project creation returns to a stable project index', () => {
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
      projects: {
        list: [],
        isLoading: false,
        error: null,
      },
      modals: {
        createProjectOpen: true,
        createProcessOpen: false,
      },
    });
    const onCancelCreateProject = () => {
      store.patch('modals', {
        ...store.get().modals,
        createProjectOpen: false,
      });
    };
    const initialView = renderProjectIndexPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProject: async () => {},
      onOpenCreateProject: () => {},
      onCancelCreateProject,
      onOpenProject: () => {},
    });
    const cancelButton = [...initialView.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cancel',
    );

    if (!(cancelButton instanceof HTMLButtonElement)) {
      throw new Error('Expected create-project modal cancel button to be present.');
    }

    cancelButton.click();

    const rerendered = renderProjectIndexPage({
      store,
      targetDocument: document,
      targetWindow: window,
      onCreateProject: async () => {},
      onOpenCreateProject: () => {},
      onCancelCreateProject,
      onOpenProject: () => {},
    });

    expect(rerendered.textContent).toContain('Projects');
    expect(rerendered.textContent).toContain('No accessible projects yet');
    expect(rerendered.querySelector('form')).toBeNull();
  });
});
