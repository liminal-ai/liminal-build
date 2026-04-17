import {
  currentProcessRequestSchema,
  type CurrentProcessRequest,
  type EnvironmentSummary,
  type ProcessHistorySectionEnvelope,
  type ProcessMaterialsSectionEnvelope,
  type ProcessSurfaceSummary,
  type ProcessWorkSurfaceResponse,
  type SideWorkSectionEnvelope,
  processSurfaceProjectSchema,
  processSurfaceSummarySchema,
  processWorkSurfaceResponseSchema,
  rebuildProcessResponseSchema,
  rehydrateProcessResponseSchema,
  resumeProcessResponseSchema,
  requestErrorSchema,
  startProcessResponseSchema,
  submitProcessResponseResponseSchema,
} from '../../apps/platform/shared/contracts/index.js';
import {
  emptyProcessHistoryFixture,
  errorProcessHistoryFixture,
  readyProcessHistoryFixture,
} from './process-history.js';
import {
  emptyProcessMaterialsFixture,
  errorProcessMaterialsFixture,
  readyProcessMaterialsFixture,
  writableProcessMaterialsFixture,
} from './materials.js';
import {
  checkpointingEnvironmentProcessControlsFixture,
  completedProcessControlsFixture,
  draftProcessControlsFixture,
  failedProcessControlsFixture,
  interruptedProcessControlsFixture,
  lostEnvironmentProcessControlsFixture,
  pausedProcessControlsFixture,
  preparingEnvironmentProcessControlsFixture,
  readyEnvironmentProcessControlsFixture,
  rebuildingEnvironmentProcessControlsFixture,
  runningProcessControlsFixture,
  staleEnvironmentProcessControlsFixture,
  unavailableEnvironmentProcessControlsFixture,
  waitingProcessControlsFixture,
} from './process-controls.js';
import {
  absentEnvironmentFixture,
  codeCheckpointSucceededEnvironmentFixture,
  checkpointSucceededEnvironmentFixture,
  lostEnvironmentFixture,
  preparingEnvironmentFixture,
  rehydratingEnvironmentFixture,
  readyEnvironmentFixture,
  staleEnvironmentFixture,
  unavailableEnvironmentFixture,
} from './process-environment.js';
import { emptySideWorkFixture, errorSideWorkFixture, readySideWorkFixture } from './side-work.js';

export const processSurfaceProjectFixture = processSurfaceProjectSchema.parse({
  projectId: 'project-surface-001',
  name: 'Liminal Build Platform',
  role: 'owner',
});

const baseProcessSurfaceSummary = {
  processId: 'process-surface-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification' as const,
  phaseLabel: 'Clarifying scope',
  nextActionLabel: 'Review the current direction',
  updatedAt: '2026-04-13T12:18:00.000Z',
};

export function buildProcessSurfaceSummaryFixture(
  overrides: Partial<ProcessSurfaceSummary>,
): ProcessSurfaceSummary {
  return processSurfaceSummarySchema.parse({
    ...baseProcessSurfaceSummary,
    status: 'draft',
    availableActions: ['start'],
    controls: draftProcessControlsFixture,
    hasEnvironment: false,
    ...overrides,
  });
}

export function buildProcessWorkSurfaceFixture(
  overrides: Partial<{
    project: typeof processSurfaceProjectFixture;
    process: ProcessSurfaceSummary;
    history: ProcessHistorySectionEnvelope;
    materials: ProcessMaterialsSectionEnvelope;
    currentRequest: CurrentProcessRequest | null;
    sideWork: SideWorkSectionEnvelope;
    environment: EnvironmentSummary;
  }>,
): ProcessWorkSurfaceResponse {
  return processWorkSurfaceResponseSchema.parse({
    project: processSurfaceProjectFixture,
    process: waitingProcessSurfaceFixture,
    history: readyProcessHistoryFixture,
    materials: readyProcessMaterialsFixture,
    currentRequest: currentProcessRequestFixture,
    sideWork: readySideWorkFixture,
    environment: absentEnvironmentFixture,
    ...overrides,
  });
}

export const draftProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  status: 'draft',
  availableActions: ['start'],
  controls: draftProcessControlsFixture,
  hasEnvironment: false,
});

