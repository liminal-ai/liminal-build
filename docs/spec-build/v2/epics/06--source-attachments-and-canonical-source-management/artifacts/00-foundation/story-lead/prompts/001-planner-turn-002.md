# Story Lead Base Prompt

## Role Charter
You are the story lead for `00-foundation` on durable story run `00-foundation-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 2.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/00-foundation.md
Bytes: 12056

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


### Test Plan
### test-plan
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md
Bytes: 12669

# Test Plan: Epic 6 Source Attachments and Canonical Source Management

## Purpose

This test plan maps every Epic 6 test condition to planned tests. It follows
the service-mock strategy: test at Fastify route/service, Convex function, and
client rendering boundaries while mocking only external systems such as GitHub,
environment providers, and configuration.

Related design: `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md`

## Test Strategy

### Test Layers

| Layer | Files | Purpose |
|-------|-------|---------|
| Convex service tests | `convex/sourceAttachments.test.ts`, `convex/sourceProvenance.test.ts` | Durable schema/function invariants, duplicate checks, soft detach, provenance persistence |
| Fastify service/API tests | `tests/service/server/source-management-api.test.ts`, `tests/service/server/source-management-service.test.ts`, `tests/service/server/process-work-surface-api.test.ts` | Auth/access, routes, request/response contracts, source policy, refresh, degraded states |
| Client service tests | `tests/service/client/source-management-ui.test.ts`, `tests/service/client/source-attachment-section.test.ts`, `tests/service/client/process-materials-section.test.ts`, `tests/service/client/source-provenance-section.test.ts` | User-visible source state, controls, provenance, detach, and degraded states |
| Existing environment tests | `tests/service/server/process-execution-orchestrator.test.ts`, provider adapter tests | Ensure source hydration/checkpoint consumers still work with expanded source contracts |

### Mock Boundaries

| Boundary | Mock? | Notes |
|----------|-------|-------|
| GitHub repository/ref lookup | Yes | Mock `GitHubRepositoryResolver`; no live GitHub calls in service tests |
| Environment provider refresh/hydration | Yes | Mock provider/service outcomes for pending, settled, failed |
| Convex in Fastify route tests | Existing fake/in-memory PlatformStore pattern | Route tests should exercise Fastify services without live Convex |
| Fastify source services in client tests | Mock API layer/fetch only | Do not mock UI components under test |
| Internal source policy helpers | No | Exercise through service or route tests |

## TC to Test Mapping

| TC | Test File | Test Description | Coverage Notes |
|----|-----------|------------------|----------------|
| TC-1.1a | `tests/service/server/source-management-api.test.ts` | `TC-1.1a creates a project-scoped source attachment` | POST project route returns 201 summary |
| TC-1.1b | `tests/service/server/source-management-api.test.ts` | `TC-1.1b creates a process-scoped source attachment and makes it current for that process` | POST process route enforces process access, scope, and current-source mutation |
| TC-1.2a | `tests/service/client/source-attachment-section.test.ts` | `TC-1.2a renders new source identity and scope` | Verifies repository identity, target ref, purpose, access mode |
| TC-1.3a | `tests/service/server/source-management-api.test.ts` | `TC-1.3a blocks duplicate exact attachment` | Expects `SOURCE_ATTACHMENT_CONFLICT` |
| TC-1.3b | `convex/sourceAttachments.test.ts` | `TC-1.3b treats missing target ref as duplicate missing target ref` | Durable duplicate invariant |
| TC-1.3c | `tests/service/server/source-management-service.test.ts` | `TC-1.3c allows same repository at project and process scope` | Confirms independent scopes |
| TC-1.4a | `tests/service/server/source-management-api.test.ts` | `TC-1.4a rejects invalid repository identity without partial row` | Mock resolver returns invalid; store unchanged |
| TC-1.4b | `tests/service/server/source-management-api.test.ts` | `TC-1.4b rejects inaccessible repository without partial row` | Mock resolver returns inaccessible; 503 |
| TC-2.1a | `tests/service/client/source-attachment-section.test.ts` | `TC-2.1a displays purpose access mode and target ref` | Project shell and process summary contract |
| TC-2.2a | `tests/service/server/source-management-api.test.ts` | `TC-2.2a updates source metadata` | PATCH route returns updated summary |
| TC-2.3a | `tests/service/client/process-materials-section.test.ts` | `TC-2.3a identifies read-only source` | Uses visible text and data attribute |
| TC-2.3b | `tests/service/client/process-materials-section.test.ts` | `TC-2.3b identifies writable source` | Uses visible text and data attribute |
| TC-2.4a | `convex/sourceAttachments.test.ts` | `TC-2.4a target-ref change marks hydrated source stale` | Checks `hydrationState` and `freshnessReason` |
| TC-3.1a | `tests/service/client/source-management-ui.test.ts` | `TC-3.1a renders all hydration and freshness states` | Covers four canonical states |
| TC-3.2a | `tests/service/client/source-management-ui.test.ts` | `TC-3.2a shows refresh action for stale source` | UI action visible |
| TC-3.2b | `tests/service/client/source-management-ui.test.ts` | `TC-3.2b does not offer recovery for unavailable source` | UI action absent |
| TC-3.2c | `tests/service/client/source-management-ui.test.ts` | `TC-3.2c shows hydration action for not hydrated source` | UI action visible |
| TC-3.3a | `tests/service/server/source-management-api.test.ts` | `TC-3.3a refresh updates one source in place` | Response returns settled source summary |
| TC-3.3b | `tests/service/client/source-management-ui.test.ts` | `TC-3.3b shows refresh progress while pending` | Pending state visible without fifth hydration state |
| TC-4.1a | `tests/service/server/source-management-api.test.ts` | `TC-4.1a returns informing source provenance` | GET process provenance includes `informed_work` |
| TC-4.1b | `tests/service/client/source-provenance-section.test.ts` | `TC-4.1b renders empty provenance state` | Empty state visible |
| TC-4.2a | `tests/service/server/source-management-api.test.ts` | `TC-4.2a returns receiving source provenance` | GET process provenance includes `received_code_update` |
| TC-4.3a | `tests/service/server/source-management-service.test.ts` | `TC-4.3a read-only source not recorded as write target` | Provenance service rejects/omits invalid write provenance |
| TC-4.4a | `tests/service/server/source-management-api.test.ts` | `TC-4.4a degraded provenance entry does not hide healthy entries` | Mixed ready/degraded response |
| TC-4.4b | `tests/service/client/source-provenance-section.test.ts` | `TC-4.4b degraded provenance falls back to durable identity` | UI shows copied identity and degraded reason |
| TC-5.1a | `tests/service/server/source-management-api.test.ts` | `TC-5.1a detaches project-scoped source` | DELETE returns detached response |
| TC-5.1b | `tests/service/server/source-management-api.test.ts` | `TC-5.1b detaches process-scoped source` | DELETE enforces process/project relationship |
| TC-5.1c | `tests/service/server/process-execution-orchestrator.test.ts` | `TC-5.1c detach during active process does not rewrite hydrated copy` | Existing environment copy remains; future current-source list updates |
| TC-5.2a | `convex/sourceProvenance.test.ts` | `TC-5.2a prior provenance remains after detach` | Provenance still readable after source detached |
| TC-5.3a | `tests/service/client/source-management-ui.test.ts` | `TC-5.3a unrelated attachments remain after detach` | UI removes only detached row |
| TC-6.1a | `tests/service/server/projects-api.test.ts` | `TC-6.1a reopens project source attachment state` | GET project shell returns source state after reload |
| TC-6.1b | `tests/service/server/process-work-surface-api.test.ts` | `TC-6.1b reopens process source attachment state` | GET process work surface returns current sources |
| TC-6.2a | `tests/service/client/source-management-ui.test.ts` | `TC-6.2a unavailable source shown safely` | Displays unavailable without unsafe action |
| TC-6.2b | `tests/service/server/source-management-api.test.ts` | `TC-6.2b revoked access blocks source management` | 403/503 depending revoked project vs repo access |
| TC-6.3a | `tests/service/server/projects-api.test.ts` | `TC-6.3a one failing source does not hide healthy sources` | Section returns healthy rows plus bounded error/degraded row |

## Non-TC Decided Tests

| Test File | Test Description | Reason |
|-----------|------------------|--------|
| `tests/service/client/process-live.test.ts` | source schemas accept Epic 6 fields and reject missing required identity/freshness fields | Protects shared contract expansion before route/client work |
| `tests/service/server/source-management-service.test.ts` | derives `repositoryFullName` from valid HTTPS GitHub URLs with and without `.git` | Protects identity normalization used by multiple ACs |
| `tests/service/server/source-management-service.test.ts` | rejects non-GitHub URLs in the first repository-focused slice | Prevents accidental external-source scope creep |
| `tests/service/server/source-management-service.test.ts` | rejects mismatched `repositoryUrl` and provided `repositoryFullName` | Prevents identity spoofing or accidental mismatch |
| `tests/service/server/source-management-service.test.ts` | rejects `read_write` sources that target tags or commits | Locks down writable-ref policy |
| `tests/service/server/source-management-service.test.ts` | resolves missing `targetRef` on `read_write` to the repository default branch before persistence | Clarifies writable-source default-branch behavior |
| `tests/service/server/source-management-service.test.ts` | process-scoped source shadows project-scoped source only for matching process | Critical resolver behavior not covered by one explicit TC |
| `convex/sourceAttachments.test.ts` | detached rows are excluded from active listings but still exist durably | Soft-detach invariant |
| `tests/service/server/source-management-service.test.ts` | branch-head movement marks a hydrated source stale using durable resolved-ref snapshot fields | Covers moving-branch freshness semantics |
| `tests/service/server/source-management-api.test.ts` | request-level refresh errors differ from `refreshStatus: failed` | Clarifies response contract |
| `tests/service/server/source-management-api.test.ts` | unavailable or revoked source reads redact current source details while preserving bounded state | Covers AC-6.2 redaction requirement |
| `tests/service/client/source-management-ui.test.ts` | pending refresh does not render as a fifth hydration state | Protects canonical four-state model |

## Chunk Test Counts

| Chunk | TC Tests | Non-TC Tests | Total | Primary Files |
|-------|----------|--------------|-------|---------------|
| 0 Foundation | 0 | 1 | 1 | contract/schema/fixture tests |
| 1 Attach repositories | 8 | 6 | 14 | source-management API/service, Convex |
| 2 Manage metadata | 5 | 0 | 5 | source-management API, client sections |
| 3 Hydration/freshness | 6 | 3 | 9 | source-management API/UI |
| 4 Provenance | 6 | 2 | 8 | source provenance API, Convex, client |
| 5 Detach | 5 | 1 | 6 | API, Convex, execution orchestrator, UI |
| 6 Reopen/degraded | 5 | 0 | 5 | projects/process work surface API, UI |
| **Total** | **35** | **12** | **47** |  |

The TC count is 35 because Epic 6 has 35 named TCs. Non-TC tests cover identity
normalization, external-source scope exclusion, URL/full-name mismatch,
writable-ref policy, scope-shadowing, branch-drift freshness, soft-detach
invariants, refresh response semantics, unavailable-source redaction, and
canonical hydration-state protection.

## Verification Gates

| Phase | Command | Expected Result |
|-------|---------|-----------------|
| Skeleton / Red exit | `pnpm run red-verify` | Format, lint, typecheck, and build pass while new behavior tests fail against stubs |
| Development | `pnpm run verify` | Standard project verification passes |
| Green exit | `pnpm run green-verify` | All tests pass and no-test-change guard runs |
| Story/Epic completion | `pnpm run verify-all` | Full verification, integration, and e2e scaffold pass |

## Manual Verification Checklist

1. Start Convex with `pnpm run convex:dev`.
2. Start app server with `pnpm dev`.
3. Open a project shell and attach a GitHub repository at project scope.
4. Open a process work surface and attach a process-scoped repository.
5. Verify duplicate exact attachments are blocked but project/process scope can coexist.
6. Change a target ref and confirm the source becomes stale.
7. Trigger refresh and verify settled or pending state is visible.
8. Detach one source and verify other sources remain visible.
9. Reopen the project and process pages and confirm source/provenance state persists.

## Reconciliation

- TC tests: 35
- Non-TC decided tests: 12
- Planned automated tests: 47
- Manual verification steps: 9


## Current Run Index
- planner_turn_index: 2
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: story-implement completed with outcome ready-for-verification and status ok.
- latest_response_kind: implementor-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json
- older_response_count: 0
- caller_input_artifact_count: 0
- prior_self_note_count: 1
- latest_self_note: "After implementation returns, verify whether the child provided concrete changed-file evidence and whether the next bounded action should be self-review or green verification."

## Response Trail
<current_response>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json
bytes: 6030
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "eecf8ef3-d0a1-472d-ae21-2720ed26b540"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df41c-64a0-7b12-96ee-d7c48bb3078c"
    continuation:
      provider: "codex"
      sessionId: "019df41c-64a0-7b12-96ee-d7c48bb3078c"
      storyId: "00-foundation"
    outcome: "ready-for-verification"
    story:
      id: "00-foundation"
      title: "Story 0: Foundation"
    planSummary: "Implemented the Epic 6 Story 0 foundation by expanding shared source attachment vocabulary, adding source-management route contracts/schemas, introducing durable source provenance schema seams in Convex, and updating fixtures/tests to require the new repository identity and freshness fields."
    changedFiles:
      -
        path: "apps/platform/shared/contracts/schemas.ts"
        reason: "Expanded shared source enums, error codes, and source attachment summary schema with provider, canonical repo identity, freshness snapshot fields, refresh metadata, and detach metadata."
      -
        path: "apps/platform/shared/contracts/source-management.ts"
        reason: "Added shared source-management route constants plus request/response/provenance schemas for later Epic 6 stories."
      -
        path: "apps/platform/shared/contracts/index.ts"
        reason: "Re-exported the new source-management shared contracts module."
      -
        path: "apps/platform/server/schemas/source-management.ts"
        reason: "Added Fastify route schema definitions for attach, update, refresh, detach, and provenance endpoints."
      -
        path: "apps/platform/server/errors/codes.ts"
        reason: "Added server-side constants for the new source-management error codes."
      -
        path: "convex/sourceAttachments.ts"
        reason: "Extended the durable source attachment table fields and summary projection to include canonical identity, freshness snapshots, refresh state, and soft-detach fields."
      -
        path: "convex/sourceProvenance.ts"
        reason: "Added the new durable source provenance table field definition for Epic 6."
      -
        path: "convex/schema.ts"
        reason: "Registered the expanded source attachment indexes and new source provenance table/indexes in the Convex schema."
      -
        path: "tests/fixtures/sources.ts"
        reason: "Expanded source fixtures to the new contract shape and added pending refresh, detached, shadowing, duplicate-target-ref, and provenance fixtures/helpers."
      -
        path: "convex/sourceAttachments.test.ts"
        reason: "Updated Convex summary projection coverage for provider, repositoryFullName, freshness snapshots, refresh metadata, and detach metadata."
      -
        path: "tests/service/client/process-live.test.ts"
        reason: "Extended contract validation coverage so source schemas reject missing required Epic 6 identity and freshness fields."
      -
        path: "tests/service/server/source-management-contracts.test.ts"
        reason: "Added Story 0 contract tests for source-management requests/responses, source-management error codes, shadowing fixtures, and degraded provenance fixtures."
      -
        path: "tests/integration/process-work-surface.test.ts"
        reason: "Updated integration source seeds to satisfy the expanded source attachment summary contract."
      -
        path: "tests/service/server/process-live-updates.test.ts"
        reason: "Updated service test source seeds to satisfy the expanded source attachment summary contract."
      -
        path: "tests/service/server/process-work-surface-api.test.ts"
        reason: "Updated API test source seeds to satisfy the expanded source attachment summary contract and stale/not-hydrated fixture semantics."
      -
        path: "tests/service/server/processes-api.test.ts"
        reason: "Updated process API test source seeds to satisfy the expanded source attachment summary contract."
    tests:
      added:
        - "tests/service/server/source-management-contracts.test.ts"
      modified:
        - "convex/sourceAttachments.test.ts"
        - "tests/service/client/process-live.test.ts"
        - "tests/integration/process-work-surface.test.ts"
        - "tests/service/server/process-live-updates.test.ts"
        - "tests/service/server/process-work-surface-api.test.ts"
        - "tests/service/server/processes-api.test.ts"
      removed:
[]
      totalAfterStory: 561
      deltaFromPriorBaseline: 4
    gatesRun:
      -
        command: "corepack pnpm run typecheck"
        result: "pass"
      -
        command: "corepack pnpm exec vitest run convex/sourceAttachments.test.ts tests/service/client/process-live.test.ts tests/service/server/source-management-contracts.test.ts tests/service/server/process-live-updates.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/processes-api.test.ts tests/integration/process-work-surface.test.ts --environment node"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "not-run"
    selfReview:
      passesRun: 0
      findingsFixed:
        - "Expanded every touched source summary fixture/store seed so the new required provider, repositoryFullName, and freshness snapshot fields stay type-safe across service and integration tests."
        - "Added dedicated Story 0 contract coverage for pending refresh, detached sources, process shadowing fixtures, degraded provenance, and the new source-management error/status schemas."
        - "Aligned Convex table/index seams with the shared contract vocabulary so later Epic 6 stories can build behavior without redefining schema shapes."
      findingsSurfaced:
[]
    openQuestions:
      - "AGENTS.md references docs/onboarding/current-state-* files, but those onboarding docs are not present in this checkout; implementation was grounded in the story, tech design, test plan, and current code instead."
    specDeviations:
[]
    recommendedNextStep: "Run story verification, then build Story 1 attach/update/refresh behavior on top of the new shared contracts, route schemas, and Convex seams."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json"
  startedAt: "2026-05-04T17:49:54.542Z"
  finishedAt: "2026-05-04T18:02:00.747Z"
```
</current_response>

