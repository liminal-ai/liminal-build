# Liminal Build Spec Steward — Product Requirements Document

## Status

This PRD defines the first product slice of Liminal Build: a web-based Spec
Steward that guides a user through creation of a complete spec pack for a
single feature or workstream. The spec pack ends at accepted story files and
supporting artifacts ready for downstream implementation orchestration.

This release does not attempt to cover the full Liminal Build vision. It does
not yet orchestrate upstream PRD or technical architecture creation, and it
does not yet run the downstream code-building workflow. It focuses on the
middle of the spec pipeline where rigor, review, and orchestration discipline
matter most: epic creation, tech design creation, publish-epic, and final
spec-pack handoff.

Each feature section is a compressed proto-epic: user scenarios, rolled-up
acceptance criteria, and scope boundaries. The features are written so
downstream epic-writing agents can expand them without needing the human to
restate foundational product intent.

---

## Product Vision

Liminal Build Spec Steward is a web application that helps a user produce a
high-trust spec pack through a guided, phase-based workflow. The user works in
one place: they bring in upstream context, interact with the orchestrated
agent harness through chat, review draft artifacts in a markdown workspace,
move artifacts through verification and acceptance gates, and finish with a
published spec pack ready for the next orchestration.

Today, the Liminal Spec methodology exists as a set of powerful but manual
skills and orchestrations. Running the process well requires knowing which
artifact comes next, which context to load, which reviews to run, how to track
fixes, and when a phase is actually ready to advance. The Spec Steward wraps
that process in a guided product surface without weakening the method.

This release covers the spec-pack creation workflow from accepted upstream
context through published stories and final handoff. It establishes the working
surface and orchestration model that later releases can extend upstream into
PRD and technical architecture creation, and downstream into code-building
orchestration.

### Ecosystem Context

The Spec Steward sits inside a broader Liminal Build ecosystem:

- **Liminal Spec skills** provide the methodology and artifact shapes
- **Team-spec orchestration** provides the multi-phase spec workflow the
  product wraps
- **MDV-derived markdown rendering** provides the review surface for artifacts
- **PI-derived agent harness concepts** provide the base runtime pattern for
  guided chat, artifact-aware sessions, and model-backed orchestration

The product does not replace these foundations. It turns them into a coherent,
usable workflow surface.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
builder who owns product direction and wants to drive high-quality spec work
without manually operating the entire Liminal Spec pipeline from the terminal.

**Context:** The user is shaping a product feature or workstream and wants to
move it through rigorous spec creation with fewer manual handoffs, fewer missed
steps, and a better artifact review surface than raw terminal output.

**Mental Model:** "I have a piece of work to spec. I want the system to walk
me through the right process, show me the artifacts clearly, keep the models
and reviews organized, and tell me when the pack is actually ready."

**Key Constraint:** The workflow must preserve artifact quality, explicit
verification, and phase-to-phase continuity. The product cannot flatten the
method into generic chat or hide important review and acceptance gates.

**Secondary User:** A product-minded operator who understands software work and
needs guided support to produce rigorous specs, but does not want to learn the
full manual skill and orchestration surface up front.

---

## Problem Statement

The current Liminal Spec workflow produces strong artifacts, but operating it
well requires too much manual orchestration.

The user has to decide where the pipeline enters, assemble the right reading
context, launch the right skill or orchestration, manage review loops, track
what was fixed or deferred, inspect long markdown artifacts outside a cohesive
workspace, and remember when a phase is actually ready to advance. The method
exists, but the working surface around it is fragmented.

A plain chat interface is not sufficient. The process depends on artifact
handoff, explicit verification, reviewable markdown outputs, and human gates at
the right moments. Without a product surface that holds those elements
together, the user falls back to manual terminal choreography and ad hoc state
tracking.

---

## Product Principles

- **Artifact-first workflow**: Documents, coverage artifacts, verification
  evidence, and phase state are the source of truth. Chat supports the workflow;
  it does not replace the artifacts.
