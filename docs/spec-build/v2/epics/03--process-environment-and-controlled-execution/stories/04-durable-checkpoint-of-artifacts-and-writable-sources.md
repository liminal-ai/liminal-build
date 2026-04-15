# Story 4: Durable Checkpoint of Artifacts and Writable Sources

### Summary
<!-- Jira: Summary field -->
Persist durable artifact outputs and writable-source code changes out of the disposable environment and show the checkpoint result on the process surface.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, environments, and code persistence flows.
- **Context:** The user has opened a concrete process that now needs working files, controlled execution, and durable checkpointing rather than only shell-level summaries or process-surface visibility.
- **Mental Model:** "This process has a working environment. The environment can be prepared, hydrated, used, rebuilt, and discarded by the system when needed. The real source of truth for process outputs lives outside that working copy."
- **Key Constraint:** The environment must be useful for real work, including artifact outputs and code work against already-attached writable repositories, without turning the platform into a generic terminal host or requiring a separate source-management product surface in the same epic.

**Objective**

Deliver the durable checkpoint slice so environment work persists to canonical artifact and writable-source truth instead of dying with the working copy.

**Scope**

In:

- Persist artifact outputs durably for the process
- Persist writable-source code changes back to canonical code truth
- Keep read-only sources out of code checkpoint paths
- Show checkpoint results clearly on the process surface
- Show checkpoint failures and recovery or retry paths

Out:

- Rehydrate and rebuild actions after stale or lost environments
- Broader GitHub review, branch-management, or publishing workflows
- Ordered checkpoint-history browsing beyond latest-result visibility

**Dependencies**

- Story 0 foundation
- Story 2 preparation and source-access visibility
- Story 3 controlled execution and environment-state updates
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-4.1:** Artifact outputs produced during controlled environment work can checkpoint back to durable artifact state for the process.

- **TC-4.1a: Durable artifact output persists**
  - Given: Process produces artifact output during environment work
  - When: Checkpointing succeeds
  - Then: The resulting artifact output appears in durable process state and remains available after the environment is gone
- **TC-4.1b: Artifact output remains recoverable after reopen**
  - Given: Artifact output checkpointing succeeded earlier
  - When: User later reloads or reopens the process
  - Then: The checkpointed artifact output remains visible from durable state

This TC becomes fully end-to-end exercisable once Story 6 lands. Story 4 establishes the durable artifact persistence contract and checkpoint state that Story 6 restores on reopen.

**AC-4.2:** Code work against an already-attached writable source can checkpoint back to canonical code truth for that source.

- **TC-4.2a: Writable source code checkpoint succeeds**
  - Given: Process has an already-attached writable source and durable code work to persist
  - When: Code checkpointing succeeds
  - Then: The durable code update lands in the canonical code source associated with that attachment
- **TC-4.2b: Code checkpoint result is process-visible**
  - Given: Code checkpointing succeeded for a writable source
  - When: The process surface updates
  - Then: The user can tell which source received the durable code update and which target ref that update was associated with

**AC-4.3:** Read-only attached sources never present code checkpointing as an available path.

- **TC-4.3a: Read-only source cannot receive code checkpoint**
  - Given: Process has an attached read-only source
  - When: The process completes code-informed work involving that source
  - Then: The surface does not present code checkpointing to that source as an available durable outcome

**AC-4.4:** The process surface shows the result of checkpointing clearly enough that the user can tell what durable work persisted and what canonical target received it.

- **TC-4.4a: Artifact checkpoint result visible**
  - Given: Artifact checkpointing succeeds
  - When: The process surface updates
  - Then: The surface shows that durable artifact work persisted
- **TC-4.4b: Code checkpoint result visible**
  - Given: Writable-source checkpointing succeeds
  - When: The process surface updates
  - Then: The surface shows the source identity and target ref for the durable code update

**AC-4.5:** A checkpoint failure does not silently discard durable work. The process surface shows the failure and the next recovery path.

- **TC-4.5a: Artifact checkpoint failure shown**
  - Given: Durable artifact checkpointing fails
  - When: The failure is reported
  - Then: The surface shows that the durable artifact work did not persist and exposes a recovery or retry path
- **TC-4.5b: Code checkpoint failure shown**
  - Given: Writable-source checkpointing fails
  - When: The failure is reported
  - Then: The surface shows that the durable code update did not persist and exposes a recovery or retry path

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the durable checkpoint visibility contract for artifacts and writable sources.

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

#### Environment Summary Checkpoint Fields

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `lastCheckpointAt` | string | no | ISO 8601 UTC when present | Time the most recent checkpoint attempt settled |
| `lastCheckpointResult` | Last Checkpoint Result or null | yes | present | Latest visible checkpoint outcome for this process environment; `null` when no checkpoint has settled yet |

Checkpoint visibility in this epic is latest-result only. When a new checkpoint settles, `lastCheckpointResult` replaces the prior visible checkpoint result. Historical checkpoint moments may also appear in visible history, but this epic does not define a separate ordered checkpoint-results list.

Story 4 owns the persisted checkpoint state and latest-result shape. Story 6 consumes that durable state when the process route reopens later without an active environment.

#### Process Source Reference Fields Used For Code Checkpoint Visibility

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `displayName` | string | yes | non-empty | Source display name |
| `accessMode` | enum | yes | `read_only` or `read_write` | Whether durable code work can persist back to the canonical source |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref if known |

When a source is attached as `read_write`, Epic 3 writes durable code changes
back to that same attached `targetRef` directly. This story does not introduce
an intermediate branch, PR workflow, or alternate write target.

#### Checkpoint Visibility Boundary

Checkpoint outcomes travel inside the `environment` payload through `lastCheckpointResult`. This epic does not define a separate checkpoint entity type.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Artifact outputs persist to durable process-visible artifact state
- Writable-source code changes persist to canonical code truth and show source identity plus target ref
- Read-only sources never present code checkpointing as an available durable path
- The environment summary shows the latest checkpoint result clearly for both success and failure
- Checkpoint failure leaves a visible recovery or retry path instead of silently dropping work
- TC-4.1b is expected to run end-to-end after Story 6 adds reopen restoration; Story 4 still owns the durable state established before that reopen
- Story tests cover TC-4.1a through TC-4.5b
