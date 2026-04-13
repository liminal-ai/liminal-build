import { z } from 'zod/v4';
import {
  createProcessRequestSchema,
  createProjectRequestSchema,
} from '../../shared/contracts/index.js';
import { buildNotImplementedResponse, notImplementedResponseSchema } from './common.js';

export const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const projectShellQuerySchema = z.object({
  processId: z.string().min(1).optional(),
});

export const listProjectsRouteSchema = {
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const createProjectRouteSchema = {
  body: createProjectRequestSchema,
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const getProjectShellRouteSchema = {
  params: projectParamsSchema,
  querystring: projectShellQuerySchema,
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const createProcessRouteSchema = {
  params: projectParamsSchema,
  body: createProcessRequestSchema,
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const shellHtmlRouteSchema = {
  querystring: projectShellQuerySchema,
  response: {
    200: z.string(),
  },
} as const;

export function buildProjectsStory0Message(operation: string) {
  return buildNotImplementedResponse(
    `${operation} is scaffolded in Story 0 but not implemented yet.`,
  );
}
