# Epic 01 Handoff

This document is a compact re-entry point for continuing Epic 1 work after
context compaction.

## Current Repo State

- Repo: `liminal-ai/liminal-build`
- Branch: `main`
- Story 0 complete and pushed in commit `f1eec27`
- Story 1 complete and pushed in commit `8ee9306`
- Story 2 complete and pushed in commit `97e0743`
- Global git identity is configured to:
  - `Lee Moore`
  - `80419529+leegmoore@users.noreply.github.com`

## Completed Stories

### Story 0

- Real pnpm workspace scaffold
- `apps/platform` app package
- shared Zod-first contracts
- Fastify/Vite/Convex/Auth seams
- fixtures, test helpers, setup docs

### Story 1

- WorkOS hosted AuthKit login with Fastify-owned auth routes
- app-owned sealed session cookie
- authenticated project entry
- project index visibility and role labels
- forbidden direct project access handling
- logout fixed to:
  - clear local session
  - redirect through WorkOS hosted logout URL

### Story 2

- project creation implemented on server and in Convex store layer
- duplicate owned-project name rejection
- empty shell bootstrap returned for new project
- client-side create-project modal with validation and cancel behavior
- project open from index and direct route
- browser back/forward and refresh route restoration
- create-process modal shell open/cancel path implemented

## Important Architecture Decisions

- Fastify owns auth, shell delivery, and browser-facing APIs
- WorkOS is used directly through the Node SDK; no WorkOS middleware is used
- Current auth model is:
  - hosted WorkOS sign-in page
  - app-owned session cookie
  - hosted WorkOS logout redirect
- Convex owns durable app state, not the primary auth/session flow
- Browser-only client API modules live under `apps/platform/client/browser-api`
  to avoid collisions with real `/api/*` server routes
- Local development standard port is `5001`, not `3000`

## Local Runtime State

- `.env.local` is the live local env file and is ignored
- Server startup loads root `.env`, then root `.env.local`, with `.env.local`
  values winning over `.env` values
- WorkOS local configuration is already set up for:
  - `http://localhost:5001/auth/callback`
  - `http://localhost:5001/auth/login`
  - `http://localhost:5001/projects`
- Convex local dev has already been bootstrapped once
- `pnpm exec convex dev` should be kept running in a dedicated terminal during
  local app work
- Platform dev server runs with:
  - `pnpm --filter @liminal-build/platform dev`

## Repo Hygiene Decisions Already Made

- Keep Convex generated files:
  - `convex/_generated/*`
  - `convex/tsconfig.json`
- Keep Convex helper files and skill links:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.agents/*`
  - `.claude/*`
  - `skills-lock.json`
- Remove only the Convex auth skill:
  - `.agents/skills/convex-setup-auth`
  - `.claude/skills/convex-setup-auth`
  - corresponding lock entry

## Verification Baseline

Current expected gate:

```bash
pnpm verify
```

That command was green before handoff at the end of Story 2.

## Story 3 Next

Story 3 is the next intended unit of work.

Primary focus:

- populate project shell section envelopes
- implement real process/artifact/source summary readers
- support `ready`, `empty`, and section-level `error` states
- render usable project shell summaries, not just empty placeholders

Read first:

- `docs/spec-build/v2/epics/01--project-and-process-shell/stories/03-project-shell-summaries.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/tech-design-server.md`
  Flow 3
- `docs/spec-build/v2/epics/01--project-and-process-shell/tech-design-client.md`
  Flow 3
- `docs/spec-build/v2/epics/01--project-and-process-shell/test-plan.md`
  Story 3 related sections

## Story 4 Relationship

- Story 4 depends on Story 3
- Some work could theoretically overlap, but the safer path is still:
  - Story 3 first
  - Story 4 second
- Shared process-summary and process-list behavior sits across both stories, so
  treating them as fully parallel is likely to create rework

## Known Useful Implementation References

- Auth logout completion:
  - `apps/platform/server/routes/auth.ts`
  - `apps/platform/server/services/auth/auth-session.service.ts`
  - `apps/platform/client/browser-api/auth-api.ts`
  - `apps/platform/client/features/projects/shell-header.ts`
- Story 2 project creation/open:
  - `apps/platform/server/services/projects/project-create.service.ts`
  - `apps/platform/server/routes/projects.ts`
  - `apps/platform/server/services/projects/platform-store.ts`
  - `convex/projects.ts`
  - `apps/platform/client/app/bootstrap.ts`
  - `apps/platform/client/features/projects/project-index-page.ts`
  - `apps/platform/client/features/projects/create-project-modal.ts`
  - `tests/service/server/project-create-api.test.ts`
  - `tests/service/client/project-router.test.ts`

## Do Not Re-Decide Without Asking

- Do not remove `.claude` or other helper files unless explicitly requested
- Do not switch away from hosted WorkOS login for Epic 1 without explicit user
  direction
- Do not change the local-dev port away from `5001` without explicit user
  direction