export const runningProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-running-001',
  status: 'running',
  nextActionLabel: 'Monitor progress in the work surface',
  availableActions: ['review'],
  controls: runningProcessControlsFixture,
  hasEnvironment: false,
});

export const waitingProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-waiting-001',
  status: 'waiting',
  nextActionLabel: 'Respond to the current request',
  availableActions: ['respond'],
  controls: waitingProcessControlsFixture,
  hasEnvironment: false,
});

export const pausedProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-paused-001',
  status: 'paused',
  nextActionLabel: 'Resume the process to continue working',
  availableActions: ['resume'],
  controls: pausedProcessControlsFixture,
  hasEnvironment: false,
});

export const interruptedProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-interrupted-001',
  status: 'interrupted',
  nextActionLabel: 'Resume the process to continue working',
  availableActions: ['resume', 'review', 'restart'],
  controls: interruptedProcessControlsFixture,
  hasEnvironment: false,
});

export const completedProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-completed-001',
  status: 'completed',
  nextActionLabel: null,
  availableActions: ['review'],
  controls: completedProcessControlsFixture,
  hasEnvironment: false,
});

export const failedProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-failed-001',
  status: 'failed',
  nextActionLabel: 'Investigate the failure before retrying',
  availableActions: ['review', 'restart', 'rehydrate', 'rebuild'],
  controls: failedProcessControlsFixture,
  hasEnvironment: false,
});

export const preparingEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-preparing-001',
  status: 'draft',
  availableActions: ['start'],
  controls: preparingEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const readyEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-ready-environment-001',
  status: 'draft',
  availableActions: ['start'],
  controls: readyEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const checkpointingEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-checkpointing-001',
  status: 'running',
  availableActions: ['review'],
  controls: checkpointingEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const staleEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-stale-environment-001',
  status: 'paused',
  availableActions: ['rehydrate'],
  controls: staleEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const lostEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-lost-environment-001',
  status: 'interrupted',
  availableActions: ['rebuild'],
  controls: lostEnvironmentProcessControlsFixture,
  hasEnvironment: false,
});

export const rebuildingEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-rebuilding-001',
  status: 'running',
  availableActions: ['review'],
  controls: rebuildingEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const unavailableEnvironmentProcessSurfaceFixture = buildProcessSurfaceSummaryFixture({
  processId: 'process-surface-unavailable-environment-001',
  status: 'running',
  availableActions: ['review'],
  controls: unavailableEnvironmentProcessControlsFixture,
  hasEnvironment: true,
});

export const currentProcessRequestFixture = currentProcessRequestSchema.parse({
  requestId: 'request-001',
  requestKind: 'approval',
  promptText: 'Approve the current scope before moving into review.',
  requiredActionLabel: 'Approve scope',
  createdAt: '2026-04-13T12:06:00.000Z',
});

export const followUpCurrentProcessRequestFixture = currentProcessRequestSchema.parse({
  requestId: 'request-002',
  requestKind: 'clarification',
  promptText: 'Clarify the target user before the process continues.',
  requiredActionLabel: 'Clarify target user',
  createdAt: '2026-04-13T12:22:00.000Z',
});

export const readyProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: waitingProcessSurfaceFixture,
  history: readyProcessHistoryFixture,
  materials: readyProcessMaterialsFixture,
  currentRequest: currentProcessRequestFixture,
  sideWork: readySideWorkFixture,
  environment: absentEnvironmentFixture,
});

export const earlyProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: draftProcessSurfaceFixture,
  history: emptyProcessHistoryFixture,
  materials: emptyProcessMaterialsFixture,
  currentRequest: null,
  sideWork: emptySideWorkFixture,
  environment: absentEnvironmentFixture,
});

export const pausedProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: pausedProcessSurfaceFixture,
  history: emptyProcessHistoryFixture,
  materials: emptyProcessMaterialsFixture,
  currentRequest: null,
  sideWork: emptySideWorkFixture,
  environment: absentEnvironmentFixture,
});

export const interruptedProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: interruptedProcessSurfaceFixture,
  history: emptyProcessHistoryFixture,
  materials: emptyProcessMaterialsFixture,
  currentRequest: null,
  sideWork: emptySideWorkFixture,
  environment: absentEnvironmentFixture,
});

