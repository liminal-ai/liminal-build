import type { ArchiveEntry, ArchivePage } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server.js';
import { v } from 'convex/values';

export const archiveEntryKindValidator = v.union(
  v.literal('user_message'),
  v.literal('model_message'),
  v.literal('reasoning'),
  v.literal('script_emission'),
  v.literal('tool_call'),
  v.literal('tool_result'),
  v.literal('process_event'),
);

export const archiveEntryLifecycleStateValidator = v.literal('finalized');

export const archiveBodyFormatValidator = v.union(
  v.literal('plain_text'),
  v.literal('markdown'),
  v.literal('structured'),
  v.literal('none'),
);

export const archiveEntryStatusValidator = v.union(v.literal('ready'), v.literal('degraded'));

export const archiveEntryBodyDataValidator = v.object({
  jsonText: v.string(),
});

export const archiveEntriesTableFields = {
  projectId: v.string(),
  processId: v.id('processes'),
  entryKind: archiveEntryKindValidator,
  sequence: v.number(),
  lifecycleState: archiveEntryLifecycleStateValidator,
  finalizationKey: v.string(),
  sourceObjectId: v.union(v.string(), v.null()),
  bodyText: v.union(v.string(), v.null()),
  bodyData: v.union(archiveEntryBodyDataValidator, v.null()),
  bodyFormat: archiveBodyFormatValidator,
  relatedArtifactVersionId: v.union(v.id('artifactVersions'), v.null()),
  relatedSourceProvenanceId: v.union(v.string(), v.null()),
  relatedToolCallId: v.union(v.string(), v.null()),
  entryStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
  recordedAt: v.string(),
};

const archiveEntryWriteArgsValidator = {
  projectId: v.string(),
  processId: v.string(),
  entryKind: archiveEntryKindValidator,
  finalizationKey: v.string(),
  sourceObjectId: v.optional(v.union(v.string(), v.null())),
  bodyText: v.optional(v.union(v.string(), v.null())),
  bodyData: v.optional(v.union(archiveEntryBodyDataValidator, v.null())),
  bodyFormat: archiveBodyFormatValidator,
  relatedArtifactVersionId: v.optional(v.union(v.string(), v.null())),
  relatedSourceProvenanceId: v.optional(v.union(v.string(), v.null())),
  relatedToolCallId: v.optional(v.union(v.string(), v.null())),
  entryStatus: v.optional(archiveEntryStatusValidator),
  degradationReason: v.optional(v.union(v.string(), v.null())),
  recordedAt: v.optional(v.string()),
} as const;

const archiveListArgsValidator = {
  processId: v.string(),
  cursor: v.optional(v.union(v.string(), v.null())),
  limit: v.number(),
} as const;

const archivePatchArgsValidator = {
  processId: v.string(),
  finalizationKey: v.string(),
  relatedArtifactVersionId: v.optional(v.union(v.string(), v.null())),
  relatedSourceProvenanceId: v.optional(v.union(v.string(), v.null())),
  relatedToolCallId: v.optional(v.union(v.string(), v.null())),
  entryStatus: v.optional(archiveEntryStatusValidator),
  degradationReason: v.optional(v.union(v.string(), v.null())),
} as const;

const MAX_ARCHIVE_PAGE_SIZE = 200;
const supportedArchiveEntryKinds = new Set([
  'user_message',
  'model_message',
  'reasoning',
  'script_emission',
  'tool_call',
  'tool_result',
  'process_event',
] satisfies ArchiveEntry['entryKind'][]);

