import {
  liveProcessUpdateMessageSchema,
  type LiveProcessUpdateMessage,
  type ProcessSurfaceSummary,
  processSurfaceStateSchema,
} from '../../apps/platform/shared/contracts/index.js';
import { progressUpdateHistoryFixture } from './process-history.js';
import { readyProcessMaterialsFixture } from './materials.js';
import {
  currentProcessRequestFixture,
  runningProcessSurfaceFixture,
  waitingProcessSurfaceFixture,
} from './process-surface.js';
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

export const sideWorkUpsertLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'upsert',
  entityType: 'side_work',
  entityId: 'side-work-001',
  sequenceNumber: 8,
  payload: readySideWorkFixture,
});

export const historyErrorLiveFixture = buildLiveProcessMessageFixture({
  messageType: 'error',
  entityType: 'history',
  entityId: 'history',
  sequenceNumber: 9,
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
  isLoading: false,
  error: null,
  live: {
    connectionState: 'connected',
    subscriptionId: 'subscription-001',
    lastSequenceNumber: 8,
    error: null,
  },
});

export const reconnectingProcessSurfaceStateFixture = processSurfaceStateSchema.parse({
  ...connectedProcessSurfaceStateFixture,
  live: {
    connectionState: 'reconnecting',
    subscriptionId: 'subscription-001',
    lastSequenceNumber: 8,
    error: null,
  },
});
