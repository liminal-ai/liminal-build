// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../../apps/platform/client/app/store.js';
import { renderDerivedArchiveViewsSection } from '../../../apps/platform/client/features/processes/derived-archive-views-section.js';
import { renderProcessArchivePage } from '../../../apps/platform/client/features/processes/process-archive-page.js';
import { DefaultDerivedArchiveViewService } from '../../../apps/platform/server/services/archive/derived-archive-view.service.js';
import { DefaultTurnDerivationService } from '../../../apps/platform/server/services/archive/turn-derivation.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
  type ArchiveEntry,
  type DerivedArchiveViewListResponse,
  requestErrorSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  degradedArchiveEntryFixture,
  degradedDerivedArchiveViewFixture,
  readyArchivePageFixture,
  readyArchiveTurnPageFixture,
  readyDerivedArchiveViewsFixture,
  turnRangeDerivedArchiveViewFixture,
} from '../../fixtures/archive.js';
import { completedProcessFixture } from '../../fixtures/processes.js';

const actor = {
  userId: 'workos-user-derived-views-client-1',
  workosUserId: 'workos-user-derived-views-client-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectId = readyArchivePageFixture.entries[0]?.projectId ?? 'project-archive-001';
const processId = readyArchivePageFixture.entries[0]?.processId ?? 'process-archive-001';

const projectSummary = projectSummarySchema.parse({
  projectId,
  name: 'Archive Story Project',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-05-05T09:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  ...completedProcessFixture,
  processId,
  displayLabel: 'Archive replay process',
  updatedAt: '2026-05-05T09:05:00.000Z',
});

const derivedViewsBootstrapFailure = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_FAILED',
  message: 'Derived views are unavailable right now. Reload the page or try again later.',
  status: 500,
});

const accessibleProcessAccess = {
  kind: 'accessible' as const,
  project: projectSummary,
  process: processSummary,
};

function buildServiceStore(
  archiveEntries: ArchiveEntry[] = readyArchivePageFixture.entries,
): InMemoryPlatformStore {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      [`user:${actor.workosUserId}`]: [projectSummary],
    },
    projectAccessByProjectId: {
      [projectId]: {
        kind: 'accessible',
        project: projectSummary,
      },
    },
    processesByProjectId: {
      [projectId]: [processSummary],
    },
    archiveEntriesByProcessId: {
      [processId]: archiveEntries,
    },
  });
}

async function buildDerivedViewsFromService(
  archiveEntries: ArchiveEntry[] = readyArchivePageFixture.entries,
): Promise<{
  archiveEntries: ArchiveEntry[];
  derivedViews: DerivedArchiveViewListResponse;
}> {
  const store = buildServiceStore(archiveEntries);
  const turnDerivationService = new DefaultTurnDerivationService(store, {
    async assertProcessAccess() {
      return accessibleProcessAccess;
    },
  });
  const derivedArchiveViewService = new DefaultDerivedArchiveViewService(
    store,
    turnDerivationService,
    {
      async assertProcessAccess() {
        return accessibleProcessAccess;
      },
    },
  );
  const derivedViews = await derivedArchiveViewService.listViews({
    actor,
    projectId,
    processId,
  });
  const archivePage = await store.listArchiveEntries({
    processId,
    limit: 50,
  });

  return {
    archiveEntries: archivePage.entries,
    derivedViews,
  };
}

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
      derivedViewsError: null,
      isLoading: false,
      error: null,
    },
  });
}

describe('derived archive view rendering', () => {
  it('renders structural boundaries and provenance for ready views', () => {
    const view = renderDerivedArchiveViewsSection({
      derivedViews: readyDerivedArchiveViewsFixture,
      derivedViewsError: null,
      targetDocument: document,
    });

    expect(
      view.querySelector(
        `[data-derived-archive-view-id="${turnRangeDerivedArchiveViewFixture.derivedViewId}"]`,
      )?.textContent,
    ).toContain('Turns 0-1');
    expect(
      view.querySelector('[data-derived-archive-view-turn-refs="true"]')?.textContent,
    ).toContain('process-archive-001:turn:0');
  });

  it('renders degraded derived-view metadata from fixtures', () => {
    const view = renderDerivedArchiveViewsSection({
      derivedViews: readyDerivedArchiveViewsFixture,
      derivedViewsError: null,
      targetDocument: document,
    });

    expect(
      view.querySelector('[data-derived-archive-view-status="degraded"]')?.textContent,
    ).toContain(degradedDerivedArchiveViewFixture.degradationReason ?? '');
  });

  it('TC-5.5b renders a degraded view from the real service response without hiding canonical archive rows', async () => {
    const response = await buildDerivedViewsFromService();
    const view = renderDerivedArchiveViewsSection({
      derivedViews: response.derivedViews,
      derivedViewsError: null,
      targetDocument: document,
    });

    expect(response.archiveEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          archiveEntryId: degradedArchiveEntryFixture.archiveEntryId,
          entryStatus: 'degraded',
        }),
      ]),
    );
    expect(response.derivedViews.views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          viewStatus: 'degraded',
        }),
      ]),
    );
    expect(
      view.querySelector('[data-derived-archive-view-status="degraded"]')?.textContent,
    ).toContain('Related artifact version is unavailable.');
  });

  it('renders a derived-view request failure without inventing structural view rows', () => {
    const view = renderDerivedArchiveViewsSection({
      derivedViews: null,
      derivedViewsError: derivedViewsBootstrapFailure,
      targetDocument: document,
    });

    expect(view.querySelector('[data-derived-archive-views-error="true"]')?.textContent).toContain(
      derivedViewsBootstrapFailure.message,
    );
    expect(view.querySelector('[data-derived-archive-view-id]')).toBeNull();
    expect(view.querySelector('[data-derived-archive-views-empty-state="true"]')).toBeNull();
  });

  it('renders the derived views section inside the archive page', () => {
    const store = buildArchiveStore();
    const view = renderProcessArchivePage({
      store,
      targetDocument: document,
      targetWindow: window,
      onOpenProcess: () => {},
    });

    expect(
      view.querySelector('[data-derived-archive-views-section="true"]')?.textContent,
    ).toContain('Derived views');
    expect(view.textContent).toContain('Chunk candidate turn 0');
  });
});
