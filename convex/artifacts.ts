import { queryGeneric as query } from 'convex/server';
import { v } from 'convex/values';

export const artifactsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  displayName: v.string(),
  currentVersionLabel: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};

export const listProjectArtifactSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_projectId_updatedAt', (query: any) => query.eq('projectId', args.projectId))
      .order('desc')
      .collect();

    return Promise.all(
      artifacts.map(async (artifact: any) => {
        const attachedProcess =
          artifact.processId === null ? null : await ctx.db.get(artifact.processId);

        return {
          artifactId: artifact._id,
          displayName: artifact.displayName,
          currentVersionLabel: artifact.currentVersionLabel,
          attachmentScope: artifact.processId === null ? 'project' : 'process',
          processId: artifact.processId,
          processDisplayLabel: attachedProcess?.displayLabel ?? null,
          updatedAt: artifact.updatedAt,
        };
      }),
    );
  },
});
