# Epic 1: Project and Process Shell

This epic defines the complete requirements for the Liminal Build project and
process shell. It serves as the source of truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who wants to run high-quality crafted processes through one durable
project surface instead of manually stitching together prompts, tools,
documents, and environments.
**Context:** The user is starting or resuming work inside a concrete project.
They need one durable container that holds processes, artifacts, and source
attachments before deeper process-specific behavior begins.
**Mental Model:** "I have a project. Inside that project I run one or more
processes. The platform should show me my projects, let me open the right one,
and keep each process separate."
**Key Constraint:** The platform must preserve durable project and process state
without flattening work into a generic chat thread or treating a sandbox
filesystem as the source of truth.

---

## Feature Overview

This feature establishes the durable working shell for the platform. After it
ships, the user can sign in, see the projects they can access, create or open a
project, view its current processes, artifacts, and source attachments, and
create a new process from a supported `ProcessType`. The shell restores durable
state when the user returns and makes interrupted work visible before the deeper
process work surface begins in Epic 2.

---

## Scope

### In Scope

This epic delivers the shared platform container above all process types:

- Authenticated entry into project work
- Sign out from authenticated project work
- Project index showing only accessible projects
- Project creation with durable ownership
- Project shell for one opened project
- Project-level summaries for processes, artifacts, and source attachments,
  including minimal association context where needed to keep the shell legible
- Process creation from the initial supported `ProcessType` set
- Restoration of durable project and process shell state across reloads and later sessions
- Visibility into interrupted, paused, waiting, failed, and completed process states at summary level

### Out of Scope

- Detailed process-specific behavior for `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation`
- Active process chat or control surface (Epic 2)
- Environment hydration, process execution, and tool harness behavior (Epic 3)
- Markdown review, Mermaid rendering, and package/export workflows (Epic 4)
- Repository hydration, freshness resolution, and canonical archive derivation behavior (Epic 5)
- Membership invitation, removal, or full team administration workflows
- Manual process naming or renaming workflows
- Generic workflow-schema authoring or no-code process configuration

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | The first supported `ProcessType` values are `ProductDefinition`, `FeatureSpecification`, and `FeatureImplementation` | Validated | Product | Defined in the core platform PRD |
| A2 | Creating a project assigns the creator as an owner automatically | Validated | Product | Ownership editing is not part of this epic |
| A3 | A user may belong to multiple projects as owner or member | Validated | Product | Project list and access gating depend on this |
| A4 | Membership management exists outside this epic or will be added later | Unvalidated | Product | This epic only needs role visibility and access enforcement |
| A5 | A process can exist before it has an active environment | Validated | Platform | Environment behavior begins in Epic 3 |
| A6 | Project shell summaries may include artifacts and source attachments even before their deeper review and hydration workflows are delivered | Validated | Platform | Summary visibility is part of Feature 1; detailed behaviors come later |
| A7 | Epic 1 process display labels are auto-generated from process type plus a durable distinguisher rather than being user-authored | Validated | Platform | Manual naming is out of scope for this epic |

---

## Flows & Requirements

### 1. Entering the Platform and Seeing the Right Projects

The user arrives at the platform and expects project work to be gated by an
authenticated session. Once signed in, they need a project index that shows only
the projects they can access and enough access context to choose the right one.
Once inside project work, they also need a reliable way to sign out and end the
authenticated session cleanly.

1. User navigates to the platform
2. System checks for an authenticated session
3. If the user is not authenticated, the system redirects them to sign in
4. If the user is authenticated, the system loads the user's accessible projects
5. User reviews the available projects and chooses one to open or creates a new project

#### Acceptance Criteria

**AC-1.1:** Project work requires an authenticated session. The platform
redirects unauthenticated users to sign in and restores valid sessions without
forcing unnecessary re-authentication.

