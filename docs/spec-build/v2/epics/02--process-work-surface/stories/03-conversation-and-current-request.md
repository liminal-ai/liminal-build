# Story 3: Conversation and Current Request

### Summary
<!-- Jira: Summary field -->
Keep process conversation, pinned current requests, and attention-required visibility in one surface while persisting valid user responses into durable history.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Support multi-turn process conversation, keep unresolved current requests visible and distinct from routine progress, persist accepted user responses into history, and prevent false waiting or partial-submit states.

**Scope**

In:

- Multi-turn discussion in the same process work surface
- Outstanding request visibility while unresolved
- Distinction between routine progress and attention-required current requests
- Durable history for accepted user responses
- Rejection of invalid responses without partial visible history
- Same-session state updates after successful response submission

Out:

- Side-work visibility and returned side-work outcomes
- Materials revision context
- Reconnect and degraded live-state handling

**Dependencies**

- Story 2 start/resume state flow and same-session returned process-state updates
- Shared history/current-request vocabulary from Story 0
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** During process stages that support discussion or clarification, the work surface supports multi-turn back-and-forth between the user and the process.

- **TC-3.1a: Multi-turn discussion remains in one process surface**
  - Given: Process is in a stage that supports discussion
  - When: User and process exchange several turns
  - Then: The back-and-forth remains in one process work surface and does not force the user into a separate tool or page
- **TC-3.1b: Follow-up question remains in context**
  - Given: User has already exchanged at least one turn with the process
  - When: The process asks a follow-up question
  - Then: The follow-up appears in the same visible process context rather than as an unrelated new thread

**AC-3.2:** When the process is waiting on a specific question, decision, or clarification, the outstanding request remains visible until it is addressed or superseded.

- **TC-3.2a: Specific outstanding request remains visible**
  - Given: Process is waiting on a specific user answer
  - When: The user is viewing the work surface
  - Then: The outstanding request is visible and distinguishable from routine progress updates
- **TC-3.2b: Outstanding request clears or changes after response**
  - Given: Process has an outstanding request
  - When: The user responds and the process no longer needs that request
  - Then: The outstanding request clears or is replaced by the new current request

**AC-3.3:** A submitted user response becomes part of durable process history for that process and remains visible when the user reloads or returns later.

- **TC-3.3a: Submitted response appears in process history**
  - Given: User submits a response in a process work surface
  - When: The submission succeeds
  - Then: The response appears in that process's visible history
- **TC-3.3b: Response remains after reload or return**
  - Given: User previously submitted a response in a process
  - When: The user reloads the process route or returns later
  - Then: The response still appears in that process's visible history

**AC-3.4:** When the current process state does not accept a user response, the surface shows the current next action or blocking state rather than presenting the process as waiting for a reply.

- **TC-3.4a: No false waiting state during non-interactive work**
  - Given: Process is actively working and not currently waiting on user input
  - When: The work surface renders
  - Then: The surface does not present the process as waiting for a user reply
- **TC-3.4b: Completed process does not present open reply state**
  - Given: Process is completed
  - When: The work surface renders
  - Then: The surface shows the completed state rather than presenting the process as awaiting a new reply

**AC-3.5:** An invalid process response is rejected without creating a new visible history item for that process.

- **TC-3.5a: Empty response is rejected**
  - Given: User is in a process stage that accepts a response
  - When: User submits an empty or invalid response
  - Then: The response is rejected and no new visible history item is created
- **TC-3.5b: Failed response submission does not create partial history**
  - Given: User submits a response in a process stage that accepts a response
  - When: The submission fails
  - Then: The process surface does not create a partial or misleading new visible history item

**AC-3.6:** After a successful process response submission, the submitted response and resulting process state update appear in the same session without requiring manual refresh.

- **TC-3.6a: Successful response appears in visible history in same session**
  - Given: User submits a valid response in a process stage that accepts a response
  - When: The submission succeeds
  - Then: The submitted response appears in visible history in the same session without requiring manual refresh
- **TC-3.6b: Resulting current request or process state updates in same session**
  - Given: User submits a valid response in a process stage that accepts a response
  - When: The submission succeeds
  - Then: The current unresolved request or visible process state updates in the same session without requiring manual refresh

**AC-5.1:** Routine progress updates are visibly distinct from moments that require user attention, approval, or course correction.

