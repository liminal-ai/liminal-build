import { z } from 'zod/v4';
import { buildNotImplementedResponse, notImplementedResponseSchema } from './common.js';

export const logoutHeadersSchema = z.object({
  'x-csrf-token': z.string().min(1),
});

export const authMeRouteSchema = {
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const logoutRouteSchema = {
  headers: logoutHeadersSchema,
  response: {
    501: notImplementedResponseSchema,
  },
} as const;

export const loginRouteSchema = {
  response: {
    501: z.string(),
  },
} as const;

export function buildAuthStory0Message(operation: string) {
  return buildNotImplementedResponse(
    `${operation} is scaffolded in Story 0 but not implemented yet.`,
  );
}
