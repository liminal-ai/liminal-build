import { describe, expect, it } from 'vitest';
import { listPackageSnapshotMembers } from './packageSnapshotMembers.js';
import { publishPackageSnapshot } from './packageSnapshots.js';
import { listProcessPackageContextMembers } from './processPackageContextMembers.js';
import {
  clearCurrentProcessPackageContext,
  getCurrentProcessPackageContext,
  upsertCurrentProcessPackageContext,
} from './processPackageContexts.js';
import { createFakeConvexContext } from './test_helpers/fake_convex_context.js';

function getHandler<TArgs, TReturn>(
  registered: unknown,
): (ctx: unknown, args: TArgs) => Promise<TReturn> {
  return (registered as { _handler: (ctx: unknown, args: TArgs) => Promise<TReturn> })._handler;
}

const getCurrentProcessPackageContextHandler = getHandler<
  { processId: string },
  {
    packageContextId: string;
    processId: string;
    displayName: string;
    packageType: string;
    basePackageSnapshotId: string | null;
    updatedAt: string;
  } | null
>(getCurrentProcessPackageContext);

const listProcessPackageContextMembersHandler = getHandler<
  { packageContextId: string },
  Array<{
    memberId: string;
    packageContextId: string;
    position: number;
    artifactId: string;
    artifactVersionId: string;
    displayName: string;
    versionLabel: string;
    pinnedAt: string;
  }>
>(listProcessPackageContextMembers);

const upsertCurrentProcessPackageContextHandler = getHandler<
  {
    processId: string;
    displayName: string;
    packageType: string;
    basePackageSnapshotId: string | null;
    members: Array<{
      position: number;
      artifactId: string;
      artifactVersionId: string;
      displayName: string;
      versionLabel: string;
    }>;
  },
  {
    context: {
      packageContextId: string;
      processId: string;
      displayName: string;
      packageType: string;
      basePackageSnapshotId: string | null;
      updatedAt: string;
    };
    members: Array<{
      memberId: string;
      packageContextId: string;
      position: number;
      artifactId: string;
      artifactVersionId: string;
      displayName: string;
      versionLabel: string;
      pinnedAt: string;
    }>;
  }
>(upsertCurrentProcessPackageContext);

const clearCurrentProcessPackageContextHandler = getHandler<{ processId: string }, null>(
  clearCurrentProcessPackageContext,
);

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

