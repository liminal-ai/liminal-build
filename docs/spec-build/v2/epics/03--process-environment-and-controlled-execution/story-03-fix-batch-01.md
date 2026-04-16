# Story 3 Fix Batch 01

## Context

Story 3 Round 1 dual verification:
- Sonnet Round 1: PASS (4/4 ACs, 6/6 TCs) with 3 nonblocking warnings
- Codex Round 1: REVISE with 1 MAJOR/HIGH blocking finding on AC-3.4

The Codex finding is legitimate and matches the Story 1 Fix Batch 01 pattern
(same-session coherence: action/live publications must include an
environment-aware `process` summary or the client's `process.controls` and
`availableActions` drift stale vs `environment.state` until reload).

Scope of this batch: make execution live publications environment-aware for
ALL three post-hydration env transitions (not just the failure path Codex
literally flagged) — the failure path is the AC-3.4 blocker, but `running`
and `checkpointing` have the same structural issue and fixing only the
failure branch would leave an ugly asymmetry.

## Must Fix

### 1. `ProcessEnvironmentService.runExecutionAsync` — republish process summary on every env transition

File: `apps/platform/server/services/processes/environment/process-environment.service.ts`

Current behavior: On each of the three env transitions inside
`runExecutionAsync` (`running` kickoff, `checkpointing` on success,
`failed` on error), the service calls `processLiveHub.publish(...)` with
only the `environment` field populated.

Required change: For each of those three publications, also include a
`process` field carrying the env-aware summary. Pattern to use (mirrors
the hydration-success path already in the file):

```ts
process: buildProcessSurfaceSummary(currentProcess, nextEnvironment),
```

Where `currentProcess` is the process row after Story 2's
`transitionProcessToRunning` (so it reflects the correct durable
process status) and `nextEnvironment` is the just-upserted env summary.

Implementation hints:
- Capture `currentProcess` once at the start of `runExecutionAsync` (or
  pass it in from the hydration-success caller) and reuse it for all
  three republishes.
- For the `failed` branch, the durable process status is unchanged (we
  do NOT transition the process to a terminal status on execution
  failure per AC-3.4 — keep that). The recomputed summary should still
  reflect the process's current status but with controls derived
  against `environment.state = failed`.

### 2. Regression test for AC-3.4 in-session recovery control update

File: `tests/service/client/process-live.test.ts`

Add ONE focused regression test under the existing Story 3 failure block:

- Seed the client state with a live `process` summary whose
  `availableActions` reflects `environment.state = running` (no
  rehydrate/rebuild).
- Apply a live `environment` upsert transitioning to `failed`, with
  the publication also carrying the recomputed `process` summary.
- Assert the client's rendered `activeProcess.controls` and
  `availableActions` now include `rehydrate` / `rebuild` as enabled
  per the Story 1 control matrix (without any reload or refetch).

Do NOT modify existing Story 3 red-phase assertions. This is a NEW test
case.

## Optional (Preferred — Will Make Verifiers Happy)

### 3. Split non-TC isolation tests — address Sonnet W-1 and Codex's overlap warning

File: `tests/service/client/process-live.test.ts`

The test plan calls for standalone `environment updates do not wipe
unrelated history state` and `environment updates do not wipe unrelated
materials state` cases. Current Story 3 coverage folds these into
`TC-3.4a`. Split them out into two dedicated named tests so the
isolation invariant is independently legible.

This is inside Story 3's planned non-TC coverage — NOT a scope shift.
Only do this if a reasonable effort.

## Out of Scope (Do NOT do)

- Story 4 checkpoint persistence (no lastCheckpointResult population)
- Story 5 rehydrate/rebuild mutation implementations
- Introducing a `waiting` execution result (UNRESOLVED note in Codex
  review — belongs to a later story when waiting-on-user semantics are
  driven by the execution lane)
- Test coverage for secondary store/publication failures inside the
  fire-and-forget lane (UNRESOLVED in Codex review — not a Story 3
  acceptance blocker)
- Codex NONBLOCKING_WARNINGS #2 / #3 (thin server legibility assertion,
  untested fallback blockedReason) — defer

## Guardrails

- Keep this fix bounded. Only items 1 and 2 are required. Item 3 is
  preferred.
- Do NOT weaken any existing test assertions.
- Preserve Story 2 hydration-success path completely — that publication
  already does process+environment correctly.
- Preserve Story 3 red-phase assertions. Only ADD the new AC-3.4
  regression test.
- After fix, rerun `corepack pnpm run verify`.

## Expected Outcome

- `corepack pnpm run verify` green.
- All three env transitions inside `runExecutionAsync` publish a
  recomputed `process` summary alongside `environment`.
- New AC-3.4 regression test demonstrates in-session control recovery
  without reload.
- Ready for fresh dual re-verification.
