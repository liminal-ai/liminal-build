# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Establish the shared source-management vocabulary, contracts, durable schema seams, error codes, freshness fixtures, and provenance shapes used by all later Epic 6 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to attach code repositories to project and process work, control how those repositories are used, and understand which canonical sources informed or received process work.
- **Context:** The user is working in a project shell or process work surface and needs to attach one or more repositories, classify them for research, review, or implementation, control whether they are writable, see whether they are `not_hydrated`, `hydrated`, `stale`, or `unavailable`, and later understand where durable code work landed.
- **Mental Model:** "This process works from named canonical sources. I can see which repositories are attached, what they are for, whether they are writable, whether they are hydrated, and which repository and ref this work came from or went back to."
- **Key Constraint:** Source management stays inside the existing project and process surfaces and keeps GitHub as canonical code truth. Archive browsing, external-source attachment, and full GitHub workflow management remain out of scope.

**Objective**

Create the shared source-management foundation required by Stories 1 through 6.

**Scope**

In:

- Source attachment vocabulary for provider, purpose, access mode, scope, target ref, hydration state, freshness reason, refresh progress, and soft detach
- Repository identity vocabulary using `repositoryUrl` for clone/write operations and `repositoryFullName` for uniqueness, shadowing, conflict detection, and provenance
- Source provenance vocabulary for `informed_work` and `received_code_update`
- Shared route contracts, request/response schemas, error codes, and route constants
- Convex schema/index shape for extended `sourceAttachments` and new `sourceProvenance`
- Fixtures and helpers for duplicate detection, four-state freshness, pending refresh, soft detach, process-scoped shadowing, and degraded provenance

Out:

- Attach behavior owned by Story 1
- Metadata update behavior owned by Story 2
- Refresh and freshness behavior owned by Story 3
- Provenance recording and display behavior owned by Story 4
- Detach behavior owned by Story 5
- Reopen and degraded source-state behavior owned by Story 6

**Dependencies**

- Epic 1 project shell source summary visibility
- Epic 2 process materials visibility
- Epic 3 environment hydration and checkpoint loop for already-attached sources
- Epic 5 artifact-model alignment
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared source-management, repository identity, freshness, detach, provenance, and error vocabulary consumed by Stories 1 through 6.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Browser Routes

| Route | Description |
|---|---|
| `/projects/{projectId}` | Existing project shell showing project-scoped shared source attachments |
| `/projects/{projectId}/processes/{processId}` | Existing process work surface showing current sources after process-scoped shadowing plus source provenance |

#### Source Management Endpoints

