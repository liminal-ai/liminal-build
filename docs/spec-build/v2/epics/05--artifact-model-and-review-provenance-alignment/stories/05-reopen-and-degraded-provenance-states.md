# Story 5: Reopen and Degraded Provenance States

### Summary
<!-- Jira: Summary field -->
Preserve durable reopen behavior and classify unavailable artifact, version, and package-member states accurately without collapsing the whole workspace.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who builds work across multiple related processes inside one project.
- **Context:** The user accumulates durable artifacts across planning, specification, implementation, and review work. They need those artifacts to remain stable project assets even when later processes revise, review, or package them.
- **Mental Model:** "Artifacts belong to the project. Processes work with them, create new versions of them, and package them together, but no single process owns the artifact itself."
- **Key Constraint:** This epic must realign artifact behavior inside the existing project shell, process work surface, and review/package surfaces without adding a separate standalone artifact-management product surface.

**Objective**

Make return-later, reopen, and degraded review/package behavior accurate and bounded so the user can still read healthy state even when one artifact or one pinned member has gone stale.

**Scope**

In:

- Reopen process materials after later cross-process updates
- Reopen package review against pinned versions
- Partial degradation when one referenced artifact or package member is unavailable
- Exact classification for missing target, missing explicit version, and unavailable package member
- Review-workspace bootstrap and follow-up reads remain distinguishable

Out:

- Initial artifact association
- Initial versioned checkpoint behavior
- Initial package publication rules

**Dependencies**

- Story 1 project artifact association without process ownership
- Story 2 versioned checkpoint realignment
- Story 3 process-scoped artifact review realignment
- Story 4 cross-process package alignment
- [tech-design.md](../tech-design.md), [tech-design-server.md](../tech-design-server.md), [tech-design-client.md](../tech-design-client.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.1:** Returning later restores the latest durable artifact and package state without depending on a single primary-process assignment.

- **TC-5.1a: Reopen process artifact materials after later cross-process updates**
  - Given: An artifact has been revised by another process
  - When: The user returns later to a process that still references that artifact
  - Then: The latest durable artifact state is restored for that process
- **TC-5.1b: Reopen package review after later artifact activity**
  - Given: A package was published earlier
  - When: The user returns later to review that package
  - Then: The package still resolves its pinned member versions

**AC-5.2:** If one referenced artifact or pinned version is unavailable, the rest of the process or package state remains readable where possible.

- **TC-5.2a: One unavailable artifact does not fail unrelated current materials**
  - Given: A process references several artifacts
  - When: One referenced artifact is unavailable
  - Then: The remaining readable materials still load
- **TC-5.2b: One unavailable package member does not remove unrelated package members**
  - Given: A package contains multiple members
  - When: One pinned member becomes unavailable
  - Then: The package still shows the remaining members and bounded degradation for the unavailable member

**AC-5.3:** Unavailable or degraded review states describe reference or version availability accurately rather than implying a primary-process ownership failure.

- **TC-5.3a: Artifact review unavailable reason reflects missing reference or missing version**
  - Given: Artifact review cannot be resolved
  - When: The failure is surfaced to the user
  - Then: The unavailable state describes the actual missing artifact or version condition
- **TC-5.3b: Package member unavailable reason reflects pinned-version failure**
  - Given: A package member can no longer resolve its pinned artifact version
  - When: The user opens package review
  - Then: The unavailable state reflects that pinned-version failure rather than a primary-process mismatch

**AC-5.4:** Review-workspace bootstrap and follow-up read failures are classified according to the actual artifact, version, or package condition.

- **TC-5.4a: Missing review target not surfaced as export failure**
  - Given: Review workspace bootstrap cannot resolve the requested artifact or package target
  - When: The failure is returned to the client
  - Then: The response is classified as a review-target failure rather than as an export failure
- **TC-5.4b: Artifact-version and package-member failures remain distinct**
  - Given: Review bootstrap or follow-up reads fail for different reasons
  - When: The failure is surfaced to the user
  - Then: Missing artifact target, missing artifact version, and unavailable package member conditions remain distinguishable

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the aligned degraded-state and return-later behavior across process materials and review/package surfaces.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Returns process-local current artifact materials and current outputs without implying artifact ownership |
| Get review workspace | `GET` | `/api/projects/{projectId}/processes/{processId}/review` | Returns process-scoped review targets based on process reference and package context |
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns one artifact's version list and selected review state for that process context |
| Get package review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns one package with pinned member versions even when members were produced by multiple processes |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact or package review target is not available in the current process review context |
| `404` | `ARTIFACT_VERSION_NOT_FOUND` | Requested artifact version is unavailable |
| `404` | `PACKAGE_MEMBER_UNAVAILABLE` | Requested package member's pinned artifact version is unavailable |

Implementation notes:

- Review-workspace bootstrap prefers bounded degraded target states once project and process context has resolved
- Target-specific follow-up reads use exact request-level failure codes
- Stale explicit version/member selection triggers a workspace reload fallback in the client so the workspace shell remains readable
- Fully degraded published package targets remain visible for reopen and provenance inspection even when all members are unavailable

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Returning later restores the latest durable process materials and pinned package snapshot state
- One unavailable artifact or package member does not collapse unrelated readable state
- User-visible error copy and machine-readable error codes distinguish missing target, missing explicit version, and unavailable package member cases
- Review-workspace bootstrap and follow-up reads remain clearly classified
- Fully degraded published packages remain reopenable as durable provenance objects
- Story tests cover TC-5.1a through TC-5.1b, TC-5.2a through TC-5.2b, TC-5.3a through TC-5.3b, and TC-5.4a through TC-5.4b
