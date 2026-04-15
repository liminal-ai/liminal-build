# Liminal Build — Current State: Process Work Surface

## Status
Domain baseline reflects repository state on `main` at commit
`d85d69b5478a1435db49495a541b6ac2c1523d07`, inspected on `2026-04-15`.

## Evidence Scope
- Historical artifacts reviewed:
  - `docs/spec-build/v2/epics/02--process-work-surface/*`
  - `docs/spec-build/v2/core-platform-prd.md`
- Code areas reviewed:
  - `apps/platform/server/routes/processes.ts`
  - `apps/platform/server/services/processes/*`
  - `apps/platform/client/app/bootstrap.ts`
  - `apps/platform/client/app/process-live.ts`
  - `apps/platform/client/features/processes/*`
  - `apps/platform/shared/contracts/process-work-surface.ts`
  - `apps/platform/shared/contracts/live-process-updates.ts`
  - `convex/processes.ts`
  - `convex/processHistoryItems.ts`
  - `convex/processOutputs.ts`
  - `convex/processSideWorkItems.ts`
- Tests reviewed:
  - `tests/integration/process-work-surface.test.ts`
  - `tests/service/server/process-work-surface-api.test.ts`
  - `tests/service/server/process-actions-api.test.ts`
  - `tests/service/server/process-live-updates.test.ts`
  - `tests/service/client/process-work-surface-page.test.ts`
  - `tests/service/client/process-live.test.ts`

## Overview
This domain covers the dedicated per-process route, its bootstrap payload, the
current request/history/materials/side-work surface, and the shared process
actions that operate inside that surface. It is the current place where the
user follows one active process rather than a project’s summary list.

Implemented, weakly evidenced:
- The surface and contracts support richer lifecycle states such as `waiting`,
  `paused`, `completed`, `failed`, and `interrupted`.
- Current in-repo orchestration does not yet produce those states. The shipped
  mutations currently create draft processes, move them to `running`, and clear
  current requests on response handling.

## Current User Outcomes
- The user can open a process directly by URL or from the project shell.
- The surface shows project identity, process display label, process type,
  status, phase label, and next-action label.
- The surface shows current request state separately from the visible history.
- The user can start a draft process and move it into active running state.
- Implemented, weakly evidenced: the surface supports resuming paused or
  interrupted processes when those states exist in durable data.
- Implemented, weakly evidenced: the surface supports responding to a waiting
  process when a current request is present, but current in-repo orchestration
  does not generate unresolved current requests.
- The surface shows current materials beside the history rather than forcing
  the user to infer them from prior messages.
- The surface shows side work as summary/result items, not as a second
  inspectable conversation surface.
- The surface receives typed live updates over websocket and can retry the live
  subscription after disconnect.
- Submitted user responses remain visible after reload or return.

## In Scope Now
- Dedicated process route and bootstrap API
- Process HTML unavailable states for project-forbidden, project-not-found, and
  process-not-found outcomes
- Start, resume, and respond actions
- Current request panel
- Process-facing history feed with normalized item kinds
- Current materials envelope for artifacts, outputs, and source attachments
- Side-work summary section
- Live process snapshot and upsert events over websocket
- Section-level degradation for history, materials, and side work
- Durable reload and return behavior

## Not Present / Deferred / Deprecated
- No distinct process-type module behavior is registered in the app today
- No inspectable subordinate thread or delegated-work surface
- No environment control, filesystem view, or tool-runtime controls in the UI
- No markdown review workspace, package export surface, or archive/chunk viewer
- No automatic reconnect loop after websocket loss; the current UX exposes a
  retry path instead

## Major Current Flows

### 1. Opening And Bootstrapping A Process Surface
Confirmed current state:
- The process route is `/projects/:projectId/processes/:processId`.
- The bootstrap API returns one payload with `project`, `process`, `history`,
  `materials`, `currentRequest`, and `sideWork`.
- Early processes return stable `empty` envelopes rather than null sections.
- Access failures become stable unavailable states instead of partially loaded
  process surfaces.

### 2. Starting And Resuming Work
Confirmed current state:
- `start` is available only from `draft`.
- Starting a draft process is a current produced path in repo code.

Implemented, weakly evidenced:
- `resume` is available only from `paused` or `interrupted`.
- Current start and resume behavior is generic lifecycle transition logic:
  both actions move the process to `running`, clear any current request, and
  set the next-action label to `Monitor progress in the work surface`.
