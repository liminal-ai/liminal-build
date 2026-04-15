# Story 0 Foundation — Sonnet Compliance Review Round 2

Materialized by the orchestrator from the successful Sonnet helper output in `sonnet-review-round-2.json` because the helper's direct file-write step was denied by its execution environment.

## VERDICT: PASS

Both round-1 defects are closed. No blocking findings remain.

## STORY 0 REQUIREMENTS MATRIX

| Requirement | Status |
|---|---|
| Shared route and endpoint naming | SATISFIED |
| Shared process/action/history/live vocabulary | SATISFIED |
| Shared section error contract | SATISFIED |
| Shared live update contract | SATISFIED |
| Fixtures: ready/empty/error for all sections | SATISFIED |
| Fixtures: live-update messages across all entity types | SATISFIED |
| Test helper: bootstrap rendering | SATISFIED |
| Test helper: live-update application | SATISFIED |
| Test helper: reconnect reconciliation | PARTIALLY SATISFIED |
| No user-visible Story 1+ behavior | SATISFIED |
| Shared vocabulary single-sourced | SATISFIED |

## TEST DIFF AUDIT

Sonnet confirmed the new `tests/service/client/process-live.test.ts` file by direct file read and found the two claimed regression tests present:

1. schema rejects mismatched top-level `processId` vs payload `processId`
2. reducer ignores a `process` live message for another process surface

## CONVEX GUIDELINE FINDINGS

- `convex/processes.ts` now clears the round-1 normalization bar:
  - generated typed registrations instead of `queryGeneric` / `mutationGeneric`
  - no `any`
  - bounded `.take(200)`
  - normalized `by_projectId_and_updatedAt` query usage
- `currentRequestHistoryItemId` is correctly present on `processes`
- new Epic 2 table modules remain guideline-compliant

## CONTRACT AND FIXTURE FINDINGS

- shared route/action/history/live vocabulary is present and coherent
- live-process schema/fixture/reducer layers now close the cross-process `process` upsert hole
- one caution remains that reconnect reconciliation is implicit rather than exposed as a dedicated helper

## BLOCKING FINDINGS

- `none`

## NONBLOCKING WARNINGS

- `websocketPlugin` still does not register `@fastify/websocket`; acceptable for Story 0 scaffolding, but future stories must add the real transport registration
- `bootstrap.ts` still routes `process-work-surface` URLs through `getProjectShell`; acceptable for Story 0 scaffolding, but Story 1 must add a dedicated branch
- the helper noted a possible future reconnect/staleness nuance in `isStaleMessage`, but did not treat it as a Story 0 blocker

## UNRESOLVED

- Sonnet could not independently rerun the acceptance gate because its execution environment denied shell-command approval
- Sonnet noted that the `by_projectId` index may be removable later if truly unused, but did not treat that as a Story 0 acceptance issue

## GATE RESULT

The review accepted the bundle's gate claim of:

- `corepack pnpm run typecheck` -> pass
- `corepack pnpm run build` -> pass

It also concluded the repaired Story 0 state is ready to support Story 1 build work.
