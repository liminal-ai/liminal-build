PER_ITEM_STATUS

- 1: done — Added `rehydrating` to the Epic 3 environment vocabulary table and control matrix.
- 2: done — Reworded epic text from writable repositories to writable sources / `accessMode: read_write`.
- 3: done — Changed Story 0 wording from error classes to error-code vocabulary on `AppError`.
- 4: done — Added durable `process_event` history appends/publications for preparation start, rebuild start, execution failure, and checkpoint settle.
- 5: done — TC-4.5b already existed and was already correctly labeled for the failing code-checkpoint path.
- 6: done — Strengthened TC-3.4a to assert env-aware process payload details and failed-environment legibility.
- 7: done — Added same-session env-aware regression coverage for both `start` and `respond`.
- 8: done — Added explicit `respond` / `review` control assertions for running and failed environment states.
- 9: done — Added a full integration chain for start → checkpoint → lost → rebuild → reopen.
- 10: done — Added explicit failed-with-null-`environmentId` live coverage for pre-provisioning hydration failure.
- 11: done — Added client live-materials coverage for a checkpoint-published artifact refresh.
- 13: done — Implemented real Convex hydration-plan persistence on `processEnvironmentStates`.
- 14: done — Replaced `ConvexPlatformStore.hasCanonicalRecoveryMaterials()` stub with a real current-material-ref check.
- 17: done — Wired non-null provider kind defaults through server config and first environment creation/update paths.
- 19: done — Renamed non-spec `TC-2.6*` client test labels to descriptive names.
- 20: done — Added the requested one-line `setTimeout(..., 0)` durability comment.
- 22: done — Added `environmentCompleteLiveFixture` to close the stale fixture/documentation gap.

FILES_CHANGED

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/00-foundation.md`: spec/story vocabulary alignment for `rehydrating`, writable-source wording, and `AppError` error-code language.
- `apps/platform/server/config.ts`, `apps/platform/server/app.ts`, `apps/platform/server/services/processes/process-start.service.ts`, `apps/platform/server/services/processes/process-resume.service.ts`: default environment provider kind plumbing so first environment creation no longer persists `null`.
- `apps/platform/server/services/processes/environment/process-environment.service.ts`: process-event history emission, checkpoint materials publication, provider-kind wiring, and execution-kickoff comment.
- `apps/platform/server/services/projects/platform-store.ts`: new history-append seam plus real Convex hydration-plan persistence and canonical-material checks.
- `convex/processEnvironmentStates.ts`, `convex/processHistoryItems.ts`, `convex/processes.ts`: durable `workingSetPlan` storage, history append mutation, and schema-compatible environment inserts.
- `convex/processEnvironmentStates.test.ts`: Convex durability coverage for hydration-plan persistence.
- `tests/service/server/process-actions-api.test.ts`, `tests/service/server/process-live-updates.test.ts`: env-aware action regressions and stronger live failure assertions.
- `tests/service/client/process-controls.test.ts`, `tests/service/client/process-live.test.ts`, `tests/service/client/process-work-surface-page.test.ts`: explicit control-matrix assertions, checkpoint materials refresh coverage, and TC-2.6 label cleanup.
- `tests/integration/process-work-surface.test.ts`: deep write → recovery → reopen integration coverage.
- `tests/fixtures/live-process.ts`: `environmentCompleteLiveFixture`.
- `tests/service/server/auth-routes.test.ts`, `tests/service/server/processes-api.test.ts`: test-double updates for the new `PlatformStore.appendProcessHistoryItem()` method.
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/epic-nit-fix-report.md`: required nit-fix batch report.

GATE_RESULT

```text
      Tests  13 passed (13)
   Start at  06:45:11
   Duration  173ms (transform 126ms, setup 0ms, import 210ms, tests 20ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  106 passed (106)
   Start at  06:45:12
   Duration  869ms (transform 1.24s, setup 0ms, import 3.25s, tests 1.02s, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  152 passed (152)
   Start at  06:45:13
   Duration  1.28s (transform 1.61s, setup 0ms, import 3.14s, tests 678ms, environment 10.39s)
```

ITEMS_SKIPPED_AND_WHY

- None.

NEW_TEST_COUNT

- 9

EPIC_NIT_FIX_SUMMARY: GATE=passed; ITEMS_DONE=17/17; NEW_TESTS_ADDED=9; ITEMS_SKIPPED=0
