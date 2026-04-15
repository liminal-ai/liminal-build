# Liminal Build — Current State Index

## Status
This onboarding pack reflects repository state on `main` at commit
`d85d69b5478a1435db49495a541b6ac2c1523d07`, inspected on `2026-04-15`.

This is the first current-state baseline pack for the repo. It is a catch-up
baseline, not a refresh of earlier current-state docs.

## Evidence Scope
- Historical artifacts reviewed:
  - `docs/spec-build/v2/core-platform-prd.md`
  - `docs/spec-build/v2/core-platform-arch.md`
  - `docs/spec-build/v2/epics/01--project-and-process-shell/*`
  - `docs/spec-build/v2/epics/02--process-work-surface/*`
  - `docs/spec-build/v1/prd.md`
  - `docs/epic-01-handoff.md`
- Code and runtime surfaces reviewed:
  - `apps/platform/server`
  - `apps/platform/client`
  - `apps/platform/shared/contracts`
  - `convex`
  - `package.json`
  - `apps/platform/package.json`
- Tests and repo-visible validation surfaces reviewed:
  - `tests/integration/*`
  - `tests/service/server/*`
  - `tests/service/client/*`
  - root `pnpm` scripts
- Evidence limitations:
  - No prior `current-state*.md` docs existed.
  - No `.github` workflow configuration is present in the repo.
  - `test:e2e` is scaffolded but intentionally non-executable today.
  - No live runtime probe was executed; this pack is repository-evidence-bound.

## Read This First
This index is the entry point for the pack.

1. [current-state-project-and-process-shell.md](./current-state-project-and-process-shell.md)
2. [current-state-process-work-surface.md](./current-state-process-work-surface.md)
3. [current-state-tech-design.md](./current-state-tech-design.md)
4. [current-state-code-map.md](./current-state-code-map.md)
5. [current-state-drift-ledger.md](./current-state-drift-ledger.md) when historical lineage matters
6. [current-state-doc-meta.json](./current-state-doc-meta.json) and [current-state-module-tree.json](./current-state-module-tree.json) only when automation or machine-readable clustering matters

## System Overview
Liminal Build currently ships a Fastify-served, auth-gated web workspace for
running crafted processes inside projects. The implemented user-facing product
is centered on two surfaces:

1. a project and process shell at `/projects` and `/projects/:projectId`
2. a dedicated process work surface at
   `/projects/:projectId/processes/:processId`

Durable project, process, history, output, side-work, artifact, and source
state lives in Convex behind a Fastify-owned `PlatformStore` boundary. The
browser does not talk to Convex directly. WorkOS handles hosted
authentication, while Fastify owns session resolution, shell delivery, and
browser-facing APIs.

Three process types can be created now:

- `ProductDefinition`
- `FeatureSpecification`
- `FeatureImplementation`

Confirmed current state: those three types are durable first-class process
types in contracts, routes, and Convex tables. Implemented, weakly evidenced:
their current user-visible behavior is still mostly shared platform behavior
rather than distinct process-specific orchestration.

## Current Process Types

| Process Type | Durable State Owned Today | Distinct Current Behavior | Shared Current Behavior | Not Yet Differentiated |
|-------------|---------------------------|---------------------------|-------------------------|------------------------|
| `ProductDefinition` | `processProductDefinitionStates` stores current artifact/source refs | Own dedicated process-type state row on creation | Draft creation, shell summary behavior, process-surface bootstrap shape, generic start/resume/respond lifecycle logic | No process-type-specific module, prompts, phase transitions, or request generation in repo code |
| `FeatureSpecification` | `processFeatureSpecificationStates` stores current artifact/source refs | Own dedicated process-type state row on creation | Draft creation, shell summary behavior, process-surface bootstrap shape, generic start/resume/respond lifecycle logic | No process-type-specific module, prompts, phase transitions, or request generation in repo code |
| `FeatureImplementation` | `processFeatureImplementationStates` stores current artifact/source refs | Own dedicated process-type state row on creation | Draft creation, shell summary behavior, process-surface bootstrap shape, generic start/resume/respond lifecycle logic | No process-type-specific module, prompts, phase transitions, or request generation in repo code |

