import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';
import { computeWorkingSetFingerprint } from './processEnvironmentStates.js';

export const sourceAttachmentsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  provider: v.literal('github'),
  displayName: v.string(),
  purpose: v.union(
    v.literal('research'),
    v.literal('review'),
    v.literal('implementation'),
    v.literal('other'),
  ),
  accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
  // Canonical clone URL for the source. Used by `LocalProviderAdapter` to clone
  // the working tree at hydration time and by `OctokitCodeCheckpointWriter` to
  // resolve the GitHub repo coordinates for direct writes back to the attached
  // writable target ref. Must be a full URL the underlying tooling can use
  // directly (e.g., `https://github.com/owner/repo`, `https://github.com/owner/repo.git`).
  repositoryUrl: v.string(),
  repositoryFullName: v.string(),
  targetRef: v.union(v.string(), v.null()),
  hydrationState: v.union(
    v.literal('not_hydrated'),
    v.literal('hydrated'),
    v.literal('stale'),
    v.literal('unavailable'),
  ),
  lastHydratedAt: v.union(v.string(), v.null()),
  lastHydratedResolvedRef: v.union(v.string(), v.null()),
  lastObservedRemoteResolvedRef: v.union(v.string(), v.null()),
  freshnessReason: v.union(v.string(), v.null()),
  refreshStatus: v.union(v.literal('idle'), v.literal('pending'), v.literal('failed')),
  refreshRequestedAt: v.union(v.string(), v.null()),
  detachedAt: v.union(v.string(), v.null()),
  detachedByUserId: v.union(v.string(), v.null()),
  updatedAt: v.string(),
};

export const listProjectSourceAttachmentSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => {
    const sourceAttachments = await ctx.db
      .query('sourceAttachments')
      .withIndex('by_projectId_updatedAt', (indexQuery) =>
        indexQuery.eq('projectId', args.projectId),
      )
      .order('desc')
      .collect();

    return Promise.all(
      sourceAttachments.map(async (sourceAttachment: Doc<'sourceAttachments'>) => {
        const attachedProcess =
          sourceAttachment.processId === null
            ? null
            : await ctx.db.get(sourceAttachment.processId as Id<'processes'>);

        return {
          sourceAttachmentId: sourceAttachment._id,
          provider: sourceAttachment.provider,
          displayName: sourceAttachment.displayName,
          purpose: sourceAttachment.purpose,
          accessMode: sourceAttachment.accessMode,
          repositoryUrl: sourceAttachment.repositoryUrl,
          repositoryFullName: sourceAttachment.repositoryFullName,
          targetRef: sourceAttachment.targetRef,
          hydrationState: sourceAttachment.hydrationState,
          lastHydratedAt: sourceAttachment.lastHydratedAt,
          lastHydratedResolvedRef: sourceAttachment.lastHydratedResolvedRef,
          lastObservedRemoteResolvedRef: sourceAttachment.lastObservedRemoteResolvedRef,
          freshnessReason: sourceAttachment.freshnessReason,
          refreshStatus: sourceAttachment.refreshStatus,
          refreshRequestedAt: sourceAttachment.refreshRequestedAt,
          attachmentScope: sourceAttachment.processId === null ? 'project' : 'process',
          processId: sourceAttachment.processId,
          processDisplayLabel: attachedProcess?.displayLabel ?? null,
          detachedAt: sourceAttachment.detachedAt,
          updatedAt: sourceAttachment.updatedAt,
        };
      }),
    );
  },
});

