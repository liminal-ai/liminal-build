import { describe, expect, it } from 'vitest';
import { renderSideWorkSection } from '../../../apps/platform/client/features/processes/side-work-section.js';
import {
  completedSideWorkFixture,
  failedSideWorkFixture,
  readySideWorkFixture,
  runningSideWorkFixture,
} from '../../fixtures/side-work.js';

describe('side work section', () => {
  it('TC-5.3a shows active side work distinctly with purpose and running status', () => {
    const view = renderSideWorkSection({
      envelope: {
        status: 'ready',
        items: [runningSideWorkFixture],
      },
      targetDocument: document,
    });
    const runningItem = view.querySelector('[data-side-work-status="running"]');

    expect(runningItem?.textContent).toContain(runningSideWorkFixture.displayLabel);
    expect(runningItem?.textContent).toContain(`Purpose: ${runningSideWorkFixture.purposeSummary}`);
    expect(runningItem?.textContent).toContain('Status: Running');
  });

  it('TC-5.3b keeps multiple side-work items distinguishable by label and status', () => {
    const view = renderSideWorkSection({
      envelope: readySideWorkFixture,
      targetDocument: document,
    });
    const entries = [...view.querySelectorAll('[data-side-work-id]')];

    expect(entries).toHaveLength(readySideWorkFixture.items.length);
    expect(view.textContent).toContain(completedSideWorkFixture.displayLabel);
    expect(view.textContent).toContain(failedSideWorkFixture.displayLabel);
    expect(view.textContent).toContain('Status: Completed');
    expect(view.textContent).toContain('Status: Failed');
  });

  it('TC-5.4a shows the returned result for completed side work', () => {
    const view = renderSideWorkSection({
      envelope: {
        status: 'ready',
        items: [completedSideWorkFixture],
      },
      targetDocument: document,
    });
    const completedItem = view.querySelector('[data-side-work-status="completed"]');

    expect(completedItem?.textContent).toContain('Result:');
    expect(completedItem?.textContent).toContain(completedSideWorkFixture.resultSummary ?? '');
  });

  it('TC-5.4b shows the failure outcome distinctly for failed side work', () => {
    const view = renderSideWorkSection({
      envelope: {
        status: 'ready',
        items: [failedSideWorkFixture],
      },
      targetDocument: document,
    });
    const failedItem = view.querySelector('[data-side-work-status="failed"]');

    expect(failedItem?.textContent).toContain('Failure:');
    expect(failedItem?.textContent).toContain(failedSideWorkFixture.resultSummary ?? '');
  });
});
