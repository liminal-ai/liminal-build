# Epic 6: Source Attachments and Canonical Source Management

This epic defines the complete requirements for Liminal Build source
attachments and canonical source management. It serves as the source of truth
for the Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who needs to attach code repositories to project and process work,
control how those repositories are used, and understand which canonical sources
informed or received process work.
**Context:** The user is working in a project shell or process work surface and
needs to attach one or more repositories, classify them for research, review,
or implementation, control whether they are writable, see whether they are
`not_hydrated`, `hydrated`, `stale`, or `unavailable`, and later understand
where durable code work landed.
**Mental Model:** "This process works from named canonical sources. I can see
which repositories are attached, what they are for, whether they are writable,
whether they are hydrated, and which repository and ref this work came from or
went back to."
**Key Constraint:** Source management must stay inside the existing project and
process surfaces and must keep GitHub as canonical code truth without pulling
archive browsing, external-source attachment, or full GitHub workflow
management into the same epic.

---

## Feature Overview

This feature makes source attachments a real managed part of the platform.
After it ships, the user can attach repositories to a project or to one
process, set or update purpose, access mode, and target ref, see hydration and
freshness state across the project and process surfaces, request rehydration
when the attached source is `stale` or `not_hydrated`, detach sources without
erasing the history of work that already used them, and review provenance
showing which repository and ref informed or received code work. This epic is
the first
source-management implementation epic derived from PRD Feature 5, and it
sequences after Epic 5's artifact-model alignment. It covers source attachment
lifecycle and canonical-source management while explicitly inheriting the
aligned artifact model where artifacts remain project-level assets and process
materials remain reference-based. Full archive, turn, chunk, and derived-view
behavior are deferred to Epic 7. External-source and MCP-backed attachment
flows are deferred to later source-integration work beyond the current Epic 5,
Epic 6, and Epic 7 sequence.

---

## Scope

### In Scope

This epic delivers the first managed source-attachment slice above the current
summary-only source state:

- Attach GitHub-backed repositories to a project or to one process
- View attached repository identity, scope, purpose, access mode, target ref,
  hydration state, and freshness state
- Update purpose, access mode, and target ref for an existing source attachment
- Distinguish project-scoped shared source attachments from process-scoped
  source attachments
- Request rehydration or refresh for `stale` or `not_hydrated` source
  attachments, including recoverable missing-working-copy cases classified as
  `stale`
- Detach a source attachment from current project or process use without
  erasing prior visible provenance
- Provenance visibility showing which attached repositories and refs informed
  process work or received durable code updates
- Return-later and reopen behavior for durable source attachment state
- Degraded and unavailable source-management behavior when one source, one
  refresh path, or one provenance lookup fails independently

Epic 6 inherits Epic 5's aligned artifact world rather than redefining it:

- project artifacts remain durable project-level assets
- process materials and review context remain reference-based rather than
  ownership-based
- source provenance complements artifact version provenance and does not replace
  it

Source-management read integration in Epic 6 follows these rules:

- the existing project shell source attachment section remains the current
  project-level read surface for attached sources
- the existing process work surface current-sources area remains the current
  process-level read surface for attached sources
- process-specific provenance is a process work-surface concern because it is
  about one process's informed-work and received-code-update relationships

### Out of Scope

- Full-fidelity archive, turn derivation, chunk derivation, or archive browsing
- Attachment of MCP-backed or other non-repository external sources in the
  current Epic 5, Epic 6, and Epic 7 sequence
- Generic external integration catalog
- Full GitHub branch-management, pull-request-management, or review workflows
- Full environment execution and checkpointing behavior already delivered in
  Epic 3
- Baseline artifact review and package/export surfaces delivered in Epic 4
- Artifact-model alignment, project-level artifact ownership, and
  review/package provenance realignment now covered by Epic 5
