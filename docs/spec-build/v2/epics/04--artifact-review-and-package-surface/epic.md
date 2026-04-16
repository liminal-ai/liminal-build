# Epic 4: Artifact Review and Package Surface

This epic defines the complete requirements for the Liminal Build artifact
review and package surface. It serves as the source of truth for the Tech
Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who wants to review process outputs inside the same platform surface
where the process work happened instead of exporting drafts into a separate
viewer.
**Context:** The user has a process with one or more durable artifact outputs
or output sets and needs to inspect current and prior revisions, read
markdown-centric content, review Mermaid diagrams, and export a bounded output
package when needed.
**Mental Model:** "This process has durable outputs. I can open the current
artifact or package, see exactly which version I am reviewing, move between
review and active process context, and return later without losing the draft I
reviewed."
**Key Constraint:** The review surface must stay process-aware and version-aware
without turning into a generic document-management product, archive browser, or
broader publication workflow in the same epic.

---

## Feature Overview

This feature makes process outputs reviewable inside the platform. After it
ships, the user can open a process-aware review workspace, inspect the current
and prior versions of durable artifacts, read markdown artifacts with their
headings, tables, code blocks, and Mermaid diagrams preserved, review bounded
multi-artifact output sets as one package, and export the current package as a
zip archive containing the reviewed member files and a manifest of the package
and version identities. The review surface remains tied to one process and one
artifact or package context rather than becoming a separate global document
library.

---

## Scope

### In Scope

This epic delivers the first durable review and package slice above the current
artifact/output summaries:

- Process-aware review entry from the active process surface
- Dedicated review workspace for one process artifact or one process output set
- Durable artifact version records and current-versus-prior revision visibility
- Review of the current version and earlier versions of one artifact
- Markdown review preserving headings, tables, code blocks, links, and normal
  readable structure
- Mermaid rendering inside the review workspace
- Package view for multi-artifact output sets that belong together
- Export of the currently reviewed package as a bounded zip archive
- Return-later and reopen behavior for the review workspace
- Degraded and unavailable review behavior when one artifact, one version, or
  one render path fails independently

### Out of Scope

- Full archive, turn, chunk, or transcript browsing
- Full source-management and broader GitHub workflow surfaces
- Process-independent generalized review framework
- Broad publication or distribution workflows beyond exporting the current
  reviewed package
- Full artifact-library browsing across unrelated projects or processes
- Review of arbitrary non-markdown rich media formats beyond a bounded
  unsupported-artifact fallback
- Package-editing, package-authoring, or package-composition controls in the
  review workspace
- Process-type-specific approval policy or sign-off workflow beyond opening and
  reading the reviewed outputs

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Epic 1 project shell and Epic 2 process work surface are already in place | Validated | Platform | Epic 4 extends the current process surface with review entry rather than replacing it |
| A2 | Earlier platform work establishes durable artifact and output truth before Epic 4 deepens that truth into review | Validated | Platform | Epic 4 consumes durable process outputs rather than redefining process-work checkpoint behavior |
| A3 | Review must not require an active environment to remain usable | Validated | Platform | Durable artifact truth remains reviewable after environment loss |
| A4 | The first high-value review target is markdown-centric artifact output | Validated | Product + Platform | Markdown and Mermaid are first-class in this slice |
| A5 | Epic 4 introduces a durable review package as a process-published snapshot of a fixed ordered set of artifact versions | Validated | Platform | Epic 4 defines what the user can review and export as one package, but it does not define a separate package-authoring workflow |
| A6 | The review surface stays process-aware rather than becoming a global cross-process document browser | Validated | Product | Review entry and return flow stay tied to one process context |
| A7 | Artifact meaning remains process-owned even though artifact records and versions are generic | Validated | Platform | Epic 4 reviews what exists; it does not hard-code one ontology for all artifact types |
| A8 | Some artifacts may not be renderable in the first-cut markdown workspace | Validated | Product + Platform | Epic 4 still needs a bounded unsupported-format fallback rather than pretending those artifacts do not exist |
| A9 | Epic 4 does not depend on live-update subscription in the first cut; reopen and refresh come from durable review state | Validated | Platform | Review remains usable without introducing a second live transport surface |

---

## Flows & Requirements

### 1. Opening a Review Workspace from a Process

The user finishes or pauses active process work and needs to inspect the
artifact or output set the process produced. Review should begin from the same
process context rather than forcing the user into a detached document library or
external export flow first.