- **TC-1.1a: Authenticated user lands on project index**
  - Given: User has a valid session
  - When: User opens the platform root or a project-work URL
  - Then: The platform loads the user's project surface without showing a login challenge first
- **TC-1.1b: Unauthenticated user is redirected to sign in**
  - Given: User has no valid session
  - When: User opens the platform root or a project-work URL
  - Then: The platform redirects the user to the sign-in flow before showing any project data
- **TC-1.1c: Expired or invalid session**
  - Given: User has a stale or invalid session token
  - When: User opens the platform
  - Then: The platform clears the invalid session, redirects the user to sign in, and does not expose project data

**AC-1.2:** The project index shows only the projects the current user can
access and provides a clear empty state when none are available.

- **TC-1.2a: User with accessible projects**
  - Given: User has access to three projects
  - When: The project index loads
  - Then: The index shows those three projects and no inaccessible projects
- **TC-1.2b: User with no accessible projects**
  - Given: User has no accessible projects
  - When: The project index loads
  - Then: The index shows an empty state with a create-project action
- **TC-1.2c: Hidden inaccessible project**
  - Given: Another project exists but the current user is not an owner or member
  - When: The project index loads
  - Then: That project does not appear anywhere in the project list
- **TC-1.2d: Same-name projects from different owners remain distinguishable**
  - Given: User can access two projects with the same display name but different owners
  - When: The project index loads
  - Then: Both entries appear with enough owner or summary context to distinguish them

**AC-1.3:** The project index and project shell show the user's role for each
accessible project and block direct access to projects they cannot open.

- **TC-1.3a: Owner role shown**
  - Given: User owns a project
  - When: That project appears in the index or shell
  - Then: The UI labels the user as an owner for that project
- **TC-1.3b: Member role shown**
  - Given: User is a member but not an owner of a project
  - When: That project appears in the index or shell
  - Then: The UI labels the user as a member for that project
- **TC-1.3c: Unauthorized direct navigation**
  - Given: User is not allowed to open a project
  - When: User navigates directly to that project's URL
  - Then: The system shows a project-unavailable or access-denied state and does not leak the project's contents

**AC-1.4:** Authenticated project surfaces provide a sign-out action that ends
the current session, returns the user to a signed-out state, and blocks access
to project data until the user signs in again.

- **TC-1.4a: Sign out from project surface**
  - Given: User is authenticated and viewing the project index or project shell
  - When: User activates sign out
  - Then: The platform ends the current session and returns the user to a signed-out state
- **TC-1.4b: Signed-out user revisits prior project URL**
  - Given: User previously signed out from the platform
  - When: User revisits a bookmarked project URL
  - Then: The platform requires sign-in again before showing any project data
- **TC-1.4c: Sign out clears active shell context**
  - Given: User is viewing a project shell with project data already loaded
  - When: User signs out
  - Then: The platform does not leave the prior project's data visible as an authenticated working surface

### 2. Creating and Opening a Project

The user needs a durable top-level container for related work. They create a
new project when starting a new body of work, or open an existing project to
continue. The project shell becomes the stable home for processes, artifacts,
and source attachments.

1. User chooses Create Project or selects an existing project
2. User provides required project identity information if creating a new project
3. System creates or loads the project
4. System opens the project shell
5. User sees the current project as the active working container

#### Acceptance Criteria

**AC-2.1:** The user can create a project with the minimum identity needed to
distinguish it from other work. The system assigns the creator as an owner and a
stable project identity. A user cannot create a second owned project with the
same display name.

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

**AC-2.2:** The user can open an existing accessible project from the project
index or a direct project URL. Opening a project loads that project's durable
shell state.

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

**AC-2.3:** The project shell clearly identifies the active project and keeps
the user oriented inside that project while they navigate, refresh, or return.

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

### 3. Understanding the Project Shell

The project shell is the first platform surface that holds the real working
state for a project. The user needs enough summary information to understand the
current processes, project artifacts, and source attachments before entering
deeper process work.

