import type { ArchiveTurnPage } from '../../../shared/contracts/index.js';

function formatTurnDateRange(turn: ArchiveTurnPage['turns'][number]): string {
  return `${turn.startedAt} -> ${turn.endedAt}`;
}

export function renderArchiveTurnsSection(args: {
  turns: ArchiveTurnPage | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');

  section.setAttribute('data-archive-turns-section', 'true');
  title.textContent = 'Turns';
  section.append(title);

  if (args.turns === null) {
    const message = args.targetDocument.createElement('p');
    message.textContent = 'Loading derived turns...';
    section.append(message);
    return section;
  }

  const pageState = args.targetDocument.createElement('p');
  pageState.setAttribute('data-archive-turn-page-state', 'true');
  pageState.textContent = args.turns.page.hasMore
    ? `Showing ${args.turns.turns.length} derived turns. More derived turns are available.`
    : `Showing ${args.turns.turns.length} derived turns.`;
  section.append(pageState);

  if (args.turns.turns.length === 0) {
    const empty = args.targetDocument.createElement('p');
    empty.setAttribute('data-archive-turn-empty-state', 'true');
    empty.textContent = 'No derived turns yet.';
    section.append(empty);
    return section;
  }

  const list = args.targetDocument.createElement('ol');

  for (const turn of args.turns.turns) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const meta = args.targetDocument.createElement('p');
    const archiveRefs = args.targetDocument.createElement('p');

    item.setAttribute('data-archive-turn-id', turn.turnId);
    item.setAttribute('data-archive-turn-status', turn.turnStatus);
    heading.textContent = `Turn ${turn.turnIndex}`;
    meta.textContent = formatTurnDateRange(turn);
    archiveRefs.setAttribute('data-archive-turn-entry-refs', 'true');
    archiveRefs.textContent = `Archive entries: ${turn.archiveEntryIds.join(', ')}`;
    item.append(heading, meta, archiveRefs);

    if (turn.turnStatus === 'degraded') {
      const degraded = args.targetDocument.createElement('p');
      degraded.setAttribute('data-archive-turn-degradation-reason', 'true');
      degraded.textContent = turn.degradationReason ?? 'This derived turn is degraded.';
      item.append(degraded);
    }

    list.append(item);
  }

  section.append(list);
  return section;
}
