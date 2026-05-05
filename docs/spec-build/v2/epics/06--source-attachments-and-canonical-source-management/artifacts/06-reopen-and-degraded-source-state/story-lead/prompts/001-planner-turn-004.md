# Story Lead Base Prompt

## Role Charter
You are the story lead for `06-reopen-and-degraded-source-state` on durable story run `06-reopen-and-degraded-source-state-story-run-001`.
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
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/06-reopen-and-degraded-source-state.md
Bytes: 8418

# Story 6: Reopen and Degraded Source State

### Summary
<!-- Jira: Summary field -->
Restore durable source-management state across reopen and keep healthy sources visible when one source or access path degrades.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who expects source-management state to survive reloads and partial failures.
- **Context:** The user reloads or reopens a project/process later, or one source becomes unavailable while other sources remain healthy.
- **Mental Model:** "The platform restores source state from durable records and degrades one failing source path without hiding the rest."
- **Key Constraint:** Revoked access and unavailable sources must not leak stale source details.

**Objective**

Complete reopen, access-loss, unavailable-source, and bounded degradation behavior for source-management surfaces.

**Scope**

In:

- Project shell source state restoration
- Process work surface current-source restoration
- Safe unavailable source display
- Revoked project/process access blocking
- One-source failure isolation
- Existing section envelope preservation for project and process reads

Out:

- Archive browsing and derived views
- Background source freshness polling
- External-source/MCP attachment
- Full GitHub workflow management

**Dependencies**

- Story 5 detach behavior
- Project and process readers
- Active source resolver
- [tech-design.md](../tech-design.md) Flow 6
- [test-plan.md](../test-plan.md) Chunk 6 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-6.1:** Reloading or reopening the project shell or process work surface restores the latest durable source attachment state.

- **TC-6.1a: Reopen project source attachment state**
  - Given: User previously opened a project with attached sources
  - When: User reloads or reopens the project later
  - Then: The latest durable project source attachment state is restored
- **TC-6.1b: Reopen process source attachment state**
  - Given: User previously opened a process with attached sources
  - When: User reloads or reopens that process later
  - Then: The latest durable process source attachment state is restored

**AC-6.2:** If a requested source attachment is unavailable or access is revoked, the platform shows an unavailable state and does not leak stale source details.

- **TC-6.2a: Unavailable source attachment shown safely**
  - Given: A source attachment is no longer available
  - When: The current shell or process surface loads
  - Then: The platform shows that unavailable state without leaking stale source details
- **TC-6.2b: Revoked access blocks source management**
  - Given: User no longer has access to the project or process
  - When: User opens the related source-management context
  - Then: The platform blocks access and does not leak source details

**AC-6.3:** If one source attachment fails independently, the rest of the source-management surface remains visible.

- **TC-6.3a: One failing source does not hide healthy sources**
  - Given: A source-management surface includes one unavailable source and other healthy sources
  - When: The surface renders
  - Then: The healthy sources remain visible and only the failing source shows the appropriate stale or unavailable state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story owns the durable read model for source-management after reload,
reopen, access loss, or one-source failure. It is a reader story more than a
lifecycle story: Fastify readers and access services decide what is safe and
visible, while Convex remains the durable source of record. The core design seam
is that one failing source path must degrade locally without hiding healthy
sources.

#### Read Paths

