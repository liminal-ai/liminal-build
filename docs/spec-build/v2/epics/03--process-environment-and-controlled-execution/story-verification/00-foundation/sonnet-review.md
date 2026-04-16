# Story 0 Foundation — Compliance Verification Review

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-04-15  
**Story base commit:** `e6c08484846aea19d2d6e3483728126fe7da92f2`

---

## VERDICT: PASS

All critical and major foundation obligations are satisfied. Two minor gaps exist (documented below). Gate passes.

---

## AC_TC_COVERAGE

Story 0 foundation checklist derived from Scope, Technical Design, and Definition of Done:

| # | Obligation | Status | Evidence |
|---|-----------|--------|----------|
| F-01 | Environment-state vocabulary (10 states: absent…unavailable) | **SATISFIED** | `environmentStateSchema` z.enum in `process-work-surface.ts:83–95`; all 10 literals present |
| F-02 | Visible-control vocabulary (7 actionIds in stable order) | **SATISFIED** | `processSurfaceControlOrder` const at `process-work-surface.ts:150–158`; order is `start, respond, resume, rehydrate, rebuild, review, restart` |
| F-03 | `buildProcessSurfaceControls` helper with disabled-reason support | **SATISFIED** | Helper at `process-work-surface.ts:170–187`; `disabledReasons` map applied per actionId |
| F-04 | `checkpoint.checkpointKind` enum (artifact/code/mixed) | **SATISFIED** | `checkpointKindSchema` at `process-work-surface.ts:97–99` |
| F-05 | `checkpoint.outcome` enum (succeeded/failed) | **SATISFIED** | `checkpointOutcomeSchema` at `process-work-surface.ts:100–102` |
| F-06 | `LastCheckpointResult` schema — all 7 fields with validation | **SATISFIED** | Schema at `process-work-surface.ts:193–202`; `targetRef` and `failureReason` nullable |
| F-07 | `EnvironmentSummary` schema — all 7 fields | **SATISFIED** | Schema at `process-work-surface.ts:214–228`; `lastCheckpointResult` nullable default |
| F-08 | `ProcessSurfaceSummary.controls` field | **SATISFIED** | `controls: z.array(processSurfaceControlStateSchema).default(defaultProcessSurfaceControls)` at line 239 |
| F-09 | `ProcessSurfaceSummary.hasEnvironment` field | **SATISFIED** | `hasEnvironment: z.boolean().default(false)` at line 240 |
| F-10 | `source.accessMode` vocabulary (read_only/read_write) | **SATISFIED** | `sourceAccessModeSchema` in `schemas.ts`; wired into `processSourceReferenceSchema`; `materials-section.reader.ts:90` projects it from durable store |
| F-11 | API path constants for rehydrate and rebuild | **SATISFIED** | `processRehydrateApiPathnamePattern`, `processRebuildApiPathnamePattern`, and path-builder functions added to `process-work-surface.ts` |
| F-12 | `live.entityType` includes `environment` | **SATISFIED** | `liveProcessEntityTypeSchema` enum at `live-process-updates.ts:15–22` |
| F-13 | Typed `environment` live message schema | **SATISFIED** | `environmentLiveDataMessageSchema` at `live-process-updates.ts:87–92`; enforces `entityId: z.literal('environment')` |
| F-14 | `AppState.processSurface.environment` field | **SATISFIED** | `environment: environmentSummarySchema.nullable().default(null)` in `state.ts:106` |
| F-15 | `applyLiveProcessMessage` handles environment entity | **SATISFIED** | Branch at `process-live.ts:145–148`; wholesale replacement via `applyEnvironment` |
| F-16 | Epic 3 error codes: `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | **SATISFIED** | `codes.ts:4–5`; accepted by `requestErrorSchema`; tested in foundation test |
| F-17 | Epic 3 error codes: `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | **SATISFIED** | `codes.ts:6–7`; verified in foundation contracts test |
| F-18 | Epic 3 error codes: `PROCESS_ENVIRONMENT_UNAVAILABLE` | **SATISFIED** | `codes.ts:8`; verified in foundation contracts test |
| F-19 | Fixtures: all 10 environment states | **SATISFIED** | `tests/fixtures/process-environment.ts`; one named export per state plus checkpoint variants |
| F-20 | Fixtures: checkpoint results (artifact/code/mixed success + artifact/code failure) | **SATISFIED** | `tests/fixtures/checkpoint-results.ts`; 5 named fixtures + `buildCheckpointResultFixture` builder |
| F-21 | Fixtures: control sets with disabled reasons | **SATISFIED** | `tests/fixtures/process-controls.ts`; `staleEnvironmentProcessControlsFixture` and `lostEnvironmentProcessControlsFixture` with non-empty `disabledReason` |
| F-22 | Fixtures: materials with `accessMode` coverage | **SATISFIED** | `processSourceReferenceFixture` (read_only), `writableProcessSourceReferenceFixture` (read_write), `mixedAccessProcessMaterialsFixture` |
| F-23 | Live fixtures: environment snapshot | **SATISFIED** | `environmentSnapshotLiveFixture` at `live-process.ts:158` |
| F-24 | Live fixtures: environment upserts (preparing/ready/running/checkpointing) | **SATISFIED** | 4 named upsert fixtures at lines 166–196 |
| F-25 | Live fixtures: environment upsert with failed checkpoint result | **SATISFIED** | `environmentCheckpointFailureUpsertLiveFixture` at line 198 |
| F-26 | Live fixtures: completion markers | **VIOLATED (minor)** | No `environmentCompleteLiveFixture`; the schema permits `messageType: 'complete'` for environment but no fixture exercises it. DoD text: "completion markers." |
| F-27 | Live fixtures: transport-error coverage | **SATISFIED (inferred)** | `reconnectingProcessSurfaceStateFixture` and `historyErrorLiveFixture` cover WebSocket transport degradation. Environment does not appear in `liveProcessErrorMessageSchema.entityType`; this is an intentional design choice (discussed in UNRESOLVED below). |
| F-28 | Server route emits `environment` field in bootstrap response | **SATISFIED** | `process-work-surface.service.ts:159` returns `defaultEnvironmentSummary`; route test asserts on `environment` field. Stub using default is correct scope for Story 0. |
| F-29 | `connectedProcessSurfaceStateFixture` updated to include environment | **SATISFIED** | `live-process.ts:217–236`; `environment: absentEnvironmentFixture` present |
| F-30 | Later stories can import Story 0 vocabulary without redefinition | **SATISFIED** | Verified: test files import fixtures and schemas from Story 0 paths; all 176 tests pass under `verify` |

