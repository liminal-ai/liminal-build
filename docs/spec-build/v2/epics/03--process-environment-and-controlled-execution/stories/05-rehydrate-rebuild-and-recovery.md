# Story 5: Rehydrate, Rebuild, and Recovery

### Summary
<!-- Jira: Summary field -->
Recover from stale, failed, lost, or unavailable environments through rehydrate or rebuild without losing durable artifact or code truth.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the recovery slice so the user can tell when a working copy is stale, failed, lost, or unavailable, choose the right recovery path, and keep durable truth intact across recovery.

**Scope**

In:

- Distinguish stale, failed, lost, rebuilding, and unavailable environment states
- Rehydrate a recoverable working copy from the canonical materials currently referenced by the process
- Rebuild a lost or unusable environment from the same canonical truth
- Preserve durable artifact outputs and already-persisted code work through recovery
- Show blocked recovery states when prerequisites are missing

Out:

- Initial environment visibility baseline already established in Story 1
- Initial start or resume preparation already established in Story 2
- Checkpoint persistence already established in Story 4
- Broader source freshness-management workflows outside the process surface

**Dependencies**

- Story 0 foundation
- Story 1 environment state and visible controls
- Story 4 durable checkpoint visibility
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.1:** The process surface distinguishes stale, failed, lost, rebuilding, and unavailable environment states.

- **TC-5.1a: Stale environment is distinct**
  - Given: The working copy no longer matches the required current materials referenced by the process
  - When: The surface renders
  - Then: The environment appears stale rather than generically failed
- **TC-5.1b: Lost environment is distinct**
  - Given: The previous working copy no longer exists
  - When: The surface renders
  - Then: The environment appears lost rather than merely absent

Story 1 owns first-load rendering and disabled-control interpretation for seeded or durable recovery states. This story owns the production paths and recovery actions that make those states reachable and recoverable in the product flow.

**AC-5.2:** `rehydrate` refreshes the current working copy from the latest canonical materials referenced by the process when the environment is still recoverable.

- **TC-5.2a: Rehydrate refreshes stale working copy**
  - Given: Environment is recoverable but stale
  - When: User triggers `rehydrate`
  - Then: The working copy refreshes from the latest referenced canonical materials
- **TC-5.2b: Rehydrate updates visible state**
  - Given: Rehydration succeeds
  - When: The process surface updates
  - Then: The environment state changes from `stale` to `rehydrating`, then to a ready or running state in the same session

**AC-5.3:** `rebuild` discards an unusable working copy and reconstructs the environment from the referenced canonical materials.

- **TC-5.3a: Rebuild replaces lost environment**
  - Given: Environment is lost or unusable
  - When: User triggers `rebuild`
  - Then: The system reconstructs a new working copy from the referenced canonical materials
- **TC-5.3b: Rebuild does not depend on prior working copy survival**
  - Given: The previous working copy no longer exists
  - When: Rebuild succeeds
  - Then: The process returns to a usable environment state without requiring the prior working copy to survive

**AC-5.4:** Rehydrate and rebuild preserve durable process state, durable artifact outputs, and any already-persisted durable code work.

- **TC-5.4a: Durable artifact state survives rebuild**
  - Given: Artifact outputs were checkpointed before the rebuild
  - When: User rehydrates or rebuilds the environment
  - Then: The durable artifact outputs remain part of project-level artifact truth and remain referenced from the process's materials
- **TC-5.4b: Durable code persistence survives rebuild**
  - Given: Writable-source checkpointing succeeded before the rebuild
  - When: User rehydrates or rebuilds the environment
  - Then: The already-persisted durable code work remains canonical truth outside the rebuilt working copy

**AC-5.5:** If rehydrate or rebuild cannot proceed because canonical prerequisites are missing or unavailable, the process surface shows that blocked state and does not falsely present the environment as ready.

- **TC-5.5a: Rebuild blocked by missing canonical prerequisite**
  - Given: Required canonical materials referenced by the process are missing or unavailable
  - When: User triggers `rebuild`
  - Then: The surface shows that the rebuild is blocked and does not present a ready environment
- **TC-5.5b: Rehydrate blocked when recovery requires rebuild**
  - Given: The current environment is not recoverable through rehydrate alone
  - When: User triggers `rehydrate`
  - Then: The surface shows that rehydrate is blocked, explains that rebuild is required, and does not present a ready environment

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns recovery mutations, recovery-specific rejection reasons, and durable recovery-state transitions.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Rehydrate environment | `POST` | `/api/projects/{projectId}/processes/{processId}/rehydrate` | Refreshes a recoverable working copy from the canonical materials currently referenced by the process |
| Rebuild environment | `POST` | `/api/projects/{projectId}/processes/{processId}/rebuild` | Reconstructs an environment from the canonical materials currently referenced by the process after loss or unrecoverable failure |

#### Rehydrate Environment Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `accepted` | boolean | yes | `true` | Indicates the rehydrate request was accepted |
| `process` | object | yes | present | Updated process state after rehydrate was accepted |
| `environment` | Environment Summary | yes | present | Updated environment summary after rehydrate was accepted |

After a successful rehydrate request, the accepted response should already
reflect `environment.state = rehydrating`. Later environment state changes
continue through live updates. If live updates are unavailable, the surface
reloads the current durable process work-surface state automatically.

#### Rebuild Environment Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `accepted` | boolean | yes | `true` | Indicates the rebuild request was accepted |
| `process` | object | yes | present | Updated process state after rebuild was accepted |
| `environment` | Environment Summary | yes | present | Updated environment summary after rebuild was accepted |

After a successful rebuild request, the accepted response should already reflect
`environment.state = rebuilding`. Later environment state changes continue
through live updates. If live updates are unavailable, the surface reloads the
current durable process work-surface state automatically.

#### Action Acceptance and Failure Boundary

`rehydrate` and `rebuild` return immediate HTTP errors only when the server can reject the request before environment lifecycle work begins. This includes cases where the action is not available in the current state, a required canonical prerequisite is already known to be missing, or environment lifecycle work is unavailable before the request is accepted.

Once one of these actions returns success, later preparation, hydration, recovery, or checkpoint failures surface as visible environment or checkpoint failure states in the same process surface session and on later reopen. Those later failures do not retroactively replace an already-accepted response with an HTTP error.

#### Recovery Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | The requested process action is not valid in the current process or environment state |
| `409` | `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | The current environment cannot be rehydrated and requires rebuild or other recovery |
| `422` | `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Required canonical materials referenced by the process are missing or unavailable for rehydrate or rebuild |
| `503` | `PROCESS_ENVIRONMENT_UNAVAILABLE` | Environment lifecycle work is unavailable for the requested process |

#### Environment Summary Recovery Fields

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `state` | enum | yes | `stale`, `rehydrating`, `failed`, `lost`, `rebuilding`, `unavailable`, or other shared values as applicable | Current recovery-relevant environment state |
| `blockedReason` | string | no | non-empty when present | Current reason the environment cannot proceed to the next expected action |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- The surface distinguishes stale, failed, lost, rebuilding, and unavailable states clearly
- `rehydrate` refreshes recoverable environments from the canonical materials referenced by the process
- `rebuild` reconstructs usable environments without depending on the prior working copy
- Durable artifact outputs and already-persisted code work survive recovery
- Missing prerequisites and non-recoverable states show blocked recovery rather than false readiness
- Story tests cover TC-5.1a through TC-5.5b
