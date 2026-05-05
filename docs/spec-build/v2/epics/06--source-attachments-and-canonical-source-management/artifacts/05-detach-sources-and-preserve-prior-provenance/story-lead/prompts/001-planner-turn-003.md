# Story Lead Base Prompt

## Role Charter
You are the story lead for `05-detach-sources-and-preserve-prior-provenance` on durable story run `05-detach-sources-and-preserve-prior-provenance-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 3.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/05-detach-sources-and-preserve-prior-provenance.md
Bytes: 8291

# Story 5: Detach Sources and Preserve Prior Provenance

### Summary
<!-- Jira: Summary field -->
Allow users to soft-detach source attachments from current use while preserving prior provenance and leaving unrelated sources untouched.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs current source lists to stay accurate without losing history.
- **Context:** A source attachment may no longer be relevant to current project or process work, but earlier process work may already have used it.
- **Mental Model:** "Detaching removes this source from current use. It does not erase work that already relied on it."
- **Key Constraint:** Detach is soft. It excludes the attachment from current active lists but preserves source identity needed for provenance.

**Objective**

Implement detach behavior for project-scoped and process-scoped source attachments.

**Scope**

In:

- DELETE source attachment route
- Soft-detach fields such as `detachedAt` and `detachedByUserId`
- Active-list filtering for project and process source surfaces
- Preserve prior source provenance after detach
- Leave already hydrated working copies unchanged mid-run
- Preserve unrelated current source attachments

Out:

- Hard deletion of source identity
- Rewriting active environment working copies mid-run
- New checkpoint behavior beyond existing failure paths

**Dependencies**

- Story 4 source provenance
- Active source resolver from the tech design
- Existing environment hydration/checkpoint behavior
- [tech-design.md](../tech-design.md) Flow 5 and Active Source Resolution
- [test-plan.md](../test-plan.md) Chunk 5 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.1:** The user can detach a source attachment from current project or process use.

- **TC-5.1a: Detach project-scoped source**
  - Given: A project-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current project source attachment state
- **TC-5.1b: Detach process-scoped source**
  - Given: A process-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current process source attachment state
- **TC-5.1c: Detach during active process work does not rewrite the current hydrated copy**
  - Given: A running process is still using a previously hydrated working copy that includes an attached source
  - When: User detaches that source from current use
  - Then: The source is removed from future current attachment state without rewriting the already-hydrated working copy mid-run

**AC-5.2:** Detaching a source attachment does not erase prior visible provenance or prior process history that already referenced that source.

- **TC-5.2a: Prior provenance remains after detach**
  - Given: A source attachment previously informed or received process work
  - When: User detaches that source attachment from current use
  - Then: Prior visible provenance and prior process history remain available

**AC-5.3:** Detaching one source attachment does not remove unrelated current source attachments from the same project or process.

- **TC-5.3a: Unrelated attachments remain**
  - Given: A project or process has multiple source attachments
  - When: User detaches one source attachment
  - Then: The unrelated source attachments remain visible and unchanged

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story owns the soft-detach transition from “currently attached” to
“historically referenced.” Fastify owns the detach orchestration and active-list
implications; Convex stores the detach markers durably. The key constraint is
that detach changes future current-source visibility without rewriting an
already hydrated working copy or erasing provenance.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Detach source | `DELETE` | `/api/projects/:projectId/source-attachments/:sourceAttachmentId` | `detachSource` |

#### Detach Response

| Field | Type | Required | Description |
|---|---|---|---|
| `detached` | boolean | yes | Always `true` on success |
| `sourceAttachmentId` | string | yes | Detached source attachment id |
| `detachedAt` | string | yes | Soft-detach timestamp |

#### Durable Behavior

- Detach sets `detachedAt`, `detachedByUserId`, and `updatedAt`.
- Active project source listings filter detached rows.
- Process current-source resolution excludes detached rows.
- Provenance remains readable because entries copy repository identity and may retain nullable `sourceAttachmentId`.
- Detach does not rewrite an already hydrated working copy mid-run.

#### Active Source Resolver Impact

- Exclude rows with `detachedAt`.
- Preserve process-scoped shadowing for remaining active rows.
- Preserve per-row degraded metadata independently.
- Sort visible rows by `updatedAt` descending.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Detach route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Detach orchestration | `apps/platform/server/services/sources/source-management.service.ts` |
| Durable detach markers and active-list filtering | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts`, `convex/schema.ts` |
| Reader/runtime consumers | `apps/platform/server/services/projects/readers/source-section.reader.ts`, `apps/platform/server/services/processes/readers/materials-section.reader.ts`, `apps/platform/server/services/processes/environment/process-environment.service.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:150), lines 150-161
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:635), lines 635-659
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:674), lines 674-709
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:62), lines 62-66

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-5.1a | `tests/service/server/source-management-api.test.ts` | detaches project-scoped source |
| TC-5.1b | `tests/service/server/source-management-api.test.ts` | detaches process-scoped source |
| TC-5.1c | `tests/service/server/process-execution-orchestrator.test.ts` | detach during active process does not rewrite hydrated copy |
| TC-5.2a | `convex/sourceProvenance.test.ts` | prior provenance remains after detach |
| TC-5.3a | `tests/service/client/source-management-ui.test.ts` | unrelated attachments remain after detach |

#### Non-TC Decided Tests

- `convex/sourceAttachments.test.ts`: detached rows are excluded from active listings but still exist durably

#### Technical Notes

- Detach is a future-state change for active source visibility, not a mid-run working-copy rewrite.

#### Anti-Shim Requirements

- Prove detach against both durable state and visible current-source/read behavior.

#### Verification

- Targeted: `pnpm run test:service`
- Targeted: `pnpm run test:convex`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- DELETE soft-detaches project-scoped and process-scoped source attachments
- Detached sources disappear from future current project/process active source lists
- Detach does not mutate an already hydrated working copy mid-run
- Prior provenance remains visible after detach
- Unrelated active source attachments remain visible and unchanged
- Planned tests for TC-5.1a through TC-5.3a are implemented in the files mapped by the test plan


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
- planner_turn_index: 3
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: story-verify completed with outcome revise and status ok.
- latest_response_kind: verifier-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json
- older_response_count: 1
- caller_input_artifact_count: 0
- prior_self_note_count: 2
- latest_self_note: "If verifier passes with no open findings, prepare accept-story recommendation with evidence for durable markers, active filtering, provenance preservation, unrelated attachment preservation, and hydrated-copy non-rewrite."

## Response Trail
<current_response>
```yaml
kind: verifier-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json
bytes: 7578
payload:
  command: "story-verify"
  version: 1
  status: "ok"
  outcome: "revise"
  result:
    resultId: "aa159b51-9d44-4d26-a968-5563e06b1351"
    role: "story_verifier"
    provider: "codex"
    model: "gpt-5.4"
    sessionId: "019df52a-0973-7221-8c78-2ee23c80e7b2"
    continuation:
      provider: "codex"
      sessionId: "019df52a-0973-7221-8c78-2ee23c80e7b2"
      storyId: "05-detach-sources-and-preserve-prior-provenance"
    mode: "initial"
    story:
      id: "05-detach-sources-and-preserve-prior-provenance"
      title: "Story 5: Detach Sources and Preserve Prior Provenance"
    artifactsRead:
      - "convex/_generated/ai/guidelines.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/05-detach-sources-and-preserve-prior-provenance.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md"
      - "apps/platform/server/routes/source-management.ts"
      - "apps/platform/server/services/sources/source-management.service.ts"
      - "apps/platform/server/services/sources/source-provenance.service.ts"
      - "apps/platform/server/services/projects/platform-store.ts"
      - "apps/platform/server/services/projects/readers/source-section.reader.ts"
      - "apps/platform/server/services/processes/readers/materials-section.reader.ts"
      - "apps/platform/server/services/processes/environment/process-environment.service.ts"
      - "apps/platform/client/browser-api/projects-api.ts"
      - "apps/platform/client/app/bootstrap.ts"
      - "apps/platform/client/app/shell-app.ts"
      - "apps/platform/client/features/projects/project-shell-page.ts"
      - "apps/platform/client/features/projects/source-attachment-section.ts"
      - "apps/platform/client/features/processes/process-materials-section.ts"
      - "convex/sourceAttachments.ts"
      - "convex/projects.ts"
      - "convex/sourceAttachments.test.ts"
      - "convex/sourceProvenance.test.ts"
      - "tests/service/server/source-management-api.test.ts"
      - "tests/service/server/process-execution-orchestrator.test.ts"
      - "tests/service/server/source-management-service.test.ts"
      - "tests/service/client/source-management-ui.test.ts"
    reviewScopeSummary: "Reviewed Story 5 detach behavior against the story, full Epic 6 tech design, and test plan, then traced the Fastify detach route/service, Convex soft-detach persistence, project/process active-list readers, provenance retention, client detach UI wiring, and runtime environment working-set consumers."
    priorFindingStatuses:
