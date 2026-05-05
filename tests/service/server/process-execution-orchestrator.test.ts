import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { ProcessEnvironmentService } from '../../../apps/platform/server/services/processes/environment/process-environment.service.js';
import { CheckpointPlanner } from '../../../apps/platform/server/services/processes/environment/checkpoint-planner.js';
import {
  type CodeCheckpointWriter,
  StubCodeCheckpointWriter,
} from '../../../apps/platform/server/services/processes/environment/code-checkpoint-writer.js';
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
import {
  LocalProviderAdapter,
  type LocalProviderRuntime,
} from '../../../apps/platform/server/services/processes/environment/local-provider-adapter.js';
import { InMemoryProcessLiveHub } from '../../../apps/platform/server/services/processes/live/process-live-hub.js';
import { ProcessAccessService } from '../../../apps/platform/server/services/processes/process-access.service.js';
import { ProjectAccessService } from '../../../apps/platform/server/services/projects/project-access.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { MaterialsSectionReader } from '../../../apps/platform/server/services/processes/readers/materials-section.reader.js';
import { DefaultSourceProvenanceService } from '../../../apps/platform/server/services/sources/source-provenance.service.js';
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
  checkpointPlanner?: CheckpointPlanner;
  codeCheckpointWriter?: CodeCheckpointWriter;
}): ProcessEnvironmentService {
  const projectAccessService = new ProjectAccessService(args.platformStore);
  const processAccessService = new ProcessAccessService(args.platformStore, projectAccessService);

  return new ProcessEnvironmentService(
    args.platformStore,
    processAccessService,
    args.providerAdapterRegistry,
    args.processLiveHub,
    new ScriptExecutionService(args.providerAdapterRegistry),
    args.checkpointPlanner ?? new CheckpointPlanner(),
    args.codeCheckpointWriter ?? new StubCodeCheckpointWriter(),
    args.defaultProviderKind,
    args.platformStore,
    new DefaultSourceProvenanceService(args.platformStore),
  );
}

