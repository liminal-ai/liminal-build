import type {
  ArtifactReviewTarget,
  ExportPackageResponse,
  PackageReviewTarget,
  RequestError,
  ReviewWorkspaceResponse,
  ReviewWorkspaceSelection,
} from '../../shared/contracts/index.js';
import {
  artifactReviewTargetSchema,
  buildReviewPackageExportApiPath,
  buildReviewArtifactApiPath,
  buildReviewPackageApiPath,
  buildReviewWorkspaceApiPath,
  exportPackageResponseSchema,
  packageReviewTargetSchema,
  requestErrorSchema,
  reviewWorkspaceResponseSchema,
} from '../../shared/contracts/index.js';
import { ApiRequestError } from './auth-api.js';

type ReviewRequestErrorKind =
  | 'review-workspace'
  | 'artifact-review'
  | 'package-review'
  | 'package-export';

function buildFallbackRequestError(
  response: Response,
  requestKind: ReviewRequestErrorKind,
): RequestError {
  if (response.status === 401) {
    return {
      code: 'UNAUTHENTICATED',
      message: 'Authenticated access is required.',
      status: 401,
    };
  }

  if (response.status === 403) {
    return {
      code: 'PROJECT_FORBIDDEN',
      message: 'You do not have access to this process review workspace.',
      status: 403,
    };
  }

  switch (requestKind) {
    case 'review-workspace':
      if (response.status === 404) {
        return {
          code: 'PROCESS_NOT_FOUND',
          message: 'The requested process could not be found.',
          status: 404,
        };
      }

      return {
        code: 'PROCESS_ACTION_FAILED',
        message: 'The review workspace is unavailable right now. Try again or reload the page.',
        status: response.status >= 400 ? response.status : 500,
      };
    case 'artifact-review':
    case 'package-review':
      if (response.status === 404) {
        return {
          code: 'REVIEW_TARGET_NOT_FOUND',
          message: 'The requested review target could not be found.',
          status: 404,
        };
      }

      return {
        code: 'PROCESS_ACTION_FAILED',
        message: 'The review target is unavailable right now. Try again or reload the page.',
        status: response.status >= 400 ? response.status : 500,
      };
    case 'package-export':
      if (response.status === 404) {
        return {
          code: 'REVIEW_TARGET_NOT_FOUND',
          message: 'The requested review target could not be found.',
          status: 404,
        };
      }

      if (response.status === 409) {
        return {
          code: 'REVIEW_EXPORT_NOT_AVAILABLE',
          message: 'The requested package cannot be exported right now.',
          status: 409,
        };
      }

      return {
        code: 'REVIEW_EXPORT_FAILED',
        message: 'Package export failed during preparation.',
        status: response.status >= 400 ? response.status : 500,
      };
  }
}

async function parseRequestError(response: Response, requestKind: ReviewRequestErrorKind) {
  const body = await response.json().catch(() => null);
  const parsed = requestErrorSchema.safeParse(body);

  if (parsed.success) {
    return parsed.data;
  }

  return buildFallbackRequestError(response, requestKind);
}

export async function getReviewWorkspace(args: {
  projectId: string;
  processId: string;
  selection?: ReviewWorkspaceSelection | null;
}): Promise<ReviewWorkspaceResponse> {
  const url = new URL(
    buildReviewWorkspaceApiPath({
      projectId: args.projectId,
      processId: args.processId,
    }),
    'http://story0.local',
  );

  if (args.selection?.targetKind !== undefined) {
    url.searchParams.set('targetKind', args.selection.targetKind);
  }

  if (args.selection?.targetId !== undefined) {
    url.searchParams.set('targetId', args.selection.targetId);
  }

  if (args.selection?.versionId !== undefined) {
    url.searchParams.set('versionId', args.selection.versionId);
  }

  if (args.selection?.memberId !== undefined) {
    url.searchParams.set('memberId', args.selection.memberId);
  }

  const response = await fetch(`${url.pathname}${url.search}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response, 'review-workspace'));
  }

  return reviewWorkspaceResponseSchema.parse(await response.json());
}

export async function getArtifactReview(args: {
  projectId: string;
  processId: string;
  artifactId: string;
  versionId?: string;
}): Promise<ArtifactReviewTarget> {
  const url = new URL(
    buildReviewArtifactApiPath({
      projectId: args.projectId,
      processId: args.processId,
      artifactId: args.artifactId,
    }),
    'http://story0.local',
  );

  if (args.versionId !== undefined) {
    url.searchParams.set('versionId', args.versionId);
  }

  const response = await fetch(`${url.pathname}${url.search}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response, 'artifact-review'));
  }

  return artifactReviewTargetSchema.parse(await response.json());
}

export async function getPackageReview(args: {
  projectId: string;
  processId: string;
  packageId: string;
  memberId?: string;
}): Promise<PackageReviewTarget> {
  const url = new URL(
    buildReviewPackageApiPath({
      projectId: args.projectId,
      processId: args.processId,
      packageId: args.packageId,
    }),
    'http://story0.local',
  );

  if (args.memberId !== undefined) {
    url.searchParams.set('memberId', args.memberId);
  }

  const response = await fetch(`${url.pathname}${url.search}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response, 'package-review'));
  }

  return packageReviewTargetSchema.parse(await response.json());
}

export async function exportPackage(args: {
  projectId: string;
  processId: string;
  packageId: string;
}): Promise<ExportPackageResponse> {
  const response = await fetch(
    buildReviewPackageExportApiPath({
      projectId: args.projectId,
      processId: args.processId,
      packageId: args.packageId,
    }),
    {
      method: 'POST',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response, 'package-export'));
  }

  return exportPackageResponseSchema.parse(await response.json());
}
