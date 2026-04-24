# Story 4: Package Review Workspace

### Summary
<!-- Jira: Summary field -->
Review one published package snapshot as an ordered multi-artifact set, keep package context visible while moving between members, keep healthy members visible when one member fails, and persist durable package snapshots for downstream publication flows.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver the package-review substrate and workspace so one durable package snapshot can open as one ordered reviewable set and downstream process-module code can persist those snapshots through Epic 4's publication handoff. Until a downstream process-module epic publishes package snapshots in normal product flow, this story is exercised through tests and manual Convex seeding.

**Scope**

In:

- Provide the `publishPackageSnapshot` typed internal mutation that persists one durable ordered package snapshot for downstream process-module publication flows
- Open one durable package snapshot as one reviewable package rather than as unrelated standalone artifacts
- Preserve package membership and package order exactly as published in the package snapshot
- Default to the first reviewable member when no explicit member is selected
- Keep package context visible while the user moves between members
- Keep the package open when one member is unsupported or unavailable and other members remain healthy

Out:

- Production package publication workflow
- Package authoring or package composition UX
- Package export and signed-download behavior
- Artifact version-history review outside package context

**Dependencies**

- Story 3 markdown and Mermaid review
- Durable package-snapshot truth provided by manual seeding, tests, or a downstream process-module publisher
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
These package-review test conditions are exercisable through tests and manual Convex seeding until a downstream process-module epic publishes durable package snapshots in normal product flow.

**AC-4.1:** The user can open one process output set as one reviewable package.

- **TC-4.1a: Package review opens as one set**
  - Given: Process has a reviewable output set
  - When: User opens package review
  - Then: The package opens as one reviewable set rather than as unrelated standalone artifacts
- **TC-4.1b: Published package remains stable after later artifact revision**
  - Given: A process already published a package snapshot and one package member later gets a newer artifact version
  - When: User reopens the earlier package
  - Then: The package still points at the published member versions from that package snapshot

**AC-4.2:** The package review workspace shows which artifacts and versions belong together in that package.

- **TC-4.2a: Package membership visible**
  - Given: User is reviewing one output package
  - When: The workspace renders
  - Then: The included artifacts and versions are visible as members of that package
- **TC-4.2b: Package member order remains visible**
  - Given: A package defines an ordered set of members
  - When: The package workspace renders
  - Then: Members appear in that package order

**AC-4.3:** When the user opens or switches to one member of the package, the workspace keeps the package context visible and updates the reviewed member.

- **TC-4.3a: Package context preserved while reviewing one member**
  - Given: User is reviewing one artifact inside a package
  - When: The workspace renders that member
  - Then: The package context remains visible
- **TC-4.3b: Selecting a different package member updates the reviewed member**
  - Given: User is reviewing one package with more than one member
  - When: User selects a different member
  - Then: The workspace updates to that member while preserving package context
- **TC-4.3c: Package opens first member when no explicit member is selected**
  - Given: User opens one package without an explicit selected member
  - When: The package workspace loads
  - Then: The workspace opens the first reviewable member in package order

**AC-4.4:** If one package member is unavailable or unreadable, the package workspace remains open and shows that member failure without hiding the healthy members.

- **TC-4.4a: Package remains open when one member fails**
  - Given: A package contains one unreadable or unavailable member and other readable members
  - When: The package workspace renders
  - Then: The package remains open and only the failing member shows an unavailable or unsupported state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story adds package-snapshot review on top of the process-aware review workspace and keeps member selection pinned to the package snapshot rather than the artifact's broader version history.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get package review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns review data for one output package; optional query state may select one member |

#### Downstream Publication Handoff

- Epic 4 owns `publishPackageSnapshot`, a typed internal mutation that downstream process-module code calls when its publication decision fires.
- The mutation persists one durable package snapshot for one process as a fixed ordered set of artifact versions in package order.
- The published snapshot becomes the source of truth for Story 4 package review and Story 5 export. Later artifact revisions do not mutate earlier package snapshots.
- Until a downstream process-module production flow calls this mutation, package review remains exercisable through tests and manual Convex seeding.

