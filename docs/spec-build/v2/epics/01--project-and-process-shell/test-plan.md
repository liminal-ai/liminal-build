# Test Plan: Project and Process Shell

## Purpose

This document maps every Epic 1 test condition to a planned test file and test
approach. It follows the service-mock testing model:

- test at Fastify route entry points on the server
- test at page/router/section entry points on the client
- mock only external boundaries

The confidence chain for Epic 1 is:

```text
AC → TC → Test File / Test Name → Implementation Module
```

## Verification Tiers

| Script | Command | Notes |
|--------|---------|-------|
| `red-verify` | `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build` | No tests yet; Red tests are expected to fail |
| `verify` | `pnpm red-verify && pnpm test:service && pnpm test:client` | Main implementation gate |
| `green-verify` | `pnpm verify && pnpm guard:no-test-changes` | Green exit gate |
| `verify-all` | `pnpm verify && pnpm test:integration && pnpm test:e2e` | Deep verification; suites may initially emit `SKIP:` and pass |

## Test Layers

### Service Mock Tests

Primary TDD layer.

- `tests/service/server/*.test.ts`
- `tests/service/client/*.test.ts`

### Wide Integration Tests

Small number of deeper tests against the assembled app and a prepared durable
state environment.

- `tests/integration/platform-shell.test.ts`

### E2E

Planned but not required for the first TDD cycles. `verify-all` should already
have the script hook even if the suite initially contains only explicit
`SKIP:` placeholders.

- `tests/e2e/project-shell.spec.ts`

## Mock Boundaries

| Layer | Mock? | Notes |
|-------|-------|-------|
| WorkOS SDK and redirect/session validation calls | Yes | External auth boundary |
| Convex client wrapper in service tests | Yes | External durable-state boundary for fast service mocks |
| Browser `fetch` in client tests | Yes | API boundary for client modules |
| Fastify routes / services / summary builders | No | These are the server behavior under test |
| Client router / store / section renderers | No | These are the client behavior under test |

## Fixture Strategy

### Shared Fixtures

`tests/fixtures/projects.ts`

- owner project summary
- member project summary
- same-name different-owner project summaries
- empty project shell response
- mixed section envelope responses

`tests/fixtures/processes.ts`

- one process fixture per status: `draft`, `running`, `waiting`, `paused`,
  `completed`, `failed`, `interrupted`
- same-type process label collision fixture

`tests/fixtures/artifacts.ts`

- current version fixture
- no-current-version fixture
- process-scoped artifact fixture

`tests/fixtures/sources.ts`

- hydrated, not hydrated, stale, unavailable fixtures
- project-scoped and process-scoped source fixtures

### Test Utilities

`tests/utils/build-app.ts`

- build Fastify app with mocked WorkOS and Convex boundaries

`tests/utils/render-shell.ts`

- mount client entry points in JSDOM
- create store + router + mocked API clients

## Test File Inventory

| Test File | Layer | Primary Focus | Planned Tests |
|-----------|-------|---------------|---------------|
| `tests/service/server/auth-routes.test.ts` | Service | `/auth/me`, shell auth gating, `/auth/logout` | 8 |
| `tests/service/server/projects-api.test.ts` | Service | list accessible projects, forbidden project access | 5 |
| `tests/service/server/project-create-api.test.ts` | Service | create project write path | 2 |
| `tests/service/server/project-shell-bootstrap-api.test.ts` | Service | aggregated shell bootstrap and section envelopes | 9 |
| `tests/service/server/processes-api.test.ts` | Service | process registration write path | 10 |
| `tests/service/client/project-index-page.test.ts` | Service | index rendering, role labels, same-name context | 4 |
| `tests/service/client/create-project-modal.test.ts` | Service | project-create UX validation/cancel | 3 |
| `tests/service/client/project-router.test.ts` | Service | route parse/restore/focus behavior | 9 |
| `tests/service/client/project-shell-page.test.ts` | Service | shell-level rendering and section composition | 7 |
| `tests/service/client/process-section.test.ts` | Service | process summary rendering and return visibility | 12 |
| `tests/service/client/artifact-section.test.ts` | Service | artifact summary rendering | 5 |
| `tests/service/client/source-attachment-section.test.ts` | Service | source summary rendering | 5 |
| `tests/service/client/create-process-modal.test.ts` | Service | process-create UX | 4 |
| `tests/integration/platform-shell.test.ts` | Integration | assembled shell restart / re-entry path | 3 |

