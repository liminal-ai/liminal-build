import {
  currentProcessRequestSchema,
  processSurfaceProjectSchema,
  processSurfaceSummarySchema,
  processWorkSurfaceResponseSchema,
  requestErrorSchema,
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
} from './materials.js';
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

export const draftProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  status: 'draft',
  availableActions: ['start'],
});

export const runningProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-running-001',
  status: 'running',
  availableActions: ['review'],
});

export const waitingProcessSurfaceFixture = processSurfaceSummarySchema.parse({
  ...baseProcessSurfaceSummary,
  processId: 'process-surface-waiting-001',
  status: 'waiting',
  nextActionLabel: 'Respond to the current request',
  availableActions: ['respond'],
});

export const currentProcessRequestFixture = currentProcessRequestSchema.parse({
  requestId: 'request-001',
  requestKind: 'approval',
  promptText: 'Approve the current scope before moving into review.',
  requiredActionLabel: 'Approve scope',
  createdAt: '2026-04-13T12:06:00.000Z',
});

export const readyProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: waitingProcessSurfaceFixture,
  history: readyProcessHistoryFixture,
  materials: readyProcessMaterialsFixture,
  currentRequest: currentProcessRequestFixture,
  sideWork: readySideWorkFixture,
});

export const earlyProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: draftProcessSurfaceFixture,
  history: emptyProcessHistoryFixture,
  materials: emptyProcessMaterialsFixture,
  currentRequest: null,
  sideWork: emptySideWorkFixture,
});

export const degradedProcessWorkSurfaceFixture = processWorkSurfaceResponseSchema.parse({
  project: processSurfaceProjectFixture,
  process: runningProcessSurfaceFixture,
  history: errorProcessHistoryFixture,
  materials: errorProcessMaterialsFixture,
  currentRequest: null,
  sideWork: errorSideWorkFixture,
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

// Live transport state fixture for post-bootstrap disconnect/error handling.
// This is not a bootstrap HTTP error response fixture.
export const processLiveUnavailableTransportErrorFixture = requestErrorSchema.parse({
  code: 'PROCESS_LIVE_UPDATES_UNAVAILABLE',
  message: 'Live updates are currently unavailable.',
  status: 503,
});
