import { describe, expect, it } from 'vitest';
import {
  buildSourceAttachmentSummaryFixture,
  degradedSourceProvenanceFixture,
  detachedSourceFixture,
  duplicateMissingTargetRefSourceFixture,
  pendingRefreshSourceFixture,
  processShadowingSourceFixture,
  projectShadowedSourceFixture,
  readySourceProvenanceFixture,
} from '../../fixtures/sources.js';
import {
  createSourceAttachmentRequestSchema,
  detachSourceAttachmentResponseSchema,
  listProcessSourceProvenanceResponseSchema,
  refreshSourceAttachmentResponseSchema,
  requestErrorSchema,
  sourceAttachmentSummarySchema,
  sourceManagementErrorCodeSchema,
  updateSourceAttachmentRequestSchema,
} from '../../../apps/platform/shared/contracts/index.js';

describe('Epic 06 Story 0 source-management contracts', () => {
  it('accepts Epic 6 source attachment identity, freshness, refresh, and soft-detach fields', () => {
    expect(sourceAttachmentSummarySchema.parse(pendingRefreshSourceFixture)).toMatchObject({
      repositoryFullName: 'liminal-ai/liminal-build',
      refreshStatus: 'pending',
      refreshRequestedAt: '2026-04-13T14:05:00.000Z',
    });
    expect(sourceAttachmentSummarySchema.parse(detachedSourceFixture)).toMatchObject({
      detachedAt: '2026-04-13T15:00:00.000Z',
    });
    expect(
      sourceAttachmentSummarySchema.parse(duplicateMissingTargetRefSourceFixture),
    ).toMatchObject({
      targetRef: null,
      repositoryFullName: 'liminal-ai/liminal-build',
    });
  });

  it('captures process-scoped shadowing and degraded provenance fixtures', () => {
    expect(projectShadowedSourceFixture.repositoryFullName).toBe(
      processShadowingSourceFixture.repositoryFullName,
    );
    expect(projectShadowedSourceFixture.targetRef).toBe(processShadowingSourceFixture.targetRef);
    expect(projectShadowedSourceFixture.attachmentScope).toBe('project');
    expect(processShadowingSourceFixture.attachmentScope).toBe('process');
    expect(
      listProcessSourceProvenanceResponseSchema.parse({
        entries: [readySourceProvenanceFixture, degradedSourceProvenanceFixture],
      }),
    ).toMatchObject({
      entries: [
        { entryStatus: 'ready', currentAttachmentVisibility: 'available' },
        {
          entryStatus: 'degraded',
          currentAttachmentVisibility: 'detached',
          degradationReason: 'source_detached',
        },
      ],
    });
  });

  it('defines source-management request, response, and error contracts', () => {
    expect(
      createSourceAttachmentRequestSchema.parse({
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        targetRef: 'main',
      }),
    ).toMatchObject({
      provider: 'github',
      accessMode: 'read_write',
    });
    expect(
      updateSourceAttachmentRequestSchema.parse({
        targetRef: 'feature/story-0',
      }),
    ).toMatchObject({
      targetRef: 'feature/story-0',
    });
    expect(
      refreshSourceAttachmentResponseSchema.parse({
        sourceAttachment: buildSourceAttachmentSummaryFixture(),
        refreshStatus: 'settled',
      }),
    ).toMatchObject({
      refreshStatus: 'settled',
    });
    expect(
      detachSourceAttachmentResponseSchema.parse({
        detached: true,
        sourceAttachmentId: detachedSourceFixture.sourceAttachmentId,
        detachedAt: detachedSourceFixture.detachedAt,
      }),
    ).toMatchObject({
      detached: true,
    });
    expect(sourceManagementErrorCodeSchema.options).toContain('SOURCE_ATTACHMENT_CONFLICT');
    expect(
      requestErrorSchema.parse({
        code: 'SOURCE_ATTACHMENT_UNAVAILABLE',
        message: 'GitHub repository access is currently unavailable.',
        status: 503,
      }),
    ).toMatchObject({
      code: 'SOURCE_ATTACHMENT_UNAVAILABLE',
      status: 503,
    });
  });
});
