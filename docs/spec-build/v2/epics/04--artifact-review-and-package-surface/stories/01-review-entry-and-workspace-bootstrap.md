# Story 1: Review Entry and Workspace Bootstrap

### Summary
<!-- Jira: Summary field -->
Open a process-aware review workspace, resolve the correct artifact or package target, keep project and process context visible, and return to the same process surface.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver review entry and bootstrap so the user can move from active process work into a process-aware review workspace without losing context or landing on stale review content.

**Scope**

In:

- Enable review entry from the process surface only when at least one reviewable target exists
- Apply explicit reviewability rules for artifacts and packages before offering or resolving review
- Resolve single-target, multi-target, and zero-target review bootstrap states
- Keep project, process, and review-target context visible in the review workspace
- Make artifact versus package target type visible on first render
- Return the user to the same process context that opened review

Out:

- Artifact version-history behavior
- Markdown and Mermaid rendering
- Package-member navigation
- Package export
- Reopen, unavailable, and degraded review-state handling

**Dependencies**

- Story 0 foundation
- Epic 2 process work surface, route context, and visible process action area
- Epic 3 durable artifact and output truth plus review entry from the process surface
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** The user can open a review workspace from an active process surface when that process has a reviewable artifact or output set.

- **TC-1.1a: Open review from process surface**
  - Given: User is viewing a process work surface with a reviewable artifact or output set
  - When: User activates the review action
  - Then: The review workspace opens for that process and reviewed target
- **TC-1.1b: Review not falsely offered without reviewable output**
  - Given: User is viewing a process work surface with no reviewable artifact or output set
  - When: The surface renders
  - Then: The platform does not falsely present a review path for missing reviewable output
- **TC-1.1c: Single reviewable target opens directly**
  - Given: User opens review from a process with exactly one reviewable target and no explicit target selection
  - When: The review workspace loads
  - Then: The workspace opens that one target directly
- **TC-1.1d: Multiple reviewable targets open in target-selection state**
  - Given: User opens review from a process with more than one reviewable target and no explicit target selection
  - When: The review workspace loads
  - Then: The workspace shows the available review targets without showing stale target content
- **TC-1.1e: Zero-target direct review route opens empty target state**
  - Given: User opens a direct review route for a process with no reviewable targets
  - When: The review workspace loads
  - Then: The workspace shows an empty target state with no stale target content

**AC-1.2:** The review workspace keeps the reviewed target tied to the active project and process context.

- **TC-1.2a: Process-aware review context visible**
  - Given: User has opened a review workspace
  - When: The workspace renders
  - Then: The project identity, process identity, and reviewed target identity are visible together
- **TC-1.2b: Target-selection state keeps process context visible**
  - Given: User opens review in target-selection state
  - When: The workspace renders
  - Then: The project identity, process identity, and available review targets are visible together

**AC-1.3:** The review workspace makes the current review target type clear, including whether the user is reviewing one artifact or one output package.

- **TC-1.3a: Single artifact review target is identified**
  - Given: User opens review for one artifact
  - When: The workspace renders
  - Then: The workspace identifies that the review target is one artifact
- **TC-1.3b: Output package review target is identified**
  - Given: User opens review for one output set or package
  - When: The workspace renders
  - Then: The workspace identifies that the review target is one package rather than one standalone artifact

**AC-1.4:** The user can return from the review workspace to the same process context without reconstructing which process was being reviewed.

- **TC-1.4a: Return to process from review**
  - Given: User opened review from one process work surface
  - When: User returns from review
  - Then: The user returns to that same process context

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story extends the process surface with a process-aware review route and deterministic bootstrap rules.

#### Browser Routes

| Route | Description |
|---|---|
| `/projects/{projectId}/processes/{processId}/review` | Opens the review workspace for one process |

The review workspace stays process-aware. Route parameters or query state may select whether the current target is one artifact or one package, but the route still belongs to one process rather than to a global artifact library.

#### Review Entry Integration

The existing process-surface `review` action is the canonical entry point into Epic 4. The process surface enables that action when the current process has at least one reviewable target under the reviewability rules defined in Flow 1. Opening the review route from that action carries the current process context forward and either opens the selected target directly or enters target-selection state.

Return from the review workspace uses the same process route context that opened review. Epic 4 may provide a direct back-to-process control and should also support normal browser back navigation. It does not define a separate return endpoint.

#### Reviewability Rules