1. User opens a process work surface with one or more durable reviewable outputs
2. User chooses to review the current artifact or current output set
3. System opens the review workspace for that process
4. System shows the active process context plus the selected artifact or package
5. User understands what they are reviewing and how to return to the process

Review entry in Epic 4 uses the existing process-surface `review` action. That
action is enabled only when the current process has at least one reviewable
target.

Reviewability rules:

- an artifact is reviewable when it has at least one durable version, including
  artifacts that may open through the unsupported-format fallback
- a package is reviewable when the process has published a durable package
  snapshot with at least one durable member
- an artifact with no durable version and a package that does not exist durably
  are not reviewable targets

Target-selection rules:

- if the route or query state names one target, the workspace opens that target
- if no target is named and the process has exactly one reviewable target, the
  workspace opens that target
- if no target is named and the process has more than one reviewable target, the
  workspace opens in target-selection state with process context visible and no
  stale target body shown
- if the process has no reviewable targets, the `review` action is not offered
  from the process surface and a direct review route opens with no selected
  target and an empty target list

#### Acceptance Criteria

**AC-1.1:** The user can open a review workspace from an active process surface
when that process has a reviewable artifact or output set.

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

**AC-1.2:** The review workspace keeps the reviewed target tied to the active
project and process context.

- **TC-1.2a: Process-aware review context visible**
  - Given: User has opened a review workspace
  - When: The workspace renders
  - Then: The project identity, process identity, and reviewed target identity are visible together
- **TC-1.2b: Target-selection state keeps process context visible**
  - Given: User opens review in target-selection state
  - When: The workspace renders
  - Then: The project identity, process identity, and available review targets are visible together

**AC-1.3:** The review workspace makes the current review target type clear,
including whether the user is reviewing one artifact or one output package.

- **TC-1.3a: Single artifact review target is identified**
  - Given: User opens review for one artifact
  - When: The workspace renders
  - Then: The workspace identifies that the review target is one artifact
- **TC-1.3b: Output package review target is identified**
  - Given: User opens review for one output set or package
  - When: The workspace renders
  - Then: The workspace identifies that the review target is one package rather than one standalone artifact

**AC-1.4:** The user can return from the review workspace to the same process
context without reconstructing which process was being reviewed.

- **TC-1.4a: Return to process from review**
  - Given: User opened review from one process work surface
  - When: User returns from review
  - Then: The user returns to that same process context

### 2. Reviewing Current and Prior Artifact Versions

The user needs to inspect what is current now and what existed before. When a
process revises an artifact, the new revision must become current without
erasing earlier reviewable versions. The review workspace must make version
identity clear so the user never has to guess which draft is open.

1. Process produces or revises a durable artifact
2. System records the new current version
3. User opens the artifact review workspace
4. User sees the current version and the available prior versions
5. User switches between versions when needed
6. User understands which version is currently under review

#### Acceptance Criteria

**AC-2.1:** When a process revises an existing artifact, the new revision
appears as a new durable artifact version and the earlier version remains
available for review.

- **TC-2.1a: New revision becomes current version**
  - Given: A process has revised an existing artifact
  - When: The revision is published durably
  - Then: The artifact has a new current version
- **TC-2.1b: Earlier revision remains reviewable**
  - Given: An artifact has more than one durable version
  - When: User opens the review workspace
  - Then: Earlier versions remain available for review and are not overwritten by the current version

**AC-2.2:** The review workspace makes the current artifact identity and
current version identity clear enough that the user can tell exactly which
draft is open.

- **TC-2.2a: Artifact identity visible**
  - Given: User is reviewing one artifact
  - When: The workspace renders
  - Then: The artifact identity is visible
- **TC-2.2b: Current version identity visible**
  - Given: User is reviewing one artifact version
  - When: The workspace renders
  - Then: The version label or revision identity is visible

**AC-2.3:** When the user switches to a prior artifact version, the workspace
updates to that version without confusing it with the current one.

- **TC-2.3a: Prior version opens distinctly**
  - Given: An artifact has at least one prior reviewable version
  - When: User selects a prior version
  - Then: The workspace updates to that prior version and does not continue presenting it as the current version
- **TC-2.3b: Versions remain ordered newest to oldest**
  - Given: An artifact has multiple reviewable versions
  - When: The version list appears in the workspace
  - Then: Versions appear from newest to oldest

