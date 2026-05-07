# Epic 3 Build Summary: Process Environment and Controlled Execution

## Purpose

This document summarizes what Epic 3, `Process Environment and Controlled
Execution`, was intended to establish in the Liminal Build platform standup and
what the implementation/remediation trail suggests actually happened during
delivery.

Primary source set reviewed:

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-client.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/codex-impl-log.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/implementation-addendum.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic-nit-fix-batch.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-00-fix-batch-01.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-00-fix-batch-02.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-01-fix-batch-01.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-02-fix-batch-01.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-03-fix-batch-01.md`

Upstream framing is inherited from the previously reviewed:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/core-platform-arch.md`

Notable file-status findings:

- No standalone `decision-memo.md` was present in the Epic 3 directory.
- One extra root-level remediation file existed beyond the user’s initial list
  and was included in this review: `story-00-fix-batch-01.md`.
- The implementation addendum explicitly says it supersedes older
  pre-verification cleanup context and should be treated as the current gap
  analysis source.

This report is not a code audit. It is a spec-intent plus
implementation/remediation baseline for later comparison against the repo.

## Upstream Intent Relevant to Epic 3

Epic 3 is where the platform’s environment model stops being an architectural
idea and becomes an actual product/runtime slice. The upstream PRD and technical
architecture had already established several core rules that matter here:

- Fastify remains the control plane and outer controller.
- Convex remains the durable state layer.
- GitHub remains canonical code truth.
- Project artifacts remain project-scoped durable assets, even when revised by
  a process.
- The filesystem is always disposable working state, not canonical truth.
- The browser keeps consuming typed current-object live updates rather than raw
  provider fragments.
- Environment/provider behavior belongs under the existing process surface, not
  in a second product surface.

Epic 3 therefore exists to make the process work surface capable of real
working-copy behavior:

- prepare and hydrate a working environment
- execute controlled work in it
- checkpoint durable outputs back to canonical artifact/code stores
- recover through rehydrate/rebuild
- keep all of that legible inside the same process route

## Epic 3 Goals and Scope

### Primary Goals

Epic 3 was intended to make the following true:

- a process work surface can show durable environment state and stable control
  availability on first load
- `start` and `resume` can trigger real environment preparation and hydration
- controlled execution can run inside a disposable environment without exposing
  a generic terminal as the user-facing model
- artifact outputs can checkpoint back to project-level artifact truth
- code work against already-attached writable sources can checkpoint back to
  canonical code truth
- `rehydrate` and `rebuild` provide real recovery flows
- reopen and degraded-mode behavior preserve durable truth even when live
  environment transport or the working environment is gone

### Scope Boundaries

Epic 3 intentionally does not yet deliver:

- attach/detach source management workflows
- edit source purpose, access mode, target ref, or ownership from the process
  surface
- broader GitHub review / branch-management / PR workflows
- user-initiated discard / teardown controls
- full markdown review or package/export behavior
- full canonical archive entry taxonomy and derived-view work
- process-type-specific prompt/approval semantics

Those omissions are deliberate follow-on work, not evidence of missing Epic 3
behavior.

## What Epic 3 Was Supposed to Put in Place

At platform level, Epic 3 was supposed to establish:

- a durable environment summary in the process bootstrap
- a stable visible control area that includes disabled controls and readable
  reasons
- a provider-backed environment lifecycle under the process route
- deterministic hydration from current artifacts, outputs, and attached sources
- a one-shot controlled execution path into an in-environment TypeScript
  executor
- server-owned checkpoint planning and canonical writes
- durable latest checkpoint visibility in the environment summary
- recovery semantics for `stale`, `failed`, `lost`, `rehydrating`,
  `rebuilding`, and `unavailable`
- reopen behavior that restores process truth, environment truth, and latest
  durable checkpoint visibility

This is the slice that makes the process work surface operational rather than
merely descriptive.

## Environment and Provider Abstraction Concepts

### User-Facing Environment Model

The user is supposed to experience one process with one environment summary,
not a separate sandbox product. The visible environment states are:

- `absent`
- `preparing`
- `rehydrating`
- `ready`
- `running`
- `checkpointing`
- `stale`
- `failed`
- `lost`
- `rebuilding`
- `unavailable`

