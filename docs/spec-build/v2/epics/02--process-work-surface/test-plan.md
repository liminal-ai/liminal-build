# Test Plan: Process Work Surface

## Purpose

This document maps every Epic 2 test condition to a planned test file and test
approach. It follows the same service-mock philosophy established in Epic 1:

- test Fastify routes and websocket entry points at the server boundary
- test client pages, router, store reconciliation, and section modules at their
  public entry points
- mock only external boundaries

The confidence chain for Epic 2 remains:

```text
AC → TC → Test File / Test Name → Implementation Module
```

## Verification Tiers

| Script | Command | Notes |
|--------|---------|-------|
| `red-verify` | `corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build` | Red exit gate excludes tests by design; Red tests are expected to error while stubs throw |
| `test:convex` | `corepack pnpm exec vitest run --project convex` | Direct Convex function service-mock tests |
| `verify` | `corepack pnpm run red-verify && corepack pnpm run test:convex && corepack pnpm run test:service && corepack pnpm run test:client` | Main implementation gate |
| `green-verify` | `corepack pnpm run verify && corepack pnpm run guard:no-test-changes` | Green exit gate |
| `verify-all` | `corepack pnpm run verify && corepack pnpm run test:integration && corepack pnpm run test:e2e` | Deep verification; `test:e2e` may remain explicit `SKIP:` until implemented |

## Test Layers

### Convex Function Service Mocks

Primary confidence layer for new Epic 2 Convex durability logic.

- `convex/**/*.test.ts`

### Server Service Mocks

Fastify and websocket entry-point tests with mocked external boundaries.

- `tests/service/server/*.test.ts`

### Client Service Mocks

Route/page/store/section tests with mocked browser API and live transport
boundaries.

- `tests/service/client/*.test.ts`

### Wide Integration Tests

Small number of deeper tests against the assembled app and durable state path.

- `tests/integration/process-work-surface.test.ts`

### E2E

Planned but not required for the first TDD cycles.

- `tests/e2e/process-work-surface.spec.ts`

## Mock Boundaries

| Layer | Mock? | Notes |
|-------|-------|-------|
| WorkOS SDK and session validation | Yes | External auth boundary |
| Convex store adapter in Fastify route tests | Yes | External durable-state boundary for server service mocks |
| Browser `fetch` and live transport wrapper | Yes | API and websocket boundary for client modules |
| Fastify routes / services / readers / builders / projectors | No | These are the server behavior under test |
| Client router / store / page modules / section renderers | No | These are the client behavior under test |
| Convex functions under direct `convex-test` | No | Test the Convex function directly, not wrapper helpers |

## Fixture Strategy

### Shared Fixtures

`tests/fixtures/process-surface.ts`

- process work-surface bootstrap payloads per status
- process-unavailable and access-denied responses
- degraded section-envelope responses

`tests/fixtures/process-history.ts`

- user message fixture
- process message fixture
- progress update fixture
- attention request fixture
- side work update fixture
- finalized/current lifecycle variants

`tests/fixtures/materials.ts`

- referenced project artifact with version context
- output linked to artifact
- output without linked artifact
- source attachment fixture
- empty materials fixture

`tests/fixtures/side-work.ts`

- running side work
- completed side work with result
- failed side work with failure summary
- multiple side-work items with different update times

`tests/fixtures/live-process.ts`

- snapshot message
- process upsert message
- history item upsert/complete
- materials upsert
- side-work upsert
- disconnect/reconnect states

### Test Utilities

`tests/utils/build-app.ts`

- extend existing Fastify builder with websocket plugin and process routes
- allow mocked process services and Convex store behavior

`tests/utils/render-shell.ts`

- extend existing client render helper to mount process-surface page with store,
  router, mocked HTTP API, and mocked live transport

## Test File Inventory

