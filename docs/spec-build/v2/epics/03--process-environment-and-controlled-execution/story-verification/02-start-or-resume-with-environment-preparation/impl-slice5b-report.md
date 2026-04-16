## SLICE_PLAN
Add `environmentFailedUpsertLiveFixture` (plain preparation failure, no checkpoint) to
`tests/fixtures/live-process.ts` and update the four Story 2 live-layer TCs to use
semantically precise fixtures and sequential state-progression patterns.

**Scenario → TC mapping:**
- hydration progress becomes visible → TC-2.3a (already correct, no change needed)
- hydration failure becomes visible → TC-2.3b (was using checkpoint failure; replaced with
  plain `failedEnvironmentFixture`)
- running appears only after readiness → TC-2.4a (replaced single-step ready→running test
  with explicit `preparing → ready → running` sequence with intermediate assertions)
- running does not appear after failed preparation → TC-2.4b (was using checkpoint failure
  from a pre-set preparing state; replaced with sequential `preparing → failed` using plain
  failure fixture, explicitly asserting state is `'failed'` and not `'running'`)

TDD process followed: tests updated to import non-existent `environmentFailedUpsertLiveFixture`
first (RED — 2 failures), then fixture added (GREEN — all 19 pass).

## FILES_CHANGED
- `tests/fixtures/live-process.ts`
  - Added `failedEnvironmentFixture` to import from `./process-environment.js`
  - Exported `environmentFailedUpsertLiveFixture` (seq 19, plain preparation failure,
    no checkpoint result)
- `tests/service/client/process-live.test.ts`
  - Removed `environmentCheckpointFailureUpsertLiveFixture` import (no longer used)
  - Added `environmentFailedUpsertLiveFixture`, `environmentReadyUpsertLiveFixture` imports
  - Removed `process-environment.js` import block (fixtures no longer needed directly)
  - TC-2.3b: now uses `environmentFailedUpsertLiveFixture`; asserts `state: 'failed'`,
    `blockedReason` contains 'Preparation failed', `lastCheckpointResult: null`
  - TC-2.4a: replaced single `ready → running` step with three-step sequence
    `preparing → ready → running`, asserting intermediate states
  - TC-2.4b: replaced pre-set starting state with sequential `preparing → failed` using
    `environmentFailedUpsertLiveFixture`; asserts `state !== 'running'` and
    `blockedReason !== null`

## TEST_COMMANDS
```
corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom
```

## TEST_RESULTS
```
 RUN  v4.1.4 /Users/leemoore/code/liminal-build

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  17:51:47
   Duration  377ms (transform 40ms, setup 0ms, import 75ms, tests 9ms, environment 218ms)
```

Biome lint: `Checked 2 files in 3ms. No fixes applied.`

## BLOCKERS
None.
