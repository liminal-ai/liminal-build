import { sourceAttachmentSummarySchema } from '../../apps/platform/shared/contracts/index.js';

const baseSourceFixture = {
  sourceAttachmentId: 'source-base-001',
  displayName: 'liminal-build',
  purpose: 'research' as const,
  accessMode: 'read_only' as const,
  targetRef: 'main',
  attachmentScope: 'project' as const,
  processId: null,
  processDisplayLabel: null,
  updatedAt: '2026-04-13T12:00:00.000Z',
};

export const hydratedSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-hydrated-001',
  hydrationState: 'hydrated',
  updatedAt: '2026-04-13T13:00:00.000Z',
});

export const notHydratedSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-not-hydrated-001',
  hydrationState: 'not_hydrated',
  updatedAt: '2026-04-13T12:00:00.000Z',
});

export const staleSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-stale-001',
  hydrationState: 'stale',
  updatedAt: '2026-04-13T14:00:00.000Z',
});

export const unavailableSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-unavailable-001',
  hydrationState: 'unavailable',
});

export const processScopedSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-process-001',
  purpose: 'implementation',
  hydrationState: 'hydrated',
  attachmentScope: 'process',
  processId: 'process-feature-impl-1',
  processDisplayLabel: 'Feature Implementation #1',
});

export const writableProcessScopedSourceFixture = sourceAttachmentSummarySchema.parse({
  ...baseSourceFixture,
  sourceAttachmentId: 'source-process-writable-001',
  purpose: 'implementation',
  accessMode: 'read_write',
  hydrationState: 'hydrated',
  attachmentScope: 'process',
  processId: 'process-feature-impl-2',
  processDisplayLabel: 'Feature Implementation #2',
  targetRef: 'feature/epic-03',
});
