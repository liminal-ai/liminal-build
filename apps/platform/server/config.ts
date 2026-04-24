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
  // Required: shared API key used by the Fastify control plane when calling
  // the service-only Convex artifact wrappers. This is runtime service auth,
  // not a Convex deploy/admin key.
  CONVEX_API_KEY: z.string().min(1),
  // Required: Daytona API key. Fastify boots the real Daytona provider by
  // default, so local/shared runtime must be able to authenticate to Daytona
  // before the app starts.
  DAYTONA_API_KEY: z.string().min(1),
  DAYTONA_API_URL: z.string().url().optional(),
  DAYTONA_TARGET: z.string().min(1).optional(),
  // Spec default for shared/remote: hosted Daytona. Trusted local development
  // overrides via `.env` to `'local'`. See tech-design-server.md:107 and the
  // Epic 3 implementation addendum (item 12).
  DEFAULT_ENVIRONMENT_PROVIDER_KIND: z.enum(['daytona', 'local']).default('daytona'),
  // Optional override for `LocalProviderAdapter`'s working-tree root. Defaults
  // to `os.tmpdir()/liminal-build-sandboxes` (set inside the adapter when this
  // env var is absent).
  LOCAL_PROVIDER_WORKSPACE_ROOT: z.string().optional(),
  // Required: GitHub Personal Access Token used by `OctokitCodeCheckpointWriter`
  // to push code checkpoint commits directly to attached writable target refs.
  // Production wiring constructs the writer with this token; the constructor
  // throws if it is empty so the production path fails loud rather than
  // silently falling back to the stub. See the Epic 3 implementation
  // addendum (item 3) and tech-design-server.md:939-959.
  GITHUB_TOKEN: z.string().min(1),
  REVIEW_EXPORT_HMAC_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof runtimeEnvSchema>;

export const story0PlaceholderEnv: ServerEnv = runtimeEnvSchema.parse({
  PORT: 5001,
  APP_ORIGIN: 'http://localhost:5001',
  WORKOS_CLIENT_ID: 'story0-client-id',
  WORKOS_API_KEY: 'story0-api-key',
  WORKOS_COOKIE_PASSWORD: 'story0-cookie-password-story0-cookie-password',
  WORKOS_REDIRECT_URI: 'http://localhost:5001/auth/callback',
  WORKOS_LOGIN_RETURN_URI: 'http://localhost:5001/projects',
  CONVEX_DEPLOYMENT: 'dev:story0',
  CONVEX_URL: 'https://story0.example.convex.cloud',
  CONVEX_API_KEY: 'story0-convex-api-key-placeholder',
  DAYTONA_API_KEY: 'story0-daytona-api-key-placeholder',
  // story0 placeholder: dev-shaped. Tests and Story 0 fixtures expect `local`
  // so they don't try to construct the Daytona-default adapter chain.
  DEFAULT_ENVIRONMENT_PROVIDER_KIND: 'local',
  // story0 placeholder: tests inject `codeCheckpointWriter` explicitly via
  // `options.codeCheckpointWriter` rather than letting `createApp` construct
  // the real Octokit writer. This placeholder satisfies the schema's
  // `min(1)` so test wiring still parses cleanly.
  GITHUB_TOKEN: 'github_pat_story0_placeholder',
  REVIEW_EXPORT_HMAC_SECRET: 'story0-review-export-hmac-secret-placeholder',
});

export function hasLiveConvexConfig(env: ServerEnv): boolean {
  return env.CONVEX_URL !== story0PlaceholderEnv.CONVEX_URL;
}

export function hasLiveWorkosConfig(env: ServerEnv): boolean {
  return (
    env.WORKOS_API_KEY !== story0PlaceholderEnv.WORKOS_API_KEY &&
    env.WORKOS_CLIENT_ID !== story0PlaceholderEnv.WORKOS_CLIENT_ID
  );
}

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
