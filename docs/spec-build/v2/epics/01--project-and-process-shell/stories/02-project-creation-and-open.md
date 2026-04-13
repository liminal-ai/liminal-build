# Story 2: Project Creation and Open

### Summary
<!-- Jira: Summary field -->

The user can create a project, open an accessible project, and stay oriented inside the active project shell.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user is starting or resuming work inside a concrete project. They need one durable container that holds processes, artifacts, and source attachments before deeper process-specific behavior begins.
- **Mental Model:** "I have a project. Inside that project I run one or more processes. The platform should show me my projects, let me open the right one, and keep each process separate."
- **Key Constraint:** The platform must preserve durable project and process state without flattening work into a generic chat thread or treating a sandbox filesystem as the source of truth.

**Objective**

Let the user create a durable top-level project container, open an accessible project from the index or a direct URL, keep the active project clear during navigation, and cancel project or process create flows without leaving partial records.

**Scope**

**In Scope**

- Project creation with owner assignment and duplicate-name protection
- Open accessible projects from the index or direct URL
- Active project orientation inside the shell
- Refresh and browser-navigation continuity for the active project
- Create-process flow entry and cancellation inside an already-open project shell, without completing process registration
- Cancel create-project and create-process flows without leaving partial records

**Out of Scope**

- Project index auth/access gating beyond what Story 1 already delivers
- Detailed project shell summary rendering
- Successful process registration after the user confirms create process
- Return/recovery behavior after the user leaves later

**Dependencies**

- Story 1
- Shared route-state and shell bootstrap foundations from Story 0

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-2.1:** The user can create a project with the minimum identity needed to distinguish it from other work. The system assigns the creator as an owner and a stable project identity. A user cannot create a second owned project with the same display name.

- **TC-2.1a: Valid project creation**
  - Given: User is authenticated and on the project index
  - When: User enters a valid project name and confirms creation
  - Then: The system creates the project, assigns the user as owner, and opens the new project shell
- **TC-2.1b: Missing required project name**
  - Given: User opens the create-project form
  - When: User submits without a project name
  - Then: The system blocks creation and shows a validation message
- **TC-2.1c: Cancel project creation**
  - Given: User opens the create-project form
  - When: User cancels before submitting
  - Then: No project is created and the user returns to the project index unchanged
- **TC-2.1d: Duplicate owned project name is rejected**
  - Given: User already owns a project named "Core Platform"
  - When: User tries to create another owned project named "Core Platform"
  - Then: The system blocks creation and shows a project-name conflict message

**AC-2.2:** The user can open an existing accessible project from the project index or a direct project URL. Opening a project loads that project's durable shell state.

- **TC-2.2a: Open project from index**
  - Given: User can access a project from the project index
  - When: User selects that project
  - Then: The project shell loads for that project
- **TC-2.2b: Open project from direct URL**
  - Given: User can access a project and has its direct URL
  - When: User navigates to that URL
  - Then: The matching project shell loads without requiring the user to reopen it from the index
- **TC-2.2c: Switch between projects**
  - Given: User can access multiple projects
  - When: User opens one project and then another
  - Then: The shell updates to the newly selected project and does not show stale data from the previous one

**AC-2.3:** The project shell clearly identifies the active project and keeps the user oriented inside that project while they navigate, refresh, or return.

- **TC-2.3a: Active project identity shown**
  - Given: User has opened a project
  - When: The project shell renders
  - Then: The project name and the user's role in that project are visible
- **TC-2.3b: Refresh inside project shell**
  - Given: User is viewing a project shell
  - When: User refreshes the browser
  - Then: The same project reloads as the active project if the user still has access
- **TC-2.3c: Browser navigation inside platform**
  - Given: User opened a project from the project index
  - When: User uses browser back and forward navigation
  - Then: The platform restores the matching project index or project shell state without losing durable data

