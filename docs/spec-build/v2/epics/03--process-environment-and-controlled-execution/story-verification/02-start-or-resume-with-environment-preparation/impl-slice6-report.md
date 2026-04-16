# Slice 6 Implementation Report — Story 2 Hydration Planning Helper

## SLICE_PLAN

Introduce a minimal working-set planner that derives a hydration plan from current
process material refs and persists it during start/resume transitions to the
`preparing` environment state.  No provider adapters, no execution.

Steps:
1. Write 3 failing server tests (RED) — prove the behavior is not yet implemented.
2. Add `WorkingSetPlan` type + `getProcessHydrationPlan`/`setProcessHydrationPlan`
   to `PlatformStore` interface; implement in all three store classes.
3. Create `hydration-planner.ts` with pure `planHydrationWorkingSet` function.
4. Wire planner into `ProcessStartService.start` and `ProcessResumeService.resume`
   — called only when transitioning to `preparing` state.
5. Verify all 23 tests green; write report.

## FILES_CHANGED

| File | Change |
|------|--------|
| `tests/service/server/process-actions-api.test.ts` | +3 focused server tests (S2-HC-1, S2-HC-2, S2-HC-3) |
| `apps/platform/server/services/projects/platform-store.ts` | Added `WorkingSetPlan` interface; added `getProcessHydrationPlan` and `setProcessHydrationPlan` to `PlatformStore`, `NullPlatformStore`, `ConvexPlatformStore`, and `InMemoryPlatformStore` |
| `apps/platform/server/services/processes/environment/hydration-planner.ts` | New file — `planHydrationWorkingSet(refs)` pure function |
| `apps/platform/server/services/processes/process-start.service.ts` | Import planner; call `planHydrationWorkingSet` + `setProcessHydrationPlan` when entering preparing state |
| `apps/platform/server/services/processes/process-resume.service.ts` | Same as start service |

## TEST_COMMANDS

```
corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts --environment node
```

## TEST_RESULTS

```
 Test Files  1 passed (1)
      Tests  23 passed (23)   (20 pre-existing + 3 new)
   Start at  17:52:09
   Duration  364ms
```

New tests:
- **S2-HC-1** `start seeds hydration plan from current artifacts and sources` — PASS
- **S2-HC-2** `partial working set with only artifacts omits source attachment ids cleanly` — PASS
- **S2-HC-3** `partial working set with only sources omits artifact ids cleanly` — PASS

All 20 pre-existing tests continue to pass.

## BLOCKERS

None.  Slice is self-contained.  Provider adapter wiring (Daytona/local hydration
execution) is explicitly deferred to a later slice.
