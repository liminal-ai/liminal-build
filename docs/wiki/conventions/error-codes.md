# Error Codes

The platform throws typed errors with stable machine-readable codes from services and routes, then translates them into HTTP responses through Fastify's error pipeline. `AppError` carries a code, a status code, and a message; `SectionError` carries a code and message for shell and surface envelopes that degrade independently of the rest of the response. The catalog below is current-state, populated from `apps/platform/server/errors/codes.ts`, the wire enum and HTTP-status mapping in `apps/platform/shared/contracts/schemas.ts`, and the literal codes thrown by route and service code. The shape of the surrounding pattern — how errors are constructed, where they are caught, how they translate to HTTP — is documented in [Coding Patterns and Service Shape](./coding-patterns-and-service-shape.md).

## Catalog Format

Codes are grouped by the domain prefix they share. Each row carries the wire code, a one-clause meaning, and one short pointer to the file that throws it; HTTP status is taken from the wire-status mapping in `shared/contracts/schemas.ts` and listed in the section heading's framing paragraph rather than per row.

A code only appears here when it appears in live code. If a row seems missing, verify against `apps/platform/server/errors/codes.ts`, the `requestErrorCodeSchema` enum and `requestErrorStatusByCode` table in `apps/platform/shared/contracts/schemas.ts`, and literal `code:` strings under `apps/platform/server/routes/` and `apps/platform/server/services/` before adding anything.

## Projects

Project-scoped access, naming, and creation errors. Surfaced from the project routes and the project-access and project-create services. Statuses: `403` for forbidden, `404` for not-found, `409` for name conflict, `422` for validation.

| Code | Meaning | Thrown By |
|-|-|-|
| `PROJECT_FORBIDDEN` | Caller is authenticated but not a member of the project. | `services/projects/project-access.service.ts`, `routes/projects.ts`, `routes/source-management.ts` |
| `PROJECT_NOT_FOUND` | Project id does not resolve, or is not visible to the caller. | `services/projects/project-access.service.ts`, `routes/projects.ts`, `routes/source-management.ts` |
| `PROJECT_NAME_CONFLICT` | Requested project name collides with another project owned by the caller. | `services/projects/project-create.service.ts` |
| `INVALID_PROJECT_NAME` | Requested project name fails the project-name validation rules. | `services/projects/project-create.service.ts` |

## Processes

Process-scoped access, type validation, action availability, and response validation. Most rows originate in the process services; `PROCESS_FORBIDDEN` is raised at the route layer when source-management endpoints reject a process the caller cannot reach. Statuses: `403` for forbidden, `404` for not-found, `409` for action-not-available, `422` for validation, `500` for action-failed.

| Code | Meaning | Thrown By |
|-|-|-|
| `PROCESS_FORBIDDEN` | Caller cannot operate on the named process within this project. | `routes/source-management.ts` |
| `PROCESS_NOT_FOUND` | Process id does not resolve within the project. | `services/processes/process-access.service.ts`, `routes/source-management.ts` |
| `INVALID_PROCESS_TYPE` | Requested `processType` is not a supported kind. | `services/projects/process-registration.service.ts` |
| `PROCESS_ACTION_NOT_AVAILABLE` | Action is not currently offered by the process in its present status. | `services/processes/process-resume.service.ts`, `services/processes/process-start.service.ts`, `services/processes/process-response.service.ts`, `services/processes/environment/process-environment.service.ts` |
| `PROCESS_ACTION_FAILED` | Action was offered but failed during dispatch. | `services/processes/process-response.service.ts` |
| `INVALID_PROCESS_RESPONSE` | Respond payload failed validation against the prompt's expected shape. | `services/processes/process-response.service.ts` |

## Environments and Runtime

Environment hydration, prerequisite checking, and provider-adapter resolution. Raised from the process-environment service and the provider-adapter registry. Statuses: `409` for not-recoverable, `422` for prerequisite-missing, `503` for unavailable.

