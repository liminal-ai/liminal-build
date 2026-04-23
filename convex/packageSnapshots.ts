import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalMutation, internalQuery } from './_generated/server.js';

export const publishPackageSnapshotMemberInputValidator = v.object({
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
  position: v.number(),
});

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
    const packageSnapshotId = await ctx.db.insert('packageSnapshots', {
      processId: args.processId,
      displayName: args.displayName,
      packageType: args.packageType,
      publishedAt: new Date().toISOString(),
    });

    for (const member of args.members) {
      await ctx.db.insert('packageSnapshotMembers', {
        packageSnapshotId,
        position: member.position,
        artifactId: member.artifactId,
        artifactVersionId: member.artifactVersionId,
      });
    }

    return packageSnapshotId;
  },
});
