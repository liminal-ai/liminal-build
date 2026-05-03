# Epic 7: Archive and Derived Views

This epic defines the complete requirements for Liminal Build canonical process
archive, turn derivation, and derived archive views. It serves as the source of
truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who needs process history to remain durable, inspectable, and usable
for later long-horizon context management.
**Context:** The user is running or reviewing a process after source
attachments, artifact versions, and source provenance have been established.
The user needs to return later, inspect what happened, and trust that derived
turns or chunks did not replace the original process record.
**Mental Model:** "The platform keeps the full record of what happened. Turns,
chunks, and summaries are views over that record, not the record itself."
**Key Constraint:** The archive must preserve finalized low-level entries as
canonical truth. It must not store raw streaming deltas, interrupted partial
objects, or only pre-summarized history as the durable record.

---

## Feature Overview

This feature makes process history a first-class canonical archive rather than
only a process work-surface history list. After it ships, finalized process
entries are stored at low-level grain, can be read after reload or environment
loss, and can be grouped into turns without mutating the archive. The first
derived-view layer gives later chunking and summarization work a rebuildable
source without treating chunks or summaries as canonical truth.

Epic 7 completes the archive and derived-view half of PRD Feature 5. Epic 6
establishes repository source-management and source provenance. Epic 7 uses
that source/provenance substrate but does not add MCP-backed source attachment,
external integration catalog behavior, or full process-specific summarization
strategies.

## Current Implemented Baseline

The current repository already has a process history surface and durable
`processHistoryItems`. That history supports the process work surface and live
updates, but it is not the full canonical archive described by the PRD and
architecture.

Current process history uses a smaller presentation-oriented vocabulary such as
`user_message`, `process_message`, `progress_update`, `attention_request`,
`side_work_update`, and `process_event`. Epic 7 introduces the platform archive
taxonomy required by the PRD: `user_message`, `model_message`, `reasoning`,
`script_emission`, `tool_call`, `tool_result`, and `process_event`.

Current live process updates use typed upserts for browser state. Epic 7 keeps
that live state model separate from canonical archive writes. A current object
may update in the browser while work is active, but only finalized entries are
appended to the canonical archive.

---

## Scope

### In Scope

This epic delivers the first canonical archive and derived-view slice:

- Full-fidelity process archive entries at finalized low-level grain
- Canonical archive entry taxonomy from the platform PRD
- Archive append behavior for finalized entries only
- Read surfaces for process archive entries
- Turn derivation from archive entries
- Minimal derived-view records or responses over turns
- Provenance from derived turns/views back to archive entries
- Bounded degraded states when archive reads or derivation reads partially fail
- Source-provenance coherence with Epic 6 source records
- Reopen behavior for archive, turn, and derived-view reads

### Out of Scope

- MCP-backed or other external-source attachment
- Full summarization strategy for every process type
- Model-generated summaries or summarization prompts
- Model-specific context-packing or prompt-budget policy
- Process-specific review/approval workflows
- Replacing the existing live WebSocket/upsert model
- Treating chunks, summaries, or turns as canonical process truth
- Generic transcript export product beyond the archive/derived-view contracts

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Epic 6 source provenance and canonical repository identity are available before Epic 7 implementation | Planned | Platform | Epic 7 can show source/provenance context but does not create source attachment lifecycle behavior |
| A2 | Existing process history remains a process work-surface read model | Validated | Platform | Epic 7 may bridge from current history, but canonical archive uses the PRD entry taxonomy |
| A3 | Live process updates continue to use typed current-object upserts | Validated | Platform | Epic 7 adds finalization-to-archive behavior rather than replacing live transport |
| A4 | Turns are derived from archive entries | Validated | Platform | Turns are rebuildable and not canonical truth |
| A5 | Chunk and summary strategies may vary by process type later | Validated | Platform | Epic 7 establishes a non-summarizing structural derived-view foundation without hard-coding a universal summarizer |
| A6 | Archive reads are scoped to project/process access | Validated | Platform | The archive must not leak process history across project boundaries |
| A7 | Existing `processHistoryItems` are bridged for compatibility rather than migrated as canonical archive truth in this epic | Planned | Platform | Tech Design decides the exact bridge/read mapping; historical backfill is not part of Epic 7 unless explicitly added |