[]
    newFindings:
      -
        id: "SV-05-01"
        severity: "major"
        title: "Detached sources are still used by runtime rehydrate/rebuild/checkpoint planning"
        evidence: "The design says active-source resolution affects both the process work surface and environment working-set planning, and detached rows must be excluded (`tech-design.md:681-714`). The implementation only applies detached filtering in `MaterialsSectionReader` (`apps/platform/server/services/processes/readers/materials-section.reader.ts:81-156`). `ProcessEnvironmentService.buildHydrationPlan` still rebuilds working sets directly from raw `getCurrentProcessMaterialRefs` (`apps/platform/server/services/processes/environment/process-environment.service.ts:1270-1279`), `buildAdapterHydrationPlan` maps those source IDs straight into `sourceInputs` (`.../process-environment.service.ts:1293-1352`), and checkpoint planning still uses raw current source IDs from `existingMaterialRefs` (`.../process-environment.service.ts:750-785`). At the same time, detach intentionally leaves the persisted process source IDs/hydration plan untouched (`tests/service/server/process-execution-orchestrator.test.ts:826-867`), and the detach mutation only writes detach markers (`convex/sourceAttachments.ts:279-317`). Result: after a detach, the UI hides the source, but later rehydrate/rebuild/checkpoint paths can still clone or write against that detached source."
        affectedFiles:
          - "apps/platform/server/services/processes/environment/process-environment.service.ts"
          - "tests/service/server/process-execution-orchestrator.test.ts"
          - "convex/sourceAttachments.ts"
        requirementIds:
          - "AC-5.1"
          - "TC-5.1c"
        recommendedFixScope: "fresh-fix-path"
        blocking: true
    openFindings:
      -
        id: "SV-05-01"
        severity: "major"
        title: "Detached sources are still used by runtime rehydrate/rebuild/checkpoint planning"
        evidence: "The design says active-source resolution affects both the process work surface and environment working-set planning, and detached rows must be excluded (`tech-design.md:681-714`). The implementation only applies detached filtering in `MaterialsSectionReader` (`apps/platform/server/services/processes/readers/materials-section.reader.ts:81-156`). `ProcessEnvironmentService.buildHydrationPlan` still rebuilds working sets directly from raw `getCurrentProcessMaterialRefs` (`apps/platform/server/services/processes/environment/process-environment.service.ts:1270-1279`), `buildAdapterHydrationPlan` maps those source IDs straight into `sourceInputs` (`.../process-environment.service.ts:1293-1352`), and checkpoint planning still uses raw current source IDs from `existingMaterialRefs` (`.../process-environment.service.ts:750-785`). At the same time, detach intentionally leaves the persisted process source IDs/hydration plan untouched (`tests/service/server/process-execution-orchestrator.test.ts:826-867`), and the detach mutation only writes detach markers (`convex/sourceAttachments.ts:279-317`). Result: after a detach, the UI hides the source, but later rehydrate/rebuild/checkpoint paths can still clone or write against that detached source."
        affectedFiles:
          - "apps/platform/server/services/processes/environment/process-environment.service.ts"
          - "tests/service/server/process-execution-orchestrator.test.ts"
          - "convex/sourceAttachments.ts"
        requirementIds:
          - "AC-5.1"
          - "TC-5.1c"
        recommendedFixScope: "fresh-fix-path"
        blocking: true
    requirementCoverage:
      verified:
        - "TC-5.1a"
        - "TC-5.1b"
        - "AC-5.2"
        - "TC-5.2a"
        - "AC-5.3"
        - "TC-5.3a"
      unverified:
        - "AC-5.1"
        - "TC-5.1c"
    gatesRun:
      -
        command: "corepack pnpm exec vitest run tests/service/server/source-management-api.test.ts tests/service/server/process-execution-orchestrator.test.ts tests/service/client/source-management-ui.test.ts convex/sourceAttachments.test.ts convex/sourceProvenance.test.ts"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "not-run"
    productionPathFindings:
      - "`ProcessEnvironmentService` still treats detached source IDs in `currentMaterialRefs` as active runtime inputs for rehydrate/rebuild/checkpoint flows, so detach is only a read-surface hide and not a full production-path removal from future current use."
    recommendedNextStep: "revise"
    recommendedFixScope: "fresh-fix-path"
    openQuestions:
[]
    additionalObservations:
      - "Story-focused tests and the configured story gate both passed; the blocking issue comes from the uncovered runtime path where detach is not applied to environment working-set planning."
      - "`convex/projects.ts:28-40` still counts detached rows in `sourceAttachmentCount`, while the in-memory store now filters to active rows (`apps/platform/server/services/projects/platform-store.ts:2291-2315`); this contract mismatch is not covered by Story 5 tests."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json"
  startedAt: "2026-05-04T22:44:25.923Z"
  finishedAt: "2026-05-04T22:50:20.347Z"
```
</current_response>

<history_responses>

<history_entry>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/003-implementor.json
bytes: 5607
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "714155d9-9efb-4313-911f-2edbebdbd80f"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df521-2a24-7773-9227-b344af211498"
    continuation:
      provider: "codex"
      sessionId: "019df521-2a24-7773-9227-b344af211498"
      storyId: "05-detach-sources-and-preserve-prior-provenance"
    outcome: "ready-for-verification"
    story:
      id: "05-detach-sources-and-preserve-prior-provenance"
      title: "Story 5: Detach Sources and Preserve Prior Provenance"
    planSummary: "Implemented Story 5 soft-detach end to end: added the DELETE detach route and store/service flow, preserved detached rows durably for provenance, filtered detached attachments from project and process active views, wired project-shell detach UI, and added the story-mapped detach/provenance tests plus the chunk non-TC durable detach check."
    changedFiles:
      -
        path: "apps/platform/server/services/sources/source-management.service.ts"
        reason: "Added `detachSource` orchestration with active-row lookup and 404 mapping."
      -
        path: "apps/platform/server/routes/source-management.ts"
        reason: "Registered the DELETE source-attachment route and response handling."
      -
        path: "apps/platform/server/services/projects/platform-store.ts"
        reason: "Extended the store contract and implementations with soft-detach persistence plus active-count recalculation."
      -
        path: "apps/platform/server/services/projects/readers/source-section.reader.ts"
        reason: "Filtered detached attachments out of the project source section."
      -
        path: "apps/platform/server/services/processes/readers/materials-section.reader.ts"
        reason: "Excluded detached rows from process current sources and applied process-scope shadowing for active resolution."
      -
        path: "convex/sourceAttachments.ts"
        reason: "Added the Convex soft-detach mutation and durable detach marker writes."
      -
        path: "apps/platform/client/browser-api/projects-api.ts"
        reason: "Added the client DELETE API helper for source detach."
      -
        path: "apps/platform/client/features/projects/source-attachment-section.ts"
        reason: "Added detach controls to source rows."
      -
        path: "apps/platform/client/features/projects/project-shell-page.ts"
        reason: "Passed detach actions into the project source section."
      -
        path: "apps/platform/client/app/shell-app.ts"
        reason: "Extended shell wiring with a project-source detach callback."
      -
        path: "apps/platform/client/app/bootstrap.ts"
        reason: "Handled detach requests and removed only the detached row from shell state."
      -
        path: "apps/platform/server/app.ts"
        reason: "Updated the source-management store cast to include detach support."
      -
        path: "convex/sourceAttachments.test.ts"
        reason: "Added the soft-detach durable-vs-active lookup regression test."
      -
        path: "convex/sourceProvenance.test.ts"
        reason: "Added the provenance-retention-after-detach test."
      -
        path: "tests/service/server/source-management-api.test.ts"
        reason: "Added API coverage for detaching project-scoped and process-scoped sources."
      -
        path: "tests/service/server/process-execution-orchestrator.test.ts"
        reason: "Added coverage that detach does not rewrite an already-hydrated working copy plan mid-run."
      -
        path: "tests/service/client/source-management-ui.test.ts"
        reason: "Added UI coverage that detaching one source leaves unrelated attachments visible."
      -
        path: "tests/service/server/source-management-service.test.ts"
        reason: "Updated the typed capped-store shim to satisfy the expanded detach-capable store contract."
    tests:
      added:
        - "convex/sourceProvenance.test.ts"
      modified:
        - "convex/sourceAttachments.test.ts"
        - "tests/service/server/source-management-api.test.ts"
        - "tests/service/server/process-execution-orchestrator.test.ts"
        - "tests/service/client/source-management-ui.test.ts"
        - "tests/service/server/source-management-service.test.ts"
      removed:
[]
      totalAfterStory: 47
      deltaFromPriorBaseline: 6
    gatesRun:
      -
        command: "corepack pnpm vitest run tests/service/server/source-management-api.test.ts tests/service/client/source-management-ui.test.ts tests/service/server/process-execution-orchestrator.test.ts convex/sourceAttachments.test.ts convex/sourceProvenance.test.ts"
        result: "pass"
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    selfReview:
      passesRun: 0
      findingsFixed:
        - "Wired the missing detach route/service/store path so DELETE now soft-detaches instead of leaving Story 5 unimplemented."
        - "Filtered detached attachments out of both project and process active-source reads while preserving durable rows for provenance lookups."
        - "Addressed formatter/type-contract issues surfaced during verification by extending the source-management store casts and fixing formatting nits."
      findingsSurfaced:
[]
    openQuestions:
      - "`docs/onboarding/current-state-index.md` and the related onboarding docs referenced in `AGENTS.md` are not present in this checkout, so implementation was grounded in the story, tech design, test plan, and current code instead."
    specDeviations:
[]
    recommendedNextStep: "Proceed to verification, with manual project-shell and process-surface detach smoke checks if you want an extra UX pass."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/003-implementor.json"
  startedAt: "2026-05-04T22:34:44.471Z"
  finishedAt: "2026-05-04T22:44:16.011Z"
```
</history_entry>

