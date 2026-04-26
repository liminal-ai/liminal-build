# Epic 2: Process Work Surface

This epic defines the complete requirements for the Liminal Build process work
surface. It serves as the source of truth for the Tech Lead's design work.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who wants to run high-quality crafted processes through one durable
project surface instead of manually stitching together prompts, tools,
documents, and environments.
**Context:** The user has opened a concrete process inside a project and needs
to do the work of that process, not just manage shell-level summaries.
**Mental Model:** "I am inside one process. The process has a current phase, a
running work history, current materials, and clear points where I need to
respond, review, or let it continue."
**Key Constraint:** The work surface must support substantial process
conversation and active progress without flattening the experience into generic
chat or forcing the user to reconstruct context from the shell alone.

---

## Feature Overview

This feature gives each process a dedicated working surface inside a project.
After it ships, the user can open, start, resume, and follow one process in a
surface that keeps the current phase, current work history, current materials,
and current action-required state together. The user can participate in process
conversation where the process calls for it, see when the process is waiting or
working, and return later without reconstructing what happened from project
summaries alone.

---

## Scope

### In Scope

This epic delivers the shared active-process surface above process-specific
behavior:

- Dedicated process work surface entered from the project shell
- Start, open, and resume flows for one process
- Process history/timeline surface for active work
- In-context user responses and multi-turn discussion during process stages that
  call for it
- Current phase, status, blocker, and next-action visibility
- Current process materials and outputs kept visible alongside active work
- Distinction between routine progress and attention-required moments
- Visibility into side work or isolated process activity at summary/result level
- Live process updates in the browser
- Refresh, reconnect, and return-later behavior for the process surface

### Out of Scope

- Detailed behavioral rules for `ProductDefinition`, `FeatureSpecification`, or
  `FeatureImplementation`
- Environment hydration, filesystem work, tool harness behavior, or provider
  lifecycle behavior (Epic 3)
- Full markdown review, Mermaid rendering, and package/export workflows (Epic 4)
- Full canonical archive entry taxonomy, turn derivation, or chunk/view
  derivation behavior in the later archive/derived-view work that follows
  Epic 6
- Full inspectable delegated subthreads or separate subordinate-process work
  surfaces
- Manual process naming or renaming workflows
- Generic workflow-schema authoring or no-code process configuration

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Epic 1's project shell, process summaries, and access model are already in place | Validated | Platform | Epic 2 extends the shell rather than replacing it |
| A2 | A process may spend substantial stretches in back-and-forth discussion with the user | Validated | Product | Conversation stays process-owned rather than becoming a separate product surface |
| A3 | Epic 2 must support active process work before Epic 3 delivers full environment and tool-runtime behavior | Validated | Platform | The work surface and control surface arrive before the full execution substrate |
| A4 | Current process materials may include referenced project artifacts, source attachments, and current outputs even when the richer review surface is not yet delivered | Validated | Platform | Epic 2 keeps current working-set materials visible; Epic 4 deepens review |
| A5 | Side work or isolated process activity, when shown in Epic 2, appears as summary/result information rather than as a separate inspectable subthread | Unvalidated | Product + Platform | This keeps Milestone 1 scoped to one shared process surface |
| A6 | Process modules own exact prompts, phase semantics, and decision rules while the platform owns the shared work surface behaviors | Validated | Platform | Matches the crafted-process stance in the core PRD and architecture |
| A7 | Live process updates may disconnect transiently; the process surface must remain usable from durable state during that interruption | Validated | Platform | The work surface cannot depend on an uninterrupted socket to remain legible |

---

## Flows & Requirements

### 1. Opening a Process Work Surface

The user starts from the project shell and chooses one process to work in. The
surface needs to switch from project-level summaries to one active-process view
without losing project context or forcing the user to infer whether the process
is ready to start, already running, waiting, or completed.

1. User opens a project shell with one or more processes
2. User selects a process to open, start, resume, or respond to
3. System opens the process work surface for that process
4. System loads the process identity, current phase, current status, visible
   work history, and current materials
5. User understands what process they are in and what the next meaningful action
   is

#### Acceptance Criteria

**AC-1.1:** The user can open one accessible process from the project shell into
a dedicated process work surface without losing project context.

- **TC-1.1a: Open process from project shell**
  - Given: User is viewing a project shell with an accessible process
  - When: User activates the process open action
  - Then: The process work surface opens for that process within the same project context
- **TC-1.1b: Open process from direct process URL**
  - Given: User has access to a project and a process inside it
  - When: User navigates directly to that process route
  - Then: The process work surface opens for that process without requiring the user to reopen it from the project shell

**AC-1.2:** The work surface clearly identifies the active project and active
process, including the process display label, process type, current phase label,
and current status.

- **TC-1.2a: Active process identity shown**
  - Given: User has opened a process work surface
  - When: The surface renders
  - Then: The project name, process display label, process type, current phase label, and current status are visible

**AC-1.3:** The work surface shows the next meaningful action or blocker on
first load, using the current process state rather than requiring the user to
infer it from history alone.

