# Local Bootstrap

Story 0 intentionally ships a **human-assisted** local bootstrap path. The
repository should install, typecheck, and build without real credentials, but a
working local server requires environment setup.

## 1. Install Node and pnpm

- Install Node `24.14.x`.
- Install pnpm `10.x`.
- Verify:
  - `node --version`
  - `pnpm --version`

## 2. Install workspace dependencies

- Run `pnpm install` from the repository root.

These commands should work **before** secrets exist:

- `pnpm typecheck`
- `pnpm build`
- `pnpm red-verify`
- `pnpm verify`
- `pnpm verify-all`

## 3. Create local environment file

- Copy `.env.example` to `.env`.
- Fill in the values required for your local WorkOS and Convex setup.

## 4. Bootstrap local Convex

- Install or use the Convex CLI through the workspace dependency.
- Start local Convex with `pnpm exec convex dev` when you are ready to wire
  durable state beyond Story 0.
- Record the local `CONVEX_DEPLOYMENT` and `CONVEX_URL` values in `.env`.

Story 0 does not require generated Convex bindings or a live Convex deployment
for build and typecheck. Later stories will start depending on a prepared local
Convex environment.

## 5. Bootstrap WorkOS AuthKit

- Run `npx workos@latest` and follow the AuthKit setup flow for the local
  environment.
- Configure the local callback/origin values:
  - app origin: `http://localhost:3000`
  - callback URI: `http://localhost:3000/auth/callback`
  - post-login return URI: `http://localhost:3000/projects`
- Place the issued client id, API key, redirect URI, and cookie password in
  `.env`.

## 6. Secret provisioning expectations

Story 0 assumes these secrets are needed for a real local run:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`
- `WORKOS_COOKIE_PASSWORD`
- `WORKOS_REDIRECT_URI`
- `WORKOS_LOGIN_RETURN_URI`
- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`

The scaffolded runtime may fail fast on `pnpm --filter @liminal-build/platform dev`
or `start` if those values are missing. That is expected in Story 0.

## 7. Commands after secrets exist

Once `.env` is filled and the local providers are ready, these should be the
next commands to try:

- `pnpm --filter @liminal-build/platform dev`
- `pnpm --filter @liminal-build/platform start`

Story 0 does not promise a fully working product shell yet. The goal is a
compileable, decision-complete scaffold for Stories 1-5.
