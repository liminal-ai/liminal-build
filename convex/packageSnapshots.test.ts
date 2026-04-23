import { describe, expect, it } from 'vitest';
import {
  getPackageSnapshot,
  listPackageSnapshotsForProcess,
  publishPackageSnapshot,
} from './packageSnapshots.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const publishPackageSnapshotHandler = getHandler<
  {
    processId: string;
    displayName: string;
    packageType: string;
    members: Array<{
      artifactId: string;
      artifactVersionId: string;
      position: number;
    }>;
  },
  string
>(publishPackageSnapshot);

const getPackageSnapshotHandler = getHandler<
  { packageSnapshotId: string },
  {
    packageSnapshotId: string;
    processId: string;
    displayName: string;
    packageType: string;
    publishedAt: string;
  } | null
>(getPackageSnapshot);

const listPackageSnapshotsForProcessHandler = getHandler<
  { processId: string },
  Array<{
    packageSnapshotId: string;
    processId: string;
    displayName: string;
    packageType: string;
    publishedAt: string;
  }>
>(listPackageSnapshotsForProcess);

function buildPackageSnapshotSeed() {
  return {
    projects: [
      {
        _id: 'project-package-snapshots-1',
        _creationTime: 1,
        ownerUserId: 'user-1',
        name: 'Package Snapshot Tests',
        lastUpdatedAt: '2026-04-23T12:00:00.000Z',
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-package-snapshots-1',
        _creationTime: 2,
        projectId: 'project-package-snapshots-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Specification #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Review the latest output',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-23T12:00:00.000Z',
        updatedAt: '2026-04-23T12:00:00.000Z',
      },
      {
        _id: 'process-package-snapshots-2',
        _creationTime: 7,
        projectId: 'project-package-snapshots-1',
        processType: 'FeatureImplementation',
        displayLabel: 'Feature Implementation #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Review the latest output',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-23T12:05:00.000Z',
        updatedAt: '2026-04-23T12:05:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-package-snapshots-1',
        _creationTime: 3,
        projectId: 'project-package-snapshots-1',
        processId: 'process-package-snapshots-1',
        displayName: 'Specification Draft',
        createdAt: '2026-04-23T12:01:00.000Z',
      },
      {
        _id: 'artifact-package-snapshots-2',
        _creationTime: 4,
        projectId: 'project-package-snapshots-1',
        processId: 'process-package-snapshots-1',
        displayName: 'Implementation Notes',
        createdAt: '2026-04-23T12:02:00.000Z',
      },
    ],
    artifactVersions: [
      {
        _id: 'artifact-version-package-snapshots-1',
        _creationTime: 5,
        artifactId: 'artifact-package-snapshots-1',
        versionLabel: 'spec-v1',
        contentStorageId: 'storage-package-snapshots-1',
        contentKind: 'markdown',
        bytes: 128,
        createdAt: '2026-04-23T12:03:00.000Z',
        createdByProcessId: 'process-package-snapshots-1',
      },
      {
        _id: 'artifact-version-package-snapshots-2',
        _creationTime: 6,
        artifactId: 'artifact-package-snapshots-2',
        versionLabel: 'notes-v1',
        contentStorageId: 'storage-package-snapshots-2',
        contentKind: 'markdown',
        bytes: 96,
        createdAt: '2026-04-23T12:04:00.000Z',
        createdByProcessId: 'process-package-snapshots-1',
      },
    ],
  };
}