| Test File | Layer | Primary Focus | Planned Tests |
|-----------|-------|---------------|---------------|
| `convex/processHistoryItems.test.ts` | Convex | visible history ordering, unresolved request lookup, bounded reads | 3 |
| `convex/processSideWorkItems.test.ts` | Convex | side-work ordering and status projections | 2 |
| `convex/processOutputs.test.ts` | Convex | output lookup and linked-artifact behavior support | 1 |
| `tests/service/server/process-html-routes.test.ts` | Service | authenticated process-route shell delivery and unavailable routing | 4 |
| `tests/service/server/process-work-surface-api.test.ts` | Service | bootstrap contract, auth, section envelopes, unavailable live fallback | 6 |
| `tests/service/server/process-actions-api.test.ts` | Service | action-availability enforcement, idempotency, response contract | 4 |
| `tests/service/server/process-live-updates.test.ts` | Service | websocket auth/access, snapshots, sequencing contract | 4 |
| `tests/service/client/process-router.test.ts` | Service | process route parse/open/reload behavior | 4 |
| `tests/service/client/process-work-surface-page.test.ts` | Service | page-level orchestration and same-session updates | 20 |
| `tests/service/client/process-history-section.test.ts` | Service | visible history rendering and chronological updates | 5 |
| `tests/service/client/current-request-panel.test.ts` | Service | pinned unresolved request behavior | 7 |
| `tests/service/client/process-response-composer.test.ts` | Service | response validation and submission UX | 3 |
| `tests/service/client/process-materials-section.test.ts` | Service | materials rendering and empty state | 6 |
| `tests/service/client/side-work-section.test.ts` | Service | side-work summary rendering | 4 |
| `tests/service/client/process-live-store.test.ts` | Service | snapshot/upsert/complete reconciliation | 13 |
| `tests/service/client/process-live-status.test.ts` | Service | connection status and retry UI | 2 |
| `tests/integration/process-work-surface.test.ts` | Integration | assembled process route, reload, response persistence, reconnect path | 4 |

**Planned total:** 92 tests  
**TC-mapped:** 61  
**Non-TC decided tests:** 31

## TC → Test Mapping

### `tests/service/client/process-router.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a opening a process from the project shell navigates to the dedicated process route` | Shell page with accessible process card/action | Activate open-process action | Route becomes `/projects/:projectId/processes/:processId` |
| TC-1.1b | `TC-1.1b direct process URL mounts the process work surface` | Initial URL is dedicated process route | Bootstrap app | Process surface page mounts and bootstrap request is sent |
| TC-6.1a | `TC-6.1a browser reload preserves the current process route` | Current process route persisted | Simulate reload bootstrap | Same process route is re-fetched |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `navigating back from process surface returns to the project shell route cleanly` | Route transitions between shell and process work surface are part of surface coherence even without a dedicated TC row |

### `tests/service/server/process-html-routes.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.4a | `TC-6.4a missing process route returns process unavailable shell` | Authenticated actor, missing process | `GET /projects/:projectId/processes/:processId` | `404` HTML unavailable shell |
| TC-6.4b | `TC-6.4b revoked access blocks process route shell` | Authenticated actor without process access | `GET /projects/:projectId/processes/:processId` | `403` HTML unavailable shell |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `redirects unauthenticated process route to sign-in` | Process routes inherit the authenticated shell requirement |
| `clears invalid session cookie before redirecting process route` | Matches existing auth-shell behavior from Epic 1 |

### `tests/service/server/process-work-surface-api.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `requires authenticated access for process bootstrap` | Critical request-level contract inherited from platform shell |
| `returns stable section error codes for history materials and side-work failures` | Client rendering and retries depend on machine-readable section error codes |
| `omits project data from forbidden bootstrap response` | Prevents data leakage through direct API access |
| `returns section envelopes with stable shape across ready empty and error states` | Envelope shape is a design-critical contract |
| `returns live-unavailable signal without failing the durable bootstrap` | Supports durable bootstrap plus disconnected live-state rule |
| `rejects project/process mismatch where the process exists but does not belong to the requested project` | Prevents cross-project record leakage |
| `returns referenced project artifacts in current materials even when another process produced the visible version` | Current materials follow the process reference set, not a primary-process field on the artifact row |

### `tests/service/server/process-actions-api.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `start returns PROCESS_ACTION_NOT_AVAILABLE for non-draft process` | Action availability must be enforced server-side |
| `resume returns PROCESS_ACTION_NOT_AVAILABLE for non-paused/non-interrupted process` | Same action-availability contract |
| `respond returns PROCESS_ACTION_NOT_AVAILABLE when process is not accepting a response` | Prevents false interactive states |
| `response deduplicates repeated clientRequestId within one process` | Defensive write protection for retry/replay conditions |

### `tests/service/server/process-live-updates.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `rejects websocket connection without authenticated session` | Live route auth must be explicit |
| `rejects websocket connection for inaccessible process` | Prevents live-update leakage |
| `sends snapshot immediately after successful subscribe` | Required for bootstrap/live coherence |
| `normalizer never emits raw provider delta payloads` | Architecture says browser consumes typed current objects, not raw deltas |