export const degradedProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: runningProcessSurfaceFixture,
  history: errorProcessHistoryFixture,
  materials: errorProcessMaterialsFixture,
  currentRequest: null,
  sideWork: errorSideWorkFixture,
  environment: absentEnvironmentFixture,
});

export const readyEnvironmentProcessWorkSurfaceFixture = buildProcessWorkSurfaceFixture({
  process: readyEnvironmentProcessSurfaceFixture,
  currentRequest: null,
  environment: readyEnvironmentFixture,
});

export const preparingEnvironmentProcessWorkSurfaceFixture = buildProcessWorkSurfaceFixture({
  process: preparingEnvironmentProcessSurfaceFixture,
  currentRequest: null,
  environment: preparingEnvironmentFixture,
});

export const staleEnvironmentProcessWorkSurfaceFixture = buildProcessWorkSurfaceFixture({
  process: staleEnvironmentProcessSurfaceFixture,
  currentRequest: null,
  environment: staleEnvironmentFixture,
});

export const lostEnvironmentProcessWorkSurfaceFixture = buildProcessWorkSurfaceFixture({
  process: lostEnvironmentProcessSurfaceFixture,
  currentRequest: null,
  environment: lostEnvironmentFixture,
});

export const checkpointedAbsentEnvironmentProcessWorkSurfaceFixture =
  buildProcessWorkSurfaceFixture({
    process: pausedProcessSurfaceFixture,
    currentRequest: null,
    environment: {
      ...absentEnvironmentFixture,
      lastCheckpointAt: checkpointSucceededEnvironmentFixture.lastCheckpointAt,
      lastCheckpointResult: checkpointSucceededEnvironmentFixture.lastCheckpointResult,
    },
  });

export const codeCheckpointedAbsentEnvironmentProcessWorkSurfaceFixture =
  buildProcessWorkSurfaceFixture({
    process: pausedProcessSurfaceFixture,
    materials: writableProcessMaterialsFixture,
    currentRequest: null,
    environment: {
      ...absentEnvironmentFixture,
      lastCheckpointAt: codeCheckpointSucceededEnvironmentFixture.lastCheckpointAt,
      lastCheckpointResult: codeCheckpointSucceededEnvironmentFixture.lastCheckpointResult,
    },
  });

export const unavailableEnvironmentProcessWorkSurfaceFixture = buildProcessWorkSurfaceFixture({
  process: unavailableEnvironmentProcessSurfaceFixture,
  currentRequest: null,
  environment: unavailableEnvironmentFixture,
});

export const startedProcessResponseFixture = startProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...runningProcessSurfaceFixture,
    processId: draftProcessSurfaceFixture.processId,
    phaseLabel: draftProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:20:00.000Z',
  }),
  currentRequest: null,
  environment: preparingEnvironmentFixture,
});

export const startedWaitingProcessResponseFixture = startProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...waitingProcessSurfaceFixture,
    processId: draftProcessSurfaceFixture.processId,
    phaseLabel: draftProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:21:00.000Z',
  }),
  currentRequest: currentProcessRequestFixture,
  environment: preparingEnvironmentFixture,
});

export const resumedPausedProcessResponseFixture = resumeProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...runningProcessSurfaceFixture,
    processId: pausedProcessSurfaceFixture.processId,
    phaseLabel: pausedProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:24:00.000Z',
  }),
  currentRequest: null,
  environment: preparingEnvironmentFixture,
});

export const resumedPausedToCompletedProcessResponseFixture = resumeProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...completedProcessSurfaceFixture,
    processId: pausedProcessSurfaceFixture.processId,
    phaseLabel: pausedProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:25:00.000Z',
  }),
  currentRequest: null,
  environment: absentEnvironmentFixture,
});

export const resumedInterruptedProcessResponseFixture = resumeProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...runningProcessSurfaceFixture,
    processId: interruptedProcessSurfaceFixture.processId,
    phaseLabel: interruptedProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:27:00.000Z',
  }),
  currentRequest: null,
  environment: preparingEnvironmentFixture,
});

export const rehydratedProcessResponseFixture = rehydrateProcessResponseSchema.parse({
  accepted: true,
  process: processSurfaceSummarySchema.parse({
    ...staleEnvironmentProcessSurfaceFixture,
    updatedAt: '2026-04-13T12:31:00.000Z',
  }),
  currentRequest: null,
  environment: rehydratingEnvironmentFixture,
});

