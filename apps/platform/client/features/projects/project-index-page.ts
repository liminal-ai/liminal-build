import type { AppStore } from '../../app/store.js';
import { renderProjectCard } from './project-card.js';

export function renderProjectIndexPage(args: {
  store: AppStore;
  targetDocument: Document;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  const body = args.targetDocument.createElement('p');

  title.textContent = 'Project index scaffold';
  body.textContent =
    'Story 0 provides the route/state foundation. Project listing behavior begins in Story 1.';

  section.append(title, body);

  for (const project of args.store.get().projects.list ?? []) {
    section.append(
      renderProjectCard({
        project,
        targetDocument: args.targetDocument,
      }),
    );
  }

  return section;
}
