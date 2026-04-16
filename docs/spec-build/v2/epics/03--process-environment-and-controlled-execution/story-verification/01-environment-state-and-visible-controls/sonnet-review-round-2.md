# Story 1 Verification — Round 2

**Reviewer:** Claude Sonnet 4.6 (fresh session, no prior implementation context)
**Date:** 2026-04-15
**Base commit:** `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`
**Diff scope:** All files changed since base commit, all test files

---

## VERDICT: PASS

---

## GATE_RESULT

```
corepack pnpm run verify — all tiers PASS

  Convex tests:  3 files,  9 tests — PASS
  Server tests: 10 files, 67 tests — PASS
  Client tests: 17 files, 122 tests — PASS
  Build:        server + client — PASS
  Total:        30 test files, 198 tests
```

No test failures. No build errors.

---

## AC_TC_COVERAGE

### AC-1.1: Environment state visible on first load

| TC | Description | Coverage | Status |
|----|-------------|----------|--------|
| TC-1.1a | Environment state visible on first load | `process-work-surface-api.test.ts`: "TC-1.1a bootstrap returns environment state on first load" | SATISFIED |
| TC-1.1b | No active environment renders legible state | `process-work-surface-api.test.ts`: "TC-1.1b bootstrap returns explicit absent environment state for an early process"; `process-work-surface-page.test.ts`: "TC-1.1b absent environment still renders a legible state" | SATISFIED |
| TC-1.1c | `preparing` — lifecycle controls disabled | `process-controls.test.ts`: "TC-1.1c preparing state keeps lifecycle controls visible but disabled" | SATISFIED |
| TC-1.1d | `ready` — recovery controls disabled, start/resume follow process state | `process-controls.test.ts`: "TC-1.1d ready state keeps recovery controls disabled" | SATISFIED |
| TC-1.1e | `running` — recovery controls disabled, review follows process state | `process-controls.test.ts`: "TC-1.1e running state disables recovery controls during active execution" | SATISFIED |
| TC-1.1f | `checkpointing` — lifecycle controls disabled | `process-controls.test.ts`: "TC-1.1f checkpointing state disables lifecycle controls while work settles" | SATISFIED |
| TC-1.1g | `stale` — rehydrate enabled, rebuild explained | `process-controls.test.ts`: "TC-1.1g stale state enables rehydrate and explains unavailable rebuild path"; `process-work-surface-api.test.ts`: "TC-1.1g bootstrap returns stale environment truth from durable state"; `process-foundation-contracts.test.ts`: stale recovery control derivation | SATISFIED |
| TC-1.1h | `lost` — rebuild enabled, rehydrate explained | `process-controls.test.ts`: "TC-1.1h lost state enables rebuild and explains disabled rehydrate path" | SATISFIED |
| TC-1.1i | `failed` — start/resume disabled, recovery paths enabled when valid | `process-controls.test.ts`: "TC-1.1i failed state shows only valid recovery actions" | SATISFIED |
| TC-1.1j | `rebuilding` — all lifecycle controls disabled | `process-controls.test.ts`: "TC-1.1j rebuilding state disables lifecycle controls during rebuild" | SATISFIED |
| TC-1.1k | `unavailable` — controls visible, environment actions explained | `process-controls.test.ts`: "TC-1.1k unavailable state keeps controls visible and explains blocked environment actions"; `process-work-surface-api.test.ts`: "returns environment unavailable instead of collapsing the whole surface when the environment read fails"; `process-work-surface-page.test.ts`: "renders unavailable environment state without hiding the durable process surface" | SATISFIED |

### AC-1.2: Stable visible control set

| TC | Description | Coverage | Status |
|----|-------------|----------|--------|
| TC-1.2a | Same standard control set visible in stable order | `process-controls.test.ts`: "TC-1.2a stable control set remains visible in a stable order"; `process-work-surface-page.test.ts`: "renders the stable control area from process.controls rather than hiding disabled actions" | SATISFIED |
| TC-1.2b | Disabled controls remain visible | `process-controls.test.ts`: "TC-1.2b disabled controls remain visible"; `process-work-surface-page.test.ts`: "keeps start and resume visible but disabled when neither action is available" | SATISFIED |

### AC-1.3: Disabled reason for blocked actions

