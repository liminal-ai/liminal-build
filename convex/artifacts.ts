import { v } from 'convex/values';

export const artifactsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  displayName: v.string(),
  currentVersionLabel: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};
