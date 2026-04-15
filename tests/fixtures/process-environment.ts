import {
  environmentSummarySchema,
  type EnvironmentSummary,
} from '../../apps/platform/shared/contracts/index.js';
import {
  artifactCheckpointFailureFixture,
  artifactCheckpointSuccessFixture,
  codeCheckpointFailureFixture,
  codeCheckpointSuccessFixture,
} from './checkpoint-results.js';

const baseEnvironmentSummary = {
  environmentId: null,
  state: 'absent' as const,
  statusLabel: 'Not prepared',
  blockedReason: null,
  lastHydratedAt: null,
  lastCheckpointAt: null,
  lastCheckpointResult: null,
};

export function buildEnvironmentSummaryFixture(
  overrides: Partial<EnvironmentSummary>,
): EnvironmentSummary {
  return environmentSummarySchema.parse({
    ...baseEnvironmentSummary,
    ...overrides,
  });
}

export const absentEnvironmentFixture = buildEnvironmentSummaryFixture({});

export const preparingEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-preparing-001',
  state: 'preparing',
  statusLabel: 'Preparing environment',
});

export const readyEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-ready-001',
  state: 'ready',
  statusLabel: 'Ready for work',
  lastHydratedAt: '2026-04-13T12:20:00.000Z',
});

export const runningEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-running-001',
  state: 'running',
  statusLabel: 'Running in environment',
  lastHydratedAt: '2026-04-13T12:20:00.000Z',
});

export const checkpointingEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-checkpointing-001',
  state: 'checkpointing',
  statusLabel: 'Checkpointing work',
  lastHydratedAt: '2026-04-13T12:20:00.000Z',
});

export const staleEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-stale-001',
  state: 'stale',
  statusLabel: 'Environment is stale',
  blockedReason: 'Rehydrate to refresh the working copy from canonical inputs.',
  lastHydratedAt: '2026-04-13T12:20:00.000Z',
});

export const failedEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-failed-001',
  state: 'failed',
  statusLabel: 'Environment failed',
  blockedReason: 'Preparation failed before the environment became ready.',
});

export const lostEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-lost-001',
  state: 'lost',
  statusLabel: 'Environment lost',
  blockedReason: 'The previous working copy can no longer be recovered.',
});

export const rebuildingEnvironmentFixture = buildEnvironmentSummaryFixture({
  environmentId: 'environment-rebuilding-001',
  state: 'rebuilding',
  statusLabel: 'Rebuilding environment',
  blockedReason: 'Rebuild is in progress.',
});

export const unavailableEnvironmentFixture = buildEnvironmentSummaryFixture({
  state: 'unavailable',
  statusLabel: 'Environment unavailable',
  blockedReason: 'Environment lifecycle work is currently unavailable.',
});

export const checkpointSucceededEnvironmentFixture = buildEnvironmentSummaryFixture({
  ...readyEnvironmentFixture,
  lastCheckpointAt: artifactCheckpointSuccessFixture.completedAt,
  lastCheckpointResult: artifactCheckpointSuccessFixture,
});

export const codeCheckpointSucceededEnvironmentFixture = buildEnvironmentSummaryFixture({
  ...readyEnvironmentFixture,
  lastCheckpointAt: codeCheckpointSuccessFixture.completedAt,
  lastCheckpointResult: codeCheckpointSuccessFixture,
});

export const checkpointFailedEnvironmentFixture = buildEnvironmentSummaryFixture({
  ...failedEnvironmentFixture,
  lastCheckpointAt: artifactCheckpointFailureFixture.completedAt,
  lastCheckpointResult: artifactCheckpointFailureFixture,
});

export const codeCheckpointFailedEnvironmentFixture = buildEnvironmentSummaryFixture({
  ...failedEnvironmentFixture,
  lastCheckpointAt: codeCheckpointFailureFixture.completedAt,
  lastCheckpointResult: codeCheckpointFailureFixture,
});
