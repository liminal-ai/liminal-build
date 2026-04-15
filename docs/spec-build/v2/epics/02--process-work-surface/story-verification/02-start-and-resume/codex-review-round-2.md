VERDICT: BLOCK

CORRECTNESS_FINDINGS
- Blocking: non-`409` `start`/`resume` failures still escape as unhandled promise rejections. [process-work-surface-api.ts](/Users/leemoore/code/liminal-build/apps/platform/client/browser-api/process-work-surface-api.ts:64) and [process-work-surface-api.ts](/Users/leemoore/code/liminal-build/apps/platform/client/browser-api/process-work-surface-api.ts:86) throw `ApiRequestError` for any non-OK action response. [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:399) and [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:421) only convert `PROCESS_ACTION_NOT_AVAILABLE` and rethrow everything else. [shell-app.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/shell-app.ts:48) and [shell-app.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/shell-app.ts:51) then `void` those async handlers from button clicks. A `401`, `403`, `404`, `500`, or network failure therefore does not become inline surface state; it rejects off-thread instead.
- Blocking: AC-2.4 is not actually satisfied by the implementation path under review. The real start/resume stores only transition to `running` with `currentRequest: null` in [convex/processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:257) and [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:658). The added client tests only prove that the page can render mocked waiting/completed/failed payloads in [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:447), while the real server action tests in [process-actions-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-actions-api.test.ts:117) never exercise those outcomes. The current Story 2 proof is therefore fixture-driven around a server that still only emits the generic running baseline.

ARCHITECTURE_FINDINGS
- The shell and process-surface action contracts do not line up cleanly. The shell summary vocabulary in [schemas.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/schemas.ts:24) and [convex/processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:220) supports `open` and `rehydrate`, while the process-surface vocabulary in [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:56) and [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:67) swaps in `start` and drops `rehydrate`. Draft `open` vs `start` may be intentional, but this is not a clean single-source-of-truth and it already narrows the interrupted next-path vocabulary on the work surface.

TEST_DIFF_AUDIT
- `git diff 7308d84e6825f1558a0211b666fa71aebdbec119 -- **/*.test.* **/*.spec.*` shows the fix round mainly added client page tests for successful start/resume, mocked `409` stale-action handling, mocked waiting/completed/failed action payloads, live reducer tests for settled-status projection, and server action tests for happy-path start/resume plus invalid-action `409`s.
- The diff did not add any client coverage for non-`409` start/resume failures, any server or integration proof that waiting/completed/failed/interrupted states can come from the real start/resume path, or any test that reconciles the shell-vs-surface action vocabulary split.

TEST_QUALITY_FINDINGS
- The stale-action regression coverage is too narrow. [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:369) and [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:408) cover only `PROCESS_ACTION_NOT_AVAILABLE`, even though the production action handlers still rethrow every other failure class.
- The new AC-2.4 tests are render-fixture checks, not server-behavior proof. [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:447) injects bespoke POST responses that the actual store/mutation path does not currently produce, and [process-actions-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-actions-api.test.ts:117) never validates those settled states at the API boundary.
- [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:176) now codifies the interrupted surface action set without `rehydrate`, which bakes the current contract drift into tests instead of surfacing it.

BLOCKING_FINDINGS
- Non-`409` `start`/`resume` failures still become unhandled promise rejections because the shell app fire-and-forgets the async action handlers.
- AC-2.4 remains unproven against the actual server implementation; the real start/resume path still only returns a generic `running`/`null currentRequest` baseline.

NONBLOCKING_WARNINGS
- No material Story 1 bootstrap or process-route regression was found in the scoped review. The requested gate passed locally, and [process-router.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-router.test.ts:150) plus [process-work-surface-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-work-surface-api.test.ts:170) still cover the dedicated route/bootstrap behavior.

UNRESOLVED
- None. The remaining issues are concrete implementation and proof gaps, not missing information.

GATE_RESULT
- FAIL. `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` passed locally, but Story 2 should not be accepted yet because the blocking findings above remain.
