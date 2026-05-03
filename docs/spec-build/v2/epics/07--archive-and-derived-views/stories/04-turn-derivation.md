# Story 4: Turn Derivation

### Summary
<!-- Jira: Summary field -->
Derive deterministic turn views from canonical archive entries, cache them as rebuildable projections, and preserve archive truth unchanged.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Implement deterministic turn derivation over archive entries and expose the turn read surface without mutating canonical archive rows.

**Scope**

In:

- `archiveTurns` cached projection table and durable functions
- `TurnDerivationService`
- Deterministic grouping by archive sequence, entry kind, tool-call correlation, and timestamps
- Empty archive to empty turn view
- Stable turn ids and turn indexes
- Turn references back to archive entries
- Degraded turn metadata when grouped entries have unresolved context
- `GET /api/projects/{projectId}/processes/{processId}/archive/turns`
- Client turn surface rendering

Out:

- Structural derived views over turns, owned by Story 5
- Generated summaries
- Treating turns as canonical archive truth
- Rebuilding turns on every archive append

**Dependencies**

- Story 3 archive read and reopen surface
- `archiveEntries` stable ordering
- Existing route auth/access checks
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns turn derivation and cached turn reads.

#### Architecture Context

Story 4 introduces the first rebuildable projection over canonical archive
entries. It owns the deterministic grouping algorithm, stable `turnId`
generation, cached turn read surface, and the client turn panel that consumes
those projections.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process turns | `GET` | `/api/projects/{projectId}/processes/{processId}/archive/turns` | Returns turns derived from canonical archive entries |

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

#### Grouping Rules

| Rule | Behavior |
|---|---|
| User message boundary | `user_message` starts a new turn |
| Pre-user entries | Entries before the first `user_message` form turn `0` if they exist |
| Active turn attachment | `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event` attach to the active turn |
| Tool correlation | A `tool_result` with `relatedToolCallId` stays in the same turn as its matching `tool_call` when both are present |
| Degraded context | Degraded related context degrades the turn, not the canonical archive entries |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Turn cache storage | `convex/archiveTurns.ts`, `convex/schema.ts` |
| Turn derivation service | `apps/platform/server/services/archive/turn-derivation.service.ts` |
| Turn route/schema | `apps/platform/server/routes/archive.ts`, `apps/platform/server/schemas/archive.ts` |
| Turn client surface | `apps/platform/client/features/processes/archive-turns-section.ts` |

Implementation notes:

- Turns are cached in `archiveTurns` for bounded reads but remain rebuildable from `archiveEntries`.
- `TurnDerivationService.rebuildTurns` upserts by stable `turnId` such as `{processId}:turn:{turnIndex}`.
- Rebuild happens on turn/derived-view read or explicit derived-view refresh, not on every archive append.
- Turn derivation must not mutate `archiveEntries`.
- The turn response uses the same cursor page shape as archive reads.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:273), lines 273-300
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:614), lines 614-633
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:57), lines 57-61

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-4.1a | `tests/service/server/turn-derivation.test.ts` | turns derived from archive |
| TC-4.1b | `tests/service/server/turn-derivation.test.ts` | empty archive produces empty turn view |
| TC-4.2a | `tests/service/server/turn-derivation.test.ts` | turn includes archive entry references |
| TC-4.3a | `convex/archiveEntries.test.ts` | archive unchanged after turn derivation |
| TC-4.4a | `tests/service/server/turn-derivation.test.ts` | degraded turn returned |

#### Non-TC Decided Tests

- `tests/service/server/turn-derivation.test.ts`: pre-user-message entries form deterministic turn zero
- `tests/service/server/turn-derivation.test.ts`: turn-cache rebuild preserves stable turn provenance for derived views
- `tests/service/client/archive-turns-section.test.ts`: turn surface renders stable turn boundaries and degraded turn metadata

#### Technical Notes

- Stable `turnId` is the handoff seam between turn derivation and later derived-view stories.

#### Anti-Shim Requirements

- Prove grouping and rebuild behavior through actual turn-derivation service logic and durable projections, not by hard-coding expected turns in fixtures without exercising the derivation path.

#### Verification

- Targeted: `pnpm run test:service`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Turn derivation returns deterministic turns from ordered archive entries
- Empty archives return an empty turn view
- Every non-empty turn includes source archive entry ids
- Deriving or rebuilding turns leaves canonical archive entries unchanged
- One degraded turn does not hide other turns
- Stable turn ids survive rebuilds so derived views can reference them later
- Tests cover TC-4.1a through TC-4.4a plus turn-zero grouping and rebuild-stability tests from the test plan