- An artifact is reviewable when it has at least one durable version, including artifacts that may open through the unsupported-format fallback.
- A package is reviewable when the process has published a durable package snapshot with at least one durable member.
- An artifact with no durable version and a package that does not exist durably are not reviewable targets. Direct-URL access to a zero-version artifact identity is handled by Story 2 AC-2.4 as a no-version target state, not as target-list discovery.

#### Review Route Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `targetKind` | enum | no | `artifact` or `package` when the browser opens one explicit review target |
| `targetId` | string | no | Explicit artifact or package identifier when the browser opens one explicit review target |
| `versionId` | string | no | Explicit artifact version identifier when the browser opens one explicit artifact version |
| `memberId` | string | no | Explicit package member identifier when the browser opens one member inside a package |

#### Process Review Workspace Response

Note: The canonical shared contract definitions are established in Story 0 (Foundation). This story references the same shapes for self-contained readability; Story 0's `review-workspace.ts` is authoritative at runtime.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `project` | Review Workspace Project Context | yes | present | Parent project identity |
| `process` | Process Review Context | yes | present | Active process identity and current review context |
| `availableTargets` | array of Review Target Summary | yes | present | Reviewable targets available in the current process review context |
| `target` | Review Target | no | present when one target is selected | Current reviewed artifact or package target |

#### Review Workspace Project Context

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `projectId` | string | yes | non-empty | Stable parent project identifier |
| `name` | string | yes | non-empty | Parent project display name |
| `role` | enum | yes | `owner` or `member` | Current user's role in the parent project |

#### Process Review Context

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `processId` | string | yes | non-empty | Stable process identifier |
| `displayLabel` | string | yes | non-empty | Process display label |
| `processType` | enum | yes | `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation` | Process type |
| `reviewTargetKind` | enum | no | `artifact` or `package` when present | Current selected review target kind |
| `reviewTargetId` | string | no | non-empty when present | Current selected review target identifier |

#### Review Target Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `position` | integer | yes | `>= 0` | Review-target order within the current process review context, as published by the process; when no explicit order is published, targets fall back to newest-first durable publication order |
| `targetKind` | enum | yes | `artifact` or `package` | Review target kind |
| `targetId` | string | yes | non-empty | Stable review target identifier |
| `displayName` | string | yes | non-empty | Human-readable target label |

**Sort order:** Available review targets are ordered by `position`.

#### Review Target

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `targetKind` | enum | yes | `artifact` or `package` | What the current review target is |
| `displayName` | string | yes | non-empty | Human-readable target label |
| `status` | enum | yes | `ready`, `empty`, `error`, `unsupported`, or `unavailable` | Current review target state; `empty` means no target is currently selected in target-selection state or no reviewable targets currently exist |
| `artifact` | Artifact Review Target | no | present when `targetKind` is `artifact` | Artifact review data |
| `package` | Package Review Target | no | present when `targetKind` is `package` | Package review data |
| `error` | Review Target Error | no | present when `status` is `error`, `unsupported`, or `unavailable` | Review-target-scoped failure shown without failing the whole review workspace |

#### Bootstrap Rules

- If the route or query state names one target, the workspace opens that target.
- If no target is named and the process has exactly one reviewable target, the workspace opens that target.
- If no target is named and the process has more than one reviewable target, the workspace opens in target-selection state with process context visible and no stale target body shown.
- If the process has no reviewable targets, the `review` action is not offered from the process surface and a direct review route opens with no selected target and an empty target list.

#### Non-Functional Requirements

- All review routes and bootstrap APIs require authenticated access and server-side project and process access enforcement.
- Review entry, target selection, and return-to-process navigation are keyboard reachable.
- Review-target identity and status remain available as readable text, not color alone, in direct-open and target-selection states.
- Review workspace open events log request context, project ID, process ID, and target ID when a target is selected.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- The process surface offers review only when the current process has at least one reviewable target
- Artifact and package reviewability rules are applied directly in review entry logic rather than inferred from client-only heuristics
- Review bootstrap resolves single-target, multi-target, and zero-target states without showing stale target content
- Project, process, and current review-target identity remain visible together across direct-open and target-selection states
- The workspace identifies whether the current target is one artifact or one package
- Returning from review restores the same process context that opened review
- Review routes and bootstrap APIs require authenticated access with server-side project and process access enforcement
- Review entry, target selection, and return navigation remain keyboard reachable, and review-target status is available as readable text
- Review workspace open events log request context, project ID, process ID, and target ID when present
- Story tests cover TC-1.1a through TC-1.1e, TC-1.2a through TC-1.2b, TC-1.3a through TC-1.3b, and TC-1.4a
