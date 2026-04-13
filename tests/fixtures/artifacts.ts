import { artifactSummarySchema } from '../../apps/platform/shared/contracts/index.js';

export const currentVersionArtifactFixture = artifactSummarySchema.parse({
  artifactId: 'artifact-current-001',
  displayName: 'Core Platform PRD',
  currentVersionLabel: 'v3',
  attachmentScope: 'project',
  processId: null,
  processDisplayLabel: null,
  updatedAt: '2026-04-13T12:00:00.000Z',
});

export const noCurrentVersionArtifactFixture = artifactSummarySchema.parse({
  artifactId: 'artifact-empty-001',
  displayName: 'Draft Architecture',
  currentVersionLabel: null,
  attachmentScope: 'project',
  processId: null,
  processDisplayLabel: null,
  updatedAt: '2026-04-12T12:00:00.000Z',
});

export const processScopedArtifactFixture = artifactSummarySchema.parse({
  artifactId: 'artifact-process-001',
  displayName: 'Feature Spec Output',
  currentVersionLabel: 'draft-1',
  attachmentScope: 'process',
  processId: 'process-feature-spec-1',
  processDisplayLabel: 'Feature Specification #1',
  updatedAt: '2026-04-13T14:00:00.000Z',
});
