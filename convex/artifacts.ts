import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import type {
  ArtifactSummary,
  ProcessOutputReference,
} from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import {
  type ActionCtx,
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server.js';
import { assertValidApiKey } from './serviceApiKey.js';

export const artifactsTableFields = {
  projectId: v.string(),
  processId: v.union(v.string(), v.null()),
  displayName: v.string(),
  currentVersionLabel: v.union(v.string(), v.null()),
  contentStorageId: v.id('_storage'),
  updatedAt: v.string(),
};

const checkpointArtifactInputValidator = v.object({
  artifactId: v.optional(v.string()),
  producedAt: v.string(),
  contents: v.string(),
  targetLabel: v.string(),
});

const checkpointArtifactWithStorageValidator = v.object({
  artifactId: v.optional(v.string()),
  producedAt: v.string(),
  contentStorageId: v.id('_storage'),
  targetLabel: v.string(),
});

export const listProjectArtifactSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args): Promise<ArtifactSummary[]> => {
    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_projectId_updatedAt', (indexQuery) =>
        indexQuery.eq('projectId', args.projectId),
      )
      .order('desc')
      .take(200);

    return Promise.all(
      artifacts.map(async (artifact) => {
        const attachedProcess =
          artifact.processId === null
            ? null
            : await ctx.db.get(artifact.processId as Id<'processes'>);

        return {
          artifactId: artifact._id,
          displayName: artifact.displayName,
          currentVersionLabel: artifact.currentVersionLabel,
          attachmentScope: artifact.processId === null ? 'project' : 'process',
          processId: artifact.processId,
          processDisplayLabel: attachedProcess?.displayLabel ?? null,
          updatedAt: artifact.updatedAt,
        };
      }),
    );
  },
});

const persistCheckpointArtifactsInternalRef = makeFunctionReference<
  'action',
  {
    processId: string;
    artifacts: Array<{
      artifactId?: string;
      producedAt: string;
      contents: string;
      targetLabel: string;
    }>;
  },
  Array<ProcessOutputReference & { linkedArtifactId: string | null }>
>('artifacts:persistCheckpointArtifactsInternal');

/**
 * Public service-only action that validates the shared API key before
 * delegating to the internal artifact persistence action.
 */
export const persistCheckpointArtifactsForService = action({
  args: {
    apiKey: v.string(),
    processId: v.string(),
    artifacts: v.array(checkpointArtifactInputValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> => {
    assertValidApiKey(args.apiKey);

    const result: Array<ProcessOutputReference & { linkedArtifactId: string | null }> =
      await ctx.runAction(persistCheckpointArtifactsInternalRef, {
        processId: args.processId,
        artifacts: args.artifacts,
      });

    return result;
  },
});

/**
 * Internal action that persists checkpoint artifacts via Convex File Storage.
 *
 * Convex mutations cannot call `ctx.storage.store`, so each artifact's contents
 * are uploaded as a Blob from this action and the resulting storageIds are
 * handed off to `recordCheckpointArtifactsInternal` which writes the artifact
 * rows transactionally.
 *
 * Failure semantics: storage uploads are not transactional with the row write,
 * so if the row mutation throws (or any upload after the first throws) we must
 * delete every storage blob already uploaded in this invocation. Otherwise
 * partial failures leak orphan blobs into Convex File Storage.
 */
export const persistCheckpointArtifactsInternal = internalAction({
  args: {
    processId: v.string(),
    artifacts: v.array(checkpointArtifactInputValidator),
  },
  handler: async (
    ctx: ActionCtx,
    args,
  ): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> => {
    const artifactsWithStorage: Array<{
      artifactId?: string;
      producedAt: string;
      contentStorageId: Id<'_storage'>;
      targetLabel: string;
    }> = [];
    // Tracked separately so we can roll back blob uploads on any failure
    // (an upload after the first, or the downstream mutation).
    const uploadedStorageIds: Id<'_storage'>[] = [];

    try {
      for (const artifact of args.artifacts) {
        const blob = new Blob([artifact.contents]);
        const contentStorageId = await ctx.storage.store(blob);
        uploadedStorageIds.push(contentStorageId);
        artifactsWithStorage.push({
          artifactId: artifact.artifactId,
          producedAt: artifact.producedAt,
          contentStorageId,
          targetLabel: artifact.targetLabel,
        });
      }

      const result: Array<ProcessOutputReference & { linkedArtifactId: string | null }> =
        await ctx.runMutation(recordCheckpointArtifactsInternalRef, {
          processId: args.processId,
          artifacts: artifactsWithStorage,
        });

      return result;
    } catch (error) {
      // Best-effort rollback: delete every blob this invocation uploaded so
      // failures do not leave orphan storage entries. We swallow individual
      // delete errors to avoid masking the original failure.
      for (const storageId of uploadedStorageIds) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // Continue cleanup of other blobs even if one delete fails.
        }
      }
      throw error;
    }
  },
});

