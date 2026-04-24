import { z } from 'zod/v4';
import {
  artifactReviewTargetSchema,
  exportPackageResponseSchema,
  packageReviewTargetSchema,
  requestErrorSchema,
  reviewWorkspaceResponseSchema,
  reviewWorkspaceRouteParamsSchema,
  reviewWorkspaceSelectionSchema,
} from '../../shared/contracts/index.js';

export const reviewHtmlRouteSchema = {
  response: {
    200: z.string(),
    302: z.string().optional(),
    403: z.string(),
    404: z.string(),
  },
} as const;

export const getReviewWorkspaceRouteSchema = {
  params: reviewWorkspaceRouteParamsSchema,
  querystring: reviewWorkspaceSelectionSchema,
  response: {
    200: reviewWorkspaceResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const getReviewArtifactRouteSchema = {
  params: reviewWorkspaceRouteParamsSchema.extend({
    artifactId: z.string().min(1),
  }),
  querystring: reviewWorkspaceSelectionSchema.pick({
    versionId: true,
  }),
  response: {
    200: artifactReviewTargetSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const getReviewPackageRouteSchema = {
  params: reviewWorkspaceRouteParamsSchema.extend({
    packageId: z.string().min(1),
  }),
  querystring: reviewWorkspaceSelectionSchema.pick({
    memberId: true,
  }),
  response: {
    200: packageReviewTargetSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const postReviewPackageExportRouteSchema = {
  params: reviewWorkspaceRouteParamsSchema.extend({
    packageId: z.string().min(1),
  }),
  response: {
    200: exportPackageResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const getReviewExportDownloadRouteSchema = {
  params: reviewWorkspaceRouteParamsSchema.extend({
    exportId: z.string().min(1),
  }),
  querystring: z.object({
    token: z.string().optional(),
  }),
  response: {
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;
