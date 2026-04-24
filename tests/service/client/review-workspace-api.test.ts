// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exportPackage,
  getArtifactReview,
  getReviewWorkspace,
} from '../../../apps/platform/client/browser-api/review-workspace-api.js';

describe('review workspace api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps review workspace bootstrap fallback errors in the workspace taxonomy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('forbidden', {
          status: 403,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    await expect(
      getReviewWorkspace({
        projectId: 'project-001',
        processId: 'process-001',
      }),
    ).rejects.toMatchObject(
      expect.objectContaining({
        payload: expect.objectContaining({
          code: 'PROJECT_FORBIDDEN',
          status: 403,
        }),
      }),
    );
  });

  it('maps artifact review fallback 404s to REVIEW_TARGET_NOT_FOUND', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('missing', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    await expect(
      getArtifactReview({
        projectId: 'project-001',
        processId: 'process-001',
        artifactId: 'artifact-001',
      }),
    ).rejects.toMatchObject(
      expect.objectContaining({
        payload: expect.objectContaining({
          code: 'REVIEW_TARGET_NOT_FOUND',
          status: 404,
        }),
      }),
    );
  });

  it('maps export fallback failures to REVIEW_EXPORT_FAILED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('unavailable', {
          status: 503,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    await expect(
      exportPackage({
        projectId: 'project-001',
        processId: 'process-001',
        packageId: 'package-001',
      }),
    ).rejects.toMatchObject(
      expect.objectContaining({
        payload: expect.objectContaining({
          code: 'REVIEW_EXPORT_FAILED',
          status: 503,
        }),
      }),
    );
  });
});
