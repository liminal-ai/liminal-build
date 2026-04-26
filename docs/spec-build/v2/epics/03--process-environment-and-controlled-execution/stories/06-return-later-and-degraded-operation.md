# Story 6: Return Later and Degraded Operation

### Summary
<!-- Jira: Summary field -->
Reopen a process later from durable truth, keep prior checkpoint results visible without an active environment, and remain usable when live environment updates are unavailable.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the reopen and degraded-operation slice so the user can return later, recover the latest durable environment truth, and keep working even when no live environment transport is currently available.

**Scope**

In:

- Reopen restores the latest durable process state, current materials, environment summary, and last visible checkpoint result
- Absence of an active environment does not erase prior checkpointed work
- Live update failure does not block durable surface usability
- Reopen does not duplicate finalized visible history or restate old checkpoint work as new

Out:

- Initial environment visibility and controls
- Start, resume, checkpoint, rehydrate, and rebuild mutations themselves
- Broader archive or chunk-view surfaces beyond current visible history

**Dependencies**

- Story 0 foundation
- Story 1 environment summary and visible controls
- Story 4 checkpoint visibility
- Story 5 recovery behavior
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-6.1:** Reloading or reopening a process route restores the latest durable process state, current materials, environment summary, and last visible checkpoint result for that process.

- **TC-6.1a: Reopen restores durable state**
  - Given: Process had prior environment work and durable checkpoint results
  - When: User later reopens the process route
  - Then: The surface restores the latest durable process state, current materials, environment summary, and last visible checkpoint result, including artifact version details when the checkpoint revised an existing project artifact

**AC-6.2:** The absence of an active environment does not erase the durable results of prior checkpointed artifact or code work.

- **TC-6.2a: Durable work remains after environment absence**
  - Given: Process no longer has an active environment
  - When: User reopens the process
  - Then: Previously checkpointed durable artifact versions and code results remain visible from durable state

**AC-6.3:** A live environment update failure does not prevent the durable process surface from loading or remaining usable.

- **TC-6.3a: Durable surface remains usable when live updates fail**
  - Given: Durable process bootstrap succeeds and live environment updates are unavailable
  - When: User opens the process surface
  - Then: The durable process surface still loads and remains usable

**AC-6.4:** Reopen and recovery do not duplicate finalized visible process history or falsely restate durable work that already persisted.

- **TC-6.4a: Finalized history is not duplicated on reopen**
  - Given: Process has finalized visible history from earlier environment work
  - When: User reloads or reopens the process
  - Then: Finalized visible history does not duplicate
- **TC-6.4b: Prior checkpoint result is not falsely restated as new work**
  - Given: A durable checkpoint succeeded earlier
  - When: User reloads or reopens the process
  - Then: The checkpoint result is shown as existing durable state rather than as a new live checkpoint event

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns durable reopen behavior, latest-result checkpoint restoration, and degraded live-transport handling.

#### Durable Bootstrap Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns the process work surface, including environment summary and stable control states |

#### Process Work Surface Response Fields Used On Reopen

| Field | Type | Required | Description |
|---|---|---|---|
| `project` | object | yes | Active project summary for the current process |
| `process` | object | yes | Active process summary, including visible control states |
| `history` | Process History Section Envelope | yes | Visible process history for the work surface |
| `materials` | Process Materials Envelope | yes | Current artifact references, current outputs, and current sources for the process |
| `currentRequest` | Current Process Request or null | yes | Current unresolved process request when one exists |
| `sideWork` | Side Work Section Envelope | yes | Current side-work summary state |
| `environment` | Environment Summary | yes | Current environment state for the process, including latest checkpoint visibility |

#### Environment Summary Reopen Fields

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `state` | enum | yes | shared environment state vocabulary | Current environment state shown on reopen |
| `lastCheckpointAt` | string | no | ISO 8601 UTC when present | Time the most recent checkpoint attempt settled |
| `lastCheckpointResult` | Last Checkpoint Result or null | yes | present | Latest visible checkpoint outcome for this process environment, including artifact version details when the most recent checkpoint created or revised a project-level artifact |

Checkpoint visibility in this epic is latest-result only. Reopen restores the current durable latest-result state rather than replaying an earlier checkpoint as if it were a new live event.

#### Live Transport Degradation

| Operation | Method | Path | Description |
|---|---|---|---|
| Live process updates | `WebSocket` | `/ws/projects/{projectId}/processes/{processId}` | Streams process, materials, side-work, current-request, and environment updates for one process |

#### Live Transport Status Code

| Code | Description |
|---|---|
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live update subscription could not start or remain connected after the durable process surface bootstrap succeeded |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Reopen restores the latest durable process state, current materials, environment summary, and checkpoint visibility
- Previously checkpointed artifact versions and code results remain visible when no active environment exists
- Live transport failure does not block durable surface usability
- Finalized visible history does not duplicate on reopen
- Prior checkpoint results are restored as existing durable state instead of replayed as new work
- Story tests cover TC-6.1a through TC-6.4b
