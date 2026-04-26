# Liminal Build Core Platform - Product Requirements Document

## Status

This PRD defines the core platform enablement slice for Liminal Build. It is
the architectural stand-up for a platform that runs crafted, bespoke processes
rather than a generic agent builder.

The first three core `ProcessType`s are:

- `ProductDefinition`
- `FeatureSpecification`
- `FeatureImplementation`

This PRD defines the common platform capabilities those process types depend on.
It does not fully specify the detailed user behavior of each process type. That
work belongs in downstream process-specific specs once the platform core exists.

This PRD intentionally absorbs the project shell, process control surface, and
review-surface concerns that previously sat inside the first two epics of the
Spec Steward v1 PRD. Those are now treated as platform enablement rather than
as product-specific feature work.

---

## Product Vision

Liminal Build is a web platform for running crafted processes that combine
structured orchestration, controlled tool execution, durable artifact handling,
and high-trust review.

The platform is not a general-purpose agent playground and not a no-code agent
builder. Each process type is intentionally designed in code, with its own
state model, phase model, tools, prompts, and artifacts. The platform provides
the shared substrate those crafted processes run on: projects, processes,
environments, tools, artifacts, review surfaces, and canonical persistence.

The first concrete use of this platform is software-building work:

- `ProductDefinition` creates upstream planning artifacts such as product
  briefs, PRDs, technical architecture documents, and supporting research.
- `FeatureSpecification` creates an implementation-ready spec pack for a single
  feature.
- `FeatureImplementation` implements a feature from an accepted spec pack.

The platform must support those three process types cleanly without forcing
their behavior into a generic workflow engine. It should also leave room for
later bespoke process types such as research, analysis, planning, writing, or
other domain-specific work.

### Ecosystem Context

The core platform is expected to integrate or draw from several existing
systems:

- Liminal Spec methodology and skills
- Existing orchestration patterns for spec creation and implementation
- MDV-derived markdown, Mermaid, and package/export capabilities
- Pi-derived agent/runtime ideas where they materially help
- GitHub as the canonical source for code
- Convex as the canonical source for process state and artifact state

The platform does not replace those inputs. It turns them into a coherent
working system with durable state, reviewable artifacts, and controlled
execution environments.

---

## User Profile

**Primary User:** A technical founder, tech lead, staff engineer, or agentic
operator who wants to run high-quality crafted processes through one durable
project surface instead of manually stitching together prompts, tools,
documents, and environments.

**Context:** The user is working on a concrete body of work inside a project.
They want to create upstream planning artifacts, create specification packs,
and later implement those specifications through bespoke processes that share a
common platform.

**Mental Model:** "I have a project. Inside that project I run one or more
processes. Each process has a clear purpose, a controlled environment, a set of
artifacts, and a current phase. The platform should hold the process together,
show me the right materials, and keep the real outputs durable."

**Key Constraint:** The platform must preserve process rigor, artifact quality,
and controlled execution without flattening those processes into generic chat or
opaque automation.

**Secondary User:** The platform author or maintainer who crafts process types,
tools, and review behaviors for recurring use.

---

## Problem Statement

Liminal Build needs a shared core before process-specific products can be built
cleanly on top of it.

Without a core platform, each bespoke process would need to re-solve the same
problems independently:

- where projects live
- how process state is tracked
- how artifacts are created and versioned
- how a disposable working environment is hydrated and resumed
- how repositories are attached to project or process work
- how controlled tools execute
- how markdown artifacts are reviewed
- how canonical state is persisted
- how multiple isolated contexts or delegated passes are coordinated

If those capabilities are improvised process by process, the result will be
clunky, inconsistent, and difficult to extend. The process logic may be strong
while the surrounding working surface remains fragmented.

The platform needs a shared architecture that gives each crafted process a
consistent home without turning the platform into a generic low-code workflow
engine.

---

## Product Principles

- **Process-first, not actor-first:** The primary platform abstraction is the
  process and its progression, not a persona or chat session.
- **Crafted processes over dynamic schemas:** New process types are implemented
  in code with their own state models and persistence. The platform does not
  target user-defined process schemas.
- **Artifacts are project-scoped; meaning is process-owned:** The platform
  stores generic project artifacts and versions. Processes reference those
  artifacts, create new versions with process provenance, and define what those
  artifacts mean and which ones matter at each phase.
