# Story Lead Base Prompt

## Role Charter
You are the story lead for `02-finalization-boundary-between-live-state-and-archive` on durable story run `02-finalization-boundary-between-live-state-and-archive-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 1.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/stories/02-finalization-boundary-between-live-state-and-archive.md
Bytes: 9659

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

**AC-2.3:** Finalization services append completed live objects into the canonical archive exactly once.

- **TC-2.3a: Completed live object archived once through finalization service**
  - Given: The browser received live upserts for an in-flight object
  - When: The object completes
  - Then: The platform appends one finalized archive entry for that object through the finalization service
- **TC-2.3b: Replayed completion does not duplicate archive entry through service boundary**
  - Given: A completion event is retried for an already-archived object
  - When: The finalization service processes the retry
  - Then: The platform does not create a duplicate canonical entry

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the separation between active live state and canonical archive finalization.

#### Architecture Context

Story 2 is the control-plane finalization seam. It decides which completed
process/runtime objects become canonical archive entries, proves those objects
append exactly once through the service boundary, and protects the existing live
WebSocket/upsert model from quietly becoming archive truth.

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
- Story 1 proves primitive idempotency; this story proves completion hooks call that primitive exactly once for finalized objects.
- Raw deltas, partial buffers, interrupted objects, and abandoned tool results do not call append.
- Replayed completion events rely on Story 1 `finalizationKey` idempotency and must prove exactly-once archive append behavior at the service boundary.
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
| TC-2.3a | `tests/service/server/archive-finalization.test.ts` | completed live object archived once through finalization service |
| TC-2.3b | `tests/service/server/archive-finalization.test.ts` | replayed completion does not duplicate entry through service boundary |

#### Non-TC Decided Tests

- `tests/service/client/process-live.test.ts`: live history upserts still update current process history without creating archive rows
- `tests/service/server/archive-finalization.test.ts`: compatibility mapping from `processHistoryItems` only maps finalized compatible items

#### Technical Notes

- Finalization is a control-plane decision. Live upserts remain current-object transport only, and this story owns the service-level proof that finalized objects append into the archive exactly once.

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


### Test Plan
### test-plan
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md
Bytes: 13723

# Test Plan: Epic 7 Archive and Derived Views

## Purpose

This test plan maps every Epic 7 test condition to planned tests. It verifies
canonical archive append/read behavior, finalization boundaries, archive read
surfaces, turn derivation, structural derived views, provenance enrichment, and
degraded reads.

Related design: `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md`

## Test Strategy

### Test Layers

| Layer | Files | Purpose |
|-------|-------|---------|
| Convex service tests | `convex/archiveEntries.test.ts`, `convex/archiveTurns.test.ts`, `convex/derivedArchiveViews.test.ts` | Durable append/read, sequence, idempotency, cached projections |
| Fastify service/API tests | `tests/service/server/archive-api.test.ts`, `tests/service/server/archive-finalization.test.ts`, `tests/service/server/turn-derivation.test.ts`, `tests/service/server/derived-archive-view.test.ts` | Auth/access, finalization policy, archive reads, derivation, degraded states |
| Client service tests | `tests/service/client/archive-section.test.ts`, `tests/service/client/archive-turns-section.test.ts`, `tests/service/client/derived-archive-views.test.ts` | User-visible archive, turn, structural-view, empty, pagination, and degraded states |
| Existing live/process tests | `tests/service/client/process-live.test.ts`, `tests/service/server/process-live-updates.test.ts`, `tests/service/server/process-execution-orchestrator.test.ts` | Ensure live upserts remain separate from archive finalization |

### Scope Boundaries

| Story | Owns | Does Not Prove |
|-------|------|----------------|
| 1 Archive persistence | Convex archive-entry primitive, taxonomy, sequence ordering, idempotency guard, related-id round-trip | Service finalization hooks, archive route/UI, read-time artifact/source enrichment |
| 2 Finalization boundary | Service-level proof that completed live objects append exactly once and partial/delta objects do not append | Primitive storage mechanics beyond Story 1 contract, browser archive read surface |
| 3 Archive read/reopen | Authenticated route/UI, reload/environment-loss reads, access checks, bounded page contract, displaying degraded entries already present in the response | Deep artifact/source provenance enrichment or lookup-failure degradation semantics |
| 6 Provenance coherence | Artifact/source enrichment and per-entry lookup-failure degradation semantics | Replacing Story 3 route/UI, access, reload, or bounded-page behavior |

### Mock Boundaries

| Boundary | Mock? | Notes |
|----------|-------|-------|
| Artifact/source enrichment services | Yes in Story 6 archive read tests | Mock unavailable related context to verify per-entry degradation |
| Environment/provider runtime | Yes | Finalization tests use completed/interrupted fake runtime objects |
| Convex in route tests | Existing fake/in-memory PlatformStore pattern | Route tests exercise Fastify services without live Convex |
| Internal derivation helpers | No | Test via `TurnDerivationService` and `DerivedArchiveViewService` |
| Client API calls | Yes | Client tests mock fetch/API layer only |

## TC to Test Mapping

| TC | Test File | Test Description | Coverage Notes |
|----|-----------|------------------|----------------|
| TC-1.1a | `convex/archiveEntries.test.ts` | `TC-1.1a appends finalized user_message entry through primitive` | Trusted caller payload persists as canonical `user_message` row |
| TC-1.1b | `convex/archiveEntries.test.ts` | `TC-1.1b appends finalized model_message entry through primitive` | Trusted caller payload persists as canonical `model_message` row |
| TC-1.1c | `convex/archiveEntries.test.ts` | `TC-1.1c appends finalized process_event entry through primitive` | Trusted caller payload persists as canonical `process_event` row |
| TC-1.2a | `convex/archiveEntries.test.ts` | `TC-1.2a accepts required archive entry kinds` | All seven kinds accepted |
| TC-1.2b | `convex/archiveEntries.test.ts` | `TC-1.2b rejects unsupported archive entry kind` | Invalid kind creates no row |
| TC-1.3a | `convex/archiveEntries.test.ts` | `TC-1.3a reads entries in stable sequence order` | Ascending sequence |
| TC-1.3b | `convex/archiveEntries.test.ts` | `TC-1.3b same timestamp entries remain deterministic` | Sequence breaks timestamp ties |
| TC-1.4a | `convex/archiveEntries.test.ts` | `TC-1.4a round-trips related ids on archive row` | Related artifact/source/tool ids return unchanged from canonical row |
| TC-1.4b | `convex/archiveEntries.test.ts` | `TC-1.4b archive row remains readable without related-record lookup` | Primitive read does not require enrichment |
| TC-2.1a | `tests/service/server/archive-finalization.test.ts` | `TC-2.1a raw streaming delta excluded from archive` | Delta object never calls append |
| TC-2.2a | `tests/service/server/archive-finalization.test.ts` | `TC-2.2a interrupted model output excluded` | Interrupted object ignored |
| TC-2.2b | `tests/service/server/archive-finalization.test.ts` | `TC-2.2b incomplete tool result excluded` | Tool result without finalization ignored |
| TC-2.3a | `tests/service/server/archive-finalization.test.ts` | `TC-2.3a completed live object archived once through finalization service` | Finalization service appends one canonical entry |
| TC-2.3b | `tests/service/server/archive-finalization.test.ts` | `TC-2.3b replayed completion does not duplicate entry through service boundary` | Retried completion does not duplicate archive append |
| TC-3.1a | `tests/service/client/archive-section.test.ts` | `TC-3.1a archive entries visible` | Client renders finalized entries |
| TC-3.1b | `tests/service/client/archive-section.test.ts` | `TC-3.1b empty archive state visible` | Empty state rendered |
| TC-3.2a | `tests/service/server/archive-api.test.ts` | `TC-3.2a archive survives reload` | GET archive reads durable state |
| TC-3.2b | `tests/service/server/archive-api.test.ts` | `TC-3.2b archive survives environment loss` | Environment absent does not affect archive read |
| TC-3.3a | `tests/service/server/archive-api.test.ts` | `TC-3.3a unauthorized archive read blocked` | 403/401 without leakage |
| TC-3.3b | `tests/service/server/archive-api.test.ts` | `TC-3.3b missing process archive read returns not found` | 404 `PROCESS_NOT_FOUND` |
| TC-3.4a | `tests/service/server/archive-api.test.ts` | `TC-3.4a degraded entry displayed with healthy entries` | Mixed ready/degraded page without hiding healthy rows |
| TC-4.1a | `tests/service/server/turn-derivation.test.ts` | `TC-4.1a turns derived from archive` | Entries grouped into turns |
| TC-4.1b | `tests/service/server/turn-derivation.test.ts` | `TC-4.1b empty archive produces empty turn view` | Empty turns response |
| TC-4.2a | `tests/service/server/turn-derivation.test.ts` | `TC-4.2a turn includes archive entry references` | Turn carries source entry ids |
| TC-4.3a | `convex/archiveEntries.test.ts` | `TC-4.3a archive unchanged after turn derivation` | Entry rows unchanged after rebuild |
| TC-4.4a | `tests/service/server/turn-derivation.test.ts` | `TC-4.4a degraded turn returned` | One degraded turn does not hide others |
| TC-5.1a | `tests/service/server/derived-archive-view.test.ts` | `TC-5.1a derived view returned for turn range` | `turn_range` view returned without summary text |
| TC-5.2a | `tests/service/server/derived-archive-view.test.ts` | `TC-5.2a derived view identifies boundary` | start/end turn indexes and entry refs |
| TC-5.3a | `tests/service/server/derived-archive-view.test.ts` | `TC-5.3a derived view references source turns` | Source turn ids present |
| TC-5.3b | `tests/service/server/derived-archive-view.test.ts` | `TC-5.3b derived view can trace to archive entries` | Source archive ids present |
| TC-5.4a | `convex/archiveEntries.test.ts` | `TC-5.4a archive remains after derived view creation` | Archive rows still readable |
| TC-5.5a | `tests/service/server/derived-archive-view.test.ts` | `TC-5.5a derived view failure leaves archive readable` | Archive read succeeds after failed refresh |
| TC-5.5b | `tests/service/client/derived-archive-views.test.ts` | `TC-5.5b derived view reports degraded status` | Client renders degraded view |
| TC-6.1a | `tests/service/server/archive-api.test.ts` | `TC-6.1a artifact provenance visible from archive entry` | Artifact version context visible |
| TC-6.2a | `tests/service/server/archive-api.test.ts` | `TC-6.2a source provenance visible from archive entry` | Repository identity/ref visible |
| TC-6.3a | `tests/service/server/archive-api.test.ts` | `TC-6.3a missing source context degrades one entry` | Entry visible with degraded source context |
| TC-6.3b | `tests/service/server/archive-api.test.ts` | `TC-6.3b missing artifact context degrades one entry` | Entry visible with degraded artifact context |
| TC-7.1a | `tests/service/server/archive-api.test.ts` | `TC-7.1a archive and turn reads restore after reload` | Durable archive and cached/rebuilt turns readable |
| TC-7.1b | `tests/service/server/derived-archive-view.test.ts` | `TC-7.1b derived view restores after reload` | View readable or rebuilt |
| TC-7.2a | `tests/service/server/derived-archive-view.test.ts` | `TC-7.2a canonical archive remains visible during derived-view failure` | Archive unaffected by view failure |
| TC-7.3a | `tests/service/server/archive-api.test.ts` | `TC-7.3a archive read returns bounded page` | Page has limit and next cursor |

## Non-TC Decided Tests

| Test File | Test Description | Reason |
|-----------|------------------|--------|
| `tests/service/client/archive-section.test.ts` | archive contract schemas accept all Epic 7 entry kinds and reject non-finalized entries | Protects shared contract vocabulary before route work |
| `tests/service/client/process-live.test.ts` | live history upserts still update current process history without creating archive rows | Protects live/archive separation |
| `tests/service/server/archive-finalization.test.ts` | `appendFromProcessHistoryItem` maps `process_message` to `model_message` only for finalized compatible items | Compatibility bridge clarity |
| `convex/archiveEntries.test.ts` | same `processId + finalizationKey` returns or no-ops existing archive row | Primitive idempotency guard below Story 2 service proofs |
| `tests/service/server/turn-derivation.test.ts` | pre-user-message entries form deterministic turn zero | Edge case in grouping rules |
| `tests/service/server/turn-derivation.test.ts` | turn-cache rebuild preserves stable turn provenance for derived views | Prevents dangling view references after rebuild |
| `tests/service/server/derived-archive-view.test.ts` | `chunk_candidate` rejects generated summary body content | Prevents summarization scope creep |
| `tests/service/server/derived-archive-view.test.ts` | stale derived views are rebuilt from current turns without breaking archive reads | Covers rebuild consistency after new archive entries |
| `convex/archiveEntries.test.ts` | sequence assignment is atomic across same-process appends | Protects ordering under concurrent writes |
| `tests/service/server/archive-api.test.ts` | derived-view refresh conflict returns `ARCHIVE_DERIVATION_CONFLICT` | Error contract coverage |
| `tests/service/server/archive-api.test.ts` | invalid archive query returns `INVALID_ARCHIVE_REQUEST` | Error contract coverage |

## Chunk Test Counts

| Chunk | TC Tests | Non-TC Tests | Total | Primary Files |
|-------|----------|--------------|-------|---------------|
| 0 Foundation | 0 | 1 | 1 | contract/schema/fixture tests |
| 1 Archive persistence | 9 | 2 | 11 | Convex archive entries |
| 2 Finalization boundary | 5 | 2 | 7 | archive finalization, live tests |
| 3 Archive read/reopen | 7 | 1 | 8 | archive API, client archive section |
| 4 Turn derivation | 5 | 2 | 7 | turn derivation service |
| 5 Structural views | 7 | 3 | 10 | derived-view service/client |
| 6 Provenance coherence | 4 | 0 | 4 | archive API enrichment |
| 7 Reopen/bounded reads | 4 | 0 | 4 | archive API, derived-view service |
| **Total** | **41** | **11** | **52** |  |

Epic 7 has 41 named TCs. Non-TC tests cover live/archive separation,
compatibility mapping, turn-zero grouping, turn-cache rebuild stability,
no-summary enforcement, stale/rebuilt derived views, primitive idempotency, atomic sequence
assignment, invalid archive requests, and refresh conflict behavior.

## Verification Gates

| Phase | Command | Expected Result |
|-------|---------|-----------------|
| Skeleton / Red exit | `pnpm run red-verify` | Format, lint, typecheck, and build pass while new behavior tests fail against stubs |
| Development | `pnpm run verify` | Standard project verification passes |
| Green exit | `pnpm run green-verify` | All tests pass and no-test-change guard runs |
| Story/Epic completion | `pnpm run verify-all` | Full verification, integration, and e2e scaffold pass |

## Manual Verification Checklist

1. Start Convex with `pnpm run convex:dev`.
2. Start app server with `pnpm dev`.
3. Run or simulate a process that finalizes user, model, tool, and process-event entries.
4. Open the process archive surface and verify finalized entries are visible in order.
5. Reload the process and verify archive entries remain visible without environment state.
6. Open the turn view and verify turns reference source archive entries.
7. Open derived views and verify structural turn ranges/chunk candidates have no generated summary text.
8. Simulate missing related source/artifact context and verify only affected entries degrade.
9. Verify archive reads return a bounded page with a next cursor.

## Reconciliation

- TC tests: 41
- Non-TC decided tests: 11
- Planned automated tests: 52
- Manual verification steps: 9


## Current Run Index
- planner_turn_index: 1
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-orchestrate-run
- current_child_operation: none
- current_summary: Story orchestration started and durable state has been initialized.
- latest_response_kind: none
- latest_response_path: none
- older_response_count: 0
- caller_input_artifact_count: 0
- prior_self_note_count: 0
- latest_self_note: "none"

## Response Trail
<current_response>
No prior bounded child response is recorded yet.
</current_response>

<history_responses>
No older response entries are recorded yet.
</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/001-current.json
Bytes: 1050

```yaml
storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
storyId: "02-finalization-boundary-between-live-state-and-archive"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "Story orchestration started and durable state has been initialized."
currentPhase: "story-orchestrate-run"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/001-story-validate.json"
    provenance: "prior-run"
