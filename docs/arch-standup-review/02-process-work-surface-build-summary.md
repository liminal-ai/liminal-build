# Epic 2 Build Summary: Process Work Surface

## Purpose

This document summarizes what Epic 2, `Process Work Surface`, was intended to
establish in the Liminal Build platform standup and what the available
implementation log suggests actually happened during delivery.

Primary source set:

- `docs/spec-build/v2/epics/02--process-work-surface/epic.md`
- `docs/spec-build/v2/epics/02--process-work-surface/tech-design.md`
- `docs/spec-build/v2/epics/02--process-work-surface/tech-design-server.md`
- `docs/spec-build/v2/epics/02--process-work-surface/tech-design-client.md`
- `docs/spec-build/v2/epics/02--process-work-surface/test-plan.md`
- `docs/spec-build/v2/epics/02--process-work-surface/codex-impl-log.md`

Upstream framing is also inherited from the previously reviewed:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/core-platform-arch.md`

Notable file-status finding:

- `docs/spec-build/v2/epics/02--process-work-surface/decision-memo.md` was not
  present at review time.

This report is not a code audit. It is a spec-intent plus implementation-log
baseline for later comparison against the repo.

## Upstream Intent Relevant to Epic 2

Epic 2 is the first slice where Liminal Build is expected to feel like a
process platform rather than a durable shell around records. The upstream PRD
and architecture already defined several constraints that matter here:

- the platform is process-first, not transcript-first
- `Project` remains the durable top-level container
- `ProcessType` remains the main abstraction, with process-specific semantics
  owned by code-defined modules
- Fastify remains the control plane
- Convex remains the durable state layer
- the browser should consume typed current-object updates rather than raw
  provider deltas
- richer environment/runtime behavior belongs later
- richer review/package workflows also belong later

Epic 2 therefore exists to give a user one active-process workspace where they
can open, start, resume, follow, and respond to a process without reconstructing
context from project-shell summaries alone.

## Epic 2 Goals and Scope

### Primary Goals

Epic 2 was intended to make the following true:

- a user can move from the project shell into one dedicated process work surface
- the surface shows process identity, phase, status, next action/blocker, and
  current working context on load
- the user can start or resume a process from that surface
- active process activity appears live and coherently in-session
- the user can exchange in-context multi-turn responses when the process allows
  it
- unresolved attention-required requests stay pinned and visible
- current materials, outputs, and source references stay visible alongside
  active work
- side work appears as distinct current summary state, not invisible transcript
  noise
- reload, reconnect, and live degradation preserve a usable process surface

### Scope Boundaries

Epic 2 intentionally does not yet deliver:

- full environment hydration, filesystem/runtime execution, or provider
  lifecycle behavior
- full markdown/Mermaid review or package/export workflows
- full inspectable delegated subthreads or subordinate process surfaces
- the later canonical archive entry taxonomy, turn derivation, or chunk/view
  derivation model
- manual process naming/renaming
- no-code or dynamic workflow authoring

Those are deliberate later-epic hand-offs, not missing Epic 2 behavior.

## What Epic 2 Was Supposed to Put in Place

At platform level, Epic 2 was meant to stand up the first active process
workspace:

- a dedicated route family for process work
- a durable process-surface bootstrap contract
- typed current-object live updates over WebSocket
- a process-facing visible history layer
- a pinned unresolved-request projection
- a process-scoped current-materials projection
- a current side-work summary surface
- start/resume/respond action surfaces with same-session updates
- graceful degradation when live transport or one secondary section fails

This is the epic that turns the shell into a usable working surface.

## Process Work Surface Concepts

The process work surface is designed as one coherent page with parallel views
of current process work:

- core process identity and state
- chronological visible history
- pinned current unresolved request
- current materials and outputs
- current side-work summaries
- live status / reconnect state

The intended user experience is explicitly not “a chat plus some metadata.” It
is a workspace where the user can tell:

- what process they are in
- what phase it is in
- what the next meaningful action is
- what current request is unresolved
- what current artifacts, outputs, and sources matter now
- what separate side work is active or recently resolved
- whether the surface is live, reconnecting, or degraded

## Active, Resume, and Steer Behavior

Epic 2 establishes that active work is controlled from the process surface:

- `draft` processes expose `start`
- `paused` and `interrupted` processes expose `resume`
- accepted user responses enter through a process response composer
- successful actions update the same session immediately
- live updates then deepen or settle the surface state
- if live updates are unavailable, the client falls back to a fresh durable
  bootstrap fetch after successful actions

This is an important milestone: process actions are not generic record patches.
They are process-module-owned actions whose results are projected back into the
shared work surface.

## Delegated and Side-Work Visibility

Epic 2 does not yet introduce full inspectable subordinate threads. Instead, it
introduces a bounded side-work visibility model:

- side work is shown as a distinct current summary item
- active items appear separately from chronological history
- completed or failed side work can remain visible if it still matters to the
  parent process
- history records the chronological moments when side work started, changed,
  completed, failed, or affected the parent process

This is a deliberate compromise: enough visibility to keep separate activity
from disappearing into one stream, without yet building subordinate work
surfaces.

## Live Update and Stream Concepts

Epic 2's live model is one of its central architectural contributions.

### Intended Live Semantics

- the durable bootstrap is fetched first
- the client then opens a WebSocket for live process updates
- the server sends typed `snapshot`, `upsert`, `complete`, and `error` messages
- messages are entity-scoped current-object updates, not raw deltas
- entity types include:
  - `process`
  - `history`
  - `current_request`
  - `materials`
  - `side_work`
- the client reconciles by `subscriptionId` and `sequenceNumber`
- finalized history items are merged by `historyItemId` to prevent duplication

### Degradation Model

- if HTTP bootstrap fails, the surface fails at request level
- if HTTP bootstrap succeeds but live subscription fails, the durable surface
  still opens
- disconnect does not erase already visible state
- reconnect is bootstrap-first, stream-second
- section-level failures in `history`, `materials`, or `sideWork` degrade only
  those sections

This live model is the first concrete realization of the platform architecture's
"typed upsert objects, not raw provider fragments" principle.

## Key Server Designs

### Control Plane Shape

The server remains a single Fastify app. Epic 2 adds:

- process HTML routes
- process bootstrap/action APIs
- a WebSocket route
- process-surface services, readers, builders, and a live hub

The browser still does not talk directly to Convex.

### New Server Subsystem

Epic 2 creates a new `services/processes/` area with responsibilities split
roughly as:

- access assertion
- process-surface bootstrap composition
- process start
- process resume
- process response submission
- process-module registry dispatch
- history/materials/side-work readers
- current-request projection
- live message normalization and publication

This is a notable platform step up from Epic 1: process work now has its own
service layer rather than living as a thin extension of project shell services.

### Process Module Registry

Epic 2 introduces a first-class process module registry because the work
surface needs process-specific semantics for:

- current request projection
- current materials and outputs
- start/resume behavior
- response semantics

The registry is the bridge that keeps the shared process surface generic while
keeping semantics process-owned.

### Visible History vs Current Request

The server design is careful about two distinct representations:

- chronological visible history in `processHistoryItems`
- pinned current unresolved request via `processes.currentRequestHistoryItemId`

The current request is still fundamentally a history item. The process row just
points at the currently unresolved one so the client can keep it pinned without
re-deriving it from the full timeline.

### Current Materials Projection

Materials are process-scoped current working-set projections, not ownership
lookups. The server is supposed to:

- let each process module declare current artifact/source refs
- resolve project artifacts and sources from those refs
- combine them with current process outputs
- avoid duplicate current-output rows when an output is already represented by a
  linked artifact

### Side Work Projection

Side work gets its own summary table and reader because the side-work section is
answering a current-state question, not a chronological-history question.

### WebSocket Live Hub

Epic 2 adds a real-time server seam:

- authenticate and authorize the socket like the HTTP routes
- publish typed process-surface messages only
- send an immediate `snapshot` after subscribe
- never send raw provider/runtime fragments to the browser

## Key Client Designs

### Route Model

Epic 2 moves active work onto a dedicated route:

- `/projects`
- `/projects/:projectId`
- `/projects/:projectId/processes/:processId`

Epic 1's `?processId=` remains a project-shell focus affordance only. Active
process work becomes a bookmarkable, reloadable dedicated route.

### State Model

The client adds a separate `processSurface` store slice rather than overloading
the Epic 1 shell slice. That slice is intended to hold:

- project identity
- process summary
- history envelope
- materials envelope
- current request
- side-work envelope
- request-level loading/error state
- live connection metadata

This is a good example of the design trying to prevent subtle drift: project
shell and process work are adjacent surfaces, but not the same state model.

### Live Reducer Model

The design expects a pure reducer-like helper to apply live messages:

- replace current process summary on `process`
- merge history by `historyItemId`
- replace or clear `currentRequest`
- replace materials section
- replace side-work section

The goal is to keep reconciliation explicit and testable rather than scattering
it across the store and page component.

### Page Composition

The process work surface page is expected to orchestrate:

- route-driven durable bootstrap
- live transport connection lifecycle
- start/resume/respond action flows
- current request rendering
- materials and side-work rendering
- live status and retry UI
- unavailable and degraded states

## Data Model and State Boundaries

### New Durable Tables

Epic 2 adds three durable tables and one key process-row pointer:

- `processHistoryItems`
- `processSideWorkItems`
- `processOutputs`
- `processes.currentRequestHistoryItemId`

The design also expects process-specific state tables to grow bounded fields for
current material references.

### Boundary Rules

The data model deliberately separates:

`processes`
- stable process identity, summary state, and pointer to the unresolved request

`processHistoryItems`
- user-facing visible history only
- not raw deltas
- not the later canonical archive

`processSideWorkItems`
- current summary state for separate work

`processOutputs`
- current output summaries, especially for in-progress or not-yet-published
  outputs

This separation follows the same architecture rule seen elsewhere in the repo:
high-churn operational state should not be stuffed into one shared record.

### History Grain

Epic 2 explicitly uses a visible-history grain, not the later archive grain.
That means:

- visible history is durable and user-facing
- it supports reload and reconnect
- it is not yet the full canonical archive taxonomy
- later archive work is expected to layer beneath or beside it

This is one of the most important conceptual boundaries in the epic.

## Routes, APIs, and Workspace Concepts

### Browser Route

- `/projects/{projectId}/processes/{processId}`

### HTTP APIs

- `GET /api/projects/{projectId}/processes/{processId}`
- `POST /api/projects/{projectId}/processes/{processId}/start`
- `POST /api/projects/{projectId}/processes/{processId}/resume`
- `POST /api/projects/{projectId}/processes/{processId}/responses`

### WebSocket

- `/ws/projects/{projectId}/processes/{processId}`

### Workspace Concept

This epic shifts the “workspace” concept from project-level shell to
process-level work surface. The user still remains inside a project, but they
are now intentionally inside one active process rather than skimming
project-level summaries.

## Test Strategy

Epic 2 follows the same layered service-mock philosophy as Epic 1, but adds a
new direct Convex lane.

Planned test layers:

- direct Convex function tests
- server route/service/WebSocket tests
- client router/page/store/section tests
- small integration lane
- scaffolded e2e placeholder

Planned total from the test plan:

- 92 tests
- 61 TC-mapped
- 31 non-TC decided

The heavy non-TC count is meaningful. Many of the epic's riskiest promises are
architectural rather than single-AC happy paths:

- no raw live deltas
- no finalized-history duplication on reconnect
- no duplicate output/artifact materials rows
- proper section-envelope degradation
- current request treated as first-class live state
- active-first side-work ordering

## Decision Memo Status

No standalone `decision-memo.md` was present in the Epic 2 directory at review
time.

In practice, Epic 2's design decisions appear to have been absorbed into:

- `tech-design.md`
- `tech-design-server.md`
- `tech-design-client.md`
- `codex-impl-log.md`

## Design Decisions Reflected in the Tech Design and Log

In lieu of a standalone decision memo, the Epic 2 pack clearly settles these
choices:

- use a dedicated process route rather than continuing on `?processId=`
- keep Fastify as one monolithic shell + API + WebSocket control plane
- keep the client in vanilla TypeScript rather than switching frameworks
- use `@fastify/websocket` rather than another transport layer
- use bootstrap-first, stream-second reconciliation
- make `currentRequest` a first-class live entity instead of re-deriving it
  from history on every update
- use a visible-history table now rather than prematurely implementing the later
  archive taxonomy
- introduce a process module registry because process-surface semantics exceed
  Epic 1 shell-summary projection needs
- add a dedicated Convex test lane to match the design's durability/testing
  expectations
- treat live-unavailable as a post-bootstrap transport state, not an HTTP
  bootstrap failure
- normalize new Convex work toward guideline-compliant typed/indexed/bounded
  access patterns

## Implementation Log Findings

The implementation log adds strong evidence about how the build actually went.

### Story-Level Delivery Pattern

The epic was implemented story by story:

1. Story 0: foundation
2. Story 1: process entry and bootstrap
3. Story 2: start and resume
4. Story 3: conversation and current request
5. Story 4: materials and outputs
6. Story 5: side-work visibility
7. Story 6: live reconciliation and degradation

Stories 0-3 have explicit commit hashes in the log:

- Story 0 accepted at `f97509a75b051a4434cedf6e74f9e85ea333a5a0`
- Story 1 accepted at `7308d84e6825f1558a0211b666fa71aebdbec119`
- Story 2 accepted at `3d3f344d5aeb84c0d1257239fbc09db92f656b5d`
- Story 3 accepted at `a70c3240bd7a6dc5558e9cf03736b07d1057ce1c`

Later story acceptance is recorded, though not always with the same commit
detail in the portions of the log reviewed.

### Story 0 Findings

- foundation was not clean on first verification
- both Codex and Sonnet initially flagged `convex/processes.ts` as not fully
  normalized to Epic 2 / Convex-guideline expectations
- a cross-process live `process` upsert hole was found and closed
- live-unavailable fixture semantics were clarified

This suggests the epic's foundational contracts and live-message safeguards were
treated as architecture-critical from the start.

### Story 1 Findings

- Story 1 delivered the dedicated process route and durable bootstrap
- it passed the repo-current gate cleanly
- two nonblocking future-risk areas were recorded:
  - conservative `currentRequest` projection
  - simplified materials reader behavior that would need reevaluation in Story 4

This aligns with the spec: Story 1 stood up the route/bootstrap surface before
deepening request/material semantics.

### Story 2 Findings

Story 2 was the first rough delivery slice.

Key issues found and fixed:

- missing or incomplete client handling for stale-action
  `409 PROCESS_ACTION_NOT_AVAILABLE`
- weak proof for resulting `waiting`/`completed`/`failed`/`interrupted` state
  visibility
- non-409 start/resume failures were escaping as dropped async rejections
- malformed or empty action error bodies needed typed fallback handling

Key fixes recorded:

- added action-scoped client error state
- kept the process surface visible on stale-action failure
- improved same-session recovery for non-409 action failures
- strengthened server/API proof for returned action outcomes through real
  action-boundary tests

Residual risks left nonblocking:

- `interrupted` remained reducer-proven more than action-boundary-proven
- malformed/empty action error fallback lacked a targeted test
- empty-body `404` fallback could only infer `PROCESS_NOT_FOUND`

### Story 3 Findings

- response submission was added
- accepted responses became durable visible history
- invalid/failed submissions avoided partial history
- `currentRequest` stayed pinned until cleared or replaced
- deduplication by `clientRequestId` was claimed

Residual risks left nonblocking:

- in-session accepted history append used client-side timestamping
- default `requestKind` projection remained coarse (`other`)
- default Convex response semantics stayed generic and did not synthesize richer
  follow-up behavior by default

### Story 4 Findings

Story 4 is the clearest example of an implementation pivot driven by
verification.

Initial result:

- UI/materials rendering improved
- client tests around materials replacement and empty-state clearing were added

Verifier-discovered blocker:

- durable bootstrap still lacked real non-test writer surfaces for current
  material refs and current outputs
- the reader looked better than the durable model behind it

Local repair round 2 then:

- added `processes:setCurrentProcessMaterialRefs`
- added `processOutputs:replaceCurrentProcessOutputs`
- exposed both through `PlatformStore`
- added direct Convex tests
- added `test:convex`
- folded `test:convex` into `verify`

This is arguably the most important implementation correction in the epic
because it aligned the repo with the design's durability and testing posture.

### Story 5 Findings

Story 5 found and corrected a concrete semantic gap:

- side-work reads were only `updatedAt desc`
- spec and design required active/running side work first

Fixes included:

- active-first side-work ordering in Convex
- durable writer surface for current side-work items
- store exposure
- defensive reader ordering
- improved client rendering distinctions
- dedicated Convex/client/server/page/store tests

### Story 6 Findings

Story 6 closed the last major platform seam for the epic:

- placeholder WebSocket pieces were replaced with a real stack
- `@fastify/websocket` and `@types/ws` were added
- a real WebSocket plugin was registered
- `process-live-normalizer.ts` was added
- an in-memory live hub was added
- socket auth/access checks were added
- immediate snapshot delivery was added
- start/resume/respond services began publishing live messages
- client live status UI and retry behavior were added

At feature level, remaining nonblocking residuals were:

- live hub is in-memory for the current Fastify process
- e2e remains scaffolded rather than implemented

### Orchestration Findings

The log also records repeated orchestration stalls:

- reading/orientation was initially treated like a stopping point
- async subagents stalled after dispatch or after completion
- CLI-based lanes still needed explicit poll-and-harvest discipline
- commit boundaries became unintended stop points

The practical mitigation that emerged was:

- move critical-path implementer/verifier work onto blocking CLI/session
  patterns
- treat all running sessions as active blockers until output is harvested

This matters because it affects how much confidence to place in the delivery
trail: the feature was accepted, but the path there required repeated
orchestration correction.

## How the Build Appears to Have Gone

From the log, Epic 2 appears to have landed successfully but not trivially.

Overall pattern:

- Stories 0-1: foundational and bootstrap work landed with relatively small
  corrections.
- Story 2: first mutation-heavy slice exposed real same-session error-handling
  gaps and required several fix rounds.
- Story 3: durable response/current-request behavior landed with modest residual
  simplifications.
- Story 4: verifier uncovered a meaningful architecture hole; the team had to
  add durable write paths and the missing Convex test lane to close it
  properly.
- Story 5: fixed a real data/ordering semantic mismatch.
- Story 6: turned placeholder live infrastructure into real integrated
  transport.

Feature acceptance evidence in the log is credible:

- story-level verification artifacts are recorded throughout
- multiple stories used dual-lane verification
- final feature gate reports `corepack pnpm run verify-all -> PASS`
- integration tests passed
- e2e remained a deliberate scaffolded `SKIP`

## Completed Work and Accepted Surface

Based on the spec and implementation log, Epic 2 appears to have completed the
following major platform capabilities:

- dedicated process route and HTML entry
- process-surface bootstrap API
- process-surface client page and store slice
- typed process-surface shared contracts
- process history section
- pinned current request panel
- start/resume action flow
- response submission flow
- current materials and outputs surface
- side-work summary surface
- real WebSocket route and live message normalizer
- live client connection lifecycle and retry state
- direct Convex tests for key new durable modules
- updated repo verification workflow including `test:convex`

## Deviations and Pivots

Important deviations/pivots recorded in the design and log:

- no standalone decision memo exists; decisions were absorbed elsewhere
- `PROCESS_LIVE_UPDATES_UNAVAILABLE` was treated as live-state degradation, not
  as an HTTP bootstrap failure
- the repo was not actually greenfield, despite Epic 1's earlier design
  assumption; Epic 2 nested into an existing shell scaffold
- Story 4 forced a pivot from “reader/UI improvements are enough” to “real
  durable writer paths and Convex tests are required”
- the orchestration method itself pivoted away from built-in async worker usage
  toward more controlled CLI/session handling for critical-path work

## Verification Evidence

Strong evidence recorded:

- story-level review artifacts exist across the story set
- Story 0 moved from dual-lane `REVISE` to dual-lane `PASS`
- Story 1 accepted after one convergence round
- Story 2 required multiple fix rounds and eventually reached dual-lane `PASS`
- Story 3 accepted with one lane `PASS` and the other effectively blocked by
  verifier-lane execution limits rather than by semantic code findings
- Story 4 required additional local repair plus `test:convex` adoption before
  acceptance
- Story 5 and Story 6 were accepted with targeted verification and full `verify`
  passes
- final feature verification:
  - `corepack pnpm run verify-all` -> `PASS`
  - `test:integration` -> `PASS`
  - `test:e2e` -> explicit scaffolded `SKIP`

## Risks, Tradeoffs, and Open Questions

### Major Tradeoffs Chosen

- use a visible-history layer now instead of waiting for the later archive layer
- use pinned current-request projection instead of deriving request state from
  raw chronology on every render
- use typed current-object live upserts instead of raw deltas
- keep side-work visibility summary-level only
- keep the client in vanilla TypeScript rather than moving to a richer framework
- keep the live hub in-memory for now

### Risks Still Visible

- the live hub is process-local in memory, which may become a scaling or
  multi-instance concern later
- e2e remains scaffolded, so feature-level runtime trust still leans heavily on
  service/integration layers
- Story 3's default Convex semantics appear intentionally generic and may lag
  richer process-specific follow-up behavior
- some of Story 2's failure-path handling is explicitly noted as only partially
  covered or inferred

### Open Questions / Follow-On Seams

- when and how the user-facing visible history layer should reconcile with the
  later canonical archive layer
- whether the in-memory live hub will remain sufficient once environment/runtime
  work begins in earnest
- how much richer process-specific request typing and follow-up semantics should
  become in downstream process modules

## Intentional Deferrals

The spec and log both reinforce these as later work:

- full environment/runtime/tool execution behavior: Epic 3
- rich artifact review and package workflows: Epic 4
- full inspectable delegated subthreads: later orchestration work
- full canonical archive and derived views: later archive epic
- e2e automation beyond scaffold: future work

These should not be misread as Epic 2 gaps unless implementation has blurred
the boundaries.

## How Epic 2 Contributes to the Larger Standup

Epic 2 is the first real process workspace layer in the standup sequence. Its
main platform contributions are:

- it proves that one process can be worked from inside the platform, not just
  listed
- it establishes the dedicated process route and page model
- it introduces durable visible history before the later archive work
- it introduces a pinned request model for attention-required process work
- it introduces current working-set material projections
- it introduces side-work summary visibility
- it introduces the first real typed live-update stack
- it adds a new durability/testing discipline around Convex operational state

If Epic 1 proved where work lives, Epic 2 proved what active work inside that
container feels like.

## Assessment Notes for Later Review

When comparing the implemented codebase to Epic 2 intent and logged delivery,
later reviewers should explicitly verify:

1. Dedicated active process work uses `/projects/:projectId/processes/:processId`
   rather than hiding behind the Epic 1 `?processId=` shell focus path.
2. The browser still receives one authenticated shell app, not a second process
   micro-app.
3. Fastify remains the control plane for process routes, actions, and WebSocket
   auth/access enforcement.
4. The shared contracts clearly distinguish:
   `process`, `history`, `currentRequest`, `materials`, and `sideWork`.
5. `currentRequest` is treated as a first-class pinned projection and live
   entity, not continuously re-derived from the entire history list.
6. `processHistoryItems` is a user-facing visible-history layer, not an
   accidental first draft of the later canonical archive.
7. Finalized history items reconcile by stable ids and do not duplicate on
   reconnect or reload.
8. Live messages are typed current-object `snapshot`/`upsert`/`complete` events
   rather than raw deltas or transport fragments.
9. The server sends an initial live snapshot after subscription.
10. Start/resume/respond actions update the same session immediately even when
    live transport is unavailable.
11. Stale-action and other process-action failures keep the surface coherent and
    visible rather than dropping the user into broken async failure states.
12. Materials are process-reference-driven, not artifact-owner-driven.
13. Linked output/artifact dedup is based on real linkage, not only display-name
    heuristics.
14. Durable writer paths actually exist for current material refs, current
    outputs, and current side-work items, rather than only seeded test doubles.
15. Side-work ordering is active/running first, then remaining items by recency.
16. The client maintains a dedicated `processSurface` slice rather than
    overloading the project-shell state model.
17. Live-apply logic is centralized and testable rather than scattered through
    page components.
18. The repo really contains the promoted `test:convex` lane and corresponding
    direct Convex tests introduced during Story 4 repair.
19. Story 6's WebSocket/live-hub work is real integrated transport, not
    placeholder scaffolding.
20. Residuals logged as nonblocking remain true residuals:
    in-memory live hub, scaffolded e2e lane, and some generic default process
    semantics in Convex-backed paths.
21. Any divergence from the above should be documented before more functional
    process epics build on top of the Epic 2 surface.
