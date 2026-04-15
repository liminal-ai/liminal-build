# Liminal Build — Current Technical Baseline

## Status
This technical baseline reflects repository state on `main` at commit
`d85d69b5478a1435db49495a541b6ac2c1523d07`, inspected on `2026-04-15`.

## Evidence Scope
- Historical inputs:
  - `docs/spec-build/v2/core-platform-arch.md`
  - `docs/spec-build/v2/core-platform-prd.md`
  - `docs/spec-build/v2/epics/01--project-and-process-shell/*`
  - `docs/spec-build/v2/epics/02--process-work-surface/*`
- Code and config reviewed:
  - `package.json`
  - `apps/platform/package.json`
  - `apps/platform/server/*`
  - `apps/platform/client/*`
  - `apps/platform/shared/contracts/*`
  - `convex/*`
- Validation surfaces reviewed:
  - root `pnpm` scripts
  - `tests/integration/*`
  - `tests/service/server/*`
  - `tests/service/client/*`
  - `convex/*.test.ts`

## Current System Context
The current runtime is a TypeScript monorepo with one real app package at
`apps/platform`, root-level Convex functions, and Vitest-based test coverage.

Current runtime surfaces:
- Browser client:
  - Vite-built TypeScript app in `apps/platform/client`
- Fastify control plane:
  - route, auth, shell delivery, and websocket handling in `apps/platform/server`
- Shared contracts and client/server state shapes:
  - `apps/platform/shared/contracts`
- Durable store:
  - Convex queries and mutations in `convex`

Current external systems:
- WorkOS for hosted auth and session-cookie validation
- Convex for durable project/process/artifact/source/history/output/side-work state
- Browser WebSocket for live process updates

Not current state yet:
- No GitHub integration code in the implemented app
- No provider-backed environment or sandbox runtime
- No archive/chunk layer beyond visible process history rows

## Top-Tier Technical Surfaces

| Surface | Owns | Depends On | Future Work Should Respect |
|---------|------|------------|-----------------------------|
| Shell delivery and auth gating | HTML routes, session resolution, login/logout flow, bootstrap payload injection | WorkOS, Fastify plugins, shared bootstrap contract | Browser entry stays Fastify-owned; do not bypass shell bootstrap with direct client-side auth assumptions |
| Browser route and state orchestration | Route parsing, fetch sequencing, store updates, live subscription lifecycle | Shared contracts, browser-api modules, page renderers | Route-derived state and durable refetch semantics are part of current behavior |
| Project shell read path | Project shell API, section readers, process registration, summary ordering and degradation | PlatformStore, shared contracts | Section envelopes and partial degradation are stable seams |
| Process work-surface read/action/live path | Process bootstrap API, start/resume/respond actions, live normalization and websocket hub | PlatformStore, shared contracts, in-memory live hub | Bootstrap + live reconciliation is the current pattern for active process state |
| Platform store and durable state boundary | Fastify-to-Convex boundary, store abstractions, null/in-memory test doubles | ConvexHttpClient, Convex functions | Browser-facing code should continue talking to Fastify rather than directly to Convex |
| Shared contract and state root | Zod schemas for requests, responses, routes, app state, and live messages | Client and server modules | Contract changes fan out widely; update both sides and tests together |

## Current Stack And Version-Sensitive Decisions

| Area | Current Choice | Evidence | Notes |
|------|----------------|----------|-------|
| Workspace runtime | Node `>=24.14.0 <25` | `package.json` | Root repo expects current Node 24 line |
| Package manager | `pnpm@10.33.0` | `package.json` | Workspace-root scripts assume pnpm |
| Server framework | Fastify `5.8.4` | `apps/platform/package.json` | Fastify owns browser-facing routes, plugins, and websocket server |
| Auth SDK | `@workos-inc/node` `8.12.1` | `apps/platform/package.json` | Hosted login/logout with app-owned session cookie |
| Client build | Vite `8.0.8` | `apps/platform/package.json` | Fastify serves built assets in production |
| Validation and typing | Zod `4.3.6`, TypeScript `6.0.2` | `apps/platform/package.json`, root `package.json` | Shared contracts and app state are schema-validated |
| Durable state | Convex `1.35.1` | root `package.json`, `convex/schema.ts` | Used behind Fastify via `PlatformStore`, not as the public control plane |
| Test runner | Vitest `4.1.4` | root `package.json` | Covers client, server, integration, and Convex slices |
| E2E harness | Playwright `1.59.1` | root `package.json`, `playwright.config.ts` | Current repo keeps the lane scaffolded but non-executable |

