import type { AppStore } from '../../app/store.js';
import { renderArtifactSection } from './artifact-section.js';
import { renderProcessSection } from './process-section.js';
import { renderShellHeader } from './shell-header.js';
import { renderSourceAttachmentSection } from './source-attachment-section.js';
import {
  renderMissingProjectState,
  renderMissingSelectedProcessBanner,
} from './unavailable-state.js';

export function renderProjectShellPage(args: {
  store: AppStore;
  targetDocument: Document;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const state = args.store.get();

  container.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
    }),
  );

  if (state.shell.selectedProcessBanner !== null) {
    container.append(
      renderMissingSelectedProcessBanner(args.targetDocument, state.shell.selectedProcessBanner),
    );
  }

  if (state.shell.project === null) {
    container.append(renderMissingProjectState(args.targetDocument));
  } else {
    const projectHeading = args.targetDocument.createElement('h2');
    projectHeading.textContent = `Project shell scaffold for ${state.shell.project.name}`;
    container.append(projectHeading);
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