**Planned total:** 86 tests  
**TC-mapped:** 73  
**Non-TC decided tests:** 13

## TC → Test Mapping

### `tests/service/server/auth-routes.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a returns shell HTML for authenticated project route` | Valid WorkOS session, synced actor | `GET /projects` | `200` shell response |
| TC-1.1b | `TC-1.1b redirects unauthenticated project route` | No session cookie | `GET /projects` | Redirect to sign-in |
| TC-1.1c | `TC-1.1c clears invalid session and redirects` | Invalid cookie/session | `GET /projects` | Redirect and cleared cookie |
| TC-1.4a | `TC-1.4a logout invalidates session` | Valid session + CSRF/origin | `POST /auth/logout` | `204` and session cleared |
| TC-1.4b | `TC-1.4b signed-out user cannot reopen bookmarked project` | Signed-out client | `GET /projects/:projectId` | Redirect before project data |
| TC-1.4c | `TC-1.4c shell routes are blocked after logout` | Logout performed | `GET /projects` | Redirect / unauthenticated result |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `rejects logout without valid CSRF/origin` | Logout ships in Epic 1 and should not rely on happy-path assumptions only |
| `auth callback upserts actor projection before shell access` | Ensures WorkOS session material becomes app-owned actor state before project routes are used |

### `tests/service/server/projects-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.2a | `TC-1.2a returns only accessible projects` | Actor is owner/member in three projects | `GET /api/projects` | Exactly three accessible summaries returned |
| TC-1.2c | `TC-1.2c omits inaccessible projects` | One extra project exists without membership | `GET /api/projects` | Inaccessible project absent |
| TC-1.3c | `TC-1.3c blocks direct project access for unauthorized actor` | Valid actor without access | `GET /api/projects/:projectId` | `403 PROJECT_FORBIDDEN` or unavailable shell result |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `sorts project summaries by lastUpdatedAt descending` | Sort order is part of the browser-facing contract even without an explicit TC row |
| `returns empty list for actor with no project memberships` | The empty project index UI depends on the server returning a real empty list, not only the client mocking one |

### `tests/service/server/project-create-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.1a | `TC-2.1a creates project and owner membership` | Valid actor + unique name | `POST /api/projects` | `201` + shell bootstrap + owner membership persisted |
| TC-2.1d | `TC-2.1d rejects duplicate owned project name` | Existing owned project with same name | `POST /api/projects` | `409 PROJECT_NAME_CONFLICT` |

### `tests/service/server/project-shell-bootstrap-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.2a | `TC-5.2a shell loads process without active environment` | Process row with `hasEnvironment=false` | `GET /api/projects/:projectId` | Process summary still present |
| TC-5.2b | `TC-5.2b shell loads after prior environment loss` | Process exists, environment absent | `GET /api/projects/:projectId` | Durable summaries still returned |
| TC-5.2c | `TC-5.2c artifact and source summaries restore from durable state` | Stored artifacts and sources | `GET /api/projects/:projectId` | Corresponding section items returned |
| TC-6.2a | `TC-6.2a removed bookmarked project returns unavailable` | Project deleted or access revoked | `GET /api/projects/:projectId` | `404` or `403` without leaked content |
| TC-6.3a | `TC-6.3a artifact section failure does not block shell` | Artifact reader throws | `GET /api/projects/:projectId` | Artifact envelope `error`, others still present |
| TC-6.3b | `TC-6.3b source section failure does not block shell` | Source reader throws | `GET /api/projects/:projectId` | Source envelope `error`, others still present |
| TC-6.3c | `TC-6.3c process section failure does not block shell` | Process reader throws | `GET /api/projects/:projectId` | Process envelope `error`, others still present |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `returns section envelopes with stable shape across ready empty and error states` | Section envelopes are a design-critical shell contract |
| `maps reader exceptions to stable section error codes` | Client tests depend on predictable machine-readable section failures |