The process surface must keep these distinct from process lifecycle states such
as `draft`, `running`, `waiting`, `completed`, and `interrupted`.

### Provider Abstraction

The server design introduces a provider adapter interface for:

- environment creation
- hydration
- script execution
- rehydrate
- rebuild
- teardown

The intended platform posture in the original design was:

- hosted Daytona as the first reference provider
- `LocalProvider` as a contract-compatible fast follow

The remediation trail later shows a meaningful pivot:

- `LocalProviderAdapter` was implemented first as the real working provider
- `DaytonaProviderAdapter` became a typed skeleton / research-gated follow-on

That is a notable shift from the original architecture preference, even if it
still preserves the abstract provider contract.

## Controlled Execution Model

Epic 3 explicitly keeps a one-shot execution model:

- the outer controller prepares the environment
- it sends one TypeScript module payload into the environment executor
- the executor returns one structured `ExecutionResult`
- the outer controller decides what becomes durable state and what becomes
  browser-facing live state

The environment is not allowed to become:

- the canonical store
- the direct browser backend
- the place where GitHub or Convex credentials live

## TypeScript Script Executor Concepts

The server companion defines a specific script payload contract:

- `format: 'ts-module-source'`
- `entrypoint: 'default'`
- `source: string`

The execution service is supposed to treat the runtime boundary as
TypeScript-module source, not an opaque string blob or a raw terminal script.

The initial design expected `ExecutionResult` to carry rich structured outputs:

- `processStatus`
- `processHistoryItems`
- `outputWrites`
- `sideWorkWrites`
- `artifactCheckpointCandidates`
- `codeCheckpointCandidates`

One of the major epic-level findings was that the real implementation initially
underdelivered this contract. The remediation trail then expanded it to match
the design more honestly.

## Tool Harness and Capability Boundary

The architecture promise is that the in-environment executor gets:

- filesystem access
- a process-scoped tool API

It should not get:

- raw GitHub credentials
- raw Convex credentials
- direct canonical-store access

The server-side testing strategy even calls this boundary out as something that
should be testable rather than assumed from prose.

## Hydration, Checkpointing, and Recovery Concepts

### Hydration

Hydration is supposed to be deterministic and process-scoped:

- hydrate only the process’s current artifact refs and current versions
- hydrate current outputs
- hydrate already-attached current sources
- include source `accessMode` in the plan
- avoid broad “whole project” materialization

### Checkpointing

Checkpointing is server-owned:

- artifact outputs persist to project-level artifact truth
- revising an existing artifact appends a new version
- artifact ownership is not transferred to the latest process
- writable attached sources persist back to their canonical target ref
- read-only sources are excluded from code checkpoint planning
- latest checkpoint visibility is projected into `environment.lastCheckpointResult`

Epic 3 intentionally keeps checkpoint visibility latest-only. It does not add a
browser-facing ordered checkpoint history.

### Recovery

Recovery is explicitly split:

- `rehydrate` refreshes a still-recoverable environment from canonical inputs
- `rebuild` reconstructs after loss or unrecoverable failure

The spec and design are careful about the acceptance boundary:

- already-known preflight blockers reject immediately
- later provider/hydration/execution/checkpoint failures become environment
  state transitions, not retroactive HTTP request errors

## Key Server Designs

### Control Plane Shape

The server remains a single Fastify monolith. Epic 3 adds a deeper environment
orchestration layer beneath the existing process routes and live channel. There
is no separate `/api/environments/*` browser surface in this slice.

### New Server Subsystem

Epic 3 adds and/or extends:

- `process-work-surface.service.ts`
- `process-start.service.ts`
- `process-resume.service.ts`
- `environment-section.reader.ts`
- `process-environment.service.ts`
- `environment-orchestrator.ts`
- provider adapter interfaces and registry
- hydration planner
- checkpoint planner
- code checkpoint writer
- script-execution service
- environment-aware live publication

This is the biggest server-side step-up since Epic 2. The process route becomes
the entry point to a real environment subsystem.

### Durable Environment State

The design introduces `processEnvironmentStates` as a new durable table and is
very explicit that:

- `processes` owns process lifecycle
- `processEnvironmentStates` owns environment lifecycle

This separation is one of the central architecture decisions in the epic.

### Provider Selection

The original design says:

