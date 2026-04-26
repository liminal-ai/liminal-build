# Epic 5: Artifact Model and Review Provenance Alignment

This epic defines the complete requirements for artifact model and review
provenance alignment in Liminal Build. It serves as the source of truth for the
Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who builds work across multiple related processes inside one project.
**Context:** The user accumulates durable artifacts across planning,
specification, implementation, and review work. They need those artifacts to
remain stable project assets even when later processes revise, review, or
package them.
**Mental Model:** "Artifacts belong to the project. Processes work with them,
create new versions of them, and package them together, but no single process
owns the artifact itself."
**Key Constraint:** This epic must realign artifact behavior inside the existing
project shell, process work surface, and review/package surfaces without adding
a separate standalone artifact-management product surface.

---

## Feature Overview

This feature realigns the platform's artifact behavior so artifacts behave as
durable project-level assets with version-level process provenance rather than
as objects that implicitly belong to one primary process. After it ships, a
process can reference an existing project artifact, create a new version of an
artifact first produced elsewhere, review artifacts it currently works with
even when they were created by other processes, and publish reviewable packages
that combine pinned versions from multiple processes in the same project. This
epic corrects the platform model beneath Epic 4's review and package surface so
later source-management work can inherit a stable artifact world.

---

## Scope

### In Scope

This epic realigns artifact ownership, reference, provenance, and review/package
behavior across the existing platform surfaces:

- Treat artifacts as project-level durable entities rather than process-owned
  rows
- Allow processes to reference existing project artifacts without taking
  ownership of them
- Allow later processes to create new versions of existing project artifacts
  while preserving version-level provenance
- Realign process review behavior so eligibility depends on process reference
  and pinned version context rather than a single primary-process field on the
  artifact
- Realign package publication and package review so pinned package members may
  come from multiple processes in the same project
- Keep project artifact state deduplicated at the project level even when
  several processes reference the same artifact
- Preserve durable reopen, unavailable, and degraded behavior when artifact
  references or pinned versions become unavailable

This epic works inside the current surfaces:

- the project shell remains the current project-level read surface for artifacts
- the process work surface remains the current process-level read surface for
  current materials
- the review workspace remains the current artifact and package review surface

### Out of Scope

- Full source-attachment management behavior now covered by Epic 6
- Full archive, turn, chunk, and derived-view behavior planned after Epic 6
- Cross-project artifact sharing
- A standalone artifact library or artifact administration UI
- Process-specific orchestration modules beyond the artifact/review/package
  behavior needed for this alignment
- Full documentation backfill or onboarding-pack refresh

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Artifacts remain scoped to exactly one project | Validated | Platform | This epic removes single-process artifact ownership, not project containment |
| A2 | Epic 4's review and package surfaces remain the user-facing review surfaces | Validated | Platform | This epic corrects their behavior rather than replacing them |
| A3 | Processes may hold bounded current artifact references without that working set becoming the full canonical membership model | Validated | Platform | This epic may preserve "current refs" while realigning durable ownership |
| A4 | Version-level provenance remains meaningful even when multiple processes revise the same artifact over time | Validated | Platform | A later process may create a new version of an artifact first produced elsewhere |
| A5 | Package snapshots continue to pin explicit artifact versions rather than float to whichever version is current later | Validated | Platform | Cross-process spec packs depend on version pinning |
| A6 | Source-management work in Epic 6 should inherit the aligned artifact model rather than redefine it | Validated | Platform | This epic is a prerequisite alignment step for Epic 6 |

---

## PRD Backfills

This epic requires clarifications in `docs/spec-build/v2/core-platform-prd.md`
to keep the implementation sequence and the platform model aligned.

| PRD Area | Backfill | Why |
|----------|----------|-----|
| Feature sequencing between Feature 4 and Feature 5 | The platform may require an interstitial artifact-model alignment epic after review/package surfaces ship and before broader source-management work begins | Epic 6 should inherit an aligned artifact world rather than absorb platform-model correction and source-management scope in the same epic |
| Review/package eligibility model | Package publication eligibility is bounded by current process reference and pinned package context rather than by the full project artifact set | Keeps Epic 5's package rules aligned with the architecture and downstream source-management assumptions |

