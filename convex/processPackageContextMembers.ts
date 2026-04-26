import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalQuery } from './_generated/server.js';

export const processPackageContextMembersTableFields = {
  packageContextId: v.id('processPackageContexts'),
  position: v.number(),
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
  displayName: v.string(),
  versionLabel: v.string(),
  pinnedAt: v.string(),
};

export const listProcessPackageContextMembers = internalQuery({
  args: {
    packageContextId: v.string(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query('processPackageContextMembers')
      .withIndex('by_packageContextId_position', (indexQuery) =>
        indexQuery.eq('packageContextId', args.packageContextId as Id<'processPackageContexts'>),
      )
      .order('asc')
      .take(256);

    return members.map((member) => ({
      memberId: member._id,
      packageContextId: member.packageContextId,
      position: member.position,
      artifactId: member.artifactId,
      artifactVersionId: member.artifactVersionId,
      displayName: member.displayName,
      versionLabel: member.versionLabel,
      pinnedAt: member.pinnedAt,
    }));
  },
});
