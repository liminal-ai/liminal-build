# Epic 2 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Story 0 is a foundation story and does not own end-user ACs or TCs from the detailed epic. Stories 1 through 6 are aligned to the existing Epic 2 implementation chunks so each story is pickup-ready as an implementation slice.

## Coverage Gate

| AC | TC | Story |
|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b | Story 1 |
| AC-1.2 | TC-1.2a | Story 1 |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 1 |
| AC-1.4 | TC-1.4a, TC-1.4b | Story 1 |
| AC-6.4 | TC-6.4a, TC-6.4b | Story 1 |
| AC-2.1 | TC-2.1a, TC-2.1b, TC-2.1c | Story 2 |
| AC-2.4 | TC-2.4a, TC-2.4b, TC-2.4c | Story 2 |
| AC-2.5 | TC-2.5a, TC-2.5b | Story 2 |
| AC-3.1 | TC-3.1a, TC-3.1b | Story 3 |
| AC-3.2 | TC-3.2a, TC-3.2b | Story 3 |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 3 |
| AC-3.4 | TC-3.4a, TC-3.4b | Story 3 |
| AC-3.5 | TC-3.5a, TC-3.5b | Story 3 |
| AC-3.6 | TC-3.6a, TC-3.6b | Story 3 |
| AC-5.1 | TC-5.1a, TC-5.1b | Story 3 |
| AC-5.2 | TC-5.2a, TC-5.2b | Story 3 |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 |
| AC-4.2 | TC-4.2a, TC-4.2b | Story 4 |
| AC-4.3 | TC-4.3a, TC-4.3b | Story 4 |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 4 |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 |
| AC-5.4 | TC-5.4a, TC-5.4b, TC-5.4c | Story 5 |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 6 |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 6 |
| AC-6.1 | TC-6.1a, TC-6.1b | Story 6 |
| AC-6.2 | TC-6.2a, TC-6.2b | Story 6 |
| AC-6.3 | TC-6.3a, TC-6.3b | Story 6 |
| AC-6.5 | TC-6.5a, TC-6.5b | Story 6 |
| AC-6.6 | TC-6.6a, TC-6.6b, TC-6.6c | Story 6 |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC |
|---|---|---|---|
| Path 1.1 | Open one process from the project shell into the dedicated work surface | Story 1 | TC-1.1a |
| Path 1.2 | Identify the active project, process, phase, and status on first load | Story 1 | TC-1.2a |
| Path 1.3 | Read the next meaningful action or blocker without inferring from history | Story 1 | TC-1.3a, TC-1.3b |
| Path 1.4 | Load visible history, materials, and current request state together | Story 1 | TC-1.4a |
| Path 1.5 | Show an unavailable entry state when the process route no longer exists or access is revoked | Story 1 | TC-6.4a, TC-6.4b |
| Path 2.1 | Start an available draft process from the work surface | Story 2 | TC-2.1a |
| Path 2.2 | See the immediate returned process state in the same session after start or resume | Story 2 | TC-2.5a, TC-2.5b |
| Path 2.3 | Receive and keep a specific outstanding request visible in context | Story 3 | TC-3.2a, TC-5.2a |
| Path 2.4 | Submit a valid response and see it appear in visible history in the same session | Story 3 | TC-3.6a |
| Path 2.5 | Distinguish routine progress from attention-required moments while the request remains unresolved | Story 3 | TC-5.1a, TC-5.1b |
| Path 3.1 | Review current artifacts, outputs, and attached sources relevant to the active phase | Story 4 | TC-4.1a, TC-4.1b |
| Path 3.2 | Follow distinct side work and its returned result or failure | Story 5 | TC-5.3a, TC-5.4a, TC-5.4b |
| Path 3.3 | Observe live running, phase-change, and readable progress updates while the process remains open | Story 6 | TC-2.2a, TC-2.2b, TC-2.3a |
| Path 3.4 | Keep visible state on screen through disconnect, reconnect, reload, and durable fallback | Story 6 | TC-6.2a, TC-6.3a, TC-6.5a |
| Path 3.5 | Reconcile to the latest durable/live state without duplicating finalized history items and while degrading only failing sections | Story 6 | TC-6.3b, TC-6.6a, TC-6.6b, TC-6.6c |