- server config chooses a default provider when no row exists yet
- default should be `daytona`
- local should be explicit for trusted development
- once chosen, `providerKind` becomes durable per environment/process

The implementation/remediation trail shows that this was not true at first:

- runtime initially defaulted to `InMemoryProviderAdapter`
- `providerKind` could persist as `null`
- later fixes made persisted `providerKind` authoritative and moved the default
  toward honest provider selection

### Canonical Write Boundaries

The server is supposed to:

- write artifact outputs into durable artifact/version state
- write code outputs through a GitHub boundary
- update latest checkpoint result in durable environment state
- append visible process history events when checkpoint/recovery moments are
  user-visible

The environment never writes canonical truth directly.

## Key Client Designs

### Same Route, Richer Surface

Epic 3 intentionally does not add a new route kind. It stays inside:

- `/projects/:projectId/processes/:processId`

This is a deeper process surface, not a new app.

### State Model

The client continues using one `processSurface` slice and extends it with:

- `environment`
- stable `controls`
- action error state for immediate request rejection
- live updates for `environment`

The design insists on keeping distinct:

- process lifecycle state
- environment lifecycle state
- action availability / disabled reasons

### Stable Visible Controls

This is the biggest browser behavior change:

- stop rendering actions only from `availableActions`
- render from the full `controls` array
- keep control order stable
- keep disabled actions visible
- show readable `disabledReason`

This change is central to Epic 3’s UX model and became a recurrent source of
same-session drift bugs in the implementation log.

### Environment Panel and Latest Checkpoint Result

The client adds:

- `process-environment-panel.ts`
- `process-controls.ts`
- `process-checkpoint-result.ts`

The environment panel is expected to render:

- environment state / label
- blocked reason
- hydration/checkpoint timestamps
- latest checkpoint result

Checkpoint results should not become a separate scrolling history list in this
epic.

## Data Model and State Boundaries

### New/Extended Durable State

Epic 3 adds or extends:

- `processEnvironmentStates`
- `sourceAttachments.accessMode`
- `processHistoryItems` for settled environment/checkpoint moments
- compatibility use of `processes.hasEnvironment`

### Key Environment Row Fields

The design expects `processEnvironmentStates` to hold:

- `processId`
- `providerKind`
- `environmentId`
- `state`
- `blockedReason`
- `lastHydratedAt`
- `lastCheckpointAt`
- `lastCheckpointResult`
- `workingSetFingerprint`

### Latest Checkpoint Result Boundary

`lastCheckpointResult` is latest-only and should carry:

- `checkpointKind`
- `outcome`
- target label
- artifact identifiers/version identifiers when artifact persistence succeeds
- source target ref when code persistence succeeds
- provenance process id for artifact version writes
- failure reason when relevant

This field is the user-facing environment summary of the last settled
checkpoint, not a new historical ledger.

### Compatibility Boundary

The design intentionally keeps `processes.hasEnvironment` for compatibility even
though `processEnvironmentStates` is the real environment authority. That means
later reviewers should expect some dual-path compatibility logic and verify that
it is derived, not independently drifting.

## Routes, APIs, and Workspace Concepts

### Browser Route

- `/projects/{projectId}/processes/{processId}`

### HTTP APIs

- `GET /api/projects/{projectId}/processes/{processId}`
- `POST /api/projects/{projectId}/processes/{processId}/start`
- `POST /api/projects/{projectId}/processes/{processId}/resume`
- `POST /api/projects/{projectId}/processes/{processId}/rehydrate`
- `POST /api/projects/{projectId}/processes/{processId}/rebuild`

### WebSocket

- `/ws/projects/{projectId}/processes/{processId}`

### Workspace Concept

Epic 3 keeps the workspace concept unified:

- process work surface stays the user entry point
- environment state is a first-class entity inside it
- checkpoint outcomes are shown inside that same surface
- recovery is driven from that surface

The user should not feel like they are leaving the process workspace to enter a
separate environment-management console.

## Test Strategy

Epic 3’s test plan is extensive and intentionally cross-layered.

Planned test layers:

- direct Convex durability tests
- server route/service/live tests
- client page/control/panel/live tests
- integration tests
- scaffolded e2e placeholder

Planned total in the original test plan:

- 105 tests
- 58 TC conditions
- 36 non-TC decided tests