1. User opens a project shell
2. System loads project-level summaries
3. User reviews process, artifact, and source sections
4. User uses those summaries to choose where to continue work

#### Acceptance Criteria

**AC-3.1:** The project shell shows separate sections for processes, project
artifacts, and source attachments, including clear empty states when a section
has no items.

- **TC-3.1a: Populated project shell**
  - Given: Project contains processes, artifacts, and source attachments
  - When: The project shell loads
  - Then: All three sections are visible with their current items
- **TC-3.1b: Empty project shell**
  - Given: Project has no processes, no artifacts, and no source attachments
  - When: The project shell loads
  - Then: Each section shows an empty state instead of appearing missing or broken
- **TC-3.1c: Partial population**
  - Given: Project has processes but no artifacts or source attachments
  - When: The project shell loads
  - Then: The processes section shows items and the other sections show empty states

**AC-3.2:** Each process summary shows enough current-state information for the
user to understand what that process is, where it is in its progression, what
it needs next, and which high-level shell actions are currently available.

- **TC-3.2a: Process summary fields**
  - Given: A project contains a process
  - When: The process appears in the project shell
  - Then: The summary shows the process display label, process type, current phase label, current status, last updated time, next-step or blocker summary, and available actions when applicable

**Status rendering matrix** *(Traces to: AC-3.2)*

| TC | Process status | Expected summary behavior |
|----|----------------|---------------------------|
| TC-3.2b | `draft` | Summary identifies the process as draft/not yet started and does not imply active execution |
| TC-3.2c | `running` | Summary identifies the process as actively running |
| TC-3.2d | `waiting` | Summary identifies the process as waiting and surfaces the blocking user action or dependency |
| TC-3.2e | `paused` | Summary identifies the process as paused and not currently progressing |
| TC-3.2f | `completed` | Summary identifies the process as completed and does not present it as still active |
| TC-3.2g | `failed` | Summary identifies the process as failed |
| TC-3.2h | `interrupted` | Summary identifies the process as interrupted and not currently progressing |

**AC-3.3:** Each artifact summary shows the artifact's identity, current
version context, and when needed whether the artifact is project-scoped or tied
to a specific process, without requiring the user to open a separate review
surface.

- **TC-3.3a: Current artifact revision shown**
  - Given: A project artifact has one or more versions
  - When: The artifact appears in the project shell
  - Then: The summary shows the artifact identity and current version or revision label
- **TC-3.3b: Artifact with no published version**
  - Given: An artifact record exists but has no published current version
  - When: The artifact appears in the shell
  - Then: The summary indicates that no current version is available
- **TC-3.3c: Multiple artifacts in project**
  - Given: The project contains several artifacts
  - When: The shell loads
  - Then: Each artifact appears as a separate summary entry and remains associated with the same project
- **TC-3.3d: Artifact list sort order**
  - Given: The project contains multiple artifacts with different update times
  - When: The artifact list renders
  - Then: Artifacts are ordered by most recently updated first
- **TC-3.3e: Process-associated artifact context shown**
  - Given: An artifact is associated with a specific process rather than only the project
  - When: The artifact appears in the shell
  - Then: The summary shows enough association context to tell which process it is tied to

**AC-3.4:** Each source attachment summary shows repository identity and
high-level source state, including purpose, target ref when available,
hydration or freshness status, and when needed whether the source is attached
at project level or for a specific process.

- **TC-3.4a: Repository summary fields**
  - Given: A repository is attached to the project or to a process within the project
  - When: The source attachment appears in the shell
  - Then: The summary shows the repository identity, purpose, target ref if present, and a visible hydration or freshness state indicator
- **TC-3.4b: Repository not yet hydrated**
  - Given: A repository attachment exists but has not been hydrated
  - When: The source summary appears
  - Then: The shell shows it as not hydrated rather than implying local working files already exist