**AC-2.4:** If an artifact exists but has no reviewable durable version yet,
the workspace shows a clear no-version state instead of implying a reviewable
draft exists.

- **TC-2.4a: No durable version state shown**
  - Given: Artifact record exists but no reviewable version has been published
  - When: User opens artifact review
  - Then: The workspace shows that no reviewable version is currently available

### 3. Reading Markdown and Mermaid Artifacts in Place

The first high-value review target is markdown-centric artifact output. The
user needs to read structured markdown directly in the platform without losing
tables, code blocks, or diagram context. Mermaid diagrams need to render inside
the review workspace rather than forcing a separate tool or export first.

1. User opens a markdown-centric artifact version
2. System loads the artifact content into the review workspace
3. System renders the markdown structure
4. System renders Mermaid diagrams embedded in the content
5. User reads the artifact in place

#### Acceptance Criteria

**AC-3.1:** Markdown artifacts render in a review workspace that preserves the
structure needed for serious reading, including headings, paragraphs, tables,
lists, code blocks, and normal link presentation.

- **TC-3.1a: Markdown structure preserved**
  - Given: User opens a markdown artifact with headings, tables, lists, and code blocks
  - When: The review workspace renders it
  - Then: The artifact appears with that readable structure preserved

**AC-3.2:** Mermaid diagrams embedded in a markdown artifact render inside the
review workspace.

- **TC-3.2a: Mermaid diagram renders in review workspace**
  - Given: User opens a markdown artifact containing Mermaid content
  - When: The workspace renders it
  - Then: The Mermaid diagram renders inside the review workspace

**AC-3.3:** If Mermaid rendering fails for one diagram, the workspace shows a
bounded render failure for that diagram without failing the entire artifact
review.

- **TC-3.3a: Mermaid failure degrades locally**
  - Given: User opens a markdown artifact with a Mermaid block that cannot render
  - When: The workspace renders it
  - Then: The workspace shows that diagram-level failure without failing the entire review surface

**AC-3.4:** If the current artifact format is not reviewable in the first-cut
markdown workspace, the workspace shows the artifact identity, version
identity, and a clear unsupported-format state rather than pretending the
artifact does not exist.

- **TC-3.4a: Unsupported artifact fallback shown**
  - Given: User opens an artifact version that is not reviewable in the first-cut markdown workspace
  - When: The workspace renders
  - Then: The workspace shows the artifact identity, version identity, and unsupported-format state

### 4. Reviewing a Multi-Artifact Output Set as One Package

Some process outputs are meaningful as a set rather than as one standalone
document. The user needs to open that set as one reviewable package, see which
artifacts and versions belong together, and move within the set without losing
package context.

1. Process produces a reviewable output set or package
2. User opens the package review workspace
3. System shows the package identity and included artifacts
4. User moves between package members
5. User understands which artifacts and versions belong to that package

In Epic 4, a package is a durable process-published snapshot of a fixed ordered
set of artifact versions. It is not a floating "latest artifacts" grouping.
When a process later publishes a new revision or a new package, the earlier
package remains reviewable as its own package snapshot.

Package-member review stays pinned to `member.versionId` while the user remains
inside package context. Epic 4 does not switch a package member into the
artifact's broader version history from inside package review.

#### Acceptance Criteria

**AC-4.1:** The user can open one process output set as one reviewable package.

- **TC-4.1a: Package review opens as one set**
  - Given: Process has a reviewable output set
  - When: User opens package review
  - Then: The package opens as one reviewable set rather than as unrelated standalone artifacts
- **TC-4.1b: Published package remains stable after later artifact revision**
  - Given: A process already published a package snapshot and one package member later gets a newer artifact version
  - When: User reopens the earlier package
  - Then: The package still points at the published member versions from that package snapshot

**AC-4.2:** The package review workspace shows which artifacts and versions
belong together in that package.

- **TC-4.2a: Package membership visible**
  - Given: User is reviewing one output package
  - When: The workspace renders
  - Then: The included artifacts and versions are visible as members of that package
- **TC-4.2b: Package member order remains visible**
  - Given: A package defines an ordered set of members
  - When: The package workspace renders
  - Then: Members appear in that package order

**AC-4.3:** When the user opens or switches to one member of the package, the
workspace keeps the package context visible and updates the reviewed member.

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

**AC-4.4:** If one package member is unavailable or unreadable, the package
workspace remains open and shows that member failure without hiding the healthy
members.