latestContinuationHandles:
{}
latestEventSequence: 1
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "orient-from-disk"
  summary: "Orient from 1 existing story artifact(s)."
replayBoundary: null
updatedAt: "2026-05-05T03:55:21.092Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
No prior runtime self-notes are recorded yet.

## Seeded Self-Note Example
Seeded first-turn instruction (not a prior runtime self-note): include `selfNote` when you want to leave a durable reminder for a later planner turn, for example `Track whether the next verifier pass still needs the ruling evidence.`

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/001-events.jsonl
Bytes: 255

```yaml
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 1
  timestamp: "2026-05-05T03:55:21.091Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
```

## State Rules
### state-rules
Bytes: 2986

Requirements source for story-local acceptance: the story file and test plan below.
Current lifecycle state: awaiting_story_lead_action

Lifecycle rules:
State: initialized
Public status: running
Allowed actions: none
Meaning: Runtime scaffolding exists, but no planner turn or child operation has started yet.
Caller implication: Treat this as startup bookkeeping only; wait for the first planner transition before routing work.

State: awaiting_story_lead_action
Public status: running
Allowed actions: run-implement, run-continue, run-self-review, run-verify, run-quick-fix, accept-story, request-ruling, block-story, fail-story
Meaning: The durable record is ready and the next fresh story-lead turn may choose one bounded action.
Caller implication: Planner output is the next source of truth; the run is waiting for a valid bounded action selection.