| TC | Description | Coverage | Status |
|----|-------------|----------|--------|
| TC-1.3a | Disabled reason for blocked environment action | `process-controls.test.ts`: "TC-1.3a disabled reason shown for blocked environment action" — verifies rebuild reason in stale state | SATISFIED |
| TC-1.3b | Disabled reason for blocked process action | `process-controls.test.ts`: "TC-1.3b disabled reason shown for blocked process action" — verifies start reason in preparing state; `process-work-surface-page.test.ts`: verifies `data-process-control-disabled-reason="start"` in default store state | SATISFIED |

### AC-1.4: Durable state governs availability

| TC | Description | Coverage | Status |
|----|-------------|----------|--------|
| TC-1.4a | Reload preserves environment truth | `process-work-surface.test.ts` (integration): "TC-1.4a reload preserves environment truth from durable state" — two-server pattern, `ready` then `stale` bootstrap verified | SATISFIED |

### AC-1.5: Process remains visible without environment

| TC | Description | Coverage | Status |
|----|-------------|----------|--------|
| TC-1.5a | Process identity and materials visible without environment | `process-work-surface-page.test.ts`: "TC-1.5a process remains visible without environment" — lost environment state, process label + materials + environment panel all checked | SATISFIED |

**All 17 TCs: SATISFIED**

---

## TEST_DIFF_AUDIT

### New test files
- `tests/service/client/process-controls.test.ts` — 13 tests covering TC-1.1c through TC-1.1k, TC-1.2a, TC-1.2b, TC-1.3a, TC-1.3b. All labeled correctly. Controls the UI rendering layer in isolation.

### Significantly updated test files

**`tests/service/client/process-work-surface-page.test.ts`**
- Added TC-1.1a, TC-1.1b, TC-1.5a as labeled tests
- Added "renders the stable control area", "renders latest durable checkpoint context", "renders unavailable environment state" as unlabeled support tests
- Converted prior "does not render start or resume controls when neither is available" to "keeps start and resume visible but disabled" — correctly tracks spec change from hiding to stable-visible-disabled behavior
- Prior TC-1.2a and TC-1.3a/b labels were renamed; they now cover Story 1 content rather than Story 0 assertions

**`tests/service/server/process-work-surface-api.test.ts`**
- Added TC-1.1a, TC-1.1b, TC-1.1g as labeled server-side bootstrap tests
- Added unlabeled "bootstrap returns latest checkpoint visibility" and "returns environment unavailable instead of collapsing the whole surface" tests
- Added `ThrowingEnvironmentSectionReader` to exercise the `readEnvironment` catch/degrade path
- The unavailable-degradation test injects a custom `processWorkSurfaceService` directly — correct isolation approach

**`tests/service/server/process-foundation-contracts.test.ts`**
- Updated `buildProcessSurfaceSummary` test to accept `(process, environment)` signature
- Added stale/unavailable environment control derivation test
- `buildProcessSurfaceSummary` call updated from `(waitingProcessFixture)` to `(draftProcessFixture, readyEnvironmentFixture)` — now tests the canonical enabled-start path

**`tests/integration/process-work-surface.test.ts`**
- Added TC-1.4a reload durability test using two sequential server instances with different store states
- Pattern is sound: two separate `InMemoryPlatformStore` instances represent two separate server lifetimes reading from (simulated) durable state

**`tests/service/server/process-actions-api.test.ts`**
- Added "keeps resume responses aligned with the current durable environment summary" — the same-session environment fix regression test for `resume`
- Changed one fixture reference from inline `buildProcessSurfaceControls({ availableActions: ['respond'] })` to `waitingProcessControlsFixture` — reduces fixture divergence risk

**`tests/service/client/process-live.test.ts`**, **`auth-routes.test.ts`**, **`processes-api.test.ts`**
- Updated to satisfy the new `PlatformStore.getProcessEnvironmentSummary` contract — these are alignment updates, not new Story 1 coverage

---

## TEST_QUALITY_FINDINGS

**Positive findings:**

1. **TC labeling discipline.** `process-controls.test.ts` uses TC labels for all 11 environment-state matrix cases and 4 AC-1.2/1.3 cases. Every test maps directly to a story AC/TC. This is the strongest TC traceability in the codebase so far.

2. **`ThrowingEnvironmentSectionReader` pattern.** Using a reader subclass that throws unconditionally is the correct way to test the `unavailable` degradation path without mocking the service class itself. The approach stays inside the published mock boundary.

