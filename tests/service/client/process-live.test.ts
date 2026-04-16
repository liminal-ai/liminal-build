// @vitest-environment jsdom

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { applyLiveProcessMessage } from '../../../apps/platform/client/app/process-live.js';
import { renderProcessEnvironmentPanel } from '../../../apps/platform/client/features/processes/process-environment-panel.js';
import { buildProcessSurfaceSummary } from '../../../apps/platform/server/services/processes/process-work-surface.service.js';
import {
  deriveEnvironmentStatusLabel,
  liveProcessUpdateMessageSchema,
  processSummarySchema,
  processSurfaceStateSchema,
  processSurfaceSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  buildLiveProcessMessageFixture,
  connectedProcessSurfaceStateFixture,
  environmentFailedUpsertLiveFixture,
  environmentPreparingUpsertLiveFixture,
  environmentRehydratingUpsertLiveFixture,
  environmentReadyUpsertLiveFixture,
  environmentRunningUpsertLiveFixture,
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
  buildEnvironmentSummaryFixture,
  checkpointSucceededEnvironmentFixture,
  failedEnvironmentFixture,
  rehydratingEnvironmentFixture,
  rebuildingEnvironmentFixture,
  runningEnvironmentFixture,
} from '../../fixtures/process-environment.js';
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
  readyProcessHistoryFixture,
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

function buildConnectedExecutionState(lastSequenceNumber: number) {
  return processSurfaceStateSchema.parse({
    ...buildRunningSurfaceState(),
    history: {
      status: 'ready',
      items: [progressUpdateHistoryFixture],
    },
    materials: readyProcessMaterialsFixture,
    environment: runningEnvironmentFixture,
    live: {
      connectionState: 'connected',
      subscriptionId: 'subscription-001',
      lastSequenceNumber,
      error: null,
    },
  });
}

function createDocument() {
  return new JSDOM('<!doctype html><html><body></body></html>').window.document;
}

function buildExecutionFailureEnvironment() {
  return buildEnvironmentSummaryFixture({
    ...failedEnvironmentFixture,
    statusLabel: 'provider.exec.stderr.chunk',
    blockedReason: 'Execution failed after active work began.',
  });
}

function applyExecutionFailurePublication(state: ReturnType<typeof buildConnectedExecutionState>) {
  const failedEnvironment = buildExecutionFailureEnvironment();
  const currentProcess = processSummarySchema.parse({
    processId: state.process?.processId ?? runningProcessSurfaceFixture.processId,
    displayLabel: state.process?.displayLabel ?? runningProcessSurfaceFixture.displayLabel,
    processType: state.process?.processType ?? runningProcessSurfaceFixture.processType,
    status: state.process?.status ?? runningProcessSurfaceFixture.status,
    phaseLabel: state.process?.phaseLabel ?? runningProcessSurfaceFixture.phaseLabel,
    nextActionLabel: state.process?.nextActionLabel ?? runningProcessSurfaceFixture.nextActionLabel,
    availableActions: ['review'],
    hasEnvironment: state.process?.hasEnvironment ?? runningProcessSurfaceFixture.hasEnvironment,
    updatedAt: state.process?.updatedAt ?? runningProcessSurfaceFixture.updatedAt,
  });
  const processMessage = buildLiveProcessMessageFixture({
    messageType: 'upsert',
    entityType: 'process',
    processId: state.processId ?? runningProcessSurfaceFixture.processId,
    sequenceNumber: (state.live.lastSequenceNumber ?? 0) + 1,
    payload: buildProcessSurfaceSummary(currentProcess, failedEnvironment),
  });
  const stateWithProcess = applyLiveProcessMessage({
    state,
    message: processMessage,
  });
  const environmentMessage = buildLiveProcessMessageFixture({
    messageType: 'upsert',
    entityType: 'environment',
    processId: stateWithProcess.processId ?? runningProcessSurfaceFixture.processId,
    sequenceNumber: (state.live.lastSequenceNumber ?? 0) + 2,
    payload: failedEnvironment,
  });

  return {
    failedEnvironment,
    nextState: applyLiveProcessMessage({
      state: stateWithProcess,
      message: environmentMessage,
    }),
  };
}

