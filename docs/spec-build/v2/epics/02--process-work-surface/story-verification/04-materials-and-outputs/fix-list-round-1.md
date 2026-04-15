# Fix List Round 1: Story 4 Materials and Outputs

## Blocking Findings

### 1. Durable bootstrap does not derive truly current materials

- Severity: `HIGH`
- Evidence:
  - [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:22)
  - [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:64)
  - [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:89)
- Problem:
  - the reader filters by `processId` only and does not derive “current phase-relevant” materials from phase/focus-specific refs
  - stale prior process materials can reappear after reload/return-later
  - relevant project-scoped shared materials cannot appear as current process materials
- Required fix:
  - derive current materials from the actual current process focus rules available in this codebase
  - prove stale prior materials do not return on bootstrap after a phase/context change
  - prove relevant shared/project-scoped materials can surface when they are the current process materials

### 2. Output/artifact dedupe uses heuristic labels instead of real linkage

- Severity: `MEDIUM`
- Evidence:
  - [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:15)
  - [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:37)
  - [processOutputs.ts](/Users/leemoore/code/liminal-build/convex/processOutputs.ts:6)
  - [processOutputs.ts](/Users/leemoore/code/liminal-build/convex/processOutputs.ts:27)
- Problem:
  - `linkedArtifactId` exists in durable outputs, but the reader dedupes via display name plus revision
  - unrelated outputs can be hidden if labels collide
  - linked pairs can still duplicate if labels drift
- Required fix:
  - carry the actual artifact linkage through the reader path or otherwise dedupe on real identity, not display heuristics
  - add server/API coverage proving dedupe on real linkage

## Verification Expectations For Fix Round

- rerun:
  - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
- add or update server/API tests, not only client fixture/reducer tests
- stay inside Story 4 scope; do not pull Story 6 transport lifecycle into the fix