### `convex/processHistoryItems.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `returns bounded oldest-first history rows for one process` | Enforces bounded bootstrap read shape |
| `resolves latest unresolved request through by_processId_and_requestState_and_createdAt` | Supports pinned current-request projection without filter scans |
| `marks finalized items without rewriting earlier ids` | Supports reconnect deduplication policy |

### `convex/processSideWorkItems.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `returns active side-work items before recent inactive items` | Matches side-work section ordering contract |
| `returns bounded current side-work rows for one process` | Prevents unbounded reads as tables grow |

### `convex/processOutputs.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `returns linkedArtifactId so materials builder can avoid duplicate current outputs` | Supports Epic 2 no-duplication rule between outputs and artifacts |

### `tests/service/client/process-work-surface-page.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.2a | `TC-1.2a renders active project and process identity` | Mock process bootstrap | Mount page | Identity visible |
| TC-1.3a | `TC-1.3a renders next meaningful action on load` | Bootstrap with nextActionLabel | Mount page | Next action visible |
| TC-1.3b | `TC-1.3b renders blocker state on load` | Bootstrap with currentRequest | Mount page | Blocker/request visible |
| TC-1.4a | `TC-1.4a renders history materials and side-work sections together` | Populated bootstrap | Mount page | All sections visible |
| TC-2.1a | `TC-2.1a start action updates page in-session` | Draft process bootstrap | Click start | Updated process visible |
| TC-2.1b | `TC-2.1b resume action updates page in-session for paused process` | Paused process bootstrap | Click resume | Updated process visible |
| TC-2.1c | `TC-2.1c resume action updates page in-session for interrupted process` | Interrupted process bootstrap | Click resume | Updated process visible |
| TC-2.5a | `TC-2.5a successful start updates the page without manual refresh` | Successful start response | Click start | Page state updates |
| TC-2.5b | `TC-2.5b successful resume updates the page without manual refresh` | Successful resume response | Click resume | Page state updates |
| TC-3.1a | `TC-3.1a multi-turn discussion remains in one process page` | Existing conversation + successful response | Submit response | Same page and history continue |
| TC-3.6a | `TC-3.6a accepted response appears in page history in-session` | Successful response | Submit response | History item visible |
| TC-3.6b | `TC-3.6b resulting request or process state updates in-session` | Successful response | Submit response | Current request/process state updates |
| TC-5.4c | `TC-5.4c parent-process change becomes visible after side-work outcome` | Side-work result + process update | Apply update | Process summary changes |
| TC-6.2a | `TC-6.2a page preserves visible state when live disconnects` | Bootstrapped page + disconnect | Trigger disconnect | Existing state remains |
| TC-6.5a | `TC-6.5a page remains usable when bootstrap succeeds but live connect fails` | HTTP success + live error | Mount page | Durable surface visible |
| TC-6.6a | `TC-6.6a page keeps rendering when history section errors` | History envelope error | Mount page | Core page + healthy sections remain |
| TC-6.6b | `TC-6.6b page keeps rendering when materials section errors` | Materials envelope error | Mount page | Core page + healthy sections remain |
| TC-6.6c | `TC-6.6c page keeps rendering when side-work section errors` | Side-work envelope error | Mount page | Core page + healthy sections remain |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `renders request-level bootstrap failure without stale prior process data` | Complements section-level degradation with full request failure behavior |
| `falls back to automatic bootstrap refresh after successful mutation when live transport is unavailable` | Matches same-session update fallback rule |

### `tests/service/client/process-history-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.4b | `TC-1.4b renders clear early-state history area when no visible history exists` | Empty history envelope | Mount section | Empty state visible |
| TC-2.3a | `TC-2.3a renders readable progress updates` | Progress history item | Mount section | Readable progress shown |
| TC-2.3b | `TC-2.3b maintains chronological history order` | Multiple history items | Mount section | Oldest→newest order visible |
| TC-3.3a | `TC-3.3a shows submitted response in visible history` | User message history item | Mount section | User response visible |
| TC-5.1a | `TC-5.1a routine progress remains distinct from attention request in history` | Progress + attention request history items | Mount section | Distinction visible |