#### Review Endpoint Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `memberId` | string | no | Explicit package member to focus when calling a package review endpoint |

#### Package Review Target

Note: The canonical shared contract definitions are established in Story 0 (Foundation). This story references the same shapes for self-contained readability; Story 0's `review-workspace.ts` is authoritative at runtime.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `packageId` | string | yes | non-empty | Stable package identifier |
| `displayName` | string | yes | non-empty | Package display name |
| `packageType` | string | yes | non-empty | User-visible process-supplied package kind label |
| `members` | array of Package Member | yes | present | Artifacts and versions that belong to this package |
| `selectedMemberId` | string | no | non-empty when present | Currently selected package member |
| `selectedMember` | Package Member Review | no | present when one member is selected | Currently reviewed package member envelope within package context |
| `exportability` | Package Exportability | yes | present | Whether the package is currently exportable and, when not, why |

**Sort order:** Package members are ordered by the package's defined review order.

**Default selection:** When no `memberId` is supplied in the query state, the server selects the first member with `status: ready`, falling through to the first member only when no member is in `ready` state.

#### Package Member

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `memberId` | string | yes | non-empty | Stable package member identifier |
| `position` | integer | yes | `>= 0` | Package-defined review order position |
| `artifactId` | string | yes | non-empty | Artifact identifier for this member |
| `displayName` | string | yes | non-empty | Artifact display name in the package |
| `versionId` | string | yes | non-empty | Durable artifact version identifier for this package snapshot member |
| `versionLabel` | string | yes | non-empty | Durable artifact version label for this package snapshot member |
| `status` | enum | yes | `ready`, `unsupported`, or `unavailable` | Reviewability state for this member |

#### Package Member Review

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `memberId` | string | yes | non-empty | Stable package member identifier |
| `status` | enum | yes | `ready`, `unsupported`, or `unavailable` | Review-level state for the selected member |
| `error` | Review Target Error | no | present when `status` is `unsupported` or `unavailable` | Bounded error describing why the selected member is not reviewable |
| `artifact` | Artifact Review Target | no | present when `status` is `ready` | Reviewed artifact-version detail for the currently selected package member |

#### Review Target Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable review error code |
| `message` | string | yes | non-empty | Human-readable review error summary |

#### Package Exportability

| `available` | Other fields | Semantics |
|---|---|---|
| `true` | *(no other fields)* | Every package member is `status: ready`; the export action is offered |
| `false` | `reason: string` (required, non-empty) | At least one package member is `unsupported` or `unavailable`; the export action is hidden and the reason may be surfaced |

#### Review Target Error Codes

| Code | Description |
|---|---|
| `REVIEW_TARGET_NOT_FOUND` | The requested review target (artifact, artifact version, or package) is no longer available in the review context |
| `REVIEW_TARGET_UNSUPPORTED` | The selected member cannot be rendered in the first-cut review workspace, but its identity remains visible |
| `REVIEW_MEMBER_UNAVAILABLE` | One package member is unavailable in the current package review context |

#### Non-Functional Requirements

- The review workspace renders a package of up to 20 members within 2 seconds under normal conditions.
- Package member navigation is keyboard reachable.
- One unavailable package member does not fail the whole package review.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested package does not exist in the requested review context |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- One durable package snapshot opens as one reviewable set rather than as unrelated standalone artifacts
- `publishPackageSnapshot` persists durable ordered package snapshots for downstream process-module publication flows
- Package membership and member order remain visible and stable against the published package snapshot
- Member selection keeps package context visible and defaults to the first reviewable member when no explicit member is selected
- One unsupported or unavailable member does not hide the healthy members of the package
- Package review of up to 20 members meets the 2-second target under normal conditions, and package member navigation remains keyboard reachable
- Story tests cover TC-4.1a through TC-4.1b, TC-4.2a through TC-4.2b, TC-4.3a through TC-4.3c, and TC-4.4a
