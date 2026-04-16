# Story 2 Round-2 Compliance Review

**Reviewer:** Claude Sonnet 4.6 (fresh instance, no implementation context)  
**Base commit:** `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`  
**Gate run date:** 2026-04-15  
**Gate result:** `corepack pnpm run verify` — PASSED (9 Convex / 79 server / 130 client)

---

## VERDICT: REVISE

The tree makes real, substantive progress. AC-2.1 and AC-2.5 are strongly satisfied. The state machine, hydration planning, and client-side handling are correctly implemented. However, the story's AC-2.2 language requires that the working copy actually be hydrated — not only that a hydration plan be stored. No provider adapter (`ensureEnvironment` / `hydrateEnvironment`) is called in the current implementation. Because AC-2.3 (progress/failure emission) and AC-2.4 (not running until ready) both depend on server-side events that can only be produced once provider execution exists, those two ACs are UNRESOLVED rather than SATISFIED. The gap is well-scoped and follows naturally from the designed interfaces. REVISE, not BLOCK.

---

## AC_TC_COVERAGE

### AC-2.1: Start or resume moves surface into visible preparation state in same session

**SATISFIED**

**TC-2.1a (start enters preparation state)**  
Server: `S2-TC-2.1a` — POST `/start` returns `environment.state = preparing`. A second test verifies the state is durable and visible in the bootstrap immediately after the action.  
Client: `TC-2.6a` — environment panel shows "State: Preparing environment" after Start click without page reload.  
`applyProcessActionResponse` in `bootstrap.ts:347` confirms `environment` is patched to the store from the accepted response.  
Coverage: strong end-to-end.

**TC-2.1b (resume enters preparation state when environment work is needed)**  
Server: `S2-TC-2.1b` — POST `/resume` on both a paused process (absent environment) and a paused process with a prior `ready` environment; both return `environment.state = preparing`. The second variant also verifies `environmentId` and `lastHydratedAt` are preserved from the prior environment row, confirming the resume service reads existing state before upserting.  
Client: `TC-2.6b` and `TC-2.6c` — cover Resume from paused and interrupted states respectively; both assert environment panel shows preparing state.  
Coverage: strong.

---

### AC-2.2: Environment preparation hydrates current artifacts, current outputs, and attached current sources into the working copy before controlled work depends on them

**VIOLATED**

The hydration **plan** is correctly built and stored:

- `planHydrationWorkingSet` in `environment/hydration-planner.ts` derives `{ artifactIds, sourceAttachmentIds, outputIds }` from current material refs and process outputs. Categories with zero entries are preserved as empty arrays.
- Both start and resume services call the planner and persist the result via `setProcessHydrationPlan`.
- Plan correctness is well tested: full working sets, partial (artifacts only), partial (sources only), outputs-only, and empty sets all produce the expected plan shape.

The working copy is never actually prepared:

- No provider adapter method is called anywhere in the start or resume path. Neither `ensureEnvironment` nor `hydrateEnvironment` is invoked.
- The implementation enters `preparing` state and stores the plan, then returns. The provider-backed hydration step described in tech-design-server.md Flow 2 (`EnvSvc->>Provider: ensureEnvironment(...)` → `hydrateEnvironment(...)` → `upsert ready or failed state`) is absent.
- The story's Definition of Done says "Preparation hydrates only the process's current artifacts, current outputs, and current sources." A stored plan is not hydration.

**TC-2.2a** (current materials hydrate into environment — working copy prepared from process materials not unrelated project materials)  
The test named `TC-2.2a` in the diff asserts that output IDs appear in the stored plan. The tech-design-server.md TC mapping specifies this test should assert "adapter called with only current refs." The test does not use a provider stub and does not verify adapter invocation. Plan storage is correct; plan execution is absent.

**TC-2.2b** (partial working set hydrates without requiring full categories)  
Covered by `S2-HC-2` and `S2-HC-3` for artifacts-only and sources-only plan shapes respectively, and by `TC-2.2b` for empty-outputs case. All verify plan storage only.

---

### AC-2.3: Surface shows hydration progress and hydration failure without manual refresh

