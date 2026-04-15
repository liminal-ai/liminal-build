# Story 6: Live Reconciliation and Degradation

### Summary
<!-- Jira: Summary field -->
Keep the process work surface legible while live activity is streaming, while the browser reloads or reconnects, and when section-level live or durable state degrades.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Preserve a readable, recoverable live process surface while status, phase, history, materials, and side-work state continue to update over time.

**Scope**

In:

- Restore the latest durable process state after reload or return later
- Keep visible state on screen during live disconnect and show reconnect status
- Reconcile to the latest process state without duplicating finalized items
- Show live status and phase changes while active work is happening
- Render coherent process-facing live activity in chronological order
- Keep the durable surface usable when live subscription setup fails
- Degrade section-by-section when history, materials, or side-work loading fails independently

Out:

- Request-level unavailable route handling
- Process-specific retry strategies beyond the shared work-surface contract
- Full archive derivation or historical chunk/view projection behavior
- Deep subordinate-process inspection flows

**Dependencies**

- Story 5 side-work visibility and settled process history semantics
- Shared section-error and live-update vocabulary from Story 0
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.2:** The work surface updates the visible process status and phase state while active work is happening, without requiring manual refresh.

- **TC-2.2a: Running state becomes visible during active work**
  - Given: Process has entered active work
  - When: The process is progressing
  - Then: The work surface shows that the process is actively running
- **TC-2.2b: Phase change becomes visible while process remains open**
  - Given: User is viewing an active process
  - When: The process advances to a new phase
  - Then: The visible phase label changes in the same work surface session

**AC-2.3:** Live process activity appears in the work surface as coherent process-facing updates rather than raw provider or runtime fragments.

- **TC-2.3a: Progress updates appear as readable process activity**
  - Given: Process is actively working
  - When: The process emits live progress activity
  - Then: The work surface shows readable progress updates rather than low-level stream fragments
- **TC-2.3b: New activity appears in chronological order**
  - Given: Process has existing visible work history
  - When: New live activity arrives
  - Then: The new activity appears in the correct chronological position without forcing the user to reconstruct ordering manually

**AC-6.1:** Reloading the process route restores the same process work surface with its latest durable history, current phase/status, and current materials.

- **TC-6.1a: Browser reload restores visible process state**
  - Given: User is viewing a process work surface
  - When: User reloads the browser
  - Then: The same process work surface reloads with the latest durable state
- **TC-6.1b: Return later restores visible process state**
  - Given: User previously opened a process work surface
  - When: User returns later and opens the same process again
  - Then: The work surface restores the latest durable state for that process

**AC-6.2:** If live connection is lost while the process surface is open, the surface keeps the latest visible state on screen and shows that live updates are disconnected or reconnecting.

- **TC-6.2a: Connection loss does not erase visible state**
  - Given: User is viewing a process surface with visible current state
  - When: Live connection is lost
  - Then: The already visible process state remains on screen
- **TC-6.2b: Connection-loss state shown**
  - Given: Live connection is lost while the process surface is open
  - When: The surface detects the loss
  - Then: The surface shows that live updates are disconnected or reconnecting

**AC-6.3:** When live connection resumes or the user reopens the process later, the work surface reconciles to the latest process state without duplicating or dropping finalized visible items.

- **TC-6.3a: Reconnected surface reconciles to latest state**
  - Given: User experienced live connection loss
  - When: Connection resumes
  - Then: The work surface reconciles to the latest process state
- **TC-6.3b: Finalized visible items not duplicated after reconcile**
  - Given: Process surface had previously shown finalized visible history items
  - When: The surface reconnects or reloads
  - Then: Previously finalized items are not duplicated in the visible history

**AC-6.5:** If live-update subscription cannot start or drops while the process bootstrap succeeds, the work surface remains usable from durable state and offers a clear retry or reconnect path.

- **TC-6.5a: Bootstrap succeeds even when live subscription fails**
  - Given: Process bootstrap request succeeds but live subscription setup fails
  - When: The process surface loads
  - Then: The user can still read the current durable process state
- **TC-6.5b: Retry or reconnect path visible after live subscription failure**
  - Given: Live subscription is unavailable for an open process surface
  - When: The user remains on the surface
  - Then: The surface shows a clear retry or reconnect path