- **Filesystem as working space only:** A sandbox filesystem is always a
  disposable working copy, never canonical truth.
- **Canonical truth depends on domain:** Artifact and process truth lives in
  Convex. Code truth lives in GitHub. The platform hydrates from those sources
  and checkpoints back to them.
- **Controlled execution by default:** Processes work through a sandboxed
  TypeScript runtime and tool harness with explicit capabilities.
- **Review inside the working surface:** Markdown artifacts, diagrams, and
  package outputs should be reviewable where the process is being run.
- **Abstract only after repetition:** Review, verification, and approval stay
  process-specific until strong repetition proves a higher-level abstraction is
  warranted.

---

## Scope

### In Scope

This PRD covers the core platform capabilities required to support the first
three crafted process types.

- Project container above one or more processes
- Process registration and process-specific working surfaces
- Controlled process execution and delegated subcontexts
- Disposable, reconstructible environments with a filesystem
- TypeScript scripted runtime and tool harness
- Canonical persistence of process state and artifacts
- Repository attachment and hydration into a process environment
- Full-fidelity canonical archive of process history at low-level entry grain
- Turn derivation and later chunk/view derivation over archived history
- Markdown, Mermaid, and artifact review surfaces
- Artifact packaging and export support for spec-oriented work
- Authentication and ownership boundaries needed for real use
- Integration seams for GitHub, MCP, and the initial provider set:
  local, Daytona, and Cloudflare Sandbox

### Out of Scope

- Dynamic user-authored process schemas or a no-code process builder
- Broad marketplace or open catalog of arbitrary third-party agents
- Full billing and metering productization
- Full multi-step collaboration/approval matrix for teams
- Fine-tuning or RL pipeline for small models
- Full detailed behavior specs for each first-party process type

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | The first platform processes will remain crafted in code rather than dynamically defined by users | Validated | This is a deliberate product stance |
| A2 | Fastify will remain the application control plane and integration boundary | Validated | Client talks to Fastify, not directly to Convex |
| A3 | Convex will be used primarily as durable state and artifact persistence rather than as the primary backend control plane | Validated | This is an intentional architectural choice |
| A4 | Sandboxed filesystems are always disposable working state and can be reconstructed from canonical stores | Validated | Unpublished local changes may be lost if a sandbox is discarded |
| A5 | Artifact-heavy processes may still need one or more code repositories hydrated into their environment for research or review | Validated | Not only implementation processes need repo access |

---

## Non-Functional Requirements

**Durable project continuity:** Projects, processes, artifacts, and source
attachments remain available across browser reloads, user pauses, and server
restarts.

**Controlled execution:** Every process executes through a constrained runtime
and tool harness. The platform must never depend on raw unrestricted execution
as its default mode.

**Environment disposability:** A sandbox may be destroyed and recreated without
losing canonical process or artifact state. Rehydration from canonical sources
must be part of the expected operating model.

**Artifact readability:** Large markdown artifacts with tables, headings, code
blocks, and Mermaid diagrams must be reviewable in the app.

**Hydration visibility:** When artifacts or repositories are assigned to a
process, the user must be able to tell whether they are hydrated, stale, or in
need of rehydration.

**Process transparency:** The user can tell which process is active, which phase
it is in, what artifacts it is working with, and what still blocks progress.

**Canonical-source clarity:** The platform must preserve the difference between
working state and source of truth. Artifacts must clearly persist back to
Convex. Code work must clearly persist back to GitHub.

**Local development viability:** The platform must support a strong local
development provider, plus a provider abstraction that also supports the initial
managed-provider set.

**Live-stream usability:** Live process updates must remain coherent and
readable in the browser while work is active. The user should not need to
refresh or reconstruct state manually to understand what changed.

**Archive fidelity:** The platform must preserve a full-fidelity canonical
record of process history even when active model context later uses chunked,
summarized, or otherwise managed views.

---

## Architecture Summary

The core platform is a Fastify-controlled web application that manages
projects, processes, environments, artifacts, and integrations.

Fastify owns the application control plane:

- authentication
- process orchestration
- source hydration
- environment management
- tool harness coordination
- integration boundaries

Convex owns durable state for:

- projects
- processes
- artifacts
- artifact versions
- process-specific state
- repository attachments and hydration metadata

Canonical code state remains in GitHub.

