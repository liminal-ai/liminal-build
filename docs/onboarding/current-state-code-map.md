# Liminal Build — Current Code Map

## Status
Code map reflects repository state on `main` at commit
`d85d69b5478a1435db49495a541b6ac2c1523d07`, inspected on `2026-04-15`.

## Start Here
- `apps/platform/server/index.ts`
  - Runtime entry for the Fastify app. Read this first if you need to
    understand env loading and how the server starts locally.
- `apps/platform/server/app.ts`
  - The main server composition root. Read this immediately after
    `server/index.ts` to see which services, plugins, and routes are actually
    wired into the current app.
- `apps/platform/client/main.ts`
  - Browser entry. It is thin, but it tells you that the real client
    orchestrator is `apps/platform/client/app/bootstrap.ts`.
- `apps/platform/client/app/bootstrap.ts`
  - Highest-value client file. It owns route parsing, fetch sequencing, store
    patching, create-project/process flows, process actions, and live
    subscription retry.
- `apps/platform/shared/contracts/index.ts`
  - Contract export root. If you will touch anything client/server-facing, read
    this before changing behavior.
- `convex/schema.ts`
  - Durable table and index root. Read this before changing any Convex-backed
    shape.

## Top-Level Code Areas

| Area | Path | Owns | Read When |
|------|------|------|-----------|
| Server app | `apps/platform/server` | Fastify routes, auth, services, plugins | You are changing browser-facing behavior, auth, API contracts, or websocket flow |
| Client app | `apps/platform/client` | Browser bootstrap, state, DOM rendering, fetch orchestration | You are changing user-visible behavior or route/state handling |
| Shared contracts | `apps/platform/shared/contracts` | Zod schemas for routes, payloads, app state, live messages | You are changing any request/response/state shape |
| Durable state | `convex` | Tables, queries, mutations, and current-state projections | You are changing persisted data or server store behavior |
| Tests | `tests` | Client/server/integration evidence | You need the strongest current behavior truth for a seam |
| Historical specs | `docs/spec-build/v2` | Historical intent and drift inputs | You need lineage or want to compare current code to older specs |
| Current onboarding pack | `docs/onboarding` | Current-state baseline docs | You need the current functional/technical read path before extending the repo |

## Recommended General Read Order
1. `docs/onboarding/current-state-index.md`
2. `apps/platform/server/app.ts`
3. `apps/platform/shared/contracts/index.ts`
4. `apps/platform/client/app/bootstrap.ts`
5. The relevant feature page root in `apps/platform/client/features`
6. `apps/platform/server/services/projects/platform-store.ts`
7. `convex/schema.ts`
8. The best tests for the same seam you want to change

## Targeted Read Orders

### If You Are Changing Server Or API Behavior
1. `docs/onboarding/current-state-index.md`
2. `docs/onboarding/current-state-tech-design.md`
3. `apps/platform/server/app.ts`
4. The relevant route file:
   `apps/platform/server/routes/projects.ts` or
   `apps/platform/server/routes/processes.ts`
5. The matching service and reader files under
   `apps/platform/server/services/projects` or
   `apps/platform/server/services/processes`
6. `apps/platform/shared/contracts/index.ts`
7. `apps/platform/server/services/projects/platform-store.ts`
8. The matching server tests under `tests/service/server`
9. The matching integration test under `tests/integration`

### If You Are Changing Client Or UI Behavior
1. `docs/onboarding/current-state-index.md`
2. The relevant domain doc in `docs/onboarding`
3. `apps/platform/client/app/bootstrap.ts`
4. `apps/platform/client/app/router.ts`
5. `apps/platform/client/app/store.ts`
6. The relevant page root in `apps/platform/client/features`
7. The relevant browser API module in `apps/platform/client/browser-api`
8. The matching client tests under `tests/service/client`

### If You Are Changing Durable State Or Convex Behavior
1. `docs/onboarding/current-state-index.md`
2. `docs/onboarding/current-state-tech-design.md`
3. `convex/_generated/ai/guidelines.md`
4. `apps/platform/server/services/projects/platform-store.ts`
5. `convex/schema.ts`
6. The primary durable module for the change:
   `convex/processes.ts`, `convex/projects.ts`, `convex/processHistoryItems.ts`,
   `convex/processOutputs.ts`, or `convex/processSideWorkItems.ts`
