import { v } from 'convex/values';
import type {
  CurrentProcessRequest,
  ProcessAvailableAction,
  ProcessHistoryItem,
  ProcessStatus,
  ProcessSummary,
} from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';
import { computeWorkingSetFingerprint } from './processEnvironmentStates.js';

export const supportedProcessTypeValidator = v.union(
  v.literal('ProductDefinition'),
  v.literal('FeatureSpecification'),
  v.literal('FeatureImplementation'),
);

export const processStatusValidator = v.union(
  v.literal('draft'),
  v.literal('running'),
  v.literal('waiting'),
  v.literal('paused'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('interrupted'),
);

export const processesTableFields = {
  projectId: v.string(),
  processType: supportedProcessTypeValidator,
  displayLabel: v.string(),
  status: processStatusValidator,
  phaseLabel: v.string(),
  nextActionLabel: v.union(v.string(), v.null()),
  currentRequestHistoryItemId: v.union(v.id('processHistoryItems'), v.null()),
  hasEnvironment: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
};

export const listProjectProcessSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const processes = await ctx.db
      .query('processes')
      .withIndex('by_projectId_and_updatedAt', (query) => query.eq('projectId', args.projectId))
      .order('desc')
      .take(200);

    return processes.map((process) => buildProcessSummary(process));
  },
});

export const getProcessRecord = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<(ProcessSummary & { projectId: string }) | null> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return null;
    }

    if (processRecord === null) {
      return null;
    }

    return {
      projectId: processRecord.projectId,
      ...buildProcessSummary(processRecord),
    };
  },
});

export const getCurrentProcessRequest = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<CurrentProcessRequest | null> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return null;
    }

    if (processRecord === null || processRecord.currentRequestHistoryItemId === null) {
      return null;
    }

    const historyItem = await ctx.db.get(processRecord.currentRequestHistoryItemId);

    if (
      historyItem === null ||
      historyItem.processId !== processRecord._id ||
      historyItem.kind !== 'attention_request' ||
      historyItem.requestState !== 'unresolved'
    ) {
      return null;
    }

    return {
      requestId: historyItem._id,
      requestKind: 'other',
      promptText: historyItem.text,
      requiredActionLabel: processRecord.nextActionLabel,
      createdAt: historyItem.createdAt,
    };
  },
});

export const getCurrentProcessMaterialRefs = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args): Promise<{ artifactIds: string[]; sourceAttachmentIds: string[] }> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return {
        artifactIds: [],
        sourceAttachmentIds: [],
      };
    }

    if (processRecord === null) {
      return {
        artifactIds: [],
        sourceAttachmentIds: [],
      };
    }

    return resolveCurrentProcessMaterialRefs(ctx, processRecord);
  },
});

export const setCurrentProcessMaterialRefs = mutation({
  args: {
    processId: v.string(),
    artifactIds: v.array(v.id('artifacts')),
    sourceAttachmentIds: v.array(v.id('sourceAttachments')),
  },
  handler: async (ctx, args): Promise<{ artifactIds: string[]; sourceAttachmentIds: string[] }> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      throw new Error('Process not found.');
    }

    if (processRecord === null) {
      throw new Error('Process not found.');
    }

    const artifactIds = dedupeIds(args.artifactIds);
    const sourceAttachmentIds = dedupeIds(args.sourceAttachmentIds);

    await assertMaterialRefsBelongToProject(ctx, {
      artifactIds,
      sourceAttachmentIds,
      projectId: processRecord.projectId,
    });

    const now = new Date().toISOString();

    await writeCurrentProcessMaterialRefs(ctx, processRecord, {
      artifactIds,
      sourceAttachmentIds,
      updatedAt: now,
    });

    await touchProcessAndProject(ctx, processRecord, now);

    return {
      artifactIds,
      sourceAttachmentIds,
    };
  },
});