### `tests/service/server/processes-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1b | `TC-4.1b creates ProductDefinition process` | Valid actor + project | `POST /api/projects/:projectId/processes` | `201` with ProductDefinition process summary |
| TC-4.2a | `TC-4.2a writes generic process row and initial type state` | Valid actor + project | `POST /api/projects/:projectId/processes` | Generic row plus matching type-specific row created |
| TC-4.2b | `TC-4.2b created process does not require environment` | Valid actor + project | `POST /api/projects/:projectId/processes` | `hasEnvironment` false and summary valid |
| TC-4.2c | `TC-4.2c process is created in requested project only` | Actor can access two projects | Create in project B | No write to project A |
| TC-4.3a | `TC-4.3a different-type processes coexist` | Existing other-type process | Create second process | Both remain visible and distinct |
| TC-4.3b | `TC-4.3b same-type processes receive distinct labels` | Existing same-type process | Create second same-type process | Distinct labels returned |
| TC-4.3c | `TC-4.3c existing process associations remain unchanged` | Existing process with related summaries | Create another process | Existing process data unchanged |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `increments auto-generated label sequence without collisions` | Auto-label generation is a key design decision and deserves a defensive test |
| `creates FeatureSpecification process and seeds only the matching type-state row` | The create-process branch differs by process type and should prove the FeatureSpecification path writes only its own state table |
| `creates FeatureImplementation process and seeds only the matching type-state row` | The create-process branch differs by process type and should prove the FeatureImplementation path writes only its own state table |

### `tests/service/client/project-index-page.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.2b | `TC-1.2b renders empty state when project list is empty` | Mock `listProjects()` returns `[]` | Mount page | Empty state and create CTA visible |
| TC-1.2d | `TC-1.2d renders same-name projects with differentiating owner context` | Two same-name summaries with different owners | Mount page | Both entries distinguishable |
| TC-1.3a | `TC-1.3a shows owner role label` | Owner summary | Mount page | Owner label visible |
| TC-1.3b | `TC-1.3b shows member role label` | Member summary | Mount page | Member label visible |

### `tests/service/client/create-project-modal.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.1b | `TC-2.1b blocks submit without project name` | Modal open | Submit empty form | Validation message shown, no request |
| TC-2.1c | `TC-2.1c cancelling create-project closes modal without write` | Modal open | Click cancel | Modal closes, no API call |
| TC-6.1a | `TC-6.1a cancel project creation returns to stable index state` | Modal open on project index | Click cancel | Index remains visible and unchanged |

### `tests/service/client/project-router.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|-------|
| TC-2.2a | `TC-2.2a opening a project from index navigates to shell` | Index mounted with one project card | Click card | Route becomes `/projects/:projectId` |
| TC-2.2b | `TC-2.2b direct project URL loads shell` | Initial route `/projects/:projectId` | Bootstrap app | Shell page mounts |
| TC-2.2c | `TC-2.2c switching projects replaces shell state` | Shell for project A then navigate to B | Navigate | Project B shell replaces A |
| TC-2.3b | `TC-2.3b refresh reloads same project route` | Current shell route persisted | Simulate refresh bootstrap | Same route and shell data restored |
| TC-2.3c | `TC-2.3c browser history restores index and shell states` | Navigate index → shell → index | Popstate back/forward | Matching page restored |
| TC-4.4c | `TC-4.4c selected process focus follows route state` | Valid `processId` in query | Bootstrap shell | Focused process visually marked |
| TC-5.1a | `TC-5.1a browser reload preserves current shell route` | Project shell open | Reload bootstrap | Same shell route fetched |
| TC-6.2b | `TC-6.2b invalid process reference clears selection safely` | Route includes missing `processId` | Bootstrap shell | Banner shown and invalid selection cleared |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `uses replaceState when clearing stale processId` | Prevents back-stack churn and codifies the chosen route-healing behavior |

### `tests/service/client/project-shell-page.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.3a | `TC-2.3a renders active project identity and role` | Mock shell response | Mount shell page | Project name and role visible |
| TC-3.1a | `TC-3.1a renders populated process artifact and source sections` | Three `ready` envelopes | Mount shell page | All sections populated |
| TC-3.1b | `TC-3.1b renders empty states for empty envelopes` | Three `empty` envelopes | Mount shell page | Empty states visible |
| TC-3.1c | `TC-3.1c renders mixed ready and empty sections coherently` | One `ready`, two `empty` envelopes | Mount shell page | Mixed states visible without layout break |
| TC-4.4b | `TC-4.4b newly created process appears at top of list` | Existing list then created process inserted | Apply response update | New process renders first |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `renders shell-level request failure without mounting stale section data` | Full request failure behavior is important even though section-level failures are the epic focus |
| `clears rendered project data after logout success` | This complements the server-owned logout TC by proving the browser no longer shows stale authenticated shell content after sign out |