- **Guided rigor over generic chat**: The system guides the user through the
  right phase, context, and gate instead of acting like a free-form assistant.
- **Phase-ready artifacts**: Every accepted artifact must be good enough for the
  next phase to consume without re-asking foundational questions.
- **Review in the same workspace**: The user should be able to read, compare,
  and approve artifacts where the orchestration happens.
- **Human decisions at the right altitude**: The product should pull the user
  in for consequential judgment, not for routine process mechanics.
- **Pluggable execution layer**: The workflow surface should stay stable even
  if model providers, harness implementations, or verification lanes change.
- **Local-first development path**: The product should work well when run
  locally first, while leaving room for a hosted version later.

---

## Scope

### In Scope

This release delivers a spec-pack creation product surface that starts from
accepted upstream context and ends with a completed spec pack ready for the
downstream implementation orchestration.

- Spec project and workspace setup
- Persistent artifact/session state for spec work
- Guided chat and orchestration control surface
- Artifact review surface for markdown specs and supporting files
- Orchestration for epic creation
- Orchestration for tech design creation
- Orchestration for publish-epic and story file generation
- Verification evidence, findings, dispositions, and acceptance tracking
- Final spec-pack readiness and handoff state

### Out of Scope

- Upstream PRD generation workflow (future release)
- Upstream technical architecture generation workflow (future release)
- Downstream code-building orchestration and sandbox execution (future release)
- Multi-tenant team collaboration and shared editing (future release)
- Full general-purpose agent catalog or platform marketplace (future release)
- Broad non-spec chat use cases unrelated to the spec workflow (not planned for
  this release)

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | Users will often enter this workflow with some upstream context already available, even if PRD and tech arch were produced outside the app | Unvalidated | This release starts at the spec-pack creation half |
| A2 | The Liminal Spec skills and orchestrations are stable enough to wrap in a product surface without changing their core methodology | Unvalidated | Product should preserve method, not rewrite it |
| A3 | MDV-derived markdown rendering can provide the artifact review quality needed for spec work | Unvalidated | Mermaid, code blocks, tables, and long-form markdown matter |
| A4 | A PI-style harness can be adapted cleanly enough to support guided orchestration rather than generic chat | Unvalidated | The control surface is more important than raw chat quality |
| A5 | Users will accept a phased workflow with explicit review and acceptance gates if the product keeps the process clear and low-friction | Unvalidated | This release depends on guided rigor being experienced as helpful, not heavy |

---

## Non-Functional Requirements

**Workspace continuity:** The user can leave and return to a spec project
without losing artifact state, orchestration state, or review context.

**Artifact readability:** Large markdown artifacts remain usable in the review
workspace. Headings, tables, code blocks, Mermaid diagrams, and long sections
render clearly enough for review and acceptance.

**Streaming responsiveness:** Chat and orchestration updates should begin
appearing quickly enough to feel live. The interface should not stall for long
silent stretches without visible activity or state.

**Phase transparency:** The user can always tell which phase is active, what is
waiting on whom, what has been accepted, and what still blocks progression.

**Verification visibility:** Verification evidence, findings, dispositions, and
gate status must be visible and durable. A phase cannot appear complete if the
required verification did not happen.

**Independent verification:** Phase acceptance requires verification by an
external reviewer distinct from the drafter or publisher. The product records
the evidence of that review, not just the claim that it happened.

**Recovery friendliness:** Long-running work must recover cleanly from browser
reloads, user pauses, or interrupted orchestration sessions.

**Local-first operation:** The default product path should work cleanly in a
local environment without requiring hosted infrastructure.

---

## Architecture Summary

The system is a web application with a persistent spec workspace, a guided
agent harness, and an integrated artifact review surface.

The server owns orchestration execution, durable phase state, verification
evidence, and artifact persistence. The client owns the working experience:
chat, artifact viewing, review, phase visibility, and handoff controls.

The technical world is expected to include:

- a web client built around an integrated workspace for chat, review, and phase
  control
- a pluggable agent harness that can drive the Liminal Spec workflow through a
  stable product interface