By the remediation addendum’s closure snapshot, actual counts had grown beyond
that original plan:

- 36 convex
- 167 service
- 157 client
- 12 integration

This is a meaningful sign that the epic’s real defect surface, especially on
the production path, was larger than the original story-level plan fully
captured.

## Decision Memo Status and Implicit Decisions

No standalone Epic 3 `decision-memo.md` was present.

In practice, the design and remediation files settle several implicit decisions:

- environment lifecycle gets its own durable table
- the process route remains the only browser entry point
- one-shot TypeScript module execution remains the execution stance
- latest checkpoint visibility is latest-only
- read-only sources are excluded at checkpoint-planning time rather than via a
  separate browser action family
- environment/provider logic must stay under server ownership
- environment progress/failure is surfaced through `environment` live updates
- `statusLabel` is a required server contract value, not something the client
  should recompute
- artifact content belongs in Convex File Storage rather than inline row
  metadata
- LocalProvider-first became the practical implementation route, even though the
  design originally preferred Daytona-first

## Implementation Log Findings

The implementation log gives a very detailed story-by-story and later
epic-level picture of the build.

### Story 0

- Story 0 introduced the shared environment/control/access-mode/checkpoint
  vocabulary
- full gate initially failed due to type fallout from required new fields
- two fix batches closed:
  - shared export duplication / fixture typing / missing required fields
  - one strict-equality response assertion still pinned to the old shape
- dual verification passed after the fixes

This suggests the contract layer was useful but immediately caused integration
churn in older tests and fixtures.

### Story 1

- Story 1 delivered durable environment truth on bootstrap and the stable
  visible control area
- initial verification exposed a real same-session inconsistency:
  `start` / `resume` / `respond` rebuilt `process` summaries without the current
  environment summary
- fix batch 01 made those action responses environment-aware and added a
  focused regression
- both verifiers passed after rerun

This is the first strong signal of a recurring Epic 3 invariant:
environment-driven control truth has to be carried through every returned and
published process summary.

### Story 2

- Story 2 had serious implementation-lane reliability trouble
- multiple internal Codex workers stalled in inspection / `AWAITING` mode with
  no workspace delta
- recovery switched to bounded external slices and later to direct-Bash Codex
  dispatch patterns

Substantively, Story 2 introduced:

- visible `preparing` state after `start` / `resume`
- hydration-plan persistence including artifacts, sources, and outputs
- source `accessMode` visibility
- minimal provider/environment service files

But the log is clear that Story 2 was initially under-implemented and had to be
re-verified on a moving tree before acceptance.

### Story 3

- Story 3 introduced provider-backed execution visibility and live environment
  transitions
- initial Codex review found a MAJOR same-session recovery bug:
  execution-lane live publications updated `environment` but not the
  environment-aware `process` summary
- fix batch 01 repaired this for `running`, `checkpointing`, and `failed`
  transitions
- both verifiers passed after round 2

This confirms the same invariant seen in Story 1: any environment transition
that changes controls or `hasEnvironment` must republish `process` alongside
`environment`.

### Story 4 and Later Epic-Level Reality

The log’s biggest finding is that story-level acceptance did not mean the
production path was honest.

After Stories 0-6 plus pre-verification cleanup and a nit-fix batch, a proper
four-phase epic-level verification was finally run. Its synthesis verdict was:

- **BLOCK**

The synthesis said story-level work was durable-state-coherent, but the real
default runtime still under-delivered Epic 3’s promises on the production path.

Key epic-level gaps included:

- runtime still defaulted to in-memory provider behavior
- code checkpoint writer was still a stub
- artifact contents were discarded
- `accessMode` was not durably persisted in Convex
- `workingSetFingerprint` existed in theory but not in runtime behavior
- execution contract was too coarse
- failure handling still silently swallowed some secondary failures

This is the most important implementation-log finding for Epic 3:
story-by-story green status was not enough to claim production-path completion.

### Phase 4 Fix Chunks

The log then records a three-chunk closure program:

- Chunk 1: Convex durability foundation
- Chunk 2: real provider lane + honest error handling
- Chunk 3: real GitHub writer + contract cleanup

Each chunk was re-verified by Codex `gpt-5.4 xhigh` and only accepted when the
verifier returned PASS.