Projects and processes may attach zero or more repositories, and each process
may reference zero or more relevant project artifacts. Artifact records remain
durable project assets even when multiple processes revise or review them, and
each artifact version carries producing-process provenance. Fastify hydrates
those canonical sources into a disposable working environment. A TypeScript
runtime and tool harness operate inside that environment. The process works
against the filesystem, while the platform checkpoints durable outputs back
into canonical stores.

The browser experience uses Fastify-owned authenticated shell/pages and a
bundled TypeScript client app built with Vite and served by Fastify in
production. WebSocket is the primary live transport for process updates.
Backend-normalized upsert objects are the browser-facing live stream model.

The platform also preserves a full-fidelity canonical archive of low-level
process history. Only finalized/completed entries are written to the canonical
archive. Turns are derived groupings over archived entries. Chunks, summaries,
and other managed views are later derived projections over turns.

The exact framework, environment provider, and protocol choices are settled in
the companion technical architecture document.

The architectural standup assumes an initial provider set of:

- a `DaytonaProvider` as the first reference implementation and first managed provider
- a `LocalProvider` as a contract-compatible development fast follow
- a `CloudflareSandboxProvider` as a contrasting managed provider that keeps
  the provider abstraction honest across different sandbox models

---

## Milestones

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Features 1+2 | Project shell and process control surface are usable for real process work | Yes - can a user manage a project and run a process coherently? |
| M2 | Feature 3 | Sandboxed environment, tool harness, and minimal canonical checkpoint loop work locally end to end | Yes - can a process hydrate, execute, and checkpoint already-attached working state coherently? |
| M3 | Feature 4 | Artifact review and packaging surface is usable for spec-oriented outputs | Yes - can markdown artifacts be reviewed and exported in-app? |
| M4 | Feature 4 + interstitial alignment epic | Review and package behavior now rests on project-scoped artifacts, version provenance, and pinned package context | Yes - can shared project artifacts be revised, reviewed, and packaged coherently across processes? |
| M5 | Feature 5 | Broader source-attachment and canonical-source workflows work across aligned Convex-backed artifacts and GitHub-backed repos | Yes - can the platform manage source attachment lifecycle, provenance, freshness, and archive-facing source truth coherently? |

---

## Feature 1: Project and Process Shell

### Feature Overview

This feature establishes the durable working shell for the platform. After it
ships, a user can create or open a project, see its processes and artifacts,
and work within one stable container that sits above all process types.

### Scope

#### In Scope

- Create and open projects
- Associate projects with owners and members
- Show project-level processes, artifacts, and source attachments
- Create a process from a supported process type
- Restore project and process state across sessions

#### Out of Scope

- Detailed process-specific behavior (handled by downstream process-specific
  epics)
- Environment hydration and execution behavior (Feature 3)
- Rich artifact review surface (Feature 4)

### Scenarios

#### Scenario 1: Opening a Project as the Main Working Container

The user works inside a durable project that can hold multiple related
processes, artifacts, and code sources over time.

**AC-1:** The user can create and open a project with the basic identity and
ownership and membership context needed to distinguish it from other work. A
project is the top-level working container for artifacts, processes, and source
attachments.

**AC-2:** The project shell shows the current processes, project artifacts, and
assigned repositories clearly enough that the user can understand the project's
current working state.

#### Scenario 2: Entering the Platform with the Right Access

The user signs in and expects to see only the projects and actions that match
their current ownership or membership context.

**AC-3:** The platform requires authenticated access for project work and
restores the user's available projects and current session cleanly after sign
in.

**AC-4:** The project shell reflects ownership and membership boundaries clearly
enough that the user can tell which projects they can open and which actions
they can take inside them.

#### Scenario 3: Creating and Tracking Processes Inside a Project

The user starts new work inside a project by creating a process from a supported
process type.

**AC-5:** The user can create a process from a supported `ProcessType`. The
process is recorded inside the current project and has its own state, phases,
current artifact references, and optional environment.

**AC-6:** Multiple processes can exist inside the same project without
overwriting each other's state, current artifact references, version
provenance, or source assignments.

#### Scenario 4: Returning to Work Later

The user leaves and returns later. The project shell must restore enough state
to continue meaningful work.

**AC-7:** Project and process state persist across sessions. When the user
returns, the system restores the project, current processes, current artifact
state, and source attachments.

**AC-8:** If a process was interrupted, the project shell shows that state
clearly enough that the user can decide whether to resume, review, rehydrate, or
restart.

