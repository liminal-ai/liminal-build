# Story 3 Verification — Sonnet Review Round 2

**Verifier:** Claude Sonnet 4.6 (Verifier B, Round 2 confirmation pass)
**Story:** `stories/03-controlled-execution-and-live-environment-state.md`
**Red baseline commit:** `414879a`
**Fix batch spec:** `story-03-fix-batch-01.md`
**Fix batch report:** `story-verification/03-controlled-execution-and-live-environment-state/fix-batch-01-report.md`
**Review date:** 2026-04-15

---

## VERDICT: PASS

Codex blocker closed. All three items from the fix batch satisfied. Gate green. No new blocking findings. Zero regressions in existing assertions.

---

## CODEX_BLOCKER_STATUS

**closed**

Evidence:
- `process-environment.service.ts:126-128` — `currentProcess` is fetched once at the top of `executeExecution` via `this.platformStore.getProcessRecord(...)` and reused across all three execution-lane publications.
- `process-environment.service.ts:154` — `running` publication includes `process: buildProcessSurfaceSummary(currentProcess, runningEnvironment)`.
- `process-environment.service.ts:178` — `failed` (execution outcome path) publication includes `process: buildProcessSurfaceSummary(currentProcess, failedEnvironment)`.
- `process-environment.service.ts:198` — `checkpointing` publication includes `process: buildProcessSurfaceSummary(currentProcess, checkpointingEnvironment)`.
- `process-environment.service.ts:217` — `failed` (catch/error path) publication includes `process: buildProcessSurfaceSummary(currentProcess, failedEnvironment)`.
- The `failed` branch (both paths) does NOT call `transitionProcessToRunning` or any durable process status mutation. Durable process status is unchanged on execution failure, satisfying the AC-3.4 "do not mutate" constraint.
- `tests/service/client/process-live.test.ts:340-366` — `TC-3.4b` drives the exact scenario: seeds a running surface with `availableActions: ['review']` (no rehydrate/rebuild), applies a paired process+environment publication with `environment.state = failed`, and asserts `nextState.process?.availableActions` contains `['rehydrate', 'rebuild']` with both controls enabled. This is a strong, specific regression test for the same-session control recovery path.

---

## FIX_ITEM_VERIFICATION

### Item 1 (required) — `runExecutionAsync` publications include recomputed `process` summary
**correct**

All three execution-lane transitions now publish `process: buildProcessSurfaceSummary(currentProcess, nextEnvironment)`:
- `running` at line 149-157
- `failed` (outcome path) at lines 173-181
- `checkpointing` at lines 193-201
- `failed` (catch path) at lines 212-220

`currentProcess` is read once from `platformStore.getProcessRecord` at line 126-128, before the try block, so it is available and correctly reused for all four publications without additional round trips to the store.

### Item 2 (required) — AC-3.4 in-session recovery regression test
**correct**

`TC-3.4b` at `tests/service/client/process-live.test.ts:340-366` satisfies the spec:
- Seeds state via `buildConnectedExecutionState(1)` which carries a running-state process surface with `availableActions` that do not include `rehydrate`/`rebuild`.
- `applyExecutionFailurePublication` constructs a `currentProcess` with `availableActions: ['review']` (explicitly no recovery actions), then builds a `process` publication via `buildProcessSurfaceSummary(currentProcess, failedEnvironment)` and applies it followed by the matching `environment` upsert — mirroring the server's now-fixed dual publication.
- Asserts `nextState.process?.availableActions` contains both `rehydrate` and `rebuild`.
- Asserts both controls have `enabled: true`.
- Also asserts the environment panel renders `data-environment-state="failed"` with the correct derived label — provides UI-layer confirmation alongside the state-layer assertions.
- Test is purely additive; original `TC-3.4a` at line 313-338 is completely unchanged.

### Item 3 (preferred) — Isolation tests split as standalone named tests
**correct**

Two standalone tests are present:
- `tests/service/client/process-live.test.ts:368-382` — `'environment updates do not wipe unrelated history state'` — applies a pure environment upsert (no failure-path process upsert) and asserts `nextState.history` equals the prior `state.history`.
- `tests/service/client/process-live.test.ts:384-398` — `'environment updates do not wipe unrelated materials state'` — applies an identical pure environment upsert and asserts `nextState.materials` equals the prior `state.materials`.

