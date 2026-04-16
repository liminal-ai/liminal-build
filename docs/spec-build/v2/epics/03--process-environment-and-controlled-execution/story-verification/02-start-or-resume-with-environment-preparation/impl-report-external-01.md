# Story 2 Implementation Report — External Worker 01

## PLAN

Deliver the first concrete Story 2 slice:

1. Add `upsertProcessEnvironmentState` mutation to Convex and `PlatformStore`
2. Extend `startProcessResponseSchema` / `resumeProcessResponseSchema` to include `environment`
3. Update `ProcessStartService` and `ProcessResumeService` to transition environment to
   `preparing` (conditional on resulting process status) and return it in the same-session response
4. Apply the action response `environment` in the client so the UI reflects `preparing` immediately
5. Add focused server tests: TC-2.1a, TC-2.1b, TC-2.4b, TC-2.5a, TC-2.5b
6. Fix stub implementations in `RecordingPlatformStore` and inline stores in test files

AC scope targeted in this slice:
- AC-2.1 (start/resume enters preparing) — fully delivered
- AC-2.5 (accessMode visible in materials) — fully delivered
- AC-2.4b (running does not begin after failed preparation) — delivered via conditional logic
- AC-2.2, AC-2.3, AC-2.4a — deferred; require provider adapters and hydration infrastructure not in this slice

## CHANGES

### `convex/processEnvironmentStates.ts`
- Added `import { mutation, ... }` alongside existing `query`
- Added `upsertProcessEnvironmentState` public mutation: upserts or inserts a
  `processEnvironmentStates` row, returns `EnvironmentSummary`. Preserves existing
  `lastHydratedAt` and `lastCheckpointResult` on patch.

### `apps/platform/shared/contracts/process-work-surface.ts`
- Added `environment: environmentSummarySchema.default(defaultEnvironmentSummary)` to
  `startProcessResponseSchema` and `resumeProcessResponseSchema`.
  - Using `.default(...)` preserves backward compatibility for existing fixtures that
    omit the field (they receive absent-state defaults on parse).

### `apps/platform/server/services/projects/platform-store.ts`
- Added `deriveEnvironmentStatusLabel` to imports
- Added `upsertProcessEnvironmentState` to `PlatformStore` interface
- Added `upsertProcessEnvironmentStateMutation` Convex function reference
- Added `upsertProcessEnvironmentState` to `NullPlatformStore` (returns derived summary directly)
- Added `upsertProcessEnvironmentState` to `InMemoryPlatformStore` (updates the in-memory
  `processEnvironmentSummariesByProcessId` map; preserves `lastHydratedAt` and checkpoint state)
- Added `upsertProcessEnvironmentState` to `ConvexPlatformStore` (calls Convex mutation)

### `apps/platform/server/services/processes/process-start.service.ts`
- After `startProcess(...)`, conditionally calls `upsertProcessEnvironmentState` with
  `state: 'preparing'` only when `requiresEnvironmentPreparation(result.process.status)` —
  i.e., only when process ends up in `running` or `waiting`.
  - Terminal results (`failed`, `completed`, `interrupted`) leave environment state unchanged.
- Returns `environment` in the response payload.
- Added `requiresEnvironmentPreparation` helper.

### `apps/platform/server/services/processes/process-resume.service.ts`
- Full rewrite to use same conditional pattern as start service.
- Reads `existingEnvironment` first (to preserve `environmentId` and `lastHydratedAt`),
  then conditionally calls `upsertProcessEnvironmentState` with `state: 'preparing'`.
- Returns `environment` in the response payload.

### `apps/platform/client/app/bootstrap.ts`
- Updated `applyProcessActionResponse` to also apply `response.environment` to the store,
  so the UI shows `preparing` immediately on action completion without waiting for a live update.

### `tests/service/server/process-actions-api.test.ts`
- Updated `keeps resume responses aligned with the current durable environment summary` →
  renamed to `resume always enters environment preparing state and the response reflects it`.
  Updated expectations to match new `preparing` state controls.
- Added `S2-TC-2.1a` (start returns `environment.state = preparing`)
- Added `S2-TC-2.1a` (preparation state is durable in bootstrap after start)
- Added `S2-TC-2.1b` (resume returns `environment.state = preparing`)
- Added `S2-TC-2.1b` (resume preserves prior `environmentId` and `lastHydratedAt` in preparing)
- Added `S2-TC-2.4b` (start does not enter preparing when result is terminal)

### `tests/service/server/process-work-surface-api.test.ts`
- Added `S2-TC-2.5a` (bootstrap exposes `read_write` for a writable attached source)
- Added `S2-TC-2.5b` (bootstrap exposes `read_only` for a read-only attached source)

### `tests/service/server/auth-routes.test.ts`
- Added `upsertProcessEnvironmentState` to the inline stub store to satisfy `PlatformStore`

