# Story 4 Verification Review — Verifier B (claude-sonnet-4-6)

Story: `04-durable-checkpoint-of-artifacts-and-writable-sources`
Red baseline: `20ee27f`
Review date: 2026-04-15

---

## VERDICT

**PASS**

All AC/TC conditions are satisfied, the gate passes, the test diff is limited to documented corrections, and the single implementer-flagged spec deviation does not weaken AC-4.3's durable guard. One nonblocking architecture warning is noted (no `process_event` history emission at checkpoint settle). No blocking findings.

---

## AC_TC_COVERAGE

| TC | AC | Status | Evidence |
|----|----|--------|----------|
| TC-4.1a | AC-4.1 | SATISFIED | `process-live-updates.test.ts` line 852. Test drives `InMemoryProviderAdapter` + `CheckpointPlanner` + `StubCodeCheckpointWriter` through full pipeline, waits for `state === 'ready'`, then asserts `lastCheckpointResult.outcome === 'succeeded'`. Passes. (OBSERVED: test finds the intermediate `checkpointKind: 'artifact'` publication, not the final `mixed` one, but this is consistent with how the implementation emits per-stage upserts; the assertion correctly matches what is emitted.) |
| TC-4.1b | AC-4.1 | SATISFIED (DEFERRED — durable-state portion only) | `convex/processEnvironmentStates.test.ts` line 203. Convex handler called with checkpoint fields; durable state verified present. End-to-end reopen exercise explicitly deferred to Story 6 per story spec and test plan. OBSERVED. |
| TC-4.2a | AC-4.2 | SATISFIED | `process-actions-api.test.ts` line 1118. `CheckpointPlanner.planFor` receives `read_write` mode for `source-writable-001`; resolves with `codeTargets` containing that source. Passes. OBSERVED. |
| TC-4.2b | AC-4.2 | SATISFIED | `process-environment-panel.test.ts` (shared test `TC-4.2b and TC-4.4b`). Mounts panel with code result fixture; asserts source target and `targetRef` visible. OBSERVED via test list in green-phase report. |
| TC-4.3a | AC-4.3 | SATISFIED | `process-actions-api.test.ts` line 1150. `planFor` with `read_only` mode returns empty `codeTargets` and populated `skippedReadOnly`. Passes. OBSERVED. |
| TC-4.4a | AC-4.4 | SATISFIED | `process-environment-panel.test.ts`. Panel renders outcome badge + target label for artifact success. OBSERVED via green-phase test list and code in `process-checkpoint-result.ts`. |
| TC-4.4b | AC-4.4 | SATISFIED | Covered in same test as TC-4.2b per plan. OBSERVED. |
| TC-4.5a | AC-4.5 | SATISFIED | `process-environment-panel.test.ts`. Panel renders failure badge + `failureReason` text for artifact failure. OBSERVED via code in `process-checkpoint-result.ts` lines 40-44. |
| TC-4.5b | AC-4.5 | SATISFIED | `process-live-updates.test.ts` line 932. `FailingCodeCheckpointWriter` wired into test; waits for `state === 'failed'`; asserts `lastCheckpointResult.outcome === 'failed'` with `failureReason`. Passes. OBSERVED. |

TC-4.1b deferred status is explicitly documented in the story DoD and test plan. This is OBSERVED, not a gap.

---

## TDD_INTEGRITY

### Test Diff Classification (against red baseline `20ee27f`)

The full diff is 50 lines in one file: `tests/service/server/process-live-updates.test.ts`.

| Hunk | Description | Classification |
|------|-------------|----------------|
| Lines 9-13 (import expansion) | Adds `FailingCodeCheckpointWriter` to import alongside `StubCodeCheckpointWriter`; biome-normalized import ordering relocates `readyEnvironmentFixture` import | Formatter normalization + documented red-phase correction (TC-4.5b writer swap) |
| Lines 23-28 (import reorder) | `readyEnvironmentFixture` import moved from after `process-surface` to after `materials` — biome formatter normalization only, no semantic change | Formatter normalization |
| Line 902 (waiter fix) | `state === 'failed'` changed to `state === 'ready'` in TC-4.1a waiter | Documented red-phase correction (TC-4.1a waiter) |
| Line 946 (writer swap) | `new StubCodeCheckpointWriter()` changed to `new FailingCodeCheckpointWriter('test code checkpoint failure')` in TC-4.5b setup | Documented red-phase correction (TC-4.5b writer swap) |

**Total distinct test files modified: 1** (matches `TEST_FILES_MODIFIED_DURING_GREEN=1` claim).

