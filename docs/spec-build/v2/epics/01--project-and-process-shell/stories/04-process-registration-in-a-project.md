# Story 4: Process Registration in a Project

### Summary
<!-- Jira: Summary field -->

The user can create supported processes inside a project and keep multiple processes legible and independent.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user is starting or resuming work inside a concrete project. They need one durable container that holds processes, artifacts, and source attachments before deeper process-specific behavior begins.
- **Mental Model:** "I have a project. Inside that project I run one or more processes. The platform should show me my projects, let me open the right one, and keep each process separate."
- **Key Constraint:** The platform must preserve durable project and process state without flattening work into a generic chat thread or treating a sandbox filesystem as the source of truth.

**Objective**

Allow the user to create a supported process inside the current project, give each process durable identity and an auto-generated display label built from process type plus a durable distinguisher, preserve independence between multiple processes, and keep the process list ordered and legible.

**Scope**

**In Scope**

- Supported `ProcessType` picker
- Create process action inside an open project
- Auto-generated process display labels in Epic 1, derived from process type plus a durable distinguisher
- Initial durable process record with draft status and initial phase
- Coexistence rules for multiple processes in one project
- Process list ordering and focused/selected state visibility

**Out of Scope**

- Manual process naming or renaming workflows
- Detailed process work surface behavior after a process is opened
- Environment hydration or execution behavior
- Return/recovery behavior after the user leaves and comes back later

**Dependencies**

- Story 3
- Shared process-summary contract models from Story 0

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-4.1:** The user can create a new process from the supported initial `ProcessType` set and the platform does not offer unsupported process types.

- **TC-4.1a: Supported process types available**
  - Given: User opens the create-process action inside a project
  - When: The process-type picker appears
  - Then: It offers `ProductDefinition`, `FeatureSpecification`, and `FeatureImplementation`
- **TC-4.1b: Create ProductDefinition process**
  - Given: User is in a project shell
  - When: User chooses `ProductDefinition` and confirms
  - Then: A new `ProductDefinition` process is created inside that project
- **TC-4.1c: Unsupported process type absent**
  - Given: User opens the process-type picker
  - When: The picker renders
  - Then: No unsupported or placeholder process type appears as selectable

**AC-4.2:** Each new process receives its own durable identity, auto-generated display label, initial status, and initial phase context within the current project.

- **TC-4.2a: Initial process state exists immediately**
  - Given: User creates a process
  - When: Creation succeeds
  - Then: The new process appears with a stable process ID, an auto-generated display label, the initial `draft` status, and an initial phase label
- **TC-4.2b: No environment required at creation**
  - Given: User creates a process and no environment has been assigned
  - When: The process summary appears
  - Then: The process can exist without an active environment and the shell does not require environment setup to show it
- **TC-4.2c: Process created in correct project**
  - Given: User has two projects open during one session
  - When: User creates a process from Project B
  - Then: The new process is added to Project B and does not appear under Project A
- **TC-4.2d: No manual label entry required at creation**
  - Given: User opens the create-process flow
  - When: The flow renders
  - Then: The user selects a supported process type without needing to provide a manual process name in Epic 1

**AC-4.3:** Multiple processes can coexist in one project without overwriting each other's state, artifacts, or source relationships.

- **TC-4.3a: Two processes of different types**
  - Given: Project already has one process
  - When: User creates a second process of a different type
  - Then: Both process summaries remain visible and separate
- **TC-4.3b: Two processes of the same type**
  - Given: Project already has one `FeatureSpecification` process
  - When: User creates a second `FeatureSpecification` process
  - Then: Each process has a separate identity, summary entry, and display label that distinguishes it from the other
- **TC-4.3c: Existing process state preserved**
  - Given: Project contains an existing process with artifacts or source attachments
  - When: User creates another process
  - Then: The existing process summary and associations remain unchanged

**AC-4.4:** The process list stays legible as more work accumulates. The user can tell which process changed most recently and which project process they are inspecting.

- **TC-4.4a: Stable process ordering**
  - Given: A project has multiple processes with different update times
  - When: The process list renders
  - Then: Processes are ordered by most recently updated first
- **TC-4.4b: Newly created process rises to top**
  - Given: A project already has older processes
  - When: User creates a new process
  - Then: The new process appears at the top of the process list
- **TC-4.4c: Process selection state visible**
  - Given: User is inspecting one process summary in the shell
  - When: The shell renders the process list
  - Then: The currently selected or focused process is visually distinguishable from the others

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

#### Endpoint

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Create process in project | POST | `/api/projects/{projectId}/processes` | Creates a new process inside the current project |

#### Create Process Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, `FeatureImplementation` | Process type to create |

Allowed values come from the platform-registered `ProcessType` set. In Epic 1, the supported registered set is fixed to `ProductDefinition`, `FeatureSpecification`, and `FeatureImplementation`.

In Epic 1, the created process label is auto-generated from process type plus a durable distinguisher. Manual user-authored naming or renaming is out of scope.

Epic 1 uses a deterministic display-label format:

- `Product Definition #<n>`
- `Feature Specification #<n>`
- `Feature Implementation #<n>`

The sequence is project-local and process-type-local.

#### Create Process Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| process | Process Summary | yes | present | Created process summary for immediate insertion into the current project shell |

**Success response:** `POST /api/projects/{projectId}/processes` returns `201` with a `Create Process Response` body.

#### Process Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processId | string | yes | non-empty | Stable process identifier |
| displayLabel | string | yes | non-empty | Human-readable process label used to distinguish this process from other project processes, including same-type processes |
| processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, `FeatureImplementation` | Process type |
| status | enum | yes | `draft`, `running`, `waiting`, `paused`, `completed`, `failed`, or `interrupted` | Current high-level process state |
| phaseLabel | string | yes | non-empty | Human-readable current phase label |
| nextActionLabel | string | no | non-empty when present | Summary of the next meaningful step or blocker |
| availableActions | array of enum | no | values from `open`, `respond`, `resume`, `review`, `rehydrate`, or `restart` when present | High-level shell actions currently available for this process |
| hasEnvironment | boolean | yes | boolean | Whether an environment is currently assigned |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable update time |

**Sort order:** Process list is sorted by `updatedAt` descending.

**Display label rule:** In Epic 1, `displayLabel` is auto-generated from process type plus a durable distinguisher so multiple same-type processes remain legible without requiring manual naming.

**Type-exclusive write rule:** Registration writes exactly one process-specific state row, chosen by `processType`. A `ProductDefinition` process creates one row in `processProductDefinitionStates` and no rows in the other two process-state tables. The same rule applies to `FeatureSpecification` and `FeatureImplementation`.

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 422 | `INVALID_PROCESS_TYPE` | Process create request does not specify a supported process type |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Supported process-type creation covers TC-4.1a through TC-4.1c
- [ ] Initial process identity, deterministic type-plus-distinguisher label, draft status, initial phase, and no-environment behavior satisfy TC-4.2a through TC-4.2d
- [ ] Registration writes exactly one matching process-specific state row and does not seed the other process-state tables
- [ ] Multiple same-type and different-type processes remain independent per TC-4.3a through TC-4.3c
- [ ] Process ordering and focused/selected visibility satisfy TC-4.4a through TC-4.4c
- [ ] Story tests cover supported type selection, unsupported type rejection, same-project insertion, cross-project isolation, same-type duplication, and process-list ordering