| Code | Meaning | Thrown By |
|-|-|-|
| `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Required attached source or configuration is absent before hydration can proceed. | `services/processes/environment/process-environment.service.ts` |
| `PROCESS_ENVIRONMENT_UNAVAILABLE` | Environment cannot be acquired right now; retry is reasonable. | `services/processes/environment/process-environment.service.ts` |
| `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | Environment has reached a terminal failure state and will not recover without intervention. | `services/processes/environment/process-environment.service.ts` |
| `PROVIDER_KIND_NOT_REGISTERED` | Process declares an environment-provider kind that is not registered in the runtime. | `services/processes/environment/provider-adapter-registry.ts` |

## Artifacts

Artifact-version lookup errors raised by the review workspace and artifact-review services. Status: `404`.

| Code | Meaning | Thrown By |
|-|-|-|
| `ARTIFACT_VERSION_NOT_FOUND` | Requested artifact version id does not resolve, or is not visible to the caller. | `services/review/artifact-review.service.ts` |

## Sources

Source-attachment lifecycle and refresh errors raised by the source-management and source-refresh services. Statuses: `404` for not-found, `409` for conflict and refresh-not-available, `422` for invalid-attachment, `503` for unavailable.

| Code | Meaning | Thrown By |
|-|-|-|
| `SOURCE_ATTACHMENT_NOT_FOUND` | Source-attachment id does not resolve within the project or process. | `services/sources/source-management.service.ts`, `services/sources/source-refresh.service.ts` |
| `SOURCE_ATTACHMENT_CONFLICT` | Requested change collides with an existing attachment (duplicate target, scope mismatch, or contradictory state). | `services/sources/source-management.service.ts` |
| `SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE` | Attachment cannot be refreshed in its current state, or a refresh is already in progress. | `services/sources/source-refresh.service.ts` |
| `INVALID_SOURCE_ATTACHMENT` | Attachment input failed validation against repository, target-ref, or purpose rules. | `services/sources/source-management.service.ts` |
| `SOURCE_ATTACHMENT_UNAVAILABLE` | Attachment exists but cannot currently be read (provider outage, redaction, missing credentials). | `services/sources/source-management.service.ts` |

## Archive

Archive read and turn-derivation errors raised by the archive services. The derivation-conflict code signals that two callers tried to mutate the same derivation key concurrently. Statuses: `409` for derivation conflict, `422` for invalid request.

| Code | Meaning | Thrown By |
|-|-|-|
| `ARCHIVE_DERIVATION_CONFLICT` | Concurrent derivation attempt detected for the same archive view; retry against the latest pointer. | `services/archive/derived-archive-view.service.ts` |
| `INVALID_ARCHIVE_REQUEST` | Archive read or rebuild request failed shape validation (limit out of range, malformed cursor, unknown view). | `services/archive/archive-read.service.ts`, `services/archive/turn-derivation.service.ts`, `services/archive/derived-archive-view.service.ts` |

## Review and Package

Review-target resolution, package-membership checks, render failures, and export errors. Some codes are request-level (raised from `AppError` and surfaced as HTTP responses); others are embedded in `reviewTargetErrorSchema` payloads inside review-workspace responses for surfaces that present errors inline. Statuses: `404` for not-found and member-unavailable, `409` for member-not-allowed and export-not-available, `503` for export-failed; render and unsupported codes are inline payload codes without a request-level status.

