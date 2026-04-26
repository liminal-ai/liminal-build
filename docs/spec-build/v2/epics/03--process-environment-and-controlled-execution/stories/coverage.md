# Epic 3 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Story 0 is a foundation story and does not own end-user ACs or TCs from the detailed epic. Stories 1 through 6 follow the recommended Epic 3 breakdown so each story is pickup-ready as an implementation slice.

The environment-state matrix test cases `TC-1.1c` through `TC-1.1k`, including
`TC-1.1c.1` for `rehydrating`, remain in Story 1 as first-load visibility and
disabled-control expectations for seeded or durable environment states. Story 5
owns the product flows and recovery mutations that make recovery-only states
operationally reachable.

## Coverage Gate

| AC | TC | Story |
|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b, TC-1.1c, TC-1.1c.1, TC-1.1d, TC-1.1e, TC-1.1f, TC-1.1g, TC-1.1h, TC-1.1i, TC-1.1j, TC-1.1k | Story 1 |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 1 |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 1 |
| AC-1.4 | TC-1.4a | Story 1 |
| AC-1.5 | TC-1.5a | Story 1 |
| AC-2.1 | TC-2.1a, TC-2.1b | Story 2 |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 2 |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 2 |
| AC-2.4 | TC-2.4a, TC-2.4b | Story 2 |
| AC-2.5 | TC-2.5a, TC-2.5b | Story 2 |
| AC-3.1 | TC-3.1a | Story 3 |
| AC-3.2 | TC-3.2a, TC-3.2b | Story 3 |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 3 |
| AC-3.4 | TC-3.4a | Story 3 |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 4 |
| AC-4.3 | TC-4.3a | Story 4 |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 4 |
| AC-4.5 | TC-4.5a, TC-4.5b | Story 4 |
| AC-5.1 | TC-5.1a, TC-5.1b | Story 5 |
| AC-5.2 | TC-5.2a, TC-5.2b | Story 5 |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 |
| AC-5.4 | TC-5.4a, TC-5.4b | Story 5 |
| AC-5.5 | TC-5.5a, TC-5.5b | Story 5 |
| AC-6.1 | TC-6.1a | Story 6 |
| AC-6.2 | TC-6.2a | Story 6 |
| AC-6.3 | TC-6.3a | Story 6 |
| AC-6.4 | TC-6.4a, TC-6.4b | Story 6 |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Path 1.1 | Open the process surface and see the current environment state immediately | Story 1 | TC-1.1a, TC-1.1b |
| Path 1.2 | Understand the full visible control set, including blocked actions and disabled reasons | Story 1 | TC-1.2a, TC-1.2b, TC-1.3a, TC-1.3b |
| Path 1.3 | Preserve the same environment truth after reload from durable state | Story 1 | TC-1.4a |
| Path 1.4 | Keep process identity, materials, and durable process state visible even without an active environment | Story 1 | TC-1.5a |
| Path 2.1 | Start or resume a process and enter visible environment preparation in the same session | Story 2 | TC-2.1a, TC-2.1b |
| Path 2.2 | Hydrate the current working set from current artifact references, outputs, and sources | Story 2 | TC-2.2a, TC-2.2b |
| Path 2.3 | Follow hydration progress or hydration failure without manual refresh | Story 2 | TC-2.3a, TC-2.3b |
| Path 2.4 | Enter active running only after readiness is confirmed | Story 2 | TC-2.4a, TC-2.4b |
| Path 2.5 | Distinguish writable and read-only sources before code work depends on them | Story 2 | TC-2.5a, TC-2.5b |
| Path 3.1 | Follow controlled work as a running environment-backed process activity | Story 3 | TC-3.1a, TC-3.2a |
| Path 3.2 | Keep waiting and checkpointing distinct from active execution | Story 3 | TC-3.3a, TC-3.3b |
| Path 3.3 | Preserve a legible process surface when execution fails | Story 3 | TC-3.4a |
| Path 4.1 | Persist artifact outputs durably to project-level artifact state and append a new version when revising an existing artifact | Story 4 | TC-4.1a |
| Path 4.2 | Persist writable-source code changes durably and show source identity plus target ref | Story 4 | TC-4.2a, TC-4.2b |
| Path 4.3 | Keep read-only sources out of code checkpoint paths | Story 4 | TC-4.3a |
| Path 4.4 | Show checkpoint success or failure clearly on the process surface | Story 4 | TC-4.4a, TC-4.4b, TC-4.5a, TC-4.5b |
| Path 5.1 | Distinguish stale and lost environments from generic failure or absence | Story 5 | TC-5.1a, TC-5.1b |
| Path 5.2 | Rehydrate a recoverable environment from the canonical materials currently referenced by the process, with `rehydrating` visible before later readiness | Story 5 | TC-5.2a, TC-5.2b |
| Path 5.3 | Rebuild a lost or unusable environment from canonical truth | Story 5 | TC-5.3a, TC-5.3b |
| Path 5.4 | Preserve project-level artifact truth and code truth through recovery | Story 5 | TC-5.4a, TC-5.4b |
| Path 5.5 | Show blocked recovery without falsely presenting readiness | Story 5 | TC-5.5a, TC-5.5b |
| Path 6.1 | Reopen later and restore the latest durable process, materials, environment summary, and checkpoint result | Story 6 | TC-6.1a |
| Path 6.2 | Restore prior checkpointed artifact versions and code results without an active environment after reopen | Story 6 | TC-6.2a |
| Path 6.3 | Remain usable when live environment updates are unavailable | Story 6 | TC-6.3a |
| Path 6.4 | Avoid duplicating finalized history or restating old checkpoint work as new on reopen | Story 6 | TC-6.4a, TC-6.4b |
