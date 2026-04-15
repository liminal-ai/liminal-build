import { z } from 'zod/v4';
import {
  processWorkSurfaceResponseSchema,
  processWorkSurfaceRouteParamsSchema,
  requestErrorSchema,
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
