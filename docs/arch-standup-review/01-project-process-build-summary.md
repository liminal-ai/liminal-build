# Epic 1 Build Summary: Project and Process Shell

## Purpose

This document summarizes what Epic 1, `Project and Process Shell`, was intended
to establish in the Liminal Build platform standup. It is written from the
upstream PRD, core platform technical architecture, and the Epic 1 spec pack:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/core-platform-arch.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/epic.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/tech-design.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/tech-design-server.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/tech-design-client.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/test-plan.md`
- `docs/spec-build/v2/epics/01--project-and-process-shell/decision-memo.md`

It is not an implementation review. It is a spec-intent baseline for later
comparison against the implemented codebase.

## Upstream Intent Relevant to Epic 1

Epic 1 sits at the bottom of the platform stack. The upstream PRD and technical
architecture define Liminal Build as a process-first platform for running
crafted, code-defined processes inside durable projects. The platform is not a
generic chat shell, not a no-code workflow engine, and not an actor-first
system.

The core upstream intentions that matter most to Epic 1 are:

- `Project` is the top-level durable container above processes, artifacts,
  package snapshots, and source attachments.
- `ProcessType` is the main platform abstraction. The first supported types are
  `ProductDefinition`, `FeatureSpecification`, and
  `FeatureImplementation`.
- Fastify owns the application control plane: auth, orchestration, routes,
  shell delivery, and integration boundaries.
- Convex owns durable state for users, projects, processes, artifacts, source
  attachments, and later archive/provenance records.
- Artifact truth is canonical in Convex; code truth is canonical in GitHub;
  the filesystem is only a disposable working copy in later epics.
- Artifacts are project-scoped durable assets, while artifact meaning,
  relevance, and current references stay process-owned.
- Later environment, review, source-management, and archive flows should plug
  into a durable shell without changing the user's mental model.

Epic 1 therefore exists to prove the project's top-level container, access
model, durable process identity, and summary-level visibility before deeper
execution and review behavior begin.

## Epic 1 Goals and Scope

### Primary Goals

Epic 1 was intended to make the following true:

- A user can authenticate into the platform and see only projects they can
  access.
- A user can create a project and reopen it later as a durable working
  container.
- A project shell can summarize current processes, project artifacts, and
  source attachments.
- A user can create new processes from the initial supported `ProcessType` set.
- Multiple processes can coexist in one project without overwriting each other.
- Durable shell state survives reloads, later sessions, and missing
  environments.
- Interrupted, waiting, failed, paused, running, completed, and draft process
  states are visible at summary level.

### Scope Boundaries

Epic 1 intentionally stops at the shell boundary. It does not yet deliver:

- active process chat or control surface
- environment hydration or tool execution
- markdown review, Mermaid rendering, or package/export workflows
- repository hydration/freshness workflows
- full source-management lifecycle
- full archive/turn/chunk behavior
- membership invitation/removal/admin workflows
- manual process naming/renaming
- dynamic workflow authoring

Those omissions are intentional deferrals, not evidence of missing work inside
Epic 1.

## What Epic 1 Was Supposed to Put in Place

At a platform level, Epic 1 was supposed to stand up the first durable shell
that all later platform epics inherit:

- an authenticated entry surface for project work
- server-enforced authorization over project ownership and membership
- a project index route and project shell route model
- a single aggregated project-shell bootstrap response
- independent project-shell sections for processes, artifacts, and source
  attachments
- a route-derived selected-process concept using `?processId=`
- durable process registration and initial per-process-type state rows
- durable project/process/artifact/source summary restoration without requiring
  an environment
- sign-out as part of the shell chrome, not a later polish item

This is the epic that establishes "where work lives" and "how the platform is
entered" before the process work surface and execution model appear.

## Key Server Designs

### Control Plane Shape

The server design assumes one Fastify 5 application, not a split frontend and
backend deployment. Fastify serves:

- authenticated shell HTML
- auth routes
- project and process APIs
- Vite-integrated client delivery
- request logging and shared error handling

The browser does not talk directly to Convex or WorkOS.

### Auth Boundary

Auth is server-owned through WorkOS AuthKit and WorkOS server APIs. The intended
pattern is:

- Fastify validates the session cookie
- Fastify resolves the current actor
- Fastify upserts the actor projection into Convex
- Fastify gates all project surfaces and APIs
- Fastify owns `/auth/me`, `/auth/logout`, and sign-in/callback behavior

Logout is explicitly in scope for Epic 1 and is protected with Fastify-native
CSRF handling. The client receives a CSRF token in the shell bootstrap and
returns it on logout.

### Aggregated Project Shell Bootstrap

Epic 1's central server read path is:

- `GET /api/projects/:projectId`

This endpoint returns:

- project identity and user role
- `processes` section envelope
- `artifacts` section envelope
- `sourceAttachments` section envelope

Each section envelope is intended to carry:

- `status: "ready" | "empty" | "error"`
- `items`
- optional `error`

The design intentionally chose one browser-facing shell bootstrap while keeping
server internals modular through separate section readers:

- `ProcessSectionReader`
- `ArtifactSectionReader`
- `SourceAttachmentSectionReader`

The shell service composes those readers and preserves partial failures per
section.

### Partial Failure Policy

Request-level failures and section-level failures are intentionally different.

Request-level failures:

- `401 UNAUTHENTICATED`
- `403 PROJECT_FORBIDDEN`
- `404 PROJECT_NOT_FOUND`

Section-level failures:

- the project shell still returns `200`
- the failing section returns `status: "error"`
- the other sections remain usable

This distinction is one of the most important Epic 1 architectural decisions.

### Project Creation

`POST /api/projects` is intended to:

- validate a trimmed, non-empty project name
- reject duplicate owned project names for the same owner
- create the project row
- create owner membership atomically
- return a shell bootstrap for the created project

Project names may collide across different owners. The system only enforces
uniqueness within the current owner's owned projects.

### Process Registration

`POST /api/projects/:projectId/processes` is intended to:

- accept only the registered first-wave process types
- create one generic process row
- seed exactly one matching process-type state row
- generate a durable auto label
- return a process summary for immediate shell insertion

Epic 1's intended label format is process-type-local and project-local:

- `Product Definition #<n>`
- `Feature Specification #<n>`
- `Feature Implementation #<n>`

