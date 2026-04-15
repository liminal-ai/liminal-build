# Story 1: Process Entry and Bootstrap

### Summary
<!-- Jira: Summary field -->
Open one accessible process into a dedicated work surface, bootstrap the full visible state, and handle unavailable entry without leaking process contents.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Deliver the dedicated process work-surface entry slice so the user can enter one process, understand its current state immediately, and receive a safe unavailable state when the route cannot be opened.

**Scope**

In:

- Open the dedicated process work surface from the project shell or direct route
- Show the active project, process label, process type, phase label, and status
- Show the next meaningful action or current blocker on first load
- Bootstrap visible history, current materials, and unresolved current request state together
- Handle unavailable or revoked-access process entry without leaking process contents

Out:

- Start, resume, and live active-work transitions
- In-context response submission
- Side-work behavior and reconnect recovery
- Section-by-section degraded loading behavior

**Dependencies**

- Story 0 foundation
- Epic 1 project shell and process-access model
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** The user can open one accessible process from the project shell into a dedicated process work surface without losing project context.

- **TC-1.1a: Open process from project shell**
  - Given: User is viewing a project shell with an accessible process
  - When: User activates the process open action
  - Then: The process work surface opens for that process within the same project context
- **TC-1.1b: Open process from direct process URL**
  - Given: User has access to a project and a process inside it
  - When: User navigates directly to that process route
  - Then: The process work surface opens for that process without requiring the user to reopen it from the project shell

**AC-1.2:** The work surface clearly identifies the active project and active process, including the process display label, process type, current phase label, and current status.

- **TC-1.2a: Active process identity shown**
  - Given: User has opened a process work surface
  - When: The surface renders
  - Then: The project name, process display label, process type, current phase label, and current status are visible

**AC-1.3:** The work surface shows the next meaningful action or blocker on first load, using the current process state rather than requiring the user to infer it from history alone.

- **TC-1.3a: Next step shown for active process**
  - Given: Process has a next meaningful action
  - When: The work surface loads
  - Then: The next step is visible on first load
- **TC-1.3b: Blocker shown for waiting process**
  - Given: Process is waiting on a user action or dependency
  - When: The work surface loads
  - Then: The blocking condition is visible on first load

**AC-1.4:** The initial process work-surface load includes the current visible process history, current materials, and the current action-required state for that process.

- **TC-1.4a: Process surface bootstrap includes current work state**
  - Given: Process has visible history and current materials
  - When: The work surface loads
  - Then: The surface shows the current process history and current materials together on first load
- **TC-1.4b: Early process with little history still opens cleanly**
  - Given: Process has little or no visible work history yet
  - When: The work surface loads
  - Then: The surface shows a clear early-state history area instead of appearing broken or blank

**AC-6.4:** If the requested process or project is unavailable or access is revoked, the platform shows an unavailable state and does not leak process contents.

- **TC-6.4a: Missing process route shows unavailable state**
  - Given: User navigates to a process that no longer exists
  - When: The process surface loads
  - Then: The platform shows a process-unavailable state and does not show stale process contents
- **TC-6.4b: Revoked access blocks process surface**
  - Given: User no longer has access to the project or process
  - When: User navigates to that process route
  - Then: The platform blocks access and does not leak process contents

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the dedicated route entry, durable bootstrap payload, and request-level unavailable handling. The bootstrap contract is fully defined here so the page can be implemented without reconstructing nested shapes from other stories.

#### Browser Route

| Route | Description |
|---|---|
| `/projects/{projectId}/processes/{processId}` | Opens the dedicated work surface for one process inside its parent project |

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process work surface | GET | `/api/projects/{projectId}/processes/{processId}` | Returns the current process work-surface bootstrap for one accessible process |

#### Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | Path parameter for the parent project |
| `processId` | string | Yes | Path parameter for the process to open |

#### Process Work Surface Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `project.projectId` | string | yes | non-empty | Stable parent project identifier |
| `project.name` | string | yes | non-empty | Parent project display name |
| `project.role` | enum | yes | `owner` or `member` | Current user's role in the parent project |
| `process.processId` | string | yes | non-empty | Stable process identifier |
| `process.displayLabel` | string | yes | non-empty | Human-readable process label |
| `process.processType` | enum | yes | `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation` | Process type |
| `process.status` | enum | yes | `draft`, `running`, `waiting`, `paused`, `completed`, `failed`, or `interrupted` | Current high-level process status |
| `process.phaseLabel` | string | yes | non-empty | Human-readable current phase label |
| `process.nextActionLabel` | string | no | non-empty when present | Current next meaningful action or blocker summary |
| `process.availableActions` | array of enum | yes | values from `start`, `respond`, `resume`, `review`, or `restart` | High-level actions currently available from the work surface |
| `process.updatedAt` | string | yes | ISO 8601 UTC | Most recent durable process update time |
| `history` | Process History Section Envelope | yes | present | Visible process history for the active process or a section-level error state |
| `materials` | Process Materials Section Envelope | yes | present | Current materials and outputs relevant to the active process or a section-level error state |
| `currentRequest` | Current Process Request | no | present when unresolved | Current unresolved attention-required request for the active process |
| `sideWork` | Side Work Section Envelope | yes | present | Visible side-work items for the active process or a section-level error state |

