# Story 2 Verification — Sonnet B Round 3

**Verifier:** Claude Sonnet 4.6 (Verifier B, independent session)
**Story:** `02-start-or-resume-with-environment-preparation`
**Base commit:** `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`
**Gate command:** `corepack pnpm run verify`
**Date:** 2026-04-15

---

## VERDICT: BLOCK

---

## GATE_RESULT

Command: `corepack pnpm run verify`

Result: **FAILED** — two distinct failure categories observed:

1. **Format check** fails on `apps/platform/server/services/projects/platform-store.ts:1518` — a 120-character ternary line that Biome requires be split across two lines. Exit code 1 in `red-verify`.

2. **Test failures** — 2 tests fail in `tests/service/server/process-actions-api.test.ts`:
   - `TC-2.1c resumes an interrupted process — response shows preparing state, bootstrap shows running after hydration`: asserts `availableActions: []` but receives `['review']`.
   - `S2-TC-2.1b: resume returns environment.state = preparing when environment work is required`: asserts `process.status: 'running'` but receives `'paused'`.

Other tiers pass independently: `test:convex` passes (9/9), `test:client` passes (130/130).

---

## AC_TC_COVERAGE

| AC / TC | Verdict | Evidence |
|---------|---------|----------|
| **AC-2.1** Start/resume enters visible preparation in the same session | SATISFIED (server path), VIOLATED (2 tests broken) | See TC-2.1a/b details below |
| TC-2.1a start enters preparation state | SATISFIED (correct logic observed) but **1 related test broken** | `S2-TC-2.1a` (line 806) asserts `status:'draft'` and `environment.state:'preparing'` — correct. The older `TC-2.1a and TC-2.5a` test changed to assert `status:'draft'` + `availableActions:[]` — also correct for start. The "bootstrap shows ready" follow-up test (line 835) correctly verifies `InMemoryProviderAdapter` resolves via microtask. SATISFIED for the start path. |
| TC-2.1b resume enters preparation when environment work is needed | VIOLATED | `S2-TC-2.1b` (line 870) asserts `process.status:'running'` on the resume response — but `InMemoryPlatformStore.acceptProcessForPreparation()` preserves `status:'paused'` (it spreads `...existing` without changing status). Test fails with `'paused' !== 'running'`. This is an incorrect assertion in the test, not a production-code defect — but the gate is broken. |
| **AC-2.2** Hydration uses current materials | SATISFIED | `start`/`resume` call `listProcessOutputs` and build a `WorkingSetPlan` with `artifactIds`, `sourceAttachmentIds`, `outputIds` before calling `runHydrationAsync`. TC-2.2a and TC-2.2b covered by `S2-HC-1`, `S2-HC-2`, `S2-HC-3`, `TC-2.2a` (line 1028), `TC-2.2b` (line ~1060). `outputIds` present — round-2 blocker B4 closed. |
| TC-2.2a current materials hydrate | SATISFIED | `process-actions-api.test.ts` line ~1028 seeds `processOutputsByProcessId` and verifies `plan.outputIds`. |
| TC-2.2b partial working set | SATISFIED | `S2-HC-2` and `S2-HC-3` cover artifacts-only and sources-only variants. |
| **AC-2.3** Hydration progress and failure visible live | SATISFIED | Two new integration-style tests in `process-live-updates.test.ts` use `FailingProviderAdapter` and WebSocket to verify live `environment.state = 'preparing'` then `'ready'` and `'failed'` transitions. |
| TC-2.3a hydration progress visible | SATISFIED | Client live test `TC-2.3a hydration progress becomes visible through environment live updates` applies `environmentPreparingUpsertLiveFixture` and asserts `state:'preparing'`. Server path verified by `process-live-updates.test.ts` new describe block (line ~357). |
| TC-2.3b hydration failure visible | SATISFIED | Client live test `TC-2.3b hydration failure becomes visible` applies `environmentFailedUpsertLiveFixture`. Server path: `start with a failing provider drives preparing then failed environment state`. |
| **AC-2.4** Running does not begin before readiness | SATISFIED (logic), VIOLATED (1 test broken) | See TC-2.1c below. |
| TC-2.4a running begins after readiness | SATISFIED | Client live test `TC-2.4a running begins after readiness` verifies `preparing → ready → running` sequence. Server test verifies live `ready` message after `InMemoryProviderAdapter` resolves. |
| TC-2.4b running does not begin after failed preparation | SATISFIED | `S2-TC-2.4b` (line ~950) verifies no `running` when `start` result is terminal. Client live test `TC-2.4b running does not begin after failed preparation` verifies `failed` never becomes `running`. |
| TC-2.1c (border case of AC-2.1) | VIOLATED | Test `TC-2.1c resumes an interrupted process` was updated to assert `availableActions: []` — but `interruptedProcessSummary` has `availableActions: ['review']` in its fixture, and `acceptProcessForPreparation` preserves that from `...existing`. Test fails: expected `[]` received `['review']`. This is a wrong test assertion (implementer error). |
| **AC-2.5** Source access mode visible | SATISFIED | `sourceAttachments` schema has `accessMode`, `process-work-surface-api.test.ts` adds `S2-TC-2.5a` and `S2-TC-2.5b`. Client `process-materials-section.test.ts` (new) covers the render path. |
| TC-2.5a writable source identifiable | SATISFIED | `S2-TC-2.5a` at `process-work-surface-api.test.ts` (line ~1080). |
| TC-2.5b read-only source identifiable | SATISFIED | `S2-TC-2.5b` at `process-work-surface-api.test.ts` (line ~1130). |

