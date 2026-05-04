import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server.js';

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

export const createSourceProvenance = mutation({
  args: {
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
    recordedAt: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const provenanceId = await ctx.db.insert('sourceProvenance', {
      projectId: args.projectId,
      processId: args.processId,
      sourceAttachmentId: args.sourceAttachmentId,
      relationshipKind: args.relationshipKind,
      repositoryFullName: args.repositoryFullName,
      repositoryUrl: args.repositoryUrl,
      targetRef: args.targetRef,
      eventId: args.eventId,
      entryStatus: args.entryStatus,
      degradationReason: args.degradationReason,
      recordedAt: args.recordedAt ?? new Date().toISOString(),
    });

    const record = await ctx.db.get(provenanceId);

    if (record === null) {
      throw new Error('Source provenance could not be loaded after creation.');
    }

    return buildStoredSourceProvenanceRecord(record);
  },
});

export const listProcessSourceProvenanceEntries = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => {
    const records = await ctx.db
      .query('sourceProvenance')
      .withIndex('by_processId_recordedAt', (indexQuery) =>
        indexQuery.eq('processId', args.processId),
      )
      .order('desc')
      .take(200);

    return records.map((record) => buildStoredSourceProvenanceRecord(record));
  },
});

function buildStoredSourceProvenanceRecord(record: Doc<'sourceProvenance'>) {
  return {
    provenanceId: record._id as Id<'sourceProvenance'>,
    projectId: record.projectId,
    processId: record.processId,
    sourceAttachmentId: record.sourceAttachmentId,
    relationshipKind: record.relationshipKind,
    repositoryFullName: record.repositoryFullName,
    repositoryUrl: record.repositoryUrl,
    targetRef: record.targetRef,
    eventId: record.eventId,
    entryStatus: record.entryStatus,
    degradationReason: record.degradationReason,
    recordedAt: record.recordedAt,
  };
}
