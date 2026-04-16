# Story 1 Compliance Review

**Reviewer:** Claude Sonnet 4.6 (independent pass)
**Date:** 2026-04-15
**Story:** Environment State and Visible Controls
**Base commit:** `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`
**Reviewed against:** `stories/01-environment-state-and-visible-controls.md`, `tech-design*.md`, `epic.md`, `test-plan.md`, `verification-bundle.md`

---

## VERDICT: PASS

All five ACs are satisfied. All 17 TC conditions targeted by Story 1 are covered by passing tests. The acceptance gate (`corepack pnpm run verify`) passes cleanly: 9 Convex + 66 server service + 122 client service + 2 integration tests, 199 total. One named spec deviation is documented with a justified rationale. Non-blocking warnings follow below.

---

## AC_TC_COVERAGE

| AC / TC | Status | Confidence | Notes |
|---------|--------|-----------|-------|
| **AC-1.1** | SATISFIED | HIGH | Server reads durable `processEnvironmentStates` row via `EnvironmentSectionReader`; `buildProcessSurfaceSummary` includes environment in derivation |
| TC-1.1a (server) | SATISFIED | HIGH | `process-work-surface-api.test.ts`: `TC-1.1a bootstrap returns environment state on first load` — asserts `environment.state = ready` and `controls` shape |
| TC-1.1b (server) | SATISFIED | HIGH | `TC-1.1b bootstrap returns explicit absent environment state for an early process` — asserts `environment.state = absent` |
| TC-1.1a (client) | SATISFIED | HIGH | `process-work-surface-page.test.ts`: `TC-1.1a environment state is visible on first load` — asserts `[data-process-environment-panel]` contains state label |
| TC-1.1b (client) | SATISFIED | HIGH | `TC-1.1b absent environment still renders a legible state` — asserts `State: Not prepared` |
| TC-1.1c | SATISFIED | HIGH | `process-controls.test.ts`: `TC-1.1c preparing state keeps lifecycle controls visible but disabled` — asserts start/resume/rehydrate/rebuild/restart all `disabled` |
| TC-1.1d | SATISFIED | HIGH | `TC-1.1d ready state keeps recovery controls disabled` — asserts start enabled, rehydrate/rebuild disabled |
| TC-1.1e | SATISFIED | HIGH | `TC-1.1e running state disables recovery controls during active execution` |
| TC-1.1f | SATISFIED | HIGH | `TC-1.1f checkpointing state disables lifecycle controls while work settles` |
| TC-1.1g | SATISFIED | HIGH | `TC-1.1g stale state enables rehydrate and explains unavailable rebuild path` + server: `TC-1.1g bootstrap returns stale environment truth from durable state` (stale controls and bootstrap both tested) |
| TC-1.1h | SATISFIED | HIGH | `TC-1.1h lost state enables rebuild and explains disabled rehydrate path` — rebuild enabled, rehydrate disabled with reason |
| TC-1.1i | SATISFIED | MEDIUM | `TC-1.1i failed state shows only valid recovery actions` — fixture has rehydrate/rebuild/restart enabled; see COMPLETENESS_GAPS |
| TC-1.1j | SATISFIED | HIGH | `TC-1.1j rebuilding state disables lifecycle controls during rebuild` |
| TC-1.1k | SATISFIED | MEDIUM | `TC-1.1k unavailable state keeps controls visible and explains blocked environment actions` — controls not null, rehydrate disabled reason verified; see TEST_QUALITY_FINDINGS |
| **AC-1.2** | SATISFIED | HIGH | `process-controls.ts` renders from `controls` array in stable order; `buildProcessSurfaceSummary` derives from `processSurfaceControlOrder` |
| TC-1.2a | SATISFIED | HIGH | `TC-1.2a stable control set remains visible in a stable order` — asserts all 7 controls in `stableProcessControlOrderFixture` order |
| TC-1.2b | SATISFIED | HIGH | `TC-1.2b disabled controls remain visible` — asserts `rehydrate` and `rebuild` buttons rendered and disabled in ready state |
| **AC-1.3** | SATISFIED | HIGH | `resolveControlState` populates `disabledReason` strings; `process-controls.ts` renders `[data-process-control-disabled-reason]` |
| TC-1.3a | SATISFIED | HIGH | `TC-1.3a disabled reason shown for blocked environment action` — asserts rebuild reason text in stale state |
| TC-1.3b | SATISFIED | HIGH | `TC-1.3b disabled reason shown for blocked process action` — asserts start reason text in preparing state |
| **AC-1.4** | SATISFIED | HIGH | `EnvironmentSectionReader.read` goes through `PlatformStore.getProcessEnvironmentSummary`; no client-side state is assumed |
| TC-1.4a | SATISFIED | HIGH | `integration/process-work-surface.test.ts`: `TC-1.4a reload preserves environment truth from durable state` — two separate server instances with different `processEnvironmentSummariesByProcessId`; second load reflects stale, not ready |
| **AC-1.5** | SATISFIED | HIGH | `process-work-surface.service.ts` reads environment in parallel with process; section failure degrades to `unavailable` without failing the whole bootstrap |
| TC-1.5a (client) | SATISFIED | HIGH | `process-work-surface-page.test.ts`: `TC-1.5a process remains visible without environment` — lost env fixture; asserts process label, `State: Environment lost`, and materials name all visible |
| TC-1.5a (server) | SATISFIED | MEDIUM | Covered functionally by TC-1.1b test (process + materials present with absent env) and the `ThrowingEnvironmentSectionReader` test (returns 200 with process data + `unavailable` env); not named TC-1.5a. See COMPLETENESS_GAPS |

