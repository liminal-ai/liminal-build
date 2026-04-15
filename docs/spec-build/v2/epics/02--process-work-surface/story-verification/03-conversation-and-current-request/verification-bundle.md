# Verification Bundle: Story 3 Conversation and Current Request

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/03-conversation-and-current-request.md`
- `story base commit`: `3d3f3449137e5c74fa7709f5cc5d327b587094dd`
- `story kind`: `standard`
- `implementation source`: Codex CLI implementer round 1
- `implementer report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/03-conversation-and-current-request/codex-impl-round-1.md`
- `implementer jsonl`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/03-conversation-and-current-request/codex-impl-round-1.jsonl`
- `story gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`

## Scope Claimed

Story 3 claims to deliver:

- response submission from the process work surface
- durable accepted user responses in visible process history
- pinned unresolved `currentRequest` visibility until resolved or superseded
- same-session updates after successful response submission
- invalid or failed submissions rejected without partial visible history
- visible distinction between routine progress and attention-required requests

Story 3 explicitly does not claim:

- Story 4 materials or output revision context
- Story 5 side-work visibility beyond history-level references
- Story 6 live reconnect or degraded transport behavior

## AC / TC Coverage Claimed

- `AC-3.1`: `TC-3.1a`, `TC-3.1b`
- `AC-3.2`: `TC-3.2a`, `TC-3.2b`
- `AC-3.3`: `TC-3.3a`, `TC-3.3b`
- `AC-3.4`: `TC-3.4a`, `TC-3.4b`
- `AC-3.5`: `TC-3.5a`, `TC-3.5b`
- `AC-3.6`: `TC-3.6a`, `TC-3.6b`
- `AC-5.1`: `TC-5.1a`, `TC-5.1b`
- `AC-5.2`: `TC-5.2a`, `TC-5.2b`

## Files Changed Against Story Base Commit

Modified:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/shell-app.ts`
- `apps/platform/client/browser-api/process-work-surface-api.ts`
- `apps/platform/client/features/processes/current-request-panel.ts`
- `apps/platform/client/features/processes/process-history-section.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/schemas/processes.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `convex/processes.ts`
- `convex/schema.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-history-section.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `apps/platform/client/features/processes/process-response-composer.ts`
- `apps/platform/server/services/processes/process-response.service.ts`
- `tests/integration/process-work-surface.test.ts`
- `tests/service/client/current-request-panel.test.ts`
- `tests/service/client/process-response-composer.test.ts`

## Changed Test Files

Modified:

- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-history-section.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Added:

- `tests/integration/process-work-surface.test.ts`
- `tests/service/client/current-request-panel.test.ts`
- `tests/service/client/process-response-composer.test.ts`

## Tests Added Or Updated

- `tests/service/server/process-work-surface-api.test.ts`
  - durable visible history and current-request bootstrap behavior after Story 3 changes
- `tests/service/server/processes-api.test.ts`
  - response submission API behavior
- `tests/service/server/auth-routes.test.ts`
  - auth redirect or auth failure behavior on response submission path
- `tests/service/server/process-actions-api.test.ts`
  - Story 2 action behavior remains intact after Story 3 additions
- `tests/service/client/process-work-surface-page.test.ts`
  - same-session response submission updates
  - invalid or failed submission behavior without partial history
  - non-interactive states do not present a false reply affordance
- `tests/service/client/current-request-panel.test.ts`
  - unresolved current-request visibility and attention-required rendering
- `tests/service/client/process-history-section.test.ts`
  - routine progress versus attention-required history distinction
- `tests/service/client/process-response-composer.test.ts`
  - response composer validation and submit-state behavior
- `tests/integration/process-work-surface.test.ts`
  - end-to-end-ish process work-surface response flow in the repo’s current integration harness

## Gate Commands Run By Implementer

- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
- `corepack pnpm run test:integration` -> `PASS`

## Claimed Residual Risks

- The default production Convex response path is still generic: it clears `currentRequest` and returns the process to `running`, while process-specific follow-up request generation is only covered through in-memory/test overrides.
- Story 3 same-session correctness is delivered via the response payload plus immediate client-store patch, not a Story 3-specific live publish path.

## Claimed Spec Deviations

- `none claimed`

## Claimed Open Questions

- `none claimed`

## Orchestrator Notes For Verifiers

- Highest-signal checks:
  - successful response submission writes durable visible history and updates `currentRequest` coherently
  - invalid or failed submissions do not create partial history
  - the UI does not show a false waiting/reply state during non-interactive or completed states
  - history distinguishes routine progress from attention-required requests clearly enough for Story 3 / AC-5.1 / AC-5.2 scope
  - Story 3 does not smuggle in Story 4 materials behavior or Story 6 live reconnect behavior
