export const currentPackageContextFixture = {
  context: {
    packageContextId: 'package-context-001',
    processId: 'process-feature-impl-001',
    displayName: 'Implementation Review Draft',
    packageType: 'FeatureImplementationReview',
    basePackageSnapshotId: null,
    updatedAt: '2026-04-25T13:00:00.000Z',
  },
  members: [
    {
      memberId: 'package-context-member-001',
      packageContextId: 'package-context-001',
      position: 0,
      artifactId: 'artifact-spec-001',
      artifactVersionId: 'artifact-version-spec-003',
      displayName: 'Feature Specification',
      versionLabel: 'checkpoint-20260425110000',
      pinnedAt: '2026-04-25T13:00:00.000Z',
    },
    {
      memberId: 'package-context-member-002',
      packageContextId: 'package-context-001',
      position: 1,
      artifactId: 'artifact-design-001',
      artifactVersionId: 'artifact-version-design-002',
      displayName: 'Technical Design',
      versionLabel: 'checkpoint-20260425113000',
      pinnedAt: '2026-04-25T13:00:00.000Z',
    },
  ],
} as const;

export const reopenedPackageContextFixture = {
  context: {
    packageContextId: 'package-context-002',
    processId: 'process-feature-impl-001',
    displayName: 'Reopened Implementation Review',
    packageType: 'FeatureImplementationReview',
    basePackageSnapshotId: 'package-snapshot-001',
    updatedAt: '2026-04-25T15:00:00.000Z',
  },
  members: [
    {
      memberId: 'package-context-member-003',
      packageContextId: 'package-context-002',
      position: 0,
      artifactId: 'artifact-spec-001',
      artifactVersionId: 'artifact-version-spec-002',
      displayName: 'Feature Specification',
      versionLabel: 'checkpoint-20260424190000',
      pinnedAt: '2026-04-25T15:00:00.000Z',
    },
  ],
} as const;
