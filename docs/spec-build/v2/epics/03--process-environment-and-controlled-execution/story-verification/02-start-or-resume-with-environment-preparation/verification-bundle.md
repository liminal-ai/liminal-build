# Story 2 Verification Bundle

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

## Implementation Claim Summary

- `start` and `resume` now return visible `environment.state = preparing`
  in-session when environment work is required, instead of only generic running
  status.
- Accepted action responses now include `environment` in the response shape and
  the client bootstrap patch path applies it immediately.
- A minimal hydration-plan layer now exists behind the server action path:
  - `WorkingSetPlan` added to `PlatformStore`
  - `getProcessHydrationPlan` / `setProcessHydrationPlan` wired through all store
    implementations
  - `hydration-planner.ts` derives a plan from current process material refs
- Server action tests now prove:
  - visible preparing state on `start` / `resume`
  - hydration plans are built from current materials only
  - partial working sets omit absent categories cleanly
- Client materials rendering now shows source `accessMode` visibly as
  `read only` vs `read write`
- Client page tests now assert visible preparation state immediately after
  `start` / `resume`
- Client live/store tests now explicitly cover:
  - hydration progress through environment upserts
  - hydration failure through environment upserts
  - readiness before running
  - no running after failed preparation

## Files Changed

Implementation files:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
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

Doc drift introduced during implementation:

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`

## Changed-File Manifest Against Story Base Commit

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processEnvironmentStates.ts`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-materials-section.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

## Changed Test Files

Verifiers should inspect:

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

## Gate Evidence

Current tree evidence observed by orchestrator:

- `corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts --environment node`
  - passed (`23` tests)
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
  - passed on the current Story 2 tree

Latest observed full-gate totals on the current tree:

- Convex tests: `9`
- Server tests: `77`
- Client tests: `130`

## Claimed Residual Risks

- Story 2 is still not yet committed or accepted; this is the current green
  implementation tree for verification.
- The current implementation adds hydration-plan persistence but does not yet
  introduce provider-backed hydration execution. Verifiers should evaluate
  whether the story’s acceptance conditions are satisfied by the current
  behavior or whether more execution/hydration integration is required.
- `tech-design-server.md` was modified during implementation. Verifiers should
  decide whether that change is legitimate alignment or scope drift.

## Claimed Spec Deviations Or Questions

- No explicit blocking question was reported with the current tree.
- One likely review question:
  whether storing hydration plans in `PlatformStore` / `processEnvironmentStates`
  is an acceptable Story 2 implementation detail or premature design drift.
