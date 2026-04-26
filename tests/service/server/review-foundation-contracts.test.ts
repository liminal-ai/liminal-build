import { describe, expect, it } from 'vitest';
import {
  artifactSummarySchema,
  artifactVersionDetailSchema,
  artifactVersionSummarySchema,
  buildReviewArtifactApiPath,
  buildReviewExportDownloadApiPath,
  buildReviewPackageApiPath,
  buildReviewPackageExportApiPath,
  buildReviewWorkspaceApiPath,
  buildReviewWorkspacePath,
  exportPackageResponseSchema,
  packageMemberReviewSchema,
  requestErrorSchema,
  reviewTargetSchema,
  reviewWorkspaceResponseSchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  currentArtifactVersionFixture,
  readyArtifactReviewTargetFixture,
} from '../../fixtures/artifact-versions.js';
import { exportPackageResponseFixture } from '../../fixtures/export-responses.js';
import { exportablePackageFixture } from '../../fixtures/package-snapshots.js';
import {
  artifactVersionNotFoundRequestErrorFixture,
  artifactVersionNotFoundTargetErrorFixture,
  packageMemberNotAllowedRequestErrorFixture,
  packageMemberUnavailableRequestErrorFixture,
  packageMemberUnavailableTargetErrorFixture,
} from '../../fixtures/review-errors.js';
import {
  emptyArtifactReviewWorkspaceFixture,
  exportablePackageReviewWorkspaceFixture,
  readyArtifactReviewWorkspaceFixture,
  renderErrorReviewWorkspaceFixture,
  unavailableReviewWorkspaceFixture,
  unsupportedReviewWorkspaceFixture,
} from '../../fixtures/review-workspace.js';

