# Story 2 Round 3 — Codex xhigh Verifier
VERDICT: PASS

## AC_TC_COVERAGE
| AC | TC | status | evidence |
|---|---|---|---|
| AC-2.1 | TC-2.1a | SATISFIED | `POST /start` writes `environment.state = preparing`, seeds the hydration plan, and fires async hydration (`apps/platform/server/services/processes/process-start.service.ts:38-70`); same-session server and page tests assert visible preparation (`tests/service/server/process-actions-api.test.ts:806-830`, `tests/service/client/process-work-surface-page.test.ts:893-920`). |
| AC-2.1 | TC-2.1b | SATISFIED | `POST /resume` preserves prior hydration metadata, writes `preparing`, seeds the plan, and triggers async hydration (`apps/platform/server/services/processes/process-resume.service.ts:41-71`); same-session resume coverage is present in server and page tests (`tests/service/server/process-actions-api.test.ts:870-918`, `tests/service/client/process-work-surface-page.test.ts:923-944`). |
| AC-2.2 | TC-2.2a | SATISFIED | Hydration plans now include current artifact ids, source attachment ids, and output ids via planner plus store persistence (`apps/platform/server/services/processes/process-start.service.ts:52-65`, `apps/platform/server/services/processes/environment/hydration-planner.ts:12-17`, `apps/platform/server/services/projects/platform-store.ts:68-72`, `apps/platform/server/services/projects/platform-store.ts:1241-1249`); output-id coverage is explicit in `tests/service/server/process-actions-api.test.ts:1018-1057`. |
| AC-2.2 | TC-2.2b | SATISFIED | Partial working sets are persisted cleanly with empty arrays for missing categories (`apps/platform/server/services/processes/environment/hydration-planner.ts:12-17`, `apps/platform/server/services/projects/platform-store.ts:1245-1249`), with artifact-only, source-only, and empty-output cases covered in `tests/service/server/process-actions-api.test.ts:988-1013`, `1062-1080`, and `1085-1110`. |
| AC-2.3 | TC-2.3a | SATISFIED | Preparation progress is returned immediately and later published live without refresh (`apps/platform/server/services/processes/environment/process-environment.service.ts:21-23`, `57-64`); client reducer and websocket tests cover preparing visibility (`tests/service/client/process-live.test.ts:88-106`, `tests/service/server/process-live-updates.test.ts:397-468`). |
| AC-2.3 | TC-2.3b | SATISFIED | Hydration failure is persisted as `failed` and published live without replacing the accepted action response (`apps/platform/server/services/processes/environment/process-environment.service.ts:67-80`); failure visibility is covered in client and websocket tests (`tests/service/client/process-live.test.ts:109-129`, `tests/service/server/process-live-updates.test.ts:474-547`). |
| AC-2.4 | TC-2.4a | SATISFIED | `executeHydration` persists `ready` before calling `transitionProcessToRunning`, then publishes an environment-aware process payload (`apps/platform/server/services/processes/environment/process-environment.service.ts:41-64`); ready-to-running sequencing is covered in `tests/service/client/process-live.test.ts:131-163` and durable bootstrap readiness in `tests/service/server/process-actions-api.test.ts:835-864`. |
| AC-2.4 | TC-2.4b | SATISFIED | The failure branch never calls `transitionProcessToRunning`; it only upserts `failed` and publishes environment state (`apps/platform/server/services/processes/environment/process-environment.service.ts:67-80`), with no-running-after-failure coverage in `tests/service/client/process-live.test.ts:165-188` and `tests/service/server/process-live-updates.test.ts:474-547`. |
| AC-2.5 | TC-2.5a | SATISFIED | Source references carry `accessMode`, the client renders it as visible text plus `data-access-mode`, and writable bootstrap/rendering tests cover it (`apps/platform/shared/contracts/process-work-surface.ts:322-330`, `apps/platform/client/features/processes/process-materials-section.ts:208-229`, `tests/service/server/process-work-surface-api.test.ts:1081-1139`, `tests/service/client/process-materials-section.test.ts:21-43`). |
| AC-2.5 | TC-2.5b | SATISFIED | The same projection/rendering path distinguishes `read_only` sources (`apps/platform/shared/contracts/process-work-surface.ts:322-330`, `apps/platform/client/features/processes/process-materials-section.ts:208-229`), with read-only bootstrap/rendering coverage in `tests/service/server/process-work-surface-api.test.ts:1144-1202` and `tests/service/client/process-materials-section.test.ts:10-18`. |

