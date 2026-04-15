import type {
  CurrentProcessRequest,
  ProcessAvailableAction,
  ProcessStatus,
  ProcessSummary,
} from '../apps/platform/shared/contracts/index.js';
import type { Doc, Id } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';

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
    const projectId = args.projectId as Id<'projects'>;

    if (args.processType === 'ProductDefinition') {
      await ctx.db.insert('processProductDefinitionStates', {
        processId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.processType === 'FeatureSpecification') {
      await ctx.db.insert('processFeatureSpecificationStates', {
        processId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.processType === 'FeatureImplementation') {
      await ctx.db.insert('processFeatureImplementationStates', {
        processId,
        createdAt: now,
        updatedAt: now,
      });
    }

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