7. Any affected per-process-type state module under `convex/process*States.ts`
8. Matching tests in `convex/*.test.ts` and `tests/service/server`

## Domain-To-Code Mapping

### Project And Process Shell

**Start here**
- `apps/platform/server/routes/projects.ts`
- `apps/platform/server/services/projects/project-shell.service.ts`
- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/projects/project-index-page.ts`
- `apps/platform/client/features/projects/project-shell-page.ts`

**Then read**
- `apps/platform/client/app/shell-app.ts`
- `apps/platform/server/services/projects/process-registration.service.ts`
- `apps/platform/server/services/projects/project-create.service.ts`
- `apps/platform/server/services/projects/readers/process-section.reader.ts`
- `apps/platform/server/services/projects/readers/artifact-section.reader.ts`
- `apps/platform/server/services/projects/readers/source-section.reader.ts`
- `apps/platform/client/features/projects/process-section.ts`
- `apps/platform/client/features/projects/artifact-section.ts`
- `apps/platform/client/features/projects/source-attachment-section.ts`

**Only if needed**
- `apps/platform/server/services/projects/process-display-label.service.ts`
- `convex/projects.ts`
- `convex/artifacts.ts`
- `convex/sourceAttachments.ts`

**Owns**
- Project index and project shell behavior
- Project creation
- Process registration from the shell
- Shell section ordering and degradation
- Stale `?processId` reconciliation

**Key seams**
- Shared contract roots in `apps/platform/shared/contracts/schemas.ts`
- Browser route orchestration in `apps/platform/client/app/router.ts`
- Durable project/process data in `convex/projects.ts` and `convex/processes.ts`

### Process Work Surface

**Start here**
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`