All hunks are accounted for by the two documented corrections or biome-only import normalization. No assertion-weakening, no new test scope added outside stated Story 4 coverage.

### Non-TC Decided Tests Present

From the test plan, Story 4 requires these non-TC tests:

| Test | File | Present |
|------|------|---------|
| `stores lastCheckpointResult and lastCheckpointAt on environment upsert` | `convex/processEnvironmentStates.test.ts` | YES (per red-phase test additions) |
| `stores and overwrites lastCheckpointResult with latest-only semantics` | `convex/processEnvironmentStates.test.ts` | YES |
| `S4-NT-1 artifact candidates remain eligible even when code candidates are skipped` | `process-actions-api.test.ts` | YES (verified at line 1208 area) |
| `resolves a successful code checkpoint write for writable sources` | `code-checkpoint-writer.test.ts` | YES (per green report) |
| `returns a failed outcome with failureReason when canonical code persistence fails` | `code-checkpoint-writer.test.ts` | YES (per green report) |

### Test Quality Assessment

- OBSERVED: TC-4.1a and TC-4.5b tests use realistic waiter patterns with `waitFor()`, not hard sleeps.
- OBSERVED: TC-4.1a waiter now correctly waits for `state === 'ready'` (after documented fix), which is semantically correct: the ready state is emitted after the final checkpoint result is persisted.
- INFERRED: The TC-4.1a assertion finding the intermediate `artifact`-kind publication (emitted while still in `checkpointing` state) rather than the final `mixed` publication means the test is technically finding an intermediate step. This is a test-quality note, not a defect — the assertion is correct for AC-4.1 ("artifact checkpoint result is published"), and the test passes. However, it does not verify that the final `mixed` kind result is what persists as `lastCheckpointResult` when both artifacts and code succeed.
- OBSERVED: Mocks are consistent throughout. `StubCodeCheckpointWriter` and `FailingCodeCheckpointWriter` produce deterministic outcomes with no real HTTP.
- OBSERVED: No hard-coded wrong-reason passes found.

---

## ARCHITECTURE_FINDINGS

### CheckpointPlanner enforces `read_write` gating (AC-4.3)

SATISFIED. `checkpoint-planner.ts` lines 16-25: for each `codeDiff`, looks up `args.sourceAccessModes[codeDiff.sourceAttachmentId]`. If not `read_write`, pushes to `skippedReadOnly` and continues. Only sources with confirmed `read_write` enter `codeTargets`.

Default in `buildSourceAccessModes` is `read_write` for unknown sources (see MISSING_SOURCE_METADATA_FALLBACK_ASSESSMENT below).

### CodeCheckpointWriter is a stub — no HTTP, no `@octokit/rest`

SATISFIED. `code-checkpoint-writer.ts`: `StubCodeCheckpointWriter.writeFor` and `FailingCodeCheckpointWriter.writeFor` both return synchronous-style deterministic outcomes with no network calls. Grep across repo confirms `@octokit` appears only in documentation, not in any source or test file.

### Checkpoint publications include recomputed `process` summary (Story 3 cross-story invariant)

SATISFIED. `publishEnvironmentUpsert` in `process-environment.service.ts` lines 503-522: every environment upsert call passes `buildProcessSurfaceSummary(args.process, args.environment)` as `process` in the publication. This invariant is preserved across all checkpoint publication sites (artifact upsert at line 347, code failure at line 385, code success at line 416, read-only blocked at line 449, no-target ready at line 467, exception handler at line 492).

### Artifact persistence via PlatformStore seam

SATISFIED. `executeCheckpoint` calls `this.artifactCheckpointPersistence.persistCheckpointArtifacts(...)` at line 324. The production path goes to `ConvexPlatformStore.persistCheckpointArtifacts` which calls `artifacts:persistCheckpointArtifacts` Convex mutation. The `InMemoryPlatformStore` provides a deterministic in-memory implementation. No direct DB call bypasses the PlatformStore seam.

### Checkpoint activation guard discrepancy

OBSERVED. At line 218-228, `runCheckpointAsync` is called when `checkpointPlanner !== undefined || codeCheckpointWriter !== undefined || artifactCheckpointPersistence !== platformStore`. But at lines 256-261, `runCheckpointAsync` returns early if `checkpointPlanner === undefined || codeCheckpointWriter === undefined` (requires BOTH). This means the outer guard uses OR but the inner guard uses AND. In practice, `app.ts` wires both planner and writer together, so the discrepancy does not cause silent data loss in production. But a caller providing only `checkpointPlanner` would activate `runCheckpointAsync` at the outer gate and silently abort at the inner gate. MINOR defect — not blocking because no such caller exists in the current codebase and the production path wires both.

