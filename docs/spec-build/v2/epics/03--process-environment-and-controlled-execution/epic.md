# Epic 3: Process Environment and Controlled Execution

This epic defines the complete requirements for Liminal Build process
environments and controlled execution. It serves as the source of truth for the
Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who wants to run high-quality crafted processes through one durable
project surface instead of manually stitching together prompts, tools,
documents, environments, and code persistence flows.
**Context:** The user has opened a concrete process that now needs working
files, controlled execution, and durable checkpointing rather than only shell-
level summaries or process-surface visibility.
**Mental Model:** "This process has a working environment. The environment can
be prepared, hydrated, used, rebuilt, and discarded by the system when needed.
The real source of truth for process outputs lives outside that working copy."
**Key Constraint:** The environment must be useful for real work, including
artifact outputs and code work against already-attached writable repositories,
without turning the platform into a generic terminal host or requiring a
separate source-management product surface in the same epic.

---

## Feature Overview

This feature gives a process a disposable working environment inside the shared
process work surface. After it ships, the user can see the environment state
for one process, use a stable set of visible controls to start or resume work,
hydrate the process's assigned artifacts and already-attached sources into a
working copy, follow controlled execution in that environment, and recover when
the environment becomes stale, fails, or is lost. Durable artifact outputs
checkpoint back to canonical artifact state. Durable code work against
already-attached writable sources checkpoints back to canonical code truth for
those sources. Full source-attachment management, provenance browsing, and
broader GitHub review or publishing workflows remain outside this epic.

---

## Scope

### In Scope

This epic delivers the shared environment and execution layer beneath the Epic 2
process work surface:

- Process-surface environment summary and stable visible control area
- Environment readiness visibility for a process before active work begins
- Start and resume flows that prepare an environment when needed
- Hydration of already-assigned current artifacts, current outputs, and
  already-attached current sources into the process working copy
- Access-mode visibility for already-attached sources used by the process
- Controlled execution in the environment through the shared process surface
- Live visibility for environment preparation, active execution, checkpointing,
  and recoverable failures
- Durable checkpointing of artifact outputs back to canonical artifact state
- Durable checkpointing of code work back to canonical code truth for
  already-attached writable sources
- Rehydrate and rebuild flows after staleness, failure, or environment loss
- Return-later and reopen behavior when no active environment is currently
  running
- Degraded behavior when environment lifecycle, hydration, or checkpoint work
  fails independently of the durable process surface

### Out of Scope

- Attaching or detaching repositories or other external sources from a process
- Editing source purpose, access mode, target ref, or source ownership from the
  process surface
- Source provenance browsing beyond the current process materials and visible
  checkpoint results
- Standalone freshness-management workflows for source attachments outside the
  process work surface
- Full GitHub review, branch-management, or pull-request-management workflows
- User-initiated environment discard or teardown controls
- Full markdown review, Mermaid rendering, and package/export workflows (Epic 4)
- Full canonical archive entry taxonomy, turn derivation, or chunk/view
  derivation behavior (Feature 5 follow-on work)
- Generic workflow-schema authoring or no-code process configuration
- Process-type-specific prompts, phase rules, or approval semantics for
  `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation`

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Epic 1 project shell and Epic 2 process work surface are already in place | Validated | Platform | Epic 3 extends those surfaces rather than replacing them |
| A2 | A process can exist and remain visible without an active environment | Validated | Platform | Durable process state is not coupled to sandbox existence |
| A3 | A process may already have current artifacts, current outputs, and current sources before the first environment is prepared | Validated | Platform | Epic 2 already established current materials visibility |
| A4 | Source attachments needed by this epic already exist before the user begins environment work | Validated | Platform | This epic consumes existing attached sources and does not define source-management flows |
| A5 | Some attached sources are read-only and some are writable | Validated | Product + Platform | Writable sources support canonical code checkpointing; read-only sources do not |
| A6 | The working filesystem is always disposable working state rather than canonical truth | Validated | Platform | Rebuild and recovery depend on this boundary |
| A7 | Code work against attached writable sources must persist back to canonical code truth in this epic rather than stopping at an in-environment draft state | Validated | Product + Platform | This keeps the environment slice real for code-bearing processes |
| A8 | The process surface keeps a stable visible control area even when some controls are disabled in the current state | Validated | Product | UX layout may evolve later; visible control availability must remain legible now |
| A9 | Full source-management UX remains follow-on work even though this epic performs real hydration and checkpointing for already-attached sources | Validated | Platform | The epic boundary is environment/execution, not source management |

---

## PRD Backfills

This epic required three clarifications in
`docs/spec-build/v2/core-platform-prd.md` to keep the epic and PRD aligned.