Implemented, weakly evidenced:
- The per-type state tables are real current state.
- The meaningful behavioral difference between the three types is still minimal
  in current repo code.
- Future process-specific differentiation is implied by structure, not yet
  delivered by concrete registered modules.

## Top-Tier Capability Domains

| Domain | What Exists Now | Read Next |
|--------|------------------|-----------|
| Project and process shell | Authenticated project index, project shell bootstrap, process registration, shell summaries for processes/artifacts/source attachments, route-based selected-process handling, and durable reopen behavior | [current-state-project-and-process-shell.md](./current-state-project-and-process-shell.md) |
| Process work surface | Dedicated process route, bootstrap payload for process state, history/current request/materials/side-work sections, start/resume/respond actions, live websocket updates, and durable reload/return behavior | [current-state-process-work-surface.md](./current-state-process-work-surface.md) |

## Cross-Domain Flows
1. Authenticated entry and project selection.
   The browser loads a Fastify-rendered shell, resolves the current actor, then
   fetches either the project index or one project shell.
2. Project creation and process registration.
   Creating a project returns an empty shell immediately. Creating a process
   from that shell adds a typed draft process, updates project counts, and
   focuses the shell on the new process through `?processId=...`.
3. Process opening and active work.
   Opening a process moves the user from project-level summaries to a dedicated
   process surface with current phase, status, history, materials, current
   request, and side work.
4. Active-work reconciliation and return.
   Start, resume, and respond actions update durable state first, then publish
   live updates. Reloading or returning later rehydrates from the durable
   bootstrap APIs rather than from transient websocket state.

## Current Constraints and Invariants
- Unauthenticated HTML requests redirect to `/auth/login`; unauthenticated API
  requests return `401 UNAUTHENTICATED`.
- Project shell and process work-surface APIs return stable section envelopes
  and degrade section-by-section instead of failing the whole surface when one
  section reader fails.
- Project shell process selection is route-derived query state
  (`?processId=...`). The dedicated process work surface uses a separate path.
- Current process materials are a projection of current artifact/source refs
  plus current outputs, not a full historical listing of everything ever
  attached to the process.
- Live websocket updates supplement the durable bootstrap. They are not the
  only readable source of truth, and retry falls back to a fresh HTTP read.
- Fastify remains the browser-facing control plane. Convex remains a durable
  store behind that boundary.

## What Is Not Current State Yet
- Planned, not current: provider-backed environments, sandbox filesystem
  lifecycle, and in-sandbox tool runtime execution from the platform PRD and
  architecture.
- Planned, not current: GitHub-backed repo hydration flows beyond summary-level
  source attachment visibility and hydration-state labels.
- Planned, not current: full markdown review workspace, Mermaid/package export
  surfaces, and archive/turn/chunk browsing.
- Implemented, weakly evidenced: process-type-specific durable state tables
  exist, but current start/resume/respond behavior is still generic lifecycle
  transition logic rather than distinct registered process modules.

## Suggested Read Path By Task
- Extending project entry, project shell summaries, or process registration:
  read [current-state-project-and-process-shell.md](./current-state-project-and-process-shell.md),
  then [current-state-tech-design.md](./current-state-tech-design.md), then the
  shell sections in [current-state-code-map.md](./current-state-code-map.md).
- Extending active process behavior, materials, side work, or live updates:
  read [current-state-process-work-surface.md](./current-state-process-work-surface.md),
  then [current-state-tech-design.md](./current-state-tech-design.md), then the
  process-surface sections in [current-state-code-map.md](./current-state-code-map.md).
- Reconciling old specs against implemented reality:
  start here, then use [current-state-drift-ledger.md](./current-state-drift-ledger.md)
  before returning to the historical epic or tech design.
