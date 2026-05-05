# Story 1: Canonical Archive Entry Persistence

### Summary
<!-- Jira: Summary field -->
Persist finalized low-level archive entries for one process with the required taxonomy, stable ordering, idempotency, and optional related-context links.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Implement the durable append/read primitive for canonical archive entries so trusted callers can persist finalized low-level entries with stable ordering, idempotency, and optional related ids without depending on current process history rows.

**Scope**

In:

- `archiveEntries` Convex append/read functions
- Atomic sequence assignment per process
- `processId + finalizationKey` idempotency guard
- Required archive entry kind validation
- Rejection of unsupported archive entry kinds
- Stable ascending read order using `sequence`
- Same-timestamp deterministic ordering through sequence
- Optional related artifact, source provenance, and tool correlation ids
- Basic archive-entry page shape returned from store methods

Out:

- Live finalization hook behavior, owned by Story 2
- Browser/user-facing archive read routes and UI, owned by Story 3
- Read-time provenance enrichment, owned by Story 6
- Turn and derived-view records
- Historical migration/backfill

**Dependencies**

- Story 0 foundation
- `convex/_generated/ai/guidelines.md` before Convex implementation
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** The canonical archive-entry primitive persists finalized low-level entries supplied by trusted callers.

- **TC-1.1a: User message entry appended through primitive**
  - Given: A trusted caller submits a finalized `user_message` payload for one process
  - When: The archive-entry append primitive is invoked
  - Then: A canonical `user_message` archive entry is persisted for that process
- **TC-1.1b: Model message entry appended through primitive**
  - Given: A trusted caller submits a finalized `model_message` payload for one process
  - When: The archive-entry append primitive is invoked
  - Then: A canonical `model_message` archive entry is persisted for that process
- **TC-1.1c: Process event entry appended through primitive**
  - Given: A trusted caller submits a finalized `process_event` payload for one process
  - When: The archive-entry append primitive is invoked
  - Then: A canonical `process_event` archive entry is persisted for that process

**AC-1.2:** The canonical archive supports the PRD entry taxonomy.

- **TC-1.2a: Required archive entry kinds accepted**
  - Given: The platform appends finalized archive entries
  - When: Each required entry kind is recorded
  - Then: The archive accepts `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event`
- **TC-1.2b: Unsupported archive entry kind rejected**
  - Given: A caller attempts to append an unsupported archive entry kind
  - When: The append request is validated
  - Then: The platform rejects the entry and does not append a partial archive record

**AC-1.3:** Archive entries preserve order within one process.

- **TC-1.3a: Process archive entries read in stable order**
  - Given: Multiple archive entries exist for one process
  - When: The archive is read in ascending order
  - Then: Entries appear in their canonical process order
- **TC-1.3b: Same-timestamp entries remain deterministic**
  - Given: Multiple archive entries have the same timestamp
  - When: The archive is read
  - Then: The platform returns them in a stable deterministic order

**AC-1.4:** Archive entries can store and return related process, artifact, source, or tool ids without depending on read-time enrichment.

- **TC-1.4a: Related ids round-trip through archive storage**
  - Given: An archive entry includes related artifact, source provenance, or tool correlation ids
  - When: The archive entry is appended and later read through the primitive
  - Then: The stored related ids are returned unchanged on the canonical archive row
- **TC-1.4b: Archive row remains readable without related-record lookup**
  - Given: An archive entry stores nullable related ids and no related-record enrichment is performed
  - When: The archive entry is read through the primitive
  - Then: The canonical archive row remains readable without requiring artifact or source resolution

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns only the durable canonical archive-entry primitive.

#### Architecture Context

Story 1 creates the archive domain’s durable append/read primitive. Fastify and
later services decide when something is finalized enough to archive, but this
story owns the canonical row shape, per-process ordering, and idempotent append
contract that the rest of Epic 7 builds on.

#### Convex Tables and Indexes

| Table | Responsibility |
|---|---|
| `archiveEntries` | Canonical finalized low-level archive entries |

| Index | Fields | Purpose |
|---|---|---|
| `by_processId_sequence` | `processId`, `sequence` | Canonical archive pagination and stable ordering |
| `by_processId_finalizationKey` | `processId`, `finalizationKey` | Idempotency guard |
| `by_projectId_processId_recordedAt` | `projectId`, `processId`, `recordedAt` | Project/process scoped diagnostics |

#### PlatformStore Methods

| Method | Description |
|---|---|
| `appendArchiveEntry(args)` | Appends one finalized canonical entry or returns/no-ops an existing entry for the same process/finalization key |
| `listArchiveEntries(args)` | Returns one bounded page sorted by ascending `sequence` |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Durable archive storage | `convex/archiveEntries.ts`, `convex/schema.ts` |
| Store seam | `apps/platform/server/services/projects/platform-store.ts` |
| Shared archive contract consumption | `apps/platform/shared/contracts/archive.ts` |

Implementation notes:

- Convex assigns `sequence` inside the append mutation. Fastify may preflight finalization keys, but Convex owns the atomic guard.
- The append mutation validates the seven-entry taxonomy and rejects unsupported kinds without persisting partial rows.
- `lifecycleState` is always `finalized`.
- `finalizationKey` is unique within a process and stable across retries.
- Same-timestamp ordering is deterministic because reads sort by `sequence`, not `recordedAt`.
- Related ids are nullable and round-trip as stored values on the canonical row.
- Missing related records do not delete or hide the archive row.
- Service-level finalization proof is completed in Story 2.
- Full artifact/source enrichment and related-record lookup degradation are completed in Story 6.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:139), lines 139-149
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:223), lines 223-271
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:563), lines 563-585
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:36), lines 36-44

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-1.1a | `convex/archiveEntries.test.ts` | appends finalized `user_message` entry through primitive |
| TC-1.1b | `convex/archiveEntries.test.ts` | appends finalized `model_message` entry through primitive |
| TC-1.1c | `convex/archiveEntries.test.ts` | appends finalized `process_event` entry through primitive |
| TC-1.2a | `convex/archiveEntries.test.ts` | accepts required archive entry kinds |
| TC-1.2b | `convex/archiveEntries.test.ts` | rejects unsupported archive entry kind |
| TC-1.3a | `convex/archiveEntries.test.ts` | reads entries in stable sequence order |
| TC-1.3b | `convex/archiveEntries.test.ts` | same timestamp entries remain deterministic |
| TC-1.4a | `convex/archiveEntries.test.ts` | round-trips related artifact/source/tool ids |
| TC-1.4b | `convex/archiveEntries.test.ts` | reads archive row without requiring related-record lookup |

#### Non-TC Decided Tests

- `convex/archiveEntries.test.ts`: sequence assignment is atomic across same-process appends
- `convex/archiveEntries.test.ts`: same `processId + finalizationKey` returns or no-ops an existing archive row

#### Technical Notes

- This story owns durable append/read primitives only. It does not decide when an object is final enough to append, and it does not prove service-level finalization hooks or read-time provenance enrichment.

#### Anti-Shim Requirements

- Prove stable order and idempotency through the real persistence boundary, not by sorting mock arrays in a unit helper.

#### Verification

- Targeted: `pnpm run test:convex`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- `archiveEntries` durable functions append and read finalized entries
- All required archive entry kinds are accepted; unsupported kinds are rejected without partial persistence
- Sequence assignment is stable, per-process, and deterministic for same-timestamp entries
- Reusing one `finalizationKey` in a process does not create duplicate archive entries
- Archive entry links can store related artifact version, source provenance, and tool correlation ids
- Tests cover TC-1.1a through TC-1.4b plus atomic sequence/idempotency behavior from the test plan
