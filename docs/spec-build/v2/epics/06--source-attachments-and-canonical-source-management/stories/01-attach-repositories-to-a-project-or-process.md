# Story 1: Attach Repositories to a Project or Process

### Summary
<!-- Jira: Summary field -->
Allow users to attach GitHub-backed repositories to a project or one process, with durable identity, scope visibility, duplicate protection, and invalid/inaccessible repository rejection.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to attach code repositories to project and process work, control how those repositories are used, and understand which canonical sources informed or received process work.
- **Context:** The user is working in a project shell or process work surface and needs to attach one or more repositories, classify them for research, review, or implementation, control whether they are writable, see whether they are `not_hydrated`, `hydrated`, `stale`, or `unavailable`, and later understand where durable code work landed.
- **Mental Model:** "This process works from named canonical sources. I can see which repositories are attached, what they are for, whether they are writable, whether they are hydrated, and which repository and ref this work came from or went back to."
- **Key Constraint:** Source management stays inside the existing project and process surfaces and keeps GitHub as canonical code truth.

**Objective**

Create the attach flow for project-scoped and process-scoped GitHub repositories.

**Scope**

In:

- Project-scoped attach route and UI action
- Process-scoped attach route and UI action
- Server-side repository identity validation and `repositoryFullName` derivation
- Exact duplicate detection by `repositoryFullName`, scope, and `targetRef`
- Process-scoped attach current-source mutation for that process
- Immediate visibility of repository identity and scope after create

Out:

- Updating source metadata after attach
- Refresh/rehydration behavior after attach
- Provenance recording
- Detach behavior
- MCP-backed or non-repository source attachment

**Dependencies**

- Story 0 shared contracts and fixtures
- GitHub repository resolver seam
- Existing project shell and process work surface
- [tech-design.md](../tech-design.md) Flow 1 and API Contracts
- [test-plan.md](../test-plan.md) Chunk 1 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-1.1:** The user can attach a GitHub-backed repository to a project or to one process.

- **TC-1.1a: Attach project-scoped repository**
  - Given: User is viewing a project shell
  - When: User attaches a repository at project scope
  - Then: The repository is attached durably to that project
- **TC-1.1b: Attach process-scoped repository**
  - Given: User is viewing one process work surface
  - When: User attaches a repository at process scope
  - Then: The repository is attached durably to that process

**AC-1.2:** The new source attachment shows its repository identity and chosen scope immediately after creation.

- **TC-1.2a: New attachment identity visible**
  - Given: A source attachment was created successfully
  - When: The current shell or process surface updates
  - Then: The repository identity and attachment scope are visible immediately

**AC-1.3:** The platform does not create a duplicate source attachment when the same repository, same scope, and same target ref are attached twice in the same context.

- **TC-1.3a: Duplicate exact attachment blocked**
  - Given: A project or process already has an attached repository with the same scope and target ref
  - When: User tries to attach the same repository again in that same context
  - Then: The platform does not create a second duplicate source attachment
- **TC-1.3b: Missing target ref still counts as a duplicate exact attachment**
  - Given: A project or process already has an attached repository with the same scope and no target ref
  - When: User tries to attach the same repository again in that same context without a target ref
  - Then: The platform does not create a second duplicate source attachment
- **TC-1.3c: Same repository may exist at both project scope and process scope**
  - Given: A project already has a project-scoped attached repository
  - When: User attaches the same repository for one process in that project
  - Then: The platform creates a separate process-scoped source attachment for that process

**AC-1.4:** Invalid or inaccessible repository attachments are rejected without creating a partial source attachment record.

- **TC-1.4a: Invalid repository identity rejected**
  - Given: User enters an invalid repository identity
  - When: User submits the attach request
  - Then: The platform rejects the request and creates no partial source attachment
- **TC-1.4b: Inaccessible repository rejected**
  - Given: User enters a repository the platform cannot currently resolve or access
  - When: User submits the attach request
  - Then: The platform rejects the request and creates no partial source attachment

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story is the Fastify entry point for the Sources domain. It owns the
authenticated attach flow, canonical GitHub repository identity validation, and
the split between project-scoped shared sources and process-scoped current
sources. Convex persists the durable row and enforces final duplicate guards;
Fastify decides scope, validates writable-ref policy, and, for process-scoped
attach, updates current process source refs immediately.

#### Routes

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Attach project source | `POST` | `/api/projects/:projectId/source-attachments` | `attachProjectSource` |
| Attach process source | `POST` | `/api/projects/:projectId/processes/:processId/source-attachments` | `attachProcessSource` |