The goal is to avoid manual naming UX while still keeping same-type processes
distinct.

### Summary Projection Ownership

The generic shell should not read process-specific state fields directly.
Instead, each process module is expected to expose a shell summary projection
that derives:

- `phaseLabel`
- `status`
- `nextActionLabel`
- `availableActions`

That preserves process-owned meaning while letting the generic shell stay
actionable.

## Key Client Designs

### Shell Model

The client is a Vite-built vanilla TypeScript app mounted inside the Fastify
boundary. It is intentionally thin:

- one shell HTML document
- one root mount
- minimal server bootstrap payload
- no pre-rendered project or process data baked into the HTML

The bootstrap payload should contain only:

- authenticated user summary
- current path and query state
- CSRF token
- minimal environment-safe config

### Client State and Routing

Epic 1's client state is intentionally small and synchronous. It tracks:

- resolved actor state
- current route
- project index data
- current project shell data
- modal visibility
- an optional banner for invalid selected process state

The routing model is:

- `/projects`
- `/projects/:projectId`
- `/projects/:projectId?processId=:processId`

Selected process state is route-derived only. It is not server-persisted in
Epic 1.

If `processId` is stale or missing from `processes.items`, the router is
supposed to:

- keep the project shell usable
- clear the invalid query value with `history.replaceState()`
- show a process-unavailable banner

### Project Index and Project Shell Pages

The project index page is responsible for:

- listing accessible projects
- showing owner/member role labels
- disambiguating same-name projects with owner context
- opening the create-project flow

The project shell page is responsible for:

- showing active project identity and role
- fetching one aggregated shell bootstrap per route
- rendering section envelopes directly
- showing empty states, error states, and unavailable banners
- allowing process creation
- supporting sign-out through the shell chrome