export const createProjectSourceAttachment = mutation({
  args: {
    projectId: v.string(),
    provider: v.literal('github'),
    displayName: v.string(),
    purpose: v.union(
      v.literal('research'),
      v.literal('review'),
      v.literal('implementation'),
      v.literal('other'),
    ),
    accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
    repositoryUrl: v.string(),
    repositoryFullName: v.string(),
    targetRef: v.union(v.string(), v.null()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = new Date().toISOString();
    const sourceAttachmentId = await createSourceAttachmentRecord(ctx, {
      ...args,
      processId: null,
      now,
    });

    const sourceAttachment = await ctx.db.get(sourceAttachmentId);

    if (sourceAttachment === null) {
      throw new Error('Source attachment could not be loaded after creation.');
    }

    return buildSourceAttachmentSummary(ctx, sourceAttachment);
  },
});

export const createProcessSourceAttachment = mutation({
  args: {
    projectId: v.string(),
    processId: v.string(),
    provider: v.literal('github'),
    displayName: v.string(),
    purpose: v.union(
      v.literal('research'),
      v.literal('review'),
      v.literal('implementation'),
      v.literal('other'),
    ),
    accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
    repositoryUrl: v.string(),
    repositoryFullName: v.string(),
    targetRef: v.union(v.string(), v.null()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = new Date().toISOString();
    const processRecord = await getProcessRecord(ctx, args.processId);

    if (processRecord === null || processRecord.projectId !== args.projectId) {
      throw new Error('Process not found.');
    }

    const sourceAttachmentId = await createSourceAttachmentRecord(ctx, {
      ...args,
      processId: args.processId,
      now,
    });

    await appendCurrentProcessSourceRef(ctx, {
      processRecord,
      sourceAttachmentId: sourceAttachmentId as Id<'sourceAttachments'>,
      updatedAt: now,
    });

    const sourceAttachment = await ctx.db.get(sourceAttachmentId);

    if (sourceAttachment === null) {
      throw new Error('Source attachment could not be loaded after creation.');
    }

    return buildSourceAttachmentSummary(ctx, sourceAttachment);
  },
});

export const getProjectSourceAttachmentSummary = query({
  args: {
    projectId: v.string(),
    sourceAttachmentId: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => {
    const sourceAttachment = await getSourceAttachmentRecord(ctx, args.sourceAttachmentId);

    if (
      sourceAttachment === null ||
      sourceAttachment.projectId !== args.projectId ||
      sourceAttachment.detachedAt !== null
    ) {
      return null;
    }

    return buildSourceAttachmentSummary(ctx, sourceAttachment);
  },
});

export const updateSourceAttachment = mutation({
  args: {
    projectId: v.string(),
    sourceAttachmentId: v.string(),
    purpose: v.union(
      v.literal('research'),
      v.literal('review'),
      v.literal('implementation'),
      v.literal('other'),
    ),
    accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
    targetRef: v.union(v.string(), v.null()),
    hydrationState: v.optional(
      v.union(
        v.literal('not_hydrated'),
        v.literal('hydrated'),
        v.literal('stale'),
        v.literal('unavailable'),
      ),
    ),
    freshnessReason: v.optional(v.union(v.string(), v.null())),
    lastHydratedAt: v.optional(v.union(v.string(), v.null())),
    lastHydratedResolvedRef: v.optional(v.union(v.string(), v.null())),
    lastObservedRemoteResolvedRef: v.optional(v.union(v.string(), v.null())),
    refreshStatus: v.optional(
      v.union(v.literal('idle'), v.literal('pending'), v.literal('failed')),
    ),
    refreshRequestedAt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx: MutationCtx, args) => {
    const sourceAttachment = await getSourceAttachmentRecord(ctx, args.sourceAttachmentId);

    if (
      sourceAttachment === null ||
      sourceAttachment.projectId !== args.projectId ||
      sourceAttachment.detachedAt !== null
    ) {
      throw new Error('SOURCE_ATTACHMENT_NOT_FOUND');
    }

    await assertNoActiveDuplicate(ctx, {
      projectId: sourceAttachment.projectId,
      processId: sourceAttachment.processId,
      repositoryFullName: sourceAttachment.repositoryFullName,
      targetRef: args.targetRef,
      excludeSourceAttachmentId: sourceAttachment._id,
    });

    const now = new Date().toISOString();
    await ctx.db.patch(sourceAttachment._id, {
      purpose: args.purpose,
      accessMode: args.accessMode,
      targetRef: args.targetRef,
      ...(args.hydrationState === undefined ? {} : { hydrationState: args.hydrationState }),
      ...(args.lastHydratedAt === undefined ? {} : { lastHydratedAt: args.lastHydratedAt }),
      ...(args.lastHydratedResolvedRef === undefined
        ? {}
        : { lastHydratedResolvedRef: args.lastHydratedResolvedRef }),
      ...(args.lastObservedRemoteResolvedRef === undefined
        ? {}
        : { lastObservedRemoteResolvedRef: args.lastObservedRemoteResolvedRef }),
      ...(args.freshnessReason === undefined ? {} : { freshnessReason: args.freshnessReason }),
      ...(args.refreshStatus === undefined ? {} : { refreshStatus: args.refreshStatus }),
      ...(args.refreshRequestedAt === undefined
        ? {}
        : { refreshRequestedAt: args.refreshRequestedAt }),
      updatedAt: now,
    });

    if (sourceAttachment.processId === null) {
      await touchProject(ctx, sourceAttachment.projectId as Id<'projects'>, now);
    } else {
      const processRecord = await getProcessRecord(ctx, sourceAttachment.processId);

      if (processRecord !== null) {
        await touchProcessAndProject(ctx, processRecord, now);
      }
    }

    const updatedSourceAttachment = await ctx.db.get(sourceAttachment._id);

    if (updatedSourceAttachment === null) {
      throw new Error('Source attachment could not be loaded after update.');
    }

    return buildSourceAttachmentSummary(ctx, updatedSourceAttachment);
  },
});

export const detachSourceAttachment = mutation({
  args: {
    projectId: v.string(),
    sourceAttachmentId: v.string(),
    detachedByUserId: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const sourceAttachment = await getSourceAttachmentRecord(ctx, args.sourceAttachmentId);

    if (
      sourceAttachment === null ||
      sourceAttachment.projectId !== args.projectId ||
      sourceAttachment.detachedAt !== null
    ) {
      throw new Error('SOURCE_ATTACHMENT_NOT_FOUND');
    }

    const detachedAt = new Date().toISOString();
    await ctx.db.patch(sourceAttachment._id, {
      detachedAt,
      detachedByUserId: args.detachedByUserId,
      updatedAt: detachedAt,
    });

    const processRecords: Doc<'processes'>[] =
      sourceAttachment.processId === null
        ? await ctx.db
            .query('processes')
            .withIndex('by_projectId', (query) =>
              query.eq('projectId', sourceAttachment.projectId as Id<'projects'>),
            )
            .collect()
        : [];

    if (sourceAttachment.processId !== null) {
      const attachedProcess = await getProcessRecord(ctx, sourceAttachment.processId);
      if (attachedProcess !== null) {
        processRecords.push(attachedProcess);
      }
    }

    for (const processRecord of processRecords) {
      await removeCurrentProcessSourceRef(ctx, {
        processRecord,
        sourceAttachmentId: sourceAttachment._id,
        updatedAt: detachedAt,
      });
      await removeHydrationPlanSourceRef(ctx, {
        processId: processRecord._id,
        sourceAttachmentId: sourceAttachment._id,
        updatedAt: detachedAt,
      });
    }

    if (sourceAttachment.processId === null) {
      await touchProject(ctx, sourceAttachment.projectId as Id<'projects'>, detachedAt);
    }

    return {
      detached: true as const,
      sourceAttachmentId: args.sourceAttachmentId,
      detachedAt,
    };
  },
});

async function buildSourceAttachmentSummary(
  ctx: QueryCtx | MutationCtx,
  sourceAttachment: Doc<'sourceAttachments'>,
) {
  const attachedProcess =
    sourceAttachment.processId === null
      ? null
      : await ctx.db.get(sourceAttachment.processId as Id<'processes'>);

  return {
    sourceAttachmentId: sourceAttachment._id,
    provider: sourceAttachment.provider,
    displayName: sourceAttachment.displayName,
    purpose: sourceAttachment.purpose,
    accessMode: sourceAttachment.accessMode,
    repositoryUrl: sourceAttachment.repositoryUrl,
    repositoryFullName: sourceAttachment.repositoryFullName,
    targetRef: sourceAttachment.targetRef,
    hydrationState: sourceAttachment.hydrationState,
    lastHydratedAt: sourceAttachment.lastHydratedAt,
    lastHydratedResolvedRef: sourceAttachment.lastHydratedResolvedRef,
    lastObservedRemoteResolvedRef: sourceAttachment.lastObservedRemoteResolvedRef,
    freshnessReason: sourceAttachment.freshnessReason,
    refreshStatus: sourceAttachment.refreshStatus,
    refreshRequestedAt: sourceAttachment.refreshRequestedAt,
    attachmentScope: sourceAttachment.processId === null ? 'project' : 'process',
    processId: sourceAttachment.processId,
    processDisplayLabel: attachedProcess?.displayLabel ?? null,
    detachedAt: sourceAttachment.detachedAt,
    updatedAt: sourceAttachment.updatedAt,
  };
}

async function createSourceAttachmentRecord(
  ctx: MutationCtx,
  args: {
    projectId: string;
    processId: string | null;
    provider: 'github';
    displayName: string;
    purpose: 'research' | 'review' | 'implementation' | 'other';
    accessMode: 'read_only' | 'read_write';
    repositoryUrl: string;
    repositoryFullName: string;
    targetRef: string | null;
    now: string;
  },
): Promise<Id<'sourceAttachments'>> {
  await assertNoActiveDuplicate(ctx, {
    projectId: args.projectId,
    processId: args.processId,
    repositoryFullName: args.repositoryFullName,
    targetRef: args.targetRef,
  });

  const sourceAttachmentId = await ctx.db.insert('sourceAttachments', {
    projectId: args.projectId,
    processId: args.processId,
    provider: args.provider,
    displayName: args.displayName,
    purpose: args.purpose,
    accessMode: args.accessMode,
    repositoryUrl: args.repositoryUrl,
    repositoryFullName: args.repositoryFullName,
    targetRef: args.targetRef,
    hydrationState: 'not_hydrated',
    lastHydratedAt: null,
    lastHydratedResolvedRef: null,
    lastObservedRemoteResolvedRef: null,
    freshnessReason: null,
    refreshStatus: 'idle',
    refreshRequestedAt: null,
    detachedAt: null,
    detachedByUserId: null,
    updatedAt: args.now,
  });

  if (args.processId === null) {
    await touchProject(ctx, args.projectId as Id<'projects'>, args.now);
  } else {
    const processRecord = await getProcessRecord(ctx, args.processId);

    if (processRecord !== null) {
      await touchProcessAndProject(ctx, processRecord, args.now);
    }
  }

  return sourceAttachmentId;
}

async function assertNoActiveDuplicate(
  ctx: MutationCtx,
  args: {
    projectId: string;
    processId: string | null;
    repositoryFullName: string;
    targetRef: string | null;
    excludeSourceAttachmentId?: Id<'sourceAttachments'>;
  },
): Promise<void> {
  const duplicates = await ctx.db
    .query('sourceAttachments')
    .withIndex('by_projectId_processId_repositoryFullName_targetRef', (indexQuery) =>
      indexQuery
        .eq('projectId', args.projectId)
        .eq('processId', args.processId)
        .eq('repositoryFullName', args.repositoryFullName)
        .eq('targetRef', args.targetRef),
    )
    .take(10);

  if (
    duplicates.some(
      (attachment) =>
        attachment.detachedAt === null && attachment._id !== args.excludeSourceAttachmentId,
    )
  ) {
    throw new Error('SOURCE_ATTACHMENT_CONFLICT');
  }
}

async function appendCurrentProcessSourceRef(
  ctx: MutationCtx,
  args: {
    processRecord: Doc<'processes'>;
    sourceAttachmentId: Id<'sourceAttachments'>;
    updatedAt: string;
  },
): Promise<void> {
  const existingSourceAttachmentIds = await resolveCurrentProcessSourceAttachmentIds(
    ctx,
    args.processRecord,
  );
  const nextSourceAttachmentIds = dedupeIds([
    ...existingSourceAttachmentIds,
    args.sourceAttachmentId,
  ]);

  await writeCurrentProcessSourceAttachmentIds(ctx, args.processRecord, {
    sourceAttachmentIds: nextSourceAttachmentIds,
    updatedAt: args.updatedAt,
  });
  await touchProcessAndProject(ctx, args.processRecord, args.updatedAt);
}

async function removeCurrentProcessSourceRef(
  ctx: MutationCtx,
  args: {
    processRecord: Doc<'processes'>;
    sourceAttachmentId: Id<'sourceAttachments'>;
    updatedAt: string;
  },
): Promise<void> {
  const existingSourceAttachmentIds = await resolveCurrentProcessSourceAttachmentIds(
    ctx,
    args.processRecord,
  );
  const nextSourceAttachmentIds = existingSourceAttachmentIds.filter(
    (sourceAttachmentId) => sourceAttachmentId !== args.sourceAttachmentId,
  );

  if (nextSourceAttachmentIds.length === existingSourceAttachmentIds.length) {
    return;
  }

  await writeCurrentProcessSourceAttachmentIds(ctx, args.processRecord, {
    sourceAttachmentIds: nextSourceAttachmentIds,
    updatedAt: args.updatedAt,
  });
  await touchProcessAndProject(ctx, args.processRecord, args.updatedAt);
}

async function removeHydrationPlanSourceRef(
  ctx: MutationCtx,
  args: {
    processId: Id<'processes'>;
    sourceAttachmentId: Id<'sourceAttachments'>;
    updatedAt: string;
  },
): Promise<void> {
  const environmentState = await ctx.db
    .query('processEnvironmentStates')
    .withIndex('by_processId', (query) => query.eq('processId', args.processId))
    .unique();

  if (environmentState?.workingSetPlan === null || environmentState === null) {
    return;
  }

  const nextSourceAttachmentIds = environmentState.workingSetPlan.sourceAttachmentIds.filter(
    (sourceAttachmentId) => sourceAttachmentId !== args.sourceAttachmentId,
  );

  if (
    nextSourceAttachmentIds.length === environmentState.workingSetPlan.sourceAttachmentIds.length
  ) {
    return;
  }

  await ctx.db.patch(environmentState._id, {
    workingSetPlan: {
      artifactIds: environmentState.workingSetPlan.artifactIds,
      outputIds: environmentState.workingSetPlan.outputIds,
      sourceAttachmentIds: nextSourceAttachmentIds,
    },
    updatedAt: args.updatedAt,
  });

  const workingSetFingerprint = await computeWorkingSetFingerprint(ctx, args.processId);
  await ctx.db.patch(environmentState._id, {
    workingSetFingerprint,
  });
}

async function resolveCurrentProcessSourceAttachmentIds(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
): Promise<Id<'sourceAttachments'>[]> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();
      return state?.currentSourceAttachmentIds ?? [];
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();
      return state?.currentSourceAttachmentIds ?? [];
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();
      return state?.currentSourceAttachmentIds ?? [];
    }
    default:
      return [];
  }
}