---

## Flows & Requirements

### 1. Capturing Finalized Archive Entries

The platform appends low-level archive entries when process work produces
finalized material. The archive records the entry type, ordering, content, and
links needed for later turn derivation.

1. A process receives user input, model output, tool activity, scripted
   execution output, or a process event
2. The platform tracks any in-flight state needed for the active UI
3. The entry reaches a finalized state
4. The platform appends the finalized entry to the canonical archive
5. The archive entry remains available after reload or environment loss

#### Acceptance Criteria

**AC-1.1:** The platform stores finalized archive entries at low-level grain.

- **TC-1.1a: Finalized user message archived**
  - Given: A user response is accepted by a process
  - When: The response is finalized
  - Then: A `user_message` archive entry is appended for that process
- **TC-1.1b: Finalized model message archived**
  - Given: A model response completes
  - When: The response is finalized
  - Then: A `model_message` archive entry is appended for that process
- **TC-1.1c: Process event archived**
  - Given: A process emits a lifecycle or checkpoint event that should remain part of history
  - When: The event is finalized
  - Then: A `process_event` archive entry is appended for that process

**AC-1.2:** The canonical archive supports the PRD entry taxonomy.

- **TC-1.2a: Required archive entry kinds accepted**
  - Given: The platform appends finalized archive entries
  - When: Each required entry kind is recorded
  - Then: The archive accepts `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event`
- **TC-1.2b: Unsupported archive entry kind rejected**
  - Given: A caller attempts to append an unsupported archive entry kind
  - When: The append request is validated
  - Then: The platform rejects the entry and does not append a partial archive record

**AC-1.3:** Archive entries preserve order within one process.

- **TC-1.3a: Process archive entries read in stable order**
  - Given: Multiple archive entries exist for one process
  - When: The archive is read in ascending order
  - Then: Entries appear in their canonical process order
- **TC-1.3b: Same-timestamp entries remain deterministic**
  - Given: Multiple archive entries have the same timestamp
  - When: The archive is read
  - Then: The platform returns them in a stable deterministic order

**AC-1.4:** Archive entries can link to related process, artifact, source, or tool context without requiring those related records to remain current.

- **TC-1.4a: Archive entry links to artifact context**
  - Given: An archive entry relates to an artifact version or artifact event
  - When: The archive entry is read
  - Then: The related artifact context is visible when available
- **TC-1.4b: Archive entry survives missing related context**
  - Given: Related context cannot be resolved
  - When: The archive entry is read
  - Then: The archive entry remains visible with bounded degraded related-context metadata

### 2. Keeping Streaming State Separate from Canonical Archive

The browser may receive live updates while work is active. The archive receives
only completed entries. The live current-object model and canonical archive do
not share raw streaming delta storage.

1. A process begins emitting live output
2. The browser receives typed upserts for in-flight state
3. The process completes or abandons the in-flight object
4. The platform appends only completed objects to the archive
5. Interrupted partial objects remain outside canonical archive truth

#### Acceptance Criteria

**AC-2.1:** Raw streaming deltas are not stored as canonical archive entries.

- **TC-2.1a: Streaming delta excluded from archive**
  - Given: A live model or runtime stream emits partial deltas
  - When: The process archive is read
  - Then: Raw deltas do not appear as archive entries

**AC-2.2:** Interrupted partial objects are not archived as finalized entries.

- **TC-2.2a: Interrupted model output excluded**
  - Given: A model output begins but is interrupted before finalization
  - When: The process archive is read
  - Then: The interrupted partial object is not returned as a finalized archive entry
- **TC-2.2b: Interrupted tool result excluded**
  - Given: A tool call begins but never receives a finalized result
  - When: The process archive is read
  - Then: The incomplete tool result is not returned as a finalized archive entry

**AC-2.3:** Finalized entries may be created from completed live objects.

- **TC-2.3a: Completed live object archived once**
  - Given: The browser received live upserts for an in-flight object
  - When: The object completes
  - Then: The platform appends one finalized archive entry for that object