| PRD Area | Backfill | Why |
|----------|----------|-----|
| Feature 3 overview, scope, and AC-24 | Feature 3 now states that the first environment epic includes real checkpointing for artifact outputs and for code work against already-attached writable repositories | This epic includes a usable end-to-end environment loop rather than stopping at an in-environment draft state |
| Feature 5 overview and scope | Feature 5 now states that it owns source-attachment lifecycle, source classification, provenance-facing workflows, freshness workflows beyond the minimal environment loop, and the broader canonical-source model | This epic consumes already-attached sources and defers the source-management product surface rather than silently omitting it |
| Milestones and sequencing rationale | Milestone and sequencing language now distinguishes the first usable environment slice from the later broader source-management and canonical-source slice | The next epic needs an explicit boundary instead of inferring it from partial overlap between Feature 3 and Feature 5 |

---

## Flows & Requirements

### 1. Viewing Environment State and Control Availability

The user opens a process that now depends on environment work. The process
surface needs to show whether an environment exists, whether the working set is
ready, and which actions are currently available without hiding unavailable
controls or forcing the user to guess why an action cannot run yet.

1. User opens a process work surface
2. System loads the current process state, current materials, environment
   summary, and visible controls
3. User sees whether the environment is absent, preparing, ready, stale,
   checkpointing, failed, lost, rebuilding, or unavailable
4. User sees a stable set of visible controls with enabled or disabled state
5. User understands the next meaningful action without inferring environment
   readiness from the transcript alone

#### Acceptance Criteria

**AC-1.1:** The process work surface shows the current environment state on
first load, including whether an environment is absent, preparing, ready,
running, checkpointing, stale, failed, lost, rebuilding, or unavailable.

- **TC-1.1a: Environment state visible on first load**
  - Given: User opens a process work surface
  - When: The surface renders
  - Then: The current environment state is visible without requiring the user to start or resume the process first
- **TC-1.1b: No active environment still renders a legible state**
  - Given: Process has no current environment
  - When: The work surface renders
  - Then: The environment area shows an explicit absent or not-yet-prepared state rather than appearing blank or broken

**AC-1.2:** The process work surface shows a stable visible control set for the
process, including `start`, `respond`, `resume`, `rehydrate`, `rebuild`,
`review`, and `restart`, with each control marked enabled or disabled according
to the current state.

- **TC-1.2a: Stable control set remains visible**
  - Given: User opens a process work surface in any supported process state
  - When: The control area renders
  - Then: The same standard control set is visible in a stable order
- **TC-1.2b: Disabled controls remain visible**
  - Given: One or more controls are not valid in the current process and environment state
  - When: The control area renders
  - Then: Those controls remain visible and appear disabled rather than disappearing

**Environment state and control matrix** *(Traces to: AC-1.1, AC-1.2, AC-5.1)*

| TC | Environment state | Expected surface behavior | Expected control behavior |
|----|-------------------|---------------------------|---------------------------|
| TC-1.1c | `preparing` | Surface identifies the environment as being prepared and not yet ready for active work | `start`, `resume`, `rehydrate`, `rebuild`, and `restart` are disabled while preparation is in progress; `respond` and `review` continue to follow process state |
| TC-1.1d | `ready` | Surface identifies the environment as prepared and ready for process work | `rehydrate` and `rebuild` are disabled; `start` or `resume` may be enabled if the process state allows them; `respond`, `review`, and `restart` continue to follow process state |
| TC-1.1e | `running` | Surface identifies the environment as actively executing process work | Recovery controls remain disabled during active execution; other visible controls continue to follow process state |
| TC-1.1f | `checkpointing` | Surface identifies the environment as persisting durable work rather than preparing or actively executing | `start`, `resume`, `rehydrate`, `rebuild`, and `restart` are disabled until checkpointing settles; `respond` and `review` continue to follow process state when relevant |
| TC-1.1g | `stale` | Surface identifies the environment as stale rather than failed or lost | `rehydrate` becomes enabled when the working copy is recoverable; `rebuild` remains disabled unless a full reconstruct path is required, and `disabledReason` explains the unavailable option |
| TC-1.1h | `lost` | Surface identifies the environment as lost rather than merely absent | `rebuild` becomes enabled; `rehydrate` is disabled with a reason because no recoverable working copy remains |
| TC-1.1i | `failed` | Surface identifies the environment as failed and not currently progressing | `start` and `resume` are disabled; `rehydrate`, `rebuild`, or `restart` become enabled only when that recovery path is valid, and `disabledReason` explains the unavailable alternatives |
| TC-1.1j | `rebuilding` | Surface identifies the environment as being reconstructed from canonical truth | `rehydrate`, `rebuild`, `start`, `resume`, and `restart` are disabled while rebuild is in progress; `respond` and `review` continue to follow process state |
| TC-1.1k | `unavailable` | Surface identifies the environment service as currently unavailable rather than presenting the process as broken | All environment-changing controls are disabled unless a distinct process-level recovery path is valid, and `disabledReason` explains the blocked actions |

**AC-1.3:** A disabled control includes a visible reason when the current state
prevents that action.

- **TC-1.3a: Disabled reason shown for blocked environment action**
  - Given: `rehydrate` or `rebuild` is not currently available
  - When: User inspects the disabled control
  - Then: The surface shows why that action is currently unavailable
- **TC-1.3b: Disabled reason shown for blocked process action**
  - Given: `start`, `resume`, `respond`, `review`, or `restart` is not currently available
  - When: User inspects the disabled control
  - Then: The surface shows why that action is currently unavailable