---

## Flows & Requirements

### 1. Referencing Project Artifacts From Process Work

The user needs a process to work with project artifacts that may already have
history from earlier processes. That relationship must be a process reference,
not a transfer of artifact ownership. A process may bring an existing project
artifact into its current materials or create a new artifact that immediately
becomes part of the project's artifact set.

1. User opens a project shell or process work surface
2. User creates a new artifact or brings an existing project artifact into the
   current process context
3. System records the artifact as part of the project's durable artifact set
4. System records that the current process is working with that artifact
5. User sees the artifact in the current process materials and in the project's
   artifact state

#### Acceptance Criteria

**AC-1.1:** A process can reference an existing artifact in the same project
without becoming the artifact's sole owner.

- **TC-1.1a: Existing project artifact added to process**
  - Given: A project already has a durable artifact
  - When: A later process begins working with that artifact
  - Then: The process can reference the artifact without replacing prior
    artifact provenance
- **TC-1.1b: Later process reference does not erase earlier process lineage**
  - Given: An artifact was first created or revised by an earlier process
  - When: A later process references that artifact
  - Then: Earlier artifact provenance remains intact

**AC-1.2:** A new artifact created during process work is immediately part of
the project's artifact set.

- **TC-1.2a: New process artifact appears in project artifact state**
  - Given: A process creates a new artifact
  - When: The creation settles durably
  - Then: The artifact appears in the project's artifact state without a
    separate add-to-project step
- **TC-1.2b: Project artifact state remains deduplicated**
  - Given: Several processes later reference the same artifact
  - When: The project artifact state is read
  - Then: That artifact appears as one durable project artifact, not one row per
    process reference

**AC-1.3:** Process-local artifact visibility reflects current process
reference, not artifact ownership.

- **TC-1.3a: Current process materials show referenced artifact**
  - Given: A process currently references an artifact
  - When: The process work surface is loaded
  - Then: The artifact appears in that process's current materials
- **TC-1.3b: Unrelated process does not gain automatic current-material
  visibility**
  - Given: One process currently references an artifact
  - When: Another process in the same project loads its current materials
  - Then: The artifact is not shown as current for that unrelated process unless
    that process also references it

### 2. Creating New Artifact Versions Without Reassigning the Artifact

The user needs later processes to produce new revisions of existing project
artifacts without the artifact becoming attached to one primary process. Each
revision must keep its producing-process provenance while the artifact itself
remains stable at the project level.

1. User starts or resumes a process with one or more current artifacts
2. Process work produces a revised artifact output
3. System stores a new artifact version
4. System records the producing process as provenance for that version
5. System updates project artifact summaries and process current-material reads
   to show the latest version

#### Acceptance Criteria

**AC-2.1:** When a process revises an existing project artifact, the system
creates a new version instead of transferring artifact ownership to the
revising process.

- **TC-2.1a: New revision becomes new version**
  - Given: A process revises an existing artifact
  - When: Checkpointed artifact output is persisted
  - Then: A new artifact version is created for the same artifact
- **TC-2.1b: Artifact is not reassigned to one primary process**
  - Given: An artifact already has history from an earlier process
  - When: A later process persists a new version
  - Then: The artifact is not rewritten as if it now belongs only to the later
    process

**AC-2.2:** Version-level provenance identifies which process produced each
artifact revision.

- **TC-2.2a: Producing process recorded on version**
  - Given: A new artifact version is created
  - When: Version provenance is read later
  - Then: The producing process for that version is visible
- **TC-2.2b: Earlier version provenance remains readable**
  - Given: An artifact has versions produced by multiple processes
  - When: Earlier versions are reviewed
  - Then: Each earlier version still shows the process that produced it

**AC-2.3:** Current artifact summaries resolve the latest version correctly
after multi-process revision history.

- **TC-2.3a: Latest version shown after later process revision**
  - Given: A later process created a new artifact version
  - When: Current artifact summaries are loaded
  - Then: The summaries show the latest current version label and update time
- **TC-2.3b: Earlier versions remain reviewable**
  - Given: An artifact has more than one version
  - When: The user opens artifact review
  - Then: Earlier versions remain available for selection and review

### 3. Reviewing Artifacts From the Process That Uses Them

