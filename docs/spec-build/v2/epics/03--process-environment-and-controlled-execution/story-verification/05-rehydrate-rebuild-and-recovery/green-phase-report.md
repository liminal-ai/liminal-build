# Story 5 GREEN Phase Report

Date: `2026-04-15`
Story: `05-rehydrate-rebuild-and-recovery`
Phase: `GREEN`

## Outcome

Story 5 recovery behavior is now implemented and the `13` red tests are green.

Implemented in this phase:

- real `POST /api/projects/:projectId/processes/:processId/rehydrate`
- real `POST /api/projects/:projectId/processes/:processId/rebuild`
- `ProcessEnvironmentService.rehydrate(...)`
- `ProcessEnvironmentService.rebuild(...)`
- in-memory and failing provider recovery adapters
- client recovery-state preservation for `rehydrating` and `rebuilding`
- client blocked-recovery promotion for rebuild-required and missing-prerequisite paths
- distinct control copy for `rehydrating`

## Green Behavior Notes

- `rehydrate` now performs access checks, validates recovery availability, seeds the hydration plan, moves the environment to `rehydrating`, publishes the upsert plus recomputed process summary, then completes asynchronously to `ready` or `failed`.
- `rebuild` now performs access checks, rejects only when prerequisites are already known missing, seeds the hydration plan, moves the environment to `rebuilding`, publishes the upsert plus recomputed process summary, then completes asynchronously to `ready` or `failed`.
- Recovery transitions preserve durable checkpoint context by leaving `lastCheckpointResult` and durable outputs intact unless a later checkpoint update explicitly replaces them.
- Client reconciliation now keeps the latest checkpoint result visible while `rehydrating` or `rebuilding`.
- Client action-error handling now keeps blocked recovery reasons visible and promotes rebuild when rehydrate is rejected as not recoverable.
- To make the mixed focused Vitest command run exactly as specified, the three Story 5 client test files now declare `jsdom` explicitly with file-level Vitest environment annotations. Assertions were not weakened.

## RED Tests

`13/13` Story 5 RED tests are now green.

## Verification

### Focused Gate

Command:

```sh
corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts tests/service/server/process-live-updates.test.ts tests/service/client/process-live.test.ts tests/service/client/process-controls.test.ts tests/service/client/process-work-surface-page.test.ts 2>&1 | tail -30
```

Exact gate output:

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  5 passed (5)
      Tests  125 passed (125)
   Start at  22:18:21
   Duration  725ms (transform 441ms, setup 0ms, import 910ms, tests 667ms, environment 820ms)
```

Result: passed

### Full Gate

Command:

```sh
corepack pnpm run verify 2>&1 | tail -20
```

Exact gate output:

```text


 Test Files  12 passed (12)
      Tests  101 passed (101)
   Start at  22:18:32
   Duration  768ms (transform 1.06s, setup 0ms, import 3.02s, tests 924ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  146 passed (146)
   Start at  22:18:34
   Duration  1.17s (transform 1.49s, setup 0ms, import 2.89s, tests 625ms, environment 9.28s)
```

Result: passed

## Files Touched

Product code:

- `apps/platform/server/services/processes/environment/process-environment.service.ts`
- `apps/platform/server/services/processes/environment/provider-adapter.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/app.ts`
- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/process-live.ts`

Test files updated for exact gate execution:

- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-controls.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