export const getSubmittedProcessResponse = query({
  args: {
    processId: v.string(),
    clientRequestId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    accepted: true;
    historyItem: ProcessHistoryItem;
    process: ProcessSummary;
    currentRequest: CurrentProcessRequest | null;
  } | null> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      return null;
    }

    if (processRecord === null) {
      return null;
    }

    const trimmedClientRequestId = args.clientRequestId.trim();

    if (trimmedClientRequestId.length === 0) {
      return null;
    }

    const historyItem = await ctx.db
      .query('processHistoryItems')
      .withIndex('by_processId_and_clientRequestId', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id).eq('clientRequestId', trimmedClientRequestId),
      )
      .unique();

    if (historyItem === null) {
      return null;
    }

    return {
      accepted: true,
      historyItem: buildProcessHistoryItem(historyItem),
      process: buildProcessSummary(processRecord),
      currentRequest: await resolveCurrentProcessRequest(ctx, processRecord),
    };
  },
});

export const createProcess = mutation({
  args: {
    projectId: v.string(),
    processType: supportedProcessTypeValidator,
    displayLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const processId = await ctx.db.insert('processes', {
      projectId: args.projectId,
      processType: args.processType,
      displayLabel: args.displayLabel,
      status: 'draft',
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      currentRequestHistoryItemId: null,
      hasEnvironment: false,
      createdAt: now,
      updatedAt: now,
    });

    const envStateRowId = await ctx.db.insert('processEnvironmentStates', {
      processId,
      providerKind: null,
      environmentId: null,
      state: 'absent',
      blockedReason: null,
      lastHydratedAt: null,
      lastCheckpointAt: null,
      lastCheckpointResult: null,
      workingSetPlan: null,
      workingSetFingerprint: null,
      createdAt: now,
      updatedAt: now,
    });

    const projectId = args.projectId as Id<'projects'>;

    if (args.processType === 'ProductDefinition') {
      await ctx.db.insert('processProductDefinitionStates', {
        processId,
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.processType === 'FeatureSpecification') {
      await ctx.db.insert('processFeatureSpecificationStates', {
        processId,
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.processType === 'FeatureImplementation') {
      await ctx.db.insert('processFeatureImplementationStates', {
        processId,
        currentArtifactIds: [],
        currentSourceAttachmentIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Compute and store the initial working-set fingerprint so the env state
    // row is never persisted with `workingSetFingerprint: null`. At creation
    // time the working set is empty (no artifacts, outputs, or sources yet),
    // so this is the SHA-256 of the empty canonical JSON. That is still a
    // valid fingerprint and gives downstream read-time stale comparisons a
    // meaningful baseline from the moment the process exists.
    const initialFingerprint = await computeWorkingSetFingerprint(ctx, processId);
    await ctx.db.patch(envStateRowId, { workingSetFingerprint: initialFingerprint });

    await ctx.db.patch(projectId, {
      lastUpdatedAt: now,
      updatedAt: now,
    });

    return {
      kind: 'created' as const,
      process: buildProcessSummary({
        _id: processId,
        _creationTime: Date.now(),
        projectId: args.projectId,
        processType: args.processType,
        displayLabel: args.displayLabel,
        status: 'draft',
        phaseLabel: 'Draft',
        nextActionLabel: 'Open the process',
        currentRequestHistoryItemId: null,
        hasEnvironment: false,
        createdAt: now,
        updatedAt: now,
      }),
    };
  },
});

export const startProcess = mutation({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    return acceptProcessForPreparation(ctx, args.processId);
  },
});

export const resumeProcess = mutation({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    return acceptProcessForPreparation(ctx, args.processId);
  },
});

export const markProcessRunning = mutation({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    return transitionProcessToRunning(ctx, args.processId);
  },
});

export const submitProcessResponse = mutation({
  args: {
    processId: v.string(),
    clientRequestId: v.string(),
    message: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    accepted: true;
    historyItem: ProcessHistoryItem;
    process: ProcessSummary;
    currentRequest: CurrentProcessRequest | null;
  }> => {
    let processRecord: Doc<'processes'> | null = null;

    try {
      processRecord = await ctx.db.get(args.processId as Id<'processes'>);
    } catch {
      throw new Error('Process not found.');
    }

    if (processRecord === null) {
      throw new Error('Process not found.');
    }

    const trimmedClientRequestId = args.clientRequestId.trim();
    const trimmedMessage = args.message.trim();

    if (trimmedClientRequestId.length === 0 || trimmedMessage.length === 0) {
      throw new Error('Invalid process response.');
    }

    const existingHistoryItem = await ctx.db
      .query('processHistoryItems')
      .withIndex('by_processId_and_clientRequestId', (indexQuery) =>
        indexQuery.eq('processId', processRecord._id).eq('clientRequestId', trimmedClientRequestId),
      )
      .unique();

    if (existingHistoryItem !== null) {
      return {
        accepted: true,
        historyItem: buildProcessHistoryItem(existingHistoryItem),
        process: buildProcessSummary(processRecord),
        currentRequest: await resolveCurrentProcessRequest(ctx, processRecord),
      };
    }

    const now = new Date().toISOString();

    if (processRecord.currentRequestHistoryItemId !== null) {
      const currentRequestHistoryItem = await ctx.db.get(processRecord.currentRequestHistoryItemId);

      if (currentRequestHistoryItem !== null) {
        await ctx.db.patch(currentRequestHistoryItem._id, {
          lifecycleState: 'finalized',
          requestState: 'resolved',
          finalizedAt: now,
        });
      }
    }

    const historyItemId = await ctx.db.insert('processHistoryItems', {
      processId: processRecord._id,
      kind: 'user_message',
      lifecycleState: 'finalized',
      requestState: 'none',
      text: trimmedMessage,
      relatedSideWorkId: null,
      relatedArtifactId: null,
      clientRequestId: trimmedClientRequestId,
      createdAt: now,
      finalizedAt: now,
    });

    const nextProcessFields = {
      status: 'running' as const,
      nextActionLabel: 'Monitor progress in the work surface',
      currentRequestHistoryItemId: null,
      updatedAt: now,
    };

    await ctx.db.patch(processRecord._id, nextProcessFields);

    try {
      await ctx.db.patch(processRecord.projectId as Id<'projects'>, {
        lastUpdatedAt: now,
        updatedAt: now,
      });
    } catch {
      // Keep the accepted response durable even if the project lookup is stale.
    }

    const historyItem = await ctx.db.get(historyItemId);

    if (historyItem === null) {
      throw new Error('Accepted process response history item was not found.');
    }

    return {
      accepted: true,
      historyItem: buildProcessHistoryItem(historyItem),
      process: buildProcessSummary({
        ...processRecord,
        ...nextProcessFields,
      }),
      currentRequest: null,
    };
  },
});

function buildProcessSummary(process: Doc<'processes'>): ProcessSummary {
  return {
    processId: process._id,
    displayLabel: process.displayLabel,
    processType: process.processType,
    status: process.status,
    phaseLabel: process.phaseLabel,
    nextActionLabel: process.nextActionLabel,
    availableActions: deriveAvailableActions(process.status),
    hasEnvironment: process.hasEnvironment,
    updatedAt: process.updatedAt,
  };
}

function buildProcessHistoryItem(historyItem: Doc<'processHistoryItems'>): ProcessHistoryItem {
  return {
    historyItemId: historyItem._id,
    kind: historyItem.kind,
    lifecycleState: historyItem.lifecycleState,
    text: historyItem.text,
    createdAt: historyItem.createdAt,
    relatedSideWorkId: historyItem.relatedSideWorkId,
    relatedArtifactId: historyItem.relatedArtifactId,
  };
}

async function resolveCurrentProcessRequest(
  ctx: MutationCtx | QueryCtx,
  processRecord: Doc<'processes'>,
): Promise<CurrentProcessRequest | null> {
  if (processRecord.currentRequestHistoryItemId === null) {
    return null;
  }

  const historyItem = await ctx.db.get(processRecord.currentRequestHistoryItemId);

  if (
    historyItem === null ||
    historyItem.processId !== processRecord._id ||
    historyItem.kind !== 'attention_request' ||
    historyItem.requestState !== 'unresolved'
  ) {
    return null;
  }

  return {
    requestId: historyItem._id,
    requestKind: 'other',
    promptText: historyItem.text,
    requiredActionLabel: processRecord.nextActionLabel,
    createdAt: historyItem.createdAt,
  };
}

async function resolveCurrentProcessMaterialRefs(
  ctx: MutationCtx | QueryCtx,
  processRecord: Doc<'processes'>,
): Promise<{ artifactIds: string[]; sourceAttachmentIds: string[] }> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      return {
        artifactIds: state?.currentArtifactIds ?? [],
        sourceAttachmentIds: state?.currentSourceAttachmentIds ?? [],
      };
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
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

async function assertMaterialRefsBelongToProject(
  ctx: MutationCtx,
  args: {
    artifactIds: Id<'artifacts'>[];
    sourceAttachmentIds: Id<'sourceAttachments'>[];
    projectId: string;
  },
): Promise<void> {
  for (const artifactId of args.artifactIds) {
    const artifact = await ctx.db.get(artifactId);

    if (artifact === null || artifact.projectId !== args.projectId) {
      throw new Error('Current artifacts must belong to the same project as the process.');
    }
  }

  for (const sourceAttachmentId of args.sourceAttachmentIds) {
    const sourceAttachment = await ctx.db.get(sourceAttachmentId);

    if (sourceAttachment === null || sourceAttachment.projectId !== args.projectId) {
      throw new Error('Current source attachments must belong to the same project as the process.');
    }
  }
}

function dedupeIds<TId extends string>(ids: TId[]): TId[] {
  return [...new Set(ids)];
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
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
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
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
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
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
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

function deriveAvailableActions(status: ProcessStatus): ProcessAvailableAction[] {
  switch (status) {
    case 'draft':
      return ['open'];
    case 'running':
      return ['open', 'review'];
    case 'waiting':
      return ['respond'];
    case 'paused':
      return ['resume'];
    case 'completed':
      return ['review'];
    case 'failed':
      return ['review', 'restart'];
    case 'interrupted':
      return ['resume', 'review', 'rehydrate', 'restart'];
    default:
      return [];
  }
}

async function acceptProcessForPreparation(
  ctx: MutationCtx,
  processIdValue: string,
): Promise<{ process: ProcessSummary; currentRequest: CurrentProcessRequest | null }> {
  let processRecord: Doc<'processes'> | null = null;

  try {
    processRecord = await ctx.db.get(processIdValue as Id<'processes'>);
  } catch {
    throw new Error('Process not found.');
  }

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  const now = new Date().toISOString();
  const nextProcessFields = {
    phaseLabel: 'Preparing environment',
    nextActionLabel: 'Waiting for environment to be ready',
    currentRequestHistoryItemId: null,
    updatedAt: now,
  };

  await ctx.db.patch(processRecord._id, nextProcessFields);

  try {
    await ctx.db.patch(processRecord.projectId as Id<'projects'>, {
      lastUpdatedAt: now,
      updatedAt: now,
    });
  } catch {
    // Keep the process update durable even if the project lookup is stale.
  }

  return {
    process: buildProcessSummary({
      ...processRecord,
      ...nextProcessFields,
    }),
    currentRequest: null,
  };
}

async function transitionProcessToRunning(
  ctx: MutationCtx,
  processIdValue: string,
): Promise<{ process: ProcessSummary; currentRequest: CurrentProcessRequest | null }> {
  let processRecord: Doc<'processes'> | null = null;

  try {
    processRecord = await ctx.db.get(processIdValue as Id<'processes'>);
  } catch {
    throw new Error('Process not found.');
  }

  if (processRecord === null) {
    throw new Error('Process not found.');
  }

  const now = new Date().toISOString();
  const nextProcessFields = {
    status: 'running' as const,
    phaseLabel: processRecord.phaseLabel === 'Draft' ? 'Working' : processRecord.phaseLabel,
    nextActionLabel: 'Monitor progress in the work surface',
    currentRequestHistoryItemId: null,
    updatedAt: now,
  };

  await ctx.db.patch(processRecord._id, nextProcessFields);

  try {
    await ctx.db.patch(processRecord.projectId as Id<'projects'>, {
      lastUpdatedAt: now,
      updatedAt: now,
    });
  } catch {
    // Keep the process transition durable even if the project lookup is stale.
  }

  return {
    process: buildProcessSummary({
      ...processRecord,
      ...nextProcessFields,
    }),
    currentRequest: null,
  };
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
    // Keep the process material update durable even if the project lookup is stale.
  }
}