**AC-1.4:** The visible environment state and control availability derive from
durable process and environment state rather than from transient client-only
assumptions.

- **TC-1.4a: Reload preserves environment truth**
  - Given: Process has a durable environment state and visible control states
  - When: User reloads the process route
  - Then: The same environment truth is restored from durable state rather than resetting to a default client assumption

**AC-1.5:** The absence, loss, or failure of an environment does not hide the
process identity, current materials, or durable process state.

- **TC-1.5a: Process remains visible without environment**
  - Given: Process has no active environment or previously lost its environment
  - When: User opens the process work surface
  - Then: The process identity, current materials, and durable process state remain visible

### 2. Starting or Resuming with Environment Preparation and Hydration

The user needs to move from a visible process to a usable working copy. Starting
or resuming a process must prepare the environment, hydrate the current working
set, and only move into active execution once the required materials are ready
or a recoverable failure state is shown.

1. User opens a process work surface with a visible `start` or `resume` control
2. User activates `start` or `resume`
3. System enters environment preparation for that process
4. System hydrates the current working set into the environment
5. System confirms that the working set is ready or shows a recoverable failure
6. Process proceeds into active work

#### Acceptance Criteria

**AC-2.1:** Starting a draft process or resuming an eligible process moves the
surface into a visible environment-preparation state in the same session.

- **TC-2.1a: Start enters preparation state**
  - Given: User is viewing a draft process with `start` enabled
  - When: User starts the process
  - Then: The surface enters a visible environment-preparation state in the same session
- **TC-2.1b: Resume enters preparation state when environment work is needed**
  - Given: User is viewing a resumable process whose environment must be prepared or refreshed
  - When: User resumes the process
  - Then: The surface enters a visible environment-preparation state in the same session

**AC-2.2:** Environment preparation hydrates the process's current artifacts,
current outputs, and already-attached current sources into the working copy
before controlled work depends on them.

- **TC-2.2a: Current materials hydrate into environment**
  - Given: Process has current artifacts, outputs, and attached sources
  - When: Environment preparation runs
  - Then: The working copy is prepared from those current materials rather than from unrelated project materials
- **TC-2.2b: Process with partial working set still hydrates correctly**
  - Given: Process has only some of artifacts, outputs, or attached sources
  - When: Environment preparation runs
  - Then: The environment hydrates the materials that exist without requiring a full working-set category to be present

**AC-2.3:** The surface shows hydration progress and hydration failure as part
of the environment state without requiring manual refresh.

- **TC-2.3a: Hydration progress becomes visible**
  - Given: Environment preparation has begun
  - When: Hydration is in progress
  - Then: The environment area shows that hydration is underway
- **TC-2.3b: Hydration failure becomes visible**
  - Given: Environment preparation encounters a recoverable hydration failure
  - When: The failure is reported
  - Then: The environment area shows the failure and the next recovery action without requiring manual refresh

**AC-2.4:** A process does not enter active running work until the required
working set is ready or a recoverable failure state is shown.

- **TC-2.4a: Running begins after readiness**
  - Given: User has started or resumed a process
  - When: The required working set becomes ready
  - Then: The process enters active running work after readiness is confirmed
- **TC-2.4b: Running does not begin after failed preparation**
  - Given: Environment preparation fails before the working set becomes ready
  - When: The failure is reported
  - Then: The surface does not falsely present the process as actively running

**AC-2.5:** The process surface distinguishes read-only and writable attached
sources before the process depends on code work against them.

- **TC-2.5a: Writable source is identifiable**
  - Given: Process has an attached writable source
  - When: The materials and environment state are visible
  - Then: The user can tell that the source is writable
- **TC-2.5b: Read-only source is identifiable**
  - Given: Process has an attached read-only source
  - When: The materials and environment state are visible
  - Then: The user can tell that the source is read-only

### 3. Following Controlled Execution in the Environment

The user needs to follow work inside the environment without the process surface
turning into a generic terminal product. The surface needs to show controlled
execution as process-owned activity, show state transitions as they happen, and
keep environment state separate from user-attention states.

1. Environment preparation completes
2. Process begins controlled work in the environment
3. System emits live process and environment updates
4. User follows execution, waiting, checkpointing, or failure states in one
   surface
5. User understands what the process is doing now and what changed

#### Acceptance Criteria

**AC-3.1:** The process surface shows when controlled execution has begun and
when it is still actively running in the environment.

- **TC-3.1a: Running execution state visible**
  - Given: Environment is ready and controlled work has started
  - When: User is viewing the process surface
  - Then: The surface shows that the process is actively running in the environment

**AC-3.2:** Live execution activity appears as coherent process-facing updates
and environment-state changes rather than as an unmanaged terminal session or
raw provider fragments.

- **TC-3.2a: Execution activity is process-facing**
  - Given: Process is actively working in the environment
  - When: Live execution updates arrive
  - Then: The updates appear as coherent process-facing activity in the work surface