### `tests/service/client/current-request-panel.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.1b | `TC-3.1b follow-up question remains in current process context` | Updated currentRequest | Mount/update panel | Follow-up visible in same panel |
| TC-3.2a | `TC-3.2a pinned request remains visible while unresolved` | Unresolved currentRequest | Mount panel | Request visible |
| TC-3.2b | `TC-3.2b pinned request clears or changes after process update` | Current request changes | Update panel props/store | Request clears or changes |
| TC-3.4a | `TC-3.4a panel does not show waiting state when no current request exists` | Running process, null currentRequest | Mount panel | No unresolved request shown |
| TC-5.1b | `TC-5.1b pinned attention request remains visible amid later routine updates` | CurrentRequest + new routine history | Update surrounding store | Request remains visible |
| TC-5.2a | `TC-5.2a unresolved request remains visible over time` | Unresolved currentRequest | Re-render same state | Request remains visible |
| TC-5.2b | `TC-5.2b resolved request no longer shown as unresolved` | Clear currentRequest | Update panel | Panel clears |

### `tests/service/client/process-response-composer.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.4b | `TC-3.4b completed process does not expose active response composer` | Completed process summary | Mount page/section | Composer hidden or disabled |
| TC-3.5a | `TC-3.5a empty response is rejected before submit` | Empty input | Submit | Validation visible, no API call |
| TC-3.5b | `TC-3.5b failed response submission does not add misleading history` | API error | Submit | Error shown, no optimistic history item persists |

### `tests/service/client/process-materials-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1a | `TC-4.1a renders current materials alongside process work` | Ready materials envelope | Mount section | Artifacts/outputs visible |
| TC-4.1b | `TC-4.1b renders current source attachments when relevant` | Materials with sources | Mount section | Sources visible |
| TC-4.2a | `TC-4.2a shows artifact identity and revision context` | Artifact with version label | Mount section | Identity + revision visible |
| TC-4.2b | `TC-4.2b shows current output identity` | Output row | Mount section | Output identity visible |
| TC-4.4a | `TC-4.4a renders clear empty state when no current materials apply` | Empty materials envelope | Mount section | Empty state visible |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `does not render a duplicate current output when it is already represented by a linked current artifact` | Enforces no-duplication rule from the epic |

### `tests/service/client/side-work-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.3a | `TC-5.3a renders active side work as a distinct summary item` | Running side-work item | Mount section | Distinct summary visible |
| TC-5.3b | `TC-5.3b renders multiple side-work items as distinguishable summaries` | Multiple side-work items | Mount section | Distinguishable labels/statuses visible |
| TC-5.4a | `TC-5.4a renders completed side-work result summary` | Completed side-work item | Mount section | Result summary visible |
| TC-5.4b | `TC-5.4b renders failed side-work outcome` | Failed side-work item | Mount section | Failure summary visible |

### `tests/service/client/process-live-store.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.2a | `TC-2.2a process upsert changes visible running state` | Existing process state | Apply process upsert | Running state stored |
| TC-2.2b | `TC-2.2b process upsert changes visible phase label` | Existing process state | Apply phase upsert | Phase label updated |
| TC-2.4a | `TC-2.4a waiting transition is reflected in store` | Existing running state | Apply waiting process upsert | Waiting state stored |
| TC-2.4b | `TC-2.4b completed transition is reflected in store` | Existing running state | Apply completed process upsert | Completed state stored |
| TC-2.4c | `TC-2.4c failed or interrupted transition is reflected in store` | Existing running state | Apply failed/interrupted upsert | Resulting state stored |
| TC-4.3a | `TC-4.3a materials upsert updates current materials` | Existing materials state | Apply materials upsert | Materials replaced |
| TC-4.3b | `TC-4.3b output revision upsert updates current output context` | Existing output state | Apply materials upsert | Output revision updated |
| TC-4.4b | `TC-4.4b cleared materials do not leave prior materials visible` | Existing materials state | Apply empty materials snapshot/upsert | Old materials removed |
| TC-6.3a | `TC-6.3a reconnect reconciliation replaces state with latest snapshot` | Existing disconnected state | Apply new bootstrap + snapshot | Latest state stored |
| TC-6.3b | `TC-6.3b finalized history items are not duplicated on reconnect` | Existing finalized history items | Apply snapshot with same ids | No duplicate rows |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `applies current_request upsert and clears currentRequest on null payload` | The pinned request now has a first-class live entity and needs an explicit reconciliation test |
| `ignores live message with older sequence number than the current subscription watermark` | Defensive protection against out-of-order transport |
| `replaces current-object state on upsert instead of appending raw transport fragments` | Enforces architecture-level upsert semantics |

### `tests/service/client/process-live-status.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.2b | `TC-6.2b renders disconnected or reconnecting live status` | Disconnect/reconnecting state | Mount component | Status text visible |
| TC-6.5b | `TC-6.5b renders retry control when live transport is unavailable` | Live error state | Mount component | Retry control visible |