- **TC-4.4a: Package remains open when one member fails**
  - Given: A package contains one unreadable or unavailable member and other readable members
  - When: The package workspace renders
  - Then: The package remains open and only the failing member shows an unavailable or unsupported state

### 5. Exporting the Current Reviewed Package

The user sometimes needs a bounded export of the current reviewed package. The
export should reflect the versions currently included in the reviewed package
and should not require leaving the review workspace first.

1. User opens one reviewable package
2. User chooses to export that package
3. System prepares an export from the currently included artifact versions
4. User receives the export
5. User keeps the same review workspace context

In Epic 4, a package is exportable when the package exists durably and every
package member has durable content available for inclusion in the export.
Unsupported in-workspace rendering does not by itself block export. An
unavailable package member blocks export for that package until the package is
made fully available again.

#### Acceptance Criteria

**AC-5.1:** The user can export the currently reviewed package from the review
workspace.

- **TC-5.1a: Export current package**
  - Given: User is reviewing one exportable package
  - When: User exports the package
  - Then: The platform returns a zip export for that currently reviewed package
- **TC-5.1b: Export not falsely offered for non-exportable target**
  - Given: User is reviewing a target that is not currently exportable
  - When: The review workspace renders
  - Then: The platform does not falsely present an export path for that target

**AC-5.2:** The exported package reflects the artifact versions currently shown
in the review package rather than an unrelated or stale package composition.

- **TC-5.2a: Export matches reviewed versions**
  - Given: User is reviewing one package with identified artifact versions
  - When: User exports it
  - Then: The exported package reflects those reviewed versions
- **TC-5.2b: Export includes manifest of package and version identities**
  - Given: User exports one reviewed package
  - When: The export is prepared
  - Then: The export includes a manifest identifying the package and the artifact versions included in it

**AC-5.3:** If export preparation fails, the review workspace remains open and
shows a clear export failure without erasing the current review state.

- **TC-5.3a: Export failure does not close review**
  - Given: User is reviewing one package
  - When: Export preparation fails
  - Then: The review workspace remains open and the export failure is shown clearly
- **TC-5.3b: Expired export requires re-export**
  - Given: User previously received an export URL and that URL has expired
  - When: User attempts to use the expired export
  - Then: The platform requires a new export request without erasing the current review state

### 6. Returning Later and Handling Unavailable or Degraded Review State

The user may reload the review route, leave and return later, or try to open an
artifact or package that is no longer available. The review workspace needs to
restore durable review state cleanly and degrade one failing review target
without hiding the rest of the context.

The first-cut review workspace restores from durable review state. It does not
depend on a live-update subscription to remain usable.

1. User opens an artifact or package review workspace
2. User reloads, leaves and returns later, or encounters unavailable review
   data
3. System restores or degrades the review workspace from durable state
4. User understands what is still reviewable and what is unavailable

#### Acceptance Criteria

**AC-6.1:** Reloading or reopening the review workspace restores the latest
durable artifact or package review state without requiring an active
environment.

- **TC-6.1a: Reopen artifact review from durable state**
  - Given: User previously opened one artifact review workspace
  - When: User reloads or reopens it later
  - Then: The workspace restores the latest durable review state for that artifact version
- **TC-6.1b: Reopen package review from durable state**
  - Given: User previously opened one package review workspace
  - When: User reloads or reopens it later
  - Then: The workspace restores the latest durable review state for that package

**AC-6.2:** If the requested artifact, artifact version, or package is
unavailable, the platform shows an unavailable state and does not leak stale
review content.

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

**AC-6.3:** If one review section fails independently, the workspace remains
open and shows a bounded failure state without hiding the healthy review
context.

- **TC-6.3a: Artifact render failure does not hide review context**
  - Given: Artifact identity and version load successfully but render of the body fails
  - When: The review workspace renders
  - Then: The workspace remains open and shows a bounded render failure state
- **TC-6.3b: Package member failure does not hide healthy members**
  - Given: Package context loads successfully but one member fails independently
  - When: The package workspace renders
  - Then: The package remains open and healthy members remain available

---

## Data Contracts

### Browser Routes

| Route | Description |
|-------|-------------|
| `/projects/{projectId}/processes/{processId}/review` | Opens the review workspace for one process |

The review workspace stays process-aware. Route parameters or query state may
select whether the current target is one artifact or one package, but the route
still belongs to one process rather than to a global artifact library.

