import { v } from 'convex/values';

export const projectMembersTableFields = {
  projectId: v.string(),
  userId: v.string(),
  role: v.union(v.literal('owner'), v.literal('member')),
  createdAt: v.string(),
  updatedAt: v.string(),
};