/**
 * Stable, named reference to the internal mutation. Using
 * `makeFunctionReference` (rather than `internal.X.Y`) means the value carries
 * `Symbol(functionName) === 'artifacts:recordCheckpointArtifactsInternal'`,
 * which the FakeConvexContext can resolve back to the registered handler.
 */
const recordCheckpointArtifactsInternalRef = makeFunctionReference<
  'mutation',
  {
    processId: string;
    artifacts: Array<{
      artifactId?: string;
      producedAt: string;
      contentStorageId: Id<'_storage'>;
      targetLabel: string;
    }>;
  },
  Array<ProcessOutputReference & { linkedArtifactId: string | null }>
>('artifacts:recordCheckpointArtifactsInternal');

export const recordCheckpointArtifactsInternal = internalMutation({
  args: {
    processId: v.string(),
    artifacts: v.array(checkpointArtifactWithStorageValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> => {
    const processRecord = await getProcessRecordOrThrow(ctx, args.processId);
    const existingMaterialRefs = await resolveCurrentProcessMaterialRefs(ctx, processRecord);

    for (const artifact of args.artifacts) {
      const persistedArtifactId = await upsertArtifactCheckpoint(ctx, {
        processRecord,
        artifactId: artifact.artifactId,
        targetLabel: artifact.targetLabel,
        producedAt: artifact.producedAt,
        contentStorageId: artifact.contentStorageId,
      });

      await upsertProcessOutputCheckpoint(ctx, {
        processRecord,
        linkedArtifactId: persistedArtifactId,
        targetLabel: artifact.targetLabel,
        producedAt: artifact.producedAt,
      });

      existingMaterialRefs.artifactIds.push(persistedArtifactId);
    }

    const latestUpdatedAt =
      args.artifacts.reduce<string | null>(
        (latest, artifact) =>
          latest === null || artifact.producedAt.localeCompare(latest) > 0
            ? artifact.producedAt
            : latest,
        null,
      ) ?? new Date().toISOString();

    await writeCurrentProcessMaterialRefs(ctx, processRecord, {
      artifactIds: dedupeIds(existingMaterialRefs.artifactIds),
      sourceAttachmentIds: dedupeIds(existingMaterialRefs.sourceAttachmentIds),
      updatedAt: latestUpdatedAt,
    });
    await touchProcessAndProject(ctx, processRecord, latestUpdatedAt);

    return readCurrentProcessOutputs(ctx, processRecord._id);
  },
});

/**
 * Deletes an artifact row and its associated storage blob in the same
 * transaction. Use this from any mutation that removes artifact rows so that
 * file-storage entries do not orphan.
 */
export const deleteArtifactWithContent = mutation({
  args: {
    artifactId: v.id('artifacts'),
  },
  handler: async (ctx, args): Promise<null> => {
    const artifact = await ctx.db.get(args.artifactId);

    if (artifact === null) {
      return null;
    }

    await ctx.storage.delete(artifact.contentStorageId);
    await ctx.db.delete(args.artifactId);
    return null;
  },
});

const fetchArtifactContentInternalRef = makeFunctionReference<
  'action',
  { artifactId: string },
  string | null
>('artifacts:fetchArtifactContentInternal');

/**
 * Public service-only action that validates the shared API key before
 * delegating to the internal artifact-content fetch action.
 */
export const fetchArtifactContentForService = action({
  args: {
    apiKey: v.string(),
    artifactId: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    assertValidApiKey(args.apiKey);

    const result: string | null = await ctx.runAction(fetchArtifactContentInternalRef, {
      artifactId: args.artifactId,
    });

    return result;
  },
});

/**
 * Internal action that returns an artifact's stored content as a UTF-8 string.
 *
 * Used by `LocalProviderAdapter.hydrateEnvironment` to materialize artifact
 * content into the working tree. Returns `null` if the artifact row or its
 * storage blob is missing — the caller decides how to surface that as a
 * hydration failure.
 *
 * This is an action (not a query) because `ctx.storage.get` is only available
 * to actions, per the Convex storage guidelines.
 */
export const fetchArtifactContentInternal = internalAction({
  args: {
    artifactId: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<string | null> => {
    const storageId: Id<'_storage'> | null = await ctx.runQuery(
      lookupArtifactStorageIdInternalRef,
      {
        artifactId: args.artifactId,
      },
    );

    if (storageId === null) {
      return null;
    }

    const blob = await ctx.storage.get(storageId);

    if (blob === null) {
      return null;
    }

    return blob.text();
  },
});

const lookupArtifactStorageIdInternalRef = makeFunctionReference<
  'query',
  { artifactId: string },
  Id<'_storage'> | null
>('artifacts:lookupArtifactStorageIdInternal');

export const lookupArtifactStorageIdInternal = internalQuery({
  args: {
    artifactId: v.string(),
  },
  handler: async (ctx: QueryCtx, args): Promise<Id<'_storage'> | null> => {
    let artifact: Doc<'artifacts'> | null = null;

    try {
      artifact = await ctx.db.get(args.artifactId as Id<'artifacts'>);
    } catch {
      return null;
    }

    return artifact?.contentStorageId ?? null;
  },
});

async function getProcessRecordOrThrow(
  ctx: MutationCtx,
  processIdValue: string,
): Promise<Doc<'processes'>> {
  let processRecord: Doc<'processes'> | null = null;

  try {
    processRecord = await ctx.db.get(processIdValue as Id<'processes'>);
  } catch {
    throw new Error('Process not found.');
  }

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  return processRecord;
}

async function upsertArtifactCheckpoint(
  ctx: MutationCtx,
  args: {
    processRecord: Doc<'processes'>;
    artifactId?: string;
    targetLabel: string;
    producedAt: string;
    contentStorageId: Id<'_storage'>;
  },
): Promise<Id<'artifacts'>> {
  const nextFields = {
    projectId: args.processRecord.projectId,
    processId: args.processRecord._id,
    displayName: args.targetLabel,
    currentVersionLabel: null,
    contentStorageId: args.contentStorageId,
    updatedAt: args.producedAt,
  };

  if (args.artifactId !== undefined) {
    const existingArtifact = await ctx.db.get(args.artifactId as Id<'artifacts'>);

    if (existingArtifact !== null && existingArtifact.projectId === args.processRecord.projectId) {
      // Replace prior content blob with the new revision so storage stays clean.
      if (existingArtifact.contentStorageId !== args.contentStorageId) {
        await ctx.storage.delete(existingArtifact.contentStorageId);
      }
      await ctx.db.patch(existingArtifact._id, nextFields);
      return existingArtifact._id;
    }
  }

  return ctx.db.insert('artifacts', nextFields);
}

async function upsertProcessOutputCheckpoint(
  ctx: MutationCtx,
  args: {
    processRecord: Doc<'processes'>;
    linkedArtifactId: Id<'artifacts'>;
    targetLabel: string;
    producedAt: string;
  },
): Promise<void> {
  const existingOutputs = await ctx.db
    .query('processOutputs')
    .withIndex('by_processId_and_updatedAt', (indexQuery) =>
      indexQuery.eq('processId', args.processRecord._id),
    )
    .take(50);
  const existingOutput =
    existingOutputs.find((output) => output.linkedArtifactId === args.linkedArtifactId) ?? null;

  const nextFields = {
    linkedArtifactId: args.linkedArtifactId,
    displayName: args.targetLabel,
    revisionLabel: null,
    state: 'published_to_artifact',
    updatedAt: args.producedAt,
  };

  if (existingOutput !== null) {
    await ctx.db.patch(existingOutput._id, nextFields);
    return;
  }

  await ctx.db.insert('processOutputs', {
    processId: args.processRecord._id,
    ...nextFields,
  });
}

async function resolveCurrentProcessMaterialRefs(
  ctx: MutationCtx | QueryCtx,
  processRecord: Doc<'processes'>,
): Promise<{ artifactIds: Id<'artifacts'>[]; sourceAttachmentIds: Id<'sourceAttachments'>[] }> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    default:
      return {
        artifactIds: [],
        sourceAttachmentIds: [],
      };
  }
}

async function writeCurrentProcessMaterialRefs(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  args: {
    artifactIds: Id<'artifacts'>[];
    sourceAttachmentIds: Id<'sourceAttachments'>[];
    updatedAt: string;
  },
): Promise<void> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processProductDefinitionStates', {
          processId: processRecord._id,
          currentArtifactIds: args.artifactIds,
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentArtifactIds: args.artifactIds,
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processFeatureSpecificationStates', {
          processId: processRecord._id,
          currentArtifactIds: args.artifactIds,
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentArtifactIds: args.artifactIds,
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (indexQuery) => indexQuery.eq('processId', processRecord._id))
        .unique();

      if (state === null) {
        await ctx.db.insert('processFeatureImplementationStates', {
          processId: processRecord._id,
          currentArtifactIds: args.artifactIds,
          currentSourceAttachmentIds: args.sourceAttachmentIds,
          createdAt: args.updatedAt,
          updatedAt: args.updatedAt,
        });
        return;
      }

      await ctx.db.patch(state._id, {
        currentArtifactIds: args.artifactIds,
        currentSourceAttachmentIds: args.sourceAttachmentIds,
        updatedAt: args.updatedAt,
      });
      return;
    }
    default:
      return;
  }
}

function dedupeIds<TId extends string>(ids: TId[]): TId[] {
  return [...new Set(ids)];
}

async function touchProcessAndProject(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
  now: string,
): Promise<void> {
  await ctx.db.patch(processRecord._id, {
    updatedAt: now,
  });

  try {
    await ctx.db.patch(processRecord.projectId as Id<'projects'>, {
      lastUpdatedAt: now,
      updatedAt: now,
    });
  } catch {
    // Keep checkpointed artifacts durable even if the project lookup is stale.
  }
}

async function readCurrentProcessOutputs(
  ctx: MutationCtx | QueryCtx,
  processId: Id<'processes'>,
): Promise<Array<ProcessOutputReference & { linkedArtifactId: string | null }>> {
  const outputs = await ctx.db
    .query('processOutputs')
    .withIndex('by_processId_and_updatedAt', (indexQuery) => indexQuery.eq('processId', processId))
    .order('desc')
    .take(20);

  return outputs.map((output) => ({
    outputId: output._id,
    linkedArtifactId: output.linkedArtifactId,
    displayName: output.displayName,
    revisionLabel: output.revisionLabel,
    state: output.state,
    updatedAt: output.updatedAt,
  }));
}
