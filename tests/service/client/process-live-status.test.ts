import { describe, expect, it, vi } from 'vitest';
import { renderProcessLiveStatus } from '../../../apps/platform/client/features/processes/process-live-status.js';
import { processLiveUnavailableTransportErrorFixture } from '../../fixtures/process-surface.js';

describe('process live status', () => {
  it('TC-6.2b shows reconnecting state while visible process data remains on screen', () => {
    const view = renderProcessLiveStatus({
      liveState: {
        connectionState: 'reconnecting',
        subscriptionId: 'subscription-001',
        lastSequenceNumber: 3,
        error: processLiveUnavailableTransportErrorFixture,
      },
      targetDocument: document,
    });

    expect(view?.textContent).toContain('Live updates are reconnecting');
  });

  it('TC-6.5b shows a retry path when live updates are unavailable', () => {
    const onRetry = vi.fn();
    const view = renderProcessLiveStatus({
      liveState: {
        connectionState: 'error',
        subscriptionId: null,
        lastSequenceNumber: null,
        error: processLiveUnavailableTransportErrorFixture,
      },
      targetDocument: document,
      onRetry,
    });
    const retryButton = view?.querySelector('button');

    if (!(retryButton instanceof HTMLButtonElement)) {
      throw new Error('Expected retry button to be rendered.');
    }

    retryButton.click();

    expect(view?.textContent).toContain(processLiveUnavailableTransportErrorFixture.message);
    expect(retryButton.textContent).toBe('Retry live updates');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