- **TC-2.3b: Replayed completion does not duplicate archive entry**
  - Given: A completion event is retried for an already-archived object
  - When: The archive append path processes the retry
  - Then: The platform does not create a duplicate canonical entry

### 3. Reading and Reopening the Canonical Archive

The user or a later process needs to read process history after reload, process
pause, or environment loss. Archive reads use durable archive state, not active
environment state.

1. User opens a process with archived history
2. System reads the canonical archive for that process
3. User sees finalized process history entries
4. User reloads or returns later
5. System restores the same canonical archive view

#### Acceptance Criteria

**AC-3.1:** The user can read finalized archive entries for one process.

- **TC-3.1a: Archive entries visible**
  - Given: A process has finalized archive entries
  - When: User opens the archive read surface for that process
  - Then: The finalized entries are visible
- **TC-3.1b: Empty archive state visible**
  - Given: A process has no archive entries
  - When: User opens the archive read surface
  - Then: The platform shows an empty archive state

**AC-3.2:** Reopening a process restores archive entries from durable state.

- **TC-3.2a: Archive survives reload**
  - Given: A process has finalized archive entries
  - When: User reloads or returns to the process later
  - Then: The archive entries are restored from durable state
- **TC-3.2b: Archive survives environment loss**
  - Given: A process environment was discarded after entries were archived
  - When: User opens the process archive
  - Then: The archived entries remain available

**AC-3.3:** Archive reads enforce project and process access boundaries.

- **TC-3.3a: Unauthorized archive read blocked**
  - Given: User does not have access to a project
  - When: User requests a process archive from that project
  - Then: The platform rejects the request and does not leak archive content
- **TC-3.3b: Missing process archive read returns not found**
  - Given: The requested process does not exist in the requested project
  - When: User requests the process archive
  - Then: The platform returns a process-not-found error

**AC-3.4:** One degraded archive entry does not hide healthy archive entries.

- **TC-3.4a: Degraded entry returned with healthy entries**
  - Given: One archive entry has unresolved related context and other entries are healthy
  - When: User reads the archive
  - Then: Healthy entries remain visible and the unresolved entry is returned with degraded metadata

### 4. Deriving Turns from Archive Entries

Turns are derived groupings over archive entries. The platform can show or
return turns without making turns canonical truth.

Turn derivation uses deterministic grouping inputs from the archive, such as
sequence order, entry kind, related tool-call correlation, and finalized
timestamps. The exact grouping algorithm is a Tech Design concern, but repeated
derivation over the same archive entries must return the same turn boundaries.

1. Archive entries exist for one process
2. System derives turn groupings from those entries
3. User or process reads the derived turns
4. A later archive entry is appended
5. System can rebuild or refresh the derived turn view

#### Acceptance Criteria

**AC-4.1:** The platform can derive turns from archived entries.

- **TC-4.1a: Turns derived from archive**
  - Given: A process has archive entries that form one or more interaction turns
  - When: User requests turn view
  - Then: The platform returns turns derived from archive entries
- **TC-4.1b: Empty archive produces empty turn view**
  - Given: A process has no archive entries
  - When: User requests turn view
  - Then: The platform returns an empty turn view

**AC-4.2:** Each derived turn references the archive entries it groups.

- **TC-4.2a: Turn includes archive entry references**
  - Given: A turn is derived from archive entries
  - When: The turn is returned
  - Then: The turn includes references to the archive entries used to derive it

**AC-4.3:** Turn derivation does not mutate canonical archive entries.

- **TC-4.3a: Archive unchanged after turn derivation**
  - Given: A process has archive entries
  - When: The platform derives turns
  - Then: The canonical archive entries remain unchanged

**AC-4.4:** Turn derivation handles incomplete or degraded groupings without failing the whole turn view.

- **TC-4.4a: Degraded turn returned**
  - Given: One turn cannot fully resolve related context
  - When: User reads turn view
  - Then: The platform returns that turn with degraded metadata and keeps other turns visible

### 5. Producing Minimal Structural Views over Turns