3. **`data-*` attribute selectors in UI tests.** Tests use `data-process-environment-panel`, `data-process-controls`, `data-process-control`, `data-process-control-disabled-reason`, `data-process-checkpoint-result` — all stable and spec-coupled. These will not break on CSS class renames.

4. **Two-server integration pattern for TC-1.4a.** The test simulates "reload" by closing one app instance and opening a second one against different store state. While it doesn't mutate a single store in place, it is the correct integration boundary given that `InMemoryPlatformStore` is a test double for Convex — the durable state change between reads is modeled accurately.

**Minor quality gaps (non-blocking):**

5. **No `start` or `respond` same-session alignment tests.** The `process-actions-api.test.ts` diff adds a same-session alignment test for `resume` only. The fix in `process-start.service.ts` and `process-response.service.ts` is symmetric and structurally identical, but neither has a dedicated fixture-driven test asserting that the returned process summary reflects the current durable environment. This relies on code inspection rather than test evidence for two of the three fixed services.

6. **`preparing`/`checkpointing`/`rebuilding` tests do not explicitly verify `respond` and `review` follow process state.** The story matrix says "respond and review continue to follow process state" for those environment states. The implementation is correct (respond/review are gated purely on process status, not environment state), but no test exercises a `waiting` process in `preparing` environment state to confirm `respond` stays enabled. The correct behavior is implemented; the TC coverage is partially implicit.

7. **Checkpoint context test uses fixture with a non-null `lastCheckpointResult` but no explicit TC label.** The "renders latest durable checkpoint context inside the environment panel" test is coverage for the AC-1.1 `lastCheckpointResult` field but has no TC label. Not a defect — the story's TC list does not individually label checkpoint-result rendering — but it makes audit harder.

---

## MOCK_AUDIT_FINDINGS

**Mock boundary compliance:**