---

## Feature 2: Process Work Surface

### Feature Overview

This feature provides the shared working surface for running a process. After it
ships, the user can start, resume, inspect, and steer a process through its
phases while seeing the process-specific materials that matter to that work.
This feature is the transition from a durable project shell to an active
process experience.

### Scope

#### In Scope

- Process-specific working surface
- Shared chat/control surface for process execution
- Phase visibility and process status visibility
- User intervention points
- Visibility into delegated or isolated subcontext work

#### Out of Scope

- Specific tool execution and environment hydration behavior (Feature 3)
- Markdown artifact review details (Feature 4)

### Scenarios

#### Scenario 1: Returning to a Process and Understanding Its Current State

The user opens a project with active or paused processes and needs to understand
what each process is doing before deciding where to engage.

**AC-9:** A process can be started and resumed from the project shell. The
working surface shows the active process, its current phase, the current status
of that phase, and the next meaningful action or blocker.

**AC-10:** The work surface distinguishes between process progression, artifact
work, delegated work, and waiting or blocked states so the user can tell what
is happening and what still needs attention.

#### Scenario 2: Working from Process-Specific Materials, Not Just a Thread

The user needs the process work surface to behave like a process workspace. The
right artifacts, current outputs, and phase-relevant materials need to stay in
view alongside the live process conversation.

**AC-11:** The work surface keeps the current process materials visible enough
that the user can tell which artifacts, versions, sources, and outputs are
currently relevant to the active phase.

**AC-12:** When the process advances, revises output, or switches focus, the
work surface updates the visible process materials and current context without
forcing the user to reconstruct state from the transcript alone.

#### Scenario 3: Steering a Process Without Losing Context

The process surfaces questions, clarification requests, or decisions that need
human judgment. The user needs to respond without losing the thread of the work.

**AC-13:** The user can respond to a process in context. Those responses become
part of the durable process history and influence later process behavior.

**AC-14:** The surface clearly distinguishes routine progress reporting from
moments that require user action, approval, or course correction.

#### Scenario 4: Understanding Delegated or Isolated Process Work

Some processes dispatch isolated work such as verification, research, or repair.
The user needs to understand that work without having it disappear into one
opaque transcript.

**AC-15:** The work surface can show delegated or isolated process work without
collapsing all of that work into one opaque thread.

**AC-16:** The user can tell which delegated work is still active, which results
were returned to the main process, and what that changed.

---

## Feature 3: Process Environment and Controlled Execution

### Feature Overview

This feature gives a process a controlled working environment. After it ships, a
process can use a sandboxed filesystem, a TypeScript scripted runtime, and a
tool harness that operates inside that environment against hydrated project
materials. This feature establishes the common execution substrate that later
process-specific products inherit. The first environment slice also includes the
minimal canonical checkpoint loop needed to make that environment useful for
real work: durable artifact outputs persist back into project-scoped canonical
artifact state as new versions with process provenance, and code work against
already-attached writable repositories persists back to canonical code truth for
those repositories. Full source-attachment management, provenance workflows,
and broader GitHub review or publishing workflows remain in Feature 5.

### Scope

#### In Scope

- Process-scoped environments
- Filesystem working space inside the sandbox
- Outer process controller that can start, resume, or rebuild environments
- TypeScript scripted executor inside the sandbox
- Tool harness wired into the sandbox executor
- Hydration of artifacts and already-attached repositories into the environment
- Checkpointing back to canonical stores, including durable code persistence for
  already-attached writable repositories
- Typed live process updates for browser rendering

#### Out of Scope

- Broad unrestricted execution surfaces (not planned for the core platform)
- Attaching or detaching repositories or other external sources from a process
- Editing repository purpose, access mode, target ref, or ownership from the
  process work surface
- Broader GitHub review, branch-management, or pull-request-management
  workflows

### Scenarios

#### Scenario 1: Starting Work with a Hydrated Working Copy

The process begins work and needs the right materials available in a normal
working filesystem without treating that filesystem as source of truth.

**AC-17:** A process can be assigned an environment that materializes a working
filesystem containing the artifacts and repositories that the process needs.

**AC-18:** The environment is treated as disposable working state. The platform
can discard and recreate it from canonical sources without losing published
process truth.

#### Scenario 2: Executing Through a Controlled Scripted Surface

The process needs usable capabilities inside the environment without being given
raw unrestricted access.

