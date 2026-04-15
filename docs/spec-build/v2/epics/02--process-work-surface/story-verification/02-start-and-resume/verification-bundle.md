# Verification Bundle: Story 2 Start and Resume

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/02-start-and-resume.md`
- `story base commit`: `7308d84e6825f1558a0211b666fa71aebdbec119`
- `story kind`: `standard`
- `implementation source`: Story 2 implementer report from agent `019d8f1a-a2a3-7471-8c0f-8202af22353d` plus Codex CLI fix-routing rounds 1 and 3
- `story gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`

## Scope Claimed

Story 2 claims to deliver:

- start draft process from the work surface
- resume paused and interrupted process from the work surface
- same-session state updates from action response payloads
- resulting waiting / paused / completed / failed / interrupted visible state rendering
- action-availability enforcement for invalid start/resume states

Story 2 explicitly does not claim:

- response submission
- materials revision visibility beyond existing Story 1 behavior
- side-work visibility expansion
- live transport / reconnect / degraded-state recovery

## AC / TC Coverage Claimed

- `AC-2.1`: `TC-2.1a`, `TC-2.1b`, `TC-2.1c`
- `AC-2.4`: `TC-2.4a`, `TC-2.4b`, `TC-2.4c`
- `AC-2.5`: `TC-2.5a`, `TC-2.5b`

## Files Changed Against Story Base Commit

Modified:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/shell-app.ts`
- `apps/platform/client/app/store.ts`
- `apps/platform/client/browser-api/process-work-surface-api.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/schemas/processes.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/schemas.ts`
- `apps/platform/shared/contracts/state.ts`
- `convex/processes.ts`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `tests/service/server/process-actions-api.test.ts`

## Changed Test Files

Modified:

- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `tests/service/server/process-actions-api.test.ts`

## Tests Added Or Updated

- `tests/service/server/process-actions-api.test.ts`
  - start draft process
  - resume paused process
  - resume interrupted process
  - returned waiting plus `currentRequest` survives through `POST` and follow-up `GET`
  - returned completed and failed outcomes survive through `POST` and follow-up `GET`
  - invalid start/resume availability returns `PROCESS_ACTION_NOT_AVAILABLE`
- `tests/service/client/process-work-surface-page.test.ts`
  - clicking start applies returned state without manual refresh
  - clicking resume on paused / interrupted process applies returned state without manual refresh
  - stale `PROCESS_ACTION_NOT_AVAILABLE` responses preserve the current surface and render inline feedback
  - `UNAUTHENTICATED`, `PROJECT_FORBIDDEN`, `PROJECT_NOT_FOUND`, `PROCESS_NOT_FOUND`, and unexpected failures recover coherently in-session without dropped async rejections
  - resulting waiting / completed / failed states are visible at the Story 2 action boundary
  - action buttons only appear when the corresponding action is available
- `tests/service/client/process-live.test.ts`
  - waiting / paused / completed / failed / interrupted state transitions remain coherent in the reducer/store layer

## Gate Commands Run By Implementer And Fix Routing

- `corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts` -> `PASS`
- `corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts --environment jsdom` -> `PASS`
- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`

## Fix Routing Through Round 3

- `round 1`: added inline stale-action handling plus stronger page/reducer visibility proof
- `replacement codex review`: still found two blockers
  - non-409 start/resume failures escaped as dropped async rejections
  - AC-2.4 proof was too fixture-driven at the server/action boundary
- `round 2`: superseded because the first follow-up fix prompt only targeted the async failure blocker
- `round 3`: fixed both verified blockers
  - `bootstrap.ts` now handles `401`, `403`, `404`, `409`, and unexpected action failures through bounded in-session recovery paths
  - `process-work-surface-api.ts` now falls back to typed request errors when action endpoints return malformed or empty error bodies
  - `platform-store.ts` and `process-actions-api.test.ts` now prove waiting/current-request, completed, and failed outcomes through the real `POST` action boundary and follow-up `GET` bootstrap state
- `round 3 report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-3.md`

## Claimed Residual Risks

- Story 2 now proves action-response coherence and reducer visibility, but live transport / reconnect behavior remains a Story 6 concern
- Story 3 response submission and Story 6 live transport remain intentionally out of scope

## Claimed Spec Deviations

- `none`

## Claimed Open Questions

- `none`

## Orchestrator Notes For Verifiers

- Highest-signal checks:
  - start/resume action availability enforcement is correct
  - same-session updates come from returned action payloads rather than hidden bootstrap refetches or fake live behavior
  - non-409 action failures do not escape as dropped async rejections
  - richer waiting / completed / failed action outcomes are proven at the real route/service/store boundary, not only with client fixtures
  - resulting visible states are coherent without drifting into Story 3 or Story 6 scope
  - new durable action paths do not regress Story 1 process-surface bootstrap correctness
