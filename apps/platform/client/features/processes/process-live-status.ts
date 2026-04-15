import type { ProcessSurfaceState } from '../../../shared/contracts/index.js';

function buildStatusMessage(liveState: ProcessSurfaceState['live']): string | null {
  switch (liveState.connectionState) {
    case 'connecting':
      return 'Live updates are connecting.';
    case 'connected':
      return 'Live updates are connected.';
    case 'reconnecting':
      return 'Live updates are reconnecting. Visible state remains available.';
    case 'error':
      return liveState.error?.message ?? 'Live updates are currently unavailable.';
    default:
      return null;
  }
}

export function renderProcessLiveStatus(args: {
  liveState: ProcessSurfaceState['live'];
  targetDocument: Document;
  onRetry?: () => void;
}): HTMLElement | null {
  const messageText = buildStatusMessage(args.liveState);

  if (messageText === null) {
    return null;
  }

  const section = args.targetDocument.createElement('section');
  const message = args.targetDocument.createElement('p');
  section.setAttribute('data-process-live-status', args.liveState.connectionState);
  message.textContent = messageText;
  section.append(message);

  if (
    args.onRetry !== undefined &&
    (args.liveState.connectionState === 'reconnecting' ||
      args.liveState.connectionState === 'error')
  ) {
    const retryButton = args.targetDocument.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = 'Retry live updates';
    retryButton.addEventListener('click', () => {
      args.onRetry?.();
    });
    section.append(retryButton);
  }

  return section;
}
