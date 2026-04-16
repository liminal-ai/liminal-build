# Story 2 Verification Bundle — Round 2

## Story

- Story:
  `stories/02-start-or-resume-with-environment-preparation.md`
- Story title:
  `Story 2: Start or Resume with Environment Preparation`
- Story base commit:
  `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`

## ACs / TCs Targeted

- `AC-2.1`
  - `TC-2.1a`
  - `TC-2.1b`
- `AC-2.2`
  - `TC-2.2a`
  - `TC-2.2b`
- `AC-2.3`
  - `TC-2.3a`
  - `TC-2.3b`
- `AC-2.4`
  - `TC-2.4a`
  - `TC-2.4b`
- `AC-2.5`
  - `TC-2.5a`
  - `TC-2.5b`

## Current Claim Set

- `start` and `resume` now return `environment.state = preparing` in-session
  when environment work is required and include `environment` in the response.
- The client bootstrap/action patch path applies the returned `environment`
  immediately.
- A hydration working-set plan now exists and includes:
  - current artifact ids
  - current source attachment ids
  - current output ids
- The hydration-plan layer is wired through all `PlatformStore`
  implementations and the relevant test doubles.
- Server tests now cover:
  - start/resume entering `preparing`
  - durable bootstrap visibility after action
  - hydration plan seeded from current materials
  - partial working sets with absent categories omitted cleanly
  - outputs included in the hydration plan
- Client page tests now assert visible preparation state immediately after
  `start` / `resume`.
- Client materials tests now assert `read_only` vs `read_write` visibility.
- Client live/store tests now explicitly cover:
  - hydration progress via environment live update
  - hydration failure via environment live update
  - running only after readiness
  - no running after failed preparation

## Files Changed

Implementation files:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/environment/hydration-planner.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processEnvironmentStates.ts`

Tests and fixtures:

- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-materials-section.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Additional modified doc:

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`

## Changed Test Files

- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-materials-section.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Diff command for changed tests:

```bash
git diff 326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579 -- **/*.test.* **/*.spec.*
```

## Gate Evidence On Current Tree

- `corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts --environment node`
  - passed (`25` tests)
- `corepack pnpm exec vitest run tests/service/server/process-work-surface-api.test.ts --environment node`
  - passed (`15` tests)
- `corepack pnpm exec vitest run tests/service/client/process-materials-section.test.ts --environment jsdom`
  - passed (`3` tests)
- `corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts --environment jsdom`
  - passed (`36` tests)
- `corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom`
  - passed (`17` tests)
- `corepack pnpm exec tsc --noEmit -p tsconfig.json`
  - passed
- `corepack pnpm run verify`
  - passed

Latest observed full-gate totals on the current tree:

- Convex tests: `9`
- Server tests: `79`
- Client tests: `130`

## Residual Risks To Pressure-Test

- The tree now stores and verifies hydration planning, but not a provider-backed
  working-copy hydration execution. Reviewers should decide whether Story 2 as
  written still requires more than planning + visible preparation/progress
  semantics.
- `tech-design-server.md` was modified during implementation. Reviewers should
  decide whether that is harmless alignment or scope drift.

## Main Review Question

Does the current Story 2 tree now satisfy AC-2.2 through AC-2.4 strongly enough
for acceptance, or is provider-backed hydration execution still required by the
story's current language?
