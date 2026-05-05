import type { DerivedArchiveViewListResponse } from '../../../shared/contracts/index.js';

function renderTurnRangeText(view: DerivedArchiveViewListResponse['views'][number]): string {
  if (view.turnRange === null) {
    return 'Turn range unavailable';
  }

  return view.turnRange.startIndex === view.turnRange.endIndex
    ? `Turn ${view.turnRange.startIndex}`
    : `Turns ${view.turnRange.startIndex}-${view.turnRange.endIndex}`;
}

export function renderDerivedArchiveViewsSection(args: {
  derivedViews: DerivedArchiveViewListResponse | null;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');

  section.setAttribute('data-derived-archive-views-section', 'true');
  title.textContent = 'Derived views';
  section.append(title);

  if (args.derivedViews === null) {
    const loading = args.targetDocument.createElement('p');
    loading.textContent = 'Loading structural views...';
    section.append(loading);
    return section;
  }

  const pageState = args.targetDocument.createElement('p');
  pageState.setAttribute('data-derived-archive-views-state', 'true');
  pageState.textContent = `Showing ${args.derivedViews.views.length} structural views.`;
  section.append(pageState);

  if (args.derivedViews.views.length === 0) {
    const empty = args.targetDocument.createElement('p');
    empty.setAttribute('data-derived-archive-views-empty-state', 'true');
    empty.textContent = 'No derived archive views yet.';
    section.append(empty);
    return section;
  }

  const list = args.targetDocument.createElement('ol');

  for (const view of args.derivedViews.views) {
    const item = args.targetDocument.createElement('li');
    const heading = args.targetDocument.createElement('strong');
    const boundary = args.targetDocument.createElement('p');
    const sourceTurns = args.targetDocument.createElement('p');
    const sourceArchiveEntries = args.targetDocument.createElement('p');

    item.setAttribute('data-derived-archive-view-id', view.derivedViewId);
    item.setAttribute('data-derived-archive-view-kind', view.viewKind);
    item.setAttribute('data-derived-archive-view-status', view.viewStatus);
    heading.textContent = view.title ?? view.bodyText ?? view.derivedViewId;
    boundary.setAttribute('data-derived-archive-view-boundary', 'true');
    boundary.textContent = renderTurnRangeText(view);
    sourceTurns.setAttribute('data-derived-archive-view-turn-refs', 'true');
    sourceTurns.textContent = `Source turns: ${view.sourceTurnIds.join(', ')}`;
    sourceArchiveEntries.setAttribute('data-derived-archive-view-entry-refs', 'true');
    sourceArchiveEntries.textContent = `Archive entries: ${view.sourceArchiveEntryIds.join(', ')}`;
    item.append(heading, boundary, sourceTurns, sourceArchiveEntries);

    if (view.bodyText !== null && view.bodyText !== view.title) {
      const body = args.targetDocument.createElement('p');
      body.setAttribute('data-derived-archive-view-body-text', 'true');
      body.textContent = view.bodyText;
      item.append(body);
    }

    if (view.viewStatus === 'degraded') {
      const degraded = args.targetDocument.createElement('p');
      degraded.setAttribute('data-derived-archive-view-degradation-reason', 'true');
      degraded.textContent = view.degradationReason ?? 'This derived archive view is degraded.';
      item.append(degraded);
    }

    list.append(item);
  }

  section.append(list);
  return section;
}
