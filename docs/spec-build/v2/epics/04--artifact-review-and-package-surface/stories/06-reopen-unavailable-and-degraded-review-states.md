# Story 6: Reopen, Unavailable, and Degraded Review States

### Summary
<!-- Jira: Summary field -->
Reopen artifact or package review from durable state and keep the workspace usable when a target disappears, access is revoked, or one review section fails independently.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver durable reopen behavior and bounded degraded-state handling so review remains useful after reload, later return, target loss, access loss, or one independent render failure.

**Scope**

In:

- Restore artifact or package review from durable state after reload or later reopen
- Show unavailable states for missing artifact, artifact version, or package targets without leaking stale content
- Block direct review routes when project or process access is revoked
- Keep the workspace open when one artifact body render or one package member fails independently

Out:

- Live-update subscription requirements for review usability
- Package publication workflow
- Global archive browsing or broader review-library behavior
- Recovery of failed export URLs beyond requiring a new export request

**Dependencies**

- Story 5 package export
- Durable review state from Stories 1 through 5
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-6.1:** Reloading or reopening the review workspace restores the latest durable artifact or package review state without requiring an active environment.

- **TC-6.1a: Reopen artifact review from durable state**
  - Given: User previously opened one artifact review workspace
  - When: User reloads or reopens it later
  - Then: The workspace restores the latest durable review state for that artifact version
- **TC-6.1b: Reopen package review from durable state**
  - Given: User previously opened one package review workspace
  - When: User reloads or reopens it later
  - Then: The workspace restores the latest durable review state for that package

**AC-6.2:** If the requested artifact, artifact version, or package is unavailable, the platform shows an unavailable state and does not leak stale review content.

- **TC-6.2a: Missing artifact or version shows unavailable state**
  - Given: User opens an artifact review target that no longer exists or is no longer reviewable
  - When: The workspace loads
  - Then: The platform shows an unavailable state and does not show stale review content
- **TC-6.2b: Missing package shows unavailable state**
  - Given: User opens a package that no longer exists
  - When: The workspace loads
  - Then: The platform shows an unavailable state and does not show stale package content
- **TC-6.2c: Revoked access on direct review route is blocked**
  - Given: User no longer has access to the project or process for a direct review route
  - When: User opens that review route
  - Then: The platform blocks access and does not leak stale review content

**AC-6.3:** If one review section fails independently, the workspace remains open and shows a bounded failure state without hiding the healthy review context.

- **TC-6.3a: Artifact render failure does not hide review context**
  - Given: Artifact identity and version load successfully but render of the body fails
  - When: The review workspace renders
  - Then: The workspace remains open and shows a bounded render failure state
- **TC-6.3b: Package member failure does not hide healthy members**
  - Given: Package context loads successfully but one member fails independently
  - When: The package workspace renders
  - Then: The package remains open and healthy members remain available

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story keeps review durable and bounded. It restores from stored review truth and separates request-level failures from in-workspace degraded states.

#### Browser Route

| Route | Description |
|---|---|
| `/projects/{projectId}/processes/{processId}/review` | Opens or reopens the review workspace for one process |

The first-cut review workspace restores from durable review state. It does not depend on a live-update subscription to remain usable.

#### Review Target

Note: The canonical shared contract definitions are established in Story 0 (Foundation). This story references the same shapes for self-contained readability; Story 0's `review-workspace.ts` is authoritative at runtime.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `targetKind` | enum | yes | `artifact` or `package` | What the current review target is |
| `displayName` | string | yes | non-empty | Human-readable target label |
| `status` | enum | yes | `ready`, `empty`, `error`, `unsupported`, or `unavailable` | Current review target state |
| `artifact` | Artifact Review Target | no | present when `targetKind` is `artifact` | Artifact review data |
| `package` | Package Review Target | no | present when `targetKind` is `package` | Package review data |
| `error` | Review Target Error | no | present when `status` is `error`, `unsupported`, or `unavailable` | Review-target-scoped failure shown without failing the whole review workspace |

#### Review Target Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable review error code |
| `message` | string | yes | non-empty | Human-readable review error summary |

#### Review Target Error Codes

| Code | Description |
|---|---|
| `REVIEW_TARGET_NOT_FOUND` | The requested review target (artifact, artifact version, or package) is no longer available in the review context |
| `REVIEW_TARGET_UNSUPPORTED` | The current target or selected member cannot be rendered in the first-cut review workspace, but its identity remains visible |
| `REVIEW_RENDER_FAILED` | The current target identity loaded, but bounded body or diagram rendering failed |
| `REVIEW_MEMBER_UNAVAILABLE` | One package member is unavailable in the current package review context |

#### Review Failure Boundary

Request-level review errors apply only when the platform cannot resolve or authorize the requested project, process, artifact, artifact version, or package, or when export preparation cannot be started or completed as a request.

Once project identity, process identity, and review-target identity load successfully, later unsupported-format states, artifact-body render failures, Mermaid render failures, and individual package-member failures remain inside the open review workspace as bounded degraded states. Those later failures do not replace the whole review workspace with a request-level error response.

#### Non-Functional Requirements

- Review remains available from durable artifact or package state even when no active environment exists.
- Direct review URLs do not leak unavailable artifact content, unavailable package members, or revoked review targets.
- Unavailable, unsupported, and degraded review states remain available as readable text, not color alone.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact, artifact version, or package does not exist in the requested review context |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Reloading or reopening artifact review restores the last durable artifact review state without requiring an active environment
- Reloading or reopening package review restores the last durable package review state without requiring an active environment
- Missing artifact, artifact-version, package, or revoked-access routes show unavailable or blocked states without leaking stale review content
- Artifact-body failure and package-member failure remain bounded inside the open review workspace and do not hide healthy context
- Review remains usable from durable state without an active environment, and direct review URLs do not leak unavailable or revoked content
- Unavailable, unsupported, and degraded review states remain readable as text
- Story tests cover TC-6.1a through TC-6.1b, TC-6.2a through TC-6.2c, and TC-6.3a through TC-6.3b
