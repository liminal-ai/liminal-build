import {
  archiveEntrySchema,
  archivePageSchema,
  archiveTurnPageSchema,
  derivedArchiveViewListResponseSchema,
  derivedArchiveViewRefreshResponseSchema,
  derivedArchiveViewSchema,
  derivedTurnSchema,
  requestErrorSchema,
} from '../../apps/platform/shared/contracts/index.js';
import { currentArtifactVersionFixture } from './artifact-versions.js';
import { readySourceProvenanceFixture } from './sources.js';

export const userArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-user-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'user_message',
  sequence: 0,
  lifecycleState: 'finalized',
  finalizationKey: 'response:history-user-001',
  sourceObjectId: 'history-user-001',
  bodyText: 'Please continue with the archive implementation.',
  bodyData: null,
  bodyFormat: 'plain_text',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:00.000Z',
});

export const modelArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-model-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'model_message',
  sequence: 1,
  lifecycleState: 'finalized',
  finalizationKey: 'model:message-001',
  sourceObjectId: 'message-001',
  bodyText: 'Drafting the next archive slice now.',
  bodyData: null,
  bodyFormat: 'markdown',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:02.000Z',
});

export const reasoningArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-reasoning-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'reasoning',
  sequence: 2,
  lifecycleState: 'finalized',
  finalizationKey: 'reasoning:001',
  sourceObjectId: 'reasoning-001',
  bodyText: 'Reasoning emitted a finalized trace summary.',
  bodyData: null,
  bodyFormat: 'plain_text',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:03.000Z',
});

export const scriptEmissionArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-script-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'script_emission',
  sequence: 3,
  lifecycleState: 'finalized',
  finalizationKey: 'script:001',
  sourceObjectId: 'script-001',
  bodyText: 'console.log("hello archive");',
  bodyData: null,
  bodyFormat: 'plain_text',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:04.000Z',
});

export const toolCallArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-tool-call-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'tool_call',
  sequence: 4,
  lifecycleState: 'finalized',
  finalizationKey: 'tool:lint:call',
  sourceObjectId: 'tool-call-001',
  bodyText: null,
  bodyData: {
    jsonText: '{"tool":"lint","args":["--write"]}',
  },
  bodyFormat: 'structured',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: 'tool-call-001',
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:05.000Z',
});

export const toolResultArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-tool-result-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'tool_result',
  sequence: 5,
  lifecycleState: 'finalized',
  finalizationKey: 'tool:lint:result',
  sourceObjectId: 'tool-result-001',
  bodyText: null,
  bodyData: {
    jsonText: '{"ok":true}',
  },
  bodyFormat: 'structured',
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: null,
  relatedToolCallId: 'tool-call-001',
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:06.000Z',
});

export const processEventArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-event-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'process_event',
  sequence: 6,
  lifecycleState: 'finalized',
  finalizationKey: 'event:completed',
  sourceObjectId: 'event-001',
  bodyText: null,
  bodyData: null,
  bodyFormat: 'none',
  relatedArtifactVersionId: 'artifact-version-001',
  relatedSourceProvenanceId: 'provenance-001',
  relatedToolCallId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-05-01T12:00:07.000Z',
});

export const degradedArchiveEntryFixture = archiveEntrySchema.parse({
  archiveEntryId: 'archive-entry-degraded-001',
  projectId: 'project-archive-001',
  processId: 'process-archive-001',
  entryKind: 'process_event',
  sequence: 7,
  lifecycleState: 'finalized',
  finalizationKey: 'event:degraded',
  sourceObjectId: 'event-002',
  bodyText: 'Artifact lookup failed during read enrichment.',
  bodyData: null,
  bodyFormat: 'plain_text',
  relatedArtifactVersionId: 'artifact-version-missing',
  relatedSourceProvenanceId: null,
  relatedToolCallId: null,
  entryStatus: 'degraded',
  degradationReason: 'Related artifact version is unavailable.',
  recordedAt: '2026-05-01T12:00:08.000Z',
});

export const archiveEntryWithArtifactProvenanceFixture = archiveEntrySchema.parse({
  ...processEventArchiveEntryFixture,
  relatedSourceProvenanceId: null,
  relatedArtifactProvenance: {
    versionId: currentArtifactVersionFixture.versionId,
    artifactId: 'artifact-001',
    versionLabel: currentArtifactVersionFixture.versionLabel,
    createdAt: currentArtifactVersionFixture.createdAt,
    producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
    producedByProcessDisplayLabel: currentArtifactVersionFixture.producedByProcessDisplayLabel,
  },
});

export const archiveEntryWithSourceProvenanceFixture = archiveEntrySchema.parse({
  ...processEventArchiveEntryFixture,
  relatedArtifactVersionId: null,
  relatedSourceProvenanceId: readySourceProvenanceFixture.provenanceId,
  relatedSourceProvenance: {
    provenanceId: readySourceProvenanceFixture.provenanceId,
    sourceAttachmentId: readySourceProvenanceFixture.sourceAttachmentId,
    relationshipKind: readySourceProvenanceFixture.relationshipKind,
    repositoryFullName: readySourceProvenanceFixture.repositoryFullName,
    repositoryUrl: readySourceProvenanceFixture.repositoryUrl,
    targetRef: readySourceProvenanceFixture.targetRef,
    entryStatus: readySourceProvenanceFixture.entryStatus,
    degradationReason: readySourceProvenanceFixture.degradationReason,
    recordedAt: readySourceProvenanceFixture.recordedAt,
  },
});

