import { describe, expect, it } from 'vitest';
import { renderArtifactSection } from '../../../apps/platform/client/features/projects/artifact-section.js';
import { artifactSectionEnvelopeSchema } from '../../../apps/platform/shared/contracts/index.js';
import {
  currentVersionArtifactFixture,
  noCurrentVersionArtifactFixture,
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

  it('renders multiple project-scoped artifact rows without ownership copy', () => {
    const view = renderArtifactSection({
      envelope: artifactSectionEnvelopeSchema.parse({
        status: 'ready',
        items: [currentVersionArtifactFixture, noCurrentVersionArtifactFixture],
      }),
      targetDocument: document,
    });

    expect(view.querySelectorAll('li')).toHaveLength(2);
    expect(view.textContent).not.toContain('Attached to');
    expect(view.textContent).not.toContain('Project-scoped artifact.');
  });
});