The user needs artifact review from within a process to follow the process's
current artifact context and pinned review targets, not a single primary-process
field on the artifact itself. A process must be able to review artifacts it is
currently working with even when those artifacts were created or last revised by
other processes. This flow also settles how zero-version artifacts appear in the
review experience so the process entry path and direct review path behave
consistently.

In Epic 5, the bounded zero-version review state applies only when the artifact
exists but no explicit `versionId` was requested. If a caller explicitly
requests a `versionId` for an artifact that has zero versions, that request is
treated as an unavailable explicit-version lookup rather than as the bounded
empty artifact state.

1. User opens a process that currently references one or more artifacts
2. User chooses review from that process context
3. System determines which artifacts are reviewable for that process
4. User opens one artifact and optionally selects a specific version
5. System displays the requested artifact review state

#### Acceptance Criteria

**AC-3.1:** A process can review an artifact it currently references even if
that artifact was created or later revised by another process.

- **TC-3.1a: Reviewable referenced artifact from earlier process**
  - Given: A process currently references an artifact created by an earlier
    process
  - When: The user enters artifact review from the current process
  - Then: That artifact is available for review
- **TC-3.1b: Reviewable referenced artifact after later revision by another
  process**
  - Given: A process currently references an artifact later revised by a
    different process
  - When: The user opens review from the current process
  - Then: The artifact remains reviewable from that process context

**AC-3.2:** Artifact review eligibility is based on process reference or pinned
review context, not on a single artifact-level primary-process field.

- **TC-3.2a: Review not blocked by primary-process mismatch**
  - Given: A process has legitimate review context for an artifact
  - When: The artifact was last revised by a different process
  - Then: Review still succeeds
- **TC-3.2b: Unrelated artifacts remain unavailable**
  - Given: A process does not reference an artifact and has no pinned review
    context for it
  - When: The user requests review of that unrelated artifact
  - Then: The system returns a bounded unavailable result

**AC-3.3:** Artifact review preserves explicit version selection across
cross-process artifact histories.

- **TC-3.3a: Selected earlier version remains reviewable**
  - Given: An artifact has versions from multiple processes
  - When: The user selects an earlier version in review
  - Then: The requested earlier version is displayed
- **TC-3.3b: Current-version review remains stable after newer versions exist**
  - Given: A process opens review for an artifact with later revisions
  - When: The user reviews the current version
  - Then: The latest current version is shown without hiding earlier pinned
    review paths

**AC-3.4:** Zero-version artifacts are excluded from the default review target
list, but direct review access returns a bounded empty review state instead of
an unavailable error.

- **TC-3.4a: Zero-version artifact omitted from default review target list**
  - Given: A process references an artifact with no versions yet
  - When: The user enters review from that process
  - Then: That artifact does not appear in the default review target list
- **TC-3.4b: Zero-version direct review path returns empty state**
  - Given: A user navigates directly to review for an artifact with no versions
  - When: The review target resolves
  - Then: The user sees a bounded empty review state rather than an unavailable
    error
- **TC-3.4c: Explicit version request against zero-version artifact is rejected**
  - Given: A user requests review for an artifact that has zero versions and
    supplies an explicit `versionId`
  - When: The review target resolves
  - Then: The system returns `ARTIFACT_VERSION_NOT_FOUND` rather than the
    bounded empty zero-version state

### 4. Publishing and Reviewing Cross-Process Packages

The user needs packaged outputs such as spec packs to combine pinned artifact
versions from more than one process in the same project. Package review and
package export must remain stable even when the package mixes versions produced
by different processes.

In Epic 5, a process's current package-building context is the bounded set of
artifact versions it may legitimately publish from current work:

- the current version of any artifact the publishing process currently
  references
- any explicit earlier version already pinned in that same process's current
  package draft, edit, or reopenable package context

Artifact versions elsewhere in the project remain out of context until that
process first brings them into current reference or pinned package context.

1. User or process publishes a package from a process context
2. The package includes one or more pinned artifact versions
3. Those versions may have been produced by different processes in the same
   project
4. User opens package review or package export later
5. System resolves the pinned package members and displays or exports the
   package

#### Acceptance Criteria

