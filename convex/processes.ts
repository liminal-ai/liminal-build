import { mutationGeneric as mutation, queryGeneric as query } from 'convex/server';
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
  hasEnvironment: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
};

export const listProjectProcessSummaries = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const processes = await ctx.db
      .query('processes')
      .withIndex('by_projectId_updatedAt', (query: any) => query.eq('projectId', args.projectId))
      .order('desc')
      .collect();

    return processes.map((process: any) => ({
      processId: process._id,
      displayLabel: process.displayLabel,
      processType: process.processType,
      status: process.status,
      phaseLabel: process.phaseLabel,
      nextActionLabel: process.nextActionLabel,
      availableActions: deriveAvailableActions(process.status),
      hasEnvironment: process.hasEnvironment,
      updatedAt: process.updatedAt,
    }));
  },
});

export const createProcess = mutation({
  args: {
    projectId: v.string(),
    processType: supportedProcessTypeValidator,
    displayLabel: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const now = new Date().toISOString();
    const processId = await ctx.db.insert('processes', {
      projectId: args.projectId,
      processType: args.processType,
      displayLabel: args.displayLabel,
      status: 'draft',
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      hasEnvironment: false,
      createdAt: now,
      updatedAt: now,
    });

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

    await ctx.db.patch(args.projectId, {
      lastUpdatedAt: now,
      updatedAt: now,
    });

    return {
      kind: 'created' as const,
      process: {
        processId,
        displayLabel: args.displayLabel,
        processType: args.processType,
        status: 'draft' as const,
        phaseLabel: 'Draft',
        nextActionLabel: 'Open the process',
        availableActions: ['open'] as const,
        hasEnvironment: false,
        updatedAt: now,
      },
    };
  },
});

function deriveAvailableActions(status: string): string[] {
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