- **TC-3.2b: Browser does not reconstruct raw stream fragments**
  - Given: Live execution updates are flowing
  - When: The surface updates
  - Then: The browser shows current readable state rather than exposing raw transport fragments as the user-facing model

**AC-3.3:** The process surface distinguishes environment preparation, active
execution, waiting on user action, checkpointing, and settled process states.

- **TC-3.3a: Waiting is distinct from running**
  - Given: Process is no longer actively executing and is waiting on user action
  - When: The surface renders
  - Then: The surface shows a waiting state distinct from environment-running state
- **TC-3.3b: Checkpointing is distinct from running**
  - Given: Active execution has ended and durable persistence work is in progress
  - When: The surface renders
  - Then: The surface shows checkpointing as a distinct visible state

**AC-3.4:** A failure during controlled execution leaves the process surface
legible and exposes the next recovery path without erasing the durable process
history that already exists.

- **TC-3.4a: Execution failure leaves surface legible**
  - Given: Controlled execution fails during active work
  - When: The failure is reported
  - Then: The process identity, prior visible history, and current materials remain visible with a failure state and recovery path

### 4. Checkpointing Durable Artifact Outputs and Writable Source Changes

The process can produce output inside the environment, but the environment is
not canonical truth. Durable artifact work must persist back to canonical
artifact state. Durable code work against already-attached writable sources must
persist back to canonical code truth for those sources. Read-only sources do not
offer code checkpointing as an available path.

1. Process performs work in the environment
2. Process produces artifact output, code changes, or both
3. System enters checkpointing for the durable work that should persist
4. System reports what persisted successfully and what failed
5. User sees the resulting durable state on the process surface

#### Acceptance Criteria

**AC-4.1:** Artifact outputs produced during controlled environment work can
checkpoint back to durable artifact state for the process.

- **TC-4.1a: Durable artifact output persists**
  - Given: Process produces artifact output during environment work
  - When: Checkpointing succeeds
  - Then: The resulting artifact output appears in durable process state and remains available after the environment is gone
- **TC-4.1b: Artifact output remains recoverable after reopen**
  - Given: Artifact output checkpointing succeeded earlier
  - When: User later reloads or reopens the process
  - Then: The checkpointed artifact output remains visible from durable state

**AC-4.2:** Code work against an already-attached writable source can checkpoint
back to canonical code truth for that source.

- **TC-4.2a: Writable source code checkpoint succeeds**
  - Given: Process has an already-attached writable source and durable code work to persist
  - When: Code checkpointing succeeds
  - Then: The durable code update lands in the canonical code source associated with that attachment
- **TC-4.2b: Code checkpoint result is process-visible**
  - Given: Code checkpointing succeeded for a writable source
  - When: The process surface updates
  - Then: The user can tell which source received the durable code update and which target ref that update was associated with

**AC-4.3:** Read-only attached sources never present code checkpointing as an
available path.

- **TC-4.3a: Read-only source cannot receive code checkpoint**
  - Given: Process has an attached read-only source
  - When: The process completes code-informed work involving that source
  - Then: The surface does not present code checkpointing to that source as an available durable outcome

**AC-4.4:** The process surface shows the result of checkpointing clearly
enough that the user can tell what durable work persisted and what canonical
target received it.

- **TC-4.4a: Artifact checkpoint result visible**
  - Given: Artifact checkpointing succeeds
  - When: The process surface updates
  - Then: The surface shows that durable artifact work persisted
- **TC-4.4b: Code checkpoint result visible**
  - Given: Writable-source checkpointing succeeds
  - When: The process surface updates
  - Then: The surface shows the source identity and target ref for the durable code update

**AC-4.5:** A checkpoint failure does not silently discard durable work. The
process surface shows the failure and the next recovery path.

- **TC-4.5a: Artifact checkpoint failure shown**
  - Given: Durable artifact checkpointing fails
  - When: The failure is reported
  - Then: The surface shows that the durable artifact work did not persist and exposes a recovery or retry path
- **TC-4.5b: Code checkpoint failure shown**
  - Given: Writable-source checkpointing fails
  - When: The failure is reported
  - Then: The surface shows that the durable code update did not persist and exposes a recovery or retry path

### 5. Rehydrating or Rebuilding After Staleness, Failure, or Loss

The working copy is disposable. The user needs a visible path when the
environment becomes stale, fails during preparation or execution, or is lost
entirely. Rehydration refreshes a usable environment from current canonical
materials. Rebuild reconstructs from canonical truth after the system discards
an unusable working copy.

1. Process surface shows environment as stale, failed, lost, or unavailable
2. User chooses `rehydrate` or `rebuild` when that action is available
3. System refreshes or reconstructs the working copy from canonical materials
4. System returns the surface to a ready or recoverable state
5. User continues work without losing durable process truth

#### Acceptance Criteria

**AC-5.1:** The process surface distinguishes stale, failed, lost, rebuilding,
and unavailable environment states.

- **TC-5.1a: Stale environment is distinct**
  - Given: The working copy no longer matches the required current materials
  - When: The surface renders
  - Then: The environment appears stale rather than generically failed
