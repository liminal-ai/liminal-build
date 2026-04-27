import type { PackageReviewTarget } from '../../apps/platform/shared/contracts/index.js';

export function buildPackageSnapshotSeed(
  processId: string,
  packages: PackageReviewTarget[],
): {
  packageSnapshotsByProcessId: Record<
    string,
    Array<{
      packageSnapshotId: string;
      processId: string;
      displayName: string;
      packageType: string;
      publishedAt: string;
    }>
  >;
  packageSnapshotMembersBySnapshotId: Record<
    string,
    Array<{
      memberId: string;
      packageSnapshotId: string;
      position: number;
      artifactId: string;
      artifactVersionId: string;
      displayName: string;
      versionLabel: string;
    }>
  >;
} {
  return {
    packageSnapshotsByProcessId: {
      [processId]: packages.map((pkg) => ({
        packageSnapshotId: pkg.packageId,
        processId,
        displayName: pkg.displayName,
        packageType: pkg.packageType,
        publishedAt:
          pkg.selectedMember?.artifact?.selectedVersion?.createdAt ??
          pkg.selectedMember?.artifact?.versions[0]?.createdAt ??
          new Date('2026-01-01T00:00:00.000Z').toISOString(),
      })),
    },
    packageSnapshotMembersBySnapshotId: Object.fromEntries(
      packages.map((pkg) => [
        pkg.packageId,
        pkg.members.map((member) => ({
          memberId: member.memberId,
          packageSnapshotId: pkg.packageId,
          position: member.position,
          artifactId: member.artifactId,
          artifactVersionId: member.artifactVersionId,
          displayName: member.displayName,
          versionLabel: member.versionLabel,
        })),
      ]),
    ),
  };
}
