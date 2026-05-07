# Epic 7 Build Summary: Archive and Derived Views

## Purpose of This Summary

This report captures the intended and observed build shape for Epic 7, "Archive and Derived Views," as part of the architecture standup review after the first seven Liminal Build platform epics.

Epic 7 completes the archive and derived-view half of the source/context-management platform slice. Epic 6 made repository source attachments and source provenance durable. Epic 7 makes finalized process history durable, inspectable, and usable as the canonical memory substrate for future long-horizon context management.

This summary is based on the Epic 7 spec pack and implementation log:

- `docs/spec-build/v2/epics/07--archive-and-derived-views/epic.md`
- `docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md`
- `docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md`
- `docs/spec-build/v2/epics/07--archive-and-derived-views/team-impl-log.md`
- `docs/spec-build/v2/epics/07--archive-and-derived-views/impl-run.config.json`

A root-level file scan found no separate Epic 7 server/client tech design, decision memo, or remediation file. The server and client design details are consolidated in `tech-design.md`, while the implementation and closeout trail lives in `team-impl-log.md`.

## Upstream Intent Relevant to Epic 7

The upstream platform intent is that Liminal Build should support planning and building software in large epic-sized chunks, with AI helping create specs, decompose epics into stories, and eventually run a software factory against a ready spec pack plus models, harnesses, sandbox, and source context.

For that to work, the platform needs more than a live chat-like history. It needs durable process memory:

- What happened in the process?
- What was finalized versus merely streamed?
- What source, artifact, and tool context was related to the work?
- How can later systems group, chunk, summarize, or retrieve history without corrupting the original record?
- How can a user reopen a process after reload or environment loss and trust the history?

Epic 7 answers these questions by introducing canonical archive entries and rebuildable derived views. Its governing mental model is: the platform keeps the full finalized record of what happened; turns, chunks, and summaries are views over that record, not the record itself.

This is especially important after Epics 1-6:

- Epic 1 established project/process shells and access boundaries.
- Epic 2 established the process work surface and visible history.
- Epic 3 established controlled execution, hydration, and checkpointing.
- Epic 4 established artifact review and package surfaces.
- Epic 5 aligned artifact identity, versioning, and review provenance.
- Epic 6 established source attachment lifecycle and source provenance.

Epic 7 gives those surfaces a canonical process archive that survives active UI state, environment state, and later derived-view rebuilds.

## Epic 7 Goals and Scope

Epic 7's goal was to make finalized process history a first-class canonical archive and to add the first non-summarizing derived-view layer over that archive.

In scope:

- Full-fidelity process archive entries at finalized low-level grain.
- Canonical archive entry taxonomy from the platform PRD.
- Archive append behavior for finalized entries only.
- Durable read surfaces for process archive entries.
- Turn derivation from archive entries.
- Minimal structural derived-view records or responses over turns.
- Provenance from derived turns/views back to archive entries.
- Bounded degraded states when archive or derivation reads partially fail.
- Source-provenance coherence with Epic 6 source records.
- Reopen behavior for archive, turn, and derived-view reads.

Out of scope:

- MCP-backed or other external source attachment.
- Full summarization strategy for every process type.
- Model-generated summaries or summarization prompts.
- Model-specific prompt packing or context-budget policy.
- Process-specific review/approval workflows.
- Replacement of the existing live WebSocket/current-object upsert model.
- Treating chunks, summaries, or turns as canonical process truth.
- Generic transcript export beyond the archive/derived-view contracts.
- Historical migration/backfill from existing `processHistoryItems`.

The epic is therefore a forward canonicalization effort plus compatibility bridge. It does not attempt to rewrite all old history into the new archive model.

## What Epic 7 Was Supposed to Put in Place

Before Epic 7, the repository already had a process work-surface history model backed by `processHistoryItems`. That history used a presentation-oriented vocabulary such as:

