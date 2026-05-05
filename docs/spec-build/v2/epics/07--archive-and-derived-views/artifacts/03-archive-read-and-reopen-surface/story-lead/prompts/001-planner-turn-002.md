# Story Lead Base Prompt

## Role Charter
You are the story lead for `03-archive-read-and-reopen-surface` on durable story run `03-archive-read-and-reopen-surface-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 2.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/stories/03-archive-read-and-reopen-surface.md
Bytes: 9734

# Story 3: Archive Read and Reopen Surface

### Summary
<!-- Jira: Summary field -->
Expose process archive reads through authenticated Fastify routes and client surfaces so finalized entries remain visible after reload or environment loss.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Add process archive read routes and user-visible archive rendering that read durable canonical entries, enforce project/process access, show empty states, and display degraded entries without hiding healthy entries.

**Scope**

In:

- `GET /api/projects/{projectId}/processes/{processId}/archive`
- Route auth and project/process access checks
- Cursor/limit validation and invalid-request handling
- One bounded archive page using the canonical archive response contract
- `ArchiveReadService.getArchive`
- Client archive read API and archive section rendering
- Empty archive state
- Durable reload/reopen behavior
- Environment-loss archive read behavior
- Per-entry degraded entry display from the archive response contract

Out:

- Turn derivation and turn UI
- Derived-view route/UI
- Full artifact/source provenance enrichment, owned by Story 6
- Long-process pagination hardening beyond this bounded page contract, completed in Story 7

**Dependencies**

- Story 2 finalization boundary
- Existing Fastify actor resolution and `ProcessAccessService`
- Existing process work surface route and client bootstrap
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
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

**AC-3.4:** One degraded archive entry does not hide healthy archive entries on the read surface.

- **TC-3.4a: Degraded entry displayed with healthy entries**
  - Given: One archive entry is returned in a degraded state and other entries are healthy
  - When: User reads the archive
  - Then: Healthy entries remain visible and the degraded entry is displayed with its degraded metadata

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the first browser-facing canonical archive read surface.

#### Architecture Context

Story 3 is the first user-facing archive story. It exposes durable archive
truth through authenticated Fastify routes and client rendering without relying
on environment state, the live WebSocket stream, or provenance enrichment.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process archive | `GET` | `/api/projects/{projectId}/processes/{processId}/archive` | Returns finalized canonical archive entries for one process |

#### Archive Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `entries` | array of Archive Entry | yes | present | Finalized archive entries for the requested page |
| `page.cursor` | string | no | non-empty when present | Cursor used to fetch this page |
| `page.nextCursor` | string | no | non-empty when present | Cursor for the next page when more entries exist |
| `page.hasMore` | boolean | yes | true or false | Whether more entries are available |

Sort order: archive entries default to ascending `sequence`.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `422` | `INVALID_ARCHIVE_REQUEST` | Cursor or limit is invalid |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Archive route and schema | `apps/platform/server/routes/archive.ts`, `apps/platform/server/schemas/archive.ts` |
| Archive read service | `apps/platform/server/services/archive/archive-read.service.ts` |
| Process/archive UI entry | `apps/platform/client/features/processes/archive-section.ts`, `apps/platform/client/app/bootstrap.ts` |

Implementation notes:

- The route lives under the existing process path and uses existing actor resolution and process access checks before archive services run.
- Archive reads depend on durable `archiveEntries`, not live WebSocket state or environment state.
- `ArchiveReadService` returns a bounded page of canonical archive entries for the route and preserves any per-entry degraded status present on the response contract.
- Deep artifact/source provenance enrichment and lookup-failure degradation semantics are completed in Story 6.
- Client rendering should show finalized entries, empty state, degraded metadata, and page state without adding a separate top-level archive app.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:404), lines 404-442
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:602), lines 602-613
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:50), lines 50-56

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-3.1a | `tests/service/client/archive-section.test.ts` | archive entries visible |
| TC-3.1b | `tests/service/client/archive-section.test.ts` | empty archive state visible |
| TC-3.2a | `tests/service/server/archive-api.test.ts` | archive survives reload |
| TC-3.2b | `tests/service/server/archive-api.test.ts` | archive survives environment loss |
| TC-3.3a | `tests/service/server/archive-api.test.ts` | unauthorized archive read blocked |
| TC-3.3b | `tests/service/server/archive-api.test.ts` | missing process archive read returns not found |
| TC-3.4a | `tests/service/server/archive-api.test.ts` | degraded entry returned and displayed with healthy entries |

#### Non-TC Decided Tests

- `tests/service/server/archive-api.test.ts`: invalid archive query returns `INVALID_ARCHIVE_REQUEST`

#### Technical Notes

- This story owns the first browser-facing archive read; it proves route/UI access, bounded reads, reload behavior, and degraded-entry display while leaving deep provenance enrichment to Story 6.

#### Anti-Shim Requirements

- Prove archive reads through the actual Fastify route boundary and client rendering, not by calling an internal read helper directly.

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
- Authenticated archive read route returns one bounded page of finalized archive entries
- Unauthorized, forbidden, missing project, missing process, and invalid archive requests use the specified error contract
- Client archive section renders entries, empty state, page state, and degraded entry metadata
- Reload and environment-loss tests prove archive reads use durable state
- One degraded entry does not hide healthy entries
- Tests cover TC-3.1a through TC-3.4a plus invalid archive query handling from the test plan


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
- planner_turn_index: 2
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: story-implement completed with outcome ready-for-verification and status ok.
- latest_response_kind: implementor-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json
- older_response_count: 0
- caller_input_artifact_count: 0
- prior_self_note_count: 1
- latest_self_note: "After implementation returns, verify evidence includes archive-api and archive-section coverage plus the configured story gate before considering acceptance."

## Response Trail
<current_response>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json
bytes: 4427
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "e48b0c93-be50-4543-a6fe-208f1d301c1c"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df687-1278-71d1-86dc-b5c0952ba1a6"
    continuation:
      provider: "codex"
      sessionId: "019df687-1278-71d1-86dc-b5c0952ba1a6"
      storyId: "03-archive-read-and-reopen-surface"
    outcome: "ready-for-verification"
    story:
      id: "03-archive-read-and-reopen-surface"
      title: "Story 3: Archive Read and Reopen Surface"
    planSummary: "Implemented Story 3’s authenticated archive read surface end-to-end: added the Fastify archive HTML/API routes and archive read service, wired a new client-side archive route/state/page that loads durable archive entries without live environment dependence, and added route/rendering coverage for empty, reload, environment-loss, access-control, invalid-query, and degraded-entry cases."
    changedFiles:
      -
        path: "apps/platform/server/services/archive/archive-read.service.ts"
        reason: "Added the bounded archive read service with process access enforcement and INVALID_ARCHIVE_REQUEST validation."
      -
        path: "apps/platform/server/routes/archive.ts"
        reason: "Added the archive HTML shell route and GET archive API route with auth/access/error handling."
      -
        path: "apps/platform/server/app.ts"
        reason: "Registered the archive read service and archive routes in the Fastify app."
      -
        path: "apps/platform/client/browser-api/process-work-surface-api.ts"
        reason: "Added the client archive fetcher and archive-specific fallback error parsing."
      -
        path: "apps/platform/shared/contracts/state.ts"
        reason: "Extended shared route/app state to support the new process-archive route and archive surface state."
      -
        path: "apps/platform/client/app/store.ts"
        reason: "Seeded default archive surface state in the client store."
      -
        path: "apps/platform/client/app/router.ts"
        reason: "Added URL parsing and href building for /projects/:projectId/processes/:processId/archive."
      -
        path: "apps/platform/client/app/bootstrap.ts"
        reason: "Bootstraps the archive route by loading process context plus the durable archive page and resetting route-specific state cleanly."
      -
        path: "apps/platform/client/app/shell-app.ts"
        reason: "Routes the shell renderer to the new archive page when the archive surface is active."
      -
        path: "apps/platform/client/features/processes/archive-section.ts"
        reason: "Renders archive entries, page state, empty state, and degraded-entry metadata."
      -
        path: "apps/platform/client/features/processes/process-archive-page.ts"
        reason: "Added the user-visible process archive page wrapper with process context and back navigation."
      -
        path: "tests/service/server/archive-api.test.ts"
        reason: "Added Story 3 server coverage for reload, environment loss, access control, invalid query handling, and degraded entries."
      -
        path: "tests/service/client/archive-section.test.ts"
        reason: "Extended client coverage to prove archive entries, empty state, and degraded entry rendering."
    tests:
      added:
        - "tests/service/server/archive-api.test.ts"
      modified:
        - "tests/service/client/archive-section.test.ts"
      removed:
[]
      totalAfterStory: 660
      deltaFromPriorBaseline: 9
    gatesRun:
      -
        command: "corepack pnpm exec vitest run tests/service/server/archive-api.test.ts --environment node"
        result: "pass"
      -
        command: "corepack pnpm exec vitest run tests/service/client/archive-section.test.ts --environment jsdom"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "not-run"
    selfReview:
      passesRun: 0
      findingsFixed:
        - "Fixed the archive surface state import so the shared contract no longer referenced an undefined schema at module load time."
        - "Removed new-page non-null assertion lint warnings after the first green-verify pass."
      findingsSurfaced:
[]
    openQuestions:
[]
    specDeviations:
[]
    recommendedNextStep: "Run verification on Story 3, then continue to the next archive story or provenance-enrichment follow-up with this archive surface as the browser-facing baseline."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json"
  startedAt: "2026-05-05T05:05:40.247Z"
  finishedAt: "2026-05-05T05:19:46.378Z"
```
</current_response>

