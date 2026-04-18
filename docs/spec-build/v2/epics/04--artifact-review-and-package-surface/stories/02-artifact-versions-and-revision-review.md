# Story 2: Artifact Versions and Revision Review

### Summary
<!-- Jira: Summary field -->
Review the current and prior durable versions of one artifact with clear artifact identity, clear version identity, and distinct current-versus-prior selection.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver artifact version history and selection so the user can tell exactly which durable draft is open now, inspect earlier drafts, and understand when no reviewable version exists yet.

**Scope**

In:

- Record new durable artifact revisions without overwriting earlier reviewable versions
- Show artifact identity plus current version identity in the review workspace
- Show prior reviewable versions newest to oldest
- Switch between current and prior versions without confusing prior drafts with the current one
- Show a no-version state when an artifact record exists but no durable reviewable version exists yet

Out:

- Markdown-body rendering and Mermaid rendering details
- Unsupported-format fallback details beyond version-aware identity
- Package review and package export
- Reopen, unavailable, and degraded review-state handling

**Dependencies**

- Story 1 review entry and workspace bootstrap
- Durable artifact and artifact-version persistence from earlier platform work
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** When a process revises an existing artifact, the new revision appears as a new durable artifact version and the earlier version remains available for review.

- **TC-2.1a: New revision becomes current version**
  - Given: A process has revised an existing artifact
  - When: The revision is published durably
  - Then: The artifact has a new current version
- **TC-2.1b: Earlier revision remains reviewable**
  - Given: An artifact has more than one durable version
  - When: User opens the review workspace
  - Then: Earlier versions remain available for review and are not overwritten by the current version

**AC-2.2:** The review workspace makes the current artifact identity and current version identity clear enough that the user can tell exactly which draft is open.

- **TC-2.2a: Artifact identity visible**
  - Given: User is reviewing one artifact
  - When: The workspace renders
  - Then: The artifact identity is visible
- **TC-2.2b: Current version identity visible**
  - Given: User is reviewing one artifact version
  - When: The workspace renders
  - Then: The version label or revision identity is visible

**AC-2.3:** When the user switches to a prior artifact version, the workspace updates to that version without confusing it with the current one.

- **TC-2.3a: Prior version opens distinctly**
  - Given: An artifact has at least one prior reviewable version
  - When: User selects a prior version
  - Then: The workspace updates to that prior version and does not continue presenting it as the current version
- **TC-2.3b: Versions remain ordered newest to oldest**
  - Given: An artifact has multiple reviewable versions
  - When: The version list appears in the workspace
  - Then: Versions appear from newest to oldest

**AC-2.4:** If an artifact exists but has no reviewable durable version yet, the workspace shows a clear no-version state instead of implying a reviewable draft exists.

- **TC-2.4a: No durable version state shown**
  - Given: Artifact record exists but no reviewable version has been published
  - When: User opens artifact review
  - Then: The workspace shows that no reviewable version is currently available

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story adds durable artifact-version truth to the review workspace and keeps version identity explicit on every artifact read.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns review data for one artifact and its versions; optional query state may select one version |

#### Review Endpoint Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `versionId` | string | no | Explicit artifact version to review when calling an artifact review endpoint |

#### Artifact Review Target

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Artifact display name |
| `currentVersionId` | string | no | non-empty when present | Current durable version identifier |
| `currentVersionLabel` | string | no | non-empty when present | Current durable version label |
| `selectedVersionId` | string | no | non-empty when present | Currently reviewed version identifier |
| `versions` | array of Artifact Version Summary | yes | present | Available reviewable versions for this artifact |
| `selectedVersion` | Artifact Version Detail | no | present when the selected version is reviewable | Reviewed version detail |

#### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `versionId` | string | yes | non-empty | Stable version identifier |
| `versionLabel` | string | yes | non-empty | Human-readable version or revision label |
| `isCurrent` | boolean | yes | boolean | Whether this is the current durable version |
| `createdAt` | string | yes | ISO 8601 UTC | Time the version became durable |

**Sort order:** Versions are ordered newest to oldest by `createdAt`.

#### Artifact Version Detail

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `versionId` | string | yes | non-empty | Stable version identifier |
| `versionLabel` | string | yes | non-empty | Human-readable version or revision label |
| `contentKind` | enum | yes | `markdown` or `unsupported` | Review presentation kind in this first-cut workspace |
| `bodyStatus` | enum | no | `ready` or `error` when present | State of the reviewed body when `contentKind` is `markdown` |
| `body` | string | no | present when `contentKind` is `markdown` and `bodyStatus` is `ready` | Markdown body for the reviewed version |
| `bodyError` | Review Target Error | no | present when `contentKind` is `markdown` and `bodyStatus` is `error` | Bounded render failure for the reviewed body |
| `mermaidBlocks` | array of Mermaid Block | no | present when Mermaid content exists | Mermaid blocks extracted for in-workspace rendering |
| `createdAt` | string | yes | ISO 8601 UTC | Time the version became durable |

Story 2 depends on the version identity fields and ordering rules in this shape. Story 3 exercises `contentKind`, `bodyStatus`, `body`, `bodyError`, and `mermaidBlocks` as rendered review behavior.

#### Non-Functional Requirements

- Switching between already-known versions of the same artifact updates within 1 second under normal conditions.
- Version selection is keyboard reachable.
- Artifact identity and version identity remain available as readable text, not color alone.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact or artifact version does not exist in the requested review context |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Durable artifact revisions create a new current version without deleting or overwriting earlier reviewable versions
- The artifact review workspace always shows artifact identity and selected version identity together
- Version lists appear newest to oldest and prior-version selection updates the reviewed draft distinctly from the current one
- Artifact records with no durable version show an explicit no-version state
- Switching between already-known versions meets the 1-second response target under normal conditions
- Version selection remains keyboard reachable, and artifact plus version identity remain readable as text
- Story tests cover TC-2.1a through TC-2.1b, TC-2.2a through TC-2.2b, TC-2.3a through TC-2.3b, and TC-2.4a
