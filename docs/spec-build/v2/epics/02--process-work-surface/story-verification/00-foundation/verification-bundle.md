# Verification Bundle: Story 0 Foundation

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/00-foundation.md`
- `story base commit`: `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`
- `story kind`: `foundation`
- `lane used`: `Codex gpt-5.4 xhigh`
- `story gate`: `corepack pnpm run typecheck && corepack pnpm run build`

## Scope Claimed

Story 0 does not own end-user ACs or TCs from the epic.

The implementation claims to establish shared foundations for:

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

## Future Story Consumers Claimed

- Story 1: route model, bootstrap response/envelope contracts, process route scaffolding, direct-route test helpers
- Stories 2-3: start/resume/respond response contracts, live-update vocabulary, live reducer and fixtures
- Story 4: materials/output/source contracts and output table skeletons
- Story 5: side-work contracts and side-work table skeletons
- Story 6: reconnect/live status vocabulary, durable history/current-request pointering, live-state fixtures

## Files Changed

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

Added:

- `apps/platform/shared/contracts/process-work-surface.ts`
- `apps/platform/shared/contracts/live-process-updates.ts`
- `apps/platform/client/app/process-live.ts`
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

## Changed-File Manifest Against Story Base Commit

```text
Modified
apps/platform/shared/contracts/schemas.ts
apps/platform/shared/contracts/index.ts
apps/platform/shared/contracts/state.ts
apps/platform/client/app/router.ts
apps/platform/client/app/store.ts
apps/platform/client/app/bootstrap.ts
apps/platform/server/app.ts
convex/processes.ts
convex/schema.ts
tests/utils/render-shell.ts

Added
apps/platform/shared/contracts/process-work-surface.ts
apps/platform/shared/contracts/live-process-updates.ts
apps/platform/client/app/process-live.ts
apps/platform/server/plugins/websocket.plugin.ts
apps/platform/server/routes/processes.ts
apps/platform/server/services/processes/live/process-live-hub.ts
apps/platform/server/services/processes/process-work-surface.service.ts
apps/platform/server/services/processes/process-module-registry.ts
convex/processHistoryItems.ts
convex/processSideWorkItems.ts
convex/processOutputs.ts
tests/fixtures/process-history.ts
tests/fixtures/materials.ts
tests/fixtures/side-work.ts
tests/fixtures/process-surface.ts
tests/fixtures/live-process.ts
```

## Tests Added Or Updated

- `none`

Rationale claimed by implementer:

- Story 0 is scaffolding-only in the test plan
- Chunk 0 is specified as `0` TC tests and `0` non-TC tests
- exit criteria are typecheck/build, not executable behavior tests

## Exact Changed Test Files

- `none`

## Gate Commands Run

- `corepack pnpm run typecheck` -> `PASS`
- `corepack pnpm run build` -> `PASS`

## Claimed Residual Risks

- process route is recognized in route/store state, but Story 1 process-surface page/bootstrap behavior remains intentionally unimplemented
- websocket/plugin layer is scaffold-only and does not provide real transport behavior yet
- Convex schema skeletons exist, but Epic 2 queries/mutations are not implemented yet

## Claimed Spec Deviations

- none in the shared contract surface
- intentional story-boundary choice: process websocket/process-route files are scaffolds, not user-visible process APIs or live transport behavior

## Claimed Open Questions

- `none`

## Orchestrator Notes For Verifiers

- This is a foundation story, so verification should focus on contract correctness, architecture alignment, scope discipline, and whether the new seams genuinely support later stories without leaking Story 1+ behavior.
- One likely scrutiny point is `convex/processes.ts`, which was modified for `currentRequestHistoryItemId` but still contains older scaffold patterns (`queryGeneric`/`mutationGeneric`, `ctx: any`, unbounded `.collect()`, duplicate project-updated indexes). Verifiers should check whether Story 0 should already normalize that file to Epic 2’s stricter Convex guidance because the file was modified in this story.