| Operation | Method | Path | Responsibility |
|---|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` | Return project-scoped source attachments with Epic 6 metadata in `sourceAttachments.items` |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Return `materials.currentSources` after active-source resolution and shadowing |

#### Reader Responsibilities

- Restore source state from durable Convex records, not from an active environment.
- Exclude detached rows from active current-source lists.
- Apply process-scoped shadowing by `repositoryFullName + targetRef`.
- Preserve existing section envelope behavior.
- Return healthy rows when one source enrichment fails.
- Use `unavailable` state and bounded redaction when the source-of-truth path cannot be safely resolved.
- Block access when project or process access is revoked.

#### Security and Degradation

- All source-management reads require authenticated access.
- Project and process access are enforced server-side.
- Revoked access blocks the whole context and does not leak source details.
- Unavailable source rows expose only safe durable state needed for user understanding.
- One unavailable source does not hide unrelated healthy sources.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Project/process read paths | `apps/platform/server/routes/projects.ts`, `apps/platform/server/routes/processes.ts` |
| Reader behavior and source resolution | `apps/platform/server/services/projects/readers/source-section.reader.ts`, `apps/platform/server/services/processes/readers/materials-section.reader.ts` |
| Active-source resolver | `apps/platform/server/services/processes/readers/materials-section.reader.ts`, `apps/platform/server/services/sources/source-management.service.ts` |
| Client degraded-state rendering | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts`, `apps/platform/client/features/processes/source-provenance-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:661), lines 661-672
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:421), lines 421-434
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:67), lines 67-71

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-6.1a | `tests/service/server/projects-api.test.ts` | reopens project source attachment state |
| TC-6.1b | `tests/service/server/process-work-surface-api.test.ts` | reopens process source attachment state |
| TC-6.2a | `tests/service/client/source-management-ui.test.ts` | unavailable source shown safely |
| TC-6.2b | `tests/service/server/source-management-api.test.ts` | revoked access blocks source management |
| TC-6.3a | `tests/service/server/projects-api.test.ts` | one failing source does not hide healthy sources |

#### Non-TC Decided Tests

- `tests/service/server/source-management-api.test.ts`: unavailable or revoked source reads redact current source details while preserving bounded state

#### Technical Notes

- This story owns redaction and degradation behavior at read time, not source lifecycle changes.

#### Anti-Shim Requirements

- Prove unavailable and revoked states through actual route or rendered read behavior, not only fake section-envelope objects.

#### Verification

- Targeted: `pnpm run test:service`
- Targeted: `pnpm run test:client`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Project shell reload restores latest durable project source attachment state
- Process work surface reload restores latest durable current-source state
- Unavailable source state is shown safely without leaking stale details
- Revoked access blocks source-management context
- One failing source does not hide healthy sources
- Planned tests for TC-6.1a through TC-6.3a are implemented in the files mapped by the test plan


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
- latest_response_path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json
- older_response_count: 2
- caller_input_artifact_count: 0
- prior_self_note_count: 3
- latest_self_note: "After quick-fix returns, run verification again focused on SV-06-01, TC-6.2a real read-path redaction, and story gate evidence before considering acceptance."

## Response Trail
<current_response>
```yaml
kind: quick-fix-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json
bytes: 9232
payload:
  command: "quick-fix"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    provider: "codex"
    model: "gpt-5.4"
    rawProviderOutputPreview: |-
      {"type":"thread.started","thread_id":"019df54b-71cb-70c2-9b29-e504c5eee239"}
      {"type":"turn.started"}
      {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"I’m tracing the unavailable-source redaction path first so we can fix the serialization bug at the source, then I’ll wire route-level tests that prove the real read behavior and run the story-focused checks."}}
      {"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' docs/onboarding/current-state-index.md\"","aggregated_output":"","exit_code":null,"status":"in_progress"}}
      {"type":"item.started","item":{"id":"item_2","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' /Users/leemoore/.codex/skills/diagnose/SKILL.md\"","aggregated_output":"","exit_code":null,"status":"in_progress"}}
      {"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' docs/onboarding/current-state-index.md\"","aggregated_output":"sed: docs/onboarding/current-state-index.md: No such file or directory\n","exit_code":1,"status":"failed"}}
      {"type":"item.completed","item":{"id":"item_2","type":"command_execution","command":"/bin/zsh -lc \"sed -n '1,220p' /Users/leemoore/.codex/skills/diagnose/SKILL.md\"","aggregated_output":"---\nname: diagnose\ndescription: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says \"diagnose this\" / \"debug this\", reports a bug, says something is broken/throwing/failing, or describes a performance regression.\n---\n\n# Diagnose\n\nA discipline for hard bugs. Skip phases only when explicitly justified.\n\nWhen exploring the codebase, use the project's domain glossary to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.\n\n## Phase 1 — Build a feedback loop\n\n**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.\n\nSpend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**\n\n### Ways to construct one — try them in roughly this order\n\n1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.\n2. **Curl / HTTP script** against a running dev server.\n3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.\n4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.\n5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.\n6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.\n7. **Property / fuzz loop.** If the bug is \"sometimes wrong output\", run 1000 random inputs and look for the failure mode.\n8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate \"boot at state X, check, repeat\" so you can `git bisect run` it.\n9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.\n10. **HITL bash script.** Last resort. If a human must click, drive _them_ with `scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.\n\nBuild the right feedback loop, and the bug is 90% fixed.\n\n### Iterate on the loop itself\n\nTreat the loop as a product. Once you have _a_ loop, ask:\n\n- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)\n- Can I make the signal sharper? (Assert on the specific symptom, not \"didn't crash\".)\n- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)\n\nA 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.\n\n### Non-deterministic bugs\n\nThe goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.\n\n### When you genuinely cannot build a loop\n\nStop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.\n\nDo not proceed to Phase 2 until you have a loop you believe in.\n\n## Phase 2 — Reproduce\n\nRun the loop. Watch the bug appear.\n\nConfirm:\n\n- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.\n- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).\n- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.\n\nDo not proceed until you reproduce the bug.\n\n## Phase 3 — Hypothesise\n\nGenerate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.\n\nEach hypothesis must be **falsifiable**: state the prediction it makes.\n\n> Format: \"If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse.\"\n\nIf you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.\n\n**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly (\"we just deployed a change to #3\"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.\n\n## Phase 4 — Instrument\n\nEach probe must map to a specific prediction from Phase 3. **Change one variable at a time.**\n\nTool preference:\n\n1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.\n2. **Targeted logs** at the boundaries that distinguish hypotheses.\n3. Never \"log everything and grep\".\n\n**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.\n\n**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.\n\n## Phase 5 — Fix + regression test\n\nWrite the regression test **before the fix** — but only if there is a **correct seam** for it.\n\nA correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.\n\n**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase.\n\nIf a correct seam exists:\n\n1. Turn the minimised repro into a failing test at that seam.\n2. Watch it fail.\n3. Apply the fix.\n4. Watch it pass.\n5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.\n\n## Phase 6 — Cleanup + post-mortem\n\nRequired before declaring done:\n\n- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)\n- [ ] Regression test passes (or absence of seam is documented)\n- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)\n- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location)\n- [ ] The hypothesis that turned o
    rawProviderOutputBytes: 2540154
    rawProviderOutputTruncated: true
    rawProviderOutputLogPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/streams/006-quick-fix.stdout.log"
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json"
  startedAt: "2026-05-04T23:20:55.354Z"
  finishedAt: "2026-05-04T23:25:55.305Z"
```
</current_response>

<history_responses>

<history_entry>
```yaml
kind: implementor-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/003-implementor.json
bytes: 3889
payload:
  command: "story-implement"
  version: 1
  status: "ok"
  outcome: "ready-for-verification"
  result:
    resultId: "3ae5e584-1fc6-4c92-a183-ec63aca4e0d2"
    provider: "codex"
    model: "gpt-5.4"
    role: "story_implementor"
    sessionId: "019df53e-9bb5-78f3-9a5d-8528217d3dcc"
    continuation:
      provider: "codex"
      sessionId: "019df53e-9bb5-78f3-9a5d-8528217d3dcc"
      storyId: "06-reopen-and-degraded-source-state"
    outcome: "ready-for-verification"
    story:
      id: "06-reopen-and-degraded-source-state"
      title: "Story 6: Reopen and Degraded Source State"
    planSummary: "Implemented Story 6 reopen/degraded-state behavior by making source read synchronization degrade per source instead of failing whole sections, adding bounded unavailable rendering in project and process source UI, and covering reopen/access-loss/degraded-read scenarios with story-scope tests."
    changedFiles:
      -
        path: "apps/platform/server/services/sources/source-refresh.service.ts"
        reason: "Made project source synchronization degrade a single failing source to an unavailable row and clear stale refresh metadata instead of failing the whole read."
      -
        path: "apps/platform/client/features/projects/source-attachment-section.ts"
        reason: "Rendered bounded unavailable state for project source rows without showing stale hydration details."
      -
        path: "apps/platform/client/features/processes/process-materials-section.ts"
        reason: "Rendered bounded unavailable state for process current-source rows without showing stale hydration details."
      -
        path: "tests/service/server/projects-api.test.ts"
        reason: "Added Story 6 coverage for reopening project source state and keeping healthy sources visible when one source lookup fails."
      -
        path: "tests/service/server/process-work-surface-api.test.ts"
        reason: "Added Story 6 coverage for reopening durable process current-source state."
      -
        path: "tests/service/server/source-management-api.test.ts"
        reason: "Added Story 6 coverage for revoked-access blocking on source-management routes."
      -
        path: "tests/service/client/source-management-ui.test.ts"
        reason: "Added Story 6 coverage for safe unavailable-source rendering in project and process source UI."
    tests:
      added:
[]
      modified:
        - "tests/service/server/projects-api.test.ts"
        - "tests/service/server/process-work-surface-api.test.ts"
        - "tests/service/server/source-management-api.test.ts"
        - "tests/service/client/source-management-ui.test.ts"
      removed:
[]
      totalAfterStory: 639
      deltaFromPriorBaseline: 5
    gatesRun:
      -
        command: "corepack pnpm exec vitest run tests/service/server/projects-api.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/source-management-api.test.ts tests/service/client/source-management-ui.test.ts --environment node"
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
        - "Per-source source refresh/read failures now degrade only the affected source row instead of collapsing the whole project or process source section."
        - "Unavailable source rows now render bounded messaging in the client without showing stale hydration details or unsafe refresh affordances."
      findingsSurfaced:
[]
    openQuestions:
      - "AGENTS.md references docs/onboarding/current-state-index.md and related onboarding docs, but those files are not present in this worktree."
    specDeviations:
[]
    recommendedNextStep: "Hand off to verification/review for Story 6 with focus on the new degraded-source read path and reopen-state coverage."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/003-implementor.json"
  startedAt: "2026-05-04T23:06:54.084Z"
  finishedAt: "2026-05-04T23:15:08.319Z"
```
</history_entry>

<history_entry>
```yaml
kind: verifier-result
path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/004-verify.json
bytes: 6724
payload:
  command: "story-verify"
  version: 1
  status: "ok"
  outcome: "revise"
  result:
    resultId: "b28a3228-0a69-407b-86dc-f35cfd6f537b"
    role: "story_verifier"
    provider: "codex"
    model: "gpt-5.4"
    sessionId: "019df546-4e35-7750-9ef5-45833b1b3bbf"
    continuation:
      provider: "codex"
      sessionId: "019df546-4e35-7750-9ef5-45833b1b3bbf"
      storyId: "06-reopen-and-degraded-source-state"
    mode: "initial"
    story:
      id: "06-reopen-and-degraded-source-state"
      title: "Story 6: Reopen and Degraded Source State"
    artifactsRead:
      - "convex/_generated/ai/guidelines.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/stories/06-reopen-and-degraded-source-state.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md"
      - "docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md"
      - "apps/platform/server/services/sources/source-refresh.service.ts"
      - "apps/platform/server/services/projects/readers/source-section.reader.ts"
      - "apps/platform/server/services/processes/readers/materials-section.reader.ts"
      - "apps/platform/server/services/processes/active-process-sources.ts"
      - "apps/platform/shared/contracts/schemas.ts"
      - "apps/platform/shared/contracts/process-work-surface.ts"
      - "apps/platform/client/features/projects/source-attachment-section.ts"
      - "apps/platform/client/features/processes/process-materials-section.ts"
      - "apps/platform/server/routes/source-management.ts"
      - "apps/platform/server/services/sources/source-management.service.ts"
      - "tests/service/server/projects-api.test.ts"
      - "tests/service/server/process-work-surface-api.test.ts"
      - "tests/service/server/source-management-api.test.ts"
      - "tests/service/client/source-management-ui.test.ts"
    reviewScopeSummary: "Reviewed Story 6 against the story, tech design, and test plan, then traced the real project-shell and process work-surface read paths, unavailable-source synchronization, and mapped story tests. Verified focused story tests plus both configured gates (`green-verify`, `verify-all`)."
    priorFindingStatuses:
[]
    newFindings:
      -
        id: "SV-06-01"
        severity: "major"
        title: "Unavailable source reads still serialize stale hydration metadata"
        evidence: "`buildUnavailableSourceAttachment` only flips availability-related fields and leaves prior hydration metadata on the summary (`apps/platform/server/services/sources/source-refresh.service.ts`). The project-shell reader forwards that summary unchanged (`apps/platform/server/services/projects/readers/source-section.reader.ts`), and the process materials reader still emits `lastHydratedAt` / `freshnessReason` whenever present (`apps/platform/server/services/processes/readers/materials-section.reader.ts`). The shared project contract also requires `lastHydratedResolvedRef` and `lastObservedRemoteResolvedRef` on every source row (`apps/platform/shared/contracts/schemas.ts`), so unavailable rows returned from real GET surfaces can still expose prior hydration details. The only new TC-6.2a proof is a synthetic UI-envelope test (`tests/service/client/source-management-ui.test.ts`), which means the route/read path required by the story’s anti-shim rule is not actually proving redaction."
        affectedFiles:
          - "apps/platform/server/services/sources/source-refresh.service.ts"
          - "apps/platform/server/services/projects/readers/source-section.reader.ts"
          - "apps/platform/server/services/processes/readers/materials-section.reader.ts"
          - "apps/platform/shared/contracts/schemas.ts"
          - "apps/platform/shared/contracts/process-work-surface.ts"
          - "tests/service/client/source-management-ui.test.ts"
        requirementIds:
          - "AC-6.2"
          - "TC-6.2a"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    openFindings:
      -
        id: "SV-06-01"
        severity: "major"
        title: "Unavailable source reads still serialize stale hydration metadata"
        evidence: "`buildUnavailableSourceAttachment` only flips availability-related fields and leaves prior hydration metadata on the summary (`apps/platform/server/services/sources/source-refresh.service.ts`). The project-shell reader forwards that summary unchanged (`apps/platform/server/services/projects/readers/source-section.reader.ts`), and the process materials reader still emits `lastHydratedAt` / `freshnessReason` whenever present (`apps/platform/server/services/processes/readers/materials-section.reader.ts`). The shared project contract also requires `lastHydratedResolvedRef` and `lastObservedRemoteResolvedRef` on every source row (`apps/platform/shared/contracts/schemas.ts`), so unavailable rows returned from real GET surfaces can still expose prior hydration details. The only new TC-6.2a proof is a synthetic UI-envelope test (`tests/service/client/source-management-ui.test.ts`), which means the route/read path required by the story’s anti-shim rule is not actually proving redaction."
        affectedFiles:
          - "apps/platform/server/services/sources/source-refresh.service.ts"
          - "apps/platform/server/services/projects/readers/source-section.reader.ts"
          - "apps/platform/server/services/processes/readers/materials-section.reader.ts"
          - "apps/platform/shared/contracts/schemas.ts"
          - "apps/platform/shared/contracts/process-work-surface.ts"
          - "tests/service/client/source-management-ui.test.ts"
        requirementIds:
          - "AC-6.2"
          - "TC-6.2a"
        recommendedFixScope: "same-session-implementor"
        blocking: true
    requirementCoverage:
      verified:
        - "AC-6.1"
        - "TC-6.1a"
        - "TC-6.1b"
        - "TC-6.2b"
        - "AC-6.3"
        - "TC-6.3a"
      unverified:
        - "AC-6.2"
        - "TC-6.2a"
    gatesRun:
      -
        command: "corepack pnpm run green-verify"
        result: "pass"
      -
        command: "corepack pnpm run verify-all"
        result: "pass"
    productionPathFindings:
      - "Real project/process read APIs still rely on client-side hiding for unavailable-source redaction; the runtime payloads can carry prior hydration metadata for degraded rows."
    recommendedNextStep: "revise"
    recommendedFixScope: "same-session-implementor"
    openQuestions:
[]
    additionalObservations:
      - "Focused story tests also passed: `corepack pnpm vitest run tests/service/server/projects-api.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/source-management-api.test.ts tests/service/client/source-management-ui.test.ts`."
      - "`docs/onboarding/current-state-index.md`, `current-state-tech-design.md`, and `current-state-code-map.md` referenced by `AGENTS.md` were not present in this checkout, so this review used the story/spec docs directly."
  errors:
[]
  warnings:
[]
  artifacts:
    -
      kind: "result-envelope"
      path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/004-verify.json"
  startedAt: "2026-05-04T23:15:18.535Z"
  finishedAt: "2026-05-04T23:20:47.580Z"
```
</history_entry>

</history_responses>

## Current Snapshot
### current-snapshot
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/story-lead/001-current.json
Bytes: 2642

```yaml
storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
storyId: "06-reopen-and-degraded-source-state"
attempt: 1
status: "running"
lifecycleState: "awaiting_story_lead_action"
currentSummary: "quick-fix completed with outcome ready-for-verification and status ok."
currentPhase: "story-lead-awaiting-action"
currentChildOperation: null
latestArtifacts:
  -
    kind: "validation-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/001-story-validate.json"
    provenance: "prior-run"
  -
    kind: "implementor-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/003-implementor.json"
    provenance: "current-run"
  -
    kind: "verifier-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/004-verify.json"
    provenance: "current-run"
  -
    kind: "quick-fix-result"
    path: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json"
    provenance: "current-run"
latestContinuationHandles:
  storyImplementor:
    provider: "codex"
    sessionId: "019df53e-9bb5-78f3-9a5d-8528217d3dcc"
    storyId: "06-reopen-and-degraded-source-state"
  storyVerifier:
    provider: "codex"
    sessionId: "019df546-4e35-7750-9ef5-45833b1b3bbf"
    storyId: "06-reopen-and-degraded-source-state"
latestEventSequence: 13
callerInputHistory:
  reviewRequests:
[]
  rulings:
[]
nextIntent:
  actionType: "await-story-lead-action"
  summary: "The latest verifier result is revise with one blocking finding, SV-06-01, and recommends same-session implementor remediation. The smallest safe next action is a bounded quick fix focused only on server-side unavailable-source redaction through real project/process read paths and matching route/render proof for TC-6.2a."
  artifactRef: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json"
replayBoundary: null
updatedAt: "2026-05-04T23:25:55.313Z"
```

## Caller Input Artifacts
None.

## Prior Self Notes
Latest note highlight: After quick-fix returns, run verification again focused on SV-06-01, TC-6.2a real read-path redaction, and story gate evidence before considering acceptance.

All prior runtime self-notes:
- sequence=4; actionSequence=3; createdAt=2026-05-04T23:06:54.050Z; note="After implementor returns, check whether all five mapped TC tests were added or updated and whether route/render evidence proves actual behavior rather than fake section envelopes."
- sequence=8; actionSequence=7; createdAt=2026-05-04T23:15:18.494Z; note="After verifier returns, accept only if verifier outcome is pass with no open findings and story gate evidence remains pass; otherwise route findings to quick-fix or block/request ruling as appropriate."
- sequence=12; actionSequence=11; createdAt=2026-05-04T23:20:55.317Z; note="After quick-fix returns, run verification again focused on SV-06-01, TC-6.2a real read-path redaction, and story gate evidence before considering acceptance."

## Event History
### event-history
Path: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/story-lead/001-events.jsonl
Bytes: 6381

```yaml
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 1
  timestamp: "2026-05-04T23:06:46.655Z"
  type: "story-run-started"
  summary: "Story orchestration run started after orienting from 1 existing artifact(s)."
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 2
  timestamp: "2026-05-04T23:06:54.025Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/story-lead/prompts/001-planner-turn-001.md"
    sessionId: "019df53e-7ea3-7710-a0fe-3216bf7bfbbc"
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 3
  timestamp: "2026-05-04T23:06:54.049Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-implement."
  data:
    actionType: "run-implement"
    turn: 1
    selfNote: "After implementor returns, check whether all five mapped TC tests were added or updated and whether route/render evidence proves actual behavior rather than fake section envelopes."
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 4
  timestamp: "2026-05-04T23:06:54.050Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After implementor returns, check whether all five mapped TC tests were added or updated and whether route/render evidence proves actual behavior rather than fake section envelopes."
    actionSequence: 3
    actionType: "run-implement"
    turn: 1
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 5
  timestamp: "2026-05-04T23:15:08.329Z"
  type: "child-operation-completed"
  summary: "story-implement completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/003-implementor.json"
  data:
    actionType: "run-implement"
    command: "story-implement"
    outcome: "ready-for-verification"
    status: "ok"
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 6
  timestamp: "2026-05-04T23:15:18.454Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/story-lead/prompts/001-planner-turn-002.md"
    sessionId: "019df546-265d-7312-b4ec-9eda896a67fc"
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 7
  timestamp: "2026-05-04T23:15:18.493Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-verify."
  data:
    actionType: "run-verify"
    turn: 2
    selfNote: "After verifier returns, accept only if verifier outcome is pass with no open findings and story gate evidence remains pass; otherwise route findings to quick-fix or block/request ruling as appropriate."
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 8
  timestamp: "2026-05-04T23:15:18.494Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After verifier returns, accept only if verifier outcome is pass with no open findings and story gate evidence remains pass; otherwise route findings to quick-fix or block/request ruling as appropriate."
    actionSequence: 7
    actionType: "run-verify"
    turn: 2
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 9
  timestamp: "2026-05-04T23:20:47.588Z"
  type: "child-operation-completed"
  summary: "story-verify completed with outcome revise and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/004-verify.json"
  data:
    actionType: "run-verify"
    command: "story-verify"
    outcome: "revise"
    status: "ok"
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 10
  timestamp: "2026-05-04T23:20:55.293Z"
  type: "story-lead-provider-started"
  summary: "Fresh story-lead provider turn executed without planner session resume."
  data:
    provider: "codex"
    model: "gpt-5.5"
    reasoningEffort: "medium"
    promptArtifactPath: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/06-reopen-and-degraded-source-state/story-lead/prompts/001-planner-turn-003.md"
    sessionId: "019df54b-5389-77f1-8c45-c0169ce25cc1"
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 11
  timestamp: "2026-05-04T23:20:55.316Z"
  type: "story-lead-action-selected"
  summary: "Story-lead selected run-quick-fix."
  data:
    actionType: "run-quick-fix"
    turn: 3
    selfNote: "After quick-fix returns, run verification again focused on SV-06-01, TC-6.2a real read-path redaction, and story gate evidence before considering acceptance."
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 12
  timestamp: "2026-05-04T23:20:55.317Z"
  type: "story-lead-self-note-recorded"
  summary: "Story-lead recorded a durable self-note for a future planner turn."
  data:
    note: "After quick-fix returns, run verification again focused on SV-06-01, TC-6.2a real read-path redaction, and story gate evidence before considering acceptance."
    actionSequence: 11
    actionType: "run-quick-fix"
    turn: 3
-
  storyRunId: "06-reopen-and-degraded-source-state-story-run-001"
  sequence: 13
  timestamp: "2026-05-04T23:25:55.313Z"
  type: "child-operation-completed"
  summary: "quick-fix completed with outcome ready-for-verification and status ok."
  artifact: "/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/artifacts/quick-fix/006-quick-fix.json"
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
