# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->

Create the shared authenticated-shell contracts, route state, fixtures, unavailable-state handling, and test helpers used by Stories 1-5.

### Description
<!-- Jira: Description field -->

**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to run high-quality crafted processes through one durable project surface instead of manually stitching together prompts, tools, documents, and environments.
- **Context:** The user is starting or resuming work inside a concrete project. They need one durable container that holds processes, artifacts, and source attachments before deeper process-specific behavior begins.
- **Mental Model:** "I have a project. Inside that project I run one or more processes. The platform should show me my projects, let me open the right one, and keep each process separate."
- **Key Constraint:** The platform must preserve durable project and process state without flattening work into a generic chat thread or treating a sandbox filesystem as the source of truth.

**Objective**

Create the shared infrastructure that later stories depend on: route and state contracts for the authenticated shell, common summary shapes, section-envelope handling, owner/member access fixtures, unavailable-state scaffolding, and test helpers.

**Scope**

**In Scope**

- Shared route and state types for project index, project shell, and selected-process route state
- Shared contract models for bootstrap auth state, logout transport, project summaries, section envelopes, summary entities, and common error responses
- Zod-authored shared contract schemas and Fastify type-provider scaffolding for Epic 1 route validation and serialization
- Auth-protected shell bootstrap scaffolding used by entry and project-open stories
- Convex schema skeleton and minimum indexes required by Epic 1 shell reads and writes
- Fixtures and test helpers for owner/member/inaccessible states, same-name projects, empty shell sections, and section-level failures
- Shared unavailable-state rendering primitives used when access is denied or a project/process is missing
- Setup notes/checklists for high-touch first-time local environment bootstrap, including local Convex, WorkOS CLI, callback/origin, and secret bootstrap coordination points

**Out of Scope**

- End-user project entry behavior beyond the scaffolding required to support it
- User-facing project creation behavior
- User-facing summary rendering behavior
- User-facing process creation behavior
- Return/recovery status behavior

**Dependencies**

- Detailed epic: `epic.md`
- Story 1 depends on the shared auth/session and project-index foundations from this story
- Story 2 depends on shared route state and project-shell bootstrap primitives from this story
- Story 3 depends on shared section-envelope and summary contract models from this story
- Story 4 depends on shared process-summary contract models from this story
- Story 5 depends on shared unavailable-state and durable-state fixture coverage from this story

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->

This story owns no direct functional ACs from the detailed epic. It is complete when the shared infrastructure below exists for downstream stories.

- Shared route and state models exist for:
  - authenticated project entry
  - project index navigation
  - project shell navigation
  - selected process derived from browser route state
- Shared contract models exist for:
  - `ShellBootstrapPayload`
  - `Authenticated User Response`
  - `Project Summary Response`
  - `Project Shell Response`
  - `Project Shell Section Envelope`
  - `Section Error`
  - `Process Summary`
  - `Artifact Summary`
  - `Source Attachment Summary`
  - common error response codes used across Epic 1
- Shared contract schemas are authored once in Zod and exported as both runtime validators and inferred TypeScript types
- Shared fixtures and test helpers exist for:
  - owner and member access
  - inaccessible projects
  - same-name project differentiation
  - empty, ready, and error section envelopes
  - processes with draft, running, waiting, paused, completed, failed, and interrupted statuses
- Shared unavailable-state handling exists for:
  - forbidden project access
  - missing project access
  - missing process selection inside an otherwise accessible project
- Setup notes/checklists exist for:
  - local Convex first-time bootstrap
  - WorkOS CLI configuration and callback/origin setup
  - environment secret provisioning needed before local verification succeeds

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->

Carry the common Epic 1 shell contracts into shared types and fixtures used by later stories.

Story 0 should establish the contract-authoring pattern, not leave it implicit:

- shared browser/server contracts are authored as Zod schemas first
- inferred TypeScript types are exported from those schemas
- Fastify route scaffolding uses `fastify-type-provider-zod`
- provider typing is re-applied at plugin/route scope so Fastify encapsulation
  does not silently drop route inference

#### Shared Endpoints Catalog

| Operation | Method | Path | Description |
|-----------|--------|------|-------------|
| Get authenticated user | GET | `/auth/me` | Returns the current authenticated user or 401 if not authenticated |
| Sign out authenticated user | POST | `/auth/logout` | Ends the current authenticated session and returns the browser to a signed-out state |
| List accessible projects | GET | `/api/projects` | Returns the projects the current user can access |
| Create project | POST | `/api/projects` | Creates a project owned by the current user |
| Get project shell data | GET | `/api/projects/{projectId}` | Returns project identity plus project shell summaries |
| Create process in project | POST | `/api/projects/{projectId}/processes` | Creates a new process inside the current project |

