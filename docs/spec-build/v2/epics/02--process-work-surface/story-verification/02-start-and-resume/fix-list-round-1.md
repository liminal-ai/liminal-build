# Story 2 Fix List Round 1

Source reviews:

- `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.md`
- `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/cursor-review.md`

## Must Fix

### 1. Handle stale-action `409 PROCESS_ACTION_NOT_AVAILABLE` coherently on the client

Why:

- both verifier lanes flagged this as the strongest concrete issue
- the epic/request-level contract says this should show an inline action error and keep the current surface visible
- current start/resume handlers do not appear to catch `ApiRequestError` and surface a coherent inline error path

Required changes:

- catch start/resume `ApiRequestError` failures in the client flow
- preserve the current process surface instead of throwing away state
- render an inline / in-surface action error for `PROCESS_ACTION_NOT_AVAILABLE`
- add client test coverage for the rejected start/resume path

### 2. Strengthen Story 2 evidence for AC-2.4 resulting-state visibility

Why:

- both lanes found current AC-2.4 proof weaker than the happy-path start/resume proof
- current evidence leans heavily on reducer-level tests
- the `paused` settled-state branch is missing from the current reducer test matrix

Required changes:

- add the missing `paused` settled-state coverage at the reducer/store level if Story 2 still owns that state in scope
- add stronger proof that resulting post-action state is visible/coherent at the page or accepted Story 2 boundary
- if Story 2 intentionally only guarantees the returned action payload and not later settled states without Story 6, make that deferral explicit rather than implied

## Likely Best Resolution Path

Preferred:

- implement the client-side 409 handling
- add the missing paused-state coverage
- clarify and tighten Story 2's actual “resulting state” contract in code/tests so verification can distinguish what Story 2 owns vs what Story 6 owns

## Constraints

- stay within Story 2 scope
- do not implement response submission from Story 3
- do not implement full Story 6 live transport/reconnect
- rerun the Story 2 gate:
  - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
