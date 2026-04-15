# Verification Bundle: Story 6 Live Reconciliation and Degradation

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/06-live-reconciliation-and-degradation.md`
- `story base commit`: `7f3fcf3300ce2178013f05da5799fdbcedb13918`
- `story kind`: `standard`
- `implementation source`: local orchestrator implementation pass
- `final review`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/06-live-reconciliation-and-degradation/codex-review.md`
- `story gate`: `corepack pnpm run verify`

## Scope Claimed

Story 6 claims to deliver:

- real websocket subscription routing for process live updates
- typed live snapshot/upsert delivery for process, history, current request, materials, and side work
- durable bootstrap first, live subscription second
- visible state preserved during live failure or disconnect
- reconnect / retry path that reboots durable state and resubscribes
- live status UI without collapsing the process surface
- section-level degradation that leaves healthy sections visible
- reconnect-safe finalized-history dedupe

Story 6 explicitly does not claim:

- a distributed multi-process live fan-out layer
- deep subordinate-process inspection flows
- canonical archive derivation

## AC / TC Coverage Claimed

- `AC-2.2`: `TC-2.2a`, `TC-2.2b`
- `AC-2.3`: `TC-2.3a`, `TC-2.3b`
- `AC-6.1`: `TC-6.1a`, `TC-6.1b`
- `AC-6.2`: `TC-6.2a`, `TC-6.2b`
- `AC-6.3`: `TC-6.3a`, `TC-6.3b`
- `AC-6.5`: `TC-6.5a`, `TC-6.5b`
- `AC-6.6`: `TC-6.6a`, `TC-6.6b`, `TC-6.6c`

## Files Changed Against Story Base Commit

Modified:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/shell-app.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/package.json`
- `apps/platform/server/app.ts`
- `apps/platform/server/plugins/websocket.plugin.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/services/processes/live/process-live-hub.ts`
- `apps/platform/server/services/processes/process-response.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`

Added:

- `apps/platform/client/features/processes/process-live-status.ts`
- `apps/platform/server/services/processes/live/process-live-normalizer.ts`
- `tests/service/client/process-live-status.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `pnpm-lock.yaml`

## Tests Added Or Updated

- `tests/service/server/process-live-updates.test.ts`
  - websocket subscribe rejects unauthenticated access
  - websocket subscribe rejects inaccessible process access
  - websocket subscribe sends an immediate snapshot and carries later publications
- `tests/service/client/process-live-status.test.ts`
  - reconnecting status is visible
  - retry path is visible when live is unavailable
- `tests/service/client/process-work-surface-page.test.ts`
  - bootstrap stays usable when live setup fails
  - connection loss preserves visible state and shows reconnecting status
  - retry re-fetches durable state and reconciles latest process state without duplicating finalized history rows
- `tests/service/client/process-live.test.ts`
  - running state becomes visible during active work
  - phase change becomes visible while the process remains open
  - progress updates appear as readable process-facing activity
  - new activity inserts chronologically
  - reconnect snapshots do not duplicate finalized history items

## Gate Commands Run

- `corepack pnpm exec vitest run tests/service/server/process-live-updates.test.ts --environment node` -> `PASS`
- `corepack pnpm exec vitest run tests/service/client/process-live.test.ts tests/service/client/process-live-status.test.ts tests/service/client/process-work-surface-page.test.ts --environment jsdom` -> `PASS`
- `corepack pnpm run verify` -> `PASS`

## Claimed Residual Risks

- The live hub is currently in-memory by design. That is sufficient for the current single-process Fastify architecture and Story 6 scope, but would need rework for a distributed runtime.

## Claimed Spec Deviations

- `none claimed`