| Code | Meaning | Thrown By |
|-|-|-|
| `REVIEW_TARGET_NOT_FOUND` | Review-target id does not resolve, or its referenced artifact version is gone. | `services/review/export.service.ts`, `services/review/review-workspace.service.ts`, `routes/review.ts` |
| `REVIEW_TARGET_UNSUPPORTED` | Target kind is recognised but no review surface is implemented for it. | `services/review/package-review.service.ts`, `services/review/artifact-review.service.ts` |
| `REVIEW_RENDER_FAILED` | Markdown or Mermaid rendering threw while preparing the review payload. | `services/review/artifact-review.service.ts`, `services/rendering/markdown-renderer.service.ts` |
| `PACKAGE_MEMBER_UNAVAILABLE` | Requested package-member artifact is not present in the package, or is not yet ready. | `services/review/package-review.service.ts`, `routes/review.ts` |
| `PACKAGE_MEMBER_NOT_ALLOWED` | Package-member request fails the allow-list check applied at review and export time. | declared in `errors/codes.ts` and `shared/contracts/schemas.ts`; no current server throw site |
| `REVIEW_EXPORT_NOT_AVAILABLE` | Export cannot run because the package or its members are not in an exportable state. | `services/review/export.service.ts` |
| `REVIEW_EXPORT_FAILED` | Export ran but the underlying writer (signed URL, provider client) failed. | `services/review/export.service.ts`, `routes/review.ts` |

## Cross-Cutting and Auth

Authentication, validation envelopes that wrap section payloads, and the generic catch-alls used by the global Fastify error handler. Section-envelope codes appear inline inside shell and surface payloads when one section fails while siblings succeed; they are not request-level errors. Statuses: `401` for `UNAUTHENTICATED`, `501` for `NOT_IMPLEMENTED`, `503` for `PROCESS_LIVE_UPDATES_UNAVAILABLE`. The typed rows below all participate in `requestErrorCodeSchema` and the wire-status mapping; `INTERNAL_SERVER_ERROR` is described separately under "Untyped Fallback" because it is the server-side fallback constant for unexpected throwables and does not ride in `requestErrorCodeSchema`.

| Code | Meaning | Thrown By |
|-|-|-|
| `UNAUTHENTICATED` | No authenticated actor is bound to the request. | All `routes/*.ts` (preflight check before service dispatch) |
| `NOT_IMPLEMENTED` | Code path is wired but its implementation is still a skeleton stub. | `services/processes/process-module-registry.ts`, `services/processes/process-work-surface.service.ts` |
| `PROCESS_LIVE_UPDATES_UNAVAILABLE` | Live-update channel is not available; client falls back to polling. | declared in `shared/contracts/schemas.ts` and `shared/contracts/process-work-surface.ts`; emitted by the client live-status path, not thrown server-side |
| `PROJECT_SHELL_PROCESSES_LOAD_FAILED` | Project-shell processes section failed to load while the rest of the shell succeeded. | `services/projects/project-shell.service.ts`, projected through `projectShellResponseSchema` |
| `PROJECT_SHELL_ARTIFACTS_LOAD_FAILED` | Project-shell artifacts section failed to load while the rest of the shell succeeded. | `services/projects/project-shell.service.ts`, projected through `projectShellResponseSchema` |
| `PROJECT_SHELL_SOURCES_LOAD_FAILED` | Project-shell sources section failed to load while the rest of the shell succeeded. | `services/projects/project-shell.service.ts`, projected through `projectShellResponseSchema` |
| `PROCESS_SURFACE_HISTORY_LOAD_FAILED` | Work-surface history section failed to load while the rest of the surface succeeded. | `services/processes/process-work-surface.service.ts` |
| `PROCESS_SURFACE_MATERIALS_LOAD_FAILED` | Work-surface materials section failed to load while the rest of the surface succeeded. | `services/processes/process-work-surface.service.ts` |
| `PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED` | Work-surface side-work section failed to load while the rest of the surface succeeded. | `services/processes/process-work-surface.service.ts` |

### Section-Envelope Code Family