export const allArchiveEntryKindsFixture = [
  userArchiveEntryFixture,
  modelArchiveEntryFixture,
  reasoningArchiveEntryFixture,
  scriptEmissionArchiveEntryFixture,
  toolCallArchiveEntryFixture,
  toolResultArchiveEntryFixture,
  processEventArchiveEntryFixture,
] as const;

export const readyArchiveTurnFixture = derivedTurnSchema.parse({
  turnId: 'process-archive-001:turn:0',
  processId: 'process-archive-001',
  turnIndex: 0,
  archiveEntryIds: [
    userArchiveEntryFixture.archiveEntryId,
    modelArchiveEntryFixture.archiveEntryId,
    toolCallArchiveEntryFixture.archiveEntryId,
    toolResultArchiveEntryFixture.archiveEntryId,
  ],
  startedAt: userArchiveEntryFixture.recordedAt,
  endedAt: toolResultArchiveEntryFixture.recordedAt,
  turnStatus: 'ready',
  degradationReason: null,
});

export const degradedArchiveTurnFixture = derivedTurnSchema.parse({
  turnId: 'process-archive-001:turn:1',
  processId: 'process-archive-001',
  turnIndex: 1,
  archiveEntryIds: [degradedArchiveEntryFixture.archiveEntryId],
  startedAt: degradedArchiveEntryFixture.recordedAt,
  endedAt: degradedArchiveEntryFixture.recordedAt,
  turnStatus: 'degraded',
  degradationReason: 'Related artifact context was missing while rebuilding the turn.',
});

export const turnRangeDerivedArchiveViewFixture = derivedArchiveViewSchema.parse({
  derivedViewId: 'derived-view-001',
  processId: 'process-archive-001',
  viewKind: 'turn_range',
  turnRange: {
    startIndex: 0,
    endIndex: 1,
  },
  sourceTurnIds: [readyArchiveTurnFixture.turnId, degradedArchiveTurnFixture.turnId],
  sourceArchiveEntryIds: [
    userArchiveEntryFixture.archiveEntryId,
    degradedArchiveEntryFixture.archiveEntryId,
  ],
  title: 'Turns 0-1',
  bodyText: 'Turns 0-1',
  viewStatus: 'ready',
  degradationReason: null,
  updatedAt: '2026-05-01T12:01:00.000Z',
});

export const chunkCandidateDerivedArchiveViewFixture = derivedArchiveViewSchema.parse({
  derivedViewId: 'derived-view-002',
  processId: 'process-archive-001',
  viewKind: 'chunk_candidate',
  turnRange: {
    startIndex: 0,
    endIndex: 0,
  },
  sourceTurnIds: [readyArchiveTurnFixture.turnId],
  sourceArchiveEntryIds: [
    userArchiveEntryFixture.archiveEntryId,
    modelArchiveEntryFixture.archiveEntryId,
  ],
  title: 'Chunk candidate turn 0',
  bodyText: 'Chunk candidate turn 0',
  viewStatus: 'ready',
  degradationReason: null,
  updatedAt: '2026-05-01T12:01:05.000Z',
});

export const degradedDerivedArchiveViewFixture = derivedArchiveViewSchema.parse({
  derivedViewId: 'derived-view-003',
  processId: 'process-archive-001',
  viewKind: 'chunk_candidate',
  turnRange: {
    startIndex: 1,
    endIndex: 1,
  },
  sourceTurnIds: [degradedArchiveTurnFixture.turnId],
  sourceArchiveEntryIds: [degradedArchiveEntryFixture.archiveEntryId],
  title: 'Chunk candidate turn 1',
  bodyText: 'Chunk candidate turn 1',
  viewStatus: 'degraded',
  degradationReason: 'Turn source metadata was incomplete during refresh.',
  updatedAt: '2026-05-01T12:01:10.000Z',
});

export const readyArchivePageFixture = archivePageSchema.parse({
  entries: [...allArchiveEntryKindsFixture, degradedArchiveEntryFixture],
  page: {
    cursor: null,
    nextCursor: degradedArchiveEntryFixture.sequence.toString(),
    hasMore: true,
  },
});

export const readyArchiveTurnPageFixture = archiveTurnPageSchema.parse({
  turns: [readyArchiveTurnFixture, degradedArchiveTurnFixture],
  page: {
    cursor: null,
    nextCursor: degradedArchiveTurnFixture.turnIndex.toString(),
    hasMore: false,
  },
});

export const readyDerivedArchiveViewsFixture = derivedArchiveViewListResponseSchema.parse({
  views: [
    turnRangeDerivedArchiveViewFixture,
    chunkCandidateDerivedArchiveViewFixture,
    degradedDerivedArchiveViewFixture,
  ],
});

export const refreshedDerivedArchiveViewsFixture = derivedArchiveViewRefreshResponseSchema.parse({
  views: readyDerivedArchiveViewsFixture.views,
  refreshStatus: 'settled',
});

export const archiveDerivationConflictErrorFixture = requestErrorSchema.parse({
  code: 'ARCHIVE_DERIVATION_CONFLICT',
  message: 'Derived views could not be refreshed safely from the current archive state.',
  status: 409,
});

export const invalidArchiveRequestErrorFixture = requestErrorSchema.parse({
  code: 'INVALID_ARCHIVE_REQUEST',
  message: 'Archive pagination parameters were invalid.',
  status: 422,
});
