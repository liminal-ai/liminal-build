import type { ArchivePage } from '../../../shared/contracts/index.js';

function formatArchiveEntryKindLabel(kind: string): string {
  return kind.replaceAll('_', ' ');
}

function describeArchiveBody(entry: ArchivePage['entries'][number]): string {
  if (entry.bodyText !== null) {
    return entry.bodyText;
  }

  if (entry.bodyData !== null) {
    return entry.bodyData.jsonText;
  }

  return 'No archived body content.';
}

export function renderArchiveSection(args: {
  archive: ArchivePage | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');

  section.setAttribute('data-archive-section', 'true');
  title.textContent = 'Archive';
  section.append(title);

  if (args.archive === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'Loading archive entries...';
    section.append(message);
    return section;
  }

  const pageState = args.targetDocument.createElement('p');
  pageState.setAttribute('data-archive-page-state', 'true');
  pageState.textContent = args.archive.page.hasMore
    ? `Showing ${args.archive.entries.length} finalized archive entries. More finalized entries are available.`
    : `Showing ${args.archive.entries.length} finalized archive entries.`;
  section.append(pageState);

  if (args.archive.entries.length === 0) {
    const empty = args.targetDocument.createElement('p');
    empty.setAttribute('data-archive-empty-state', 'true');
    empty.textContent = 'No archived entries yet.';
    section.append(empty);
    return section;
  }

  const list = args.targetDocument.createElement('ol');

  for (const entry of args.archive.entries) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const body = args.targetDocument.createElement('p');
    const meta = args.targetDocument.createElement('p');

    item.setAttribute('data-archive-entry-kind', entry.entryKind);
    item.setAttribute('data-archive-entry-status', entry.entryStatus);
    heading.textContent = `${entry.sequence}. ${formatArchiveEntryKindLabel(entry.entryKind)}`;
    body.textContent = describeArchiveBody(entry);
    meta.textContent = `Recorded: ${entry.recordedAt}`;
    item.append(heading, body, meta);

    if (entry.entryStatus === 'degraded') {
      const degraded = args.targetDocument.createElement('p');
      degraded.setAttribute('data-archive-degradation-reason', 'true');
      degraded.textContent = entry.degradationReason ?? 'This archived entry is degraded.';
      item.append(degraded);
    }

    list.append(item);
  }

  section.append(list);
  return section;
}