- `user_message`
- `process_message`
- `progress_update`
- `attention_request`
- `side_work_update`
- `process_event`

That model supported visible history and live work-surface behavior, but it was not the canonical archive required by the PRD.

Epic 7 was supposed to add:

- A new canonical archive vocabulary:
  - `user_message`
  - `model_message`
  - `reasoning`
  - `script_emission`
  - `tool_call`
  - `tool_result`
  - `process_event`
- A finalized-only archive append primitive.
- Stable per-process ordering through sequence numbers.
- Idempotency through `finalizationKey`.
- Related artifact, source provenance, and tool-call references.
- Bounded archive reads with cursor pagination.
- Turn derivation over ordered archive entries.
- Cached but rebuildable derived turns.
- Minimal structural derived views, including `turn_range` and `chunk_candidate`.
- Degraded read behavior that preserves canonical archive visibility.
- Client/process surfaces for archive, turns, and derived views.

The key architectural point is that Epic 7 creates a canonical append-only-ish process memory layer without replacing the live process work surface.

## Key Server Designs

The server design introduces a narrow trusted append path and broader read/derivation paths.

Planned server modules included:

- `convex/archiveEntries.ts` for canonical archive append/read, sequence assignment, idempotency, and pagination.
- `convex/archiveTurns.ts` for cached derived turn records.
- `convex/derivedArchiveViews.ts` for structural derived-view records.
- `convex/schema.ts` updates for archive tables and indexes.
- `apps/platform/shared/contracts/archive.ts` for shared archive contracts and route builders.
- `apps/platform/server/schemas/archive.ts` for Fastify route schemas.
- `apps/platform/server/routes/archive.ts` for authenticated archive routes.
- `apps/platform/server/services/archive/archive-finalization.service.ts`.
- `apps/platform/server/services/archive/archive-read.service.ts`.
- `apps/platform/server/services/archive/turn-derivation.service.ts`.
- `apps/platform/server/services/archive/derived-archive-view.service.ts`.
- `apps/platform/server/services/archive/process-history-compat.service.ts`.
- `platform-store.ts` archive append/read/projection methods.
- Process service modifications so accepted user responses, completed model/runtime objects, completed script/tool output, and process events can be finalized into archive entries.

The design assigns responsibility carefully:

- Fastify owns finalization policy, read orchestration, turn derivation, and derived-view refresh.
- Convex owns durable storage, validators, atomic sequence assignment, idempotency guards, and cached projection records.
- Archive services own enrichment/degraded-read behavior.
- Existing live upsert normalization remains current-object transport and is not the archive.

This is a good platform boundary. It prevents Convex from becoming an orchestration brain while still giving Convex the atomic write responsibilities that matter for canonical history.

## Client and UI Concepts

Epic 7 works inside existing project and process surfaces. It does not create a separate top-level archive app.

Expected browser routes:

- `/projects/{projectId}/processes/{processId}`
- Optional dedicated archive route: `/projects/{projectId}/processes/{processId}/archive`

Expected client modules:

- `archive-section.ts` for process archive read surface.
- `archive-turns-section.ts` for derived turn surface.
- `derived-archive-views-section.ts` for structural derived-view surface.
- `bootstrap.ts` wiring for archive actions.

Expected UI concepts:

- Canonical archive entries shown in stable order.
- Empty archive state.
- Degraded entry state without hiding healthy entries.
- Turn view derived from archive entries.
- Structural derived views over turn ranges or chunk candidates.
- Pagination/bounded reads.
- Archive visibility after reload or environment loss.
- Derived-view failure isolated from archive readability.

The client is intentionally not a summarization product yet. Derived views may show deterministic labels or structural notes such as a turn range, but model-generated summary text is out of scope.

## Data Model and State Boundaries

Epic 7's data model is built around three durable or cached tables.

### `archiveEntries`

`archiveEntries` are canonical truth for finalized process history.

Core fields:

- `projectId`
- `processId`
- `entryKind`
- `sequence`
- `lifecycleState: finalized`
- `finalizationKey`
- `sourceObjectId`
- `bodyText`
- `bodyData`
- `bodyFormat`
- `relatedArtifactVersionId`
- `relatedSourceProvenanceId`
- `relatedToolCallId`
- `entryStatus`
- `degradationReason`
- `recordedAt`

Expected indexes:

- `by_processId_sequence`
- `by_processId_finalizationKey`
- `by_projectId_processId_recordedAt`

The archive entry is the most important state boundary in the epic. It stores finalized process truth, not raw streaming deltas, partial runtime objects, or summaries.

### `archiveTurns`

`archiveTurns` are cached derived records over archive entries.

Core fields:

- `projectId`
- `processId`
- `turnId`
- `turnIndex`
- `archiveEntryIds`
- `startedAt`
- `endedAt`
- `turnStatus`
- `degradationReason`
- `rebuiltAt`

Expected indexes:

- `by_processId_turnId`
- `by_processId_turnIndex`

Turns are cached for bounded reads, but rebuildable from canonical archive entries. They are not canonical truth.

### `derivedArchiveViews`

`derivedArchiveViews` are structural projections over turns.

Core fields:

- `projectId`
- `processId`
- `viewKind`
- `startTurnIndex`
- `endTurnIndex`
- `sourceTurnIds`
- `sourceArchiveEntryIds`
- `title`
- `bodyText`
- `viewStatus`
- `degradationReason`
- `updatedAt`

Expected index:

- `by_processId_updatedAt`

Views may be deleted and recreated from turns. That must not affect canonical archive entries.

### Boundary Summary

Epic 7 keeps four major state types separate:

- Live current-object state: transient process UI state delivered through live updates.
- Canonical archive state: finalized low-level process truth.
- Turn state: cached rebuildable grouping over archive entries.
- Derived view state: cached rebuildable structural projection over turns.

This separation is the heart of the epic.

## Canonical Archive Entry Taxonomy

Epic 7 adopts the PRD archive taxonomy:

- `user_message`: finalized user input accepted by the process.
- `model_message`: finalized model output.
- `reasoning`: finalized reasoning-like model/process material when appropriate.
- `script_emission`: finalized output from controlled script execution.
- `tool_call`: finalized record of a tool invocation.
- `tool_result`: finalized result of a tool invocation.
- `process_event`: durable lifecycle/checkpoint/event history.

Unsupported kinds should be rejected without appending partial records.

This taxonomy replaces neither the legacy presentation vocabulary nor the live update protocol. It is the canonical archive vocabulary that later context-management systems can rely on.

## Finalized-Entry Rules

Only finalized entries belong in the canonical archive.

The spec and design explicitly reject:

- Raw streaming deltas.
- Interrupted partial model outputs.
- Incomplete tool results.
- Browser-only current-object upserts.
- Model-generated summary records pretending to be source truth.

The finalization boundary is implemented through `ArchiveFinalizationService`, which is called only from completion points:

- Accepted user responses.
- Completed model/runtime objects.
- Completed script emissions.
- Finalized tool calls/results.
- Process events that should remain part of durable history.

Every finalized object supplies a `finalizationKey`, such as:

- `response:{clientRequestId}`
- `model:{sourceObjectId}`
- `tool:{relatedToolCallId}:call`
- `tool:{relatedToolCallId}:result`
- `event:{sourceObjectId}`

Convex performs the final idempotency check using `processId + finalizationKey`. Sequence assignment happens only on first append.

The implementation log shows this boundary received meaningful attention. Story 2 had several fixes around user-message bridge finalization keys, key mismatches, live/archive separation proof, and persisted-history identity handling.

## Relationship to Epic 2 Visible History

Epic 2 established the process work surface and its visible history/read model. Epic 7 does not remove or replace that model.

