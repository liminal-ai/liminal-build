# Story 1: Environment State and Visible Controls

### Summary
<!-- Jira: Summary field -->
Open a process and immediately understand the current environment state, stable visible controls, and blocked actions without losing durable process context when no environment is running.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the first-view environment slice so the user can open a process, see the current environment truth immediately, and understand every visible control whether or not it is enabled.

**Scope**

In:

- Show the current environment state on first load
- Show a stable visible control set in a stable order
- Show disabled reasons for blocked actions
- Restore the same environment truth after reload from durable state
- Keep process identity, materials, and durable process state visible even when the environment is absent, lost, or failed

Out:

- Starting or resuming work
- Environment hydration progress and preparation entry
- Controlled execution activity
- Checkpoint persistence and the recovery mutations that make recovery-only states operationally reachable

**Dependencies**

- Story 0 foundation
- Epic 2 process work-surface route, current materials envelope, and durable bootstrap behavior
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** The process work surface shows the current environment state on first load, including whether an environment is absent, preparing, rehydrating, ready, running, checkpointing, stale, failed, lost, rebuilding, or unavailable.

- **TC-1.1a: Environment state visible on first load**
  - Given: User opens a process work surface
  - When: The surface renders
  - Then: The current environment state is visible without requiring the user to start or resume the process first
- **TC-1.1b: No active environment still renders a legible state**
  - Given: Process has no current environment
  - When: The work surface renders
  - Then: The environment area shows an explicit absent or not-yet-prepared state rather than appearing blank or broken

**Environment state and control matrix** *(Traces to: AC-1.1, AC-1.2, AC-5.1)*

The rows for `stale`, `lost`, `failed`, `rebuilding`, and `unavailable` are first-load visibility and disabled-control expectations for seeded or durable environment states. Story 5 owns the recovery flows that make those states reachable through product behavior.

| TC | Environment state | Expected surface behavior | Expected control behavior |
|---|---|---|---|
| TC-1.1c | `preparing` | Surface identifies the environment as being prepared and not yet ready for active work | `start`, `resume`, `rehydrate`, `rebuild`, and `restart` are disabled while preparation is in progress; `respond` and `review` continue to follow process state |
| TC-1.1c.1 | `rehydrating` | Surface identifies the environment as being refreshed from canonical truth and not yet ready for active work | `start`, `resume`, `rehydrate`, `rebuild`, and `restart` are disabled while rehydrate is in progress; `respond` and `review` continue to follow process state |
| TC-1.1d | `ready` | Surface identifies the environment as prepared and ready for process work | `rehydrate` and `rebuild` are disabled; `start` or `resume` may be enabled if the process state allows them; `respond`, `review`, and `restart` continue to follow process state |
| TC-1.1e | `running` | Surface identifies the environment as actively executing process work | Recovery controls remain disabled during active execution; other visible controls continue to follow process state |
| TC-1.1f | `checkpointing` | Surface identifies the environment as persisting durable work rather than preparing or actively executing | `start`, `resume`, `rehydrate`, `rebuild`, and `restart` are disabled until checkpointing settles; `respond` and `review` continue to follow process state when relevant |
| TC-1.1g | `stale` | Surface identifies the environment as stale rather than failed or lost | `rehydrate` becomes enabled when the working copy is recoverable; `rebuild` remains disabled unless a full reconstruct path is required, and `disabledReason` explains the unavailable option |
| TC-1.1h | `lost` | Surface identifies the environment as lost rather than merely absent | `rebuild` becomes enabled; `rehydrate` is disabled with a reason because no recoverable working copy remains |
| TC-1.1i | `failed` | Surface identifies the environment as failed and not currently progressing | `start` and `resume` are disabled; `rehydrate`, `rebuild`, or `restart` become enabled only when that recovery path is valid, and `disabledReason` explains the unavailable alternatives |
| TC-1.1j | `rebuilding` | Surface identifies the environment as being reconstructed from canonical truth | `rehydrate`, `rebuild`, `start`, `resume`, and `restart` are disabled while rebuild is in progress; `respond` and `review` continue to follow process state |
| TC-1.1k | `unavailable` | Surface identifies the environment service as currently unavailable rather than presenting the process as broken | All environment-changing controls are disabled unless a distinct process-level recovery path is valid, and `disabledReason` explains the blocked actions |