- **TC-5.1b: Lost environment is distinct**
  - Given: The previous working copy no longer exists
  - When: The surface renders
  - Then: The environment appears lost rather than merely absent

**AC-5.2:** `rehydrate` refreshes the current working copy from the latest
canonical materials when the environment is still recoverable.

- **TC-5.2a: Rehydrate refreshes stale working copy**
  - Given: Environment is recoverable but stale
  - When: User triggers `rehydrate`
  - Then: The working copy refreshes from the latest canonical materials
- **TC-5.2b: Rehydrate updates visible state**
  - Given: Rehydration succeeds
  - When: The process surface updates
  - Then: The environment state changes from stale or preparing to a ready or running state in the same session

**AC-5.3:** `rebuild` discards an unusable working copy and reconstructs the
environment from canonical materials.

- **TC-5.3a: Rebuild replaces lost environment**
  - Given: Environment is lost or unusable
  - When: User triggers `rebuild`
  - Then: The system reconstructs a new working copy from canonical materials
- **TC-5.3b: Rebuild does not depend on prior working copy survival**
  - Given: The previous working copy no longer exists
  - When: Rebuild succeeds
  - Then: The process returns to a usable environment state without requiring the prior working copy to survive

**AC-5.4:** Rehydrate and rebuild preserve durable process state, durable
artifact outputs, and any already-persisted durable code work.

- **TC-5.4a: Durable artifact state survives rebuild**
  - Given: Artifact outputs were checkpointed before the rebuild
  - When: User rehydrates or rebuilds the environment
  - Then: The durable artifact outputs remain part of process truth
- **TC-5.4b: Durable code persistence survives rebuild**
  - Given: Writable-source checkpointing succeeded before the rebuild
  - When: User rehydrates or rebuilds the environment
  - Then: The already-persisted durable code work remains canonical truth outside the rebuilt working copy

**AC-5.5:** If rehydrate or rebuild cannot proceed because canonical
prerequisites are missing or unavailable, the process surface shows that blocked
state and does not falsely present the environment as ready.

- **TC-5.5a: Rebuild blocked by missing canonical prerequisite**
  - Given: Required canonical materials are missing or unavailable
  - When: User triggers `rebuild`
  - Then: The surface shows that the rebuild is blocked and does not present a ready environment
- **TC-5.5b: Rehydrate blocked when recovery requires rebuild**
  - Given: The current environment is not recoverable through rehydrate alone
  - When: User triggers `rehydrate`
  - Then: The surface shows that rehydrate is blocked, explains that rebuild is required, and does not present a ready environment

### 6. Returning Later and Working Through Degraded Conditions

The user leaves and returns later. The process may no longer have an active
environment, live environment updates may be unavailable, or checkpointing may
have settled earlier. The process surface still needs to restore durable truth,
show current environment state, and let the user decide the next action without
guessing what persisted.

1. User leaves a process after preparation, execution, checkpointing, or
   failure
2. User later reloads or reopens the process route
3. System restores durable process state, current materials, environment
   summary, and the last visible checkpoint result
4. User sees whether the environment still exists and what durable work already
   persisted
5. User chooses the next path from the current durable truth

#### Acceptance Criteria

**AC-6.1:** Reloading or reopening a process route restores the latest durable
process state, current materials, environment summary, and last visible
checkpoint result for that process.

- **TC-6.1a: Reopen restores durable state**
  - Given: Process had prior environment work and durable checkpoint results
  - When: User later reopens the process route
  - Then: The surface restores the latest durable process state, current materials, environment summary, and last visible checkpoint result

**AC-6.2:** The absence of an active environment does not erase the durable
results of prior checkpointed artifact or code work.

- **TC-6.2a: Durable work remains after environment absence**
  - Given: Process no longer has an active environment
  - When: User reopens the process
  - Then: Previously checkpointed durable artifact and code results remain visible from durable state

**AC-6.3:** A live environment update failure does not prevent the durable
process surface from loading or remaining usable.

- **TC-6.3a: Durable surface remains usable when live updates fail**
  - Given: Durable process bootstrap succeeds and live environment updates are unavailable
  - When: User opens the process surface
  - Then: The durable process surface still loads and remains usable

**AC-6.4:** Reopen and recovery do not duplicate finalized visible process
history or falsely restate durable work that already persisted.

- **TC-6.4a: Finalized history is not duplicated on reopen**
  - Given: Process has finalized visible history from earlier environment work
  - When: User reloads or reopens the process
  - Then: Finalized visible history does not duplicate
- **TC-6.4b: Prior checkpoint result is not falsely restated as new work**
  - Given: A durable checkpoint succeeded earlier
  - When: User reloads or reopens the process
  - Then: The checkpoint result is shown as existing durable state rather than as a new live checkpoint event

---

## Data Contracts

