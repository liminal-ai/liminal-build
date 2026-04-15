# Story 3: Controlled Execution and Live Environment State

### Summary
<!-- Jira: Summary field -->
Show controlled execution as process-facing activity with live environment-state updates instead of an unmanaged terminal stream.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the live execution slice so the user can follow environment-backed work as readable process activity and distinguish running, waiting, checkpointing, and failure states clearly.

**Scope**

In:

- Show when controlled execution has started and is still running
- Surface live execution activity as coherent process-facing updates
- Keep environment preparation, active execution, waiting, checkpointing, and settled states distinct
- Leave the process surface legible when execution fails

Out:

- Durable checkpoint persistence details
- Rehydrate and rebuild flows
- Broader terminal-host behavior or raw provider transport exposure
- Source-management workflows outside execution visibility

**Dependencies**

- Story 0 foundation
- Story 1 environment state and visible controls
- Story 2 environment preparation and hydration
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** The process surface shows when controlled execution has begun and when it is still actively running in the environment.

- **TC-3.1a: Running execution state visible**
  - Given: Environment is ready and controlled work has started
  - When: User is viewing the process surface
  - Then: The surface shows that the process is actively running in the environment

**AC-3.2:** Live execution activity appears as coherent process-facing updates and environment-state changes rather than as an unmanaged terminal session or raw provider fragments.

- **TC-3.2a: Execution activity is process-facing**
  - Given: Process is actively working in the environment
  - When: Live execution updates arrive
  - Then: The updates appear as coherent process-facing activity in the work surface
- **TC-3.2b: Browser does not reconstruct raw stream fragments**
  - Given: Live execution updates are flowing
  - When: The surface updates
  - Then: The browser shows current readable state rather than exposing raw transport fragments as the user-facing model

**AC-3.3:** The process surface distinguishes environment preparation, active execution, waiting on user action, checkpointing, and settled process states.

- **TC-3.3a: Waiting is distinct from running**
  - Given: Process is no longer actively executing and is waiting on user action
  - When: The surface renders
  - Then: The surface shows a waiting state distinct from environment-running state
- **TC-3.3b: Checkpointing is distinct from running**
  - Given: Active execution has ended and durable persistence work is in progress
  - When: The surface renders
  - Then: The surface shows checkpointing as a distinct visible state

**AC-3.4:** A failure during controlled execution leaves the process surface legible and exposes the next recovery path without erasing the durable process history that already exists.

- **TC-3.4a: Execution failure leaves surface legible**
  - Given: Controlled execution fails during active work
  - When: The failure is reported
  - Then: The process identity, prior visible history, and current materials remain visible with a failure state and recovery path

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns live execution visibility and the browser-facing environment update model.

#### Live Process Updates

| Operation | Method | Path | Description |
|---|---|---|---|
| Live process updates | `WebSocket` | `/ws/projects/{projectId}/processes/{processId}` | Streams process, materials, side-work, current-request, and environment updates for one process |

#### Live Process Update Message

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

#### Live Entity Payloads Used In This Story

##### Process Live Payload

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `processId` | string | yes | non-empty | Stable process identifier |
| `status` | enum | yes | `draft`, `running`, `waiting`, `paused`, `completed`, `failed`, or `interrupted` | Current high-level process status |
| `phaseLabel` | string | yes | non-empty | Human-readable current phase label |
| `nextActionLabel` | string | no | non-empty when present | Current next meaningful action or blocker summary |
| `availableActions` | array of enum | yes | values from `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, or `restart` | High-level actions currently enabled from the process surface |
| `controls` | array of Process Control State | yes | present | Full visible control set with enabled or disabled state |
| `hasEnvironment` | boolean | yes | boolean | Whether a current working environment exists for the process |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable process update time |

##### Environment Live Payload

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `environmentId` | string | no | non-empty when present | Stable environment identifier for the current working copy |
| `state` | enum | yes | `absent`, `preparing`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, or `unavailable` | Current environment state shown on the process surface |
| `statusLabel` | string | yes | non-empty | User-visible label for the current environment state |
| `blockedReason` | string | no | non-empty when present | Current reason the environment cannot proceed to the next expected action |
| `lastHydratedAt` | string | no | ISO 8601 UTC when present | Time the working set was last hydrated into the environment |
| `lastCheckpointAt` | string | no | ISO 8601 UTC when present | Time the most recent checkpoint attempt settled |
| `lastCheckpointResult` | Last Checkpoint Result or null | yes | present | Latest visible checkpoint outcome for this process environment |

##### History Live Payload

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `historyItemId` | string | yes | non-empty | Stable visible history item identifier |
| `kind` | enum | yes | `user_message`, `process_message`, `progress_update`, `attention_request`, `side_work_update`, or `process_event` | User-facing kind of visible process history item |
| `lifecycleState` | enum | yes | `current` or `finalized` | Whether the item is still being updated live or has settled into a stable visible item |
| `text` | string | yes | non-empty | Visible text or content for the history item |
| `createdAt` | string | yes | ISO 8601 UTC | Time the visible item was created |
| `relatedSideWorkId` | string | no | non-empty when present | Side-work item identifier when this history item refers to side work |
| `relatedArtifactId` | string | no | non-empty when present | Artifact identifier when this history item refers to a current artifact or output |

`materials`, `current_request`, and `side_work` upserts continue to use the same browser-facing shapes as the durable bootstrap response. They travel through the same live envelope even when this story is primarily exercising execution-facing `process`, `history`, and `environment` updates.

#### Environment Summary State Distinctions Used During Execution

| State | Meaning |
|---|---|
| `preparing` | Environment is being prepared and not yet ready for active work |
| `ready` | Environment is prepared and ready for process work |
| `running` | Environment is actively executing process work |
| `checkpointing` | Environment is persisting durable work after active execution |
| `failed` | Environment is failed and not currently progressing |

#### Checkpoint Visibility Boundary

Checkpoint outcomes travel inside the `environment` payload through `lastCheckpointResult`. This story does not define a separate checkpoint entity type.

#### Live Transport Status Codes

| Code | Description |
|---|---|
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live update subscription could not start or remain connected after the durable process surface bootstrap succeeded |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- The surface shows when execution begins and remains running
- Live execution activity is rendered as process-facing updates rather than raw provider fragments
- Waiting and checkpointing remain visibly distinct from running
- Execution failure preserves process identity, prior history, and current materials
- This story file contains the live payload contracts needed to implement `process`, `history`, and `environment` upserts without reconstructing those shapes from earlier stories
- Live update sequencing, replacement semantics, and environment entity handling are covered by tests
- Story tests cover TC-3.1a through TC-3.4a
