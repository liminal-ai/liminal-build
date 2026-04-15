import type { SideWorkSectionEnvelope } from '../../../shared/contracts/index.js';

function formatStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function appendDetail(args: {
  entry: HTMLElement;
  label: string;
  value: string;
  targetDocument: Document;
}): void {
  const detail = args.targetDocument.createElement('p');
  detail.textContent = `${args.label}: ${args.value}`;
  args.entry.append(detail);
}

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
    entry.setAttribute('data-side-work-id', item.sideWorkId);
    entry.setAttribute('data-side-work-status', item.status);
    label.textContent = item.displayLabel;
    entry.append(label);
    appendDetail({
      entry,
      label: 'Purpose',
      value: item.purposeSummary,
      targetDocument: args.targetDocument,
    });
    appendDetail({
      entry,
      label: 'Status',
      value: formatStatusLabel(item.status),
      targetDocument: args.targetDocument,
    });

    if (item.resultSummary !== null) {
      appendDetail({
        entry,
        label: item.status === 'failed' ? 'Failure' : 'Result',
        value: item.resultSummary,
        targetDocument: args.targetDocument,
      });
    }

    appendDetail({
      entry,
      label: 'Updated',
      value: item.updatedAt,
      targetDocument: args.targetDocument,
    });
    list.append(entry);
  }

  section.append(list);
  return section;
}