## ROUND_2_BLOCKER_STATUS
| blocker | closed | evidence |
|---|---|---|
| a. Server-driven preparation path exists | yes | Start and resume both call `setProcessHydrationPlan(...)` and then `processEnvironmentService?.runHydrationAsync(...)` (`apps/platform/server/services/processes/process-start.service.ts:51-70`, `apps/platform/server/services/processes/process-resume.service.ts:52-71`); the async service resolves to `ready` or `failed` and publishes live updates (`apps/platform/server/services/processes/environment/process-environment.service.ts:21-23`, `41-80`). |
| b. No `process.status='running'` before `environment.state='ready'` | yes | `transitionProcessToRunning(...)` only executes inside the success branch after `upsertProcessEnvironmentState(... state: 'ready' ...)` completes (`apps/platform/server/services/processes/environment/process-environment.service.ts:41-55`); the failure branch has no running transition (`67-80`). |
| c. Successful live publication includes environment-aware process payload | yes | The success publication uses `process: buildProcessSurfaceSummary(transitionResult.process, hydratedEnvironment)` (`apps/platform/server/services/processes/environment/process-environment.service.ts:57-64`), and `buildProcessSurfaceSummary` recomputes `availableActions`, `controls`, and `hasEnvironment` from the environment-aware control state (`apps/platform/server/services/processes/process-work-surface.service.ts:318-353`). |
| d. Hydration plan includes `outputIds` | yes | `WorkingSetPlan` now declares `outputIds` (`apps/platform/server/services/projects/platform-store.ts:68-72`), the planner copies them (`apps/platform/server/services/processes/environment/hydration-planner.ts:3-17`), and the in-memory store persists them (`apps/platform/server/services/projects/platform-store.ts:1241-1249`). |

## TEST_DIFF_AUDIT
| file | category | rationale |
|---|---|---|
| `tests/fixtures/live-process.ts` | legitimate coverage | Adds a dedicated failed-environment live fixture used by the new AC-2.3/AC-2.4 live-state tests (`tests/fixtures/live-process.ts:199-213`). |
| `tests/fixtures/process-surface.ts` | unexplained | The diff adds `environment: preparing` to start/resume fixtures, but those fixtures still reuse `runningProcessSurfaceFixture`, producing response payloads that do not match the current server contract during preparation (`tests/fixtures/process-surface.ts:337-389` vs. `apps/platform/server/services/projects/platform-store.ts:1459-1479`). |
| `tests/service/client/process-live.test.ts` | legitimate coverage | Adds direct reducer coverage for preparing, failed, ready, and no-running-after-failure live sequencing (`tests/service/client/process-live.test.ts:88-188`). |
| `tests/service/client/process-materials-section.test.ts` | legitimate coverage | New focused AC-2.5 rendering coverage for `read_only` and `read_write` source access modes (`tests/service/client/process-materials-section.test.ts:9-43`). |
| `tests/service/client/process-work-surface-page.test.ts` | scope shift | The TC-2.1a/b assertions were legitimately corrected to `Preparing environment` (`tests/service/client/process-work-surface-page.test.ts:893-944`), but the same diff also adds extra `TC-2.6a/b/c` cases outside the story's TC inventory (`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/02-start-or-resume-with-environment-preparation.md:47-100`) and those new cases rely on the inconsistent running+preparing fixtures (`tests/service/client/process-work-surface-page.test.ts:1343-1399`). |
| `tests/service/server/auth-routes.test.ts` | legitimate correction | Updates the auth-route test store stub to satisfy the expanded `PlatformStore` contract used by the app wiring, with no assertion weakening (`tests/service/server/auth-routes.test.ts:405-490`). |
| `tests/service/server/process-actions-api.test.ts` | legitimate correction | Adds the missing AC/HC coverage, and the TC-2.1a bootstrap `ready` assertion is a timing-aware correction rather than weakening because the `POST` response still asserts `preparing` (`tests/service/server/process-actions-api.test.ts:806-830`) while the follow-up bootstrap runs after fire-and-forget hydration (`apps/platform/server/services/processes/environment/process-environment.service.ts:21-23`) against an immediately resolving async adapter (`apps/platform/server/services/processes/environment/provider-adapter.ts:17-25`), matching the bundle note (`verification-bundle-round-3.md:167-174`). |
| `tests/service/server/process-live-updates.test.ts` | legitimate coverage | Adds websocket coverage for the server-driven preparing→ready and preparing→failed paths using the new provider seam (`tests/service/server/process-live-updates.test.ts:361-551`). |
| `tests/service/server/process-work-surface-api.test.ts` | legitimate coverage | Adds bootstrap coverage that current source refs expose `accessMode` for writable and read-only attachments (`tests/service/server/process-work-surface-api.test.ts:1081-1202`). |
| `tests/service/server/processes-api.test.ts` | legitimate correction | Updates the recording store to implement the new environment-plan API without weakening the original list/create assertions (`tests/service/server/processes-api.test.ts:150-267`). |