**AC-4.1:** A package may contain pinned artifact versions produced by multiple
processes in the same project.

- **TC-4.1a: Mixed-producer package allowed**
  - Given: A process is publishing a package in a project
  - When: The package includes versions produced by more than one process in
    that project
  - Then: The package can be published successfully
- **TC-4.1b: Cross-project package member blocked**
  - Given: A package member version belongs to a different project
  - When: The package is published
  - Then: The system rejects that package publication

**AC-4.2:** A process can publish a package from artifact versions in its
current package-building context, defined as current process references plus
versions already pinned in that same process's current package draft/edit
context, even when those versions were produced by other processes.

- **TC-4.2a: Publishing process can package referenced upstream versions**
  - Given: A process currently references artifact versions produced by earlier
    processes in the same project
  - When: The process publishes a package
  - Then: Those referenced upstream versions may be included in the package
- **TC-4.2b: Unrelated project artifact version not in current package-building
  context is blocked**
  - Given: A project contains an artifact version that is neither currently
    referenced by the publishing process nor already pinned in that process's
    current package draft/edit context
  - When: The process publishes a package
  - Then: The system rejects use of that unrelated artifact version
- **TC-4.2c: Earlier pinned version remains eligible**
  - Given: A process is reopening or editing a package that already pins an
    earlier artifact version from the same project
  - When: The process republishes or re-exports that package context
  - Then: That already-pinned earlier version remains eligible even if a newer
    version now exists

**AC-4.3:** Package review resolves pinned member versions rather than drifting
to whichever artifact version is current later.

- **TC-4.3a: Package member opens pinned version**
  - Given: A package member pins a specific artifact version
  - When: The user opens that member in package review later
  - Then: The pinned version is shown
- **TC-4.3b: Newer later artifact version does not replace pinned package
  member**
  - Given: A newer artifact version exists after the package was published
  - When: The user reviews the package
  - Then: The package still resolves the originally pinned member version

**AC-4.4:** Package review and package export remain available when a package
mixes artifact versions from multiple processes.

- **TC-4.4a: Mixed-producer package review succeeds**
  - Given: A package contains pinned versions from multiple processes
  - When: The user opens package review
  - Then: The package review surface resolves successfully
- **TC-4.4b: Mixed-producer package export succeeds**
  - Given: A package contains pinned versions from multiple processes
  - When: The user exports the package
  - Then: The package export succeeds with the pinned package contents

### 5. Reopen, Unavailable, and Degraded Artifact Provenance States

The user may return later after more work has happened, or a referenced artifact
version may become unavailable while other project artifacts remain healthy. The
platform needs bounded degraded behavior that reflects artifact reference and
version provenance accurately instead of failing because of a stale process
ownership assumption. It also needs review-workspace bootstrap errors to be
classified accurately so artifact/package availability failures do not surface
as unrelated export failures or generic mismatched errors.

1. User returns later to a process work surface or review workspace
2. System reloads artifact summaries, current materials, review targets, and
   pinned package members
3. One or more artifacts or versions may now be unavailable or stale
4. System shows the latest durable state and bounded degraded results where
   needed

#### Acceptance Criteria

**AC-5.1:** Returning later restores the latest durable artifact and package
state without depending on a single primary-process assignment.

- **TC-5.1a: Reopen process artifact materials after later cross-process
  updates**
  - Given: An artifact has been revised by another process
  - When: The user returns later to a process that still references that
    artifact
  - Then: The latest durable artifact state is restored for that process
- **TC-5.1b: Reopen package review after later artifact activity**
  - Given: A package was published earlier
  - When: The user returns later to review that package
  - Then: The package still resolves its pinned member versions

**AC-5.2:** If one referenced artifact or pinned version is unavailable, the
rest of the process or package state remains readable where possible.

- **TC-5.2a: One unavailable artifact does not fail unrelated current materials**
  - Given: A process references several artifacts
  - When: One referenced artifact is unavailable
  - Then: The remaining readable materials still load
- **TC-5.2b: One unavailable package member does not remove unrelated package
  members**
  - Given: A package contains multiple members
  - When: One pinned member becomes unavailable
  - Then: The package still shows the remaining members and bounded degradation
    for the unavailable member

