import { v } from 'convex/values';

export const processProductDefinitionStateTableFields = {
  processId: v.string(),
  currentArtifactIds: v.optional(v.array(v.id('artifacts'))),
  currentSourceAttachmentIds: v.optional(v.array(v.id('sourceAttachments'))),
  createdAt: v.string(),
  updatedAt: v.string(),
};