### Section Rendering Concepts

The shell has three explicit sections:

- processes
- artifacts
- source attachments

Each section renders directly from its envelope contract rather than translating
the server response into a second client-only model.

This preserves a tight contract between:

- server summary projection
- browser rendering
- test fixtures

## Data Model and State Boundaries

### Durable Tables Expected in Epic 1

The design expects Convex to hold these core tables:

- `users`
- `projects`
- `projectMembers`
- `processes`
- `processProductDefinitionStates`
- `processFeatureSpecificationStates`
- `processFeatureImplementationStates`
- `artifacts`
- `sourceAttachments`

### Intended Semantic Split

`projects`
- durable top-level working container

`projectMembers`
- app-owned authorization records with `owner` and `member` roles

`processes`
- generic process identity plus shell fields such as type, label, status,
  phase, `nextActionLabel`, `hasEnvironment`, and timestamps

process-type state tables
- minimal initial rows in Epic 1, but the split exists now so later epics do
  not have to migrate away from generic blobs

`artifacts`
- project-scoped durable assets

`sourceAttachments`
- project- or process-scoped source relationships, including purpose and
  hydration state

### Artifact vs Source Semantics

The spec pack is explicit that artifacts and source attachments should not use
the same summary semantics.

Artifacts:

- remain project-level assets
- may surface `processContext` for explanation only
- may separately expose `currentProcessReference` and `producingProcess`
- must not imply single-process ownership

Source attachments:

- have true attachment scope
- may be `project`-scoped or `process`-scoped
- surface repository/source identity, purpose, target ref, and hydration state

This distinction matters because Epic 1 is trying to teach the correct
long-term model early.

### Durable vs Disposable State

Epic 1 already inherits the platform's durable/disposable split:

- project, process, artifact, and source summaries are durable
- selected-process focus is route state, not durable server state
- environments may be absent and are not required for shell visibility

Epic 1 should therefore restore meaningful shell state even when no environment
exists or an earlier environment was discarded.

## Auth, Ownership, and Membership Expectations

The expected auth and ownership model is:

- WorkOS provides authenticated identity
- the app stores durable user projections in Convex
- the app, not WorkOS, owns project authorization
- project access is governed by owner/member relationships
- project index and project shell should show the current user's role
- direct access to inaccessible projects must be blocked without leaking
  project content

Membership editing workflows are explicitly out of scope. Epic 1 only needs the
role visibility and access enforcement that later collaboration features will
build on.

## Routes, APIs, and Workspace Shell Concepts

### Shell Routes

Fastify-owned shell routes:

- `GET /projects`
- `GET /projects/:projectId`
- `GET /projects/:projectId?processId=:processId`

These routes return authenticated shell HTML, not data APIs.

### APIs

Epic 1's browser-facing API set is intentionally small:

