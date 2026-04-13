import { queryGeneric as query } from 'convex/server';
import { v } from 'convex/values';

export const projectsTableFields = {
  ownerUserId: v.string(),
  name: v.string(),
  lastUpdatedAt: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
};

async function buildProjectSummary(
  ctx: any,
  args: {
    project: any;
    role: 'owner' | 'member';
  },
) {
  const ownerUser = await ctx.db.get(args.project.ownerUserId);
  const processes = await ctx.db
    .query('processes')
    .withIndex('by_projectId', (query: any) => query.eq('projectId', args.project._id))
    .collect();
  const artifacts = await ctx.db
    .query('artifacts')
    .withIndex('by_projectId', (query: any) => query.eq('projectId', args.project._id))
    .collect();
  const sourceAttachments = await ctx.db
    .query('sourceAttachments')
    .withIndex('by_projectId', (query: any) => query.eq('projectId', args.project._id))
    .collect();

  return {
    projectId: args.project._id,
    name: args.project.name,
    ownerDisplayName: ownerUser?.displayName ?? ownerUser?.email ?? null,
    role: args.role,
    processCount: processes.length,
    artifactCount: artifacts.length,
    sourceAttachmentCount: sourceAttachments.length,
    lastUpdatedAt: args.project.lastUpdatedAt,
  };
}

export const listAccessibleProjectSummaries = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const ownedProjects = await ctx.db
      .query('projects')
      .withIndex('by_ownerUserId', (query: any) => query.eq('ownerUserId', args.userId))
      .collect();
    const memberships = await ctx.db
      .query('projectMembers')
      .withIndex('by_userId', (query: any) => query.eq('userId', args.userId))
      .collect();
    const summariesById = new Map<string, any>();

    for (const project of ownedProjects) {
      summariesById.set(
        project._id,
        await buildProjectSummary(ctx, {
          project,
          role: 'owner',
        }),
      );
    }

    for (const membership of memberships) {
      if (summariesById.has(membership.projectId)) {
        continue;
      }

      const project = await ctx.db.get(membership.projectId);
      if (project === null) {
        continue;
      }

      summariesById.set(
        project._id,
        await buildProjectSummary(ctx, {
          project,
          role: membership.role,
        }),
      );
    }

    return [...summariesById.values()].sort((left, right) =>
      right.lastUpdatedAt.localeCompare(left.lastUpdatedAt),
    );
  },
});

export const getProjectAccess = query({
  args: {
    userId: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const project = await ctx.db.get(args.projectId);

    if (project === null) {
      return {
        kind: 'not_found' as const,
      };
    }

    if (project.ownerUserId === args.userId) {
      return {
        kind: 'accessible' as const,
        project: await buildProjectSummary(ctx, {
          project,
          role: 'owner',
        }),
      };
    }

    const memberships = await ctx.db
      .query('projectMembers')
      .withIndex('by_userId', (query: any) => query.eq('userId', args.userId))
      .collect();
    const membership = memberships.find((entry: any) => entry.projectId === args.projectId);

    if (membership === undefined) {
      return {
        kind: 'forbidden' as const,
      };
    }

    return {
      kind: 'accessible' as const,
      project: await buildProjectSummary(ctx, {
        project,
        role: membership.role,
      }),
    };
  },
});
