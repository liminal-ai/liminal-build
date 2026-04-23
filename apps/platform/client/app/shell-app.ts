import { renderProcessWorkSurfacePage } from '../features/processes/process-work-surface-page.js';
import { renderProjectIndexPage } from '../features/projects/project-index-page.js';
import { renderProjectShellPage } from '../features/projects/project-shell-page.js';
import { renderReviewWorkspacePage } from '../features/review/review-workspace-page.js';
import { clearElement } from './dom.js';
import type { AppStore } from './store.js';
import type { ReviewWorkspaceSelection } from '../../shared/contracts/index.js';

export interface ShellAppOptions {
  root: HTMLElement;
  store: AppStore;
  targetWindow: Window & typeof globalThis;
  onCreateProject: (name: string) => Promise<void>;
  onOpenCreateProject: () => void;
  onCancelCreateProject: () => void;
  onCreateProcess: (
    processType: 'ProductDefinition' | 'FeatureSpecification' | 'FeatureImplementation',
  ) => Promise<void>;
  onOpenCreateProcess: () => void;
  onCancelCreateProcess: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenProcess: (projectId: string, processId: string) => void;
  onOpenReview: (
    projectId: string,
    processId: string,
    selection?: ReviewWorkspaceSelection | null,
  ) => void;
  onStartProcess: (projectId: string, processId: string) => Promise<void>;
  onResumeProcess: (projectId: string, processId: string) => Promise<void>;
  onRehydrateEnvironment: (projectId: string, processId: string) => Promise<void>;
  onRebuildEnvironment: (projectId: string, processId: string) => Promise<void>;
  onSubmitProcessResponse: (projectId: string, processId: string, message: string) => Promise<void>;
  onRetryLiveSubscription: (projectId: string, processId: string) => Promise<void>;
}

export function createShellApp(options: ShellAppOptions) {
  const render = (): void => {
    clearElement(options.root);

    const state = options.store.get();
    const isReviewWorkspace = state.reviewWorkspace.processId !== null;
    const isProcessWorkSurface = state.processSurface.processId !== null;
    const page =
      state.route.projectId === null
        ? renderProjectIndexPage({
            store: options.store,
            targetDocument: options.targetWindow.document,
            targetWindow: options.targetWindow,
            onCreateProject: options.onCreateProject,
            onOpenCreateProject: options.onOpenCreateProject,
            onCancelCreateProject: options.onCancelCreateProject,
            onOpenProject: options.onOpenProject,
          })
        : isReviewWorkspace
          ? renderReviewWorkspacePage({
              store: options.store,
              targetDocument: options.targetWindow.document,
              targetWindow: options.targetWindow,
              onOpenProcess: options.onOpenProcess,
              onOpenReview: (projectId, processId, selection) => {
                options.onOpenReview(projectId, processId, selection);
              },
            })
          : isProcessWorkSurface
            ? renderProcessWorkSurfacePage({
                store: options.store,
                targetDocument: options.targetWindow.document,
                targetWindow: options.targetWindow,
                onOpenProject: options.onOpenProject,
                onOpenReview: (projectId, processId) => {
                  options.onOpenReview(projectId, processId, null);
                },
                onStartProcess: (projectId, processId) => {
                  void options.onStartProcess(projectId, processId);
                },
                onResumeProcess: (projectId, processId) => {
                  void options.onResumeProcess(projectId, processId);
                },
                onRehydrateEnvironment: (projectId, processId) => {
                  void options.onRehydrateEnvironment(projectId, processId);
                },
                onRebuildEnvironment: (projectId, processId) => {
                  void options.onRebuildEnvironment(projectId, processId);
                },
                onSubmitProcessResponse: (projectId, processId, message) => {
                  void options.onSubmitProcessResponse(projectId, processId, message);
                },
                onRetryLiveSubscription: (projectId, processId) => {
                  void options.onRetryLiveSubscription(projectId, processId);
                },
              })
            : renderProjectShellPage({
                store: options.store,
                targetDocument: options.targetWindow.document,
                targetWindow: options.targetWindow,
                onOpenProcess: options.onOpenProcess,
                onCreateProcess: options.onCreateProcess,
                onCancelCreateProcess: options.onCancelCreateProcess,
                onOpenCreateProcess: options.onOpenCreateProcess,
              });

    options.root.append(page);
  };

  options.store.subscribe(() => {
    render();
  });

  return {
    render,
  };
}