- Process-independent generalized source-management framework beyond the current
  project and process surfaces

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Epic 1 project shell and Epic 2 process work surface are already in place | Validated | Platform | Epic 6 extends the existing shell and process surfaces rather than adding a separate standalone source-management app |
| A2 | Epic 5 already aligned artifacts as project-level assets with process references and version-level provenance | Validated | Platform | Epic 6 inherits that artifact world and does not redefine artifact ownership or review/package eligibility |
| A3 | Epic 3 already made the minimal hydrate-and-checkpoint loop real for already-attached writable sources | Validated | Platform | Epic 6 broadens source-management around that loop rather than replacing it |
| A4 | GitHub remains the canonical source of truth for code | Validated | Platform | Sandboxed working copies remain disposable |
| A5 | A repository may be attached at project scope for shared reuse or at process scope for one process | Validated | Platform | Current repo summaries already model both scopes |
| A6 | The first source-management slice is repository-focused and does not yet include MCP-backed or other external-source attachment | Validated | Platform | External-source attachment is deferred to later source-integration work beyond the current Epic 5, Epic 6, and Epic 7 sequence |
| A7 | Purpose and access mode are durable properties of a source attachment, not transient per-run hints | Validated | Platform | Later process work and provenance read them from durable source state |
| A8 | Detaching a source attachment removes it from current active use but does not erase prior process history or prior durable code-update visibility | Validated | Product + Platform | Current work and prior provenance remain distinct concerns |
| A9 | Epic 6 implements the repository-focused source-management half of PRD Feature 5 and Epic 7 will implement the archive and derived-view half | Validated | Platform | The Feature 5 implementation split is intentional, and external/MCP source attachment remains a later follow-on beyond the current sequence |
| A10 | Attach, update, refresh, and detach settle through request/response behavior in the existing shell and process surfaces rather than through a separate source-management live subscription | Validated | Platform | Epic 6 does not add a new live-update surface |

---

## PRD Backfills

This epic depends on PRD clarifications needed to keep the implementation
sequence and the platform model aligned.

| PRD Area | Backfill | Why |
|----------|----------|-----|
| Feature sequencing between Feature 4 and Feature 5 | The platform may require an interstitial artifact-model alignment epic after review/package surfaces ship and before broader source-management work begins | Epic 6 inherits the aligned artifact world from Epic 5 instead of absorbing artifact-model correction into source-management scope |
| Feature 5 overview | Feature 5 now states that implementation may land as more than one epic, with repository-focused source-management first and archive/derived-view work later | This epic intentionally covers the repository-focused source-management half of Feature 5 while Epic 7 covers the archive half |
| Feature 5 source scope | MCP-backed and other external-source attachment is explicitly deferred beyond the current Epic 5, Epic 6, and Epic 7 sequence | Prevents Epic 6 from inheriting orphaned external-source scope that the current plan does not assign |

---

## Flows & Requirements

### 1. Attaching Repositories to a Project or Process

The user needs to attach one or more repositories before later process work can
hydrate, inspect, review, or update them. The attach flow must work inside the
existing project shell and process work surface, make the chosen scope clear,
and record enough durable source identity to support later hydration and
provenance.

This flow inherits Epic 5's aligned artifact model: project artifacts remain
project-level assets and process current materials remain reference-based.
Attaching a source changes canonical code inputs for a project or process; it
does not create or transfer artifact ownership.

Epic 6 uses these route and uniqueness rules:

- create route determines attachment scope
- a project-scoped attachment belongs to the project as shared current source
  state
- a process-scoped attachment belongs only to one process as process-specific
  current source state
- update, refresh, and detach act on the durable `sourceAttachmentId`
  regardless of whether the attachment is project-scoped or process-scoped
- `purpose` and `accessMode` are mutable metadata and are not part of the
  uniqueness key
- an exact duplicate means same repository, same scope, and same target ref,
  where a missing `targetRef` counts as the same missing target ref
- the same repository and target ref may exist once at project scope and once at
  process scope; those are independent attachments
- when both scopes exist for the same repository, the process-scoped attachment
  shadows the project-scoped attachment for that one process's current-source
  view only

1. User opens a project shell or process work surface
2. User chooses to attach a repository
3. User selects whether the attachment is project-scoped or process-scoped
4. User enters the repository identity and initial target ref
5. System creates the source attachment
6. User sees the new source attachment in the current surface

#### Acceptance Criteria

**AC-1.1:** The user can attach a GitHub-backed repository to a project or to
one process.

- **TC-1.1a: Attach project-scoped repository**
  - Given: User is viewing a project shell
  - When: User attaches a repository at project scope
  - Then: The repository is attached durably to that project
- **TC-1.1b: Attach process-scoped repository**
  - Given: User is viewing one process work surface
  - When: User attaches a repository at process scope
  - Then: The repository is attached durably to that process