- **TC-1.3a: Next step shown for active process**
  - Given: Process has a next meaningful action
  - When: The work surface loads
  - Then: The next step is visible on first load
- **TC-1.3b: Blocker shown for waiting process**
  - Given: Process is waiting on a user action or dependency
  - When: The work surface loads
  - Then: The blocking condition is visible on first load

**AC-1.4:** The initial process work-surface load includes the current visible
process history, current materials, and the current action-required state for
that process.

- **TC-1.4a: Process surface bootstrap includes current work state**
  - Given: Process has visible history and current materials
  - When: The work surface loads
  - Then: The surface shows the current process history and current materials together on first load
- **TC-1.4b: Early process with little history still opens cleanly**
  - Given: Process has little or no visible work history yet
  - When: The work surface loads
  - Then: The surface shows a clear early-state history area instead of appearing broken or blank

### 2. Starting, Resuming, and Following Active Process Work

The user needs to move from viewing a process to running it coherently. A draft
process needs a visible start path. A paused or interrupted process needs a
visible resume path. A running process needs a live surface that shows what is
happening now and what state the process has settled into when that work stops.

1. User opens a process work surface
2. User starts or resumes the process when that action is available
3. System moves the process into active work
4. System updates the work surface as the process progresses
5. Process later waits, pauses, completes, fails, or is interrupted
6. User sees the resulting state and available next path

#### Acceptance Criteria

**AC-2.1:** The user can start a draft process and resume a paused or
interrupted process from the work surface when that action is currently
available.

- **TC-2.1a: Start draft process**
  - Given: User is viewing a draft process with a start action
  - When: User starts the process
  - Then: The process enters active work and the surface updates to the active state
- **TC-2.1b: Resume paused process**
  - Given: User is viewing a paused process with a resume action
  - When: User resumes the process
  - Then: The process re-enters active work and the surface updates accordingly
- **TC-2.1c: Resume interrupted process**
  - Given: User is viewing an interrupted process with a resume action
  - When: User resumes the process
  - Then: The process re-enters active work and the surface updates accordingly

**AC-2.2:** The work surface updates the visible process status and phase state
while active work is happening, without requiring manual refresh.

- **TC-2.2a: Running state becomes visible during active work**
  - Given: Process has entered active work
  - When: The process is progressing
  - Then: The work surface shows that the process is actively running
- **TC-2.2b: Phase change becomes visible while process remains open**
  - Given: User is viewing an active process
  - When: The process advances to a new phase
  - Then: The visible phase label changes in the same work surface session

**AC-2.3:** Live process activity appears in the work surface as coherent
process-facing updates rather than raw provider or runtime fragments.

- **TC-2.3a: Progress updates appear as readable process activity**
  - Given: Process is actively working
  - When: The process emits live progress activity
  - Then: The work surface shows readable progress updates rather than low-level stream fragments
- **TC-2.3b: New activity appears in chronological order**
  - Given: Process has existing visible work history
  - When: New live activity arrives
  - Then: The new activity appears in the correct chronological position without forcing the user to reconstruct ordering manually

**AC-2.4:** When active work settles into `waiting`, `paused`, `completed`,
`failed`, or `interrupted`, the work surface shows the resulting state and the
next available path for that process.

- **TC-2.4a: Waiting state shown after active work**
  - Given: Process moves from active work into `waiting`
  - When: The state change completes
  - Then: The work surface shows the process as waiting and surfaces the next required action or blocker
- **TC-2.4b: Completed state shown after active work**
  - Given: Process completes
  - When: The final state is reached
  - Then: The work surface shows the process as completed and does not present it as still active
- **TC-2.4c: Failed or interrupted state shown after active work**
  - Given: Process fails or is interrupted
  - When: The state change completes
  - Then: The work surface shows the resulting failed or interrupted state and the next available path

**AC-2.5:** After a successful start or resume action, the work surface updates
in the same session without requiring manual refresh.

- **TC-2.5a: Start action updates visible process state in same session**
  - Given: User successfully starts a draft process
  - When: The action completes
  - Then: The work surface updates the visible process state in the same session without requiring manual refresh
- **TC-2.5b: Resume action updates visible process state in same session**
  - Given: User successfully resumes a paused or interrupted process
  - When: The action completes
  - Then: The work surface updates the visible process state in the same session without requiring manual refresh

### 3. Conversing and Responding in Context

The process work surface needs to support real process conversation where the
current stage calls for it. Some stretches of work involve multi-turn
discussion, clarification, or ideation. Some moments involve a specific question
or decision. The user needs to answer in context and keep those responses tied
to the process they belong to.

1. User is viewing a process work surface
2. Process enters a stage that supports discussion, clarification, or a specific
   response
3. User reads the latest process message or request in context
4. User submits a response in the same process surface
5. System records the response and continues the process from that context

#### Acceptance Criteria

**AC-3.1:** During process stages that support discussion or clarification, the
work surface supports multi-turn back-and-forth between the user and the
process.

