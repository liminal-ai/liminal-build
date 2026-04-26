# Epic 4 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Stories 4 and 5 implement package review and export substrate in Epic 4. Story 4 also owns the `publishPackageSnapshot` handoff that downstream process-module publication flows call to create durable package snapshots. Story 4 and Story 5 test conditions are exercisable through tests and manual Convex seeding until a downstream process-module epic publishes those snapshots in normal product flow. Stories 1 through 3 and Story 6 remain fully aligned to the end-user artifact-review surface described in the epic.

Story 0 is a foundation story and does not own end-user ACs or TCs from the detailed epic. Stories 1 through 6 follow the recommended Epic 4 breakdown so each story is pickup-ready as an implementation slice.

## Coverage Gate

| AC | TC | Story | Delivery Notes |
|---|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b, TC-1.1c, TC-1.1d, TC-1.1e | Story 1 | User-deliverable in Epic 4 |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 1 | User-deliverable in Epic 4 |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 1 | User-deliverable in Epic 4 |
| AC-1.4 | TC-1.4a | Story 1 | User-deliverable in Epic 4 |
| AC-2.1 | TC-2.1a, TC-2.1b | Story 2 | User-deliverable in Epic 4 |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 2 | User-deliverable in Epic 4 |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 2 | User-deliverable in Epic 4 |
| AC-2.4 | TC-2.4a | Story 2 | User-deliverable in Epic 4 |
| AC-3.1 | TC-3.1a | Story 3 | User-deliverable in Epic 4 |
| AC-3.2 | TC-3.2a | Story 3 | User-deliverable in Epic 4 |
| AC-3.3 | TC-3.3a | Story 3 | User-deliverable in Epic 4 |
| AC-3.4 | TC-3.4a | Story 3 | User-deliverable in Epic 4 |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 4 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-4.3 | TC-4.3a, TC-4.3b, TC-4.3c | Story 4 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-4.4 | TC-4.4a | Story 4 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-5.1 | TC-5.1a, TC-5.1b | Story 5 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-5.2 | TC-5.2a, TC-5.2b | Story 5 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 | Platform substrate; product flow lights up after downstream `publishPackageSnapshot` caller exists |
| AC-6.1 | TC-6.1a, TC-6.1b | Story 6 | User-deliverable in Epic 4 |
| AC-6.2 | TC-6.2a, TC-6.2b, TC-6.2c | Story 6 | User-deliverable in Epic 4 |
| AC-6.3 | TC-6.3a, TC-6.3b | Story 6 | User-deliverable in Epic 4 |

## Non-Functional Requirement Ownership

| NFR | Owning Story | Notes |
|---|---|---|
| Markdown artifact up to 200 KB renders within 2 seconds | Story 3 | Captured in Story 3 Technical Design and Definition of Done |
| Package review up to 20 members renders within 2 seconds | Story 4 | Captured in Story 4 Technical Design and Definition of Done |
| Switching between already-known versions updates within 1 second | Story 2 | Captured in Story 2 Technical Design and Definition of Done |
| Export preparation begins within 2 seconds | Story 5 | Captured in Story 5 Technical Design and Definition of Done |
| All review routes and APIs require authenticated access | Story 1, Story 5 | Story 1 owns review-entry and review-read surfaces; Story 5 owns export routes |
| Project and process access are enforced server-side | Story 1, Story 6 | Story 1 owns normal access gating; Story 6 owns revoked direct-route blocking |
| Direct URLs do not leak unavailable or revoked review content | Story 6 | Captured in Story 6 Technical Design and Definition of Done |
| Export URLs are bounded and expire after issuance | Story 5 | Captured in Story 5 Technical Design and Definition of Done |
| Review remains available from durable state without an active environment | Story 6 | Captured in Story 6 Technical Design and Definition of Done |
| Failed Mermaid block does not fail the whole artifact review | Story 3 | Captured in Story 3 ACs, Technical Design, and Definition of Done |
| One unavailable package member does not fail the whole package review | Story 4, Story 6 | Story 4 owns the active package workspace; Story 6 owns reopen and degraded continuation |
| Review navigation, version selection, and export actions are keyboard reachable | Story 1, Story 2, Story 5 | Each story owns the keyboard reachability for its control surface |
| Artifact identity, version identity, and review-target status are readable text, not color alone | Story 1, Story 2, Story 6 | Entry, version review, and unavailable/degraded states keep text-visible identity and status |
| Mermaid render failures and unsupported-format states are readable text | Story 3 | Captured in Story 3 Technical Design and Definition of Done |
| Review opens are logged with request context, project ID, process ID, and target ID | Story 1 | Captured in Story 1 Technical Design and Definition of Done |
| Mermaid render failures are traceable by artifact ID and version ID | Story 3 | Captured in Story 3 Technical Design and Definition of Done |
| Export requests and export failures are traceable by package ID | Story 5 | Captured in Story 5 Technical Design and Definition of Done |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Path 1.1 | Open review from a process surface and resolve direct-open versus target-selection bootstrap | Story 1 | TC-1.1a, TC-1.1c, TC-1.1d, TC-1.1e |
| Path 1.2 | Keep project, process, and review-target identity visible and return to the same process context | Story 1 | TC-1.2a, TC-1.2b, TC-1.3a, TC-1.3b, TC-1.4a |
| Path 1.3 | Review the current and prior durable versions of one artifact | Story 2 | TC-2.1a, TC-2.1b, TC-2.2a, TC-2.2b, TC-2.3a, TC-2.3b, TC-2.4a |
| Path 1.4 | Read markdown and Mermaid content in place with bounded diagram and format degradation | Story 3 | TC-3.1a, TC-3.2a, TC-3.3a, TC-3.4a |
| Path 1.5 | Reload or reopen artifact review without losing durable state or leaking stale content | Story 6 | TC-6.1a, TC-6.2a, TC-6.3a |
| Path 1.6 | Guard review entry so the process surface does not offer review when no reviewable target exists | Story 1 | TC-1.1b |
| Path 1.7 | Guard direct review routes when project or process access is revoked | Story 6 | TC-6.2c |
| Path 2.1 | Open one durable package snapshot as a single reviewable package | Story 4 | TC-4.1a, TC-4.1b |
| Path 2.2 | See package membership and move between members without leaving package context | Story 4 | TC-4.2a, TC-4.2b, TC-4.3a, TC-4.3b, TC-4.3c |
| Path 2.3 | Keep the package workspace open when one member is unsupported or unavailable | Story 4 | TC-4.4a |
| Path 2.4 | Reload or reopen package review without losing durable package state or leaking stale package content | Story 6 | TC-6.1b, TC-6.2b, TC-6.3b |
| Path 3.1 | Offer export only when the reviewed package is currently exportable | Story 5 | TC-5.1a, TC-5.1b |
| Path 3.2 | Export a `.mpkz` archive whose manifest matches the reviewed package snapshot | Story 5 | TC-5.2a, TC-5.2b |
| Path 3.3 | Keep the review workspace open when export preparation fails or a prior export URL expires | Story 5 | TC-5.3a, TC-5.3b |
