import { describe, expect, it } from 'vitest';
import { applyLiveProcessMessage } from '../../../apps/platform/client/app/process-live.js';
import {
  liveProcessUpdateMessageSchema,
  processSurfaceStateSchema,
  processSurfaceSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  buildLiveProcessMessageFixture,
  connectedProcessSurfaceStateFixture,
  historyUpsertLiveFixture,
  materialsClearedSnapshotLiveFixture,
  materialsPhaseChangeUpsertLiveFixture,
  materialsRevisionUpsertLiveFixture,
  processSnapshotLiveFixture,
  sideWorkUpsertLiveFixture,
} from '../../fixtures/live-process.js';
import {
  emptyProcessMaterialsFixture,
  phaseChangedProcessMaterialsFixture,
  readyProcessMaterialsFixture,
  revisedOutputProcessMaterialsFixture,
} from '../../fixtures/materials.js';
import {
  completedProcessSurfaceFixture,
  failedProcessSurfaceFixture,
  interruptedProcessSurfaceFixture,
  pausedProcessSurfaceFixture,
  runningProcessSurfaceFixture,
  waitingProcessSurfaceFixture,
} from '../../fixtures/process-surface.js';
import {
  progressUpdateHistoryFixture,
  userMessageHistoryFixture,
} from '../../fixtures/process-history.js';
import { readySideWorkFixture } from '../../fixtures/side-work.js';

function buildRunningSurfaceState() {
  return processSurfaceStateSchema.parse({
    ...connectedProcessSurfaceStateFixture,
    processId: runningProcessSurfaceFixture.processId,
    process: runningProcessSurfaceFixture,
    currentRequest: null,
    live: {
      connectionState: 'connected',
      subscriptionId: 'subscription-001',
      lastSequenceNumber: 1,
      error: null,
    },
  });
}

function buildConnectedMaterialsState(lastSequenceNumber: number) {
  return processSurfaceStateSchema.parse({
    ...connectedProcessSurfaceStateFixture,
    materials: readyProcessMaterialsFixture,
    live: {
      connectionState: 'connected',
      subscriptionId: 'subscription-001',
      lastSequenceNumber,
      error: null,
    },
  });
}

function buildConnectedSideWorkState(lastSequenceNumber: number) {
  return processSurfaceStateSchema.parse({
    ...connectedProcessSurfaceStateFixture,
    sideWork: {
      status: 'empty',
      items: [],
    },
    live: {
      connectionState: 'connected',
      subscriptionId: 'subscription-001',
      lastSequenceNumber,
      error: null,
    },
  });
}