function buildProcessPackageContextSeed() {
  return {
    projects: [
      {
        _id: 'project-package-contexts-1',
        _creationTime: 1,
        ownerUserId: 'user-1',
        name: 'Package Context Tests',
        lastUpdatedAt: '2026-04-25T13:00:00.000Z',
        createdAt: '2026-04-25T13:00:00.000Z',
        updatedAt: '2026-04-25T13:00:00.000Z',
      },
    ],
    processes: [
      {
        _id: 'process-package-contexts-1',
        _creationTime: 2,
        projectId: 'project-package-contexts-1',
        processType: 'FeatureImplementation',
        displayLabel: 'Feature Implementation #1',
        status: 'running',
        phaseLabel: 'Working',
        nextActionLabel: 'Review the latest output',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-25T13:00:00.000Z',
        updatedAt: '2026-04-25T13:00:00.000Z',
      },
      {
        _id: 'process-package-contexts-2',
        _creationTime: 3,
        projectId: 'project-package-contexts-1',
        processType: 'FeatureSpecification',
        displayLabel: 'Feature Specification #1',
        status: 'completed',
        phaseLabel: 'Completed',
        nextActionLabel: 'Review the latest output',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: '2026-04-25T12:00:00.000Z',
        updatedAt: '2026-04-25T12:00:00.000Z',
      },
    ],
    processFeatureImplementationStates: [
      {
        _id: 'process-feature-impl-state-package-contexts-1',
        _creationTime: 4,
        processId: 'process-package-contexts-1',
        currentArtifactIds: ['artifact-package-contexts-1'],
        currentSourceAttachmentIds: [],
        createdAt: '2026-04-25T13:00:00.000Z',
        updatedAt: '2026-04-25T13:00:00.000Z',
      },
    ],
    processFeatureSpecificationStates: [
      {
        _id: 'process-feature-spec-state-package-contexts-2',
        _creationTime: 5,
        processId: 'process-package-contexts-2',
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: '2026-04-25T12:00:00.000Z',
        updatedAt: '2026-04-25T12:00:00.000Z',
      },
    ],
    artifacts: [
      {
        _id: 'artifact-package-contexts-1',
        _creationTime: 6,
        projectId: 'project-package-contexts-1',
        displayName: 'Technical Design',
        createdAt: '2026-04-25T12:10:00.000Z',
      },
      {
        _id: 'artifact-package-contexts-2',
        _creationTime: 7,
        projectId: 'project-package-contexts-1',
        displayName: 'Feature Specification',
        createdAt: '2026-04-25T12:15:00.000Z',
      },
    ],
    artifactVersions: [
      {
        _id: 'artifact-version-package-contexts-1-older',
        _creationTime: 8,
        artifactId: 'artifact-package-contexts-1',
        versionLabel: 'design-v1',
        contentStorageId: 'storage-package-contexts-1-older',
        contentKind: 'markdown',
        bytes: 120,
        createdAt: '2026-04-25T12:20:00.000Z',
        createdByProcessId: 'process-package-contexts-2',
      },
      {
        _id: 'artifact-version-package-contexts-1-current',
        _creationTime: 9,
        artifactId: 'artifact-package-contexts-1',
        versionLabel: 'design-v2',
        contentStorageId: 'storage-package-contexts-1-current',
        contentKind: 'markdown',
        bytes: 140,
        createdAt: '2026-04-25T13:20:00.000Z',
        createdByProcessId: 'process-package-contexts-1',
      },
      {
        _id: 'artifact-version-package-contexts-2-current',
        _creationTime: 10,
        artifactId: 'artifact-package-contexts-2',
        versionLabel: 'spec-v1',
        contentStorageId: 'storage-package-contexts-2-current',
        contentKind: 'markdown',
        bytes: 112,
        createdAt: '2026-04-25T12:30:00.000Z',
        createdByProcessId: 'process-package-contexts-2',
      },
    ],
    packageSnapshots: [
      {
        _id: 'package-snapshot-package-contexts-1',
        _creationTime: 11,
        processId: 'process-package-contexts-1',
        displayName: 'Published Implementation Package',
        packageType: 'FeatureImplementationOutput',
        publishedAt: '2026-04-25T13:10:00.000Z',
      },
    ],
    packageSnapshotMembers: [
      {
        _id: 'package-snapshot-member-package-contexts-1',
        _creationTime: 12,
        packageSnapshotId: 'package-snapshot-package-contexts-1',
        position: 0,
        artifactId: 'artifact-package-contexts-1',
        artifactVersionId: 'artifact-version-package-contexts-1-older',
        displayName: 'Technical Design',
        versionLabel: 'design-v1',
      },
    ],
  };
}