- **TC-3.4c: Stale repository summary**
  - Given: A repository attachment is known to be stale or needs rehydration
  - When: The shell appears
  - Then: The stale or needs-rehydration state is visible in the source summary
- **TC-3.4d: Source attachment list sort order**
  - Given: The project contains multiple source attachments with different update times
  - When: The source attachment list renders
  - Then: Source attachments are ordered by most recently updated first
- **TC-3.4e: Process-associated source context shown**
  - Given: A source attachment is tied to a specific process rather than only the project
  - When: The source summary appears in the shell
  - Then: The summary shows enough association context to tell which process it supports

### 4. Creating and Tracking Processes Inside a Project

The user starts new work inside a project by creating a process from a supported
`ProcessType`. Each process must get its own durable identity and state inside
the project without overwriting other processes or hiding the type of work that
was started.

1. User opens a project shell
2. User chooses to create a process
3. System shows the supported process types
4. User selects one process type and confirms
5. System creates the process and adds it to the current project
6. User sees the new process in the project's process list

#### Acceptance Criteria

**AC-4.1:** The user can create a new process from the supported initial
`ProcessType` set and the platform does not offer unsupported process types.

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

**AC-4.2:** Each new process receives its own durable identity, auto-generated
display label, initial status, and initial phase context within the current
project.

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

**AC-4.3:** Multiple processes can coexist in one project without overwriting
each other's state, artifacts, or source relationships.

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

**AC-4.4:** The process list stays legible as more work accumulates. The user
can tell which process changed most recently and which project process they are
inspecting.

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

### 5. Returning to Work Later

The user leaves the platform and returns later. The shell must restore enough
state for the user to continue meaningful work without reconstructing which
project they were in, which processes existed, or which process needs attention.

1. User leaves the platform or closes the browser
2. Durable project and process state remains stored
3. User returns later and signs in again if needed
4. System restores the project surface
5. User sees the last meaningful project and process state

#### Acceptance Criteria

**AC-5.1:** Project and process shell state persists across browser reloads,
fresh browser sessions, and server restarts.

- **TC-5.1a: Browser reload in project shell**
  - Given: User is viewing a project shell
  - When: User reloads the page
  - Then: The same project's shell reappears with its current process, artifact, and source summaries
- **TC-5.1b: Return later in a new session**
  - Given: User previously opened a project and later signs back in
  - When: The platform restores the session
  - Then: The user can reopen that project with its durable state intact
- **TC-5.1c: Server restart**
  - Given: Project and process state exists durably
  - When: The application server restarts
  - Then: The user can still load the same projects and process summaries afterward

**AC-5.2:** The platform restores project shell state from durable records even
when no active environment is currently running.

- **TC-5.2a: No active environment**
  - Given: A process exists but has no active environment
  - When: User opens the project shell
  - Then: The process still appears with its durable summary and does not disappear because the environment is absent
- **TC-5.2b: Environment previously discarded**
  - Given: A process previously had an environment that no longer exists
  - When: User opens the project shell
  - Then: The durable process, artifact, and source summaries still load
- **TC-5.2c: Artifact and source summaries restored**
  - Given: Project contains artifact and source attachments
  - When: User returns later
  - Then: Those summaries appear from durable state without requiring the user to reconstruct them manually

**AC-5.3:** When the user returns later, the project shell preserves enough
status and next-step context for disrupted or blocked processes to be
actionable without reconstructing prior work from memory.

- **TC-5.3a: Interrupted process summary**
  - Given: A process is interrupted
  - When: The user returns later and the project shell loads
  - Then: The process summary identifies it as interrupted and shows resume, review, rehydrate, or restart as the available next paths when applicable
- **TC-5.3b: Waiting process summary**
  - Given: A process is waiting on user input or approval
  - When: The user returns later and the shell loads
  - Then: The process summary identifies that it is blocked on user action
