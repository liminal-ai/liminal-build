# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Create the shared process-surface route, contract, fixture, and live-update vocabulary used by all later Epic 2 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Establish the shared route model, browser/server vocabulary, fixtures, and test helpers required by Stories 1 through 6.

**Scope**

In:

- Shared route and endpoint naming for the process work surface
- Shared process status, action, history-item, and live-update vocabulary
- Reusable fixtures for bootstrap payloads, live updates, section errors, and empty states
- Test helpers that later stories use for contract, rendering, and reconciliation coverage

Out:

- Process-specific prompt content, phase decision rules, or artifact semantics
- User-visible process behaviors owned by Stories 1 through 6
- Environment hydration, filesystem work, or provider-runtime behavior
- Full markdown review, export, or archive derivation behavior

**Dependencies**

- Epic 1 project shell, auth/session handling, project membership enforcement, and process registration
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared route, contract, fixture, and test foundations consumed by Stories 1 through 6.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Browser Route

| Route | Description |
|---|---|
| `/projects/{projectId}/processes/{processId}` | Opens the dedicated work surface for one process inside its parent project |

#### Shared Process Vocabulary

| Contract Element | Values |
|---|---|
| `process.processType` | `ProductDefinition`, `FeatureSpecification`, `FeatureImplementation` |
| `process.status` | `draft`, `running`, `waiting`, `paused`, `completed`, `failed`, `interrupted` |
| `process.availableActions` | `start`, `respond`, `resume`, `review`, `restart` |
| `history.kind` | `user_message`, `process_message`, `progress_update`, `attention_request`, `side_work_update`, `process_event` |
| `history.lifecycleState` | `current`, `finalized` |
| `live.messageType` | `snapshot`, `upsert`, `complete`, `error` |
| `live.entityType` | `process`, `history`, `current_request`, `materials`, `side_work` |

#### Shared Section Error Contract

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable section error code |
| `message` | string | yes | non-empty | Human-readable section error summary |

#### Shared Live Update Contract

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `subscriptionId` | string | yes | non-empty | Stable identifier for the current live subscription |
| `processId` | string | yes | non-empty | Process this live update belongs to |
| `sequenceNumber` | integer | yes | `>= 0` | Monotonic sequence number within the subscription |
| `messageType` | enum | yes | `snapshot`, `upsert`, `complete`, or `error` | Type of live update message |
| `entityType` | enum | yes | `process`, `history`, `current_request`, `materials`, or `side_work` | What visible surface entity the update applies to |
| `entityId` | string | yes | non-empty | Identifier of the visible entity being updated |
| `correlationId` | string | no | non-empty when present | Client request correlation identifier when the update corresponds to a client-originated action |
| `payload` | object or null | yes | present | Current-object payload for the visible entity |
| `completedAt` | string | no | ISO 8601 UTC when present | Completion time for a `complete` message |

**Sequencing:** Live update messages are applied in `sequenceNumber` order within one `subscriptionId`.

**Upsert semantics:** `upsert` messages replace the current browser-facing state for the identified visible entity rather than delivering raw append-only stream deltas.

**Completion marker:** `complete` marks the current visible entity as settled for that live update cycle.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared route and contract constants are defined once and referenced by later stories
- Reusable fixtures cover ready, empty, and error section envelopes plus live-update messages
- Test helpers support bootstrap rendering, live-update application, and reconnect reconciliation scenarios
- Story 0 introduces no user-visible behavior that conflicts with Stories 1 through 6
- Story files and coverage artifact can reference this foundation without redefining shared vocabulary
