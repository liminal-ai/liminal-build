// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderSourceProvenanceSection } from '../../../apps/platform/client/features/processes/source-provenance-section.js';
import {
  degradedSourceProvenanceFixture,
  readySourceProvenanceFixture,
} from '../../fixtures/sources.js';

describe('source provenance section', () => {
  it('TC-4.1b renders an empty provenance state', () => {
    const view = renderSourceProvenanceSection({
      provenance: {
        status: 'empty',
        entries: [],
      },
      targetDocument: document,
    });

    expect(view.textContent).toContain(
      'No source provenance has been recorded for this process yet.',
    );
  });

  it('TC-4.4b degraded provenance falls back to durable identity', () => {
    const view = renderSourceProvenanceSection({
      provenance: {
        status: 'ready',
        entries: [readySourceProvenanceFixture, degradedSourceProvenanceFixture],
      },
      targetDocument: document,
    });

    const degradedEntry = view.querySelector(
      `[data-source-provenance-entry="${degradedSourceProvenanceFixture.provenanceId}"]`,
    );

    expect(degradedEntry).not.toBeNull();
    expect(degradedEntry?.textContent).toContain(
      degradedSourceProvenanceFixture.repositoryFullName,
    );
    expect(degradedEntry?.textContent).toContain(
      `Target ref: ${degradedSourceProvenanceFixture.targetRef}`,
    );
    expect(degradedEntry?.textContent).toContain('Degraded because: source detached');
    expect(degradedEntry?.getAttribute('data-source-provenance-visibility')).toBe('detached');
  });

  it('renders a bounded unavailable state when provenance loading fails', () => {
    const view = renderSourceProvenanceSection({
      provenance: {
        status: 'error',
        entries: [],
        error: {
          code: 'PROCESS_SOURCE_PROVENANCE_UNAVAILABLE',
          message:
            'Source provenance is unavailable right now. Reload the page or try again later.',
        },
      },
      targetDocument: document,
    });

    expect(view.textContent).toContain(
      'Source provenance is unavailable right now. Reload the page or try again later.',
    );
    expect(view.textContent).not.toContain(
      'No source provenance has been recorded for this process yet.',
    );
  });
});