### Orchestration Learnings

The log also records several process lessons:

- teammate-managed `codex exec` was unreliable for long-running critical-path
  work
- direct Bash `run_in_background` dispatch with explicit stderr capture worked
  much better
- Sonnet repeatedly missed blockers that Codex caught, especially on
  production-path questions
- story-level verify-then-fix was expected, not accidental

Those are process findings rather than code findings, but they help explain why
the epic needed such a strong remediation layer.

## Remediation and Fix-Batch Findings

The remediation trail is unusually important for Epic 3 because it materially
changes what “implemented” means.

### Implementation Addendum

The addendum is the authoritative gap-analysis document after the initial
epic-level BLOCK. It says:

- all 14 gap items were closed across three chunks by commit `7ea7c30`
- all chunk gates were green
- residual required-with-default contract anti-patterns remained nonblocking
  future cleanup
- remaining Epic 3 acceptance work was still:
  - full four-phase epic re-verification on the final tree
  - manual verification checklist against `npx convex dev` + Fastify/Vite dev
    server with LocalProviderAdapter and real Octokit writer

That means the addendum presents Epic 3 as production-path-repaired, but not yet
fully acceptance-closed in the surviving written record.

### Story 0 Fix Batches

`story-00-fix-batch-01.md` and `story-00-fix-batch-02.md` imply:

- shared contract changes were real enough to ripple through many preexisting
  fixtures and tests
- required fields like `environment` and `accessMode` immediately exposed how
  much older test code had assumed the simpler Epic 2 shape
- `process.controls` and `process.hasEnvironment` created brittle deep-equality
  fallout

These are foundation-integration issues, not behavior redesigns.

### Story 1 Fix Batch

`story-01-fix-batch-01.md` implies:

- same-session coherence between `process` and `environment` is a first-class
  invariant
- action responses and live/publication paths must be recomputed against the
  current durable environment summary
- this was cheap enough to fix early and therefore not worth carrying forward
  as accepted drift

This pattern repeats later and looks like one of Epic 3’s core architectural
pressure points.

### Story 2 Fix Batch

`story-02-fix-batch-01.md` is historical and explicitly superseded later, but it
still shows:

- once preparation became real, older tests were semantically wrong
- accepted `resume` no longer meant immediate `running`
- action response semantics had to remain distinct from later live transitions

This file is a good example of the environment lifecycle making older process
assertions stale.

### Story 3 Fix Batch

`story-03-fix-batch-01.md` makes the recurring coherence issue explicit:

- if `environment` transitions without a recomputed `process` summary, controls
  and `availableActions` drift stale until reload
- this applies not only on failure but also on `running` and `checkpointing`
  transitions

This fix batch is strong evidence that the right unit of publication is often
`process + environment` together, not `environment` alone.

### Epic Nit Fix Batch

The historical `epic-nit-fix-batch.md` is superseded by the later addendum, but
it still usefully captures early “small” problems:

- documentation drift around `rehydrating`, writability wording, and “error
  classes”
- missing process-event history on lifecycle transitions
- missing hydration-plan persistence
- nullable `providerKind`
- shallow server legibility assertions

The later addendum effectively shows that some of these were not really nits at
all once production-path verification got stricter.

### Phase 4 Closure Chunks

The addendum and the log together show the final remediation changed the
platform shape in meaningful ways:

#### Chunk 1 — Convex Durability Foundation

- artifact content moved to Convex File Storage via `contentStorageId`
- `accessMode` became durable and projected
- `workingSetFingerprint` became stored and compared
- `hasCanonicalRecoveryMaterials` semantics were aligned between stores
- `hasEnvironment` became derived/maintained from environment truth
- typed Convex compliance improved

#### Chunk 2 — Real Provider Lane + Honest Errors

- real `LocalProviderAdapter` landed
- `DaytonaProviderAdapter` became a typed skeleton rather than an invisible
  missing seam
- `ExecutionResult` expanded to the full structured contract
- fire-and-forget cleanup/failure behavior was hardened
- persisted `providerKind` became authoritative
- output/side-work replace semantics were corrected
- a missing `transitionProcessToFailed` lifecycle case was fixed

#### Chunk 3 — Real GitHub Writer + Cleanup

