# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Create the shared environment-summary, control-state, checkpoint-result, error, and live-update vocabulary used by all later Epic 3 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Establish the shared contract vocabulary, fixtures, error-code vocabulary on `AppError`, and test helpers required by Stories 1 through 6.

**Scope**

In:

- Shared environment-state vocabulary for the process work surface
- Shared visible-control vocabulary and stable control-order expectations
- Shared checkpoint-result shapes and recovery error codes
- Shared source access-mode vocabulary for read-only versus writable attachments
- Shared websocket entity vocabulary for environment updates
- Reusable fixtures and helpers for environment summary, control states, checkpoint results, and recovery failures

Out:

- User-visible process behaviors owned by Stories 1 through 6
- Provider-specific environment creation, hydration, execution, checkpoint, or teardown implementation
- Full source-attachment management workflows
- Markdown review, export, or archive expansion beyond the Epic 3 boundary

**Dependencies**

- Epic 1 project shell, source summary visibility, and process summary vocabulary
- Epic 2 process work-surface route, current materials visibility, current request handling, and live-update transport
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared environment and execution vocabulary consumed by Stories 1 through 6.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Environment and Execution Surface

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns the process work surface, including environment summary and stable control states |
| Start process | `POST` | `/api/projects/{projectId}/processes/{processId}/start` | Starts a draft process and begins environment preparation when required |
| Resume process | `POST` | `/api/projects/{projectId}/processes/{processId}/resume` | Resumes an eligible process and begins environment preparation when required |
| Rehydrate environment | `POST` | `/api/projects/{projectId}/processes/{processId}/rehydrate` | Refreshes a recoverable working copy from canonical materials |
| Rebuild environment | `POST` | `/api/projects/{projectId}/processes/{processId}/rebuild` | Reconstructs an environment from canonical materials after loss or unrecoverable failure |
| Live process updates | `WebSocket` | `/ws/projects/{projectId}/processes/{processId}` | Streams process, materials, side-work, current-request, and environment updates for one process |

#### Shared Environment Vocabulary

| Contract Element | Values |
|---|---|
| `environment.state` | `absent`, `preparing`, `rehydrating`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, `unavailable` |
| `process.controls.actionId` | `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, `restart` |
| `process.availableActions` | `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, `restart` |
| `source.accessMode` | `read_only`, `read_write` |
| `live.messageType` | `snapshot`, `upsert`, `complete`, `error` |
| `live.entityType` | `process`, `history`, `current_request`, `materials`, `side_work`, `environment` |
| `checkpoint.checkpointKind` | `artifact`, `code`, `mixed` |
| `checkpoint.outcome` | `succeeded`, `failed` |

`preparing` is the accepted in-session state for `start` and `resume`;
`rehydrating` is the accepted in-session state for `rehydrate`; `rebuilding` is
the accepted in-session state for `rebuild`.

#### Process Summary Additions

| Field | Type | Required | Description |
|---|---|---|---|
| `availableActions` | array of enum | yes | Actions currently enabled for the process surface |
| `controls` | array of Process Control State | yes | Full visible control set with enabled or disabled state |
| `hasEnvironment` | boolean | yes | Whether a current working environment exists for the process |

#### Process Control State

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `actionId` | enum | yes | `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | Stable control identifier in the visible control area |
| `enabled` | boolean | yes | boolean | Whether the action is currently available |
| `disabledReason` | string | no | non-empty when present | Why the action is currently unavailable |
| `label` | string | yes | non-empty | User-visible action label |

**Control order:** Controls appear in a stable order so the user does not need to relearn the control area when process or environment state changes.

When process state and environment state conflict, the control remains visible, the disabled state wins, and `disabledReason` explains the blocking condition.

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

#### Last Checkpoint Result

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `checkpointId` | string | yes | non-empty | Stable identifier for the checkpoint result |
| `checkpointKind` | enum | yes | `artifact`, `code`, or `mixed` | Type of durable work that persisted |
| `outcome` | enum | yes | `succeeded` or `failed` | Result of the checkpoint attempt |
| `targetLabel` | string | yes | non-empty | Canonical target that received or failed to receive the durable work |
| `targetRef` | string | no | non-empty when present | Canonical target ref when the checkpoint applies to code |
| `completedAt` | string | yes | ISO 8601 UTC | Time the checkpoint attempt settled |
| `failureReason` | string | no | non-empty when present | Current visible reason for checkpoint failure |

#### Process Source Reference Additions

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `displayName` | string | yes | non-empty | Source display name |
| `purpose` | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| `accessMode` | enum | yes | `read_only` or `read_write` | Whether durable code work can persist back to the canonical source |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref if known |
| `hydrationState` | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | Current high-level source readiness state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable source update time |

#### Shared Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist inside the requested project |
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | The requested process action is not valid in the current process or environment state |
| `409` | `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | The current environment cannot be rehydrated and requires rebuild or other recovery |
| `422` | `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Required canonical materials are missing or unavailable for preparation, rehydrate, or rebuild |
| `503` | `PROCESS_ENVIRONMENT_UNAVAILABLE` | Environment lifecycle work is unavailable for the requested process |

#### Shared Live Update Contract

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `subscriptionId` | string | yes | non-empty | Stable identifier for the current live subscription |
| `processId` | string | yes | non-empty | Process this live update belongs to |
| `sequenceNumber` | integer | yes | `>= 0` | Monotonic sequence number within the subscription |
| `messageType` | enum | yes | `snapshot`, `upsert`, `complete`, or `error` | Type of live update message |
| `entityType` | enum | yes | `process`, `history`, `current_request`, `materials`, `side_work`, or `environment` | What visible surface entity the update applies to |
| `entityId` | string | yes | non-empty | Identifier of the visible entity being updated |
| `correlationId` | string | no | non-empty when present | Client request correlation identifier when the update corresponds to a client-originated action |
| `payload` | object or null | yes | present | Current-object payload for the visible entity |
| `completedAt` | string | no | ISO 8601 UTC when present | Completion time for a `complete` message |

**Sequencing:** Live update messages are applied in `sequenceNumber` order within one `subscriptionId`.

**Upsert semantics:** `upsert` messages replace the current browser-facing state for the identified visible entity rather than delivering raw append-only stream deltas.

**Completion marker:** `complete` marks the current visible entity as settled for that live update cycle.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared environment, control, checkpoint, and source-access vocabulary is defined once and referenced by later stories
- Reusable fixtures cover absent, preparing, rehydrating, ready, stale, failed, lost, rebuilding, checkpointing, and unavailable environment states
- Recovery and checkpoint error-code vocabulary on `AppError` exists for action rejection and later asynchronous failure reporting
- Live-update fixtures include `environment` entity snapshots, upserts, completion markers, and transport errors
- Story files and coverage artifact can reference Story 0 without redefining shared environment vocabulary
