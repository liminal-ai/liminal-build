# Codex Fix Routing Round 1: Story 4 Materials and Outputs

## Files Changed

- [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts)
- [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts)
- [processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts)
- [processOutputs.ts](/Users/leemoore/code/liminal-build/convex/processOutputs.ts)
- [processProductDefinitionStates.ts](/Users/leemoore/code/liminal-build/convex/processProductDefinitionStates.ts)
- [processFeatureSpecificationStates.ts](/Users/leemoore/code/liminal-build/convex/processFeatureSpecificationStates.ts)
- [processFeatureImplementationStates.ts](/Users/leemoore/code/liminal-build/convex/processFeatureImplementationStates.ts)
- [process-work-surface-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-work-surface-api.test.ts)
- [processes-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/processes-api.test.ts)
- [auth-routes.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/auth-routes.test.ts)

## Fix Outcome

- Durable bootstrap no longer derives materials from every process-scoped row. It now reads `currentArtifactIds` and `currentSourceAttachmentIds` from the process-type state row through a new `getCurrentProcessMaterialRefs` path, so stale old materials do not return on bootstrap and referenced project-scoped/shared materials can surface as current.
- Output/artifact dedupe now uses `linkedArtifactId` from durable process outputs. The reader suppresses a published output only when that real link points at a current artifact; unlinked label collisions remain visible, and linked pairs still dedupe even if display labels drift.
- Server/API coverage now exercises stale-material clearing, shared/project-scoped materials surfacing as current, and linkage-based dedupe at the bootstrap/read path.

## Gate

- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
- `red-verify` -> `PASS`
- `test:service` -> `PASS` (`8` files / `54` tests)
- `test:client` -> `PASS` (`14` files / `87` tests)

## Residual Risks

- The new current-material ref arrays were added as optional widen-only schema fields, so older process-state rows without populated refs will read as empty materials until they are written or backfilled.
- No Story 5 or Story 6 behavior was introduced; this remains scoped to Story 4 bootstrap/materials semantics and server/API proof.
