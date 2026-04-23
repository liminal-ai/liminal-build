import {
  packageExportabilitySchema,
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  reviewTargetErrorSchema,
} from '../../apps/platform/shared/contracts/index.js';
import { readyArtifactReviewTargetFixture } from './artifact-versions.js';

export const readyPackageMemberFixture = packageMemberSchema.parse({
  memberId: 'package-member-001',
  position: 0,
  artifactId: 'artifact-001',
  displayName: 'Feature Specification',
  versionId: 'artifact-version-001',
  versionLabel: 'checkpoint-20260422120000',
  status: 'ready',
});

export const unavailablePackageMemberFixture = packageMemberSchema.parse({
  memberId: 'package-member-002',
  position: 1,
  artifactId: 'artifact-002',
  displayName: 'Implementation Notes',
  versionId: 'artifact-version-002',
  versionLabel: 'checkpoint-20260422121000',
  status: 'unavailable',
});

export const unavailablePackageMemberErrorFixture = reviewTargetErrorSchema.parse({
  code: 'REVIEW_MEMBER_UNAVAILABLE',
  message: 'The pinned package member is currently unavailable.',
});

export const readyPackageMemberReviewFixture = packageMemberReviewSchema.parse({
  memberId: readyPackageMemberFixture.memberId,
  status: 'ready',
  artifact: readyArtifactReviewTargetFixture,
});

export const unavailablePackageMemberReviewFixture = packageMemberReviewSchema.parse({
  memberId: unavailablePackageMemberFixture.memberId,
  status: 'unavailable',
  error: unavailablePackageMemberErrorFixture,
});

export const exportablePackageFixture = packageReviewTargetSchema.parse({
  packageId: 'package-001',
  displayName: 'Specification Package',
  packageType: 'FeatureSpecificationOutput',
  members: [readyPackageMemberFixture],
  selectedMemberId: readyPackageMemberFixture.memberId,
  selectedMember: readyPackageMemberReviewFixture,
  exportability: packageExportabilitySchema.parse({
    available: true,
  }),
});

export const unavailablePackageFixture = packageReviewTargetSchema.parse({
  packageId: 'package-002',
  displayName: 'Mixed Package',
  packageType: 'FeatureSpecificationOutput',
  members: [readyPackageMemberFixture, unavailablePackageMemberFixture],
  selectedMemberId: unavailablePackageMemberFixture.memberId,
  selectedMember: unavailablePackageMemberReviewFixture,
  exportability: packageExportabilitySchema.parse({
    available: false,
    reason: 'One or more members are unavailable.',
  }),
});

export const firstReadySelectedPackageFixture = packageReviewTargetSchema.parse({
  packageId: 'package-003',
  displayName: 'Ordered Package',
  packageType: 'FeatureSpecificationOutput',
  members: [unavailablePackageMemberFixture, readyPackageMemberFixture],
  selectedMemberId: readyPackageMemberFixture.memberId,
  selectedMember: readyPackageMemberReviewFixture,
  exportability: packageExportabilitySchema.parse({
    available: false,
    reason: 'One or more members are unavailable.',
  }),
});
