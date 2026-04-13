# Coherence Review: Epic 1 Story Shards

This review checks the Epic 1 story shard set against the updated detailed epic and against the story files themselves.

## Review Result

The shard set is coherent and implementation-ready. No epic acceptance criteria or test conditions were left unmapped, duplicated across functional stories, or moved into a story that conflicts with the updated epic's intended boundaries.

## Checks Performed

### 1. Epic Coverage

- The updated detailed epic contains **21** functional ACs.
- The story files `01` through `05` contain **21** functional ACs.
- The updated detailed epic contains **73** TCs, including the `AC-3.2` status matrix rows.
- The story files `01` through `05` contain **73** TCs.
- Validation confirmed:
  - no missing ACs
  - no extra ACs
  - no duplicate AC ownership
  - no missing TCs
  - no extra TCs
  - no duplicate TC ownership

### 2. Story Structure

Every story file contains the required sections and Jira markers:

- `### Summary`
- `### Description`
- `### Acceptance Criteria`
- `### Technical Design`
- `### Definition of Done`
- the matching Jira field comments for each section

### 3. Boundary Coherence

The story boundaries match the updated epic's Recommended Story Breakdown:

- **Story 0** owns shared infrastructure only and intentionally carries no direct epic AC/TC ownership.
- **Story 1** owns authenticated entry, project visibility, access gating, and the newly-added sign-out behavior.
- **Story 2** owns project creation/open and the cancellation behavior grouped under `AC-6.1`.
- **Story 3** owns project shell summary rendering, section envelopes, section-level errors, summary association context, and `AC-6.3`.
- **Story 4** owns process registration, auto-generated process labels, process coexistence, and process-list legibility.
- **Story 5** owns durable return/recovery visibility and unavailable-state handling grouped under `AC-6.2`.

No story pulls in scope from later platform epics:

- no active process work-surface behavior from Epic 2
- no environment hydration or execution behavior from Epic 3
- no artifact review workflows from Epic 4
- no source hydration resolution or archive behavior from Epic 5

### 4. Contract Coherence

Relevant contracts were copied into the story files that need them:

- Story 1 carries auth/session, project-list, sign-out, and direct-access contracts.
- Story 2 carries project-create and project-open contracts.
- Story 3 carries the aggregated shell bootstrap contract, section envelopes, section errors, and summary shapes.
- Story 4 carries process-create contracts and the process-summary shape used after creation.
- Story 5 carries durable shell-read and unavailable-state contracts.

The updated epic changes were preserved in the shard set:

- sign out is included in Story 1
- Story 2 explicitly scopes create-process flow entry and cancel behavior and now carries the relevant process-create request boundary for `TC-6.1b`
- process labels are treated as auto-generated, not user-authored, in Story 4
- Story 4 now carries the stronger rule that Epic 1 display labels are derived from process type plus a durable distinguisher
- `availableActions` lives in process summaries where summary rendering needs it
- section envelopes and section-scoped errors live in Story 3
- process/project association context for artifacts and sources lives in Story 3
- Story 5 now carries section-envelope, section-error, artifact-summary, and source-summary contracts so restored shell state is self-contained for implementation

### 5. Integration Path Coherence

`coverage.md` includes an integration trace covering the main end-to-end paths:

- entering and exiting authenticated project work
- creating/opening a project and understanding its shell
- creating a process and returning later to durable recovery context

Every segment in those paths has both:

- an owning story
- at least one TC that exercises that segment

## Boundary Notes

These were the main places where coherence could have drifted and did not:

- `AC-6.1` stays with Story 2 even though part of it mentions process creation. The epic groups cancellation with creation/open flows rather than with process-registration delivery.
- `AC-6.3` stays with Story 3 because partial section failure is a shell-rendering concern, not a return/recovery concern.
- `AC-6.2` stays with Story 5 because unavailable project/process references are part of safe later return and recovery behavior in the recommended breakdown.
- `availableActions` appears in Story 3 and Story 5 without conflict: Story 3 owns rendering the summary field; Story 5 owns the recovery-specific action states that become meaningful on return.

## Conclusion

The story shard set is ready for downstream use. The detailed epic remains the source of truth, the story files are self-contained for implementation pickup, and the coverage artifact plus this review show no gaps in epic-to-story traceability.