describe('process live foundation', () => {
  it('TC-2.3a hydration progress becomes visible through environment live updates', () => {
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        live: {
          connectionState: 'connected',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: environmentPreparingUpsertLiveFixture.sequenceNumber - 1,
          error: null,
        },
      },
      message: environmentPreparingUpsertLiveFixture,
    });

    expect(nextState.environment).toMatchObject({
      state: 'preparing',
      statusLabel: 'Preparing environment',
    });
    expect(nextState.process).toEqual(connectedProcessSurfaceStateFixture.process);
  });

  it('TC-2.3b hydration failure becomes visible through environment live updates', () => {
    const nextState = applyLiveProcessMessage({
      state: {
        ...connectedProcessSurfaceStateFixture,
        live: {
          connectionState: 'connected',
          subscriptionId: 'subscription-001',
          lastSequenceNumber: environmentFailedUpsertLiveFixture.sequenceNumber - 1,
          error: null,
        },
      },
      message: environmentFailedUpsertLiveFixture,
    });

    expect(nextState.environment).toMatchObject({
      state: 'failed',
      statusLabel: 'Environment failed',
      blockedReason: expect.stringContaining('Preparation failed'),
      lastCheckpointResult: null,
    });
  });

  it('TC-2.4a running begins after readiness', () => {
    const baseState = {
      ...connectedProcessSurfaceStateFixture,
      live: {
        connectionState: 'connected' as const,
        subscriptionId: 'subscription-001',
        lastSequenceNumber: environmentPreparingUpsertLiveFixture.sequenceNumber - 1,
        error: null,
      },
    };

    const preparingState = applyLiveProcessMessage({
      state: baseState,
      message: environmentPreparingUpsertLiveFixture,
    });
    expect(preparingState.environment?.state).toBe('preparing');

    const readyState = applyLiveProcessMessage({
      state: preparingState,
      message: environmentReadyUpsertLiveFixture,
    });
    expect(readyState.environment?.state).toBe('ready');

    const runningState = applyLiveProcessMessage({
      state: readyState,
      message: environmentRunningUpsertLiveFixture,
    });
    expect(runningState.environment).toMatchObject({
      state: 'running',
      statusLabel: 'Running in environment',
      lastHydratedAt: expect.any(String),
    });
  });

  it('TC-2.4b running does not begin after failed preparation', () => {
    const baseState = {
      ...connectedProcessSurfaceStateFixture,
      live: {
        connectionState: 'connected' as const,
        subscriptionId: 'subscription-001',
        lastSequenceNumber: environmentPreparingUpsertLiveFixture.sequenceNumber - 1,
        error: null,
      },
    };

    const preparingState = applyLiveProcessMessage({
      state: baseState,
      message: environmentPreparingUpsertLiveFixture,
    });
    expect(preparingState.environment?.state).toBe('preparing');

    const failedState = applyLiveProcessMessage({
      state: preparingState,
      message: environmentFailedUpsertLiveFixture,
    });
    expect(failedState.environment?.state).toBe('failed');
    expect(failedState.environment?.state).not.toBe('running');
    expect(failedState.environment?.blockedReason).not.toBeNull();
  });

  it('TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution', () => {
    const nextState = applyLiveProcessMessage({
      state: buildConnectedExecutionState(1),
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'process',
        sequenceNumber: 2,
        payload: processSurfaceSummarySchema.parse({
          ...waitingProcessSurfaceFixture,
          processId: runningProcessSurfaceFixture.processId,
        }),
      }),
    });

    expect(nextState.process?.status).toBe('waiting');
    expect(nextState.environment?.state).not.toBe('running');
  });

  it('TC-3.3b reducer applies checkpointing as a distinct coherent state', () => {
    const state = buildConnectedExecutionState(1);
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        processId: state.processId ?? runningProcessSurfaceFixture.processId,
        sequenceNumber: 2,
        payload: buildEnvironmentSummaryFixture({
          ...runningEnvironmentFixture,
          state: 'checkpointing',
          statusLabel: 'provider.exec.raw.checkpoint-fragment',
        }),
      }),
    });

    expect(nextState.environment).toMatchObject({
      state: 'checkpointing',
      statusLabel: deriveEnvironmentStatusLabel('checkpointing'),
    });
  });

  it('TC-3.4a execution failure preserves process identity, history, and materials visibility', () => {
    const state = buildConnectedExecutionState(1);
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        processId: state.processId ?? runningProcessSurfaceFixture.processId,
        sequenceNumber: 2,
        payload: buildEnvironmentSummaryFixture({
          ...failedEnvironmentFixture,
          statusLabel: 'provider.exec.stderr.chunk',
          blockedReason: 'Execution failed after active work began.',
        }),
      }),
    });

    expect(nextState.process?.processId).toBe(state.process?.processId);
    expect(nextState.history).toEqual(state.history);
    expect(nextState.materials).toEqual(state.materials);
    expect(nextState.environment).toMatchObject({
      state: 'failed',
      statusLabel: deriveEnvironmentStatusLabel('failed'),
      blockedReason: 'Execution failed after active work began.',
    });
  });

  it('TC-3.4b execution failure republishes recovery controls without refetch', () => {
    const { nextState } = applyExecutionFailurePublication(buildConnectedExecutionState(1));
    const environmentPanel = renderProcessEnvironmentPanel({
      environment: nextState.environment,
      targetDocument: createDocument(),
    });

    expect(nextState.process?.availableActions).toEqual(
      expect.arrayContaining(['rehydrate', 'rebuild']),
    );
    expect(nextState.process?.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionId: 'rehydrate',
          enabled: true,
        }),
        expect.objectContaining({
          actionId: 'rebuild',
          enabled: true,
        }),
      ]),
    );
    expect(environmentPanel.getAttribute('data-environment-state')).toBe('failed');
    expect(environmentPanel.textContent).toContain(
      `State: ${deriveEnvironmentStatusLabel('failed')}`,
    );
  });

  it('environment updates do not wipe unrelated history state', () => {
    const state = buildConnectedExecutionState(1);
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        processId: state.processId ?? runningProcessSurfaceFixture.processId,
        sequenceNumber: 2,
        payload: buildExecutionFailureEnvironment(),
      }),
    });

    expect(nextState.history).toEqual(state.history);
  });

  it('TC-6.4b environment checkpoint visibility remains separate from finalized history', () => {
    const state = processSurfaceStateSchema.parse({
      ...connectedProcessSurfaceStateFixture,
      history: readyProcessHistoryFixture,
      environment: checkpointSucceededEnvironmentFixture,
      live: {
        connectionState: 'connected',
        subscriptionId: 'subscription-001',
        lastSequenceNumber: 10,
        error: null,
      },
    });
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        entityId: 'environment',
        processId:
          state.processId ?? connectedProcessSurfaceStateFixture.processId ?? 'process-001',
        sequenceNumber: 11,
        payload: buildEnvironmentSummaryFixture({
          ...checkpointSucceededEnvironmentFixture,
        }),
      }),
    });

    expect(nextState.history).toEqual(readyProcessHistoryFixture);
    expect(nextState.history?.items.map((item) => item.historyItemId)).toEqual(
      readyProcessHistoryFixture.items.map((item) => item.historyItemId),
    );
    expect(nextState.environment?.lastCheckpointResult).toEqual(
      checkpointSucceededEnvironmentFixture.lastCheckpointResult,
    );
  });

  it('environment updates do not wipe unrelated materials state', () => {
    const state = buildConnectedExecutionState(1);
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        processId: state.processId ?? runningProcessSurfaceFixture.processId,
        sequenceNumber: 2,
        payload: buildExecutionFailureEnvironment(),
      }),
    });

    expect(nextState.materials).toEqual(state.materials);
  });

  it('TC-5.2b rehydrate keeps the latest checkpoint result visible while recovery is in progress', () => {
    const state = processSurfaceStateSchema.parse({
      ...connectedProcessSurfaceStateFixture,
      environment: checkpointSucceededEnvironmentFixture,
      live: {
        connectionState: 'connected',
        subscriptionId: 'subscription-001',
        lastSequenceNumber: environmentRehydratingUpsertLiveFixture.sequenceNumber - 1,
        error: null,
      },
    });
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        entityId: 'environment',
        processId:
          state.processId ?? connectedProcessSurfaceStateFixture.processId ?? 'process-001',
        sequenceNumber: environmentRehydratingUpsertLiveFixture.sequenceNumber,
        payload: buildEnvironmentSummaryFixture({
          ...rehydratingEnvironmentFixture,
          lastCheckpointAt: null,
          lastCheckpointResult: null,
        }),
      }),
    });

    expect(nextState.environment).toMatchObject({
      state: 'rehydrating',
      lastCheckpointResult: checkpointSucceededEnvironmentFixture.lastCheckpointResult,
    });
  });

  it('TC-5.4b rebuilding keeps the latest checkpoint result visible while recovery is in progress', () => {
    const state = processSurfaceStateSchema.parse({
      ...connectedProcessSurfaceStateFixture,
      environment: checkpointSucceededEnvironmentFixture,
      live: {
        connectionState: 'connected',
        subscriptionId: 'subscription-001',
        lastSequenceNumber: 16,
        error: null,
      },
    });
    const nextState = applyLiveProcessMessage({
      state,
      message: buildLiveProcessMessageFixture({
        messageType: 'upsert',
        entityType: 'environment',
        entityId: 'environment',
        processId:
          state.processId ?? connectedProcessSurfaceStateFixture.processId ?? 'process-001',
        sequenceNumber: 17,
        payload: buildEnvironmentSummaryFixture({
          ...rebuildingEnvironmentFixture,
          lastCheckpointAt: null,
          lastCheckpointResult: null,
        }),
      }),
    });

    expect(nextState.environment).toMatchObject({
      state: 'rebuilding',
      lastCheckpointResult: checkpointSucceededEnvironmentFixture.lastCheckpointResult,
    });
  });

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

  it('waiting transition is reflected in the visible process state', () => {
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

  it('completed transition is reflected in the visible process state', () => {
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
      availableActions: ['review', 'restart', 'rehydrate', 'rebuild'],
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

  it('progress updates appear as readable process-facing activity', () => {
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

  it('new history activity appears in chronological order', () => {
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