async function writeCurrentProcessSourceAttachmentIds(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  args: {
    sourceAttachmentIds: Id<'sourceAttachments'>[];
    updatedAt: string;
  },
): Promise<void> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processProductDefinitionStates', {
          processId: processRecord._id,
          currentArtifactIds: [],
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processFeatureSpecificationStates', {
          processId: processRecord._id,
          currentArtifactIds: [],
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processFeatureImplementationStates', {
          processId: processRecord._id,
          currentArtifactIds: [],
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    default:
      return;
  }
}

async function getProcessRecord(
  ctx: MutationCtx,
  processId: string,
): Promise<Doc<'processes'> | null> {
  try {
    return await ctx.db.get(processId as Id<'processes'>);
  } catch {
    return null;
  }
}

async function getSourceAttachmentRecord(
  ctx: QueryCtx | MutationCtx,
  sourceAttachmentId: string,
): Promise<Doc<'sourceAttachments'> | null> {
  try {
    return await ctx.db.get(sourceAttachmentId as Id<'sourceAttachments'>);
  } catch {
    return null;
  }
}

async function touchProject(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  now: string,
): Promise<void> {
  try {
    await ctx.db.patch(projectId, {
      lastUpdatedAt: now,
      updatedAt: now,
    });
  } catch {
    // Keep the durable source attachment even if the project row lookup is stale.
  }
}

async function touchProcessAndProject(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  now: string,
): Promise<void> {
  await ctx.db.patch(processRecord._id, {
    updatedAt: now,
  });
  await touchProject(ctx, processRecord.projectId as Id<'projects'>, now);
}

function dedupeIds<TId extends string>(ids: TId[]): TId[] {
  return [...new Set(ids)];
}