**AC-5.3:** Unavailable or degraded review states describe reference or version
   availability accurately rather than implying a primary-process ownership
   failure.

- **TC-5.3a: Artifact review unavailable reason reflects missing reference or
  missing version**
  - Given: Artifact review cannot be resolved
  - When: The failure is surfaced to the user
  - Then: The unavailable state describes the actual missing artifact or version
    condition
- **TC-5.3b: Package member unavailable reason reflects pinned-version failure**
  - Given: A package member can no longer resolve its pinned artifact version
  - When: The user opens package review
  - Then: The unavailable state reflects that pinned-version failure rather than
    a primary-process mismatch

**AC-5.4:** Review-workspace bootstrap and follow-up read failures are
classified according to the actual artifact, version, or package condition.

- **TC-5.4a: Missing review target not surfaced as export failure**
  - Given: Review workspace bootstrap cannot resolve the requested artifact or
    package target
  - When: The failure is returned to the client
  - Then: The response is classified as a review-target failure rather than as
    an export failure
- **TC-5.4b: Artifact-version and package-member failures remain distinct**
  - Given: Review bootstrap or follow-up reads fail for different reasons
  - When: The failure is surfaced to the user
  - Then: Missing artifact target, missing artifact version, and unavailable
    package member conditions remain distinguishable

---

## Data Contracts

This epic reuses the existing project shell, process work surface, and review
workspace routes. It changes the meaning of artifact ownership and reviewability
within those surfaces rather than introducing a new top-level route family.

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get project shell | GET | `/api/projects/{projectId}` | Returns project-level artifact state with project-scoped artifact identity and latest version summary |
| Get process work surface | GET | `/api/projects/{projectId}/processes/{processId}` | Returns process-local current artifact materials and current outputs without implying artifact ownership |
| Get review workspace | GET | `/api/projects/{projectId}/processes/{processId}/review` | Returns process-scoped review targets based on process reference and package context |
| Get artifact review target | GET | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns one artifact's version list and selected review state for that process context |
| Get package review target | GET | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns one package with pinned member versions even when members were produced by multiple processes |

Artifact review may optionally request an explicit `versionId`. If no
`versionId` is requested and the artifact has zero versions, the bounded
zero-version review state is returned. If an explicit `versionId` is requested
and that version cannot be resolved, including for a zero-version artifact, the
request fails as `ARTIFACT_VERSION_NOT_FOUND`.

### Project Artifact Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Human-readable artifact name |
| currentVersionLabel | string | no | non-empty when present | Latest current version label |
| updatedAt | timestamp | yes | ISO 8601 UTC | Latest durable update time for this artifact |

### Process Artifact Reference

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact name in process context |
| currentVersionLabel | string | no | non-empty when present | Latest current version label for the artifact |
| roleLabel | string | no | non-empty when present | Process-local description such as current working artifact or referenced artifact |
| updatedAt | timestamp | yes | ISO 8601 UTC | Latest durable artifact update time |

### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| versionId | string | yes | non-empty | Stable artifact version identifier |
| versionLabel | string | yes | non-empty | User-visible version label |
| createdAt | timestamp | yes | ISO 8601 UTC | Version creation timestamp |
| producedByProcessId | string | yes | non-empty | Process that created this version |

### Zero-Version Artifact Review State

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Requested artifact identifier |
| status | enum | yes | `empty` | Indicates the artifact exists but has no versions yet |
| displayName | string | yes | non-empty | Artifact display name |
| versions | array | yes | empty | No versions are currently available for review |

### Package Member

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| memberId | string | yes | non-empty | Stable package member identifier |
| artifactId | string | yes | non-empty | Artifact represented by this member |
| artifactVersionId | string | yes | non-empty | Pinned artifact version for this member |
| displayName | string | yes | non-empty | Member display name |
| versionLabel | string | yes | non-empty | Pinned version label |

### Package Publication Eligibility Rule

In Epic 5, a requested package member is allowed only when:

- the member's artifact belongs to the same project
- the member version is either the current version of an artifact the
  publishing process currently references, or an explicit version already pinned
  in that same process's current package draft/edit context

