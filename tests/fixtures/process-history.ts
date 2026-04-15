import {
  processHistoryItemSchema,
  processHistorySectionEnvelopeSchema,
  processSurfaceSectionErrorSchema,
} from '../../apps/platform/shared/contracts/index.js';

export const userMessageHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-user-001',
  kind: 'user_message',
  lifecycleState: 'finalized',
  text: 'Please continue with the process.',
  createdAt: '2026-04-13T12:00:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: null,
});

export const processMessageHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-process-001',
  kind: 'process_message',
  lifecycleState: 'finalized',
  text: 'Drafting the next output now.',
  createdAt: '2026-04-13T12:02:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: null,
});

export const progressUpdateHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-progress-001',
  kind: 'progress_update',
  lifecycleState: 'current',
  text: 'Synthesizing source material into the working outline.',
  createdAt: '2026-04-13T12:04:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: null,
});

export const attentionRequestHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-request-001',
  kind: 'attention_request',
  lifecycleState: 'current',
  text: 'Approve the current scope before proceeding.',
  createdAt: '2026-04-13T12:06:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: null,
});

export const sideWorkUpdateHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-side-work-001',
  kind: 'side_work_update',
  lifecycleState: 'finalized',
  text: 'Related side work completed and returned a summary.',
  createdAt: '2026-04-13T12:08:00.000Z',
  relatedSideWorkId: 'side-work-001',
  relatedArtifactId: null,
});

export const processEventHistoryFixture = processHistoryItemSchema.parse({
  historyItemId: 'history-event-001',
  kind: 'process_event',
  lifecycleState: 'finalized',
  text: 'Process moved into review.',
  createdAt: '2026-04-13T12:10:00.000Z',
  relatedSideWorkId: null,
  relatedArtifactId: 'artifact-process-001',
});

export const processHistorySectionErrorFixture = processSurfaceSectionErrorSchema.parse({
  code: 'PROCESS_SURFACE_HISTORY_LOAD_FAILED',
  message: 'Process history could not be loaded.',
});

export const readyProcessHistoryFixture = processHistorySectionEnvelopeSchema.parse({
  status: 'ready',
  items: [
    userMessageHistoryFixture,
    processMessageHistoryFixture,
    progressUpdateHistoryFixture,
    attentionRequestHistoryFixture,
    sideWorkUpdateHistoryFixture,
    processEventHistoryFixture,
  ],
});

export const emptyProcessHistoryFixture = processHistorySectionEnvelopeSchema.parse({
  status: 'empty',
  items: [],
});

export const errorProcessHistoryFixture = processHistorySectionEnvelopeSchema.parse({
  status: 'error',
  items: [],
  error: processHistorySectionErrorFixture,
});
