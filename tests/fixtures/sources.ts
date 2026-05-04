import {
  type SourceAttachmentSummary,
  sourceAttachmentSummarySchema,
  sourceProvenanceEntrySchema,
} from '../../apps/platform/shared/contracts/index.js';

export function buildSourceAttachmentSummaryFixture(
  overrides: Partial<SourceAttachmentSummary> = {},
) {
  return sourceAttachmentSummarySchema.parse({
    ...baseSourceFixture,
    sourceAttachmentId: overrides.sourceAttachmentId ?? baseSourceFixture.sourceAttachmentId,
    ...overrides,
  });
}

const baseSourceFixture: SourceAttachmentSummary = {
  sourceAttachmentId: 'source-base-001',
  provider: 'github' as const,
  displayName: 'liminal-build',
  purpose: 'research' as const,
  accessMode: 'read_only' as const,
  repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
  repositoryFullName: 'liminal-ai/liminal-build',
  targetRef: 'main',
  hydrationState: 'hydrated',
  attachmentScope: 'project' as const,
  processId: null,
  processDisplayLabel: null,
  lastHydratedAt: '2026-04-13T12:00:00.000Z',
  lastHydratedResolvedRef: 'a'.repeat(40),
  lastObservedRemoteResolvedRef: 'a'.repeat(40),
  freshnessReason: null,
  refreshStatus: 'idle' as const,
  refreshRequestedAt: null,
  detachedAt: null,
  updatedAt: '2026-04-13T12:00:00.000Z',
};

export const hydratedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-hydrated-001',
  hydrationState: 'hydrated',
  updatedAt: '2026-04-13T13:00:00.000Z',
});

export const notHydratedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-not-hydrated-001',
  hydrationState: 'not_hydrated',
  lastHydratedAt: null,
  lastHydratedResolvedRef: null,
  lastObservedRemoteResolvedRef: null,
  updatedAt: '2026-04-13T12:00:00.000Z',
});

export const staleSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-stale-001',
  hydrationState: 'stale',
  lastHydratedResolvedRef: 'a'.repeat(40),
  lastObservedRemoteResolvedRef: 'b'.repeat(40),
  freshnessReason: 'target_ref_changed',
  updatedAt: '2026-04-13T14:00:00.000Z',
});

export const unavailableSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-unavailable-001',
  hydrationState: 'unavailable',
  lastObservedRemoteResolvedRef: null,
  freshnessReason: 'repository_unavailable',
});

export const processScopedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-process-001',
  purpose: 'implementation',
  hydrationState: 'hydrated',
  attachmentScope: 'process',
  processId: 'process-feature-impl-1',
  processDisplayLabel: 'Feature Implementation #1',
});

export const writableProcessScopedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-process-writable-001',
  purpose: 'implementation',
  accessMode: 'read_write',
  hydrationState: 'hydrated',
  attachmentScope: 'process',
  processId: 'process-feature-impl-2',
  processDisplayLabel: 'Feature Implementation #2',
  targetRef: 'feature/epic-03',
});

export const pendingRefreshSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-pending-refresh-001',
  hydrationState: 'stale',
  freshnessReason: 'working_copy_missing',
  refreshStatus: 'pending',
  refreshRequestedAt: '2026-04-13T14:05:00.000Z',
  updatedAt: '2026-04-13T14:05:00.000Z',
});

export const detachedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-detached-001',
  hydrationState: 'hydrated',
  detachedAt: '2026-04-13T15:00:00.000Z',
  updatedAt: '2026-04-13T15:00:00.000Z',
});

export const projectShadowedSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-shadow-project-001',
  displayName: 'liminal-build shared',
  updatedAt: '2026-04-13T16:00:00.000Z',
});

export const processShadowingSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-shadow-process-001',
  displayName: 'liminal-build process shadow',
  attachmentScope: 'process',
  processId: 'process-feature-impl-1',
  processDisplayLabel: 'Feature Implementation #1',
  updatedAt: '2026-04-13T16:05:00.000Z',
});

export const duplicateMissingTargetRefSourceFixture = buildSourceAttachmentSummaryFixture({
  sourceAttachmentId: 'source-missing-target-ref-001',
  targetRef: null,
  lastHydratedAt: null,
  lastHydratedResolvedRef: null,
  lastObservedRemoteResolvedRef: null,
  updatedAt: '2026-04-13T16:10:00.000Z',
});

export const readySourceProvenanceFixture = sourceProvenanceEntrySchema.parse({
  provenanceId: 'provenance-ready-001',
  sourceAttachmentId: hydratedSourceFixture.sourceAttachmentId,
  relationshipKind: 'informed_work',
  repositoryFullName: hydratedSourceFixture.repositoryFullName,
  repositoryUrl: hydratedSourceFixture.repositoryUrl,
  targetRef: hydratedSourceFixture.targetRef,
  currentAttachmentDisplayName: hydratedSourceFixture.displayName,
  currentAttachmentScope: hydratedSourceFixture.attachmentScope,
  currentAttachmentAccessMode: hydratedSourceFixture.accessMode,
  currentAttachmentHydrationState: hydratedSourceFixture.hydrationState,
  currentAttachmentVisibility: 'available',
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: '2026-04-13T16:20:00.000Z',
});

export const degradedSourceProvenanceFixture = sourceProvenanceEntrySchema.parse({
  provenanceId: 'provenance-degraded-001',
  sourceAttachmentId: null,
  relationshipKind: 'received_code_update',
  repositoryFullName: writableProcessScopedSourceFixture.repositoryFullName,
  repositoryUrl: writableProcessScopedSourceFixture.repositoryUrl,
  targetRef: writableProcessScopedSourceFixture.targetRef,
  currentAttachmentDisplayName: null,
  currentAttachmentScope: null,
  currentAttachmentAccessMode: null,
  currentAttachmentHydrationState: null,
  currentAttachmentVisibility: 'detached',
  entryStatus: 'degraded',
  degradationReason: 'source_detached',
  recordedAt: '2026-04-13T16:25:00.000Z',
});
