# Story Lead Base Prompt

## Role Charter
You are the story lead for `02-manage-purpose-access-mode-and-target-ref` on durable story run `02-manage-purpose-access-mode-and-target-ref-story-run-001`.
Select exactly one bounded next action for this `run` turn.
This is planner turn 4.
Do not invent tools, bypass the bounded action protocol, or rely on hidden provider session memory.

## Authority Boundary
Impl-lead stays outside this loop and owns final story acceptance, receipts, commits, cleanup dispatch, and epic progression.
You may recommend acceptance, request a ruling, or block the story, but you do not accept the story on behalf of impl-lead.

## Requirements Source
Treat the story file and test plan below as the story-local requirements source for this turn.
Do not pull in epic, tech design, git status, git diff, or workspace summaries unless they are already present in the durable record below.

### Story Requirements
### story-file
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md
Bytes: 8103

# Story 2: Manage Purpose, Access Mode, and Target Ref

### Summary
<!-- Jira: Summary field -->
Allow users to view and update durable source metadata, including target-ref changes that make previously hydrated sources stale.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to attach code repositories to project and process work, control how those repositories are used, and understand which canonical sources informed or received process work.
- **Context:** The user needs each attached repository to show what it is for, whether it can receive code writes, and which ref it targets.
- **Mental Model:** "Purpose, access mode, and target ref are durable properties of the attached source, not transient hints for one run."
- **Key Constraint:** Metadata management must not redefine source identity or artifact ownership.

**Objective**

Make source purpose, access mode, and target ref visible and mutable for existing source attachments.

**Scope**

In:

- Purpose, access mode, and target ref display in project/process surfaces
- Update route for durable source metadata
- Read-only versus writable text display
- Target-ref change stale transition for hydrated rows

Out:

- Initial attach behavior
- Refresh execution
- Provenance recording
- Detach behavior

**Dependencies**

- Story 1 attach behavior
- Story 0 shared contracts
- [tech-design.md](../tech-design.md) Flow 2
- [test-plan.md](../test-plan.md) Chunk 2 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** Each source attachment records purpose, access mode, and target ref as durable source metadata.

- **TC-2.1a: Purpose, access mode, and target ref visible**
  - Given: A source attachment exists
  - When: The source attachment appears in the current surface
  - Then: The purpose, access mode, and target ref are visible

**AC-2.2:** The user can update purpose, access mode, and target ref for an existing source attachment.

- **TC-2.2a: Update source metadata**
  - Given: A source attachment exists
  - When: User updates purpose, access mode, or target ref
  - Then: The source attachment stores and displays the updated metadata

**AC-2.3:** Access mode clearly distinguishes read-only and writable source attachments.

- **TC-2.3a: Read-only attachment is identifiable**
  - Given: A source attachment has read-only access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is read-only
- **TC-2.3b: Writable attachment is identifiable**
  - Given: A source attachment has writable access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is writable

**AC-2.4:** Updating the target ref updates freshness state when the current hydrated working copy no longer matches the attached source definition.

- **TC-2.4a: Target-ref change marks source stale**
  - Given: A source attachment was previously hydrated
  - When: User changes its target ref
  - Then: The source attachment no longer appears current and indicates that rehydration is required

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story updates durable source metadata without changing canonical source
identity. Fastify owns update validation and writable-ref policy, while Convex
persists the update atomically. The critical behavior is that a target-ref
change can invalidate the previously hydrated working copy and must carry a
freshness transition in the same durable write.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Update source | `PATCH` | `/api/projects/:projectId/source-attachments/:sourceAttachmentId` | `updateSource` |

#### Update Request

| Field | Type | Required | Validation |
|---|---|---|---|
| `purpose` | enum | no | `research`, `review`, `implementation`, `other` |
| `accessMode` | enum | no | `read_only`, `read_write` |
| `targetRef` | string/null | no | non-empty when present |