describe('Epic 05 Story 0 review foundation contracts', () => {
  it('defines the shared review route and endpoint vocabulary once', () => {
    expect(
      buildReviewWorkspacePath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/projects/project-1/processes/process-1/review');
    expect(
      buildReviewWorkspaceApiPath({
        projectId: 'project-1',
        processId: 'process-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/review');
    expect(
      buildReviewArtifactApiPath({
        projectId: 'project-1',
        processId: 'process-1',
        artifactId: 'artifact-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/review/artifacts/artifact-1');
    expect(
      buildReviewPackageApiPath({
        projectId: 'project-1',
        processId: 'process-1',
        packageId: 'package-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/review/packages/package-1');
    expect(
      buildReviewPackageExportApiPath({
        projectId: 'project-1',
        processId: 'process-1',
        packageId: 'package-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/review/packages/package-1/export');
    expect(
      buildReviewExportDownloadApiPath({
        projectId: 'project-1',
        processId: 'process-1',
        exportId: 'export-1',
      }),
    ).toBe('/api/projects/project-1/processes/process-1/review/exports/export-1');
  });

  it('accepts the shared review request-level error codes', () => {
    expect(
      requestErrorSchema.parse({
        code: 'REVIEW_TARGET_NOT_FOUND',
        message: 'The requested target was not found.',
        status: 404,
      }),
    ).toMatchObject({
      code: 'REVIEW_TARGET_NOT_FOUND',
    });
    expect(artifactVersionNotFoundRequestErrorFixture).toMatchObject({
      code: 'ARTIFACT_VERSION_NOT_FOUND',
      status: 404,
    });
    expect(packageMemberUnavailableRequestErrorFixture).toMatchObject({
      code: 'PACKAGE_MEMBER_UNAVAILABLE',
      status: 404,
    });
    expect(packageMemberNotAllowedRequestErrorFixture).toMatchObject({
      code: 'PACKAGE_MEMBER_NOT_ALLOWED',
      status: 409,
    });
    expect(
      requestErrorSchema.parse({
        code: 'REVIEW_EXPORT_NOT_AVAILABLE',
        message: 'The requested package cannot be exported yet.',
        status: 409,
      }),
    ).toMatchObject({
      code: 'REVIEW_EXPORT_NOT_AVAILABLE',
    });
    expect(
      requestErrorSchema.parse({
        code: 'REVIEW_EXPORT_FAILED',
        message: 'Export preparation failed.',
        status: 503,
      }),
    ).toMatchObject({
      code: 'REVIEW_EXPORT_FAILED',
    });
  });

  it('enforces ISO 8601 UTC timestamps on review version and export metadata', () => {
    expect(
      artifactVersionSummarySchema.parse({
        versionId: 'artifact-version-123',
        versionLabel: 'checkpoint-20260423030000',
        isCurrent: true,
        createdAt: '2026-04-23T03:00:00Z',
        producedByProcessId: 'process-123',
        producedByProcessDisplayLabel: 'Feature Specification #3',
      }),
    ).toMatchObject({
      createdAt: '2026-04-23T03:00:00Z',
      producedByProcessId: 'process-123',
    });
    expect(() =>
      artifactVersionSummarySchema.parse({
        versionId: 'artifact-version-123',
        versionLabel: 'checkpoint-20260423030000',
        isCurrent: true,
        createdAt: 'not-a-date',
        producedByProcessId: 'process-123',
        producedByProcessDisplayLabel: 'Feature Specification #3',
      }),
    ).toThrow();
    expect(() =>
      artifactVersionSummarySchema.parse({
        versionId: 'artifact-version-123',
        versionLabel: 'checkpoint-20260230000000',
        isCurrent: true,
        createdAt: '2026-02-30T00:00:00.000Z',
        producedByProcessId: 'process-123',
        producedByProcessDisplayLabel: 'Feature Specification #3',
      }),
    ).toThrow();
    expect(() =>
      exportPackageResponseSchema.parse({
        ...exportPackageResponseFixture,
        expiresAt: '2026-02-30T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('requires review target and package member error/detail fields to match status', () => {
    expect(() =>
      reviewTargetSchema.parse({
        targetKind: 'package',
        displayName: 'Mixed Package',
        status: 'unavailable',
      }),
    ).toThrow();
    expect(
      reviewTargetSchema.parse({
        targetKind: 'package',
        displayName: 'Mixed Package',
        status: 'unavailable',
        error: {
          code: 'PACKAGE_MEMBER_UNAVAILABLE',
          message: 'One package member is unavailable.',
        },
      }),
    ).toMatchObject({
      status: 'unavailable',
    });

    expect(() =>
      packageMemberReviewSchema.parse({
        memberId: 'package-member-001',
        status: 'ready',
      }),
    ).toThrow();
    expect(
      packageMemberReviewSchema.parse({
        memberId: 'package-member-001',
        status: 'ready',
        artifact: readyArtifactReviewTargetFixture,
      }),
    ).toMatchObject({
      status: 'ready',
    });

    expect(() =>
      packageMemberReviewSchema.parse({
        memberId: 'package-member-002',
        status: 'unavailable',
        error: packageMemberUnavailableTargetErrorFixture,
        artifact: readyArtifactReviewTargetFixture,
      }),
    ).toThrow();
  });

  it('rejects invalid artifact version detail payloads by content kind, body status, and provenance', () => {
    expect(() =>
      artifactVersionDetailSchema.parse({
        versionId: 'artifact-version-unsupported-001',
        versionLabel: 'checkpoint-20260423040000',
        contentKind: 'unsupported',
        body: 'This should not be present.',
        createdAt: '2026-04-23T04:00:00Z',
        producedByProcessId: 'process-123',
        producedByProcessDisplayLabel: 'Feature Specification #3',
      }),
    ).toThrow();

    expect(() =>
      artifactVersionDetailSchema.parse({
        versionId: currentArtifactVersionFixture.versionId,
        versionLabel: currentArtifactVersionFixture.versionLabel,
        contentKind: 'markdown',
        bodyStatus: 'ready',
        createdAt: currentArtifactVersionFixture.createdAt,
        producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
        producedByProcessDisplayLabel: currentArtifactVersionFixture.producedByProcessDisplayLabel,
      }),
    ).toThrow();

    expect(
      artifactVersionDetailSchema.parse({
        versionId: currentArtifactVersionFixture.versionId,
        versionLabel: currentArtifactVersionFixture.versionLabel,
        contentKind: 'markdown',
        bodyStatus: 'ready',
        body: '<h1>Rendered Markdown</h1>',
        mermaidBlocks: [],
        createdAt: currentArtifactVersionFixture.createdAt,
        producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
        producedByProcessDisplayLabel: currentArtifactVersionFixture.producedByProcessDisplayLabel,
      }),
    ).toMatchObject({
      contentKind: 'markdown',
      bodyStatus: 'ready',
      producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
    });

    expect(
      artifactVersionDetailSchema.parse({
        versionId: currentArtifactVersionFixture.versionId,
        versionLabel: currentArtifactVersionFixture.versionLabel,
        contentKind: 'markdown',
        bodyStatus: 'ready',
        body: '',
        mermaidBlocks: [],
        createdAt: currentArtifactVersionFixture.createdAt,
        producedByProcessId: currentArtifactVersionFixture.producedByProcessId,
        producedByProcessDisplayLabel: currentArtifactVersionFixture.producedByProcessDisplayLabel,
      }),
    ).toMatchObject({
      bodyStatus: 'ready',
      body: '',
    });
  });

  it('rejects mixed artifact and package review targets', () => {
    expect(() =>
      reviewTargetSchema.parse({
        targetKind: 'artifact',
        displayName: readyArtifactReviewTargetFixture.displayName,
        status: 'ready',
        artifact: readyArtifactReviewTargetFixture,
        package: exportablePackageFixture,
      }),
    ).toThrow();

    expect(() =>
      reviewTargetSchema.parse({
        targetKind: 'package',
        displayName: exportablePackageFixture.displayName,
        status: 'ready',
        artifact: readyArtifactReviewTargetFixture,
      }),
    ).toThrow();

    expect(
      reviewTargetSchema.parse({
        targetKind: 'package',
        displayName: exportablePackageFixture.displayName,
        status: 'ready',
        package: exportablePackageFixture,
      }),
    ).toMatchObject({
      targetKind: 'package',
      status: 'ready',
    });
  });

  it('constrains review request errors to the documented code and status pairs', () => {
    expect(
      requestErrorSchema.parse({
        code: 'REVIEW_TARGET_NOT_FOUND',
        message: 'The requested target was not found.',
        status: 404,
      }),
    ).toMatchObject({
      code: 'REVIEW_TARGET_NOT_FOUND',
      status: 404,
    });
    expect(() =>
      requestErrorSchema.parse({
        code: 'REVIEW_TARGET_NOT_FOUND',
        message: 'The requested target was not found.',
        status: 500,
      }),
    ).toThrow();
  });

  it('defines project artifact summaries without process-ownership fields', () => {
    const summary = artifactSummarySchema.parse({
      artifactId: 'artifact-001',
      displayName: 'Cross-process Technical Design',
      currentVersionLabel: 'v7',
      updatedAt: '2026-04-25T18:45:00.000Z',
      attachmentScope: 'process',
      processId: 'process-legacy-001',
      processDisplayLabel: 'Legacy Process Label',
    });

    expect(summary).toEqual({
      artifactId: 'artifact-001',
      displayName: 'Cross-process Technical Design',
      currentVersionLabel: 'v7',
      updatedAt: '2026-04-25T18:45:00.000Z',
    });
  });

  it('fixtures cover ready, empty, unsupported, unavailable, and bounded-error review workspace states', () => {
    expect(reviewWorkspaceResponseSchema.parse(readyArtifactReviewWorkspaceFixture)).toMatchObject({
      target: {
        status: 'ready',
        targetKind: 'artifact',
      },
    });
    expect(reviewWorkspaceResponseSchema.parse(emptyArtifactReviewWorkspaceFixture)).toMatchObject({
      target: {
        status: 'empty',
        targetKind: 'artifact',
      },
    });
    expect(reviewWorkspaceResponseSchema.parse(unavailableReviewWorkspaceFixture)).toMatchObject({
      target: {
        status: 'unavailable',
        targetKind: 'package',
      },
    });
    expect(reviewWorkspaceResponseSchema.parse(unsupportedReviewWorkspaceFixture)).toMatchObject({
      target: {
        status: 'unsupported',
        targetKind: 'artifact',
      },
    });
    expect(reviewWorkspaceResponseSchema.parse(renderErrorReviewWorkspaceFixture)).toMatchObject({
      target: {
        status: 'error',
        targetKind: 'artifact',
      },
    });
    expect(
      reviewWorkspaceResponseSchema.parse(exportablePackageReviewWorkspaceFixture),
    ).toMatchObject({
      target: {
        status: 'ready',
        targetKind: 'package',
      },
    });
  });

  it('fixtures cover export metadata and package exportability vocabulary', () => {
    expect(exportPackageResponseSchema.parse(exportPackageResponseFixture)).toMatchObject({
      exportId: 'export-001',
      contentType: 'application/gzip',
      packageFormat: 'mpkz',
    });
    expect(exportablePackageReviewWorkspaceFixture.target?.package?.exportability).toEqual({
      available: true,
    });
    expect(unavailableReviewWorkspaceFixture.target?.package?.exportability).toEqual({
      available: false,
      reason: 'One or more members are unavailable.',
    });
    expect(unavailableReviewWorkspaceFixture.target?.error).toMatchObject({
      code: packageMemberUnavailableTargetErrorFixture.code,
    });
    expect(artifactVersionNotFoundTargetErrorFixture.code).toBe('ARTIFACT_VERSION_NOT_FOUND');
  });

  it('requires export download URLs to be valid absolute URLs', () => {
    expect(() =>
      exportPackageResponseSchema.parse({
        ...exportPackageResponseFixture,
        downloadUrl: '/api/projects/project-001/processes/process-001/review/exports/export-001',
      }),
    ).toThrow();
  });
});