async function buildExecutionApp(args: {
  platformStore: InMemoryPlatformStore;
  processLiveHub: InMemoryProcessLiveHub;
  providerAdapterRegistry: ProviderAdapterRegistry;
  defaultProviderKind?: ProviderKind;
  checkpointPlanner?: CheckpointPlanner;
  codeCheckpointWriter?: CodeCheckpointWriter;
}) {
  const defaultProviderKind = args.defaultProviderKind ?? 'local';
  const processEnvironmentService = buildTestProcessEnvironmentService({
    platformStore: args.platformStore,
    processLiveHub: args.processLiveHub,
    providerAdapterRegistry: args.providerAdapterRegistry,
    defaultProviderKind,
    checkpointPlanner: args.checkpointPlanner,
    codeCheckpointWriter: args.codeCheckpointWriter,
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
  sourceAttachmentIds?: string[];
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
        sourceAttachmentIds: plan.sourceInputs.map((source) => source.sourceAttachmentId),
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
        sourceAttachmentIds: plan.sourceInputs.map((source) => source.sourceAttachmentId),
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
        sourceAttachmentIds: plan.sourceInputs.map((source) => source.sourceAttachmentId),
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
    archiveEntries: [],
    outputWrites: [],
    sideWorkWrites: [],
    artifactCheckpointCandidates: [],
    codeCheckpointCandidates: [],
    ...overrides,
  };
}

class RecordingCodeCheckpointWriter implements CodeCheckpointWriter {
  readonly calls: Array<{
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }> = [];

  async writeFor(args: {
    sourceAttachmentId: string;
    repositoryUrl: string;
    targetRef: string | null;
    filePath: string;
    diff: string;
    commitMessage: string;
  }) {
    this.calls.push(args);
    return {
      outcome: 'succeeded' as const,
    };
  }
}

class BlockingCodeCheckpointWriter implements CodeCheckpointWriter {
  private readonly startedPromise: Promise<void>;
  private readonly releasePromise: Promise<void>;
  private resolveStarted!: () => void;
  private resolveRelease!: () => void;

  constructor() {
    this.startedPromise = new Promise<void>((resolve) => {
      this.resolveStarted = resolve;
    });
    this.releasePromise = new Promise<void>((resolve) => {
      this.resolveRelease = resolve;
    });
  }

  async writeFor() {
    this.resolveStarted();
    await this.releasePromise;

    return {
      outcome: 'succeeded' as const,
    };
  }

  async waitUntilStarted(): Promise<void> {
    await this.startedPromise;
  }

  release(): void {
    this.resolveRelease();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('process execution orchestrator', () => {
  it('drives the shipped local execution path end to end without synthetic archive rows', async () => {
    const workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'liminal-build-execution-archive-'),
    );
    const runtime: LocalProviderRuntime = {
      cloneSource: async ({ destination }) => {
        await fs.mkdir(destination, { recursive: true });
        await fs.writeFile(path.join(destination, 'README.md'), '# cloned', 'utf8');
        return null;
      },
      runScript: async ({ workingTree, scriptPath }) =>
        await new Promise<number>((resolve) => {
          const child = spawn('node', ['--experimental-strip-types', scriptPath], {
            cwd: workingTree,
            stdio: 'pipe',
          });
          child.on('error', () => resolve(1));
          child.on('close', (code) => resolve(code ?? 1));
        }),
    };
    const platformStore = buildStore();
    const sourceAttachment = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'archive runtime source',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/archive-runtime-source',
      repositoryFullName: 'liminal-ai/archive-runtime-source',
      targetRef: 'feature/archive-runtime',
    });
    await platformStore.setCurrentProcessMaterialRefs({
      processId,
      artifactIds: [],
      sourceAttachmentIds: [sourceAttachment.sourceAttachmentId],
    });

    const provider = new LocalProviderAdapter(platformStore, {
      workspaceRoot,
      runtime,
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/processes/${processId}/start`,
        cookies: { [sessionCookieName]: 'valid-session-cookie' },
      });

      expect(response.statusCode).toBe(200);

      await waitFor(
        async () => {
          const process = await platformStore.getProcessRecord({ processId });
          const provenanceEntries = await platformStore.listProcessSourceProvenance({
            processId,
          });

          return (
            process?.status === 'completed' &&
            provenanceEntries.some(
              (entry) =>
                entry.relationshipKind === 'received_code_update' &&
                entry.sourceAttachmentId === sourceAttachment.sourceAttachmentId,
            )
          );
        },
        4000,
        'Timed out waiting for the real local execution path checkpoint provenance to complete.',
      );

      const archivePage = await platformStore.listArchiveEntries({
        processId,
        limit: 20,
      });
      const entryKinds = archivePage.entries.map((entry) => entry.entryKind);
      const outputs = await platformStore.listProcessOutputs({ processId });
      const sourceProvenance = await platformStore.listProcessSourceProvenance({
        processId,
      });

      expect(entryKinds).not.toEqual(
        expect.arrayContaining([
          'reasoning',
          'script_emission',
          'tool_call',
          'tool_result',
          'model_message',
        ]),
      );
      expect(archivePage.entries).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            finalizationKey: expect.stringContaining('default-execution:'),
          }),
        ]),
      );
      expect(outputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            displayName: 'Feature Specification Runtime Brief',
            revisionLabel: 'feature-specification-runtime-v1',
          }),
        ]),
      );
      expect(sourceProvenance).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            relationshipKind: 'received_code_update',
            sourceAttachmentId: sourceAttachment.sourceAttachmentId,
          }),
        ]),
      );
    } finally {
      await app.close();
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

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

  it('finalizes canonical archive kinds from live execution and backfills artifact/source provenance onto deferred archive entries', async () => {
    const platformStore = buildStore();
    const executionSource = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'archive source',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/archive-source',
      repositoryFullName: 'liminal-ai/archive-source',
      targetRef: 'main',
    });
    await platformStore.setCurrentProcessMaterialRefs({
      processId,
      artifactIds: [],
      sourceAttachmentIds: [executionSource.sourceAttachmentId],
    });

    const executionResult = buildExecutionResult('completed', {
      processHistoryItems: [
        {
          historyItemId: 'history-live-archive-1',
          kind: 'process_event',
          lifecycleState: 'finalized',
          text: 'Execution completed and queued archive finalization.',
          createdAt: '2026-04-16T09:04:00.000Z',
          relatedSideWorkId: null,
          relatedArtifactId: null,
        },
      ],
      archiveEntries: [
        {
          entryKind: 'reasoning',
          finalizationKey: 'reasoning:live-archive-1',
          sourceObjectId: 'reasoning-live-archive-1',
          bodyText: 'Reasoning finalized the live archive batch.',
          bodyData: null,
          bodyFormat: 'plain_text',
          relatedToolCallId: null,
          recordedAt: '2026-04-16T09:04:01.000Z',
        },
        {
          entryKind: 'tool_call',
          finalizationKey: 'tool-call:live-archive-1',
          sourceObjectId: 'tool-call-live-archive-1',
          bodyText: null,
          bodyData: {
            jsonText: '{"tool":"checkpoint_artifact","target":"archive-summary.md"}',
          },
          bodyFormat: 'structured',
          relatedToolCallId: 'tool-call-live-archive-1',
          recordedAt: '2026-04-16T09:04:02.000Z',
        },
        {
          entryKind: 'tool_result',
          finalizationKey: 'tool-result:live-archive-1',
          sourceObjectId: 'tool-result-live-archive-1',
          bodyText: null,
          bodyData: {
            jsonText: '{"ok":true}',
          },
          bodyFormat: 'structured',
          relatedToolCallId: 'tool-call-live-archive-1',
          recordedAt: '2026-04-16T09:04:03.000Z',
        },
        {
          entryKind: 'model_message',
          finalizationKey: 'model:live-archive-1',
          sourceObjectId: 'model-live-archive-1',
          bodyText: 'Review-ready archive output is ready.',
          bodyData: null,
          bodyFormat: 'markdown',
          relatedToolCallId: null,
          recordedAt: '2026-04-16T09:04:04.000Z',
        },
        {
          entryKind: 'process_event',
          finalizationKey: 'event:live-archive-1',
          sourceObjectId: 'event-live-archive-1',
          bodyText: 'Execution finished and is entering checkpointing.',
          bodyData: null,
          bodyFormat: 'plain_text',
          relatedToolCallId: null,
          recordedAt: '2026-04-16T09:04:05.000Z',
        },
        {
          entryKind: 'script_emission',
          finalizationKey: 'script:live-archive-1',
          sourceObjectId: 'script-live-archive-1',
          bodyText: '# Archive Summary\n\nGenerated from the live execution path.',
          bodyData: null,
          bodyFormat: 'plain_text',
          relatedToolCallId: null,
          recordedAt: '2026-04-16T09:04:06.000Z',
          artifactCheckpointIndex: 0,
          sourceProvenanceBinding: {
            relationshipKind: 'informed_work',
            sourceAttachmentId: executionSource.sourceAttachmentId,
          },
        },
      ],
      artifactCheckpointCandidates: [
        {
          displayName: 'Archive Summary',
          revisionLabel: 'archive-v1',
          contentsRef: 'mem://archive/live-summary.md',
        },
      ],
      usedSourceAttachmentIds: [executionSource.sourceAttachmentId],
    });
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult,
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const archivePage = await platformStore.listArchiveEntries({
          processId,
          limit: 20,
        });
        const deferredEntry = archivePage.entries.find(
          (entry) => entry.finalizationKey === 'script:live-archive-1',
        );

        return (
          archivePage.entries.length >= 7 &&
          deferredEntry?.relatedArtifactVersionId != null &&
          deferredEntry.relatedSourceProvenanceId != null
        );
      },
      2000,
      'Timed out waiting for archive taxonomy and provenance links to settle.',
    );

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });
    const entryKinds = archivePage.entries.map((entry) => entry.entryKind);
    const deferredEntry = archivePage.entries.find(
      (entry) => entry.finalizationKey === 'script:live-archive-1',
    );

    expect(entryKinds).toEqual(
      expect.arrayContaining([
        'reasoning',
        'script_emission',
        'tool_call',
        'tool_result',
        'model_message',
        'process_event',
      ]),
    );
    expect(deferredEntry).toMatchObject({
      entryKind: 'script_emission',
      relatedArtifactVersionId: expect.any(String),
      relatedSourceProvenanceId: expect.any(String),
    });

    await app.close();
  });

  it('appends checkpoint-bound archive rows before checkpoint work finishes', async () => {
    const platformStore = buildStore();
    const writableSource = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'liminal-build writable',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'feature/archive-completion-boundary',
    });
    await platformStore.setCurrentProcessMaterialRefs({
      processId,
      artifactIds: [],
      sourceAttachmentIds: [writableSource.sourceAttachmentId],
    });
    const blockingWriter = new BlockingCodeCheckpointWriter();
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed', {
        archiveEntries: [
          {
            entryKind: 'script_emission',
            finalizationKey: 'script:completion-boundary-1',
            sourceObjectId: 'script-completion-boundary-1',
            bodyText: '# Archive Summary\n\nCheckpoint is still in flight.',
            bodyData: null,
            bodyFormat: 'plain_text',
            relatedToolCallId: null,
            recordedAt: '2026-04-16T09:04:06.000Z',
            sourceProvenanceBinding: {
              relationshipKind: 'received_code_update',
              sourceAttachmentId: writableSource.sourceAttachmentId,
            },
          },
        ],
        usedSourceAttachmentIds: [writableSource.sourceAttachmentId],
        codeCheckpointCandidates: [
          {
            sourceAttachmentId: writableSource.sourceAttachmentId,
            displayName: writableSource.displayName,
            targetRef: writableSource.targetRef,
            accessMode: 'read_write',
            workspaceRef: 'mem://archive-completion-boundary/summary.md',
            filePath: 'summary.md',
            commitMessage: 'Persist completion-boundary archive summary',
          },
        ],
      }),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
      codeCheckpointWriter: blockingWriter,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => (await platformStore.getProcessRecord({ processId }))?.status === 'completed',
      2000,
      'Timed out waiting for completed process before checkpoint release.',
    );
    await blockingWriter.waitUntilStarted();

    const archiveBeforeCheckpointRelease = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(
      archiveBeforeCheckpointRelease.entries.find(
        (entry) => entry.finalizationKey === 'script:completion-boundary-1',
      ),
    ).toMatchObject({
      entryKind: 'script_emission',
      entryStatus: 'degraded',
      relatedSourceProvenanceId: null,
      degradationReason: 'Related source provenance is unavailable.',
    });

    blockingWriter.release();

    await waitFor(
      async () => {
        const archivePage = await platformStore.listArchiveEntries({
          processId,
          limit: 20,
        });
        const deferredEntry = archivePage.entries.find(
          (entry) => entry.finalizationKey === 'script:completion-boundary-1',
        );

        return deferredEntry?.relatedSourceProvenanceId != null;
      },
      2000,
      'Timed out waiting for checkpoint-bound archive row to settle after release.',
    );

    await app.close();
  });

  it('persists degraded canonical archive rows when deferred linkage cannot be resolved', async () => {
    const platformStore = buildStore();
    const executionResult = buildExecutionResult('completed', {
      archiveEntries: [
        {
          entryKind: 'script_emission',
          finalizationKey: 'script:degraded-live-archive-1',
          sourceObjectId: 'script-degraded-live-archive-1',
          bodyText: '# Runtime Report\n\nA deferred archive entry could not resolve all links.',
          bodyData: null,
          bodyFormat: 'plain_text',
          relatedToolCallId: null,
          recordedAt: '2026-04-16T09:05:00.000Z',
          artifactCheckpointIndex: 0,
          sourceProvenanceBinding: {
            relationshipKind: 'informed_work',
            sourceAttachmentId: 'missing-source-attachment',
          },
        },
      ],
      artifactCheckpointCandidates: [],
      usedSourceAttachmentIds: [],
    });
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult,
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const archivePage = await platformStore.listArchiveEntries({
          processId,
          limit: 20,
        });
        return archivePage.entries.some(
          (entry) => entry.finalizationKey === 'script:degraded-live-archive-1',
        );
      },
      2000,
      'Timed out waiting for degraded deferred archive entry to persist.',
    );

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(
      archivePage.entries.find(
        (entry) => entry.finalizationKey === 'script:degraded-live-archive-1',
      ),
    ).toMatchObject({
      entryKind: 'script_emission',
      entryStatus: 'degraded',
      degradationReason:
        'Related artifact version is unavailable. Related source provenance is unavailable.',
      relatedArtifactVersionId: null,
      relatedSourceProvenanceId: null,
    });

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

  it('records informed-work provenance for only the canonical source reported by runtime execution', async () => {
    const platformStore = buildStore();
    const shadowedProjectSource = await platformStore.createProjectSourceAttachment({
      projectId,
      provider: 'github',
      displayName: 'shared repo',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/shared-repo',
      repositoryFullName: 'liminal-ai/shared-repo',
      targetRef: 'main',
    });
    const processShadowSource = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'shared repo process shadow',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: shadowedProjectSource.repositoryUrl,
      repositoryFullName: shadowedProjectSource.repositoryFullName,
      targetRef: shadowedProjectSource.targetRef,
    });
    await platformStore.setCurrentProcessMaterialRefs({
      processId,
      artifactIds: [],
      sourceAttachmentIds: [shadowedProjectSource.sourceAttachmentId],
    });

    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed', {
        usedSourceAttachmentIds: [shadowedProjectSource.sourceAttachmentId],
      }),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () =>
        (await platformStore.listProcessSourceProvenance({ processId })).some(
          (entry) =>
            entry.relationshipKind === 'informed_work' &&
            entry.sourceAttachmentId === processShadowSource.sourceAttachmentId,
        ),
      2000,
      'Timed out waiting for informed-work provenance to be recorded.',
    );

    await expect(platformStore.listProcessSourceProvenance({ processId })).resolves.toEqual([
      expect.objectContaining({
        relationshipKind: 'informed_work',
        sourceAttachmentId: processShadowSource.sourceAttachmentId,
        repositoryFullName: processShadowSource.repositoryFullName,
      }),
    ]);

    await app.close();
  });

  it('records received-code-update provenance after a successful checkpoint write', async () => {
    const platformStore = buildStore();
    const writableSource = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'liminal-build writable',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'feature/runtime-provenance',
    });
    await platformStore.setCurrentProcessMaterialRefs({
      processId,
      artifactIds: [],
      sourceAttachmentIds: [writableSource.sourceAttachmentId],
    });

    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed', {
        usedSourceAttachmentIds: [writableSource.sourceAttachmentId],
        codeCheckpointCandidates: [
          {
            sourceAttachmentId: writableSource.sourceAttachmentId,
            displayName: writableSource.displayName,
            targetRef: writableSource.targetRef,
            accessMode: 'read_write',
            workspaceRef: 'mem://runtime-provenance/default-note.md',
            filePath: 'default-note.md',
            commitMessage: 'Record runtime provenance',
          },
        ],
      }),
      calls: [],
    });
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub: new InMemoryProcessLiveHub(),
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/start`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(response.statusCode).toBe(200);

    await waitFor(
      async () => {
        const entries = await platformStore.listProcessSourceProvenance({ processId });
        return entries.some(
          (entry) =>
            entry.relationshipKind === 'received_code_update' &&
            entry.sourceAttachmentId === writableSource.sourceAttachmentId,
        );
      },
      2000,
      'Timed out waiting for received-code-update provenance to be recorded.',
    );

    await expect(platformStore.listProcessSourceProvenance({ processId })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationshipKind: 'informed_work',
          sourceAttachmentId: writableSource.sourceAttachmentId,
        }),
        expect.objectContaining({
          relationshipKind: 'received_code_update',
          sourceAttachmentId: writableSource.sourceAttachmentId,
        }),
      ]),
    );

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

  it('TC-5.1c detach during active process work does not rewrite the current hydrated copy and excludes the source from future rehydrate/rebuild planning', async () => {
    const platformStore = buildStore();
    const sourceAttachment = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'active source',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'feature/story-5',
    });

    await platformStore.setProcessHydrationPlan({
      processId,
      providerKind: 'local',
      plan: {
        artifactIds: [],
        sourceAttachmentIds: [sourceAttachment.sourceAttachmentId],
        outputIds: [],
      },
    });

    await platformStore.detachSourceAttachment({
      projectId,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      detachedByUserId: actor.userId,
    });

    expect(await platformStore.getProcessHydrationPlan({ processId })).toEqual({
      artifactIds: [],
      sourceAttachmentIds: [],
      outputIds: [],
    });

    const localCalls: ProviderCall[] = [];
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed'),
      calls: localCalls,
    });
    const processLiveHub = new InMemoryProcessLiveHub();
    const app = await buildExecutionApp({
      platformStore,
      processLiveHub,
      providerAdapterRegistry: new SingleAdapterRegistry(provider),
    });

    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'stale',
      environmentId: 'env-detached-rehydrate',
      blockedReason: 'The hydrated working copy is stale.',
      lastHydratedAt: '2026-04-16T09:00:00.000Z',
    });

    const rehydrateBefore = localCalls.filter(
      (call) => call.method === 'rehydrateEnvironment',
    ).length;
    const rehydrateResponse = await app.inject({
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
      'Timed out waiting for detached-source rehydrate planning.',
    );
    expect(
      localCalls.find((call) => call.method === 'rehydrateEnvironment')?.sourceAttachmentIds,
    ).toEqual([]);
    expect(await platformStore.getProcessHydrationPlan({ processId })).toEqual({
      artifactIds: [],
      sourceAttachmentIds: [],
      outputIds: [],
    });

    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'lost',
      environmentId: 'env-detached-rebuild',
      blockedReason: 'The previous working copy can no longer be recovered.',
      lastHydratedAt: '2026-04-16T09:00:00.000Z',
    });

    const rebuildBefore = localCalls.filter((call) => call.method === 'rebuildEnvironment').length;
    const rebuildResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/processes/${processId}/rebuild`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(rebuildResponse.statusCode).toBe(422);
    expect(localCalls.filter((call) => call.method === 'rebuildEnvironment')).toHaveLength(
      rebuildBefore,
    );

    const materials = await new MaterialsSectionReader(platformStore).read({
      projectId,
      processId,
    });
    expect(materials.currentSources).toEqual([]);

    await app.close();
  });

  it('excludes detached source attachments from checkpoint planning and write attempts', async () => {
    const platformStore = buildStore();
    const sourceAttachment = await platformStore.createProcessSourceAttachment({
      projectId,
      processId,
      provider: 'github',
      displayName: 'detached checkpoint source',
      purpose: 'implementation',
      accessMode: 'read_write',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'feature/story-5',
    });
    await platformStore.detachSourceAttachment({
      projectId,
      sourceAttachmentId: sourceAttachment.sourceAttachmentId,
      detachedByUserId: actor.userId,
    });
    await platformStore.upsertProcessEnvironmentState({
      processId,
      providerKind: 'local',
      state: 'ready',
      environmentId: 'env-detached-checkpoint',
      blockedReason: null,
      lastHydratedAt: '2026-04-16T09:00:00.000Z',
    });

    const processLiveHub = new InMemoryProcessLiveHub();
    const provider = buildProviderAdapter({
      providerKind: 'local',
      executionResult: buildExecutionResult('completed'),
      calls: [],
    });
    const checkpointPlanner = new CheckpointPlanner();
    const codeCheckpointWriter = new RecordingCodeCheckpointWriter();
    const processEnvironmentService = new ProcessEnvironmentService(
      platformStore,
      new ProcessAccessService(platformStore, new ProjectAccessService(platformStore)),
      new SingleAdapterRegistry(provider),
      processLiveHub,
      undefined,
      checkpointPlanner,
      codeCheckpointWriter,
      'local',
    );

    await (
      processEnvironmentService as unknown as {
        executeCheckpoint(args: {
          projectId: string;
          processId: string;
          environmentId: string;
          executionResult: ExecutionResult;
          checkpointPlanner: CheckpointPlanner;
          codeCheckpointWriter: CodeCheckpointWriter;
        }): Promise<void>;
      }
    ).executeCheckpoint({
      projectId,
      processId,
      environmentId: 'env-detached-checkpoint',
      executionResult: buildExecutionResult('completed', {
        codeCheckpointCandidates: [
          {
            sourceAttachmentId: sourceAttachment.sourceAttachmentId,
            displayName: 'Detached source change',
            targetRef: sourceAttachment.targetRef,
            accessMode: 'read_write',
            workspaceRef: 'diff --git a/file.md b/file.md',
            filePath: 'file.md',
            commitMessage: 'Checkpoint detached source',
          },
        ],
      }),
      checkpointPlanner,
      codeCheckpointWriter,
    });

    expect(codeCheckpointWriter.calls).toEqual([]);
    expect(
      (await platformStore.getProcessEnvironmentSummary({ processId })).lastCheckpointResult
        ?.failureReason,
    ).toContain(sourceAttachment.sourceAttachmentId);
  });
});