- **TC-5.3c: Failed process summary**
  - Given: A process has failed
  - When: The user returns later and the shell loads
  - Then: The summary identifies failure and does not present the process as if it completed successfully

### 6. Canceling Actions and Handling Unavailable State

The user may back out of creation flows or navigate to projects and processes
that no longer exist or are no longer available to them. The platform needs to
handle those cases without creating partial records or leaking stale data.

1. User starts a creation or open action
2. User cancels, or the target project/process is unavailable
3. System preserves durable state, blocks invalid access, and returns the user to a clear safe state

#### Acceptance Criteria

**AC-6.1:** Canceling project creation or process creation creates no partial
record and returns the user to a stable prior surface.

- **TC-6.1a: Cancel project creation**
  - Given: User opened the create-project flow
  - When: User cancels before submitting
  - Then: No project record is created and the user returns to the project index
- **TC-6.1b: Cancel process creation**
  - Given: User opened the create-process flow inside a project
  - When: User cancels before submitting
  - Then: No new process is created and the user remains in the same project shell

**AC-6.2:** If a project or process is unavailable, removed, or no longer
accessible, the platform shows a clear unavailable state and does not leak data
from that record.

- **TC-6.2a: Project removed after bookmark**
  - Given: User bookmarked a project URL and the project is later removed or access is revoked
  - When: User returns to that URL
  - Then: The platform shows a project-unavailable state and does not show the removed project's contents
- **TC-6.2b: Process missing inside project**
  - Given: User navigates to a project with a selected process reference that no longer exists
  - When: The project shell loads
  - Then: The shell loads the project safely, clears the invalid process selection, and shows that the requested process is unavailable

**AC-6.3:** Partial data-load failure in one project shell section does not
prevent the rest of the project shell from loading.

- **TC-6.3a: Artifact summaries fail but process summaries succeed**
  - Given: The project shell can load processes but the artifact summary request fails
  - When: The shell opens
  - Then: The process and source sections still render, and the artifact section shows an error state
- **TC-6.3b: Source summaries fail but project still opens**
  - Given: The project shell can load processes and artifacts but source attachment data fails to load
  - When: The shell opens
  - Then: The shell still opens the project and only the source section shows an error state
- **TC-6.3c: Process summaries fail but project still opens**
  - Given: The project shell can load project identity, artifacts, and source attachments but process summary data fails to load
  - When: The shell opens
  - Then: The shell still opens the project and only the process section shows an error state

---

## Data Contracts

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get authenticated user | GET | `/auth/me` | Returns the current authenticated user or 401 if not authenticated |
| Sign out authenticated user | POST | `/auth/logout` | Ends the current authenticated session and returns the browser to a signed-out state |
| List accessible projects | GET | `/api/projects` | Returns the projects the current user can access |
| Create project | POST | `/api/projects` | Creates a project owned by the current user |
| Get project shell data | GET | `/api/projects/{projectId}` | Returns project identity plus project shell summaries |
| Create process in project | POST | `/api/projects/{projectId}/processes` | Creates a new process inside the current project |

In Epic 1, the project shell read path returns all process summaries needed to
render and validate project-level process selection. The selected process is
derived from the current browser route and matched against the returned
`processes.items` collection. The shell read path may also return section-level
error states for `processes`, `artifacts`, or `sourceAttachments` without
failing the entire project-shell response when project identity and access still
succeed. A missing selected `processId` is handled inside the successful shell
response and does not produce a request-level process-not-found API error in
Epic 1. This epic does not add a separate single-process read endpoint or a
server-persisted selected-process write path.

### Authenticated User Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| user.id | string | yes | non-empty | Stable authenticated user identifier |
| user.email | string | no | valid email when present | User email address |
| user.displayName | string | no | non-empty when present | User display name for shell presentation |

### Sign Out Response

`POST /auth/logout` returns `200` with a logout redirect payload after the
authenticated session has been invalidated successfully.