**AC-1.2:** The new source attachment shows its repository identity and chosen
scope immediately after creation.

- **TC-1.2a: New attachment identity visible**
  - Given: A source attachment was created successfully
  - When: The current shell or process surface updates
  - Then: The repository identity and attachment scope are visible immediately

**AC-1.3:** The platform does not create a duplicate source attachment when the
same repository, same scope, and same target ref are attached twice in the same
context.

- **TC-1.3a: Duplicate exact attachment blocked**
  - Given: A project or process already has an attached repository with the same scope and target ref
  - When: User tries to attach the same repository again in that same context
  - Then: The platform does not create a second duplicate source attachment
- **TC-1.3b: Missing target ref still counts as a duplicate exact attachment**
  - Given: A project or process already has an attached repository with the same scope and no target ref
  - When: User tries to attach the same repository again in that same context without a target ref
  - Then: The platform does not create a second duplicate source attachment
- **TC-1.3c: Same repository may exist at both project scope and process scope**
  - Given: A project already has a project-scoped attached repository
  - When: User attaches the same repository for one process in that project
  - Then: The platform creates a separate process-scoped source attachment for that process

**AC-1.4:** Invalid or inaccessible repository attachments are rejected without
creating a partial source attachment record.

- **TC-1.4a: Invalid repository identity rejected**
  - Given: User enters an invalid repository identity
  - When: User submits the attach request
  - Then: The platform rejects the request and creates no partial source attachment
- **TC-1.4b: Inaccessible repository rejected**
  - Given: User enters a repository the platform cannot currently resolve or access
  - When: User submits the attach request
  - Then: The platform rejects the request and creates no partial source attachment

### 2. Managing Purpose, Access Mode, and Target Ref

After a repository is attached, the user needs to control what that attachment
is for, whether it is writable, and which ref it points at. These are durable
source-management decisions, not ephemeral execution hints.

1. User opens an existing source attachment
2. User reviews its current purpose, access mode, and target ref
3. User updates one or more of those fields
4. System saves the new metadata
5. User sees the updated source attachment state

#### Acceptance Criteria

**AC-2.1:** Each source attachment records purpose, access mode, and target ref
as durable source metadata.

- **TC-2.1a: Purpose, access mode, and target ref visible**
  - Given: A source attachment exists
  - When: The source attachment appears in the current surface
  - Then: The purpose, access mode, and target ref are visible

**AC-2.2:** The user can update purpose, access mode, and target ref for an
existing source attachment.

- **TC-2.2a: Update source metadata**
  - Given: A source attachment exists
  - When: User updates purpose, access mode, or target ref
  - Then: The source attachment stores and displays the updated metadata

**AC-2.3:** Access mode clearly distinguishes read-only and writable source
attachments.

- **TC-2.3a: Read-only attachment is identifiable**
  - Given: A source attachment has read-only access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is read-only
- **TC-2.3b: Writable attachment is identifiable**
  - Given: A source attachment has writable access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is writable

**AC-2.4:** Updating target ref or other source-defining metadata updates
freshness state when the current hydrated working copy no longer matches the
attached source definition.

- **TC-2.4a: Target-ref change marks source stale**
  - Given: A source attachment was previously hydrated
  - When: User changes its target ref
  - Then: The source attachment no longer appears current and indicates that rehydration is required

### 3. Hydration and Freshness Management

The user needs to know whether an attached source is `not_hydrated`,
`hydrated`, `stale`, or `unavailable` before relying on it. When recovery is
possible, the platform needs a visible rehydration or refresh path without
hiding the rest of the source state.

In Epic 6:

- `not_hydrated` means the durable attachment exists but no successful
  hydration has been recorded yet
- `hydrated` means the attachment's current working copy matches its durable
  source definition
- `stale` means the durable attachment still exists but the current working
  copy no longer matches it or is recoverably missing; "missing" is surfaced
  here as a `freshnessReason`, not as a fifth state
- `unavailable` means the canonical source or current access path cannot be
  resolved safely right now
- freshness is evaluated when the current shell or process surface reads durable
  source state and when the user explicitly requests refresh
- Epic 6 does not add background polling for source freshness
- a branch ref may later become `stale` if the canonical ref changes after a
  prior hydration