#### Update Response

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceAttachment` | Source Attachment Summary | yes | Updated durable source attachment state |

#### Service Responsibilities

- Load and update by `sourceAttachmentId` regardless of whether the source is project-scoped or process-scoped.
- Validate authenticated project access and source membership in the project.
- Preserve source identity fields unless an explicit future story changes identity behavior.
- Normalize target ref before persistence.
- If `targetRef` changes while `hydrationState === 'hydrated'`, persist `hydrationState: 'stale'` and a freshness reason such as `target_ref_changed`.
- Enforce writable-ref policy for `read_write` attachments.

#### Client Responsibilities

- Render purpose, access mode, target ref, and updated freshness state as readable text.
- Distinguish `read_only` and `read_write` without relying on color alone.
- Update the current source row in place after a successful PATCH response.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Update route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Metadata update logic | `apps/platform/server/services/sources/source-management.service.ts` |
| Durable source update | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts` |
| Project/process source rendering | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:331), lines 331-380
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:555), lines 555-572
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:45), lines 45-49

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-2.1a | `tests/service/client/source-attachment-section.test.ts` | displays purpose access mode and target ref |
| TC-2.2a | `tests/service/server/source-management-api.test.ts` | updates source metadata |
| TC-2.3a | `tests/service/client/process-materials-section.test.ts` | identifies read-only source |
| TC-2.3b | `tests/service/client/process-materials-section.test.ts` | identifies writable source |
| TC-2.4a | `convex/sourceAttachments.test.ts` | target-ref change marks hydrated source stale |

#### Non-TC Decided Tests

None.

#### Technical Notes

- This story does not rename source identity; it only updates purpose, access mode, and target ref.
- Target-ref changes must carry the stale transition in the same durable write.

#### Anti-Shim Requirements

- Prove the stale transition through persisted summary state or route response, not only helper logic.

#### Verification

- Targeted: `pnpm run test:convex`
- Targeted: `pnpm run test:client`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Existing source attachments show purpose, access mode, and target ref in current project/process surfaces
- PATCH updates allowed metadata and returns the updated summary
- Read-only and writable states are visible as text
- Target-ref changes mark previously hydrated rows stale and identify the need for rehydration
- Planned tests for TC-2.1a through TC-2.4a are implemented in the files mapped by the test plan


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
- planner_turn_index: 4
- mode: run
- current_status: running
- lifecycle_state: awaiting_story_lead_action
- current_phase: story-lead-awaiting-action
- current_child_operation: none
- current_summary: quick-fix completed with outcome ready-for-verification and status ok.
- latest_response_kind: quick-fix-result
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json
- older_response_count: 2
- caller_input_artifact_count: 0
- prior_self_note_count: 3
- latest_self_note: "After quick-fix returns, run verifier against the quick-fix result and prior verifier findings; accept only if verifier outcome is pass with SV-02-01 and SV-02-02 fixed and story gate evidenced."