This epic extends the Epic 2 process work-surface boundary. The environment and
control surfaces described here belong to the dedicated process route and its
live update channel. The epic remains stack-neutral and expresses those
contracts in documentation tables rather than implementation syntax.

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get process work surface | GET | `/api/projects/{projectId}/processes/{processId}` | Returns the process work surface, including environment summary and stable control states |
| Start process | POST | `/api/projects/{projectId}/processes/{processId}/start` | Starts a draft process and begins environment preparation when required |
| Resume process | POST | `/api/projects/{projectId}/processes/{processId}/resume` | Resumes an eligible process and begins environment preparation when required |
| Rehydrate environment | POST | `/api/projects/{projectId}/processes/{processId}/rehydrate` | Refreshes a recoverable working copy from canonical materials |
| Rebuild environment | POST | `/api/projects/{projectId}/processes/{processId}/rebuild` | Reconstructs an environment from canonical materials after loss or unrecoverable failure |
| Live process updates | WebSocket | `/ws/projects/{projectId}/processes/{processId}` | Streams process, materials, side-work, current-request, and environment updates for one process |

### Process Work Surface Response

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project | object | yes | Active project summary for the current process |
| process | object | yes | Active process summary, including visible control states |
| history | Process History Section Envelope | yes | Visible process history for the work surface |
| materials | Process Materials Envelope | yes | Current artifacts, current outputs, and current sources for the process |
| currentRequest | Current Process Request or null | yes | Current unresolved process request when one exists |
| sideWork | Side Work Section Envelope | yes | Current side-work summary state |
| environment | Environment Summary | yes | Current environment state for the process |

### Environment Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| environmentId | string | no | non-empty when present | Stable environment identifier for the current working copy |
| state | enum | yes | `absent`, `preparing`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, or `unavailable` | Current environment state shown on the process surface |
| statusLabel | string | yes | non-empty | User-visible label for the current environment state |
| blockedReason | string | no | non-empty when present | Current reason the environment cannot proceed to the next expected action |
| lastHydratedAt | string | no | ISO 8601 UTC when present | Time the working set was last hydrated into the environment |
| lastCheckpointAt | string | no | ISO 8601 UTC when present | Time the most recent checkpoint attempt settled |
| lastCheckpointResult | Last Checkpoint Result or null | yes | present | Latest visible checkpoint outcome for this process environment; `null` when no checkpoint has settled yet |

Checkpoint visibility in this epic is latest-result only. When a new checkpoint
settles, `lastCheckpointResult` replaces the prior visible checkpoint result in
the environment summary. Historical checkpoint moments may also appear in
visible history, but this epic does not define a separate ordered checkpoint-
results list.

### Process Control State

The process surface shows a stable visible control set. `availableActions`
continues to describe which actions are currently enabled. `controls` describes
the full visible control area and whether each control is currently enabled.
When process state and environment state conflict, the control remains visible,
the disabled state wins, and `disabledReason` explains the blocking condition.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| actionId | enum | yes | `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | Stable control identifier in the visible control area |
| enabled | boolean | yes | boolean | Whether the action is currently available |
| disabledReason | string | no | non-empty when present | Why the action is currently unavailable |
| label | string | yes | non-empty | User-visible action label |

**Control order:** Controls appear in a stable order so the user does not need
to relearn the control area when process or environment state changes.

### Process Summary Additions

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| availableActions | array of enum | yes | values from `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | Actions currently enabled for the process surface |
| controls | array of Process Control State | yes | present | Full visible control set with enabled or disabled state |
| hasEnvironment | boolean | yes | boolean | Whether a current working environment exists for the process |

### Process Source Reference

This epic extends current source references with access mode so the surface can
distinguish read-only and writable attached sources before code checkpointing is
offered.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachmentId | string | yes | non-empty | Stable source attachment identifier |
| displayName | string | yes | non-empty | Source display name |
| purpose | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| accessMode | enum | yes | `read_only` or `read_write` | Whether durable code work can persist back to the canonical source |
| targetRef | string | no | non-empty when present | Branch, tag, or commit ref if known |
| hydrationState | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | Current high-level source readiness state |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable source update time |

### Start Process Response

`POST /api/projects/{projectId}/processes/{processId}/start` returns `200` with
an updated `process` object, updated `environment` summary, and `currentRequest`
when present. If environment preparation begins, the process surface updates in
the same session and later environment progress continues through live updates.

### Resume Process Response

`POST /api/projects/{projectId}/processes/{processId}/resume` returns `200` with
an updated `process` object, updated `environment` summary, and `currentRequest`
when present. If environment preparation begins, the process surface updates in
the same session and later environment progress continues through live updates.

### Rehydrate Environment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| accepted | boolean | yes | `true` | Indicates the rehydrate request was accepted |
| process | object | yes | present | Updated process state after rehydrate was accepted |
| environment | Environment Summary | yes | present | Updated environment summary after rehydrate was accepted |

After a successful rehydrate request, later environment state changes continue
through live updates. If live updates are unavailable, the surface reloads the
current durable process work-surface state automatically.

### Rebuild Environment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| accepted | boolean | yes | `true` | Indicates the rebuild request was accepted |
| process | object | yes | present | Updated process state after rebuild was accepted |
| environment | Environment Summary | yes | present | Updated environment summary after rebuild was accepted |

