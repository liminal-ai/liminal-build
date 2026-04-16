import {
  liveProcessUpdateMessageSchema,
  type EnvironmentSummary,
  type LiveProcessUpdateMessage,
  type ProcessSurfaceSummary,
  processSurfaceStateSchema,
} from '../../apps/platform/shared/contracts/index.js';
import { progressUpdateHistoryFixture } from './process-history.js';
import {
  emptyProcessMaterialsFixture,
  phaseChangedProcessMaterialsFixture,
  readyProcessMaterialsFixture,
  revisedOutputProcessMaterialsFixture,
} from './materials.js';
import {
  currentProcessRequestFixture,
  runningProcessSurfaceFixture,
  waitingProcessSurfaceFixture,
} from './process-surface.js';
import {
  absentEnvironmentFixture,
  checkpointFailedEnvironmentFixture,
  checkpointingEnvironmentFixture,
  failedEnvironmentFixture,
  preparingEnvironmentFixture,
  rehydratingEnvironmentFixture,
  readyEnvironmentFixture,
  runningEnvironmentFixture,
} from './process-environment.js';
import { readySideWorkFixture } from './side-work.js';

const liveProcessMessageBase = {
  subscriptionId: 'subscription-001',
  processId: waitingProcessSurfaceFixture.processId,
  sequenceNumber: 1,
  correlationId: null,
  completedAt: null,
};

export function buildLiveProcessMessageFixture(
  overrides: Partial<LiveProcessUpdateMessage>,
): LiveProcessUpdateMessage {
  const candidate = {
    ...liveProcessMessageBase,
    ...overrides,
  };

  if (candidate.entityType === 'process') {
    const processPayload = candidate.payload as ProcessSurfaceSummary | undefined;

    if (processPayload !== undefined) {
      candidate.processId = overrides.processId ?? processPayload.processId;
      candidate.entityId = overrides.entityId ?? processPayload.processId;
    }
  }

  if (candidate.entityType === 'environment') {
    const environmentPayload = candidate.payload as EnvironmentSummary | undefined;

    if (environmentPayload !== undefined) {
      candidate.entityId = 'environment';
    }
  }

  return liveProcessUpdateMessageSchema.parse(candidate);
}

export const processSnapshotLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'snapshot',
  entityType: 'process',
  entityId: waitingProcessSurfaceFixture.processId,
  payload: waitingProcessSurfaceFixture,
});

export const processUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'process',
  sequenceNumber: 2,
  processId: runningProcessSurfaceFixture.processId,
  payload: runningProcessSurfaceFixture,
});

export const historyUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'history',
  entityId: progressUpdateHistoryFixture.historyItemId,
  sequenceNumber: 3,
  payload: progressUpdateHistoryFixture,
});

export const historyCompleteLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'complete',
  entityType: 'history',
  entityId: progressUpdateHistoryFixture.historyItemId,
  sequenceNumber: 4,
  completedAt: '2026-04-13T12:20:00.000Z',
  payload: {
    ...progressUpdateHistoryFixture,
    lifecycleState: 'finalized',
  },
});

export const currentRequestSnapshotLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'snapshot',
  entityType: 'current_request',
  entityId: 'current_request',
  sequenceNumber: 5,
  payload: currentProcessRequestFixture,
});

export const currentRequestClearedLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'complete',
  entityType: 'current_request',
  entityId: 'current_request',
  sequenceNumber: 6,
  completedAt: '2026-04-13T12:21:00.000Z',
  payload: null,
});

export const materialsUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'materials',
  entityId: 'materials',
  sequenceNumber: 7,
  payload: readyProcessMaterialsFixture,
});

export const materialsPhaseChangeUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'materials',
  entityId: 'materials',
  sequenceNumber: 8,
  payload: phaseChangedProcessMaterialsFixture,
});

export const materialsRevisionUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'materials',
  entityId: 'materials',
  sequenceNumber: 9,
  payload: revisedOutputProcessMaterialsFixture,
});

export const materialsClearedSnapshotLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'snapshot',
  entityType: 'materials',
  entityId: 'materials',
  sequenceNumber: 10,
  payload: emptyProcessMaterialsFixture,
});

export const sideWorkUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'side_work',
  entityId: 'side-work-001',
  sequenceNumber: 11,
  payload: readySideWorkFixture,
});

export const environmentSnapshotLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'snapshot',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 12,
  payload: absentEnvironmentFixture,
});

export const environmentPreparingUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 13,
  payload: preparingEnvironmentFixture,
});

export const environmentReadyUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 14,
  payload: readyEnvironmentFixture,
});

export const environmentRehydratingUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 14,
  payload: rehydratingEnvironmentFixture,
});

export const environmentRunningUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 15,
  payload: runningEnvironmentFixture,
});

export const environmentCompleteLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'complete',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 20,
  completedAt: readyEnvironmentFixture.lastHydratedAt ?? '2026-04-13T12:20:00.000Z',
  payload: readyEnvironmentFixture,
});

export const environmentCheckpointingUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 16,
  payload: checkpointingEnvironmentFixture,
});

export const environmentCheckpointFailureUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 17,
  payload: checkpointFailedEnvironmentFixture,
});

export const environmentFailedUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'environment',
  entityId: 'environment',
  sequenceNumber: 19,
  payload: failedEnvironmentFixture,
});

export const historyErrorLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'error',
  entityType: 'history',
  entityId: 'history',
  sequenceNumber: 18,
  payload: {
    code: 'PROCESS_SURFACE_HISTORY_LOAD_FAILED',
    message: 'History reconnect failed.',
  },
});

export const connectedProcessSurfaceStateFixture = processSurfaceStateSchema.parse({
  projectId: 'project-surface-001',
  processId: waitingProcessSurfaceFixture.processId,
  project: null,
  process: waitingProcessSurfaceFixture,
  history: null,
  materials: readyProcessMaterialsFixture,
  currentRequest: currentProcessRequestFixture,
  sideWork: readySideWorkFixture,
  environment: absentEnvironmentFixture,
  isLoading: false,
  error: null,
  actionError: null,
  live: {
    connectionState: 'connected',
    subscriptionId: 'subscription-001',
    lastSequenceNumber: 17,
    error: null,
  },
});

export const reconnectingProcessSurfaceStateFixture = processSurfaceStateSchema.parse({
  ...connectedProcessSurfaceStateFixture,
  live: {
    connectionState: 'reconnecting',
    subscriptionId: 'subscription-001',
    lastSequenceNumber: 17,
    error: null,
  },
});
