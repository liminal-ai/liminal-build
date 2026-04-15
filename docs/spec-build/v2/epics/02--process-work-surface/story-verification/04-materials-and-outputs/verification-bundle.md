# Verification Bundle: Story 4 Materials and Outputs

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/04-materials-and-outputs.md`
- `story base commit`: `a70c3240bd7a6dc5558e9cf03736b07d1057ce1c`
- `story kind`: `standard`
- `implementation source`: Codex CLI implementer round 3 plus fix-routing rounds 1 and 2
- `implementer report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-impl-round-3.md`
- `implementer jsonl`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-impl-round-3.jsonl`
- `fix report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-fix-round-1.md`
- `fix jsonl`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-fix-round-1.jsonl`
- `fix report round 2`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-fix-round-2.md`
- `fix list round 2`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/fix-list-round-2.md`
- `final review`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-review.md`
- `stalled artifacts`:
  - `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-impl-round-1-stalled.jsonl`
  - `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/04-materials-and-outputs/codex-impl-round-2-stalled.jsonl`
- `story gate`: `corepack pnpm run verify`

## Scope Claimed

Story 4 claims to deliver:

- current artifacts, outputs, and source attachments visible alongside process work
- identity and revision context visible for current artifacts and outputs
- replacement of visible materials state when phase or current output changes
- deliberate empty state when no current materials apply
- clearing of stale prior materials context

Story 4 explicitly does not claim:

- detailed review rendering for materials or outputs
- Story 5 side-work visibility behavior
- Story 6 live reconnect or degraded transport lifecycle behavior

## AC / TC Coverage Claimed

- `AC-4.1`: `TC-4.1a`, `TC-4.1b`
- `AC-4.2`: `TC-4.2a`, `TC-4.2b`
- `AC-4.3`: `TC-4.3a`, `TC-4.3b`
- `AC-4.4`: `TC-4.4a`, `TC-4.4b`

## Files Changed Against Story Base Commit

Modified:

- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/services/processes/readers/materials-section.reader.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `convex/processOutputs.test.ts`
- `convex/processes.test.ts`
- `convex/test-helpers/fake-convex-context.ts`
- `convex/processes.ts`
- `convex/processOutputs.ts`
- `convex/processProductDefinitionStates.ts`
- `convex/processFeatureSpecificationStates.ts`
- `convex/processFeatureImplementationStates.ts`
- `package.json`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/materials.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `convex/processes.test.ts`
- `convex/processOutputs.test.ts`

## Changed Test Files

Modified:

- `tests/fixtures/live-process.ts`
- `tests/fixtures/materials.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`
- `tests/service/server/auth-routes.test.ts`

## Tests Added Or Updated

- `tests/service/client/process-work-surface-page.test.ts`
  - `TC-4.1a` materials remain visible alongside process work
  - `TC-4.1b` relevant source attachments stay visible
  - `TC-4.2a` artifact identity and revision context are visible
  - `TC-4.2b` output identity and revision context are visible
  - `TC-4.4a` empty materials state clears stale current context
- `tests/service/client/process-live.test.ts`
  - `TC-4.3a` phase-change materials updates replace the visible materials envelope
  - `TC-4.3b` output revision updates replace the current output context
  - `TC-4.4b` empty materials snapshots clear stale prior materials
- `tests/service/server/process-work-surface-api.test.ts`
  - bootstrap clears stale prior materials after context change
  - project-scoped/shared materials can surface as current when referenced
  - linkage-based output/artifact dedupe works off real identity rather than labels
- `tests/service/server/processes-api.test.ts`
  - server paths can seed and project current material refs for Story 4 bootstrap behavior
- `tests/service/server/auth-routes.test.ts`
  - auth path coverage stays intact around the expanded Story 4 server/API surface
- `convex/processes.test.ts`
  - exact-set current-material ref writes persist, clear stale refs, and reject cross-project material ids
- `convex/processOutputs.test.ts`
  - exact-set current-output replacement preserves linked-artifact identity, updates revisions, and removes stale omitted outputs
- `tests/fixtures/materials.ts`
  - current artifact/output/source fixtures with clearer identity/revision coverage
- `tests/fixtures/live-process.ts`
  - materials snapshot/upsert fixtures for phase-change, output revision, and empty-state clearing

## Gate Commands Run By Implementer And Fix Routing

- `corepack pnpm run red-verify` -> first pass formatter-only failure, then `PASS`
- `corepack pnpm run test:service` -> `PASS`
- `corepack pnpm run test:client` -> `PASS`
- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS` after fix-routing round 1
- `corepack pnpm run test:convex` -> `PASS`
- `corepack pnpm run verify` -> `PASS` after fix-routing round 2

## Claimed Residual Risks

- Current-material ref arrays remain widen-only state fields; older rows still read as empty until a process module writes the current set.
- Story 4 now ships the durable writer surfaces and tests them directly, but later process-module work still needs to call those writers when phase/focus/output state changes.
- No Story 5 or Story 6 behavior was introduced in the fix rounds.

## Claimed Spec Deviations

- `none claimed`

## Claimed Open Questions

- `none claimed`

## Orchestrator Notes For Verifiers

- Highest-signal checks:
  - the visible materials panel now makes identity and revision context legible enough for Story 4
  - materials `snapshot` / `upsert` replacement semantics actually clear stale prior materials context
  - bootstrap/read path now models truly current materials rather than broad process-scoped rows
  - output/artifact dedupe now uses real linkage rather than display heuristics
  - the patch stays within Story 4 rather than drifting into Story 5 or Story 6
  - the expanded server-side footprint is sufficient to close the previously reported acceptance gaps without drifting scope
