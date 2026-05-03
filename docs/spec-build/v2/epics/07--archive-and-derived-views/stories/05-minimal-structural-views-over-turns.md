# Story 5: Minimal Structural Views Over Turns

### Summary
<!-- Jira: Summary field -->
Expose non-summarizing structural derived views over turns with stable boundaries and provenance back to source turns and archive entries.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Create the first derived-view layer over turns so later chunking, retrieval, summarization, and fidelity-gradient work can build from stable structural projections without replacing archive truth.

**Scope**

In:

- `derivedArchiveViews` durable projection table and functions
- `DerivedArchiveViewService`
- `turn_range` structural views
- `chunk_candidate` structural views
- Derived-view list and refresh routes
- Stable source turn ids and source archive entry ids
- Structural boundaries and optional deterministic labels
- Degraded derived-view state
- Client derived-view surface rendering

Out:

- Model-generated summaries
- Summarization prompts
- Process-specific context packing
- Deleting, mutating, or replacing canonical archive entries
- Generic transcript export product

**Dependencies**

- Story 4 turn derivation
- Stable turn ids and source archive entry references
- Existing archive route auth/access checks
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.1:** The platform can expose a non-summarizing structural derived view over one or more turns.

- **TC-5.1a: Derived view returned for turn range**
  - Given: A process has derived turns
  - When: User requests a derived view
  - Then: The platform returns a derived view that identifies the turn boundary and does not require generated summary text

**AC-5.2:** Derived views identify structural boundaries for the turns they cover.

- **TC-5.2a: Derived view identifies boundary**
  - Given: A derived view is returned for a turn range
  - When: User or process inspects the view metadata
  - Then: The view identifies its source turn range and covered archive-entry references

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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns non-summarizing structural views over turns.

#### Architecture Context

Story 5 builds the first structural view layer over turns. It does not
summarize. It owns list/refresh behavior for `turn_range` and
`chunk_candidate`, keeps stable provenance back to turns and archive entries,
and provides the client surface for viewing degraded or refreshed structural
views.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Get derived archive views | `GET` | `/api/projects/{projectId}/processes/{processId}/archive/derived-views` | Returns minimal structural views over turns |
| Refresh derived archive views | `POST` | `/api/projects/{projectId}/processes/{processId}/archive/derived-views/refresh` | Requests rebuild or refresh of derived views from canonical turns |

#### Derived Archive View

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `derivedViewId` | string | yes | non-empty | Stable derived-view identifier |
| `processId` | string | yes | non-empty | Process the view belongs to |
| `viewKind` | enum | yes | `turn_range` or `chunk_candidate` | Kind of structural derived view |
| `turnRange.startIndex` | integer | no | required for `turn_range` | First covered turn index |
| `turnRange.endIndex` | integer | no | required for `turn_range`; >= start | Last covered turn index |
| `sourceTurnIds` | array of string | yes | present | Stable derived turn identifiers used to derive this view |
| `sourceArchiveEntryIds` | array of string | yes | present | Archive entries covered by this view |
| `title` | string | no | non-empty when present | Human-readable label |
| `bodyText` | string | no | non-empty when present | Optional deterministic structural note, not generated summary text |
| `viewStatus` | enum | yes | `ready` or `degraded` | Whether the derived view resolved cleanly |
| `degradationReason` | string | no | non-empty when present | Why the derived view degraded |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent time the view was created or refreshed |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Derived view storage | `convex/derivedArchiveViews.ts`, `convex/schema.ts` |
| Derived view service | `apps/platform/server/services/archive/derived-archive-view.service.ts` |
| Derived view routes | `apps/platform/server/routes/archive.ts`, `apps/platform/server/schemas/archive.ts` |
| Derived view client surface | `apps/platform/client/features/processes/derived-archive-views-section.ts` |

Implementation notes:

- Derived views are generated from turns, not live state.
- `turn_range` identifies a contiguous turn index range and covered archive-entry references.
- `chunk_candidate` identifies a candidate grouping over one or more turns for later context-management work.
- `sourceTurnIds` store stable turn ids, so derived-view provenance remains valid across turn-cache rebuilds.
- `bodyText`, when present, must be deterministic structural text such as `Turns 4-8`. Generated summary content is out of scope.
- Derived-view rows may be deleted and recreated from turns without affecting canonical archive entries.
- Refresh returns `{ views, refreshStatus }` with `settled`, `accepted`, or `degraded`.
- Refresh conflicts return `ARCHIVE_DERIVATION_CONFLICT`.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:302), lines 302-337
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:634), lines 634-645
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:62), lines 62-68

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-5.1a | `tests/service/server/derived-archive-view.test.ts` | derived view returned for turn range |
| TC-5.2a | `tests/service/server/derived-archive-view.test.ts` | derived view identifies boundary |
| TC-5.3a | `tests/service/server/derived-archive-view.test.ts` | derived view references source turns |
| TC-5.3b | `tests/service/server/derived-archive-view.test.ts` | derived view can trace to archive entries |
| TC-5.4a | `convex/archiveEntries.test.ts` | archive remains after derived view creation |
| TC-5.5a | `tests/service/server/derived-archive-view.test.ts` | derived view failure leaves archive readable |
| TC-5.5b | `tests/service/client/derived-archive-views.test.ts` | derived view reports degraded status |

#### Non-TC Decided Tests

- `tests/service/server/derived-archive-view.test.ts`: `chunk_candidate` rejects generated summary body content
- `tests/service/server/derived-archive-view.test.ts`: stale derived views are rebuilt from current turns without breaking archive reads
- `tests/service/server/archive-api.test.ts`: derived-view refresh conflict returns `ARCHIVE_DERIVATION_CONFLICT`

#### Technical Notes

- Structural views are intentionally shallow. If the implementation starts producing summaries, it has crossed story scope.

#### Anti-Shim Requirements

- Prove view behavior through real route/service responses and durable view rows, not by testing only a formatter that prints static labels.

#### Verification

- Targeted: `pnpm run test:service`
- Targeted: `pnpm run test:client`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Derived-view list and refresh routes exist under the process archive path
- `turn_range` and `chunk_candidate` views identify source turn ids and source archive entry ids
- Derived views include structural boundaries and do not require generated summary text
- Derived-view creation or refresh leaves canonical archive entries readable and unchanged
- Derived-view failures return degraded view state or conflict errors without corrupting archive truth
- Client derived-view section renders ready and degraded structural views
- Tests cover TC-5.1a through TC-5.5b plus no-summary, stale/rebuilt view, and refresh-conflict tests from the test plan
