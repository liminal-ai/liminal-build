import { v } from 'convex/values';

export const usersTableFields = {
  workosUserId: v.string(),
  email: v.union(v.string(), v.null()),
  displayName: v.union(v.string(), v.null()),
  createdAt: v.string(),
  updatedAt: v.string(),
};
