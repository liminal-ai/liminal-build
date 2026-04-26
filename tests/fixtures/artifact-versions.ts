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
  producedByProcessId: 'process-feature-spec-001',
  producedByProcessDisplayLabel: 'Feature Specification #1',
});

export const priorArtifactVersionFixture = artifactVersionSummarySchema.parse({
  versionId: 'artifact-version-000',
  versionLabel: 'checkpoint-20260421114500',
  isCurrent: false,
  createdAt: '2026-04-21T11:45:00.000Z',
  producedByProcessId: 'process-product-def-001',
  producedByProcessDisplayLabel: 'Product Definition #1',
});

export const markdownArtifactVersionDetailFixture = artifactVersionDetailSchema.parse({
  versionId: currentArtifactVersionFixture.versionId,
  versionLabel: currentArtifactVersionFixture.versionLabel,
  contentKind: 'markdown',
  bodyStatus: 'ready',
  body: '<h1>Feature Specification</h1>',
  mermaidBlocks: [],
  createdAt: currentArtifactVersionFixture.createdAt,
  producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
  producedByProcessDisplayLabel: currentArtifactVersionFixture.producedByProcessDisplayLabel,
});

export const priorMarkdownArtifactVersionDetailFixture = artifactVersionDetailSchema.parse({
  versionId: priorArtifactVersionFixture.versionId,
  versionLabel: priorArtifactVersionFixture.versionLabel,
  contentKind: 'markdown',
  bodyStatus: 'ready',
  body: '<h1>Feature Specification - Prior</h1>',
  mermaidBlocks: [],
  createdAt: priorArtifactVersionFixture.createdAt,
  producedByProcessId: priorArtifactVersionFixture.producedByProcessId,
  producedByProcessDisplayLabel: priorArtifactVersionFixture.producedByProcessDisplayLabel,
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

export const priorSelectedArtifactReviewTargetFixture = artifactReviewTargetSchema.parse({
  artifactId: 'artifact-001',
  displayName: 'Feature Specification',
  currentVersionId: currentArtifactVersionFixture.versionId,
  currentVersionLabel: currentArtifactVersionFixture.versionLabel,
  selectedVersionId: priorArtifactVersionFixture.versionId,
  versions: [currentArtifactVersionFixture, priorArtifactVersionFixture],
  selectedVersion: priorMarkdownArtifactVersionDetailFixture,
});

export const emptyArtifactReviewTargetFixture = artifactReviewTargetSchema.parse({
  artifactId: 'artifact-empty-001',
  displayName: 'Empty Artifact',
  versions: [],
});