**UNRESOLVED**

The client-side live-update path is correctly implemented and tested:

- `TC-2.3a`: client test applies `environmentPreparingUpsertLiveFixture` and asserts `environment.state = preparing` in the store.
- `TC-2.3b`: client test applies `environmentFailedUpsertLiveFixture` (renamed from the prior `environmentCheckpointFailureUpsertLiveFixture`) and asserts `state: 'failed'`, `blockedReason` non-null, `lastCheckpointResult: null`. The semantics shift is correct — preparation failure has no checkpoint result.

The server-side emission path does not exist:

- The server can only emit a `failed` or `ready` environment live update after provider execution completes or errors. Because no provider call is made, the server never produces these messages organically. The client tests exercise the correct handler, but the events that trigger it can never arrive from the current server.

Coverage: client path SATISFIED; server emission path UNRESOLVED.

---

### AC-2.4: Process does not enter active running work until working set is ready or recoverable failure shown

**UNRESOLVED**

Client tests are correct and pass:

- `TC-2.4a`: applies sequential live messages `preparing → ready → running`; asserts `running` state is reached only after `ready`.
- `TC-2.4b`: applies `preparing → failed`; asserts `failed` state, never `running`.

Server test misalignment:

- `S2-TC-2.4b` is labeled for TC-2.4b but covers a different scenario: it verifies that a terminal action result (`status: completed`) does not enter `preparing`. This is a valid test but it is not TC-2.4b. TC-2.4b specifies "Given: Environment preparation fails before the working set becomes ready." A terminal action result is not a preparation failure.

Root dependency on provider execution:

- `ready` state can never be reached via the current code path. Without `hydrateEnvironment` completing, the environment remains `preparing` indefinitely. TC-2.4a's client-side scenario (preparing → ready → running) cannot be produced by the server as implemented. The client handles it correctly when the message arrives; the server cannot send it.

Coverage: client path SATISFIED; server emission path UNRESOLVED; TC-2.4b server test covers a different scenario than the spec.

---

### AC-2.5: Surface distinguishes read-only and writable attached sources

**SATISFIED**

**TC-2.5a** (writable source identifiable):  
Server: `S2-TC-2.5a` — bootstrap returns `accessMode: 'read_write'` in `materials.currentSources` when source attachment has `read_write`. Full response shape verified including `sourceAttachmentId`, `displayName`, `purpose`, `targetRef`, `hydrationState`, `updatedAt`.  
Client: `process-materials-section.test.ts` — writable label visible.

**TC-2.5b** (read-only source identifiable):  
Server: `S2-TC-2.5b` — bootstrap returns `accessMode: 'read_only'` for a read-only attachment with `attachmentScope: 'project'` and `processId: null`. Correct handling of project-scoped sources.  
Client: `process-materials-section.test.ts` — read-only label visible.

---

## TEST_DIFF_AUDIT

### `tests/service/server/process-actions-api.test.ts`

Added 10+ new tests. All new server tests pass.

Additions:
- `S2-TC-2.1a` (×2): start returns `preparing`; bootstrap reflects it durably after action.
- `S2-TC-2.1b` (×2): resume returns `preparing`; prior environment context preserved.
- `S2-TC-2.4b`: terminal action result → no preparation state. Covers a valid behavior but not the TC-2.4b spec scenario.
- `S2-HC-1`, `S2-HC-2`, `S2-HC-3`: hydration plan seeded from materials; partial working sets handled.
- `TC-2.2a` (outputs in plan), `TC-2.2b` (empty outputs): plan content correct for outputs category.

Modified: "keeps resume responses aligned with the current durable environment summary" → "resume always enters environment preparing state and the response reflects it." The prior test asserted `environment.state = ready` (pre-round-2 behavior); the new test correctly asserts `environment.state = preparing` and updated disabled reasons for rehydrate/rebuild. This is the right fix.

Missing from original tech-design-server.md TC mapping: None of the new tests use a provider stub or assert that a provider adapter method was called. The original TC-2.2a spec said "adapter called with only current refs."

### `tests/service/server/process-work-surface-api.test.ts`

