import type { AppStore } from '../../app/store.js';
import { renderShellHeader } from '../projects/shell-header.js';
import {
  renderForbiddenProcessState,
  renderMissingProcessState,
  renderMissingProjectState,
} from '../projects/unavailable-state.js';
import { renderCurrentRequestPanel } from './current-request-panel.js';
import { renderProcessHistorySection } from './process-history-section.js';
import { renderProcessMaterialsSection } from './process-materials-section.js';
import { renderProcessResponseComposer } from './process-response-composer.js';
import { renderSideWorkSection } from './side-work-section.js';

function formatProcessTypeLabel(processType: string): string {
  return processType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatProcessStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function renderProcessWorkSurfacePage(args: {
  store: AppStore;
  targetDocument: Document;
  targetWindow: Window & typeof globalThis;
  onOpenProject: (projectId: string) => void;
  onStartProcess?: (projectId: string, processId: string) => void;
  onResumeProcess?: (projectId: string, processId: string) => void;
  onSubmitProcessResponse?: (projectId: string, processId: string, message: string) => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const state = args.store.get();
  const processSurface = state.processSurface;

  container.setAttribute('data-process-work-surface', 'true');
  container.append(
    renderShellHeader({
      store: args.store,
      targetDocument: args.targetDocument,
      targetWindow: args.targetWindow,
    }),
  );

  if (processSurface.isLoading) {
    const loading = args.targetDocument.createElement('p');
    loading.textContent = 'Loading process work surface...';
    container.append(loading);
    return container;
  }

  if (processSurface.error?.code === 'PROJECT_FORBIDDEN') {
    container.append(renderForbiddenProcessState(args.targetDocument));
    return container;
  }

  if (processSurface.error?.code === 'PROJECT_NOT_FOUND') {
    container.append(renderMissingProjectState(args.targetDocument));
    return container;
  }

  if (processSurface.error?.code === 'PROCESS_NOT_FOUND') {
    container.append(renderMissingProcessState(args.targetDocument));
    return container;
  }

  if (
    processSurface.error !== null ||
    processSurface.project === null ||
    processSurface.process === null
  ) {
    const error = args.targetDocument.createElement('section');
    const title = args.targetDocument.createElement('h2');
    const body = args.targetDocument.createElement('p');
    title.textContent = 'Process work surface failed to load';
    body.textContent = processSurface.error?.message ?? 'The process work surface is unavailable.';
    error.append(title, body);
    container.append(error);
    return container;
  }

  const activeProject = processSurface.project;
  const activeProcess = processSurface.process;

  const backButton = args.targetDocument.createElement('button');
  backButton.type = 'button';
  backButton.textContent = 'Back to project';
  backButton.addEventListener('click', () => {
    args.onOpenProject(activeProject.projectId);
  });

  const projectHeading = args.targetDocument.createElement('h2');
  const projectRole = args.targetDocument.createElement('p');
  const processHeading = args.targetDocument.createElement('h3');
  const processMeta = args.targetDocument.createElement('p');
  const processPhase = args.targetDocument.createElement('p');

  projectHeading.textContent = activeProject.name;
  projectRole.textContent = `Role: ${activeProject.role}`;
  processHeading.textContent = activeProcess.displayLabel;
  processMeta.textContent = `${formatProcessTypeLabel(activeProcess.processType)} • ${formatProcessStatusLabel(activeProcess.status)}`;
  processPhase.textContent = `Phase: ${activeProcess.phaseLabel}`;
  container.append(
    backButton,
    projectHeading,
    projectRole,
    processHeading,
    processMeta,
    processPhase,
  );

  if (activeProcess.availableActions.includes('start')) {
    const startButton = args.targetDocument.createElement('button');
    startButton.type = 'button';
    startButton.textContent = 'Start process';
    startButton.addEventListener('click', () => {
      args.onStartProcess?.(activeProject.projectId, activeProcess.processId);
    });
    container.append(startButton);
  }

  if (activeProcess.availableActions.includes('resume')) {
    const resumeButton = args.targetDocument.createElement('button');
    resumeButton.type = 'button';
    resumeButton.textContent = 'Resume process';
    resumeButton.addEventListener('click', () => {
      args.onResumeProcess?.(activeProject.projectId, activeProcess.processId);
    });
    container.append(resumeButton);
  }

  if (processSurface.actionError !== null) {
    const actionError = args.targetDocument.createElement('p');
    actionError.setAttribute('data-process-action-error', 'true');
    actionError.setAttribute('role', 'alert');
    actionError.textContent = processSurface.actionError.message;
    container.append(actionError);
  }

  if (activeProcess.nextActionLabel !== null) {
    const nextAction = args.targetDocument.createElement('p');
    nextAction.textContent = `Next action: ${activeProcess.nextActionLabel}`;
    container.append(nextAction);
  }

  container.append(
    renderCurrentRequestPanel({
      currentRequest: processSurface.currentRequest,
      targetDocument: args.targetDocument,
    }),
  );

  if (
    activeProcess.availableActions.includes('respond') &&
    args.onSubmitProcessResponse !== undefined
  ) {
    container.append(
      renderProcessResponseComposer({
        targetDocument: args.targetDocument,
        onSubmitResponse: async (message: string) => {
          args.onSubmitProcessResponse?.(activeProject.projectId, activeProcess.processId, message);
        },
      }),
    );
  }

  container.append(
    renderProcessHistorySection({
      envelope: processSurface.history,
      targetDocument: args.targetDocument,
    }),
    renderProcessMaterialsSection({
      envelope: processSurface.materials,
      targetDocument: args.targetDocument,
    }),
    renderSideWorkSection({
      envelope: processSurface.sideWork,
      targetDocument: args.targetDocument,
    }),
  );

  return container;
}