- a markdown review surface derived from MDV-quality rendering
- durable storage for artifacts, logs, findings, dispositions, and phase state

Expected stack categories for this release:

- Frontend: HTML and JavaScript web client
- Harness layer: pluggable orchestration runtime aligned with the guided chat
  workflow
- Rendering layer: markdown and Mermaid-capable artifact renderer
- Persistence layer: durable project and artifact store

The exact framework, runtime, and data-layer choices are settled in the
accompanying technical architecture work.

This release is expected to support local execution first. Hosted operation,
heavier sandbox infrastructure, and downstream implementation runtimes are
outside this PRD.

---

## Milestones

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Features 1+2 | A working spec workspace with persistent projects, guided chat, and a usable harness surface | Yes — can users start and manage spec work in one place? |
| M2 | Feature 3 | Artifact review is integrated into the workspace and usable for spec review | Yes — can users read and assess artifacts without leaving the app? |
| M3 | Feature 4 | Epic orchestration works end-to-end with drafting, verification, and acceptance flow | Yes — can the product successfully produce and land an epic? |
| M4 | Feature 5 | Tech design orchestration works end-to-end from accepted epic to accepted design docs | Yes — does the second major phase feel coherent and dependable? |
| M5 | Feature 6 | Publish-epic produces stories and coverage artifacts in a reviewable output set | Yes — can the system produce a complete published spec output? |
| M6 | Feature 7 | Full spec-pack workflow is integrated and reaches a clear ready-for-implementation handoff state | Yes — is the spec pack complete enough to feed the downstream orchestration? |

---

## Feature 1: Spec Workspace Foundation

### Feature Overview

This feature establishes the project and workspace surface for spec creation.
After it ships, the user can create or open a spec project, attach upstream
context, persist their work, and return to a stable workspace. This feature
owns the project shell and durable state. It does not own active orchestration
behavior inside the chat surface.

### Scope

#### In Scope

- Create and open spec projects
- Persist project-level artifact and orchestration state
- Attach upstream context artifacts to a project
- Show the current phase and artifact inventory at the project level
- Resume an in-progress spec project

#### Out of Scope

- Guided chat orchestration behavior (Feature 2)
- Rich artifact review workflows (Feature 3)
- Any specific spec phase orchestration (Features 4-6)

### Scenarios

#### Scenario 1: Starting a Spec Project

The user begins work on a new spec effort or re-opens an existing one. They
need a persistent project surface that holds the relevant context and gives
them a clear place to work.

**AC-1:** The user can create a new spec project and provide the basic project
identity and scope framing needed to distinguish it from other spec work. The
project appears in the workspace and is available for return later.

**AC-2:** The user can open an existing spec project and see its current phase,
artifact list, and latest saved state without reassembling the work manually.

#### Scenario 2: Attaching Upstream Context

The user has upstream context such as notes, briefs, or previously produced
artifacts. They need to attach that context to the project before starting the
spec workflow.

**AC-3:** The user can attach upstream context artifacts to the project. The
workspace records what was attached and keeps it associated with the project for
later phases.

**AC-4:** The workspace distinguishes between working artifacts produced inside
the product and upstream artifacts brought in from outside so the user can tell
what the current project state is built on.

#### Scenario 3: Resuming In-Progress Work

The user leaves the workspace and returns later. They need to continue where
they left off without reconstructing what was already accepted, what is in
progress, or what still needs attention.

**AC-5:** Project state persists across sessions. When the user returns, the
workspace restores the current project, artifact inventory, and phase state.

**AC-6:** If the project contains incomplete or interrupted work, the workspace
shows that state clearly enough that the user can decide whether to resume,
review, or restart the phase.

---

## Feature 2: Agent Harness and Guided Chat

### Feature Overview

This feature adds the active orchestration control surface that drives the spec
workflow inside the workspace. After it ships, the user can work through spec
phases through a guided chat-and-orchestration interface. This feature owns
live workflow behavior, worker activity, verification visibility, and user
intervention points. It does not own the persistent project shell or artifact
reading surface.