- `InMemoryPlatformStore` is used as the PlatformStore seam across all service and integration tests. No Convex functions are mocked.
- `ThrowingEnvironmentSectionReader` overrides only the section reader, not the service class.
- No provider adapters are mocked (Story 1 doesn't introduce provider work — correct).
- No process action services are mocked in route tests — routes under test call real services.
- Auth session is faked via `createTestAuthSessionService` — correct boundary for the auth/session concern.

**No mock boundary violations found.**

---

## COMPLETENESS_GAPS

1. **`start` and `respond` same-session alignment tests.** Noted above. Code is fixed; test evidence is missing for two of three actions. Risk is low given the structural symmetry, but a future regression on `start` would not be caught by a dedicated test.

2. **No test for `respond`/`review` enabled in `preparing` or `checkpointing` environment state.** The matrix explicitly promises they follow process state in those conditions, but no test exercises a `waiting` or `running` process with `preparing` environment to confirm the control is still enabled. The control derivation logic is correct (respond is purely process-status-gated), but the matrix claim is only implicitly covered.

3. **TC-1.1i (`failed`) — both `rehydrate` and `rebuild` enabled simultaneously.** The `resolveRebuildControlState` returns `enabledState()` for any `failed` environment. The `resolveRehydrateControlState` returns `enabledState()` for `failed` when `environmentId !== null`. This means both are enabled when the environment has a recoverable ID, which is permitted by the spec ("become enabled only when that recovery path is valid"). The fixture reflects this. No contradiction, but the path where the environment is failed with a null environmentId (rehydrate disabled, rebuild enabled) is implicitly tested through the `lostEnvironmentProcessControlsFixture` rather than a dedicated `failed-without-environmentId` fixture. Minor coverage gap.

---

## BLOCKING_FINDINGS

None.

---

## NONBLOCKING_WARNINGS

1. **`providerKind` schema deviation is documented but not resolved.** The tech design specifies `v.union(v.literal('daytona'), v.literal('local'))` as a required non-nullable field. The implementation claims to store it as nullable until provisioned. The verification bundle documents this as an intentional deviation. Story 2 must harden this or update the tech design to reflect the nullable storage choice.

2. **`deriveProcessSurfaceAvailableActions` is now partially redundant.** `availableActions` is now derived from `controlStates` inside `buildProcessSurfaceSummary` — it's the enabled subset of controls. The standalone `deriveProcessSurfaceAvailableActions` function still exists and has the same switch logic, but is no longer called from `buildProcessSurfaceSummary`. Confirm it is genuinely unused and can be removed, or that it's being called elsewhere. Dead code in the derivation path could diverge from the control logic.

3. **Integration TC-1.4a simulates reload with two app instances rather than state mutation.** This is a reasonable test pattern and PASS-worthy, but it doesn't prove that a single Convex backend would serve the same truth on re-read after a mutation. That deeper durability guarantee is inherent in Convex's design but not tested here.

---

## SAME-SESSION ACTION-RESPONSE CONSISTENCY (PREVIOUSLY IDENTIFIED ISSUE)

**Status: CLOSED**

The prior inconsistency: `start`, `resume`, and `respond` were calling `buildProcessSurfaceSummary(result.process)` without an environment argument, which silently fell back to `fallbackEnvironmentSummary` (absent state). This made the same-session process summary always show absent-environment controls regardless of actual durable environment state.

**Fix verified in three services:**

- `process-start.service.ts:35-38` — fetches `getProcessEnvironmentSummary` after `startProcess()`, passes to `buildProcessSurfaceSummary(result.process, environment)` and live hub publish
- `process-resume.service.ts:35-38` — same pattern after `resumeProcess()`
- `process-response.service.ts:47-56` — same pattern in the idempotent existing-response path; `process-response.service.ts:68-75` — same pattern in the new response path

All three action services now pass the current durable environment summary to `buildProcessSurfaceSummary` and to the live hub publication, making the immediate HTTP response and the concurrent websocket push coherent with durable environment truth.

**Test evidence:** `process-actions-api.test.ts`: "keeps resume responses aligned with the current durable environment summary" — seeds a `readyEnvironmentFixture`, calls `POST /resume`, asserts the response process summary reflects `hasEnvironment: true` with correct `rehydrate`/`rebuild` disabled reasons. Direct test for the fixed path.

**Gap:** No equivalent test for `start` or `respond`. The fix is structurally identical across all three — the same `getProcessEnvironmentSummary` + `buildProcessSurfaceSummary` pattern — but test evidence exists only for `resume`.

---

## UNRESOLVED

None. All AC and TC from Story 1's Definition of Done are covered, the gate passes, and the same-session fix is confirmed closed.

---

## What else I noticed but chose not to escalate

1. **`buildProcessSurfaceControls` is still exported from the shared contracts.** It was previously used inline in test assertions (`buildProcessSurfaceControls({ availableActions: ['respond'] })`), which the diff replaces with `waitingProcessControlsFixture`. The export is still present and used internally by `buildProcessSurfaceSummary`. No issue — but if any consumer outside the service layer is importing it directly and passing only `availableActions`, they won't get the environment-aware `disabledReason` strings. Worth auditing in Story 2.

2. **`deriveProcessSurfaceAvailableActions` still appears in the file.** It is no longer called within `buildProcessSurfaceSummary` (which now derives available actions from the control states instead of from this function). If it is not called anywhere, it is dead code. I didn't grep the full codebase to confirm, so I flagged it as a warning rather than a finding.

3. **The `running` process state allows both `start` (disabled) and `review` (enabled) in the stable control area.** The `start` control is disabled with "Start is only available while the process is in Draft." — correct. Some UI environments might render seven controls including two that are always disabled when a process is actively running. No accessibility or UX contract specifies a maximum visible control count, but the stable-order rule means this is expected. Noted for UX review in a later story.

4. **`staleEnvironmentFixture.blockedReason` is used as an assertion value in both the API test and the integration test.** If the fixture's reason string changes, both assertions update automatically — good. But the fixture drives the assertion rather than the spec text driving the fixture. The spec says `disabledReason` should explain the unavailable option; it does not specify the exact string. The test will pass as long as the string is non-empty. Acceptable, but the value used in TC-1.3a ("Rebuild is only available after the environment is lost or unrecoverable.") is spec-level language that is not quoted from the story. If a future story changes the recommended reason string, the test would need updating.

5. **No Convex-layer test for `processEnvironmentStates` is listed in the test diff.** The tech plan referenced `convex/processEnvironmentStates.test.ts` as a planned test file. The verification bundle does not list it as a Story 1 file, and the diff does not show it. `convex/processEnvironmentStates.ts` is a new file tested only indirectly through `InMemoryPlatformStore`. This is consistent with Story 1's scope (the Convex file is used via PlatformStore, not tested in isolation), but Story 2 should add direct Convex-layer tests as the table gains real write paths.