- a tag or commit ref usually remains `hydrated` rather than becoming `stale`;
  if it can no longer be resolved, it becomes `unavailable`

1. User opens a project shell or process work surface with one or more attached
   sources
2. System shows hydration and freshness state for each source attachment
3. User sees that a source is `stale`, `not_hydrated`, or `unavailable`
4. User requests rehydration or refresh where recovery is possible
5. System updates the source attachment state

#### Acceptance Criteria

**AC-3.1:** Each source attachment shows whether it is not hydrated, hydrated,
stale, or unavailable.

- **TC-3.1a: Hydration and freshness state visible**
  - Given: One or more source attachments exist
  - When: The current shell or process surface renders them
  - Then: Each source attachment shows its current hydration or freshness state

**AC-3.2:** If a source attachment is `stale` or `not_hydrated`, the platform
shows a rehydration or refresh path. `Unavailable` attachments do not falsely
promise recovery.

- **TC-3.2a: Rehydration path shown for stale source**
  - Given: A source attachment is stale
  - When: The source attachment appears in the current surface
  - Then: The platform shows that rehydration or refresh is available
- **TC-3.2b: Recovery not falsely offered when unavailable**
  - Given: A source attachment is unavailable and not currently recoverable
  - When: The source attachment appears in the current surface
  - Then: The platform does not falsely present a recovery path that cannot currently succeed
- **TC-3.2c: Recovery path shown for not-yet-hydrated source**
  - Given: A source attachment is not yet hydrated
  - When: The source attachment appears in the current surface
  - Then: The platform shows that hydration or refresh is available

**AC-3.3:** Rehydrating or refreshing one source attachment updates that source
state without erasing the rest of the source-management surface.

- **TC-3.3a: Source refresh updates in place**
  - Given: User requests rehydration or refresh for one stale or not-yet-hydrated source attachment
  - When: The request succeeds
  - Then: That source attachment updates in place without hiding the rest of the source list
- **TC-3.3b: Refresh progress is visible while the request is in flight**
  - Given: User requested refresh for one source attachment
  - When: The request is still in progress
  - Then: The current surface shows that refresh is in progress for that source attachment

### 4. Provenance and Canonical Source Visibility

The user needs to understand which attached repositories and refs informed the
current work and which attached writable repositories received durable code
updates. Provenance must stay visible even after the active environment is gone.

1. Process works from one or more attached repositories
2. Process later performs durable code work against a writable attached source
3. User opens the process work surface or another process-specific current
   process context
4. System shows which sources informed or received that work
5. User understands the canonical source path of the work

In Epic 6, source provenance is process-specific and complements the
artifact-version provenance aligned in Epic 5. The project shell continues to
show attached source state. The process work surface is where the user sees
which repositories and refs informed or received that process's work.

Epic 6 records provenance durably at two moments:

- `informed_work` provenance is recorded when process work uses attached sources
  as part of current process work
- `received_code_update` provenance is recorded when a durable code update lands
  in an attached writable source

Provenance remains durable after detach because each provenance entry stores
canonical repository identity and target ref in its own record, not only the
attachment reference.

Each provenance relationship resolves independently. If one provenance lookup
cannot fully enrich current attachment context, the provenance endpoint still
returns the remaining entries and a bounded degraded entry for the failing
relationship using the durable repository identity and ref already stored on
that provenance record.

#### Acceptance Criteria

**AC-4.1:** The user can tell which attached repositories and refs informed the
current process work.

- **TC-4.1a: Informing source provenance visible**
  - Given: Process work used one or more attached sources
  - When: User views current source provenance
  - Then: The platform shows which attached repositories and refs informed that work
- **TC-4.1b: Empty provenance state shown for process with no recorded source use**
  - Given: A process has no recorded source provenance yet
  - When: User views current source provenance
  - Then: The platform shows a clear empty provenance state

**AC-4.2:** The user can tell which attached writable repository and ref
received a durable code update.

- **TC-4.2a: Receiving source provenance visible**
  - Given: Durable code work landed in an attached writable repository
  - When: User views current source provenance
  - Then: The platform shows which attached repository and target ref received that update

**AC-4.3:** Read-only source attachments never appear as if they received
durable code updates.

