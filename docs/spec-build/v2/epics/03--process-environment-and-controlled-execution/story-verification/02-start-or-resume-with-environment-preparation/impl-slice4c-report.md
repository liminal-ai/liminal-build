## SLICE_PLAN

Slice 4c: Wire start/resume response fixtures to `preparingEnvironmentFixture` and add environment-panel assertions to the two Story 2 in-session tests (TC-2.1a/TC-2.5a and TC-2.1b/TC-2.5b).

- Update `startedProcessResponseFixture`, `resumedPausedProcessResponseFixture`, and `resumedInterruptedProcessResponseFixture` in `tests/fixtures/process-surface.ts` to include `environment: preparingEnvironmentFixture`.
- Add environment-panel assertion (`State: Preparing environment`) to TC-2.1a/TC-2.5a and TC-2.1b/TC-2.5b in `tests/service/client/process-work-surface-page.test.ts`.

## FILES_CHANGED

- `tests/fixtures/process-surface.ts` — added `environment: preparingEnvironmentFixture` to `startedProcessResponseFixture`, `resumedPausedProcessResponseFixture`, and `resumedInterruptedProcessResponseFixture` (import was already present)
- `tests/service/client/process-work-surface-page.test.ts` — added `environmentPanelAfterStart` and `expect(environmentPanelAfterStart?.textContent).toContain('State: Preparing environment')` to TC-2.1a/TC-2.5a; added `environmentPanelAfterResume` and matching assertion to TC-2.1b/TC-2.5b

## TEST_COMMANDS

```
corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts --environment jsdom
```

## TEST_RESULTS

```
 Test Files  1 passed (1)
      Tests  36 passed (36)
   Start at  17:40:42
   Duration  651ms (transform 88ms, setup 0ms, import 135ms, tests 199ms, environment 236ms)
```

All 36 tests pass, including TC-2.1a/TC-2.5a, TC-2.1b/TC-2.5b, and the pre-existing TC-2.6a/TC-2.6b/TC-2.6c environment-panel tests.

## BLOCKERS

None.
