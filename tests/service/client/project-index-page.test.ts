import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProjectIndexPage } from '../../../apps/platform/client/features/projects/project-index-page.js';
import {
  memberProjectSummary,
  ownerProjectSummary,
  sameNameDifferentOwnerProjectSummaries,
} from '../../fixtures/projects.js';

function renderIndex(args: { projectsList?: Array<typeof ownerProjectSummary> }) {
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
      list: args.projectsList ?? null,
      isLoading: false,
      error: null,
    },
  });

  return renderProjectIndexPage({
    store,
    targetDocument: document,
    targetWindow: window,
    onCreateProject: async () => {},
    onOpenCreateProject: () => {},
    onCancelCreateProject: () => {},
    onOpenProject: () => {},
  });
}

describe('project index page', () => {
  it('TC-1.2b renders an empty state when project list is empty', () => {
    const view = renderIndex({
      projectsList: [],
    });

    expect(view.textContent).toContain('No accessible projects yet');
  });

  it('TC-1.2d renders same-name projects with differentiating owner context', () => {
    const view = renderIndex({
      projectsList: sameNameDifferentOwnerProjectSummaries,
    });

    expect(view.textContent).toContain('Core Platform');
    expect(view.textContent).toContain('Owner: Lee Moore');
    expect(view.textContent).toContain('Owner: Another Owner');
  });

  it('TC-1.3a shows the owner role label', () => {
    const view = renderIndex({
      projectsList: [ownerProjectSummary],
    });

    expect(view.textContent).toContain('Role: owner');
  });

  it('TC-1.3b shows the member role label', () => {
    const view = renderIndex({
      projectsList: [memberProjectSummary],
    });

    expect(view.textContent).toContain('Role: member');
  });
});