Added `S2-TC-2.5a` and `S2-TC-2.5b` — both new inline-store tests that construct an `InMemoryPlatformStore` with specific `sourceAttachmentsByProjectId` and `currentMaterialRefsByProcessId` data, then verify the full projected source shape in the bootstrap response. Good test construction: uses inline store rather than shared fixture to control exact source state.

### `tests/service/client/process-work-surface-page.test.ts`

Added `TC-2.6a`, `TC-2.6b`, `TC-2.6c` — cover start/resume from three initial states (draft, paused, interrupted) and assert that the environment panel shows "State: Preparing environment" after the action, without a page reload. Each also asserts "Running" is visible (the process status), confirming both process and environment state are rendered simultaneously.

Modified two existing TC-2.1a and TC-2.1b assertions that previously checked for "Running" + `nextActionLabel` in `document.body.textContent`. These now check for "State: Preparing environment." This is correct alignment with the round-2 behavior — previously the surface didn't render the environment state; now it does. The new TC-2.6 tests provide the more comprehensive version of these assertions with an explicit environment panel DOM query.

### `tests/service/client/process-live.test.ts`

Added four new tests: `TC-2.3a`, `TC-2.3b`, `TC-2.4a`, `TC-2.4b` — all new, all pass, all correctly test the live update reconciliation path.

Renamed two prior tests: `TC-2.4a` (waiting transition) → "waiting transition is reflected..."; `TC-2.4b` (completed transition) → "completed transition is reflected..."; `TC-2.3a` (progress updates appear) → "progress updates appear..."; `TC-2.3b` (new history activity) → "new history activity appears...". These were TC labels inherited from Story 1 behavior. Removal of the Story-1 TC labels is correct — those tests remain valid but they covered different semantics. The new TC-2.3a through TC-2.4b tests now hold the Story-2 TC labels appropriately.

`environmentCheckpointFailureUpsertLiveFixture` renamed to `environmentFailedUpsertLiveFixture` and the fixture semantics changed: old fixture had a failed checkpoint result inside a failed environment; new fixture has `blockedReason: 'Preparation failed...'` and `lastCheckpointResult: null`. This is correct for AC-2.3b (preparation failure, not checkpoint failure). The old fixture scenario (environment failure with a prior checkpoint result intact) is no longer explicitly covered — this is a minor gap, not a blocker, since AC-2.3b is about preparation failure.

### `tests/service/server/auth-routes.test.ts` and `tests/service/server/processes-api.test.ts`

Both updated to implement `upsertProcessEnvironmentState`, `getProcessHydrationPlan`, and `setProcessHydrationPlan` stubs on their inline `PlatformStore` implementations. These are compliance stubs required because the `PlatformStore` interface now includes these methods. The implementations are minimal (return the input or null). No new test coverage introduced; these are interface alignment changes.

---

## TEST_QUALITY_FINDINGS

**TF-1 (nonblocking):** The tests named `TC-2.2a` and `TC-2.2b` in the diff verify hydration plan storage. The tech-design-server.md TC mapping specifies they should verify "adapter called with only current refs." This is not a test quality flaw given the current implementation state — the adapter doesn't exist yet — but the TC label implies coverage that is not yet present. When provider execution is added, these tests should be updated to use a provider stub and assert adapter invocation.

**TF-2 (nonblocking):** `S2-TC-2.4b` covers a scenario (terminal action result skips preparation) that is valuable but does not match TC-2.4b's spec ("preparation fails before working set becomes ready"). The test should be renamed to avoid TC label misalignment. When provider execution is added, a proper TC-2.4b test should be added that triggers a preparation failure through the provider stub.

**TF-3 (nonblocking):** The client tests for TC-2.3a, TC-2.3b, TC-2.4a, TC-2.4b are implemented at the `applyLiveProcessMessage` layer, testing the pure state function. This is correct and sufficient for the client contract. They do not require server integration to be valuable. When provider execution is added, server-side live-update tests should be added to verify the server produces these messages.

