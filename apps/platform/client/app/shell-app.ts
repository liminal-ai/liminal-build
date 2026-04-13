import { renderProjectIndexPage } from '../features/projects/project-index-page.js';
import { renderProjectShellPage } from '../features/projects/project-shell-page.js';
import { clearElement } from './dom.js';
import type { AppStore } from './store.js';

export interface ShellAppOptions {
  root: HTMLElement;
  store: AppStore;
  targetWindow: Window & typeof globalThis;
}

export function createShellApp(options: ShellAppOptions) {
  const render = (): void => {
    clearElement(options.root);

    const state = options.store.get();
    const page =
      state.route.projectId === null
        ? renderProjectIndexPage({
            store: options.store,
            targetDocument: options.targetWindow.document,
            targetWindow: options.targetWindow,
          })
        : renderProjectShellPage({
            store: options.store,
            targetDocument: options.targetWindow.document,
            targetWindow: options.targetWindow,
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