- real `OctokitCodeCheckpointWriter` landed
- direct write to attached writable `targetRef` became real behavior
- read-only / unknown-source paths became fail-closed
- real integration tests were added against `liminal-ai/liminal-build`
- client trust shifted to server-supplied `statusLabel`
- schema defaults that masked malformed environment payloads were removed

## How the Build Appears to Have Gone

Epic 3 appears to have been built in two distinct phases:

1. Story-by-story implementation that produced a coherent and well-tested
   process-surface environment model.
2. A later, more realistic production-path correction phase that closed the gap
   between mocked/stubbed success and actual platform honesty.

That second phase is the key difference between “the epic was implemented” and
“the epic is actually trustworthy.”

In practical terms:

- Stories 0-3 were real and meaningful
- Story-level dual verification caught genuine same-session coherence defects
- Story-level green status still missed major production-path gaps
- proper epic-level verification forced a much stronger closure program
- the addendum’s three fix chunks materially deepened the implementation beyond
  the original story commits

## Completed Work and Current Closure State

What appears materially completed from the combined design/log/addendum trail:

- durable environment summary on process bootstrap
- stable visible control area
- environment state matrix and disabled reasons
- environment lifecycle row in Convex
- source `accessMode` in durable source state
- provider-backed preparation / hydration path
- one-shot script execution seam
- environment live entity in current-object updates
- latest checkpoint result in environment summary
- real local provider implementation
- real GitHub checkpoint writer
- artifact content durability via Convex File Storage
- working-set fingerprint storage and stale detection logic
- stronger Convex/store/runtime alignment than the story-level build initially had

Current closure nuance from the surviving documents:

- story set: implemented and committed
- production-path gap items: closed per implementation addendum
- final epic acceptance: still described as pending rerun of full four-phase
  epic verification plus manual checklist in the addendum

So the most honest summary is:

- Epic 3 appears production-path-repaired
- but the written trail we reviewed does not itself include the final post-addendum
  SHIP verdict or completed manual acceptance walkthrough

## Deviations and Pivots

Key pivots from original intent or earlier assumptions:

- **Daytona-first → LocalProvider-first in practice**
  The design preferred Daytona first, but the remediation work implemented Local
  first and left Daytona as a typed skeleton.

- **Story-level green → epic-level BLOCK**
  The original story sequence produced accepted stories, but feature-level
  production-path review overturned the implied readiness.

- **Stub defaults → honest runtime defaults**
  In-memory provider and stub checkpoint writer were initially acceptable enough
  for story progress but not for epic acceptance.

- **Inline contract trust → explicit server contract trust**
  The client initially recomputed `statusLabel`; remediation moved it back to
  trusting the server contract.

- **Generic durability promises → explicit storage decisions**
  Artifact content storage, fingerprint computation, and internal Convex action
  boundaries had to be decided concretely during remediation.

## Verification Evidence

Important evidence from the reviewed trail:

- Story 0, Story 1, Story 2, and Story 3 have explicit acceptance/commit
  checkpoints in the implementation log.
- Story-level verify gates repeatedly passed after fix routing.
- A proper four-phase epic-level verification was later run and returned
  **BLOCK** before remediation.
- The implementation addendum says all 14 gap items were then closed across
  three fix chunks.
- Closure gates reported green:
  - `corepack pnpm run verify`
  - `corepack pnpm run test:integration`
  - `tsc --noEmit -p convex/tsconfig.json`
- Real GitHub integration tests were added during Chunk 3 remediation.

But also:

- the addendum itself says final acceptance still required:
  - rerunning four-phase epic verification on the final tree
  - walking the manual checklist end-to-end

So the evidence is strong for major remediation completion, but incomplete for
final documented acceptance closure.

## Risks, Tradeoffs, and Open Questions

### Major Tradeoffs Chosen

- keep environment work inside the process surface instead of creating a second
  environment-management product area
- preserve one-shot execution rather than a richer interactive runtime model
- use latest-only checkpoint visibility instead of a checkpoint history surface
- keep compatibility fields like `hasEnvironment` during the transition to
  `processEnvironmentStates`
- implement LocalProvider first to prove the real contract sooner
- use Convex File Storage for artifact content rather than inline document
  payloads

### Risks Still Visible