Both test the pure environment-upsert isolation path (no concurrent process publication), which is distinct from the failure-combination path covered by TC-3.4a. The fix batch report notes these were split out additively from assertions that previously existed inside TC-3.4a.

---

## TEST_DIFF_ADDITIVE_ONLY

**yes**

Only one test file modified: `tests/service/client/process-live.test.ts`.
No convex test files modified.
No server test files modified (`tests/service/server/**` unchanged).

Changes in `process-live.test.ts`:
1. Added imports: `JSDOM`, `renderProcessEnvironmentPanel`, `buildProcessSurfaceSummary`, `processSummarySchema` — all imports of existing production exports, no schema relaxations.
2. Added helper functions: `createDocument()`, `buildExecutionFailureEnvironment()`, `applyExecutionFailurePublication()` — additive setup code, no modification of existing fixtures or builders.
3. Added three new tests at lines 340-398 (`TC-3.4b`, `environment updates do not wipe...history`, `environment updates do not wipe...materials`).
4. All existing test bodies at lines 313-338 (`TC-3.4a`) and all earlier tests are unchanged. Red-phase assertion texts, `toEqual`, `toMatchObject`, `toBe`, `not.toContain` values are identical to the red baseline.

**No hunks that changed existing assertions found.**

---

## REGRESSION_CHECK

### Story 1 red-phase assertions
Unchanged. The `process-live.test.ts` diff shows no modifications to tests before the Story 3 block. No server test files touched.

### Story 2 red-phase assertions
Unchanged. `tests/service/server/process-live-updates.test.ts`, `tests/service/server/processes-api.test.ts`, and all other server test files are unmodified since the red baseline (diff `414879a` against HEAD shows only `process-live.test.ts` in `tests/`).

### Story 3 red-phase assertions
Unchanged. The original six TCs (TC-3.1a, TC-3.2a, TC-3.2b, TC-3.3a, TC-3.3b, TC-3.4a) are present and unmodified at their original line positions with their original assertion texts.

---

## ORIGINAL_WARNINGS_STATUS

### W-1: Two non-TC decided tests absent
**now closed**

Both standalone isolation tests are now present and correctly named: `'environment updates do not wipe unrelated history state'` (line 368) and `'environment updates do not wipe unrelated materials state'` (line 384). The test plan's specification for these named non-TC decided tests is satisfied.

### W-2: Server-side TC-3.4a legibility assertion is thin
**still open**

The server test at `process-live-updates.test.ts` still asserts only `messages.some((message) => message.entityType === 'process')).toBe(true)` for the execution failure path. The new client-side `TC-3.4b` now provides much stronger complementary coverage, and the invariant is adequately guarded at the client layer. This remains an accepted minor gap at the server layer only.

### W-3: Untested fallback blockedReason
**still open**

The `executionResult.failureReason ?? 'Execution failed.'` fallback at `process-environment.service.ts:170` is not exercised by any test. No test supplies `failureReason: undefined`. This remains a minor accepted risk with no fix batch obligation.

---

## NEW_BLOCKING_FINDINGS

None.

---

## NEW_NONBLOCKING_WARNINGS

### NW-1: TC-3.4b helper builds `currentProcess` manually via schema parse rather than reusing the fixture

`applyExecutionFailurePublication` at line 121-137 constructs `currentProcess` by calling `processSummarySchema.parse({...})` with individual fields sourced from `state.process ?? runningProcessSurfaceFixture.*`. This is functionally correct but slightly fragile: if the `processSummarySchema` shape changes, this builder may throw at parse time rather than failing at the assertion level. Minor brittleness, not a functional gap. Acceptable for a regression test of this scope.

---

## GATE_RESULT

**passed**

Command: `corepack pnpm run verify 2>&1 | tail -40`

```
Test Files  3 passed (3)
     Tests  9 passed (9)

Test Files  11 passed (11)
     Tests  86 passed (86)

Test Files  19 passed (19)
     Tests  138 passed (138)
```

Total: 33 test files, 233 tests (3 new vs. Round 1's 230), all passing. Build also passes (built in 31ms).

Count increase is exactly the 3 additive tests from Fix Batch 01: `TC-3.4b`, `environment updates do not wipe unrelated history state`, `environment updates do not wipe unrelated materials state`.
