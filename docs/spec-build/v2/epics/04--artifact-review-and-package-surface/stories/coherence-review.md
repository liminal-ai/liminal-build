# Coherence Review: Epic 4 Story Shards

This review checks the Epic 4 story shard set against the detailed epic, the technical design documents, the restored coverage artifact, and implementation-time clarifications.

## Review Result

The shard set remains coherent and implementation-ready after the Epic 4 spec fixes. No epic acceptance criteria or test conditions are left unmapped, duplicated across functional stories, or moved into a story that conflicts with the epic's intended boundaries. The restored `coverage.md` now maps every AC and TC to both its owning story and the implemented/planned test file that verifies it.

## Checks Performed

### 1. Epic Coverage

- The detailed epic contains **22** functional ACs.
- The story files `01` through `06` contain **22** functional ACs.
- The detailed epic contains **42** TCs.
- The story files `01` through `06` contain **42** TCs.
- Validation confirmed:
  - no missing ACs
  - no extra ACs
  - no duplicate AC ownership
  - no missing TCs
  - no extra TCs
  - no duplicate TC ownership
  - every AC/TC has at least one verifying test file in `coverage.md`

### 2. Story Structure

Every story file contains the required sections and Jira markers:

- `### Summary`
- `### Description`
- `### Acceptance Criteria`
- `### Technical Design`
- `### Definition of Done`
- the matching Jira field comments for each section

### 3. Boundary Coherence

The story boundaries match the detailed epic's Recommended Story Breakdown:

- **Story 0** owns shared review-workspace, package, export, and error vocabulary only and intentionally carries no direct epic AC or TC ownership.
- **Story 1** owns review entry, target-selection bootstrap, process-aware review context, target-kind visibility, and return-to-process behavior.
- **Story 2** owns durable artifact-version history, current-versus-prior revision visibility, version ordering, and the no-version state.
- **Story 3** owns markdown rendering, Mermaid rendering, diagram-local failure handling, and unsupported-format fallback.
- **Story 4** owns package-snapshot review, the `publishPackageSnapshot` downstream publication handoff, package-member order and selection, and bounded package-member failure handling.
- **Story 5** owns package exportability, `.mpkz` archive export, `_nav.md` manifest inclusion, and export-failure handling.
- **Story 6** owns reopen behavior, unavailable-target handling, revoked-access blocking, and bounded degraded review-state behavior.

No story pulls in scope that the epic explicitly defers:

- no generic archive, transcript, or chunk browser
- no global document-library behavior
- no package-authoring or package-composition UX
- no production package-publication workflow inside Epic 4 itself

### 4. Contract Coherence

Relevant contracts are copied into the story files that need them for self-contained Jira shards. Story 0 remains the authoritative vocabulary source, and downstream stories now explicitly note that their repeated shapes reference Story 0's canonical `review-workspace.ts` contract.

- Story 1 carries the process-aware review route, bootstrap response, target summary, and target-selection rules.
- Story 2 carries artifact review endpoint, artifact version, and selected-version identity contracts.
- Story 3 carries markdown-body, Mermaid-block, and bounded render-error contracts.
- Story 4 carries package review endpoint, package-member, package-member-review, package-exportability, package-member error contracts, and the `publishPackageSnapshot` publication handoff.
- Story 5 carries export endpoints, exportability, and export-response contracts for `.mpkz` export.
- Story 6 carries review-target status, request-level versus bounded failure rules, and unavailable-target error handling.

The detailed epic's key scope distinction is preserved in the shard set:

- artifact review remains fully user-deliverable inside Epic 4
- package review and export are fully specified in Epic 4 but remain exercisable through tests and manual Convex seeding until a downstream process-module epic publishes durable package snapshots in normal product flow

### 5. Implementation-Time Clarifications

Three implementation discoveries are now reflected consistently across the
pack:

- **Epic 5 artifact-model alignment:** any earlier Epic 4 wording that implied a single primary process owner on an artifact is superseded. Story 1 reviewability is now process-reference / pinned-context based, and Story 2 version review is explicitly project-artifact + version-provenance based.
- **AC-2.4 zero-version reachability:** zero-version artifacts are not reviewable targets and are excluded from available target lists by Story 1. Story 2 AC-2.4 / TC-2.4a covers only the direct artifact URL case where an artifact identity is reached through an otherwise valid process review context despite having no durable versions. This resolves the apparent tension without changing reviewability rules.
- **`REVIEW_TARGET_NOT_FOUND` target-scope use:** request-level 404 responses still use `REVIEW_TARGET_NOT_FOUND` when a target-specific route cannot resolve a requested artifact, artifact version, package, or export token. The same code is also valid inside `ReviewTargetError` for bounded bootstrap workspace states when project/process context still resolves but the review target identity is no longer available in that context.

Package-snapshot semantics are also clarified consistently across the shard set:

- Story 4 and Story 5 now explicitly state that a package snapshot opened from
  one process review context may pin members from multiple processes in the
  same project. The snapshot's process context anchors review entry and reopen
  behavior; it does not imply package-member ownership.

### 6. Non-Functional Ownership

`coverage.md` includes a Non-Functional Requirement Ownership table mapping the epic's performance, security, reliability, accessibility, and observability requirements to explicit story owners and verifying test files.

The story files themselves carry those NFRs in Technical Design and Definition of Done:

- Story 1 owns review-route auth, server-side access enforcement, readable status text, keyboard-reachable entry and return, and review-open logging
- Story 2 owns version-switch performance, keyboard-reachable version selection, and readable artifact/version identity
- Story 3 owns markdown render performance, Mermaid failure isolation, readable degraded states, and Mermaid failure traceability
- Story 4 owns package-review performance, keyboard-reachable package navigation, package snapshot publication handoff, and package-member reliability
- Story 5 owns export performance, bounded expiring URLs, keyboard-reachable export, and export request/failure traceability
- Story 6 owns durable reopen reliability, no-leak direct-route handling, and readable unavailable/degraded states

### 7. Integration Path Coherence

`coverage.md` includes an integration trace covering the main end-to-end paths:

- opening artifact review from a process, reviewing versions, reading markdown and Mermaid, and reopening later
- reaching a zero-version artifact by direct URL only within a valid process review context, while target discovery continues to exclude it
- opening package review as one durable snapshot, moving between members, and reopening later
- exporting the currently reviewed package and handling export failure or expired download URLs
- guarding review entry and direct review routes when no reviewable target or no valid access exists

Every segment in those paths has:

- an owning story
- at least one TC that exercises that segment
- at least one verifying test file in the coverage artifact

## Conclusion

The story shard set is complete, coherent, and correct against the detailed epic after the implementation-discovered clarifications. The detailed epic remains the source of truth, Story 0 remains the canonical shared vocabulary source, the story files are pickup-ready for implementation, and the restored coverage plus coherence artifacts show no gaps in epic-to-story-to-test traceability.
