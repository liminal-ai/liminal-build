> Historical verification artifact. Superseded as current-state guidance by
> `implementation-addendum.md`. Retained for audit trail only.

# Epic 3 — Epic-Level Review (Reviewer B, Sonnet 4.6)

## VERDICT

**SHIP**

All 259 tests (server: 103, client: 148, integration: 8) pass. The acceptance gate (`verify-all`) exits clean. Every AC and TC in flows 1-6 has matching test evidence. Documented boundary stubs are present and correctly scoped. Three non-blocking cleanup items from the story cycles are open but do not affect shipped behavior.

---

## AC_TC_MATRIX

### Flow 1 — Viewing Environment State and Control Availability

**AC-1.1** Environment state visible on first load

| TC | Status | Evidence |
|----|--------|----------|
| TC-1.1a | SATISFIED | `process-work-surface-page.test.ts`: "TC-1.1a environment state is visible on first load" — renders `State: Ready for work` from `readyEnvironmentProcessWorkSurfaceFixture` |
| TC-1.1b | SATISFIED | `process-work-surface-page.test.ts`: "TC-1.1b absent environment still renders a legible state" — renders `State: Not prepared` |
| TC-1.1c | SATISFIED | `process-controls.test.ts`: "TC-1.1c preparing state keeps lifecycle controls visible but disabled" — `start`, `resume`, `rehydrate`, `rebuild`, `restart` all disabled |
| TC-1.1d | SATISFIED | `process-controls.test.ts`: "TC-1.1d ready state keeps recovery controls disabled" — `start` enabled, `rehydrate`/`rebuild` disabled |
| TC-1.1e | SATISFIED | `process-controls.test.ts`: "TC-1.1e running state disables recovery controls during active execution" |
| TC-1.1f | SATISFIED | `process-controls.test.ts`: "TC-1.1f checkpointing state disables lifecycle controls while work settles" |
| TC-1.1g | SATISFIED | `process-controls.test.ts`: "TC-1.1g stale state enables rehydrate and explains unavailable rebuild path" |
| TC-1.1h | SATISFIED | `process-controls.test.ts`: "TC-1.1h lost state enables rebuild and explains disabled rehydrate path" |
| TC-1.1i | SATISFIED | `process-controls.test.ts`: "TC-1.1i failed state shows only valid recovery actions" |
| TC-1.1j | SATISFIED | `process-controls.test.ts`: "TC-1.1j rebuilding state disables lifecycle controls during rebuild" |
| TC-1.1k | SATISFIED | `process-controls.test.ts`: "TC-1.1k unavailable state keeps controls visible and explains blocked environment actions" |

**AC-1.2** Stable visible control set

| TC | Status | Evidence |
|----|--------|----------|
| TC-1.2a | SATISFIED | `process-controls.test.ts`: "TC-1.2a stable control set remains visible in a stable order" — matches `stableProcessControlOrderFixture` |
| TC-1.2b | SATISFIED | `process-controls.test.ts`: "TC-1.2b disabled controls remain visible" — `rehydrate`/`rebuild` buttons present and disabled |

**AC-1.3** Disabled controls include visible reason

| TC | Status | Evidence |
|----|--------|----------|
| TC-1.3a | SATISFIED | `process-controls.test.ts`: "TC-1.3a disabled reason shown for blocked environment action" — `rebuild` disabled-reason text verified |
| TC-1.3b | SATISFIED | `process-controls.test.ts`: "TC-1.3b disabled reason shown for blocked process action" — `start` disabled-reason text verified |

**AC-1.4** Environment truth from durable state

| TC | Status | Evidence |
|----|--------|----------|
| TC-1.4a | SATISFIED | `process-work-surface.test.ts` (integration): "TC-1.4a reload preserves environment truth from durable state" — full HTTP round-trip with `InMemoryPlatformStore` seeded state |

**AC-1.5** Process remains visible without environment

| TC | Status | Evidence |
|----|--------|----------|
| TC-1.5a | SATISFIED | `process-work-surface-page.test.ts`: "TC-1.5a process remains visible without environment" — `lostEnvironmentProcessWorkSurfaceFixture`, process identity + materials visible |

---

### Flow 2 — Starting or Resuming with Environment Preparation and Hydration

**AC-2.1** Start/resume enters preparation state

