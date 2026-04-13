import type { AppState } from '../../shared/contracts/index.js';
import { getRequiredRootElement, getShellBootstrapPayload } from './dom.js';
import { parseRoute } from './router.js';
import { createShellApp } from './shell-app.js';
import { createAppStore } from './store.js';

export async function bootstrapApp(
  targetWindow: Window & typeof globalThis = window,
): Promise<void> {
  const bootstrap = getShellBootstrapPayload(targetWindow);
  const parsedRoute = parseRoute(new URL(targetWindow.location.href));
  const initialState: Partial<AppState> = {
    auth: {
      actor: bootstrap?.actor ?? null,
      isResolved: true,
      csrfToken: bootstrap?.csrfToken ?? null,
    },
    route: {
      pathname:
        parsedRoute.kind === 'project-index'
          ? '/projects'
          : `/projects/${parsedRoute.projectId ?? ''}`,
      projectId: parsedRoute.projectId,
      selectedProcessId: parsedRoute.selectedProcessId,
    },
  };
  const store = createAppStore(initialState);
  const root = getRequiredRootElement(targetWindow.document);
  const shellApp = createShellApp({
    root,
    store,
    targetWindow,
  });

  shellApp.render();
}
