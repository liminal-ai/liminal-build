import type { AppStore } from '../../app/store.js';
import { renderArtifactSection } from './artifact-section.js';
import { renderCreateProcessModal } from './create-process-modal.js';
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
  onCreateProcess: (
    processType: 'ProductDefinition' | 'FeatureSpecification' | 'FeatureImplementation',
  ) => Promise<void>;
  onCancelCreateProcess: () => void;
  onOpenCreateProcess: () => void;
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

  if (state.shell.isLoading) {
    const loading = args.targetDocument.createElement('p');
    loading.textContent = 'Loading project shell...';
    container.append(loading);
    return container;
  }

  if (state.shell.error?.code === 'PROJECT_FORBIDDEN') {
    container.append(renderForbiddenProjectState(args.targetDocument));
    return container;
  }

  if (state.shell.error?.code === 'PROJECT_NOT_FOUND' || state.shell.project === null) {
    container.append(renderMissingProjectState(args.targetDocument));
    return container;
  }

  if (state.shell.error !== null) {
    const error = args.targetDocument.createElement('section');
    const title = args.targetDocument.createElement('h2');
    const body = args.targetDocument.createElement('p');
    title.textContent = 'Project shell failed to load';
    body.textContent = state.shell.error.message;
    error.append(title, body);
    container.append(error);
    return container;
  }

  const projectHeading = args.targetDocument.createElement('h2');
  const role = args.targetDocument.createElement('p');
  const createProcessButton = args.targetDocument.createElement('button');
  projectHeading.textContent = state.shell.project.name;
  role.textContent = `Role: ${state.shell.project.role}`;
  createProcessButton.type = 'button';
  createProcessButton.textContent = 'Create process';
  createProcessButton.addEventListener('click', () => {
    args.onOpenCreateProcess();
  });
  container.append(projectHeading, role, createProcessButton);

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

  if (state.modals.createProcessOpen) {
    container.append(
      renderCreateProcessModal({
        targetDocument: args.targetDocument,
        onCreateProcess: args.onCreateProcess,
        onCancel: args.onCancelCreateProcess,
      }),
    );
  }

  return container;
}