- When a process leaves `Draft` through start, its phase label becomes
  `Working`.
- The current repo supports resume behavior if paused/interrupted records exist,
  but no in-repo process module currently produces those states.

### 3. Responding To A Waiting Process
Implemented, weakly evidenced:
- `respond` is available only when the process surface exposes that action.
- Submitted responses require non-empty `clientRequestId` and `message`.
- Response handling is idempotent by `clientRequestId`.
- Accepting a response finalizes the previously unresolved attention request,
  appends a finalized `user_message` history item, clears `currentRequest`, and
  moves the process back to `running`.
- Current repo code supports this flow when waiting state and unresolved current
  request data already exist, but no in-repo producer currently creates that
  data.

### 4. History, Materials, And Side Work
Confirmed current state:
- History items are returned in chronological order by `createdAt`.
- Current request is projected separately from history, so unresolved user
  action remains pinned without forcing the user to infer it from the timeline.
- Materials are returned as a current-state envelope:
  `currentArtifacts`, `currentOutputs`, `currentSources`.
- Current artifacts and current sources are filtered from project-level durable
  rows by process-owned current refs, not by “everything attached to this
  project.”
- Published outputs that are already represented by a visible current artifact
  are omitted from `currentOutputs` to avoid duplicate current-state rows.
- Side work is sorted with running items first, then settled items by newest
  update.

### 5. Live Updates And Degradation
Confirmed current state:
- The websocket route is `/ws/projects/:projectId/processes/:processId`.
- Subscribing yields an immediate `snapshot` publication split into typed
  entity messages for process, history, current request, materials, and side
  work.
- Later updates arrive as `upsert`, `complete`, or `error` messages with
  subscription id and sequence number.
- Client-side reconciliation ignores stale sequence numbers and cross-process
  messages.
- If history, materials, or side work fails independently, the corresponding
  section can become an error envelope while the rest of the process surface
  stays open.

### 6. Reload, Return, And Recovery
Confirmed current state:
- Reloading the process route re-fetches the durable bootstrap payload.
- Returning later shows the latest durable history and current request state.
- Submitted responses remain visible after reload and return.
- Manual retry for live updates performs a fresh HTTP bootstrap read before
  attempting to re-open the websocket.

## Important Current Contracts And Invariants
- Surface-supported action model on the dedicated process surface is narrower
  than the shell summary action vocabulary:
  - `draft` -> `start`
  - `running` -> `review`
  - `waiting` -> `respond`
  - `paused` -> `resume`
  - `completed` -> `review`
  - `failed` -> `review`, `restart`
  - `interrupted` -> `resume`, `review`, `restart`
- Implemented, weakly evidenced: not every status in that contract vocabulary
  is currently produced by in-repo orchestration, even though the surface and
  tests support them.
- Current request is `null` whenever the process is not waiting on an
  unresolved attention request.
- Process-facing history kinds are normalized domain events:
  `user_message`, `process_message`, `progress_update`, `attention_request`,
  `side_work_update`, `process_event`.
- Materials are replace-style current state. The current implementation treats
  the materials envelope as the whole current panel state rather than patching
  individual rows in place.
- Live updates are assistive current-state transport, not the only source of
  truth. Durable bootstrap reads remain the fallback and recovery path.

## Extension Guidance
- New work that changes action availability should update both the durable
  process summary and the process-surface action model. The shell summary and
  process surface do not share exactly the same vocabulary.
- New work that changes materials should preserve the “current-state
  projection” model unless the product intentionally introduces a historical
  materials browser.
- New work that deepens process-specific orchestration should account for the
  current gap between durable per-type state tables and the still-generic
  lifecycle logic in `convex/processes.ts`.

## Read Next
- Read [current-state-tech-design.md](./current-state-tech-design.md) for the
  current HTTP/websocket/store seams behind the process surface.
- Read the process-surface and durable-state sections in
  [current-state-code-map.md](./current-state-code-map.md) before changing
  actions, live updates, history, materials, or side work.
- Read [current-state-drift-ledger.md](./current-state-drift-ledger.md) if you
  need to reconcile Epic 2 intent with the current generic lifecycle
  implementation.

## Adjacent Domains
- [current-state-project-and-process-shell.md](./current-state-project-and-process-shell.md)
  for how the user gets into this surface and how process registration happens.
- [current-state-tech-design.md](./current-state-tech-design.md) for the shared
  contract, `PlatformStore`, and live-update transport surfaces this domain
  depends on.
