import type { SideWorkSectionEnvelope } from '../../../shared/contracts/index.js';

export function renderSideWorkSection(args: {
  envelope: SideWorkSectionEnvelope | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  title.textContent = 'Side work';
  section.setAttribute('data-side-work-section', 'true');
  section.append(title);

  if (args.envelope === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'Loading side work...';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'empty') {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'No side work is currently visible.';
    section.append(message);
    return section;
  }

  if (args.envelope.status === 'error') {
    const message = args.targetDocument.createElement('p');
    message.textContent = args.envelope.error?.message ?? 'Side work failed to load.';
    section.append(message);
    return section;
  }

  const list = args.targetDocument.createElement('ul');

  for (const item of args.envelope.items) {
    const entry = args.targetDocument.createElement('li');
    const label = args.targetDocument.createElement('strong');
    const purpose = args.targetDocument.createElement('p');
    const status = args.targetDocument.createElement('p');
    label.textContent = item.displayLabel;
    purpose.textContent = item.purposeSummary;
    status.textContent =
      item.resultSummary === null
        ? `Status: ${item.status}`
        : `Status: ${item.status} — ${item.resultSummary}`;
    entry.append(label, purpose, status);
    list.append(entry);
  }

  section.append(list);
  return section;
}
