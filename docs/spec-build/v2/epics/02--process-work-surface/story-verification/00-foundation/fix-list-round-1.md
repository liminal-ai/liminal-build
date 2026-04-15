# Story 0 Fix List Round 1

Source reviews:

- `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/codex-review.md`
- `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/sonnet-review.md`

## Must Fix

### 1. Normalize touched `convex/processes.ts` to Epic 2 / Convex guideline standards

Why:

- both reviewers flagged this
- Story 0 modified the file for `currentRequestHistoryItemId`
- the tech design explicitly says new and modified Convex modules should stop carrying forward the older scaffold shortcuts

Required changes:

- replace `queryGeneric` / `mutationGeneric` usage with typed Convex registrations
- remove `ctx: any` / `args: any`
- keep explicit validators
- replace unbounded `.collect()` with a bounded read
- switch query usage to the normalized index name
- remove the duplicate `by_projectId_updatedAt` index from `convex/schema.ts`

### 2. Close the cross-process live foundation hole for `process` upserts

Why:

- Codex review found that the current shared schema/fixtures/reducer allow a `process` live message whose top-level `processId` differs from the payload/entity process
- Story 0 is supposed to establish a trustworthy single-process foundation for later live work

Required changes:

- make the shared live-message foundation internally consistent for `process` messages
- ensure fixtures do not ship a cross-process `process` upsert as a valid example
- harden `applyLiveProcessMessage()` so a process surface does not apply another process's `process` update

## Nice To Fix If Cheap

### 3. Clarify the live-unavailable fixture semantics

Why:

- Sonnet flagged that `processLiveUnavailableErrorFixture` looks like an HTTP `503` error even though the design treats this as a post-bootstrap live transport state

Suggested improvement:

- rename or comment the fixture so Story 6 implementers do not mistake it for a bootstrap HTTP error path

## Constraints

- stay within Story 0 scope
- do not implement Story 1 behavior
- rerun the Story 0 gate: `corepack pnpm run typecheck && corepack pnpm run build`
