import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { ProcessEnvironmentService } from '../../../apps/platform/server/services/processes/environment/process-environment.service.js';
import {
  DefaultProviderAdapterRegistry,
  SingleAdapterRegistry,
  type ProviderAdapterRegistry,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import { ScriptExecutionService } from '../../../apps/platform/server/services/processes/environment/script-execution.service.js';
import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderKind,
} from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { InMemoryProcessLiveHub } from '../../../apps/platform/server/services/processes/live/process-live-hub.js';
import { ProcessAccessService } from '../../../apps/platform/server/services/processes/process-access.service.js';
import { ProjectAccessService } from '../../../apps/platform/server/services/projects/project-access.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  type LiveProcessUpdateMessage,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { draftProcessFixture } from '../../fixtures/processes.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_execution_orchestrator',
        cookiePassword: 'execution-orchestrator-cookie-password-12345',
        redirectUri: 'http://localhost:5001/auth/callback',
        loginReturnUri: 'http://localhost:5001/projects',
      });
    }

    override async resolveSession(): Promise<SessionResolution> {
      return resolution;
    }
  }

  return new TestAuthSessionService();
}

const actor = {
  userId: 'workos-user-1',
  workosUserId: 'workos-user-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectId = 'project-execution-orchestrator-1';
const processId = 'process-execution-orchestrator-1';

const projectSummary = projectSummarySchema.parse({
  projectId,
  name: 'Execution Orchestrator Test',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-16T09:00:00.000Z',
});

const draftProcess = processSummarySchema.parse({
  ...draftProcessFixture,
  processId,
  displayLabel: 'Execution Orchestrator Test Process',
  updatedAt: '2026-04-16T09:00:00.000Z',
});

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
  message = 'Timed out while waiting for asynchronous condition.',
): Promise<void> {
  const startedAt = Date.now();

  while (!(await predicate())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(message);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function subscribeToProcess(args: { processLiveHub: InMemoryProcessLiveHub; processId?: string }): {
  messages: LiveProcessUpdateMessage[];
  close: () => void;
} {
  const messages: LiveProcessUpdateMessage[] = [];
  const subscription = args.processLiveHub.subscribe({
    actorId: actor.userId,
    projectId,
    processId: args.processId ?? processId,
    send: (message) => {
      messages.push(message);
    },
  });

  return {
    messages,
    close: () => subscription.close(),
  };
}

function buildStore(
  overrides: ConstructorParameters<typeof InMemoryPlatformStore>[0] = {},
): InMemoryPlatformStore {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [projectSummary],
    },
    projectAccessByProjectId: {
      [projectId]: {
        kind: 'accessible',
        project: projectSummary,
      },
    },
    processesByProjectId: {
      [projectId]: [draftProcess],
    },
    ...overrides,
  });
}

function buildTestProcessEnvironmentService(args: {
  platformStore: InMemoryPlatformStore;
  processLiveHub: InMemoryProcessLiveHub;
  providerAdapterRegistry: ProviderAdapterRegistry;
  defaultProviderKind: ProviderKind;
}): ProcessEnvironmentService {
  const projectAccessService = new ProjectAccessService(args.platformStore);
  const processAccessService = new ProcessAccessService(args.platformStore, projectAccessService);

  return new ProcessEnvironmentService(
    args.platformStore,
    processAccessService,
    args.providerAdapterRegistry,
    args.processLiveHub,
    new ScriptExecutionService(args.providerAdapterRegistry),
    undefined,
    undefined,
    args.defaultProviderKind,
  );
}

async function buildExecutionApp(args: {
  platformStore: InMemoryPlatformStore;
  processLiveHub: InMemoryProcessLiveHub;
  providerAdapterRegistry: ProviderAdapterRegistry;
  defaultProviderKind?: ProviderKind;
}) {
  const defaultProviderKind = args.defaultProviderKind ?? 'local';
  const processEnvironmentService = buildTestProcessEnvironmentService({
    platformStore: args.platformStore,
    processLiveHub: args.processLiveHub,
    providerAdapterRegistry: args.providerAdapterRegistry,
    defaultProviderKind,
  });

  return buildApp({
    authSessionService: createTestAuthSessionService({ actor, reason: null }),
    authUserSyncService: new AuthUserSyncService(args.platformStore),
    platformStore: args.platformStore,
    processLiveHub: args.processLiveHub,
    providerAdapterRegistry: args.providerAdapterRegistry,
    processEnvironmentService,
    env: {
      DEFAULT_ENVIRONMENT_PROVIDER_KIND: defaultProviderKind,
    },
  });
}

