# Story 2: Versioned Checkpoint Realignment

### Summary
<!-- Jira: Summary field -->
Persist later-process revisions as new artifact versions with explicit provenance while keeping one stable project artifact identity and correct latest-version summaries.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Rewrite the durable artifact checkpoint path so later processes create new versions of existing artifacts without reassigning the artifact itself.

**Scope**

In:

- Existing artifact revision persists as a new version for the same artifact
- Version-level provenance identifies the producing process
- Project-shell and process-materials latest-version projections update correctly
- Earlier versions remain available for later review work

Out:

- Review workspace eligibility
- Package publication and package context
- Degraded-state recovery behavior

**Dependencies**

- Story 0 foundation
- Story 1 project artifact association without process ownership
- Existing artifact checkpoint path from Epic 3
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** When a process revises an existing project artifact, the system creates a new version instead of transferring artifact ownership to the revising process.

- **TC-2.1a: New revision becomes new version**
  - Given: A process revises an existing artifact
  - When: Checkpointed artifact output is persisted
  - Then: A new artifact version is created for the same artifact
- **TC-2.1b: Artifact is not reassigned to one primary process**
  - Given: An artifact already has history from an earlier process
  - When: A later process persists a new version
  - Then: The artifact is not rewritten as if it now belongs only to the later process

**AC-2.2:** Version-level provenance identifies which process produced each artifact revision.

- **TC-2.2a: Producing process recorded on version**
  - Given: A new artifact version is created
  - When: Version provenance is read later
  - Then: The producing process for that version is visible
- **TC-2.2b: Earlier version provenance remains readable**
  - Given: An artifact has versions produced by multiple processes
  - When: Earlier versions are reviewed
  - Then: Each earlier version still shows the process that produced it

**AC-2.3:** Current artifact summaries resolve the latest version correctly after multi-process revision history.

- **TC-2.3a: Latest version shown after later process revision**
  - Given: A later process created a new artifact version
  - When: Current artifact summaries are loaded
  - Then: The summaries show the latest current version label and update time
- **TC-2.3b: Earlier versions remain reviewable**
  - Given: An artifact has more than one version
  - When: The user opens artifact review
  - Then: Earlier versions remain available for selection and review

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the write-path flip from artifact-row ownership semantics to version-row provenance semantics.

#### Endpoints Affected By Read Model

| Operation | Method | Path | Description |
|---|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` | Returns project-level artifact state with project-scoped artifact identity and latest version summary |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns process-local current artifact materials and current outputs without implying artifact ownership |
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns one artifact's version list and selected review state for that process context |

#### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `versionId` | string | yes | non-empty | Stable artifact version identifier |
| `versionLabel` | string | yes | non-empty | User-visible version label |
| `createdAt` | timestamp | yes | ISO 8601 UTC | Version creation timestamp |
| `producedByProcessId` | string | yes | non-empty | Process that created this version |
| `producedByProcessDisplayLabel` | string | no | non-empty when present | User-facing producing-process label |

#### Project Artifact Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Human-readable artifact name |
| `currentVersionLabel` | string | no | non-empty when present | Latest current version label |
| `updatedAt` | timestamp | yes | ISO 8601 UTC | Latest durable update time for this artifact |

Implementation notes:

- `artifacts` keeps project-scoped identity only
- each checkpointed revision inserts a new `artifactVersions` row
- latest-version summary fields are derived from the newest durable version, not from artifact ownership metadata

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Revising an existing project artifact creates a new version without reassigning the artifact
- Version rows preserve producing-process provenance across multi-process histories
- Project-shell and process-material summaries project the latest durable version correctly
- Earlier versions remain selectable for later review work
- Story tests cover TC-2.1a through TC-2.1b, TC-2.2a through TC-2.2b, and TC-2.3a through TC-2.3b
