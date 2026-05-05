import { v } from 'convex/values';
import { archiveEntryStatusValidator } from './archiveEntries.js';

export const derivedArchiveViewKindValidator = v.union(
  v.literal('turn_range'),
  v.literal('chunk_candidate'),
);

export const derivedArchiveViewsTableFields = {
  projectId: v.string(),
  processId: v.id('processes'),
  derivedViewId: v.string(),
  viewKind: derivedArchiveViewKindValidator,
  startTurnIndex: v.union(v.number(), v.null()),
  endTurnIndex: v.union(v.number(), v.null()),
  sourceTurnIds: v.array(v.string()),
  sourceArchiveEntryIds: v.array(v.id('archiveEntries')),
  title: v.union(v.string(), v.null()),
  bodyText: v.union(v.string(), v.null()),
  viewStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};