**AC-19:** The process can execute scripted actions through a TypeScript runtime
and receive results back through the tool harness without depending on raw
unrestricted execution.

**AC-20:** The process only sees and calls the TypeScript methods exposed by the
tool harness for that process. Disallowed capabilities are not silently
available through the environment.

**AC-21:** When the platform receives scripted process code, it can ensure the
correct environment is available, send the code into the in-sandbox executor,
and return the execution result to the process without exposing the model
directly to raw provider APIs.

**AC-22:** Live process updates are delivered to the browser as typed current
objects that can be rendered directly without reconstructing raw provider
stream fragments in the UI.

#### Scenario 3: Recovering After Environment Loss or Pause

The process may pause, fail, or lose its active environment. The user still
needs to continue work without losing durable progress.

**AC-23:** Assigned artifacts and repositories can be rehydrated into a newly
created environment filesystem for continued work.

**AC-24:** The platform can checkpoint durable outputs back to canonical stores,
including Convex-backed project artifacts and GitHub-backed code for
already-attached writable repositories, so that the process can continue after
environment loss.

---

## Feature 4: Artifact Review and Package Surface

### Feature Overview

This feature makes project-scoped artifacts durable and reviewable inside active
process work. After it ships, a process can create or reference project-level
artifact records, produce new artifact versions with process provenance, and
the user can inspect markdown artifacts, Mermaid diagrams, and packaged outputs
inside the platform without leaving the working surface.

### Scope

#### In Scope

- Generic project-scoped artifact records
- Artifact versions with producing-process provenance
- Process reference to current artifacts and pinned review/package context
- Markdown review
- Mermaid rendering
- Artifact package/export support for spec-oriented outputs, including pinned
  version sets

#### Out of Scope

- Hard-coded artifact ontology for every document type (not planned)
- Process-independent review framework (not planned)

### Scenarios

#### Scenario 1: Reviewing a Draft Artifact While Work Is Active

The user needs to inspect a project artifact that is in scope for active
process work and understand which version and provenance they are looking at.

**AC-25:** When a process revises an existing project artifact, the new
revision appears as a new artifact version of that project asset, carries
producing-process provenance, and the earlier version remains available for
review.

**AC-26:** The review surface makes the current artifact identity, selected
version, and current review context clear enough that the user can review the
right draft at the right process phase.

#### Scenario 2: Reading Markdown-Centric Outputs in Place

The user needs to inspect markdown-centric outputs directly inside the platform
without exporting them first.

**AC-27:** Markdown artifacts render in a review surface that preserves the
structure needed for serious reading, including headings, tables, code blocks,
and Mermaid diagrams.

**AC-28:** The review surface keeps the artifact connected to the active
process or pinned package context so the user can move between work and review
without losing orientation.

#### Scenario 3: Working With Multi-Artifact Output Sets

Some reviewable output sets are meaningful as a collection rather than as one
document. The user needs to inspect and package those sets cleanly, including
cases where the package combines pinned artifact versions produced or revised by
different processes in the same project.

**AC-29:** The user can open a process or package review set and see which
pinned artifact versions belong together as one reviewable package.

**AC-30:** The platform can package and export that pinned output set when a
process requires a bundled artifact package such as a spec-oriented pack, even
when the package members come from more than one process in the same project.

---

## Feature 5: Source Attachments and Canonical Persistence

### Feature Overview

This feature establishes the canonical-source model and the broader
source-attachment behaviors that processes rely on after artifact-model and
review-provenance alignment are in place. In the current implementation
sequence, that scope is repository-first: projects and processes can attach
GitHub-backed repositories with explicit purpose and access mode, rehydrate
working state from those canonical sources, and preserve the source provenance
and archive-facing records those flows depend on. Feature 3 already covers the
minimal hydrate-and-checkpoint loop needed for a usable environment when the
required sources are already attached. Feature 5 covers how repository sources
are attached, classified, refreshed, explained, and managed across the broader
process lifecycle, along with the archive-facing canonical-source model that
depends on those durable records.