describe('process live foundation', () => {
  it('TC-2.2a running state becomes visible during active work', () => {
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        live: {
          connectionState: 'connected',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: 1,
          error: null,
        },
      },
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'process',
        sequenceNumber: 2,
        payload: processSurfaceSummarySchema.parse({
          ...runningProcessSurfaceFixture,
          processId: connectedProcessSurfaceStateFixture.processId,
        }),
      }),
    });

    expect(nextState.process).toMatchObject({
      processId: connectedProcessSurfaceStateFixture.processId,
      status: 'running',
      nextActionLabel: runningProcessSurfaceFixture.nextActionLabel,
    });
  });

  it('TC-2.2b phase changes become visible while the process remains open', () => {
    const nextState = applyLiveProcessMessage({
      state: buildRunningSurfaceState(),
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'process',
        sequenceNumber: 2,
        payload: processSurfaceSummarySchema.parse({
          ...runningProcessSurfaceFixture,
          processId: runningProcessSurfaceFixture.processId,
          phaseLabel: 'Reviewing returned results',
          updatedAt: '2026-04-13T12:40:00.000Z',
        }),
      }),
    });

    expect(nextState.process?.phaseLabel).toBe('Reviewing returned results');
  });

  it('rejects process messages whose top-level process id differs from the payload process id', () => {
    expect(() =>
      liveProcessUpdateMessageSchema.parse({
        ...processSnapshotLiveFixture,
        processId: connectedProcessSurfaceStateFixture.processId,
        entityId: connectedProcessSurfaceStateFixture.processId,
        payload: runningProcessSurfaceFixture,
      }),
    ).toThrow(/payload\.processId/i);
  });

  it('ignores process messages for another process surface', () => {
    const crossProcessMessage = liveProcessUpdateMessageSchema.parse({
      ...processSnapshotLiveFixture,
      processId: runningProcessSurfaceFixture.processId,
      entityId: runningProcessSurfaceFixture.processId,
      payload: runningProcessSurfaceFixture,
    });

    const nextState = applyLiveProcessMessage({
      state: connectedProcessSurfaceStateFixture,
      message: crossProcessMessage,
    });

    expect(nextState).toBe(connectedProcessSurfaceStateFixture);
  });

  it('TC-2.4a waiting transition is reflected in the visible process state', () => {
    const state = buildRunningSurfaceState();
    const waitingMessage = buildLiveProcessMessageFixture({
      messageType: 'upsert',
      entityType: 'process',
      sequenceNumber: 2,
      payload: processSurfaceSummarySchema.parse({
        ...waitingProcessSurfaceFixture,
        processId: state.processId,
      }),
    });

    const nextState = applyLiveProcessMessage({
      state,
      message: waitingMessage,
    });

    expect(nextState.process).toMatchObject({
      processId: state.processId,
      status: 'waiting',
      nextActionLabel: waitingProcessSurfaceFixture.nextActionLabel,
      availableActions: ['respond'],
    });
  });

  it('TC-2.4 paused transition is reflected in the visible process state', () => {
    const state = buildRunningSurfaceState();
    const pausedMessage = buildLiveProcessMessageFixture({
      messageType: 'upsert',
      entityType: 'process',
      sequenceNumber: 2,
      payload: processSurfaceSummarySchema.parse({
        ...pausedProcessSurfaceFixture,
        processId: state.processId,
      }),
    });

    const nextState = applyLiveProcessMessage({
      state,
      message: pausedMessage,
    });

    expect(nextState.process).toMatchObject({
      processId: state.processId,
      status: 'paused',
      nextActionLabel: pausedProcessSurfaceFixture.nextActionLabel,
      availableActions: ['resume'],
    });
  });

  it('TC-2.4b completed transition is reflected in the visible process state', () => {
    const state = buildRunningSurfaceState();
    const completedMessage = buildLiveProcessMessageFixture({
      messageType: 'complete',
      entityType: 'process',
      sequenceNumber: 2,
      completedAt: '2026-04-13T12:28:00.000Z',
      payload: processSurfaceSummarySchema.parse({
        ...completedProcessSurfaceFixture,
        processId: state.processId,
      }),
    });

    const nextState = applyLiveProcessMessage({
      state,
      message: completedMessage,
    });

    expect(nextState.process).toMatchObject({
      processId: state.processId,
      status: 'completed',
      nextActionLabel: null,
      availableActions: ['review'],
    });
  });

  it('TC-2.4c failed and interrupted transitions are reflected in the visible process state', () => {
    const failedState = applyLiveProcessMessage({
      state: buildRunningSurfaceState(),
      message: buildLiveProcessMessageFixture({
        messageType: 'complete',
        entityType: 'process',
        sequenceNumber: 2,
        completedAt: '2026-04-13T12:31:00.000Z',
        payload: processSurfaceSummarySchema.parse({
          ...failedProcessSurfaceFixture,
          processId: runningProcessSurfaceFixture.processId,
        }),
      }),
    });

    const interruptedState = applyLiveProcessMessage({
      state: buildRunningSurfaceState(),
      message: buildLiveProcessMessageFixture({
        messageType: 'complete',
        entityType: 'process',
        sequenceNumber: 2,
        completedAt: '2026-04-13T12:33:00.000Z',
        payload: processSurfaceSummarySchema.parse({
          ...interruptedProcessSurfaceFixture,
          processId: runningProcessSurfaceFixture.processId,
        }),
      }),
    });

    expect(failedState.process).toMatchObject({
      processId: runningProcessSurfaceFixture.processId,
      status: 'failed',
      nextActionLabel: failedProcessSurfaceFixture.nextActionLabel,
      availableActions: ['review', 'restart'],
    });
    expect(interruptedState.process).toMatchObject({
      processId: runningProcessSurfaceFixture.processId,
      status: 'interrupted',
      nextActionLabel: interruptedProcessSurfaceFixture.nextActionLabel,
      availableActions: ['resume', 'review', 'restart'],
    });
  });

  it('TC-4.3a phase changes replace the visible materials envelope', () => {
    const nextState = applyLiveProcessMessage({
      state: buildConnectedMaterialsState(materialsPhaseChangeUpsertLiveFixture.sequenceNumber - 1),
      message: materialsPhaseChangeUpsertLiveFixture,
    });

    expect(nextState.materials).toEqual(phaseChangedProcessMaterialsFixture);
    expect(nextState.materials?.currentArtifacts).toEqual(
      phaseChangedProcessMaterialsFixture.currentArtifacts,
    );
    expect(nextState.materials?.currentArtifacts).not.toEqual(
      readyProcessMaterialsFixture.currentArtifacts,
    );
    expect(nextState.materials?.currentSources).not.toEqual(
      readyProcessMaterialsFixture.currentSources,
    );
  });

  it('TC-4.3b output revision updates replace the current output context', () => {
    const nextState = applyLiveProcessMessage({
      state: buildConnectedMaterialsState(materialsRevisionUpsertLiveFixture.sequenceNumber - 1),
      message: materialsRevisionUpsertLiveFixture,
    });

    expect(nextState.materials).toEqual(revisedOutputProcessMaterialsFixture);
    expect(nextState.materials?.currentOutputs).toEqual(
      revisedOutputProcessMaterialsFixture.currentOutputs,
    );
    expect(nextState.materials?.currentOutputs).not.toEqual(
      readyProcessMaterialsFixture.currentOutputs,
    );
  });

  it('TC-4.4b empty materials snapshots clear stale prior materials context', () => {
    const nextState = applyLiveProcessMessage({
      state: buildConnectedMaterialsState(materialsClearedSnapshotLiveFixture.sequenceNumber - 1),
      message: materialsClearedSnapshotLiveFixture,
    });

    expect(nextState.materials).toEqual(emptyProcessMaterialsFixture);
    expect(nextState.materials?.currentArtifacts).toHaveLength(0);
    expect(nextState.materials?.currentOutputs).toHaveLength(0);
    expect(nextState.materials?.currentSources).toHaveLength(0);
  });

  it('applies side-work upserts as a replacement of the visible side-work summary state', () => {
    const nextState = applyLiveProcessMessage({
      state: buildConnectedSideWorkState(sideWorkUpsertLiveFixture.sequenceNumber - 1),
      message: sideWorkUpsertLiveFixture,
    });

    expect(nextState.sideWork).toEqual(readySideWorkFixture);
    expect(nextState.sideWork?.items[0]?.status).toBe('running');
    expect(nextState.sideWork?.items[1]?.status).toBe('completed');
  });

  it('TC-2.3a progress updates appear as readable process-facing activity', () => {
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        history: {
          status: 'ready',
          items: [],
        },
        live: {
          connectionState: 'connected',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: historyUpsertLiveFixture.sequenceNumber - 1,
          error: null,
        },
      },
      message: historyUpsertLiveFixture,
    });

    expect(nextState.history?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          historyItemId: progressUpdateHistoryFixture.historyItemId,
          kind: 'progress_update',
          text: progressUpdateHistoryFixture.text,
        }),
      ]),
    );
  });

  it('TC-2.3b new history activity appears in chronological order', () => {
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        history: {
          status: 'ready',
          items: [
            {
              ...progressUpdateHistoryFixture,
              historyItemId: 'history-progress-late-001',
              createdAt: '2026-04-13T12:10:00.000Z',
            },
          ],
        },
        live: {
          connectionState: 'connected',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: 1,
          error: null,
        },
      },
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'history',
        entityId: userMessageHistoryFixture.historyItemId,
        sequenceNumber: 2,
        payload: userMessageHistoryFixture,
      }),
    });

    expect(nextState.history?.items.map((item) => item.historyItemId)).toEqual([
      userMessageHistoryFixture.historyItemId,
      'history-progress-late-001',
    ]);
  });

  it('TC-6.3b reconnect snapshots do not duplicate finalized history items', () => {
    const reconnectSnapshot = buildLiveProcessMessageFixture({
      messageType: 'snapshot',
      entityType: 'history',
      subscriptionId: 'subscription-002',
      sequenceNumber: 1,
      entityId: userMessageHistoryFixture.historyItemId,
      payload: userMessageHistoryFixture,
    });
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        history: {
          status: 'ready',
          items: [userMessageHistoryFixture],
        },
        live: {
          connectionState: 'reconnecting',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: 12,
          error: null,
        },
      },
      message: reconnectSnapshot,
    });

    expect(nextState.history?.items).toHaveLength(1);
    expect(nextState.history?.items[0]?.historyItemId).toBe(
      userMessageHistoryFixture.historyItemId,
    );
  });
});
