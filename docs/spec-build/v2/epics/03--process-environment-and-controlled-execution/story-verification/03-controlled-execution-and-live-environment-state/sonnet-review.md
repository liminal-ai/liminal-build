# Story 3 Verification — Sonnet Review

**Verifier:** Claude Sonnet 4.6 (Verifier B, independent session)
**Story:** `stories/03-controlled-execution-and-live-environment-state.md`
**Red baseline commit:** `414879a`
**Green delta:** uncommitted modifications on top of `414879a`
**Review date:** 2026-04-15

---

## VERDICT: PASS

All 6 TCs satisfied. Gate passes. Zero test-file modifications since red baseline. Scope boundaries respected. Implementation is minimal and correct.

---

## AC_TC_COVERAGE

| AC | TC | Test File(s) | Verdict | Evidence |
|----|----|--------------|---------|----------|
| AC-3.1 | TC-3.1a: Running execution state visible | `process-live-updates.test.ts:607`, `process-live.test.ts:215` | SATISFIED | Server test: waits for `ready`, then asserts `running` upsert emitted with correct `environmentId`. Client test: process `waiting` upsert when env is `running` transitions env to `ready`, not `running`. |
| AC-3.2 | TC-3.2a: Execution activity is process-facing | `process-environment-panel.test.ts:16`, `script-execution.service.test.ts:19` | SATISFIED | Panel test injects raw `statusLabel = 'provider.exec.stdout.fragment'` and asserts it is not rendered; `deriveEnvironmentStatusLabel('running')` appears instead. |
| AC-3.2 | TC-3.2b: Browser does not reconstruct raw stream fragments | `process-environment-panel.test.ts:29` | SATISFIED | Panel test with checkpointing state injects raw fragment string and asserts only the derived label appears. |
| AC-3.3 | TC-3.3a: Waiting is distinct from running | `process-live.test.ts:215` | SATISFIED | State with `environment.state = running` receives `process.status = waiting` upsert; assert `nextState.environment.state !== 'running'` — normalized to `ready`. |
| AC-3.3 | TC-3.3b: Checkpointing is distinct from running | `process-live-updates.test.ts:684`, `process-live.test.ts:233` | SATISFIED | Server: waits for `ready` + 25ms settle, asserts `checkpointing` environment upsert present. Client: environment upsert with raw `statusLabel` fragment asserts normalized `checkpointing` label from `deriveEnvironmentStatusLabel`. |
| AC-3.4 | TC-3.4a: Execution failure leaves surface legible | `process-live-updates.test.ts:761`, `process-live.test.ts:256` | SATISFIED | Server: failed execution publishes `state: failed` with `blockedReason` matching the configured failure reason. Client: `nextState.process.processId`, `nextState.history`, `nextState.materials` all equal prior state; environment normalizes to `failed` with coherent label. |

**All 4 ACs: SATISFIED. All 6 TCs: SATISFIED.**

---

## TDD_INTEGRITY

### Test-file diff since red baseline

Command: `git diff 414879a --name-only -- 'tests/**' 'convex/**'`
Result: empty output — zero test files modified.

**Implementer's claim of zero test-file modifications is CONFIRMED. OBSERVED.**

### Red phase evidence

Red report (`red-phase-report.md`) shows 10 tests failing for `NOT_IMPLEMENTED` / behavior-absent reasons, not for compile errors or wrong fixtures. The failure messages in the tail show the exact `NOT_IMPLEMENTED` AppError thrown by skeleton stubs. This is a clean red.

### Green phase test count

Green report shows 34 tests pass across 4 files after implementation. The `verify` gate run I executed confirms: 9 convex + 86 service-server + 135 client = 230 tests, all passing.

### Non-TC decided tests — Story 3 chunk

Per the test plan, Story 3 (Chunk 3) is specified to include these non-TC decided tests in `process-live.test.ts`:
- `environment updates do not wipe unrelated history state` — **NOT PRESENT**
- `environment updates do not wipe unrelated materials state` — **NOT PRESENT**

These two tests are listed in the test plan's TC → Test Mapping section and the chunk breakdown. They are not present in the file (confirmed by exhaustive grep).

