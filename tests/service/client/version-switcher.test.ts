// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { renderVersionSwitcher } from '../../../apps/platform/client/features/review/version-switcher.js';
import {
  currentArtifactVersionFixture,
  priorArtifactVersionFixture,
} from '../../fixtures/artifact-versions.js';

describe('version switcher', () => {
  it('TC-2.3b renders versions newest to oldest', () => {
    const switcher = renderVersionSwitcher({
      versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
      selectedVersionId: currentArtifactVersionFixture.versionId,
      targetDocument: document,
      onSelect: vi.fn(),
    });

    expect(
      [...switcher.querySelectorAll('[data-artifact-version-id]')].map((node) =>
        node.getAttribute('data-artifact-version-id'),
      ),
    ).toEqual([currentArtifactVersionFixture.versionId, priorArtifactVersionFixture.versionId]);
  });

  it('TC-2.3a calls onSelect when the user chooses a prior version', () => {
    const onSelect = vi.fn();
    const switcher = renderVersionSwitcher({
      versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
      selectedVersionId: currentArtifactVersionFixture.versionId,
      targetDocument: document,
      onSelect,
    });
    const priorVersionButton = switcher.querySelector(
      `[data-artifact-version-id="${priorArtifactVersionFixture.versionId}"]`,
    );

    if (!(priorVersionButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the version switcher to render the prior-version button.');
    }

    priorVersionButton.click();

    expect(onSelect).toHaveBeenCalledWith(priorArtifactVersionFixture.versionId);
  });
});