<history_responses>
No older response entries are recorded yet.
</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/story-lead/001-current.json
Bytes: 1864

```yaml
storyRunId: "00-foundation-story-run-001"
storyId: "00-foundation"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "story-implement completed with outcome ready-for-verification and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df41c-64a0-7b12-96ee-d7c48bb3078c"
    storyId: "00-foundation"
latestEventSequence: 5
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "No bounded child response exists yet, and the durable record only contains the initialized story run plus prior validation artifact. The smallest safe next action is to start implementation for Story 0 using the story-local requirements and test plan, with explicit attention to the Convex guidance requirement before touching Convex code."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json"
replayBoundary: null
updatedAt: "2026-05-04T18:02:00.756Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: After implementation returns, verify whether the child provided concrete changed-file evidence and whether the next bounded action should be self-review or green verification.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-04T17:49:54.507Z; note="After implementation returns, verify whether the child provided concrete changed-file evidence and whether the next bounded action should be self-review or green verification."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/story-lead/001-events.jsonl
Bytes: 2151

```yaml
-
  storyRunId: "00-foundation-story-run-001"
  sequence: 1
  timestamp: "2026-05-04T17:49:46.484Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "00-foundation-story-run-001"
  sequence: 2
  timestamp: "2026-05-04T17:49:54.456Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df41c-4515-7a00-9542-0302206e3def"
