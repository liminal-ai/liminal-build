# Story 2: Finalization Boundary Between Live State and Archive

### Summary
<!-- Jira: Summary field -->
Archive completed process objects exactly once while keeping raw live streaming deltas and interrupted partial objects out of canonical archive truth.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Add the finalization service and completion-point hooks that convert finalized process objects into archive entries without changing the existing live WebSocket/current-object model.

**Scope**

In:

- `ArchiveFinalizationService`
- Finalized object to archive-entry mapping
- Accepted user response finalization
- Completed model/runtime object finalization
- Finalized script emission, tool call, tool result, and process event mapping where completion points exist
- Excluding raw streaming deltas from archive append
- Excluding interrupted partial model/tool objects from archive append
- Idempotent retry behavior using `finalizationKey`
- Compatibility mapping from current process history items when a finalized compatible item is explicitly bridged

Out:

- Replacing existing live WebSocket/upsert transport
- Publishing archive entries back into live history
- User-visible archive route/UI work
- Historical migration/backfill
- Process-specific summarization or context packing

**Dependencies**

- Story 1 canonical archive entry persistence
- Existing process response/action services and live normalizer
- Existing process history presentation surface
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the separation between active live state and canonical archive finalization.

#### Architecture Context

Story 2 is the control-plane finalization seam. It decides which completed
process/runtime objects become canonical archive entries and protects the
existing live WebSocket/upsert model from quietly becoming archive truth.

#### Service Interface

| Method | Description |
|---|---|
| `ArchiveFinalizationService.appendFinalizedEntry(args)` | Validates a completed object and appends one finalized archive entry through `PlatformStore` |
| `ArchiveFinalizationService.appendFromProcessHistoryItem(args)` | Maps a finalized compatible current-history item to one archive entry or returns `null` when no safe mapping exists |

#### Finalization Keys

| Finalized Object | Example `finalizationKey` |
|---|---|
| Accepted user response | `response:{clientRequestId}` |
| Runtime model message | `model:{sourceObjectId}` |
| Tool call | `tool:{relatedToolCallId}:call` |
| Tool result | `tool:{relatedToolCallId}:result` |
| Process event | `event:{sourceObjectId}` |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Finalization service | `apps/platform/server/services/archive/archive-finalization.service.ts` |
| Process response and environment hooks | `apps/platform/server/services/processes/process-response.service.ts`, `apps/platform/server/services/processes/environment/process-environment.service.ts` |
| Live/archive separation | `apps/platform/server/services/processes/live/process-live-normalizer.ts`, `apps/platform/client/app/process-live.ts` |

Implementation notes:

- Existing live upserts remain current-object transport and do not become archive writes.
- Only trusted Fastify completion points call `ArchiveFinalizationService`.
- Raw deltas, partial buffers, interrupted objects, and abandoned tool results do not call append.
- Replayed completion events rely on Story 1 `finalizationKey` idempotency and produce no duplicate row.
- Compatibility mapping may map finalized `process_message` to `model_message`; it must not treat arbitrary legacy presentation rows as canonical archive truth.
- `process-live-normalizer.ts` remains unchanged except where tests assert live/archive separation.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:444), lines 444-505
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:587), lines 587-601
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:706), lines 706-712
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:45), lines 45-49

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-2.1a | `tests/service/server/archive-finalization.test.ts` | raw streaming delta excluded from archive |
| TC-2.2a | `tests/service/server/archive-finalization.test.ts` | interrupted model output excluded |
| TC-2.2b | `tests/service/server/archive-finalization.test.ts` | incomplete tool result excluded |
| TC-2.3a | `tests/service/server/archive-finalization.test.ts` | completed live object archived once |
| TC-2.3b | `convex/archiveEntries.test.ts` | replayed completion does not duplicate entry |

#### Non-TC Decided Tests

- `tests/service/client/process-live.test.ts`: live history upserts still update current process history without creating archive rows
- `tests/service/server/archive-finalization.test.ts`: compatibility mapping from `processHistoryItems` only maps finalized compatible items

#### Technical Notes

- Finalization is a control-plane decision. Live upserts remain current-object transport only.

#### Anti-Shim Requirements

- Prove separation through the real append boundary; do not accept a fake implementation that merely “marks” deltas as ignored without protecting the append path.

#### Verification

- Targeted: `pnpm run test:service`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- `ArchiveFinalizationService` exists and maps completed objects into canonical archive entry shape
- Accepted user responses, completed model messages, completed tool/script/runtime objects, and process events have defined finalization paths where those completion points exist
- Raw streaming deltas and interrupted partial objects cannot append finalized archive entries
- Retried completion events do not duplicate archive rows
- Existing live process upserts continue to update current browser state without creating archive rows by themselves
- Tests cover TC-2.1a through TC-2.3b plus live/archive separation and compatibility mapping from the test plan