### Scope

#### In Scope

- Chat interface connected to the harness
- Streaming responses and phase updates
- Phase-aware orchestration controls
- Human response and intervention points within the workflow
- Display of verification and process state in the chat surface

#### Out of Scope

- Rich artifact inspection and markdown review behaviors (Feature 3)
- Phase-specific epic, tech design, or publish workflows (Features 4-6)

### Scenarios

#### Scenario 1: Working Through a Guided Phase

The user starts or resumes a workflow phase and works through it in the chat
surface. They need to see what the active orchestration is doing and how the
current phase is progressing.

**AC-7:** The chat surface can launch, continue, and resume guided workflow
phases. Messages, status updates, and orchestration state appear in a single
working thread tied to the active project and phase.

**AC-8:** The interface shows the active reading journey and worker progress
for the current phase. The user can tell which artifacts are being read, when
reflection checkpoints occur, and when the workflow moves from reading to
drafting, review, or revision.

#### Scenario 2: Responding to Questions and Decisions

The workflow surfaces questions, clarifications, and acceptance points that
require user judgment. The user needs to respond in context without losing the
thread of the work.

**AC-9:** The user can answer workflow questions, provide direction, and
intervene when the orchestration needs human input. Those interventions remain
part of the project state.

**AC-10:** The interface distinguishes routine progress updates from moments
that need user action. The user can tell when the workflow is reporting status,
when it is asking for a decision, and when a phase is blocked on human input.

#### Scenario 3: Seeing Verification and Process Evidence

The workflow includes verification passes and process gates. The user needs to
see that these happened and what they produced.

**AC-11:** Verification runs, findings, dispositions, and gate outcomes are
visible in the harness surface with enough detail that the user can tell what
was reviewed, who reviewed it, what evidence was recorded, and what happened
next.

**AC-12:** The interface does not present a phase as complete unless the
required verification and gate steps for that phase have actually occurred.

#### Scenario 4: Pausing and Diagnosing the Process

The user is dissatisfied with how the orchestration is behaving and needs to
interrupt the process before more work is dispatched.

**AC-13:** The user can pause the active workflow to enter process review. New
dispatches and phase acceptance stop while the product shows the current
orchestration state for diagnosis.

**AC-14:** The paused state remains visible until the user explicitly resumes or
redirects the workflow.

---

## Feature 3: Artifact Review Workspace

### Feature Overview

This feature turns the workspace into the artifact review surface for spec
work. After it ships, the user can read draft and accepted artifacts, inspect
them in context, and move between orchestration and review inside the same
product workspace.

### Scope

#### In Scope

- Render markdown artifacts inside the workspace
- Support spec-relevant markdown content such as headings, tables, code blocks,
  and Mermaid diagrams
- Navigate between project artifacts
- View chat and artifacts together in a single workspace
- Support review-oriented reading of draft and accepted artifacts

#### Out of Scope

- Full publish-epic output generation (Feature 6)
- Final spec-pack readiness and handoff logic (Feature 7)

### Scenarios

#### Scenario 1: Reading a Draft Artifact

The user needs to inspect an artifact produced during a phase, such as an epic
draft or a tech design draft, while that phase is still active.

**AC-15:** The user can open a project artifact and read it in a markdown
viewer that preserves the structure and readability required for spec review.

**AC-16:** The workspace keeps the artifact view connected to the current
project and phase so the user can move between orchestration context and
artifact content without losing orientation.

#### Scenario 2: Comparing Review Context with Artifact Content

The user is reviewing feedback, findings, or acceptance decisions while reading
the artifact itself. They need both surfaces available together.

**AC-17:** The workspace supports a review layout where the user can read the
artifact and the orchestration thread in the same working session.

**AC-18:** The review workspace makes it clear which artifact version or state
the user is reading so the user can review the right thing at the right phase.

#### Scenario 3: Navigating the Growing Spec Set

As the workflow progresses, the project accumulates multiple artifacts. The
user needs to move between them cleanly.