**AC-6.1:** Canceling project creation or process creation creates no partial record and returns the user to a stable prior surface.

- **TC-6.1a: Cancel project creation**
  - Given: User opened the create-project flow
  - When: User cancels before submitting
  - Then: No project record is created and the user returns to the project index
- **TC-6.1b: Cancel process creation**
  - Given: User opened the create-process flow inside a project
  - When: User cancels before submitting
  - Then: No new process is created and the user remains in the same project shell

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

#### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Create project | POST | `/api/projects` | Creates a project owned by the current user |
| Get project shell data | GET | `/api/projects/{projectId}` | Returns project identity plus project shell summaries |
| Create process in project | POST | `/api/projects/{projectId}/processes` | Creates a new process inside the current project |

At Story 2 boundary, `GET /api/projects/{projectId}` must open an accessible project shell and return project identity with empty section envelopes where no shell summaries have been implemented yet. Fully populated section reads and section-level error behavior remain Story 3 work.

#### Create Project Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | yes | trimmed, non-empty | Project display name |

Project names must be unique within the current owner's owned projects. The project index may still contain same-name projects from different owners, so the shell summary includes owner or secondary context to distinguish them.

#### Project Shell Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Path parameter for the project to open |
| `processId` | string | No | Query parameter for the currently selected process within the already-loaded shell summaries |

#### Project Summary Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| projectId | string | yes | non-empty | Stable project identifier |
| name | string | yes | non-empty | Project display name |
| ownerDisplayName | string | no | non-empty when present | Project owner display name for distinguishing same-name project entries |
| role | enum | yes | `owner` or `member` | Current user's role in the project |
| processCount | integer | yes | `>= 0` | Number of processes in the project |
| artifactCount | integer | yes | `>= 0` | Number of project artifacts |
| sourceAttachmentCount | integer | yes | `>= 0` | Number of source attachments |
| lastUpdatedAt | string | yes | ISO 8601 UTC | Most recent durable update time for the project |

#### Project Shell Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| project | Project Summary | yes | present | Active project identity and access role |
| processes | Process Section Envelope | yes | present | Current process summaries or section-level process load state |
| artifacts | Artifact Section Envelope | yes | present | Current project artifact summaries or section-level artifact load state |
| sourceAttachments | Source Attachment Section Envelope | yes | present | Current source attachment summaries or section-level source load state |

**Success response:** `POST /api/projects` returns `201` with a `Project Shell Response` body for the newly created project. On initial create, each section envelope returns an empty `items` array with `status: empty`.

#### Project Shell Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the section loaded with items, loaded empty, or failed independently |
| items | array | yes | present | Section items; empty when `status` is `empty` or `error` |
| error | Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole project shell |

#### Create Process Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, `FeatureImplementation` | Process type to create |

Allowed values come from the platform-registered `ProcessType` set. In Story 2, this request boundary is included so the create-process picker and cancel path are implementable and testable, but successful process submission and resulting process registration remain owned by Story 4.

Story 2 only needs the create-process modal shell to open and cancel cleanly for `TC-6.1b`. Rendering the supported type set and completing the submission path remain Story 4 work.

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 409 | `PROJECT_NAME_CONFLICT` | User already owns a project with the requested name |
| 422 | `INVALID_PROJECT_NAME` | Project create request is missing a valid name |
| 422 | `INVALID_PROCESS_TYPE` | Process create request does not specify a supported process type |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Project creation covers valid create, missing-name validation, duplicate-name rejection, and cancellation per TC-2.1a through TC-2.1d
- [ ] Opening an accessible project works from both the index and a direct URL per TC-2.2a through TC-2.2c
- [ ] Active-project orientation survives render, refresh, and browser navigation per TC-2.3a through TC-2.3c
- [ ] Canceling create flows leaves no partial project or process record per TC-6.1a and TC-6.1b
- [ ] Story tests cover create, cancel, duplicate, direct-open, project switching, refresh, and browser-navigation paths
