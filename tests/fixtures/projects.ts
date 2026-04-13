import {
  projectShellResponseSchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';

const recentTimestamp = '2026-04-13T12:00:00.000Z';
const olderTimestamp = '2026-04-10T12:00:00.000Z';

export const ownerProjectSummary = projectSummarySchema.parse({
  projectId: 'project-owner-001',
  name: 'Core Platform',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 0,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: recentTimestamp,
});

export const memberProjectSummary = projectSummarySchema.parse({
  projectId: 'project-member-001',
  name: 'Shared Platform',
  ownerDisplayName: 'Teammate',
  role: 'member',
  processCount: 2,
  artifactCount: 1,
  sourceAttachmentCount: 1,
  lastUpdatedAt: olderTimestamp,
});

export const sameNameDifferentOwnerProjectSummaries = [
  ownerProjectSummary,
  projectSummarySchema.parse({
    projectId: 'project-owner-002',
    name: 'Core Platform',
    ownerDisplayName: 'Another Owner',
    role: 'member',
    processCount: 1,
    artifactCount: 2,
    sourceAttachmentCount: 0,
    lastUpdatedAt: olderTimestamp,
  }),
];

export const inaccessibleProjectId = 'project-inaccessible-001';

export const emptyProjectShellResponse = projectShellResponseSchema.parse({
  project: ownerProjectSummary,
  processes: {
    status: 'empty',
    items: [],
  },
  artifacts: {
    status: 'empty',
    items: [],
  },
  sourceAttachments: {
    status: 'empty',
    items: [],
  },
});

export const mixedSectionEnvelopeProjectShellResponse = projectShellResponseSchema.parse({
  project: memberProjectSummary,
  processes: {
    status: 'ready',
    items: [],
  },
  artifacts: {
    status: 'error',
    items: [],
    error: {
      code: 'PROJECT_SHELL_ARTIFACTS_LOAD_FAILED',
      message: 'Artifact summaries failed to load in the fixture.',
    },
  },
  sourceAttachments: {
    status: 'empty',
    items: [],
  },
});
