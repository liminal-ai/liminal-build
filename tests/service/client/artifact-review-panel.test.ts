// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const { renderMermaidMock } = vi.hoisted(() => ({
  renderMermaidMock: vi.fn(),
}));

vi.mock('../../../apps/platform/client/features/review/mermaid-runtime.js', () => ({
  initializeMermaid: vi.fn(),
  renderMermaid: renderMermaidMock,
}));

import { renderArtifactReviewPanel } from '../../../apps/platform/client/features/review/artifact-review-panel.js';
import {
  emptyArtifactReviewTargetFixture,
  priorSelectedArtifactReviewTargetFixture,
  readyArtifactReviewTargetFixture,
} from '../../fixtures/artifact-versions.js';

afterEach(() => {
  vi.restoreAllMocks();
  renderMermaidMock.mockReset();
  document.body.innerHTML = '';
});

describe('artifact review panel', () => {
  it('TC-2.2a and TC-2.2b render artifact identity and selected version identity together', () => {
    const panel = renderArtifactReviewPanel({
      artifact: readyArtifactReviewTargetFixture,
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    expect(panel.textContent).toContain(readyArtifactReviewTargetFixture.displayName);
    expect(panel.textContent).toContain(
      `Current version: ${readyArtifactReviewTargetFixture.currentVersionLabel}`,
    );
    expect(panel.textContent).toContain(
      `Selected version: ${readyArtifactReviewTargetFixture.selectedVersion?.versionLabel}`,
    );
  });

  it('TC-2.1b renders prior version content when a prior revision is selected', () => {
    const panel = renderArtifactReviewPanel({
      artifact: priorSelectedArtifactReviewTargetFixture,
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    expect(panel.textContent).toContain(priorSelectedArtifactReviewTargetFixture.displayName);
    expect(panel.textContent).toContain(
      `Selected version: ${priorSelectedArtifactReviewTargetFixture.selectedVersion?.versionLabel}`,
    );
    expect(panel.querySelector('[data-artifact-review-body]')?.textContent).toContain(
      'Feature Specification - Prior',
    );
  });

  it('renders the server-produced review html instead of flattening it back to plain text', () => {
    const selectedVersion = readyArtifactReviewTargetFixture.selectedVersion;
    if (selectedVersion === undefined) {
      throw new Error('Expected the ready artifact fixture to include a selected version.');
    }

    const panel = renderArtifactReviewPanel({
      artifact: {
        ...readyArtifactReviewTargetFixture,
        selectedVersion: {
          ...selectedVersion,
          body: '<h2>Rendered heading</h2><p>Rendered paragraph.</p>',
        },
      },
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    const body = panel.querySelector('[data-artifact-review-body]');

    expect(body?.querySelector('h2')?.textContent).toBe('Rendered heading');
    expect(body?.querySelector('p')?.textContent).toBe('Rendered paragraph.');
  });

  it('TC-2.4a shows the no-version state without implying a durable draft exists', () => {
    const panel = renderArtifactReviewPanel({
      artifact: emptyArtifactReviewTargetFixture,
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    expect(panel.textContent).toContain(emptyArtifactReviewTargetFixture.displayName);
    expect(panel.textContent).toContain('No reviewable version is currently available');
    expect(panel.querySelector('[data-artifact-version-switcher="true"]')).toBeNull();
  });

  it('TC-3.4a renders a clear unsupported-format fallback while keeping version identity visible', () => {
    const selectedVersion = readyArtifactReviewTargetFixture.selectedVersion;
    if (selectedVersion === undefined) {
      throw new Error('Expected the ready artifact fixture to include a selected version.');
    }

    const panel = renderArtifactReviewPanel({
      artifact: {
        ...readyArtifactReviewTargetFixture,
        selectedVersion: {
          versionId: selectedVersion.versionId,
          versionLabel: selectedVersion.versionLabel,
          contentKind: 'unsupported',
          createdAt: selectedVersion.createdAt,
        },
      },
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    expect(panel.textContent).toContain(`Selected version: ${selectedVersion.versionLabel}`);
    expect(panel.querySelector('[data-unsupported-review-target="true"]')?.textContent).toContain(
      'Supported formats: markdown',
    );
    expect(panel.querySelector('[data-artifact-review-body]')).toBeNull();
  });

  it('shows artifact and version identity when an inline Mermaid render fails', async () => {
    const selectedVersion = readyArtifactReviewTargetFixture.selectedVersion;
    if (selectedVersion === undefined) {
      throw new Error('Expected the ready artifact fixture to include a selected version.');
    }

    renderMermaidMock.mockResolvedValueOnce({ error: 'Parse error' });

    const panel = renderArtifactReviewPanel({
      artifact: {
        ...readyArtifactReviewTargetFixture,
        selectedVersion: {
          ...selectedVersion,
          body: '<div class="mermaid-placeholder" data-block-id="mermaid-block-1"></div>',
          mermaidBlocks: [
            {
              blockId: 'mermaid-block-1',
              source: 'graph TD\n  Broken -->',
            },
          ],
        },
      },
      targetDocument: document,
      onSelectVersion: vi.fn(),
    });

    document.body.append(panel);

    await vi.waitFor(() => {
      expect(panel.querySelector('[data-mermaid-error="true"]')).not.toBeNull();
    });

    expect(panel.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      readyArtifactReviewTargetFixture.displayName,
    );
    expect(panel.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      selectedVersion.versionId,
    );
    expect(
      panel.querySelector('[data-mermaid-error="true"]')?.getAttribute('data-version-id'),
    ).toBe(selectedVersion.versionId);
    expect(panel.querySelector('[data-mermaid-error="true"]')?.textContent).toContain(
      'block mermaid-block-1',
    );
    expect(panel.querySelector('[data-mermaid-error="true"]')?.textContent).not.toContain(
      'Parse error',
    );
  });
});