export const rebuiltProcessResponseFixture = rebuildProcessResponseSchema.parse({
  accepted: true,
  process: processSurfaceSummarySchema.parse({
    ...lostEnvironmentProcessSurfaceFixture,
    updatedAt: '2026-04-13T12:32:00.000Z',
  }),
  currentRequest: null,
  environment: {
    ...readyEnvironmentFixture,
    state: 'rebuilding',
    statusLabel: 'Rebuilding environment',
    blockedReason: 'Rebuild is in progress.',
  },
});

export const resumedInterruptedToFailedProcessResponseFixture = resumeProcessResponseSchema.parse({
  process: processSurfaceSummarySchema.parse({
    ...failedProcessSurfaceFixture,
    processId: interruptedProcessSurfaceFixture.processId,
    phaseLabel: interruptedProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:28:00.000Z',
  }),
  currentRequest: null,
  environment: absentEnvironmentFixture,
});

export const submittedProcessResponseFixture = submitProcessResponseResponseSchema.parse({
  accepted: true,
  historyItemId: 'history-response-accepted-001',
  process: processSurfaceSummarySchema.parse({
    ...runningProcessSurfaceFixture,
    processId: waitingProcessSurfaceFixture.processId,
    phaseLabel: waitingProcessSurfaceFixture.phaseLabel,
    updatedAt: '2026-04-13T12:29:00.000Z',
  }),
  currentRequest: null,
});

export const submittedProcessResponseWithFollowUpFixture =
  submitProcessResponseResponseSchema.parse({
    accepted: true,
    historyItemId: 'history-response-follow-up-001',
    process: processSurfaceSummarySchema.parse({
      ...waitingProcessSurfaceFixture,
      processId: waitingProcessSurfaceFixture.processId,
      phaseLabel: waitingProcessSurfaceFixture.phaseLabel,
      nextActionLabel: 'Clarify the target user before continuing',
      updatedAt: '2026-04-13T12:30:00.000Z',
    }),
    currentRequest: followUpCurrentProcessRequestFixture,
  });

export const processUnavailableErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_NOT_FOUND',
  message: 'The requested process could not be found.',
  status: 404,
});

export const processAccessDeniedErrorFixture = requestErrorSchema.parse({
  code: 'PROJECT_FORBIDDEN',
  message: 'You do not have access to this process.',
  status: 403,
});

export const processProjectNotFoundErrorFixture = requestErrorSchema.parse({
  code: 'PROJECT_NOT_FOUND',
  message: 'The requested project could not be found.',
  status: 404,
});

export const unauthenticatedRequestErrorFixture = requestErrorSchema.parse({
  code: 'UNAUTHENTICATED',
  message: 'Sign in to continue.',
  status: 401,
});

export const processStartNotAvailableErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_NOT_AVAILABLE',
  message: 'Start is not available for this process right now.',
  status: 409,
});

export const processResumeNotAvailableErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_NOT_AVAILABLE',
  message: 'Resume is not available for this process right now.',
  status: 409,
});

export const processRehydrateNotRecoverableErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ENVIRONMENT_NOT_RECOVERABLE',
  message: 'Rehydrate is blocked because rebuild is required first.',
  status: 409,
});

export const processRebuildPrerequisiteMissingErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ENVIRONMENT_PREREQUISITE_MISSING',
  message: 'Required canonical materials are missing for rebuild.',
  status: 422,
});

export const processResponseNotAvailableErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_NOT_AVAILABLE',
  message: 'Respond is not available for this process right now.',
  status: 409,
});

export const invalidProcessResponseErrorFixture = requestErrorSchema.parse({
  code: 'INVALID_PROCESS_RESPONSE',
  message: 'Submitted response must include a non-empty clientRequestId and message.',
  status: 422,
});

export const unexpectedProcessActionErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_ACTION_FAILED',
  message: 'The process action could not be completed right now. Try again or reload the page.',
  status: 500,
});

// Live transport state fixture for post-bootstrap disconnect/error handling.
// This is not a bootstrap HTTP error response fixture.
export const processLiveUnavailableTransportErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_LIVE_UPDATES_UNAVAILABLE',
  message: 'Live updates are currently unavailable.',
  status: 503,
});
