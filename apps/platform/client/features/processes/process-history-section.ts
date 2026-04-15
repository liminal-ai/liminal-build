import type { ProcessHistorySectionEnvelope } from '../../../shared/contracts/index.js';

function formatHistoryKindLabel(kind: string): string {
  if (kind === 'attention_request') {
    return 'Attention required';
  }

  return kind.replaceAll('_', ' ');
}

export function renderProcessHistorySection(args: {
  envelope: ProcessHistorySectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  title.textContent = 'Process history';
  section.setAttribute('data-process-history-section', 'true');
  section.append(title);

  if (args.envelope === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'Loading process history...';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'empty') {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'No visible process history yet.';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'error') {
    const message = args.targetDocument.createElement('p');
    message.textContent = args.envelope.error?.message ?? 'Process history failed to load.';
    section.append(message);
    return section;
  }

  const list = args.targetDocument.createElement('ol');

  for (const item of args.envelope.items) {
    const entry = args.targetDocument.createElement('li');
    const kind = args.targetDocument.createElement('strong');
    const body = args.targetDocument.createElement('p');
    const meta = args.targetDocument.createElement('p');

    entry.setAttribute('data-process-history-kind', item.kind);
    kind.textContent = formatHistoryKindLabel(item.kind);
    body.textContent = item.text;
    meta.textContent = `Created: ${item.createdAt}`;
    entry.append(kind, body, meta);
    list.append(entry);
  }

  section.append(list);
  return section;
}
