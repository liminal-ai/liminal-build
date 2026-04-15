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
  disabledReasons: {
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is only available when the process is paused or interrupted.',
    rehydrate: 'Rehydrate is unavailable because no working copy exists yet.',
    rebuild: 'Rebuild is unavailable because no prior working copy has been created.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const runningProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is only available when the process is paused or interrupted.',
    rehydrate: 'Rehydrate is unavailable because the environment is actively running.',
    rebuild: 'Rebuild is unavailable while the environment is actively running.',
    restart: 'Restart is unavailable while the environment is actively running.',
  },
});

export const waitingProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['respond'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    resume: 'Resume is only available when the process is paused or interrupted.',
    rehydrate: 'Rehydrate is unavailable because no working copy exists yet.',
    rebuild: 'Rebuild is unavailable because no prior working copy has been created.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const pausedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['resume'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    respond: 'Respond is only available when the process is waiting for input.',
    rehydrate: 'Rehydrate is unavailable because no working copy exists yet.',
    rebuild: 'Rebuild is unavailable because no prior working copy has been created.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const completedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is only available when the process is paused or interrupted.',
    rehydrate: 'Rehydrate is unavailable because no working copy exists yet.',
    rebuild: 'Rebuild is unavailable because no prior working copy has been created.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const failedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review', 'restart', 'rehydrate', 'rebuild'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is only available when the process is paused or interrupted.',
  },
});

export const interruptedProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['resume', 'review', 'restart'],
  disabledReasons: {
    start: 'Start is only available while the process is in Draft.',
    respond: 'Respond is only available when the process is waiting for input.',
    rehydrate: 'Rehydrate is unavailable because no working copy exists yet.',
    rebuild: 'Rebuild is unavailable because no prior working copy has been created.',
  },
});

export const preparingEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Start is unavailable while the environment is preparing.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is unavailable while the environment is preparing.',
    rehydrate: 'Rehydrate is unavailable while the environment is preparing.',
    rebuild: 'Rebuild is unavailable while the environment is preparing.',
    restart: 'Restart is unavailable while the environment is preparing.',
  },
});

export const readyEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['start'],
  disabledReasons: {
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is only available when the process is paused or interrupted.',
    rehydrate: 'Rehydrate is only available when the environment is stale or recoverably failed.',
    rebuild: 'Rebuild is only available after the environment is lost or unrecoverable.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const checkpointingEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Start is unavailable while checkpointing is settling.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is unavailable while checkpointing is settling.',
    rehydrate: 'Rehydrate is unavailable while checkpointing is settling.',
    rebuild: 'Rebuild is unavailable while checkpointing is settling.',
    restart: 'Restart is unavailable while checkpointing is settling.',
  },
});

export const staleEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['rehydrate'],
  disabledReasons: {
    start: 'Rehydrate the environment before starting the process.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Rehydrate the environment before resuming the process.',
    rebuild: 'Rebuild is only available after the environment is lost or unrecoverable.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const lostEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['rebuild'],
  disabledReasons: {
    start: 'Rebuild the environment before starting the process.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Rebuild the environment before resuming the process.',
    rehydrate: 'Rehydrate is unavailable because no recoverable working copy remains.',
    review: 'Review is only available once the process has produced work to inspect.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});

export const rebuildingEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Start is unavailable while the environment is rebuilding.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Resume is unavailable while the environment is rebuilding.',
    rehydrate: 'Rehydrate is unavailable while the environment is rebuilding.',
    rebuild: 'Rebuild is already in progress.',
    restart: 'Restart is unavailable while the environment is rebuilding.',
  },
});

export const unavailableEnvironmentProcessControlsFixture = buildProcessSurfaceControls({
  availableActions: ['review'],
  disabledReasons: {
    start: 'Environment lifecycle work is currently unavailable.',
    respond: 'Respond is only available when the process is waiting for input.',
    resume: 'Environment lifecycle work is currently unavailable.',
    rehydrate: 'Environment lifecycle work is currently unavailable.',
    rebuild: 'Environment lifecycle work is currently unavailable.',
    restart: 'Restart is only available after the process fails or is interrupted.',
  },
});
