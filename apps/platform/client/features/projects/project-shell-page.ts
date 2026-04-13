import type { AppStore } from '../../app/store.js';
import { renderArtifactSection } from './artifact-section.js';
import { renderProcessSection } from './process-section.js';
import { renderShellHeader } from './shell-header.js';
import { renderSourceAttachmentSection } from './source-attachment-section.js';
import {
  renderForbiddenProjectState,
  renderMissingProjectState,
  renderMissingSelectedProcessBanner,
} from './unavailable-state.js';

export function renderProjectShellPage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const state = args.store.get();

  container.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  if (state.shell.selectedProcessBanner !== null) {
    container.append(
      renderMissingSelectedProcessBanner(args.targetDocument, state.shell.selectedProcessBanner),
    );
  }

  if (state.shell.error?.code === 'PROJECT_FORBIDDEN') {
    container.append(renderForbiddenProjectState(args.targetDocument));
  } else if (state.shell.error?.code === 'PROJECT_NOT_FOUND' || state.shell.project === null) {
    container.append(renderMissingProjectState(args.targetDocument));
  } else {
    const projectHeading = args.targetDocument.createElement('h2');
    const role = args.targetDocument.createElement('p');
    projectHeading.textContent = state.shell.project.name;
    role.textContent = `Role: ${state.shell.project.role}`;
    container.append(projectHeading, role);
  }

  container.append(
    renderProcessSection({
      envelope: state.shell.processes,
      selectedProcessId: state.route.selectedProcessId,
      targetDocument: args.targetDocument,
    }),
    renderArtifactSection({
      envelope: state.shell.artifacts,
      targetDocument: args.targetDocument,
    }),
    renderSourceAttachmentSection({
      envelope: state.shell.sourceAttachments,
      targetDocument: args.targetDocument,
    }),
  );

  return container;
}