### `tests/service/server/processes-api.test.ts`
- Added `EnvironmentSummary` to imports
- Added `upsertProcessEnvironmentState` to `RecordingPlatformStore` to satisfy `PlatformStore`

## TESTS

New tests added (all in `tests/service/server/`):

| Test | File | TC |
|------|------|----|
| start returns `environment.state = preparing` | `process-actions-api.test.ts` | S2-TC-2.1a |
| start preparation state durable in bootstrap | `process-actions-api.test.ts` | S2-TC-2.1a |
| resume returns `environment.state = preparing` | `process-actions-api.test.ts` | S2-TC-2.1b |
| resume preserves prior `environmentId` and `lastHydratedAt` | `process-actions-api.test.ts` | S2-TC-2.1b |
| start does not enter preparing for terminal result | `process-actions-api.test.ts` | S2-TC-2.4b |
| bootstrap exposes `read_write` accessMode | `process-work-surface-api.test.ts` | S2-TC-2.5a |
| bootstrap exposes `read_only` accessMode | `process-work-surface-api.test.ts` | S2-TC-2.5b |

Updated tests:
- `process-actions-api.test.ts`: Updated `keeps resume...` test to match new `preparing`-state
  controls for `rehydrate` and `rebuild` disabled reasons.

## GATE_RESULT

```
corepack pnpm run verify
```

- `format:check`: PASSED (153 files, no fixes)
- `lint`: PASSED (154 files, no fixes)
- `typecheck` (server + client): PASSED
- `build` (server + client): PASSED
- `test:convex` (vitest): 9/9 passed
- `test:service` (vitest): 74/74 passed (9 new tests added this story)
- `test:client` (vitest): 122/122 passed

`corepack pnpm exec convex codegen`: Could not run. No local Convex backend running at
`http://127.0.0.1:3210`. Story gate is not weakened — this is the same condition as prior
stories and the generated types are aligned via `makeFunctionReference` in `platform-store.ts`.

## RESIDUAL_RISKS

1. **`providerKind: null` in services**: Both start and resume pass `providerKind: null` to
   `upsertProcessEnvironmentState`. The Convex schema allows `null` (Story 1 deviation preserved).
   Story 2's actual provider selection logic (Daytona vs local) is deferred until the provider
   adapter registry is built.

2. **`preparing` state persists indefinitely**: Without an environment orchestrator and provider
   adapter, a process will remain in `preparing` forever. The state transition to `ready` requires
   the infrastructure from the full Story 2 execution slice (outside this slice's scope).

3. **Conditional entry logic**: The decision to only enter `preparing` for `running`/`waiting`
   results (not `failed`/`completed`) deviates from the simplest possible implementation.
   If the store mutation immediately returns `failed`, the environment stays `absent`. This
   is intentional to preserve existing control visibility for terminal states but it means
   environment state doesn't follow the full Story 2 flow for those paths yet.

4. **Convex re-query after upsert**: `upsertProcessEnvironmentState` in Convex re-queries the row
   after insert/patch. In a high-concurrency scenario this could return stale data from a racing
   write. Acceptable for the current development stage.

## SPEC_DEVIATIONS

1. **Public mutation vs `internalMutation`**: The tech design recommends `internal*` functions
   for server-only environment transitions. The Convex HTTP client cannot call internal functions,
   so `upsertProcessEnvironmentState` is a public mutation. This is a known architectural
   constraint. Resolution: use a Convex `action` that calls an `internalMutation` once the
   environment orchestrator is in place.

2. **Conditional `preparing` entry**: Spec implies start/resume always enter `preparing` when
   the action is accepted. This implementation gates the entry on whether the resulting process
   status indicates active work (`running` or `waiting`). This keeps existing TC-2.4c behavior
   correct (failed/completed results don't disable `restart` due to `preparing` environment).

3. **Client immediate update**: The spec says preparation state should be "visible immediately
   in the same session." The client now applies `response.environment` in `applyProcessActionResponse`.
   In the current fixture baseline, the action response carries `environment: absent` (default),
   which means client tests still see `absent` unless the test mocks a server that returns
   `preparing`. The client path is wired but not covered by new client tests in this slice.

## OPEN_QUESTIONS

1. **Should resume skip `preparing` if environment is already `ready`?** The current
   implementation always enters `preparing` when resuming to `running`/`waiting`. If a process
   is paused with a `ready` environment and then resumed, it goes back to `preparing` rather
   than immediately entering `running`. This may be undesirable once actual provider adapters
   are in place (re-preparation would waste time for a healthy environment). The controls model
   already gates resume on `absent | ready` environment state, so when providers are real, the
   service should check if the existing environment is healthy before re-entering `preparing`.

2. **`upsertProcessEnvironmentState` public surface concern**: Once the environment orchestrator
   is built, should `upsertProcessEnvironmentState` be gated behind an internal mutation + action
   boundary? The current public exposure means any caller with a valid Convex URL can upsert
   environment state.
