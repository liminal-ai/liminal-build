## SLICE_PLAN

Add `upsertProcessEnvironmentState` to the test doubles/mocks in the two target test files so the TypeScript compiler accepts them as valid `PlatformStore` implementations.

- `tests/service/server/processes-api.test.ts` — class-based `RecordingPlatformStore implements PlatformStore`
- `tests/service/server/auth-routes.test.ts` — inline object literal typed as `PlatformStore`

## FILES_CHANGED

### tests/service/server/processes-api.test.ts
- Added `import { type EnvironmentSummary }` to the shared-contracts import (needed for the method signature).
- Added `upsertProcessEnvironmentState` method to `RecordingPlatformStore` (lines 230-245).  
  Returns a spread of `defaultEnvironmentSummary` with the caller-supplied `state`, `environmentId`, `blockedReason`, and `lastHydratedAt`.

### tests/service/server/auth-routes.test.ts
- Added `upsertProcessEnvironmentState` to the inline `PlatformStore` object literal (lines 457-465).  
  Same shape: spreads `defaultEnvironmentSummary` and overrides the four mutable fields.

## TEST_COMMANDS

```
corepack pnpm exec tsc --noEmit -p tsconfig.json
```

## TEST_RESULTS

Exit code: 0 — no type errors.

## BLOCKERS

None.