Section envelopes keep a stable top-level response shape across `ready`, `empty`, and `error` states.

#### Process Surface Section Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable section error code |
| `message` | string | yes | non-empty | Human-readable section error summary |

#### Process History Section Envelope

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `status` | enum | yes | `ready`, `empty`, or `error` | Whether the history section loaded with items, loaded empty, or failed independently |
| `items` | array of Process History Item | yes | present | Visible process history items; empty when `status` is `empty` or `error` |
| `error` | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

**Sort order:** History items are ordered oldest to newest by `createdAt`.

#### Process History Item

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `historyItemId` | string | yes | non-empty | Stable visible history item identifier |
| `kind` | enum | yes | `user_message`, `process_message`, `progress_update`, `attention_request`, `side_work_update`, or `process_event` | User-facing kind of visible process history item |
| `lifecycleState` | enum | yes | `current` or `finalized` | Whether the item is still being updated live or has settled into a stable visible item |
| `text` | string | yes | non-empty | Visible text/content for the history item |
| `createdAt` | string | yes | ISO 8601 UTC | Time the visible item was created |
| `relatedSideWorkId` | string | no | non-empty when present | Side-work item identifier when this history item refers to side work |
| `relatedArtifactId` | string | no | non-empty when present | Artifact identifier when this history item refers to a current artifact or output |

#### Process Materials Section Envelope

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `status` | enum | yes | `ready`, `empty`, or `error` | Whether the materials section loaded with visible content, loaded empty, or failed independently |
| `currentArtifacts` | array of Process Artifact Reference | yes | present | Current artifacts relevant to the active process; empty when `status` is `empty` or `error` |
| `currentOutputs` | array of Process Output Reference | yes | present | Current process-owned outputs relevant to the active process; empty when `status` is `empty` or `error` |
| `currentSources` | array of Process Source Reference | yes | present | Current source attachments relevant to the active process; empty when `status` is `empty` or `error` |
| `error` | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

#### Process Artifact Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Artifact display name |
| `currentVersionLabel` | string | no | non-empty when present | Current revision or version label |
| `roleLabel` | string | no | non-empty when present | Why this artifact is currently relevant to the process |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

#### Process Output Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `outputId` | string | yes | non-empty | Stable output identifier |
| `displayName` | string | yes | non-empty | Current output display name |
| `revisionLabel` | string | no | non-empty when present | Current output revision label |
| `state` | string | yes | non-empty | User-visible current output state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent output update time |

#### Process Source Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `displayName` | string | yes | non-empty | Source display name |
| `purpose` | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref if known |
| `hydrationState` | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | High-level source availability state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable source update time |

#### Current Process Request

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `requestId` | string | yes | non-empty | Stable identifier for the current unresolved request |
| `requestKind` | enum | yes | `clarification`, `decision`, `approval`, `course_correction`, or `other` | User-facing kind of the current unresolved request |
| `promptText` | string | yes | non-empty | Current visible prompt or request text |
| `requiredActionLabel` | string | no | non-empty when present | Current action label shown with the unresolved request |
| `createdAt` | string | yes | ISO 8601 UTC | Time the current unresolved request became active |

An unresolved request appears in visible history when it is first issued. `currentRequest` is the currently unresolved request projected out of that history so it can remain pinned and visible while unresolved.

#### Side Work Section Envelope

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `status` | enum | yes | `ready`, `empty`, or `error` | Whether the side-work section loaded with visible items, loaded empty, or failed independently |
| `items` | array of Side Work Item | yes | present | Visible side-work items for the active process; empty when `status` is `empty` or `error` |
| `error` | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

#### Side Work Item

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sideWorkId` | string | yes | non-empty | Stable side-work identifier |
| `displayLabel` | string | yes | non-empty | Human-readable side-work label |
| `purposeSummary` | string | yes | non-empty | What the side work was for |
| `status` | enum | yes | `running`, `completed`, or `failed` | Current side-work status |
| `resultSummary` | string | no | non-empty when present | Returned result or failure summary shown to the user |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent visible side-work update time |

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
- The process route opens from both project-shell navigation and direct URL entry
- First-load rendering shows process identity, phase, status, next action or blocker, history, materials, current request state, and side-work envelope state
- Early-state empty history loads as a deliberate state rather than a broken surface
- Missing or forbidden routes show unavailable entry without leaking process contents
- Story tests cover TC-1.1a through TC-1.4b and TC-6.4a through TC-6.4b
- The implementation uses shared Story 0 contract and fixture vocabulary rather than redefining bootstrap shapes locally