#### Shared Contract Shapes

| Contract | Core Fields |
|----------|-------------|
| ShellBootstrapPayload | `actor`, `pathname`, `search`, `csrfToken`, `auth.loginPath`, `auth.logoutPath` |
| Authenticated User Response | `user.id`, `user.email`, `user.displayName` |
| Project Summary Response | `projectId`, `name`, `ownerDisplayName`, `role`, `processCount`, `artifactCount`, `sourceAttachmentCount`, `lastUpdatedAt` |
| Project Shell Section Envelope | `status`, `items`, `error` |
| Section Error | `code`, `message` |
| Process Summary | `processId`, `displayLabel`, `processType`, `status`, `phaseLabel`, `nextActionLabel`, `availableActions`, `hasEnvironment`, `updatedAt` |
| Artifact Summary | `artifactId`, `displayName`, `currentVersionLabel`, `attachmentScope`, `processId`, `processDisplayLabel`, `updatedAt` |
| Source Attachment Summary | `sourceAttachmentId`, `displayName`, `purpose`, `targetRef`, `hydrationState`, `attachmentScope`, `processId`, `processDisplayLabel`, `updatedAt` |

#### Shared Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | User is not authenticated |
| 403 | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| 404 | `PROJECT_NOT_FOUND` | Requested project does not exist |
| 409 | `PROJECT_NAME_CONFLICT` | User already owns a project with the requested name |
| 422 | `INVALID_PROJECT_NAME` | Project create request is missing a valid name |
| 422 | `INVALID_PROCESS_TYPE` | Process create request does not specify a supported process type |

In Epic 1, a missing selected `processId` inside the project shell route is
handled inside the successful shell bootstrap response and route-healing logic.
It does not produce a request-level `PROCESS_NOT_FOUND` API error.

#### Shared Logout Request Contract

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `X-CSRF-Token` header | string | yes | Browser returns the shell bootstrap CSRF token on `POST /auth/logout` |
| request origin context | browser request metadata | yes | Logout request must come from a valid browser origin context rather than an arbitrary cross-site POST |

`csrfToken` is generated during shell HTML delivery and injected into `window.__SHELL_BOOTSTRAP__`. Story 1 consumes that token when it calls `POST /auth/logout`. The Story 0 scaffolding should assume Fastify-native CSRF handling through `@fastify/csrf-protection` plus `@fastify/cookie`, not an Express-oriented CSRF utility.

#### Shared Durable-State Baseline

Chunk 0 provides the baseline Convex schema and minimum indexes needed by later stories.

**Tables**

- `users`
- `projects`
- `projectMembers`
- `processes`
- `processProductDefinitionStates`
- `processFeatureSpecificationStates`
- `processFeatureImplementationStates`
- `artifacts`
- `sourceAttachments`

**Minimum indexes**

- `users` by `workosUserId`
- `projects` by `ownerUserId` and by `lastUpdatedAt`
- `projectMembers` by `projectId` and by `userId`
- `processes` by `projectId` and `updatedAt`
- `artifacts` by `projectId` and `updatedAt`
- `sourceAttachments` by `projectId` and `updatedAt`

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->

- [ ] Shared shell route/state types are available to Stories 1-5
- [ ] Shared contract models match the updated detailed epic
- [ ] Shared contract schemas establish the Zod-first validation and typing pattern for later routes
- [ ] Shared bootstrap auth state and logout CSRF transport are available to Story 1
- [ ] Baseline Convex schema skeleton and minimum indexes are available to later stories
- [ ] Shared fixtures cover owner/member/inaccessible, empty/ready/error section states, and process status variants
- [ ] Unavailable-state scaffolding exists for forbidden and missing project/process cases
- [ ] Test helpers are in place so later stories can implement epic TCs without re-creating shared setup
- [ ] Setup notes/checklists cover human-assisted local Convex, WorkOS CLI, callback/origin, and secret provisioning steps
- [ ] Story 0 handoff confirms local prerequisites are configured enough for downstream `pnpm typecheck` and `pnpm build`
- [ ] Story 0 includes setup notes/checklists for the manual or human-assisted first-time local bootstrap steps