-
  storyRunId: "00-foundation-story-run-001"
  sequence: 3
  timestamp: "2026-05-04T17:49:54.506Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation returns, verify whether the child provided concrete changed-file evidence and whether the next bounded action should be self-review or green verification."
-
  storyRunId: "00-foundation-story-run-001"
  sequence: 4
  timestamp: "2026-05-04T17:49:54.507Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation returns, verify whether the child provided concrete changed-file evidence and whether the next bounded action should be self-review or green verification."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "00-foundation-story-run-001"
  sequence: 5
  timestamp: "2026-05-04T18:02:00.756Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/00-foundation/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
```

## State Rules
### state-rules
Bytes: 2986

Requirements source for story-local acceptance: the story file and test plan below.
Current lifecycle state: awaiting_story_lead_action

Lifecycle rules:
State: initialized
Public status: running
Allowed actions: none
Meaning: Runtime scaffolding exists, but no planner turn or child operation has started yet.
Caller implication: Treat this as startup bookkeeping only; wait for the first planner transition before routing work.

State: awaiting_story_lead_action
Public status: running
Allowed actions: run-implement, run-continue, run-self-review, run-verify, run-quick-fix, accept-story, request-ruling, block-story, fail-story
Meaning: The durable record is ready and the next fresh story-lead turn may choose one bounded action.
Caller implication: Planner output is the next source of truth; the run is waiting for a valid bounded action selection.

State: running_child_operation
Public status: running
Allowed actions: none
Meaning: The runtime is executing one bounded child operation selected by the story lead.
Caller implication: Poll runtime artifacts instead of rerouting; the current child operation is still in flight.

State: recording_result
Public status: running
Allowed actions: none
Meaning: The child result or terminal decision is being written to durable artifacts before the next transition.
Caller implication: Do not treat the run as advanced until evidence and ledger updates are durably recorded.

State: terminal
Public status: terminal-only
Allowed actions: none
Meaning: A terminal public outcome has been recorded separately from lifecycleState and the story-lead loop will not continue automatically.
Caller implication: Read the public status and final package to decide impl-lead follow-up such as accept, reopen, or ruling.

Terminal outcome rules:
Outcome: accepted
Meaning: Story-lead evidence is complete enough to recommend acceptance for impl-lead review.
Caller implication: Impl-lead still owes receipt completion, verification gates, and the story commit before accepting the story.

Outcome: needs-ruling
Meaning: The run reached a boundary that requires an explicit caller or maintainer decision.
Caller implication: Surface the ruling request instead of guessing or downgrading the decision into cleanup debt.

Outcome: blocked
Meaning: A named blocker prevents safe forward progress with the current inputs or runtime state.
Caller implication: Resolve the blocker or change the plan before resuming; do not pretend the story is ready to continue.

Outcome: failed
Meaning: An unrecoverable runtime or planner failure ended the current story-lead attempt.
Caller implication: Inspect the failure details and durable artifacts before deciding whether to replay or open a new attempt.

Outcome: interrupted
Meaning: The run stopped before a planned transition finished, usually because the caller or runtime interrupted it.
Caller implication: Use status or resume against the durable artifacts to continue from the last safe checkpoint.

## Runtime Settings
### runtime-settings
Bytes: 241

```yaml
storyGate: "corepack pnpm run green-verify"
epicGate: "corepack pnpm run verify-all"
plannerTimeoutMs: 600000
wholeRunTimeoutMs: 7200000
providerStartupTimeoutMs: 300000
providerActiveSilenceTimeoutMs: 600000
```

## Action Protocol
Return exactly one JSON object matching `StoryLeadAction`.

Examples:
{"action":"run-implement","rationale":"...","inputs":{"promptAddendum":"optional"},"selfNote":"optional durable reminder"}
{"action":"run-continue","rationale":"...","inputs":{"continuationRef":"storyImplementor","promptAddendum":"..."}}
{"action":"run-self-review","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"focus":"optional","continuationRef":"storyImplementor","passes":1}}
{"action":"run-verify","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"focus":"optional","provider":"codex"}}
{"action":"run-verify","rationale":"...","inputs":{"artifactRefs":["/abs/path.json"],"verifierContinuationRef":"storyVerifier","responseArtifactRef":"/abs/path.json"}}
{"action":"run-quick-fix","rationale":"...","inputs":{"findingRefs":["finding-001"],"remediationGoal":"...","workingDirectory":"optional"}}
{"action":"request-ruling","rationale":"...","inputs":{"decisionType":"...","question":"...","defaultRecommendation":"...","evidence":["..."],"allowedResponses":["..."]}}
{"action":"accept-story","rationale":"...","inputs":{"summary":"...","acceptanceCheckRefs":["..."],"acceptanceChecks":[{"name":"...","status":"pass","evidence":["..."],"reasoning":"..."}],"recommendedImplLeadAction":"accept"},"verification":{"finalVerifierOutcome":"pass","findings":[{"id":"...","status":"fixed","evidence":["..."]}]}}
{"action":"block-story","rationale":"...","inputs":{"reason":"...","detail":"optional","evidence":["..."]},"verification":{"finalVerifierOutcome":"block","findings":[{"id":"...","status":"unresolved","evidence":["..."]}]}}
{"action":"fail-story","rationale":"...","inputs":{"reason":"...","detail":"optional","evidence":["..."]}}

Rules:
- Choose exactly one bounded next action.
- Use only the durable story-run record in this prompt. Do not assume hidden retained planner memory exists.
- Treat `<current_response>` as the latest bounded child response and `<history_responses>` as older response history.
- If the story file and test plan are insufficient for a safe next step, request a ruling instead of asking for epic, tech design, git status, or git diff by default.
- Include `selfNote` only when you want to leave a durable reminder for a later planner turn.

## Acceptance Rubric
Choose the smallest safe bounded action that advances the story using the durable evidence already present.
Prefer continuing from valid child-operation evidence over repeating work, and keep unresolved authority-boundary questions explicit.

## Acceptance Decision Standard
Choose `accept-story` only when the latest verifier result is `pass`, no open findings remain, required proof is present, and the configured story gate passed.
If readiness is promising but gate truth is failed, unavailable, or uncertain, do not accept. Choose the smallest safe next action: verify, quick-fix, block, or request a ruling.

## Ruling Boundaries
Request a ruling when story-local requirements are insufficient, when a blocker needs a caller decision, or when the evidence conflicts in a way that the durable record cannot resolve safely.
