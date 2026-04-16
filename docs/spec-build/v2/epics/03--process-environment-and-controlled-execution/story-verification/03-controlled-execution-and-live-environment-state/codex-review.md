VERDICT: REVISE

## AC_TC_COVERAGE

| AC | TC | status | evidence file:line |
|---|---|---|---|
| AC-3.1 | — | SATISFIED | [03-controlled-execution-and-live-environment-state.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/03-controlled-execution-and-live-environment-state.md:46), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:133), [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:607) |
| AC-3.1 | TC-3.1a | SATISFIED | [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:133), [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:673) |
| AC-3.2 | — | SATISFIED | [03-controlled-execution-and-live-environment-state.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/03-controlled-execution-and-live-environment-state.md:53), [process-live-normalizer.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/live/process-live-normalizer.ts:113), [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:79), [process-environment-panel.ts](/Users/leemoore/code/liminal-build/apps/platform/client/features/processes/process-environment-panel.ts:27) |
| AC-3.2 | TC-3.2a | SATISFIED | [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:141), [process-environment-panel.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-environment-panel.test.ts:16), [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:533) |
| AC-3.2 | TC-3.2b | SATISFIED | [process-live-normalizer.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/live/process-live-normalizer.ts:113), [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:79), [process-environment-panel.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-environment-panel.test.ts:29) |
| AC-3.3 | — | SATISFIED | [03-controlled-execution-and-live-environment-state.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/03-controlled-execution-and-live-environment-state.md:64), [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:137), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:175) |
| AC-3.3 | TC-3.3a | SATISFIED | [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:137), [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:215) |
| AC-3.3 | TC-3.3b | SATISFIED | [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:175), [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:684), [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:233) |
| AC-3.4 | — | VIOLATED | [03-controlled-execution-and-live-environment-state.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/03-controlled-execution-and-live-environment-state.md:75), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:155), [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:162), [process-work-surface-page.ts](/Users/leemoore/code/liminal-build/apps/platform/client/features/processes/process-work-surface-page.ts:129), [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:200) |
| AC-3.4 | TC-3.4a | VIOLATED | [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:256), [process-environment-panel.ts](/Users/leemoore/code/liminal-build/apps/platform/client/features/processes/process-environment-panel.ts:37), [process-work-surface-page.ts](/Users/leemoore/code/liminal-build/apps/platform/client/features/processes/process-work-surface-page.ts:129), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:164) |

## TDD_INTEGRITY

- `git diff 414879a -- '**/*.test.*' '**/*.spec.*'` returned no output. Observed result: zero test files modified during green, so there were no post-red changes to classify as legitimate correction, additional coverage, assertion weakening, scope shift, or unexplained.
- `git diff --stat 06eb084..414879a -- '**/*.test.*' '**/*.spec.*'` shows the red phase added 4 test files/blocks with 477 insertions across `tests/service/server/process-live-updates.test.ts`, `tests/service/server/script-execution.service.test.ts`, `tests/service/client/process-live.test.ts`, and `tests/service/client/process-environment-panel.test.ts`. Observed result: behavior-driving tests were introduced in red and made green without later edits.
- Assertion weakening: not observed after red. Hard-coded values are limited to deterministic fixture ids/timestamps inside red tests, and green implementation does not patch tests to match runtime timestamps.
- Wrong-reason passes: not observed in the green diff itself. I tried to disprove this by checking for post-red test edits and by reading the new server/client assertions; the suite still checks for `running`, `checkpointing`, `failed`, blocked reason propagation, and raw-fragment suppression without green-side assertion relaxation.
- Non-TC decided tests present per test plan: partial.
- Present: `calls provider.executeScript with correct args` and `returns the provider's result unchanged` in [script-execution.service.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/script-execution.service.test.ts:19).
- Present in generic live coverage, though not as a new Story 3-specific named test: websocket snapshot/upsert typing and `environment` entity coverage in [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:172).
- Partial rather than explicit: the test plan calls for standalone `environment updates do not wipe unrelated history state` and `...materials state` checks [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:286), but current coverage folds those assertions into `TC-3.4a` in [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:256) instead of separate named tests.

## ARCHITECTURE_FINDINGS

- OBSERVED: `ScriptExecutionService` is seated under `apps/platform/server/services/processes/environment/` and wired once at app startup through [app.ts](/Users/leemoore/code/liminal-build/apps/platform/server/app.ts:122) into [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:9). This matches the environment-module nesting expected by [tech-design-server.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md:132).
- OBSERVED: Story 2 hydration sequencing is preserved before execution kickoff. Hydration still upserts `ready`, transitions the process to `running`, and publishes the combined `process` + `environment` summary before deferring execution with `setTimeout(..., 0)` in [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:43). The Story 3 websocket tests wait for `ready` before asserting later execution states in [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:654) and [process-live-updates.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-live-updates.test.ts:731), so the deviation is sound enough and is tested at the observable seam.
- OBSERVED: live publications continue to travel through the existing `processLiveHub.publish(...)` seam and normalize into typed `environment` current objects, not raw fragments, via [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:141) and [process-live-normalizer.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/live/process-live-normalizer.ts:113).
- OBSERVED: the execution failure path does not mutate process status directly in [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:155). INFERRED: that avoids contradicting AC-3.4 by force-setting the process to an unsupported terminal state, but it also leaves same-session control recomputation incomplete because only `environment` is published after failure.

