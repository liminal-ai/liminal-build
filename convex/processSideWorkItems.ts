import { v } from 'convex/values';

export const processSideWorkStatusValidator = v.union(
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
);

export const processSideWorkItemsTableFields = {
  processId: v.id('processes'),
  displayLabel: v.string(),
  purposeSummary: v.string(),
  status: processSideWorkStatusValidator,
  resultSummary: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};
