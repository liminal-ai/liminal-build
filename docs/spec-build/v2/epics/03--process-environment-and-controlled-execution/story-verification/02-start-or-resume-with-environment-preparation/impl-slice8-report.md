# Impl Slice 8 Report — Story 2 Execution Layer (preparing → ready | failed)

## SLICE_PLAN

**Review blocker addressed:** after `start` / `resume` set `environment.state = preparing`, the
server had no code path that executed hydration work and then transitioned the environment to
`ready` or `failed`. The live-hub publication for that transition was also absent.

**Approach:** minimal provider-adapter abstraction + ProcessEnvironmentService, wired fire-and-forget
into the existing start/resume services. No new HTTP routes, no checkpoint persistence, no Story 3
execution detail.

### Components

| Component | Role |
|---|---|
| `environment/provider-adapter.ts` | `ProviderAdapter` interface + `InMemoryProviderAdapter` (instant success) + `FailingProviderAdapter` (test failure path) |
| `environment/process-environment.service.ts` | `runHydrationAsync` — reads plan, calls adapter, upserts `ready`/`failed`, publishes to live hub |
| `process-start.service.ts` | Added optional `ProcessEnvironmentService` dep; calls `runHydrationAsync` fire-and-forget after plan is set |
| `process-resume.service.ts` | Same as start |
| `app.ts` | Instantiates `InMemoryProviderAdapter` + `ProcessEnvironmentService`; passes them into start/resume constructors; exposes both as `CreateAppOptions` |

### Fire-and-forget contract

`runHydrationAsync` returns `void`. Callers use `this.processEnvironmentService?.runHydrationAsync(...)` — the HTTP response is returned with `preparing` state before hydration completes. The live-hub publish of `ready`/`failed` arrives asynchronously. All errors are caught internally so no unhandled rejection escapes.

## FILES_CHANGED

New:
- `apps/platform/server/services/processes/environment/provider-adapter.ts`
- `apps/platform/server/services/processes/environment/process-environment.service.ts`

Modified:
- `apps/platform/server/services/processes/process-start.service.ts` — added `ProcessEnvironmentService` optional 4th ctor param; calls `runHydrationAsync` after hydration plan is set
- `apps/platform/server/services/processes/process-resume.service.ts` — same
- `apps/platform/server/app.ts` — added `providerAdapter` + `processEnvironmentService` to `CreateAppOptions` and wiring
- `tests/service/server/process-live-updates.test.ts` — added `describe('server-driven environment preparation')` with 2 new tests; added `sessionCookieName`, `FailingProviderAdapter`, `draftProcessFixture` imports
- `tests/service/server/process-actions-api.test.ts` — updated `S2-TC-2.1a` bootstrap assertion from `preparing` to `ready` (reflects that `InMemoryProviderAdapter` completes as microtasks before the subsequent GET request is processed)

## TEST_COMMANDS

```bash
# New tests only
corepack pnpm exec vitest run --reporter=verbose tests/service/server/process-live-updates.test.ts

# Full service suite
corepack pnpm exec vitest run tests/service/server/

# Full verify
corepack pnpm run verify
```

## TEST_RESULTS

### New tests (server-driven environment preparation)

```
✓ server-driven environment preparation > start a draft process drives preparing then ready environment state   28ms
✓ server-driven environment preparation > start with a failing provider drives preparing then failed environment state  25ms
```

Both tests prove server-side causation:
- The HTTP response from POST `/start` shows `state: 'preparing'`
- A subsequent websocket message (received without any manual `publish()` call in the test) shows `state: 'ready'` with the correct `environmentId` from the in-memory provider
- The failing-provider test shows `state: 'failed'` with the exact `blockedReason` thrown by the adapter

### Full suite

```
Test Files  10 passed (10)
Tests       81 passed (81)

corepack pnpm run verify  →  all checks green (format, lint, typecheck, build, convex tests, service tests, client tests)
```

## BLOCKERS

None. Slice is complete and clean.

---

**Note on updated assertion (`S2-TC-2.1a` bootstrap):** the previous assertion expected `state: 'preparing'`
in a GET /bootstrap called immediately after POST /start. With the InMemoryProviderAdapter resolving as
Promise microtasks, the hydration completes before the next `await app.inject()` is processed by the
Node.js event loop. The assertion was updated to `state: 'ready'` with `environmentId: env-mem-<processId>`,
which is the correct durable state after hydration. The `S2-TC-2.1a: start returns environment.state = preparing
in the same session` test (which checks the POST /start response directly) is unchanged and continues to
assert `preparing` — that is still correct because the response is built before the fire-and-forget fires.
