# Story 4: Materials and Outputs

### Summary
<!-- Jira: Summary field -->
Keep the current artifacts, outputs, and source attachments visible so the user can follow what the process is working with right now.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user has opened a concrete process inside a project and needs to do the work of that process, not just manage shell-level summaries.
- **Mental Model:** "I am inside one process. The process has a current phase, a running work history, current materials, and clear points where I need to respond, review, or let it continue."
- **Key Constraint:** The work surface must support substantial process conversation and active progress without flattening the experience into generic chat or forcing the user to reconstruct context from the shell alone.

**Objective**

Show the current materials and outputs relevant to the active phase, keep identity and revision context clear, and define how materials-state replacements update the visible workspace when current process focus changes.

**Scope**

In:

- Show current artifacts, current outputs, and current source attachments alongside process work
- Make current identity and revision context visible for artifacts and outputs
- Replace visible materials state when phase, output revision, or focus changes
- Show a deliberate empty state when no current materials apply

Out:

- Detailed review rendering for materials and outputs
- Side-work summaries and attention-required state treatment
- WebSocket subscription lifecycle, reconnect, and degraded loading behavior

**Dependencies**

- Story 3 conversation/current-request slice
- Shared live-update vocabulary from Story 0 for fixture-applied `materials` snapshots and upserts
- Shared bootstrap/materials vocabulary from Story 0
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-4.1:** The work surface keeps current phase-relevant artifacts, versions, source attachments, and current outputs visible alongside active process work.

- **TC-4.1a: Materials visible alongside process history**
  - Given: Process has current materials and outputs relevant to the active phase
  - When: The work surface renders
  - Then: The materials remain visible alongside the active process work rather than being hidden behind a separate later-only surface
- **TC-4.1b: Source attachments visible when relevant**
  - Given: Process is working from one or more attached sources
  - When: The work surface renders
  - Then: The relevant source attachments are visible with the process work

**AC-4.2:** The visible materials make the current identity and revision context clear enough that the user can tell which artifact, version, source, or output the process is currently using or revising.

- **TC-4.2a: Current revision context visible for artifact**
  - Given: Process is using or revising an artifact with a current revision
  - When: The artifact appears in the work surface
  - Then: Its current identity and revision context are visible
- **TC-4.2b: Current output identity visible**
  - Given: Process has a current output in progress
  - When: The output appears in the work surface
  - Then: The user can tell which output the process is currently working on

**AC-4.3:** When the process changes phase, revises an output, or switches focus, the visible materials update to match the current working context without requiring the user to infer the change from history alone.

- **TC-4.3a: Phase change updates visible materials**
  - Given: User is viewing a process work surface
  - When: The process advances into a new phase with different current materials
  - Then: The visible materials update to the new current set
- **TC-4.3b: Output revision updates visible context**
  - Given: Process revises an output while the user is viewing the work surface
  - When: The revision becomes current
  - Then: The visible output context updates to the new current revision

**AC-4.4:** If no current materials or outputs are relevant to the active phase, the work surface shows a clear empty state instead of stale or carried-forward context.

- **TC-4.4a: Empty materials state shown for phase with no current materials**
  - Given: Active process phase has no current materials or outputs to show
  - When: The work surface renders
  - Then: The materials area shows a clear empty state
- **TC-4.4b: Previous materials do not linger as current**
  - Given: Prior phase had visible materials but the current phase does not
  - When: The user enters the new phase
  - Then: The work surface does not keep showing the old materials as if they are still current

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story uses the shared materials envelope and its artifact, output, and source reference shapes to present the current working context. It also defines the materials-specific replacement semantics used when the current working context changes. The shared WebSocket subscription lifecycle remains owned by Story 6.

#### Process Materials Section Envelope

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `status` | enum | yes | `ready`, `empty`, or `error` | Whether the materials section loaded with visible content, loaded empty, or failed independently |
| `currentArtifacts` | array of Process Artifact Reference | yes | present | Current artifacts relevant to the active process; empty when `status` is `empty` or `error` |
| `currentOutputs` | array of Process Output Reference | yes | present | Current process-owned outputs relevant to the active process, including outputs that may not yet be published as durable artifacts; empty when `status` is `empty` or `error` |
| `currentSources` | array of Process Source Reference | yes | present | Current source attachments relevant to the active process; empty when `status` is `empty` or `error` |
| `error` | Process Surface Section Error | no | present when `status` is `error` | Section-scoped load error shown without failing the whole process surface |

The materials envelope is the full current-state payload for the materials panel. When materials change, the client replaces the current panel state with the new envelope rather than patching individual rows in place.

#### Process Artifact Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `artifactId` | string | yes | non-empty | Stable artifact identifier |
| `displayName` | string | yes | non-empty | Artifact display name |
| `currentVersionLabel` | string | no | non-empty when present | Current revision or version label |
| `roleLabel` | string | no | non-empty when present | Why this artifact is currently relevant to the process |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable artifact update time |

**Sort order:** Current artifacts are ordered by `updatedAt` descending.

#### Process Output Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `outputId` | string | yes | non-empty | Stable output identifier |
| `displayName` | string | yes | non-empty | Current output display name |
| `revisionLabel` | string | no | non-empty when present | Current output revision label |
| `state` | string | yes | non-empty | User-visible current output state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent output update time |

**Sort order:** Current outputs are ordered by `updatedAt` descending.

When a current output already corresponds to a current artifact or current artifact version shown in `currentArtifacts`, the work surface links to that artifact context and does not show a second unconnected duplicate entry in `currentOutputs`. `currentOutputs` is reserved for outputs still in progress, outputs not yet published as durable artifacts, or outputs that still need separate current-state visibility.

#### Process Source Reference

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `displayName` | string | yes | non-empty | Source display name |
| `purpose` | enum | yes | `research`, `review`, `implementation`, or `other` | Why the source is attached |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref if known |
| `hydrationState` | enum | yes | `not_hydrated`, `hydrated`, `stale`, or `unavailable` | High-level source availability state |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable source update time |

**Sort order:** Current sources are ordered by `updatedAt` descending.

#### Materials Update Semantics

| Message Shape | Meaning |
|---|---|
| `entityType: materials`, `messageType: snapshot` | Replace the current materials panel with the provided `ProcessMaterialsSectionEnvelope` snapshot |
| `entityType: materials`, `messageType: upsert` | Replace the current materials panel with the new current materials envelope after a phase, output, or focus change |

#### Story-Specific Notes

- TC-4.3a, TC-4.3b, and TC-4.4b are materials-slice behaviors exercised through fixture-applied `materials` snapshots/upserts in client store tests and published materials updates in server live-update tests.
- Story 4 owns the meaning of a changed `materials` payload.
- Story 6 owns the transport lifecycle that delivers those materials updates over the live subscription.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Materials render alongside active process work rather than behind a separate review-only surface
- Current artifact, output, and source identity/revision context is legible in the workspace
- Phase changes and output revision changes replace the visible materials state without forcing inference from history
- Empty-materials states clear stale prior context
- Materials snapshot/upsert replacement semantics are defined for this slice even though the shared subscription lifecycle lands in Story 6
- Story tests cover TC-4.1a through TC-4.4b