---

## ROUND_2_BLOCKER_STATUS

### Blocker 1: Server-driven preparation path exists

**CLOSED — CONFIRMED.**

- `ProcessEnvironmentService.runHydrationAsync()` is called fire-and-forget from `process-start.service.ts:67` and `process-resume.service.ts:68` after the `preparing` state is written.
- `executeHydration()` calls `providerAdapter.hydrateEnvironment()`, then writes `state:'ready'` with `lastHydratedAt` and `environmentId` (success) or `state:'failed'` with `blockedReason` (failure).
- `transitionProcessToRunning()` is called only on the success path (line 54 of `process-environment.service.ts`), so running is gated on readiness.
- Live publication happens in both paths.

### Blocker 2: No path where `process.status = running` before `environment.state = ready`

**CLOSED — CONFIRMED.**

- `transitionProcessToRunning()` is called only inside the `if (hydratedEnvironment !== null)` branch of `executeHydration()` (line 53). The `hydratedEnvironment` variable is only non-null when the `upsertProcessEnvironmentState` with `state:'ready'` succeeds. The failure path does not call `transitionProcessToRunning()`.

### Blocker 3: Live publication includes environment-aware `process` payload

**CLOSED — CONFIRMED.**

- On hydration success (line 57-65 of `process-environment.service.ts`), `processLiveHub.publish` includes both `process: buildProcessSurfaceSummary(transitionResult.process, hydratedEnvironment)` and `environment: hydratedEnvironment`. The `process` is built from the transitioned running result with the hydrated environment, so it is environment-aware.

### Blocker 4: Hydration plan includes `outputIds`

**CLOSED — CONFIRMED.**

- `HydrationWorkingSetInput extends CurrentProcessMaterialRefs` and adds `outputIds: string[]`.
- `planHydrationWorkingSet()` returns `{ artifactIds, sourceAttachmentIds, outputIds }`.
- Both `process-start.service.ts` and `process-resume.service.ts` call `listProcessOutputs()` and map `o.outputId` into the plan.
- `WorkingSetPlan` interface in `platform-store.ts` (line 68-72) includes `outputIds: string[]`.
- The `process-actions-api.test.ts` test `TC-2.2a: start seeds hydration plan with output ids when outputs are present` explicitly verifies this.

---

## TDD_INTEGRITY

### Test-to-TC traceability

The following Story 2 TCs are covered by traceable named tests:

| TC | Covered by | Location |
|----|-----------|----------|
| TC-2.1a | `S2-TC-2.1a: start returns environment.state = preparing` | `process-actions-api.test.ts:806` |
| TC-2.1b | `S2-TC-2.1b: resume returns environment.state = preparing` | `process-actions-api.test.ts:870` (FAILING) |
| TC-2.2a | `TC-2.2a: start seeds hydration plan with output ids` | `process-actions-api.test.ts:1028` |
| TC-2.2b | `TC-2.2b: resume seeds hydration plan with empty outputIds` | `process-actions-api.test.ts:~1060` |
| TC-2.3a | `TC-2.3a hydration progress becomes visible` (client) + server live test | `process-live.test.ts`, `process-live-updates.test.ts` |
| TC-2.3b | `TC-2.3b hydration failure becomes visible` (client) + server live test | `process-live.test.ts`, `process-live-updates.test.ts` |
| TC-2.4a | `TC-2.4a running begins after readiness` | `process-live.test.ts` |
| TC-2.4b | `TC-2.4b running does not begin after failed preparation` | `process-live.test.ts`, `process-actions-api.test.ts` |
| TC-2.5a | `S2-TC-2.5a: bootstrap exposes read_write accessMode` | `process-work-surface-api.test.ts` |
| TC-2.5b | `S2-TC-2.5b: bootstrap exposes read_only accessMode` | `process-work-surface-api.test.ts` |

### Test-diff categorization (against `326d8c9`)

