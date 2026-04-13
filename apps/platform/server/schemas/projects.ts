import { z } from 'zod/v4';
import {
  createProcessRequestSchema,
  createProjectRequestSchema,
  projectShellResponseSchema,
  projectSummarySchema,
  requestErrorSchema,
} from '../../shared/contracts/index.js';

export const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const projectShellQuerySchema = z.object({
  processId: z.string().min(1).optional(),
});

export const listProjectsRouteSchema = {
  response: {
    200: z.array(projectSummarySchema),
    401: requestErrorSchema,
  },
} as const;

export const createProjectRouteSchema = {
  body: createProjectRequestSchema,
  response: {
    501: requestErrorSchema,
  },
} as const;

export const getProjectShellRouteSchema = {
  params: projectParamsSchema,
  querystring: projectShellQuerySchema,
  response: {
    200: projectShellResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const createProcessRouteSchema = {
  params: projectParamsSchema,
  body: createProcessRequestSchema,
  response: {
    501: requestErrorSchema,
  },
} as const;

export const shellHtmlRouteSchema = {
  querystring: projectShellQuerySchema,
  response: {
    200: z.string(),
    302: z.string().optional(),
    403: z.string(),
    404: z.string(),
  },
} as const;