### Review Entry Integration

The existing process-surface `review` action is the canonical entry point into
Epic 4. The process surface enables that action when the current process has at
least one reviewable target under the reviewability rules defined in Flow 1.
Opening the review route from that action carries the current process context
forward and either opens the selected target directly or enters target-selection
state.

Return from the review workspace uses the same process route context that opened
review. Epic 4 may provide a direct back-to-process control and should also
support normal browser back navigation. It does not define a separate return
endpoint.

### Review Route Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetKind` | enum | No | `artifact` or `package` when the browser opens one explicit review target |
| `targetId` | string | No | Explicit artifact or package identifier when the browser opens one explicit review target |
| `versionId` | string | No | Explicit artifact version identifier when the browser opens one explicit artifact version |
| `memberId` | string | No | Explicit package member identifier when the browser opens one member inside a package |

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get process review workspace | GET | `/api/projects/{projectId}/processes/{processId}/review` | Returns the current review workspace bootstrap for one process |
| Get artifact review target | GET | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns review data for one artifact and its versions; optional query state may select one version |
| Get package review target | GET | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns review data for one output package; optional query state may select one member |
| Export reviewed package | POST | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}/export` | Exports the currently reviewed package |

### Review Endpoint Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versionId` | string | No | Explicit artifact version to review when calling an artifact review endpoint |
| `memberId` | string | No | Explicit package member to focus when calling a package review endpoint |

### Process Review Workspace Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| project | Review Workspace Project Context | yes | present | Parent project identity |
| process | Process Review Context | yes | present | Active process identity and current review context |
| availableTargets | array of Review Target Summary | yes | present | Reviewable targets available in the current process review context |
| target | Review Target | no | present when one target is selected | Current reviewed artifact or package target |

### Review Workspace Project Context

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| projectId | string | yes | non-empty | Stable parent project identifier |
| name | string | yes | non-empty | Parent project display name |
| role | enum | yes | `owner` or `member` | Current user's role in the parent project |