Feature 5 is broad enough to land as more than one implementation epic. In the
current plan, an interstitial epic first aligns artifact model and
review/package provenance between Feature 4 and Feature 5 so later
source-management work inherits project-scoped artifact semantics. After that
alignment, the first Feature 5 implementation epic focuses on repository
attachment lifecycle, freshness, provenance, and canonical-source management,
and a later Feature 5 epic focuses on the full-fidelity canonical archive and
later derived turn/chunk views. In downstream numbering, that means the
artifact-model alignment work lands as Epic 5, source-management lands as
Epic 6, and later archive/derived-view work follows within Feature 5.
MCP-backed and other non-repository external-source attachment flows are
explicitly deferred beyond the current Epic 5, Epic 6, and Epic 7 sequence as
later source-integration work.

### Scope

#### In Scope

- Broader GitHub-backed code source integration
- Project- and process-scoped repository attachment
- Repository purpose/access classification
- Hydration and freshness tracking beyond the minimal environment loop in
  Feature 3
- Source provenance and canonical-source management above the aligned artifact
  model
- Full-fidelity process archive and derived turn/chunk views

#### Out of Scope

- Attachment of MCP-backed or other non-repository external sources in the
  current Epic 5, Epic 6, and Epic 7 sequence
- Full external integration catalog (future direction)

### Scenarios

#### Scenario 1: Trusting Where Artifact and Process Truth Lives

The user needs to know that process truth and artifact truth survive beyond the
current environment.

**AC-31:** When the user returns after leaving a project, published process
state and published artifact versions remain available even if no active
environment is currently running.

**AC-32:** The platform treats sandbox files for artifact work as working copies
only. Canonical artifact truth remains outside the sandbox.

#### Scenario 2: Bringing Existing Repositories into Project or Process Work

The user starts a process that needs to inspect, review, or update one or more
repositories as part of the work.

**AC-33:** A project or process can attach zero or more repositories. Each
attachment can record its purpose, access mode, target ref, and hydration
state.

**AC-34:** The platform can determine whether an attached repository is
currently hydrated and whether it requires rehydration before project or
process work relies on it.

#### Scenario 3: Understanding Code Provenance and Durable Code Updates

The user needs to know which repositories informed the work and where durable
code updates are expected to land.

**AC-35:** When a process works against code, GitHub remains the canonical
source of truth for that code. The sandbox filesystem is a working copy only.

**AC-36:** The platform records source provenance clearly enough that a user can
tell which repositories and refs informed or received a process's code work.

#### Deferred Follow-On: Attaching External Sources Through a Controlled Boundary

This scenario is explicitly deferred beyond the current Epic 5, Epic 6, and
Epic 7 sequence. It describes later source-integration work rather than the
repository-focused source-management slice assigned to Epic 6 or the
archive/derived-view slice assigned to Epic 7.

The user starts or resumes a process that needs external context beyond project
artifacts and repositories, including MCP-backed sources. The platform needs a
controlled integration boundary for those sources rather than one-off hidden
connections.

**AC-37:** A project or process can attach external sources, including
MCP-backed sources, through an explicit platform integration boundary rather
than relying on ad hoc out-of-band access.

**AC-38:** The user can tell which external sources were attached to the
relevant project or process and whether they were available during the work
that followed.

#### Scenario 5: Preserving Full-Fidelity History for Later Derived Views

The user expects the platform to support later long-horizon context management
without losing what actually happened during a process.

**AC-39:** The platform preserves a full-fidelity canonical archive of process
history at low-level entry grain rather than only storing already-summarized
history.

**AC-40:** The canonical archive stores the following finalized low-level entry
types: `user_message`, `model_message`, `reasoning`, `script_emission`,
`tool_call`, `tool_result`, and `process_event`.

**AC-41:** The platform does not persist raw streaming deltas or interrupted
partial objects as canonical archive entries.

**AC-42:** The platform can derive turns from archived entries and later produce
chunks, summaries, and other managed views from those turns without mutating
the full-fidelity archive.

---

## Cross-Cutting Decisions

- `Project` is the top-level durable container above one or more processes.
- `ProcessType` is the core platform abstraction. The first platform process
  types are `ProductDefinition`, `FeatureSpecification`, and
  `FeatureImplementation`.
- Platform capabilities are shared substrate. Detailed process behavior remains
  downstream in process-specific epics.
- Process types are implemented in code and schema, not dynamically defined.
- Artifact records are project-scoped durable assets. Generic artifact storage
  stays lightweight while process-specific meaning, current references, and
  review/package context stay in process state and process phases.
- Each process may reference zero or more project artifacts and attach zero or
  more repositories.
