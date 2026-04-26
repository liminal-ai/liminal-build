# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Establish the aligned artifact, version-provenance, package-context, package-snapshot, and review-error vocabulary used by all later Epic 5 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Create the shared contract, durable-state, error-code, provenance, and package-context vocabulary required by Stories 1 through 5.

**Scope**

In:

- Project-scoped artifact summary vocabulary
- Process-local artifact-reference vocabulary
- Version-provenance vocabulary for browser-facing review contracts
- Mutable current package-context vocabulary
- Immutable package snapshot and package-member vocabulary
- Exact review and package error-code vocabulary
- Shared fixtures and helpers for cross-process artifact, version, package, and degraded-state scenarios

Out:

- Project-shell behavior owned by Story 1
- Checkpoint/version write-path behavior owned by Story 2
- Artifact review behavior owned by Story 3
- Cross-process package publication and review behavior owned by Story 4
- Reopen and degraded-state behavior owned by Story 5

**Dependencies**

- Existing Epic 4 review and package surfaces
- Existing per-type process state current refs
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared artifact, provenance, package-context, and error vocabulary consumed by Stories 1 through 5.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Routes Reused By Later Stories

| Operation | Method | Path | Description |
|---|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` | Returns project-level artifact state with project-scoped artifact identity and latest version summary |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns process-local current artifact materials and current outputs without implying artifact ownership |
| Get review workspace | `GET` | `/api/projects/{projectId}/processes/{processId}/review` | Returns process-scoped review targets based on process reference and package context |
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns one artifact's version list and selected review state for that process context |
| Get package review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns one package with pinned member versions even when members were produced by multiple processes |

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

#### Package Member

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `memberId` | string | yes | non-empty | Stable package member identifier |
| `artifactId` | string | yes | non-empty | Artifact represented by this member |
| `artifactVersionId` | string | yes | non-empty | Pinned artifact version for this member |
| `displayName` | string | yes | non-empty | Member display name |
| `versionLabel` | string | yes | non-empty | Pinned version label |

#### Mutable Current Package Context

| Element | Description |
|---|---|
| `processPackageContexts` | One current mutable package-building context per process |
| `processPackageContextMembers` | Ordered explicit version pins inside that current context |
| Upsert rule | Last-write-wins replacement on one canonical context row per process; duplicate rows cleaned in the same mutation |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact or package review target is not available in the current process review context |
| `404` | `ARTIFACT_VERSION_NOT_FOUND` | Requested artifact version is unavailable |
| `404` | `PACKAGE_MEMBER_UNAVAILABLE` | Requested package member's pinned artifact version is unavailable |
| `409` | `PACKAGE_MEMBER_NOT_ALLOWED` | Requested package publication contains a member version outside the publishing process's current package-building context or outside the current project |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared artifact, version, package-context, package-snapshot, and error vocabulary is defined once and referenced by later stories
- Browser-facing review contracts include both stable provenance ids and user-facing provenance labels
- The one-current-package-context-per-process rule is explicit, including duplicate cleanup and idempotent upsert semantics
- Route-level review error codes distinguish missing target, missing explicit version, unavailable package member, and disallowed package member publication
- Story files and the coverage artifact can reference Story 0 without redefining the shared vocabulary
