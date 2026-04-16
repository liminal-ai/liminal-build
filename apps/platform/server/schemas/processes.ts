import { z } from 'zod/v4';
import {
  rebuildProcessResponseSchema,
  rehydrateProcessResponseSchema,
  resumeProcessResponseSchema,
  processWorkSurfaceResponseSchema,
  processWorkSurfaceRouteParamsSchema,
  requestErrorSchema,
  startProcessResponseSchema,
  submitProcessResponseResponseSchema,
} from '../../shared/contracts/index.js';

export const processHtmlRouteSchema = {
  response: {
    200: z.string(),
    302: z.string().optional(),
    403: z.string(),
    404: z.string(),
  },
} as const;

export const getProcessWorkSurfaceRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  response: {
    200: processWorkSurfaceResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const startProcessRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  response: {
    200: startProcessResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
  },
} as const;

export const resumeProcessRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  response: {
    200: resumeProcessResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
  },
} as const;

export const rehydrateProcessRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  response: {
    200: rehydrateProcessResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    501: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const rebuildProcessRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  response: {
    200: rebuildProcessResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    501: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const submitProcessResponseRouteSchema = {
  params: processWorkSurfaceRouteParamsSchema,
  body: z.unknown(),
  response: {
    200: submitProcessResponseResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    500: requestErrorSchema,
  },
} as const;