#### Create Request

Use the Story 0 `Source Attachment Request`. Scope is determined by route. `repositoryUrl` remains the operational clone/write URL; `repositoryFullName` is canonical GitHub identity and may be derived server-side.

#### Create Response

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceAttachment` | Source Attachment Summary | yes | Newly created durable source attachment |

#### Conflict Rules

- Duplicate key is active `projectId + processId + repositoryFullName + targetRef`.
- A missing `targetRef` counts as the same missing target ref.
- Same repository/ref may exist once at project scope and once at process scope.
- `purpose` and `accessMode` are mutable metadata and are not part of the uniqueness key.
- Convex owns the final atomic duplicate guard because it persists the row.

#### Service Responsibilities

- Fastify enforces authenticated project/process access before create.
- `GitHubRepositoryResolver` validates repository existence, access, canonical full name, and target ref.
- Non-GitHub URLs are rejected in this repository-focused slice.
- Provided `repositoryFullName` must match the repository URL identity.
- `read_write` attachments require a branch-like target ref; missing writable target refs resolve to the repository default branch before persistence.
- Process-scoped attach adds the new `sourceAttachmentId` to that process's current source refs in the same orchestration path.

#### Error Responses

| Status | Code | Applies To |
|---|---|---|
| `401` | `UNAUTHENTICATED` | Missing actor |
| `403` | `PROJECT_FORBIDDEN`, `PROCESS_FORBIDDEN` | Actor lacks access |
| `404` | `PROJECT_NOT_FOUND`, `PROCESS_NOT_FOUND` | Requested context missing |
| `409` | `SOURCE_ATTACHMENT_CONFLICT` | Duplicate active row or unsafe writable-ref policy |
| `422` | `INVALID_SOURCE_ATTACHMENT` | Invalid body, source identity, or unsupported provider |
| `503` | `SOURCE_ATTACHMENT_UNAVAILABLE` | Repository cannot be accessed right now |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Attach route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Attach orchestration and identity checks | `apps/platform/server/services/sources/source-management.service.ts`, `apps/platform/server/services/sources/source-identity.service.ts`, `apps/platform/server/services/sources/github-repository-resolver.ts` |
| Durable attach and current-source mutation | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts` |
| Project/process source UI refresh | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:150), lines 150-161
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:406), lines 406-434
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:514), lines 514-553
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:37), lines 37-44

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-1.1a | `tests/service/server/source-management-api.test.ts` | creates a project-scoped source attachment |
| TC-1.1b | `tests/service/server/source-management-api.test.ts` | creates a process-scoped source attachment and makes it current |
| TC-1.2a | `tests/service/client/source-attachment-section.test.ts` | renders new source identity and scope |
| TC-1.3a | `tests/service/server/source-management-api.test.ts` | blocks duplicate exact attachment |
| TC-1.3b | `convex/sourceAttachments.test.ts` | treats missing target ref as duplicate missing target ref |
| TC-1.3c | `tests/service/server/source-management-service.test.ts` | allows same repository at project and process scope |
| TC-1.4a | `tests/service/server/source-management-api.test.ts` | rejects invalid repository identity without partial row |
| TC-1.4b | `tests/service/server/source-management-api.test.ts` | rejects inaccessible repository without partial row |

#### Non-TC Decided Tests

- `tests/service/server/source-management-service.test.ts`: derives `repositoryFullName` from GitHub URLs
- `tests/service/server/source-management-service.test.ts`: rejects mismatched `repositoryUrl` and `repositoryFullName`
- `tests/service/server/source-management-service.test.ts`: rejects non-GitHub URLs in this slice
- `tests/service/server/source-management-service.test.ts`: rejects `read_write` sources that target tags or commits
- `tests/service/server/source-management-service.test.ts`: resolves missing `targetRef` on `read_write` to the repository default branch

#### Technical Notes

- Process-scoped attach owns the atomic “create source row + add current source ref” behavior.
- Scope is route-owned, not body-owned.

#### Anti-Shim Requirements

- Verify the real Fastify boundary and the process-current-source mutation, not just durable row creation.

#### Verification

- Targeted: `pnpm run test:service`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Project and process attach routes create source attachments with route-owned scope
- Created summaries return repository URL, canonical full name, scope, purpose, access mode, target ref, and initial freshness fields
- Process-scoped attach updates that process's current source refs immediately
- Exact duplicate attach attempts do not create a second active row
- Invalid, unsupported, mismatched, or inaccessible repositories create no partial source row
- Planned tests for TC-1.1a through TC-1.4b are implemented in the files mapped by the test plan
