# Story 2 Compliance Review

**Reviewer:** Claude Sonnet 4.6 (fresh verifier — no implementation discussion seen)
**Date:** 2026-04-15
**Base commit:** `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`
**Spec sources read:** story, tech-design.md, tech-design-client.md, tech-design-server.md, epic.md, test-plan.md, verification-bundle.md, all changed implementation and test files

---

## VERDICT: REVISE

The gate passes cleanly and the implementation delivers real value: preparation-state entry, hydration-plan persistence, source access-mode visibility, and client live reconciliation all work and are tested. But one unresolved scope question prevents PASS:

**AC-2.2 is planning, not execution.** The story's In-scope list and DefOD both say "preparation hydrates current artifacts, current outputs, and current sources into the working copy." The test plan's TC-2.2a setup says "provider stub" and its assert says "adapter called with only current refs." The implementation stores a flat ID-array plan in PlatformStore and does not call any provider. No working copy is created. The environment stays in `preparing` indefinitely. This is the residual risk the verification bundle discloses — it requires a formal disposition before acceptance.

Secondary gaps (NONBLOCKING_WARNINGS): server-side live-publication tests for TC-2.3a/b are absent, TC-2.6* labels are undeclared in the story, and the WorkingSetPlan/HydrationPlan schema divergence accumulates technical debt for Story 3.

---

## AC_TC_COVERAGE

### AC-2.1: Start or resume enters visible environment-preparation state in the same session

**SATISFIED**

**TC-2.1a — SATISFIED**

`process-start.service.ts` calls `upsertProcessEnvironmentState(state: 'preparing')` when start produces a running/waiting process, then publishes the environment summary through the live hub. Bootstrap applies the returned `environment` immediately — no reload required.

Server tests in `process-actions-api.test.ts`:
- `S2-TC-2.1a: start returns environment.state = preparing in the same session` — verifies action response shape
- `S2-TC-2.1a: start preparation state is durable and visible in the bootstrap after the action` — verifies durability via a second GET

Client tests in `process-work-surface-page.test.ts`:
- `TC-2.1a start enters preparation state in the same session` — body text asserts "State: Preparing environment"
- `TC-2.6a shows preparing environment state in the environment panel immediately after Start` — environment panel element asserts specifically

Both layers covered. The two-call server test (action + bootstrap) is stronger than response-only coverage.

**TC-2.1b — SATISFIED**

`process-resume.service.ts` reads the existing environment state before upserting `preparing`, preserving `environmentId` and `lastHydratedAt` from the prior session.

Server tests:
- `S2-TC-2.1b: resume returns environment.state = preparing when environment work is required`
- `S2-TC-2.1b: resume preserves prior hydration context when entering preparing state` — seeds a ready environment fixture and asserts the preparing response retains `environmentId` and `lastHydratedAt`

Client tests: `TC-2.1b`, `TC-2.6b` (paused), `TC-2.6c` (interrupted).

---

### AC-2.2: Preparation hydrates current artifacts, current outputs, and attached sources into the working copy

**UNRESOLVED**

The story scope says: *"Preparation hydrates current artifacts, current outputs, and current sources into the working copy."* The DefOD repeats: *"Preparation hydrates only the process's current artifacts, current outputs, and current sources."*

**What is implemented:** A hydration-planning layer. `planHydrationWorkingSet(materialRefs)` produces `{artifactIds: string[], sourceAttachmentIds: string[]}` and stores it via `setProcessHydrationPlan`. No provider is called. No working copy is created. The environment directory contains only `hydration-planner.ts`. No `process-environment.service.ts`, `environment-orchestrator.ts`, `provider-adapter.ts`, or any execution path exists.

**TC-2.2a — UNRESOLVED**

Test plan setup: "provider stub." Test plan assert: "adapter called with only current refs."

What the test `S2-HC-1` actually asserts: `platformStore.getProcessHydrationPlan({processId})` returns `{artifactIds: ['artifact-hydration-001', 'artifact-hydration-002'], sourceAttachmentIds: ['source-hydration-001']}`. This is plan-content verification, not provider-invocation verification.

No provider stub exists. No adapter is called. The TC assertion from the test plan is unmet.

