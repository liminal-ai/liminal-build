import { z } from 'zod/v4';
import {
  type AuthenticatedUser,
  type ShellBootstrapPayload,
  shellBootstrapPayloadSchema,
} from '../shared/contracts/index.js';

const runtimeEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  APP_ORIGIN: z.string().url(),
  WORKOS_CLIENT_ID: z.string().min(1),
  WORKOS_API_KEY: z.string().min(1),
  WORKOS_COOKIE_PASSWORD: z.string().min(32),
  WORKOS_REDIRECT_URI: z.string().url(),
  WORKOS_LOGIN_RETURN_URI: z.string().url(),
  CONVEX_DEPLOYMENT: z.string().min(1),
  CONVEX_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof runtimeEnvSchema>;

export const story0PlaceholderEnv: ServerEnv = runtimeEnvSchema.parse({
  PORT: 3000,
  APP_ORIGIN: 'http://localhost:3000',
  WORKOS_CLIENT_ID: 'story0-client-id',
  WORKOS_API_KEY: 'story0-api-key',
  WORKOS_COOKIE_PASSWORD: 'story0-cookie-password-story0-cookie-password',
  WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  WORKOS_LOGIN_RETURN_URI: 'http://localhost:3000/projects',
  CONVEX_DEPLOYMENT: 'dev:story0',
  CONVEX_URL: 'https://story0.example.convex.cloud',
});

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return runtimeEnvSchema.parse(source);
}

export function buildShellBootstrapPayload(args: {
  actor?: AuthenticatedUser | null;
  pathname: string;
  search: string;
  csrfToken?: string | null;
}): ShellBootstrapPayload {
  return shellBootstrapPayloadSchema.parse({
    actor: args.actor ?? null,
    pathname: args.pathname,
    search: args.search,
    csrfToken: args.csrfToken ?? null,
    auth: {
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
    },
  });
}
