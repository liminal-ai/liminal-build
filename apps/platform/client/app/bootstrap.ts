import type {
  AppState,
  ParsedRoute,
  RequestError,
  ResumeProcessResponse,
  ProcessSummary,
  ProjectShellResponse,
  ProjectSummary,
  StartProcessResponse,
} from '../../shared/contracts/index.js';
import { ApiRequestError, getAuthenticatedUser } from '../browser-api/auth-api.js';
import {
  getProcessWorkSurface,
  resumeProcess,
  startProcess,
} from '../browser-api/process-work-surface-api.js';
import {
  createProcess,
  createProject,
  getProjectShell,
  listProjects,
} from '../browser-api/projects-api.js';
import { getRequiredRootElement, getShellBootstrapPayload } from './dom.js';
import { navigateTo, parseRoute } from './router.js';
import { createShellApp } from './shell-app.js';
import { createAppStore, defaultAppState } from './store.js';

function getRoutePathname(parsedRoute: ParsedRoute): string {
  if (parsedRoute.kind === 'project-index') {
    return '/projects';
  }

  if (parsedRoute.kind === 'process-work-surface') {
    return `/projects/${parsedRoute.projectId ?? ''}/processes/${parsedRoute.processId ?? ''}`;
  }

  return `/projects/${parsedRoute.projectId ?? ''}`;
}

function getProcessSurfaceRouteIdentity(parsedRoute: ParsedRoute): {
  projectId: string | null;
  processId: string | null;
} {
  if (parsedRoute.kind !== 'process-work-surface') {
    return {
      projectId: null,
      processId: null,
    };
  }

  return {
    projectId: parsedRoute.projectId,
    processId: parsedRoute.processId,
  };
}