describe('convex/processPackageContexts', () => {
  it('stores and reads one current package context in position order', async () => {
    const { ctx } = createFakeConvexContext(buildProcessPackageContextSeed());

    const result = await upsertCurrentProcessPackageContextHandler(ctx, {
      processId: 'process-package-contexts-1',
      displayName: 'Implementation Review Draft',
      packageType: 'FeatureImplementationReview',
      basePackageSnapshotId: null,
      members: [
        {
          position: 1,
          artifactId: 'artifact-package-contexts-2',
          artifactVersionId: 'artifact-version-package-contexts-2-current',
          displayName: 'Feature Specification',
          versionLabel: 'spec-v1',
        },
        {
          position: 0,
          artifactId: 'artifact-package-contexts-1',
          artifactVersionId: 'artifact-version-package-contexts-1-current',
          displayName: 'Technical Design',
          versionLabel: 'design-v2',
        },
      ],
    });

    const context = await getCurrentProcessPackageContextHandler(ctx, {
      processId: 'process-package-contexts-1',
    });
    const members = await listProcessPackageContextMembersHandler(ctx, {
      packageContextId: result.context.packageContextId,
    });

    expect(context).toMatchObject({
      packageContextId: result.context.packageContextId,
      displayName: 'Implementation Review Draft',
      packageType: 'FeatureImplementationReview',
      basePackageSnapshotId: null,
    });
    expect(members.map((member) => member.position)).toEqual([0, 1]);
    expect(members.map((member) => member.versionLabel)).toEqual(['design-v2', 'spec-v1']);
  });

  it('cleans duplicate rows during upsert and clears the surviving context with its members', async () => {
    const { ctx, db } = createFakeConvexContext(buildProcessPackageContextSeed());
    const duplicateContextId = await ctx.db.insert('processPackageContexts', {
      processId: 'process-package-contexts-1',
      displayName: 'Older Duplicate',
      packageType: 'FeatureImplementationReview',
      basePackageSnapshotId: null,
      updatedAt: '2026-04-25T13:00:00.000Z',
    });
    await ctx.db.insert('processPackageContextMembers', {
      packageContextId: duplicateContextId,
      position: 0,
      artifactId: 'artifact-package-contexts-2',
      artifactVersionId: 'artifact-version-package-contexts-2-current',
      displayName: 'Feature Specification',
      versionLabel: 'spec-v1',
      pinnedAt: '2026-04-25T13:00:00.000Z',
    });
    const canonicalContextId = await ctx.db.insert('processPackageContexts', {
      processId: 'process-package-contexts-1',
      displayName: 'Canonical Context',
      packageType: 'FeatureImplementationReview',
      basePackageSnapshotId: null,
      updatedAt: '2026-04-25T13:05:00.000Z',
    });
    await ctx.db.insert('processPackageContextMembers', {
      packageContextId: canonicalContextId,
      position: 0,
      artifactId: 'artifact-package-contexts-1',
      artifactVersionId: 'artifact-version-package-contexts-1-current',
      displayName: 'Technical Design',
      versionLabel: 'design-v2',
      pinnedAt: '2026-04-25T13:05:00.000Z',
    });

    const upserted = await upsertCurrentProcessPackageContextHandler(ctx, {
      processId: 'process-package-contexts-1',
      displayName: 'Canonical Context',
      packageType: 'FeatureImplementationReview',
      basePackageSnapshotId: null,
      members: [
        {
          position: 0,
          artifactId: 'artifact-package-contexts-1',
          artifactVersionId: 'artifact-version-package-contexts-1-current',
          displayName: 'Technical Design',
          versionLabel: 'design-v2',
        },
      ],
    });

    expect(db.list('processPackageContexts')).toHaveLength(1);
    expect(db.list('processPackageContexts')[0]).toMatchObject({
      _id: upserted.context.packageContextId,
    });
    expect(db.list('processPackageContextMembers')).toHaveLength(1);

    await clearCurrentProcessPackageContextHandler(ctx, {
      processId: 'process-package-contexts-1',
    });

    expect(
      await getCurrentProcessPackageContextHandler(ctx, {
        processId: 'process-package-contexts-1',
      }),
    ).toBeNull();
    expect(db.list('processPackageContexts')).toEqual([]);
    expect(db.list('processPackageContextMembers')).toEqual([]);
  });

  it('auto-seeds a reopened package context from the published snapshot and keeps the earlier pinned version eligible', async () => {
    const { ctx } = createFakeConvexContext(buildProcessPackageContextSeed());

    const reopenedContext = await upsertCurrentProcessPackageContextHandler(ctx, {
      processId: 'process-package-contexts-1',
      displayName: 'Reopened Implementation Review',
      packageType: 'FeatureImplementationOutput',
      basePackageSnapshotId: 'package-snapshot-package-contexts-1',
      members: [],
    });

    expect(reopenedContext.members).toEqual([
      expect.objectContaining({
        artifactId: 'artifact-package-contexts-1',
        artifactVersionId: 'artifact-version-package-contexts-1-older',
        displayName: 'Technical Design',
        versionLabel: 'design-v1',
      }),
    ]);

    const packageSnapshotId = await publishPackageSnapshotHandler(ctx, {
      processId: 'process-package-contexts-1',
      displayName: 'Republished Implementation Package',
      packageType: 'FeatureImplementationOutput',
      members: [
        {
          artifactId: 'artifact-package-contexts-1',
          artifactVersionId: 'artifact-version-package-contexts-1-older',
          position: 0,
        },
      ],
    });
    const packageMembers = await listPackageSnapshotMembersHandler(ctx, {
      packageSnapshotId,
    });

    expect(packageMembers).toEqual([
      expect.objectContaining({
        artifactId: 'artifact-package-contexts-1',
        artifactVersionId: 'artifact-version-package-contexts-1-older',
        versionLabel: 'design-v1',
      }),
    ]);
  });
});
