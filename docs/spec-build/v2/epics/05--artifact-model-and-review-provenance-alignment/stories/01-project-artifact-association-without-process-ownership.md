# Story 1: Project Artifact Association Without Process Ownership

### Summary
<!-- Jira: Summary field -->
Make project artifacts project-scoped durable assets, keep process-local visibility in current materials, and remove single-process ownership language from project-shell artifact state.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Realign project-shell and process-surface artifact visibility so artifacts are durable project assets while current process visibility remains process-owned.

**Scope**

In:

- Project-shell artifact summary no longer implies primary process ownership
- Existing project artifacts can be added to a process's current refs without transferring ownership
- New process-created artifacts appear in the project artifact set immediately
- Process materials continue to show only the artifacts currently referenced by that process

Out:

- Versioned revision write-path changes
- Artifact review resolution
- Package publication or package review behavior

**Dependencies**

- Story 0 foundation
- Existing project shell and process work surface routes
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** A process can reference an existing artifact in the same project without becoming the artifact's sole owner.

- **TC-1.1a: Existing project artifact added to process**
  - Given: A project already has a durable artifact
  - When: A later process begins working with that artifact
  - Then: The process can reference the artifact without replacing prior artifact provenance
- **TC-1.1b: Later process reference does not erase earlier process lineage**
  - Given: An artifact was first created or revised by an earlier process
  - When: A later process references that artifact
  - Then: Earlier artifact provenance remains intact

**AC-1.2:** A new artifact created during process work is immediately part of the project's artifact set.

- **TC-1.2a: New process artifact appears in project artifact state**
  - Given: A process creates a new artifact
  - When: The creation settles durably
  - Then: The artifact appears in the project's artifact state without a separate add-to-project step
- **TC-1.2b: Project artifact state remains deduplicated**
  - Given: Several processes later reference the same artifact
  - When: The project artifact state is read
  - Then: That artifact appears as one durable project artifact, not one row per process reference

**AC-1.3:** Process-local artifact visibility reflects current process reference, not artifact ownership.

- **TC-1.3a: Current process materials show referenced artifact**
  - Given: A process currently references an artifact
  - When: The process work surface is loaded
  - Then: The artifact appears in that process's current materials
- **TC-1.3b: Unrelated process does not gain automatic current-material visibility**
  - Given: One process currently references an artifact
  - When: Another process in the same project loads its current materials
  - Then: The artifact is not shown as current for that unrelated process unless that process also references it

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the first visible expression of the aligned model: project-scoped artifact identity and process-local current visibility.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` | Returns project-level artifact state with project-scoped artifact identity and latest version summary |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns process-local current artifact materials and current outputs without implying artifact ownership |

#### Project Artifact Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Human-readable artifact name |
| `currentVersionLabel` | string | no | non-empty when present | Latest current version label |
| `updatedAt` | timestamp | yes | ISO 8601 UTC | Latest durable update time for this artifact |

#### Process Artifact Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Artifact name in process context |
| `currentVersionLabel` | string | no | non-empty when present | Latest current version label for the artifact |
| `roleLabel` | string | no | non-empty when present | Process-local description such as current working artifact or referenced artifact |
| `updatedAt` | timestamp | yes | ISO 8601 UTC | Latest durable artifact update time |

Implementation note:

- Project-shell artifact rows no longer include `attachmentScope`, `processId`, or `processDisplayLabel`
- Process-local visibility continues to come from bounded current refs in per-type process state

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Project-shell artifact summaries show project-scoped identity only and no longer imply artifact ownership by one process
- Existing artifacts can be added to a process's current refs without changing artifact identity or provenance
- Process materials show only the current process's referenced artifacts
- Project artifact state remains deduplicated when many processes reference one artifact
- Story tests cover TC-1.1a through TC-1.1b, TC-1.2a through TC-1.2b, and TC-1.3a through TC-1.3b