## Module Responsibility Matrix

| Module / Area | Responsibility | Domain(s) Served | Notes |
|---------------|----------------|------------------|------|
| `apps/platform/server/index.ts` | Runtime entry, env loading, Fastify listen | Whole app | Loads `.env` and `.env.local` from workspace root |
| `apps/platform/server/app.ts` | Server composition root | Whole app | Wires plugins, services, routes, and store implementation |
| `apps/platform/server/plugins/workos-auth.plugin.ts` | Per-request session resolution and actor attachment | Auth, all server routes | Every request gets `actor` and `authFailureReason` attached before handlers |
| `apps/platform/server/routes/auth.ts` | Login, callback, me, logout routes | Auth and shell entry | HTML redirect flow plus `/auth/me` JSON lookup |
| `apps/platform/server/routes/projects.ts` | Project HTML routes and project/process registration APIs | Project and process shell | Owns `/projects`, `/api/projects`, and `/api/projects/:projectId/processes` |
| `apps/platform/server/routes/processes.ts` | Process HTML route, process bootstrap API, process actions, websocket route | Process work surface | Owns HTTP bootstrap plus websocket subscribe path |
| `apps/platform/server/services/projects/*` | Project access, creation, shell assembly, readers, summary shaping | Project and process shell | `ProjectShellService` parallelizes section reads and degrades them independently |
| `apps/platform/server/services/processes/*` | Process access, bootstrap assembly, actions, live transport | Process work surface | `DefaultProcessWorkSurfaceService` parallelizes history/materials/current request/side work |
| `apps/platform/server/services/projects/platform-store.ts` | Store abstraction and Convex boundary | Both domains | Also provides `NullPlatformStore` and `InMemoryPlatformStore` for placeholder/test use |
| `apps/platform/shared/contracts/*` | Shared route, payload, live-message, and app-state schemas | Client, server, tests | This is the highest-leverage contract root in the repo |
| `apps/platform/client/app/*` | Browser bootstrap, routing, store, live reconciliation | Both domains | `bootstrap.ts` is the main client coordinator |
| `apps/platform/client/browser-api/*` | Fetch wrappers and request-error parsing | Both domains | Thin boundary between UI orchestration and HTTP APIs |
| `apps/platform/client/features/projects/*` | Project index/shell rendering and modals | Project and process shell | Mostly DOM-first render functions |
| `apps/platform/client/features/processes/*` | Process work-surface rendering and controls | Process work surface | History/materials/current request/live status all render here |
| `convex/*` | Durable tables and query/mutation behavior | Both domains | Process lifecycle, current refs, outputs, side work, access summaries |
| `tests/*` | Repo-visible behavior truth and mock boundaries | Whole app | Client JSDOM tests, server app-inject tests, integration tests, Convex tests |

## Major Runtime / Request / Interaction Sequences
1. HTML shell bootstrap.
   `apps/platform/server/routes/projects.ts` or
   `apps/platform/server/routes/processes.ts` resolves access, builds a shell
   bootstrap payload with actor and CSRF token, and renders the Vite-backed
   document. `apps/platform/client/main.ts` then calls `bootstrapApp()`.
2. Browser route load.
   `apps/platform/client/app/bootstrap.ts` resolves `/auth/me`, parses the
   current URL into `project-index`, `project-shell`, or `process-work-surface`
   state, then loads the matching API surface.
3. Project shell read path.
   `GET /api/projects/:projectId` checks access, then `ProjectShellService`
   reads processes, artifacts, and source attachments in parallel. Each reader
   can independently become an `error` envelope.
4. Process work-surface bootstrap.
   `GET /api/projects/:projectId/processes/:processId` checks access, then
   `DefaultProcessWorkSurfaceService` reads history, materials, current
   request, and side work in parallel and returns one assembled payload.
