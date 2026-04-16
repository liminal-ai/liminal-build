# Slice 5 — Story 2 Live/Store Explicit TC Coverage

## SLICE_PLAN

Make four Story 2 test criteria explicit in the live/store test suite:

- **TC-2.3a** hydration progress becomes visible through environment live updates
- **TC-2.3b** hydration failure becomes visible through environment live updates
- **TC-2.4a** running begins after readiness
- **TC-2.4b** running does not begin after failed preparation

The underlying `applyLiveProcessMessage` logic already handles all four behaviors. The work was:
1. Rename two existing unlabeled env tests to carry the correct TC-2.3a / TC-2.3b identifiers.
2. Strip incorrect TC-2.3a/b and TC-2.4a/b labels from history and process-state tests that had been mislabeled in a previous pass.
3. Add two new tests (TC-2.4a, TC-2.4b) exercising the environment ready→running and preparing→failed transitions via live fixtures.

## FILES_CHANGED

- `tests/service/client/process-live.test.ts`
  - Added imports: `environmentRunningUpsertLiveFixture` (live-process.js), `preparingEnvironmentFixture`, `readyEnvironmentFixture` (process-environment.js)
  - Renamed `'applies environment upserts as first-class current-object state'` → `'TC-2.3a hydration progress becomes visible through environment live updates'`
  - Renamed `'preserves checkpoint-result visibility on environment failure updates'` → `'TC-2.3b hydration failure becomes visible through environment live updates'`
  - Removed misapplied `TC-2.3a` / `TC-2.3b` prefixes from history-ordering tests
  - Removed misapplied `TC-2.4a` / `TC-2.4b` prefixes from process-state transition tests
  - Added `'TC-2.4a running begins after readiness'`: state with `readyEnvironmentFixture` + `environmentRunningUpsertLiveFixture` → env.state === 'running'
  - Added `'TC-2.4b running does not begin after failed preparation'`: state with `preparingEnvironmentFixture` + `environmentCheckpointFailureUpsertLiveFixture` → env.state === 'failed', blockedReason not null

No production code changes were required.

## TEST_COMMANDS

```
corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom
```

## TEST_RESULTS

```
 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  17:47:16
   Duration  416ms (transform 45ms, setup 0ms, import 80ms, tests 9ms, environment 240ms)
```

19 tests pass (17 pre-existing + 2 new).

## BLOCKERS

None.
