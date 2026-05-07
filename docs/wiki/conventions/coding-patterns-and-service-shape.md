# Coding Patterns and Service Shape

Liminal Build's codebase applies a small set of universal patterns across every subsystem so a fresh reader or review agent can grade design and implementation against the same expectations everywhere. Shared contracts are Zod-authored once and consumed by both server and client; services follow a constructor-injected shape with named exports; routes stay thin and delegate to services; errors flow through a single typed catalog; and skeleton paths fail fast through that catalog rather than returning safe defaults. Subsystem-specific mechanics — how the [archive finalization service](../current-technical-design/archive-and-derived-views.md) is shaped, how [source resolution](../current-technical-design/source-management-domain.md) composes — live on the relevant design page; this page covers only the patterns that hold across the whole codebase.

## Shared Contracts (Zod)

API and live-update shapes are authored once as Zod schemas under `apps/platform/shared/contracts/` and consumed by both runtimes. The [Fastify control plane](../current-technical-design/server-control-plane.md) registers them through `fastify-type-provider-zod` so request/response validation and TypeScript types come from the same source, and the client imports the same schemas to drive `browser-api/` validators and inferred types. No API contract is authored twice.

The contract tree is split by surface so each design page can point to a single file: `archive.ts`, `live-process-updates.ts`, `process-work-surface.ts`, `review-workspace.ts`, `source-management.ts`, `state.ts`, and `schemas.ts`. A barrel `index.ts` re-exports surface-level entries; consumers should import from the barrel rather than reaching into individual files.

Consuming code is expected to follow a few rules:

- Schemas live with their domain file; cross-domain compositions land in `schemas.ts` or `state.ts`.
- Both server and client import inferred types from the schema rather than declaring parallel type aliases.
- Field shapes documented on design pages appear as tables; raw schema or type declarations stay in code, not on the wiki.

The full inventory of contract files and their surface mappings lives on [Shared Contracts](../current-technical-design/shared-contracts.md).

## Service Shape

Server-side orchestration lives in service classes under `apps/platform/server/services/<domain>/`, organized into folders such as `archive/`, `auth/`, `processes/`, `projects/`, `review/`, `rendering/`, and `sources/`. Services own orchestration; routes and Convex domain files stay focused on HTTP shape and durable state respectively.

The expected service-class shape:

- **Constructor injection of dependencies, no module-level globals.** A service receives the collaborators it needs through its constructor — typically the `PlatformStore`, peer services, and any external clients — so tests can substitute fakes without monkey-patching imports.
- **Named exports only.** Every service class, helper function, type, and constant is a named export. There are no default exports in runtime modules.
- **Single responsibility per service.** Domain folders contain narrow services rather than one large class — the archive folder, for example, separates `ArchiveFinalizationService`, `ArchiveReadService`, `TurnDerivationService`, and `DerivedArchiveViewService`, each with its own seam.
- **Explicit return types on public methods.** Public methods carry typed inputs (named-argument object) and explicit return types, often referencing a [shared contract](../current-technical-design/shared-contracts.md) shape directly so the route handler can pass through without remapping.
- **Interface-then-default-class pattern where contracts cross subsystem boundaries.** When a service is referenced by another subsystem, the file exports an `interface` (e.g. `ReviewContextService`, `ProcessWorkSurfaceService`) and a default implementation class (`DefaultReviewContextService`, `DefaultReviewWorkspaceService`). Tests and adjacent services depend on the interface; wiring depends on the default class.

In practice, a `DefaultReviewContextService` is constructed with the `platformStore` and exposes `listAvailableTargets` and `canReviewArtifact`; an `ArchiveFinalizationService` receives a narrowed `Pick` of the `PlatformStore` plus an optional `ProcessHistoryCompatService` (default-constructed, overridable in tests) and exposes `appendFinalizedEntry` and `appendFromProcessHistoryItem`. The shape stays the same across domains: typed constructor, named methods on a clear seam, no hidden state.

## Mock at the External Boundary

Service tests enter through the public service method and mock only at the external boundary — Convex client, Octokit, sandbox provider adapter, signing key source — never at internal service-to-service seams. Internal modules (readers, builders, helpers) are exercised through their owning service's entry point so tests stay coupled to behavior rather than to wiring details.

The boundary is the external runtime surface, not the nearest collaborator. A `ReviewWorkspaceService` test mocks the Convex-backed `PlatformStore` (and where relevant, the URL signer or export adapter), then drives the service through its public methods so internal helpers and peer services run for real. A platform-store integration test, by contrast, runs against a real Convex test environment and mocks nothing on the platform side. The full layout of test lanes lives on [Testing and Verification](./testing-and-verification.md).

