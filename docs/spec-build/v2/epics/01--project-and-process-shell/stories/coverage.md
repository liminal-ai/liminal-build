# Story Coverage and Integration Trace

This artifact validates that the Epic 1 story shard set covers every functional acceptance criterion and test condition from the detailed epic, and that the critical end-to-end user paths still have explicit story ownership after sharding.

## Coverage Gate

| AC | TC(s) | Story |
|----|-------|-------|
| AC-1.1 | TC-1.1a, TC-1.1b, TC-1.1c | Story 1 |
| AC-1.2 | TC-1.2a, TC-1.2b, TC-1.2c, TC-1.2d | Story 1 |
| AC-1.3 | TC-1.3a, TC-1.3b, TC-1.3c | Story 1 |
| AC-1.4 | TC-1.4a, TC-1.4b, TC-1.4c | Story 1 |
| AC-2.1 | TC-2.1a, TC-2.1b, TC-2.1c, TC-2.1d | Story 2 |
| AC-2.2 | TC-2.2a, TC-2.2b, TC-2.2c | Story 2 |
| AC-2.3 | TC-2.3a, TC-2.3b, TC-2.3c | Story 2 |
| AC-3.1 | TC-3.1a, TC-3.1b, TC-3.1c | Story 3 |
| AC-3.2 | TC-3.2a, TC-3.2b, TC-3.2c, TC-3.2d, TC-3.2e, TC-3.2f, TC-3.2g, TC-3.2h | Story 3 |
| AC-3.3 | TC-3.3a, TC-3.3b, TC-3.3c, TC-3.3d, TC-3.3e | Story 3 |
| AC-3.4 | TC-3.4a, TC-3.4b, TC-3.4c, TC-3.4d, TC-3.4e | Story 3 |
| AC-4.1 | TC-4.1a, TC-4.1b, TC-4.1c | Story 4 |
| AC-4.2 | TC-4.2a, TC-4.2b, TC-4.2c, TC-4.2d | Story 4 |
| AC-4.3 | TC-4.3a, TC-4.3b, TC-4.3c | Story 4 |
| AC-4.4 | TC-4.4a, TC-4.4b, TC-4.4c | Story 4 |
| AC-5.1 | TC-5.1a, TC-5.1b, TC-5.1c | Story 5 |
| AC-5.2 | TC-5.2a, TC-5.2b, TC-5.2c | Story 5 |
| AC-5.3 | TC-5.3a, TC-5.3b, TC-5.3c | Story 5 |
| AC-6.1 | TC-6.1a, TC-6.1b | Story 2 |
| AC-6.2 | TC-6.2a, TC-6.2b | Story 5 |
| AC-6.3 | TC-6.3a, TC-6.3b, TC-6.3c | Story 3 |

Story 0 is foundational only. It owns shared infrastructure and contract setup, but no direct functional ACs or TCs from the detailed epic.

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Path 1.1 | Check for a valid authenticated session before project data loads | Story 1 | TC-1.1a, TC-1.1b, TC-1.1c |
| Path 1.2 | Show only accessible projects and distinguish same-name project entries | Story 1 | TC-1.2a, TC-1.2d |
| Path 1.3 | Show role context and block direct access to inaccessible projects | Story 1 | TC-1.3a, TC-1.3c |
| Path 1.4 | End the session cleanly and block access to prior project URLs after sign out | Story 1 | TC-1.4a, TC-1.4b, TC-1.4c |
| Path 2.1 | Create a new project with durable owner assignment and duplicate-name protection | Story 2 | TC-2.1a, TC-2.1d |
| Path 2.2 | Open an accessible project from the index or a direct URL | Story 2 | TC-2.2a, TC-2.2b |
| Path 2.3 | Keep the active project clear across render, refresh, and browser navigation | Story 2 | TC-2.3a, TC-2.3b, TC-2.3c |
| Path 2.4 | Render process, artifact, and source sections with empty-state handling | Story 3 | TC-3.1a, TC-3.1b, TC-3.1c |
| Path 2.5 | Show process, artifact, and source summary context, including association scope and section-level failures | Story 3 | TC-3.2a, TC-3.3e, TC-3.4e, TC-6.3a, TC-6.3b, TC-6.3c |
| Path 3.1 | Create a supported process in the current project without manual naming | Story 4 | TC-4.1a, TC-4.2a, TC-4.2d |
| Path 3.2 | Preserve multiple process identities and keep the list legible as work accumulates | Story 4 | TC-4.3b, TC-4.4a, TC-4.4b, TC-4.4c |
| Path 3.3 | Restore durable shell state after reloads, new sessions, or server restarts | Story 5 | TC-5.1a, TC-5.1b, TC-5.1c |
| Path 3.4 | Keep shell visibility intact when no environment exists and show recovery-oriented next paths for interrupted or blocked work | Story 5 | TC-5.2a, TC-5.2b, TC-5.3a, TC-5.3b, TC-5.3c |
| Path 3.5 | Handle removed or missing project/process references without leaking data | Story 5 | TC-6.2a, TC-6.2b |