The platform creates the first derived-view layer over turns so later chunking,
retrieval, summarization, and fidelity-gradient work has a stable foundation.
In Epic 7, a derived view is a non-summarizing structural projection over one or
more turns. It identifies boundaries, source turns, source archive entries, and
status metadata. It may include a short user-facing label, but it does not
require or create model-generated summary content.

Derived views remain rebuildable from turns and archive entries.

1. Turns exist for one process
2. System creates or returns a structural derived view over one or more turns
3. User or process reads the derived view
4. The derived view links back to the source turns and archive entries
5. Later derived views can be rebuilt without changing the archive

#### Acceptance Criteria

**AC-5.1:** The platform can expose a non-summarizing structural derived view
over one or more turns.

- **TC-5.1a: Derived view returned for turn range**
  - Given: A process has derived turns
  - When: User requests a derived view
  - Then: The platform returns a derived view that identifies the turn boundary
    and does not require generated summary text

**AC-5.2:** Derived views identify structural boundaries for the turns they
cover.

- **TC-5.2a: Derived view identifies boundary**
  - Given: A derived view is returned for a turn range
  - When: User or process inspects the view metadata
  - Then: The view identifies its source turn range and covered archive-entry
    references

**AC-5.3:** Derived views preserve provenance back to turns and archive entries.

- **TC-5.3a: Derived view references source turns**
  - Given: A derived view is returned
  - When: User inspects the view metadata
  - Then: The view identifies the turn or turns it was derived from
- **TC-5.3b: Derived view can trace to archive entries**
  - Given: A derived view references turns
  - When: The source archive references are inspected
  - Then: The underlying archive entry references remain available

**AC-5.4:** Derived views do not replace or delete full-fidelity archive entries.

- **TC-5.4a: Archive remains after derived view creation**
  - Given: A derived view has been created or refreshed
  - When: User reads the canonical archive
  - Then: The full-fidelity archive entries remain available

**AC-5.5:** Derived-view generation can degrade without corrupting canonical archive state.

- **TC-5.5a: Derived view failure leaves archive readable**
  - Given: Derived-view generation fails
  - When: User reads the canonical archive
  - Then: The archive remains readable and unchanged
- **TC-5.5b: Derived view reports degraded status**
  - Given: A derived view cannot fully resolve source turns or metadata
  - When: User reads the derived-view surface
  - Then: The platform returns a degraded derived-view state without hiding the canonical archive

### 6. Connecting Archive Entries to Source and Artifact Provenance

Archive entries should preserve orientation to source and artifact work without
redefining artifact ownership or source attachment lifecycle.

1. A process uses artifacts or source attachments during work
2. The process emits finalized archive entries
3. Some entries relate to artifact versions, package context, source
   provenance, or code updates
4. User reads archive, turn, or derived-view surfaces
5. System shows available related provenance and degrades missing related
   context independently

#### Acceptance Criteria

**AC-6.1:** Archive entries can show related artifact-version provenance when available.

- **TC-6.1a: Artifact provenance visible from archive entry**
  - Given: An archive entry relates to an artifact version
  - When: User reads the archive entry
  - Then: The related artifact version and producing-process provenance are visible when available

**AC-6.2:** Archive entries can show related source provenance when available.

- **TC-6.2a: Source provenance visible from archive entry**
  - Given: An archive entry relates to a source that informed or received work
  - When: User reads the archive entry
  - Then: The related repository identity and ref are visible when available

**AC-6.3:** Missing related provenance does not hide archive truth.

- **TC-6.3a: Missing source context degrades one entry**
  - Given: An archive entry references source provenance that cannot be fully resolved
  - When: User reads the archive
  - Then: The archive entry remains visible with degraded source context
- **TC-6.3b: Missing artifact context degrades one entry**
  - Given: An archive entry references artifact context that cannot be fully resolved
  - When: User reads the archive
  - Then: The archive entry remains visible with degraded artifact context

### 7. Returning Later and Handling Archive Degradation

Archive and derived views must remain usable across reloads, process pauses,
environment loss, and partial derived-view failures.

1. User leaves a process after archive entries have been finalized
2. User returns later
3. System restores archive, turn, and derived-view surfaces from durable state
4. One derived read or related lookup fails
5. System preserves the readable archive and returns bounded degraded states