## Response Trail
<current_response>
```yaml
kind: quick-fix-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json
bytes: 9284
payload:
  command: "quick-fix"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    provider: "codex"
    model: "gpt-5.4"
    rawProviderOutputPreview: |-
      {"type":"thread.started","thread_id":"019df45d-3aa5-7623-8533-4bd9ff15ca7d"}
      {"type":"turn.started"}
      {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"I’m picking up the two Story 2 verifier gaps and will start by loading the repo guidance plus the relevant current-state docs, then I’ll trace the existing attachment edit and update-by-source flows before patching tests and running the green verify gate."}}
      {"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' convex/_generated/ai/guidelines.md\"","aggregated_output":"","exit_code":null,"status":"in_progress"}}
      {"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' convex/_generated/ai/guidelines.md\"","aggregated_output":"# Convex guidelines\n\n## Function guidelines\n\n### Http endpoint syntax\n\n- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:\n\n```typescript\nimport { httpRouter } from \"convex/server\";\nimport { httpAction } from \"./_generated/server\";\nconst http = httpRouter();\nhttp.route({\n  path: \"/echo\",\n  method: \"POST\",\n  handler: httpAction(async (ctx, req) => {\n    const body = await req.bytes();\n    return new Response(body, { status: 200 });\n  }),\n});\n```\n\n- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.\n\n### Validators\n\n- Below is an example of an array validator:\n\n```typescript\nimport { mutation } from \"./_generated/server\";\nimport { v } from \"convex/values\";\n\nexport default mutation({\n  args: {\n    simpleArray: v.array(v.union(v.string(), v.number())),\n  },\n  handler: async (ctx, args) => {\n    //...\n  },\n});\n```\n\n- Below is an example of a schema with validators that codify a discriminated union type:\n\n```typescript\nimport { defineSchema, defineTable } from \"convex/server\";\nimport { v } from \"convex/values\";\n\nexport default defineSchema({\n  results: defineTable(\n    v.union(\n      v.object({\n        kind: v.literal(\"error\"),\n        errorMessage: v.string(),\n      }),\n      v.object({\n        kind: v.literal(\"success\"),\n        value: v.number(),\n      }),\n    ),\n  ),\n});\n```\n\n- Here are the valid Convex types along with their respective validators:\n  Convex Type | TS/JS type | Example Usage | Validator for argument validation and schemas | Notes |\n  | ----------- | ------------| -----------------------| -----------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|\n  | Id | string | `doc._id` | `v.id(tableName)` | |\n  | Null | null | `null` | `v.null()` | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead. |\n  | Int64 | bigint | `3n` | `v.int64()` | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers. |\n  | Float64 | number | `3.1` | `v.number()` | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings. |\n  | Boolean | boolean | `true` | `v.boolean()` |\n  | String | string | `\"abc\"` | `v.string()` | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8. |\n  | Bytes | ArrayBuffer | `new ArrayBuffer(8)` | `v.bytes()` | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types. |\n  | Array | Array | `[1, 3.2, \"abc\"]` | `v.array(values)` | Arrays can have at most 8192 values. |\n  | Object | Object | `{a: \"abc\"}` | `v.object({property: value})` | Convex only supports \"plain old JavaScript objects\" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with \"$\" or \"_\". |\n| Record      | Record      | `{\"a\": \"1\", \"b\": \"2\"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with \"$\" or \"\\_\". |\n\n### Function registration\n\n- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.\n- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.\n- You CANNOT register a function through the `api` or `internal` objects.\n- ALWAYS include argument validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`.\n\n### Function calling\n\n- Use `ctx.runQuery` to call a query from a query, mutation, or action.\n- Use `ctx.runMutation` to call a mutation from a mutation or action.\n- Use `ctx.runAction` to call an action from an action.\n- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.\n- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.\n- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.\n- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example,\n\n```\nexport const f = query({\n  args: { name: v.string() },\n  handler: async (ctx, args) => {\n    return \"Hello \" + args.name;\n  },\n});\n\nexport const g = query({\n  args: {},\n  handler: async (ctx, args) => {\n    const result: string = await ctx.runQuery(api.example.f, { name: \"Bob\" });\n    return null;\n  },\n});\n```\n\n### Function references\n\n- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.\n- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.\n- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.\n- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.\n- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.\n\n### Pagination\n\n- Define pagination using the following syntax:\n\n```ts\nimport { v } from \"convex/values\";\nimport { query, mutation } from \"./_generated/server\";\nimport { paginationOptsValidator } from \"convex/server\";\nexport const listWithExtraArg = query({\n  args: { paginationOpts: paginationOptsValidator, author: v.string() },\n  handler: async (ctx, args) => {\n    return await ctx.db\n      .query(\"messages\")\n      .withIndex(\"by_author\", (q) => q.eq(\"author\", args.author))\n      .order(\"desc\")\n      .paginate(args.paginationOpts);\n  },\n});\n```\n\nNote: `paginationOpts` is an object with the following proper
    rawProviderOutputBytes: 381198
    rawProviderOutputTruncated: true
    rawProviderOutputLogPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/streams/001-quick-fix.stdout.log"
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json"
  startedAt: "2026-05-04T19:00:43.644Z"
  finishedAt: "2026-05-04T19:09:21.063Z"