### `tests/integration/process-work-surface.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.3b | `TC-3.3b submitted response remains visible after reload` | Seed process, submit response, reload | Open same route after reload | Response persists |
| TC-6.1b | `TC-6.1b user can return later and reopen prior process with durable state intact` | Seed process state, open in fresh session | Reopen route | Durable state visible |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `serves the same shell HTML for the dedicated process route as for project routes` | Confirms single-shell architecture remains intact |
| `live disconnect banner clears after reconnect and fresh snapshot` | Verifies assembled reconnect path beyond isolated store tests |

## Chunk Breakdown and Test Counts

### Chunk 0: Infrastructure

**Scope:** Shared contracts, websocket plugin wiring, Convex table skeletons,
fixtures, test utilities, router/store extensions.

**TC tests:** 0  
**Non-TC tests:** 0  
**Exit criteria:** `pnpm typecheck` and `pnpm build` succeed with scaffolding in
place.

### Chunk 1: Process Entry and Bootstrap

**Scope:** Dedicated process route, durable bootstrap, process identity, next
action/blocker, request-level unavailable handling.
**ACs:** AC-1.1 to AC-1.4, AC-6.4
**TC tests:** 9
**Non-TC tests:** 8
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q1, Q4, Q8;
`tech-design-client.md` §Flow 1;
`tech-design-server.md` §Flow 1

### Chunk 2: Start and Resume

**Scope:** Start/resume actions, immediate response payloads, state transitions.
**ACs:** AC-2.1, AC-2.4, AC-2.5
**TC tests:** 8
**Non-TC tests:** 2
**Relevant docs:** `tech-design-client.md` §Flow 2;
`tech-design-server.md` §Flow 2

### Chunk 3: Conversation and Current Request

**Scope:** Response composer, pinned request, validation, same-session response
updates.
**ACs:** AC-3.1 to AC-3.6, AC-5.1, AC-5.2
**TC tests:** 16
**Non-TC tests:** 4
**Relevant docs:** `tech-design-client.md` §Flow 3;
`tech-design-server.md` §Flow 3

### Chunk 4: Materials and Outputs

**Scope:** Materials section, referenced project artifacts, current outputs,
linked-artifact de-duplication.
**ACs:** AC-4.1 to AC-4.4
**TC tests:** 8
**Non-TC tests:** 2
**Relevant docs:** `tech-design-client.md` §Flow 4;
`tech-design-server.md` §Flow 4

### Chunk 5: Side Work Visibility

**Scope:** Side-work summary section and parent-process result visibility.
**ACs:** AC-5.3, AC-5.4
**TC tests:** 5
**Non-TC tests:** 5
**Relevant docs:** `tech-design-client.md` §Flow 4;
`tech-design-server.md` §Flow 5

### Chunk 6: Live Reconciliation and Degradation

**Scope:** Live status, websocket subscription, reconnect, durable fallback,
section-by-section degradation.
**ACs:** AC-2.2, AC-2.3, AC-6.1 to AC-6.3, AC-6.5, AC-6.6
**TC tests:** 15
**Non-TC tests:** 10
**Relevant docs:** `tech-design-client.md` §Flow 5;
`tech-design-server.md` §Flow 6

**Running total:** 92 tests

## Manual Verification Checklist

1. Start local Convex and the Fastify/Vite dev server.
2. Sign in through the local WorkOS environment.
3. Open a project shell and enter a dedicated process route.
4. Verify the process surface shows process identity, next action, history,
   materials, current request, and side work.
5. Start a draft process and confirm the surface updates in-session.
6. Resume a paused or interrupted process and confirm the surface updates
   in-session.
7. Submit a valid response and confirm it appears immediately in visible history.
8. Submit an invalid empty response and confirm no misleading history item
   appears.
9. Trigger a current-request change and confirm the pinned request clears or is
   replaced while the historical request remains in the timeline.
10. Seed one project artifact first produced by another process, reference it
    from the open process, and confirm it appears in current materials with its
    revision context.
11. Seed one linked output + artifact pair and confirm the materials section does
    not show a duplicate unlinked output row.
12. Seed one running side-work item and one completed side-work item and confirm
    both remain distinguishable.
13. Disconnect live transport and confirm the visible state remains on screen and
    the live-status banner changes.
14. Reconnect and confirm the banner clears, the surface reconciles, and
    finalized history items are not duplicated.
15. Force one secondary section into an error state and confirm the healthy
    sections remain visible.
