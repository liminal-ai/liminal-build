# Epic 3 Nit Fix Batch

17 items. No design-complex work — items 15 (stale fingerprint) and 16
(execution rich lifecycle) are genuine future work and excluded. Item 18
(convex codegen) is environment setup, not code.

---

## Doc Fixes (3 items)

### 1. Sanction `rehydrating` in the epic spec

File: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md`

Add `rehydrating` to the environment state vocabulary in the Environment
Summary table (line ~583) and the environment-state/control matrix
(line ~162-174). Add a row for `rehydrating` with the same control
behavior as `preparing` (lifecycle controls disabled, respond/review
follow process state). This is the simpler path vs collapsing
`rehydrating` back into `preparing`.

### 2. Source writability wording alignment

File: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md`

Find "already-attached writable repositories" and align with the code's
`accessMode === 'read_write'` vocabulary. Replace with
"already-attached writable sources" or "sources with
`accessMode: read_write`".

### 3. Error classes → error-code vocabulary

File: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/00-foundation.md`

If the Story 0 text says "error classes", update to "error-code
vocabulary on `AppError`" to match the actual implementation pattern.

---

## Code Fixes (3 items)

### 4. Emit `process_event` history rows for environment lifecycle moments

File: `apps/platform/server/services/processes/environment/process-environment.service.ts`

At key lifecycle transitions, emit a `process_event` visible history row
via `platformStore.appendProcessHistoryItem(...)` (or whatever the
existing method is — check `processHistoryItems.ts` for the write seam).

Moments to emit:
- Environment preparation started (after `preparing` upsert in
  `runHydrationAsync`)
- Execution failed (after `failed` upsert in `runExecutionAsync`)
- Checkpoint settled — succeeded or failed (after `lastCheckpointResult`
  upsert in `runCheckpointAsync`)
- Rebuild started (after `rebuilding` upsert in `runRebuildAsync`)

Use `kind: 'process_event'` with `text` describing the moment. Keep it
minimal — one line per moment. Don't emit for every intermediate state
(no `running` or `checkpointing` events — those are transient).

### 13. ConvexPlatformStore hydration-plan persistence

File: `apps/platform/server/services/projects/platform-store.ts`

The `ConvexPlatformStore` class needs real `setProcessHydrationPlan` and
`getProcessHydrationPlan` implementations instead of no-ops.

- `setProcessHydrationPlan`: write the plan to
  `processEnvironmentStates` (the plan fields are already in the Convex
  schema validators — `artifactIds`, `sourceAttachmentIds`, `outputIds`
  on the `workingSetPlan` field or similar).
- `getProcessHydrationPlan`: read it back from the same row.

Check what `InMemoryPlatformStore` does for these methods and replicate
the semantics in `ConvexPlatformStore` using real Convex mutations/queries.

If the Convex schema needs a new field on `processEnvironmentStates` for
the plan, add it. If it's already there (check the validators), just
wire it.

### 17. Wire `providerKind` from config on first environment creation

File: `apps/platform/server/services/processes/environment/process-environment.service.ts`

Currently `providerKind: null` is passed to
`upsertProcessEnvironmentState` on first env creation. Instead, read
from a config default (the tech design says `defaultEnvironmentProviderKind`
from server config — check `apps/platform/server/config.ts` or
`app.ts`). If no config mechanism exists, default to `'local'` and add
a `TODO: read from server config` comment. The point is to stop
persisting `null`.

---

## Test Additions (9 items)

### 5. Add TC-4.5b labeled test

File: `tests/service/server/process-live-updates.test.ts`

Check if TC-4.5b already exists (it should from Story 4). If it exists
but isn't labeled, add the label. If it doesn't exist: add a test that
drives a code-checkpoint failure through `FailingCodeCheckpointWriter`
and asserts `lastCheckpointResult.outcome === 'failed'` with
`checkpointKind: 'code'` in the live publication.

### 6. Strengthen server TC-3.4a legibility assertion

File: `tests/service/server/process-live-updates.test.ts`

Find the TC-3.4a test (execution failure). Currently it only checks
entity presence. Add payload content assertions: the `process` payload
should include `hasEnvironment: true`, `controls` with recovery actions
enabled, and the `environment` payload should include `state: 'failed'`
with a non-empty `blockedReason`.

### 7. Start/respond same-session regression tests

File: `tests/service/server/process-actions-api.test.ts`

Story 1 Fix Batch 01 added a `resume` regression test proving
same-session process summary stays env-aware. Add symmetric versions for
`start` and `respond`:
- Start a draft process with a seeded non-absent environment. Assert the
  returned `process.hasEnvironment` and `process.controls` reflect that
  environment state.
- (For respond: seed a waiting process with a non-absent env and
  unresolved current request. Submit a response. Assert the returned
  process summary is env-aware.)

### 8. Explicit respond/review control-matrix assertions

File: `tests/service/client/process-controls.test.ts`

Add 2-3 assertions for the `respond` and `review` controls across
different environment states. Currently the matrix tests focus on
environment-specific controls (rehydrate/rebuild/restart) but `respond`
and `review` are asserted implicitly. Make them explicit for at least
`running` and `failed` states.

### 9. Deeper integration test: write→recovery→reopen chain

File: `tests/integration/process-work-surface.test.ts`

Add one test that exercises the full chain in sequence against
`InMemoryPlatformStore`:
1. Start a process (enters preparation → hydration → execution →
   checkpoint → lastCheckpointResult populated)
2. Seed the env as `lost` (simulating environment loss)
3. Rebuild
4. Reopen (fresh bootstrap request)
5. Assert: lastCheckpointResult still visible, history not duplicated,
   environment shows the rebuilt state

This is the TC-4.1b carry-forward test done properly as a real chain
instead of seeded state.

### 10. Failed + null environmentId edge case

File: `tests/service/server/process-live-updates.test.ts`

Add one test: drive an environment failure when `environmentId` is null
(never provisioned — e.g., provider `ensureEnvironment` fails before
returning an ID). Assert: `environment.state = 'failed'`,
`environmentId` remains null, `blockedReason` is set.

### 11. Materials refresh after artifact checkpoint

File: `tests/service/client/process-live.test.ts`

Add one test: after a successful checkpoint that persists an artifact
output, a subsequent live `materials` upsert includes the new artifact.
If the current implementation doesn't publish a materials update after
checkpoint, the test should FAIL — flag this as a gap rather than
faking it.

### 19. Rename mislabeled TC-2.6 tests

File: `tests/service/client/process-work-surface-page.test.ts`

Find tests labeled `TC-2.6a`, `TC-2.6b`, `TC-2.6c`. These TCs don't
exist in the story spec. Either:
- Rename to descriptive names without TC prefix (e.g., "preparation
  state visible after start action")
- Or map them to the actual TC they exercise (TC-2.1a, TC-2.3a, etc.)

### 22. Clean up stale environmentCompleteLiveFixture reference

If Story 0's DoD or any doc references `environmentCompleteLiveFixture`
and it was never created, remove the reference. If the fixture IS needed
(for `complete` message type on the `environment` entity), create it in
`tests/fixtures/live-process.ts`.

---

## One-Line Fixes (2 items)

### 14. ConvexPlatformStore.hasCanonicalRecoveryMaterials

File: `apps/platform/server/services/projects/platform-store.ts`

The method currently returns `true` unconditionally. Implement a real
check: query the process's current material refs (via the per-type state
tables or the materials reader) and return `false` when no current
artifacts AND no current source attachments exist for the process.

If the necessary Convex queries don't exist yet, add them. This is
bounded — it's a "do materials exist?" boolean, not a deep
canonical-freshness computation.

### 20. Document the setTimeout execution-kickoff deviation

File: `apps/platform/server/services/processes/environment/process-environment.service.ts`

Find the `setTimeout(..., 0)` that defers execution kickoff after
hydration success. Add a one-line comment:
```
// Deferred one tick so Story 2 bootstrap reads observe durable `ready` before execution advances the env state.
```

---

## Guardrails

- Do NOT implement stale-detection fingerprint (item 15 — future work).
- Do NOT expand ExecutionResult with waiting/history/side-work (item 16 — future work).
- Do NOT touch convex codegen or deployment (item 18 — environment setup).
- Do NOT weaken existing test assertions.
- Preserve all existing Story 1-6 behavior.
- After all fixes, run `corepack pnpm run verify`.
