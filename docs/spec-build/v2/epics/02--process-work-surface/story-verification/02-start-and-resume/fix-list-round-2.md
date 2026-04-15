# Story 2 Fix List Round 2

## Blocking

### 1. Non-409 start/resume failures are dropped as unhandled async rejections

Evidence:
- [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:389) and [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:411) rethrow any action failure that is not the stale-action `409 PROCESS_ACTION_NOT_AVAILABLE` case.
- [shell-app.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/shell-app.ts:48) and [shell-app.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/shell-app.ts:51) invoke the async handlers with `void`, so those rejections have no surface-level recovery path.

Required outcome:
- Start/resume failures must no longer escape as unhandled promise rejections.
- Same-session action failures must surface coherently on the process page.

Minimum acceptable behavior:
- `PROCESS_ACTION_NOT_AVAILABLE` keeps the existing inline action-error behavior.
- `PROJECT_FORBIDDEN`, `PROJECT_NOT_FOUND`, and `PROCESS_NOT_FOUND` transition the work surface into the corresponding unavailable state instead of throwing.
- `UNAUTHENTICATED` should follow the existing login redirect behavior used elsewhere in bootstrap.
- Unexpected failures must not become dropped promise rejections; they need a bounded, visible recovery path on the page.

Proof required:
- add client tests for at least one non-409 unavailable action outcome
- add a client test or harness proof that the async action path no longer produces dropped rejections for those handled failures
- rerun `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`

### 2. AC-2.4 proof is still too fixture-driven around a server path that only returns `running`

Evidence:
- [convex/processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:241) and [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:658) currently transition the real start/resume store path to a generic `running` + `currentRequest: null` result.
- [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:447) proves the page can render mocked waiting/completed/failed action payloads, but [process-actions-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-actions-api.test.ts:117) does not prove those richer outcomes at the server/action boundary.

Required outcome:
- Story 2 needs a stronger proof that its action boundary can surface resulting waiting/completed/failed/interrupted states without depending on Story 6 transport.

Minimum acceptable behavior:
- If production logic is intentionally still generic for current process modules, add server-side proof that the action route/service path correctly carries richer returned process/currentRequest results when the underlying action layer produces them.
- Do not implement Story 3 response submission or Story 6 live transport.
- Do not weaken AC-2.4 down to “page can render fixtures.”

Proof required:
- add or update server-side tests so the API/service boundary exercises richer returned action results, not just the generic running baseline
- keep the existing client boundary tests that prove the page renders those returned states
- rerun `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
