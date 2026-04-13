import type { AppState } from '../../shared/contracts/index.js';
import { ApiRequestError, getAuthenticatedUser } from '../browser-api/auth-api.js';
import { getProjectShell, listProjects } from '../browser-api/projects-api.js';
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

  try {
    const actor = await getAuthenticatedUser();
    store.patch('auth', {
      actor,
      isResolved: true,
      csrfToken: bootstrap?.csrfToken ?? null,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.payload.code === 'UNAUTHENTICATED') {
      const returnTo = `${targetWindow.location.pathname}${targetWindow.location.search}`;
      targetWindow.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    throw error;
  }

  if (parsedRoute.kind === 'project-index') {
    store.patch('projects', {
      ...store.get().projects,
      isLoading: true,
      error: null,
    });

    try {
      const projects = await listProjects();
      store.patch('projects', {
        list: projects,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        store.patch('projects', {
          list: null,
          isLoading: false,
          error: error.payload,
        });
        return;
      }

      throw error;
    }

    return;
  }

  store.patch('shell', {
    ...store.get().shell,
    isLoading: true,
    error: null,
  });

  try {
    const shell = await getProjectShell({
      projectId: parsedRoute.projectId ?? '',
      selectedProcessId: parsedRoute.selectedProcessId,
    });
    store.patch('shell', {
      project: shell.project,
      processes: shell.processes,
      artifacts: shell.artifacts,
      sourceAttachments: shell.sourceAttachments,
      selectedProcessBanner: null,
      isLoading: false,
      error: null,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      store.patch('shell', {
        project: null,
        processes: null,
        artifacts: null,
        sourceAttachments: null,
        selectedProcessBanner: null,
        isLoading: false,
        error: error.payload,
      });
      return;
    }

    throw error;
  }
}