type ProviderCall = {
  adapterKind: ProviderKind;
  method:
    | 'ensureEnvironment'
    | 'hydrateEnvironment'
    | 'executeScript'
    | 'rehydrateEnvironment'
    | 'rebuildEnvironment';
};

function buildProviderAdapter(args: {
  providerKind: ProviderKind;
  executionResult: ExecutionResult;
  calls: ProviderCall[];
  failMessage?: string;
}): ProviderAdapter {
  return {
    providerKind: args.providerKind,
    async ensureEnvironment({ processId, providerKind }) {
      args.calls.push({
        adapterKind: args.providerKind,
        method: 'ensureEnvironment',
      });
      if (args.failMessage !== undefined) {
        throw new Error(args.failMessage);
      }
      return {
        providerKind,
        environmentId: `${args.providerKind}-env-${processId}`,
        workspaceHandle: `${args.providerKind}-workspace-${processId}`,
      };
    },
    async hydrateEnvironment({ environmentId, plan }) {
      args.calls.push({
        adapterKind: args.providerKind,
        method: 'hydrateEnvironment',
      });
      if (args.failMessage !== undefined) {
        throw new Error(args.failMessage);
      }
      return {
        environmentId,
        hydratedAt: '2026-04-16T09:01:00.000Z',
        fingerprint: plan.fingerprint,
      };
    },
    async executeScript() {
      args.calls.push({
        adapterKind: args.providerKind,
        method: 'executeScript',
      });
      if (args.failMessage !== undefined) {
        throw new Error(args.failMessage);
      }
      return args.executionResult;
    },
    async rehydrateEnvironment({ environmentId, plan }) {
      args.calls.push({
        adapterKind: args.providerKind,
        method: 'rehydrateEnvironment',
      });
      if (args.failMessage !== undefined) {
        throw new Error(args.failMessage);
      }
      return {
        environmentId,
        hydratedAt: '2026-04-16T09:02:00.000Z',
        fingerprint: plan.fingerprint,
      };
    },
    async rebuildEnvironment({ processId, providerKind, plan }) {
      args.calls.push({
        adapterKind: args.providerKind,
        method: 'rebuildEnvironment',
      });
      if (args.failMessage !== undefined) {
        throw new Error(args.failMessage);
      }
      return {
        providerKind,
        environmentId: `${args.providerKind}-rebuild-${processId}`,
        workspaceHandle: `${args.providerKind}-workspace-${processId}`,
        hydratedAt: '2026-04-16T09:03:00.000Z',
        fingerprint: plan.fingerprint,
      };
    },
    async teardownEnvironment() {
      return;
    },
    async resolveCandidateContents({ ref }) {
      return ref;
    },
  };
}