However, the AC-3.4 TC-3.4a client-side test at line 256 does assert `expect(nextState.history).toEqual(state.history)` and `expect(nextState.materials).toEqual(state.materials)` for the execution-failure path, which partially covers the intent. The isolated "no wipe" tests would provide more granular coverage of the pure-environment-upsert path (no failure involved), which is currently untested in isolation. This is a minor gap, not a blocking defect.

### Test quality

- Assertions use specific field matching (`toMatchObject`, `toEqual`) rather than just presence checks.
- The panel tests explicitly assert the raw fragment string is NOT rendered (`not.toContain`), which is a strong negative assertion matching AC-3.2b exactly.
- TC-3.3b client test passes a raw `statusLabel` fragment through the reducer and asserts the derived label appears — strong wrong-reason guard.
- TC-3.4a client test preserves the full prior state object and asserts equality, not just presence.
- Server-side TC-3.4a "legibility" assertion is thin: only `messages.some((message) => message.entityType === 'process')).toBe(true)`. This proves a process entity was published during the session but does not assert the process payload is intact after execution failure. Adequate given the client layer covers the invariant in full.

### Mock audit

- `script-execution.service.test.ts`: uses `vi.fn(async () => result)` for `executeScript`. No external I/O. No hard-coded module paths that could silently miss real implementations.
- `process-live-updates.test.ts` (server execution tests): uses `buildExecutionFailureProvider` (inline ProviderAdapter object with success hydration and failed/succeeded `executeScript`). Hydration succeeds for TC-3.4a failure path — this correctly isolates execution failure from hydration failure.
- `process-environment-panel.test.ts`: uses JSDOM for DOM rendering. No mocks for the `deriveEnvironmentStatusLabel` function — tests the real function, which is appropriate.
- `process-live.test.ts`: tests the real `applyLiveProcessMessage` function against schema-validated fixture objects. No mocks at all — pure function test.

All mock boundaries match the test plan's Mock Boundaries table. No leaking mocks found.

---

## ARCHITECTURE_FINDINGS

### Execution service location

SATISFIED. `script-execution.service.ts` is at `apps/platform/server/services/processes/environment/script-execution.service.ts`. OBSERVED.

### Live publications

SATISFIED. All environment state publications use `this.processLiveHub.publish(...)` with typed `EnvironmentSummary` objects from the store. No raw provider fragments escape to the browser-facing publication. OBSERVED at `process-environment.service.ts:59-67, 141-148, 164-171, 182-189`.

### Story 2 hydration path preserved

SATISFIED. The `executeHydration` method still publishes `ready` and transitions to `running` before kicking off execution (lines 43-67). The execution path is layered on top via `runExecutionAsync` after the `ready` publication, preserving backward compatibility with all Story 2 tests. OBSERVED.

### Story 3 acceptance boundary

SATISFIED. Execution failure at `executeExecution:155-172` publishes `failed` with `blockedReason` but does not mutate `processes`, history items, or materials. The process surface published at the `ready` transition remains the last `process` upsert in the stream. OBSERVED.

### setTimeout(0) deviation soundness

The implementer's noted deviation: execution kickoff is deferred one event-loop turn via `setTimeout(0)` at `process-environment.service.ts:111-117`. This ensures that consumers polling the Convex store for `ready` state (e.g., a second browser tab or a reopen request in the same tick) will observe the durable `ready` row before the in-memory execution async lane begins advancing to `running`.

Assessment: SOUND. The external state sequence remains preparing → ready → running → checkpointing|failed. The deferral is a correctness guard, not a timing hack, and it is covered by TC-3.1a (server test explicitly awaits `ready` before checking for `running`). The test at line 654-661 uses `waitFor` with a polling check for `ready` before inspecting `running`, which correctly exercises the real async sequence. OBSERVED.

---

## SCOPE_BOUNDARY_CHECK

### Story 4 boundary — no canonical checkpoint writes

SATISFIED. `process-environment.service.ts` publishes `checkpointing` state but does NOT write `lastCheckpointResult`, does NOT call any artifact/code persistence function, and does NOT populate `lastCheckpointAt`. The word "checkpoint" in the implementation only appears as the environment `state` value. OBSERVED.

### Story 5 boundary — no rehydrate/rebuild mutations

SATISFIED. No calls to `rehydrateEnvironment`, `rebuildEnvironment`, or any Story 5 mutation pattern appear in the environment directory. OBSERVED.

### No new browser routes