State: running_child_operation
Public status: running
Allowed actions: none
Meaning: The runtime is executing one bounded child operation selected by the story lead.
Caller implication: Poll runtime artifacts instead of rerouting; the current child operation is still in flight.

State: recording_result
Public status: running
Allowed actions: none
Meaning: The child result or terminal decision is being written to durable artifacts before the next transition.
Caller implication: Do not treat the run as advanced until evidence and ledger updates are durably recorded.

State: terminal
Public status: terminal-only
Allowed actions: none
Meaning: A terminal public outcome has been recorded separately from lifecycleState and the story-lead loop will not continue automatically.
Caller implication: Read the public status and final package to decide impl-lead follow-up such as accept, reopen, or ruling.

Terminal outcome rules:
Outcome: accepted
Meaning: Story-lead evidence is complete enough to recommend acceptance for impl-lead review.
Caller implication: Impl-lead still owes receipt completion, verification gates, and the story commit before accepting the story.

Outcome: needs-ruling
Meaning: The run reached a boundary that requires an explicit caller or maintainer decision.
Caller implication: Surface the ruling request instead of guessing or downgrading the decision into cleanup debt.

Outcome: blocked
Meaning: A named blocker prevents safe forward progress with the current inputs or runtime state.
Caller implication: Resolve the blocker or change the plan before resuming; do not pretend the story is ready to continue.

