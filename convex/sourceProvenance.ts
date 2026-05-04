import { v } from 'convex/values';

export const sourceProvenanceTableFields = {
  projectId: v.string(),
  processId: v.string(),
  sourceAttachmentId: v.union(v.id('sourceAttachments'), v.null()),
  relationshipKind: v.union(v.literal('informed_work'), v.literal('received_code_update')),
  repositoryFullName: v.string(),
  repositoryUrl: v.string(),
  targetRef: v.union(v.string(), v.null()),
  eventId: v.union(v.string(), v.null()),
  entryStatus: v.union(v.literal('ready'), v.literal('degraded')),
  degradationReason: v.union(v.string(), v.null()),
  recordedAt: v.string(),
};