- **TC-3.1a: Multi-turn discussion remains in one process surface**
  - Given: Process is in a stage that supports discussion
  - When: User and process exchange several turns
  - Then: The back-and-forth remains in one process work surface and does not force the user into a separate tool or page
- **TC-3.1b: Follow-up question remains in context**
  - Given: User has already exchanged at least one turn with the process
  - When: The process asks a follow-up question
  - Then: The follow-up appears in the same visible process context rather than as an unrelated new thread

**AC-3.2:** When the process is waiting on a specific question, decision, or
clarification, the outstanding request remains visible until it is addressed or
superseded.

- **TC-3.2a: Specific outstanding request remains visible**
  - Given: Process is waiting on a specific user answer
  - When: The user is viewing the work surface
  - Then: The outstanding request is visible and distinguishable from routine progress updates
- **TC-3.2b: Outstanding request clears or changes after response**
  - Given: Process has an outstanding request
  - When: The user responds and the process no longer needs that request
  - Then: The outstanding request clears or is replaced by the new current request

**AC-3.3:** A submitted user response becomes part of durable process history
for that process and remains visible when the user reloads or returns later.

- **TC-3.3a: Submitted response appears in process history**
  - Given: User submits a response in a process work surface
  - When: The submission succeeds
  - Then: The response appears in that process's visible history
- **TC-3.3b: Response remains after reload or return**
  - Given: User previously submitted a response in a process
  - When: The user reloads the process route or returns later
  - Then: The response still appears in that process's visible history

**AC-3.4:** When the current process state does not accept a user response, the
surface shows the current next action or blocking state rather than presenting
the process as waiting for a reply.

- **TC-3.4a: No false waiting state during non-interactive work**
  - Given: Process is actively working and not currently waiting on user input
  - When: The work surface renders
  - Then: The surface does not present the process as waiting for a user reply
- **TC-3.4b: Completed process does not present open reply state**
  - Given: Process is completed
  - When: The work surface renders
  - Then: The surface shows the completed state rather than presenting the process as awaiting a new reply

**AC-3.5:** An invalid process response is rejected without creating a new
visible history item for that process.

- **TC-3.5a: Empty response is rejected**
  - Given: User is in a process stage that accepts a response
  - When: User submits an empty or invalid response
  - Then: The response is rejected and no new visible history item is created
- **TC-3.5b: Failed response submission does not create partial history**
  - Given: User submits a response in a process stage that accepts a response
  - When: The submission fails
  - Then: The process surface does not create a partial or misleading new visible history item

**AC-3.6:** After a successful process response submission, the submitted
response and resulting process state update appear in the same session without
requiring manual refresh.

- **TC-3.6a: Successful response appears in visible history in same session**
  - Given: User submits a valid response in a process stage that accepts a response
  - When: The submission succeeds
  - Then: The submitted response appears in visible history in the same session without requiring manual refresh
- **TC-3.6b: Resulting current request or process state updates in same session**
  - Given: User submits a valid response in a process stage that accepts a response
  - When: The submission succeeds
  - Then: The current unresolved request or visible process state updates in the same session without requiring manual refresh

### 4. Working From Current Materials and Outputs

The process work surface needs to behave like a workspace, not only like a
history log. The user needs the current process materials, current outputs, and
current revision context visible enough to follow what the process is working
with right now. Those materials are the process's current working set. A
visible artifact here may be a project artifact first created or last revised
by another process; its presence reflects the current process reference, not
artifact ownership.

1. User opens a process work surface
2. System shows the current materials and outputs relevant to the current phase
3. Process revises an output, changes phase, or shifts focus
4. System updates the visible materials accordingly
5. User continues working without reconstructing the context from history alone

#### Acceptance Criteria

**AC-4.1:** The work surface keeps current phase-relevant artifacts, versions,
source attachments, and current outputs visible alongside active process work.

- **TC-4.1a: Materials visible alongside process history**
  - Given: Process has current materials and outputs relevant to the active phase
  - When: The work surface renders
  - Then: The materials remain visible alongside the active process work rather than being hidden behind a separate later-only surface
- **TC-4.1b: Source attachments visible when relevant**
  - Given: Process is working from one or more attached sources
  - When: The work surface renders
  - Then: The relevant source attachments are visible with the process work

**AC-4.2:** The visible materials make the current identity and revision context
clear enough that the user can tell which artifact, version, source, or output
the process is currently using or revising.

- **TC-4.2a: Current revision context visible for artifact**
  - Given: Process is using or revising an artifact with a current revision
  - When: The artifact appears in the work surface
  - Then: Its current identity and revision context are visible
- **TC-4.2b: Current output identity visible**
  - Given: Process has a current output in progress
  - When: The output appears in the work surface
  - Then: The user can tell which output the process is currently working on

**AC-4.3:** When the process changes phase, revises an output, or switches
focus, the visible materials update to match the current working context without
requiring the user to infer the change from history alone.

- **TC-4.3a: Phase change updates visible materials**
  - Given: User is viewing a process work surface
  - When: The process advances into a new phase with different current materials
  - Then: The visible materials update to the new current set
