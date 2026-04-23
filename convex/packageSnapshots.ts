import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { internalMutation, internalQuery } from './_generated/server.js';

export const publishPackageSnapshotMemberInputValidator = v.object({
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
  position: v.number(),
});

const EMPTY_PACKAGE_SNAPSHOT_MEMBERS_ERROR = 'Package snapshot must include at least one member.';
const INVALID_PACKAGE_SNAPSHOT_POSITION_ERROR =
  'Package snapshot member position must be a non-negative integer.';
const DUPLICATE_PACKAGE_SNAPSHOT_POSITION_ERROR =
  'Package snapshot member positions must be unique.';
const PACKAGE_SNAPSHOT_ARTIFACT_VERSION_NOT_FOUND_ERROR =
  'Package snapshot member artifact version not found.';
const PACKAGE_SNAPSHOT_ARTIFACT_VERSION_OWNERSHIP_ERROR =
  'Package snapshot member artifact version must belong to the specified artifact.';
const PACKAGE_SNAPSHOT_ARTIFACT_NOT_FOUND_ERROR = 'Package snapshot member artifact not found.';

function buildPackageSnapshotProcessOwnershipError(memberDisplayName: string): string {
  return `Package snapshot member "${memberDisplayName}" must be produced by the publishing process.`;
}

export const packageSnapshotsTableFields = {
  processId: v.id('processes'),
  displayName: v.string(),
  packageType: v.string(),
  publishedAt: v.string(),
};

function toPackageSnapshotRecord(snapshot: {
  _id: Id<'packageSnapshots'>;
  processId: Id<'processes'>;
  displayName: string;
  packageType: string;
  publishedAt: string;
}) {
  return {
    packageSnapshotId: snapshot._id,
    processId: snapshot.processId,
    displayName: snapshot.displayName,
    packageType: snapshot.packageType,
    publishedAt: snapshot.publishedAt,
  };
}

export const listPackageSnapshotsForProcess = internalQuery({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query('packageSnapshots')
      .withIndex('by_processId_publishedAt', (indexQuery) =>
        indexQuery.eq('processId', args.processId as Id<'processes'>),
      )
      .order('desc')
      .take(50);

    return snapshots.map(toPackageSnapshotRecord);
  },
});

export const getPackageSnapshot = internalQuery({
  args: {
    packageSnapshotId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const snapshot = await ctx.db.get(args.packageSnapshotId as Id<'packageSnapshots'>);
      return snapshot === null ? null : toPackageSnapshotRecord(snapshot);
    } catch {
      return null;
    }
  },
});

export const publishPackageSnapshot = internalMutation({
  args: {
    processId: v.id('processes'),
    displayName: v.string(),
    packageType: v.string(),
    members: v.array(publishPackageSnapshotMemberInputValidator),
  },
  handler: async (ctx, args) => {
    if (args.members.length === 0) {
      throw new Error(EMPTY_PACKAGE_SNAPSHOT_MEMBERS_ERROR);
    }

    const seenPositions = new Set<number>();
    const validatedMembers: Array<{
      member: (typeof args.members)[number];
      artifact: Doc<'artifacts'>;
      artifactVersion: Doc<'artifactVersions'>;
    }> = [];

    for (const member of args.members) {
      if (!Number.isInteger(member.position) || member.position < 0) {
        throw new Error(INVALID_PACKAGE_SNAPSHOT_POSITION_ERROR);
      }

      if (seenPositions.has(member.position)) {
        throw new Error(DUPLICATE_PACKAGE_SNAPSHOT_POSITION_ERROR);
      }
      seenPositions.add(member.position);

      const artifactVersion = await ctx.db.get(member.artifactVersionId);
      if (artifactVersion === null) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_VERSION_NOT_FOUND_ERROR);
      }

      if (artifactVersion.artifactId !== member.artifactId) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_VERSION_OWNERSHIP_ERROR);
      }

      const artifact = await ctx.db.get(member.artifactId);
      if (artifact === null) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_NOT_FOUND_ERROR);
      }

      if (artifactVersion.createdByProcessId !== args.processId) {
        throw new Error(buildPackageSnapshotProcessOwnershipError(artifact.displayName));
      }

      validatedMembers.push({
        member,
        artifact,
        artifactVersion,
      });
    }

    const packageSnapshotId = await ctx.db.insert('packageSnapshots', {
      processId: args.processId,
      displayName: args.displayName,
      packageType: args.packageType,
      publishedAt: new Date().toISOString(),
    });

    for (const { artifact, artifactVersion, member } of validatedMembers) {
      await ctx.db.insert('packageSnapshotMembers', {
        packageSnapshotId,
        position: member.position,
        artifactId: member.artifactId,
        artifactVersionId: member.artifactVersionId,
        displayName: artifact.displayName,
        versionLabel: artifactVersion.versionLabel,
      });
    }

    return packageSnapshotId;
  },
});
