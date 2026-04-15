import {
  lastCheckpointResultSchema,
  type LastCheckpointResult,
} from '../../apps/platform/shared/contracts/index.js';

const baseCheckpointResult = {
  checkpointId: 'checkpoint-001',
  checkpointKind: 'artifact' as const,
  outcome: 'succeeded' as const,
  targetLabel: 'Feature Specification Draft',
  targetRef: null,
  completedAt: '2026-04-13T12:32:00.000Z',
  failureReason: null,
};

export function buildCheckpointResultFixture(
  overrides: Partial<LastCheckpointResult>,
): LastCheckpointResult {
  return lastCheckpointResultSchema.parse({
    ...baseCheckpointResult,
    ...overrides,
  });
}

export const artifactCheckpointSuccessFixture = buildCheckpointResultFixture({});

export const codeCheckpointSuccessFixture = buildCheckpointResultFixture({
  checkpointId: 'checkpoint-code-001',
  checkpointKind: 'code',
  targetLabel: 'liminal-build',
  targetRef: 'feature/epic-03',
});

export const mixedCheckpointSuccessFixture = buildCheckpointResultFixture({
  checkpointId: 'checkpoint-mixed-001',
  checkpointKind: 'mixed',
  targetLabel: 'Feature Specification Draft + liminal-build',
  targetRef: 'feature/epic-03',
});

export const artifactCheckpointFailureFixture = buildCheckpointResultFixture({
  checkpointId: 'checkpoint-artifact-failure-001',
  outcome: 'failed',
  failureReason: 'Artifact persistence failed before the checkpoint could settle.',
});

export const codeCheckpointFailureFixture = buildCheckpointResultFixture({
  checkpointId: 'checkpoint-code-failure-001',
  checkpointKind: 'code',
  outcome: 'failed',
  targetLabel: 'liminal-build',
  targetRef: 'feature/epic-03',
  failureReason: 'Code checkpoint was blocked because the canonical source was unavailable.',
});