- **TC-4.3b: Output revision updates visible context**
  - Given: Process revises an output while the user is viewing the work surface
  - When: The revision becomes current
  - Then: The visible output context updates to the new current revision

**AC-4.4:** If no current materials or outputs are relevant to the active phase,
the work surface shows a clear empty state instead of stale or carried-forward
context.

- **TC-4.4a: Empty materials state shown for phase with no current materials**
  - Given: Active process phase has no current materials or outputs to show
  - When: The work surface renders
  - Then: The materials area shows a clear empty state
- **TC-4.4b: Previous materials do not linger as current**
  - Given: Prior phase had visible materials but the current phase does not
  - When: The user enters the new phase
  - Then: The work surface does not keep showing the old materials as if they are still current

### 5. Distinguishing Routine Progress, Attention-Required Moments, and Side Work

The active process surface needs to separate normal process progress from moments
that need the user. It also needs to avoid hiding separate side activity inside
one undifferentiated stream of updates. In this epic, side work means bounded
separate process activity whose result or failure returns to the parent process.
The user needs to know what can be read passively, what needs attention, and
what separate work has already returned to the parent process.

1. Process emits routine progress while active work continues
2. Process later asks for a decision, clarification, approval, or course
   correction
3. Process may also run separate side activity for a bounded purpose
4. Side activity later completes or fails and returns an outcome to the parent
   process
5. User follows what needs attention and what changed

#### Acceptance Criteria

**AC-5.1:** Routine progress updates are visibly distinct from moments that
require user attention, approval, or course correction.

- **TC-5.1a: Routine progress remains distinct from attention-required request**
  - Given: Process has both routine progress activity and an attention-required request
  - When: The work surface renders
  - Then: The user can distinguish the attention-required item from routine progress updates
- **TC-5.1b: Attention-required item remains visible in mixed activity**
  - Given: Process continues to report routine progress around a current request
  - When: The work surface updates
  - Then: The attention-required item remains visible rather than being buried in later routine updates

**AC-5.2:** Attention-required items remain visible as unresolved process
requests until the user addresses them or the process no longer needs them.

- **TC-5.2a: Unresolved request stays visible**
  - Given: Process is waiting on a user decision
  - When: User leaves the request unanswered for a period of time
  - Then: The request remains visible as unresolved
- **TC-5.2b: Resolved request no longer shown as unresolved**
  - Given: Process had an unresolved user request
  - When: The user addresses it or the process supersedes it
  - Then: The item no longer appears as unresolved

**AC-5.3:** When the process runs separate side work or isolated process
activity, the surface shows that activity as a distinct item with its purpose
and current status instead of folding it invisibly into the main history.

- **TC-5.3a: Active side work shown distinctly**
  - Given: Process has launched separate side work
  - When: The work surface updates
  - Then: The side work appears as a distinct visible item with its purpose and active status
- **TC-5.3b: Multiple side-work items remain distinguishable**
  - Given: Process has more than one separate side-work item over time
  - When: The work surface renders them
  - Then: Each one remains distinguishable by identity or purpose

**AC-5.4:** When separate side work completes or fails, the surface shows the
returned result or failure outcome and what changed in the parent process after
that outcome was applied.

- **TC-5.4a: Completed side work shows returned result**
  - Given: Separate side work completes successfully
  - When: The result returns to the parent process
  - Then: The work surface shows the returned result and the completed status
- **TC-5.4b: Failed side work shows failure outcome**
  - Given: Separate side work fails
  - When: The failure is returned to the parent process
  - Then: The work surface shows the failure outcome distinctly
- **TC-5.4c: Parent-process change shown after side work outcome**
  - Given: Side work completion or failure changes the parent process state
  - When: The work surface updates
  - Then: The visible parent process state reflects what changed after that outcome

### 6. Returning Later, Refreshing, and Handling Unavailable or Degraded Live State

The user may reload the process route, leave and return later, lose live
connection, or discover that the process is no longer available. The work
surface needs to stay legible through those cases without treating a transient
transport failure or a missing live connection as a loss of the process itself.

1. User opens a process work surface
2. User reloads, leaves and returns later, or loses live connection
3. System restores or reconciles the process surface from durable state and
   current live state
4. If the process is unavailable, system shows an unavailable state instead of
   leaking stale content

#### Acceptance Criteria

**AC-6.1:** Reloading the process route restores the same process work surface
with its latest durable history, current phase/status, and current materials.

- **TC-6.1a: Browser reload restores visible process state**
  - Given: User is viewing a process work surface
  - When: User reloads the browser
  - Then: The same process work surface reloads with the latest durable state
- **TC-6.1b: Return later restores visible process state**
  - Given: User previously opened a process work surface
  - When: User returns later and opens the same process again
  - Then: The work surface restores the latest durable state for that process

**AC-6.2:** If live connection is lost while the process surface is open, the
surface keeps the latest visible state on screen and shows that live updates are
disconnected or reconnecting.

