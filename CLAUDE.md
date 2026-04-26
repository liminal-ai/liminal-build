<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

Current onboarding and current-state baseline docs live in `docs/onboarding/`.
Read `current-state-index.md` first, then the relevant domain doc, then
`current-state-tech-design.md`, then `current-state-code-map.md`.

## Development Services

This repo requires two long-lived processes for a full runtime environment:

### Starting Convex (local backend)

```bash
pnpm run convex:dev
```

This wraps `scripts/start-convex.sh`, which reads `CONVEX_URL` and
`CONVEX_SITE_URL` from `.env.local` to determine the correct ports, then
starts `convex dev` with explicit `--local-cloud-port` and
`--local-site-port` flags. **Do not run `pnpm exec convex dev` directly** —
without explicit port flags, Convex auto-detects ports and may bind to the
wrong ones, especially in worktree environments where multiple local
backends coexist.

### Starting the app server (Fastify + Vite)

```bash
pnpm dev
```

Starts the Fastify control plane with Vite middleware on the port defined by
`PORT` in `.env.local`. Requires `pnpm run build` to have run at least once
(the `@liminal-build/markdown-package` workspace dependency needs `dist/`).

### Worktree environments

This repo may have multiple git worktrees at sibling paths (e.g.
`~/code/liminal-build-wt-1` through `~/code/liminal-build-wt-5`). Each
worktree has its own `.env.local` with unique Fastify and Convex ports, its
own `.convex/local/default/` with an isolated SQLite database, and its own
`node_modules/`. Worktrees do not share runtime state.

If you are working inside a worktree, use the same `pnpm run convex:dev` and
`pnpm dev` commands. The scripts read from the local `.env.local`
automatically.

### Verification

```bash
pnpm run verify       # format + lint + typecheck + build + unit/service/client tests
pnpm run verify-all   # verify + integration tests + e2e scaffold
pnpm run red-verify   # format + lint + typecheck + build (no tests)
```

Tests do not require running Convex or Fastify services — they use
in-memory stores and mocked auth throughout.
