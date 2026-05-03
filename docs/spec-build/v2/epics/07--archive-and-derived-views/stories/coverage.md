# Epic 7 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Story 0 is a foundation story and does not own end-user ACs or TCs from the
detailed epic. Stories 1 through 7 follow the recommended Epic 7 breakdown and
the finalized tech-design/test-plan pack.

## Coverage Gate

| AC | TC | Story | Verifying Test File(s) | Delivery Notes |
|---|---|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b, TC-1.1c | Story 1 | `tests/service/server/archive-finalization.test.ts` | Finalized user, model, and process-event entries append as canonical archive entries |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 1 | `convex/archiveEntries.test.ts` | Required taxonomy accepted; unsupported kinds rejected without partial rows |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 1 | `convex/archiveEntries.test.ts` | Sequence order defines deterministic process archive order |
| AC-1.4 | TC-1.4a, TC-1.4b | Story 1 | `tests/service/server/archive-api.test.ts` | Related ids persist without requiring related records to remain current; full enrichment completed in Story 6 |
| AC-2.1 | TC-2.1a | Story 2 | `tests/service/server/archive-finalization.test.ts`; `tests/service/client/process-live.test.ts` | Raw live deltas remain outside canonical archive |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 2 | `tests/service/server/archive-finalization.test.ts` | Interrupted model/tool objects are excluded |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 2 | `tests/service/server/archive-finalization.test.ts`; `convex/archiveEntries.test.ts` | Completed objects append once through finalization keys |
| AC-3.1 | TC-3.1a, TC-3.1b | Story 3 | `tests/service/client/archive-section.test.ts` | Client archive section renders entries and empty state |
| AC-3.2 | TC-3.2a, TC-3.2b | Story 3 | `tests/service/server/archive-api.test.ts` | Archive reads use durable state, not environment state |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 3 | `tests/service/server/archive-api.test.ts` | Project/process access enforced server-side |
| AC-3.4 | TC-3.4a | Story 3 | `tests/service/server/archive-api.test.ts` | One degraded archive entry does not hide healthy entries |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 | `tests/service/server/turn-derivation.test.ts` | Turns derive from archive entries; empty archive returns empty turn view |
| AC-4.2 | TC-4.2a | Story 4 | `tests/service/server/turn-derivation.test.ts` | Derived turns reference source archive entries |
| AC-4.3 | TC-4.3a | Story 4 | `convex/archiveEntries.test.ts` | Turn derivation leaves canonical archive rows unchanged |
| AC-4.4 | TC-4.4a | Story 4 | `tests/service/server/turn-derivation.test.ts` | Degraded turn metadata does not hide other turns |
| AC-5.1 | TC-5.1a | Story 5 | `tests/service/server/derived-archive-view.test.ts` | Structural derived view returned without generated summary text |
| AC-5.2 | TC-5.2a | Story 5 | `tests/service/server/derived-archive-view.test.ts` | View metadata identifies turn range and archive-entry references |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 | `tests/service/server/derived-archive-view.test.ts` | Views preserve provenance back to turns and archive entries |
| AC-5.4 | TC-5.4a | Story 5 | `convex/archiveEntries.test.ts` | Derived-view creation does not replace archive rows |
| AC-5.5 | TC-5.5a, TC-5.5b | Story 5 | `tests/service/server/derived-archive-view.test.ts`; `tests/service/client/derived-archive-views.test.ts` | Derived-view failure leaves archive readable and reports degraded state |
| AC-6.1 | TC-6.1a | Story 6 | `tests/service/server/archive-api.test.ts` | Artifact version and producing-process provenance visible when available |
| AC-6.2 | TC-6.2a | Story 6 | `tests/service/server/archive-api.test.ts` | Source provenance shows repository identity and ref when available |
| AC-6.3 | TC-6.3a, TC-6.3b | Story 6 | `tests/service/server/archive-api.test.ts` | Missing source or artifact context degrades one entry only |
| AC-7.1 | TC-7.1a, TC-7.1b | Story 7 | `tests/service/server/archive-api.test.ts`; `tests/service/server/derived-archive-view.test.ts` | Archive, turns, and derived views restore or rebuild after reload |
| AC-7.2 | TC-7.2a | Story 7 | `tests/service/server/derived-archive-view.test.ts` | Derived-view failure does not hide canonical archive |
| AC-7.3 | TC-7.3a | Story 7 | `tests/service/server/archive-api.test.ts` | Archive reads return bounded page with more-state |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC | Verifying Test File(s) |
|---|---|---|---|---|
| Path 1.1 | A completed process object reaches a trusted finalization point | Story 2 | TC-2.3a | `tests/service/server/archive-finalization.test.ts` |
| Path 1.2 | The finalized object appends one canonical entry with required taxonomy, sequence, and idempotency | Story 1 | TC-1.1a, TC-1.2a, TC-1.3a, TC-2.3b | `convex/archiveEntries.test.ts`; `tests/service/server/archive-finalization.test.ts` |
| Path 1.3 | Raw live deltas and interrupted objects remain outside archive truth | Story 2 | TC-2.1a, TC-2.2a, TC-2.2b | `tests/service/server/archive-finalization.test.ts`; `tests/service/client/process-live.test.ts` |
| Path 2.1 | User opens the process archive and sees finalized entries or an empty state | Story 3 | TC-3.1a, TC-3.1b | `tests/service/client/archive-section.test.ts` |
| Path 2.2 | Archive read enforces project/process access and returns not-found for a missing process | Story 3 | TC-3.3a, TC-3.3b | `tests/service/server/archive-api.test.ts` |
| Path 2.3 | User reloads or loses environment state and archive remains readable from durable entries | Story 3 | TC-3.2a, TC-3.2b | `tests/service/server/archive-api.test.ts` |
| Path 3.1 | User requests turns and deterministic grouping is derived from canonical entries | Story 4 | TC-4.1a, TC-4.2a | `tests/service/server/turn-derivation.test.ts` |
| Path 3.2 | Turn derivation leaves canonical archive entries unchanged and degrades only affected turns | Story 4 | TC-4.3a, TC-4.4a | `convex/archiveEntries.test.ts`; `tests/service/server/turn-derivation.test.ts` |
| Path 4.1 | User requests structural derived views over turns | Story 5 | TC-5.1a, TC-5.2a | `tests/service/server/derived-archive-view.test.ts` |
| Path 4.2 | Derived views trace to source turns and source archive entries without replacing archive truth | Story 5 | TC-5.3a, TC-5.3b, TC-5.4a | `tests/service/server/derived-archive-view.test.ts`; `convex/archiveEntries.test.ts` |
| Path 4.3 | Derived-view failure returns degraded state while archive remains readable | Story 5 | TC-5.5a, TC-5.5b | `tests/service/server/derived-archive-view.test.ts`; `tests/service/client/derived-archive-views.test.ts` |
| Path 5.1 | Archive entries show available artifact-version and source provenance | Story 6 | TC-6.1a, TC-6.2a | `tests/service/server/archive-api.test.ts` |
| Path 5.2 | Missing artifact/source context degrades one archive entry without hiding archive truth | Story 6 | TC-6.3a, TC-6.3b | `tests/service/server/archive-api.test.ts` |
| Path 6.1 | User returns later and archive, turns, and derived views restore or rebuild from durable state | Story 7 | TC-7.1a, TC-7.1b | `tests/service/server/archive-api.test.ts`; `tests/service/server/derived-archive-view.test.ts` |
| Path 6.2 | Long archive reads return a bounded page with more-state | Story 7 | TC-7.3a | `tests/service/server/archive-api.test.ts` |

## Validation

- Every Epic 7 AC appears in exactly one feature story.
- Every Epic 7 TC appears in exactly one feature story.
- Story 0 owns shared vocabulary only and no end-user AC/TC.
- Integration path trace covers capture, finalization/live separation, archive read/reopen, turn derivation, structural derived views, provenance enrichment, degraded-state isolation, and bounded long-process reads.
