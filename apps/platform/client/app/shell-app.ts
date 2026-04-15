import { renderProcessWorkSurfacePage } from '../features/processes/process-work-surface-page.js';
import { renderProjectIndexPage } from '../features/projects/project-index-page.js';
import { renderProjectShellPage } from '../features/projects/project-shell-page.js';
import { clearElement } from './dom.js';
import type { AppStore } from './store.js';

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
  onStartProcess: (projectId: string, processId: string) => Promise<void>;
  onResumeProcess: (projectId: string, processId: string) => Promise<void>;
}

export function createShellApp(options: ShellAppOptions) {
  const render = (): void => {
    clearElement(options.root);

    const state = options.store.get();
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
        : isProcessWorkSurface
          ? renderProcessWorkSurfacePage({
              store: options.store,
              targetDocument: options.targetWindow.document,
              targetWindow: options.targetWindow,
              onOpenProject: options.onOpenProject,
              onStartProcess: (projectId, processId) => {
                void options.onStartProcess(projectId, processId);
              },
              onResumeProcess: (projectId, processId) => {
                void options.onResumeProcess(projectId, processId);
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