**AC-19:** The user can browse the project's artifacts from within the
workspace, open the one they need, and return to the active workflow without
losing the active working context.

**AC-20:** The artifact list reflects the current project state clearly enough
that the user can distinguish drafts, accepted artifacts, and downstream
outputs.

---

## Feature 4: Guided Epic Creation

### Feature Overview

This feature adds the first major orchestration flow: creating an epic through
the Spec Steward. After it ships, the user can move from upstream context to an
accepted epic inside the product, including drafting, verification, revision,
and human acceptance.

### Scope

#### In Scope

- Launch epic creation from the project workspace
- Guided reading journey and drafting flow for the epic phase
- Question surfacing and human answer loop for the epic phase
- External verification loop for the epic phase
- Human acceptance and phase completion for the epic artifact

#### Out of Scope

- Tech design creation (Feature 5)
- Publish-epic and story generation (Feature 6)

### Scenarios

#### Scenario 1: Starting the Epic Phase

The user has enough upstream context to begin epic creation. They need the
product to launch the phase correctly and make the required process visible.

**AC-21:** The user can start epic creation from the project workspace. The
system gathers the project context needed for the phase and begins the guided
epic workflow inside the harness.

**AC-22:** The epic phase shows the user the active state of drafting,
question-gathering, review, and acceptance so the user can follow the phase as
it progresses.

#### Scenario 2: Moving Through Drafting and Review

The epic workflow surfaces questions, produces a draft, runs verification, and
may require revisions before acceptance.

**AC-23:** The user can answer consequential epic questions through the
workspace, and the epic workflow incorporates those decisions into the phase.

**AC-24:** The epic workflow can move through draft, self-review, external
verification, and revision loops as one guided phase.

**AC-25:** Findings, fixes, dispositions, and open issues from the epic phase
remain attached to the project state throughout those review loops.

#### Scenario 3: Accepting the Epic

The user reaches the end of the epic phase and needs to decide whether the
artifact is ready to stand as the source of truth for the next phase. This is
the highest-scrutiny review point in the in-scope workflow.

**AC-26:** The user can review the accepted-epic candidate in the workspace,
see the relevant verification evidence, and perform a full artifact review
before accepting or rejecting the phase outcome.

**AC-27:** Once accepted, the epic is recorded as the current accepted artifact
for the next phase and the project phase state advances accordingly.

---

## Feature 5: Guided Tech Design Creation

### Feature Overview

This feature adds the second major orchestration flow: turning an accepted epic
into an accepted tech design set. After it ships, the user can run the design
phase inside the product with the same guided rigor used for epic creation,
while reviewing a design output set that may include multiple related
documents.

### Scope

#### In Scope

- Launch tech design creation from an accepted epic
- Support dependency research and design drafting inputs for the phase
- Guided review and revision flow for the design phase
- Human acceptance of the tech design outputs

#### Out of Scope

- Epic drafting (Feature 4)
- Publish-epic and story generation (Feature 6)

### Scenarios

#### Scenario 1: Starting the Tech Design Phase

The user has an accepted epic and is ready to move into technical design. They
need the product to carry the correct artifact context forward and start the
phase cleanly.

**AC-28:** The user can launch tech design creation from an accepted epic. The
phase uses the accepted epic and relevant project context as its starting point.

**AC-29:** The design phase presents itself as a technical-design workflow with
its own output set, review state, and acceptance surface so the user can tell
that the work has shifted from functional specification to technical design.

#### Scenario 2: Managing Design Inputs and Review

The design phase may involve dependency research, design decisions, validation,
and multi-document review.

**AC-30:** The design workflow can surface and preserve phase-specific inputs,
findings, and open questions so the user can review what shaped the design.

**AC-31:** The design workflow can move through drafting, verification, and
revision loops while keeping the design artifacts, findings, and dispositions
coherent as one accepted output set, even when that output spans multiple
documents.

#### Scenario 3: Accepting the Tech Design

