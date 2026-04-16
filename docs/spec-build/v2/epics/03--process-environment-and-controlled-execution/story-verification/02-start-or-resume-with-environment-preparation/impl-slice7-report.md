## SLICE_PLAN

Extend the hydration working-set plan to include `outputIds` (current process outputs), alongside the existing `artifactIds` and `sourceAttachmentIds`. Update Story 2 server tests so TC-2.2a proves output IDs are captured when outputs are present on start, and TC-2.2b proves the plan carries an empty `outputIds` array when no outputs exist on resume. No provider execution changes.

TDD cycle:
1. Write TC-2.2a and TC-2.2b → run → verify RED (missing `outputIds` in plan).
2. Extend `WorkingSetPlan`, update store methods, update planner, update both services.
3. Update HC-1/HC-2/HC-3 assertions to include `outputIds: []`.
4. Run → verify GREEN (25/25).

## FILES_CHANGED

- `apps/platform/server/services/projects/platform-store.ts`
  - Added `outputIds: string[]` to `WorkingSetPlan` interface.
  - Updated `NullPlatformStore.setProcessHydrationPlan` to spread `outputIds`.
  - Updated `InMemoryPlatformStore.setProcessHydrationPlan` to spread `outputIds`.

- `apps/platform/server/services/processes/environment/hydration-planner.ts`
  - Exported `HydrationWorkingSetInput` (extends `CurrentProcessMaterialRefs` + `outputIds`).
  - Updated `planHydrationWorkingSet` to accept `HydrationWorkingSetInput` and return `outputIds` in plan.

- `apps/platform/server/services/processes/process-start.service.ts`
  - Parallel-fetches `getCurrentProcessMaterialRefs` and `listProcessOutputs` when environment preparation is required.
  - Passes `{ ...materialRefs, outputIds: currentOutputs.map(o => o.outputId) }` to planner.

- `apps/platform/server/services/processes/process-resume.service.ts`
  - Same parallel fetch and planner call as start service.

- `tests/service/server/process-actions-api.test.ts`
  - Added TC-2.2a: start with two outputs → plan contains both output IDs.
  - Added TC-2.2b: resume with no outputs → plan carries `outputIds: []`.
  - Updated HC-1, HC-2, HC-3 assertions to include `outputIds: []` (required by `toEqual` exact match).

## TEST_COMMANDS

```
corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts --environment node
```

## TEST_RESULTS

```
Test Files  1 passed (1)
     Tests  25 passed (25)
  Duration  402ms
```

All 25 tests pass including TC-2.2a, TC-2.2b, and the updated HC-1/HC-2/HC-3.

## BLOCKERS

None.
