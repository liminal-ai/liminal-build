import {
  reviewTargetSchema,
  reviewWorkspaceResponseSchema,
} from '../../apps/platform/shared/contracts/index.js';
import {
  emptyArtifactReviewTargetFixture,
  readyArtifactReviewTargetFixture,
} from './artifact-versions.js';
import { exportablePackageFixture, unavailablePackageFixture } from './package-snapshots.js';

const project = {
  projectId: 'project-review-001',
  name: 'Artifact Review',
  role: 'owner' as const,
};

const process = {
  processId: 'process-review-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification' as const,
};

export const readyArtifactReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process: {
    ...process,
    reviewTargetKind: 'artifact',
    reviewTargetId: readyArtifactReviewTargetFixture.artifactId,
  },
  availableTargets: [
    {
      position: 0,
      targetKind: 'artifact',
      targetId: readyArtifactReviewTargetFixture.artifactId,
      displayName: readyArtifactReviewTargetFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'artifact',
    displayName: readyArtifactReviewTargetFixture.displayName,
    status: 'ready',
    artifact: readyArtifactReviewTargetFixture,
  }),
});

export const emptyArtifactReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [
    {
      position: 0,
      targetKind: 'artifact',
      targetId: emptyArtifactReviewTargetFixture.artifactId,
      displayName: emptyArtifactReviewTargetFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'artifact',
    displayName: emptyArtifactReviewTargetFixture.displayName,
    status: 'empty',
    artifact: emptyArtifactReviewTargetFixture,
  }),
});

export const unavailableReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [
    {
      position: 0,
      targetKind: 'package',
      targetId: unavailablePackageFixture.packageId,
      displayName: unavailablePackageFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'package',
    displayName: unavailablePackageFixture.displayName,
    status: 'unavailable',
    error: {
      code: 'REVIEW_MEMBER_UNAVAILABLE',
      message: 'One package member is unavailable.',
    },
    package: unavailablePackageFixture,
  }),
});

export const unsupportedReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [
    {
      position: 0,
      targetKind: 'artifact',
      targetId: 'artifact-unsupported-001',
      displayName: 'Unsupported Artifact',
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'artifact',
    displayName: 'Unsupported Artifact',
    status: 'unsupported',
    error: {
      code: 'REVIEW_TARGET_UNSUPPORTED',
      message: 'This artifact format is not reviewable in the current release.',
    },
  }),
});

export const renderErrorReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [
    {
      position: 0,
      targetKind: 'artifact',
      targetId: readyArtifactReviewTargetFixture.artifactId,
      displayName: readyArtifactReviewTargetFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'artifact',
    displayName: readyArtifactReviewTargetFixture.displayName,
    status: 'error',
    error: {
      code: 'REVIEW_RENDER_FAILED',
      message: 'The selected review target could not be rendered.',
    },
    artifact: readyArtifactReviewTargetFixture,
  }),
});

export const exportablePackageReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process: {
    ...process,
    reviewTargetKind: 'package',
    reviewTargetId: exportablePackageFixture.packageId,
  },
  availableTargets: [
    {
      position: 0,
      targetKind: 'package',
      targetId: exportablePackageFixture.packageId,
      displayName: exportablePackageFixture.displayName,
    },
  ],
  target: reviewTargetSchema.parse({
    targetKind: 'package',
    displayName: exportablePackageFixture.displayName,
    status: 'ready',
    package: exportablePackageFixture,
  }),
});

export const multiTargetReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [
    {
      position: 0,
      targetKind: 'artifact',
      targetId: readyArtifactReviewTargetFixture.artifactId,
      displayName: readyArtifactReviewTargetFixture.displayName,
    },
    {
      position: 1,
      targetKind: 'package',
      targetId: exportablePackageFixture.packageId,
      displayName: exportablePackageFixture.displayName,
    },
  ],
});

export const zeroTargetReviewWorkspaceFixture = reviewWorkspaceResponseSchema.parse({
  project,
  process,
  availableTargets: [],
});