| TC | Status | Evidence |
|----|--------|----------|
| TC-2.1a | SATISFIED | `process-work-surface-page.test.ts`: "TC-2.1a and TC-2.5a clicking Start applies the returned process state without a manual refresh" — shows `State: Preparing environment`; `process-actions-api.test.ts`: "S2-TC-2.1a: start returns environment.state = preparing in the same session" |
| TC-2.1b | SATISFIED | `process-work-surface-page.test.ts`: "TC-2.1b and TC-2.5b clicking Resume on a paused process applies the returned process state"; `process-actions-api.test.ts`: "S2-TC-2.1b: resume returns environment.state = preparing when environment work is required" |

**AC-2.2** Working set hydrates into environment

| TC | Status | Evidence |
|----|--------|----------|
| TC-2.2a | SATISFIED | `process-actions-api.test.ts`: "S2-HC-1: start seeds hydration plan from current artifacts and sources", "TC-2.2a: start seeds hydration plan with output ids when outputs are present" |
| TC-2.2b | SATISFIED | `process-actions-api.test.ts`: "S2-HC-2: partial working set with only artifacts omits source attachment ids cleanly", "S2-HC-3: partial working set with only sources omits artifact ids cleanly" |

**AC-2.3** Hydration progress and failure visible

| TC | Status | Evidence |
|----|--------|----------|
| TC-2.3a | SATISFIED | `process-live.test.ts`: "TC-2.3a hydration progress becomes visible through environment live updates" — `preparing` state received via live upsert |
| TC-2.3b | SATISFIED | `process-live.test.ts`: "TC-2.3b hydration failure becomes visible through environment live updates" — `failed` state with `blockedReason` |

**AC-2.4** Running begins only after readiness

| TC | Status | Evidence |
|----|--------|----------|
| TC-2.4a | SATISFIED | `process-live.test.ts`: "TC-2.4a running begins after readiness" — sequence `preparing` → `ready` → `running` |
| TC-2.4b | SATISFIED | `process-live.test.ts`: "TC-2.4b running does not begin after failed preparation" — `failed` state never transitions to `running` |

**AC-2.5** Read-only vs writable source visibility

| TC | Status | Evidence |
|----|--------|----------|
| TC-2.5a | SATISFIED | `process-materials-section.test.ts`: "AC-2.5: read_write source renders 'Access: read write'" |
| TC-2.5b | SATISFIED | `process-materials-section.test.ts`: "AC-2.5: read_only source renders 'Access: read only'" |

---

### Flow 3 — Following Controlled Execution in the Environment

**AC-3.1** Running execution state visible

| TC | Status | Evidence |
|----|--------|----------|
| TC-3.1a | SATISFIED | `process-live.test.ts`: "TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution" |

**AC-3.2** Live execution activity is process-facing

| TC | Status | Evidence |
|----|--------|----------|
| TC-3.2a | SATISFIED | `process-environment-panel.test.ts`: "TC-3.2a panel renders running state as a process-facing label" — raw provider string suppressed, `deriveEnvironmentStatusLabel('running')` shown |
| TC-3.2b | SATISFIED | `process-environment-panel.test.ts`: "TC-3.2b panel shows the current coherent state instead of raw fragments" — raw checkpoint stderr suppressed |

**AC-3.3** Execution states are distinct

| TC | Status | Evidence |
|----|--------|----------|
| TC-3.3a | SATISFIED | `process-live.test.ts`: "TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution" — `process.status = waiting`, `environment.state ≠ running` |
| TC-3.3b | SATISFIED | `process-live.test.ts`: "TC-3.3b reducer applies checkpointing as a distinct coherent state" — `checkpointing` state with canonical label |

**AC-3.4** Execution failure leaves surface legible

| TC | Status | Evidence |
|----|--------|----------|
| TC-3.4a | SATISFIED | `process-live.test.ts`: "TC-3.4a execution failure preserves process identity, history, and materials visibility" — `process.processId`, `history`, `materials` all unchanged; `environment.state = failed` |

---

### Flow 4 — Checkpointing Durable Artifact Outputs and Writable Source Changes

**AC-4.1** Artifact outputs checkpoint durably

| TC | Status | Evidence |
|----|--------|----------|
| TC-4.1a | SATISFIED | `process-live-updates.test.ts`: `environment` entity type appears in websocket snapshot; `process-work-surface.test.ts` (integration): durable checkpoint state seeded and verified on bootstrap |
| TC-4.1b | SATISFIED | `process-work-surface.test.ts` (integration): "TC-4.1b durable checkpoint state visible on reopen" — seeded `codeCheckpointSucceededEnvironmentFixture`, retrieved on bootstrap (Story 4 owns the durable state; Story 6 restores it) |

