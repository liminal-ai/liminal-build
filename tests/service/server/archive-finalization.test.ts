import { describe, expect, it } from 'vitest';
import { ArchiveFinalizationService } from '../../../apps/platform/server/services/archive/archive-finalization.service.js';
import { ProcessEnvironmentService } from '../../../apps/platform/server/services/processes/environment/process-environment.service.js';
import type { ExecutionResult } from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { InMemoryProviderAdapter } from '../../../apps/platform/server/services/processes/environment/provider-adapter.js';
import { SingleAdapterRegistry } from '../../../apps/platform/server/services/processes/environment/provider-adapter-registry.js';
import { InMemoryProcessLiveHub } from '../../../apps/platform/server/services/processes/live/process-live-hub.js';
import { ProcessAccessService } from '../../../apps/platform/server/services/processes/process-access.service.js';
import { ProcessResponseService } from '../../../apps/platform/server/services/processes/process-response.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { ProjectAccessService } from '../../../apps/platform/server/services/projects/project-access.service.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  processMessageHistoryFixture,
  progressUpdateHistoryFixture,
} from '../../fixtures/process-history.js';
import { draftProcessFixture, waitingProcessFixture } from '../../fixtures/processes.js';

const actor = {
  userId: 'user:archive-finalization',
  workosUserId: 'archive-finalization',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectId = 'project-archive-finalization';
const processId = 'process-archive-finalization';

const projectSummary = projectSummarySchema.parse({
  projectId,
  name: 'Archive Finalization Story',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-05-04T09:00:00.000Z',
});

function buildStore(args: { processStatus?: 'draft' | 'waiting' } = {}) {
  const process =
    args.processStatus === 'waiting'
      ? processSummarySchema.parse({
          ...waitingProcessFixture,
          processId,
          displayLabel: 'Waiting archive process',
          updatedAt: '2026-05-04T09:01:00.000Z',
        })
      : processSummarySchema.parse({
          ...draftProcessFixture,
          processId,
          displayLabel: 'Draft archive process',
          updatedAt: '2026-05-04T09:01:00.000Z',
        });

  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      [actor.userId]: [projectSummary],
    },
    projectAccessByProjectId: {
      [projectId]: {
        kind: 'accessible',
        project: projectSummary,
      },
    },
    processesByProjectId: {
      [projectId]: [process],
    },
  });
}

function buildProcessResponseService(platformStore: InMemoryPlatformStore) {
  return new ProcessResponseService(
    platformStore,
    new ProcessAccessService(platformStore, new ProjectAccessService(platformStore)),
    new InMemoryProcessLiveHub(),
  );
}

function buildProcessEnvironmentService(platformStore: InMemoryPlatformStore) {
  return new ProcessEnvironmentService(
    platformStore,
    new ProcessAccessService(platformStore, new ProjectAccessService(platformStore)),
    new SingleAdapterRegistry(new InMemoryProviderAdapter()),
    new InMemoryProcessLiveHub(),
  );
}

