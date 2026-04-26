# Story 3: Project Shell Summaries

### Summary
<!-- Jira: Summary field -->

The user can understand the current project from process, artifact, and source summaries, including partial section failures and summary association context.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user is starting or resuming work inside a concrete project. They need one durable container that holds processes, artifacts, and source attachments before deeper process-specific behavior begins.
- **Mental Model:** "I have a project. Inside that project I run one or more processes. The platform should show me my projects, let me open the right one, and keep each process separate."
- **Key Constraint:** The platform must preserve durable project and process state without flattening work into a generic chat thread or treating a sandbox filesystem as the source of truth.

**Objective**

Render the project shell as a usable summary workspace with process, artifact,
and source sections; show section state cleanly when a section is empty or
fails independently; and include the summary context needed to keep
project-level artifacts and process-scoped sources legible.

**Scope**

**In Scope**

- Project shell sections for processes, artifacts, and source attachments
- Empty, ready, and error states per section
- Process summary identity, status, phase, next-step, and available-actions visibility
- Artifact summary identity, revision, sorting, and optional explicit
  process-context visibility
- Source summary identity, purpose, target ref, hydration/freshness state, sorting, and process-association context
- Partial section-failure handling that preserves the rest of the shell

**Out of Scope**

- Authenticated entry into project work
- Project creation and open flows
- Creating new processes
- Detailed process work surface behavior beyond summary-level visibility
- Return/recovery flows after the user leaves and comes back later

**Dependencies**

- Story 2
- Shared shell response and summary contract models from Story 0

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

**AC-3.1:** The project shell shows separate sections for processes, project artifacts, and source attachments, including clear empty states when a section has no items.

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

**AC-3.2:** Each process summary shows enough current-state information for the user to understand what that process is, where it is in its progression, what it needs next, and which high-level shell actions are currently available.

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
version context, and when needed explicit process context that explains why the
artifact is visible in the shell, without requiring the user to open a separate
review surface. That context may include a current process reference, a
producing-process note, or both. The artifact itself remains a project-level
durable asset.

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
- **TC-3.3e: Process artifact context shown**
  - Given: The shell is surfacing an artifact with current process reference
    context, producing-process context, or both
  - When: The artifact appears in the shell
  - Then: The summary shows which kind of process relationship is being
    surfaced without implying that the artifact belongs only to that process

**AC-3.4:** Each source attachment summary shows repository identity and high-level source state, including purpose, target ref when available, hydration or freshness status, and when needed whether the source is attached at project level or for a specific process.

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

**AC-6.3:** Partial data-load failure in one project shell section does not prevent the rest of the project shell from loading.

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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

#### Endpoint

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get project shell data | GET | `/api/projects/{projectId}` | Returns project identity plus project shell summaries |

In Epic 1, the project shell read path returns all process summaries needed to render and validate project-level process selection. The selected process is derived from the current browser route and matched against the returned `processes.items` collection. The shell read path may also return section-level error states for `processes`, `artifacts`, or `sourceAttachments` without failing the entire project-shell response when project identity and access still succeed. This story does not add a separate single-process read endpoint or a server-persisted selected-process write path.

At Story 3 boundary, this is the first story that returns populated shell-section envelopes and section-level error states. Earlier stories may open the shell successfully without yet owning full summary population semantics.

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

**Sort order:** Process list is sorted by `updatedAt` descending.

#### Artifact Summary

Supersession note: earlier Epic 1 drafts modeled artifact shell context with
source-style `attachmentScope`, `processId`, and `processDisplayLabel` fields.
That draft contract is superseded here. Artifact summaries use explicit
`processContext` semantics instead because artifacts remain project-level
assets, not attachments, and the shell may need to surface current process
reference and producing-process context separately.

In Story 3, artifact summaries are still summaries of project-level durable
artifacts. `processContext` is summary-only shell context. It explains why the
artifact is visible in the shell, but it does not make the artifact owned by
one process row or imply a full lineage/review surface.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact display name |
| currentVersionLabel | string | no | non-empty when present | Current revision or version label |
| processContext | Artifact Process Context | no | present when the shell needs to explain artifact/process context | Explicit shell-only process context for the artifact summary |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

When `processContext` is present, at least one of its subfields is present.

#### Artifact Process Context

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| currentProcessReference | Artifact Process Reference | no | present when the shell is surfacing current process material/reference context | Process that currently references the artifact in the shell's durable summary context |
| producingProcess | Artifact Process Reference | no | present when the shell is surfacing historical producing-process context | Process historically associated with producing the artifact when that summary context is known |

#### Artifact Process Reference

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processId | string | yes | non-empty | Stable process identifier for the referenced process |
| processDisplayLabel | string | yes | non-empty | Human-readable process label for the referenced process |

**Sort order:** Artifact list is sorted by `updatedAt` descending.

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

**Sort order:** Source attachment list is sorted by `updatedAt` descending.

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |

In Epic 1, a missing selected `processId` is handled inside the successful
aggregated shell response and section-aware route restoration. It does not
produce a request-level `PROCESS_NOT_FOUND` API error. That error remains
reserved for future dedicated process resources rather than the aggregated shell
bootstrap route.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Project shell renders separate process, artifact, and source sections with ready and empty states per TC-3.1a through TC-3.1c
- [ ] Process summaries render identity, status, phase, next-step, and available-actions context per TC-3.2a through TC-3.2h
- [ ] Artifact summaries render revision context, sorting, and process association when applicable per TC-3.3a through TC-3.3e
- [ ] Source summaries render purpose, target ref, hydration/freshness state, sorting, and process association when applicable per TC-3.4a through TC-3.4e
- [ ] Partial section failures render section-scoped error states without collapsing the shell per TC-6.3a through TC-6.3c
- [ ] Story tests cover empty, populated, partially populated, and section-error shell states