The user needs to decide whether the design output is ready to guide the
publish phase and downstream implementation work. This review can be narrower
than the epic review while still giving the user enough visibility to make the
decision.

**AC-32:** The user can review the design outputs and the relevant verification
evidence in the workspace before accepting the phase.

**AC-33:** Once accepted, the design set is recorded as the accepted technical
design for the project and becomes available as the source for the publish
phase.

---

## Feature 6: Publish Epic to Stories

### Feature Overview

This feature turns the accepted epic and tech design into published story
artifacts and coverage outputs. After it ships, the user can generate the
implementation-facing story set and the proof that the sharding is complete.

### Scope

#### In Scope

- Launch publish-epic from accepted upstream artifacts
- Generate individual story outputs
- Generate coverage-gate and integration-path artifacts
- Support optional business-facing epic output
- Review and accept the published result set

#### Out of Scope

- Downstream story implementation and code-building orchestration (future
  release)

### Scenarios

#### Scenario 1: Publishing the Story Set

The user has an accepted epic and accepted tech design and is ready to turn
them into execution-facing stories.

**AC-34:** The user can launch publish-epic from the accepted project
artifacts, and the workflow produces the story set tied to the active project.

**AC-35:** The published output preserves the functional and technical detail
needed by downstream implementation work.

#### Scenario 2: Verifying Coverage and Fidelity

The publish phase must prove that the story set faithfully covers the source
epic and design.

**AC-36:** The publish workflow produces a coverage gate that shows how source
acceptance criteria and test conditions were assigned into the published
stories.

**AC-37:** The publish workflow produces an integration-path trace that shows
how the critical workflow path is carried across the published story set.

**AC-38:** The user can review publish-phase findings and outputs in the
workspace before accepting the result.

#### Scenario 3: Producing a Final Published Artifact Set

The user may need both engineering-facing outputs and a business-facing summary
of the same work. This review is lighter than the epic review and centers on
story outputs, coverage, and spot-check confidence.

**AC-39:** The publish workflow can produce the story outputs required for
implementation and, when requested, a business-facing roll-up tied to the same
source phase.

**AC-40:** Once accepted, the published outputs are recorded as the project's
current implementation-facing artifact set.

---

## Feature 7: Spec Process Integration and Finalization

### Feature Overview

This feature pulls the full spec workflow together. After it ships, the user
can move across the complete in-scope phases of the spec process, understand
what remains, handle cross-phase corrections, and finish with a clear
ready-for-implementation spec-pack state and handoff action.

### Scope

#### In Scope

- Project-wide phase progression across the in-scope workflow
- Readiness checks between phases
- Spec-pack completeness and finalization state
- Upstream backfill and deviation handling across phases
- Final handoff action and state for downstream implementation orchestration

#### Out of Scope

- The downstream implementation orchestration itself (future release)
- Upstream PRD and technical architecture orchestration (future release)

### Scenarios

#### Scenario 1: Moving Between Phases

The user completes one phase and needs to move into the next without guessing
what is required or what artifacts are now authoritative.

**AC-41:** The product shows the current phase path across the in-scope spec
workflow and the readiness state of each phase.

**AC-42:** A later phase does not appear ready to start until its required
upstream artifact and acceptance conditions are satisfied.

#### Scenario 2: Understanding Spec-Pack Completeness

The user wants to know whether the current project has reached a complete
spec-pack state or whether important artifacts are still missing. They also
need to understand when downstream work discovered a problem that points back
to an earlier artifact.

**AC-43:** The product can show the current completeness of the spec pack based
on the accepted artifacts and required published outputs for this release.

**AC-44:** The product makes missing or blocked parts of the process visible
enough that the user knows what still prevents finalization.

**AC-45:** When a later phase discovers that an earlier accepted artifact needs
revision, the product surfaces that proposed backfill clearly enough that the
user can review it as an upstream correction instead of losing it inside a later
phase thread.

#### Scenario 3: Handing Off to the Next Orchestration

The user has completed the in-scope workflow and wants to hand the result to
the downstream implementation process.