Supplying an explicit artifact version outside that bounded context is rejected
as `PACKAGE_MEMBER_NOT_ALLOWED`.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 404 | `REVIEW_TARGET_NOT_FOUND` | Requested artifact or package review target is not available in the current process review context |
| 404 | `ARTIFACT_VERSION_NOT_FOUND` | Requested artifact version is unavailable |
| 404 | `PACKAGE_MEMBER_UNAVAILABLE` | Requested package member's pinned artifact version is unavailable |
| 409 | `PACKAGE_MEMBER_NOT_ALLOWED` | Requested package publication contains a member version outside the publishing process's current package-building context or outside the current project |

---

## Dependencies

Technical dependencies:
- Existing artifact version storage and artifact checkpointing from Epic 4
- Existing review workspace and package review/export surfaces from Epic 4
- Existing project shell and process work surface routes from Epics 1 and 2

Process dependencies:
- Epic 6 source-management work should sequence after this epic
- Any process-module epic that publishes cross-process spec packs should build
  on this aligned artifact model rather than on the prior single-primary-process
  assumption

---

## Non-Functional Requirements

- Cross-process artifact revision history must remain durable across reload,
  reopen, and return-later behavior
- One unavailable artifact or one unavailable package member must not fail an
  otherwise readable process or package surface
- Review and package read behavior must remain coherent under mixed-producer
  artifact history
- Review-workspace bootstrap and follow-up reads must classify failures
  consistently across artifact, version, package-member, and zero-version states
- Observability should distinguish missing artifact reference, missing artifact
  version, and unavailable package member states

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. Should durable process-to-artifact relationship beyond current working-set
   refs be modeled through a dedicated relation table or by extending the
   existing current-ref model?
2. Which existing artifact summary fields should be removed versus preserved as
   derived process-local display fields?
3. How should current review-target eligibility be computed so it remains
   process-scoped without depending on single-process artifact ownership?
4. How should the already-defined current package-building context be
   represented durably so package publish, review, and reopen flows share the
   same bounded member set?
5. What is the cleanest migration path for persisted artifact rows and review
   tests that currently assume a primary process on the artifact row?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Establish aligned artifact vocabulary, fixtures, and contract changes for
project-level artifacts, process artifact references, version provenance, and
cross-process package members, including the explicit package-building context
rule.

### Story 1: Project Artifact Association Without Process Ownership

**Delivers:** Processes can reference existing project artifacts and new
process-created artifacts automatically join the project artifact set without
becoming single-process-owned.
**Prerequisite:** Story 0
**ACs covered:**
- AC-1.1
- AC-1.2
- AC-1.3

### Story 2: Versioned Checkpoint Realignment

**Delivers:** Later processes can create new versions of existing artifacts
without reassigning artifact ownership, while version provenance remains
visible.
**Prerequisite:** Story 1
**ACs covered:**
- AC-2.1
- AC-2.2
- AC-2.3

### Story 3: Process-Scoped Artifact Review Realignment

**Delivers:** Artifact review follows process reference and pinned review
context instead of artifact-row primary ownership, including one explicit
zero-version reviewability rule.
**Prerequisite:** Story 2
**ACs covered:**
- AC-3.1
- AC-3.2
- AC-3.3
- AC-3.4

### Story 4: Cross-Process Package Alignment

**Delivers:** Packages can include pinned artifact versions from multiple
processes in the same project, remain constrained to the publishing process's
current package-building context, and remain reviewable and exportable.
**Prerequisite:** Story 3
**ACs covered:**
- AC-4.1
- AC-4.2
- AC-4.3
- AC-4.4

### Story 5: Reopen and Degraded Provenance States

**Delivers:** Durable reopen and bounded degraded behavior across artifact
review, package review, and process materials after cross-process artifact
history evolves, with accurate review-workspace error taxonomy.
**Prerequisite:** Story 4
**ACs covered:**
- AC-5.1
- AC-5.2
- AC-5.3
- AC-5.4

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover all paths (happy, alternate, cancel/error)
- [ ] Every AC is testable (no vague terms)
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are fully specified at system boundaries
- [ ] Scope boundaries are explicit (in/out/assumptions)
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] All validator issues addressed
- [ ] Validation rounds complete
- [ ] Self-review complete