5. Process action path.
   `start`, `resume`, and `respond` APIs validate action availability, mutate
   durable Convex state through `PlatformStore`, and publish live updates
   through `ProcessLiveHub`.
6. Live subscription path.
   The websocket route subscribes to an in-memory stream keyed by
   `projectId:processId`, sends an initial snapshot derived from the current
   bootstrap surface, and later normalizes publications into typed messages
   with sequence numbers.

## Boundary Contracts
- HTML bootstrap payload:
  - `apps/platform/shared/contracts/schemas.ts` via `shellBootstrapPayloadSchema`
- Project shell API:
  - `ProjectShellResponse` with `project`, `processes`, `artifacts`,
    `sourceAttachments`
- Process bootstrap API:
  - `ProcessWorkSurfaceResponse` with `project`, `process`, `history`,
    `materials`, `currentRequest`, `sideWork`
- Request error contract:
  - `RequestError` and stable error codes such as `PROJECT_FORBIDDEN`,
    `PROCESS_NOT_FOUND`, `PROCESS_ACTION_NOT_AVAILABLE`
- Live update contract:
  - `LiveProcessUpdateMessage` for `process`, `history`, `current_request`,
    `materials`, and `side_work` entity updates
- Client state root:
  - `AppState` and `ProcessSurfaceState` in
    `apps/platform/shared/contracts/state.ts`

## Test Seams And Mock Boundaries
- Server route tests:
  - `tests/service/server/*`
  - Use `buildApp()` with test auth services and in-memory stores, then hit
    routes with Fastify `inject()`
- Client rendering and orchestration tests:
  - `tests/service/client/*`
  - Use JSDOM, mocked `fetch`, and fake websocket objects
- Integration tests:
  - `tests/integration/*`
  - Start a real Fastify server on an ephemeral port and use
    `InMemoryPlatformStore`
- Convex tests:
  - `convex/*.test.ts`
  - Cover durable state helpers and table-level behavior

## Repo Validation Surfaces

| Surface | Evidence | Notes |
|---------|----------|-------|
| Fast lane | root `pnpm verify` | Runs format check, lint, typecheck, build, Convex tests, server tests, and client tests |
| Deeper lane | root `pnpm verify-all` | Adds integration tests and the scaffolded e2e lane |
| Build-only lane | root `pnpm red-verify` | Format, lint, typecheck, and build without tests |
| Integration lane | root `pnpm test:integration` | Fastify app integration coverage |
| E2E lane | root `pnpm test:e2e` | Currently prints a scaffold message rather than running tests |
| CI config | no `.github` workflow files present | Repo-visible validation is script-defined today |

## Known Technical Drift / Legacy Exceptions
- The v2 platform PRD and architecture describe a broader platform than the
  current codebase implements. Fastify, Convex, WorkOS, and Vite are current
  reality; provider-backed environments, GitHub hydration, archive layers, and
  review/export surfaces are still planned, not current.
- `ProcessModuleRegistry` exists as an intended per-process-module seam, but
  `createApp()` currently instantiates an empty registry without registering
  concrete per-type modules. Current process lifecycle behavior is still
  generic logic in `convex/processes.ts`.
- Durable per-type process state tables already exist
  (`processProductDefinitionStates`, `processFeatureSpecificationStates`,
  `processFeatureImplementationStates`), but they are used mainly for current
  material refs rather than differentiated orchestration.
- Project summary counts in `convex/projects.ts` are currently derived from
  full per-project reads rather than maintained counters. That matches an
  early-stage repo shape, not the eventual scale assumptions in the platform
  architecture.
- The shell summary action vocabulary is broader than implemented interactive
  controls. For example, shell summaries can expose `review`, `rehydrate`, or
  `restart` labels, while current browser actions are implemented on the
  dedicated process surface for `start`, `resume`, and `respond`.
- Several file names, error labels, and README text still mention Story 0 or
  Epic 1 even though the repo now includes later shell and process-surface
  behavior. Treat those names as historical residue, not as the real current
  scope boundary.