---

## TEST_DIFF_AUDIT

| File | Change Type | Verdict |
|------|-------------|---------|
| `tests/integration/process-work-surface.test.ts` | Added TC-1.4a (two-server reload test) | MATCHES claim — durable reload test via separate `InMemoryPlatformStore` instances |
| `tests/service/client/process-controls.test.ts` | New file — 13 TC tests (TC-1.1c..k, TC-1.2a/b, TC-1.3a/b) | MATCHES claim — all matrix states exercised |
| `tests/service/client/process-work-surface-page.test.ts` | Added TC-1.1a, TC-1.1b, TC-1.5a, 3 non-TC tests; renamed prior tests to align with new AC numbering | MATCHES claim — old TC-1.2a/1.3a/1.3b/1.4a renamed to align with Story 1 AC targets; new tests added |
| `tests/service/server/process-work-surface-api.test.ts` | Added TC-1.1a (renamed), TC-1.1b (renamed), TC-1.1g, `bootstrap returns latest checkpoint visibility`, `returns environment unavailable instead of collapsing` | MATCHES claim — environment bootstrap and degradation tests present |
| `tests/service/server/process-foundation-contracts.test.ts` | Updated `buildProcessSurfaceSummary` test to use `(draftProcessFixture, readyEnvironmentFixture)` signature; added stale/unavailable derivation test | MATCHES claim — derivation logic now exercises environment parameter |
| `tests/service/server/process-actions-api.test.ts` | Replaced inline `buildProcessSurfaceControls` call with `waitingProcessControlsFixture` | MINOR ALIGNMENT — deduplication not a Story 1 behavior change |
| `tests/service/server/processes-api.test.ts` | Added `getProcessEnvironmentSummary()` stub returning `defaultEnvironmentSummary` to `RecordingPlatformStore` | EXPECTED — interface extension required by new `PlatformStore` method |
| `tests/service/server/auth-routes.test.ts` | Added `getProcessEnvironmentSummary()` stub to inline mock | EXPECTED — same interface extension |
| `tests/service/client/process-live.test.ts` | Updated `availableActions` assertion to include `rehydrate` and `rebuild` for failed process | EXPECTED — contract now includes recovery actions in `availableActions` for failed state |
| `tests/fixtures/process-controls.ts` | Added 9 environment-state control fixtures | MATCHES claim |
| `tests/fixtures/process-surface.ts` | Added `readyEnvironmentProcessWorkSurfaceFixture`, `lostEnvironmentProcessWorkSurfaceFixture`, `unavailableEnvironmentProcessWorkSurfaceFixture`, `checkpointedAbsentEnvironmentProcessWorkSurfaceFixture`, `earlyProcessWorkSurfaceFixture` update | MATCHES claim |

