# Story 0 Foundation — Sonnet Compliance Review

Materialized by the orchestrator from the successful Sonnet helper output in `sonnet-review.json` because the helper's direct file-write step was denied by its execution environment.

## VERDICT: REVISE

One MAJOR finding must be resolved before this foundation is clean enough to serve as the reference baseline for Stories 1–6.

## STORY0_REQUIREMENTS_MATRIX

| Requirement | Status |
|---|---|
| Shared route constants and endpoint vocabulary | SATISFIED |
| `process.processType`, `.status`, `.availableActions` values | SATISFIED |
| `history.kind`, `.lifecycleState` values | SATISFIED |
| `live.messageType`, `.entityType` values | SATISFIED |
| Shared section error and live update contracts | SATISFIED |
| `processSurface` state slice in `AppState` | SATISFIED |
| Route parsing: process route checked before project-shell | SATISFIED |
| `processSurface.projectId/processId` populated on route parse | SATISFIED |
| Pure `applyLiveProcessMessage` helper | SATISFIED |
| WebSocket plugin scaffold | SATISFIED |
| Process routes scaffold | SATISFIED |
| `ProcessWorkSurfaceService` interface + NotImplemented stub | SATISFIED |
| `ProcessModuleRegistry` + functional registry | SATISFIED |
| `ProcessLiveHub` + `NoopProcessLiveHub` | SATISFIED |
| `app.ts` plugin/route registration order | SATISFIED |
| All three new Convex tables with correct fields and indexes | SATISFIED |
| `currentRequestHistoryItemId` pointer added to `processes` | SATISFIED |
| New Convex modules are guideline-compliant | SATISFIED |
| Modified `convex/processes.ts` normalized to Epic 2 guidelines | VIOLATED |
| All required fixtures present and valid | SATISFIED |
| `renderShell` supports non-`/projects` routes | SATISFIED |
| No Story 1+ user-visible behavior introduced | SATISFIED |

## TEST_DIFF_AUDIT

Zero test file changes from the base commit. This matches the Chunk 0 test-plan expectation of `0` TC tests and `0` non-TC tests, with typecheck/build as the exit gate.

## BLOCKING_FINDINGS

### F-1 — MAJOR | HIGH confidence

`convex/processes.ts` was modified in Story 0 but not normalized to Epic 2 Convex guidelines.

Observed violations:

```ts
import { mutationGeneric as mutation, queryGeneric as query } from 'convex/server';
handler: async (ctx: any, args: any) => { ... }
.order('desc').collect();
```

Additionally, `convex/schema.ts` now contains both:

```ts
.index('by_projectId_updatedAt', ['projectId', 'updatedAt'])
.index('by_projectId_and_updatedAt', ['projectId', 'updatedAt'])
```

The tech design explicitly states that new and modified Convex modules in Epic 2 should move to guideline-compliant validators, typed contexts, bounded queries, and explicit indexes. Leaving the touched `processes.ts` file in its older style creates bad precedent for later stories.

Required fix:

- replace `queryGeneric` / `mutationGeneric` with typed imports
- replace `ctx: any` / `args: any` with proper typed contexts and validators
- replace `.collect()` with a bounded read
- remove the duplicate `by_projectId_updatedAt` index

## NONBLOCKING_WARNINGS

### F-2 — MINOR

`processLiveUnavailableErrorFixture` uses `requestErrorSchema` with `status: 503`. The fixture is type-valid for `live.error`, but the naming and status imply an HTTP response even though the design treats live unavailability as a transport state, not an HTTP bootstrap failure.

### F-3 — MINOR

Duplicate `processes` table indexes exist in `convex/schema.ts`. This is covered by the required fix above.

### F-4 — MINOR

`bootstrap.ts` falls through to `getProjectShell` for `process-work-surface` routes. That stays within Story 0 scope, but Story 1 must add a dedicated branch so process routes stop loading the project shell API.

## UNRESOLVED

`ProcessWorkSurfaceModule.buildSurfaceProjection` currently receives `processId: string` rather than `process: ProcessRecord` as shown in the server tech design. Impact cannot be confirmed until concrete modules are implemented in later stories.

## GATE_RESULT

The verification bundle claimed `corepack pnpm run typecheck && corepack pnpm run build` passed. Sonnet accepted that claim but could not independently rerun the gate because its execution environment denied the command.
