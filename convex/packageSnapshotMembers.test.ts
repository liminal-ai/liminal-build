import { describe, expect, it } from 'vitest';
import { listPackageSnapshotMembers } from './packageSnapshotMembers.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const listPackageSnapshotMembersHandler = getHandler<
  { packageSnapshotId: string },
  Array<{
    memberId: string;
    packageSnapshotId: string;
    position: number;
    artifactId: string;
    artifactVersionId: string;
    displayName: string;
    versionLabel: string;
  }>
>(listPackageSnapshotMembers);

describe('convex/packageSnapshotMembers listPackageSnapshotMembers', () => {
  it('returns members ordered by ascending position with persisted display names and version labels', async () => {
    const { ctx } = createFakeConvexContext({
      packageSnapshots: [
        {
          _id: 'package-snapshot-members-1',
          _creationTime: 1,
          processId: 'process-package-snapshot-members-1',
          displayName: 'Feature Specification Package',
          packageType: 'FeatureSpecificationOutput',
          publishedAt: '2026-04-23T12:10:00.000Z',
        },
      ],
      packageSnapshotMembers: [
        {
          _id: 'package-member-3',
          _creationTime: 2,
          packageSnapshotId: 'package-snapshot-members-1',
          position: 2,
          artifactId: 'artifact-package-member-3',
          artifactVersionId: 'artifact-version-package-member-3',
          displayName: 'Launch Checklist',
          versionLabel: 'launch-v1',
        },
        {
          _id: 'package-member-1',
          _creationTime: 3,
          packageSnapshotId: 'package-snapshot-members-1',
          position: 0,
          artifactId: 'artifact-package-member-1',
          artifactVersionId: 'artifact-version-package-member-1',
          displayName: 'Specification Draft',
          versionLabel: 'spec-v1',
        },
        {
          _id: 'package-member-2',
          _creationTime: 4,
          packageSnapshotId: 'package-snapshot-members-1',
          position: 1,
          artifactId: 'artifact-package-member-2',
          artifactVersionId: 'artifact-version-package-member-2',
          displayName: 'Implementation Notes',
          versionLabel: 'notes-v1',
        },
      ],
    });

    await expect(
      listPackageSnapshotMembersHandler(ctx, {
        packageSnapshotId: 'package-snapshot-members-1',
      }),
    ).resolves.toEqual([
      {
        memberId: 'package-member-1',
        packageSnapshotId: 'package-snapshot-members-1',
        position: 0,
        artifactId: 'artifact-package-member-1',
        artifactVersionId: 'artifact-version-package-member-1',
        displayName: 'Specification Draft',
        versionLabel: 'spec-v1',
      },
      {
        memberId: 'package-member-2',
        packageSnapshotId: 'package-snapshot-members-1',
        position: 1,
        artifactId: 'artifact-package-member-2',
        artifactVersionId: 'artifact-version-package-member-2',
        displayName: 'Implementation Notes',
        versionLabel: 'notes-v1',
      },
      {
        memberId: 'package-member-3',
        packageSnapshotId: 'package-snapshot-members-1',
        position: 2,
        artifactId: 'artifact-package-member-3',
        artifactVersionId: 'artifact-version-package-member-3',
        displayName: 'Launch Checklist',
        versionLabel: 'launch-v1',
      },
    ]);
  });
});
