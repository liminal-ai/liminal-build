# Story 2: Start and Resume

### Summary
<!-- Jira: Summary field -->
Start or resume an available process and move the surface into the next durable state without a manual refresh.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Move the user from viewing a process to invoking the next allowed action, with immediate same-session state changes and correct resulting durable state.

**Scope**

In:

- Start draft processes from the work surface
- Resume paused and interrupted processes from the work surface
- Show waiting, paused, completed, failed, and interrupted end states plus next path
- Apply returned process state in the same session after successful action completion

Out:

- User-authored in-context responses
- Materials revision visibility
- Side-work visibility and outcome summaries
- Live status streaming, reconnect, and degraded-state recovery

**Dependencies**

- Story 1 open/process bootstrap flow
- Shared live-update vocabulary from Story 0
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** The user can start a draft process and resume a paused or interrupted process from the work surface when that action is currently available.

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

**AC-2.4:** When active work settles into `waiting`, `paused`, `completed`, `failed`, or `interrupted`, the work surface shows the resulting state and the next available path for that process.

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

**AC-2.5:** After a successful start or resume action, the work surface updates in the same session without requiring manual refresh.

- **TC-2.5a: Start action updates visible process state in same session**
  - Given: User successfully starts a draft process
  - When: The action completes
  - Then: The work surface updates the visible process state in the same session without requiring manual refresh
- **TC-2.5b: Resume action updates visible process state in same session**
  - Given: User successfully resumes a paused or interrupted process
  - When: The action completes
  - Then: The work surface updates the visible process state in the same session without requiring manual refresh

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the action flow for starting and resuming work plus the immediate returned process payload applied after those actions succeed.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Start process | POST | `/api/projects/{projectId}/processes/{processId}/start` | Starts a draft process from its work surface |
| Resume process | POST | `/api/projects/{projectId}/processes/{processId}/resume` | Resumes a paused or interrupted process from its work surface |

#### Start Process Response

`POST /api/projects/{projectId}/processes/{processId}/start` returns `200` with an updated `process` object containing the new current status, phase label, next action label, and available actions for the process, plus `currentRequest` when present.

After a successful start, the work surface updates in the same session from the returned payload. Ongoing live activity, reconnect, and durable fallback behavior are owned by Story 6.

#### Resume Process Response

`POST /api/projects/{projectId}/processes/{processId}/resume` returns `200` with an updated `process` object containing the new current status, phase label, next action label, and available actions for the process, plus `currentRequest` when present.

After a successful resume, the work surface updates in the same session from the returned payload. Ongoing live activity, reconnect, and durable fallback behavior are owned by Story 6.

#### Relevant Process Fields

| Field | Purpose in This Story |
|---|---|
| `process.status` | Drive running, waiting, paused, completed, failed, and interrupted state rendering |
| `process.phaseLabel` | Reflect visible phase changes while the process remains open |
| `process.nextActionLabel` | Show the next meaningful action or blocker after state changes |
| `process.availableActions` | Determine whether `start` or `resume` actions are currently available |
| `process.updatedAt` | Provide durable change timing for reconciled state |

#### Available Actions Used in This Story

| Action | Meaning |
|---|---|
| `start` | The process is currently actionable as a draft process |
| `resume` | The process is currently actionable as a paused or interrupted process |

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `409` | `PROCESS_ACTION_NOT_AVAILABLE` | Start or resume action is not valid in the current process state |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Draft, paused, and interrupted processes expose the correct start or resume path in the surface
- Successful start and resume flows update the visible process state in the same session
- Final active-work outcomes render waiting, completed, failed, and interrupted states correctly
- Story tests cover TC-2.1a through TC-2.1c, TC-2.4a through TC-2.4c, and TC-2.5a through TC-2.5b