After a successful rebuild request, later environment state changes continue
through live updates. If live updates are unavailable, the surface reloads the
current durable process work-surface state automatically.

### Action Acceptance and Failure Boundary

`start`, `resume`, `rehydrate`, and `rebuild` return immediate HTTP errors only
when the server can reject the request before environment lifecycle work begins.
This includes cases where the action is not available in the current state, a
required canonical prerequisite is already known to be missing, the requested
source is not writable, or environment lifecycle work is unavailable before the
request is accepted.

Once one of these actions returns success, later preparation, hydration,
execution, recovery, or checkpoint failures surface as visible environment or
checkpoint failure states in the same process surface session and on later
reopen. Those later failures do not retroactively replace an already-accepted
response with an HTTP error.

### Last Checkpoint Result

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| checkpointId | string | yes | non-empty | Stable identifier for the checkpoint result |
| checkpointKind | enum | yes | `artifact`, `code`, or `mixed` | Type of durable work that persisted |
| outcome | enum | yes | `succeeded` or `failed` | Result of the checkpoint attempt |
| targetLabel | string | yes | non-empty | Canonical target that received or failed to receive the durable work |
| targetRef | string | no | non-empty when present | Canonical target ref when the checkpoint applies to code |
| completedAt | string | yes | ISO 8601 UTC | Time the checkpoint attempt settled |
| failureReason | string | no | non-empty when present | Current visible reason for checkpoint failure |

### Live Process Update Message

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| subscriptionId | string | yes | non-empty | Stable identifier for the current live subscription |
| processId | string | yes | non-empty | Process this live update belongs to |
| sequenceNumber | integer | yes | `>= 0` | Monotonic sequence number within the subscription |
| messageType | enum | yes | `snapshot`, `upsert`, `complete`, or `error` | Type of live update message |
| entityType | enum | yes | `process`, `history`, `current_request`, `materials`, `side_work`, or `environment` | What visible surface entity the update applies to |
| entityId | string | yes | non-empty | Identifier of the visible entity being updated |
| correlationId | string | no | non-empty when present | Client request correlation identifier when the update corresponds to a client-originated action |
| payload | object or null | yes | present | Current-object payload for the visible entity |
| completedAt | string | no | ISO 8601 UTC when present | Completion time for a `complete` message |

**Sequencing:** Live update messages are applied in `sequenceNumber` order
within one `subscriptionId`.

**Upsert semantics:** `upsert` messages replace the current browser-facing state
for the identified visible entity rather than delivering raw append-only stream
deltas.

**Completion marker:** `complete` marks the current visible entity as settled
for that live update cycle.

**Checkpoint visibility:** Checkpoint outcomes travel inside the `environment`
payload through `lastCheckpointResult`. This epic does not define a separate
checkpoint entity type.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 404 | `PROCESS_NOT_FOUND` | Requested process does not exist inside the requested project |
| 409 | `PROCESS_ACTION_NOT_AVAILABLE` | The requested process action is not valid in the current process or environment state |
| 409 | `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | The current environment cannot be rehydrated and requires rebuild or other recovery |
| 422 | `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Required canonical materials are missing or unavailable for preparation, rehydrate, or rebuild |
| 503 | `PROCESS_ENVIRONMENT_UNAVAILABLE` | Environment lifecycle work is unavailable for the requested process |

### Live Transport Status Codes

| Code | Description |
|------|-------------|
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live update subscription could not start or remain connected after the durable process surface bootstrap succeeded |

---

## Dependencies

Technical dependencies:

- Epic 1 project shell, source summary visibility, and process summary
  vocabulary
- Epic 2 process work-surface route, current materials visibility, current
  request handling, and live-update transport
- Durable process state and process-specific current-material references
- Source attachment records that already classify purpose, target ref, and
  hydration state
- Canonical artifact persistence and canonical code persistence for
  already-attached writable sources

Process dependencies:

- Product confirmation that this epic includes real canonical code persistence
  for already-attached writable sources without expanding into full source-
  management UX
- Follow-on epic work derived from Feature 5 for attach/detach flows,
  source-management UX, provenance surfaces, and broader GitHub review or
  publishing workflows

---

## Non-Functional Requirements

### Performance

- Starting or resuming a process enters a visible preparation state within 1
  second under normal conditions
- For the initial milestone working set of up to 3 attached sources and 20
  current artifact or output items, environment preparation reaches `ready`,
  `running`, or a recoverable failure state within 30 seconds under normal
  provider and network conditions
- Rehydrate and rebuild actions enter a visible recovery state within 1 second
- Visible live environment-state updates appear in the browser within 1 second
  under normal connection conditions

### Security

- All environment routes, APIs, and live subscriptions require an authenticated
  session
- Project membership and process access are enforced server-side
- Read-only attached sources cannot receive durable code persistence
- Environment credentials, source access, and canonical write permissions are
  not inferred from client state
- Direct routes or live update attempts do not leak inaccessible environment
  state, source identity, or durable checkpoint outcomes

### Reliability

- Loss of a working environment does not erase durable process state, durable
  artifact outputs, or already-persisted durable code work