- `GET /auth/me`
- `POST /auth/logout`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/processes`

Epic 1 intentionally does not add:

- a separate single-process read endpoint
- a server-persisted selected-process write path

### Workspace Shell Concept

The shell is intended to be a durable platform container, not a landing page.
It should orient the user to:

- which project is active
- which processes exist and what state they are in
- which artifacts exist and which version/process context is relevant
- which source attachments exist and whether they are project- or process-scoped
- whether a process is draft, running, waiting, paused, completed, failed, or
  interrupted
- what high-level next actions are available at summary level

The intended list-ordering rules are:

- project index: newest `lastUpdatedAt` first
- process list: newest `updatedAt` first
- artifact list: newest `updatedAt` first
- source attachment list: newest `updatedAt` first

## Process Registration and Process Creation Concepts

Epic 1 establishes that process creation is a platform registration workflow,
not an ad hoc thread start.

Key intended rules:

- only registered platform-supported `ProcessType` values appear in the picker
- no placeholder or unsupported process types are shown
- the new process begins in `draft`
- the new process gets an initial phase label immediately
- `hasEnvironment` starts `false`
- process creation requires no manual naming
- two processes of the same type must remain visually and durably distinct
- creating a process in one project must not affect another project
- existing process state, artifact references, and source relationships must
  remain unchanged when a second process is created

This is an important part of the standup because it proves that project-level
multi-process coexistence is a real platform behavior from the start.

## Test Strategy

Epic 1's test plan is heavily service-mock oriented and deliberately close to
the real app boundary:

- server tests enter through Fastify route injection
- client tests enter through page/router/section modules in JSDOM
- external systems are mocked at the boundary: WorkOS, Convex wrapper, `fetch`
- internal orchestration, router behavior, section rendering, and summary
  builders run for real

Planned coverage:

- 86 total tests
- 73 TC-mapped tests
- 13 non-TC decided tests

Verification tiers:

- `red-verify`: format, lint, typecheck, build
- `verify`: red-verify plus service/client tests
- `green-verify`: verify plus guard against unreviewed test churn
- `verify-all`: verify plus integration and e2e hooks

The testing emphasis tells us what the epic considered structurally important:

- auth gating
- role-based project visibility
- project creation semantics
- aggregated shell bootstrap shape
- partial section failure behavior
- process creation and per-type state writes
- route restoration and invalid `processId` healing
- interrupted/waiting/failed return visibility
- stale shell data clearing after logout

Manual verification is also part of the intended quality bar because this epic
is as much about durable shell feel and orientation as contract validity.

## Decisions from the Decision Memo

The decision memo locked a fairly opinionated first-pass platform shape:

- use a four-document tech-design set instead of one overloaded design doc
- use Node 24, TypeScript 6, Fastify 5, Vite 8, and `pnpm`
- use `@fastify/vite` for the integrated monolith boundary
- use Zod-authored shared contracts and `fastify-type-provider-zod`
- keep the client vanilla TypeScript in Epic 1; do not add React yet
- keep auth server-owned through WorkOS; do not add the client AuthKit SDK
- keep project authorization in app-owned durable tables
- use `/projects` and `/projects/:projectId` with optional `?processId=`
- keep selected process state route-derived only
- keep one aggregated shell bootstrap with section envelopes
- distinguish artifact process context from true source attachment scope
- auto-generate process labels; do not add manual naming UX
- derive process shell summaries through process-owned projection functions
- include sign-out in Epic 1 shell chrome with CSRF protection
- assume high-touch local bootstrap is acceptable in the first implementation
- do not add WebSocket live transport, MCP wiring, or provider details here

These decisions collectively favor a narrow but durable platform skeleton over a
broader first cut.

## Intentional Deferrals and Later-Epic Hand-offs

The spec pack repeatedly marks the following as later work:

- active process work surface, chat, and live process steering: Epic 2
- live WebSocket/upsert transport: Epic 2+
- environment/provider lifecycle, hydration, and tool execution: Epic 3
- artifact review surface, markdown/Mermaid rendering, packaging: Epic 4
- richer project-scoped artifact/version/provenance alignment: later standup
  sequence around Epic 5
- repository attachment lifecycle, freshness resolution, and broader
  source-management workflows: Epic 6
- archive and derived turn/chunk views: Epic 7
- MCP-backed external source attachment: explicitly after the Epic 5-7 sequence
- membership admin flows, manual process naming, pagination/virtualization:
  future refinement

Future reviewers should treat these as deliberate deferrals rather than bugs
unless the implementation accidentally contradicts the Epic 1 boundaries.

## Risks, Tradeoffs, and Open Questions

### Major Tradeoffs Chosen

- Aggregated shell bootstrap vs client fan-out:
  simpler client shell, but more server composition responsibility.
- Route-derived selected process vs persisted selection:
  less backend complexity, but selection healing must be handled carefully in
  the router.
- Vanilla TypeScript shell vs richer framework:
  lower initial complexity and better fit for the first shell slice, but
  future client complexity may push the stack later.
- No pagination/virtualization:
  simpler early implementation, but depends on the stated list sizes remaining
  modest.
- Auto-generated process labels vs manual naming:
  lower friction early, but UX flexibility is intentionally postponed.

### Risks Called Out by the Specs

- Artifact process context could drift into accidental ownership semantics if
  the implementation collapses `currentProcessReference` and
  `producingProcess`.
- Section-level failures could get flattened into request failures, breaking the
  shell's graceful-degradation model.
- Process-specific meaning could leak into generic shell code if summary
  projection contracts are bypassed.
- Route-derived selected process healing could create stale focus, back-stack
  churn, or confusing unavailable states if not implemented exactly.
- Local setup is expected to be high-touch at first; onboarding friction is an
  accepted tradeoff in the initial standup.

### Explicitly Remaining Open

- exact granularity of section error codes beyond stable `*_LOAD_FAILED` shapes
- exact file-tree naming details and styling approach
- whether later scale requires virtualization or pagination

## How Epic 1 Contributes to the Larger Platform Standup

Epic 1 is the platform's entry shell and durable containment layer. Its main
contributions to the larger seven-epic standup are:

- it proves that projects, not threads, are the top-level container
- it proves that multiple processes can coexist durably inside one project
- it establishes app-owned authz and project membership boundaries
- it establishes the first stable browser/server contract surface
- it creates the durable schema split between generic process records and
  process-specific state
- it introduces summary projections for processes, artifacts, and sources
- it preserves the durable/disposable split before environments exist
- it gives later execution, review, source, and archive epics a stable shell to
  deepen instead of forcing them to invent one

If Epic 1 landed well, later epics should feel like they are plugging into an
already coherent platform container rather than compensating for a weak shell.

## Assessment Notes for Later Review

When comparing the implemented codebase to Epic 1 intent, later reviewers
should explicitly verify:

1. `Project` really is the top-level durable container in both schema and UI,
   and processes/artifacts/source attachments are nested beneath it.
2. Fastify, not Convex, owns the public control-plane routes and auth/session
   mediation.
3. Authenticated identity comes from WorkOS, but project authorization is
   enforced from app-owned durable ownership/membership records.
4. The shell route model is still `/projects` and `/projects/:projectId` with
   optional `?processId=` rather than a deeper premature process-route model.
5. Selected process state is route-derived only in Epic 1 codepaths and a stale
   `processId` is healed client-side without failing the whole shell.
6. `GET /api/projects/:projectId` returns an aggregated shell bootstrap with
   independent section envelopes for `processes`, `artifacts`, and
   `sourceAttachments`.
7. Request-level failures and section-level failures are still distinct in the
   implementation and tests.
8. The server composes shell data through modular section readers/builders
   rather than one opaque all-in-one query path.
9. The durable schema includes one generic `processes` table plus exactly one
   matching process-type state row per created process.
10. Process creation supports only `ProductDefinition`,
    `FeatureSpecification`, and `FeatureImplementation` in Epic 1.
11. Process auto labels are deterministic, project-local, and process-type-local
    so same-type processes remain distinguishable.
12. Process summaries expose status, phase, next-step context, and high-level
    available actions without the generic shell reading process-specific state
    directly.
13. Artifact summaries still treat artifacts as project-scoped assets and use
    process context only as explanatory shell context.
14. Source attachment summaries still preserve true project-vs-process scope,
    purpose, target ref, and hydration-state semantics.
15. Processes remain visible and durable when no environment exists or an
    earlier environment was discarded.
16. Sign-out is implemented in the shell chrome and actually clears stale shell
    access and visible authenticated project data.
17. The client remains thin and contract-driven rather than carrying a second
    competing interpretation of shell semantics.
18. The implemented tests meaningfully cover partial section failure behavior,
    invalid selected-process healing, and per-type process state creation.
19. Later-epic machinery such as live transport, environment/provider
    orchestration, full artifact review, or archive derivation was not
    accidentally half-introduced into the Epic 1 shell in ways that blur
    responsibilities.
20. Any drift from the above is either a justified post-spec architectural
    improvement or a real divergence worth documenting before more functional
    process work is built on top.
