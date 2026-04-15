# Verification Bundle: Story 1 Process Entry and Bootstrap

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/01-process-entry-and-bootstrap.md`
- `story base commit`: `f97509a75b051a4434cedf6e74f9e85ea333a5a0`
- `story kind`: `standard`
- `lane used`: `Codex gpt-5.4 xhigh`
- `story gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`

## Scope Claimed

Story 1 claims to deliver:

- dedicated process route open from project shell and direct URL
- dedicated process HTML route and bootstrap API
- dedicated client process bootstrap branch instead of shell fallthrough
- process work-surface page rendering for:
  - active project identity
  - active process identity
  - phase and status
  - next action / blocker
  - history section
  - materials section
  - current request
  - side-work section
- unavailable / forbidden process entry handling without leaking process content
- stable top-level section envelope shapes across `ready`, `empty`, and `error`

Story 1 explicitly does not claim:

- start / resume actions
- live streaming behavior
- response submission
- reconnect or degradation beyond bootstrap-time unavailable handling

## AC / TC Coverage Claimed

- `AC-1.1`: `TC-1.1a`, `TC-1.1b`
- `AC-1.2`: `TC-1.2a`
- `AC-1.3`: `TC-1.3a`, `TC-1.3b`
- `AC-1.4`: `TC-1.4a`, `TC-1.4b`
- `AC-6.4`: `TC-6.4a`, `TC-6.4b`

## Files Changed Against Story Base Commit

Modified:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/process-live.ts`
- `apps/platform/client/app/shell-app.ts`
- `apps/platform/client/features/projects/process-section.ts`
- `apps/platform/client/features/projects/project-shell-page.ts`
- `apps/platform/client/features/projects/unavailable-state.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/plugins/websocket.plugin.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/services/processes/process-module-registry.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/live-process-updates.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processHistoryItems.ts`
- `convex/processOutputs.ts`
- `convex/processSideWorkItems.ts`
- `convex/processes.ts`
- `tests/service/client/project-shell-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `apps/platform/client/browser-api/process-work-surface-api.ts`
- `apps/platform/client/features/processes/current-request-panel.ts`
- `apps/platform/client/features/processes/process-history-section.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/client/features/processes/side-work-section.ts`
- `apps/platform/server/schemas/processes.ts`
- `apps/platform/server/services/processes/process-access.service.ts`
- `apps/platform/server/services/processes/readers/history-section.reader.ts`
- `apps/platform/server/services/processes/readers/materials-section.reader.ts`
- `apps/platform/server/services/processes/readers/side-work-section.reader.ts`
- `tests/service/client/process-history-section.test.ts`
- `tests/service/client/process-router.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-html-routes.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`

## Changed Test Files

Modified:

- `tests/service/client/project-shell-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `tests/service/client/process-history-section.test.ts`
- `tests/service/client/process-router.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-html-routes.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`

## Tests Added Or Updated

Client:

- `tests/service/client/process-router.test.ts`
  - process open from shell navigates to dedicated process route
  - direct process URL mounts process work surface
  - reload preserves current process route
  - missing / forbidden process route renders safe unavailable state
- `tests/service/client/process-work-surface-page.test.ts`
  - active project/process identity shown
  - next action and blocker visible
  - history/materials/side-work render together
  - unavailable state does not leak stale content
- `tests/service/client/process-history-section.test.ts`
  - empty history renders clear early-state view
- `tests/service/client/project-shell-page.test.ts`
  - shell exposes the process open path

Server:

- `tests/service/server/process-html-routes.test.ts`
  - authenticated process route shell delivery
  - direct process route shell delivery
  - missing process unavailable shell
  - forbidden process unavailable shell
- `tests/service/server/process-work-surface-api.test.ts`
  - populated bootstrap response
  - early empty envelope response
  - forbidden response omits project data
  - independent section-error envelopes preserve core surface
- `tests/service/server/processes-api.test.ts`
  - expanded to cover Story 1 process bootstrap route behavior
- `tests/service/server/auth-routes.test.ts`
  - updated to satisfy app/service wiring after Story 1 additions

## Gate Commands Run

- `corepack pnpm run red-verify` -> `PASS`
- `corepack pnpm run test:service` -> `PASS`
- `corepack pnpm run test:client` -> `PASS`
- exact acceptance command:
  - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`

## Claimed Residual Risks

- `currentRequest` durable projection is conservative:
  - `requestKind` currently defaults to `'other'`
  - `requiredActionLabel` currently derives from `process.nextActionLabel`
- the Convex layer still bridges string route params into existing id-boundary patterns

## Claimed Spec Deviations

- richer `currentRequest` metadata is not yet durably stored as first-class request fields
- current request projection is temporarily conservative from existing process + history state

## Claimed Open Questions

- whether `requestKind` and `requiredActionLabel` should become explicit durable fields on request-bearing history rows in the next process-conversation slice, or live in process-specific state instead

## Orchestrator Notes For Verifiers

- Story 1 is the first full vertical slice after Story 0 foundation.
- Highest-signal checks:
  - process routes no longer fall through to project-shell bootstrap
  - unavailable handling does not leak process content
  - section envelopes stay stable across `ready`, `empty`, and `error`
  - Story 1 does not quietly drift into Story 2+ behavior
  - the conservative `currentRequest` projection does not violate Story 1 contract enough to require immediate correction
