---
name: ls-prd
description: Produce compressed proto-epics across 3-8 features with scenario-driven acceptance criteria. Each feature section seeds automated epic expansion through the full Liminal Spec pipeline.
---

# Product Requirements Document

**Purpose:** Produce compressed proto-epics across 3-8 features — the upstream product artifact that seeds automated epic expansion through the full Liminal Spec pipeline. The companion technical architecture document is produced separately by `ls-arch`.

Each feature section is a higher-altitude echo of an epic: user scenarios, numbered acceptance criteria ranges, and scope boundaries — structured so that an epic-writing agent can expand each one into a full epic (line-level ACs, TCs, data contracts, story breakdown) without the human needing to re-engage at the same depth. The human's intensive involvement is front-loaded here. Everything downstream builds from what this document settles.

---

## On Load

This skill produces a **PRD** — product context, features as scenario-driven proto-epics, sequencing, and milestones. Each feature section must be rich enough that downstream agents can produce full epic specs from it with minimal human re-engagement.

The companion **Technical Architecture document** is produced separately by `ls-arch`. For new products, run both — the PRD establishes what to build and why, the tech arch establishes what technical world it gets built in. Epic boundaries depend on technical seams, and architecture choices depend on product scope, so these two documents inform each other.

If the user provides requirements, a brief, prior research, or context about what they want to build — use that as the starting input. If they don't have that, interview them to establish clarity before drafting. See the Requirements Intake reference for the questioning stance and readiness criteria — the short version: clarify intent and boundaries first, treat every answer as a claim to pressure-test, and don't start drafting while any key dimension is thin enough that you'd be inventing rather than specifying. The intake bar is about when to begin shaping, not when the output is ready. The output bar is the consumer test: each feature section must survive downstream epic expansion without foundational questions.

---

## Altitude

