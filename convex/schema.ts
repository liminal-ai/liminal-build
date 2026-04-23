import { defineSchema, defineTable } from 'convex/server';
import { artifactVersionsTableFields } from './artifactVersions.js';
import { artifactsTableFields } from './artifacts.js';
import { packageSnapshotMembersTableFields } from './packageSnapshotMembers.js';
import { packageSnapshotsTableFields } from './packageSnapshots.js';
import { processHistoryItemsTableFields } from './processHistoryItems.js';
import { processesTableFields } from './processes.js';
import { processFeatureImplementationStateTableFields } from './processFeatureImplementationStates.js';
import { processEnvironmentStatesTableFields } from './processEnvironmentStates.js';
import { processFeatureSpecificationStateTableFields } from './processFeatureSpecificationStates.js';
import { processOutputsTableFields } from './processOutputs.js';
import { processProductDefinitionStateTableFields } from './processProductDefinitionStates.js';
import { processSideWorkItemsTableFields } from './processSideWorkItems.js';
import { projectMembersTableFields } from './projectMembers.js';
import { projectsTableFields } from './projects.js';
import { sourceAttachmentsTableFields } from './sourceAttachments.js';
import { usersTableFields } from './users.js';

export default defineSchema({
  users: defineTable(usersTableFields).index('by_workosUserId', ['workosUserId']),
  projects: defineTable(projectsTableFields)
    .index('by_ownerUserId', ['ownerUserId'])
    .index('by_lastUpdatedAt', ['lastUpdatedAt']),
  projectMembers: defineTable(projectMembersTableFields)
    .index('by_projectId', ['projectId'])
    .index('by_userId', ['userId']),
  processes: defineTable(processesTableFields)
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_updatedAt', ['projectId', 'updatedAt']),
  processHistoryItems: defineTable(processHistoryItemsTableFields)
    .index('by_processId_and_createdAt', ['processId', 'createdAt'])
    .index('by_processId_and_clientRequestId', ['processId', 'clientRequestId'])
    .index('by_processId_and_requestState_and_createdAt', [
      'processId',
      'requestState',
      'createdAt',
    ]),
  processSideWorkItems: defineTable(processSideWorkItemsTableFields).index(
    'by_processId_and_updatedAt',
    ['processId', 'updatedAt'],
  ),
  processOutputs: defineTable(processOutputsTableFields).index('by_processId_and_updatedAt', [
    'processId',
    'updatedAt',
  ]),
  processEnvironmentStates: defineTable(processEnvironmentStatesTableFields)
    .index('by_processId', ['processId'])
    .index('by_environmentId', ['environmentId']),
  processProductDefinitionStates: defineTable(processProductDefinitionStateTableFields).index(
    'by_processId',
    ['processId'],
  ),
  processFeatureSpecificationStates: defineTable(processFeatureSpecificationStateTableFields).index(
    'by_processId',
    ['processId'],
  ),
  processFeatureImplementationStates: defineTable(
    processFeatureImplementationStateTableFields,
  ).index('by_processId', ['processId']),
  artifacts: defineTable(artifactsTableFields)
    .index('by_projectId', ['projectId'])
    .index('by_projectId_createdAt', ['projectId', 'createdAt']),
  artifactVersions: defineTable(artifactVersionsTableFields)
    .index('by_artifactId_createdAt', ['artifactId', 'createdAt'])
    .index('by_createdByProcessId_createdAt', ['createdByProcessId', 'createdAt']),
  packageSnapshots: defineTable(packageSnapshotsTableFields).index('by_processId_publishedAt', [
    'processId',
    'publishedAt',
  ]),
  packageSnapshotMembers: defineTable(packageSnapshotMembersTableFields).index(
    'by_packageSnapshotId_position',
    ['packageSnapshotId', 'position'],
  ),
  sourceAttachments: defineTable(sourceAttachmentsTableFields)
    .index('by_projectId', ['projectId'])
    .index('by_projectId_updatedAt', ['projectId', 'updatedAt']),
});
