## SLICE_PLAN

When a process is started or resumed and environment work is required, both the `start` and `resume` service methods should:
1. Transition the environment state to `preparing` in-session (not leave it at `absent` or a prior stale state)
2. Return the `environment` field in the API response so the client can render visible preparation state immediately — rather than showing a generic `running` surface with no env context

For `start`: environment always begins preparing (start can only run from `draft`, where no env exists yet). Preserve `environmentId: null` since there is no prior env. If the action result is terminal (e.g. process short-circuited to `completed`), skip the upsert and return the existing env state.

For `resume`: environment always transitions to `preparing` when the result process is `running` or `waiting`, preserving `environmentId` and `lastHydratedAt` from the existing env record so prior hydration context is not lost. Terminal result statuses (`completed`, `failed`, `interrupted`) skip the upsert.

## FILES_CHANGED

- `apps/platform/server/services/processes/process-start.service.ts`
  - Changed unconditional `getProcessEnvironmentSummary` to conditional: upsert to `preparing` when `requiresEnvironmentPreparation(result.process.status)`, otherwise read existing.
  - Added `environment` to `startProcessResponseSchema.parse(...)` call.
  - Added `requiresEnvironmentPreparation` helper (returns true for `running` | `waiting`).

- `apps/platform/server/services/processes/process-resume.service.ts`
  - Replaced `getProcessEnvironmentSummary` (read-only) with fetch-then-conditional-upsert: reads `existingEnvironment` first, then upserts to `preparing` (preserving `environmentId` + `lastHydratedAt`) when `requiresEnvironmentPreparation(result.process.status)`.
  - Added `environment` to `resumeProcessResponseSchema.parse(...)` call.
  - Added `requiresEnvironmentPreparation` helper.

- `tests/service/server/process-actions-api.test.ts`
  - Updated "resume always enters environment preparing state" test: now asserts `environment.state = preparing` and `preparing`-specific disabled reasons for rehydrate/rebuild controls.
  - Added S2-TC-2.1a start slice (2 tests: inline response + bootstrap durability).
  - Added S2-TC-2.1b resume slice (2 tests: absent-env path + hydration-context preservation).
  - Added S2-TC-2.4b: terminal start result does not enter preparing state.

## TEST_COMMANDS

```sh
npx vitest run tests/service/server/process-actions-api.test.ts
```

## TEST_RESULTS

```
 Test Files  1 passed (1)
      Tests  20 passed (20)
   Duration  413ms
```

All 20 tests pass, including the 5 new tests covering the environment preparation slice.

## BLOCKERS

None.
