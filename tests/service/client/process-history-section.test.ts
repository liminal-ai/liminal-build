import { describe, expect, it } from 'vitest';
import { renderProcessHistorySection } from '../../../apps/platform/client/features/processes/process-history-section.js';
import { emptyProcessHistoryFixture } from '../../fixtures/process-history.js';

describe('process history section', () => {
  it('TC-1.4b renders a clear early-state history area when no visible history exists', () => {
    const view = renderProcessHistorySection({
      envelope: emptyProcessHistoryFixture,
      targetDocument: document,
    });

    expect(view.textContent).toContain('Process history');
    expect(view.textContent).toContain('No visible process history yet.');
  });
});
