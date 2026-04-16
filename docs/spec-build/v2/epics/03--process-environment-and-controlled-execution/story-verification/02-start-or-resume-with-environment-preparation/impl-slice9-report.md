# Slice 9 Report — Server-Driven Environment Preparation Path

## SLICE_PLAN

Implement the smallest viable server-driven preparation path so that after
start/resume sets `environment.state = preparing`, the server asynchronously
attempts hydration work and publishes the outcome (`ready` or `failed`) via the
process live hub.

**Target modules (new files):**
- `apps/platform/server/services/processes/environment/provider-adapter.ts` —
  `ProviderAdapter` interface + `InMemoryProviderAdapter` (success) +
  `FailingProviderAdapter` (failure)
- `apps/platform/server/services/processes/environment/process-environment.service.ts` —
  `ProcessEnvironmentService` with `runHydrationAsync` (fire-and-forget)

**Target modifications:**
- `process-start.service.ts` — inject `ProcessEnvironmentService?`, call
  `runHydrationAsync` after the initial live publish when preparation is needed
- `process-resume.service.ts` — same pattern
- `apps/platform/server/app.ts` — wire `ProcessEnvironmentService` with
  `InMemoryProviderAdapter` as the default; expose both as `CreateAppOptions`
  overrides
- `tests/service/server/process-live-updates.test.ts` — add TC-2.3a
  (preparing→ready) and TC-2.3b (preparing→failed) under a new
  `server-driven environment preparation` describe block

**Race condition fix in TC-2.1a**: the `InMemoryProviderAdapter` resolves
synchronously (all `InMemoryPlatformStore` mutations are microtask-fast), so
by the time a subsequent bootstrap call fires the background preparation has
already completed. The TC-2.1a test and title were updated to assert `ready`
in the bootstrap, which is the correct durable state after a successful
preparation with the fake provider.

## FILES_CHANGED

| File | Change |
|------|--------|
| `apps/platform/server/services/processes/environment/provider-adapter.ts` | NEW — `ProviderAdapter` interface, `InMemoryProviderAdapter`, `FailingProviderAdapter` |
| `apps/platform/server/services/processes/environment/process-environment.service.ts` | NEW — `ProcessEnvironmentService.runHydrationAsync` (fire-and-forget; publishes ready or failed) |
| `apps/platform/server/services/processes/process-start.service.ts` | MODIFIED — optional `ProcessEnvironmentService` constructor param; calls `runHydrationAsync` when preparation is required |
| `apps/platform/server/services/processes/process-resume.service.ts` | MODIFIED — same pattern as start service |
| `apps/platform/server/app.ts` | MODIFIED — imports and wires `ProcessEnvironmentService` + `InMemoryProviderAdapter`; adds `providerAdapter?` and `processEnvironmentService?` to `CreateAppOptions` |
| `tests/service/server/process-live-updates.test.ts` | MODIFIED — added `server-driven environment preparation` describe block with TC-2.3a and TC-2.3b |
| `tests/service/server/process-actions-api.test.ts` | MODIFIED — TC-2.1a assertion updated from `preparing` to `ready` in the bootstrap, title updated to reflect real behavior |

## TEST_COMMANDS

```bash
# Focused tests for the new server-driven path
corepack pnpm vitest run tests/service/server/process-live-updates.test.ts --reporter=verbose

# Regression check on acceptance-boundary tests
corepack pnpm vitest run tests/service/server/process-actions-api.test.ts

# Full verify: format, lint, typecheck, build, all test suites
corepack pnpm run verify
```

## TEST_RESULTS

```
# process-live-updates.test.ts (5 tests)
✓ process live updates websocket > sends an immediate snapshot after subscribe and publishes later updates
✓ process live updates websocket > rejects websocket subscribe without an authenticated session
✓ process live updates websocket > rejects websocket subscribe for an inaccessible process
✓ server-driven environment preparation > start a draft process drives preparing then ready environment state    [TC-2.3a]
✓ server-driven environment preparation > start with a failing provider drives preparing then failed environment state    [TC-2.3b]

# process-actions-api.test.ts
✓ 25/25 passed

# Full verify
format:check  →  no fixes (157 files)
lint          →  no fixes (158 files)
typecheck     →  clean (server + client)
build         →  clean
test:convex   →  9/9 passed
test:service  →  81/81 passed
test:client   →  130/130 passed
```

## BLOCKERS

None. The slice is complete and verify is clean.

**Design note on `providerKind: null`**: `ProcessEnvironmentService.executeHydration`
currently passes `providerKind: null` to `upsertProcessEnvironmentState`. The
`ProviderAdapter` interface intentionally omits a `providerKind` field in this
slice since the durable-selection policy is spec-gated to Story 5 recovery.
Fixing this is the natural first task of the provider-selection slice.
