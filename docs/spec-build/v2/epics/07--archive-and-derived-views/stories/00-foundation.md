# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Establish the canonical archive, turn, derived-view, finalization, provenance, pagination, error, fixture, and compatibility vocabulary used by all later Epic 7 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Create the shared contracts, durable schema vocabulary, route schemas, error codes, service interfaces, fixtures, and compatibility helpers required by Stories 1 through 7.

**Scope**

In:

- Archive entry kind vocabulary: `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event`
- Finalized-only archive lifecycle vocabulary
- Archive, turn, and derived-view shared contracts
- Archive route schemas and route constants
- Archive error codes
- Convex table/index skeletons for `archiveEntries`, `archiveTurns`, and `derivedArchiveViews`
- `PlatformStore` archive method signatures and in-memory/null test double shape
- Fixtures and test helpers for archive entries, turns, derived views, degraded related context, and pagination
- Compatibility mapping skeleton from current `processHistoryItems` to canonical archive taxonomy

Out:

- Appending and reading real archive entries, owned by Story 1
- Live/finalization hook behavior, owned by Story 2
- User-visible archive read surface, owned by Story 3
- Turn derivation behavior, owned by Story 4
- Derived-view refresh/list behavior, owned by Story 5
- Provenance enrichment behavior, owned by Story 6
- Long-process reopen and bounded degradation behavior, owned by Story 7
- Historical migration/backfill from existing `processHistoryItems`

**Dependencies**

- Epic 5 artifact-version provenance and review/package alignment
- Epic 6 source attachment identity and source provenance
- Existing project/process access boundaries
- Existing process work surface and live update contracts
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared archive, turn, derived-view, finalization, provenance, pagination, and error vocabulary consumed by Stories 1 through 7.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Architecture Context

Story 0 defines the shared archive vocabulary that every later Epic 7 story
depends on. It fixes the split between canonical archive entries, rebuildable
turn/view projections, and compatibility-only process-history bridging without
implementing end-user behavior itself.

#### Routes Introduced By Later Stories

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process archive | `GET` | `/api/projects/{projectId}/processes/{processId}/archive` | Returns finalized canonical archive entries for one process |
| Get process turns | `GET` | `/api/projects/{projectId}/processes/{processId}/archive/turns` | Returns turns derived from canonical archive entries |
| Get derived archive views | `GET` | `/api/projects/{projectId}/processes/{processId}/archive/derived-views` | Returns minimal structural views over turns |
| Refresh derived archive views | `POST` | `/api/projects/{projectId}/processes/{processId}/archive/derived-views/refresh` | Requests rebuild or refresh of derived views from canonical turns |

#### Archive Entry

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `archiveEntryId` | string | yes | non-empty | Stable archive entry identifier |
| `projectId` | string | yes | non-empty | Project containing the process |
| `processId` | string | yes | non-empty | Process that produced the entry |
| `entryKind` | enum | yes | required archive kind | Canonical archive entry kind |
| `sequence` | integer | yes | non-negative | Stable ordering value within one process archive |
| `lifecycleState` | enum | yes | `finalized` | Canonical archive entries are finalized only |
| `finalizationKey` | string | yes | unique within one process | Idempotency key for the finalized source object |
| `sourceObjectId` | string | no | non-empty when present | Correlation id from the live/current object that produced the archive entry |
| `bodyText` | string | no | non-empty when present | Human-readable body for text-like entries |
| `bodyData` | object | no | `{ jsonText: string }` when present | Structured body wrapper for JSON-like entries |
| `bodyFormat` | enum | no | `plain_text`, `markdown`, `structured`, or `none` | Format of body content |
| `relatedArtifactVersionId` | string | no | non-empty when present | Related artifact version when the entry points to artifact work |
| `relatedSourceProvenanceId` | string | no | non-empty when present | Related source provenance entry when the entry points to source work |
| `relatedToolCallId` | string | no | non-empty when present | Correlation id for tool call/result pairing |
| `entryStatus` | enum | yes | `ready` or `degraded` | Whether related context resolved cleanly |
| `degradationReason` | string | no | non-empty when present | Why related context degraded |
| `recordedAt` | string | yes | ISO 8601 UTC | Time the entry was finalized into the archive |

