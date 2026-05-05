// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderProcessArchivePage } from '../../../apps/platform/client/features/processes/process-archive-page.js';
import { renderArchiveTurnsSection } from '../../../apps/platform/client/features/processes/archive-turns-section.js';
import {
  readyArchivePageFixture,
  readyArchiveTurnPageFixture,
  readyDerivedArchiveViewsFixture,
} from '../../fixtures/archive.js';

function buildArchiveStore() {
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
      pathname: '/projects/project-archive-001/processes/process-archive-001/archive',
      projectId: readyArchivePageFixture.entries[0]?.projectId ?? null,
      selectedProcessId: null,
    },
    archiveSurface: {
      projectId: readyArchivePageFixture.entries[0]?.projectId ?? null,
      processId: readyArchivePageFixture.entries[0]?.processId ?? null,
      project: {
        projectId: readyArchivePageFixture.entries[0]?.projectId ?? 'project-archive-001',
        name: 'Archive Story Project',
        role: 'owner',
      },
      process: {
        processId: readyArchivePageFixture.entries[0]?.processId ?? 'process-archive-001',
        displayLabel: 'Archive replay process',
        processType: 'FeatureSpecification',
        status: 'completed',
        phaseLabel: 'Completed',
        nextActionLabel: null,
        availableActions: ['review'],
        controls: [],
        hasEnvironment: false,
        updatedAt: '2026-05-05T09:05:00.000Z',
      },
      archive: readyArchivePageFixture,
      turns: readyArchiveTurnPageFixture,
      derivedViews: readyDerivedArchiveViewsFixture,
      isLoading: false,
      error: null,
    },
  });
}

describe('archive turns rendering', () => {
  it('renders stable turn boundaries and archive entry provenance', () => {
    const view = renderArchiveTurnsSection({
      turns: readyArchiveTurnPageFixture,
      targetDocument: document,
    });

    expect(
      view.querySelector('[data-archive-turn-id="process-archive-001:turn:0"]')?.textContent,
    ).toContain('Turn 0');
    expect(view.querySelector('[data-archive-turn-entry-refs="true"]')?.textContent).toContain(
      'archive-entry-user-001',
    );
  });

  it('renders degraded turn metadata without hiding healthy turns', () => {
    const view = renderArchiveTurnsSection({
      turns: readyArchiveTurnPageFixture,
      targetDocument: document,
    });

    expect(view.querySelector('[data-archive-turn-status="ready"]')?.textContent).toContain(
      'Turn 0',
    );
    expect(view.querySelector('[data-archive-turn-status="degraded"]')?.textContent).toContain(
      'Related artifact context was missing while rebuilding the turn.',
    );
  });

  it('renders the turns section inside the archive page', () => {
    const store = buildArchiveStore();
    const view = renderProcessArchivePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProcess: () => {},
    });

    expect(view.querySelector('[data-archive-turns-section="true"]')?.textContent).toContain(
      'Turns',
    );
    expect(view.textContent).toContain('Archive replay process archive');
  });
});
