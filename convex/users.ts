import { mutationGeneric as mutation } from 'convex/server';
import { v } from 'convex/values';

export const usersTableFields = {
  workosUserId: v.string(),
  email: v.union(v.string(), v.null()),
  displayName: v.union(v.string(), v.null()),
  createdAt: v.string(),
  updatedAt: v.string(),
};

export const upsertUserFromWorkOS = mutation({
  args: {
    workosUserId: v.string(),
    email: v.union(v.string(), v.null()),
    displayName: v.union(v.string(), v.null()),
  },
  handler: async (ctx: any, args: any) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_workosUserId', (query: any) => query.eq('workosUserId', args.workosUserId))
      .unique();
    const now = new Date().toISOString();

    if (existingUser !== null) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        displayName: args.displayName,
        updatedAt: now,
      });

      return {
        userId: existingUser._id,
        workosUserId: args.workosUserId,
        email: args.email,
        displayName: args.displayName,
      };
    }

    const userId = await ctx.db.insert('users', {
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
  },
});
