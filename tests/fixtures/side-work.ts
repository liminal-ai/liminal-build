import {
  processSurfaceSectionErrorSchema,
  sideWorkItemSchema,
  sideWorkSectionEnvelopeSchema,
} from '../../apps/platform/shared/contracts/index.js';

export const runningSideWorkFixture = sideWorkItemSchema.parse({
  sideWorkId: 'side-work-001',
  displayLabel: 'Validation Run',
  purposeSummary: 'Verify the draft against the source material.',
  status: 'running',
  resultSummary: null,
  updatedAt: '2026-04-13T12:15:00.000Z',
});

export const completedSideWorkFixture = sideWorkItemSchema.parse({
  sideWorkId: 'side-work-002',
  displayLabel: 'Reference Sweep',
  purposeSummary: 'Gather additional supporting references.',
  status: 'completed',
  resultSummary: 'Three relevant references were added.',
  updatedAt: '2026-04-13T12:18:00.000Z',
});

export const failedSideWorkFixture = sideWorkItemSchema.parse({
  sideWorkId: 'side-work-003',
  displayLabel: 'Environment Check',
  purposeSummary: 'Confirm the workspace prerequisites.',
  status: 'failed',
  resultSummary: 'Repository access expired before hydration finished.',
  updatedAt: '2026-04-13T12:17:00.000Z',
});

export const processSideWorkSectionErrorFixture = processSurfaceSectionErrorSchema.parse({
  code: 'PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED',
  message: 'Side-work summaries could not be loaded.',
});

export const readySideWorkFixture = sideWorkSectionEnvelopeSchema.parse({
  status: 'ready',
  items: [runningSideWorkFixture, completedSideWorkFixture, failedSideWorkFixture],
});

export const emptySideWorkFixture = sideWorkSectionEnvelopeSchema.parse({
  status: 'empty',
  items: [],
});

export const errorSideWorkFixture = sideWorkSectionEnvelopeSchema.parse({
  status: 'error',
  items: [],
  error: processSideWorkSectionErrorFixture,
});
