VERDICT: REVISE

## AC_TC_COVERAGE

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| AC-5.1 | SATISFIED | OBSERVED: `apps/platform/server/services/processes/process-work-surface.service.ts:120-275`, `tests/service/server/process-work-surface-api.test.ts:321-379`, `tests/service/client/process-controls.test.ts:108-175`, `tests/service/client/process-work-surface-page.test.ts:364-391` | The surface distinguishes stale, lost, failed, rebuilding, unavailable, and rehydrating states through control derivation and page rendering. |
| TC-5.1a | SATISFIED | OBSERVED: `tests/service/server/process-work-surface-api.test.ts:321-379`, `tests/service/client/process-controls.test.ts:108-113` | Stale state is returned distinctly and enables `rehydrate` while keeping `rebuild` disabled. |
| TC-5.1b | SATISFIED | OBSERVED: `tests/service/client/process-controls.test.ts:115-119`, `tests/service/client/process-work-surface-page.test.ts:364-391` | Lost state renders distinctly and flips recovery affordances to `rebuild`. |
| AC-5.2 | VIOLATED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:57-105`, `apps/platform/server/services/projects/platform-store.ts:761-773`, `apps/platform/shared/contracts/process-work-surface.ts:83-95`, `convex/processEnvironmentStates.ts:18-29`, `129-139` | The Story 5 service path exists, but the real Convex-backed store cannot persist `state: 'rehydrating'`, so production `rehydrate` is broken before acceptance. |
| TC-5.2a | VIOLATED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:75-82`, `convex/processEnvironmentStates.ts:18-29`, `129-139`; test-only green lane: `tests/service/server/process-actions-api.test.ts:1233-1259` | The focused server test passes only against `InMemoryPlatformStore`; the live Convex mutation validator rejects the accepted recovery state that Story 5 writes. |
| TC-5.2b | VIOLATED | OBSERVED: client-side preservation/update logic exists in `apps/platform/client/app/bootstrap.ts:337-457`, `apps/platform/client/app/process-live.ts:90-112`, and `tests/service/client/process-live.test.ts:406-471`; blocking server/store mismatch: `convex/processEnvironmentStates.ts:18-29`, `129-139` | Same-session UI update logic is correct in isolation, but the real server path cannot enter an accepted `rehydrate` flow against Convex. |
| AC-5.3 | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:108-166`, `apps/platform/server/services/processes/environment/provider-adapter.ts:99-106`, `tests/service/server/process-actions-api.test.ts:1261-1316` | Rebuild uses the same acceptance pattern as other environment lifecycle actions and does not depend on a surviving prior handle. |
| TC-5.3a | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:137-166`, `tests/service/server/process-actions-api.test.ts:1261-1287` | Lost environments enter `rebuilding` and are accepted through the server route. |
| TC-5.3b | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:137-159`, `apps/platform/server/services/processes/environment/provider-adapter.ts:99-106`, `tests/service/server/process-actions-api.test.ts:1289-1316` | Rebuild seeds a new environment id and does not require the prior working copy to survive. |
| AC-5.4 | UNRESOLVED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:784-793`, `apps/platform/client/app/bootstrap.ts:337-355`, `apps/platform/client/app/process-live.ts:90-112`, `convex/processEnvironmentStates.ts:180-185`, `apps/platform/server/services/projects/platform-store.ts:1268-1273`; planned deeper coverage: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:401-404` | The critical invariant is implemented: `lastCheckpointResult` is preserved when recovery upserts omit it, and recovery only reads canonical outputs/material refs. But the planned rebuild/reopen tests are not present, and rehydrate is blocked on the live store. |
| TC-5.4a | UNRESOLVED | OBSERVED/INFERRED: `apps/platform/server/services/processes/environment/process-environment.service.ts:784-793`; planned coverage: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:403-404` | Recovery planning includes current outputs and does not overwrite durable outputs, but there is no direct Story 5 rebuild/reopen test proving artifact truth survives. |
| TC-5.4b | UNRESOLVED | OBSERVED: `tests/service/client/process-live.test.ts:406-471`, `apps/platform/client/app/bootstrap.ts:337-355`, `apps/platform/client/app/process-live.ts:90-112`, `convex/processEnvironmentStates.ts:180-185` | The required sub-invariant is satisfied: `lastCheckpointResult` is not wiped during `rehydrating`/`rebuilding`. The broader durable code-truth-after-rebuild claim still lacks the planned reopen coverage. |
| AC-5.5 | VIOLATED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:120-129`, `796-850`, `854-879`, `apps/platform/server/routes/processes.ts:444-527`, `tests/service/server/process-actions-api.test.ts:1318-1388`, `tests/service/client/process-work-surface-page.test.ts:1055-1119` | `409` and `503` preflight rejections are implemented correctly, but the `422 prerequisite missing` path is only reachable in the in-memory test store, not the real Convex-backed store. |
| TC-5.5a | VIOLATED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:120-129`, `854-879`, `apps/platform/server/services/projects/platform-store.ts:761-779`, `tests/service/server/process-actions-api.test.ts:1340-1369`, `tests/service/client/process-work-surface-page.test.ts:1055-1086` | The test proves the behavior with `InMemoryPlatformStore`, but `isCanonicalRecoveryMaterialSetExplicitlyMissing()` explicitly returns `false` for non-Map-backed stores, making the required `422 PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` unreachable in production. |
| TC-5.5b | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:796-823`, `apps/platform/client/app/bootstrap.ts:553-614`, `tests/service/client/process-work-surface-page.test.ts:1089-1119` | Non-recoverable rehydrate requests are rejected with `409 PROCESS_ENVIRONMENT_NOT_RECOVERABLE`, and the client promotes rebuild guidance without showing false readiness. |

## TDD_INTEGRITY

`TEST_FILES_MODIFIED_SINCE_RED_COMMIT = 3`

`git diff d5a25d3 -- '**/*.test.*' '**/*.spec.*'` showed only:

| File | Green-phase diff | Assessment |
|---|---|---|
| `tests/service/client/process-controls.test.ts` | Added `// @vitest-environment jsdom` at file top | Tooling-only; no assertion changes |
| `tests/service/client/process-live.test.ts` | Added `// @vitest-environment jsdom` at file top | Tooling-only; no assertion changes |
| `tests/service/client/process-work-surface-page.test.ts` | Added `// @vitest-environment jsdom` at file top | Tooling-only; no assertion changes |