## SCOPE_BOUNDARY_CHECK

- Story 4 checkpoint-write containment: observed. The green diff is limited to six implementation files, and [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:175) only enters `checkpointing`; it does not call output replacement, artifact persistence, GitHub writers, or checkpoint planners. In the in-memory store, [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:1200) preserves existing `lastCheckpointAt`/`lastCheckpointResult` rather than populating them.
- Story 5 rehydrate/rebuild containment: observed. `git diff --name-only 414879a` touched only `app.ts`, the environment service/adapter/execution wrapper, `process-live.ts`, and `process-environment-panel.ts`; there are no green edits in rehydrate/rebuild routes, mutations, or recovery modules.
- Story 2 boundary preservation: observed. Start/resume still accept into `preparing` and kick off hydration through [process-start.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-start.service.ts:35) and [process-resume.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-resume.service.ts:35); Story 3 deepens only the post-hydration execution lane.

## BLOCKING_FINDINGS

### Finding 1

- finding: Same-session execution failure does not expose an updated recovery path because the failed-environment upsert leaves `process.controls` and `availableActions` stale until a reload.
- severity: MAJOR
- confidence: HIGH
- evidence: AC-3.4 requires the failure state to remain legible "with a failure state and recovery path" in [03-controlled-execution-and-live-environment-state.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/03-controlled-execution-and-live-environment-state.md:75). On execution failure the server publishes only `environment` in [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:155) and [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:201). The client applies `environment` updates without recomputing `process` in [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:162), while the page renders controls only from `activeProcess.controls` in [process-work-surface-page.ts](/Users/leemoore/code/liminal-build/apps/platform/client/features/processes/process-work-surface-page.ts:129). If `buildProcessSurfaceSummary(...)` were rerun against `environment.state = failed`, `rehydrate` and `rebuild` would become enabled per [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:207) and [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:238), but no such recomputation happens on the live failure path.
- disproof_attempt: I checked for a companion `process` publication on the failure path, for any client-side control recomputation on `environment` upserts, and for a page-level test asserting rehydrate/rebuild become available after failure. I found none.
- impact: The surface does show `environment.state = failed` and preserves identity/history/materials, but the actionable next path stays stuck in the pre-failure control model until the user reloads. That misses the Story 3 acceptance boundary for exposing the recovery path in-session.
- validation_step: Add a failing client test that drives a `failed` environment upsert into a running surface and asserts `rehydrate`/`rebuild` controls update immediately, then fix by either publishing a recomputed `process` summary alongside the failed `environment` upsert or by deriving controls client-side from the updated environment state.

## NONBLOCKING_WARNINGS

### Warning 1

- finding: Story 3's non-TC decided coverage is only partially represented as standalone named tests.
- severity: MINOR
- confidence: MEDIUM
- evidence: The test plan calls for explicit `environment updates do not wipe unrelated history state` and `environment updates do not wipe unrelated materials state` cases in [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:286). Current coverage folds those assertions into `TC-3.4a` in [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:256) instead of preserving the standalone decided tests named in the plan.
- disproof_attempt: I searched the client live test file for those named tests and for equivalent standalone cases beyond `TC-3.4a`; I did not find them.
- impact: Coverage still exists for the main preservation behavior, but the planned isolation checks are less explicit than intended, which makes regressions slightly easier to hide inside a broader failure-state test.
- validation_step: Split the history-preservation and materials-preservation assertions into their own reducer tests so the planned non-TC guarantees remain independently legible.

## UNRESOLVED

- UNRESOLVED: The server-side execution contract still cannot emit a first-class `waiting` result because `ExecutionResult` only carries `outcome`, `completedAt`, and `failureReason` in [provider-adapter.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/provider-adapter.ts:8). I found client-side support for rendering `waiting` distinctly in [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:215), so TC-3.3a is satisfied at the surface layer, but there is not enough evidence in this story's green delta to say the controlled-execution lane itself can drive a waiting transition.
- UNRESOLVED: Secondary failures inside the fire-and-forget execution lane are swallowed after the service attempts a failed-environment upsert in [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:191). I did not find dedicated tests for store/publication failure after execution failure.

## GATE_RESULT

Command: `corepack pnpm run verify 2>&1 | tail -30`

```text
      Tests  9 passed (9)
   Start at  20:39:40
   Duration  139ms (transform 76ms, setup 0ms, import 118ms, tests 16ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  11 passed (11)
      Tests  86 passed (86)
   Start at  20:39:41
   Duration  724ms (transform 1.11s, setup 0ms, import 3.12s, tests 867ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  135 passed (135)
   Start at  20:39:42
   Duration  1.26s (transform 1.59s, setup 0ms, import 3.10s, tests 723ms, environment 9.53s)
```

## WHAT_ELSE

- The `setTimeout(..., 0)` deferral is a pragmatic fit for the Story 2/Story 3 seam: it preserves a visible `ready` state without introducing a second public API path, and the websocket tests do observe `ready` before later execution states.
- The green diff stayed tightly scoped to the six implementation files claimed by the implementer, and the red-to-green TDD discipline on test files is clean.