#### Acceptance Criteria

**AC-7.1:** Archive, turn, and derived-view reads are restorable after reload.

- **TC-7.1a: Archive and turn reads restore after reload**
  - Given: A process has archive entries and derived turns
  - When: User reloads the process context
  - Then: Archive entries and derived turns remain readable
- **TC-7.1b: Derived view restores after reload**
  - Given: A derived view exists for a process
  - When: User reloads the process context
  - Then: The derived view remains readable or can be rebuilt from turns

**AC-7.2:** A derived-view failure does not hide canonical archive entries.

- **TC-7.2a: Canonical archive remains visible during derived-view failure**
  - Given: Derived-view read or rebuild fails
  - When: User opens archive history
  - Then: The canonical archive entries remain visible

**AC-7.3:** Archive reads remain bounded for long processes.

- **TC-7.3a: Archive read returns bounded page**
  - Given: A process has more archive entries than the default read limit
  - When: User reads the archive
  - Then: The platform returns a bounded page and indicates whether more entries are available

---

## Data Contracts

### Browser Routes

Epic 7 works inside the existing project and process surfaces.

| Route | Description |
|-------|-------------|
| `/projects/{projectId}/processes/{processId}` | Process work surface with entry points to archive, turn, and derived-view reads |
| `/projects/{projectId}/processes/{processId}/archive` | Process archive read surface, if Tech Design chooses a dedicated route |

Epic 7 does not require a separate top-level archive app.

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get process archive | GET | `/api/projects/{projectId}/processes/{processId}/archive` | Returns finalized canonical archive entries for one process |
| Get process turns | GET | `/api/projects/{projectId}/processes/{processId}/archive/turns` | Returns turns derived from canonical archive entries |
| Get derived archive views | GET | `/api/projects/{projectId}/processes/{processId}/archive/derived-views` | Returns minimal structural views over turns |
| Refresh derived archive views | POST | `/api/projects/{projectId}/processes/{processId}/archive/derived-views/refresh` | Requests rebuild or refresh of derived views from canonical turns |

