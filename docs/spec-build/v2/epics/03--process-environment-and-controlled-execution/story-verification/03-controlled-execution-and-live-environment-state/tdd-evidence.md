# Story 3 TDD Evidence Bundle

## Story

- Story: `stories/03-controlled-execution-and-live-environment-state.md`
- Red baseline commit: `414879a` (`test: Story 3 — red phase (skeleton + TDD tests)`)
- Green diff applied on top of red baseline; not yet committed as the story acceptance commit
- ACs: AC-3.1 through AC-3.4; TCs: TC-3.1a, TC-3.2a, TC-3.2b, TC-3.3a, TC-3.3b, TC-3.4a

## Red Phase Report

See `red-phase-report.md` in this directory for full detail. Summary:

- 10 new failing tests written against the Story 3 skeleton
- All 10 tests fail for "behavior absent / NOT_IMPLEMENTED" (not compile errors, not wrong fixtures)
- Red-verify gate (format + lint + typecheck + build) passed
- Skeleton files:
  - NEW `services/processes/environment/script-execution.service.ts` (ScriptExecutionService.executeFor throws NOT_IMPLEMENTED)
  - MODIFIED `services/processes/environment/provider-adapter.ts` (added `executeScript` to interface + stubs in both InMemoryProviderAdapter and FailingProviderAdapter)
  - MODIFIED `services/processes/environment/process-environment.service.ts` (optional ScriptExecutionService ctor dep, `runExecutionAsync` private method throws NOT_IMPLEMENTED, called after hydration success in try/catch)
- Test files in red (all new or new-block additions):
  - NEW `tests/service/server/script-execution.service.test.ts` (2 tests)
  - MODIFIED `tests/service/server/process-live-updates.test.ts` (new `server-driven environment execution` describe block)
  - MODIFIED `tests/service/client/process-live.test.ts` (new reducer tests for running/checkpointing/failed)
  - NEW `tests/service/client/process-environment-panel.test.ts` (2 rendering tests for TC-3.2a / TC-3.2b)

## Green Phase Report

See `green-phase-report.md` for full detail. Summary:

- All 10 red tests now pass
- Gate: `corepack pnpm run verify` → passed
- Zero test files modified during green — all red assertions preserved
- Implementation changes:
  - `script-execution.service.ts`: thin wrapper calling `providerAdapter.executeScript` and returning result unchanged
  - `provider-adapter.ts`: `InMemoryProviderAdapter.executeScript` resolves `{ outcome: 'succeeded', completedAt }`; `FailingProviderAdapter.executeScript` rejects with reason
  - `process-environment.service.ts`: `runExecutionAsync` now:
    1. preserves existing hydration success publication + process transition
    2. advances environment to `running` async and publishes
    3. calls `scriptExecutionService.executeFor(...)`
    4. publishes `checkpointing` on success (no canonical checkpoint — Story 4)
    5. publishes `failed` with blockedReason on thrown/failed outcome
    6. swallows internal failures; no unhandled rejections escape
  - `app.ts`: wires `ScriptExecutionService` into `ProcessEnvironmentService`; optional `CreateAppOptions.scriptExecutionService` override
  - `process-live.ts` (client): extended reducer normalizes coherent env labels and clears stale `running` when process moves to `waiting`
  - `process-environment-panel.ts` (client): renders process-facing labels from `environment.state`
- Green-phase spec deviation (noted by implementer): execution kickoff is deferred one event-loop turn after hydration success so the durable `ready` bootstrap remains observable. External state sequence unchanged.

## Test Diff vs Red Baseline (for verifier diff audit)

Run: `git diff 414879a -- '**/*.test.*' '**/*.spec.*'`

Expected outcome: **no test file changes** (implementer preserved every red assertion).

## Orchestrator Gate Spot-Check

See message body for the exact gate output captured by the orchestrator after green phase.

## Round-2 Equivalent Blockers (preemptive check for verifiers)

Story 3 has no prior rounds, but the verifier should still confirm these story-level invariants:
1. No `process.status = running` is asserted before `environment.state = ready` was published (preserves Story 2 boundary)
2. `checkpointing` state is visible but no canonical artifact or code persistence happens (Story 4 boundary preserved)
3. Execution failure does NOT erase process identity, history, or materials (AC-3.4)
4. Environment updates do not wipe unrelated history/materials/side-work state (non-TC decided test + AC-3.2b)
