import { z } from 'zod/v4';
import {
  artifactReviewTargetSchema,
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