Assessment:

- No assertion weakening is present in the red -> green test diff.
- The green lane still missed two production-path defects because it never exercises `ConvexPlatformStore` or `convex/processEnvironmentStates.ts` for Story 5 recovery acceptance.

## ARCHITECTURE_FINDINGS

- OBSERVED: `rehydrate` and `rebuild` follow the same `ProcessEnvironmentService` acceptance pattern, seed a hydration plan, publish an immediate environment upsert, and then continue through fire-and-forget async work (`apps/platform/server/services/processes/environment/process-environment.service.ts:57-166`, `169-185`).
- OBSERVED: recovery live publications preserve the Story 3 invariant by always publishing a recomputed process summary alongside the environment update through `buildProcessSurfaceSummary(...)` (`apps/platform/server/services/processes/environment/process-environment.service.ts:728-753`; verified by `tests/service/server/process-live-updates.test.ts:1046-1168`).
- OBSERVED: the critical Story 5 durability rule is implemented in both store and client merge paths. Convex and in-memory stores retain `lastCheckpointResult` when a recovery upsert omits it (`convex/processEnvironmentStates.ts:180-185`, `apps/platform/server/services/projects/platform-store.ts:1268-1273`), and the client preserves that context across `rehydrating`/`rebuilding` updates (`apps/platform/client/app/bootstrap.ts:337-355`, `apps/platform/client/app/process-live.ts:90-112`).
- OBSERVED: the shipped provider layer remains fake/in-memory only; no real HTTP integration was introduced for recovery (`apps/platform/server/services/processes/environment/provider-adapter.ts:39-143`, `apps/platform/server/app.ts:130-145`).

## SCOPE_BOUNDARY_CHECK

- OBSERVED: `git diff --name-only d5a25d3` is limited to six product files and three client test files: `apps/platform/client/app/bootstrap.ts`, `apps/platform/client/app/process-live.ts`, `apps/platform/server/app.ts`, `apps/platform/server/services/processes/environment/process-environment.service.ts`, `apps/platform/server/services/processes/environment/provider-adapter.ts`, `apps/platform/server/services/processes/process-work-surface.service.ts`, plus the three jsdom-annotation test files.
- OBSERVED: no Story 6 reopen/degraded integration files were changed. There are no modifications under `tests/integration/`, `tests/service/client/process-live-status.test.ts`, or websocket transport infrastructure; the shared client changes are narrowly about same-session recovery reconciliation.
- OBSERVED: no real HTTP or external provider integration was added. Recovery still uses `InMemoryProviderAdapter` / `FailingProviderAdapter` only (`apps/platform/server/services/processes/environment/provider-adapter.ts:39-143`).
- OBSERVED: the only test changes since `d5a25d3` are jsdom annotations, so the green phase did not broaden scope through new or weakened assertions.

