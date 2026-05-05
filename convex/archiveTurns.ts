import { v } from 'convex/values';
import { archiveEntryStatusValidator } from './archiveEntries.js';

export const archiveTurnsTableFields = {
  projectId: v.string(),
  processId: v.id('processes'),
  turnId: v.string(),
  turnIndex: v.number(),
  archiveEntryIds: v.array(v.id('archiveEntries')),
  startedAt: v.string(),
  endedAt: v.string(),
  turnStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
  rebuiltAt: v.string(),
};