## BLOCKING_FINDINGS
None.

## NONBLOCKING_WARNINGS
- Traceability drift remains in the client fixture/test layer: `tests/fixtures/process-surface.ts:337-389` now pairs `environment: preparing` with `process.status: 'running'`, while accepted preparation responses preserve the existing process status until hydration completes (`apps/platform/server/services/projects/platform-store.ts:1459-1479`, `apps/platform/server/services/processes/process-start.service.ts:38-73`, `apps/platform/server/services/processes/process-resume.service.ts:41-74`). This mainly affects extra client cases in `tests/service/client/process-work-surface-page.test.ts:1343-1399`; story AC evidence is still satisfied elsewhere, so I did not promote it to a blocking finding.

## UNRESOLVED
None.

## GATE_RESULT
Result: passed

Command:

```text
corepack pnpm run verify 2>&1 | tail -200
```

Tail:

```text
> liminal-build@ verify /Users/leemoore/code/liminal-build
> corepack pnpm run red-verify && corepack pnpm run test:convex && corepack pnpm run test:service && corepack pnpm run test:client


> liminal-build@ red-verify /Users/leemoore/code/liminal-build
> corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build


> liminal-build@ format:check /Users/leemoore/code/liminal-build
> corepack pnpm exec biome check --formatter-enabled=true --linter-enabled=false --assist-enabled=false apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 157 files in 11ms. No fixes applied.

> liminal-build@ lint /Users/leemoore/code/liminal-build
> corepack pnpm exec biome lint apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 158 files in 20ms. No fixes applied.

> liminal-build@ typecheck /Users/leemoore/code/liminal-build
> corepack pnpm exec tsc --noEmit -p tsconfig.json && corepack pnpm --filter @liminal-build/platform typecheck


> @liminal-build/platform@ typecheck /Users/leemoore/code/liminal-build/apps/platform
> tsc --noEmit -p tsconfig.server.json && tsc --noEmit -p tsconfig.client.json


> liminal-build@ build /Users/leemoore/code/liminal-build
> corepack pnpm --filter @liminal-build/platform build


> @liminal-build/platform@ build /Users/leemoore/code/liminal-build/apps/platform
> corepack pnpm run clean && corepack pnpm run build:server && corepack pnpm run build:client


> @liminal-build/platform@ clean /Users/leemoore/code/liminal-build/apps/platform
> node -e "require('fs').rmSync('dist', { recursive: true, force: true })"


> @liminal-build/platform@ build:server /Users/leemoore/code/liminal-build/apps/platform
> tsc -p tsconfig.server.json


> @liminal-build/platform@ build:client /Users/leemoore/code/liminal-build/apps/platform
> vite build

vite v8.0.8 building client environment for production...
transforming...✓ 116 modules transformed.
rendering chunks...
computing gzip size...
dist/client/index.html                  0.42 kB │ gzip:  0.28 kB
dist/client/assets/index-Ckfu23hD.js  121.81 kB │ gzip: 29.54 kB

✓ built in 32ms

> liminal-build@ test:convex /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run convex --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  3 passed (3)
      Tests  9 passed (9)
   Start at  19:56:41
   Duration  137ms (transform 71ms, setup 0ms, import 117ms, tests 16ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  10 passed (10)
      Tests  81 passed (81)
   Start at  19:56:42
   Duration  558ms (transform 923ms, setup 0ms, import 2.86s, tests 704ms, environment 0ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  18 passed (18)
      Tests  130 passed (130)
   Start at  19:56:43
   Duration  1.13s (transform 1.43s, setup 0ms, import 2.77s, tests 569ms, environment 8.63s)
```

## WHAT_ELSE
- Sonnet's earlier formatter flag at `apps/platform/server/services/projects/platform-store.ts:1518` is stale on the current tree; `format:check` passed in the gate above.
- The paused-response expectation is correct on the current implementation: preparation acceptance preserves process status while clearing actions in the store (`apps/platform/server/services/projects/platform-store.ts:1459-1479`), so `tests/service/server/process-actions-api.test.ts:870-892` is aligned.
- The interrupted-response `availableActions: ['review']` expectation is also correct: `buildProcessSurfaceSummary` recomputes control state from `process.status = 'interrupted'` plus `environment.state = 'preparing'`, which disables `resume` but leaves `review` enabled (`apps/platform/server/services/processes/process-work-surface.service.ts:283-297`), matching `tests/service/server/process-actions-api.test.ts:319-324`.