- **TC-4.3a: Read-only source not shown as write target**
  - Given: A source attachment is read-only
  - When: User views source provenance after code work
  - Then: The platform does not present that source attachment as the durable code-write target

**AC-4.4:** One failing provenance lookup does not fail the rest of the
provenance surface.

- **TC-4.4a: One degraded provenance entry does not hide healthy entries**
  - Given: A process has multiple provenance relationships and one cannot fully
    resolve current attachment context
  - When: User loads process source provenance
  - Then: The healthy provenance entries remain visible and the failing one is
    returned as a bounded degraded entry
- **TC-4.4b: Degraded provenance entry falls back to durable identity**
  - Given: One provenance lookup cannot enrich current attachment metadata
  - When: The provenance surface loads
  - Then: The degraded entry still shows the durable repository identity and
    target ref already recorded for that relationship

### 5. Detaching Sources and Preserving Prior Provenance

The user may no longer want one source attached to current work. Detaching the
source must remove it from current active use without erasing the record of work
that already relied on it.

If a running process already has a detached source in its hydrated working copy,
detach removes that source from future current attachment state but does not
rewrite the already-hydrated working copy mid-run. Any later durable code update
that still depends on the detached source follows the existing checkpoint
failure path unless the source is re-attached before that checkpoint attempt.

1. User opens an attached source
2. User chooses to detach it from current project or process use
3. System removes it from current active source attachment state
4. System preserves prior visible provenance and prior process history
5. User sees the updated current source state

#### Acceptance Criteria

**AC-5.1:** The user can detach a source attachment from current project or
process use.

- **TC-5.1a: Detach project-scoped source**
  - Given: A project-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current project source attachment state
- **TC-5.1b: Detach process-scoped source**
  - Given: A process-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current process source attachment state
- **TC-5.1c: Detach during active process work does not rewrite the current hydrated copy**
  - Given: A running process is still using a previously hydrated working copy that includes an attached source
  - When: User detaches that source from current use
  - Then: The source is removed from future current attachment state without rewriting the already-hydrated working copy mid-run

**AC-5.2:** Detaching a source attachment does not erase prior visible
provenance or prior process history that already referenced that source.

- **TC-5.2a: Prior provenance remains after detach**
  - Given: A source attachment previously informed or received process work
  - When: User detaches that source attachment from current use
  - Then: Prior visible provenance and prior process history remain available

**AC-5.3:** Detaching one source attachment does not remove unrelated current
source attachments from the same project or process.

- **TC-5.3a: Unrelated attachments remain**
  - Given: A project or process has multiple source attachments
  - When: User detaches one source attachment
  - Then: The unrelated source attachments remain visible and unchanged

### 6. Returning Later and Handling Unavailable or Degraded Source State

The user may reload the project shell or process work surface, leave and return
later, or encounter one source attachment that is unavailable while the rest of
the source-management surface remains healthy. The platform needs to restore
durable source state and degrade one failing source path without hiding the
healthy ones.

1. User opens a project shell or process work surface with source attachments
2. User reloads, leaves and returns later, or encounters unavailable source
   state
3. System restores or degrades source-management state from durable records
4. User understands what is still attached, current, stale, or unavailable

#### Acceptance Criteria

**AC-6.1:** Reloading or reopening the project shell or process work surface
restores the latest durable source attachment state.

- **TC-6.1a: Reopen project source attachment state**
  - Given: User previously opened a project with attached sources
  - When: User reloads or reopens the project later
  - Then: The latest durable project source attachment state is restored
- **TC-6.1b: Reopen process source attachment state**
  - Given: User previously opened a process with attached sources
  - When: User reloads or reopens that process later
  - Then: The latest durable process source attachment state is restored

**AC-6.2:** If a requested source attachment is unavailable or access is
revoked, the platform shows an unavailable state and does not leak stale source
details.

- **TC-6.2a: Unavailable source attachment shown safely**
  - Given: A source attachment is no longer available
  - When: The current shell or process surface loads
  - Then: The platform shows that unavailable state without leaking stale source details
- **TC-6.2b: Revoked access blocks source management**
  - Given: User no longer has access to the project or process
  - When: User opens the related source-management context
  - Then: The platform blocks access and does not leak source details

**AC-6.3:** If one source attachment fails independently, the rest of the
source-management surface remains visible.

