import { v } from 'convex/values';

export const processOutputsTableFields = {
  processId: v.id('processes'),
  linkedArtifactId: v.union(v.id('artifacts'), v.null()),
  displayName: v.string(),
  revisionLabel: v.union(v.string(), v.null()),
  state: v.string(),
  updatedAt: v.string(),
};
