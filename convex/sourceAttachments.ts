import { v } from 'convex/values';

export const sourceAttachmentsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  displayName: v.string(),
  purpose: v.union(
    v.literal('research'),
    v.literal('review'),
    v.literal('implementation'),
    v.literal('other'),
  ),
  targetRef: v.union(v.string(), v.null()),
  hydrationState: v.union(
    v.literal('not_hydrated'),
    v.literal('hydrated'),
    v.literal('stale'),
    v.literal('unavailable'),
  ),
  updatedAt: v.string(),
};