- **TC-6.2a: Connection loss does not erase visible state**
  - Given: User is viewing a process surface with visible current state
  - When: Live connection is lost
  - Then: The already visible process state remains on screen
- **TC-6.2b: Connection-loss state shown**
  - Given: Live connection is lost while the process surface is open
  - When: The surface detects the loss
  - Then: The surface shows that live updates are disconnected or reconnecting

**AC-6.3:** When live connection resumes or the user reopens the process later,
the work surface reconciles to the latest process state without duplicating or
dropping finalized visible items.

- **TC-6.3a: Reconnected surface reconciles to latest state**
  - Given: User experienced live connection loss
  - When: Connection resumes
  - Then: The work surface reconciles to the latest process state
- **TC-6.3b: Finalized visible items not duplicated after reconcile**
  - Given: Process surface had previously shown finalized visible history items
  - When: The surface reconnects or reloads
  - Then: Previously finalized items are not duplicated in the visible history

**AC-6.4:** If the requested process or project is unavailable or access is
revoked, the platform shows an unavailable state and does not leak process
contents.

- **TC-6.4a: Missing process route shows unavailable state**
  - Given: User navigates to a process that no longer exists
  - When: The process surface loads
  - Then: The platform shows a process-unavailable state and does not show stale process contents
- **TC-6.4b: Revoked access blocks process surface**
  - Given: User no longer has access to the project or process
  - When: User navigates to that process route
  - Then: The platform blocks access and does not leak process contents

**AC-6.5:** If live-update subscription cannot start or drops while the process
bootstrap succeeds, the work surface remains usable from durable state and
offers a clear retry or reconnect path.

- **TC-6.5a: Bootstrap succeeds even when live subscription fails**
  - Given: Process bootstrap request succeeds but live subscription setup fails
  - When: The process surface loads
  - Then: The user can still read the current durable process state
- **TC-6.5b: Retry or reconnect path visible after live subscription failure**
  - Given: Live subscription is unavailable for an open process surface
  - When: The user remains on the surface
  - Then: The surface shows a clear retry or reconnect path

**AC-6.6:** If core process identity and status load successfully but one of the
secondary surfaces fails independently, the work surface remains open and the
failing section shows an error state without hiding the healthy sections.

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

---

## Data Contracts

### Browser Routes

| Route | Description |
|-------|-------------|
| `/projects/{projectId}/processes/{processId}` | Opens the dedicated work surface for one process inside its parent project |

### Endpoints

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get process work surface | GET | `/api/projects/{projectId}/processes/{processId}` | Returns the current process work-surface bootstrap for one accessible process |
| Start process | POST | `/api/projects/{projectId}/processes/{processId}/start` | Starts a draft process from its work surface |
| Resume process | POST | `/api/projects/{projectId}/processes/{processId}/resume` | Resumes a paused or interrupted process from its work surface |
| Submit process response | POST | `/api/projects/{projectId}/processes/{processId}/responses` | Submits one in-context user response into the current process |
| Subscribe to live process updates | WebSocket | `/ws/projects/{projectId}/processes/{processId}` | Delivers live updates for the visible process work surface |

### Process Work Surface Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Path parameter for the parent project |
| `processId` | string | Yes | Path parameter for the process to open |

### Process Work Surface Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| project.projectId | string | yes | non-empty | Stable parent project identifier |
| project.name | string | yes | non-empty | Parent project display name |
| project.role | enum | yes | `owner` or `member` | Current user's role in the parent project |
| process.processId | string | yes | non-empty | Stable process identifier |
| process.displayLabel | string | yes | non-empty | Human-readable process label |
| process.processType | enum | yes | `ProductDefinition`, `FeatureSpecification`, or `FeatureImplementation` | Process type |
| process.status | enum | yes | `draft`, `running`, `waiting`, `paused`, `completed`, `failed`, or `interrupted` | Current high-level process status |
| process.phaseLabel | string | yes | non-empty | Human-readable current phase label |
| process.nextActionLabel | string | no | non-empty when present | Current next meaningful action or blocker summary |
| process.availableActions | array of enum | yes | values from `start`, `respond`, `resume`, `review`, or `restart` | High-level actions currently available from the work surface |
| process.updatedAt | string | yes | ISO 8601 UTC | Most recent durable process update time |
| history | Process History Section Envelope | yes | present | Visible process history for the active process or a section-level error state |
| materials | Process Materials Section Envelope | yes | present | Current materials and outputs in the active process working set or a section-level error state |
| currentRequest | Current Process Request | no | present when unresolved | Current unresolved attention-required request for the active process |
| sideWork | Side Work Section Envelope | yes | present | Visible side-work items for the active process or a section-level error state |

### Process Surface Section Error

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | yes | non-empty | Stable machine-readable section error code |
| message | string | yes | non-empty | Human-readable section error summary |

### Process History Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the history section loaded with items, loaded empty, or failed independently |
| items | array of Process History Item | yes | present | Visible process history items; empty when `status` is `empty` or `error` |
| error | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

**Sort order:** History items are ordered oldest to newest by `createdAt`.

