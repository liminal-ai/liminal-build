import {
  artifactReviewTargetSchema,
  artifactVersionDetailSchema,
  artifactVersionSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';

export const currentArtifactVersionFixture = artifactVersionSummarySchema.parse({
  versionId: 'artifact-version-001',
  versionLabel: 'checkpoint-20260422120000',
  isCurrent: true,
  createdAt: '2026-04-22T12:00:00.000Z',
});

export const priorArtifactVersionFixture = artifactVersionSummarySchema.parse({
  versionId: 'artifact-version-000',
  versionLabel: 'checkpoint-20260421114500',
  isCurrent: false,
  createdAt: '2026-04-21T11:45:00.000Z',
});

export const markdownArtifactVersionDetailFixture = artifactVersionDetailSchema.parse({
  versionId: currentArtifactVersionFixture.versionId,
  versionLabel: currentArtifactVersionFixture.versionLabel,
  contentKind: 'markdown',
  bodyStatus: 'ready',
  body: '<h1>Feature Specification</h1>',
  mermaidBlocks: [],
  createdAt: currentArtifactVersionFixture.createdAt,
});

export const readyArtifactReviewTargetFixture = artifactReviewTargetSchema.parse({
  artifactId: 'artifact-001',
  displayName: 'Feature Specification',
  currentVersionId: currentArtifactVersionFixture.versionId,
  currentVersionLabel: currentArtifactVersionFixture.versionLabel,
  selectedVersionId: currentArtifactVersionFixture.versionId,
  versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
  selectedVersion: markdownArtifactVersionDetailFixture,
});

export const emptyArtifactReviewTargetFixture = artifactReviewTargetSchema.parse({
  artifactId: 'artifact-empty-001',
  displayName: 'Empty Artifact',
  versions: [],
});