---

## TEST_DIFF_AUDIT

**New test file (story-introduced):**
- `tests/service/server/process-foundation-contracts.test.ts` — 4 focused Story 0 contract tests covering: stable control order, checkpoint/environment/access-mode fixture vocabulary, disabled-reason preservation, and Epic 3 error-code acceptance.

**Modified test files:**

| File | Change Category | Story 0 Reason |
|------|----------------|----------------|
| `tests/service/client/process-live.test.ts` | 2 new tests + fixture imports | Adds `applies environment upserts` and `preserves checkpoint-result visibility on failure`; both verify Story 0 `applyLiveProcessMessage` additions |
| `tests/service/client/process-response-composer.test.ts` | 1 assertion fix | Adds `environment: null` to expected state shape; required field fallout from `ProcessSurfaceState` extension |
| `tests/service/client/process-work-surface-page.test.ts` | 4 assertion updates | Adds `environment: readyProcessWorkSurfaceFixture.environment` or `null` to store bootstrap shapes |
| `tests/service/server/process-actions-api.test.ts` | 1 assertion update | Adds `controls` and `hasEnvironment` to process summary assertion in `followUpWaitingProcessSummary` |
| `tests/service/server/process-live-updates.test.ts` | Assertion + count update | Adds `environment` to snapshot message count, asserts on environment upsert in publish flow, adds `accessMode` to source fixture |
| `tests/service/server/process-work-surface-api.test.ts` | Shape + assertion updates | Adds `environment`, `accessMode` to assertions; 3 inline source objects gain `accessMode: 'read_only'` |
| `tests/service/server/processes-api.test.ts` | 1 fixture fix | Adds `accessMode: 'read_only'` to one inline source object |

**Assessment:** All test changes are proportional to Story 0's scope. No test rewrites or behavioral regressions. Changes fall into two clear categories: (1) required field fallout from `ProcessSurfaceState.environment` extension, and (2) new `controls`/`hasEnvironment`/`accessMode` field coverage. The new foundation test file is appropriately purposeful and not padded.

---

## TEST_QUALITY_FINDINGS

**Strengths:**

- `process-foundation-contracts.test.ts` is structured exactly right for a foundation story: it validates vocabulary, not behavior. Each test exercises a distinct invariant (control order, fixture vocabulary, disabled-reason integrity, error-code acceptance).
- The two new `process-live.test.ts` tests test the `applyLiveProcessMessage` extension directly at its public entry point, consistent with the repo's service-mock philosophy.
- `environmentCheckpointFailureUpsertLiveFixture` in the second live test verifies that `lastCheckpointResult` survives through a `failed` environment update — this is a meaningful invariant, not a reflexive assertion.

**Weaknesses:**

- The foundation contracts test does not verify `PROCESS_ACTION_NOT_AVAILABLE`. This code is pre-existing (Epic 2), so it is not a Story 0 obligation — but the story's "Shared Error Responses" table lists all four codes together. The omission is not a violation; noting it for completeness.
- `process-foundation-contracts.test.ts` has no negative fixture tests (e.g., a schema rejection test for an invalid state literal or a malformed checkpoint result). Positive-only fixture tests are adequate for vocabulary establishment but offer no schema-guard signal.

---

## MOCK_AUDIT_FINDINGS

**SATISFIED.** Story 0 does not introduce new mock boundaries. The changes are contract/fixture additions. Existing mock discipline (fetch, WebSocket, WorkOS, provider adapters) is unchanged. `InMemoryPlatformStore` remains the server-side seam. Nothing in the diff creates new module-level mock patterns or bypasses existing ones.