**TF-4 (nonblocking):** The `environmentFailedUpsertLiveFixture` (formerly `environmentCheckpointFailureUpsertLiveFixture`) now represents a preparation failure with no checkpoint result. The prior scenario — environment entering `failed` state while preserving a prior `lastCheckpointResult` — is no longer covered by any fixture or test. This edge case (environment fails after a successful checkpoint has already been stored) may be worth a separate fixture/test at some point.

---

## MOCK_AUDIT_FINDINGS

**MA-1 (nonblocking):** The new process-actions-api tests for hydration plan coverage do not use a provider stub. They test plan storage (via `platformStore.getProcessHydrationPlan`) rather than plan execution (via provider adapter mock). This is consistent with the current implementation but means no test verifies the server would call a provider with the correct plan. Provider adapter mocking is listed in the tech design's mock boundary plan; it is not yet needed since no adapter exists, but the absence should be noted for the next implementation slice.

**MA-2 (nonblocking):** The `InMemoryPlatformStore` used in process-work-surface-api tests for AC-2.5 constructs source attachments with `processId: null` for project-scoped sources. This correctly exercises a case that differs from the standard fixture (which uses process-scoped sources). The inline construction makes the test self-documenting. No mock boundary concerns.

---

## COMPLETENESS_GAPS

**CG-1 (BLOCKING):** Provider-backed hydration execution. After persisting the hydration plan and entering `preparing` state, the server must call `ensureEnvironment` and `hydrateEnvironment` (or delegate to the orchestrator) to form an actual working copy. Without this, `ready` and `failed` environment states can never be reached organically. AC-2.2 requires a working copy. AC-2.3 requires server-emitted progress/failure. AC-2.4 requires `ready` to be reachable.

Even a stub/fake provider (already described in the test plan as `tests/utils/fake-provider-adapter.ts`) would satisfy this requirement for the test layer. The interface definitions in `provider-adapter.ts` are already in place. The gap is the orchestration call from start/resume services (or `ProcessEnvironmentService`) through to a provider adapter.

**CG-2 (nonblocking):** Server-side tests for AC-2.3 and AC-2.4. Once provider execution exists, server tests should verify: (a) provider hydration success causes `ready` environment state and a live update, (b) provider hydration failure causes `failed` environment state and a live update with `blockedReason`. These are the server counterparts to the client-only `process-live.test.ts` tests.

**CG-3 (nonblocking):** `process-live-updates.test.ts` is not in the current diff. The test plan names it as a primary file for TC-2.3a, TC-2.3b, TC-2.4a, TC-2.4b at the server layer. The current tree covers those TCs only from the client perspective.

---

## BLOCKING_FINDINGS

**BF-1:** Provider-backed hydration execution is absent. The story's AC-2.2 says "hydrates the process's current artifacts, current outputs, and already-attached current sources into the working copy before controlled work depends on them." The working copy is never prepared. This is not satisfied by storing the plan. AC-2.3 and AC-2.4 become UNRESOLVED as a direct consequence — the server cannot emit `ready`, `failed`, or intermediate progress states without executing hydration.

Required to move to PASS: wire the start/resume services (or a `ProcessEnvironmentService` facade) to call a provider adapter after persisting the `preparing` state. The call should use the stored hydration plan and update environment state to `ready` on success or `failed` on error. A `FakeProviderAdapter` stub is sufficient for the test layer; the interface is already defined.

---

## NONBLOCKING_WARNINGS

**NW-1:** `S2-TC-2.4b` is labeled with the TC-2.4b identifier but covers terminal action result (not preparation failure). Rename it before PASS to avoid auditing confusion. When BF-1 is resolved, add a genuine TC-2.4b test using a provider stub that errors during hydration.

**NW-2:** The renamed `environmentFailedUpsertLiveFixture` now represents a pure preparation failure (no checkpoint result). The scenario of environment failure after a prior checkpoint result is no longer fixture-covered. Consider adding a `environmentFailedWithCheckpointUpsertLiveFixture` when checkpoint functionality is implemented.

**NW-3:** Tests named `TC-2.2a` and `TC-2.2b` in the diff test plan storage, not adapter invocation. Update these to use a provider stub and assert adapter call when BF-1 is resolved, or rename them to avoid the TC label mismatch.