- **TC-5.1a: Routine progress remains distinct from attention-required request**
  - Given: Process has both routine progress activity and an attention-required request
  - When: The work surface renders
  - Then: The user can distinguish the attention-required item from routine progress updates
- **TC-5.1b: Attention-required item remains visible in mixed activity**
  - Given: Process continues to report routine progress around a current request
  - When: The work surface updates
  - Then: The attention-required item remains visible rather than being buried in later routine updates

**AC-5.2:** Attention-required items remain visible as unresolved process requests until the user addresses them or the process no longer needs them.

- **TC-5.2a: Unresolved request stays visible**
  - Given: Process is waiting on a user decision
  - When: User leaves the request unanswered for a period of time
  - Then: The request remains visible as unresolved
- **TC-5.2b: Resolved request no longer shown as unresolved**
  - Given: Process had an unresolved user request
  - When: The user addresses it or the process supersedes it
  - Then: The item no longer appears as unresolved

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns response submission, unresolved current-request visibility, and the history semantics that distinguish routine progress from attention-required moments.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Submit process response | POST | `/api/projects/{projectId}/processes/{processId}/responses` | Submits one in-context user response into the current process |

#### Submit Process Response Request

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `clientRequestId` | string | yes | non-empty | Client-generated correlation identifier for this response submission |
| `message` | string | yes | trimmed, non-empty | User response text submitted into the current process |

#### Submit Process Response Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `accepted` | boolean | yes | `true` | Indicates the response was accepted into the process |
| `historyItemId` | string | yes | non-empty | Visible history item identifier for the accepted response |
| `process` | object | yes | present | Updated process state needed to keep the visible work surface coherent after the accepted response |
| `currentRequest` | Current Process Request | no | present when unresolved | Updated unresolved request after the accepted response, when one remains |

After a successful response submission, the accepted response appears in visible history in the same session. Remaining process-surface changes continue through live updates; if live updates are unavailable, the surface reloads the current durable process work-surface state automatically.

#### User-Facing History Kinds

| Kind | Meaning |
|---|---|
| `user_message` | A visible user-authored process message or response |
| `process_message` | A visible process-authored conversational message |
| `progress_update` | Routine process activity that does not require immediate user action |
| `attention_request` | A visible request that requires user attention, approval, decision, or course correction |
| `process_event` | A user-facing process milestone or state event |

#### Current Process Request

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `requestId` | string | yes | non-empty | Stable identifier for the current unresolved request |
| `requestKind` | enum | yes | `clarification`, `decision`, `approval`, `course_correction`, or `other` | User-facing kind of the current unresolved request |
| `promptText` | string | yes | non-empty | Current visible prompt or request text |
| `requiredActionLabel` | string | no | non-empty when present | Current action label shown with the unresolved request |
| `createdAt` | string | yes | ISO 8601 UTC | Time the current unresolved request became active |

An unresolved request appears in visible history when it is first issued. `currentRequest` is the currently unresolved request projected out of that history so it can remain pinned and visible while unresolved. When the request is resolved or superseded, its visible history item remains in history and `currentRequest` clears or is replaced.

#### Process History Item

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `historyItemId` | string | yes | non-empty | Stable visible history item identifier |
| `kind` | enum | yes | `user_message`, `process_message`, `progress_update`, `attention_request`, `side_work_update`, or `process_event` | User-facing kind of visible process history item |
| `lifecycleState` | enum | yes | `current` or `finalized` | Whether the item is still being updated live or has settled into a stable visible item |
| `text` | string | yes | non-empty | Visible text/content for the history item |
| `createdAt` | string | yes | ISO 8601 UTC | Time the visible item was created |
| `relatedSideWorkId` | string | no | non-empty when present | Side-work item identifier when this history item refers to side work |
| `relatedArtifactId` | string | no | non-empty when present | Artifact identifier when this history item refers to a current artifact or output |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | Respond action is not valid in the current process state |
| `422` | `INVALID_PROCESS_RESPONSE` | Submitted process response is missing or invalid |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Multi-turn discussion remains in one process surface without thread splitting
- Routine progress and attention-required requests are visually and semantically distinct
- Current unresolved requests stay visible until they are addressed or superseded
- Accepted user responses become durable visible history and survive reload/return
- Invalid or failed submissions do not create partial or misleading history items
- Same-session updates cover both the new response and the resulting visible process state
- Story tests cover TC-3.1a through TC-3.6b and TC-5.1a through TC-5.2b