<history_responses>
No older response entries are recorded yet.
</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/story-lead/001-current.json
Bytes: 1816

```yaml
storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
storyId: "03-archive-read-and-reopen-surface"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "story-implement completed with outcome ready-for-verification and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df687-1278-71d1-86dc-b5c0952ba1a6"
    storyId: "03-archive-read-and-reopen-surface"
latestEventSequence: 5
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "No bounded child operation has run yet, and the durable record contains only initial story validation plus the story-local requirements. The smallest safe next action is to start implementation against Story 3 requirements and mapped tests."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json"
replayBoundary: null
updatedAt: "2026-05-05T05:19:46.388Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: After implementation returns, verify evidence includes archive-api and archive-section coverage plus the configured story gate before considering acceptance.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-05T05:05:40.210Z; note="After implementation returns, verify evidence includes archive-api and archive-section coverage plus the configured story gate before considering acceptance."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/story-lead/001-events.jsonl
Bytes: 2210

```yaml
-
  storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
  sequence: 1
  timestamp: "2026-05-05T05:05:26.320Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
  sequence: 2
  timestamp: "2026-05-05T05:05:40.185Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "high"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df686-dc12-79e2-9d82-a088ae37b2a2"
-
  storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
  sequence: 3
  timestamp: "2026-05-05T05:05:40.210Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation returns, verify evidence includes archive-api and archive-section coverage plus the configured story gate before considering acceptance."
-
  storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
  sequence: 4
  timestamp: "2026-05-05T05:05:40.210Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation returns, verify evidence includes archive-api and archive-section coverage plus the configured story gate before considering acceptance."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "03-archive-read-and-reopen-surface-story-run-001"
  sequence: 5
  timestamp: "2026-05-05T05:19:46.387Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
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