SATISFIED. No new `/api/environments/*` routes introduced. `app.ts` change only wires `ScriptExecutionService` into the existing composition root. OBSERVED.

---

## BLOCKING_FINDINGS

None.

---

## NONBLOCKING_WARNINGS

### W-1: Two non-TC decided tests absent

**Severity:** MINOR
**Confidence:** HIGH
**Evidence:** Test plan section "tests/service/client/process-live.test.ts" lists two non-TC decided tests: `environment updates do not wipe unrelated history state` and `environment updates do not wipe unrelated materials state`. Neither is present in the file (grep confirms no match). The test plan table explicitly specifies 12 planned tests for `process-live.test.ts`; the file contains 22 tests total but the two Story 3 isolation tests are absent.
**Impact:** The pure environment-upsert isolation case (upsert where no failure occurs, only state changes) is not tested in isolation. The coverage intention from the test plan is partially met by TC-3.4a's failure-path check, but the failure path combines environment update with error state. A regression that causes environment upserts to wipe materials in the non-failure path would not be caught.
**Disproof attempt:** TC-3.4a at line 256-281 asserts history and materials survive a failure-path environment upsert. The `applyLiveProcessMessage` implementation at line 162-165 is the same code path for both failure and non-failure environment upserts, so the coverage is arguably equivalent. However the test plan intended these as separate explicit tests.
**Validation step:** Story 4 implementer may add these at next opportunity or accept the existing partial coverage.

### W-2: Server-side TC-3.4a legibility assertion is thin

**Severity:** MINOR
**Confidence:** HIGH
**Evidence:** `process-live-updates.test.ts:820` asserts only `messages.some((message) => message.entityType === 'process')).toBe(true)`, which proves a process message was published at some point during the session (it was, during the ready transition) but does not verify the process payload is intact after the execution failure.
**Impact:** A regression that corrupts the process payload on execution failure would not be caught at the server layer. The client-side TC-3.4a test covers this adequately.
**Disproof attempt:** The client test at line 256-281 fully verifies the invariant. The server test was presumably scoped to verifying the publication side rather than the client state preservation.
**Validation step:** Acceptable as-is given client layer covers the claim. Future Story 4 implementer may strengthen if desired.

### W-3: Execution failure fallback blockedReason untested

**Severity:** MINOR
**Confidence:** HIGH
**Evidence:** Green report residual risk: "Execution failures with no provider-supplied `failureReason` fall back to a generic blocked reason; that fallback is not explicitly covered by current tests." Implementation at `process-environment.service.ts:161`: `executionResult.failureReason ?? 'Execution failed.'` — the fallback string `'Execution failed.'` is not exercised by any test.
**Impact:** Low — the fallback is a simple null-coalescing expression on a field. A regression here would produce a slightly different error message, not a broken surface.
**Validation step:** Add a test with `failureReason: undefined` to `script-execution.service.test.ts` or `process-live-updates.test.ts` at next opportunity.

---

## UNRESOLVED

None.

---

## GATE_RESULT

**Command:** `corepack pnpm run verify 2>&1 | tail -40`

**Result: passed**

```
 Test Files  3 passed (3)
      Tests  9 passed (9)

 Test Files  11 passed (11)
      Tests  86 passed (86)

 Test Files  19 passed (19)
      Tests  135 passed (135)
```

Total: 33 test files, 230 tests, all green. Build also passes (built in 31ms).

---

## WHAT_ELSE

1. The `setTimeout(0)` approach works for the current in-process test harness and InMemoryProviderAdapter. When a real Daytona adapter is wired in (Story 2/3 provider implementation), the deferral provides a consistent seam but is not a guarantee if Convex write latency exceeds one event-loop turn. This is an acceptable in-process-first design decision; the durable state model means the client's bootstrap-first reconnect path will always observe the correct durable state.

2. The `FailingProviderAdapter` in `provider-adapter.ts` now fails on both `hydrateEnvironment` AND `executeScript`. Tests that need execution failure specifically use the inline `buildExecutionFailureProvider` which only fails on `executeScript`. The two adapter variants serve different purposes; the naming could be clearer, but the test coverage is correct.

3. The `app.ts` health route still reports `story: 'story-6-live-reconciliation-and-degradation'` — this is a cosmetic leftover from Story 6's prior implementation and does not affect Story 3 behavior.