**AC-6.6:** If core process identity and status load successfully but one of the secondary surfaces fails independently, the work surface remains open and the failing section shows an error state without hiding the healthy sections.

- **TC-6.6a: History section failure does not block process surface**
  - Given: Core process identity and status load successfully but history fails to load
  - When: The process surface renders
  - Then: The process surface remains open and only the history section shows an error state
- **TC-6.6b: Materials section failure does not block process surface**
  - Given: Core process identity and status load successfully but materials fail to load
  - When: The process surface renders
  - Then: The process surface remains open and only the materials section shows an error state
- **TC-6.6c: Side-work section failure does not block process surface**
  - Given: Core process identity and status load successfully but side work fails to load
  - When: The process surface renders
  - Then: The process surface remains open and only the side-work section shows an error state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the live transport lifecycle across active work, reload/reconnect, durable fallback, and section-level degradation.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Subscribe to live process updates | WebSocket | `/ws/projects/{projectId}/processes/{processId}` | Delivers live updates for the visible process work surface |

#### Live Process Update Message

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `subscriptionId` | string | yes | non-empty | Stable identifier for the current live subscription |
| `processId` | string | yes | non-empty | Process this live update belongs to |
| `sequenceNumber` | integer | yes | `>= 0` | Monotonic sequence number within the subscription |
| `messageType` | enum | yes | `snapshot`, `upsert`, `complete`, or `error` | Type of live update message |
| `entityType` | enum | yes | `process`, `history`, `current_request`, `materials`, or `side_work` | What visible surface entity the update applies to |
| `entityId` | string | yes | non-empty | Identifier of the visible entity being updated. For `current_request`, this is always the stable literal `current_request`. |
| `correlationId` | string | no | non-empty when present | Client request correlation identifier when the update corresponds to a client-originated action |
| `payload` | object or null | yes | present | Current-object payload for the visible entity. For `current_request`, `payload` is `null` when the pinned request clears. |
| `completedAt` | string | no | ISO 8601 UTC when present | Completion time for a `complete` message |

#### Relevant Live Entity Behavior

| Entity | Behavior |
|---|---|
| `process` | Updates visible status, phase label, next action label, and available actions while the process remains open |
| `history` | Inserts or replaces visible process-facing activity in chronological order |
| `current_request` | Maintains or clears the pinned unresolved request without forcing the user to reconstruct state from history |
| `materials` | Reconciles the current materials panel with the latest durable/live state |
| `side_work` | Reconciles the current side-work summary surface with active or completed side work |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | Start, resume, or respond action is not valid in the current process state when reconciled action state has changed |

#### Live Transport Status Codes

| Code | Description |
|---|---|
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live update subscription could not start or could not remain connected after the durable process surface bootstrap succeeded |

#### Process Surface Section Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable section error code |
| `message` | string | yes | non-empty | Human-readable section error summary |

#### Section Envelope Error Semantics

| Section | Error Behavior |
|---|---|
| `history` | The section may return `status: error` with a section-scoped error while the process surface stays open |
| `materials` | The section may return `status: error` with a section-scoped error while the process surface stays open |
| `sideWork` | The section may return `status: error` with a section-scoped error while the process surface stays open |

#### Reconciliation Rules

- Reloading or reopening restores the latest durable process work surface for that process.
- Live connection loss does not erase already visible process state.
- Reconnect or reopen does not duplicate finalized visible history items.
- A live-subscription failure does not prevent the durable process surface from loading.
- Live update messages are applied in `sequenceNumber` order within one `subscriptionId`.
- `upsert` messages replace the current browser-facing state for the identified visible entity rather than delivering raw append-only stream deltas.
- `complete` marks the current visible entity as settled for that live update cycle.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Live status and phase changes appear without requiring manual refresh
- Live process-facing activity remains readable and chronological
- Reload and return-later flows restore the latest durable process state
- Live disconnect preserves visible state and exposes reconnect status
- Reconcile logic avoids duplicating finalized visible history items
- Section-level failures degrade only the failing section and keep healthy sections open
- Story tests cover TC-2.2a through TC-2.3b and TC-6.1a through TC-6.6c