Aggregator endpoints (the project shell, the process work surface) compose section envelopes whose `status` enum is `'ready' | 'empty' | 'error'`; when one section reader fails while siblings succeed, the envelope flips to `status: 'error'` and carries an inline code in a stable `<SURFACE>_<SECTION>_LOAD_FAILED` shape. These codes ride inside successful 200 responses, so the whole-request itself succeeds, and they are intentionally absent from `requestErrorCodeSchema` and the wire-status mapping. The underlying concept is the [Section-Envelope Graceful Degradation](../current-technical-architecture/cross-cutting-decisions.md#section-envelope-graceful-degradation) rule; this subsection is the code-family operationalization.

Current families:

- **Project Shell** (`projectShellResponseSchema`, three sections) — `PROJECT_SHELL_PROCESSES_LOAD_FAILED`, `PROJECT_SHELL_ARTIFACTS_LOAD_FAILED`, `PROJECT_SHELL_SOURCES_LOAD_FAILED`.
- **Process Work Surface** (`processWorkSurfaceResponseSchema`, three sections) — `PROCESS_SURFACE_HISTORY_LOAD_FAILED`, `PROCESS_SURFACE_MATERIALS_LOAD_FAILED`, `PROCESS_SURFACE_SIDE_WORK_LOAD_FAILED`. The work surface's environment section is a deliberate asymmetry: it degrades through `EnvironmentSummary` with `state: 'unavailable'` (a value of `environmentStateSchema`), not through a section envelope's `'error'` status, so there is no `PROCESS_SURFACE_ENVIRONMENT_LOAD_FAILED` code in this family.

When introducing a new aggregator endpoint, prefer following the same `<SURFACE>_<SECTION>_LOAD_FAILED` shape and surfacing inline section codes through the envelope rather than failing the whole request — it keeps sibling sections readable and keeps the typed `requestErrorCodeSchema` focused on request-level conditions.

### Untyped Fallback

`INTERNAL_SERVER_ERROR` is a server-side fallback constant for unexpected throwables that bubble past every domain handler; it is not a typed wire-level code. It is not listed in `requestErrorCodeSchema` and has no entry in the wire-status mapping, so the global error hook in `server/app.ts` returns `{ code, message }` without the typed `status` field that typed request errors carry. Treat it as the catch-all that signals "no domain code applied" rather than as a peer of the codes above.

## Code Naming and Lifecycle

Codes follow a small set of conventions so clients can depend on them and new conditions are added deliberately.

- Codes are uppercase, underscored, and prefixed with their domain (e.g., `PROCESS_FORBIDDEN`, `SOURCE_ATTACHMENT_CONFLICT`).
- Wire-level codes are append-only once shipped — clients depend on them programmatically, so renames are avoided and codes that no longer have a throw site are kept until clients no longer reference them.
- A new code is added when a condition has materially different recovery behaviour; cosmetic distinctions reuse an existing code.
- HTTP status mapping lives in the wire contract (`requestErrorStatusByCode` in `shared/contracts/schemas.ts`), not on the error class itself, so request-level codes have a single canonical status.
- `AppError` and `SectionError` carry `code`, `message`, and (where typed) `statusCode`; they do not chain an originating error through a `cause` field, so underlying errors are best logged or captured at the throw site when context preservation matters. Stack traces are not trimmed in development, and the global Fastify error hook is the only place where an unmapped throwable becomes `INTERNAL_SERVER_ERROR`.
- Section-envelope codes (`*_LOAD_FAILED`) are scoped to the surface that emits them; they are not part of `requestErrorCodeSchema` because they ride inside successful HTTP responses whose siblings succeeded.

## Related

- [Conventions Home](./README.md)
- [Coding Patterns and Service Shape](./coding-patterns-and-service-shape.md)
- [Server Control Plane](../current-technical-design/server-control-plane.md)
- [Process Domain](../current-technical-design/process-domain.md)
- [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md)
- [Source Management Domain](../current-technical-design/source-management-domain.md)
- [Archive and Derived Views](../current-technical-design/archive-and-derived-views.md)
- [Review, Package and Export](../current-technical-design/review-package-and-export.md)