The design explicitly keeps `processHistoryItems` as a legacy/presentation read model and adds compatibility helpers where needed. The live publisher remains unchanged. Archive entries are not published back into the live history stream.

This matters because process work needs two different concepts:

- A responsive live/current history surface for active work.
- A finalized durable archive for later inspection, derivation, and context management.

Trying to use one table/model for both would blur in-flight UI state with canonical process truth. Epic 7 avoids that drift.

## Relationship to Epic 6 Source Provenance

Epic 7 consumes Epic 6 source provenance without owning source lifecycle.

Archive entries may contain `relatedSourceProvenanceId`, and archive read services enrich entries with source context when available. If source provenance cannot be resolved, the affected archive entry degrades locally, but the canonical archive entry remains visible.

Epic 6 remains responsible for:

- Source attachment lifecycle.
- Canonical repository identity.
- Source hydration/freshness state.
- Source provenance records.
- Detach and degraded source behavior.

Epic 7 is responsible for:

- Linking finalized process history to source provenance where relevant.
- Showing available source context during archive reads.
- Ensuring missing source context does not hide archive truth.

The implementation log shows Story 6 initially found provenance coherence blockers. The fix changed archive provenance enrichment so affected entries degrade instead of rejecting the whole read, and added proof that artifact lookup failures degrade at read time.

## Turn Derivation

Turns are deterministic groupings over ordered archive entries. They are derived from the archive and do not mutate archive entries.

Designed grouping rules:

1. `user_message` starts a new turn.
2. Entries before the first user message form turn `0` if they exist.
3. `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event` attach to the active turn.
4. A `tool_result` with `relatedToolCallId` stays in the same turn as its matching `tool_call` when both are present.
5. Degraded related context degrades the turn, not the archive entries.

Turns are cached for bounded reads and stable downstream references. Rebuilds upsert by stable deterministic `turnId`, such as `${processId}:turn:${turnIndex}`, rather than recreating opaque row IDs. This keeps derived-view provenance stable across rebuilds.

Turn rebuilds happen on turn/derived-view read or explicit derived-view refresh, not on every archive append. That is a reasonable tradeoff: append remains cheap and canonical, while derived views can catch up when requested.

## Chunk, Summary, and Derived View Model

Epic 7 creates only the first structural derived-view layer. It does not create a summarization system.

Supported view kinds:

- `turn_range`
- `chunk_candidate`

Derived views identify:

- Source turn range.
- Source turn IDs.
- Source archive entry IDs.
- Optional title.
- Optional deterministic structural note.
- Ready/degraded status.
- Updated timestamp.

They do not require or generate model summaries. The test plan explicitly included a non-TC guard that `chunk_candidate` rejects generated summary body content. This protects the architecture from accidentally smuggling summarization into the archive foundation before process-specific context strategies exist.

This model gives later context-management work a stable substrate:

- The canonical archive is full-fidelity truth.
- Turns provide interaction groupings.
- Structural views provide bounded candidate chunks.
- Future summarizers can operate over turns/views while preserving provenance back to archive entries.

## Routes, API, and Workspace Concepts

Epic 7 adds REST-shaped routes under existing project/process paths:

- `GET /api/projects/{projectId}/processes/{processId}/archive`
- `GET /api/projects/{projectId}/processes/{processId}/archive/turns`
- `GET /api/projects/{projectId}/processes/{processId}/archive/derived-views`
- `POST /api/projects/{projectId}/processes/{processId}/archive/derived-views/refresh`

Expected route behavior:

- Require authenticated access.
- Enforce project/process access server-side.
- Validate cursor and limit query params.
- Return bounded pages for archive entries and turns.
- Return ready/degraded status for entries, turns, and views.
- Keep archive reads independent from active environment state.
- Return derivation conflicts as `ARCHIVE_DERIVATION_CONFLICT`.
- Return invalid query/body problems as `INVALID_ARCHIVE_REQUEST`.

