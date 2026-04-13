# Story 5: Return and Recovery Visibility

### Summary
<!-- Jira: Summary field -->

The user can return later, recover orientation from durable shell state, and handle unavailable project or process references safely.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user is starting or resuming work inside a concrete project. They need one durable container that holds processes, artifacts, and source attachments before deeper process-specific behavior begins.
- **Mental Model:** "I have a project. Inside that project I run one or more processes. The platform should show me my projects, let me open the right one, and keep each process separate."
- **Key Constraint:** The platform must preserve durable project and process state without flattening work into a generic chat thread or treating a sandbox filesystem as the source of truth.

**Objective**

Restore durable project shell state after reloads, new sessions, and server restarts; keep shell visibility independent of environment survival; show enough blocked/interrupted/failure context for the user to act; and handle removed or unavailable project/process references without leaking data.

**Scope**

**In Scope**

- Durable shell restoration across reloads, new sessions, and server restarts
- Project shell visibility when no environment exists or a prior environment was discarded
- Recovery-oriented process summary visibility for interrupted, waiting, and failed states
- Safe unavailable-state handling for missing or inaccessible projects and missing selected processes

**Out of Scope**

- Authenticated entry into project work and sign-out
- Project creation/open flows
- Detailed shell summary rendering and partial section-failure behavior
- Process creation flows
- Environment rehydration mechanics themselves

**Dependencies**

- Story 4
- Shared unavailable-state scaffolding and process-summary contract models from Story 0

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-5.1:** Project and process shell state persists across browser reloads, fresh browser sessions, and server restarts.

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

**AC-5.2:** The platform restores project shell state from durable records even when no active environment is currently running.

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

**AC-5.3:** When the user returns later, the project shell preserves enough status and next-step context for disrupted or blocked processes to be actionable without reconstructing prior work from memory.

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

**AC-6.2:** If a project or process is unavailable, removed, or no longer accessible, the platform shows a clear unavailable state and does not leak data from that record.

- **TC-6.2a: Project removed after bookmark**
  - Given: User bookmarked a project URL and the project is later removed or access is revoked
  - When: User returns to that URL
  - Then: The platform shows a project-unavailable state and does not show the removed project's contents
- **TC-6.2b: Process missing inside project**
  - Given: User navigates to a project with a selected process reference that no longer exists
  - When: The project shell loads
  - Then: The shell loads the project safely, clears the invalid process selection, and shows that the requested process is unavailable

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

#### Endpoint

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get project shell data | GET | `/api/projects/{projectId}` | Returns project identity plus project shell summaries |

In Epic 1, the project shell read path returns all process summaries needed to render and validate project-level process selection. The selected process is derived from the current browser route and matched against the returned `processes.items` collection. This story depends on durable shell reads rather than any server-persisted selected-process write path.

At Story 5 boundary, the shell bootstrap contract is reused to verify durable return and recovery semantics. This story does not introduce a new read endpoint; it proves that the existing shell bootstrap remains correct across reload, new session, restart, and unavailable-state flows.

#### Project Shell Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Path parameter for the project to open |
| `processId` | string | No | Query parameter for the currently selected process within the already-loaded shell summaries |

#### Project Shell Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| project | Project Summary | yes | present | Active project identity and access role |
| processes | Process Section Envelope | yes | present | Current process summaries or section-level process load state |
| artifacts | Artifact Section Envelope | yes | present | Current project artifact summaries or section-level artifact load state |
| sourceAttachments | Source Attachment Section Envelope | yes | present | Current source attachment summaries or section-level source load state |

#### Project Shell Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the section loaded with items, loaded empty, or failed independently |
| items | array | yes | present | Section items; empty when `status` is `empty` or `error` |
| error | Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole project shell |

#### Section Error

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | yes | non-empty | Stable machine-readable section error code |
| message | string | yes | non-empty | Human-readable section error summary |

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

#### Artifact Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact display name |
| currentVersionLabel | string | no | non-empty when present | Current revision or version label |
| attachmentScope | enum | yes | `project` or `process` | Whether the artifact is attached at project level or tied to a specific process |
| processId | string | no | non-empty when present | Process identifier when the artifact is tied to a specific process |
| processDisplayLabel | string | no | non-empty when present | Process display label when the artifact is tied to a specific process |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

#### Source Attachment Summary

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

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |

In Epic 1, a missing selected `processId` is represented as a recoverable shell
state. After bootstrap compares the requested id against `processes.items`, the
browser clears the stale selection immediately with `history.replaceState()` and
shows a process-unavailable banner instead of receiving a request-level
`PROCESS_NOT_FOUND` error.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Durable shell restoration covers reload, new-session return, and server-restart survival per TC-5.1a through TC-5.1c
- [ ] `TC-5.1c` is verified in the integration suite against a prepared durable-state environment and a real Fastify restart, not only through service mocks
- [ ] Shell visibility remains durable without environment dependence per TC-5.2a through TC-5.2c
- [ ] Recovery-oriented process summaries expose blocked/interrupted/failure context and relevant next actions per TC-5.3a through TC-5.3c
- [ ] Missing or inaccessible project/process references render safe unavailable states per TC-6.2a and TC-6.2b
- [ ] Story tests cover reload, restored session, discarded environment, interrupted/waiting/failed summaries, removed project, and missing selected-process cases