**TC-2.2b — UNRESOLVED**

`S2-HC-2` (artifacts only) and `S2-HC-3` (sources only) verify that partial plans are stored with correct empty arrays. The logic is correct. Provider invocation is still absent.

**Secondary gap:** The story says "current outputs" are hydrated. `CurrentProcessMaterialRefs` has no `outputIds`. The `WorkingSetPlan` therefore cannot include outputs. Even after a provider is added, outputs will be silently excluded unless the material refs interface is extended.

**Schema divergence note (affects future stories):** The tech design defines `HydrationPlan` as `{fingerprint, artifactInputs: [{artifactId, displayName, versionLabel}], outputInputs, sourceInputs: [{sourceAttachmentId, displayName, targetRef, accessMode}]}`. The implementation uses `WorkingSetPlan: {artifactIds: string[], sourceAttachmentIds: string[]}`. Missing: fingerprint (needed for stale detection in Story 5), display names and version labels (needed by provider to materialize), outputInputs (entire category), per-source accessMode and targetRef in the plan. A future provider will either need to re-query the store for this information or the plan schema must be expanded.

---

### AC-2.3: Surface shows hydration progress and failure without manual refresh

**SATISFIED at client layer. Server-side publication gap — see NONBLOCKING_WARNINGS.**

**TC-2.3a — SATISFIED (client)**

`TC-2.3a hydration progress becomes visible through environment live updates` in `process-live.test.ts` applies `environmentPreparingUpsertLiveFixture` and verifies the store's `environment.state` becomes `preparing`. The live reconciliation path (`applyLiveProcessMessage` with `entityType = 'environment'`) is tested and correct.

**TC-2.3b — SATISFIED (client)**

`TC-2.3b hydration failure becomes visible through environment live updates` applies `environmentFailedUpsertLiveFixture` and asserts `state: 'failed'`, `blockedReason: expect.stringContaining('Preparation failed')`, `lastCheckpointResult: null`. The fixture rename from `environmentCheckpointFailureUpsertLiveFixture` to `environmentFailedUpsertLiveFixture` is correct — a preparation failure has no checkpoint result.

The tech-design-server Flow 2 and test plan both map TC-2.3a and TC-2.3b to `tests/service/server/process-live-updates.test.ts`. That file was not modified. The server-side path — where the orchestrator publishes `preparing` and later `failed` state to the live hub — is not tested. The existing Story 1 test proves `entityType: 'environment'` appears in the stream; it does not prove preparation or failure state transitions. This is a gap at the specified test layer. Coverage at the client layer is real and sufficient for story acceptance.

---

### AC-2.4: Process does not enter active running work until working set is ready or failure shown

**SATISFIED**

**TC-2.4a — SATISFIED**

`TC-2.4a running begins after readiness` in `process-live.test.ts` applies three sequential live messages (preparing → ready → running) and asserts the store reaches `running` only after `ready`. This is a correct and meaningful state-sequence test: it proves the client never fabricates a running state — it requires a ready message first.

**TC-2.4b — SATISFIED**

Two-layer coverage:
- Client: `TC-2.4b running does not begin after failed preparation` — applies preparing → failed, confirms `state = failed`, not `running`, `blockedReason` present.
- Server: `S2-TC-2.4b: start does not enter preparation state when the action result is terminal` — when start produces a completed/terminal process, `environment.state = absent`. This covers a distinct edge (terminal result → no preparation) rather than the in-flight failure scenario, but the core guarantee (no running without readiness) is confirmed from the server path.

Note: The S2-TC-2.4b label is misleading — see NONBLOCKING_WARNINGS W-3.

---

### AC-2.5: Surface distinguishes read-only and writable sources

**SATISFIED**

**TC-2.5a — SATISFIED**

- Client: `AC-2.5: read_write source renders "Access: read write"` (process-materials-section.test.ts) — verifies `Access: read write` text and `data-process-material-kind="source"` element present.
- Server: `S2-TC-2.5a: bootstrap exposes read_write accessMode for an attached writable source` (process-work-surface-api.test.ts) — inline fixture construction, full source projection asserted.