### Project Shell Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Path parameter for the project to open |
| `processId` | string | No | Query parameter for the currently selected process within the already-loaded shell summaries |

### Project Summary Response

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

**Sort order:** Project list is sorted by `lastUpdatedAt` descending.

### Create Project Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | yes | trimmed, non-empty | Project display name |

Project names must be unique within the current owner's owned projects. The
project index may still contain same-name projects from different owners, so the
shell summary includes owner or secondary context to distinguish them.

### Project Shell Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| project | Project Summary | yes | present | Active project identity and access role |
| processes | Process Section Envelope | yes | present | Current process summaries or section-level process load state |
| artifacts | Artifact Section Envelope | yes | present | Current project artifact summaries or section-level artifact load state |
| sourceAttachments | Source Attachment Section Envelope | yes | present | Current source attachment summaries or section-level source load state |

**Success response:** `POST /api/projects` returns `201` with a `Project Shell
Response` body for the newly created project. On initial create, each section
envelope returns an empty `items` array with `status: empty`.

### Project Shell Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the section loaded with items, loaded empty, or failed independently |
| items | array | yes | present | Section items; empty when `status` is `empty` or `error` |
| error | Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole project shell |

### Section Error

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | yes | non-empty | Stable machine-readable section error code |
| message | string | yes | non-empty | Human-readable section error summary |

### Process Summary

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

### Create Process Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, `FeatureImplementation` | Process type to create |

Allowed values come from the platform-registered `ProcessType` set. In Epic 1,
the supported registered set is fixed to `ProductDefinition`,
`FeatureSpecification`, and `FeatureImplementation`.

### Create Process Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| process | Process Summary | yes | present | Created process summary for immediate insertion into the current project shell |

**Success response:** `POST /api/projects/{projectId}/processes` returns `201`
with a `Create Process Response` body.

### Artifact Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact display name |
| currentVersionLabel | string | no | non-empty when present | Current revision or version label |
| attachmentScope | enum | yes | `project` or `process` | Whether the artifact is attached at project level or tied to a specific process |
| processId | string | no | non-empty when present | Process identifier when the artifact is tied to a specific process |
| processDisplayLabel | string | no | non-empty when present | Process display label when the artifact is tied to a specific process |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

**Sort order:** Artifact list is sorted by `updatedAt` descending.

### Source Attachment Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachmentId | string | yes | non-empty | Stable source attachment identifier |
| displayName | string | yes | non-empty | Repository or source display name |
| purpose | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| targetRef | string | no | non-empty when present | Branch, tag, or commit ref if known |
| hydrationState | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | High-level source availability state |
| attachmentScope | enum | yes | `project` or `process` | Whether the source is attached at project level or tied to a specific process |
| processId | string | no | non-empty when present | Process identifier when the source is tied to a specific process |
| processDisplayLabel | string | no | non-empty when present | Process display label when the source is tied to a specific process |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable source update time |

**Sort order:** Source attachment list is sorted by `updatedAt` descending.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 409 | `PROJECT_NAME_CONFLICT` | User already owns a project with the requested name |
| 422 | `INVALID_PROJECT_NAME` | Project create request is missing a valid name |
| 422 | `INVALID_PROCESS_TYPE` | Process create request does not specify a supported process type |

---

## Dependencies

Technical dependencies:

- Authenticated browser session and server-side session validation
- Fastify-owned control-plane routes for project and process shell operations
- Durable persistence for projects, project membership, processes, artifacts, and source-attachment summaries
- Shared project-shell client layout and route state

Process dependencies:

- Product confirmation of the initial supported `ProcessType` set
- Product confirmation of owner/member role semantics for this first shell
- Downstream process-specific epics to define exact behavior once a created process is opened for active work

---

## Non-Functional Requirements

### Performance

- Project index renders within 2 seconds for a user with up to 100 accessible projects
- Project shell renders within 2 seconds for a project with up to 100 processes, 200 artifacts, and 50 source attachments
- Project creation and process creation appear in the UI immediately after a successful response without requiring manual refresh