**Then read**
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-response.service.ts`
- `apps/platform/server/services/processes/readers/history-section.reader.ts`
- `apps/platform/server/services/processes/readers/materials-section.reader.ts`
- `apps/platform/server/services/processes/readers/side-work-section.reader.ts`
- `apps/platform/client/app/process-live.ts`
- `apps/platform/client/features/processes/process-history-section.ts`
- `apps/platform/client/features/processes/process-response-composer.ts`
- `apps/platform/client/features/processes/process-live-status.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/client/features/processes/current-request-panel.ts`
- `apps/platform/client/features/processes/side-work-section.ts`

**Only if needed**
- `apps/platform/server/services/processes/live/process-live-hub.ts`
- `apps/platform/server/services/processes/live/process-live-normalizer.ts`
- `convex/processHistoryItems.ts`
- `convex/processOutputs.ts`
- `convex/processSideWorkItems.ts`

**Owns**
- Process bootstrap and unavailable states
- Start/resume/respond actions
- Current request/history/materials/side-work rendering
- Websocket reconciliation and retry behavior

**Key seams**
- Process-surface contracts in `apps/platform/shared/contracts/process-work-surface.ts`
- Live message contracts in `apps/platform/shared/contracts/live-process-updates.ts`
- Durable lifecycle logic in `convex/processes.ts`

### Durable Project And Process State

**Start here**
- `apps/platform/server/services/projects/platform-store.ts`
- `convex/schema.ts`
- `convex/processes.ts`

**Then read**
- `convex/projects.ts`
- `convex/processHistoryItems.ts`
- `convex/processOutputs.ts`
- `convex/processSideWorkItems.ts`
- `convex/processProductDefinitionStates.ts`
- `convex/processFeatureSpecificationStates.ts`
- `convex/processFeatureImplementationStates.ts`

**Only if needed**
- `convex/projectMembers.ts`
- `convex/users.ts`

**Owns**
- Durable summaries returned to the shell
- Durable process lifecycle transitions
- Current material refs
- Current outputs and side-work replacement semantics

**Key seams**
- Server store abstraction in `platform-store.ts`
- Shared contract shapes consumed by both server and client

## Coordination Hubs
- `apps/platform/server/app.ts`
  - The single best server file for understanding current wiring.
- `apps/platform/client/app/bootstrap.ts`
  - The single best client file for understanding current behavior flow.
- `apps/platform/client/app/shell-app.ts`
  - The page-selection hub between project index, project shell, and process
    work surface rendering.
- `apps/platform/server/services/projects/platform-store.ts`
  - The boundary between Fastify services and Convex-backed durable state.
- `apps/platform/shared/contracts/index.ts`
  - The contract root most changes fan through.
- `apps/platform/client/app/store.ts`
  - The browser state root; read this before changing route or surface state.

## Contract And State Roots
- `apps/platform/shared/contracts/schemas.ts`
  - Project shell, auth, request-error, and summary contracts
- `apps/platform/shared/contracts/process-work-surface.ts`
  - Process bootstrap and action contracts
- `apps/platform/shared/contracts/live-process-updates.ts`
  - Live websocket message model
- `apps/platform/shared/contracts/state.ts`
  - Route and app-state schemas used by the client store
- `apps/platform/client/app/store.ts`
  - Concrete browser state holder
- `apps/platform/server/config.ts`
  - Runtime env shape and shell-bootstrap payload builder

## Test Map

| Area | Best First Tests | Why Start There |
|------|------------------|-----------------|
| Project index and project list API | `tests/service/client/project-index-page.test.ts`, `tests/service/server/projects-api.test.ts` | Best first reads for accessible-project list behavior, empty-state rendering, and project-index UI |
| Project shell API | `tests/service/server/project-shell-bootstrap-api.test.ts` | Strongest truth for section envelopes, sorting, and degradation |
| Project creation and registration | `tests/service/server/project-create-api.test.ts`, `tests/service/server/processes-api.test.ts` | Best coverage for creation flow and auto-labeled process registration |
| Project routing and shell UI | `tests/service/client/project-router.test.ts`, `tests/service/client/project-shell-page.test.ts` | Best first reads for route-derived shell behavior and selected-process clearing |
| Process routing and HTML unavailable states | `tests/service/client/process-router.test.ts`, `tests/service/server/process-html-routes.test.ts` | Best first reads for opening process routes, reload behavior, unavailable HTML shells, and auth-gated process entry |
| Process bootstrap API | `tests/service/server/process-work-surface-api.test.ts` | Strongest truth for history/materials/current-request/side-work payload shape |
| Process actions | `tests/service/server/process-actions-api.test.ts`, `tests/service/client/process-work-surface-page.test.ts` | Covers start/resume/respond behavior plus UI error handling |
| Process surface sections | `tests/service/client/current-request-panel.test.ts`, `tests/service/client/process-response-composer.test.ts`, `tests/service/client/process-live-status.test.ts` | Best first reads for the most interactive process-surface subcomponents |
| Live updates | `tests/service/server/process-live-updates.test.ts`, `tests/service/client/process-live.test.ts` | Best place to learn snapshot/upsert/error semantics |
| Durable reopen/recovery | `tests/integration/platform-shell.test.ts`, `tests/integration/process-work-surface.test.ts` | Best evidence for reload/restart/return semantics |

## High-Leverage Files
If you only read ten files first, read these:

1. `apps/platform/server/app.ts`
2. `apps/platform/server/routes/projects.ts`
3. `apps/platform/server/routes/processes.ts`
4. `apps/platform/client/app/bootstrap.ts`
5. `apps/platform/client/app/router.ts`
6. `apps/platform/client/features/projects/project-shell-page.ts`
7. `apps/platform/client/features/processes/process-work-surface-page.ts`
8. `apps/platform/shared/contracts/process-work-surface.ts`
9. `apps/platform/server/services/projects/platform-store.ts`
10. `convex/processes.ts`

## Trap Areas
- `README.md` still describes the repo as a Story 0 foundation scaffold. Treat
  it as stale orientation, not as current product truth.
- `ProcessModuleRegistry` looks like the process-extension center, but concrete
  modules are not currently registered in `createApp()`.
- `references/` is background material and inspiration, not the authoritative
  source for what the app currently does.
- `apps/platform/dist` contains built output. Read the source under
  `apps/platform/client` and `apps/platform/server` first.
- Shell summary `availableActions` are not the same thing as implemented
  browser controls. Verify current interactivity in routes, page renderers, and
  tests before assuming a label is actionable.
