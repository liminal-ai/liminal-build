# Epic 3 Nit-Fix Batch — Verifier B Review (Sonnet 4.6)

**Date:** 2026-04-15
**Range:** `68b73c6`..`dd2cb39`
**Verdict:** PASS — all 17 items verified, gate clean, no blocking findings.

---

## Per-Item Status

| # | Item | Applied | Correct | Tests Meaningful |
|---|------|---------|---------|-----------------|
| 1 | `rehydrating` in epic vocab table and control matrix | Yes — TC-1.1c.1 row added at line ~167, state added to enum at line ~584 | Yes | N/A (doc) |
| 2 | Source writability wording → `writable sources` / `accessMode: read_write` | Yes — two occurrences in overview and PRD backfill table updated | Yes | N/A (doc) |
| 3 | Error classes → error-code vocabulary on `AppError` in Story 0 | Yes — objective and DoD bullet updated | Yes | N/A (doc) |
| 4 | `process_event` history rows for environment lifecycle moments | Yes — preparation start, execution failure (two code paths), rebuild start, checkpoint succeed/fail all emit via `appendProcessEvent` helper | Yes — integration test (item 9) asserts these rows in the reopened bootstrap history |
| 5 | TC-4.5b labeled test | Yes — pre-existed correctly at line 1170 of `process-live-updates.test.ts` with `FailingCodeCheckpointWriter` | Yes — drives real code path |
| 6 | Strengthen TC-3.4a legibility assertion | Yes — added `failedProcessMessage` extraction and `toMatchObject` assertions for `hasEnvironment: true`, recovery controls enabled, and `blockedReason: expect.any(String)`. Original entity-presence check preserved. | Yes — no weakening |
| 7 | Start/respond same-session regression tests | Yes — two new tests in `process-actions-api.test.ts`: start with pre-existing ready env (expects preparing controls in response), respond with failed env (expects recovery controls enabled) | Yes — genuine env-awareness checked |
| 8 | Explicit respond/review control-matrix assertions | Yes — three new tests in `process-controls.test.ts`: `review` enabled in running state, `review` enabled in failed state, `respond` enabled when waiting + failed env | Yes — asserts against `renderControls` output |
| 9 | Deep integration chain start→checkpoint→lost→rebuild→reopen | Yes — full chain in `process-work-surface.test.ts` using `InMemoryPlatformStore`, waitFor polling, real HTTP calls, reopened bootstrap assertion | Yes — covers history dedup, environment state, lastCheckpointResult durability |
| 10 | Failed + null environmentId edge case | Yes — new test in `process-live-updates.test.ts` using `FailingProviderAdapter`, asserts `state: 'failed'`, `environmentId: null`, `blockedReason` set | Yes — drives real hydration path |
| 11 | Materials refresh after artifact checkpoint | Yes — new client-side test verifying `applyLiveProcessMessage` handles a materials upsert carrying a new artifact. Server-side, `readMaterials()` is called and passed to `publishEnvironmentUpsert` on artifact checkpoint. | Partially — client reducer is tested; the server publication is wired but only indirectly asserted via the existing line-231 check that materials messages are emitted in the happy path. Not a flag-worthy gap: implementation is real and wired. |
| 13 | ConvexPlatformStore hydration-plan persistence | Yes — `getProcessHydrationPlan` and `setProcessHydrationPlan` are real Convex query/mutation calls; Convex layer adds `workingSetPlan` field to schema and implements both handlers; Convex test added | Yes — Convex test round-trips set→get |
| 14 | `hasCanonicalRecoveryMaterials` real check | Yes — replaced unconditional `true` with `getCurrentProcessMaterialRefs` check: returns `true` iff `artifactIds.length > 0 || sourceAttachmentIds.length > 0` | Yes — covered indirectly by integration and action tests; no dedicated unit test, but the logic is a one-liner backed by an existing method |
| 17 | Wire `providerKind` from config on first environment creation | Yes — `DEFAULT_ENVIRONMENT_PROVIDER_KIND` added to `config.ts` schema (Zod enum, default `'local'`), threaded through `app.ts` to all three services, all `providerKind: null` sites in `ProcessEnvironmentService`, `ProcessStartService`, and `ProcessResumeService` replaced | Yes — covered by integration test which asserts non-null provider kind on rebuilt environment |
| 19 | Rename mislabeled TC-2.6* tests | Yes — all three `TC-2.6a/b/c` labels removed; tests renamed to descriptive strings | Yes — test behavior unchanged, still exercises preparation state visibility |
| 20 | Document `setTimeout` execution-kickoff deviation | Yes — one-line comment added inside the `setTimeout(..., 0)` block | N/A |
| 22 | `environmentCompleteLiveFixture` added | Yes — fixture created in `tests/fixtures/live-process.ts` with `messageType: 'complete'`, `entityType: 'environment'` | N/A (fixture) |

---

## Assertion Weakening Check

None found. TC-3.4a's existing entity-presence assertion at line 943 is preserved alongside the new payload assertions. TC-4.5b was pre-existing and unchanged. All other new tests add coverage without removing any existing `expect` call.

## Scope Creep Check

None. Items 15 (stale fingerprint), 16 (execution rich lifecycle), and 18 (convex codegen) were correctly excluded. The `workingSetPlan` field addition is bounded to item 13's plan persistence requirement and does not expand into fingerprinting.

## Minor Observation

Item 11's new test validates client-reducer behavior against a crafted materials message rather than exercising the server's post-checkpoint publication path end-to-end. This is consistent with the spec guidance ("flag this as a gap rather than faking it") but the implementation *is* wired — `readMaterials()` is called and piped to the hub on artifact checkpoint success. A future server-side live test driving a full checkpoint-to-materials-message assertion would close the observation fully. Not blocking.

---

## Gate

```
Test Files  4 passed (4)   [convex]
Tests       13 passed (13)

Test Files  12 passed (12)  [service/server]
Tests       106 passed (106)

Test Files  19 passed (19)  [service/client]
Tests       152 passed (152)

format:check, lint, typecheck, build — all clean
```

**VERDICT: PASS**
Items verified: 17/17
Gate: passed (clean)
Blocking findings: none