- Artifact versions carry producing-process provenance, and review/package
  surfaces pin explicit versions rather than floating to later revisions.
- Sandbox filesystems are always working copies, never canonical truth.
- Canonical artifact truth is persisted in Convex. Canonical code truth is
  persisted in GitHub.
- Every process can use the same sandbox/tool-harness model even if its outputs
  are mostly artifacts rather than code.
- Verification, review, and approval remain process-specific until strong
  repetition proves a shared abstraction.
- The platform preserves a full-fidelity canonical archive of process history.
  Turns are derived from archived entries. Chunks and summaries are later
  derived views over turns.

---

## Future Directions

These are future directions, not current scope:

- Managed environment providers beyond the initial set of local, Daytona, and
  Cloudflare Sandbox
- Shared meta-process abstractions for repeated review or approval patterns
- Wider bespoke process catalog beyond the initial three process types
- Fine-tuned small models specialized to specific process/tool shapes
- Full billing, metering, and package monetization
- Deeper MCP integration and custom MCP servers

---

## Recommended Epic Sequencing

```text
Feature 1: Project and Process Shell
    |
    └──→ Feature 2: Process Work Surface
              |
              ├──→ Feature 3: Process Environment and Controlled Execution
              |
              └──→ Feature 4: Artifact Review and Package Surface
                        |
                        └──→ Epic 5: Artifact Model and Review Provenance Alignment
                                  |
                                  └──→ Epic 6: Source Attachments and Canonical Source Management
                                            |
                                            └──→ Epic 7: Archive and Derived Views
                                                      |
                                                      └──→ Later follow-on: External and MCP Source Integration
```

**Sequencing rationale:**

- The platform needs a project/process shell before any process-specific work can
  be run coherently.
- The process control surface needs to exist before environment execution or
  artifact review can be integrated into one working experience.
- The artifact review surface can proceed alongside the environment layer once
  the project and process shell are in place.
- The review/package surface now needs an interstitial alignment step so
  artifacts behave as project-scoped durable assets before later source work
  depends on them.
- The environment and tool harness must exist before broader repository
  lifecycle and canonical-source handling become meaningful. The first
  environment epic includes the minimal hydrate-and-checkpoint loop needed to
  make that slice real.
- Source-management work follows once both the environment model and the
  artifact-model alignment are in place.
- Archive and derived-view work follow the source-management slice because they
  depend on the durable canonical-source records established there.
- External and MCP-backed source attachment is intentionally not assigned to
  Epic 6 or Epic 7. It follows later as a separate source-integration slice
  after the repository-focused source-management and archive work are in place.

---

## Relationship to Downstream Specs

This PRD is the upstream input for the core platform technical architecture and
for downstream process-specific epic specifications.

Each feature section in this PRD maps to one or more downstream enablement
epics, with interstitial alignment epics added when the platform model needs to
be clarified before the next feature slice expands. Those epics should expand
the user situations and rolled-up ACs here into line-level ACs, TCs, boundary
contracts, and story breakdowns without inventing the platform's core intent or
boundaries.

Downstream process-specific epics will define the exact behavior of:

- `ProductDefinition`
- `FeatureSpecification`
- `FeatureImplementation`

Those process-specific epics inherit this platform world rather than redefining
it.

---

## Reference Inputs

See Appendix A of the Core Platform Technical Architecture for the shareable
reference index of reference systems, official docs, and repo-relative paths
that are useful during tech design and implementation. That appendix should be
treated as the implementation reference surface rather than embedding a longer
bibliography in this PRD.

---

## Validation Checklist

- [ ] `Project` is clearly the top-level container
- [ ] `ProcessType` is clearly the core platform abstraction
- [ ] Process types are treated as code-defined, not dynamic
- [ ] The sandbox filesystem is described as working state only
- [ ] Canonical artifact truth and canonical code truth are kept distinct
- [ ] Artifacts are project-scoped durable assets while meaning remains
      process-owned rather than globally hard-coded
- [ ] Repository assignment, purpose, access mode, and hydration state are
      visible requirements
- [ ] Environment/tool harness capabilities are treated as core enablement
- [ ] Full-fidelity archive requirements, finalized-entry rules, and
      derived turn/chunk behavior are explicit
- [ ] Existing shell/harness/review concerns from the prior Spec Steward PRD
      have been absorbed into this platform PRD
- [ ] The doc can feed a companion architecture without embedding low-level
      implementation detail