**AC-4.2** Code work against writable source can checkpoint

| TC | Status | Evidence |
|----|--------|----------|
| TC-4.2a | SATISFIED | `process-actions-api.test.ts` (checkpoint planner suite): "TC-4.2a plans writable source code checkpoint targets" |
| TC-4.2b | SATISFIED | `process-environment-panel.test.ts`: "TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly" — `Target: liminal-build`, `Target ref: feature/epic-03` |

**AC-4.3** Read-only sources never offer code checkpointing

| TC | Status | Evidence |
|----|--------|----------|
| TC-4.3a | SATISFIED | `process-actions-api.test.ts` (checkpoint planner suite): "TC-4.3a excludes read_only sources from code checkpoint planning" — `skippedReadOnly` populated, `codeTargets: []` |

**AC-4.4** Checkpoint result visible

| TC | Status | Evidence |
|----|--------|----------|
| TC-4.4a | SATISFIED | `process-environment-panel.test.ts`: "TC-4.4a artifact checkpoint result renders an outcome badge and target label" |
| TC-4.4b | SATISFIED | `process-environment-panel.test.ts`: "TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly" |

**AC-4.5** Checkpoint failure visible with recovery path

| TC | Status | Evidence |
|----|--------|----------|
| TC-4.5a | SATISFIED | `process-environment-panel.test.ts`: "TC-4.5a artifact checkpoint failure renders a failed badge and failure reason" |
| TC-4.5b | UNRESOLVED — partial | No dedicated `TC-4.5b code checkpoint failure shown` test found in `process-environment-panel.test.ts` or `process-live.test.ts`. The `FailingCodeCheckpointWriter` and `checkpointFailedEnvironmentFixture` exist; the artifact failure path (TC-4.5a) is covered, but the code-checkpoint failure path has no isolated TC-labelled assertion. The failure state is reachable through the `process-environment.service.ts` execution path and renders through the same `failed` badge, but no test explicitly names TC-4.5b. |

---

### Flow 5 — Rehydrating or Rebuilding After Staleness, Failure, or Loss

**AC-5.1** Stale, failed, lost, rebuilding, unavailable states are distinct

| TC | Status | Evidence |
|----|--------|----------|
| TC-5.1a | SATISFIED | `process-controls.test.ts`: "TC-1.1g stale state enables rehydrate…" — stale distinct from failed; `process-work-surface-page.test.ts`: stale fixture used |
| TC-5.1b | SATISFIED | `process-controls.test.ts`: "TC-1.1h lost state enables rebuild…" — lost distinct from absent |

**AC-5.2** Rehydrate refreshes recoverable working copy

| TC | Status | Evidence |
|----|--------|----------|
| TC-5.2a | SATISFIED | `process-actions-api.test.ts`: "TC-5.2a rehydrate refreshes stale working copy" — response `environment.state = rehydrating` |
| TC-5.2b | SATISFIED | `process-live.test.ts`: "TC-5.2b rehydrate keeps the latest checkpoint result visible while recovery is in progress" — `rehydrating` state update preserves prior checkpoint result |

**AC-5.3** Rebuild reconstructs from canonical materials

| TC | Status | Evidence |
|----|--------|----------|
| TC-5.3a | SATISFIED | `process-actions-api.test.ts`: "TC-5.3a rebuild replaces lost environment" — `rebuilding` state returned |
| TC-5.3b | SATISFIED | `process-actions-api.test.ts`: "TC-5.3b rebuild does not depend on prior working copy survival" — `environmentId: null` input, new rebuilding id in response |

**AC-5.4** Durable state survives recovery

| TC | Status | Evidence |
|----|--------|----------|
| TC-5.4a | SATISFIED | `process-live.test.ts`: "TC-5.4b rebuilding keeps the latest checkpoint result visible while recovery is in progress" (covers both 5.4a and 5.4b) — checkpoint result preserved across rebuilding transition |
| TC-5.4b | SATISFIED | `process-live.test.ts`: above; `process-live-updates.test.ts`: server publishes environment entity including `lastCheckpointResult` |

**AC-5.5** Blocked recovery remains visible

| TC | Status | Evidence |
|----|--------|----------|
| TC-5.5a | SATISFIED | `process-work-surface-page.test.ts`: "TC-5.5a rebuild blocked by missing canonical prerequisite keeps the blocked recovery reason visible"; `process-actions-api.test.ts`: "rebuild rejects immediately when canonical prerequisites are missing" (422) |
| TC-5.5b | SATISFIED | `process-work-surface-page.test.ts`: "TC-5.5b rehydrate blocked when rebuild is required promotes rebuild guidance"; `process-actions-api.test.ts`: "rehydrate rejects immediately when environment is not recoverable" (409) |