### Process History Item

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| historyItemId | string | yes | non-empty | Stable visible history item identifier |
| kind | enum | yes | `user_message`, `process_message`, `progress_update`, `attention_request`, `side_work_update`, or `process_event` | User-facing kind of visible process history item |
| lifecycleState | enum | yes | `current` or `finalized` | Whether the item is still being updated live or has settled into a stable visible item |
| text | string | yes | non-empty | Visible text/content for the history item |
| createdAt | string | yes | ISO 8601 UTC | Time the visible item was created |
| relatedSideWorkId | string | no | non-empty when present | Side-work item identifier when this history item refers to side work |
| relatedArtifactId | string | no | non-empty when present | Artifact identifier when this history item refers to a current artifact or output |

### Process Materials Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the materials section loaded with visible content, loaded empty, or failed independently |
| currentArtifacts | array of Process Artifact Reference | yes | present | Current project artifacts referenced in the active process working set; empty when `status` is `empty` or `error` |
| currentOutputs | array of Process Output Reference | yes | present | Current process outputs relevant to the active process, including outputs that may not yet be published as durable artifacts; empty when `status` is `empty` or `error` |
| currentSources | array of Process Source Reference | yes | present | Current source attachments relevant to the active process; empty when `status` is `empty` or `error` |
| error | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

### Current Process Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| requestId | string | yes | non-empty | Stable identifier for the current unresolved request |
| requestKind | enum | yes | `clarification`, `decision`, `approval`, `course_correction`, or `other` | User-facing kind of the current unresolved request |
| promptText | string | yes | non-empty | Current visible prompt or request text |
| requiredActionLabel | string | no | non-empty when present | Current action label shown with the unresolved request |
| createdAt | string | yes | ISO 8601 UTC | Time the current unresolved request became active |

An unresolved request appears in visible history when it is first issued.
`currentRequest` is the currently unresolved request projected out of that
history so it can remain pinned and visible while unresolved. When the request
is resolved or superseded, its visible history item remains in history and
`currentRequest` clears or is replaced.

### Process Artifact Reference

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| artifactId | string | yes | non-empty | Stable artifact identifier |
| displayName | string | yes | non-empty | Artifact display name |
| currentVersionLabel | string | no | non-empty when present | Current revision or version label |
| roleLabel | string | no | non-empty when present | Why this artifact is currently relevant to the process |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

**Sort order:** Current artifacts are ordered by `updatedAt` descending.

`currentArtifacts` is a process-scoped current-working-set projection. It may
include project artifacts first created or last revised by another process when
the active process currently references them.

### Process Output Reference

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| outputId | string | yes | non-empty | Stable output identifier |
| displayName | string | yes | non-empty | Current output display name |
| revisionLabel | string | no | non-empty when present | Current output revision label |
| state | string | yes | non-empty | User-visible current output state |
| updatedAt | string | yes | ISO 8601 UTC | Most recent output update time |

**Sort order:** Current outputs are ordered by `updatedAt` descending.

When a current output already corresponds to a current artifact or current
artifact version shown in `currentArtifacts`, the work surface links to that
artifact context and does not show a second unconnected duplicate entry in
`currentOutputs`. `currentOutputs` is reserved for outputs still in progress,
outputs not yet published as durable artifacts, or outputs that still need
separate current-state visibility.

Current-material visibility is driven by the process's current reference set
and linked artifact/output context, not by any artifact-level primary-process
field.

### Process Source Reference

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sourceAttachmentId | string | yes | non-empty | Stable source attachment identifier |
| displayName | string | yes | non-empty | Source display name |
| purpose | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| targetRef | string | no | non-empty when present | Branch, tag, or commit ref if known |
| hydrationState | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | High-level source availability state |
| updatedAt | string | yes | ISO 8601 UTC | Most recent durable source update time |

**Sort order:** Current sources are ordered by `updatedAt` descending.

### Side Work Section Envelope

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| status | enum | yes | `ready`, `empty`, or `error` | Whether the side-work section loaded with visible items, loaded empty, or failed independently |
| items | array of Side Work Item | yes | present | Visible side-work items for the active process; empty when `status` is `empty` or `error` |
| error | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

**Sort order:** Active side-work items appear first. Remaining items are ordered
by `updatedAt` descending.

### Side Work Item

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sideWorkId | string | yes | non-empty | Stable side-work identifier |
| displayLabel | string | yes | non-empty | Human-readable side-work label |
| purposeSummary | string | yes | non-empty | What the side work was for |
| status | enum | yes | `running`, `completed`, or `failed` | Current side-work status |
| resultSummary | string | no | non-empty when present | Returned result or failure summary shown to the user |
| updatedAt | string | yes | ISO 8601 UTC | Most recent visible side-work update time |

`sideWork.items` is the current summary surface for active side work and recent
completed or failed side-work outcomes that still matter to the parent process.
Visible history records the chronological moments when side work starts,
completes, fails, or changes the parent process. A side-work item may therefore
have both a current summary entry in `sideWork.items` and one or more related
visible history items.

### Start Process Response

