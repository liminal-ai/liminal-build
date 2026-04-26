# Story 4: Cross-Process Package Alignment

### Summary
<!-- Jira: Summary field -->
Introduce the current package-building context and allow packages to publish, review, and export pinned versions produced across multiple processes in the same project.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Deliver the durable package-context and package-snapshot behavior that lets one process publish and later review a bounded package containing pinned versions produced by multiple processes in the same project.

**Scope**

In:

- One current mutable package-building context per process
- Current package context can retain earlier pinned versions
- Mixed-producer package publication within one project
- Package review resolves pinned versions, not floating current versions
- Package export remains valid for aligned mixed-producer packages

Out:

- Broader reopen and degraded-state classification across stale targets
- Artifact-only review behavior

**Dependencies**

- Story 0 foundation
- Story 3 process-scoped artifact review realignment
- Existing package review/export surface from Epic 4
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-4.1:** A package may contain pinned artifact versions produced by multiple processes in the same project.

- **TC-4.1a: Mixed-producer package allowed**
  - Given: A process is publishing a package in a project
  - When: The package includes versions produced by more than one process in that project
  - Then: The package can be published successfully
- **TC-4.1b: Cross-project package member blocked**
  - Given: A package member version belongs to a different project
  - When: The package is published
  - Then: The system rejects that package publication

**AC-4.2:** A process can publish a package from artifact versions in its current package-building context, defined as current process references plus versions already pinned in that same process's current package draft/edit context, even when those versions were produced by other processes.

- **TC-4.2a: Publishing process can package referenced upstream versions**
  - Given: A process currently references artifact versions produced by earlier processes in the same project
  - When: The process publishes a package
  - Then: Those referenced upstream versions may be included in the package
- **TC-4.2b: Unrelated project artifact version not in current package-building context is blocked**
  - Given: A project contains an artifact version that is neither currently referenced by the publishing process nor already pinned in that process's current package draft/edit context
  - When: The process publishes a package
  - Then: The system rejects use of that unrelated artifact version
- **TC-4.2c: Earlier pinned version remains eligible**
  - Given: A process is reopening or editing a package that already pins an earlier artifact version from the same project
  - When: The process republishes or re-exports that package context
  - Then: That already-pinned earlier version remains eligible even if a newer version now exists

**AC-4.3:** Package review resolves pinned member versions rather than drifting to whichever artifact version is current later.

- **TC-4.3a: Package member opens pinned version**
  - Given: A package member pins a specific artifact version
  - When: The user opens that member in package review later
  - Then: The pinned version is shown
- **TC-4.3b: Newer later artifact version does not replace pinned package member**
  - Given: A newer artifact version exists after the package was published
  - When: The user reviews the package
  - Then: The package still resolves the originally pinned member version

**AC-4.4:** Package review and package export remain available when a package mixes artifact versions from multiple processes.

- **TC-4.4a: Mixed-producer package review succeeds**
  - Given: A package contains pinned versions from multiple processes
  - When: The user opens package review
  - Then: The package review surface resolves successfully
- **TC-4.4b: Mixed-producer package export succeeds**
  - Given: A package contains pinned versions from multiple processes
  - When: The user exports the package
  - Then: The package export succeeds with the pinned package contents

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns both the mutable current package-building context and the immutable durable package snapshot produced from it.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Get review workspace | `GET` | `/api/projects/{projectId}/processes/{processId}/review` | Returns process-scoped review targets based on process reference and package context |
| Get package review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns one package with pinned member versions even when members were produced by multiple processes |
| Export reviewed package | `POST` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}/export` | Exports one aligned mixed-producer package with its pinned contents |

#### Package Member

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `memberId` | string | yes | non-empty | Stable package member identifier |
| `artifactId` | string | yes | non-empty | Artifact represented by this member |
| `artifactVersionId` | string | yes | non-empty | Pinned artifact version for this member |
| `displayName` | string | yes | non-empty | Member display name |
| `versionLabel` | string | yes | non-empty | Pinned version label |

#### Package Publication Eligibility Rule

In Epic 5, a requested package member is allowed only when:

- the member's artifact belongs to the same project
- the member version is either the current version of an artifact the publishing process currently references, or an explicit version already pinned in that same process's current package draft/edit context

Supplying an explicit artifact version outside that bounded context is rejected as `PACKAGE_MEMBER_NOT_ALLOWED`.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested package review target is not available in the current process review context |
| `409` | `PACKAGE_MEMBER_NOT_ALLOWED` | Requested package publication contains a member version outside the publishing process's current package-building context or outside the current project |

Implementation notes:

- One current mutable package-building context exists per process
- Reopening a published package automatically seeds the current package context from the published snapshot
- Duplicate package-context rows are cleaned during upsert so one canonical current context survives
- Package snapshots remain immutable after publication

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- The current package-building context is durable, process-scoped, and version-aware
- Mixed-producer package publication is allowed inside one project when the requested versions are in context
- Reopened package contexts preserve earlier pinned versions even when newer versions exist
- Package review resolves pinned member versions instead of floating to later current versions
- Mixed-producer packages remain reviewable and exportable
- Story tests cover TC-4.1a through TC-4.1b, TC-4.2a through TC-4.2c, TC-4.3a through TC-4.3b, and TC-4.4a through TC-4.4b