- **TC-6.3a: One failing source does not hide healthy sources**
  - Given: A source-management surface includes one unavailable source and other healthy sources
  - When: The surface renders
  - Then: The healthy sources remain visible and only the failing source shows the appropriate stale or unavailable state

---

## Data Contracts

### Browser Routes

Epic 6 works inside the existing project and process surfaces.

| Route | Description |
|-------|-------------|
| `/projects/{projectId}` | Project shell showing project-scoped shared source attachments |
| `/projects/{projectId}/processes/{processId}` | Process work surface showing process-scoped source attachments and source provenance |

Epic 6 does not introduce a separate standalone source-management page in the
first cut.

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get project shell | GET | `/api/projects/{projectId}` | Existing project-shell read path extended with Epic 6 source metadata in `sourceAttachments.items` |
| Get process work surface | GET | `/api/projects/{projectId}/processes/{processId}` | Existing process work-surface read path extended with Epic 6 source metadata in `materials.currentSources` |
| Attach project-scoped source | POST | `/api/projects/{projectId}/source-attachments` | Creates one project-scoped repository attachment |
| Attach process-scoped source | POST | `/api/projects/{projectId}/processes/{processId}/source-attachments` | Creates one process-scoped repository attachment |
| Update source attachment | PATCH | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}` | Updates durable source metadata for one existing source attachment; `sourceAttachmentId` identifies the attachment regardless of whether it is project-scoped or process-scoped |
| Refresh source attachment | POST | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}/refresh` | Requests rehydration or refresh for one recoverable source attachment; `sourceAttachmentId` identifies the attachment regardless of whether it is project-scoped or process-scoped |
| Detach source attachment | DELETE | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}` | Removes one source attachment from current active use; `sourceAttachmentId` identifies the attachment regardless of whether it is project-scoped or process-scoped |
| Get process source provenance | GET | `/api/projects/{projectId}/processes/{processId}/source-provenance` | Returns process-specific provenance entries for attached sources that informed or received work, complementing artifact-version provenance from Epic 5; one degraded provenance lookup does not fail the whole read |

### Source Attachment Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| provider | enum | yes | `github` | Source provider for this first-cut epic |
| repositoryFullName | string | yes | `owner/name` format, non-empty | Canonical repository identity |
| displayName | string | yes | non-empty | User-visible source label |
| purpose | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| accessMode | enum | yes | `read_only` or `read_write` | Whether durable code work may land back in this source |
| targetRef | string | no | non-empty when present | Branch, tag, or commit ref if known. Branch refs may later become `stale`; tag or commit refs usually remain current unless unavailable |

Create-scope ownership is route-based in Epic 6:

- `POST /api/projects/{projectId}/source-attachments` always creates a
  project-scoped source attachment
- `POST /api/projects/{projectId}/processes/{processId}/source-attachments`
  always creates a process-scoped source attachment
- the request body does not independently override that scope

### Source Attachment Update Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| purpose | enum | no | `research`, `review`, `implementation`, or `other` when present | Updated purpose for the existing source attachment |
| accessMode | enum | no | `read_only` or `read_write` when present | Updated durable access mode |
| targetRef | string | no | non-empty when present | Updated branch, tag, or commit ref when known |

### Source Attachment Summary

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachmentId | string | yes | non-empty | Stable source attachment identifier |
| provider | enum | yes | `github` | Source provider |
| repositoryFullName | string | yes | `owner/name` format, non-empty | Canonical repository identity |
| displayName | string | yes | non-empty | User-visible source label |
| attachmentScope | enum | yes | `project` or `process` | Whether the source is attached at project level or for one process |
| processId | string | no | non-empty when present | Process identifier when process-scoped |
| processDisplayLabel | string | no | non-empty when present | Process display label when process-scoped |
| purpose | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| accessMode | enum | yes | `read_only` or `read_write` | Whether durable code work may land back in this source |
| targetRef | string | no | non-empty when present | Branch, tag, or commit ref if known |
| hydrationState | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | Current hydration or freshness state |
| lastHydratedAt | string | no | ISO 8601 UTC when present | Most recent successful hydration time |
| freshnessReason | string | no | non-empty when present | Current reason the source is `stale` or `unavailable`; recoverable missing-working-copy cases are expressed as `stale` rather than as a fifth state |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable update time |

Epic 6 uses only these four attachment states. `missing` is represented through
`freshnessReason` under `stale` or `unavailable`, not as a separate enum value.

### Source Provenance Entry

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| provenanceId | string | yes | non-empty | Stable provenance identifier |
| sourceAttachmentId | string | yes | non-empty | Attached source this provenance entry refers to |
| relationshipKind | enum | yes | `informed_work` or `received_code_update` | How this source relates to the process work |
| repositoryFullName | string | yes | `owner/name` format, non-empty | Canonical repository identity |
| targetRef | string | no | non-empty when present | Ref that informed or received the work |
| entryStatus | enum | yes | `ready` or `degraded` | Whether this provenance entry resolved cleanly or is returned with bounded degradation |
| degradationReason | string | no | non-empty when present | Why this provenance entry is degraded when `entryStatus` is `degraded` |
| recordedAt | string | yes | ISO 8601 UTC | Time this provenance relationship was recorded |

These entries complement the artifact version provenance defined in Epic 5.
They do not redefine artifact ownership or version producer lineage.

### Attach Source Attachment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachment | Source Attachment Summary | yes | present | Newly created durable source attachment |

### Update Source Attachment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachment | Source Attachment Summary | yes | present | Updated durable source attachment state |

### Refresh Source Attachment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachment | Source Attachment Summary | yes | present | Updated durable source attachment state after refresh request settles |

### Detach Source Attachment Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| detached | boolean | yes | `true` | Indicates the source attachment was removed from current active use |
| sourceAttachmentId | string | yes | non-empty | Detached source attachment identifier |

### Source Provenance Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| entries | array of Source Provenance Entry | yes | present | Process-specific provenance entries for attached sources that informed or received work |

**Sort order:** Provenance entries are ordered by `recordedAt` descending.

A successful provenance read may contain both `ready` and `degraded` entries.
Per-entry provenance degradation does not force a request-level error when the
rest of the provenance surface is still readable.

### Refresh Failure Boundary

In Epic 6, attach, update, refresh, and detach are request/response actions
inside the existing shell and process surfaces rather than long-running live
workflows. Refresh returns only after the source attachment settles into a new
durable source state or fails with an immediate request-level error. Epic 6
does not introduce a separate source-management live subscription.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 404 | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| 404 | `SOURCE_ATTACHMENT_NOT_FOUND` | Requested source attachment does not exist in the requested source-management context |
| 409 | `SOURCE_ATTACHMENT_CONFLICT` | The requested source attachment already exists in the same context or cannot be updated safely |
| 409 | `SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE` | The requested source attachment is not currently recoverable through refresh |
| 422 | `INVALID_SOURCE_ATTACHMENT` | The source attachment request is missing or invalid |
| 503 | `SOURCE_ATTACHMENT_UNAVAILABLE` | The source attachment or its source-of-truth path is currently unavailable |

---

## Dependencies

Technical dependencies:

- Epic 1 project shell source summary visibility
- Epic 2 process materials visibility
- Epic 5 artifact-model alignment for project-level artifacts, process
  references, and review/package provenance rules
- Epic 3 environment hydration and checkpoint loop for already-attached sources
- Fastify-owned routes and shared client/server contract surfaces
- GitHub-backed canonical source integration for repository identity and durable
  code-write visibility

Process dependencies:

- Epic 7 for full archive, turn, chunk, and derived-view behavior
- Later source-integration follow-on after Epic 7 for MCP-backed or other
  external-source attachment
- Downstream process-specific epics to define when a process uses shared
  project-scoped sources versus process-scoped sources

---

## Non-Functional Requirements

### Performance

- The project shell renders up to 50 attached sources within 2 seconds under
  normal conditions
- Updating source metadata appears in the current surface within 1 second under
  normal conditions
- Refreshing one recoverable source attachment returns a settled visible result
  within 10 seconds under normal conditions

### Security

- All source-management routes and APIs require authenticated access
- Project and process access are enforced server-side
- Read-only source attachments are never presented as durable code-write targets
- The platform does not leak unavailable or revoked source details through
  direct routes or source-management actions

### Reliability

- Durable source attachment state remains visible even when no active
  environment exists
- Detaching a source does not erase prior visible provenance or prior process
  history
- One unavailable source attachment does not fail the rest of the
  source-management surface
- One degraded provenance lookup does not fail the rest of the provenance
  surface
- Reloading or reopening project or process surfaces restores the latest
  durable source attachment state

### Accessibility

- Source attach, update, refresh, and detach actions are keyboard reachable
- Purpose, access mode, hydration state, and freshness reason are available as
  readable text, not color alone
- Unavailable and stale source states are available as readable text

### Observability

- Source attach, update, refresh, detach, and failure events are logged with
  request context, project ID, process ID when present, and source attachment ID
- Provenance entries for informed work and durable code updates are traceable by
  process ID, repository identity, and target ref

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. What exact browser interaction model should attach, update, refresh, and
   detach sources inside the existing project and process surfaces without
   creating a separate source-management app?
2. What exact durable schema should represent project-scoped and process-scoped
   source attachments, including canonical repository identity and provenance
   visibility, without reintroducing artifact-ownership semantics already
   settled in Epic 5?
3. What exact conflict rule should apply when the same repository and target ref
   are attached more than once in related contexts?
4. What exact refresh and freshness-check policy should map durable conditions
   into Epic 6's four source states: `not_hydrated`, `hydrated`, `stale`, and
   `unavailable`?
5. What exact provenance surface should show informed-work relationships and
   received-code-update relationships without duplicating process history or
   artifact-version provenance from Epic 5?
6. How should Epic 6 extend the current shell and process surfaces so source
   attachment management remains coherent across project-scoped and
   process-scoped use?

---

## Recommended Story Breakdown

These stories assume Epic 5 artifact alignment is already complete. No story in
this epic owns artifact-model migration or review/package provenance
realignment.

### Story 0: Foundation (Infrastructure)

Create the shared source-management foundation: source attachment vocabulary,
repository identity contracts, provenance shapes, error classes, hydration and
freshness fixtures for the four-state model, Epic 5-aligned material/provenance
seams, and test helpers used by all later stories.

### Story 1: Attach Repositories to a Project or Process

**Delivers:** The user can attach repositories to a project or one process.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (attach project-scoped or process-scoped repository)
- AC-1.2 (new attachment identity and scope visible)
- AC-1.3 (duplicate exact attachment blocked)

### Story 2: Manage Purpose, Access Mode, and Target Ref

**Delivers:** The user can set and update the durable source metadata that
controls how an attached repository is used.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (purpose, access mode, target ref visible)
- AC-2.2 (update source metadata)
- AC-2.3 (read-only vs writable distinction)
- AC-2.4 (target-ref change updates freshness state)

### Story 3: Hydration and Freshness Management

**Delivers:** The user can see whether attached sources are `not_hydrated`,
`hydrated`, `stale`, or `unavailable` and can request recovery where Epic 6
allows it.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (hydration and freshness state visible)
- AC-3.2 (rehydration or refresh path shown when recoverable)
- AC-3.3 (refresh updates one source in place)

### Story 4: Provenance and Canonical Source Visibility

**Delivers:** The user can tell which attached repositories and refs informed or
received process work, and the provenance surface degrades one failing lookup
without hiding the rest.
**Prerequisite:** Story 3
**ACs covered:**

- AC-4.1 (informing source provenance visible)
- AC-4.2 (receiving source provenance visible)
- AC-4.3 (read-only source not shown as write target)
- AC-4.4 (one failing provenance lookup degrades independently)

### Story 5: Detach Sources and Preserve Prior Provenance

**Delivers:** The user can remove a source from current active use without
erasing the record of earlier work that used it.
**Prerequisite:** Story 4
**ACs covered:**

- AC-5.1 (detach project-scoped or process-scoped source)
- AC-5.2 (prior provenance remains after detach)
- AC-5.3 (unrelated attachments remain)

### Story 6: Reopen and Degraded Source State

**Delivers:** The source-management surface remains usable across reopen and
bounded source failures.
**Prerequisite:** Story 5
**ACs covered:**

- AC-6.1 (reopen project/process source attachment state)
- AC-6.2 (unavailable or revoked source-management state)
- AC-6.3 (one failing source does not hide healthy sources)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover happy, alternate, refresh, detach, and degraded-state paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at the browser/server source-management boundary
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] Artifact-model alignment (Epic 5), archive work (Epic 7), external-source attachment, and broader GitHub workflow management are explicitly deferred or out of scope
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
