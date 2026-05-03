# Story 7: Reopen and Degraded Archive State

### Summary
<!-- Jira: Summary field -->
Keep archive, turn, and derived-view reads usable across reloads, environment loss, partial derived-view failures, and long-process pagination.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Harden the completed archive/turn/derived-view surfaces so users can return later, read durable archive truth, rebuild derived views when possible, and receive bounded pages and degraded states instead of losing the archive.

**Scope**

In:

- Reload behavior across archive, turn, and derived-view routes
- Environment-loss behavior across archive, turn, and derived-view routes
- Derived-view read/rebuild failure handling
- Archive visibility during derived-view failures
- Archive pagination default and maximum limits
- Turn pagination default and maximum limits
- Derived-view list limit behavior
- Client rendering for bounded page and `hasMore` state
- Observability events for append/read/derive/refresh/degraded reads where feasible

Out:

- New archive entry taxonomy
- New derived-view kinds beyond `turn_range` and `chunk_candidate`
- Historical migration/backfill
- Generated summaries
- Full e2e product export behavior

**Dependencies**

- Story 6 archive provenance coherence
- All archive, turn, and derived-view route/services
- Existing process reopen and durable bootstrap patterns
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns cross-surface reopen behavior, derived-failure isolation, and bounded long-process reads.

#### Architecture Context

Story 7 is the hardening story for the archive domain. It does not add new
archive shapes; it makes the existing archive, turn, and derived-view surfaces
survive reloads, environment loss, derived-view failures, and long-process read
bounds in a way that remains usable for story-focused agents and users.

#### Read Limits

| Surface | Default Limit | Maximum Limit |
|---|---:|---:|
| Archive entries | 100 | 200 |
| Turns | 50 | 100 |
| Derived views | 50 | 50 |

#### Restorable Surfaces

| Surface | Restore Rule |
|---|---|
| Archive entries | Read from durable `archiveEntries`; environment state is not required |
| Turns | Read cached `archiveTurns` or rebuild from durable `archiveEntries` |
| Derived views | Read `derivedArchiveViews` or rebuild from turns when possible |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Archive route validation and pagination | `apps/platform/server/routes/archive.ts`, `apps/platform/server/schemas/archive.ts` |
| Archive/turn/view services | `apps/platform/server/services/archive/archive-read.service.ts`, `apps/platform/server/services/archive/turn-derivation.service.ts`, `apps/platform/server/services/archive/derived-archive-view.service.ts` |
| Client bounded-page rendering | `apps/platform/client/features/processes/archive-section.ts`, `apps/platform/client/features/processes/archive-turns-section.ts`, `apps/platform/client/features/processes/derived-archive-views-section.ts` |

Implementation notes:

- Archive entries are canonical and remain visible even when derived-view read or refresh fails.
- Turn and derived-view projections are rebuildable from archive entries and turns.
- Derived-view refresh returns `settled`, `accepted`, or `degraded`; unsafe refresh conflicts return `ARCHIVE_DERIVATION_CONFLICT`.
- Archive reads return `page.hasMore` and `page.nextCursor` when more entries exist.
- Invalid cursor or limit values return `INVALID_ARCHIVE_REQUEST`.
- Archive append, archive read, turn derivation, derived-view refresh, and degraded read events should log request context, project id, and process id where the current logging pattern supports it.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:661), lines 661-673
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:416), lines 416-442
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:73), lines 73-76

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-7.1a | `tests/service/server/archive-api.test.ts` | archive and turn reads restore after reload |
| TC-7.1b | `tests/service/server/derived-archive-view.test.ts` | derived view restores after reload |
| TC-7.2a | `tests/service/server/derived-archive-view.test.ts` | canonical archive remains visible during derived-view failure |
| TC-7.3a | `tests/service/server/archive-api.test.ts` | archive read returns bounded page |

#### Non-TC Decided Tests

- `tests/service/client/archive-turns-section.test.ts`: bounded turn surface rendering preserves page state on reload

#### Technical Notes

- This story hardens durability and bounded-read behavior; it does not invent new archive data shapes.

#### Anti-Shim Requirements

- Prove bounded reads with real cursor/limit behavior through the route boundary, not with static fixture slicing.

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
- Archive and turn reads remain available after reload
- Derived views remain readable after reload or rebuild from turns when possible
- Derived-view failures do not block archive reads
- Archive reads enforce default and maximum page limits and return `hasMore`/`nextCursor`
- Turn reads enforce default and maximum page limits
- Client surfaces render bounded page state and derived-view degraded states
- Tests cover TC-7.1a through TC-7.3a
