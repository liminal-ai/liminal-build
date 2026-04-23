import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalQuery } from './_generated/server.js';

export const packageSnapshotMembersTableFields = {
  packageSnapshotId: v.id('packageSnapshots'),
  position: v.number(),
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
};

function toPackageSnapshotMemberRecord(member: {
  _id: Id<'packageSnapshotMembers'>;
  packageSnapshotId: Id<'packageSnapshots'>;
  position: number;
  artifactId: Id<'artifacts'>;
  artifactVersionId: Id<'artifactVersions'>;
}) {
  return {
    memberId: member._id,
    packageSnapshotId: member.packageSnapshotId,
    position: member.position,
    artifactId: member.artifactId,
    artifactVersionId: member.artifactVersionId,
  };
}

export const listPackageSnapshotMembers = internalQuery({
  args: {
    packageSnapshotId: v.string(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query('packageSnapshotMembers')
      .withIndex('by_packageSnapshotId_position', (indexQuery) =>
        indexQuery.eq('packageSnapshotId', args.packageSnapshotId as Id<'packageSnapshots'>),
      )
      .order('asc')
      .take(200);

    return members.map(toPackageSnapshotMemberRecord);
  },
});
