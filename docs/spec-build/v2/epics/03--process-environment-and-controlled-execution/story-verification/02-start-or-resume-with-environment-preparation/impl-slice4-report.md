# Slice 4 Report — Story 2: In-Session Preparation Visibility After Start/Resume

## SLICE_PLAN

Goal: make client-side preparation visibility explicit after start/resume by proving the
environment panel reflects `preparing` state immediately when the action response carries it —
no manual refresh required.

Server already returns `environment: { state: 'preparing' }` for running/waiting outcomes
(process-start.service.ts, process-resume.service.ts). Client already patches
`environment: response.environment` into the store via `applyProcessActionResponse`
(bootstrap.ts:347–354). The gap was:

1. Fixtures for start/resume responses were defaulting to `absent` environment.
2. No client tests proved the environment panel updated in-session after clicking Start/Resume.

Approach (TDD):
- Write 3 failing tests first (RED) asserting "State: Preparing environment" in the
  environment panel after Start/Resume clicks.
- Update the 4 affected fixtures to carry `preparingEnvironmentFixture` (GREEN).

## FILES_CHANGED

- `tests/fixtures/process-surface.ts`
  - `startedProcessResponseFixture` — added `environment: preparingEnvironmentFixture`
  - `startedWaitingProcessResponseFixture` — added `environment: preparingEnvironmentFixture`
  - `resumedPausedProcessResponseFixture` — added `environment: preparingEnvironmentFixture`
  - `resumedInterruptedProcessResponseFixture` — added `environment: preparingEnvironmentFixture`

- `tests/service/client/process-work-surface-page.test.ts`
  - Added `TC-2.6a`: Start → environment panel shows "State: Preparing environment" in-session
  - Added `TC-2.6b`: Resume from paused → environment panel shows "State: Preparing environment" in-session
  - Added `TC-2.6c`: Resume from interrupted → environment panel shows "State: Preparing environment" in-session

No production code changes were required. The wiring already existed; the fixtures and
tests were the missing layer.

## TEST_COMMANDS

```
corepack pnpm vitest run tests/service/client/process-work-surface-page.test.ts
corepack pnpm vitest run tests/service/client/process-live.test.ts
```

## TEST_RESULTS

`process-work-surface-page.test.ts`:
- 21 passed (18 pre-existing + 3 new TC-2.6a/b/c)
- 15 failed (pre-existing `document is not defined` — test environment does not inject globals
  for the synchronous `renderProcessWorkSurfacePage` tests; unrelated to this slice)

`process-live.test.ts`:
- 17 passed (no regressions)

RED verification confirmed: before fixture update, TC-2.6a/b/c all failed with
`expected 'EnvironmentState: Not prepared' to contain 'State: Preparing environment'` —
the correct failure for a missing fixture value, not a code path bug.

GREEN: after adding `environment: preparingEnvironmentFixture` to the 4 fixtures, all 3
new tests pass with no new regressions.

## BLOCKERS

None. The 15 pre-existing failures (`document is not defined`) are in synchronous unit
tests that use global `document`/`window` without a JSDOM environment. They predate this
slice and are not introduced by these changes.