export const appendArchiveEntry = mutation({
  args: archiveEntryWriteArgsValidator,
  handler: async (ctx: MutationCtx, args): Promise<ArchiveEntry> => {
    assertArchiveEntryInput(args);
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId, args.projectId);
    const existingEntry = await ctx.db
      .query('archiveEntries')
      .withIndex('by_processId_and_finalizationKey', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id).eq('finalizationKey', args.finalizationKey),
      )
      .unique();

    if (existingEntry !== null) {
      return buildArchiveEntry(existingEntry);
    }

    const mostRecentEntry = await ctx.db
      .query('archiveEntries')
      .withIndex('by_processId_and_sequence', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id),
      )
      .order('desc')
      .take(1);
    const nextSequence = (mostRecentEntry[0]?.sequence ?? -1) + 1;
    const archiveEntryId = await ctx.db.insert('archiveEntries', {
      projectId: args.projectId,
      processId: processRecord._id,
      entryKind: args.entryKind,
      sequence: nextSequence,
      lifecycleState: 'finalized',
      finalizationKey: args.finalizationKey,
      sourceObjectId: args.sourceObjectId ?? null,
      bodyText: args.bodyText ?? null,
      bodyData: args.bodyData ?? null,
      bodyFormat: args.bodyFormat,
      relatedArtifactVersionId:
        args.relatedArtifactVersionId === undefined || args.relatedArtifactVersionId === null
          ? null
          : (args.relatedArtifactVersionId as Id<'artifactVersions'>),
      relatedSourceProvenanceId: args.relatedSourceProvenanceId ?? null,
      relatedToolCallId: args.relatedToolCallId ?? null,
      entryStatus: args.entryStatus ?? 'ready',
      degradationReason: args.degradationReason ?? null,
      recordedAt: args.recordedAt ?? new Date().toISOString(),
    });
    await invalidateArchiveDerivedCaches(ctx, processRecord._id);
    const storedEntry = await ctx.db.get(archiveEntryId);

    if (storedEntry === null) {
      throw new Error('Archive entry was not found after append.');
    }

    return buildArchiveEntry(storedEntry);
  },
});

export const listArchiveEntries = query({
  args: archiveListArgsValidator,
  handler: async (ctx: QueryCtx, args): Promise<ArchivePage> => {
    assertArchivePageLimit(args.limit);
    const processId = args.processId as Id<'processes'>;
    const decodedCursor = decodeArchiveCursor(args.cursor ?? null);
    const pageWithLookahead = await ctx.db
      .query('archiveEntries')
      .withIndex('by_processId_and_sequence', (indexQuery) =>
        decodedCursor === null
          ? indexQuery.eq('processId', processId)
          : indexQuery.eq('processId', processId).gt('sequence', decodedCursor),
      )
      .order('asc')
      .take(args.limit + 1);
    const hasMore = pageWithLookahead.length > args.limit;
    const pageEntries = pageWithLookahead
      .slice(0, args.limit)
      .map((entry) => buildArchiveEntry(entry));
    const lastEntry = pageEntries.at(-1);

    return {
      entries: pageEntries,
      page: {
        cursor: args.cursor ?? null,
        nextCursor: hasMore && lastEntry !== undefined ? String(lastEntry.sequence) : null,
        hasMore,
      },
    };
  },
});

export const patchArchiveEntry = mutation({
  args: archivePatchArgsValidator,
  handler: async (ctx: MutationCtx, args): Promise<ArchiveEntry | null> => {
    if (args.finalizationKey.trim().length === 0) {
      throw new Error('Archive entries require a non-empty finalization key.');
    }

    assertOptionalNonEmptyString(args.relatedArtifactVersionId, 'Related artifact version id');
    assertOptionalNonEmptyString(args.relatedSourceProvenanceId, 'Related source provenance id');
    assertOptionalNonEmptyString(args.relatedToolCallId, 'Related tool call id');

    const processId = args.processId as Id<'processes'>;
    const existingEntry = await ctx.db
      .query('archiveEntries')
      .withIndex('by_processId_and_finalizationKey', (indexQuery) =>
        indexQuery.eq('processId', processId).eq('finalizationKey', args.finalizationKey),
      )
      .unique();

    if (existingEntry === null) {
      return null;
    }

    await ctx.db.patch(existingEntry._id, {
      relatedArtifactVersionId:
        args.relatedArtifactVersionId === undefined
          ? existingEntry.relatedArtifactVersionId
          : args.relatedArtifactVersionId === null
            ? null
            : (args.relatedArtifactVersionId as Id<'artifactVersions'>),
      relatedSourceProvenanceId:
        args.relatedSourceProvenanceId === undefined
          ? existingEntry.relatedSourceProvenanceId
          : args.relatedSourceProvenanceId,
      relatedToolCallId:
        args.relatedToolCallId === undefined
          ? existingEntry.relatedToolCallId
          : args.relatedToolCallId,
      entryStatus: args.entryStatus ?? existingEntry.entryStatus,
      degradationReason:
        args.degradationReason === undefined
          ? existingEntry.degradationReason
          : args.degradationReason,
    });
    await invalidateArchiveDerivedCaches(ctx, processId);

    const storedEntry = await ctx.db.get(existingEntry._id);

    if (storedEntry === null) {
      throw new Error('Archive entry was not found after patch.');
    }

    return buildArchiveEntry(storedEntry);
  },
});

