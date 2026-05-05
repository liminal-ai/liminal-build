# Story Lead Base Prompt

## Role Charter
You are the story lead for `04-turn-derivation` on durable story run `04-turn-derivation-story-run-001`.
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
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/stories/04-turn-derivation.md
Bytes: 9075

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
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/story-lead/001-current.json
Bytes: 939

```yaml
storyRunId: "04-turn-derivation-story-run-001"
storyId: "04-turn-derivation"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "Story orchestration started and durable state has been initialized."
currentPhase: "story-orchestrate-run"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/001-story-validate.json"
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
updatedAt: "2026-05-05T05:46:53.417Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
No prior runtime self-notes are recorded yet.

## Seeded Self-Note Example
Seeded first-turn instruction (not a prior runtime self-note): include `selfNote` when you want to leave a durable reminder for a later planner turn, for example `Track whether the next verifier pass still needs the ruling evidence.`

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/story-lead/001-events.jsonl
Bytes: 218

```yaml
-
  storyRunId: "04-turn-derivation-story-run-001"
  sequence: 1
  timestamp: "2026-05-05T05:46:53.416Z"
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
