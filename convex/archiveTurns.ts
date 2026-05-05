import type { ArchiveTurnPage, DerivedTurn } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server.js';
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

const derivedTurnValidator = v.object({
  turnId: v.string(),
  processId: v.string(),
  turnIndex: v.number(),
  archiveEntryIds: v.array(v.string()),
  startedAt: v.string(),
  endedAt: v.string(),
  turnStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
});

const upsertArchiveTurnsArgsValidator = {
  projectId: v.string(),
  processId: v.string(),
  turns: v.array(derivedTurnValidator),
} as const;

const listArchiveTurnsArgsValidator = {
  processId: v.string(),
  cursor: v.optional(v.union(v.string(), v.null())),
  limit: v.number(),
} as const;

const MAX_TURN_PAGE_SIZE = 100;

export const upsertArchiveTurns = mutation({
  args: upsertArchiveTurnsArgsValidator,
  handler: async (ctx: MutationCtx, args): Promise<null> => {
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId, args.projectId);
    const rebuiltAt = new Date().toISOString();
    const existingTurns = await ctx.db
      .query('archiveTurns')
      .withIndex('by_processId_and_turnId', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id),
      )
      .collect();
    const existingByTurnId = new Map(existingTurns.map((turn) => [turn.turnId, turn]));
    const nextTurnIds = new Set<string>();

    for (const turn of [...args.turns].sort((left, right) => left.turnIndex - right.turnIndex)) {
      assertDerivedTurn(turn, args.processId);
      nextTurnIds.add(turn.turnId);
      const storedTurn = {
        projectId: args.projectId,
        processId: processRecord._id,
        turnId: turn.turnId,
        turnIndex: turn.turnIndex,
        archiveEntryIds: turn.archiveEntryIds.map((entryId) => entryId as Id<'archiveEntries'>),
        startedAt: turn.startedAt,
        endedAt: turn.endedAt,
        turnStatus: turn.turnStatus,
        degradationReason: turn.degradationReason,
        rebuiltAt,
      };
      const existing = existingByTurnId.get(turn.turnId);

      if (existing === undefined) {
        await ctx.db.insert('archiveTurns', storedTurn);
        continue;
      }

      await ctx.db.patch(existing._id, storedTurn);
    }

    for (const existing of existingTurns) {
      if (!nextTurnIds.has(existing.turnId)) {
        await ctx.db.delete(existing._id);
      }
    }

    return null;
  },
});

export const listArchiveTurns = query({
  args: listArchiveTurnsArgsValidator,
  handler: async (ctx: QueryCtx, args): Promise<ArchiveTurnPage> => {
    assertTurnPageLimit(args.limit);
    const processId = args.processId as Id<'processes'>;
    const decodedCursor = decodeArchiveTurnCursor(args.cursor ?? null);
    const pageWithLookahead = await ctx.db
      .query('archiveTurns')
      .withIndex('by_processId_and_turnIndex', (indexQuery) =>
        decodedCursor === null
          ? indexQuery.eq('processId', processId)
          : indexQuery.eq('processId', processId).gt('turnIndex', decodedCursor),
      )
      .order('asc')
      .take(args.limit + 1);
    const hasMore = pageWithLookahead.length > args.limit;
    const pageTurns = pageWithLookahead.slice(0, args.limit).map((turn) => buildDerivedTurn(turn));
    const lastTurn = pageTurns.at(-1);

    return {
      turns: pageTurns,
      page: {
        cursor: args.cursor ?? null,
        nextCursor: hasMore && lastTurn !== undefined ? String(lastTurn.turnIndex) : null,
        hasMore,
      },
    };
  },
});

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

function buildDerivedTurn(record: Doc<'archiveTurns'>): DerivedTurn {
  return {
    turnId: record.turnId,
    processId: record.processId,
    turnIndex: record.turnIndex,
    archiveEntryIds: [...record.archiveEntryIds],
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    turnStatus: record.turnStatus,
    degradationReason: record.degradationReason,
  };
}

function assertDerivedTurn(turn: DerivedTurn, processId: string): void {
  if (turn.turnId.trim().length === 0) {
    throw new Error('Derived turns require a non-empty turnId.');
  }

  if (turn.processId !== processId) {
    throw new Error('Derived turn processId must match the enclosing process.');
  }

  if (!Number.isInteger(turn.turnIndex) || turn.turnIndex < 0) {
    throw new Error('Derived turns require a non-negative turnIndex.');
  }

  if (turn.archiveEntryIds.length === 0) {
    throw new Error('Derived turns require at least one archive entry id.');
  }

  if (turn.archiveEntryIds.some((archiveEntryId) => archiveEntryId.trim().length === 0)) {
    throw new Error('Derived turn archive entry ids must be non-empty strings.');
  }

  if (
    turn.turnStatus === 'degraded' &&
    (turn.degradationReason === null || turn.degradationReason.trim().length === 0)
  ) {
    throw new Error('Degraded turns must include a degradation reason.');
  }
}

function assertTurnPageLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_TURN_PAGE_SIZE) {
    throw new Error(`Turn page limit must be an integer between 1 and ${MAX_TURN_PAGE_SIZE}.`);
  }
}

function decodeArchiveTurnCursor(cursor: string | null): number | null {
  if (cursor == null) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