**AC-46:** The user can produce a concrete handoff artifact or exportable
spec-pack output from the accepted project state for downstream implementation
work.

**AC-47:** The user can mark a project as ready for downstream implementation
once the in-scope spec artifacts are complete and accepted.

**AC-48:** The final project state identifies the accepted spec-pack artifact
set clearly enough that a downstream implementation orchestration can consume it
without ambiguity about which artifacts are current.

---

## Cross-Cutting Decisions

- **Project-centered workflow**: All work is anchored to a persistent spec
  project rather than a loose chat thread.
- **Artifacts are phase outputs**: Every major phase produces explicit artifacts
  and explicit acceptance state. Conversation alone is never the phase result.
- **Verification evidence is visible**: Review findings, dispositions, and gate
  outcomes remain visible to the user instead of being hidden inside the
  orchestration engine.
- **External verification is required**: Phase acceptance depends on evidence
  from a reviewer distinct from the drafter or publisher. A phase cannot be
  accepted on self-attestation alone.
- **Review and orchestration share one workspace**: The user should not have to
  leave the product to inspect the main artifacts of the workflow.
- **Accepted artifacts become the current truth**: Each phase hands off through
  accepted artifacts, not through memory of the conversation that produced them.
- **Execution layer remains replaceable**: The product should not hard-wire its
  core workflow to one model vendor or one harness implementation.

---

## Future Directions

These are future directions, not v1 scope. They inform architecture but do not
gate this release.

- Guided PRD creation in the same product
- Guided technical architecture creation in the same product
- Downstream implementation orchestration from the completed spec pack
- Sandbox-backed code execution and repo-aware workspaces
- Multi-user collaboration and approval workflows
- Agent-type catalog and broader bespoke orchestration surfaces

---

## Recommended Epic Sequencing

```text
Feature 1: Spec Workspace Foundation
    |
    └──→ Feature 2: Agent Harness and Guided Chat
              |
              ├──→ Feature 3: Artifact Review Workspace
              |         |
              |         └──→ Feature 4: Guided Epic Creation
              |                   |
              |                   └──→ Feature 5: Guided Tech Design Creation
              |                               |
              |                               └──→ Feature 6: Publish Epic to Stories
              |                                           |
              |                                           └──→ Feature 7: Spec Process Integration and Finalization
```

**Sequencing rationale:**

- Foundation comes first because the product needs a persistent project surface
  before any workflow logic can hold state cleanly.
- Guided chat comes next because the later orchestration epics depend on a
  working control surface, not just a shell.
- Artifact review should exist before the first real orchestration phase lands
  so the user can inspect and accept artifacts inside the product instead of
  outside it.
- Epic orchestration is the first full spec phase because it is the first major
  artifact-producing step in this release.
- Tech design follows accepted epic output.
- Publish-epic follows accepted epic and tech design outputs.
- Finalization comes last because it depends on the product being able to see
  the whole in-scope process as one connected workflow.

---

## Relationship to Downstream Specs

This PRD is the upstream input for detailed epic specs for the first Spec
Steward release. Each feature section maps to one epic. The PRD defines what
the product does, who it serves, and how the feature set should be partitioned.
The epics define the exact feature behavior with line-level ACs and TCs. The
tech designs define how each epic is built.

---

## Validation Checklist

- [ ] User Profile grounds every feature
- [ ] Problem Statement justifies the product
- [ ] Each feature has Feature Overview, Scope, and Scenarios with numbered ACs
- [ ] Scenarios describe user situations with enough detail to decompose into
      epic flows
- [ ] Rolled-up ACs are decomposable without the epic writer inventing behavior
- [ ] No line-level ACs, TCs, or data contracts
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Milestones define feedback-gated phases
- [ ] NFRs surfaced
- [ ] Architecture summary establishes the technical world
- [ ] Cross-cutting decisions documented
- [ ] Epic sequencing has rationale
- [ ] Consumer test: each feature section can be expanded into a full epic
      without foundational questions about user intent or feature purpose