## BLOCKING_FINDINGS

- finding: Real Convex-backed `rehydrate` is broken because Story 5 writes `state: 'rehydrating'`, but the durable Convex validator still excludes that state.
  severity: CRITICAL
  confidence: HIGH
  evidence: shared contract includes `rehydrating` in `apps/platform/shared/contracts/process-work-surface.ts:83-95`; the service writes it in `apps/platform/server/services/processes/environment/process-environment.service.ts:75-82`; `ConvexPlatformStore` forwards that mutation in `apps/platform/server/services/projects/platform-store.ts:761-773`; the Convex validator rejects it in `convex/processEnvironmentStates.ts:18-29`, `129-139`.
  impact: A real `POST /rehydrate` against the Convex-backed app should fail before acceptance, violating AC-5.2 and preventing the rehydrate half of Story 5 from working in production.
  validation_step: Add `rehydrating` to the Convex validator/schema, add a Convex-backed regression test for the recovery upsert, and rerun `corepack pnpm run verify`.

- finding: `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` is only reachable in the in-memory test store because prerequisite detection inspects test-only Maps and returns `false` for the real Convex store.
  severity: MAJOR
  confidence: HIGH
  evidence: the `422` branch is gated by `isCanonicalRecoveryMaterialSetExplicitlyMissing()` in `apps/platform/server/services/processes/environment/process-environment.service.ts:120-129`, `854-879`; `ConvexPlatformStore` exposes none of those Maps and simply queries durable refs/outputs (`apps/platform/server/services/projects/platform-store.ts:761-779`); the current green tests prove `422` only through `InMemoryPlatformStore` (`tests/service/server/process-actions-api.test.ts:1340-1369`, `tests/service/client/process-work-surface-page.test.ts:1055-1086`).
  impact: On the real durable store, rebuild can accept an empty recovery plan instead of returning `422 PROCESS_ENVIRONMENT_PREREQUISITE_MISSING`, violating AC-5.5a and the story’s preflight rejection boundary.
  validation_step: Make prerequisite-missing derivable from real durable data rather than test-store internals, then add a Convex/integration regression for the `422` path and rerun `corepack pnpm run verify`.

## NONBLOCKING_WARNINGS

- finding: The Story 5 plan expects deeper rebuild/reopen coverage for TC-5.4a and TC-5.4b, but the current green lane only proves checkpoint-context preservation at the store/live-merge layer.
  severity: MINOR
  confidence: HIGH
  evidence: planned coverage in `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:401-404`; current evidence in `tests/service/client/process-live.test.ts:406-471`, `convex/processEnvironmentStates.ts:180-185`.
  impact: The critical `lastCheckpointResult` invariant is protected, but artifact/code truth after a real rebuild-and-reopen sequence is still less directly evidenced than the test plan intends.

- finding: Distinct stale/lost state coverage is present, but the current repo evidence leans on controls/page rendering rather than the exact panel/bootstrap mapping described in the written plan.
  severity: MINOR
  confidence: MEDIUM
  evidence: actual current checks are in `tests/service/server/process-work-surface-api.test.ts:321-379`, `tests/service/client/process-controls.test.ts:108-175`, `tests/service/client/process-work-surface-page.test.ts:364-391`; planned panel mapping is in `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:246-247`, `351-352`.
  impact: Regression protection exists, but the test-plan-to-test-file trace is looser than the written mapping suggests.

## GATE_RESULT

Command: `corepack pnpm run verify 2>&1 | tail -30`

Result: `passed`

```text
      Tests  12 passed (12)
   Start at  22:21:52
   Duration  166ms (transform 114ms, setup 0ms, import 195ms, tests 18ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  101 passed (101)
   Start at  22:21:52
   Duration  777ms (transform 1.13s, setup 0ms, import 3.08s, tests 916ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  146 passed (146)
   Start at  22:21:54
   Duration  1.15s (transform 1.27s, setup 0ms, import 2.68s, tests 636ms, environment 9.12s)
```

## WHAT_ELSE

- Add `rehydrating` to the Convex environment-state validator and cover it in `convex/processEnvironmentStates.test.ts`.
- Replace the test-store-only prerequisite-missing check with a durable-store rule, then add a regression that proves `422 PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` on the real store boundary.
- Add the planned Story 5 rebuild/reopen coverage for TC-5.4a and TC-5.4b so durable artifact/code truth is verified end to end, not only by merge semantics.
