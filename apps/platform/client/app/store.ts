import { type AppState, appStateSchema } from '../../shared/contracts/index.js';

export interface AppStore {
  get(): AppState;
  set(next: Partial<AppState>): void;
  patch<K extends keyof AppState>(key: K, value: AppState[K]): void;
  subscribe(listener: (state: AppState) => void): () => void;
}

export const defaultAppState: AppState = appStateSchema.parse({
  auth: {
    actor: null,
    isResolved: false,
    csrfToken: null,
  },
  route: {
    pathname: '/projects',
    projectId: null,
    selectedProcessId: null,
  },
  projects: {
    list: null,
    isLoading: false,
    error: null,
  },
  shell: {
    project: null,
    processes: null,
    artifacts: null,
    sourceAttachments: null,
    selectedProcessBanner: null,
    isLoading: false,
    error: null,
  },
  processSurface: {
    projectId: null,
    processId: null,
    project: null,
    process: null,
    history: null,
    materials: null,
    currentRequest: null,
    sideWork: null,
    isLoading: false,
    error: null,
    actionError: null,
    live: {
      connectionState: 'idle',
      subscriptionId: null,
      lastSequenceNumber: null,
      error: null,
    },
  },
  modals: {
    createProjectOpen: false,
    createProcessOpen: false,
  },
});

export function createAppStore(initialState?: Partial<AppState>): AppStore {
  let state = appStateSchema.parse({
    ...defaultAppState,
    ...initialState,
  });

  const listeners = new Set<(nextState: AppState) => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener(state);
    }
  };

  return {
    get(): AppState {
      return state;
    },
    set(next: Partial<AppState>): void {
      state = appStateSchema.parse({
        ...state,
        ...next,
      });
      notify();
    },
    patch(key, value): void {
      state = appStateSchema.parse({
        ...state,
        [key]: value,
      });
      notify();
    },
    subscribe(listener): () => void {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