Expected default limits:

- Archive entries: default 100, max 200.
- Turns: default 50, max 100.
- Derived views: default 50.

The workspace concept remains process-centered. Archive and derived views are entry points within a process context, not a separate archive product.

## Test Strategy

The test plan called for 52 planned automated tests: 41 named test-condition tests and 11 non-TC guard tests.

Planned layers:

- Convex tests:
  - `convex/archiveEntries.test.ts`
  - `convex/archiveTurns.test.ts`
  - `convex/derivedArchiveViews.test.ts`
- Fastify/service tests:
  - `tests/service/server/archive-api.test.ts`
  - `tests/service/server/archive-finalization.test.ts`
  - `tests/service/server/turn-derivation.test.ts`
  - `tests/service/server/derived-archive-view.test.ts`
- Client tests:
  - `tests/service/client/archive-section.test.ts`
  - `tests/service/client/archive-turns-section.test.ts`
  - `tests/service/client/derived-archive-views.test.ts`
- Existing live/process regression tests:
  - `tests/service/client/process-live.test.ts`
  - `tests/service/server/process-live-updates.test.ts`
  - `tests/service/server/process-execution-orchestrator.test.ts`

Important guard coverage:

- Contract schemas accept Epic 7 entry kinds and reject non-finalized entries.
- Live history upserts continue without creating archive rows.
- Compatibility mapping from `process_message` to `model_message` is limited to finalized compatible items.
- `processId + finalizationKey` idempotency works below the service layer.
- Pre-user-message entries form deterministic turn zero.
- Turn-cache rebuild preserves stable provenance for derived views.
- `chunk_candidate` rejects generated summary content.
- Stale derived views rebuild without breaking archive reads.
- Sequence assignment is atomic across same-process appends.
- Refresh conflicts return `ARCHIVE_DERIVATION_CONFLICT`.
- Invalid archive queries return `INVALID_ARCHIVE_REQUEST`.

Manual verification included starting Convex with `pnpm run convex:dev`, starting the app with `pnpm dev`, simulating finalized user/model/tool/event entries, checking archive order, reload durability, turn references, structural derived views, degraded related context, and bounded pagination.

## Implicit Decisions

Several decisions are foundational:

- Add `archiveEntries` rather than replacing `processHistoryItems`.
- Keep live process upserts separate from canonical archive writes.
- Store only finalized entries in the canonical archive.
- Make Convex responsible for atomic sequence assignment and idempotency.
- Use `finalizationKey` as the retry/idempotency boundary.
- Treat turns and derived views as rebuildable projections, not source truth.
- Cache turns for bounded reads.
- Use deterministic turn IDs to keep downstream derived-view provenance stable.
- Keep derived views structural and non-summarizing.
- Degrade individual entries/views on missing related context rather than hiding the archive.
- Avoid historical migration/backfill in this epic.
- Consume artifact/source provenance by reference rather than duplicating ownership logic.

These decisions complete a clean hierarchy: finalized archive entries are canonical; everything above them is a view.

## Implementation Log Findings

The implementation log reports Epic 7 as `COMPLETE`, with cleanup complete, synthesis reviewed, final gate passing, and no open or accepted risks.

Run configuration:

- Primary harness: Claude Code.
- Story lead: Codex `gpt-5.5`, high effort.
- Story implementor: Codex `gpt-5.4`, high effort.
- Quick fixer: Codex `gpt-5.4`, xhigh effort.
- Story verifier: Codex `gpt-5.4`, xhigh effort.
- Epic verifiers: Codex `gpt-5.4`, xhigh after one lane was reconfigured because the original provider was unavailable.
- Story gate: `corepack pnpm run green-verify`.
- Epic gate: `corepack pnpm run verify-all`.

Story receipts:

- Story 0, foundation: accepted, `green-verify` and `verify-all` passed, finding `S0-F1` fixed. Baseline 624 to 630. Commit `bea8512`.
- Story 1, canonical archive entry persistence: accepted after primitive export/runtime surface fixes. `green-verify` and `verify-all` passed. Findings `S1-F1`, `S1-F2`, `S1-F3` fixed. Baseline 634 to 641. Commit `5330c0d`.
- Story 2, finalization boundary: accepted after several bridge/idempotency/live-separation fixes. `green-verify` and `verify-all` passed. Baseline 663 to 670. Commit `f44ae1f`.
- Story 3, archive read/reopen surface: accepted after bounded production read fix. `green-verify` and `verify-all` passed. Baseline 651 to 660. Commit `7b959bb`.
- Story 4, turn derivation: accepted with no open findings. `green-verify` and `verify-all` passed. Baseline 682 to 692. Commit `4dc43e4`.
- Story 5, minimal structural views: accepted after API-key-checked wrapper and degraded-view client proof fixes. `green-verify` and `verify-all` passed. Baseline 692 to 701. Commit `933b44e`.
- Story 6, archive provenance coherence: accepted after fixes to degrade affected entries instead of rejecting whole reads. `green-verify` and `verify-all` passed. Baseline remained 572. Commit `e3970d3`.
- Story 7, reopen/degraded archive state: accepted after removing a fabricated degraded derived-view bootstrap path and using real route failure state. `green-verify` and `verify-all` passed. Baseline 39 to 46. Commit `08e45a0`.

The implementation was not frictionless. Epic verification found real gaps:

- `archive-taxonomy-production-gap`
- `archive-provenance-write-gap`
- deferred archive entries lost when artifact/source bindings could not be resolved at append time
- default execution payload concerns
- turn/derived-view degradation drift
- archive source-provenance reopen drift
- deferred archive append window
- bounded read contract drift

The log says these were resolved through a post-005 fix loop using built-in subagents plus direct orchestrator verification. Important final fixes included:

- Default runtime path no longer emits synthetic canonical archive rows on the integrated default path.
- Deferred archive entries persist immediately as degraded canonical rows and reconcile later.
- Turn and derived-view reads are cache-first.
- Derived-view pagination is implemented end to end.
- `guard:no-test-changes` and `test:e2e` became real checks rather than scaffold-only skips.

Final verification evidence is strong relative to Epic 6: the closeout workspace passed `corepack pnpm run verify-all` on 2026-05-05, including format, lint, typecheck, build, Convex tests, service tests, client tests, package tests, integration tests, and Playwright e2e.

One nuance remains: after the subagent fix loop, the user directed closeout without another CLI `epic-verify` rerun beyond batch `005`. The log treats prior synthesis as historical evidence superseded by later fixes and direct verification. That is materially better than Epic 6's administrative closeout, but future reviewers should still note that the final acceptance path diverged from the formal tool's ideal closeout sequence.

## Completed Work

The implementation log indicates that the following were completed:

- Archive vocabulary and shared contracts.
- Convex archive schema and store primitives.
- Canonical archive entry append/read behavior.
- Taxonomy validation.
- Stable sequence ordering.
- Idempotency guards.
- Compatibility mapping skeletons and bridge behavior.
- Finalization service and trusted completion hooks.
- Live/archive separation proof.
- Authenticated archive read routes and client surfaces.
- Bounded archive pagination.
- Deterministic turn derivation.
- Cached/rebuildable turn projections.
- Structural `turn_range` and `chunk_candidate` views.
- Derived-view list/refresh behavior.
- Source/artifact provenance enrichment.
- Per-entry degradation on missing related context.
- Reload/environment-loss archive durability.
- Derived-view failure isolation.
- Final verification across the full project gate.

## Deviations and Pivots

The major product/design boundaries did not appear to change. The implementation stayed aligned with the spec's core architecture: canonical archive entries remain truth; live state remains separate; turns/views are rebuildable; summaries are deferred.

Notable implementation pivots/fixes:

- Story 1 needed a ruling that primitive-only evidence was sufficient for certain early persistence ACs, while service/API proof would arrive later.
- Story 1 then had to restore archive primitive exports into the tracked runtime surface.
- Story 2 tightened finalization-key behavior for user-message bridging and persisted-history identity.
- Story 3 fixed an unbounded Convex archive read so production reads fetch one bounded page plus lookahead rather than collecting the full archive.
- Story 5 moved raw derived-view storage behind API-key-checked wrappers.
- Story 6 changed provenance enrichment failure from whole-read rejection to per-entry degradation.
- Story 7 removed a fabricated degraded derived-view client shim and surfaced real derived-view route failure state.
- Epic-level fixes changed deferred append behavior so entries persist immediately as degraded canonical rows when related bindings are unavailable, then reconcile later.
- Epic-level fixes made turn and derived-view reads cache-first and completed derived-view pagination.
- Verification infrastructure was hardened so no-test-change guard and e2e checks were real.

These are healthy pivots: they generally made the implementation more faithful to the architecture's truth/degradation boundaries.

## Verification Evidence

Evidence supporting confidence:

- All eight stories were accepted and committed.
- Each story reports `green-verify` and `verify-all` passing.
- Story-level verifier findings were fixed and rechecked.
- Cleanup found no deferred or accepted-risk items.
- Epic verification found substantial issues, and the log records follow-up fixes.
- Final direct `corepack pnpm run verify-all` passed on 2026-05-05.
- The final gate included format, lint, typecheck, build, Convex, service, client, package, integration, and e2e checks.
- Open risks/accepted risks are recorded as none.

Evidence to treat with care:

- The formal closeout sequence diverged from the implementation tool's preferred epic-verify/synthesis path.
- The final subagent fix loop was not followed by another CLI epic-verify rerun beyond batch `005`.
- Some implementation friction related to default runtime authenticity, deferred append windows, and bounded read contracts surfaced late.
- The implementation log notes artifact/log volume made review noisy.
- Baseline counts vary by story/slice, so test-count deltas should not be interpreted too literally without reading test changes.

Overall, Epic 7's closeout appears substantially stronger than Epic 6's, but future reviewers should still verify the final code paths that were fixed after the last CLI verifier batch.

## Risks, Tradeoffs, and Open Questions

Key risks and tradeoffs:

- The finalization boundary is subtle. If future process code writes directly to archive primitives without going through finalization policy, raw or partial state could leak into canonical truth.
- Compatibility with `processHistoryItems` can drift. Future developers may mistake presentation history for canonical archive history.
- Cached turn/view projections can become stale if rebuild paths are not consistently triggered or cache-first behavior masks archive changes.
- Related source/artifact enrichment must degrade locally, not fail whole archive reads.
- Deferred archive entries that start degraded must reconcile without losing their original canonical identity.
- Deterministic turn IDs must remain stable across rebuilds, or derived-view provenance can dangle.
- Pagination limits and cursor semantics are core reliability features for long processes; regressions could reintroduce unbounded reads.
- The no-summary boundary may be tempting to violate when future context-management work begins.

Open questions for later review:

- Are all real production completion points wired to `ArchiveFinalizationService`, or only the paths exercised in tests?
- Does the default runtime path produce authentic archive entries only when real finalized material exists?
- Are degraded deferred entries reconciled in a way that preserves finalization/idempotency guarantees?
- Do archive reads remain bounded under large process histories with mixed ready/degraded entries?
- Are derived-view refresh conflicts returned consistently instead of overwriting ambiguous projections?
- Does client UI clearly distinguish archive truth from derived turns/views?
- Do source and artifact enrichment dependencies fail independently per entry?

## Intentional Deferrals

These should not be treated as Epic 7 misses:

- Historical migration/backfill from existing `processHistoryItems` is deferred.
- Model-generated summaries are out of scope.
- Process-specific summarization strategies are out of scope.
- Model-specific context packing and prompt-budget policy are out of scope.
- MCP/external source archive integration is deferred.
- Generic transcript export product behavior is out of scope.
- Process-specific review/approval workflows are out of scope.

Epic 7 intentionally provides the substrate for future context work, not the full context-management product.

## Contribution to the Larger Seven-Epic Standup

Epic 7 completes the initial platform standup in an important way: it gives the system durable memory.

After Epic 7, the seven-epic skeleton has these major pieces:

- Project and process shell.
- Process work surface.
- Controlled execution environment.
- Artifact review and package surfaces.
- Aligned artifact identity/version/provenance.
- Source attachment and source provenance management.
- Canonical process archive and rebuildable derived views.

That is still not the full Liminal Build product. The first functional process, epic creation, still needs to be built on top. But the platform now has a coherent spine:

- Work happens inside projects and processes.
- Live process activity can update the UI.
- Execution can happen in controlled environments.
- Artifacts can be reviewed and packaged.
- Source repositories can be attached, hydrated, and traced.
- Finalized process history can be archived.
- Turns and structural views can be derived without replacing truth.

Epic 7 also gives the future software factory a vital affordance: it can use canonical archive entries as durable evidence of what happened, then build context windows, chunks, summaries, and retrieval structures as rebuildable layers rather than lossy replacements.

## Assessment Notes for Later Review

Future reviewers comparing spec intent to implementation reality should verify the following:

- Confirm `archiveEntries`, `archiveTurns`, and `derivedArchiveViews` exist with the intended fields and indexes.
- Confirm `archiveEntries` accepts exactly the PRD taxonomy and rejects unsupported entry kinds.
- Confirm archive entries always have `lifecycleState: finalized`.
- Confirm raw streaming deltas and interrupted partial objects are not persisted as canonical archive entries.
- Confirm `finalizationKey` idempotency is enforced atomically by `processId + finalizationKey`.
- Confirm sequence assignment is atomic and stable for same-process entries, including same-timestamp writes.
- Confirm archive reads use bounded pagination and do not collect full process archives before slicing.
- Confirm archive routes enforce auth, project access, and process access before returning content.
- Confirm live process upserts still update current UI state without creating archive rows.
- Confirm compatibility mapping from legacy process history is scoped and does not backfill/mutate old rows unexpectedly.
- Confirm accepted user responses, completed model/runtime objects, script emissions, tool calls/results, and process events all route through the finalization service where intended.
- Confirm default runtime paths do not create synthetic placeholder archive truth.
- Confirm deferred archive entries persist immediately as degraded canonical rows when related artifact/source bindings cannot be resolved.
- Confirm deferred/degraded archive entries can reconcile later without duplicate archive rows.
- Confirm read-time artifact/source enrichment degrades individual entries instead of rejecting whole archive pages.
- Confirm `relatedSourceProvenanceId` links to Epic 6 source provenance without duplicating source ownership logic.
- Confirm `relatedArtifactVersionId` links to Epic 5 artifact/version provenance without duplicating artifact ownership logic.
- Confirm turn derivation follows the deterministic grouping rules, including turn zero before the first user message.
- Confirm turn rebuilds preserve stable `turnId` values.
- Confirm derived views trace back to source turns and archive entry IDs.
- Confirm derived views remain structural and do not store generated summaries.
- Confirm derived-view refresh/list routes implement pagination and conflict behavior.
- Confirm derived-view read/rebuild failures do not hide canonical archive entries.
- Confirm reload/environment-loss paths read durable archive state rather than live environment state.
- Confirm final post-subagent-fix code paths are covered by current tests, since the final acceptance path did not run another CLI epic-verifier batch after those fixes.

Epic 7 is one of the most important standup epics to preserve as documentation. It defines the difference between process memory and process views. Future functional-process work should inherit that distinction rather than rediscovering it under pressure.
