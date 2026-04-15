import type { CurrentProcessRequest } from '../../../shared/contracts/index.js';

function formatRequestKindLabel(kind: string): string {
  return kind.replaceAll('_', ' ');
}

export function renderCurrentRequestPanel(args: {
  currentRequest: CurrentProcessRequest | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  title.textContent = 'Current request';
  section.setAttribute('data-current-request-panel', 'true');
  section.setAttribute(
    'data-current-request-state',
    args.currentRequest === null ? 'none' : 'unresolved',
  );
  section.append(title);

  if (args.currentRequest === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'No unresolved request right now.';
    section.append(message);
    return section;
  }

  const attention = args.targetDocument.createElement('p');
  const kind = args.targetDocument.createElement('p');
  const prompt = args.targetDocument.createElement('p');
  const createdAt = args.targetDocument.createElement('p');
  attention.textContent = 'Attention required';
  kind.textContent = `Kind: ${formatRequestKindLabel(args.currentRequest.requestKind)}`;
  prompt.textContent = args.currentRequest.promptText;
  createdAt.textContent = `Requested: ${args.currentRequest.createdAt}`;
  section.append(attention, kind, prompt, createdAt);

  if (args.currentRequest.requiredActionLabel !== null) {
    const action = args.targetDocument.createElement('p');
    action.textContent = `Required action: ${args.currentRequest.requiredActionLabel}`;
    section.append(action);
  }

  return section;
}