## Stub-Default Hazard

The Epic 3 standup review surfaced a recurring hazard: when a stub or in-memory default is acceptable to ship for a story, runtime code can accidentally start depending on it, and gaps in the real implementation hide until late-stage verification. The canonical writeup lives at [Stub Defaults Mask Gaps](../current-technical-architecture/known-hardening-and-deferrals.md). The platform's response is a small set of conventions the live codebase applies consistently.

- **Skeleton methods fail fast through the error catalog.** Unimplemented paths throw `AppError` with the `NOT_IMPLEMENTED` code and HTTP status `501`, not a placeholder default. The pattern is visible in `process-module-registry.ts` (no module registered for a given process type) and in `NotImplementedProcessWorkSurfaceService` in `process-work-surface.service.ts`. There is no separate `NotImplementedError` class — the code lives in `apps/platform/server/errors/codes.ts` as `notImplementedErrorCode` and is thrown via the shared `AppError`.
- **Tests at the boundary exercise the real production seam.** Service tests for a path that runs in production should drive the real implementation with the external boundary mocked, not a stubbed seam that returns the desired result. If a stub is the only path under test, the production code path has no coverage.
- **Schemas reject malformed payloads rather than coercing them.** Zod schemas in shared contracts and Convex validators reject unknown shapes; defaulting silently to a "safe" payload is the same hazard in another form.
- **Stub services are visibly named.** Where a placeholder implementation has to ship (for example, the `NotImplementedProcessWorkSurfaceService` in early stories), it is named so reviewers can see at a glance that a runtime path is unfinished.

## Route Handlers

Route registration lives under `apps/platform/server/routes/`, one file per surface (`archive.ts`, `auth.ts`, `processes.ts`, `projects.ts`, `review.ts`, `source-management.ts`). Each file exports a named `register*Routes(app)` function the server bootstrap calls during startup. Fastify plugins (cookies, CSRF, WebSocket, Vite middleware, WorkOS auth) sit under `apps/platform/server/plugins/` and use `fastify-plugin` directly; route modules themselves are plain registration functions.

Inside a `register*Routes` function the expected shape is:

- Acquire a typed Fastify instance via `app.withTypeProvider<ZodTypeProvider>()` so request and response shapes flow from the Zod schemas in `apps/platform/server/schemas/`.
- Attach request and response schemas to each route through the `schema` option. The schema files re-export the shared contracts and add route-specific request schemas alongside.
- Keep the handler thin: authenticate, resolve access through `processAccessService` or its peers, delegate to a service method, then translate the result or thrown error into the response.
- Translate `AppError` thrown from services into typed `RequestError` envelopes (carrying `code`, `message`, and `status`) through the route's small `buildRequestError` helper. Unknown errors are rethrown for Fastify's error pipeline.
- For composite endpoints (process work-surface bootstrap, review workspace bootstrap, archive page hydrators), return `200` with per-section status envelopes when one section has degraded, rather than failing the whole request. The canonical decision lives at [Section-Envelope Graceful Degradation](../current-technical-architecture/cross-cutting-decisions.md).

Route handlers do not orchestrate. If a handler grows past auth, schema, service call, and response shaping, the orchestration is expected to move into the corresponding service.

## Errors and Error Catalog

Errors are typed and code-tagged. The error directory at `apps/platform/server/errors/` is small and intentional:

- `app-error.ts` defines a single `AppError` class carrying `code`, `message`, and `statusCode`. Services and routes throw this for any failure that should reach the client as a typed envelope.
- `section-error.ts` defines a `SectionError` carrying `code` and `message` (no status). Section readers throw this when one section of a composite payload degrades, and the owning service translates it into a section envelope without failing the request.
- `codes.ts` is the append-only catalog of stable machine-readable error codes (`NOT_IMPLEMENTED`, `PROCESS_FORBIDDEN`, `REVIEW_TARGET_NOT_FOUND`, `ARCHIVE_DERIVATION_CONFLICT`, and the rest). Every code is exported as a constant literal and referenced by name.

When adding a new failure mode:

- Reuse an existing code if the failure semantics already match. The catalog is shared across surfaces and reviewers should grade against reuse first.
- If a new code is genuinely needed, add it to `codes.ts` and to the [Error Codes](./error-codes.md) page in the same change. Codes never change meaning once shipped.
- Throw `AppError` from the service (or a section reader's `SectionError` for composite-section failures); the route translates to HTTP status. When wrapping a lower-level error, fold the upstream message into `AppError.message` so the typed envelope reflects the underlying cause.

## Convex Functions

The Convex subtree at `convex/` carries durable state and the queries and mutations that read or write it. Domain files line up one-to-one with durable tables — `processes.ts`, `archiveEntries.ts`, `artifacts.ts`, `sourceAttachments.ts`, and so on — each exposing queries and mutations for its table alongside the validators that describe its row shape. The `_generated/` directory is regenerated by `convex dev` and is never hand-edited; it is the only Convex surface the platform app imports directly.

Each domain file is expected to:

- Export `<table>TableFields` plus the column-level validators (e.g., `v.union(...)` enums for status fields) referenced by `schema.ts`.
- Expose public `query` and `mutation` functions as the primary surface. The platform server invokes them through `makeFunctionReference<'query'|'mutation', ...>` from `platform-store.ts`, and the browser subscribes to the same public queries through the live-update channel. A subset of files (`artifacts.ts`, `derivedArchiveViews.ts`, `packageSnapshots.ts`, `packageSnapshotMembers.ts`, `processPackageContexts.ts`, `processPackageContextMembers.ts`) also exposes `internalQuery` / `internalMutation` for Convex-internal action-to-mutation composition; that surface is not the platform-server channel.
- Carry colocated tests (`*.test.ts`) and helpers (`test_helpers/fake_convex_context.ts`) inside `convex/` rather than in the top-level `tests/` tree, since they run on Convex's own test runtime.

Full table inventory, index conventions, and projection patterns live on [Convex Durable State and Projections](../current-technical-design/convex-durable-state-and-projections.md).

## Naming, Imports, and File Organization

Universal conventions across all workspaces:

- **TypeScript everywhere.** `*.ts` for Node and Convex code; `*.tsx` for any client code with JSX (none currently — the client is vanilla TypeScript over the DOM).
- **`kebab-case` filenames** in the platform app and packages. Convex domain files mirror their `camelCase` table names so the file-to-table mapping is one to one.
- **`PascalCase` for types, classes, and interfaces; `camelCase` for functions, variables, and methods.** Error-code constants in `errors/codes.ts` follow the `<lowerCamel>ErrorCode` form (e.g., `notImplementedErrorCode`); the literal value is the SCREAMING_SNAKE_CASE wire string the client sees (e.g., `NOT_IMPLEMENTED`).
- **Named exports only.** No default exports for runtime modules. Plugins (`csrfPlugin`, `vitePlugin`, `workosAuthPlugin`) are named exports of `fp(...)`.
- **Relative imports inside each workspace**, package-name imports across workspaces (`@liminal-build/markdown-package`). `tsconfig.base.json` sets `verbatimModuleSyntax` and `isolatedModules`, so type-only imports use `import type` and `.js` extensions are written explicitly on relative imports for Node ESM resolution.
- **Tests live where their runtime lives.** Platform tests live in the top-level `tests/` directory, split into `service/server/`, `service/client/`, `integration/`, `e2e/`, `fixtures/`, and `utils/`. Convex domain tests are colocated under `convex/`. The markdown package owns its tests inside `packages/markdown-package/tests/`. See [Testing and Verification](./testing-and-verification.md) for the full layout.

Where each kind of file lives:

| Kind | Location |
|-|-|
| Shared contract schemas | `apps/platform/shared/contracts/` |
| Server services | `apps/platform/server/services/<domain>/` |
| Server routes | `apps/platform/server/routes/` |
| Server route schemas | `apps/platform/server/schemas/` |
| Server plugins | `apps/platform/server/plugins/` |
| Error class and code catalog | `apps/platform/server/errors/` |
| Convex domain files | `convex/<table>.ts` |
| Convex generated bindings | `convex/_generated/` |
| Platform tests (cross-runtime) | `tests/` |
| Convex domain tests | `convex/*.test.ts` |
| Package tests | `packages/<pkg>/tests/` |

## Related

- [Conventions Home](./README.md)
- [Glossary](./glossary.md)
- [Repository Layout](./repository-layout.md)
- [Testing and Verification](./testing-and-verification.md)
- [Error Codes](./error-codes.md)
- [Shared Contracts](../current-technical-design/shared-contracts.md)
- [Server Control Plane](../current-technical-design/server-control-plane.md)