```
</current_response>

<history_responses>

<history_entry>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/003-implementor.json
bytes: 5030
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "08c1d835-e430-4715-8ab8-5d44294a7e0a"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df44f-7982-7f41-ab86-9df2d26be27e"
    continuation:
      provider: "codex"
      sessionId: "019df44f-7982-7f41-ab86-9df2d26be27e"
      storyId: "02-manage-purpose-access-mode-and-target-ref"
    outcome: "ready-for-verification"
    story:
      id: "02-manage-purpose-access-mode-and-target-ref"
      title: "Story 2: Manage Purpose, Access Mode, and Target Ref"
    planSummary: "Implemented Story 2 by adding the source-metadata PATCH route and durable update path, enforcing writable-ref and duplicate rules on update, marking hydrated attachments stale when target refs change, and making purpose/access mode/target ref plus rehydration-required stale state visible in project and process source surfaces."
    changedFiles:
      -
        path: "apps/platform/server/services/sources/source-management.service.ts"
        reason: "Added updateSource orchestration with source lookup, target-ref normalization, writable-ref enforcement, duplicate preflight, and hydrated-to-stale transition planning."
      -
        path: "apps/platform/server/routes/source-management.ts"
        reason: "Registered the PATCH /api/projects/:projectId/source-attachments/:sourceAttachmentId route with auth/access/error handling."
      -
        path: "apps/platform/server/services/projects/platform-store.ts"
        reason: "Added updateSourceAttachment store contract plus Convex, in-memory, and null-store implementations."
      -
        path: "apps/platform/server/app.ts"
        reason: "Wired the source-management service store cast to require the new updateSourceAttachment capability."
      -
        path: "convex/sourceAttachments.ts"
        reason: "Added durable source attachment update mutation with atomic duplicate protection and persisted stale-transition support."
      -
        path: "apps/platform/client/features/projects/source-attachment-section.ts"
        reason: "Rendered access mode and always-visible target ref, and made stale hydration explicitly say rehydration is required."
      -
        path: "apps/platform/client/features/processes/process-materials-section.ts"
        reason: "Rendered always-visible target refs and explicit stale-state copy in process current-source rows."
      -
        path: "apps/platform/client/browser-api/projects-api.ts"
        reason: "Added a browser API helper for PATCHing source attachment metadata."
      -
        path: "tests/service/server/source-management-api.test.ts"
        reason: "Covered TC-2.2a for updating source metadata through the Fastify PATCH route."
      -
        path: "tests/service/client/source-attachment-section.test.ts"
        reason: "Covered TC-2.1a and updated rendering expectations for access mode and stale-state copy."
      -
        path: "tests/service/client/process-materials-section.test.ts"
        reason: "Aligned client coverage with TC-2.3a and TC-2.3b expectations for readable access-mode distinctions."
      -
        path: "convex/sourceAttachments.test.ts"
        reason: "Covered TC-2.4a to prove persisted hydrated-to-stale behavior on target-ref changes."
    tests:
      added:
[]
      modified:
        - "tests/service/server/source-management-api.test.ts"
        - "tests/service/client/source-attachment-section.test.ts"
        - "tests/service/client/process-materials-section.test.ts"
        - "convex/sourceAttachments.test.ts"
      removed:
[]
      totalAfterStory: 21
      deltaFromPriorBaseline: 3
    gatesRun:
      -
        command: "corepack pnpm exec vitest run convex/sourceAttachments.test.ts --environment node"
        result: "pass"
      -
        command: "corepack pnpm exec vitest run tests/service/server/source-management-api.test.ts --environment node"
        result: "pass"
      -
        command: "corepack pnpm exec vitest run tests/service/client/source-attachment-section.test.ts tests/service/client/process-materials-section.test.ts --environment jsdom"
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
        - "Added the missing PATCH metadata-update path end to end across route, service, store, and Convex persistence."
        - "Made project and process source rows show access mode, target ref, and explicit stale/rehydration-required copy instead of only partial metadata."
        - "Proved the stale transition through persisted Convex state and API/client tests rather than helper-only logic."
      findingsSurfaced:
[]
    openQuestions:
      - "AGENTS.md points to docs/onboarding/current-state-* files, but those onboarding files are not present in this checkout."
    specDeviations:
[]
    recommendedNextStep: "Hand this story to verification, focusing on the PATCH metadata flow and the stale-state rendering in project and process source surfaces."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/003-implementor.json"
  startedAt: "2026-05-04T18:45:42.240Z"
  finishedAt: "2026-05-04T18:54:27.748Z"
```
</history_entry>

