import { describe, expect, it } from 'vitest';
import { renderArtifactSection } from '../../../apps/platform/client/features/projects/artifact-section.js';
import { artifactSectionEnvelopeSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  currentVersionArtifactFixture,
  noCurrentVersionArtifactFixture,
  processScopedArtifactFixture,
} from '../../fixtures/artifacts.js';

describe('artifact section', () => {
  it('TC-3.3a and TC-3.3b render artifact identity and current-version context', () => {
    const view = renderArtifactSection({
      envelope: artifactSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [currentVersionArtifactFixture, noCurrentVersionArtifactFixture],
      }),
      targetDocument: document,
    });

    expect(view.textContent).toContain(currentVersionArtifactFixture.displayName);
    expect(view.textContent).toContain(
      `Current version: ${currentVersionArtifactFixture.currentVersionLabel}`,
    );
    expect(view.textContent).toContain(noCurrentVersionArtifactFixture.displayName);
    expect(view.textContent).toContain('No current version available.');
  });

  it('TC-3.3c through TC-3.3e render multiple artifacts with process association context', () => {
    const view = renderArtifactSection({
      envelope: artifactSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [processScopedArtifactFixture, currentVersionArtifactFixture],
      }),
      targetDocument: document,
    });

    expect(view.querySelectorAll('li')).toHaveLength(2);
    expect(view.textContent).toContain(
      `Attached to ${processScopedArtifactFixture.processDisplayLabel}.`,
    );
    expect(view.textContent).toContain('Project-scoped artifact.');
  });
});