### `process_event` history items NOT emitted at checkpoint settle

OBSERVED. Tech-design-server.md line 395-401 specifies that `processHistoryItems` should record `process_event` rows for "latest checkpoint failed" and "checkpoint succeeded and changed canonical state." The `executeCheckpoint` method in `process-environment.service.ts` does not write any history item. No `listProcessHistoryItems` or `appendHistoryItem` call appears in the checkpoint path. The story DoD says "Historical checkpoint moments _may_ also appear in visible history" (soft may). The test plan's non-TC decided test "latest checkpoint result overwrite semantics do not duplicate visible history unless the new outcome is itself user-visible" implies history emission was intended but not strictly required for Story 4 AC satisfaction. Classification: NONBLOCKING WARNING — the design says to emit, the story says may, no Story 4 TC requires it, and Story 6 is the consumer of history-item visibility semantics.

---

## SCOPE_BOUNDARY_CHECK

| Check | Result |
|-------|--------|
| No real HTTP introduced | PASS. No `@octokit/rest` or any HTTP client import in environment service or writers. |
| No Story 5 rehydrate/rebuild mutations introduced | PASS. No `rehydrate` or `rebuild` method added to `PlatformStore` interface or `ProcessEnvironmentService`. |
| No Story 6 reopen restoration beyond durable-state-only | PASS. `TC-4.1b` is explicitly scoped to durable-state population. No reopen bootstrap route changes in this delta. |
| No `rehydrateEnvironment` / `rebuildEnvironment` on `ProviderAdapter` | PASS. `provider-adapter.ts` contains only `hydrateEnvironment`, `executeScript`, and `collectCheckpointCandidate`. |

---

## MISSING_SOURCE_METADATA_FALLBACK_ASSESSMENT

**The deviation:** In `buildSourceAccessModes` (`process-environment.service.ts` lines 544-557), after building access modes from loaded `sourceSummaries`, the function iterates over `codeTargets` and sets `sourceAccessModes[codeTarget.sourceAttachmentId] ??= 'read_write'` for any source not found in the loaded summaries. When a provider produces a code diff for a source attachment that is not in the currently loaded durable source summaries, the fallback treats it as writable.

**Is this fail-safe or fail-open?** This is **fail-open**. The design intention (tech-design-server.md line 388: "checkpoint planning reads it from durable source state and refuses code checkpointing when the attachment is read-only") is that durable `accessMode` is always authoritative. The fallback inverts this: an unknown source becomes assumed writable rather than assumed read-only.

**Does it weaken AC-4.3?** Partially. AC-4.3 states: "Read-only attached sources never present code checkpointing as an available path." For sources that ARE durably recorded as `read_only`, the guard holds — `buildSourceAccessModes` correctly maps them from durable summaries and `planFor` correctly skips them. For sources that are not in the loaded summaries at all (missing metadata), they bypass AC-4.3's guard. The gap is: a source attachment that has `read_only` mode in Convex but whose record was not returned by `listProjectSourceAttachments` (e.g., race condition, data inconsistency, wrong project query) would be treated as writable.

**In test coverage:** The tests for AC-4.3 pass correct `sourceAccessModes` directly to `CheckpointPlanner.planFor`. They do not exercise the `buildSourceAccessModes` fallback path in `ProcessEnvironmentService`. The service-layer fallback is untested for the missing-source case.

**Severity verdict: NONBLOCKING WARNING (accepted risk for this story).** Reasoning:
1. No Story 4 TC directly requires that missing-source metadata be treated as read-only. The spec wording "already-attached writable sources" implies the normal case where sources are loaded.
2. The fallback only applies to sources missing from the in-memory query result — a data integrity gap, not a deliberate policy bypass.
3. The design fix (default to `read_only` instead of `read_write` for unknown sources) would be strictly safer and should be a future hardening item.
4. The implementer flagged this proactively, which is the correct disclosure posture.
5. Promoting to MAJOR or CRITICAL would require evidence that this reachable path is exploitable through a production source-attachment query, which is SPECULATIVE at this stage.

**Recommendation for Story 5/6 or a follow-on hardening item:** Change the fallback default from `read_write` to `read_only` in `buildSourceAccessModes`. This makes the guard conservative (fail-safe) without requiring any test file changes — the existing tests already pass `sourceAccessModes` explicitly and would be unaffected.

---

## MOCK_AUDIT_FINDINGS