function buildExecutionResult(
  status: ExecutionResult['processStatus'],
  overrides: Partial<ExecutionResult> = {},
): ExecutionResult {
  return {
    processStatus: status,
    processHistoryItems: [],
    outputWrites: [],
    sideWorkWrites: [],
    artifactCheckpointCandidates: [],
    codeCheckpointCandidates: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('process execution orchestrator', () => {
  it('persists history, outputs, and side-work from ExecutionResult and publishes them with the completed process update', async () => {
    const executionResult = buildExecutionResult('completed', {
      processHistoryItems: [
        {
          historyItemId: 'history-execution-1',
          kind: 'process_event',
          lifecycleState: 'finalized',
          text: 'Execution produced review-ready notes.',
          createdAt: '2026-04-16T09:04:00.000Z',
          relatedSideWorkId: null,
          relatedArtifactId: null,
        },
      ],
      outputWrites: [
        {
          outputId: 'output-execution-1',
          linkedArtifactId: null,
          displayName: 'Execution Notes',
          revisionLabel: 'notes-2',
          state: 'ready_for_review',
          updatedAt: '2026-04-16T09:05:00.000Z',
        },
      ],
      sideWorkWrites: [
        {
          sideWorkId: 'side-work-execution-1',
          displayLabel: 'Execution Validation',
          purposeSummary: 'Validate the generated notes against the process context.',
          status: 'completed',
          resultSummary: 'Validation completed successfully.',
          updatedAt: '2026-04-16T09:05:30.000Z',
        },
      ],
    });
    const calls: ProviderCall[] = [];
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult,
      calls,
    });
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildStore();
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub,
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });
    const subscription = subscribeToProcess({ processLiveHub });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const record = await platformStore.getProcessRecord({ processId });
        return record?.status === 'completed';
      },
      2000,
      'Timed out waiting for completed process status.',
    );

    const historyItems = await platformStore.listProcessHistoryItems({ processId });
    const outputs = await platformStore.listProcessOutputs({ processId });
    const sideWorkItems = await platformStore.listProcessSideWorkItems({ processId });

    expect(historyItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'process_event',
          text: 'Execution produced review-ready notes.',
        }),
      ]),
    );
    expect(outputs).toEqual([
      expect.objectContaining({
        outputId: 'output-execution-1',
        displayName: 'Execution Notes',
        revisionLabel: 'notes-2',
        state: 'ready_for_review',
      }),
    ]);
    expect(sideWorkItems).toEqual([
      expect.objectContaining({
        sideWorkId: 'side-work-execution-1',
        displayLabel: 'Execution Validation',
        status: 'completed',
      }),
    ]);

    await waitFor(
      () =>
        subscription.messages.some(
          (message) =>
            message.entityType === 'process' &&
            message.payload !== null &&
            (message.payload as { status?: string }).status === 'completed',
        ) &&
        subscription.messages.some(
          (message) =>
            message.entityType === 'history' &&
            message.payload !== null &&
            (message.payload as { text?: string }).text ===
              'Execution produced review-ready notes.',
        ) &&
        subscription.messages.some(
          (message) =>
            message.entityType === 'materials' &&
            message.payload !== null &&
            (message.payload as { currentOutputs?: Array<{ outputId: string }> })
              .currentOutputs?.[0]?.outputId === 'output-execution-1',
        ) &&
        subscription.messages.some(
          (message) =>
            message.entityType === 'side_work' &&
            message.payload !== null &&
            (message.payload as { items?: Array<{ sideWorkId: string }> }).items?.[0]
              ?.sideWorkId === 'side-work-execution-1',
        ),
      2000,
      'Timed out waiting for completed execution live publication.',
    );

    expect(calls.map((call) => call.method)).toEqual(
      expect.arrayContaining(['ensureEnvironment', 'hydrateEnvironment', 'executeScript']),
    );

    subscription.close();
    await app.close();
  });

  it('applies replace semantics for empty outputWrites and sideWorkWrites by clearing durable rows and live panels', async () => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildStore({
      processOutputsByProcessId: {
        [processId]: [
          {
            outputId: 'existing-output-1',
            linkedArtifactId: null,
            displayName: 'Old output',
            revisionLabel: 'draft-1',
            state: 'in_progress',
            updatedAt: '2026-04-16T08:58:00.000Z',
          },
        ],
      },
      processSideWorkItemsByProcessId: {
        [processId]: [
          {
            sideWorkId: 'existing-side-work-1',
            displayLabel: 'Old validation',
            purposeSummary: 'Legacy validation run.',
            status: 'running',
            resultSummary: null,
            updatedAt: '2026-04-16T08:58:30.000Z',
          },
        ],
      },
    });
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed'),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub,
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });
    const subscription = subscribeToProcess({ processLiveHub });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const record = await platformStore.getProcessRecord({ processId });
        return record?.status === 'completed';
      },
      2000,
      'Timed out waiting for completed process while testing replace semantics.',
    );

    expect(await platformStore.listProcessOutputs({ processId })).toEqual([]);
    expect(await platformStore.listProcessSideWorkItems({ processId })).toEqual([]);

    await waitFor(
      () =>
        subscription.messages.some(
          (message) =>
            message.entityType === 'materials' &&
            message.payload !== null &&
            (message.payload as { status?: string }).status === 'empty',
        ) &&
        subscription.messages.some(
          (message) =>
            message.entityType === 'side_work' &&
            message.payload !== null &&
            (message.payload as { status?: string }).status === 'empty',
        ),
      2000,
      'Timed out waiting for cleared materials and side-work live publication.',
    );

    subscription.close();
    await app.close();
  });

  it.each([
    'running',
    'waiting',
    'completed',
    'failed',
    'interrupted',
  ] as const)('consumes processStatus=%s by durably transitioning the process and publishing the new live status', async (processStatus) => {
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = buildStore();
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult(processStatus),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub,
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });
    const subscription = subscribeToProcess({ processLiveHub });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const record = await platformStore.getProcessRecord({ processId });
        return record?.status === processStatus;
      },
      2000,
      `Timed out waiting for durable status ${processStatus}.`,
    );

    if (processStatus === 'failed') {
      await waitFor(
        async () =>
          (await platformStore.getProcessEnvironmentSummary({ processId })).state === 'failed',
        2000,
        'Timed out waiting for failed environment state.',
      );
    }

    await waitFor(
      () =>
        subscription.messages.some(
          (message) =>
            message.entityType === 'process' &&
            message.payload !== null &&
            (message.payload as { status?: string }).status === processStatus,
        ),
      2000,
      `Timed out waiting for live process status ${processStatus}.`,
    );

    if (processStatus === 'failed') {
      await waitFor(
        () =>
          subscription.messages.some(
            (message) =>
              message.entityType === 'environment' &&
              message.payload !== null &&
              (message.payload as { state?: string }).state === 'failed',
          ),
        2000,
        'Timed out waiting for failed environment live publication.',
      );
    }

    subscription.close();
    await app.close();
  });

  it('keeps the persisted providerKind authoritative after config changes for resume, rehydrate, rebuild, and resumed execution', async () => {
    const localCalls: ProviderCall[] = [];
    const daytonaCalls: ProviderCall[] = [];
    const persistentOutput = {
      outputId: 'output-provider-kind-1',
      linkedArtifactId: null,
      displayName: 'Provider kind checkpoint',
      revisionLabel: 'v1',
      state: 'ready_for_review',
      updatedAt: '2026-04-16T08:59:00.000Z',
    };
    const executionResult = buildExecutionResult('completed', {
      outputWrites: [persistentOutput],
    });
    const localProvider = buildProviderAdapter({
      providerKind: 'local',
      executionResult,
      calls: localCalls,
    });
    const daytonaProvider = buildProviderAdapter({
      providerKind: 'daytona',
      executionResult,
      calls: daytonaCalls,
      failMessage: 'daytona should not be used for a persisted local environment',
    });
    const registry = new DefaultProviderAdapterRegistry([localProvider, daytonaProvider]);
    const platformStore = buildStore();

    const localApp = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: registry,
      defaultProviderKind: 'local',
    });

    const initialStart = await localApp.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(initialStart.statusCode).toBe(200);

    await waitFor(
      async () =>
        (await platformStore.getProcessEnvironmentProviderKind({ processId })) === 'local' &&
        localCalls.filter((call) => call.method === 'executeScript').length === 1 &&
        (await platformStore.getProcessRecord({ processId }))?.status === 'completed',
      2000,
      'Timed out waiting for the initial local execution to settle.',
    );

    await localApp.close();

    await platformStore.transitionProcessToInterrupted({ processId });
    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-provider-kind-local',
      blockedReason: null,
      lastHydratedAt: '2026-04-16T09:06:00.000Z',
    });

    const daytonaDefaultApp = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: registry,
      defaultProviderKind: 'daytona',
    });

    const resumeBefore = localCalls.filter((call) => call.method === 'executeScript').length;
    const resumeResponse = await daytonaDefaultApp.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/resume`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(resumeResponse.statusCode).toBe(200);

    await waitFor(
      () =>
        localCalls.filter((call) => call.method === 'executeScript').length === resumeBefore + 1,
      2000,
      'Timed out waiting for resumed execution on the local provider.',
    );
    expect(await platformStore.getProcessEnvironmentProviderKind({ processId })).toBe('local');

    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'stale',
      environmentId: 'env-provider-kind-local',
      blockedReason: 'Rehydrate to refresh the working copy from canonical inputs.',
      lastHydratedAt: '2026-04-16T09:07:00.000Z',
    });

    const rehydrateBefore = localCalls.filter(
      (call) => call.method === 'rehydrateEnvironment',
    ).length;
    const rehydrateResponse = await daytonaDefaultApp.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/rehydrate`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(rehydrateResponse.statusCode).toBe(200);

    await waitFor(
      () =>
        localCalls.filter((call) => call.method === 'rehydrateEnvironment').length ===
        rehydrateBefore + 1,
      2000,
      'Timed out waiting for rehydrate on the local provider.',
    );
    expect(await platformStore.getProcessEnvironmentProviderKind({ processId })).toBe('local');

    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'lost',
      environmentId: 'env-provider-kind-local',
      blockedReason: 'The previous working copy can no longer be recovered.',
      lastHydratedAt: '2026-04-16T09:08:00.000Z',
    });

    const rebuildBefore = localCalls.filter((call) => call.method === 'rebuildEnvironment').length;
    const rebuildResponse = await daytonaDefaultApp.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/rebuild`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(rebuildResponse.statusCode).toBe(200);

    await waitFor(
      () =>
        localCalls.filter((call) => call.method === 'rebuildEnvironment').length ===
        rebuildBefore + 1,
      2000,
      'Timed out waiting for rebuild on the local provider.',
    );
    expect(await platformStore.getProcessEnvironmentProviderKind({ processId })).toBe('local');
    expect(daytonaCalls).toEqual([]);

    await daytonaDefaultApp.close();
  });

  it('propagates side-effect persistence failures into visible failed env state instead of swallowing them', async () => {
    class OutputFailingStore extends InMemoryPlatformStore {
      override async replaceCurrentProcessOutputs(): Promise<never> {
        throw new Error('output persistence exploded');
      }
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const processLiveHub = new InMemoryProcessLiveHub();
    const platformStore = new OutputFailingStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [projectSummary],
      },
      projectAccessByProjectId: {
        [projectId]: {
          kind: 'accessible',
          project: projectSummary,
        },
      },
      processesByProjectId: {
        [projectId]: [draftProcess],
      },
    });
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed', {
        outputWrites: [
          {
            outputId: 'output-side-effect-failure-1',
            linkedArtifactId: null,
            displayName: 'Failure output',
            revisionLabel: 'v1',
            state: 'ready_for_review',
            updatedAt: '2026-04-16T09:09:00.000Z',
          },
        ],
      }),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub,
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });
    const subscription = subscribeToProcess({ processLiveHub });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () =>
        (await platformStore.getProcessEnvironmentSummary({ processId })).state === 'failed' &&
        (
          (await platformStore.getProcessEnvironmentSummary({ processId })).blockedReason ?? ''
        ).includes('output persistence exploded'),
      2000,
      'Timed out waiting for failed env state after side-effect persistence error.',
    );

    await waitFor(
      () =>
        subscription.messages.some(
          (message) =>
            message.entityType === 'environment' &&
            message.payload !== null &&
            (message.payload as { state?: string; blockedReason?: string }).state === 'failed' &&
            ((message.payload as { blockedReason?: string }).blockedReason ?? '').includes(
              'output persistence exploded',
            ),
        ),
      2000,
      'Timed out waiting for failed live publication after side-effect persistence error.',
    );

    expect(warnSpy).not.toHaveBeenCalled();

    subscription.close();
    await app.close();
  });
});