**TC-2.5b — SATISFIED**

- Client: `AC-2.5: read_only source renders "Access: read only"`.
- Server: `S2-TC-2.5b: bootstrap exposes read_only accessMode for an attached read-only source`.
- Third test in process-materials-section.test.ts: `data-access-mode` attributes distinguish items in a mixed list.

Implementation (`process-materials-section.ts`): `source.accessMode.replaceAll('_', ' ')` produces human-readable labels; `data-access-mode` attribute set for programmatic access.

---

## TEST_DIFF_AUDIT

### Modified test files

| File | Net change | Assessment |
|------|-----------|------------|
| `tests/service/server/process-actions-api.test.ts` | +242 lines | 8 new tests (S2-TC-2.1a ×2, S2-TC-2.1b ×2, S2-TC-2.4b, S2-HC-1/2/3). Updates one prior test's expected disabled-reason strings. All tests verify correctly against the implementation. |
| `tests/service/server/process-work-surface-api.test.ts` | +130 lines | 2 new tests (S2-TC-2.5a, S2-TC-2.5b). Inline fixture construction is verbose but explicit and correct. |
| `tests/service/client/process-live.test.ts` | ~120 lines net | 4 new TC-named tests (2.3a, 2.3b, 2.4a, 2.4b). Correctly renames 4 prior tests that had false TC labels. Correct fixture rename. |
| `tests/service/client/process-work-surface-page.test.ts` | +87 lines | Updates TC-2.1a/b assertions from "Running" + nextActionLabel to "State: Preparing environment". Adds TC-2.6a/b/c. |
| `tests/service/server/auth-routes.test.ts` | +18 lines | Stub implementations of new PlatformStore methods on local test mock. Maintenance. |
| `tests/service/server/processes-api.test.ts` | +31 lines | Same for `RecordingPlatformStore`. Maintenance. |

### New test file

| File | Tests | Notes |
|------|-------|-------|
| `tests/service/client/process-materials-section.test.ts` | 3 | AC-2.5 coverage. Labels use "AC-2.5" rather than "TC-2.5a/b" — minor but harmless. |

### Not modified (but spec maps TCs here)

| File | Unmapped TCs | Consequence |
|------|-------------|-------------|
| `tests/service/server/process-live-updates.test.ts` | TC-2.3a, TC-2.3b (server-side publication) | Existing Story 1 test confirms `environment` entity in stream. Preparing/failed state transitions from the server's publication path are untested at this layer. |

---

## TEST_QUALITY_FINDINGS

**TQ-1 (moderate): TC-2.6a/b/c are not declared TCs in the story.**
Three tests in `process-work-surface-page.test.ts` use `TC-2.6*` identifiers. No TC-2.6 series exists in AC-2.1 through AC-2.5. These test valid behavior (environment panel element specifically shows preparation state, not just body text). They should be labeled as non-TC decided tests to avoid false compliance signal.

**TQ-2 (low): Materials tests use AC labels instead of TC labels.**
`process-materials-section.test.ts` uses `AC-2.5` as the prefix. Convention elsewhere uses `TC-*`. Harmless inconsistency.

**TQ-3 (moderate): S2-TC-2.4b label mismatch.**
The test `S2-TC-2.4b: start does not enter preparation state when the action result is terminal` covers terminal process status producing absent environment. TC-2.4b in the story says: "Given: environment preparation fails before working set becomes ready." These are different scenarios. The test is correct and useful but its TC label is misleading. The actual AC-2.4b scenario (in-flight preparation failure → no running) is covered by the client live test.

**TQ-4 (positive): False TC labels were correctly stripped.**
Four prior tests in `process-live.test.ts` had `TC-2.3a`, `TC-2.3b`, `TC-2.4a`, `TC-2.4b` labels that did not correspond to Story 2 conditions. These were renamed to plain descriptive names. This prevents false compliance claims from prior stories.

**TQ-5 (positive): Two-call durability test for AC-2.1.**
`S2-TC-2.1a: start preparation state is durable...` does action → GET bootstrap, confirming the preparing state is durably stored. This is stronger than checking the action response alone.

