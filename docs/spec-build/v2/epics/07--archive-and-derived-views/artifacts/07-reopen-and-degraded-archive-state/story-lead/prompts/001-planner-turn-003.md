# Story Lead Base Prompt

## Role Charter
You are the story lead for `07-reopen-and-degraded-archive-state` on durable story run `07-reopen-and-degraded-archive-state-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 3.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/stories/07-reopen-and-degraded-archive-state.md
Bytes: 8149

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
- planner_turn_index: 3
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: story-verify completed with outcome revise and status ok.
- latest_response_kind: verifier-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json
- older_response_count: 1
- caller_input_artifact_count: 0
- prior_self_note_count: 2
- latest_self_note: "If verification passes with no open findings and confirms the story gate, the next planner turn may recommend accept-story; otherwise route quick-fix/block/ruling based on verifier findings."

## Response Trail
<current_response>
```yaml
kind: verifier-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json
bytes: 7250
payload:
  command: "story-verify"
  version: 1
  status: "ok"
  outcome: "revise"
  result:
    resultId: "6c3f9e61-4a7a-498b-87b8-7c7df8e16dbd"
    role: "story_verifier"
    provider: "codex"
    model: "gpt-5.4"
    sessionId: "019df723-22bc-73a0-992f-539079db6ce4"
    continuation:
      provider: "codex"
      sessionId: "019df723-22bc-73a0-992f-539079db6ce4"
      storyId: "07-reopen-and-degraded-archive-state"
    mode: "initial"
    story:
      id: "07-reopen-and-degraded-archive-state"
      title: "Story 7: Reopen and Degraded Archive State"
    artifactsRead:
      - "convex/_generated/ai/guidelines.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/stories/07-reopen-and-degraded-archive-state.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md"
      - "package.json"
      - "apps/platform/server/schemas/archive.ts"
      - "apps/platform/server/routes/archive.ts"
      - "apps/platform/server/services/archive/archive-read.service.ts"
      - "apps/platform/server/services/archive/turn-derivation.service.ts"
      - "apps/platform/server/services/archive/derived-archive-view.service.ts"
      - "apps/platform/server/services/projects/platform-store.ts"
      - "apps/platform/client/browser-api/process-work-surface-api.ts"
      - "apps/platform/client/app/bootstrap.ts"
      - "apps/platform/client/features/processes/process-archive-page.ts"
      - "apps/platform/client/features/processes/archive-section.ts"
      - "apps/platform/client/features/processes/archive-turns-section.ts"
      - "apps/platform/client/features/processes/derived-archive-views-section.ts"
      - "convex/archiveEntries.ts"
      - "convex/archiveTurns.ts"
      - "convex/derivedArchiveViews.ts"
      - "tests/service/server/archive-api.test.ts"
      - "tests/service/server/derived-archive-view.test.ts"
      - "tests/service/server/turn-derivation.test.ts"
      - "tests/service/client/archive-section.test.ts"
      - "tests/service/client/archive-turns-section.test.ts"
      - "tests/service/client/derived-archive-views.test.ts"
      - "tests/service/client/archive-router.test.ts"
    reviewScopeSummary: "Verified Story 7 reopen/degraded archive behavior against the story, full Epic 7 tech design, and test plan; inspected the archive routes/services, client archive bootstrap/rendering, Convex persistence helpers, and Story 7 tests; then ran focused service/client checks plus the configured story and epic gates."
    priorFindingStatuses:
[]
    newFindings:
      -
        id: "story-07-client-derived-view-shim"
        severity: "major"
        title: "Archive bootstrap fabricates a derived view when the real derived-view route fails"
        evidence: "`apps/platform/client/app/bootstrap.ts:176-223` builds a synthetic degraded `chunk_candidate` from the first two turns whenever `/archive/derived-views` fails, and `bootstrap.ts:1195-1224` stores that fabricated payload while clearing `archiveSurface.error` to `null`. `tests/service/client/archive-router.test.ts:127-145` locks this in by expecting the client-rendered 'Derived views unavailable' view after a 503. Story 7 says derived views should be read from durable `derivedArchiveViews` or rebuilt by the archive route/service, and Flow 7 says routes return degraded view state while keeping archive entries visible (`docs/spec-build/v2/epics/07--archive-and-derived-views/stories/07-reopen-and-degraded-archive-state.md:163-168`, `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:98-102`, `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:676-678`). This is a real runtime shim that invents server-backed archive data on the client, so the story is not ready to pass under the Real-Code Workaround Standard."
        affectedFiles:
          - "apps/platform/client/app/bootstrap.ts"
          - "tests/service/client/archive-router.test.ts"
        requirementIds:
          - "AC-7.1"
          - "AC-7.2"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    openFindings:
      -
        id: "story-07-client-derived-view-shim"
        severity: "major"
        title: "Archive bootstrap fabricates a derived view when the real derived-view route fails"
        evidence: "`apps/platform/client/app/bootstrap.ts:176-223` builds a synthetic degraded `chunk_candidate` from the first two turns whenever `/archive/derived-views` fails, and `bootstrap.ts:1195-1224` stores that fabricated payload while clearing `archiveSurface.error` to `null`. `tests/service/client/archive-router.test.ts:127-145` locks this in by expecting the client-rendered 'Derived views unavailable' view after a 503. Story 7 says derived views should be read from durable `derivedArchiveViews` or rebuilt by the archive route/service, and Flow 7 says routes return degraded view state while keeping archive entries visible (`docs/spec-build/v2/epics/07--archive-and-derived-views/stories/07-reopen-and-degraded-archive-state.md:163-168`, `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:98-102`, `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:676-678`). This is a real runtime shim that invents server-backed archive data on the client, so the story is not ready to pass under the Real-Code Workaround Standard."
        affectedFiles:
          - "apps/platform/client/app/bootstrap.ts"
          - "tests/service/client/archive-router.test.ts"
        requirementIds:
          - "AC-7.1"
          - "AC-7.2"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    requirementCoverage:
      verified:
        - "AC-7.1"
        - "TC-7.1a"
        - "TC-7.1b"
        - "AC-7.2"
        - "TC-7.2a"
        - "AC-7.3"
        - "TC-7.3a"
      unverified:
[]
    gatesRun:
      -
        command: "corepack pnpm run test:service -- --run tests/service/server/archive-api.test.ts tests/service/server/derived-archive-view.test.ts tests/service/server/turn-derivation.test.ts"
        result: "pass"
      -
        command: "corepack pnpm run test:client -- --run tests/service/client/archive-section.test.ts tests/service/client/archive-turns-section.test.ts tests/service/client/derived-archive-views.test.ts tests/service/client/archive-router.test.ts"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    productionPathFindings:
      - "`apps/platform/client/app/bootstrap.ts` synthesizes a degraded `chunk_candidate` from archive/turn data after a derived-view fetch failure, so the real archive screen can render client-invented derived-view data that never came from `derivedArchiveViews` or the server rebuild path."
    recommendedNextStep: "revise"
    recommendedFixScope: "same-session-implementor"
    openQuestions:
[]
    additionalObservations:
      - "Both configured gates passed locally, but `guard:no-test-changes` and `test:e2e` are currently scaffolded `SKIP` steps in repo scripts rather than executable checks."
      - "The focused `test:service` and `test:client` invocations expanded to the full service/client suites because those package scripts already target the whole directories."
      - "I did not find archive-specific append/read/derive/refresh logging in the inspected Story 7 services; because the story only calls for this 'where feasible', I treated that as a non-blocking gap rather than a formal finding."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json"
  startedAt: "2026-05-05T07:56:08.033Z"
  finishedAt: "2026-05-05T08:03:51.796Z"
```
</current_response>

<history_responses>

<history_entry>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json
bytes: 4016
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "7915e203-006a-43fc-a453-1fb99f1c62c2"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df719-539b-7af0-9bb0-3376415c3a97"
    continuation:
      provider: "codex"
      sessionId: "019df719-539b-7af0-9bb0-3376415c3a97"
      storyId: "07-reopen-and-degraded-archive-state"
    outcome: "ready-for-verification"
    story:
      id: "07-reopen-and-degraded-archive-state"
      title: "Story 7: Reopen and Degraded Archive State"
    planSummary: "Hardened Story 7 reopen behavior by letting derived-view reads rebuild when possible, fall back to stored structural views when rebuilds fail, cap derived-view lists at 50 items, and keep the archive route usable when derived-view bootstrap requests degrade. Added Story 7 coverage for reload restoration, bounded archive/turn pages, and client-side degraded derived-view rendering during archive reopen."
    changedFiles:
      -
        path: "apps/platform/server/services/archive/derived-archive-view.service.ts"
        reason: "Rebuilds derived views when possible, falls back to stored views on rebuild failure, and enforces the 50-view cap."
      -
        path: "apps/platform/client/app/bootstrap.ts"
        reason: "Keeps archive/turn data visible when derived-view bootstrap requests fail by synthesizing a degraded derived-view response instead of failing the whole archive page."
      -
        path: "tests/service/server/derived-archive-view.test.ts"
        reason: "Adds Story 7 coverage for reload restoration from stored views and derived-view list bounding."
      -
        path: "tests/service/server/archive-api.test.ts"
        reason: "Adds Story 7 coverage for archive-plus-turn reload restoration and bounded archive pagination through the route boundary."
      -
        path: "tests/service/server/turn-derivation.test.ts"
        reason: "Adds bounded turn-page coverage for long archives."
      -
        path: "tests/service/client/archive-turns-section.test.ts"
        reason: "Adds client rendering coverage for bounded turn-page state."
      -
        path: "tests/service/client/archive-router.test.ts"
        reason: "Adds archive-route bootstrap coverage proving canonical archive visibility during derived-view degradation."
    tests:
      added:
        - "tests/service/client/archive-router.test.ts"
      modified:
        - "tests/service/client/archive-turns-section.test.ts"
        - "tests/service/server/archive-api.test.ts"
        - "tests/service/server/derived-archive-view.test.ts"
        - "tests/service/server/turn-derivation.test.ts"
      removed:
[]
      totalAfterStory: 46
      deltaFromPriorBaseline: 7
    gatesRun:
      -
        command: "corepack pnpm vitest run tests/service/server/archive-api.test.ts tests/service/server/derived-archive-view.test.ts tests/service/server/turn-derivation.test.ts tests/service/client/archive-section.test.ts tests/service/client/archive-turns-section.test.ts tests/service/client/derived-archive-views.test.ts tests/service/client/archive-router.test.ts"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    selfReview:
      passesRun: 0
      findingsFixed:
        - "Derived-view reloads no longer depend solely on a fresh rebuild; they now fall back to stored structural views when rebuild fails."
        - "Archive bootstrap no longer hides canonical archive entries when only the derived-view request degrades."
        - "Story 7 now has explicit route/client coverage for bounded archive pages, bounded turn pages, and degraded archive reopen behavior."
      findingsSurfaced:
[]
    openQuestions:
[]
    specDeviations:
[]
    recommendedNextStep: "Proceed to story verification, with optional manual archive-route reload checks if the verifier wants UI confirmation beyond the passing automated gates."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json"
  startedAt: "2026-05-05T07:45:25.184Z"
  finishedAt: "2026-05-05T07:55:57.619Z"
```
</history_entry>

