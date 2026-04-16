# Slice 4b Report — Story 2: TC-2.1a/b Assertion Cleanup

## SLICE_PLAN

Slice 4 already updated the four start/resume response fixtures to carry
`environment: preparingEnvironmentFixture` and added TC-2.6a/b/c as dedicated
environment-panel preparation tests. It also added an environment panel assertion to
TC-2.1a and TC-2.1b alongside the original generic `'Running'`/`nextActionLabel` body
assertions, using an intermediate variable with optional chaining (`?.textContent`).

This slice completes the TC-2.1a/b cleanup per the task requirement "assert visible
preparation state immediately after start/resume, not just generic process status text":

1. Remove the intermediate `environmentPanelAfterStart` / `environmentPanelAfterResume`
   queries (optional chaining made the assertion vacuously pass if the element was absent).
2. Remove the generic `body.textContent.toContain('Running')` and
   `body.textContent.toContain(nextActionLabel)` assertions from both tests.
3. Replace with a single direct `body.textContent.toContain('State: Preparing environment')`
   assertion in each test.

No fixture changes were needed — `startedProcessResponseFixture` and
`resumedPausedProcessResponseFixture` already carried `preparingEnvironmentFixture`
from slice 4.

## FILES_CHANGED

- `tests/service/client/process-work-surface-page.test.ts`
  - TC-2.1a: removed intermediate `environmentPanelAfterStart` query, removed
    `'Running'` and `nextActionLabel` body assertions, replaced with
    `body.textContent.toContain('State: Preparing environment')`
  - TC-2.1b: same cleanup — removed intermediate query, removed `'Running'` and
    `nextActionLabel` body assertions, replaced with
    `body.textContent.toContain('State: Preparing environment')`

- `tests/fixtures/process-surface.ts` — no changes (already correct from slice 4)

## TEST_COMMANDS

```
corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts --environment jsdom
```

## TEST_RESULTS

```
Test Files  1 passed (1)
     Tests  36 passed (36)
  Duration  630ms
```

All 36 tests pass. TC-2.1a and TC-2.1b now assert `'State: Preparing environment'`
directly on `body.textContent` — a real assertion that fails if the environment panel
does not render the preparing state after the action response is applied.

## BLOCKERS

None.
