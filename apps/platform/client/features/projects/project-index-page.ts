import type { AppStore } from '../../app/store.js';
import { renderCreateProjectModal } from './create-project-modal.js';
import { renderProjectCard } from './project-card.js';
import { renderShellHeader } from './shell-header.js';

export function renderProjectIndexPage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
  onCreateProject: (name: string) => Promise<void>;
  onOpenCreateProject: () => void;
  onCancelCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
}): HTMLElement {
  const section = args.targetDocument.createElement('section');
  const title = args.targetDocument.createElement('h2');
  const body = args.targetDocument.createElement('p');
  const createButton = args.targetDocument.createElement('button');
  const state = args.store.get();

  section.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  title.textContent = 'Projects';
  createButton.type = 'button';
  createButton.textContent = 'Create project';
  createButton.addEventListener('click', () => {
    args.onOpenCreateProject();
  });

  if (state.projects.isLoading) {
    body.textContent = 'Loading accessible projects...';
    section.append(title, createButton, body);
    return section;
  }

  if (state.projects.error !== null) {
    body.textContent = state.projects.error.message;
    section.append(title, createButton, body);
    return section;
  }

  const projects = state.projects.list ?? [];

  if (projects.length === 0) {
    body.textContent = 'No accessible projects yet. Create a project to get started.';
    section.append(title, createButton, body);
    if (state.modals.createProjectOpen) {
      section.append(
        renderCreateProjectModal({
          targetDocument: args.targetDocument,
          onCancel: args.onCancelCreateProject,
          onSubmit: args.onCreateProject,
        }),
      );
    }
    return section;
  }

  body.textContent = 'Accessible projects for the current actor.';
  section.append(title, createButton, body);

  for (const project of projects) {
    section.append(
      renderProjectCard({
        project,
        targetDocument: args.targetDocument,
        onOpenProject: args.onOpenProject,
      }),
    );
  }

  if (state.modals.createProjectOpen) {
    section.append(
      renderCreateProjectModal({
        targetDocument: args.targetDocument,
        onCancel: args.onCancelCreateProject,
        onSubmit: args.onCreateProject,
      }),
    );
  }

  return section;
}
