## SLICE_PLAN
Remove unused imports from `tests/service/client/process-live.test.ts` as reported by biome lint.

## FILES_CHANGED
- `tests/service/client/process-live.test.ts` — removed `environmentRunningUpsertLiveFixture` from the `live-process.js` import, and removed the entire `process-environment.js` import block (`preparingEnvironmentFixture`, `readyEnvironmentFixture`)

## TEST_COMMANDS
```
corepack pnpm exec biome lint tests/service/client/process-live.test.ts
```

## TEST_RESULTS
```
Checked 1 file in 3ms. No fixes applied.
```
No warnings or errors. Lint is clean.

## BLOCKERS
None.
