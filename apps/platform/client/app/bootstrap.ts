import type {
  AppState,
  ParsedRoute,
  ProjectShellResponse,
  ProjectSummary,
} from '../../shared/contracts/index.js';
import { ApiRequestError, getAuthenticatedUser } from '../browser-api/auth-api.js';
import { createProject, getProjectShell, listProjects } from '../browser-api/projects-api.js';
import { getRequiredRootElement, getShellBootstrapPayload } from './dom.js';
import { navigateTo, parseRoute } from './router.js';
import { createShellApp } from './shell-app.js';
import { createAppStore, defaultAppState } from './store.js';

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
  let routeLoadId = 0;

  const applyRouteState = (parsedRoute: ParsedRoute): void => {
    store.patch('route', {
      pathname:
        parsedRoute.kind === 'project-index'
          ? '/projects'
          : `/projects/${parsedRoute.projectId ?? ''}`,
      projectId: parsedRoute.projectId,
      selectedProcessId: parsedRoute.selectedProcessId,
    });
  };

  const sortProjects = (projects: ProjectSummary[]): ProjectSummary[] =>
    [...projects].sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt));

  const applyShell = (shell: ProjectShellResponse): void => {
    store.patch('shell', {
      project: shell.project,
      processes: shell.processes,
      artifacts: shell.artifacts,
      sourceAttachments: shell.sourceAttachments,
      selectedProcessBanner: null,
      isLoading: false,
      error: null,
    });
  };

  const loadParsedRoute = async (parsedRoute: ParsedRoute): Promise<void> => {
    const requestId = ++routeLoadId;
    applyRouteState(parsedRoute);

    if (parsedRoute.kind === 'project-index') {
      store.patch('shell', {
        ...defaultAppState.shell,
      });
      store.patch('projects', {
        ...store.get().projects,
        isLoading: true,
        error: null,
      });

      try {
        const projects = await listProjects();

        if (requestId !== routeLoadId) {
          return;
        }

        store.patch('projects', {
          list: sortProjects(projects),
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (requestId !== routeLoadId) {
          return;
        }

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
      ...defaultAppState.shell,
      isLoading: true,
    });

    try {
      const shell = await getProjectShell({
        projectId: parsedRoute.projectId ?? '',
        selectedProcessId: parsedRoute.selectedProcessId,
      });

      if (requestId !== routeLoadId) {
        return;
      }

      applyShell(shell);
    } catch (error) {
      if (requestId !== routeLoadId) {
        return;
      }

      if (error instanceof ApiRequestError) {
        store.patch('shell', {
          ...defaultAppState.shell,
          isLoading: false,
          error: error.payload,
        });
        return;
      }

      throw error;
    }
  };

  const syncToWindowLocation = async (): Promise<void> => {
    await loadParsedRoute(parseRoute(new URL(targetWindow.location.href)));
  };

  const openProject = async (projectId: string): Promise<void> => {
    const route: ParsedRoute = {
      kind: 'project-shell',
      projectId,
      selectedProcessId: null,
    };
    navigateTo(route, {}, targetWindow);
    await loadParsedRoute(route);
  };
  const root = getRequiredRootElement(targetWindow.document);
  const shellApp = createShellApp({
    root,
    store,
    targetWindow,
    onCreateProject: async (name: string) => {
      const shell = await createProject({ name });
      const currentProjects = store.get().projects.list ?? [];
      const projectList = sortProjects([
        ...currentProjects.filter((project) => project.projectId !== shell.project.projectId),
        shell.project,
      ]);
      const route: ParsedRoute = {
        kind: 'project-shell',
        projectId: shell.project.projectId,
        selectedProcessId: null,
      };

      store.patch('modals', {
        ...store.get().modals,
        createProjectOpen: false,
      });
      store.patch('projects', {
        list: projectList,
        isLoading: false,
        error: null,
      });
      applyRouteState(route);
      applyShell(shell);
      navigateTo(route, {}, targetWindow);
    },
    onOpenCreateProject: () => {
      store.patch('modals', {
        ...store.get().modals,
        createProjectOpen: true,
      });
    },
    onCancelCreateProject: () => {
      store.patch('modals', {
        ...store.get().modals,
        createProjectOpen: false,
      });
    },
    onOpenCreateProcess: () => {
      store.patch('modals', {
        ...store.get().modals,
        createProcessOpen: true,
      });
    },
    onCancelCreateProcess: () => {
      store.patch('modals', {
        ...store.get().modals,
        createProcessOpen: false,
      });
    },
    onOpenProject: (projectId: string) => {
      void openProject(projectId);
    },
  });
  shellApp.render();
  targetWindow.addEventListener('popstate', () => {
    void syncToWindowLocation();
  });

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

  await loadParsedRoute(parsedRoute);
}