**NW-4:** `tech-design-server.md` was modified during implementation. The round-2 bundle flags this as a risk item. From the visible artifacts, the modification adds the `statusLabel` field to the `WorkingSetPlan` type area and documents the hydration-plan storage design. This reads as legitimate design-and-implementation alignment, not scope drift. However, the specific changes were not diffed in this review. If the modifications altered the provider contract interfaces or acceptance semantics, that should be verified separately.

---

## UNRESOLVED

**UR-1:** Whether a `FakeProviderAdapter` already exists or needs to be created. The test plan specifies it at `tests/utils/fake-provider-adapter.ts`. If it does not exist, it needs to be created alongside BF-1.

**UR-2:** Whether the `ProcessEnvironmentService` facade is intended to own the post-acceptance async execution (prepare → ensure → hydrate → update state → publish live), or whether the start/resume services should call the orchestrator directly. The tech design describes both a `ProcessEnvironmentService` and an `environment-orchestrator.ts`. The current implementation in start.service.ts and resume.service.ts calls the store directly. When BF-1 is addressed, the call site should match the intended layering.

---

## GATE_RESULT

```
corepack pnpm run verify

Convex tests:  9 / 9  PASS
Server tests: 79 / 79  PASS
Client tests: 130 / 130  PASS
TypeScript:   PASS
Build:        PASS
```

Gate passes. All 218 tests pass. TypeScript and build are clean.

The gate passes on a correct but incomplete tree. The passing tests are real — they test meaningful behavior at the state-machine, planning, and client-reconciliation layers. The gap (BF-1) is a missing execution layer, not a broken existing layer.

---

## What else was noticed but not reported above

**Observation 1 — `requiresEnvironmentPreparation` coupling:** Both start and resume services use a local `requiresEnvironmentPreparation(status)` function that returns `true` for `running | waiting`. If a future process module returns a different running-adjacent status (e.g., `checkpointing`), the function would silently skip preparation. The function is small and easy to miss; it may need to be expanded as more states are introduced.

**Observation 2 — Resume preserves `environmentId` and `lastHydratedAt` but not `workingSetFingerprint`:** The resume service reads existing environment state and forwards `environmentId` and `lastHydratedAt` into the `preparing` upsert, which is correct. However, the `workingSetFingerprint` from the prior environment record is not forwarded. When provider execution is added, the orchestrator will need access to the prior fingerprint to decide whether `rehydrate` or a full re-prepare is needed on the next recovery path. This is not a current-story issue since provider execution doesn't exist yet, but the existing upsert call will need `workingSetFingerprint` forwarded to avoid losing it on resume.

**Observation 3 — `listProcessOutputs` called inside start/resume services:** The start and resume services call `platformStore.listProcessOutputs` directly to collect output IDs for the hydration plan. This couples the start/resume services to the outputs table in a way that bypasses any existing outputs reader abstraction. When the hydration planning is moved to an orchestrator or environment service, this call should be colocated with the material-refs read rather than sitting inline in the action service.

**Observation 4 — TC-2.6 labels are new and don't exist in the story or test plan:** The three new client page tests are labeled `TC-2.6a/b/c`. The story only has TC-2.1a through TC-2.5b. These tests are substantively correct and provide good environment panel DOM-targeted assertions. The label issue (TC-2.6 doesn't exist in the spec) should be corrected to `TC-2.1a`, `TC-2.1b` (×2 variants) or to a non-TC label, to avoid creating phantom TC references in future reviews.

**Observation 5 — `process-materials-section.test.ts` has 3 tests, test plan specifies 4:** The test plan specifies 4 tests for this file: TC-2.5a, TC-2.5b, TC-4.3a, plus one non-TC decided ("mixed writable and read-only sources remain individually labeled"). The round-2 bundle reports 3 passing tests. TC-4.3a (read-only source does not present a code-checkpoint path) is listed in the test plan but is a Story 4 AC, so its absence in the Story 2 implementation is expected. However the non-TC decided mixed-source label test is not present either. Minor gap, not a blocker for Story 2.