| File | Category | Notes |
|------|----------|-------|
| `tests/fixtures/live-process.ts` | Legitimate coverage extension | Adds `environmentFailedUpsertLiveFixture` needed for new TC-2.3b test. Also adds `environmentReadyUpsertLiveFixture` and `environmentRunningUpsertLiveFixture` (referenced in `process-live.test.ts`). |
| `tests/fixtures/process-surface.ts` | Legitimate correction | Adds `environment: preparingEnvironmentFixture` to start/resume response fixtures. These were missing from the contract shape and caused test parsing to fail or silently drop the field. |
| `tests/service/client/process-live.test.ts` | Legitimate coverage + label correction | Renames `TC-2.4a` and `TC-2.4b` (which were pre-Story 2 tests about process transitions) to non-TC labels to avoid colliding with the new Story 2 TC-2.4a/2.4b. Adds new TC-named tests for Story 2. Correct. |
| `tests/service/client/process-materials-section.test.ts` | New, legitimate | New file covering TC-2.5a, TC-2.5b, TC-4.3a (pre-scope but foundational). |
| `tests/service/client/process-work-surface-page.test.ts` | Legitimate correction + additional coverage | TC-2.1a/TC-2.1b page-level assertions updated from `'Running'` to `'Preparing environment'` — correct given new `preparing` semantics. TC-2.6a/2.6b/2.6c added (not labeled in spec's TC-2.x series but are non-TC decided tests for environment panel visibility). |
| `tests/service/server/auth-routes.test.ts` | Interface compliance | Adds `transitionProcessToRunning`, `upsertProcessEnvironmentState`, `getProcessHydrationPlan`, `setProcessHydrationPlan` stubs to the inline `PlatformStore` mock so it continues satisfying the interface. Legitimate maintenance. |
| `tests/service/server/process-actions-api.test.ts` | Mixed — see BLOCKING_FINDINGS | Largely legitimate new TC-mapped tests (S2-TC-2.1a, S2-TC-2.1b, S2-HC-1, S2-TC-2.4b, S2-TC-2.2a, S2-TC-2.2b, S2-HC-2, S2-HC-3). Two broken assertions introduced: `S2-TC-2.1b` asserts `status:'running'` when `'paused'` is correct; `TC-2.1c` asserts `availableActions:[]` when `['review']` is present. |
| `tests/service/server/process-live-updates.test.ts` | Legitimate new coverage | New `describe('server-driven environment preparation')` block with two WebSocket integration tests covering the live preparation/failure path. |
| `tests/service/server/process-work-surface-api.test.ts` | Legitimate new coverage | Adds `S2-TC-2.5a` and `S2-TC-2.5b` for bootstrap source access-mode projection. |
| `tests/service/server/processes-api.test.ts` | Interface compliance | Adds `transitionProcessToRunning`, `upsertProcessEnvironmentState`, `getProcessHydrationPlan`, `setProcessHydrationPlan` to `RecordingPlatformStore`. Legitimate. |

### TC-2.1a bootstrap assertion change (the specific item from round-3 bundle)

The bundle explicitly flags: "the follow-up GET-bootstrap asserts `state:'ready'` instead of `state:'preparing'`."

**Verdict: LEGITIMATE TIMING-AWARE CORRECTION.**

Evidence:
- `InMemoryProviderAdapter.hydrateEnvironment()` is `async` and resolves immediately via a microtask (no await on real I/O).
- `ProcessEnvironmentService.runHydrationAsync()` launches `void this.executeHydration(args)` — a fire-and-forget microtask.
- By the time a subsequent synchronous-looking `app.inject()` runs in the test, the Node.js event loop has already drained the microtask queue, so `executeHydration` has completed and written `state:'ready'` to `InMemoryPlatformStore`.
- The test correctly separates the two assertions: the POST response asserts `state:'preparing'` (AC-2.1 — same session), and the GET bootstrap asserts `state:'ready'` (state after hydration completes).
- This is not weakening. The previous assertion of `state:'preparing'` on the follow-up GET was incorrect because the in-memory adapter completes synchronously before the second `app.inject()` is processed.

### Assertion weakening assessment

No assertion weakening found beyond the two broken assertions — which are wrong assertions that fail the gate, not weakened ones that pass incorrectly.

---

## ARCHITECTURE_FINDINGS

### Module boundaries match tech-design-server.md

OBSERVED: Three new files exist under `apps/platform/server/services/processes/environment/`:
- `process-environment.service.ts` — matches spec
- `hydration-planner.ts` — matches spec
- `provider-adapter.ts` — matches spec (contains both `ProviderAdapter` interface and `InMemoryProviderAdapter` + `FailingProviderAdapter`)

OBSERVATION: The spec's module architecture lists more environment files (`environment-orchestrator.ts`, `provider-adapter-registry.ts`, `local-provider-adapter.ts`, `checkpoint-planner.ts`, `script-execution.service.ts`). These are NOT present in the Story 2 working tree. This is correct — Story 2 scope is preparation and hydration; the remaining modules belong to Stories 3-5.

OBSERVATION: `ProviderAdapter` interface is narrower than the spec's `EnvironmentProviderAdapter` — it exposes only `hydrateEnvironment()`. This is appropriate for Story 2 which only covers hydration. The interface will expand in later stories. No architecture violation for Story 2.

### `providerKind: null` in upsert calls

OBSERVATION: Both `process-start.service.ts:43` and `process-resume.service.ts:49` pass `providerKind: null` to `upsertProcessEnvironmentState`. The spec (tech-design-server.md §Provider Selection Policy) requires `providerKind` to be durable and derived from config or existing state. The current implementation defers provider selection to the adapter level (the `InMemoryProviderAdapter` doesn't expose a `providerKind` property). This is a design gap: the durable environment state will have `providerKind: null` after a start/resume action.

SEVERITY: MINOR for Story 2 (the `InMemoryProviderAdapter` is not a real provider). This becomes MAJOR in Story 3 when a real Daytona adapter needs to set `providerKind: 'daytona'`. Worth flagging now.

### `requiresEnvironmentPreparation` logic

OBSERVATION: The function in both start and resume services returns `true` for `status !== 'completed' && status !== 'failed' && status !== 'waiting'`. This means a `draft` process → preparation (correct), a `paused` process → preparation (correct), but also a `running` process → preparation (potentially incorrect if start is called on a running process, but start has an earlier guard for `status !== 'draft'` that prevents this). Resume checks `status === 'paused' || status === 'interrupted'` first, so the `requiresEnvironmentPreparation` will only see `paused` or `interrupted` statuses from resume. Logic is sound.

---

## MOCK_AUDIT_FINDINGS

### `InMemoryProviderAdapter`

CONSISTENT with test plan mock strategy:
- Implements `ProviderAdapter` interface exactly
- Returns deterministic `environmentId: env-mem-${processId}` — predictable for assertions
- Returns real `new Date().toISOString()` for `lastHydratedAt`
- No external I/O
- Resolves as a microtask (Promise returned from async function) — relevant to TC-2.1a timing

### `FailingProviderAdapter`

CONSISTENT with test plan mock strategy:
- Implements `ProviderAdapter` exactly
- Throws a configurable `Error` (not a custom AppError, which is correct — the outer service catches `Error`)
- Constructor accepts a custom reason string, useful for assertion targeting (verified in `process-live-updates.test.ts`)
- Used in two new server live tests to drive the `failed` path

Both adapters are the only new external-boundary fakes. They sit correctly at the provider boundary per the test plan's "Mock these: provider adapters" rule.

---

## BOUNDARY_INVENTORY_ASSESSMENT

| Boundary | Status | Interface Shape Adequate for Later Adapters? |
|----------|--------|----------------------------------------------|
| `ProviderAdapter.hydrateEnvironment()` | Stub (InMemory) | YES for Story 2 scope. The interface takes `{ processId, plan: WorkingSetPlan }` and returns `{ environmentId, lastHydratedAt }`. The `WorkingSetPlan` is rich enough (artifactIds, sourceAttachmentIds, outputIds) for real Daytona implementation. However the spec's full `EnvironmentProviderAdapter` interface (tech-design-server.md) also requires `ensureEnvironment`, `executeScript`, `rehydrateEnvironment`, `rebuildEnvironment`, `teardownEnvironment`. These are not yet in `provider-adapter.ts`. This is correct for Story 2 but the file will need expanding. |
| `DaytonaProviderAdapter` | Not started | Expected — Story 2 boundary is InMemory only |
| `LocalProviderAdapter` | Not started | Expected |
| Canonical code checkpoint writer (GitHub) | Not started | Expected — Story 4 |

The current `ProviderAdapter` interface is intentionally narrower than the full spec interface. This is appropriate staging, not a design violation.

---

## BLOCKING_FINDINGS

### BLOCKING-1: Gate fails — format violation in `platform-store.ts`

- **finding:** `apps/platform/server/services/projects/platform-store.ts:1518` contains a 120-character ternary expression that Biome requires to be split across two lines. The `format:check` step in `red-verify` fails with exit code 1, preventing the gate from reaching the test steps.
- **severity:** CRITICAL
- **confidence:** HIGH
- **evidence:** `corepack pnpm run verify` output: `× Formatter would have printed the following content: phaseLabel: → phaseLabel:\n    existing.phaseLabel === 'Preparing environment' ? 'Working' : existing.phaseLabel,`
- **disproof_attempt:** Ran `corepack pnpm run lint` and `corepack pnpm run typecheck` separately — both pass. The violation is formatter-only.
- **impact:** The gate cannot be declared passing until this is fixed. The `verify` script requires `red-verify` to pass, and `red-verify` runs `format:check` first.
- **validation_step:** Apply `corepack pnpm exec biome format --write apps/platform/server/services/projects/platform-store.ts` and re-run `corepack pnpm run verify`.

### BLOCKING-2: Two test failures in `process-actions-api.test.ts`

- **finding A — `S2-TC-2.1b` wrong status assertion:** Test at line 870 asserts `process.status: 'running'` on the resume action response. `InMemoryPlatformStore.acceptProcessForPreparation()` preserves the existing `status` from the stored process (`'paused'` for `pausedProcessSummary`). The assertion is wrong. Correct assertion should be `status: 'paused'` (the accepted-for-preparation state preserves the original status while entering `preparing`).
- **finding B — `TC-2.1c` wrong availableActions assertion:** Test at line 311 (pre-existing TC-2.1c test) was updated to assert `availableActions: []` in the resume response for `interruptedProcessSummary`. `interruptedProcessFixture` has `availableActions: ['review']`. `acceptProcessForPreparation` does not reset `availableActions` — it only changes `phaseLabel`, `nextActionLabel`, and clears `availableActions` but only if the in-memory logic explicitly does so. Looking at `acceptProcessForPreparation` in detail: it spreads `...existing` and then sets `phaseLabel`, `nextActionLabel`, `availableActions: []`, `updatedAt`. Wait — re-reading line 1460-1465: `availableActions: []` IS set explicitly. So the actual response has `availableActions: []`. But the test failure says received `['review']`. This means the `interruptedProcessSummary` is not in the store's `processesByProjectId` — let me reconsider.

Re-examining: the test failure output shows `expected: availableActions: []`, `received: availableActions: ['review']`. This means the implementation is returning `['review']`, which is what `interruptedProcessFixture` has. Looking at `buildAuthenticatedApp()` in the test file — it seeds `interruptedProcessSummary` in the store. `acceptProcessForPreparation` searches for the processId in `processesByProjectId`. If found, it applies preparation fields including `availableActions: []`. If not found (falls through to default), it returns the fallback with `status:'draft'`. But the failure shows `status:'interrupted'` and `availableActions:['review']` — which means the test is hitting the `override` path or the store lookup isn't mutating as expected.

Actually looking again: the received has `availableActions: ['review']` and `status: 'interrupted'`. `acceptProcessForPreparation` does set `availableActions: []` explicitly. If the received has `['review']`, the process was NOT found in the store's iteration, and the fallback was NOT used (fallback returns `status:'draft'`). This means either (a) the process is found but not mutated correctly, or (b) there's a separate code path. INFERRED: The existing `TC-2.1c` test (pre-Story 2) was testing `resumeProcess` which previously called `transitionProcessToRunning`. After Story 2 changes, `resumeProcess` now calls `acceptProcessForPreparation`. But the stored `interruptedProcessSummary` has `availableActions: ['review']`. If `acceptProcessForPreparation` correctly sets `availableActions: []`, the test should pass. The fact that the test fails with `['review']` suggests the process IS found but the mutation produces `availableActions: ['review']` — wait, let me re-read `acceptProcessForPreparation`: line 1460-1465 does `const nextProcess = processSummarySchema.parse({...existing, phaseLabel: ..., nextActionLabel: ..., availableActions: [], updatedAt: now})`. This explicitly sets `availableActions: []`. If the test receives `['review']`, maybe the process store lookup is not finding the `interruptedProcessSummary`...

Actually the test output for `TC-2.1c` says: expected `availableActions: []`, received `availableActions: ['review']` with `status: 'interrupted'`. This could only happen if `acceptProcessForPreparation` is finding the process but somehow returning the original. SPECULATIVE: There might be a different `buildAuthenticatedApp` initialization for TC-2.1c that uses `resumeProcessResultsByProcessId` override. Regardless, this test fails — confirmed by gate output.

- **severity:** CRITICAL
- **confidence:** HIGH (gate failure confirmed by running tests)
- **evidence:** `tests/service/server/process-actions-api.test.ts` — `corepack pnpm run test:service` output: `2 failed | 79 passed (81)`
- **disproof_attempt:** Ran `corepack pnpm run test:client` (130 passed), `corepack pnpm run test:convex` (9 passed). The failures are isolated to `process-actions-api.test.ts`. The assertions are inconsistent with the implementation behavior. Attempted to trace why `TC-2.1c` still receives `['review']` — likely the test uses an override path or the `interruptedProcessSummary` store seeding differs.
- **impact:** `test:service` fails; the full `verify` gate cannot pass.
- **validation_step:** Fix `S2-TC-2.1b` assertion to `status: 'paused'` (not `'running'`) and investigate `TC-2.1c` to correct `availableActions` assertion or fix the seeding.

---

## NONBLOCKING_WARNINGS

### WARNING-1: `providerKind: null` stored in durable environment state

- `upsertProcessEnvironmentState` is called with `providerKind: null` in both `process-start.service.ts` and `process-resume.service.ts`. The spec (tech-design-server.md §Provider Selection Policy) specifies that `providerKind` should be durable. With `InMemoryProviderAdapter` this is a non-issue because the adapter doesn't track provider identity. But when `DaytonaProviderAdapter` is introduced in Story 3, the service layer will need to derive `providerKind` from config and pass it through. Design decision should be made before Story 3 lands.
- **severity:** MINOR (for Story 2)
- **confidence:** HIGH (OBSERVED)

### WARNING-2: `ProviderAdapter` interface is narrower than the full spec interface

- Current `provider-adapter.ts` exposes only `hydrateEnvironment()`. The tech-design-server.md spec defines `ensureEnvironment`, `executeScript`, `rehydrateEnvironment`, `rebuildEnvironment`, `teardownEnvironment` as required interface methods. These will need to be added as Stories 3-5 land. No immediate defect, but the interface file will change shape significantly.
- **severity:** MINOR (Story 2 scope is correctly limited)
- **confidence:** HIGH (OBSERVED)

### WARNING-3: `TC-2.6a/b/c` tests use non-spec TC labels

- Three new client tests at `process-work-surface-page.test.ts` are labeled `TC-2.6a`, `TC-2.6b`, `TC-2.6c`. These do not correspond to any TC defined in the story or test plan. They are non-TC decided tests (verifying environment panel content after start/resume) and should be labeled accordingly. Not a gate failure, but may cause confusion in future traceability.
- **severity:** MINOR
- **confidence:** HIGH (OBSERVED)

### WARNING-4: `S2-TC-2.1b` second instance tests `status:'running'` on resume response

- In addition to the failing test (Finding BLOCKING-2A above), a separate concern: the test name `S2-TC-2.1b: resume returns environment.state = preparing when environment work is required` asserts `process.status:'running'`. AC-2.1 requires "visible environment-preparation state in the same session" — it does not require the process to be `running`. Showing `status:'paused'` alongside `environment.state:'preparing'` is compliant with AC-2.1. The test's process status assertion is incidental and wrong.
- **severity:** MINOR (subsumed by BLOCKING-2)

---

## UNRESOLVED

### UNRESOLVED-1: Why `TC-2.1c` receives `availableActions: ['review']`

The `TC-2.1c` test failure shows `availableActions: ['review']` for the interrupted process after resume. `acceptProcessForPreparation` explicitly sets `availableActions: []`. The exact reason the test receives `['review']` is not fully traced — it may require examining the specific `buildAuthenticatedApp` configuration used by that test and whether the interrupt fixture's store seeding reaches the `acceptProcessForPreparation` branch. The test does fail definitively (confirmed by gate), but the root cause between "wrong test assertion" vs "implementation defect in this specific path" is UNRESOLVED without deeper tracing.

---

## ARCHITECTURE_FINDINGS (summary)

1. Module placement correct: three new files under `environment/` as specified.
2. `ProcessEnvironmentService` correctly wired in `app.ts` with `InMemoryProviderAdapter` as default.
3. `CreateAppOptions` exposes `providerAdapter` and `processEnvironmentService` override points — correct for test injection.
4. Fire-and-forget pattern (`runHydrationAsync` / `void this.executeHydration()`) is architecturally correct for the accepted-action boundary. The HTTP handler returns before hydration completes, then live publication delivers the outcome.
5. `buildProcessSurfaceSummary` called with the environment-aware payload in the live publication — blocker 3 confirmed closed.

---

## What else did you notice but chose not to report?

- The `app.ts` health endpoint still says `story: 'story-6-live-reconciliation-and-degradation'` — the label was not updated to Story 2. This is cosmetic and not a gate failure.
- `ProcessEnvironmentService` is not decorated onto the Fastify instance (not in `declare module 'fastify'`). It's only wired via constructor injection into start/resume services. This is fine for Story 2 since routes don't call it directly.
- The `convex/processEnvironmentStates.ts` schema has `providerKind: v.union(v.literal('daytona'), v.literal('local'), v.null())` — the `v.null()` branch was added for Story 2 to accommodate the `providerKind: null` being written. The original spec schema does not have `null` as a valid value (`v.union(v.literal('daytona'), v.literal('local'))`). This is a forward-looking accommodation but deviates from the spec. Not blocking for Story 2 but should be revisited before real providers land.
- The `process-live-updates.test.ts` new tests require a running HTTP server via `app.listen()`, which is heavier than the standard `app.inject()` pattern used elsewhere. This is intentional for WebSocket testing. The `waitFor` polling helper is used consistently. No concern.
- Two renaming moves in `process-live.test.ts` (TC-2.4a → `waiting transition is reflected...`, TC-2.3a/TC-2.3b → unlabeled) appear to be namespace collision avoidance. The original Story 1/2 test names used TC-2.x labels from an older numbering that conflicts with Story 2's AC-2 TCs. The renames are legitimate but the tracking convention is slightly inconsistent.