describe('convex/packageSnapshots publishPackageSnapshot', () => {
  it('rejects empty member arrays', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [],
      }),
    ).rejects.toThrow('Package snapshot must include at least one member.');
  });

  it.each([
    -1, 0.5,
  ])('rejects member positions that are not non-negative integers (%s)', async (position) => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [
          {
            artifactId: 'artifact-package-snapshots-1',
            artifactVersionId: 'artifact-version-package-snapshots-1',
            position,
          },
        ],
      }),
    ).rejects.toThrow('Package snapshot member position must be a non-negative integer.');
  });

  it('rejects missing artifact versions', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [
          {
            artifactId: 'artifact-package-snapshots-1',
            artifactVersionId: 'missing-artifact-version',
            position: 0,
          },
        ],
      }),
    ).rejects.toThrow('Package snapshot member artifact version not found.');
  });

  it('rejects artifact version ownership mismatches', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [
          {
            artifactId: 'artifact-package-snapshots-1',
            artifactVersionId: 'artifact-version-package-snapshots-2',
            position: 0,
          },
        ],
      }),
    ).rejects.toThrow(
      'Package snapshot member artifact version must belong to the specified artifact.',
    );
  });

  it('rejects artifact versions produced by a different process', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-2',
        displayName: 'Feature Implementation Package',
        packageType: 'FeatureImplementationOutput',
        members: [
          {
            artifactId: 'artifact-package-snapshots-1',
            artifactVersionId: 'artifact-version-package-snapshots-1',
            position: 0,
          },
        ],
      }),
    ).rejects.toThrow(
      'Package snapshot member "Specification Draft" must be produced by the publishing process.',
    );
  });

  it('rejects missing artifacts', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());
    await ctx.db.patch('artifact-version-package-snapshots-1', {
      artifactId: 'missing-artifact',
    });

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [
          {
            artifactId: 'missing-artifact',
            artifactVersionId: 'artifact-version-package-snapshots-1',
            position: 0,
          },
        ],
      }),
    ).rejects.toThrow('Package snapshot member artifact not found.');
  });

  it('rejects duplicate member positions', async () => {
    const { ctx } = createFakeConvexContext(buildPackageSnapshotSeed());

    await expect(
      publishPackageSnapshotHandler(ctx, {
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        members: [
          {
            artifactId: 'artifact-package-snapshots-1',
            artifactVersionId: 'artifact-version-package-snapshots-1',
            position: 0,
          },
          {
            artifactId: 'artifact-package-snapshots-2',
            artifactVersionId: 'artifact-version-package-snapshots-2',
            position: 0,
          },
        ],
      }),
    ).rejects.toThrow('Package snapshot member positions must be unique.');
  });

  it('derives member display names and version labels from durable rows without caller-supplied labels', async () => {
    const { ctx, db } = createFakeConvexContext(buildPackageSnapshotSeed());

    const packageSnapshotId = await publishPackageSnapshotHandler(ctx, {
      processId: 'process-package-snapshots-1',
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-package-snapshots-1',
          artifactVersionId: 'artifact-version-package-snapshots-1',
          position: 0,
        },
      ],
    });

    expect(db.list('packageSnapshotMembers')).toEqual([
      expect.objectContaining({
        packageSnapshotId,
        artifactId: 'artifact-package-snapshots-1',
        artifactVersionId: 'artifact-version-package-snapshots-1',
        position: 0,
        displayName: 'Specification Draft',
        versionLabel: 'spec-v1',
      }),
    ]);
  });

  it('writes package snapshots and row-derived member display names and version labels durably on the happy path', async () => {
    const { ctx, db } = createFakeConvexContext(buildPackageSnapshotSeed());

    const packageSnapshotId = await publishPackageSnapshotHandler(ctx, {
      processId: 'process-package-snapshots-1',
      displayName: 'Feature Specification Package',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          artifactId: 'artifact-package-snapshots-1',
          artifactVersionId: 'artifact-version-package-snapshots-1',
          position: 0,
        },
        {
          artifactId: 'artifact-package-snapshots-2',
          artifactVersionId: 'artifact-version-package-snapshots-2',
          position: 1,
        },
      ],
    });

    await expect(
      getPackageSnapshotHandler(ctx, {
        packageSnapshotId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        packageSnapshotId,
        processId: 'process-package-snapshots-1',
        displayName: 'Feature Specification Package',
        packageType: 'FeatureSpecificationOutput',
        publishedAt: expect.any(String),
      }),
    );
    await expect(
      listPackageSnapshotsForProcessHandler(ctx, {
        processId: 'process-package-snapshots-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        packageSnapshotId,
        displayName: 'Feature Specification Package',
      }),
    ]);
    expect(db.list('packageSnapshotMembers')).toEqual([
      expect.objectContaining({
        packageSnapshotId,
        artifactId: 'artifact-package-snapshots-1',
        artifactVersionId: 'artifact-version-package-snapshots-1',
        position: 0,
        displayName: 'Specification Draft',
        versionLabel: 'spec-v1',
      }),
      expect.objectContaining({
        packageSnapshotId,
        artifactId: 'artifact-package-snapshots-2',
        artifactVersionId: 'artifact-version-package-snapshots-2',
        position: 1,
        displayName: 'Implementation Notes',
        versionLabel: 'notes-v1',
      }),
    ]);
  });
});