describe('archive finalization boundary', () => {
  it('TC-2.1a raw streaming delta excluded from archive', async () => {
    const platformStore = buildStore();
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);

    await expect(
      archiveFinalizationService.appendFromProcessHistoryItem({
        projectId,
        processId,
        historyItem: progressUpdateHistoryFixture,
      }),
    ).resolves.toBeNull();

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(archivePage.entries).toEqual([]);
  });

  it('TC-2.2a interrupted model output excluded', async () => {
    const platformStore = buildStore();
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);

    await expect(
      archiveFinalizationService.appendFromProcessHistoryItem({
        projectId,
        processId,
        historyItem: {
          ...processMessageHistoryFixture,
          lifecycleState: 'current',
          text: 'Drafting a partial model response...',
        },
      }),
    ).resolves.toBeNull();

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(archivePage.entries).toEqual([]);
  });

  it('TC-2.2b incomplete tool result excluded', async () => {
    const platformStore = buildStore();
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);

    await expect(
      archiveFinalizationService.appendFinalizedEntry({
        projectId,
        processId,
        entryKind: 'tool_result',
        finalizationKey: 'tool:lint:result',
        sourceObjectId: 'tool-result-1',
        bodyText: null,
        bodyData: {
          jsonText: '{"stdout":"ok"}',
        },
        bodyFormat: 'structured',
        relatedArtifactVersionId: null,
        relatedSourceProvenanceId: null,
        relatedToolCallId: null,
        entryStatus: 'ready',
        degradationReason: null,
        recordedAt: '2026-05-04T09:02:00.000Z',
      }),
    ).rejects.toThrow('relatedToolCallId');

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(archivePage.entries).toEqual([]);
  });

  it('TC-2.3a completed live object archived once through finalization service', async () => {
    const platformStore = buildStore();
    const processEnvironmentService = buildProcessEnvironmentService(platformStore);
    const executionResult: ExecutionResult = {
      processStatus: 'completed',
      processHistoryItems: [
        {
          historyItemId: 'runtime-model-1',
          kind: 'process_message',
          lifecycleState: 'finalized',
          text: 'Review-ready implementation draft completed.',
          createdAt: '2026-05-04T09:03:00.000Z',
          relatedSideWorkId: null,
          relatedArtifactId: null,
        },
      ],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [],
      codeCheckpointCandidates: [],
    };

    const applyExecutionResultSideEffects = processEnvironmentService as unknown as {
      applyExecutionResultSideEffects(args: {
        projectId: string;
        processId: string;
        executionResult: ExecutionResult;
      }): Promise<{ historyItems: Array<{ historyItemId: string }> }>;
    };

    const result = await applyExecutionResultSideEffects.applyExecutionResultSideEffects({
      projectId,
      processId,
      executionResult,
    });
    const storedHistoryItemId = result.historyItems[0]?.historyItemId;
    const [archivePage, historyItems] = await Promise.all([
      platformStore.listArchiveEntries({
        processId,
        limit: 20,
      }),
      platformStore.listProcessHistoryItems({
        processId,
      }),
    ]);

    expect(storedHistoryItemId).toBeDefined();
    expect(storedHistoryItemId).not.toBe(executionResult.processHistoryItems[0]?.historyItemId);
    expect(historyItems).toHaveLength(1);
    expect(historyItems[0]?.historyItemId).toBe(storedHistoryItemId);
    expect(archivePage.entries).toMatchObject([
      {
        entryKind: 'model_message',
        finalizationKey: `model:${storedHistoryItemId}`,
        sourceObjectId: storedHistoryItemId,
        bodyText: 'Review-ready implementation draft completed.',
      },
    ]);
  });

  it('TC-2.3b replayed completion does not duplicate entry through service boundary', async () => {
    const platformStore = buildStore();
    const processEnvironmentService = buildProcessEnvironmentService(platformStore);
    const executionResult: ExecutionResult = {
      processStatus: 'completed',
      processHistoryItems: [
        {
          historyItemId: 'runtime-model-1',
          kind: 'process_message',
          lifecycleState: 'finalized',
          text: 'Review-ready implementation draft completed.',
          createdAt: '2026-05-04T09:03:00.000Z',
          relatedSideWorkId: null,
          relatedArtifactId: null,
        },
      ],
      outputWrites: [],
      sideWorkWrites: [],
      artifactCheckpointCandidates: [],
      codeCheckpointCandidates: [],
    };

    const applyExecutionResultSideEffects = processEnvironmentService as unknown as {
      applyExecutionResultSideEffects(args: {
        projectId: string;
        processId: string;
        executionResult: ExecutionResult;
      }): Promise<{ historyItems: Array<{ historyItemId: string }> }>;
    };

    const firstResult = await applyExecutionResultSideEffects.applyExecutionResultSideEffects({
      projectId,
      processId,
      executionResult,
    });
    const secondResult = await applyExecutionResultSideEffects.applyExecutionResultSideEffects({
      projectId,
      processId,
      executionResult,
    });
    const storedHistoryItemId = firstResult.historyItems[0]?.historyItemId;

    const [archivePage, historyItems] = await Promise.all([
      platformStore.listArchiveEntries({
        processId,
        limit: 20,
      }),
      platformStore.listProcessHistoryItems({
        processId,
      }),
    ]);

    expect(storedHistoryItemId).toBeDefined();
    expect(firstResult.historyItems[0]?.historyItemId).toBe(
      secondResult.historyItems[0]?.historyItemId,
    );
    expect(archivePage.entries).toMatchObject([
      {
        entryKind: 'model_message',
        finalizationKey: `model:${storedHistoryItemId}`,
        sourceObjectId: storedHistoryItemId,
      },
    ]);
    expect(archivePage.entries).toHaveLength(1);
    expect(historyItems).toHaveLength(1);
  });

  it('maps finalized compatible process-history items into canonical archive entries only when safe', async () => {
    const platformStore = buildStore();
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);

    const archiveEntry = await archiveFinalizationService.appendFromProcessHistoryItem({
      projectId,
      processId,
      historyItem: processMessageHistoryFixture,
    });
    const skippedEntry = await archiveFinalizationService.appendFromProcessHistoryItem({
      projectId,
      processId,
      historyItem: progressUpdateHistoryFixture,
    });

    expect(archiveEntry).toMatchObject({
      entryKind: 'model_message',
      finalizationKey: `model:${processMessageHistoryFixture.historyItemId}`,
      bodyText: processMessageHistoryFixture.text,
    });
    expect(skippedEntry).toBeNull();
  });

  it('replayed accepted user responses reuse finalizationKey idempotency without duplicating archive rows', async () => {
    const platformStore = buildStore({
      processStatus: 'waiting',
    });
    const processResponseService = buildProcessResponseService(platformStore);
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);

    await processResponseService.respond({
      actor,
      projectId,
      processId,
      body: {
        clientRequestId: 'req-archive-2',
        message: 'Keep the archive durable.',
      },
    });
    const submittedResponse = await platformStore.getSubmittedProcessResponse({
      processId,
      clientRequestId: 'req-archive-2',
    });

    expect(submittedResponse).not.toBeNull();
    if (submittedResponse === null) {
      throw new Error('Expected stored submitted response for archive replay test.');
    }

    const bridgedArchiveEntry = await archiveFinalizationService.appendFromProcessHistoryItem({
      projectId,
      processId,
      historyItem: submittedResponse.historyItem,
    });

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(archivePage.entries).toHaveLength(1);
    expect(archivePage.entries[0]).toMatchObject({
      finalizationKey: `response:${submittedResponse.historyItem.historyItemId}`,
      entryKind: 'user_message',
      sourceObjectId: submittedResponse.historyItem.historyItemId,
    });
    expect(bridgedArchiveEntry).toMatchObject({
      finalizationKey: `response:${submittedResponse.historyItem.historyItemId}`,
      sourceObjectId: submittedResponse.historyItem.historyItemId,
    });
  });

  it('bridge-first accepted user responses do not create duplicate canonical archive rows later', async () => {
    const platformStore = buildStore({
      processStatus: 'waiting',
    });
    const archiveFinalizationService = new ArchiveFinalizationService(platformStore);
    const processResponseService = buildProcessResponseService(platformStore);
    const historyItem = {
      historyItemId: 'history-response-bridge-first-1',
      kind: 'user_message' as const,
      lifecycleState: 'finalized' as const,
      text: 'Bridge this accepted response first.',
      createdAt: '2026-05-04T09:04:00.000Z',
      relatedSideWorkId: null,
      relatedArtifactId: null,
    };

    const bridgedArchiveEntry = await archiveFinalizationService.appendFromProcessHistoryItem({
      projectId,
      processId,
      historyItem,
    });

    const archiveAcceptedUserResponse = processResponseService as unknown as {
      archiveAcceptedUserResponse(args: {
        projectId: string;
        processId: string;
        historyItem: {
          historyItemId: string;
          text: string;
          createdAt: string;
        };
      }): Promise<void>;
    };

    await archiveAcceptedUserResponse.archiveAcceptedUserResponse({
      projectId,
      processId,
      historyItem,
    });

    const archivePage = await platformStore.listArchiveEntries({
      processId,
      limit: 20,
    });

    expect(bridgedArchiveEntry).toMatchObject({
      finalizationKey: `response:${historyItem.historyItemId}`,
      sourceObjectId: historyItem.historyItemId,
    });
    expect(archivePage.entries).toHaveLength(1);
    expect(archivePage.entries[0]).toMatchObject({
      finalizationKey: `response:${historyItem.historyItemId}`,
      sourceObjectId: historyItem.historyItemId,
      bodyText: historyItem.text,
    });
  });
});
