import { processSummarySchema } from '../../apps/platform/shared/contracts/index.js';

const baseProcessSummary = {
  processId: 'process-base',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification' as const,
  phaseLabel: 'Draft',
  nextActionLabel: 'Open the process',
  availableActions: ['open'] as const,
  hasEnvironment: false,
  updatedAt: '2026-04-13T12:00:00.000Z',
};

export const draftProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-draft',
  status: 'draft',
});

export const runningProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-running',
  status: 'running',
  availableActions: ['open', 'review'],
});

export const waitingProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-waiting',
  status: 'waiting',
  nextActionLabel: 'Waiting for user response',
  availableActions: ['respond'],
});

export const pausedProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-paused',
  status: 'paused',
  availableActions: ['resume'],
});

export const completedProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-completed',
  status: 'completed',
  nextActionLabel: null,
  availableActions: ['review'],
});

export const failedProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-failed',
  status: 'failed',
  nextActionLabel: 'Investigate failure',
  availableActions: ['review', 'restart'],
});

export const interruptedProcessFixture = processSummarySchema.parse({
  ...baseProcessSummary,
  processId: 'process-interrupted',
  status: 'interrupted',
  nextActionLabel: 'Choose resume, review, rehydrate, or restart',
  availableActions: ['resume', 'review', 'rehydrate', 'restart'],
});

export const sameTypeProcessLabelCollisionFixture = [
  processSummarySchema.parse({
    ...baseProcessSummary,
    processId: 'process-feature-spec-1',
    displayLabel: 'Feature Specification #1',
    status: 'draft',
  }),
  processSummarySchema.parse({
    ...baseProcessSummary,
    processId: 'process-feature-spec-2',
    displayLabel: 'Feature Specification #2',
    status: 'draft',
  }),
];