`POST /api/projects/{projectId}/processes/{processId}/start` returns `200` with
an updated `process` object containing the new current status, phase label, next
action label, and available actions for the process, plus `currentRequest` when
present. After a successful start, the work surface updates in the same session.
Remaining history, materials, and side-work changes continue through live
updates; if live updates are unavailable, the surface reloads the current
durable process work-surface state automatically.

### Resume Process Response

`POST /api/projects/{projectId}/processes/{processId}/resume` returns `200` with
an updated `process` object containing the new current status, phase label, next
action label, and available actions for the process, plus `currentRequest` when
present. After a successful resume, the work surface updates in the same
session. Remaining history, materials, and side-work changes continue through
live updates; if live updates are unavailable, the surface reloads the current
durable process work-surface state automatically.

### Submit Process Response Request

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| clientRequestId | string | yes | non-empty | Client-generated correlation identifier for this response submission |
| message | string | yes | trimmed, non-empty | User response text submitted into the current process |

### Submit Process Response Response

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| accepted | boolean | yes | `true` | Indicates the response was accepted into the process |
| historyItemId | string | yes | non-empty | Visible history item identifier for the accepted response |
| process | object | yes | present | Updated process state needed to keep the visible work surface coherent after the accepted response |
| currentRequest | Current Process Request | no | present when unresolved | Updated unresolved request after the accepted response, when one remains |

After a successful response submission, the accepted response appears in visible
history in the same session. Remaining process-surface changes continue through
live updates; if live updates are unavailable, the surface reloads the current
durable process work-surface state automatically.

### Live Process Update Message

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| subscriptionId | string | yes | non-empty | Stable identifier for the current live subscription |
| processId | string | yes | non-empty | Process this live update belongs to |
| sequenceNumber | integer | yes | `>= 0` | Monotonic sequence number within the subscription |
| messageType | enum | yes | `snapshot`, `upsert`, `complete`, or `error` | Type of live update message |
| entityType | enum | yes | `process`, `history`, `current_request`, `materials`, or `side_work` | What visible surface entity the update applies to |
| entityId | string | yes | non-empty | Identifier of the visible entity being updated. For `current_request`, this is always the stable literal `current_request`. |
| correlationId | string | no | non-empty when present | Client request correlation identifier when the update corresponds to a client-originated action |
| payload | object or null | yes | present | Current-object payload for the visible entity. For `current_request`, `payload` is `null` when the pinned request clears. |
| completedAt | string | no | ISO 8601 UTC when present | Completion time for a `complete` message |

**Sequencing:** Live update messages are applied in `sequenceNumber` order within
one `subscriptionId`.

**Upsert semantics:** `upsert` messages replace the current browser-facing state
for the identified visible entity rather than delivering raw append-only stream
deltas.

**Completion marker:** `complete` marks the current visible entity as settled for
that live update cycle. The browser should not require raw delta reconstruction
to know that the current visible item has finished updating.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 404 | `PROCESS_NOT_FOUND` | Requested process does not exist inside the requested project |
| 409 | `PROCESS_ACTION_NOT_AVAILABLE` | Start, resume, or respond action is not valid in the current process state |
| 422 | `INVALID_PROCESS_RESPONSE` | Submitted process response is missing or invalid |

### Live Transport Status Codes

| Code | Description |
|------|-------------|
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live update subscription could not start or could not remain connected after the durable process surface bootstrap succeeded |

---

## Dependencies

Technical dependencies:

- Epic 1 project shell, auth/session handling, project membership enforcement,
  and process registration
- Durable process state and visible process-history persistence
- Browser-facing live transport for process updates
- Shared project/process contract vocabulary carried forward from Epic 1

Process dependencies:

- Product confirmation that Milestone 1 process work can begin before full
  environment/tool-runtime behavior is delivered in Epic 3
- Downstream process-specific epics to define the exact prompts, phase rules,
  and artifact roles for `ProductDefinition`, `FeatureSpecification`, and
  `FeatureImplementation`

---

## Non-Functional Requirements

### Performance

- Process work-surface bootstrap renders within 2 seconds for a process with up
  to 200 visible history items, 20 visible current materials, and 20 visible
  side-work items
- Visible live process updates appear in the browser within 1 second under
  normal connection conditions
- Start, resume, and response-submit actions update the visible process state
  without requiring a full manual refresh

### Security

- All process-surface routes, APIs, and live subscriptions require an
  authenticated session
- Project membership and process access are enforced server-side, not inferred
  from client state
- Inaccessible projects and processes do not leak labels, history, materials,
  side-work items, or live updates through direct routes or live subscription
  attempts
- User responses are accepted only for processes the current actor can access

### Reliability

- Refreshing or reopening a process route restores the latest durable process
  work surface for that process
- Live connection loss does not erase already visible process state
- Reconnect or reopen does not duplicate finalized visible history items
- A live-subscription failure does not prevent the durable process surface from
  loading

### Accessibility

- Process controls, response entry, and route navigation are keyboard reachable
- Current status, blockers, and attention-required items are available as
  readable text, not color alone