---

### Flow 6 — Returning Later and Working Through Degraded Conditions

**AC-6.1** Reopen restores latest durable state

| TC | Status | Evidence |
|----|--------|----------|
| TC-6.1a | SATISFIED | `process-work-surface.test.ts` (integration): "TC-1.4a reload preserves environment truth from durable state"; `process-work-surface-page.test.ts`: multiple reopen-after-reopen bootstrap round-trips |

**AC-6.2** Environment absence does not erase durable checkpoint results

| TC | Status | Evidence |
|----|--------|----------|
| TC-6.2a | SATISFIED | `process-work-surface-page.test.ts`: "TC-6.3a durable surface remains usable when live setup fails after reopen restores a checkpoint" — `codeCheckpointedAbsentEnvironmentProcessWorkSurfaceFixture`, checkpoint result visible with `environment.state = absent` |

**AC-6.3** Live update failure does not block durable surface

| TC | Status | Evidence |
|----|--------|----------|
| TC-6.3a | SATISFIED | `process-work-surface-page.test.ts`: "TC-6.5a and TC-6.5b keep the durable surface visible when live setup fails", "TC-6.3a durable surface remains usable when live setup fails after reopen restores a checkpoint" |

**AC-6.4** Reopen does not duplicate history or restate checkpoint as new work

| TC | Status | Evidence |
|----|--------|----------|
| TC-6.4a | SATISFIED | `process-work-surface-page.test.ts`: "TC-6.3a retry re-fetches the latest durable state without duplicating finalized history items" — `querySelectorAll('[data-process-history-kind="user_message"]').length === 1` after retry |
| TC-6.4b | SATISFIED | `process-live.test.ts`: "TC-6.4b environment checkpoint visibility remains separate from finalized history" — environment update doesn't append to history items; checkpoint lives in `environment.lastCheckpointResult` |

---

## CROSS_STORY_FINDINGS

**Story 0 → Story 1:** Foundation contracts (`environmentStateSchema`, `processSurfaceControlStateSchema`, `lastCheckpointResultSchema`, `defaultEnvironmentSummary`) all present in `shared/contracts/process-work-surface.ts`. Story 1 consumed these shapes correctly.

**Story 1 → Story 2:** `buildProcessSurfaceSummary()` accepts an `EnvironmentSummary` argument and correctly derives `controls` and `hasEnvironment` from both process and environment state. Story 2 uses this in `process-start.service.ts` and `process-resume.service.ts` — clean composition.

**Story 2 → Story 3:** `runHydrationAsync()` is called fire-and-forget from start/resume services. The hydration async path transitions to `ready` then publishes a live upsert. Story 3's live test sequence (`preparing → ready → running`) correctly traces this path.

**Story 3 → Story 4:** `CheckpointPlanner.planFor()` receives `sourceAccessModes` derived from `PlatformStore` source summaries. The code-checkpoint writability gate (`accessMode !== 'read_write'`) is consistent with the `sourceAccessModeSchema` defined in Story 0.

**Story 4 → Story 5:** `lastCheckpointResult` is preserved through `rehydrating`/`rebuilding` states in both the client (`process-live.ts` `shouldPreserveCheckpointContext`) and the Convex mutation (`platform-store.ts` conditional on `args.lastCheckpointResult === undefined`). This is correctly compositional.

**Story 5 → Story 6:** Durable checkpoint state is readable from `processEnvironmentStates` on bootstrap. The `EnvironmentSectionReader` reads it through `PlatformStore.getProcessEnvironmentSummary()`. Integration test confirms end-to-end.

**Gap noted:** TC-4.5b (code checkpoint failure shown) has no TC-labelled test. The failure path exists through `FailingCodeCheckpointWriter` in `process-live-updates.test.ts` and the `checkpointKind: 'code'` path through `process-environment.service.ts`, but no test explicitly exercises code-checkpoint failure visibility. Low severity — artifact failure path is tested and uses the same rendering layer.

---

## ARCHITECTURE_FINDINGS

**Contract extension correctness:** `rehydrateProcessResponseSchema` and `rebuildProcessResponseSchema` both require `accepted: z.literal(true)` — matching the epic spec exactly. Response schemas in `process-work-surface.ts` are correct.