The `process-work-surface.service.ts` uses `defaultEnvironmentSummary` as a hardcoded stub rather than calling an environment section reader. This is the correct Story 0 approach: the `EnvironmentSectionReader` is scheduled as a NEW file in Story 1. Using a default instead of a null or an unimplemented call is the correct integration posture for the foundation slice.

---

## COMPLETENESS_GAPS

| Gap | Severity | Evidence |
|-----|----------|----------|
| Missing `environmentCompleteLiveFixture` | MINOR | DoD requires "completion markers"; `environmentLiveDataMessageSchema` permits `messageType: 'complete'` but no named fixture exercises it. Stories that publish a terminal environment state will need to create this inline. |
| No matrix-level disabled-reason fixture coverage | MINOR | Test plan fixture strategy calls for "enabled/disabled control fixtures per environment-state matrix." Only `stale` and `lost` are covered. Matrix states absent/preparing/ready/running/checkpointing/failed/rebuilding/unavailable are not represented as discrete control fixtures. Later stories will need to extend or inline. |
| `PROCESS_ACTION_NOT_AVAILABLE` not tested in foundation suite | MINOR | Pre-existing code; not a Story 0 obligation. But it is listed in the "Shared Error Responses" table. |

---

## BLOCKING_FINDINGS

None.

---

## NONBLOCKING_WARNINGS

**W-01 — Environment stub will silently return `absent` until wired**  
`process-work-surface.service.ts:159` returns `defaultEnvironmentSummary` unconditionally. Story 1 must replace this with an `EnvironmentSectionReader` call. There is no guard that would catch a forgotten wiring — the response shape is still valid and passes schema parsing. Later stories should confirm the reader injection in their own verification.

**W-02 — `liveProcessErrorMessageSchema` excludes `environment` from entityType**  
`live-process-updates.ts` defines error message `entityType` as `z.enum(['history', 'materials', 'side_work'])`. Environment errors cannot be delivered as typed `error` messages through the live channel. This appears intentional (environment failures surface through `environment.state` and `blockedReason` rather than section errors), but the DoD's "transport errors" phrasing is ambiguous. If a future story needs to signal a live-transport-level environment error, the error schema will need extension.

**W-03 — `controls` not asserted in bootstrap surface test**  
`process-work-surface-api.test.ts` adds `environment` to the response assertion but does not assert on `process.controls` or `process.hasEnvironment` shape in the main bootstrap assertions. The foundation contracts test covers this at the service layer. Coverage is sufficient for Story 0 but Story 1 should add a route-level controls assertion when environment state makes control derivation non-trivial.

---

## UNRESOLVED

**U-01 — Environment error delivery model**  
The DoD says "Live-update fixtures include ... transport errors." The live error schema explicitly excludes `environment` from `entityType`. This could mean: (a) environment errors travel only through `environment.state`/`blockedReason` updates (consistent with the tech design's degradation model), or (b) the omission is inadvertent. Evidence favors (a) — the tech design section on degradation says "live failure must never make the process unreadable" and recovery is through bootstrap — but this was not explicitly resolved in the story's claimed deviations. **Recommend:** Story 1 or the Epic 3 tech design should document this as a resolved design decision so verifiers for later stories don't re-raise it.

---

## GATE_RESULT

```
corepack pnpm run verify

Test Files  3 passed (3)   [convex]
Tests       9 passed (9)

Test Files  10 passed (10) [service/server]
Tests       62 passed (62)

Test Files  16 passed (16) [service/client]
Tests       105 passed (105)

OVERALL: PASSED
```

Build: TypeScript compile + Vite client build both clean. No type errors introduced by contract extensions.

---

## WHAT I NOTICED BUT DID NOT REPORT

- The `processSurfaceControlStateSchema` uses `.default(null)` for `disabledReason` rather than making it truly optional (`.optional()`). This means a parsed control always carries the key, never omits it — a minor style choice with no correctness impact but different from the story's table which marks it "no" (not required). It's a stricter-than-spec choice that is fine and consistent with how Zod nullable defaults work.

- `environmentLiveDataMessageSchema` constrains `payload` to `environmentSummarySchema` — which means a `complete` message for environment would require a full valid `EnvironmentSummary` object, not `null`. This is different from `currentRequestLiveDataMessageSchema` which allows `null` payload for clearing. That asymmetry may become relevant when environment teardown or expiry needs a `complete` event. Not reported because it's a design judgment call that Story 0 cannot own, and the tech design has no `complete`-with-null semantics for environment.

- The `reconnectingProcessSurfaceStateFixture` in `live-process.ts` has `lastSequenceNumber: 17` — which matches the highest sequence number in the fixture file (`environmentCheckpointFailureUpsertLiveFixture` is seq 17). This is coherent bookkeeping, not an accident.

- `processRehydrateApiPathnamePattern` and `processRebuildApiPathnamePattern` are defined in the contract but the corresponding Fastify route handlers are not registered in `routes/processes.ts` yet. This is correct for Story 0 — Story 0 defines the vocabulary; Stories 2 and 5 wire the handlers. There is no test that attempts to POST to these routes and gets confused by a 404, so the gap is not a test-quality issue.