| Operation | Method | Path |
|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` |
| Attach project-scoped source | `POST` | `/api/projects/{projectId}/source-attachments` |
| Attach process-scoped source | `POST` | `/api/projects/{projectId}/processes/{processId}/source-attachments` |
| Update source attachment | `PATCH` | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}` |
| Refresh source attachment | `POST` | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}/refresh` |
| Detach source attachment | `DELETE` | `/api/projects/{projectId}/source-attachments/{sourceAttachmentId}` |
| Get process source provenance | `GET` | `/api/projects/{projectId}/processes/{processId}/source-provenance` |

#### Source Attachment Request

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `provider` | enum | yes | `github` | Source provider for Epic 6 |
| `repositoryUrl` | string | yes | full GitHub URL, non-empty | Operational clone/write URL |
| `repositoryFullName` | string | no | `owner/name` when present | Canonical GitHub identity; may be derived from `repositoryUrl` |
| `displayName` | string | yes | non-empty | User-visible label |
| `purpose` | enum | yes | `research`, `review`, `implementation`, `other` | Why the source is attached |
| `accessMode` | enum | yes | `read_only`, `read_write` | Whether durable code work may land back in this source |
| `targetRef` | string | no | non-empty when present | Branch, tag, or commit ref |

Create scope is route-based. The request body does not override project/process scope.

#### Source Attachment Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `sourceAttachmentId` | string | yes | non-empty | Stable source attachment identifier |
| `provider` | enum | yes | `github` | Source provider |
| `repositoryUrl` | string | yes | full GitHub URL | Operational clone/write URL |
| `repositoryFullName` | string | yes | `owner/name` | Canonical GitHub identity |
| `displayName` | string | yes | non-empty | User-visible label |
| `attachmentScope` | enum | yes | `project`, `process` | Attachment scope |
| `processId` | string/null | yes | non-empty when present | Process id for process-scoped sources |
| `processDisplayLabel` | string/null | yes | non-empty when present | Process label for process-scoped sources |
| `purpose` | enum | yes | `research`, `review`, `implementation`, `other` | Durable source purpose |
| `accessMode` | enum | yes | `read_only`, `read_write` | Durable write policy |
| `targetRef` | string/null | yes | non-empty when present | Branch, tag, or commit ref |
| `hydrationState` | enum | yes | `not_hydrated`, `hydrated`, `stale`, `unavailable` | Canonical freshness state |
| `lastHydratedAt` | string/null | yes | ISO 8601 UTC when present | Most recent successful hydration time |
| `lastHydratedResolvedRef` | string/null | yes | non-empty when present | Ref resolved during last hydration |
| `lastObservedRemoteResolvedRef` | string/null | yes | non-empty when present | Most recently observed remote ref |
| `freshnessReason` | string/null | yes | non-empty when present | Reason for `stale` or `unavailable` |
| `refreshStatus` | enum | no | `idle`, `pending`, `failed` | Refresh operation metadata, not a hydration state |
| `refreshRequestedAt` | string/null | no | ISO 8601 UTC when present | Pending refresh request time |
| `detachedAt` | string/null | no | ISO 8601 UTC when present | Soft-detach time |
| `updatedAt` | string | yes | ISO 8601 UTC | Most recent durable update time |

#### Source Provenance Entry

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `provenanceId` | string | yes | non-empty | Stable provenance identifier |
| `sourceAttachmentId` | string/null | yes | non-empty when present | Related source attachment when available |
| `relationshipKind` | enum | yes | `informed_work`, `received_code_update` | Relationship to process work |
| `repositoryFullName` | string | yes | `owner/name` | Copied canonical repository identity |
| `repositoryUrl` | string | yes | full GitHub URL | Copied operational source URL |
| `targetRef` | string/null | yes | non-empty when present | Ref that informed or received work |
| `currentAttachmentDisplayName` | string/null | yes | non-empty when present | Current attachment display name when enrichment succeeds |
| `currentAttachmentScope` | enum/null | yes | `project`, `process` when present | Current attachment scope when enrichment succeeds |
| `currentAttachmentAccessMode` | enum/null | yes | `read_only`, `read_write` when present | Current attachment access mode when enrichment succeeds |
| `currentAttachmentHydrationState` | enum/null | yes | four-state hydration enum when present | Current attachment hydration state when enrichment succeeds |
| `currentAttachmentVisibility` | enum | yes | `available`, `detached`, `unavailable`, `redacted` | Current enrichment visibility |
| `entryStatus` | enum | yes | `ready`, `degraded` | Per-entry resolution status |
| `degradationReason` | string/null | yes | non-empty when degraded | Bounded degradation reason |
| `recordedAt` | string | yes | ISO 8601 UTC | Provenance record time |

#### Error Codes

| Status | Code |
|---|---|
| `401` | `UNAUTHENTICATED` |
| `403` | `PROJECT_FORBIDDEN` |
| `403` | `PROCESS_FORBIDDEN` |
| `404` | `PROJECT_NOT_FOUND` |
| `404` | `PROCESS_NOT_FOUND` |
| `404` | `SOURCE_ATTACHMENT_NOT_FOUND` |
| `409` | `SOURCE_ATTACHMENT_CONFLICT` |
| `409` | `SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE` |
| `422` | `INVALID_SOURCE_ATTACHMENT` |
| `503` | `SOURCE_ATTACHMENT_UNAVAILABLE` |

#### Implementation Targets

- `convex/schema.ts`
- `convex/sourceAttachments.ts`
- `convex/sourceProvenance.ts`
- `apps/platform/shared/contracts/source-management.ts`
- `apps/platform/server/schemas/source-management.ts`
- `apps/platform/server/routes/source-management.ts`
- `apps/platform/server/services/sources/*`
- `tests/fixtures/sources.ts`

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:228), lines 228-330
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:331), lines 331-434
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:12), lines 12-31

#### Test Mapping

None. Story 0 owns shared contracts, fixtures, and schema vocabulary rather than
Epic-owned TCs.

#### Non-TC Decided Tests

- `tests/service/client/process-live.test.ts`: source schemas accept Epic 6 fields and reject missing required identity/freshness fields

#### Technical Notes

- Keep shared source contracts and Convex schema aligned. Later stories should consume this vocabulary, not redefine it.
- Keep provenance enrichment fields separate from the durable `sourceProvenance` record shape.

#### Anti-Shim Requirements

- Validate shared contracts by actual schema parsing and fixture use, not by comments or hand-waved object shapes.

#### Verification

- Targeted: `pnpm run typecheck`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared contracts define repository identity, source attachment summaries, source provenance entries, refresh responses, detach responses, and source-management error codes
- Convex schema plans preserve source attachment durability, duplicate guards, four-state hydration, refresh progress metadata, and soft detach
- Provenance records copy immutable source identity and remain independent of current attachment lookup success
- Fixtures cover exact duplicate, missing target ref duplicate, project/process scope coexistence, process-scoped shadowing, pending refresh, soft detach, unavailable source, and degraded provenance
- Later story files and coverage can reference Story 0 without redefining shared vocabulary