### `tests/service/client/process-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.2a | `TC-3.2a renders full process summary fields` | One process summary fixture | Mount section | Label, type, phase, status, updatedAt, next action visible |
| TC-3.2b | `TC-3.2b renders draft status` | Draft process fixture | Mount section | Draft wording shown |
| TC-3.2c | `TC-3.2c renders running status` | Running process fixture | Mount section | Running wording shown |
| TC-3.2d | `TC-3.2d renders waiting status and blocker` | Waiting process fixture | Mount section | Waiting state and blocker visible |
| TC-3.2e | `TC-3.2e renders paused status` | Paused process fixture | Mount section | Paused wording shown |
| TC-3.2f | `TC-3.2f renders completed status` | Completed process fixture | Mount section | Completed wording shown |
| TC-3.2g | `TC-3.2g renders failed status` | Failed process fixture | Mount section | Failed wording shown |
| TC-3.2h | `TC-3.2h renders interrupted status` | Interrupted process fixture | Mount section | Interrupted wording shown |
| TC-4.4a | `TC-4.4a renders processes in descending updated order` | Three summaries with different timestamps | Mount section | Newest first |
| TC-5.3a | `TC-5.3a interrupted process shows actionable recovery paths` | Interrupted process with available actions | Mount section | Resume/review/rehydrate/restart actions visible as applicable |
| TC-5.3b | `TC-5.3b waiting process shows blocking user action` | Waiting process with `respond` action | Mount section | Blocking action visible |
| TC-5.3c | `TC-5.3c failed process is not presented as completed` | Failed process fixture | Mount section | Failure styling and wording remain distinct |

### `tests/service/client/artifact-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.3a | `TC-3.3a shows artifact identity and current version label` | Current-version artifact | Mount section | Identity and version shown |
| TC-3.3b | `TC-3.3b shows no-current-version state` | Artifact without current version | Mount section | No-current-version label shown |
| TC-3.3c | `TC-3.3c renders multiple artifact rows` | Multiple artifact fixtures | Mount section | Separate summary rows visible |
| TC-3.3d | `TC-3.3d orders artifacts by updatedAt descending` | Different timestamps | Mount section | Newest first |
| TC-3.3e | `TC-3.3e shows process association context for process-scoped artifact` | Process-scoped artifact fixture | Mount section | Process label/context visible |

### `tests/service/client/source-attachment-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.4a | `TC-3.4a shows repository identity purpose ref and hydration state` | Source fixture with all fields | Mount section | All summary fields shown |
| TC-3.4b | `TC-3.4b shows not-hydrated state` | Not-hydrated source fixture | Mount section | Not-hydrated indicator visible |
| TC-3.4c | `TC-3.4c shows stale source state` | Stale source fixture | Mount section | Stale indicator visible |
| TC-3.4d | `TC-3.4d orders source attachments by updatedAt descending` | Multiple source fixtures | Mount section | Newest first |
| TC-3.4e | `TC-3.4e shows process association context for process-scoped source` | Process-scoped source fixture | Mount section | Process label/context visible |

### `tests/service/client/create-process-modal.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1a | `TC-4.1a shows supported process types only` | Open modal | Inspect type list | Three supported types visible |
| TC-4.1c | `TC-4.1c hides unsupported process types` | Open modal | Inspect type list | No unsupported types present |
| TC-4.2d | `TC-4.2d omits manual name field from process creation` | Open modal | Inspect form | No manual name input rendered |
| TC-6.1b | `TC-6.1b cancel process creation returns to stable shell` | Open modal on shell page | Click cancel | Modal closes, no API call |

### `tests/integration/platform-shell.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1b | `TC-5.1b user can return later and reopen prior project with durable state intact` | Seed project, sign in again in fresh session | Open prior route | Shell renders with durable state |
| TC-5.1c | `TC-5.1c shell data survives application server restart` | Seed durable state, restart Fastify, reopen project | Open same route after restart | Same durable shell data returns |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `serves built shell through Fastify after production build` | Verifies the Fastify + Vite integration path beyond pure route logic |