</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/story-lead/001-current.json
Bytes: 2583

```yaml
storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
storyId: "05-detach-sources-and-preserve-prior-provenance"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "story-verify completed with outcome revise and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/003-implementor.json"
    provenance: "current-run"
  -
    kind: "verifier-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df521-2a24-7773-9227-b344af211498"
    storyId: "05-detach-sources-and-preserve-prior-provenance"
  storyVerifier:
    provider: "codex"
    sessionId: "019df52a-0973-7221-8c78-2ee23c80e7b2"
    storyId: "05-detach-sources-and-preserve-prior-provenance"
latestEventSequence: 9
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "Implementation reports complete Story 5 coverage and passing green/epic gates, but the durable record does not yet contain an independent verifier result. The smallest safe next action is to run verification against the implementor artifact, focusing on soft-detach markers, active-list filtering, provenance preservation, unrelated attachment preservation, and non-rewrite of already hydrated working copies."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json"
replayBoundary: null
updatedAt: "2026-05-04T22:50:20.356Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: If verifier passes with no open findings, prepare accept-story recommendation with evidence for durable markers, active filtering, provenance preservation, unrelated attachment preservation, and hydrated-copy non-rewrite.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-04T22:34:44.435Z; note="After implementation returns, verify that evidence covers both durable detach markers and visible active-list filtering, plus non-rewrite of hydrated working copies."
- sequence=8; actionSequence=7; createdAt=2026-05-04T22:44:25.887Z; note="If verifier passes with no open findings, prepare accept-story recommendation with evidence for durable markers, active filtering, provenance preservation, unrelated attachment preservation, and hydrated-copy non-rewrite."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/story-lead/001-events.jsonl
Bytes: 4548

```yaml
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 1
  timestamp: "2026-05-04T22:34:32.212Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 2
  timestamp: "2026-05-04T22:34:44.401Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df520-fa28-7e23-851a-1c0d6f74ed0a"
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 3
  timestamp: "2026-05-04T22:34:44.434Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation returns, verify that evidence covers both durable detach markers and visible active-list filtering, plus non-rewrite of hydrated working copies."
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 4
  timestamp: "2026-05-04T22:34:44.435Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation returns, verify that evidence covers both durable detach markers and visible active-list filtering, plus non-rewrite of hydrated working copies."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 5
  timestamp: "2026-05-04T22:44:16.021Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 6
  timestamp: "2026-05-04T22:44:25.850Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/story-lead/prompts/001-planner-turn-002.md"
    sessionId: "019df529-e2bd-70a0-9275-49bf4194e67c"
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 7
  timestamp: "2026-05-04T22:44:25.886Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-verify."
  data:
    actionType: "run-verify"
    turn: 2
    selfNote: "If verifier passes with no open findings, prepare accept-story recommendation with evidence for durable markers, active filtering, provenance preservation, unrelated attachment preservation, and hydrated-copy non-rewrite."
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 8
  timestamp: "2026-05-04T22:44:25.887Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "If verifier passes with no open findings, prepare accept-story recommendation with evidence for durable markers, active filtering, provenance preservation, unrelated attachment preservation, and hydrated-copy non-rewrite."
    actionSequence: 7
    actionType: "run-verify"
    turn: 2
-
  storyRunId: "05-detach-sources-and-preserve-prior-provenance-story-run-001"
  sequence: 9
  timestamp: "2026-05-04T22:50:20.356Z"
  type: "child-operation-completed"
  summary: "story-verify completed with outcome revise and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/05-detach-sources-and-preserve-prior-provenance/004-verify.json"
  data:
    actionType: "run-verify"
    command: "story-verify"
    outcome: "revise"
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
