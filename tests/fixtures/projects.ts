import {
  projectShellResponseSchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';
import {
  currentVersionArtifactFixture,
  noCurrentVersionArtifactFixture,
  processScopedArtifactFixture,
} from './artifacts.js';
import { draftProcessFixture, runningProcessFixture, waitingProcessFixture } from './processes.js';
import {
  hydratedSourceFixture,
  notHydratedSourceFixture,
  processScopedSourceFixture,
  staleSourceFixture,
} from './sources.js';

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

export const populatedProjectSummary = projectSummarySchema.parse({
  projectId: 'project-shell-001',
  name: 'Story Three Project',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 3,
  artifactCount: 3,
  sourceAttachmentCount: 4,
  lastUpdatedAt: recentTimestamp,
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

export const populatedProjectShellResponse = projectShellResponseSchema.parse({
  project: populatedProjectSummary,
  processes: {
    status: 'ready',
    items: [waitingProcessFixture, runningProcessFixture, draftProcessFixture],
  },
  artifacts: {
    status: 'ready',
    items: [
      processScopedArtifactFixture,
      currentVersionArtifactFixture,
      noCurrentVersionArtifactFixture,
    ],
  },
  sourceAttachments: {
    status: 'ready',
    items: [
      staleSourceFixture,
      processScopedSourceFixture,
      hydratedSourceFixture,
      notHydratedSourceFixture,
    ],
  },
});

export const processOnlyProjectShellResponse = projectShellResponseSchema.parse({
  project: populatedProjectSummary,
  processes: {
    status: 'ready',
    items: [runningProcessFixture, draftProcessFixture],
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

export const processErrorProjectShellResponse = projectShellResponseSchema.parse({
  project: populatedProjectSummary,
  processes: {
    status: 'error',
    items: [],
    error: {
      code: 'PROJECT_SHELL_PROCESSES_LOAD_FAILED',
      message: 'Process summaries failed to load in the fixture.',
    },
  },
  artifacts: populatedProjectShellResponse.artifacts,
  sourceAttachments: populatedProjectShellResponse.sourceAttachments,
});

export const sourceErrorProjectShellResponse = projectShellResponseSchema.parse({
  project: populatedProjectSummary,
  processes: populatedProjectShellResponse.processes,
  artifacts: populatedProjectShellResponse.artifacts,
  sourceAttachments: {
    status: 'error',
    items: [],
    error: {
      code: 'PROJECT_SHELL_SOURCES_LOAD_FAILED',
      message: 'Source summaries failed to load in the fixture.',
    },
  },
});