### Archive Entry

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| archiveEntryId | string | yes | non-empty | Stable archive entry identifier |
| projectId | string | yes | non-empty | Project containing the process |
| processId | string | yes | non-empty | Process that produced the entry |
| entryKind | enum | yes | `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, or `process_event` | Canonical archive entry kind |
| sequence | integer | yes | non-negative | Stable ordering value within one process archive |
| lifecycleState | enum | yes | `finalized` | Canonical archive entries are finalized only |
| finalizationKey | string | yes | non-empty, unique within one process | Idempotency key for the finalized source object; retries for the same key resolve to the same archive entry or no-op |
| sourceObjectId | string | no | non-empty when present | Correlation id from the live/current object that produced the finalized archive entry |
| bodyText | string | no | non-empty when present | Human-readable body for text-like entries |
| bodyData | object | no | present for structured entries when needed | Structured body for JSON-like entries |
| bodyFormat | enum | no | `plain_text`, `markdown`, `structured`, or `none` | Format of body content |
| relatedArtifactVersionId | string | no | non-empty when present | Related artifact version when the entry points to artifact work |
| relatedSourceProvenanceId | string | no | non-empty when present | Related source provenance entry when the entry points to source work |
| relatedToolCallId | string | no | non-empty when present | Correlation id for tool call/result pairing |
| entryStatus | enum | yes | `ready` or `degraded` | Whether related context resolved cleanly |
| degradationReason | string | no | non-empty when present | Why related context degraded |
| recordedAt | string | yes | ISO 8601 UTC | Time the entry was finalized into the archive |

### Archive Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| entries | array of Archive Entry | yes | present | Finalized archive entries for the requested page |
| page.cursor | string | no | non-empty when present | Cursor used to fetch this page |
| page.nextCursor | string | no | non-empty when present | Cursor for the next page when more entries exist |
| page.hasMore | boolean | yes | true or false | Whether more entries are available |

**Sort order:** Archive entries default to ascending `sequence`.

### Derived Turn

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| turnId | string | yes | non-empty | Stable derived turn identifier or deterministic derived id |
| processId | string | yes | non-empty | Process the turn belongs to |
| turnIndex | integer | yes | non-negative | Turn order within the process |
| archiveEntryIds | array of string | yes | non-empty for non-empty turns | Archive entries grouped into this turn |
| startedAt | string | yes | ISO 8601 UTC | Earliest archive entry time in the turn |
| endedAt | string | yes | ISO 8601 UTC | Latest archive entry time in the turn |
| turnStatus | enum | yes | `ready` or `degraded` | Whether the turn resolved cleanly |
| degradationReason | string | no | non-empty when present | Why the turn degraded |

### Turn Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| turns | array of Derived Turn | yes | present | Turns derived from archive entries |
| page.cursor | string | no | non-empty when present | Cursor used to fetch this page |
| page.nextCursor | string | no | non-empty when present | Cursor for the next page when more turns exist |
| page.hasMore | boolean | yes | true or false | Whether more turns are available |

### Derived Archive View

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| derivedViewId | string | yes | non-empty | Stable derived-view identifier |
| processId | string | yes | non-empty | Process the view belongs to |
| viewKind | enum | yes | `turn_range` or `chunk_candidate` | Kind of structural derived view in this first slice |
| turnRange.startIndex | integer | no | required for `turn_range`; non-negative when present | First covered turn index for range-based views |
| turnRange.endIndex | integer | no | required for `turn_range`; greater than or equal to `startIndex` when present | Last covered turn index for range-based views |
| sourceTurnIds | array of string | yes | present | Turns used to derive this view |
| sourceArchiveEntryIds | array of string | yes | present | Archive entries covered by this view |
| title | string | no | non-empty when present | Human-readable label |
| bodyText | string | no | non-empty when present | Optional non-generated structural note or label content; model-generated summary content is out of scope |
| viewStatus | enum | yes | `ready` or `degraded` | Whether the derived view resolved cleanly |
| degradationReason | string | no | non-empty when present | Why the derived view degraded |
| updatedAt | string | yes | ISO 8601 UTC | Most recent time the view was created or refreshed |

### Derived Views Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| views | array of Derived Archive View | yes | present | Derived views over turns |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 404 | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| 409 | `ARCHIVE_DERIVATION_CONFLICT` | Derived view cannot be refreshed safely from the current archive state |
| 422 | `INVALID_ARCHIVE_REQUEST` | Archive or derived-view request is invalid |

---

## Dependencies

Technical dependencies:

- Epic 1 project and process access boundaries
- Epic 2 process work surface and process history surface
- Epic 3 execution and checkpoint finalization points
- Epic 5 artifact-version provenance and review/package alignment
- Epic 6 source attachment identity and source provenance
- Fastify-owned routes and shared client/server contract surfaces

Process dependencies:

- Downstream process-specific specs to decide which process events matter beyond
  the platform entry taxonomy
- Later source-integration work for MCP-backed or other external source
  attachment
- Later context-management work for process-specific summarization and prompt
  packing strategies

---

## Non-Functional Requirements

### Performance

- Archive reads return the first bounded page within 2 seconds for processes
  with up to 5,000 archive entries under normal conditions
- Turn reads return the first bounded page within 2 seconds under normal
  conditions
- Derived-view refresh returns an accepted or settled response within 10 seconds
  for the first minimal derived-view slice under normal conditions

### Security

- All archive and derived-view routes require authenticated access
- Project and process access are enforced server-side
- Archive reads do not leak entries from inaccessible projects or processes
- Degraded related-context states do not expose unavailable source or artifact
  details beyond fields already stored on the archive entry

### Reliability

- Finalized archive entries remain readable after browser reload, server
  restart, or environment loss
- Turn and derived-view reads remain rebuildable from archive entries
- A failed derived-view refresh does not mutate or delete canonical archive
  entries
- One degraded archive entry, turn, or derived view does not hide healthy
  archive entries

### Observability

- Archive append, archive read, turn derivation, derived-view refresh, and
  degraded read events are logged with request context, project ID, and process
  ID
- Derived views are traceable to source turns and archive entries
- Archive append failures are logged without persisting partial canonical
  entries

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. What exact durable schema should store archive entries, sequence numbers,
   related-context references, and idempotency keys?
2. What exact compatibility mapping should bridge current `processHistoryItems`
   and live process updates into canonical archive entries, and is any
   historical migration/backfill explicitly in or out of scope?
3. What finalization boundary determines when model messages, reasoning,
   script emissions, tool calls, and tool results become archive entries?
4. What exact derivation rules group archive entries into turns?
5. Should turns be persisted derived records, computed on read, or cached with a
   rebuild path?
6. What minimal structural derived-view representation should Epic 7 implement
   without creating model-generated summaries or overcommitting to a universal
   summarization strategy?
7. How should source provenance from Epic 6 and artifact version provenance from
   Epic 5 be linked into archive entries without duplicating ownership logic?
8. What pagination and indexing strategy keeps archive reads bounded for long
   processes?
9. What idempotency strategy prevents duplicate archive entries when completion
   events are retried?

---

## Recommended Story Breakdown

These stories assume Epic 6 source-management and source-provenance contracts
are settled. No story in this epic owns repository attachment lifecycle,
artifact-model alignment, or external-source attachment.

### Story 0: Foundation (Infrastructure)

Create the archive vocabulary, archive entry contracts, error codes, fixtures,
test helpers, access-boundary helpers, and compatibility mappings from current
process history to the canonical archive taxonomy. This story does not perform
historical migration/backfill unless Tech Design explicitly adds that scope.

### Story 1: Canonical Archive Entry Persistence

**Delivers:** Finalized low-level archive entries can be appended and read for
one process.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (finalized archive entries stored)
- AC-1.2 (required entry taxonomy)
- AC-1.3 (stable process order)
- AC-1.4 (related context links)

### Story 2: Finalization Boundary Between Live State and Archive

**Delivers:** The platform archives completed entries without persisting raw
streaming deltas or interrupted partial objects.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (raw streaming deltas excluded)
- AC-2.2 (interrupted partial objects excluded)
- AC-2.3 (completed live objects archived once)

### Story 3: Archive Read and Reopen Surface

**Delivers:** The user can read finalized archive entries after reload or
environment loss, with access controls and bounded degradation.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (archive entries readable)
- AC-3.2 (archive survives reload/environment loss)
- AC-3.3 (access boundaries)
- AC-3.4 (one degraded entry does not hide healthy entries)

### Story 4: Turn Derivation

**Delivers:** The platform derives turn views from archive entries without
mutating canonical archive truth.
**Prerequisite:** Story 3
**ACs covered:**

- AC-4.1 (turns derived from archive)
- AC-4.2 (turn references archive entries)
- AC-4.3 (archive unchanged by turn derivation)
- AC-4.4 (degraded turn handling)

### Story 5: Minimal Structural Views over Turns

**Delivers:** The platform exposes non-summarizing structural views over turns
with provenance back to turns and archive entries.
**Prerequisite:** Story 4
**ACs covered:**

- AC-5.1 (non-summarizing derived view over turn range)
- AC-5.2 (derived view structural boundary)
- AC-5.3 (derived view provenance)
- AC-5.4 (derived view does not replace archive)
- AC-5.5 (derived-view degradation)

### Story 6: Archive Provenance Coherence

**Delivers:** Archive entries and derived views show available artifact and
source provenance without hiding archive truth when related context degrades.
**Prerequisite:** Story 5
**ACs covered:**

- AC-6.1 (artifact-version provenance visible)
- AC-6.2 (source provenance visible)
- AC-6.3 (missing related provenance degrades one entry)

### Story 7: Reopen and Degraded Archive State

**Delivers:** Archive, turn, and derived-view surfaces remain usable across
reloads, environment loss, and partial derived-view failures.
**Prerequisite:** Story 6
**ACs covered:**

- AC-7.1 (archive/turn/derived-view reads restore)
- AC-7.2 (derived-view failure does not hide archive)
- AC-7.3 (bounded archive reads)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover archive capture, finalization, read, turn derivation, derived
      views, provenance, and degraded-state paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at the browser/server archive boundary
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] Source-management work (Epic 6), external-source attachment, and
      process-specific summarization strategy are explicitly deferred or out of
      scope
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
