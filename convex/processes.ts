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