Cross-check: verification bundle lists 22 changed files. Diff confirms all 22. No unexpected test files modified.

---

## TEST_QUALITY_FINDINGS

**TQF-1** — TC-1.1k assertion incomplete  
`process-controls.test.ts` TC-1.1k asserts: controls not null, `rehydrate` disabled reason text. It does **not** assert `start`, `resume`, `rebuild`, or `restart` are disabled. The `unavailableEnvironmentProcessControlsFixture` does mark those disabled, so the rendered HTML would have disabled buttons — but the test doesn't verify it. The spec says "all environment-changing controls are disabled." The fixture is correct; the assertion is partial.

**TQF-2** — TC-1.1d does not check `resume` state  
TC-1.1d (`ready` state) checks `start.disabled = false` and `rehydrate/rebuild disabled = true`. It does not check `resume`. In the fixture process status is draft, so `resume` should be disabled (correct behavior). The assertion leaves this unverified.

**TQF-3** — TC-1.1e does not check `start`, `resume`, `restart` are disabled  
TC-1.1e checks that `review.disabled = false` and `rehydrate/rebuild/restart.disabled = true` in `running` state. But `start` and `resume` should also be disabled in running state. The fixture has them disabled; the assertions don't check them.

**TQF-4** — Server TC-1.5a unnamed  
The server-layer TC-1.5a ("bootstrap keeps process identity and materials visible without environment") is not named as such in `process-work-surface-api.test.ts`. The behavior is covered by the TC-1.1b test (which verifies process + materials return with absent env) and the `ThrowingEnvironmentSectionReader` test (which verifies 200 + process data + unavailable env on error). Functional coverage is present; test naming doesn't match the plan.

---

## MOCK_AUDIT_FINDINGS

Mock usage is consistent with the test plan:

- External boundary mocked: `PlatformStore` is mocked via `InMemoryPlatformStore` in route/service tests — **CORRECT**
- `EnvironmentSectionReader` is NOT mocked in standard service tests; `ThrowingEnvironmentSectionReader` is a test double only for the degradation path — **CORRECT per plan**
- `fetch` and `WebSocket` not relevant to server-layer Story 1 tests — N/A
- `buildProcessSurfaceSummary` is not mocked anywhere — **CORRECT per plan**
- `createAppStore` is not mocked — **CORRECT per plan**
- `convex codegen` was not available (local backend not running); generated types come from committed `_generated/` files — acceptable for service-mock tests; the plan explicitly does not gate on Convex runtime availability

No mock boundary violations observed.

---

## COMPLETENESS_GAPS

**CG-1** — `failed` + `environmentId === null` rehydrate path not tested  
`resolveRehydrateControlState` conditionally disables rehydrate for `failed` state when `environmentId === null`. The `failedProcessControlsFixture` was built with `buildProcessSurfaceControls` directly (bypassing this check) and has rehydrate enabled. No test covers `buildProcessSurfaceSummary(failedProcess, { state: 'failed', environmentId: null })`. This is a valid derivation branch left untested.

**CG-2** — Server TC-1.5a unnamed  
Covered under TEST_QUALITY_FINDINGS TQF-4. Functional behavior verified; naming gap only.

**CG-3** — Non-TC test "control order remains stable when enabled states change across rerenders" not implemented  
The test plan lists this as a planned non-TC test in `process-controls.test.ts`. It is absent from the story 1 diff. The stable-order property is partially covered by TC-1.2a (static fixture), but the dynamic rerender case is not tested.

**CG-4** — Server TC-1.1h (lost state) not tested at API layer  
TC-1.1h is fully covered by `process-controls.test.ts`. There is no explicit server bootstrap test for `lost` environment state returning `environment.state = lost`. The stale case has TC-1.1g at the server layer; lost does not. Low severity since client-side coverage exists.

---

