# Story 3: Markdown and Mermaid Review

### Summary
<!-- Jira: Summary field -->
Read markdown artifacts in place, render Mermaid diagrams inside the review workspace, and degrade locally when one diagram or one artifact format cannot render.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver the first high-value reading surface so the user can review markdown-centric artifacts with preserved structure, in-workspace Mermaid diagrams, and bounded unsupported or render-failure states.

**Scope**

In:

- Render markdown artifacts with headings, paragraphs, tables, lists, code blocks, and normal link presentation preserved
- Render Mermaid diagrams inside the review workspace
- Keep one Mermaid failure local to that diagram instead of failing the whole artifact review
- Show a clear unsupported-format fallback with artifact identity and version identity still visible

Out:

- Package review and package-member navigation
- Package export
- Cross-target unavailable routing behavior
- Global archive browsing or arbitrary rich-media review support

**Dependencies**

- Story 2 artifact versions and revision review
- Markdown and Mermaid rendering inside the app-owned review workspace
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** Markdown artifacts render in a review workspace that preserves the structure needed for serious reading, including headings, paragraphs, tables, lists, code blocks, and normal link presentation.

- **TC-3.1a: Markdown structure preserved**
  - Given: User opens a markdown artifact with headings, tables, lists, and code blocks
  - When: The review workspace renders it
  - Then: The artifact appears with that readable structure preserved

**AC-3.2:** Mermaid diagrams embedded in a markdown artifact render inside the review workspace.

- **TC-3.2a: Mermaid diagram renders in review workspace**
  - Given: User opens a markdown artifact containing Mermaid content
  - When: The workspace renders it
  - Then: The Mermaid diagram renders inside the review workspace

**AC-3.3:** If Mermaid rendering fails for one diagram, the workspace shows a bounded render failure for that diagram without failing the entire artifact review.

- **TC-3.3a: Mermaid failure degrades locally**
  - Given: User opens a markdown artifact with a Mermaid block that cannot render
  - When: The workspace renders it
  - Then: The workspace shows that diagram-level failure without failing the entire review surface

**AC-3.4:** If the current artifact format is not reviewable in the first-cut markdown workspace, the workspace shows the artifact identity, version identity, and a clear unsupported-format state rather than pretending the artifact does not exist.

- **TC-3.4a: Unsupported artifact fallback shown**
  - Given: User opens an artifact version that is not reviewable in the first-cut markdown workspace
  - When: The workspace renders
  - Then: The workspace shows the artifact identity, version identity, and unsupported-format state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story consumes the selected artifact version from Story 2 and turns it into readable markdown with bounded render failures.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns review data for one artifact and its versions; optional query state may select one version |

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

#### Mermaid Block

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `blockId` | string | yes | non-empty | Stable identifier for one Mermaid block in the reviewed version |
| `source` | string | yes | non-empty | Mermaid source text |

#### Review Target Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable review error code |
| `message` | string | yes | non-empty | Human-readable review error summary |

#### Review Target Error Codes

| Code | Description |
|---|---|
| `REVIEW_TARGET_UNSUPPORTED` | The current target cannot be rendered in the first-cut review workspace, but its identity remains visible |
| `REVIEW_RENDER_FAILED` | The current target identity loaded, but bounded body or diagram rendering failed |

#### Review Failure Boundary

Request-level review errors apply only when the platform cannot resolve or authorize the requested project, process, artifact, or artifact version.

Once project identity, process identity, and review-target identity load successfully, later unsupported-format states, artifact-body render failures, and Mermaid render failures remain inside the open review workspace as bounded degraded states. Those later failures do not replace the whole review workspace with a request-level error response.

#### Non-Functional Requirements

- The review workspace renders a markdown artifact of up to 200 KB within 2 seconds under normal conditions.
- A failed Mermaid block does not fail the whole artifact review.
- Mermaid render failures are traceable by artifact ID and version ID.
- Mermaid render failures and unsupported-format states are available as readable text.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Markdown review preserves headings, paragraphs, tables, lists, code blocks, and normal link presentation
- Mermaid diagrams render inside the review workspace when the source is valid
- One Mermaid render failure stays local to the failing diagram and does not replace the whole artifact review surface
- Unsupported artifact formats still show artifact identity, version identity, and an explicit unsupported state
- Markdown review meets the 200 KB within 2 seconds target under normal conditions
- Mermaid render failures are traceable by artifact ID and version ID, and Mermaid plus unsupported states remain readable as text
- Story tests cover TC-3.1a, TC-3.2a, TC-3.3a, and TC-3.4a