export async function bootstrapApp(
  targetWindow: Window & typeof globalThis = window,
): Promise<void> {
  const bootstrap = getShellBootstrapPayload(targetWindow);
  const parsedRoute = parseRoute(new URL(targetWindow.location.href));
  const processSurfaceRouteIdentity = getProcessSurfaceRouteIdentity(parsedRoute);
  const initialState: Partial<AppState> = {
    auth: {
      actor: bootstrap?.actor ?? null,
      isResolved: true,
      csrfToken: bootstrap?.csrfToken ?? null,
    },
    route: {
      pathname: getRoutePathname(parsedRoute),
      projectId: parsedRoute.projectId,
      selectedProcessId: parsedRoute.selectedProcessId,
    },
    processSurface: {
      ...defaultAppState.processSurface,
      projectId: processSurfaceRouteIdentity.projectId,
      processId: processSurfaceRouteIdentity.processId,
    },
  };
  const store = createAppStore(initialState);
  let routeLoadId = 0;

  const redirectToLogin = (): void => {
    const returnTo = `${targetWindow.location.pathname}${targetWindow.location.search}`;
    targetWindow.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const applyRouteState = (parsedRoute: ParsedRoute): void => {
    const processSurfaceIdentity = getProcessSurfaceRouteIdentity(parsedRoute);

    store.patch('route', {
      pathname: getRoutePathname(parsedRoute),
      projectId: parsedRoute.projectId,
      selectedProcessId: parsedRoute.selectedProcessId,
    });
    store.patch('processSurface', {
      ...defaultAppState.processSurface,
      projectId: processSurfaceIdentity.projectId,
      processId: processSurfaceIdentity.processId,
    });
  };

  const sortProjects = (projects: ProjectSummary[]): ProjectSummary[] =>
    [...projects].sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt));

  const sortProcesses = (processes: ProcessSummary[]): ProcessSummary[] =>
    [...processes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const applyProcessActionResponse = (
    projectId: string,
    processId: string,
    response: StartProcessResponse | ResumeProcessResponse,
  ): void => {
    const currentSurface = store.get().processSurface;

    if (
      currentSurface.projectId === null ||
      currentSurface.projectId !== projectId ||
      currentSurface.processId === null ||
      currentSurface.processId !== processId
    ) {
      return;
    }

    store.patch('processSurface', {
      ...currentSurface,
      process: response.process,
      currentRequest: response.currentRequest,
      error: null,
      actionError: null,
    });
  };

  const clearProcessActionError = (projectId: string, processId: string): void => {
    const currentSurface = store.get().processSurface;

    if (
      currentSurface.projectId !== projectId ||
      currentSurface.processId !== processId ||
      currentSurface.actionError === null
    ) {
      return;
    }

    store.patch('processSurface', {
      ...currentSurface,
      actionError: null,
    });
  };

  const setProcessSurfaceUnavailableError = (
    projectId: string,
    processId: string,
    error: RequestError,
  ): void => {
    const currentSurface = store.get().processSurface;

    if (currentSurface.projectId !== projectId || currentSurface.processId !== processId) {
      return;
    }

    store.patch('processSurface', {
      ...defaultAppState.processSurface,
      projectId,
      processId,
      isLoading: false,
      error,
    });
  };

  const setProcessActionError = (
    projectId: string,
    processId: string,
    error: RequestError,
  ): void => {
    const currentSurface = store.get().processSurface;

    if (currentSurface.projectId !== projectId || currentSurface.processId !== processId) {
      return;
    }

    store.patch('processSurface', {
      ...currentSurface,
      error: null,
      actionError: error,
    });
  };

  const handleProcessActionRequestError = (
    projectId: string,
    processId: string,
    error: ApiRequestError,
  ): void => {
    switch (error.payload.code) {
      case 'UNAUTHENTICATED':
        redirectToLogin();
        return;
      case 'PROJECT_FORBIDDEN':
      case 'PROJECT_NOT_FOUND':
      case 'PROCESS_NOT_FOUND':
        setProcessSurfaceUnavailableError(projectId, processId, error.payload);
        return;
      case 'PROCESS_ACTION_NOT_AVAILABLE':
        setProcessActionError(projectId, processId, error.payload);
        return;
      default:
        setProcessActionError(projectId, processId, error.payload);
        return;
    }
  };

  const handleUnexpectedProcessActionFailure = (projectId: string, processId: string): void => {
    setProcessActionError(projectId, processId, {
      code: 'PROCESS_ACTION_FAILED',
      message: 'The process action could not be completed right now. Try again or reload the page.',
      status: 500,
    });
  };

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

  const reconcileSelectedProcess = (
    parsedRoute: ParsedRoute,
    shell: ProjectShellResponse,
  ): { route: ParsedRoute; selectedProcessBanner: string | null } => {
    if (parsedRoute.kind !== 'project-shell' || parsedRoute.selectedProcessId === null) {
      return {
        route: parsedRoute,
        selectedProcessBanner: null,
      };
    }

    if (shell.processes.status === 'error') {
      return {
        route: parsedRoute,
        selectedProcessBanner: null,
      };
    }

    const selectedProcess = shell.processes.items.find(
      (process) => process.processId === parsedRoute.selectedProcessId,
    );

    if (selectedProcess !== undefined) {
      return {
        route: parsedRoute,
        selectedProcessBanner: null,
      };
    }

    const route = {
      ...parsedRoute,
      selectedProcessId: null,
    };
    navigateTo(route, { replace: true }, targetWindow);
    applyRouteState(route);

    return {
      route,
      selectedProcessBanner:
        'The requested process is unavailable and the shell cleared the selection.',
    };
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

    if (parsedRoute.kind === 'process-work-surface') {
      store.patch('shell', {
        ...defaultAppState.shell,
      });
      store.patch('processSurface', {
        ...defaultAppState.processSurface,
        projectId: parsedRoute.projectId,
        processId: parsedRoute.processId,
        isLoading: true,
        error: null,
      });

      try {
        const surface = await getProcessWorkSurface({
          projectId: parsedRoute.projectId ?? '',
          processId: parsedRoute.processId ?? '',
        });

        if (requestId !== routeLoadId) {
          return;
        }

        store.patch('processSurface', {
          ...defaultAppState.processSurface,
          projectId: parsedRoute.projectId,
          processId: parsedRoute.processId,
          project: surface.project,
          process: surface.process,
          history: surface.history,
          materials: surface.materials,
          currentRequest: surface.currentRequest,
          sideWork: surface.sideWork,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (requestId !== routeLoadId) {
          return;
        }

        if (error instanceof ApiRequestError) {
          store.patch('processSurface', {
            ...defaultAppState.processSurface,
            projectId: parsedRoute.projectId,
            processId: parsedRoute.processId,
            isLoading: false,
            error: error.payload,
          });
          return;
        }

        throw error;
      }

      return;
    }

    try {
      const shell = await getProjectShell({
        projectId: parsedRoute.projectId ?? '',
        selectedProcessId: parsedRoute.selectedProcessId,
      });

      if (requestId !== routeLoadId) {
        return;
      }

      const selectedProcessResolution = reconcileSelectedProcess(parsedRoute, shell);
      applyShell(shell);
      store.patch('shell', {
        ...store.get().shell,
        selectedProcessBanner: selectedProcessResolution.selectedProcessBanner,
      });
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
      processId: null,
    };
    navigateTo(route, {}, targetWindow);
    await loadParsedRoute(route);
  };

  const openProcess = async (projectId: string, processId: string): Promise<void> => {
    const route: ParsedRoute = {
      kind: 'process-work-surface',
      projectId,
      selectedProcessId: null,
      processId,
    };
    navigateTo(route, {}, targetWindow);
    await loadParsedRoute(route);
  };

  const startCurrentProcess = async (projectId: string, processId: string): Promise<void> => {
    clearProcessActionError(projectId, processId);

    try {
      const response = await startProcess({
        projectId,
        processId,
      });

      applyProcessActionResponse(projectId, processId, response);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        handleProcessActionRequestError(projectId, processId, error);
        return;
      }

      handleUnexpectedProcessActionFailure(projectId, processId);
    }
  };

  const resumeCurrentProcess = async (projectId: string, processId: string): Promise<void> => {
    clearProcessActionError(projectId, processId);

    try {
      const response = await resumeProcess({
        projectId,
        processId,
      });

      applyProcessActionResponse(projectId, processId, response);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        handleProcessActionRequestError(projectId, processId, error);
        return;
      }

      handleUnexpectedProcessActionFailure(projectId, processId);
    }
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
        processId: null,
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
    onCreateProcess: async (processType) => {
      const currentProject = store.get().shell.project;

      if (currentProject === null) {
        return;
      }

      const result = await createProcess({
        projectId: currentProject.projectId,
        processType,
      });
      const currentProcesses = store.get().shell.processes;
      const nextProject = {
        ...currentProject,
        processCount: currentProject.processCount + 1,
        lastUpdatedAt: result.process.updatedAt,
      };
      const nextProcesses = {
        status: 'ready' as const,
        items: sortProcesses([
          result.process,
          ...(currentProcesses?.items ?? []).filter(
            (process) => process.processId !== result.process.processId,
          ),
        ]),
      };
      const nextProjects = (store.get().projects.list ?? []).map((project) =>
        project.projectId === currentProject.projectId
          ? {
              ...project,
              processCount: project.processCount + 1,
              lastUpdatedAt: result.process.updatedAt,
            }
          : project,
      );
      const nextRoute: ParsedRoute = {
        kind: 'project-shell',
        projectId: currentProject.projectId,
        selectedProcessId: result.process.processId,
        processId: null,
      };

      store.patch('modals', {
        ...store.get().modals,
        createProcessOpen: false,
      });
      if (store.get().projects.list !== null) {
        store.patch('projects', {
          ...store.get().projects,
          list: sortProjects(nextProjects),
        });
      }
      applyRouteState(nextRoute);
      store.patch('shell', {
        ...store.get().shell,
        project: nextProject,
        processes: nextProcesses,
        selectedProcessBanner: null,
        isLoading: false,
        error: null,
      });
      navigateTo(nextRoute, { replace: true }, targetWindow);
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
    onOpenProcess: (projectId: string, processId: string) => {
      void openProcess(projectId, processId);
    },
    onStartProcess: startCurrentProcess,
    onResumeProcess: resumeCurrentProcess,
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
      redirectToLogin();
      return;
    }

    throw error;
  }

  await loadParsedRoute(parsedRoute);
}