### Process Review Context

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| processId | string | yes | non-empty | Stable process identifier |
| displayLabel | string | yes | non-empty | Process display label |
| processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation` | Process type |
| reviewTargetKind | enum | no | `artifact` or `package` when present | Current selected review target kind |
| reviewTargetId | string | no | non-empty when present | Current selected review target identifier |

### Review Target Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| position | integer | yes | `>= 0` | Review-target order within the current process review context, as published by the process; when no explicit order is published, targets fall back to newest-first durable publication order |
| targetKind | enum | yes | `artifact` or `package` | Review target kind |
| targetId | string | yes | non-empty | Stable review target identifier |
| displayName | string | yes | non-empty | Human-readable target label |

**Sort order:** Available review targets are ordered by `position`.

### Review Target

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| targetKind | enum | yes | `artifact` or `package` | What the current review target is |
| displayName | string | yes | non-empty | Human-readable target label |
| status | enum | yes | `ready`, `empty`, `error`, `unsupported`, or `unavailable` | Current review target state; `empty` means no target is currently selected in target-selection state or no reviewable targets currently exist |
| artifact | Artifact Review Target | no | present when `targetKind` is `artifact` | Artifact review data |
| package | Package Review Target | no | present when `targetKind` is `package` | Package review data |
| error | Review Target Error | no | present when `status` is `error`, `unsupported`, or `unavailable` | Review-target-scoped failure shown without failing the whole review workspace |

### Artifact Review Target

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact display name |
| currentVersionId | string | no | non-empty when present | Current durable version identifier |
| currentVersionLabel | string | no | non-empty when present | Current durable version label |
| selectedVersionId | string | no | non-empty when present | Currently reviewed version identifier |
| versions | array of Artifact Version Summary | yes | present | Available reviewable versions for this artifact |
| selectedVersion | Artifact Version Detail | no | present when the selected version is reviewable | Reviewed version detail |

### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| versionId | string | yes | non-empty | Stable version identifier |
| versionLabel | string | yes | non-empty | Human-readable version or revision label |
| isCurrent | boolean | yes | boolean | Whether this is the current durable version |
| createdAt | string | yes | ISO 8601 UTC | Time the version became durable |

**Sort order:** Versions are ordered newest to oldest by `createdAt`.

### Artifact Version Detail

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| versionId | string | yes | non-empty | Stable version identifier |
| versionLabel | string | yes | non-empty | Human-readable version or revision label |
| contentKind | enum | yes | `markdown` or `unsupported` | Review presentation kind in this first-cut workspace |
| bodyStatus | enum | no | `ready` or `error` when present | State of the reviewed body when `contentKind` is `markdown` |
| body | string | no | present when `contentKind` is `markdown` and `bodyStatus` is `ready` | Markdown body for the reviewed version |
| bodyError | Review Target Error | no | present when `contentKind` is `markdown` and `bodyStatus` is `error` | Bounded render failure for the reviewed body |
| mermaidBlocks | array of Mermaid Block | no | present when Mermaid content exists | Mermaid blocks extracted for in-workspace rendering |
| createdAt | string | yes | ISO 8601 UTC | Time the version became durable |

### Mermaid Block

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| blockId | string | yes | non-empty | Stable identifier for one Mermaid block in the reviewed version |
| source | string | yes | non-empty | Mermaid source text |

### Package Review Target

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| packageId | string | yes | non-empty | Stable package identifier |
| displayName | string | yes | non-empty | Package display name |
| packageType | string | yes | non-empty | User-visible process-supplied package kind label |
| members | array of Package Member | yes | present | Artifacts and versions that belong to this package |
| selectedMemberId | string | no | non-empty when present | Currently selected package member |
| selectedMember | Package Member Review | no | present when one member is selected | Currently reviewed package member detail within package context |

**Sort order:** Package members are ordered by the package's defined review
order.

### Package Member

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| memberId | string | yes | non-empty | Stable package member identifier |
| position | integer | yes | `>= 0` | Package-defined review order position |
| artifactId | string | yes | non-empty | Artifact identifier for this member |
| displayName | string | yes | non-empty | Artifact display name in the package |
| versionId | string | yes | non-empty | Durable artifact version identifier for this package snapshot member |
| versionLabel | string | yes | non-empty | Durable artifact version label for this package snapshot member |
| status | enum | yes | `ready`, `unsupported`, or `unavailable` | Reviewability state for this member |

### Package Member Review

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| memberId | string | yes | non-empty | Stable package member identifier |
| artifact | Artifact Review Target | yes | present | Reviewed artifact-version detail for the currently selected package member |

### Export Package Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| exportId | string | yes | non-empty | Stable export identifier |
| downloadName | string | yes | non-empty | Suggested file name for the export |
| downloadUrl | string | yes | valid URL | Download location for the exported package |
| contentType | string | yes | `application/zip` | First-cut export content type |
| expiresAt | string | yes | ISO 8601 UTC | Time the export URL expires |

The first-cut export format is a zip archive containing one file per package
member plus a manifest describing the package identity and the included artifact
version identities. After `expiresAt`, the user must request a new export.

### Review Target Error

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | yes | non-empty | Stable machine-readable review error code |
| message | string | yes | non-empty | Human-readable review error summary |

### Review Target Error Codes

| Code | Description |
|------|-------------|
| `REVIEW_TARGET_UNSUPPORTED` | The current target or selected member cannot be rendered in the first-cut review workspace, but its identity remains visible |
| `REVIEW_RENDER_FAILED` | The current target identity loaded, but bounded body or diagram rendering failed |
| `REVIEW_MEMBER_UNAVAILABLE` | One package member is unavailable in the current package review context |

### Review Failure Boundary

Request-level review errors apply only when the platform cannot resolve or
authorize the requested project, process, artifact, artifact version, or
package, or when export preparation cannot be started or completed as a request.

Once project identity, process identity, and review-target identity load
successfully, later unsupported-format states, artifact-body render failures,
Mermaid render failures, and individual package-member failures remain inside
the open review workspace as bounded degraded states. Those later failures do
not replace the whole review workspace with a request-level error response.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 404 | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| 404 | `REVIEW_TARGET_NOT_FOUND` | Requested artifact, artifact version, or package does not exist in the requested review context |
| 409 | `REVIEW_EXPORT_NOT_AVAILABLE` | Requested review target cannot currently be exported |
| 503 | `REVIEW_EXPORT_FAILED` | Export preparation failed |

---

## Dependencies

Technical dependencies:

- Epic 2 durable process work surface and current-materials visibility
- Epic 3 durable artifact/output checkpointing and review entry from the process surface
- Durable artifact and artifact-version persistence
- Fastify-owned review routes and shared client/server contract surfaces
- Markdown and Mermaid rendering inside the app-owned review workspace

Process dependencies:

- Downstream process-specific epics to define which artifact sets constitute a reviewable package for each process type

---

## Non-Functional Requirements

### Performance

- The review workspace renders a markdown artifact of up to 200 KB within 2
  seconds under normal conditions
- The review workspace renders a package of up to 20 members within 2 seconds
  under normal conditions
- Switching between already-known versions of the same artifact updates within 1
  second under normal conditions
- Export preparation for one bounded package begins within 2 seconds under
  normal conditions

### Security

- All review routes and APIs require authenticated access
- Project and process access are enforced server-side
- The review workspace does not leak unavailable artifact content, unavailable
  package members, or revoked review targets through direct URLs
- Export URLs are bounded and expire after issuance

### Reliability

- Review remains available from durable artifact state even when no active
  environment exists
- A failed Mermaid block render does not fail the whole artifact review
- One unavailable package member does not fail the whole package review
- Reloading or reopening the review workspace restores the same durable review
  target

### Accessibility

- Review navigation, version selection, and export actions are keyboard
  reachable
- Artifact identity, version identity, and review-target status are available as
  readable text, not color alone
- Mermaid render failures and unsupported-format states are available as
  readable text

### Observability

- Artifact review opens, package review opens, and export failures are logged
  with request context, project ID, process ID, and target ID
- Mermaid render failures are traceable by artifact ID and version ID
- Export requests and export failures are traceable by package ID

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. What exact durable schema should represent artifact versions and version
   content without collapsing generic artifact storage into one process-specific
   ontology?
2. What exact review-route and browser-state model should preserve process-aware
   review context while allowing direct reopen of one artifact or package?
3. What exact markdown and Mermaid rendering strategy should the app use inside
   the Fastify/Vite platform boundary?
4. What exact package membership model should define a reviewable output set in
   the generic platform layer before process-specific epics enrich it further?
5. What exact fallback path should the workspace use for unsupported artifact
   formats in this slice?
6. How should review-target failures degrade when identity loads but rendering
   or one package member fails?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Create the shared review foundation: artifact-version vocabulary, review target
contracts, package membership shapes, review error classes, markdown/Mermaid
fixture content, and test helpers used by all later stories.

### Story 1: Review Entry and Workspace Bootstrap

**Delivers:** The user can open a process-aware review workspace and stay tied
to the same process context.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (open review from process work surface)
- AC-1.2 (process-aware review context visible)
- AC-1.3 (artifact vs package target identified)
- AC-1.4 (return from review to same process)

### Story 2: Artifact Versions and Revision Review

**Delivers:** The user can review the current and prior durable versions of one
artifact.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (new version becomes current while prior version remains reviewable)
- AC-2.2 (artifact and version identity visible)
- AC-2.3 (prior version opens distinctly)
- AC-2.4 (clear no-version state)

### Story 3: Markdown and Mermaid Review

**Delivers:** The user can read markdown artifacts and Mermaid diagrams inside
the review workspace.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (markdown structure preserved)
- AC-3.2 (Mermaid renders in workspace)
- AC-3.3 (Mermaid failure degrades locally)
- AC-3.4 (unsupported artifact fallback)

### Story 4: Package Review Workspace

**Delivers:** The user can review one multi-artifact output set as one package.
**Prerequisite:** Story 3
**ACs covered:**

- AC-4.1 (open one process output set as one package)
- AC-4.2 (package membership visible)
- AC-4.3 (package context preserved while reviewing one member)
- AC-4.4 (one failing member does not hide healthy package members)

### Story 5: Package Export

**Delivers:** The user can export the currently reviewed package from the review
workspace.
**Prerequisite:** Story 4
**ACs covered:**

- AC-5.1 (export current reviewed package)
- AC-5.2 (export matches reviewed versions)
- AC-5.3 (export failure does not erase review state)

### Story 6: Reopen, Unavailable, and Degraded Review States

**Delivers:** The review workspace remains usable across reopen and bounded
failure scenarios.
**Prerequisite:** Story 5
**ACs covered:**

- AC-6.1 (reopen artifact/package review from durable state)
- AC-6.2 (unavailable artifact/version/package state)
- AC-6.3 (bounded degraded review state)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover happy, alternate, export, reopen, and degraded-state paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at browser/server review boundaries
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] Archive browsing, broader source-management, and generalized review-framework work are explicitly deferred
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