<history_entry>
```yaml
kind: verifier-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/004-verify.json
bytes: 10262
payload:
  command: "story-verify"
  version: 1
  status: "ok"
  outcome: "revise"
  result:
    resultId: "c20a9b9d-97ff-4222-b7b2-a374ffde05a4"
    role: "story_verifier"
    provider: "codex"
    model: "gpt-5.4"
    sessionId: "019df457-9e59-7a43-aa00-2a29892fccdb"
    continuation:
      provider: "codex"
      sessionId: "019df457-9e59-7a43-aa00-2a29892fccdb"
      storyId: "02-manage-purpose-access-mode-and-target-ref"
    mode: "initial"
    story:
      id: "02-manage-purpose-access-mode-and-target-ref"
      title: "Story 2: Manage Purpose, Access Mode, and Target Ref"
    artifactsRead:
      - "convex/_generated/ai/guidelines.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/team-impl-log.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/003-implementor.json"
      - "apps/platform/server/routes/source-management.ts"
      - "apps/platform/server/schemas/source-management.ts"
      - "apps/platform/server/services/sources/source-management.service.ts"
      - "apps/platform/server/services/sources/github-repository-resolver.ts"
      - "apps/platform/server/services/sources/source-identity.service.ts"
      - "apps/platform/server/services/projects/platform-store.ts"
      - "apps/platform/server/services/projects/readers/source-section.reader.ts"
      - "apps/platform/server/services/processes/readers/materials-section.reader.ts"
      - "convex/sourceAttachments.ts"
      - "apps/platform/client/browser-api/projects-api.ts"
      - "apps/platform/client/features/projects/source-attachment-section.ts"
      - "apps/platform/client/features/projects/project-shell-page.ts"
      - "apps/platform/client/features/processes/process-materials-section.ts"
      - "apps/platform/client/features/processes/process-work-surface-page.ts"
      - "apps/platform/client/app/shell-app.ts"
      - "tests/service/server/source-management-api.test.ts"
      - "tests/service/server/source-management-service.test.ts"
      - "tests/service/client/source-attachment-section.test.ts"
      - "tests/service/client/process-materials-section.test.ts"
      - "convex/sourceAttachments.test.ts"
    reviewScopeSummary: "Verified Story 2 against AC-2.1 through AC-2.4 by reading the story, tech design, and test plan; inspecting the Fastify PATCH path, Convex persistence, project/process source rendering, and related tests; and running the configured story and epic gates."
    priorFindingStatuses:
[]
    newFindings:
      -
        id: "SV-02-01"
        severity: "major"
        title: "Story 2 has no user-reachable client path for editing source metadata"
        evidence: "AC-2.2 says the user can update purpose/access mode/target ref, and the story’s client responsibilities require the current row to update in place after PATCH (docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md:52-57,116-120). But the project source section only accepts `onAttachSource` and renders static text rows (apps/platform/client/features/projects/source-attachment-section.ts:22-26,55-115), the process materials section does the same (apps/platform/client/features/processes/process-materials-section.ts:56-77,225-285), and the shell wiring only passes attach callbacks (apps/platform/client/app/shell-app.ts:126-135). A repo search for `updateSourceAttachment(` in `apps/platform/client` finds only the helper definition in apps/platform/client/browser-api/projects-api.ts:131-154, with no caller. Existing TC-2.2a coverage is only the direct Fastify PATCH test in tests/service/server/source-management-api.test.ts:363-418, so production UI users cannot actually perform the Story 2 update flow."
        affectedFiles:
          - "apps/platform/client/features/projects/source-attachment-section.ts"
          - "apps/platform/client/features/processes/process-materials-section.ts"
          - "apps/platform/client/app/shell-app.ts"
          - "apps/platform/client/browser-api/projects-api.ts"
        requirementIds:
          - "AC-2.2"
          - "AC-2.4"
        recommendedFixScope: "same-session-implementor"
        blocking: true
      -
        id: "SV-02-02"
        severity: "major"
        title: "Updating by sourceAttachmentId breaks once a project has more than 200 attachments"
        evidence: "The story requires loading and updating by `sourceAttachmentId` regardless of scope (docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md:107-114). In production, `DefaultSourceManagementService.updateSource` first loads `platformStore.listProjectSourceAttachments(...)` and searches that array for the requested id (apps/platform/server/services/sources/source-management.service.ts:85-99). The Convex-backed list query is hard-capped with `.take(200)` (convex/sourceAttachments.ts:42-53), and the project source reader consumes that same capped list for the shell surface (apps/platform/server/services/projects/readers/source-section.reader.ts:17-27). Older attachments therefore disappear from the project list and PATCH can incorrectly return `SOURCE_ATTACHMENT_NOT_FOUND` even though the durable row still exists. The current TC-2.2a test only covers a one-row happy path (tests/service/server/source-management-api.test.ts:363-418), so this production-path limit is unproven and currently incorrect."
        affectedFiles:
          - "apps/platform/server/services/sources/source-management.service.ts"
          - "convex/sourceAttachments.ts"
          - "apps/platform/server/services/projects/readers/source-section.reader.ts"
        requirementIds:
          - "AC-2.1"
          - "AC-2.2"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    openFindings:
      -
        id: "SV-02-01"
        severity: "major"
        title: "Story 2 has no user-reachable client path for editing source metadata"
        evidence: "AC-2.2 says the user can update purpose/access mode/target ref, and the story’s client responsibilities require the current row to update in place after PATCH (docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md:52-57,116-120). But the project source section only accepts `onAttachSource` and renders static text rows (apps/platform/client/features/projects/source-attachment-section.ts:22-26,55-115), the process materials section does the same (apps/platform/client/features/processes/process-materials-section.ts:56-77,225-285), and the shell wiring only passes attach callbacks (apps/platform/client/app/shell-app.ts:126-135). A repo search for `updateSourceAttachment(` in `apps/platform/client` finds only the helper definition in apps/platform/client/browser-api/projects-api.ts:131-154, with no caller. Existing TC-2.2a coverage is only the direct Fastify PATCH test in tests/service/server/source-management-api.test.ts:363-418, so production UI users cannot actually perform the Story 2 update flow."
        affectedFiles:
          - "apps/platform/client/features/projects/source-attachment-section.ts"
          - "apps/platform/client/features/processes/process-materials-section.ts"
          - "apps/platform/client/app/shell-app.ts"
          - "apps/platform/client/browser-api/projects-api.ts"
        requirementIds:
          - "AC-2.2"
          - "AC-2.4"
        recommendedFixScope: "same-session-implementor"
        blocking: true
      -
        id: "SV-02-02"
        severity: "major"
        title: "Updating by sourceAttachmentId breaks once a project has more than 200 attachments"
        evidence: "The story requires loading and updating by `sourceAttachmentId` regardless of scope (docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/02-manage-purpose-access-mode-and-target-ref.md:107-114). In production, `DefaultSourceManagementService.updateSource` first loads `platformStore.listProjectSourceAttachments(...)` and searches that array for the requested id (apps/platform/server/services/sources/source-management.service.ts:85-99). The Convex-backed list query is hard-capped with `.take(200)` (convex/sourceAttachments.ts:42-53), and the project source reader consumes that same capped list for the shell surface (apps/platform/server/services/projects/readers/source-section.reader.ts:17-27). Older attachments therefore disappear from the project list and PATCH can incorrectly return `SOURCE_ATTACHMENT_NOT_FOUND` even though the durable row still exists. The current TC-2.2a test only covers a one-row happy path (tests/service/server/source-management-api.test.ts:363-418), so this production-path limit is unproven and currently incorrect."
        affectedFiles:
          - "apps/platform/server/services/sources/source-management.service.ts"
          - "convex/sourceAttachments.ts"
          - "apps/platform/server/services/projects/readers/source-section.reader.ts"
        requirementIds:
          - "AC-2.1"
          - "AC-2.2"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    requirementCoverage:
      verified:
        - "AC-2.1"
        - "AC-2.3"
      unverified:
        - "AC-2.2"
        - "AC-2.4"
    gatesRun:
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    productionPathFindings:
      - "SV-02-01: the production client surfaces expose attach-only controls, so Story 2 metadata edits are not user-reachable despite the PATCH API existing."
      - "SV-02-02: the production project source list is capped at 200 rows, so older attachments can vanish from the shell and cannot be updated by id."
    recommendedNextStep: "revise"
    recommendedFixScope: "same-session-implementor"
    openQuestions:
[]
    additionalObservations:
      - "AGENTS.md references `docs/onboarding/current-state-*` files, but those onboarding docs are not present in this checkout; verification relied on the story pack, team log, and code/tests instead."
      - "Both configured gates passed, which shows the current automated suite does not yet exercise the missing client edit path or the >200 attachment lookup case."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/004-verify.json"
  startedAt: "2026-05-04T18:54:35.940Z"
  finishedAt: "2026-05-04T19:00:34.849Z"
```
</history_entry>

</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/story-lead/001-current.json
Bytes: 2585

```yaml
storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
storyId: "02-manage-purpose-access-mode-and-target-ref"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "quick-fix completed with outcome ready-for-verification and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/003-implementor.json"
    provenance: "current-run"
  -
    kind: "verifier-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/004-verify.json"
    provenance: "current-run"
  -
    kind: "quick-fix-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df44f-7982-7f41-ab86-9df2d26be27e"
    storyId: "02-manage-purpose-access-mode-and-target-ref"
  storyVerifier:
    provider: "codex"
    sessionId: "019df457-9e59-7a43-aa00-2a29892fccdb"
    storyId: "02-manage-purpose-access-mode-and-target-ref"
latestEventSequence: 13
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "The latest verifier outcome is revise with two blocking major findings. The smallest safe next action is to send those concrete findings to a quick-fix pass rather than accept or re-verify prematurely."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json"
replayBoundary: null
updatedAt: "2026-05-04T19:09:21.072Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: After quick-fix returns, run verifier against the quick-fix result and prior verifier findings; accept only if verifier outcome is pass with SV-02-01 and SV-02-02 fixed and story gate evidenced.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-04T18:45:42.206Z; note="After implementation returns, verify that PATCH proof, client text visibility, and persisted stale transition are all evidenced before choosing verifier or quick-fix."
- sequence=8; actionSequence=7; createdAt=2026-05-04T18:54:35.904Z; note="After verifier returns, accept only if final verifier outcome is pass with no open findings and the story gate remains evidenced; otherwise quick-fix any concrete findings."
- sequence=12; actionSequence=11; createdAt=2026-05-04T19:00:43.605Z; note="After quick-fix returns, run verifier against the quick-fix result and prior verifier findings; accept only if verifier outcome is pass with SV-02-01 and SV-02-02 fixed and story gate evidenced."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/story-lead/001-events.jsonl
Bytes: 6531

```yaml
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 1
  timestamp: "2026-05-04T18:45:29.408Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 2
  timestamp: "2026-05-04T18:45:42.186Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df44f-4761-7c13-91d2-3f12050bc77f"
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 3
  timestamp: "2026-05-04T18:45:42.205Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementation returns, verify that PATCH proof, client text visibility, and persisted stale transition are all evidenced before choosing verifier or quick-fix."
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 4
  timestamp: "2026-05-04T18:45:42.206Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementation returns, verify that PATCH proof, client text visibility, and persisted stale transition are all evidenced before choosing verifier or quick-fix."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 5
  timestamp: "2026-05-04T18:54:27.758Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 6
  timestamp: "2026-05-04T18:54:35.880Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/story-lead/prompts/001-planner-turn-002.md"
    sessionId: "019df457-7e55-7050-ad62-b88b39c780e5"
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 7
  timestamp: "2026-05-04T18:54:35.903Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-verify."
  data:
    actionType: "run-verify"
    turn: 2
    selfNote: "After verifier returns, accept only if final verifier outcome is pass with no open findings and the story gate remains evidenced; otherwise quick-fix any concrete findings."
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 8
  timestamp: "2026-05-04T18:54:35.904Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After verifier returns, accept only if final verifier outcome is pass with no open findings and the story gate remains evidenced; otherwise quick-fix any concrete findings."
    actionSequence: 7
    actionType: "run-verify"
    turn: 2
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 9
  timestamp: "2026-05-04T19:00:34.858Z"
  type: "child-operation-completed"
  summary: "story-verify completed with outcome revise and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/004-verify.json"
  data:
    actionType: "run-verify"
    command: "story-verify"
    outcome: "revise"
    status: "ok"
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 10
  timestamp: "2026-05-04T19:00:43.577Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/02-manage-purpose-access-mode-and-target-ref/story-lead/prompts/001-planner-turn-003.md"
    sessionId: "019df45d-1853-7421-bbcf-0280fa970511"
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 11
  timestamp: "2026-05-04T19:00:43.604Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-quick-fix."
  data:
    actionType: "run-quick-fix"
    turn: 3
    selfNote: "After quick-fix returns, run verifier against the quick-fix result and prior verifier findings; accept only if verifier outcome is pass with SV-02-01 and SV-02-02 fixed and story gate evidenced."
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 12
  timestamp: "2026-05-04T19:00:43.605Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After quick-fix returns, run verifier against the quick-fix result and prior verifier findings; accept only if verifier outcome is pass with SV-02-01 and SV-02-02 fixed and story gate evidenced."
    actionSequence: 11
    actionType: "run-quick-fix"
    turn: 3
-
  storyRunId: "02-manage-purpose-access-mode-and-target-ref-story-run-001"
  sequence: 13
  timestamp: "2026-05-04T19:09:21.072Z"
  type: "child-operation-completed"
  summary: "quick-fix completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/001-quick-fix.json"
  data:
    actionType: "run-quick-fix"
    command: "quick-fix"
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