</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/story-lead/001-current.json
Bytes: 2312

```yaml
storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
storyId: "07-reopen-and-degraded-archive-state"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "story-verify completed with outcome revise and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json"
    provenance: "current-run"
  -
    kind: "verifier-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df719-539b-7af0-9bb0-3376415c3a97"
    storyId: "07-reopen-and-degraded-archive-state"
  storyVerifier:
    provider: "codex"
    sessionId: "019df723-22bc-73a0-992f-539079db6ce4"
    storyId: "07-reopen-and-degraded-archive-state"
latestEventSequence: 9
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "Implementation is complete and reports passing gates, but the durable record has no independent verifier result yet. The prior self-note also requires verifier/gate evidence before considering acceptance, so the smallest safe next action is a fresh story verification against the implementor artifact and Story 7 requirements."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json"
replayBoundary: null
updatedAt: "2026-05-05T08:03:51.806Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: If verification passes with no open findings and confirms the story gate, the next planner turn may recommend accept-story; otherwise route quick-fix/block/ruling based on verifier findings.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-05T07:45:25.147Z; note="After implementation, require verifier/gate evidence before considering acceptance; do not accept without a passing final verifier and story gate."
- sequence=8; actionSequence=7; createdAt=2026-05-05T07:56:07.996Z; note="If verification passes with no open findings and confirms the story gate, the next planner turn may recommend accept-story; otherwise route quick-fix/block/ruling based on verifier findings."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/story-lead/001-events.jsonl
Bytes: 4201

```yaml
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 1
  timestamp: "2026-05-05T07:45:10.096Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 2
  timestamp: "2026-05-05T07:45:25.120Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df719-189a-7673-82d0-1d5551680c26"
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 3
  timestamp: "2026-05-05T07:45:25.146Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation, require verifier/gate evidence before considering acceptance; do not accept without a passing final verifier and story gate."
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 4
  timestamp: "2026-05-05T07:45:25.147Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation, require verifier/gate evidence before considering acceptance; do not accept without a passing final verifier and story gate."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 5
  timestamp: "2026-05-05T07:55:57.629Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 6
  timestamp: "2026-05-05T07:56:07.972Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/story-lead/prompts/001-planner-turn-002.md"
    sessionId: "019df722-fa0c-71c3-bfff-fe1c0eb89419"
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 7
  timestamp: "2026-05-05T07:56:07.996Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-verify."
  data:
    actionType: "run-verify"
    turn: 2
    selfNote: "If verification passes with no open findings and confirms the story gate, the next planner turn may recommend accept-story; otherwise route quick-fix/block/ruling based on verifier findings."
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 8
  timestamp: "2026-05-05T07:56:07.996Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "If verification passes with no open findings and confirms the story gate, the next planner turn may recommend accept-story; otherwise route quick-fix/block/ruling based on verifier findings."
    actionSequence: 7
    actionType: "run-verify"
    turn: 2
-
  storyRunId: "07-reopen-and-degraded-archive-state-story-run-001"
  sequence: 9
  timestamp: "2026-05-05T08:03:51.806Z"
  type: "child-operation-completed"
  summary: "story-verify completed with outcome revise and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json"
  data:
    actionType: "run-verify"
    command: "story-verify"
    outcome: "revise"
    status: "ok"
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
