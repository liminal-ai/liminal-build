import {
  buildProcessSurfaceControls,
  processSurfaceControlOrder,
} from '../../apps/platform/shared/contracts/index.js';

export const stableProcessControlOrderFixture = [...processSurfaceControlOrder];

export const defaultProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: [],
});

export const draftProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['start'],
});

export const runningProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
});

export const waitingProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['respond'],
});

export const pausedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['resume'],
});

export const completedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
});

export const failedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review', 'restart'],
});

export const interruptedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['resume', 'review', 'restart'],
});

export const staleEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['rehydrate'],
  disabledReasons: {
    rebuild: 'Rebuild is only available after the environment is lost or unrecoverable.',
  },
});

export const lostEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['rebuild'],
  disabledReasons: {
    rehydrate: 'Rehydrate is unavailable because no recoverable working copy remains.',
  },
});
