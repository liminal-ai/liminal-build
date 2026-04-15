# Story 5: Side Work Visibility

### Summary
<!-- Jira: Summary field -->
Show side work as distinct visible activity with returned outcomes that change the parent process.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Show separate side activity as a distinct summary surface and make its returned result or failure legible in the parent process.

**Scope**

In:

- Show side work as a distinct visible item with purpose and status
- Show returned side-work result or failure plus the parent-process change that follows

Out:

- Routine progress versus attention-required request treatment
- Pinned current-request behavior
- Full inspectable delegated subthreads or subordinate work surfaces
- Deep materials review and output revision behavior
- Reconnect and unavailable-state recovery behavior

**Dependencies**

- Story 4 materials/output visibility
- Story 3 current-request and conversation behavior
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.3:** When the process runs separate side work or isolated process activity, the surface shows that activity as a distinct item with its purpose and current status instead of folding it invisibly into the main history.

- **TC-5.3a: Active side work shown distinctly**
  - Given: Process has launched separate side work
  - When: The work surface updates
  - Then: The side work appears as a distinct visible item with its purpose and active status
- **TC-5.3b: Multiple side-work items remain distinguishable**
  - Given: Process has more than one separate side-work item over time
  - When: The work surface renders them
  - Then: Each one remains distinguishable by identity or purpose

**AC-5.4:** When separate side work completes or fails, the surface shows the returned result or failure outcome and what changed in the parent process after that outcome was applied.

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

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story depends on the shared visible history model and side-work summary surface.

#### Side Work Section Envelope

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `status` | enum | yes | `ready`, `empty`, or `error` | Whether the side-work section loaded with visible items, loaded empty, or failed independently |
| `items` | array of Side Work Item | yes | present | Visible side-work items for the active process; empty when `status` is `empty` or `error` |
| `error` | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

**Sort order:** Active side-work items appear first. Remaining items are ordered by `updatedAt` descending.

#### Side Work Item

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sideWorkId` | string | yes | non-empty | Stable side-work identifier |
| `displayLabel` | string | yes | non-empty | Human-readable side-work label |
| `purposeSummary` | string | yes | non-empty | What the side work was for |
| `status` | enum | yes | `running`, `completed`, or `failed` | Current side-work status |
| `resultSummary` | string | no | non-empty when present | Returned result or failure summary shown to the user |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent visible side-work update time |

`sideWork.items` is the current summary surface for active side work and recent completed or failed side-work outcomes that still matter to the parent process. Visible history records the chronological moments when side work starts, completes, fails, or changes the parent process.

#### Related Visible History Fields

| Field | Type | Description |
|---|---|---|
| `kind` | `side_work_update` | User-facing visible history kind for side-work lifecycle moments |
| `relatedSideWorkId` | string | Link between visible history items and the current side-work summary item |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Side work is visible as distinct current activity with purpose and status
- Side-work completion and failure outcomes include the resulting parent-process change
- Story tests cover TC-5.3a through TC-5.4c