- the design/runtime posture for shared/remote Daytona remains only partially
  realized in the reviewed trail
- remaining required-with-default schema anti-patterns were flagged as
  nonblocking future cleanup
- some story-level verifiers systematically under-detected production-path
  problems compared to Codex’s stricter review stance
- acceptance closure remains under-documented after the addendum unless there
  are later artifacts outside the reviewed set

### Open Questions / Follow-On Seams

- when the real Daytona implementation will close the hosted-provider research
  gate
- how later epics will reconcile latest-only checkpoint visibility with richer
  review/history/provenance surfaces
- whether compatibility fields like `hasEnvironment` can eventually be removed
  cleanly once all consumers trust environment summary truth directly

## Intentional Deferrals

The spec, design, and remediation all continue to defer:

- full Daytona integration details and hosted auth flow closure
- Cloudflare or other alternative managed providers
- user-initiated discard / teardown controls
- full GitHub review/branch/PR workflows
- ordered checkpoint-result UI
- full canonical archive entry taxonomy
- e2e automation beyond scaffold
- process-type-specific orchestration richness beyond the shared substrate

These should not be mistaken for Epic 3 failures unless later code blurs the
boundaries.

## How Epic 3 Contributes to the Larger Standup

Epic 3 is the first slice that makes the platform’s execution substrate real.
Its main contributions are:

- it turns the process work surface into a real environment-backed workspace
- it establishes durable environment lifecycle state distinct from process
  lifecycle
- it establishes deterministic hydration and recovery semantics
- it proves the outer-controller / sandbox / canonical-store separation
- it establishes the first real canonical artifact and code checkpoint loop
- it forces the platform to confront the difference between test doubles and
  real production-path defaults

If Epic 2 proved active process work, Epic 3 proved controlled environment work
and canonical persistence boundaries.

## Assessment Notes for Later Review

When comparing the implemented codebase to Epic 3 intent, implementation
reality, and remediation, later reviewers should explicitly verify:

1. `processEnvironmentStates` exists and is the real durable authority for
   environment lifecycle.
2. `processes` still owns process lifecycle only, and compatibility fields such
   as `hasEnvironment` are derived from environment truth rather than drifting
   separately.
3. The process route remains the only browser entry point; there is still no
   parallel `/api/environments/*` user surface.
4. The client renders from `process.controls`, not only `availableActions`.
5. Disabled controls stay visible with readable `disabledReason`.
6. `environment` is required in process bootstrap and can render `absent` and
   `unavailable` without collapsing the whole page.
7. Action responses and live publications recompute `process` summaries with the
   current environment summary whenever control truth changes.
8. `sourceAttachments` now durably store and project `accessMode`.
9. The production/default runtime does not silently boot with
   `InMemoryProviderAdapter` or a stub checkpoint writer in code paths that
   claim to be real.
10. `LocalProviderAdapter` is genuinely implemented and wired through the real
    app path.
11. `DaytonaProviderAdapter` status is honestly represented in code and config
    rather than implied to be complete if it is still a skeleton.
12. The script executor takes TypeScript module source and returns a structured
    `ExecutionResult` close to the spec’s intended rich shape.
13. The executor/tool harness boundary does not leak raw GitHub or Convex
    credentials.
14. Artifact contents are durably stored, not discarded, and artifact checkpoint
    writes append versions instead of transferring artifact ownership.
15. `workingSetFingerprint` is both written and actually compared at runtime for
    stale detection.
16. `rehydrate` and `rebuild` differ meaningfully in runtime behavior and
    rejection rules.
17. `lastCheckpointResult` remains latest-only and travels inside `environment`
    bootstrap/live state.
18. Read-only sources are fail-closed for code checkpoint planning and do not
    imply a writable persistence path in the UI.
19. The client trusts required contract fields like `statusLabel` instead of
    recomputing them locally.
20. Schema defaults are not masking missing required environment fields on the
    critical path.
21. The real store path (`ConvexPlatformStore`) matches `InMemoryPlatformStore`
    semantics on critical behaviors such as canonical recovery materials and
    hydration-plan persistence.
22. Any final post-addendum epic verification artifacts, if they exist outside
    this reviewed set, should be checked before declaring Epic 3 fully closed,
    because the addendum itself still marked final re-verification and manual
    acceptance as remaining work.