- Live updates do not require color-only cues or motion-only cues to remain
  understandable

### Observability

- Process open, start, resume, response-submit, and live-subscription failures
  are logged with request context, project ID, and process ID
- Status transitions into `waiting`, `completed`, `failed`, and `interrupted`
  are traceable by process ID
- Live disconnect and reconnect events are traceable for an active process
  surface session

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. What is the exact browser route model for entering a dedicated process work
   surface from the Epic 1 project shell?
2. What exact browser store shape should hold durable process history, current
   live objects, current materials, and side-work items without mixing
   finalized history with in-flight upserts?
3. What exact WebSocket subscription/authentication model should the platform
   use for process live updates?
4. What exact reconciliation policy should the client use after reconnect so it
   can merge live upserts with durable process bootstrap state without
   duplicating finalized items?
5. What exact process-surface projection contract should each process module
   implement so the shared work surface can render current materials,
   side-work summaries, and current available actions without inspecting
   process-specific internals directly?
6. What exact data model should represent visible side work in the shared
   process surface if full inspectable subthreads remain out of scope for this
   milestone?
7. What exact persistence grain should Epic 2 use for visible process history
   before the later archive and derived-turn work lands?
8. What exact error and retry model should the work surface use when the
   durable bootstrap succeeds but live transport is unavailable?

---

## Recommended Story Breakdown

### Story 0: Foundation (Infrastructure)

Create the shared process-surface foundation: route and contract vocabulary,
process-surface fixtures, visible history item shapes, side-work summary shapes,
live-update message vocabulary, and test helpers used by all later stories.

### Story 1: Open and Orient to a Process

**Delivers:** The user can open one process into a dedicated process work
surface and understand where they are immediately.
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (open accessible process into dedicated work surface)
- AC-1.2 (active project/process identity visible)
- AC-1.3 (next meaningful action or blocker visible on load)
- AC-1.4 (initial surface includes history, materials, and current action-required
  state)

### Story 2: Start, Resume, and Follow Active Work

**Delivers:** The user can start or resume a process and follow active work in
one coherent surface.
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (start/resume available process)
- AC-2.2 (visible status and phase updates during active work)
- AC-2.3 (live activity appears as coherent process-facing updates)
- AC-2.4 (surface settles into resulting waiting/completed/failed/interrupted
  state)
- AC-2.5 (successful start/resume updates surface in same session)

### Story 3: In-Context Conversation and User Responses

**Delivers:** The user can participate in process conversation and submit
responses in context.
**Prerequisite:** Story 2
**ACs covered:**

- AC-3.1 (multi-turn back-and-forth in the process surface)
- AC-3.2 (outstanding question or request remains visible)
- AC-3.3 (submitted response becomes durable visible history)
- AC-3.4 (surface does not falsely present waiting-for-reply state)
- AC-3.5 (invalid response rejected without misleading visible history)
- AC-3.6 (successful response updates surface in same session)

### Story 4: Current Materials and Outputs

**Delivers:** The user can follow the current materials and outputs the process
is working with while active work is happening.
**Prerequisite:** Story 2
**ACs covered:**

- AC-4.1 (current materials and outputs visible with active work)
- AC-4.2 (identity and revision context visible)
- AC-4.3 (materials update when phase or focus changes)
- AC-4.4 (clear empty state when no current materials apply)

### Story 5: Attention-Required Moments and Side Work Visibility

**Delivers:** The user can distinguish routine progress from moments needing
attention and can follow side-work outcomes without losing the parent-process
thread.
**Prerequisite:** Story 3
**ACs covered:**

- AC-5.1 (routine progress distinct from attention-required moments)
- AC-5.2 (unresolved requests remain visible)
- AC-5.3 (side work shown as distinct visible items)
- AC-5.4 (side-work outcomes and parent-process change visible)

### Story 6: Refresh, Reconnect, and Unavailable Recovery

**Delivers:** The process work surface remains legible across refresh, return,
disconnect, and unavailable-state scenarios.
**Prerequisite:** Story 5
**ACs covered:**

- AC-6.1 (reload and return restore work surface)
- AC-6.2 (live connection loss preserves visible state and shows disconnect)
- AC-6.3 (reconnect reconciles without duplicate finalized items)
- AC-6.4 (unavailable or revoked-access process state)
- AC-6.5 (durable surface remains usable when live updates are unavailable)
- AC-6.6 (secondary-surface failures degrade section-by-section)

---

## Validation Checklist

- [ ] User Profile has all four fields + Feature Overview
- [ ] Flows cover happy, alternate, refresh/reconnect, and unavailable paths
- [ ] Every AC is testable and avoids vague terms
- [ ] Every AC has at least one TC
- [ ] TCs cover happy path, edge cases, and errors
- [ ] Data contracts are specified at browser/server and live-update boundaries
- [ ] Scope boundaries are explicit
- [ ] Story breakdown covers all ACs
- [ ] Stories sequence logically
- [ ] External review completed before Tech Design handoff
- [ ] Self-review complete