### Security

- All project-shell routes and APIs require authenticated access
- Signing out clears the authenticated session and blocks access to project data until the user signs in again
- Project membership and role are enforced server-side, not inferred from client state
- Inaccessible projects and processes do not leak names, counts, summaries, or child data through direct URLs

### Reliability

- Durable project and process shell state survives browser reloads and server restarts
- A missing or discarded environment does not erase project or process shell visibility
- Partial load failure in one shell section does not prevent the rest of the project shell from rendering

### Accessibility

- Project create/open actions, process create actions, and project-shell navigation are keyboard reachable
- Status, role, and unavailable-state indicators are available as readable text, not color alone

### Observability

- Authentication failures, project-access denials, project-create failures, project-load failures, and process-create failures are logged with request context
- Sign-out requests and sign-out failures are logged with request context
- Project open and process creation events are traceable by project ID and process ID after creation

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. How should the server compose the aggregated project-shell bootstrap so process, artifact, and source section readers stay independently testable while the browser still receives one shell response?
2. What is the exact durable schema split between generic process records and process-specific initial state tables?
3. How should owner and member relationships be synchronized with the chosen auth and identity model across local, staging, and prod WorkOS environments?
4. What is the exact browser routing model for project index, project shell, and selected process state restoration, given that selected process state is route-derived in Epic 1 rather than server-persisted?
5. What exact envelope and section-error shape should the aggregated project-shell bootstrap endpoint use so partial section failures can render cleanly without failing the whole shell?
6. How should `nextActionLabel`, `availableActions`, and interruption reason be derived consistently without leaking process-specific internal implementation details into the generic shell?
7. How should WorkOS CLI-generated AuthKit configuration and Node/Express-oriented bootstrap patterns be adapted into the Fastify application and its local, staging, and prod environment setup?
8. Does the first cut need pagination or virtualized rendering for large project and process lists, or are fixed-size in-memory lists sufficient for the initial milestone targets?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Create the authenticated shell foundation for project work: shared route/state
types, project and process summary contracts, auth-protected shell bootstrap,
fixtures for owner/member access, unavailable-state handling, and test helpers
used by all later stories.

### Story 1: Authenticated Project Entry

**Delivers:** The user can sign in, reach the platform, and see only the
projects they can access.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (authenticated project access)
- AC-1.2 (accessible project list and empty state)
- AC-1.3 (role visibility and blocked direct access)
- AC-1.4 (sign out and signed-out state)

### Story 2: Project Creation and Open

**Delivers:** The user can create a project and open a durable project shell.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (create project)
- AC-2.2 (open project)
- AC-2.3 (active project orientation)
- AC-6.1 (cancel create flows)

### Story 3: Project Shell Summaries

**Delivers:** The user can understand the current project from process,
artifact, and source summaries.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (project shell sections and empty states)
- AC-3.2 (process summary visibility)
- AC-3.3 (artifact summary visibility)
- AC-3.4 (source summary visibility)
- AC-6.3 (partial section failure handling)

### Story 4: Process Registration in a Project

**Delivers:** The user can create and track multiple processes inside a project.
**Prerequisite:** Story 3
**ACs covered:**

- AC-4.1 (supported process creation)
- AC-4.2 (initial durable process state)
- AC-4.3 (independent process coexistence)
- AC-4.4 (process list legibility and ordering)

### Story 5: Return and Recovery Visibility

**Delivers:** The user can return later and understand the durable state of the
project and any interrupted work.
**Prerequisite:** Story 4
**ACs covered:**

- AC-5.1 (state persistence across reloads and restarts)
- AC-5.2 (durable shell state without environment dependence)
- AC-5.3 (interrupted, waiting, failed, completed visibility)
- AC-6.2 (unavailable project or process states)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover happy, alternate, cancel, and unavailable paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at browser-to-server boundaries
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