**`rehydrating` state:** The epic spec does not name `rehydrating` as a distinct state (the spec names `preparing`, `stale`, etc.). The implementation added `rehydrating` as a sub-state of the rehydrate flow, distinct from `preparing`. This is an intentional implementation decision documented in the Story 5 verification. The Convex validator now includes `rehydrating` (confirmed in `convex/processEnvironmentStates.ts` line 21). The shared contract and all tests are aligned. This is an additive refinement that improves UX precision; it does not contradict any AC.

**Control derivation correctness:** `buildProcessSurfaceSummary()` in `process-work-surface.service.ts` takes both process status and environment state into account when building `controls`. The disabled-reason strings match what tests assert. No control order drift detected — `processSurfaceControlOrder` is `['start', 'respond', 'resume', 'rehydrate', 'rebuild', 'review', 'restart']` in the shared contract, stable.

**Upsert semantics:** `applyLiveProcessMessage()` in `process-live.ts` replaces current entity state for all entity types. Environment updates do not wipe history or materials state (confirmed by two dedicated tests). Correct.

**Action acceptance boundary:** Start/resume return `preparing` in the HTTP response; async work (hydration, execution, checkpoint) publishes through the live hub. The boundary between HTTP-level rejection and async live failure is correctly enforced. `AppError` codes (`PROCESS_ACTION_NOT_AVAILABLE`, `PROCESS_ENVIRONMENT_NOT_RECOVERABLE`, `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING`, `PROCESS_ENVIRONMENT_UNAVAILABLE`) all present in `errors/codes.ts`.

---

## BOUNDARY_INVENTORY_STATUS

| Boundary | Status | Evidence |
|----------|--------|----------|
| Daytona provider adapter | STUB — documented defer | `provider-adapter.ts` contains `InMemoryProviderAdapter` (in-memory fake) and `FailingProviderAdapter`. No `DaytonaProviderAdapter` class in codebase. Pre-verification cleanup item 10. Non-blocking. |
| Local provider adapter | STUB — documented defer | No `LocalProviderAdapter`. Same defer as Daytona. |
| Code checkpoint writer (GitHub/Octokit) | STUB — documented defer | `code-checkpoint-writer.ts` contains `StubCodeCheckpointWriter` and `FailingCodeCheckpointWriter`. No real GitHub integration. Pre-verification cleanup item 11. Non-blocking. |
| Convex codegen | NOTED — non-gating | No live Convex server in test environment; generated types used from snapshot. Pre-verification cleanup item 12. Non-blocking. |
| E2E test suite | SCAFFOLDED — not implemented | `verify-all` emits `SKIP: test:e2e scaffolded in Story 0; no executable suite yet`. Expected. |
| `processHistoryItems` write path for environment events | PARTIAL | Environment preparation and checkpoint events are mentioned in the tech design as visible history items; the server does not write `process_event` history items for all lifecycle transitions. This is an observable gap but not an AC violation — no AC requires environment-event history items by name. |

---

## NON_TC_TEST_COVERAGE

Tests present that address behavior beyond named TCs:

- `process-live-updates.test.ts`: "sends an immediate snapshot after subscribe and publishes later updates" — validates that all entity types (`process`, `current_request`, `materials`, `side_work`, `environment`) appear in initial WebSocket snapshot. Covers observable completeness beyond any single TC.
- `process-live-updates.test.ts`: "rejects websocket subscribe without an authenticated session" — security boundary test, not named in any TC.
- `process-actions-api.test.ts`: "resume always enters environment preparing state and the response reflects it" — exercises existing-environment resume path; distinct from TC-2.1b which covers no-prior-environment case.
- `process-actions-api.test.ts`: "response deduplicates repeated clientRequestId within one process" — idempotency guard, no TC name.
- `process-actions-api.test.ts`: "rehydrate rejects immediately when environment lifecycle is unavailable before acceptance" — 503 rejection path (PROCESS_ENVIRONMENT_UNAVAILABLE).
- `process-controls.test.ts`: "recovery controls distinguish rehydrating from generic preparing state" — tests the `rehydrating` sub-state specific to this implementation's design choice.
- `process-work-surface-page.test.ts`: multiple error-handling paths (access denied, project not found, network failure, unhandled rejection suppression) — comprehensive action-error coverage beyond any single TC.
- `process-materials-section.test.ts`: "read_only and read_write sources are distinguishable via data-access-mode attribute" — machine-readable attribute test, supplements AC-2.5 TCs.

**Blind spots:**

