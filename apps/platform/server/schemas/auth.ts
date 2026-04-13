import { z } from 'zod/v4';
import {
  authenticatedUserResponseSchema,
  logoutResponseSchema,
  requestErrorSchema,
} from '../../shared/contracts/index.js';

export const loginQuerySchema = z.object({
  returnTo: z.string().optional(),
});

export const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const logoutHeadersSchema = z.object({
  'x-csrf-token': z.string().min(1),
});

export const authMeRouteSchema = {
  response: {
    200: authenticatedUserResponseSchema,
    401: requestErrorSchema,
  },
} as const;

export const logoutRouteSchema = {
  headers: logoutHeadersSchema,
  response: {
    200: logoutResponseSchema,
  },
} as const;

export const loginRouteSchema = {
  querystring: loginQuerySchema,
} as const;

export const callbackRouteSchema = {
  querystring: callbackQuerySchema,
} as const;
