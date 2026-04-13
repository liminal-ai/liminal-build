import type { AppStore } from '../../app/store.js';
import { renderProjectCard } from './project-card.js';
import { renderShellHeader } from './shell-header.js';

export function renderProjectIndexPage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  const body = args.targetDocument.createElement('p');
  const state = args.store.get();

  section.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  title.textContent = 'Projects';

  if (state.projects.isLoading) {
    body.textContent = 'Loading accessible projects...';
    section.append(title, body);
    return section;
  }

  if (state.projects.error !== null) {
    body.textContent = state.projects.error.message;
    section.append(title, body);
    return section;
  }

  const projects = state.projects.list ?? [];

  if (projects.length === 0) {
    body.textContent = 'No accessible projects yet. Create-project work begins in Story 2.';
    section.append(title, body);
    return section;
  }

  body.textContent = 'Accessible projects for the current actor.';
  section.append(title, body);

  for (const project of projects) {
    section.append(
      renderProjectCard({
        project,
        targetDocument: args.targetDocument,
      }),
    );
  }

  return section;
}