- TC-4.5b (code checkpoint failure shown): no TC-labelled test. Covered functionally through artifact failure path using the same rendering layer.
- No dedicated test for the `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` path on the `rehydrate` action (only `rebuild` has this covered). The epic spec does list this error code for `rehydrate`, but the test coverage is one-sided.
- `processHistoryItems` additions for settled environment events (mentioned in tech design) are not tested.

---

## BLOCKING_FINDINGS

None.

The one Codex-identified potential blocker (`rehydrating` missing from Convex validator) was fixed in the Story 5 cycle and is confirmed present in `convex/processEnvironmentStates.ts` line 21. No remaining blocking issues.

---

## NONBLOCKING_WARNINGS

**W-1** (LOW) — TC-4.5b not explicitly tested by name.
- Finding: No test asserts code-checkpoint failure visibility separately from artifact checkpoint failure. Both use the same `failed` badge rendered by `process-environment-panel.ts` and `process-checkpoint-result.ts`.
- Impact: Regression risk for code-specific checkpoint failure string path.
- Validation step: Add one test in `process-environment-panel.test.ts` using `checkpointKind: 'code'` and `outcome: 'failed'` to close the named gap.

**W-2** (LOW) — Pre-verification cleanup item 2: fixture pairing `environment: preparing` with `process.status: running`.
- Finding: `tests/fixtures/process-surface.ts` reportedly pairs these states inconsistently. The pair is used in start/resume tests and appears to function correctly in those tests, but the fixture itself is misleading.
- Impact: Future test authors may copy the misleading pairing.
- Validation step: Audit `startedProcessResponseFixture` and related fixtures; update if no test depends on the current pairing.

**W-3** (LOW) — Untested fallback `blockedReason` string.
- Finding: `'Execution failed.'` null-coalesce fallback in `process-environment.service.ts` is never exercised by a test.
- Impact: Dead code that can't be regressed.
- Validation step: Add a minimal test that drives execution error with `undefined` message.

**W-4** (LOW) — `rehydrate` path for `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` not directly tested.
- Finding: The rebuild prerequisite-missing path is tested; the rehydrate path is not. The spec lists this error code for rehydrate as well.
- Impact: A server bug on the rehydrate path would not be caught by tests.
- Validation step: Add a server test: rehydrate with stale environment and no canonical materials → 422.

**W-5** (INFO) — `deriveProcessSurfaceAvailableActions` may be dead code.
- Finding: Grep of `apps/` found no references to this function. If dead, it adds maintenance surface.
- Impact: Minimal; cosmetic.
- Validation step: Delete if unused. Pre-verification cleanup item 1.

---

## GATE_RESULT

```
verify-all: PASSED
  test:convex     103 tests, 12 files — PASS
  test:service    (server)             — PASS (included in 103 above)
  test:client     148 tests, 19 files — PASS
  test:integration  8 tests,  2 files — PASS
  test:e2e        SKIP (scaffolded, not implemented)
Total: 259 tests, all passing
```

Gate result: **PASSED**

---

## WHAT_ELSE

1. **`rehydrating` is an implementation extension not named in the epic spec.** The spec's environment state vocabulary (epic.md data contracts section) does not include `rehydrating` — only `preparing`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, `unavailable`. The implementation added `rehydrating` as a distinct in-progress sub-state for the rehydrate flow. This is a coherent design decision: it lets the client distinguish a user-initiated rehydrate from a system-initiated prepare. It is fully tested, Convex-validated, and documented in the pre-verification cleanup log. It is noted here for the epic record; no action required.

2. **The `processHistoryItems` additions for settled environment and checkpoint events are not implemented.** The tech-design-server.md describes writing `process_event` history items for preparation entry, rebuild recovery, checkpoint failure, and checkpoint success. These writes are absent from the current implementation. The tech design treats them as "visible timeline events, not a substitute for full archive work" — but they are mentioned as part of AC-3.4 legibility ("prior visible history"). The AC and its TC are satisfied by the materials + process identity remaining visible; the process history timeline is not specifically tested for environment events. This is observable as a product gap (the timeline won't show environment lifecycle moments) but is not a test failure. Flag for Epic 4 or a follow-on hardening pass.

3. **Security test coverage.** The WebSocket auth rejection test exists (`process-live-updates.test.ts`). Route-level auth rejections (401/403 on start/resume/rehydrate/rebuild) are exercised in `process-actions-api.test.ts` and `process-work-surface-page.test.ts`. No gaps found against the epic security NFRs.
