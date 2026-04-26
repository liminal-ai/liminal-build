# Story 3: Process-Scoped Artifact Review Realignment

### Summary
<!-- Jira: Summary field -->
Resolve artifact review from current process context and pinned package context instead of artifact ownership, including zero-version and explicit-version behavior.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Make artifact review follow process review context rather than artifact-row ownership, including explicit earlier-version selection and zero-version edge cases.

**Scope**

In:

- Reviewable artifacts come from current refs and pinned package context
- Later-process revisions do not block legitimate review from the current process
- Earlier version selection remains stable
- Zero-version direct review returns bounded empty state
- Explicit missing version requests return exact request-level error codes

Out:

- Package publication and package review behavior
- Package-member degradation
- Broader reopen and observability behavior

**Dependencies**

- Story 0 foundation
- Story 2 versioned checkpoint realignment
- Existing review workspace route family
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** A process can review an artifact it currently references even if that artifact was created or later revised by another process.

- **TC-3.1a: Reviewable referenced artifact from earlier process**
  - Given: A process currently references an artifact created by an earlier process
  - When: The user enters artifact review from the current process
  - Then: That artifact is available for review
- **TC-3.1b: Reviewable referenced artifact after later revision by another process**
  - Given: A process currently references an artifact later revised by a different process
  - When: The user opens review from the current process
  - Then: The artifact remains reviewable from that process context

**AC-3.2:** Artifact review eligibility is based on process reference or pinned review context, not on a single artifact-level primary-process field.

- **TC-3.2a: Review not blocked by primary-process mismatch**
  - Given: A process has legitimate review context for an artifact
  - When: The artifact was last revised by a different process
  - Then: Review still succeeds
- **TC-3.2b: Unrelated artifacts remain unavailable**
  - Given: A process does not reference an artifact and has no pinned review context for it
  - When: The user requests review of that unrelated artifact
  - Then: The system returns a bounded unavailable result

**AC-3.3:** Artifact review preserves explicit version selection across cross-process artifact histories.

- **TC-3.3a: Selected earlier version remains reviewable**
  - Given: An artifact has versions from multiple processes
  - When: The user selects an earlier version in review
  - Then: The requested earlier version is displayed
- **TC-3.3b: Current-version review remains stable after newer versions exist**
  - Given: A process opens review for an artifact with later revisions
  - When: The user reviews the current version
  - Then: The latest current version is shown without hiding earlier pinned review paths

**AC-3.4:** Zero-version artifacts are excluded from the default review target list, but direct review access returns a bounded empty review state instead of an unavailable error.

- **TC-3.4a: Zero-version artifact omitted from default review target list**
  - Given: A process references an artifact with no versions yet
  - When: The user enters review from that process
  - Then: That artifact does not appear in the default review target list
- **TC-3.4b: Zero-version direct review path returns empty state**
  - Given: A user navigates directly to review for an artifact with no versions
  - When: The review target resolves
  - Then: The user sees a bounded empty review state rather than an unavailable error
- **TC-3.4c: Explicit version request against zero-version artifact is rejected**
  - Given: A user requests review for an artifact that has zero versions and supplies an explicit `versionId`
  - When: The review target resolves
  - Then: The system returns `ARTIFACT_VERSION_NOT_FOUND` rather than the bounded empty zero-version state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the aligned review-eligibility rules and exact artifact-review failure classification.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Get review workspace | `GET` | `/api/projects/{projectId}/processes/{processId}/review` | Returns process-scoped review targets based on process reference and package context |
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns one artifact's version list and selected review state for that process context |

#### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `versionId` | string | yes | non-empty | Stable artifact version identifier |
| `versionLabel` | string | yes | non-empty | User-visible version label |
| `createdAt` | timestamp | yes | ISO 8601 UTC | Version creation timestamp |
| `producedByProcessId` | string | yes | non-empty | Process that created this version |
| `producedByProcessDisplayLabel` | string | no | non-empty when present | User-facing producing-process label |

#### Zero-Version Artifact Review State

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Requested artifact identifier |
| `status` | enum | yes | `empty` | Indicates the artifact exists but has no versions yet |
| `displayName` | string | yes | non-empty | Artifact display name |
| `versions` | array | yes | empty | No versions are currently available for review |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact review target is not available in the current process review context |
| `404` | `ARTIFACT_VERSION_NOT_FOUND` | Requested explicit artifact version is unavailable |

Implementation notes:

- Artifact targets in `availableTargets` come from current refs plus explicit pins in the current package context
- Zero-version artifacts are omitted from target discovery but remain directly reachable through a valid process review context
- Target-specific artifact reads distinguish missing target from missing explicit version

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Artifact review eligibility is computed from process context and pinned package context rather than artifact ownership
- Later-process revisions do not block legitimate artifact review from the current process
- Explicit earlier-version selection remains stable across cross-process histories
- Zero-version artifacts behave as bounded empty direct-review states and not as unavailable target-list entries
- Exact request-level error codes distinguish missing explicit versions from missing targets
- Story tests cover TC-3.1a through TC-3.1b, TC-3.2a through TC-3.2b, TC-3.3a through TC-3.3b, and TC-3.4a through TC-3.4c