#### Derived Turn

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `turnId` | string | yes | non-empty | Stable derived turn identifier |
| `processId` | string | yes | non-empty | Process the turn belongs to |
| `turnIndex` | integer | yes | non-negative | Turn order within the process |
| `archiveEntryIds` | array of string | yes | non-empty for non-empty turns | Archive entries grouped into this turn |
| `startedAt` | string | yes | ISO 8601 UTC | Earliest archive entry time in the turn |
| `endedAt` | string | yes | ISO 8601 UTC | Latest archive entry time in the turn |
| `turnStatus` | enum | yes | `ready` or `degraded` | Whether the turn resolved cleanly |
| `degradationReason` | string | no | non-empty when present | Why the turn degraded |

#### Derived Archive View

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `derivedViewId` | string | yes | non-empty | Stable derived-view identifier |
| `processId` | string | yes | non-empty | Process the view belongs to |
| `viewKind` | enum | yes | `turn_range` or `chunk_candidate` | Kind of structural derived view in this first slice |
| `turnRange.startIndex` | integer | no | required for `turn_range` | First covered turn index |
| `turnRange.endIndex` | integer | no | required for `turn_range`; >= start | Last covered turn index |
| `sourceTurnIds` | array of string | yes | present | Stable derived turn identifiers used to derive this view |
| `sourceArchiveEntryIds` | array of string | yes | present | Archive entries covered by this view |
| `title` | string | no | non-empty when present | Human-readable label |
| `bodyText` | string | no | non-empty when present | Optional deterministic label or structural note, not generated summary content |
| `viewStatus` | enum | yes | `ready` or `degraded` | Whether the derived view resolved cleanly |
| `degradationReason` | string | no | non-empty when present | Why the derived view degraded |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent time the view was created or refreshed |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `409` | `ARCHIVE_DERIVATION_CONFLICT` | Derived view cannot be refreshed safely from the current archive state |
| `422` | `INVALID_ARCHIVE_REQUEST` | Archive or derived-view request is invalid |

Implementation notes:

- Add `apps/platform/shared/contracts/archive.ts` and export it from `apps/platform/shared/contracts/index.ts`.
- Add `apps/platform/server/schemas/archive.ts` for route request/response validation.
- Add Convex schema table/index definitions for `archiveEntries`, `archiveTurns`, and `derivedArchiveViews`.
- Add `PlatformStore` archive methods for append, list, turn upsert/list, and derived-view replace/list.
- Add test fixtures in `tests/fixtures/archive.ts`.
- Add `ProcessHistoryCompatService` as a compatibility bridge only. It does not migrate historical rows and does not publish archive entries back into the live history stream.
- Contract tests should accept all seven archive entry kinds and reject non-finalized entries.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Shared archive contracts | `apps/platform/shared/contracts/archive.ts`, `apps/platform/shared/contracts/index.ts` |
| Route schemas | `apps/platform/server/schemas/archive.ts` |
| Convex archive tables and indexes | `convex/schema.ts`, `convex/archiveEntries.ts`, `convex/archiveTurns.ts`, `convex/derivedArchiveViews.ts` |
| Store and compatibility seams | `apps/platform/server/services/projects/platform-store.ts`, `apps/platform/server/services/archive/process-history-compat.service.ts` |
| Fixtures | `tests/fixtures/archive.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:221), lines 221-338
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:339), lines 339-559
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:11), lines 11-30

#### Test Mapping

None. Story 0 owns shared archive vocabulary, contracts, and fixtures rather than Epic-owned TCs.

#### Non-TC Decided Tests

- `tests/service/client/archive-section.test.ts`: archive contract schemas accept all Epic 7 entry kinds and reject non-finalized entries

#### Technical Notes

- Keep archive, turn, and derived-view contracts aligned with the Convex schema vocabulary before later stories implement behavior.
- `ProcessHistoryCompatService` is a bridge, not a migration engine and not a live publisher.

#### Anti-Shim Requirements

- Prove shared archive contracts by schema parsing and fixture use, not by informal object-shape assumptions.

#### Verification

- Targeted: `pnpm run typecheck`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared archive, turn, derived-view, pagination, and error contracts exist and are exported from the shared contract root
- Convex schema includes archive table/index skeletons aligned to the tech design
- `PlatformStore`, null store, and in-memory test store expose archive method signatures for later stories
- Route schemas encode cursor/limit validation and the empty derived-view refresh body
- Archive fixtures cover ready entries, degraded entries, all entry kinds, turns, derived views, and paginated pages
- Compatibility mapping skeletons are explicit and do not perform historical backfill
- Story files and coverage artifact can reference Story 0 without redefining the shared vocabulary