## BLOCKING_FINDINGS

None.

---

## NONBLOCKING_WARNINGS

**NW-1** — `providerKind` nullable deviation (MINOR / named)  
`convex/processEnvironmentStates.ts` stores `providerKind` as `v.union(v.literal('daytona'), v.literal('local'), v.null())`. The tech design spec says `v.union(v.literal('daytona'), v.literal('local'))`. The verification bundle explicitly names this as a deviation with rationale: Story 1 bootstrap does not require provider selection; forcing a non-null value would bleed Story 2 behavior in. The deviation is contained, documented, and justified. Story 2 should either fill providerKind on first write or migrate the nullable to non-null once provider selection is in scope.

**NW-2** — `convex codegen` not run against live backend  
Gate evidence shows `convex codegen` failed because the local Convex backend was not running. The service-mock test strategy deliberately doesn't require a live Convex runtime. The committed `_generated/` types are used. This is acceptable for the current test tier but means the generated type alignment is unverified at this commit. Non-gate in the current repo shape.

**NW-3** — `process-controls.test.ts` has 13 tests, not 14  
Test plan planned 14 tests for this file (13 TC + 1 non-TC). The non-TC "control order remains stable when enabled states change across rerenders" is absent. See CG-3.

**NW-4** — `process-work-surface-page.test.ts` test numbering disruption  
Prior TC labels (TC-1.2a, TC-1.3a, TC-1.3b, TC-1.4a) were reassigned in this story to map to new story-1 AC numbering. The diff is clean and all tests pass, but this reassignment breaks reverse traceability for anyone using commit-range searches on those old TC IDs. Consider noting the renaming in the story's change log.

---

## UNRESOLVED

None. All material questions can be answered from available evidence.

---

## GATE_RESULT

```
corepack pnpm run verify
  test:convex   — 3 files, 9 tests  — PASSED
  test:service  — 10 files, 66 tests — PASSED
  test:client   — 17 files, 122 tests — PASSED
  integration   — 1 file, 2 tests — PASSED
  typecheck     — PASSED (reported in gate evidence)
  biome format  — PASSED (reported in gate evidence)
```

**GATE: PASSED**

---

## Post-review: things noticed but not reported

1. **`resolveStartControlState` and `resolveResumeControlState` are asymmetric on `stale`/`failed`/`lost`**: Start says "Rehydrate the environment before starting" (when stale), but Resume says "Rehydrate the environment before resuming." These are mirror-correct, but the `failed` branch for start says "Recover the environment" while resume also says "Recover the environment" — both generic. Some consistency checking might be worth it when writing Story 5.

2. **`deriveProcessSurfaceHasEnvironment` treats `unavailable` conditionally**: If `process.hasEnvironment` is true or `environmentId !== null`, `unavailable` still returns `true`. If neither, it returns `false`. This means an unavailable environment for a process that has never had one would return `hasEnvironment: false`, which is defensible but could surprise callers expecting `unavailable` to always imply a prior environment existed.

3. **`buildProcessSurfaceSummary` fallback environment**: The function signature is `buildProcessSurfaceSummary(process, environment = fallbackEnvironmentSummary)`. The fallback is `absent`. Any caller that omits the environment arg will silently get absent-state controls. This is safe for Story 1 since the service now always passes the environment, but it's a soft trap for future callers.

4. **`convex/processEnvironmentStates.ts` exposes only a `query`, no mutations**: Story 1's scope is read-only visibility, so this is correct. But the InMemoryPlatformStore has a hand-written `upsertProcessEnvironmentSummary` used in tests that doesn't route through Convex. Stories 2–5 will need to add Convex mutations and ensure `InMemoryPlatformStore` stays in sync with the real Convex function shapes.

5. **No `convex/processEnvironmentStates.test.ts`**: The test plan lists this as a planned test file with 5 non-TC tests. It's absent from the story 1 diff and from the untracked files list. It would be Story 1 scope per the test plan's Chunk 0/1 assignment, but since `processEnvironmentStates.ts` only has a query and the service-mock tests cover the observable behavior, the absence is not blocking.
