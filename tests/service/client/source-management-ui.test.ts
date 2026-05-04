// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { renderProcessMaterialsSection } from '../../../apps/platform/client/features/processes/process-materials-section.js';
import { renderSourceAttachmentSection } from '../../../apps/platform/client/features/projects/source-attachment-section.js';
import {
  processMaterialsSectionEnvelopeSchema,
  sourceAttachmentSectionEnvelopeSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  hydratedSourceFixture,
  notHydratedSourceFixture,
  pendingRefreshSourceFixture,
  staleSourceFixture,
  unavailableSourceFixture,
} from '../../fixtures/sources.js';

function withProjectRefreshTargetCount<TSource extends typeof hydratedSourceFixture>(
  source: TSource,
  count: number,
) {
  return {
    ...source,
    projectRefreshTargetCount: count,
  };
}

function buildProcessSourceReference(
  source: typeof hydratedSourceFixture,
  overrides: Partial<
    typeof hydratedSourceFixture & { attachmentScope: 'project' | 'process' }
  > = {},
) {
  return {
    sourceAttachmentId: source.sourceAttachmentId,
    displayName: source.displayName,
    purpose: source.purpose,
    accessMode: source.accessMode,
    repositoryUrl: source.repositoryUrl,
    repositoryFullName: source.repositoryFullName,
    attachmentScope: overrides.attachmentScope ?? source.attachmentScope,
    targetRef: source.targetRef,
    hydrationState: source.hydrationState,
    lastHydratedAt: source.lastHydratedAt,
    freshnessReason: source.freshnessReason,
    refreshStatus: source.refreshStatus,
    refreshRequestedAt: source.refreshRequestedAt,
    updatedAt: source.updatedAt,
    ...overrides,
  };
}

describe('source management ui', () => {
  it('TC-3.1a renders all hydration and freshness states', () => {
    const projectView = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [
          hydratedSourceFixture,
          withProjectRefreshTargetCount(notHydratedSourceFixture, 1),
          withProjectRefreshTargetCount(staleSourceFixture, 1),
          unavailableSourceFixture,
        ],
      }),
      targetDocument: document,
    });
    const processView = renderProcessMaterialsSection({
      envelope: processMaterialsSectionEnvelopeSchema.parse({
        status: 'ready',
        currentArtifacts: [],
        currentOutputs: [],
        currentSources: [
          buildProcessSourceReference(staleSourceFixture, { attachmentScope: 'process' }),
        ],
      }),
      targetDocument: document,
    });

    expect(projectView.textContent).toContain('Hydration: hydrated');
    expect(projectView.textContent).toContain('Hydration: not hydrated');
    expect(projectView.textContent).toContain('Hydration: stale (rehydration required)');
    expect(projectView.textContent).toContain('Hydration: unavailable');
    expect(projectView.textContent).toContain(
      `Last hydrated: ${hydratedSourceFixture.lastHydratedAt}`,
    );
    expect(projectView.textContent).toContain('Freshness reason: target ref changed');
    expect(processView.textContent).toContain('Hydration: stale (rehydration required)');
    expect(processView.textContent).toContain('Freshness reason: target ref changed');
  });

  it('TC-3.2a shows refresh action for stale source', () => {
    const onRefreshSource = vi.fn().mockResolvedValue(undefined);
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(staleSourceFixture, 1)],
      }),
      targetDocument: document,
      onRefreshSource,
    });

    const refreshButton = view.querySelector(
      `[data-source-attachment-refresh-submit="${staleSourceFixture.sourceAttachmentId}"]`,
    );

    expect(refreshButton?.textContent).toBe('Refresh source');
  });

  it('TC-3.2b does not offer recovery for unavailable source', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [unavailableSourceFixture],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(
      view.querySelector(
        `[data-source-attachment-refresh-submit="${unavailableSourceFixture.sourceAttachmentId}"]`,
      ),
    ).toBeNull();
  });

  it('TC-3.2c shows hydration action for not hydrated source', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(notHydratedSourceFixture, 1)],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(
      view.querySelector(
        `[data-source-attachment-refresh-submit="${notHydratedSourceFixture.sourceAttachmentId}"]`,
      )?.textContent,
    ).toBe('Hydrate source');
  });

  it('TC-3.3b shows refresh progress while pending without introducing a fifth hydration state', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(pendingRefreshSourceFixture, 1)],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(view.textContent).toContain('Hydration: stale (rehydration required)');
    expect(view.textContent).toContain(
      `Refresh in progress since ${pendingRefreshSourceFixture.refreshRequestedAt}.`,
    );
    expect(view.textContent).not.toContain('Hydration: pending');
    expect(
      (
        view.querySelector(
          `[data-source-attachment-refresh-submit="${pendingRefreshSourceFixture.sourceAttachmentId}"]`,
        ) as HTMLButtonElement | null
      )?.disabled,
    ).toBe(true);
  });

  it('hides project-shell refresh for project-scoped stale sources with no current process target', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(staleSourceFixture, 0)],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(
      view.querySelector(
        `[data-source-attachment-refresh-submit="${staleSourceFixture.sourceAttachmentId}"]`,
      ),
    ).toBeNull();
  });

  it('hides project-shell refresh for project-scoped not hydrated sources with multiple current process targets', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(notHydratedSourceFixture, 2)],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(
      view.querySelector(
        `[data-source-attachment-refresh-submit="${notHydratedSourceFixture.sourceAttachmentId}"]`,
      ),
    ).toBeNull();
  });

  it('offers project-shell refresh when a project-scoped source has exactly one current process target', () => {
    const view = renderSourceAttachmentSection({
      envelope: sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [withProjectRefreshTargetCount(staleSourceFixture, 1)],
      }),
      targetDocument: document,
      onRefreshSource: async () => undefined,
    });

    expect(
      view.querySelector(
        `[data-source-attachment-refresh-submit="${staleSourceFixture.sourceAttachmentId}"]`,
      )?.textContent,
    ).toBe('Refresh source');
  });
});
