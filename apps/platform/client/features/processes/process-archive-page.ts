import type { AppStore } from '../../app/store.js';
import { renderShellHeader } from '../projects/shell-header.js';
import {
  renderForbiddenProcessState,
  renderMissingProcessState,
  renderMissingProjectState,
} from '../projects/unavailable-state.js';
import { renderArchiveSection } from './archive-section.js';
import { renderArchiveTurnsSection } from './archive-turns-section.js';
import { renderDerivedArchiveViewsSection } from './derived-archive-views-section.js';

function formatProcessTypeLabel(processType: string): string {
  return processType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatProcessStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function renderProcessArchivePage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
  onOpenProcess: (projectId: string, processId: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const archiveSurface = args.store.get().archiveSurface;

  container.setAttribute('data-process-archive-page', 'true');
  container.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  if (archiveSurface.isLoading) {
    const loading = args.targetDocument.createElement('p');
    loading.textContent = 'Loading process archive...';
    container.append(loading);
    return container;
  }

  if (archiveSurface.error?.code === 'PROJECT_FORBIDDEN') {
    container.append(renderForbiddenProcessState(args.targetDocument));
    return container;
  }

  if (archiveSurface.error?.code === 'PROJECT_NOT_FOUND') {
    container.append(renderMissingProjectState(args.targetDocument));
    return container;
  }

  if (archiveSurface.error?.code === 'PROCESS_NOT_FOUND') {
    container.append(renderMissingProcessState(args.targetDocument));
    return container;
  }

  if (
    archiveSurface.error !== null ||
    archiveSurface.project === null ||
    archiveSurface.process === null
  ) {
    const error = args.targetDocument.createElement('section');
    const title = args.targetDocument.createElement('h2');
    const body = args.targetDocument.createElement('p');
    title.textContent = 'Process archive failed to load';
    body.textContent = archiveSurface.error?.message ?? 'The process archive is unavailable.';
    error.append(title, body);
    container.append(error);
    return container;
  }

  const activeProject = archiveSurface.project;
  const activeProcess = archiveSurface.process;
  const backButton = args.targetDocument.createElement('button');
  const projectHeading = args.targetDocument.createElement('h2');
  const processHeading = args.targetDocument.createElement('h3');
  const processMeta = args.targetDocument.createElement('p');

  backButton.type = 'button';
  backButton.textContent = 'Back to process';
  backButton.addEventListener('click', () => {
    args.onOpenProcess(activeProject.projectId, activeProcess.processId);
  });

  projectHeading.textContent = activeProject.name;
  processHeading.textContent = `${activeProcess.displayLabel} archive`;
  processMeta.textContent = `${formatProcessTypeLabel(activeProcess.processType)} • ${formatProcessStatusLabel(activeProcess.status)}`;

  container.append(backButton, projectHeading, processHeading, processMeta);
  container.append(
    renderArchiveSection({
      archive: archiveSurface.archive,
      targetDocument: args.targetDocument,
    }),
  );
  container.append(
    renderArchiveTurnsSection({
      turns: archiveSurface.turns,
      targetDocument: args.targetDocument,
    }),
  );
  container.append(
    renderDerivedArchiveViewsSection({
      derivedViews: archiveSurface.derivedViews,
      derivedViewsError: archiveSurface.derivedViewsError,
      targetDocument: args.targetDocument,
    }),
  );

  return container;
}