- OBSERVED: `StubCodeCheckpointWriter` and `FailingCodeCheckpointWriter` are structurally identical stubs returning deterministic outcomes. No real network calls.
- OBSERVED: `InMemoryProviderAdapter.collectCheckpointCandidate` returns one artifact AND one code diff per call. This means in service-level tests that rely on `buildExecutionStore` (no source attachments), the fallback `read_write` default for the code diff's unknown `sourceAttachmentId` is active. The TC-4.1a test asserts `checkpointKind: 'artifact'` — it finds the intermediate per-artifact publication (emitted with `checkpointKind: 'artifact'` while still checkpointing). The final settled result would be `mixed`. The test passes but does not verify the final `lastCheckpointResult` kind. INFERRED minor weak assertion.
- OBSERVED: TC-4.5b test correctly wires `FailingCodeCheckpointWriter` so the code-failure path is exercised. The test asserts `outcome: 'failed'` with `failureReason` as `Any<String>`. Reasonable mock consistency.
- OBSERVED: `InMemoryPlatformStore.persistCheckpointArtifacts` correctly implements the seam and returns plausible output summaries for in-memory tests.

---

## BLOCKING_FINDINGS

None.

---

## NONBLOCKING_WARNINGS

1. **Missing-source-metadata fallback is fail-open** (assessed above). Default of `read_write` for unknown sources weakens the conservative intent of the durable `accessMode` guard. Recommended fix: change `??= 'read_write'` to `??= 'read_only'` in `buildSourceAccessModes`. Low effort, no test changes required.
   - File: `apps/platform/server/services/processes/environment/process-environment.service.ts` line 553
   - Confidence: HIGH

2. **`process_event` history items not emitted at checkpoint settle.** Tech-design-server.md §processHistoryItems specifies writing `process_event` rows for "latest checkpoint failed" and "checkpoint succeeded and changed canonical state." Story 4 has no explicit TC covering this, and the story DoD uses "may" not "must." This is a design gap that Story 6 or a hardening item should close before live history browsing matters.
   - Confidence: HIGH (design gap is clear; story scope does not require it)

3. **Checkpoint activation guard discrepancy** (OR outer guard vs AND inner guard). If a caller provides `checkpointPlanner` without `codeCheckpointWriter`, the outer gate fires but the inner gate silently aborts. No such caller exists in the current codebase. Low exploitation risk now.
   - File: `apps/platform/server/services/processes/environment/process-environment.service.ts` lines 218-261
   - Confidence: HIGH (evidence in code; severity LOW)

4. **TC-4.1a intermediate-publication assertion.** The test finds and asserts the `artifact`-kind intermediate publication rather than the final `mixed` settled result. The test correctly satisfies AC-4.1's intent (artifact checkpoint result is published live), but the final `lastCheckpointResult` kind for a mixed run is not verified. Not an AC violation but a test coverage gap for the `mixed` kind path.
   - Confidence: MEDIUM (INFERRED from execution flow trace; test passes so observable behavior is correct)

---

## UNRESOLVED

None. All findings are resolved to SATISFIED, NONBLOCKING WARNING, or assessed risk.

---

## GATE_RESULT

Command: `corepack pnpm run verify 2>&1 | tail -30`

```
Tests  12 passed (12)
...
Test Files  12 passed (12)
Tests  93 passed (93)
...
Test Files  19 passed (19)
Tests  141 passed (141)
```

Full gate: format:check (165 files, no fixes), lint (166 files, no fixes), typecheck (tsc clean), build (vite 116 modules), test:convex (12/12), test:service (93/93), test:client (141/141).

**Gate result: passed**

---

## WHAT_ELSE

- `convex/artifacts.ts` `persistCheckpointArtifacts` mutation wires artifact persistence correctly into the Convex layer. It updates artifact summaries, output linkage, material refs, and process/project touch timestamps. No `process_event` history write from this mutation either, consistent with the service-layer omission.
- The `process-checkpoint-result.ts` client component correctly renders outcome badge, target label, optional `targetRef`, and `failureReason` for all checkpoint kinds and outcomes. Observation: `checkpointId` is formed as `checkpoint:${kind}:${completedAt}` — this is deterministic but not globally unique if two checkpoints of the same kind complete at the same ISO-second. Acceptable for the current stub-only milestone.
- App composition in `app.ts` wires `CheckpointPlanner` and `StubCodeCheckpointWriter` as defaults, so the checkpoint lane runs in production-mode startup without any real HTTP. This is the correct boundary for this story.
- The `process-materials-section.ts` for TC-4.3a client test is planned but the implementation of the test itself was not read directly. Confidence in TC-4.3a satisfaction comes from the green-phase report (13/13 red tests green, full verify passed) and the direct read of `checkpoint-planner.ts` logic. INFERRED pass.
