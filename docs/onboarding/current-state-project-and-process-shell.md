# Liminal Build — Current State: Project And Process Shell

## Status
Domain baseline reflects repository state on `main` at commit
`d85d69b5478a1435db49495a541b6ac2c1523d07`, inspected on `2026-04-15`.

## Evidence Scope
- Historical artifacts reviewed:
  - `docs/spec-build/v2/epics/01--project-and-process-shell/*`
  - `docs/spec-build/v2/core-platform-prd.md`
- Code areas reviewed:
  - `apps/platform/server/routes/projects.ts`
  - `apps/platform/server/routes/auth.ts`
  - `apps/platform/server/services/projects/*`
  - `apps/platform/client/app/bootstrap.ts`
  - `apps/platform/client/features/projects/*`
  - `apps/platform/shared/contracts/schemas.ts`
  - `convex/projects.ts`
  - `convex/processes.ts`
  - `convex/artifacts.ts`
  - `convex/sourceAttachments.ts`
- Tests reviewed:
  - `tests/integration/platform-shell.test.ts`
  - `tests/service/server/project-shell-bootstrap-api.test.ts`
  - `tests/service/server/project-create-api.test.ts`
  - `tests/service/server/processes-api.test.ts`
  - `tests/service/client/project-router.test.ts`
  - `tests/service/client/project-shell-page.test.ts`
  - `tests/service/client/project-index-page.test.ts`

## Overview
This domain covers authenticated entry into the app, the projects index, the
project shell for one project, and process registration from that shell. It is
the current place where the user decides what to work on next. It is not the
place where detailed process work happens; that begins only after the user
opens a dedicated process route.

## Current User Outcomes
- The user can sign in through WorkOS-hosted auth and land on `/projects`.
- The projects index lists accessible projects with role, process count,
  artifact count, source-attachment count, and last-updated time.
- The user can create a new project from the index and immediately land in an
  empty project shell where they are the owner.
- The user can open a project shell from the index or by direct URL.
- The project shell shows project identity plus three independent summary
  sections: processes, artifacts, and source attachments.
- The user can create a new process from the project shell using one of the
  three supported process types.
- The shell can keep one process selected via `?processId=...`, and it clears
  a stale selection if that process is no longer present in the shell response.
- The user can sign out from the shell header, which clears client state and
  redirects through the WorkOS logout URL.

## In Scope Now
- Authenticated project index at `/projects`
- Project shell at `/projects/:projectId`
- Project creation with duplicate-name rejection for owned projects
- Role-aware project access (`owner` or `member`)
- Process registration in a project
- Process summary visibility, including high-level available-action labels and
  environment presence
- Artifact summary visibility
- Source attachment summary visibility, including hydration-state labels
- Section-level `ready`, `empty`, and `error` shell rendering
- Durable reopen and server-restart recovery for project shell reads

## Not Present / Deferred / Deprecated
- No UI for membership editing or invitation management
- No project search, filtering, or sorting controls beyond last-updated order
- No artifact detail view or source-attachment detail view from the shell
- No shell-level execution for `review`, `rehydrate`, or `restart`; those
  labels are visible in process summaries but are not shell actions today
- No separate project-shell current-state doc from earlier runs; this file is
  the first baseline

## Major Current Flows

### 1. Authenticated Entry And Project Index
Confirmed current state:
- HTML entry requests are served by Fastify.
- Missing or invalid sessions redirect the browser to `/auth/login`.
- The client resolves `/auth/me` before loading route-specific data.
- The projects index then loads `/api/projects` and renders accessible projects
  sorted by `lastUpdatedAt` descending.

### 2. Project Creation And Immediate Shell Open
Confirmed current state:
- Creating a project requires a non-empty name.
- Duplicate names are rejected only within the current owner’s project set.
- Successful creation returns a full shell payload immediately, not just a
  project stub.
- The returned shell has `empty` process, artifact, and source sections.

### 3. Project Shell Summaries And Section Degradation
Confirmed current state:
- The shell bootstrap response contains `project`, `processes`, `artifacts`,
  and `sourceAttachments`.
- Each section is independently sorted by `updatedAt` descending when it has
  items.
- Each section can be `ready`, `empty`, or `error`.
- A failure in one section does not block the other healthy sections.
- Source summaries expose purpose, target ref, and hydration state.

### 4. Process Registration In A Project
Confirmed current state:
- The shell can create `ProductDefinition`, `FeatureSpecification`, and
  `FeatureImplementation` processes.
- New processes are created in `draft` status with phase label `Draft`,
  next-action label `Open the process`, and `hasEnvironment: false`.
- Display labels are auto-generated from process type and count within the
  project, for example `Feature Specification #2`.
- The client updates project counts locally and focuses the new process through
  `?processId=...`.

### 5. Selected-Process Recovery On The Shell
Confirmed current state:
- The shell treats `?processId=...` as route-derived selection state.
- If the selected process still exists in the shell response, the shell keeps
  it selected.
- If the selected process is missing and the processes section is otherwise
  readable, the client clears the query parameter with `history.replaceState()`
  and renders a banner explaining that the stale selection was removed.

### 6. Durable Return And Recovery
Confirmed current state:
- Project-shell API reads survive browser reloads.
- Project-shell HTML and API reads survive application server restarts.
- Recovery relies on durable store state, not on browser-local cached shell
  state.

## Important Current Contracts And Invariants
- Project-shell contract:
  - `project` is always a single project summary when access succeeds.
  - `processes`, `artifacts`, and `sourceAttachments` are always section
    envelopes.
- Section status vocabulary is stable: `ready`, `empty`, `error`.
- Access failures are stable and surface as `PROJECT_FORBIDDEN` or
  `PROJECT_NOT_FOUND` on the API and as unavailable HTML states on the shell
  routes.
- Source hydration is currently a visible state label only:
  `not_hydrated`, `hydrated`, `stale`, `unavailable`.
- Shell process summaries expose `availableActions` and `hasEnvironment`, but
  those summaries are descriptive current state, not a promise that every
  listed action has a shell-level control.

## Extension Guidance
- New work that changes project entry, project creation, or shell routing
  should preserve route-derived selected-process behavior and section-envelope
  degradation semantics.
- New work that changes process registration should preserve auto-generated
  display labels unless a deliberate renaming workflow is introduced.
- New shell-level features should be explicit about whether they are summary
  visibility, shell action, or dedicated process-surface behavior. The current
  product draws a hard line between shell summaries and active process work.

## Read Next
- Read [current-state-tech-design.md](./current-state-tech-design.md) for the
  current server/client/runtime seams behind the shell.
- Read the project-and-shell sections in
  [current-state-code-map.md](./current-state-code-map.md) before changing shell
  routes, summary sections, or process registration flows.
- Read [current-state-drift-ledger.md](./current-state-drift-ledger.md) only if
  you need to map Epic 1 or earlier repo descriptions onto current shell
  behavior.

## Adjacent Domains
- [current-state-process-work-surface.md](./current-state-process-work-surface.md)
  for what happens after a process leaves shell-level summary mode and opens as
  dedicated active work.
- [current-state-tech-design.md](./current-state-tech-design.md) for the shared
  `PlatformStore`, contract, and routing boundaries this domain composes with.