- Rehydrate and rebuild operate from canonical truth rather than depending on
  survival of a previous working copy
- Durable process-surface bootstrap remains usable when live environment
  updates are unavailable
- Reloading or reopening a process route restores the latest durable process and
  environment truth for that process

### Accessibility

- The visible control area is keyboard reachable
- Enabled and disabled control states are available as readable text, not color
  alone
- Environment state, recovery state, and checkpoint outcomes are available as
  readable text, not color alone
- Live environment updates do not rely on motion-only cues to remain
  understandable

### Observability

- Environment prepare, hydrate, execute, checkpoint, rehydrate, rebuild, and
  failure events are logged with request context, project ID, and process ID
- Durable artifact checkpoint outcomes are traceable by process ID and
  checkpoint target
- Durable code checkpoint outcomes are traceable by process ID, source
  attachment ID, and target ref
- Environment loss, rebuild requests, and recovery failures are traceable by
  process ID

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. What exact provider interface should the platform use for environment
   creation, hydration, execution, checkpointing, rehydrate, rebuild, and
   teardown?
2. What exact browser contract should extend the Epic 2 process surface so the
   visible control area can remain stable while preserving backward-compatible
   process action semantics?
3. What exact durable state model should represent environment state,
   preparation progress, recovery state, and last checkpoint result without
   confusing current process status with current environment status?
4. What exact persistence unit should represent canonical code updates for
   already-attached writable sources in this epic?
5. What exact security and credential model should the server use when a
   process hydrates attached sources and persists durable code work back to
   canonical code truth?
6. What exact freshness and invalidation policy should decide when a working
   copy is `stale`, when `rehydrate` is sufficient, and when `rebuild` is
   required?
7. What exact persistence grain should capture environment events and checkpoint
   outcomes before the full canonical archive and derived-view work lands in the
   follow-on Feature 5 epic?
8. What exact failure and retry model should the surface use when durable
   process state loads successfully but environment lifecycle or checkpoint work
   is unavailable?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Create the shared environment-execution foundation: environment summary
contracts, visible control-state vocabulary, source access-mode vocabulary,
environment fixture sets, checkpoint-result shapes, recovery error classes, and
test helpers used by all later stories.

### Story 1: Environment State and Visible Controls

**Delivers:** The user can open a process and understand the current
environment state and visible control availability immediately.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (environment state visible on first load)
- AC-1.2 (stable visible control set)
- AC-1.3 (disabled reason visible)
- AC-1.4 (environment truth comes from durable state)
- AC-1.5 (process remains legible without environment)

### Story 2: Start or Resume with Environment Preparation

**Delivers:** The user can start or resume a process and prepare a usable
working copy from current materials.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (start or resume enters preparation state)
- AC-2.2 (current working set hydrates into environment)
- AC-2.3 (hydration progress and failure visible)
- AC-2.4 (running begins only after readiness or recoverable failure)
- AC-2.5 (read-only vs writable source visibility)

### Story 3: Controlled Execution and Live Environment State

**Delivers:** The user can follow controlled environment execution in the
process surface without relying on a generic terminal experience.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (execution running state visible)
- AC-3.2 (execution activity appears as coherent process-facing updates)
- AC-3.3 (preparing, running, waiting, checkpointing, and settled states are
  distinct)
- AC-3.4 (execution failure leaves surface legible)

### Story 4: Durable Checkpoint of Artifacts and Writable Sources

**Delivers:** The process can persist durable artifact work and durable code
work out of the environment into canonical stores.
**Prerequisite:** Story 3
**ACs covered:**

- AC-4.1 (artifact outputs checkpoint durably)
- AC-4.2 (writable attached sources receive durable code persistence)
- AC-4.3 (read-only sources do not offer code checkpointing)
- AC-4.4 (checkpoint result visible)
- AC-4.5 (checkpoint failure visible with recovery path)

### Story 5: Rehydrate, Rebuild, and Recovery

**Delivers:** The user can recover from stale, failed, lost, or unavailable
environment conditions without losing durable process truth.
**Prerequisite:** Story 4
**ACs covered:**

- AC-5.1 (stale, failed, lost, rebuilding, and unavailable are distinct)
- AC-5.2 (rehydrate refreshes recoverable working copy)
- AC-5.3 (rebuild reconstructs from canonical truth)
- AC-5.4 (durable artifact and code truth survive recovery)
- AC-5.5 (blocked recovery remains visible and non-misleading)

### Story 6: Return Later and Degraded Operation

**Delivers:** The user can reopen a process later and continue from durable
truth even when no active environment or live environment transport exists.
**Prerequisite:** Story 5
**ACs covered:**

- AC-6.1 (reopen restores durable process and environment truth)
- AC-6.2 (environment absence does not erase durable results)
- AC-6.3 (durable surface remains usable when live updates fail)
- AC-6.4 (reopen does not duplicate finalized history or prior checkpoint
  outcomes)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover happy, alternate, recovery, and degraded-operation paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at browser/server and live-update boundaries
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] Follow-on source-management work is explicitly deferred rather than
      silently omitted
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