async function invalidateArchiveDerivedCaches(
  ctx: MutationCtx,
  processId: Id<'processes'>,
): Promise<void> {
  const storedTurns = await ctx.db
    .query('archiveTurns')
    .withIndex('by_processId_and_turnId', (indexQuery) => indexQuery.eq('processId', processId))
    .collect();
  const storedViews = await ctx.db
    .query('derivedArchiveViews')
    .withIndex('by_processId_and_updatedAt', (indexQuery) => indexQuery.eq('processId', processId))
    .collect();

  for (const storedTurn of storedTurns) {
    await ctx.db.delete(storedTurn._id);
  }

  for (const storedView of storedViews) {
    await ctx.db.delete(storedView._id);
  }
}

function assertArchiveEntryInput(args: {
  entryKind: string;
  finalizationKey: string;
  sourceObjectId?: string | null;
  bodyText?: string | null;
  bodyData?: { jsonText: string } | null;
  bodyFormat: ArchiveEntry['bodyFormat'];
  relatedArtifactVersionId?: string | null;
  relatedSourceProvenanceId?: string | null;
  relatedToolCallId?: string | null;
  entryStatus?: ArchiveEntry['entryStatus'];
  degradationReason?: string | null;
}): void {
  if (!supportedArchiveEntryKinds.has(args.entryKind as ArchiveEntry['entryKind'])) {
    throw new Error(`Unsupported archive entry kind: ${args.entryKind}`);
  }

  if (args.finalizationKey.trim().length === 0) {
    throw new Error('Archive entries require a non-empty finalization key.');
  }

  assertOptionalNonEmptyString(args.sourceObjectId, 'Source object id');
  assertOptionalNonEmptyString(args.bodyText, 'Archive body text');
  assertOptionalNonEmptyString(args.relatedArtifactVersionId, 'Related artifact version id');
  assertOptionalNonEmptyString(args.relatedSourceProvenanceId, 'Related source provenance id');
  assertOptionalNonEmptyString(args.relatedToolCallId, 'Related tool call id');

  if (args.bodyFormat === 'structured' && args.bodyData == null) {
    throw new Error('Structured archive entries must include bodyData.');
  }

  if (args.bodyFormat === 'none' && (args.bodyText != null || args.bodyData != null)) {
    throw new Error("Archive entries with bodyFormat 'none' cannot include body content.");
  }

  if ((args.entryStatus ?? 'ready') === 'degraded' && args.degradationReason == null) {
    throw new Error('Degraded archive entries must include a degradation reason.');
  }
}

function assertOptionalNonEmptyString(value: string | null | undefined, label: string): void {
  if (value !== undefined && value !== null && value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string when provided.`);
  }
}

function assertArchivePageLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_ARCHIVE_PAGE_SIZE) {
    throw new Error(
      `Archive page limit must be an integer between 1 and ${MAX_ARCHIVE_PAGE_SIZE}.`,
    );
  }
}

async function getProcessRecordOrThrow(
  ctx: MutationCtx,
  processIdValue: string,
  projectId: string,
): Promise<Doc<'processes'>> {
  const processRecord = await ctx.db.get(processIdValue as Id<'processes'>);

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  if (processRecord.projectId !== projectId) {
    throw new Error('Process does not belong to the requested project.');
  }

  return processRecord;
}

function buildArchiveEntry(record: Doc<'archiveEntries'>): ArchiveEntry {
  return {
    archiveEntryId: record._id,
    projectId: record.projectId,
    processId: record.processId,
    entryKind: record.entryKind,
    sequence: record.sequence,
    lifecycleState: record.lifecycleState,
    finalizationKey: record.finalizationKey,
    sourceObjectId: record.sourceObjectId,
    bodyText: record.bodyText,
    bodyData: record.bodyData,
    bodyFormat: record.bodyFormat,
    relatedArtifactVersionId: record.relatedArtifactVersionId,
    relatedSourceProvenanceId: record.relatedSourceProvenanceId,
    relatedToolCallId: record.relatedToolCallId,
    entryStatus: record.entryStatus,
    degradationReason: record.degradationReason,
    recordedAt: record.recordedAt,
  };
}

function decodeArchiveCursor(cursor: string | null): number | null {
  if (cursor == null) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