## Chunk Breakdown and Test Counts

### Chunk 0: Infrastructure

**Scope:** Workspace scaffolding, shared contracts, Convex schema skeleton,
setup notes/checklists, verification scripts, test fixtures, test utilities.

**TC tests:** 0  
**Non-TC tests:** 0  
**Exit criteria:** `pnpm typecheck` and `pnpm build` succeed with scaffolding in
place.

### Chunk 1: Authenticated Project Entry

**Scope:** Auth gating, actor bootstrap, project index access, sign out.
**ACs:** AC-1.1 to AC-1.4
**TC tests:** 13
**Non-TC tests:** 4
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q3, Q7;
`tech-design-server.md` §Flow 1: Authenticated Shell Entry and Sign Out;
`tech-design-client.md` §Flow 1: Bootstrap, Auth Resolution, and Sign Out;
`tech-design-client.md` §Flow 2: Project Index and Project Creation;
`test-plan.md` §tests/service/server/projects-api.test.ts;
`test-plan.md` §tests/service/client/project-shell-page.test.ts

### Chunk 2: Project Creation and Open

**Scope:** Create project, open project shell, route restoration for project
entry.
**ACs:** AC-2.1 to AC-2.3, AC-6.1a
**TC tests:** 11
**Non-TC tests:** 1
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q4;
`tech-design-server.md` §Flow 2: Project Create and Project Index Read;
`tech-design-client.md` §Flow 2: Project Index and Project Creation;
`tech-design-client.md` §Flow 3: Project Shell Render with Section Envelopes;
`test-plan.md` §tests/service/server/projects-api.test.ts;
`test-plan.md` §tests/service/client/project-shell-page.test.ts

### Chunk 3: Project Shell Summaries

**Scope:** Aggregated shell bootstrap, section envelopes, process/artifact/source
summary rendering, partial section failures.
**ACs:** AC-3.1 to AC-3.4, AC-6.3
**TC tests:** 24
**Non-TC tests:** 3
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q1, Q5, Q6;
`tech-design-server.md` §Flow 3: Aggregated Project Shell Bootstrap;
`tech-design-client.md` §Flow 3: Project Shell Render with Section Envelopes

### Chunk 4: Process Registration in a Project

**Scope:** Process creation, auto labels, process list update and ordering.
**ACs:** AC-4.1 to AC-4.4, AC-6.1b
**TC tests:** 14
**Non-TC tests:** 3
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q2, Q6;
`tech-design-server.md` §Flow 4: Process Registration and Auto Labeling;
`tech-design-client.md` §Flow 4: Process Focus, Create Process, and Return Visibility;
`test-plan.md` §tests/service/server/processes-api.test.ts

### Chunk 5: Return and Recovery Visibility

**Scope:** Reload, re-entry, unavailable states, interrupted/waiting/failed
summary visibility.
**ACs:** AC-5.1 to AC-5.3, AC-6.2
**TC tests:** 11
**Non-TC tests:** 2
**Relevant docs:** `tech-design.md` §Tech Design Question Answers > Q4, Q6;
§External Contracts > Request-Level Error Contracts, Section-Level Error Contracts;
`tech-design-server.md` §Flow 5: Unavailable and Recovery Semantics;
`tech-design-client.md` §Router and §Flow 4: Process Focus, Create Process, and Return Visibility

**Running total:** 86 tests

## Manual Verification Checklist

1. Start local Convex and Fastify/Vite dev server.
2. Sign in through the local WorkOS environment.
3. Confirm `/projects` shows only accessible projects.
4. Create a project and verify the shell opens immediately.
5. Create at least two processes, including two of the same type.
6. Confirm process labels are distinct and newest-first ordering holds.
7. Seed one artifact and one source attachment as project-scoped and one each as
   process-scoped; verify summary context is visible.
8. Force one section reader into an error state and confirm the other sections
   still render.
9. Reload `/projects/:projectId?processId=...` and confirm the shell restores.
10. Use a stale `processId` in the URL and confirm the shell clears it and shows
   a banner.
11. Sign out from the shell and verify bookmarked project URLs require sign-in
   again.