**TQ-6 (positive): Resume preserves prior environment context explicitly tested.**
`S2-TC-2.1b: resume preserves prior hydration context` seeds a `readyEnvironmentFixture` and verifies the preparing response retains `environmentId` and `lastHydratedAt`. This is a non-obvious contract that is now explicitly asserted.

---

## MOCK_AUDIT_FINDINGS

**MA-1: No provider stub introduced — consistent with no provider call.**
Story 2 does not add `FakeProviderAdapter`. The test plan mentions `tests/utils/fake-provider-adapter.ts` as a planned utility. Its absence is correct given that no provider execution path exists. When Story 3 adds provider execution, the fake adapter will be needed.

**MA-2: `InMemoryPlatformStore` used correctly for action and surface tests.**
`process-actions-api.test.ts` and `process-work-surface-api.test.ts` use `InMemoryPlatformStore` seeded via constructor options. The `platformStore` handle is returned from `buildAuthenticatedApp` and used directly to assert plan state in S2-HC-1/2/3. This is the correct pattern per the test strategy.

**MA-3: Local mock classes in auth-routes and processes-api are maintained correctly.**
`auth-routes.test.ts` and `processes-api.test.ts` maintain local hand-rolled mock classes. Story 2 adds stub implementations for the three new PlatformStore methods. Stubs are plausible (null plan, pass-through upsert) and do not affect these tests' actual coverage targets.

**MA-4: Convex mutation access level.**
`upsertProcessEnvironmentState` is a public `mutation`, not `internalMutation`. The tech-design-server spec recommends `internal*` for server-only transitions. However, this repo calls Convex functions via `ConvexHttpClient` from the Fastify server — not from within Convex actions. Public `mutation` is correct for this transport pattern. The `internalMutation` guidance applies to Convex-to-Convex action calls, which are not used here. Not a violation.

---

## COMPLETENESS_GAPS

**CG-1 (blocking-level): AC-2.2 — no working copy is prepared.**
See AC_TC_COVERAGE AC-2.2. Planning is implemented. Execution is not. The environment stays `preparing` indefinitely.

**CG-2 (warning): Server-side live publication of preparation and failure states is untested.**
TC-2.3a and TC-2.3b are mapped to `process-live-updates.test.ts` by both tech-design-server and the test plan. The file was not extended. The publication path (start/resume service → live hub → websocket) exists and the story-1 snapshot test proves `environment` entity appears in the stream. But no test proves that `preparing` and `failed` states are published at the correct lifecycle moments.

**CG-3 (information): WorkingSetPlan vs HydrationPlan schema divergence.**
The tech design `HydrationPlan` carries the information a provider needs to materialize a working set (per-item display names, version labels, target refs, access mode, fingerprint). The implementation `WorkingSetPlan` carries only IDs. A future provider will either re-query the store or the plan schema must be extended. This constrains Story 3's design without explicit acknowledgment.

**CG-4 (information): providerKind is nullable where spec requires config-driven selection.**
The Convex schema allows `providerKind: null`. The tech-design-server says the server should select `'daytona' | 'local'` from config policy on first environment creation. The current implementation passes null. Provider selection policy is not enforced.

**CG-5 (information): Current outputs absent from hydration plan.**
`CurrentProcessMaterialRefs` has no `outputIds`. The plan cannot include outputs even though the story's AC-2.2 lists them. The material refs interface predates Story 2 and was not extended here.

---

## BLOCKING_FINDINGS

**B-1: AC-2.2 is not satisfied — hydration planning is not hydration execution.**

The story scope says hydration is In scope. The DefOD says hydration must occur. The test plan's TC-2.2a requires a provider call be asserted. None of these conditions are met by storing a flat ID array in PlatformStore.

The verification bundle explicitly surfaces this question: "Verifiers should evaluate whether the story's acceptance conditions are satisfied by the current behavior or whether more execution/hydration integration is required."

**Call:** The story's language is unambiguous. A formal disposition is required:

- **Option A — Scope adjustment:** Update the story's AC-2.2 language and DefOD to read "builds a hydration plan from current materials" rather than "hydrates...into the working copy." Update TC-2.2a/b to assert plan content only. Accept Story 2.
- **Option B — Stub execution path:** Add a fake/local provider adapter and wire a call from start/resume through to `provider.hydrateEnvironment(plan)`. The provider can be a no-op stub that updates state to `ready`. This satisfies the AC without requiring a real provider.

Either option unblocks acceptance. Option A is a scope decision. Option B is ~2 hours of work.

---

## NONBLOCKING_WARNINGS

**W-1: TC-2.3a/b server-side publication gap.**
The test plan maps these to `process-live-updates.test.ts`. The file was not extended. Client-layer coverage is real and correct. Server-side publication of state transitions from the orchestration path is assumed-correct but not explicitly tested. Low urgency while no real orchestration path exists.

**W-2: TC-2.6a/b/c label drift.**
Three tests in `process-work-surface-page.test.ts` claim TC-2.6 identifiers that don't exist in the story. Rename them to non-TC decided tests to prevent false compliance signal.

**W-3: S2-TC-2.4b is mislabeled relative to the scenario it covers.**
The test covers terminal start result → absent environment. TC-2.4b is about preparation failure → no running state. The test is correct and useful; the name misleads a verifier tracing the TC chain.

**W-4: tech-design-server.md modification is legitimate.**
The diff adds the Provider Selection Policy section. Content is coherent with the spec and the implementation's null-providerKind stance. Not scope drift. No concern.

---

## UNRESOLVED

**U-1: Does the story boundary permit planning-only delivery of AC-2.2?**

This requires an explicit decision from the author. The spec says hydration is in scope. The verification bundle asks verifiers to call it. The call is REVISE (not PASS) pending disposition of B-1 above.

**U-2: WorkingSetPlan or HydrationPlan as the stable provider contract?**

When Story 3 adds provider execution, it must either accept `WorkingSetPlan` (re-querying the store for display names/refs/accessMode) or require the planner to be upgraded to `HydrationPlan`. This design decision should be made explicit before Story 3 begins.

---

## GATE_RESULT

```
corepack pnpm run verify → PASS

Convex:  9 tests,  3 files  — all pass
Server: 77 tests, 10 files  — all pass
Client: 130 tests, 18 files — all pass
TypeScript: clean
Lint: clean
Build: clean
```

Gate passes. The REVISE verdict is on story scope (AC-2.2), not on implementation quality or gate stability.

---

## What else was noticed but not elevated to findings

**Positive implementation details not worth cluttering findings:**
- `requiresEnvironmentPreparation` uses `running | waiting` — correct. A start that produces a terminal result (already-complete process type) skips preparation cleanly via the false branch.
- `upsertProcessEnvironmentState` Convex mutation preserves `lastHydratedAt: args.lastHydratedAt ?? existing.lastHydratedAt` — correct behavior for resume entering preparation without discarding a prior hydration timestamp.
- `planHydrationWorkingSet` copies arrays defensively (`[...refs.artifactIds]`) — not strictly needed since the refs are already deserialized values, but harmless.
- The `environmentFailedUpsertLiveFixture` correctly has `lastCheckpointResult: null` — a preparation failure has no checkpoint result. The old `environmentCheckpointFailureUpsertLiveFixture` (which had a checkpoint result) was correctly differentiated.

**Observations withheld as too minor or speculative:**
- `upsertProcessEnvironmentState` reads the updated row via a second `.unique()` query after patching, rather than returning the patched object directly. This costs one extra Convex read per upsert. Fine for current usage; observable at higher frequency.
- `process-live-updates.test.ts` uses a `waitFor` polling loop with a 1500ms timeout for websocket tests. This is a pre-existing pattern, not introduced here. Not worth flagging in a Story 2 review.
- The `by_environmentId` index on `processEnvironmentStates` is defined but not used by any current query path. It is forward-looking infrastructure for provider callbacks or recovery tooling. Not dead weight.
- `process-work-surface-page.test.ts` TC-2.1a/b previously asserted "Running" as the visible body text after a start/resume. The Story 2 implementation correctly changes this to "State: Preparing environment" because the surface now shows preparation state, not running state. This is a behaviour change with real UX consequence that was handled correctly in both the implementation and the test update.
