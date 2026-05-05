# Story Lead Base Prompt

## Role Charter
You are the story lead for `02-finalization-boundary-between-live-state-and-archive` on durable story run `02-finalization-boundary-between-live-state-and-archive-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 4.
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
- planner_turn_index: 4
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: quick-fix completed with outcome ready-for-verification and status ok.
- latest_response_kind: quick-fix-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json
- older_response_count: 2
- caller_input_artifact_count: 0
- prior_self_note_count: 3
- latest_self_note: "After quick-fix returns, run verification focused on the fixed user_message bridge finalizationKey finding plus TC-2.3b and compatibility mapping evidence before considering accept-story."

## Response Trail
<current_response>
```yaml
kind: quick-fix-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json
bytes: 9237
payload:
  command: "quick-fix"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    provider: "codex"
    model: "gpt-5.4"
    rawProviderOutputPreview: |-
      {"type":"thread.started","thread_id":"019df65a-4ebd-7d71-9f43-2a9577927160"}
      {"type":"turn.started"}
      {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"I’m going to inspect the relevant services and tests first, and I’ll read the Convex guidelines up front so we stay aligned with the repo’s rules before making the bridge/finalization change."}}
      {"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' convex/_generated/ai/guidelines.md\"","aggregated_output":"","exit_code":null,"status":"in_progress"}}
      {"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' convex/_generated/ai/guidelines.md\"","aggregated_output":"# Convex guidelines\n\n## Function guidelines\n\n### Http endpoint syntax\n\n- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:\n\n```typescript\nimport { httpRouter } from \"convex/server\";\nimport { httpAction } from \"./_generated/server\";\nconst http = httpRouter();\nhttp.route({\n  path: \"/echo\",\n  method: \"POST\",\n  handler: httpAction(async (ctx, req) => {\n    const body = await req.bytes();\n    return new Response(body, { status: 200 });\n  }),\n});\n```\n\n- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.\n\n### Validators\n\n- Below is an example of an array validator:\n\n```typescript\nimport { mutation } from \"./_generated/server\";\nimport { v } from \"convex/values\";\n\nexport default mutation({\n  args: {\n    simpleArray: v.array(v.union(v.string(), v.number())),\n  },\n  handler: async (ctx, args) => {\n    //...\n  },\n});\n```\n\n- Below is an example of a schema with validators that codify a discriminated union type:\n\n```typescript\nimport { defineSchema, defineTable } from \"convex/server\";\nimport { v } from \"convex/values\";\n\nexport default defineSchema({\n  results: defineTable(\n    v.union(\n      v.object({\n        kind: v.literal(\"error\"),\n        errorMessage: v.string(),\n      }),\n      v.object({\n        kind: v.literal(\"success\"),\n        value: v.number(),\n      }),\n    ),\n  ),\n});\n```\n\n- Here are the valid Convex types along with their respective validators:\n  Convex Type | TS/JS type | Example Usage | Validator for argument validation and schemas | Notes |\n  | ----------- | ------------| -----------------------| -----------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|\n  | Id | string | `doc._id` | `v.id(tableName)` | |\n  | Null | null | `null` | `v.null()` | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead. |\n  | Int64 | bigint | `3n` | `v.int64()` | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers. |\n  | Float64 | number | `3.1` | `v.number()` | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings. |\n  | Boolean | boolean | `true` | `v.boolean()` |\n  | String | string | `\"abc\"` | `v.string()` | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8. |\n  | Bytes | ArrayBuffer | `new ArrayBuffer(8)` | `v.bytes()` | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types. |\n  | Array | Array | `[1, 3.2, \"abc\"]` | `v.array(values)` | Arrays can have at most 8192 values. |\n  | Object | Object | `{a: \"abc\"}` | `v.object({property: value})` | Convex only supports \"plain old JavaScript objects\" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with \"$\" or \"_\". |\n| Record      | Record      | `{\"a\": \"1\", \"b\": \"2\"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with \"$\" or \"\\_\". |\n\n### Function registration\n\n- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.\n- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.\n- You CANNOT register a function through the `api` or `internal` objects.\n- ALWAYS include argument validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`.\n\n### Function calling\n\n- Use `ctx.runQuery` to call a query from a query, mutation, or action.\n- Use `ctx.runMutation` to call a mutation from a mutation or action.\n- Use `ctx.runAction` to call an action from an action.\n- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.\n- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.\n- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.\n- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example,\n\n```\nexport const f = query({\n  args: { name: v.string() },\n  handler: async (ctx, args) => {\n    return \"Hello \" + args.name;\n  },\n});\n\nexport const g = query({\n  args: {},\n  handler: async (ctx, args) => {\n    const result: string = await ctx.runQuery(api.example.f, { name: \"Bob\" });\n    return null;\n  },\n});\n```\n\n### Function references\n\n- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.\n- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.\n- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.\n- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.\n- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.\n\n### Pagination\n\n- Define pagination using the following syntax:\n\n```ts\nimport { v } from \"convex/values\";\nimport { query, mutation } from \"./_generated/server\";\nimport { paginationOptsValidator } from \"convex/server\";\nexport const listWithExtraArg = query({\n  args: { paginationOpts: paginationOptsValidator, author: v.string() },\n  handler: async (ctx, args) => {\n    return await ctx.db\n      .query(\"messages\")\n      .withIndex(\"by_author\", (q) => q.eq(\"author\", args.author))\n      .order(\"desc\")\n      .paginate(args.paginationOpts);\n  },\n});\n```\n\nNote: `paginationOpts` is an object with the following properties:\n\n- `numItems`: the maximum number of documents to retu
    rawProviderOutputBytes: 2358065
    rawProviderOutputTruncated: true
    rawProviderOutputLogPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/streams/002-quick-fix.stdout.log"
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json"
  startedAt: "2026-05-05T04:16:46.583Z"
  finishedAt: "2026-05-05T04:20:12.779Z"
```
</current_response>

<history_responses>

<history_entry>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json
bytes: 3571
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "f708e931-1921-433e-ae4c-d6482c7430bb"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df646-e074-7f90-9808-50acca9910a9"
    continuation:
      provider: "codex"
      sessionId: "019df646-e074-7f90-9808-50acca9910a9"
      storyId: "02-finalization-boundary-between-live-state-and-archive"
    outcome: "ready-for-verification"
    story:
      id: "02-finalization-boundary-between-live-state-and-archive"
      title: "Story 2: Finalization Boundary Between Live State and Archive"
    planSummary: "Added an ArchiveFinalizationService that validates finalized archive writes, bridges finalized compatible process-history items into canonical archive entries, and wired the current completion hooks so accepted user responses plus finalized execution/process events append into the archive exactly once without changing live upsert transport."
    changedFiles:
      -
        path: "apps/platform/server/services/archive/archive-finalization.service.ts"
        reason: "New finalization seam for finalized-entry validation, idempotent archive append calls, and safe process-history bridging."
      -
        path: "apps/platform/server/services/processes/process-response.service.ts"
        reason: "Archives accepted user responses with response-scoped finalization keys on both initial accept and idempotent replay."
      -
        path: "apps/platform/server/services/processes/environment/process-environment.service.ts"
        reason: "Archives finalized execution history items and generated process events while leaving live/history persistence behavior intact."
      -
        path: "tests/service/server/archive-finalization.test.ts"
        reason: "Covers Story 2 finalization boundary cases: delta exclusion, interrupted exclusion, incomplete tool-result rejection, exact-once append, retry idempotency, and safe compatibility mapping."
    tests:
      added:
        - "tests/service/server/archive-finalization.test.ts"
      modified:
[]
      removed:
[]
      totalAfterStory: 670
      deltaFromPriorBaseline: 7
    gatesRun:
      -
        command: "corepack pnpm vitest run tests/service/server/archive-finalization.test.ts"
        result: "pass"
      -
        command: "corepack pnpm vitest run tests/service/server/process-execution-orchestrator.test.ts tests/service/server/process-actions-api.test.ts tests/service/client/archive-section.test.ts"
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
        - "Accepted user responses now append canonical archive entries through a dedicated finalization service and reuse finalizationKey idempotency on replay."
        - "ExecutionResult history items and generated process events now archive only finalized compatible objects, keeping current live/history writes separate from canonical archive truth."
        - "Incomplete tool-result finalizations are rejected at the service boundary instead of being allowed into the canonical archive path."
      findingsSurfaced:
[]
    openQuestions:
[]
    specDeviations:
[]
    recommendedNextStep: "Hand this story to verification, with extra attention on archive sequence contents after response retries and repeated execution-completion replays."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json"
  startedAt: "2026-05-05T03:55:33.139Z"
  finishedAt: "2026-05-05T04:08:52.390Z"
```
</history_entry>

<history_entry>
```yaml
kind: verifier-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json
bytes: 6644
payload:
  command: "story-verify"
  version: 1
  status: "ok"
  outcome: "revise"
  result:
    resultId: "b11ad75a-dd58-4a13-a1e5-13b5e4de6c0b"
    role: "story_verifier"
    provider: "codex"
    model: "gpt-5.4"
    sessionId: "019df653-489e-7370-8de4-3a3f3f801119"
    continuation:
      provider: "codex"
      sessionId: "019df653-489e-7370-8de4-3a3f3f801119"
      storyId: "02-finalization-boundary-between-live-state-and-archive"
    mode: "initial"
    story:
      id: "02-finalization-boundary-between-live-state-and-archive"
      title: "Story 2: Finalization Boundary Between Live State and Archive"
    artifactsRead:
      - "convex/_generated/ai/guidelines.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/stories/02-finalization-boundary-between-live-state-and-archive.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md"
      - "apps/platform/server/services/archive/archive-finalization.service.ts"
      - "apps/platform/server/services/archive/process-history-compat.service.ts"
      - "apps/platform/server/services/processes/process-response.service.ts"
      - "apps/platform/server/services/processes/environment/process-environment.service.ts"
      - "apps/platform/server/services/processes/live/process-live-normalizer.ts"
      - "apps/platform/client/app/process-live.ts"
      - "apps/platform/server/services/projects/platform-store.ts"
      - "tests/service/server/archive-finalization.test.ts"
      - "tests/service/client/process-live.test.ts"
      - "tests/fixtures/process-history.ts"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json"
      - "docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/streams/005-verify.stdout.log"
    reviewScopeSummary: "Reviewed Story 2 finalization-boundary requirements and design, inspected the new ArchiveFinalizationService plus its response/environment completion hooks and live-separation surfaces, checked the story tests, reproduced a compatibility-bridge edge case, and reran the focused story test plus the story and epic gates."
    priorFindingStatuses:
[]
    newFindings:
      -
        id: "story2-user-message-bridge-finalization-key"
        severity: "major"
        title: "Bridged user_message rows can bypass the accepted-response idempotency key and duplicate archive truth"
        evidence: "`ProcessHistoryCompatService` marks `user_message` as bridgeable (`apps/platform/server/services/archive/process-history-compat.service.ts:8-12`), but `ArchiveFinalizationService.buildHistoryItemFinalizationKey` emits `response:${historyItemId}` for that bridge path (`apps/platform/server/services/archive/archive-finalization.service.ts:88-100`) while `ProcessResponseService` archives the same accepted response under `response:${clientRequestId}` (`apps/platform/server/services/processes/process-response.service.ts:153-158`). Reproduction with `corepack pnpm exec tsx` after one `respond()` call and one `appendFromProcessHistoryItem(existing.historyItem)` call produced two archive rows for the same response: `response:req-archive-3` and `response:process-archive-finalization:history-response-1`. That breaks exact-once archive finalization if the explicit compatibility bridge is used on accepted responses."
        affectedFiles:
          - "apps/platform/server/services/archive/process-history-compat.service.ts"
          - "apps/platform/server/services/archive/archive-finalization.service.ts"
          - "apps/platform/server/services/processes/process-response.service.ts"
          - "tests/service/server/archive-finalization.test.ts"
        requirementIds:
          - "AC-2.3"
          - "TC-2.3b"
          - "DoD-compatibility-mapping"
        recommendedFixScope: "quick-fix"
        blocking: true
    openFindings:
      -
        id: "story2-user-message-bridge-finalization-key"
        severity: "major"
        title: "Bridged user_message rows can bypass the accepted-response idempotency key and duplicate archive truth"
        evidence: "`ProcessHistoryCompatService` marks `user_message` as bridgeable (`apps/platform/server/services/archive/process-history-compat.service.ts:8-12`), but `ArchiveFinalizationService.buildHistoryItemFinalizationKey` emits `response:${historyItemId}` for that bridge path (`apps/platform/server/services/archive/archive-finalization.service.ts:88-100`) while `ProcessResponseService` archives the same accepted response under `response:${clientRequestId}` (`apps/platform/server/services/processes/process-response.service.ts:153-158`). Reproduction with `corepack pnpm exec tsx` after one `respond()` call and one `appendFromProcessHistoryItem(existing.historyItem)` call produced two archive rows for the same response: `response:req-archive-3` and `response:process-archive-finalization:history-response-1`. That breaks exact-once archive finalization if the explicit compatibility bridge is used on accepted responses."
        affectedFiles:
          - "apps/platform/server/services/archive/process-history-compat.service.ts"
          - "apps/platform/server/services/archive/archive-finalization.service.ts"
          - "apps/platform/server/services/processes/process-response.service.ts"
          - "tests/service/server/archive-finalization.test.ts"
        requirementIds:
          - "AC-2.3"
          - "TC-2.3b"
          - "DoD-compatibility-mapping"
        recommendedFixScope: "quick-fix"
        blocking: true
    requirementCoverage:
      verified:
        - "AC-2.1"
        - "TC-2.1a"
        - "AC-2.2"
        - "TC-2.2a"
        - "TC-2.2b"
        - "TC-2.3a"
      unverified:
        - "AC-2.3"
        - "TC-2.3b"
        - "DoD-compatibility-mapping"
    gatesRun:
      -
        command: "corepack pnpm exec vitest run tests/service/server/archive-finalization.test.ts --environment node"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    productionPathFindings:
[]
    recommendedNextStep: "revise"
    recommendedFixScope: "quick-fix"
    openQuestions:
[]
    additionalObservations:
      - "Production path audit did not find fake adapters, placeholder branches, or shim archive-write paths in the reviewed Story 2 code."
      - "The saved artifact `docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json` is empty, so gate truth in this review comes from fresh local reruns rather than that JSON artifact."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json"
  startedAt: "2026-05-05T04:09:06.239Z"
  finishedAt: "2026-05-05T04:16:36.064Z"
```
</history_entry>

</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/001-current.json
Bytes: 2655

```yaml
storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
storyId: "02-finalization-boundary-between-live-state-and-archive"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "quick-fix completed with outcome ready-for-verification and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json"
    provenance: "current-run"
  -
    kind: "verifier-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json"
    provenance: "current-run"
  -
    kind: "quick-fix-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df646-e074-7f90-9808-50acca9910a9"
    storyId: "02-finalization-boundary-between-live-state-and-archive"
  storyVerifier:
    provider: "codex"
    sessionId: "019df653-489e-7370-8de4-3a3f3f801119"
    storyId: "02-finalization-boundary-between-live-state-and-archive"
latestEventSequence: 13
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "The latest verifier result is revise with one blocking quick-fix finding: bridged user_message compatibility rows can use a different finalizationKey than the accepted-response path and duplicate archive truth. The smallest safe next action is to remediate that specific idempotency-key mismatch before re-verification."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json"
replayBoundary: null
updatedAt: "2026-05-05T04:20:12.788Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: After quick-fix returns, run verification focused on the fixed user_message bridge finalizationKey finding plus TC-2.3b and compatibility mapping evidence before considering accept-story.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-05T03:55:33.098Z; note="After implementation returns, verify evidence covers TC-2.1a through TC-2.3b plus the two non-TC decided tests before considering self-review or verifier dispatch."
- sequence=8; actionSequence=7; createdAt=2026-05-05T04:09:06.205Z; note="After verifier returns, accept only if final verifier outcome is pass with no open findings and evidence covers TC-2.1a through TC-2.3b plus live/archive separation and compatibility mapping."
- sequence=12; actionSequence=11; createdAt=2026-05-05T04:16:46.544Z; note="After quick-fix returns, run verification focused on the fixed user_message bridge finalizationKey finding plus TC-2.3b and compatibility mapping evidence before considering accept-story."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/001-events.jsonl
Bytes: 6591

```yaml
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 1
  timestamp: "2026-05-05T03:55:21.091Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 2
  timestamp: "2026-05-05T03:55:33.067Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df646-b15e-7821-bf13-c5423faa613b"
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 3
  timestamp: "2026-05-05T03:55:33.097Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation returns, verify evidence covers TC-2.1a through TC-2.3b plus the two non-TC decided tests before considering self-review or verifier dispatch."
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 4
  timestamp: "2026-05-05T03:55:33.098Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation returns, verify evidence covers TC-2.1a through TC-2.3b plus the two non-TC decided tests before considering self-review or verifier dispatch."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 5
  timestamp: "2026-05-05T04:08:52.400Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 6
  timestamp: "2026-05-05T04:09:06.182Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/prompts/001-planner-turn-002.md"
    sessionId: "019df653-1282-71c1-82c4-5cbc5d60c94b"
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 7
  timestamp: "2026-05-05T04:09:06.205Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-verify."
  data:
    actionType: "run-verify"
    turn: 2
    selfNote: "After verifier returns, accept only if final verifier outcome is pass with no open findings and evidence covers TC-2.1a through TC-2.3b plus live/archive separation and compatibility mapping."
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 8
  timestamp: "2026-05-05T04:09:06.205Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After verifier returns, accept only if final verifier outcome is pass with no open findings and evidence covers TC-2.1a through TC-2.3b plus live/archive separation and compatibility mapping."
    actionSequence: 7
    actionType: "run-verify"
    turn: 2
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 9
  timestamp: "2026-05-05T04:16:36.074Z"
  type: "child-operation-completed"
  summary: "story-verify completed with outcome revise and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json"
  data:
    actionType: "run-verify"
    command: "story-verify"
    outcome: "revise"
    status: "ok"
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 10
  timestamp: "2026-05-05T04:16:46.520Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/story-lead/prompts/001-planner-turn-003.md"
    sessionId: "019df65a-25c6-7633-9a64-cd043424c4aa"
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 11
  timestamp: "2026-05-05T04:16:46.544Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-quick-fix."
  data:
    actionType: "run-quick-fix"
    turn: 3
    selfNote: "After quick-fix returns, run verification focused on the fixed user_message bridge finalizationKey finding plus TC-2.3b and compatibility mapping evidence before considering accept-story."
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 12
  timestamp: "2026-05-05T04:16:46.544Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After quick-fix returns, run verification focused on the fixed user_message bridge finalizationKey finding plus TC-2.3b and compatibility mapping evidence before considering accept-story."
    actionSequence: 11
    actionType: "run-quick-fix"
    turn: 3
-
  storyRunId: "02-finalization-boundary-between-live-state-and-archive-story-run-001"
  sequence: 13
  timestamp: "2026-05-05T04:20:12.788Z"
  type: "child-operation-completed"
  summary: "quick-fix completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json"
  data:
    actionType: "run-quick-fix"
    command: "quick-fix"
    outcome: "ready-for-verification"
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