Outcome: failed
Meaning: An unrecoverable runtime or planner failure ended the current story-lead attempt.
Caller implication: Inspect the failure details and durable artifacts before deciding whether to replay or open a new attempt.

Outcome: interrupted
Meaning: The run stopped before a planned transition finished, usually because the caller or runtime interrupted it.
Caller implication: Use status or resume against the durable artifacts to continue from the last safe checkpoint.

## Runtime Settings
### runtime-settings
Bytes: 241

```yaml
storyGate: "corepack pnpm run green-verify"
epicGate: "corepack pnpm run verify-all"
plannerTimeoutMs: 600000
wholeRunTimeoutMs: 7200000
providerStartupTimeoutMs: 300000
providerActiveSilenceTimeoutMs: 600000
```

## Action Protocol
Return exactly one JSON object matching `StoryLeadAction`.

Examples:
{"action":"run-implement","rationale":"...","inputs":{"promptAddendum":"optional"},"selfNote":"optional durable reminder"}
{"action":"run-continue","rationale":"...","inputs":{"continuationRef":"storyImplementor","promptAddendum":"..."}}
{"action":"run-self-review","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"focus":"optional","continuationRef":"storyImplementor","passes":1}}
{"action":"run-verify","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"focus":"optional","provider":"codex"}}
{"action":"run-verify","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"verifierContinuationRef":"storyVerifier","responseArtifactRef":"/abs/path.json"}}
{"action":"run-quick-fix","rationale":"...","inputs":{"findingRefs":["finding-001"],"remediationGoal":"...","workingDirectory":"optional"}}
{"action":"request-ruling","rationale":"...","inputs":{"decisionType":"...","question":"...","defaultRecommendation":"...","evidence":["..."],"allowedResponses":["..."]}}
{"action":"accept-story","rationale":"...","inputs":{"summary":"...","acceptanceCheckRefs":["..."],"acceptanceChecks":[{"name":"...","status":"pass","evidence":["..."],"reasoning":"..."}],"recommendedImplLeadAction":"accept"},"verification":{"finalVerifierOutcome":"pass","findings":[{"id":"...","status":"fixed","evidence":["..."]}]}}
{"action":"block-story","rationale":"...","inputs":{"reason":"...","detail":"optional","evidence":["..."]},"verification":{"finalVerifierOutcome":"block","findings":[{"id":"...","status":"unresolved","evidence":["..."]}]}}
{"action":"fail-story","rationale":"...","inputs":{"reason":"...","detail":"optional","evidence":["..."]}}

Rules:
- Choose exactly one bounded next action.
- Use only the durable story-run record in this prompt. Do not assume hidden retained planner memory exists.
- Treat `<current_response>` as the latest bounded child response and `<history_responses>` as older response history.
- If the story file and test plan are insufficient for a safe next step, request a ruling instead of asking for epic, tech design, git status, or git diff by default.
- Include `selfNote` only when you want to leave a durable reminder for a later planner turn.

## Acceptance Rubric
Choose the smallest safe bounded action that advances the story using the durable evidence already present.
Prefer continuing from valid child-operation evidence over repeating work, and keep unresolved authority-boundary questions explicit.

## Acceptance Decision Standard
Choose `accept-story` only when the latest verifier result is `pass`, no open findings remain, required proof is present, and the configured story gate passed.
If readiness is promising but gate truth is failed, unavailable, or uncertain, do not accept. Choose the smallest safe next action: verify, quick-fix, block, or request a ruling.

## Ruling Boundaries
Request a ruling when story-local requirements are insufficient, when a blocker needs a caller decision, or when the evidence conflicts in a way that the durable record cannot resolve safely.
