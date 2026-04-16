# CHANGES

- `apps/platform/server/services/processes/environment/script-execution.service.ts`
  Implemented `ScriptExecutionService.executeFor(...)` as the thin wrapper the red tests expected: it now calls `providerAdapter.executeScript(...)` and returns the provider result unchanged.
- `apps/platform/server/services/processes/environment/provider-adapter.ts`
  Completed the execution stubs. `InMemoryProviderAdapter.executeScript(...)` now succeeds with a completion timestamp, and `FailingProviderAdapter.executeScript(...)` now rejects with its configured reason so execution failures can be driven through the same error path as hydration failures.
- `apps/platform/server/services/processes/environment/process-environment.service.ts`
  Replaced the Story 3 execution placeholder with real fire-and-forget execution orchestration. On hydration success it now:
  1. preserves the existing `ready` publication and process transition
  2. asynchronously advances the environment to `running`
  3. calls `scriptExecutionService.executeFor(...)`
  4. publishes `checkpointing` on success
  5. publishes `failed` with `blockedReason` on thrown or returned execution failure
  It also swallows execution-path failures so no unhandled rejection escapes the async lane, and it preserves Story 2 `ready` bootstrap visibility by deferring execution kickoff one event-loop turn.
- `apps/platform/server/app.ts`
  Wired `ScriptExecutionService` into the app composition root, added optional `CreateAppOptions.scriptExecutionService`, and passed the service into `ProcessEnvironmentService`.
- `apps/platform/client/app/process-live.ts`
  Extended live reconciliation so environment upserts normalize coherent labels from `environment.state`, and process transitions to `waiting` clear a stale `running` environment state without disturbing history, materials, side work, or current request state.
- `apps/platform/client/features/processes/process-environment-panel.ts`
  Updated the panel to render process-facing labels from `environment.state` so `running` and `checkpointing` stay coherent even if transport payloads contain raw provider fragments.

# TEST_RESULTS

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  4 passed (4)
      Tests  34 passed (34)
   Start at  20:33:28
   Duration  612ms (transform 214ms, setup 0ms, import 668ms, tests 312ms, environment 0ms)
```

# GATE_RESULT

passed

```text
✓ built in 30ms

> liminal-build@ test:convex /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run convex --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  3 passed (3)
      Tests  9 passed (9)
   Start at  20:33:34
   Duration  136ms (transform 74ms, setup 0ms, import 116ms, tests 15ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  11 passed (11)
      Tests  86 passed (86)
   Start at  20:33:35
   Duration  687ms (transform 986ms, setup 0ms, import 2.92s, tests 822ms, environment 0ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  135 passed (135)
   Start at  20:33:36
   Duration  1.14s (transform 1.10s, setup 0ms, import 2.47s, tests 592ms, environment 9.00s)
```

# TEST_FILE_DIFFS_FROM_RED

no test files modified during green — all red assertions preserved

# RESIDUAL_RISKS

- Execution failures with no provider-supplied `failureReason` fall back to a generic blocked reason; that fallback is not explicitly covered by current tests.
- The fire-and-forget execution lane now swallows internal execution-path failures after attempting a failed-environment upsert; that protects the server from unhandled rejections, but secondary store/publication failures are not surfaced by dedicated tests yet.
- Story 3 still does not persist checkpoint artifacts or code results by design; `checkpointing` is visible, but long-tail checkpoint recovery behavior remains a Story 4 concern.

# SPEC_DEVIATIONS

- Execution kickoff is deferred by one event-loop turn after hydration success so existing Story 2 bootstrap reads can still observe durable `ready` before Story 3 advances the environment to `running` and `checkpointing`. The externally tested state sequence remains unchanged.