**AC-1.2:** The process work surface shows a stable visible control set for the process, including `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, and `restart`, with each control marked enabled or disabled according to the current state.

- **TC-1.2a: Stable control set remains visible**
  - Given: User opens a process work surface in any supported process state
  - When: The control area renders
  - Then: The same standard control set is visible in a stable order
- **TC-1.2b: Disabled controls remain visible**
  - Given: One or more controls are not valid in the current process and environment state
  - When: The control area renders
  - Then: Those controls remain visible and appear disabled rather than disappearing

**AC-1.3:** A disabled control includes a visible reason when the current state prevents that action.

- **TC-1.3a: Disabled reason shown for blocked environment action**
  - Given: `rehydrate` or `rebuild` is not currently available
  - When: User inspects the disabled control
  - Then: The surface shows why that action is currently unavailable
- **TC-1.3b: Disabled reason shown for blocked process action**
  - Given: `start`, `resume`, `respond`, `review`, or `restart` is not currently available
  - When: User inspects the disabled control
  - Then: The surface shows why that action is currently unavailable

**AC-1.4:** The visible environment state and control availability derive from durable process and environment state rather than from transient client-only assumptions.

- **TC-1.4a: Reload preserves environment truth**
  - Given: Process has a durable environment state and visible control states
  - When: User reloads the process route
  - Then: The same environment truth is restored from durable state rather than resetting to a default client assumption

**AC-1.5:** The absence, loss, or failure of an environment does not hide the process identity, current materials, or durable process state.

- **TC-1.5a: Process remains visible without environment**
  - Given: Process has no active environment or previously lost its environment
  - When: User opens the process work surface
  - Then: The process identity, current materials, and durable process state remain visible

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story extends the Epic 2 process bootstrap so environment truth and visible control state are part of the first durable read, not client reconstruction.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns the process work surface, including environment summary and stable control states |

#### Process Work Surface Response

| Field | Type | Required | Description |
|---|---|---|---|
| `project` | object | yes | Active project summary for the current process |
| `process` | object | yes | Active process summary, including visible control states |
| `history` | Process History Section Envelope | yes | Visible process history for the work surface |
| `materials` | Process Materials Envelope | yes | Current artifacts, current outputs, and current sources for the process |
| `currentRequest` | Current Process Request or null | yes | Current unresolved process request when one exists |
| `sideWork` | Side Work Section Envelope | yes | Current side-work summary state |
| `environment` | Environment Summary | yes | Current environment state for the process |

#### Environment Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `environmentId` | string | no | non-empty when present | Stable environment identifier for the current working copy |
| `state` | enum | yes | `absent`, `preparing`, `rehydrating`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, or `unavailable` | Current environment state shown on the process surface |
| `statusLabel` | string | yes | non-empty | User-visible label for the current environment state |
| `blockedReason` | string | no | non-empty when present | Current reason the environment cannot proceed to the next expected action |
| `lastHydratedAt` | string | no | ISO 8601 UTC when present | Time the working set was last hydrated into the environment |
| `lastCheckpointAt` | string | no | ISO 8601 UTC when present | Time the most recent checkpoint attempt settled |
| `lastCheckpointResult` | Last Checkpoint Result or null | yes | present | Latest visible checkpoint outcome for this process environment; `null` when no checkpoint has settled yet |

#### Process Control State

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `actionId` | enum | yes | `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | Stable control identifier in the visible control area |
| `enabled` | boolean | yes | boolean | Whether the action is currently available |
| `disabledReason` | string | no | non-empty when present | Why the action is currently unavailable |
| `label` | string | yes | non-empty | User-visible action label |

**Control order:** Controls appear in a stable order so the user does not need to relearn the control area when process or environment state changes.

When process state and environment state conflict, the control remains visible, the disabled state wins, and `disabledReason` explains the blocking condition.

#### Process Summary Additions

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `availableActions` | array of enum | yes | values from `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | Actions currently enabled for the process surface |
| `controls` | array of Process Control State | yes | present | Full visible control set with enabled or disabled state |
| `hasEnvironment` | boolean | yes | boolean | Whether a current working environment exists for the process |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist inside the requested project |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- First-load process bootstrap always includes environment summary and full visible control state
- The visible control area preserves stable ordering across all supported process and environment states
- Disabled controls show readable reasons for blocked actions
- Reload restores environment truth from durable state without reverting to client defaults
- Process identity, materials, and durable process state remain visible when the environment is absent, lost, failed, or unavailable
- Seeded or durable fixture states cover recovery-state rendering and disabled-control interpretation without requiring Story 5 recovery mutations to exist yet
- Story tests cover TC-1.1a through TC-1.1k, explicitly including TC-1.1c.1, TC-1.2a through TC-1.2b, TC-1.3a through TC-1.3b, TC-1.4a, and TC-1.5a as visibility and control-state cases
