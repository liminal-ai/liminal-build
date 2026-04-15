# Story 2: Start or Resume with Environment Preparation

### Summary
<!-- Jira: Summary field -->
Start or resume an eligible process, prepare the environment, hydrate the current working set, and make source writability visible before controlled work begins.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the environment-preparation slice so the user can start or resume work, see preparation happen in-session, and know when the working set is ready or recoverably blocked.

**Scope**

In:

- Start or resume enters visible environment preparation
- Preparation hydrates current artifacts, current outputs, and current sources into the working copy
- Hydration progress and recoverable hydration failure appear without manual refresh
- Running does not begin until preparation is ready or a recoverable failure state is shown
- Source attachments show read-only versus writable access before code checkpointing matters

Out:

- Controlled execution details after preparation completes
- Checkpoint persistence results
- Rehydrate and rebuild mutations after stale or lost environments
- Broader source-attachment management workflows

**Dependencies**

- Story 0 foundation
- Story 1 environment summary and visible controls
- Epic 2 current materials envelope and start/resume action surfaces
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** Starting a draft process or resuming an eligible process moves the surface into a visible environment-preparation state in the same session.

- **TC-2.1a: Start enters preparation state**
  - Given: User is viewing a draft process with `start` enabled
  - When: User starts the process
  - Then: The surface enters a visible environment-preparation state in the same session
- **TC-2.1b: Resume enters preparation state when environment work is needed**
  - Given: User is viewing a resumable process whose environment must be prepared or refreshed
  - When: User resumes the process
  - Then: The surface enters a visible environment-preparation state in the same session

**AC-2.2:** Environment preparation hydrates the process's current artifacts, current outputs, and already-attached current sources into the working copy before controlled work depends on them.

- **TC-2.2a: Current materials hydrate into environment**
  - Given: Process has current artifacts, outputs, and attached sources
  - When: Environment preparation runs
  - Then: The working copy is prepared from those current materials rather than from unrelated project materials
- **TC-2.2b: Process with partial working set still hydrates correctly**
  - Given: Process has only some of artifacts, outputs, or attached sources
  - When: Environment preparation runs
  - Then: The environment hydrates the materials that exist without requiring a full working-set category to be present

**AC-2.3:** The surface shows hydration progress and hydration failure as part of the environment state without requiring manual refresh.

- **TC-2.3a: Hydration progress becomes visible**
  - Given: Environment preparation has begun
  - When: Hydration is in progress
  - Then: The environment area shows that hydration is underway
- **TC-2.3b: Hydration failure becomes visible**
  - Given: Environment preparation encounters a recoverable hydration failure
  - When: The failure is reported
  - Then: The environment area shows the failure and the next recovery action without requiring manual refresh

**AC-2.4:** A process does not enter active running work until the required working set is ready or a recoverable failure state is shown.

- **TC-2.4a: Running begins after readiness**
  - Given: User has started or resumed a process
  - When: The required working set becomes ready
  - Then: The process enters active running work after readiness is confirmed
- **TC-2.4b: Running does not begin after failed preparation**
  - Given: Environment preparation fails before the working set becomes ready
  - When: The failure is reported
  - Then: The surface does not falsely present the process as actively running

**AC-2.5:** The process surface distinguishes read-only and writable attached sources before the process depends on code work against them.

- **TC-2.5a: Writable source is identifiable**
  - Given: Process has an attached writable source
  - When: The materials and environment state are visible
  - Then: The user can tell that the source is writable
- **TC-2.5b: Read-only source is identifiable**
  - Given: Process has an attached read-only source
  - When: The materials and environment state are visible
  - Then: The user can tell that the source is read-only

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns start and resume acceptance, preparation-state entry, hydration, and source-access visibility.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Start process | `POST` | `/api/projects/{projectId}/processes/{processId}/start` | Starts a draft process and begins environment preparation when required |
| Resume process | `POST` | `/api/projects/{projectId}/processes/{processId}/resume` | Resumes an eligible process and begins environment preparation when required |

#### Start Process Response

`POST /api/projects/{projectId}/processes/{processId}/start` returns `200` with an updated `process` object, updated `environment` summary, and `currentRequest` when present. If environment preparation begins, the process surface updates in the same session and later environment progress continues through live updates.

#### Resume Process Response

`POST /api/projects/{projectId}/processes/{processId}/resume` returns `200` with an updated `process` object, updated `environment` summary, and `currentRequest` when present. If environment preparation begins, the process surface updates in the same session and later environment progress continues through live updates.

#### Process Source Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `displayName` | string | yes | non-empty | Source display name |
| `purpose` | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| `accessMode` | enum | yes | `read_only` or `read_write` | Whether durable code work can persist back to the canonical source |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref if known |
| `hydrationState` | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | Current high-level source readiness state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable source update time |

#### Environment Summary Fields Used During Preparation

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `state` | enum | yes | `preparing`, `ready`, `running`, `failed`, or other shared values as applicable | Current preparation or post-preparation environment state |
| `statusLabel` | string | yes | non-empty | User-visible label for the current environment state |
| `blockedReason` | string | no | non-empty when present | Current reason the environment cannot proceed to the next expected action |
| `lastHydratedAt` | string | no | ISO 8601 UTC when present | Time the working set was last hydrated into the environment |

#### Action Acceptance and Failure Boundary

`start` and `resume` return immediate HTTP errors only when the server can reject the request before environment lifecycle work begins. This includes cases where the action is not available in the current state, a required canonical prerequisite is already known to be missing, or environment lifecycle work is unavailable before the request is accepted.

Once one of these actions returns success, later preparation, hydration, execution, recovery, or checkpoint failures surface as visible environment or checkpoint failure states in the same process surface session and on later reopen. Those later failures do not retroactively replace an already-accepted response with an HTTP error.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | The requested process action is not valid in the current process or environment state |
| `422` | `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Required canonical materials are missing or unavailable for preparation |
| `503` | `PROCESS_ENVIRONMENT_UNAVAILABLE` | Environment lifecycle work is unavailable for the requested process |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Starting or resuming enters visible preparation in the same session
- Preparation hydrates only the process's current artifacts, current outputs, and current sources
- Hydration progress and recoverable failure appear without manual refresh
- Active running does not begin until the working set is ready
- Attached sources visibly distinguish `read_only` from `read_write`
- Story tests cover TC-2.1a through TC-2.5b
