# Verification Bundle: Story 0 Foundation Round 2

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/00-foundation.md`
- `story base commit`: `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`
- `story kind`: `foundation`
- `lane used`: `Codex gpt-5.4 xhigh`
- `story gate`: `corepack pnpm run typecheck && corepack pnpm run build`
- `fix list resolved from round 1`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/fix-list-round-1.md`

## Scope Claimed

Story 0 remains a foundation-only story. The current claim set is:

- dedicated process route and endpoint vocabulary
- process work-surface shared contracts
- live-update message schemas
- `processSurface` store state
- route parsing/building for `/projects/:projectId/processes/:processId`
- pure live-message apply helper
- server websocket/process route/service scaffolds
- Convex Epic 2 table/schema skeletons
- reusable fixtures for history, materials, side work, process surface, and live messages
- render helper support for non-`/projects` bootstraps

Round 2 also claims:

- touched `convex/processes.ts` now meets the Epic 2 normalization bar for this story
- duplicate `processes` index removed
- live foundation no longer ships or accepts a cross-process `process` upsert as a valid example
- one regression test locks the live-foundation fix in place

## Files Changed From Story Base Commit

Modified:

- `apps/platform/shared/contracts/schemas.ts`
- `apps/platform/shared/contracts/index.ts`
- `apps/platform/shared/contracts/state.ts`
- `apps/platform/client/app/router.ts`
- `apps/platform/client/app/store.ts`
- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/server/app.ts`
- `convex/processes.ts`
- `convex/schema.ts`
- `tests/utils/render-shell.ts`
- `apps/platform/shared/contracts/live-process-updates.ts`
- `apps/platform/client/app/process-live.ts`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`

Added:

- `apps/platform/shared/contracts/process-work-surface.ts`
- `apps/platform/server/plugins/websocket.plugin.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/services/processes/live/process-live-hub.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/processes/process-module-registry.ts`
- `convex/processHistoryItems.ts`
- `convex/processSideWorkItems.ts`
- `convex/processOutputs.ts`
- `tests/fixtures/process-history.ts`
- `tests/fixtures/materials.ts`
- `tests/fixtures/side-work.ts`
- `tests/fixtures/process-surface.ts`
- `tests/fixtures/live-process.ts`
- `tests/service/client/process-live.test.ts`

## Changed Test Files

- `tests/service/client/process-live.test.ts`

## Tests Added Or Updated

- `tests/service/client/process-live.test.ts`
  - rejects mismatched top-level `processId` vs payload `processId` for `process` live messages
  - ignores a `process` live message for another process surface

## Gate Commands Run

- `corepack pnpm run typecheck` -> `PASS`
- `corepack pnpm run build` -> `PASS`

## Claimed Residual Risks

- `convex/processes.ts` still uses string-based `projectId` args/fields inherited from existing repo patterns; this fix round did not broaden into a project-id migration
- the stricter live consistency check is currently specific to `entityType: 'process'`
- websocket/process route scaffolds remain foundation-only and do not implement Story 1 behavior

## Claimed Spec Deviations

- `none`

## Claimed Open Questions

- `none`

## Orchestrator Notes For Verifiers

- Round 1 verification found two issues worth fixing:
  - modified `convex/processes.ts` still preserved the old Convex debt patterns
  - the live foundation allowed a cross-process `process` upsert through schema/fixtures/reducer behavior
- Round 2 should verify those are now actually closed, not merely rearranged.
