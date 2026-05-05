import { v } from 'convex/values';
import { archiveEntryStatusValidator } from './archiveEntries.js';
import type { DerivedArchiveView } from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { makeFunctionReference } from 'convex/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server.js';
import { assertValidApiKey } from './serviceApiKey.js';

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

const derivedArchiveViewTurnRangeValidator = v.object({
  startIndex: v.number(),
  endIndex: v.number(),
});

const derivedArchiveViewValidator = v.object({
  derivedViewId: v.string(),
  processId: v.string(),
  viewKind: derivedArchiveViewKindValidator,
  turnRange: v.union(derivedArchiveViewTurnRangeValidator, v.null()),
  sourceTurnIds: v.array(v.string()),
  sourceArchiveEntryIds: v.array(v.string()),
  title: v.union(v.string(), v.null()),
  bodyText: v.union(v.string(), v.null()),
  viewStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
  updatedAt: v.string(),
});

const replaceDerivedArchiveViewsArgsValidator = {
  projectId: v.string(),
  processId: v.string(),
  views: v.array(derivedArchiveViewValidator),
} as const;

const listDerivedArchiveViewsArgsValidator = {
  processId: v.string(),
} as const;

const replaceDerivedArchiveViewsInternalRef = makeFunctionReference<
  'mutation',
  {
    projectId: string;
    processId: string;
    views: DerivedArchiveView[];
  },
  null
>('derivedArchiveViews:replaceDerivedArchiveViews');

const listDerivedArchiveViewsInternalRef = makeFunctionReference<
  'query',
  {
    processId: string;
  },
  DerivedArchiveView[]
>('derivedArchiveViews:listDerivedArchiveViews');

export const replaceDerivedArchiveViewsForService = mutation({
  args: {
    apiKey: v.string(),
    ...replaceDerivedArchiveViewsArgsValidator,
  },
  handler: async (ctx, args): Promise<null> => {
    assertValidApiKey(args.apiKey);

    const result: null = await ctx.runMutation(replaceDerivedArchiveViewsInternalRef, {
      projectId: args.projectId,
      processId: args.processId,
      views: args.views,
    });

    return result;
  },
});

export const replaceDerivedArchiveViews = internalMutation({
  args: replaceDerivedArchiveViewsArgsValidator,
  handler: async (ctx: MutationCtx, args): Promise<null> => {
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId, args.projectId);
    const existingViews = await ctx.db
      .query('derivedArchiveViews')
      .withIndex('by_processId_and_updatedAt', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id),
      )
      .collect();
    const nextViewIds = new Set<string>();

    for (const view of args.views) {
      assertDerivedArchiveView(view, args.processId);
      nextViewIds.add(view.derivedViewId);
    }

    for (const existingView of existingViews) {
      if (!nextViewIds.has(existingView.derivedViewId)) {
        await ctx.db.delete(existingView._id);
      }
    }

    for (const view of args.views) {
      const storedView = {
        projectId: args.projectId,
        processId: processRecord._id,
        derivedViewId: view.derivedViewId,
        viewKind: view.viewKind,
        startTurnIndex: view.turnRange?.startIndex ?? null,
        endTurnIndex: view.turnRange?.endIndex ?? null,
        sourceTurnIds: [...view.sourceTurnIds],
        sourceArchiveEntryIds: view.sourceArchiveEntryIds.map(
          (archiveEntryId) => archiveEntryId as Id<'archiveEntries'>,
        ),
        title: view.title,
        bodyText: view.bodyText,
        viewStatus: view.viewStatus,
        degradationReason: view.degradationReason,
        updatedAt: view.updatedAt,
      };
      const existing = existingViews.find(
        (existingView) => existingView.derivedViewId === view.derivedViewId,
      );

      if (existing === undefined) {
        await ctx.db.insert('derivedArchiveViews', storedView);
        continue;
      }

      await ctx.db.patch(existing._id, storedView);
    }

    return null;
  },
});

export const listDerivedArchiveViewsForService = query({
  args: {
    apiKey: v.string(),
    ...listDerivedArchiveViewsArgsValidator,
  },
  handler: async (ctx, args): Promise<DerivedArchiveView[]> => {
    assertValidApiKey(args.apiKey);

    const result: DerivedArchiveView[] = await ctx.runQuery(listDerivedArchiveViewsInternalRef, {
      processId: args.processId,
    });

    return result;
  },
});

export const listDerivedArchiveViews = internalQuery({
  args: listDerivedArchiveViewsArgsValidator,
  handler: async (ctx: QueryCtx, args): Promise<DerivedArchiveView[]> => {
    const processId = args.processId as Id<'processes'>;
    const storedViews = await ctx.db
      .query('derivedArchiveViews')
      .withIndex('by_processId_and_updatedAt', (indexQuery) =>
        indexQuery.eq('processId', processId),
      )
      .order('desc')
      .collect();

    return storedViews.map((storedView) => buildDerivedArchiveView(storedView));
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

function buildDerivedArchiveView(record: Doc<'derivedArchiveViews'>): DerivedArchiveView {
  return {
    derivedViewId: record.derivedViewId,
    processId: record.processId,
    viewKind: record.viewKind,
    turnRange:
      record.startTurnIndex === null || record.endTurnIndex === null
        ? null
        : {
            startIndex: record.startTurnIndex,
            endIndex: record.endTurnIndex,
          },
    sourceTurnIds: [...record.sourceTurnIds],
    sourceArchiveEntryIds: [...record.sourceArchiveEntryIds],
    title: record.title,
    bodyText: record.bodyText,
    viewStatus: record.viewStatus,
    degradationReason: record.degradationReason,
    updatedAt: record.updatedAt,
  };
}

function assertDerivedArchiveView(view: DerivedArchiveView, processId: string): void {
  if (view.derivedViewId.trim().length === 0) {
    throw new Error('Derived archive views require a non-empty derivedViewId.');
  }

  if (view.processId !== processId) {
    throw new Error('Derived archive view processId must match the enclosing process.');
  }

  if (view.viewKind === 'turn_range' && view.turnRange === null) {
    throw new Error('Turn-range views require turnRange metadata.');
  }

  if (view.turnRange !== null && view.turnRange.endIndex < view.turnRange.startIndex) {
    throw new Error('Derived archive view turn ranges must end at or after their start index.');
  }

  if (
    view.sourceTurnIds.length === 0 ||
    view.sourceTurnIds.some((turnId) => turnId.trim().length === 0)
  ) {
    throw new Error('Derived archive views require at least one non-empty source turn id.');
  }

  if (
    view.sourceArchiveEntryIds.length === 0 ||
    view.sourceArchiveEntryIds.some((archiveEntryId) => archiveEntryId.trim().length === 0)
  ) {
    throw new Error(
      'Derived archive views require at least one non-empty source archive entry id.',
    );
  }

  assertOptionalNonEmptyString(view.title, 'Derived archive view title');
  assertOptionalNonEmptyString(view.bodyText, 'Derived archive view body text');

  if (
    view.viewStatus === 'degraded' &&
    (view.degradationReason === null || view.degradationReason.trim().length === 0)
  ) {
    throw new Error('Degraded derived archive views must include a degradation reason.');
  }
}

function assertOptionalNonEmptyString(value: string | null, label: string): void {
  if (value !== null && value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string when provided.`);
  }
}