The PRD operates at a specific altitude. Understanding where it sits prevents both over-specifying (doing ls-epic's job) and under-specifying (producing a vague wishlist).

**PRD altitude (50,000 ft → 30,000 ft):**
- Product vision and problem grounding
- User profiles with mental models
- Feature scope boundaries (in/out)
- User scenarios per feature (the user situations and workflows, not step-level flows)
- Numbered rolled-up acceptance criteria ranges organized under scenarios
- Architecture summary (system shape, stack, boundaries — not implementation)
- Epic sequencing with milestones
- Cross-cutting decisions that constrain downstream work

**What the PRD does NOT contain** (these belong downstream):
- Line-level acceptance criteria with individual TC coverage (ls-epic)
- Test conditions (ls-epic)
- Data contracts / API shapes (ls-epic)
- Story breakdowns with AC mapping (ls-epic)
- Implementation architecture, module design, interfaces (ls-tech-design)
- Feature-specific library choices, directory structures, database schemas (ls-tech-design)
  (Core stack choices — frameworks, runtimes, data layers — belong in the architecture summary or the tech arch document produced by ls-arch)

### The Rolled-Up AC Boundary

The hardest boundary to hold is between rolled-up ACs and line-level ACs. A three-way contrast:

**Too vague** (not decomposable — the epic writer has to invent the behavior):
> "The user can manage workspaces."

**Just right** (rolled-up — specific enough to decompose, general enough to leave room):
> "AC-1: The user can save the current root as a workspace. Saved workspaces persist across sessions, show the full path on hover, and can be removed. The workspace list updates immediately on add or remove."

**Too detailed** (line-level — this belongs in ls-epic):
> "AC-1.3: Workspace entries display the full filesystem path as a tooltip on mouse hover with a 200ms delay. AC-1.4: Removing a workspace triggers a confirmation dialog before deletion."

The PRD uses the middle form. Each rolled-up AC is numbered and anchored to a scenario, covering a coherent cluster of behavior that ls-epic will later decompose into individual line-level ACs with test conditions.

---

## Product Context

The product context is the framing that every downstream epic inherits. Write it once here; don't repeat it in each feature section.

### Product Vision

What this product is, what it does, and why it exists. Not a mission statement — a concrete description of the product and its place in the world. If it connects to other tools or a broader ecosystem, describe the relationships and clarify what's v1 scope vs future direction.

### User Profile

Same structure as the epic-level user profile, but scoped to the whole product:

- **Primary User:** Role and defining characteristic
- **Context:** When and why they reach for this product
- **Mental Model:** How they think about the task (in their words, not yours)
- **Key Constraint:** The environmental or technical reality that shapes the product
- **Secondary User** (if applicable): Other users who benefit but aren't the primary design target

The user profile grounds every feature section. If a feature doesn't trace back to something the primary user needs, question whether it belongs.

### Problem Statement

What's wrong today. What the user can't do, or can only do badly. Concrete, specific, not abstract. This is the "why" that justifies the product's existence.

### Product Principles

Design values that guide decisions throughout the product. Not generic ("user-friendly") — specific to this product's tradeoffs ("good defaults over configuration," "local-first," "keyboard-native"). These become the tiebreaker when feature decisions are ambiguous.

### Scope Boundary

Product-level in/out scope. What this release delivers and what it explicitly does not. This is different from per-feature scope — it's the product-wide boundary.

Include an **Assumptions** table for unvalidated beliefs the PRD depends on.

### Non-Functional Requirements

Cross-cutting constraints that apply across all features: responsiveness, startup time, memory behavior, reliability, security posture. These are product-level — individual features may override or refine them.

NFRs are easy to defer and expensive to discover late. Surface them here so architecture decisions account for them and epic writers know the constraints.

---

## Architecture Summary

A brief section in the PRD covering the system shape, stack, and deployment model. Enough to understand the technical context for scoping epics — not a full architecture document.

If a Tech Architecture document exists or will be produced by `ls-arch`, this section is a concise summary with a pointer to the full document.

Content:
- System shape (monolith, client-server, services, etc.)
- Who owns what (server owns filesystem, client owns rendering, etc.)
- Core stack choices
- Deployment model
- Key constraints that affect feature scoping

This section answers: "What technical world are we building in?" It does not answer: "How do we build each part?" — that's tech design.

---

## Feature Sections (The Body)

Each feature maps to one downstream epic. A PRD typically contains 3-8 features/epics. If you're above 8, consider whether some features should be grouped or deferred.

Feature sections are higher-altitude epics — same structural DNA, different altitude. Where an epic organizes around detailed flows with line-level ACs and TCs, a feature section organizes around user scenarios with numbered rolled-up AC ranges. The structure mirrors the epic so that downstream expansion is decomposition, not invention.

### Choosing Feature Boundaries

Each feature maps to one downstream epic. The boundary between features is one of the highest-leverage decisions in the PRD — bad boundaries produce awkward epics that are either too broad to manage or too tangled to implement independently.

**Good feature boundaries share these traits:**
- **User workflow boundary** — different user situation, different context, or a natural pause point in the user's work
- **System capability boundary** — one coherent domain (read vs write, one data surface, one integration)
- **Delivery boundary** — can ship independently and reach a feedback point without other features completing first
- **Manageable epic scope** — 2-4 scenarios, roughly 5-15 rolled-up ACs. If a feature has 5+ scenarios or would need 20+ ACs, it's probably two features

**Signs a feature should be split:**
- Multiple distinct user profiles or contexts within one feature
- Scenarios that don't share data, state, or user context with each other
- The feature can't ship without another feature also shipping (entanglement, not dependency)

**Signs features should be merged:**
- Two features that share all scenarios and differ only in scope depth
- A feature so small it would produce a 1-2 story epic with minimal ACs

These criteria do not always agree. When user workflow, system capability, delivery independence, and manageable scope point toward different feature maps, run a dimensional reasoning check before committing. Identify the tensions for this product, weigh which should win here, and let that resolution drive the boundary choice. See the Dimensional Reasoning Check reference.

Don't over-optimize boundaries upfront. Get them roughly right, then refine as scenarios and ACs surface natural seams during drafting.

### Feature Section Structure

```
## Feature N: [Name]

### Feature Overview
What the user can do after this feature ships. Why it matters in the sequence —
what it builds on, what it enables. 1-3 sentences of positioning, then the
capability description.

### Scope

#### In Scope
- Concrete capability
- Concrete capability

#### Out of Scope
- Excluded capability (which feature handles it, or "not planned")

### Scenarios

#### Scenario 1: [Name — the user situation]
Prose description of this user scenario — when it applies, what the user is
trying to accomplish, what the system does in response. High-level steps if
the scenario is sequential, but broader than epic-level flow steps.

**AC-1:** [Rolled-up criterion covering a coherent cluster of behavior]
**AC-2:** [Another rolled-up criterion under this scenario]

#### Scenario 2: [Name]
[Same pattern]

**AC-3:** [Criterion]
**AC-4:** [Criterion]

### Reference Pointers (optional)
Pointers to mockups, wireframes, or reference material if available.
```

### The Confidence Chain Starts Here

Rolled-up ACs in the PRD are the seed material for the full confidence chain: AC → TC → Test → Implementation. Each rolled-up AC will be decomposed by the epic writer into line-level ACs, each with test conditions, each mapping to tests, each driving implementation.

This means the quality of the rolled-up ACs directly determines the quality of everything downstream. Thin, vague criteria force the epic writer to invent behavior the PRD should have established. Strong criteria give the epic writer material to decompose rather than create.

**The drafting discipline:** Think one layer down. For each rolled-up AC, consider what the line-level ACs would be. Then compress back up into the rolled-up form. This produces criteria that are specific enough to decompose but general enough to leave room for the epic phase. Writing directly at the rolled-up level without thinking through the decomposition tends to produce vague, untestable criteria.

### Writing Good Feature Sections

**Feature Overview** opens with why this feature exists at this point in the sequence — positioning, not description. Then describes what the user can do. "This feature is the foundation — after it ships, the app is usable for daily reading. The user opens any markdown file and sees clean rendered content with working links, code highlighting, and basic navigation."

**Scope** prevents scope creep. In-scope items should be specific enough to argue about. "Mermaid diagram rendering (local, no remote services)" is good. "Rich content support" is too vague. Every out-of-scope item should say where it's handled if planned elsewhere. "Mermaid editing (not planned)" vs "Code syntax highlighting (Feature 3)."

**Scenarios** are the core of the feature section. Each scenario describes a user situation — when the user encounters it, what they're trying to accomplish, and what happens. Scenarios are broader than epic-level flows: a single scenario here might expand into 2-3 flows in the epic. Name scenarios after the user situation ("First-time file browsing," "Returning to a saved workspace") not after system operations ("File rendering pipeline," "Workspace persistence layer").

**Rolled-up ACs** are numbered and anchored under their scenarios. Each AC covers a coherent cluster of related behavior. They should be:
- Specific enough that the epic writer can decompose into line-level ACs without inventing behavior
- General enough that the epic writer has room to define precise TCs
- Written as user-observable behavior, not implementation statements
- Comprehensive enough that the feature's scope is clear from reading the AC ranges alone

### Example: A Good Feature Section

```markdown
## Feature 2: Workspace Management

### Feature Overview

After the foundation is usable for individual file reading, users need a way
to organize their work across multiple projects. This feature lets users save
filesystem roots as named workspaces and switch between them. It is the
transition from "file viewer" to "daily-use tool."

### Scope

#### In Scope
- Save the current root directory as a named workspace
- List, switch between, and remove saved workspaces
- Workspace state persists across application restarts
- Show full filesystem path for each workspace on hover

#### Out of Scope
- Workspace sharing or export (not planned)
- Per-workspace settings or configuration (Feature 5)
- Workspace search or filtering (Feature 4, if workspace count warrants it)

### Scenarios

#### Scenario 1: Saving and Switching Workspaces

The user has been browsing files in a project directory and wants to bookmark
it for quick return. They save the current root as a workspace, then later
switch to a different saved workspace and back.

**AC-1:** The user can save the current root as a named workspace. The
workspace list updates immediately. Duplicate names for different paths are
prevented. The workspace entry shows the short name and displays the full
filesystem path on hover.

**AC-2:** The user can switch between saved workspaces. Switching loads the
selected workspace's root directory and restores the file tree to that root.
The previously active workspace remains in the list.

#### Scenario 2: Managing the Workspace List

The user has accumulated several workspaces and needs to clean up. They
remove workspaces they no longer use and verify the list reflects the changes.

**AC-3:** The user can remove a saved workspace. Removal is immediate and
the list updates without requiring a refresh. Removing the currently active
workspace returns to the default root or prompts for a new selection.

#### Scenario 3: Persistence Across Sessions

The user closes the application and reopens it. Their saved workspaces are
still available, and the last active workspace is restored.

**AC-4:** Saved workspaces persist across application restarts. On launch,
the application restores the workspace list and re-opens the last active
workspace. If the last active workspace's path no longer exists, the
application shows the workspace list with an indicator that the path is
unavailable.
```

This example shows the target altitude. Each scenario describes a user situation. Each AC covers a cluster of behavior that the epic writer will decompose — AC-1 alone might expand into 3-4 line-level ACs with TCs for naming validation, duplicate prevention, hover display, and list update behavior. But the PRD doesn't go there. It establishes what happens; the epic establishes exactly how to verify it.

### Common Feature Section Failures

**Feature wishlist:** A list of capabilities with no user grounding, no scenarios, and no sequencing rationale. Every feature should trace to the user profile and problem statement. If you can't describe who does what and when, the feature isn't ready to write.

**Thin scenarios that force invention:** Scenarios that name the situation but don't describe what happens. "The user manages workspaces" is a label, not a scenario. The epic writer needs enough behavioral detail to decompose — not invent — the flows and ACs.

**Vague ACs:** "Handles errors appropriately" or "Supports common formats." These aren't decomposable. Be specific about which errors, which formats, what the user sees.

**Premature precision:** Individual line-level ACs with TC-like specificity. If you're writing "AC-1.3: Workspace entries display the full filesystem path as a tooltip on mouse hover with a 200ms delay," you've crossed into ls-epic territory. Pull back to the rolled-up form: a cluster of related behavior under one numbered AC.

**Missing out-of-scope:** If the in-scope list is clear but out-of-scope is empty, either the feature has no boundaries or you haven't thought about them. Both are problems.

**Implementation leaking in:** "Uses React Query for caching" or "Stores state in SQLite." These are tech design decisions. The PRD says "Data is cached" and "State persists across sessions."

---

## Sequencing and Milestones

### Epic Sequencing

Show the dependency structure between features/epics. A simple text diagram works:

```
Epic 1: Foundation
    │
    ├──→ Epic 2: Core Capability
    │        │
    │        └──→ Epic 3: Enhanced Capability
    │
    └──→ Epic 4: Secondary Capability (can parallel Epic 2-3)
```

Include a brief rationale for the sequencing — why this order, where the parallelism opportunities are, and where the hard dependencies sit.

### Milestones

Map epics to milestones that represent feedback-gated phases. A milestone is a point where the product is usable enough to get real feedback.

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Epics 1+2 | [First usable state] | Yes — [what can be tested] |
| M2 | Epic 3 | [Enhanced state] | Yes — [what's new to test] |

Milestones matter because they define where to pause and validate assumptions before continuing. A PRD without milestones is a feature list — it has no delivery rhythm.

---

## Supporting Sections

### Cross-Cutting Decisions (if applicable)

Product-level decisions that affect multiple features. Content format conventions, UX design constraints, interaction patterns, naming conventions. These are product decisions that would otherwise get re-litigated in every epic. UX constraints are especially valuable here — toolbar layout, modal patterns, navigation conventions, and interaction standards that apply across the entire product.

If a tech architecture document exists or will be produced by `ls-arch`, technical cross-cutting decisions (auth model, error handling, testing philosophy) go there instead. The PRD's cross-cutting section covers product and design decisions; the tech arch's covers technical ones.

Each decision should have enough rationale that a downstream epic writer understands not just what was decided, but why — so they don't accidentally undermine it.

### Future Directions (if applicable)

Things that aren't v1 scope but inform architecture and design decisions. Include them so downstream architects can leave room without building for them.

Be explicit: "These are future directions, not v1 scope. They inform architectural decisions but do not gate the initial feature set."

### Relationship to Downstream Specs

A brief note explaining how this PRD feeds into the spec pipeline. Each feature section maps to one epic. The PRD defines *what* and *why*. The epics define *exactly what* with traceability. The tech designs define *how*.

---

## Validation Before Handoff

### Consumer Test (Critical)

Read each feature section as an epic-writing agent would. For each feature, ask: could I expand this into a full epic — flows, line-level ACs, TCs, scope boundaries — without needing to ask the human foundational questions?

**Foundational questions** mean the PRD failed: "What does the user actually do here?", "What's this feature supposed to accomplish?", "What scenarios does this cover?"

**Refinement questions** are healthy and expected: "Should this edge case be in scope?", "How should these two scenarios interact?", "What's the right error behavior when X happens?"

If a feature section would force foundational questions during epic expansion, it isn't ready.

### Structural Checklist

Before handing to the epic pipeline:

- [ ] User Profile grounds every feature (trace the connection)
- [ ] Problem Statement justifies the product (not just the features)
- [ ] Each feature has Feature Overview, Scope, and Scenarios with numbered ACs
- [ ] Scenarios describe user situations with enough behavioral detail to decompose into epic flows
- [ ] Rolled-up ACs are numbered, anchored under scenarios, and specific enough to decompose without invention
- [ ] No line-level ACs, TCs, or data contracts (those belong in ls-epic)
- [ ] Epic sequencing has rationale, not just an ordered list
- [ ] Milestones define feedback-gated delivery phases
- [ ] NFRs are surfaced (not deferred to "later")
- [ ] Architecture summary establishes the technical world without crossing into tech design
- [ ] Cross-cutting decisions are documented so epics don't re-litigate them
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Future directions are clearly marked as non-v1

**Self-review:**
- Read the feature sections as an epic writer would. Can you expand each feature into a full epic from the scenarios and ACs? If you'd need to ask foundational questions, the feature section isn't ready. If you'd only need refinement questions, it's doing its job.

---

## PRD Template

Use the following template when producing a PRD.

---

### Template Start

```markdown
# [Product Name] — Product Requirements Document

## Status

This PRD defines the product direction, feature scope, and epic sequencing for
[product name]. Each feature section is a compressed proto-epic: user scenarios,
numbered rolled-up acceptance criteria, and scope boundaries — structured for
downstream expansion into full epics with line-level ACs, TCs, and story
breakdowns.

---

## Product Vision

[What this product is, what it does, why it exists. Concrete, not aspirational.
Include ecosystem context if applicable.]

---

## User Profile

**Primary User:** [Role and defining characteristic]
**Context:** [When and why they reach for this product]
**Mental Model:** "[How they think about the task — in their words]"
**Key Constraint:** [Environmental or technical reality]

---

## Problem Statement

[What's wrong today. Concrete, specific.]

---

## Product Principles

- **[Principle]**: [What it means for this product specifically]
- **[Principle]**: [What it means]

---

## Scope

### In Scope

[What this release delivers. Brief prose + bullet list of major capabilities.]

### Out of Scope

- [Product-level exclusion] ([reason or future reference])

### Assumptions

| ID | Assumption | Status | Notes |
|----|------------|--------|-------|
| A1 | [Assumption] | [Unvalidated/Validated] | [Notes] |

---

## Non-Functional Requirements

[Cross-cutting constraints: responsiveness, startup, memory, reliability, security.
These apply across all features unless overridden.]

---

## Architecture Summary

[System shape, stack, deployment model, key boundaries.
Pointer to full tech architecture doc if applicable.]

---

## Milestones

| Milestone | After | What Exists | Feedback Point |
|-----------|-------|-------------|----------------|
| M1 | Epics N+M | [First usable state] | [What can be tested] |

---

## Feature 1: [Name]

### Feature Overview

[What the user can do after this feature ships. Why it matters in the sequence —
what it builds on, what it enables.]

### Scope

#### In Scope

- [Concrete capability]
- [Concrete capability]

#### Out of Scope

- [Excluded capability] ([which feature handles it, or "not planned"])

### Scenarios

#### Scenario 1: [User situation name]

[Prose description of this user scenario — when it applies, what the user is
trying to accomplish, what the system does. High-level steps if sequential.]

**AC-1:** [Rolled-up criterion covering a coherent cluster of behavior.
Specific enough to decompose into line-level ACs, general enough to leave
room for TCs.]

**AC-2:** [Another rolled-up criterion under this scenario.]

#### Scenario 2: [User situation name]

[Same pattern]

**AC-3:** [Criterion]

---

## Feature 2: [Name]

[Same structure as Feature 1]

---

## Cross-Cutting Decisions (if applicable)

[Product-level decisions affecting multiple features. Decision + rationale.]

---

## Future Directions (if applicable)

[Things that inform architecture but aren't v1 scope.]

---

## Recommended Epic Sequencing

[Dependency diagram + rationale]

---

## Relationship to Downstream Specs

This PRD is the upstream input for detailed epic specs. Each feature section
maps to one epic. The PRD defines *what* and *why*. The epics define *exactly
what* with traceability. The tech designs define *how*.

---

## Validation Checklist

- [ ] User Profile grounds every feature
- [ ] Problem Statement justifies the product
- [ ] Each feature has Feature Overview, Scope, and Scenarios with numbered ACs
- [ ] Scenarios describe user situations with enough detail to decompose into epic flows
- [ ] Rolled-up ACs are decomposable without the epic writer inventing behavior
- [ ] No line-level ACs, TCs, or data contracts
- [ ] Out-of-scope items point to where they're handled if planned
- [ ] Milestones define feedback-gated phases
- [ ] NFRs surfaced
- [ ] Architecture summary establishes technical world
- [ ] Cross-cutting decisions documented
- [ ] Epic sequencing has rationale
- [ ] Consumer test: each feature section can be expanded into a full epic
  without foundational questions about user intent or feature purpose
```

### Template End

---

## Reference: intake-discipline

## Requirements Intake

Execution quality is usually bottlenecked by intent clarity, not implementation detail. When requirements arrive as a brief, idea, or conversation rather than a structured artifact, apply structured clarification before drafting. The failure mode is premature drafting from thin input — the agent fills gaps with plausible invention rather than surfacing the question that would have produced the real answer. A draft built on assumed intent is harder to fix than one built on clarified intent.

### Questioning Stance

Treat every answer as a claim to pressure-test, not as settled truth. Ask about intent and boundaries before implementation detail — the order matters, because implementation answers anchor to the wrong problem when intent is still unclear.

When the user answers, don't rotate to the next topic for coverage. Stay on the thread and push one layer deeper:

- Ask for a concrete example or evidence behind the claim
- Surface the hidden assumption that makes it true
- Force a boundary or tradeoff — what would they explicitly not do, defer, or reject?
- If the answer describes symptoms, reframe toward root cause before moving on

Depth on the weakest dimension beats breadth across all dimensions.

Reduce user effort: discover what you can directly before asking. For brownfield work, prefer evidence-backed confirmation questions — "I found X in Y; should this follow that pattern?" is better than "tell me about your codebase."

### Readiness to Draft

Assess clarity across intent, outcome, scope, and non-goals first, then constraints and success criteria. If any dimension is thin, keep clarifying. Intent is the highest-leverage dimension.

Intake is done when:

- You can articulate the user's intent in their words, not yours
- Non-goals are explicit — not just unstated, but actively identified
- Decision boundaries are clear — what downstream agents may decide without human confirmation versus what requires sign-off
- No dimension is thin enough that drafting would require invention rather than specification

These gates hold regardless of how much information has been collected. Volume is not clarity.

---

## Reference: confidence-chain

## The Confidence Chain

Every line of code traces back through a chain:

```
AC (requirement) → TC (test condition) → Test (code) → Implementation
```

**Validation rule:** Can't write a TC? The AC is too vague. Can't write a test? The TC is too vague.

This chain is what makes the methodology traceable. When something breaks, you can trace from the failing test back to the TC, back to the AC, back to the requirement.

---

## Reference: dimensional-reasoning

## Dimensional Reasoning Check

Some decisions in this methodology are compositional: choosing feature boundaries, top-tier surfaces, module boundaries, or story partitions. These decisions have multiple valid organizing axes. Models have the metacognitive capacity to identify and weigh competing considerations but will not do so spontaneously. The failure mode is single-axis reasoning: one compelling consideration absorbs the decision before competing dimensions are surfaced.

Before committing to a structure:

1. **Enumerate** the competing considerations for this specific system or feature.
2. **Identify opposition** — where do those considerations pull toward different structures or partitions?
3. **Weight and resolve** — which tensions matter most here, and why? Commit with rationale.

The factors vary by decision point. The process stays the same.

---

## Reference: Writing Principle: Plain Description

# Writing Principle: Plain Description

## What It Is

Every sentence describes what something does, what it is, or where it fits. Nothing else. No framing, no selling, no justifying, no self-describing. Every word has a job. If you remove a word and the meaning doesn't change, the word shouldn't have been there.

The reader is a Tech Lead or Senior Engineer who needs to understand the system and build from the spec. They don't need to be convinced the project is worthwhile. They don't need a tour guide announcing what they're about to read. They need to know what the thing does so they can design it.

## What It Isn't

It isn't terse for the sake of brevity. Longer sentences are fine when every word earns its place — detailed descriptions of behavior, specific examples, enumerated capabilities. The principle isn't "be short." It's "don't waste the reader's time."

It also isn't a ban on context. Saying where something fits ("first of two epics"), what it replaces ("re-uploading replaces existing data"), or what it doesn't do ("stages 3-6 are inactive") is plain description. That's useful information. The line is: does this sentence describe the system, or does it describe how the reader should feel about the system?

## The Failure Modes

### 1. The Prologue

Writing that sets the scene before getting to the point. Background, history, the current pain, the journey to the solution. This is a spec, not a pitch deck.

**Bad:**
> Today, converting business rules from spreadsheets into executable application logic is a manual, team-intensive process — two offshore teams contracted for a year to work through ~1,300 rules across two product lines. There's no tooling to help. A developer reads each row, interprets the English condition, figures out what entity it maps to, and writes the code by hand.

Three sentences of archaeology. The reader doesn't need to understand the history of the problem to design the solution. This is justification — it belongs in a project proposal, not a epic.

**Good:**
> This feature provides the ability to upload a business rules spreadsheet, validate and parse each rule, and diagnose rule loading issues. This is the first half of an ETL process to convert business rules from the source workbook into executable validation rules.

What it does. Where it fits. Done.

### 2. The Brochure

Sentences that describe the value or benefit instead of the behavior. Words like "enables," "empowers," "provides orientation," "designed to be." The reader can figure out why something is useful — they need to know what it does.

**Bad:**
> It provides orientation — the dev always knows where they are in the process.

Selling the benefit of a progress bar. The first sentence already said what it does.

**Good:**
> The pipeline progress bar appears at the top of every page, showing all six stages with the current stage highlighted.

What it is. Where it is. What it shows. Stop.

**Bad:**
> After this epic ships, a dev team that previously needed months and offshore contractors to convert a spreadsheet of rules can do it in days.

This is a pitch. "Previously needed months" vs "can do it in days" is a sales comparison. The reader building the system doesn't need the before/after contrast.

### 3. The Tour Guide

Sentences that announce what comes next or describe the structure of the document itself. "This section covers..." or "This epic gives the dev team two new capabilities and a persistent assistant."

**Bad:**
> This epic gives the dev team two new capabilities and a persistent assistant:

Counting and categorizing before the list. The list does this job. The sentence is a tour guide standing in front of the exhibit saying "you're about to see three paintings."

**Good:**
Just go straight to the bullets. The heading "In Scope" is the only framing needed.

### 4. The Defensive Justification

Sentences that explain why a choice was made, preemptively defending it. "Not just the ones the pipeline uses immediately" or "supporting future reporting and analytics integration."

**Bad:**
> All fields from the workbook are preserved, not just the ones the pipeline uses immediately, supporting future reporting and analytics integration.

"Not just the ones..." is anticipating the question "why store fields you don't use?" and answering it preemptively. "Supporting future reporting" is justifying the decision. Neither describes the system.

**Good:**
> Every column from the workbook is preserved, including fields not used by current pipeline stages.

What it stores. How completely. Done. If someone wants to know why, they can ask.

### 5. The Ceremony

Extra words that add formality but no meaning. "Begins a rule loading session by," "This flow is designed to be re-run," "on demand."

**Bad:**
> The developer begins a rule loading session by selecting a product and version, uploading the business spreadsheet, and reviewing what the system found.

"Begins a rule loading session by" is ceremony. The developer isn't "beginning a session" — they're selecting a product, uploading a file, and reviewing results.

**Good:**
> The dev selects a product and version, uploads the spreadsheet, and reviews what the system found.

Same information. No ceremony.

**Bad:**
> This flow is designed to be re-run — uploading to a version that already has data replaces everything and starts fresh.

"This flow is designed to be re-run" is a meta-statement about the flow's design intent. The dash clause is the actual behavior.

**Good:**
> Re-uploading to a version with existing data replaces everything and starts fresh.

Just the behavior.

### 6. The Vague Benefit

Words that sound descriptive but don't actually specify anything. "Clear summary," "explain what the system found," "ask for help at any point."

**Bad:**
> Ask the AI assistant for help at any point — a chat sidebar available on every page that can answer questions about the data, explain what the system found, and provide quick summaries via one-click Quick Chat Links.

"Ask for help" is vague. "Explain what the system found" is vague — explain what about what it found? The specific parts (answers questions, Quick Chat Links) are buried after the vague parts.

**Good:**
> AI assistant chat sidebar — available on every page, answers questions about the data and provides quick summaries via one-click Quick Chat Links.

Starts with what it is. Says what it does. Specific throughout.

### 7. The Implementation Leak

Naming internal tools, specific function names, or return shapes when the requirement is about behavior the user sees.

**Bad:**
> `inspect_upload` returns summary data (total rows, sheets, valid count, problem count, duplicate count).

The functional requirement is that the AI can answer questions using upload data. The tool name is an implementation choice.

**Good:**
> Response includes relevant summary data (total rows, sheets, valid count, problem count, duplicate count).

Same specificity about what data is available. No opinion about how it's wired.

## The Test

For any sentence, ask: **does this describe the system, or does it describe something about the system?**

- "The progress bar shows six stages" → describes the system. Keep.
- "It provides orientation" → describes a quality of the system. Cut.
- "Upload a spreadsheet and see parsed results" → describes the system. Keep.
- "What used to take months starts taking days" → describes the value of the system. Cut.
- "Re-uploading replaces existing data" → describes the system. Keep.
- "This flow is designed to be re-run" → describes the intent behind the system. Cut.

If the sentence survives the test, check each word: remove it, re-read. Did the meaning change? No? The word goes.
