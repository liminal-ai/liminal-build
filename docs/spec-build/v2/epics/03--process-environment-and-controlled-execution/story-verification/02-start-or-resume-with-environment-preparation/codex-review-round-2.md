VERDICT: REVISE

CORRECTNESS_FINDINGS
- Blocking: `start` and `resume` still only update durable summaries and record a working-set plan (`apps/platform/server/services/processes/process-start.service.ts:33-65`, `apps/platform/server/services/processes/process-resume.service.ts:33-66`, `apps/platform/server/services/processes/environment/hydration-planner.ts:1-18`). There is no shipped path that creates a working copy or hydrates current artifacts, outputs, and sources into it. That falls short of AC-2.2's "hydrates ... into the working copy" language and leaves AC-2.3/AC-2.4 dependent on fixtures rather than behavior.
- Blocking: the process still enters `running` before readiness. The shared Convex transition helper immediately patches `status: 'running'` (`convex/processes.ts:702-727`), and the Story 2 services then overlay `environment.state = preparing` on top of that (`apps/platform/server/services/processes/process-start.service.ts:33-67`, `apps/platform/server/services/processes/process-resume.service.ts:33-68`). AC-2.4 says active running begins only after the required working set is ready or a recoverable failure is shown.
- The updated tests now codify that premature mixed state as acceptable by asserting `process.status = running` while `environment.state = preparing` (`tests/service/server/process-actions-api.test.ts:816-829`, `tests/service/client/process-work-surface-page.test.ts:1367-1424`). That makes the surface look more complete than the story allows.

ARCHITECTURE_FINDINGS
- The implementation does not match the Story 2 server architecture. The tech design expects `process-environment.service.ts`, `environment-orchestrator.ts`, and provider-adapter wiring to own accepted-action vs later-hydration work, but `createApp()` still wires only the legacy process services and no environment subsystem (`apps/platform/server/app.ts:78-121`). In the current tree, `apps/platform/server/services/processes/environment/` contains only `hydration-planner.ts`.
- The production store diverges from the test double. `ConvexPlatformStore.getProcessHydrationPlan()` always returns `null` and `setProcessHydrationPlan()` just echoes the input without persisting it (`apps/platform/server/services/projects/platform-store.ts:726-735`), while `InMemoryPlatformStore` does persist plans. So even the narrower "stored hydration plan" claim is not true on the live Convex-backed path.

TEST_DIFF_AUDIT
- `git diff 326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579 -- **/*.test.* **/*.spec.*` shows Story 2 changes concentrated in client page/live/materials tests and server action/bootstrap tests. No server live-update test was added for action-driven hydration progress or failure.
- `tests/service/server/process-actions-api.test.ts` adds same-session `preparing` assertions and hydration-plan assertions, but it builds the app only with `InMemoryPlatformStore` (`tests/service/server/process-actions-api.test.ts:135-174`). It never exercises the real Convex store or any provider boundary.
- `tests/service/client/process-live.test.ts` proves only that the client store can consume synthetic environment fixtures (`tests/service/client/process-live.test.ts:88-189`). It is not evidence that the server can ever emit those transitions after an accepted `start` or `resume`.
- `tests/service/client/process-work-surface-page.test.ts` correctly checks same-session environment rendering, but several added assertions explicitly require the page to show `Running` while the environment panel says `Preparing environment` (`tests/service/client/process-work-surface-page.test.ts:1367-1424`), which conflicts with AC-2.4.
- AC-2.5 coverage is the strongest part of the diff: bootstrap projection and materials rendering now cover `read_only` vs `read_write` access mode.

TEST_QUALITY_FINDINGS
- Missing route-to-live evidence for AC-2.3 and AC-2.4. The websocket test still manually calls `processLiveHub.publish(...)` (`tests/service/server/process-live-updates.test.ts:216-237`) instead of proving that `start` or `resume` cause later environment progress/failure publications.
- Missing production-store coverage. No new Convex tests cover `upsertProcessEnvironmentState`, and no server test runs the action flow against `ConvexPlatformStore`, which is why the non-persistent hydration-plan path was not caught.
- Traceability drift: new client tests use `TC-2.6a/b/c` labels even though Story 2 acceptance criteria stop at `TC-2.5b`. That makes auditability noisier than it needs to be.

BLOCKING_FINDINGS
- Provider-backed hydration execution is still absent. Planning plus a `preparing` summary is not enough to satisfy AC-2.2 through AC-2.4 as currently written.
- The process is marked and presented as `running` before readiness, which conflicts with AC-2.4's sequencing requirement.

NONBLOCKING_WARNINGS
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md` was modified in the same change set. Even if that was intended as alignment, it weakens the reviewer's ability to compare implementation against the approved design snapshot.
- The verification bundle's claim that the tree now "stores hydration planning" is only true for the in-memory test store today, not for the live Convex-backed store.

UNRESOLVED
- Main review question: provider-backed hydration execution is still required by the current story language. The story and the server tech design both say the environment is hydrated "into the working copy" and explicitly sequence accepted `start`/`resume` into later `ensureEnvironment(...)` and `hydrateEnvironment(...)` work. If product wants a planning-only slice to be acceptable, the story/spec needs to be re-scoped first; the current wording does not support accepting this narrower implementation.

GATE_RESULT
- `corepack pnpm run verify` passed on April 15, 2026.
- Observed gate totals: Convex `9/9`, server `79/79`, client `130/130`, with format, lint, typecheck, and build all green.
