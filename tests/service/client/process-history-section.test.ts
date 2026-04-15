import { describe, expect, it } from 'vitest';
import { renderProcessHistorySection } from '../../../apps/platform/client/features/processes/process-history-section.js';
import {
  attentionRequestHistoryFixture,
  emptyProcessHistoryFixture,
  progressUpdateHistoryFixture,
  readyProcessHistoryFixture,
  userMessageHistoryFixture,
} from '../../fixtures/process-history.js';

describe('process history section', () => {
  it('TC-1.4b renders a clear early-state history area when no visible history exists', () => {
    const view = renderProcessHistorySection({
      envelope: emptyProcessHistoryFixture,
      targetDocument: document,
    });

    expect(view.textContent).toContain('Process history');
    expect(view.textContent).toContain('No visible process history yet.');
  });

  it('TC-3.3a shows an accepted user response in visible history', () => {
    const view = renderProcessHistorySection({
      envelope: {
        status: 'ready',
        items: [userMessageHistoryFixture],
      },
      targetDocument: document,
    });

    const userMessageEntry = view.querySelector('[data-process-history-kind="user_message"]');

    expect(userMessageEntry?.textContent).toContain('Please continue with the process.');
  });

  it('TC-5.1a keeps routine progress distinct from attention-required history', () => {
    const view = renderProcessHistorySection({
      envelope: {
        status: 'ready',
        items: [
          progressUpdateHistoryFixture,
          attentionRequestHistoryFixture,
          ...readyProcessHistoryFixture.items.filter(
            (item) =>
              item.historyItemId !== progressUpdateHistoryFixture.historyItemId &&
              item.historyItemId !== attentionRequestHistoryFixture.historyItemId,
          ),
        ],
      },
      targetDocument: document,
    });

    expect(
      view.querySelector('[data-process-history-kind="progress_update"]')?.textContent,
    ).toContain('progress update');
    expect(
      view.querySelector('[data-process-history-kind="attention_request"]')?.textContent,
    ).toContain('Attention required');
  });
});
