# Epic 3 Round 2 Review — gpt54-xhigh
Verdict: REVISE
Gate: PASS (`corepack pnpm run verify` and `corepack pnpm run test:integration`)
Blocking findings: 1
Non-blocking findings: 1
AC audit: 28 SATISFIED / 0 VIOLATED
TC audit: 58 SATISFIED / 0 VIOLATED
Most important issue: required-field Zod defaults still allow malformed Epic 3 payloads to parse successfully in the production client.
Key evidence: `apps/platform/shared/contracts/process-work-surface.ts:244-246`, `apps/platform/shared/contracts/process-work-surface.ts:258-259`, `apps/platform/shared/contracts/process-work-surface.ts:328`, plus the client-side response parsers at `apps/platform/client/browser-api/process-work-surface-api.ts:106`, `apps/platform/client/browser-api/process-work-surface-api.ts:128`, `apps/platform/client/browser-api/process-work-surface-api.ts:150`, `apps/platform/client/browser-api/process-work-surface-api.ts:172`, and `apps/platform/client/browser-api/process-work-surface-api.ts:194`.
Production-path fake wiring was not found: `apps/platform/server/app.ts:145-176` wires real provider adapters through the registry and a real `OctokitCodeCheckpointWriter`.

## 1. Verdict And Headline Findings

Epic 3 is functionally very close to shippable on the current tree.

The mandatory gate is green.

The production app path no longer defaults to test fakes.

The Convex-backed durability layer now carries `processEnvironmentStates`, `workingSetFingerprint`, `accessMode`, artifact content storage, and durable checkpoint visibility.

The client/server contracts, live environment entity, recovery flows, and reopen flows are all implemented and tested on the paths I traced.

I am not calling SHIP because the brief asked for clean structural hygiene, and the production client still accepts malformed server payloads for required Epic 3 fields through Zod defaults.

That finding is major, but it is not a gate-fail / production-fake / Convex-vs-InMemory divergence blocker, so my verdict is REVISE rather than BLOCK.

## 2. Reading Journey Confirmation

I read the required reading-journey files in the brief's order.

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md` — read in full (`970` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md` — read in full (`683` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md` — read in full (`1174` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-client.md` — read in full (`603` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md` — read in full (`530` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/implementation-addendum.md` — read in full (`325` lines).

`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/codex-impl-log.md` — read in full (`2604` lines). I treated it as context only, per the brief, and did not use it as acceptance evidence.

Repo-specific mandatory context also read before implementation auditing:

`convex/_generated/ai/guidelines.md`

`docs/onboarding/current-state-index.md`

`docs/onboarding/current-state-process-work-surface.md`

`docs/onboarding/current-state-tech-design.md`

`docs/onboarding/current-state-code-map.md`

I did not read any other reviewer's Round 2 report, any Round 1 review report, or the Round 1 synthesis.

## 3. Gate Run Evidence

Command 1:

```text
corepack pnpm run verify
```

Real tail output:

```text
> liminal-build@ verify /Users/leemoore/code/liminal-build
> corepack pnpm run red-verify && corepack pnpm run test:convex && corepack pnpm run test:service && corepack pnpm run test:client


> liminal-build@ red-verify /Users/leemoore/code/liminal-build
> corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build


> liminal-build@ format:check /Users/leemoore/code/liminal-build
> corepack pnpm exec biome check --formatter-enabled=true --linter-enabled=false --assist-enabled=false apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 179 files in 14ms. No fixes applied.

> liminal-build@ lint /Users/leemoore/code/liminal-build
> corepack pnpm exec biome lint apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 180 files in 24ms. No fixes applied.

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
dist/client/assets/index-fSWBRINv.js  126.11 kB │ gzip: 30.31 kB

✓ built in 28ms

> liminal-build@ test:convex /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run convex --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  7 passed (7)
      Tests  35 passed (35)
   Start at  18:12:27
   Duration  220ms (transform 281ms, setup 0ms, import 518ms, tests 45ms, environment 1ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  20 passed (20)
      Tests  163 passed (163)
   Start at  18:12:28
   Duration  972ms (transform 2.00s, setup 0ms, import 5.48s, tests 1.51s, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  156 passed (156)
   Start at  18:12:29
   Duration  1.23s (transform 1.70s, setup 0ms, import 3.18s, tests 676ms, environment 9.39s)


__EXIT_CODE=0
```

Command 2:

```text
corepack pnpm run test:integration
```

Real tail output:

```text
> liminal-build@ test:integration /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/integration --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  3 passed (3)
      Tests  12 passed (12)
   Start at  18:12:36
   Duration  5.65s (transform 266ms, setup 0ms, import 596ms, tests 5.67s, environment 0ms)


__EXIT_CODE=0
```

Gate result summary:

`verify` exited `0`.

`test:integration` exited `0`.

Per the brief's scoring rules, this means there is no gate-based BLOCK finding.

## 4. AC-By-AC Audit

### AC-1.1 — SATISFIED
Requirement: first-load process work surfaces must show the current environment state, including absent, preparing, ready, running, checkpointing, stale, failed, lost, rebuilding, and unavailable.
Implementation: the bootstrap service reads environment state in parallel with history, materials, current request, and side work, then injects it into the primary process response at `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`.
Implementation: the environment panel renders directly from the durable bootstrap environment payload at `apps/platform/client/features/processes/process-work-surface-page.ts:179-183` and `apps/platform/client/features/processes/process-environment-panel.ts:22-59`.
Test coverage: server bootstrap assertion at `tests/service/server/process-work-surface-api.test.ts:217-275`; client first-paint assertion at `tests/service/client/process-work-surface-page.test.ts:310-337`.
Conclusion: SATISFIED.

### AC-1.2 — SATISFIED
Requirement: the surface must show a stable visible control set for `start`, `respond`, `resume`, `rehydrate`, `rebuild`, `review`, and `restart`, with enabled/disabled states.
Implementation: control order is fixed in `apps/platform/shared/contracts/process-work-surface.ts:169-177` and server-side control derivation happens in `apps/platform/server/services/processes/process-work-surface.service.ts:305-340`.
Implementation: the client renders the full `controls` array rather than filtering by enabled actions in `apps/platform/client/features/processes/process-work-surface-page.ts:131-161` and `apps/platform/client/features/processes/process-controls.ts:19-45`.
Test coverage: `tests/service/client/process-controls.test.ts:39-56`.
Conclusion: SATISFIED.

### AC-1.3 — SATISFIED
Requirement: disabled controls must include a visible reason.
Implementation: disabled reasons are computed per action in `apps/platform/server/services/processes/process-work-surface.service.ts:83-287` and materialized into `controls` at `apps/platform/server/services/processes/process-work-surface.service.ts:321-337`.
Implementation: the client renders disabled-reason text for every disabled control at `apps/platform/client/features/processes/process-controls.ts:37-42`.
Test coverage: `tests/service/client/process-controls.test.ts:58-71`.
Conclusion: SATISFIED.

### AC-1.4 — SATISFIED
Requirement: visible environment truth and control availability must derive from durable process/environment state rather than client-only assumptions.
Implementation: Convex computes and stores the working-set fingerprint on env-state mutations and projects `ready` versus `stale` at read time in `convex/processEnvironmentStates.ts:352-390`, `convex/processEnvironmentStates.ts:419-500`, and `convex/processEnvironmentStates.ts:529-592`.
Implementation: the process bootstrap always rebuilds the surface from durable store reads in `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`.
Test coverage: integration reload test at `tests/integration/process-work-surface.test.ts:216-310`.
Conclusion: SATISFIED.

### AC-1.5 — SATISFIED
Requirement: absence, loss, or failure of the environment must not hide process identity, current materials, or durable process state.
Implementation: the bootstrap service always returns `project`, `process`, `materials`, and `environment`; read failures only degrade the environment slice to `unavailable` at `apps/platform/server/services/processes/process-work-surface.service.ts:453-466`.
Implementation: the page keeps rendering the process header, materials, and environment panel together at `apps/platform/client/features/processes/process-work-surface-page.ts:87-217`.
Test coverage: client lost-environment render at `tests/service/client/process-work-surface-page.test.ts:365-392`.
Conclusion: SATISFIED.

### AC-2.1 — SATISFIED
Requirement: start/resume must move the same-session surface into visible environment preparation.
Implementation: `ProcessStartService.start` persists `environment.state = preparing` and returns it immediately at `apps/platform/server/services/processes/process-start.service.ts:36-96`.
Implementation: `ProcessResumeService.resume` does the same for resumable processes at `apps/platform/server/services/processes/process-resume.service.ts:36-97`.
Test coverage: server action tests at `tests/service/server/process-actions-api.test.ts:906-1018`; client same-session page tests at `tests/service/client/process-work-surface-page.test.ts:965-1016`.
Conclusion: SATISFIED.

### AC-2.2 — SATISFIED
Requirement: environment preparation must hydrate current artifacts, current outputs, and current attached sources into the working copy before work depends on them.
Implementation: the durable working-set plan includes artifacts, sources, and outputs at `apps/platform/server/services/processes/environment/hydration-planner.ts:12-17`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1269-1278`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:1291-1348`.
Implementation: the real LocalProvider materializes artifacts and clones attached sources from that plan at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:138-190`.
Test coverage: hydration-plan assertions at `tests/service/server/process-actions-api.test.ts:1057-1213`.
Conclusion: SATISFIED.

### AC-2.3 — SATISFIED
Requirement: hydration progress and hydration failure must surface through environment state without a manual refresh.
Implementation: accepted start/resume calls return `preparing`, and fire-and-forget hydration failures are converted to visible failed environment state via `apps/platform/server/services/processes/environment/process-environment.service.ts:73-83`, `apps/platform/server/services/processes/environment/process-environment.service.ts:350-357`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:1161-1213`.
Implementation: environment updates are published as typed live messages through `apps/platform/server/services/processes/live/process-live-normalizer.ts:113-121` and applied on the client at `apps/platform/client/app/process-live.ts:181-183`.
Test coverage: client live tests at `tests/service/client/process-live.test.ts:186-287`.
Conclusion: SATISFIED.

### AC-2.4 — SATISFIED
Requirement: a process must not enter active running until the working set is ready or a recoverable failure state is shown.
Implementation: `executeHydration` only transitions the process to running after successful ensure/hydrate and after the environment has been upserted ready; failures route to `failed` instead of `running` at `apps/platform/server/services/processes/environment/process-environment.service.ts:295-357`.
Implementation: execution kickoff is deferred one tick so the durable `ready` state is observable before the run advances at `apps/platform/server/services/processes/environment/process-environment.service.ts:470-485`.
Test coverage: client sequencing tests at `tests/service/client/process-live.test.ts:229-287`; server action boundary tests at `tests/service/server/process-actions-api.test.ts:399-547` and `tests/service/server/process-actions-api.test.ts:1023-1055`.
Conclusion: SATISFIED.

### AC-2.5 — SATISFIED
Requirement: the surface must distinguish read-only and writable attached sources before code work depends on them.
Implementation: `accessMode` is durable in the Convex schema and returned in source projections at `convex/sourceAttachments.ts:5-29` and `convex/sourceAttachments.ts:32-67`.
Implementation: the materials UI renders `Access: read only` / `Access: read write` and a `data-access-mode` attribute at `apps/platform/client/features/processes/process-materials-section.ts:208-245`.
Test coverage: server bootstrap tests at `tests/service/server/process-work-surface-api.test.ts:1144-1272`; client render tests at `tests/service/client/process-materials-section.test.ts:9-43`.
Conclusion: SATISFIED.

### AC-3.1 — SATISFIED
Requirement: the process surface must show when controlled execution has begun and is still actively running in the environment.
Implementation: `executeExecution` upserts `environment.state = running` and publishes that live update before the script result is applied at `apps/platform/server/services/processes/environment/process-environment.service.ts:512-525`.
Implementation: the client environment panel renders the running label from the live environment object at `apps/platform/client/features/processes/process-environment-panel.ts:22-59`.
Test coverage: websocket publication test at `tests/service/server/process-live-updates.test.ts:755-829`.
Conclusion: SATISFIED.

### AC-3.2 — SATISFIED
Requirement: live execution activity must appear as coherent process-facing updates and environment-state changes rather than raw terminal/provider fragments.
Implementation: execution results are normalized into process/history/materials/side-work/environment publications at `apps/platform/server/services/processes/environment/process-environment.service.ts:532-600`.
Implementation: live normalization emits typed current-object messages only at `apps/platform/server/services/processes/live/process-live-normalizer.ts:54-139`, and the client reducer applies those typed entities directly at `apps/platform/client/app/process-live.ts:127-188`.
Test coverage: snapshot/current-object live contract assertions at `tests/service/server/process-live-updates.test.ts:225-259`; server-supplied status label tests at `tests/service/client/process-environment-panel.test.ts:18-44`.
Conclusion: SATISFIED.

### AC-3.3 — SATISFIED
Requirement: the surface must distinguish preparation, execution, waiting, checkpointing, and settled states.
Implementation: environment transitions to `running`, `checkpointing`, and `failed` happen in `apps/platform/server/services/processes/environment/process-environment.service.ts:512-600`, while process lifecycle transitions to `waiting`, `completed`, `failed`, and `interrupted` happen at `convex/processes.ts:802-918`.
Implementation: the client reducer explicitly breaks the waiting-vs-running state and handles checkpointing as its own state at `apps/platform/client/app/process-live.ts:156-163` and `apps/platform/client/app/process-live.ts:181-183`.
Test coverage: client reducer tests at `tests/service/client/process-live.test.ts:289-329`; server live publication test at `tests/service/server/process-live-updates.test.ts:832-906`.
Conclusion: SATISFIED.

### AC-3.4 — SATISFIED
Requirement: execution failure must leave the surface legible and expose the next recovery path without erasing durable history/materials.
Implementation: failed execution transitions update the process to failed, upsert a failed environment with `blockedReason`, and republish the environment-aware process summary at `apps/platform/server/services/processes/environment/process-environment.service.ts:549-576` and `apps/platform/server/services/processes/environment/process-environment.service.ts:1075-1101`.
Implementation: the last-resort failure handlers for fire-and-forget lanes also convert rejections to failed env state at `apps/platform/server/services/processes/environment/process-environment.service.ts:1155-1267`.
Test coverage: server live test at `tests/service/server/process-live-updates.test.ts:909-1015`; client legibility/recovery-control test at `tests/service/client/process-live.test.ts:447-499`.
Conclusion: SATISFIED.

### AC-4.1 — SATISFIED
Requirement: artifact outputs produced during environment work must checkpoint back to durable artifact state.
Implementation: checkpoint execution persists artifact targets through the store at `apps/platform/server/services/processes/environment/process-environment.service.ts:775-809`.
Implementation: Convex writes artifact contents to File Storage and records the resulting artifact/output rows through `convex/artifacts.ts:19-40`, `convex/artifacts.ts:89-141`, and `convex/artifacts.ts:164-213`.
Test coverage: environment upsert publication test at `tests/service/server/process-live-updates.test.ts:1132-1210`; integration reopen/rebuild chain at `tests/integration/process-work-surface.test.ts:507-675`.
Conclusion: SATISFIED.

### AC-4.2 — SATISFIED
Requirement: writable attached sources must checkpoint back to canonical code truth for that source.
Implementation: the planner only emits code targets for `read_write` sources at `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-35`.
Implementation: the real writer commits directly to the attached target ref through Octokit at `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:147-247`.
Test coverage: checkpoint-planner test at `tests/service/server/process-actions-api.test.ts:1217-1253`; real GitHub integration tests at `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:178-245`.
Conclusion: SATISFIED.

### AC-4.3 — SATISFIED
Requirement: read-only attached sources must never present code checkpointing as an available path.
Implementation: the planner fail-closes unknown/missing access mode to `read_only` and records skipped read-only candidates at `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-25`.
Implementation: the checkpoint executor turns read-only code candidates into a failed checkpoint result instead of a write attempt at `apps/platform/server/services/processes/environment/process-environment.service.ts:892-927`.
Test coverage: planner exclusion test at `tests/service/server/process-actions-api.test.ts:1255-1287`; client source-access render tests at `tests/service/client/process-materials-section.test.ts:32-43`.
Conclusion: SATISFIED.

### AC-4.4 — SATISFIED
Requirement: checkpoint results must clearly show what persisted and what canonical target received it.
Implementation: checkpoint outcomes are normalized through `buildCheckpointResult` at `apps/platform/server/services/processes/environment/process-environment.service.ts:1490-1506`.
Implementation: the client renders target label, target ref, outcome badge, completed time, and failure reason at `apps/platform/client/features/processes/process-checkpoint-result.ts:15-44` and `apps/platform/client/features/processes/process-environment-panel.ts:52-58`.
Test coverage: client checkpoint result render tests at `tests/service/client/process-environment-panel.test.ts:46-69`.
Conclusion: SATISFIED.

### AC-4.5 — SATISFIED
Requirement: checkpoint failure must not silently discard work; it must surface failure and the next path.
Implementation: code-checkpoint failure, read-only failure, and generic checkpoint exceptions all transition the environment to `failed` with `lastCheckpointResult.outcome = failed` at `apps/platform/server/services/processes/environment/process-environment.service.ts:823-853`, `apps/platform/server/services/processes/environment/process-environment.service.ts:892-927`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:955-986`.
Implementation: the environment panel renders failure badges and failure reasons at `apps/platform/client/features/processes/process-checkpoint-result.ts:40-44`.
Test coverage: server live failure test at `tests/service/server/process-live-updates.test.ts:1212-1290`; client render test at `tests/service/client/process-environment-panel.test.ts:71-80`.
Conclusion: SATISFIED.

### AC-5.1 — SATISFIED
Requirement: the surface must distinguish stale, failed, lost, rebuilding, and unavailable states.
Implementation: the environment vocabulary includes all five states at `apps/platform/shared/contracts/process-work-surface.ts:83-95`, and server-side control derivation differentiates them at `apps/platform/server/services/processes/process-work-surface.service.ts:183-253`.
Implementation: Convex projects `ready` to `stale` based on durable fingerprint comparison at `convex/processEnvironmentStates.ts:378-386`.
Test coverage: state-matrix coverage at `tests/service/client/process-controls.test.ts:111-197`; stale bootstrap assertion at `tests/service/server/process-work-surface-api.test.ts:325-383`; lost-state render at `tests/service/client/process-work-surface-page.test.ts:365-392`.
Conclusion: SATISFIED.

### AC-5.2 — SATISFIED
Requirement: `rehydrate` must refresh a recoverable working copy from current canonical materials.
Implementation: accepted rehydrate requests persist `state = rehydrating` and fire async recovery at `apps/platform/server/services/processes/environment/process-environment.service.ts:109-161`.
Implementation: successful rehydrate returns the env to `ready` and republishes that state at `apps/platform/server/services/processes/environment/process-environment.service.ts:360-397`.
Test coverage: server action test at `tests/service/server/process-actions-api.test.ts:1338-1364`; client recovery-state live test at `tests/service/client/process-live.test.ts:569-600`.
Conclusion: SATISFIED.

### AC-5.3 — SATISFIED
Requirement: `rebuild` must reconstruct from canonical truth without depending on the prior working copy surviving.
Implementation: accepted rebuild requests persist `state = rebuilding` and queue async rebuild at `apps/platform/server/services/processes/environment/process-environment.service.ts:163-230`.
Implementation: the LocalProvider rebuild path explicitly tears down prior envs if present but can always ensure a fresh env from `processId` and plan at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:263-289`.
Test coverage: server action tests at `tests/service/server/process-actions-api.test.ts:1366-1433`.
Conclusion: SATISFIED.

### AC-5.4 — SATISFIED
Requirement: rehydrate/rebuild must preserve durable process state, durable artifact outputs, and already-persisted durable code work.
Implementation: recovery logic only changes environment state; durable artifact/code truth remains in artifacts/source/GitHub stores and latest checkpoint visibility stays on the environment row at `apps/platform/server/services/processes/environment/process-environment.service.ts:360-454` and `apps/platform/server/services/processes/environment/process-environment.service.ts:1490-1506`.
Implementation: the client preserves `lastCheckpointResult` through rehydrating/rebuilding updates at `apps/platform/client/app/process-live.ts:90-111`.
Test coverage: client recovery visibility tests at `tests/service/client/process-live.test.ts:569-634`; integration reopen/rebuild chain at `tests/integration/process-work-surface.test.ts:313-389` and `tests/integration/process-work-surface.test.ts:507-675`.
Conclusion: SATISFIED.

### AC-5.5 — SATISFIED
Requirement: blocked rehydrate/rebuild prerequisites must surface visibly and must not falsely present the environment as ready.
Implementation: rebuild preflight rejects missing canonical materials at `apps/platform/server/services/processes/environment/process-environment.service.ts:178-188`.
Implementation: rehydrate/rebuild availability guards reject unrecoverable and unavailable states at `apps/platform/server/services/processes/environment/process-environment.service.ts:1421-1477`.
Test coverage: client blocked-action tests at `tests/service/client/process-work-surface-page.test.ts:1122-1185`; server preflight tests at `tests/service/server/process-actions-api.test.ts:1435-1508`.
Conclusion: SATISFIED.

### AC-6.1 — SATISFIED
Requirement: reopening a process route must restore the latest durable process state, current materials, environment summary, and checkpoint result.
Implementation: bootstrap always recomposes the surface from durable store reads at `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`.
Implementation: the environment summary returned by Convex includes persisted checkpoint visibility at `convex/processEnvironmentStates.ts:127-135` and `convex/processEnvironmentStates.ts:352-390`.
Test coverage: integration reopen test at `tests/integration/process-work-surface.test.ts:313-389`; server bootstrap reopen test at `tests/service/server/process-work-surface-api.test.ts:443-497`.
Conclusion: SATISFIED.

### AC-6.2 — SATISFIED
Requirement: absence of an active environment must not erase prior checkpointed artifact or code results.
Implementation: environment summary can be `absent` while still carrying `lastCheckpointAt` and `lastCheckpointResult` because those fields live on the durable env-state row at `convex/processEnvironmentStates.ts:127-135`.
Implementation: the environment panel renders checkpoint results independently of whether `environmentId` is present at `apps/platform/client/features/processes/process-environment-panel.ts:28-58`.
Test coverage: integration reopen-after-loss test at `tests/integration/process-work-surface.test.ts:313-389`.
Conclusion: SATISFIED.

### AC-6.3 — SATISFIED
Requirement: live update failure must not prevent the durable surface from loading or remaining usable.
Implementation: websocket subscription is bootstrap-second and independent from the bootstrap route at `apps/platform/server/routes/processes.ts:155-179`.
Implementation: the client retries by re-fetching the durable surface first, then reconnecting live transport at `apps/platform/client/app/bootstrap.ts:239-295`, while visible live-status messaging is rendered by `apps/platform/client/features/processes/process-live-status.ts:5-42`.
Test coverage: client failure/retry tests at `tests/service/client/process-work-surface-page.test.ts:641-910`.
Conclusion: SATISFIED.

### AC-6.4 — SATISFIED
Requirement: reopen and recovery must not duplicate finalized history or replay checkpoint results as new work.
Implementation: history upserts dedupe by `historyItemId` at `apps/platform/client/app/process-live.ts:26-43`, and checkpoint visibility travels inside the environment entity, not history, at `apps/platform/server/services/processes/live/process-live-normalizer.ts:113-121`.
Implementation: reopen bootstrap simply returns the durable history and durable environment summary again at `apps/platform/server/services/processes/process-work-surface.service.ts:374-397`.
Test coverage: integration no-duplication tests at `tests/integration/process-work-surface.test.ts:392-503`; client environment-vs-history separation test at `tests/service/client/process-live.test.ts:517-540`.
Conclusion: SATISFIED.

## 5. TC-By-TC Audit

### TC-1.1a — SATISFIED
Requirement: environment state is visible on first load.
Implementation evidence: `apps/platform/server/services/processes/process-work-surface.service.ts:369-397` includes `environment` in the bootstrap, and `apps/platform/client/features/processes/process-environment-panel.ts:22-26` renders the state label.
Test coverage: `tests/service/server/process-work-surface-api.test.ts:217-275`; `tests/service/client/process-work-surface-page.test.ts:310-337`.
Conclusion: SATISFIED.

### TC-1.1b — SATISFIED
Requirement: no active environment still renders an explicit absent/not-yet-prepared state.
Implementation evidence: `convex/processEnvironmentStates.ts:121-123` and `apps/platform/server/services/processes/process-work-surface.service.ts:457-465` both produce explicit fallback environment states instead of blank output.
Test coverage: `tests/service/server/process-work-surface-api.test.ts:279-320`; `tests/service/client/process-work-surface-page.test.ts:339-363`.
Conclusion: SATISFIED.

### TC-1.2a — SATISFIED
Requirement: the stable control set stays visible in a stable order.
Implementation evidence: fixed order is encoded at `apps/platform/shared/contracts/process-work-surface.ts:169-177`, and controls are rendered in input order at `apps/platform/client/features/processes/process-controls.ts:19-45`.
Test coverage: `tests/service/client/process-controls.test.ts:39-47`.
Conclusion: SATISFIED.

### TC-1.2b — SATISFIED
Requirement: disabled controls remain visible instead of disappearing.
Implementation evidence: disabled controls are still included in `process.controls` and rendered as disabled buttons at `apps/platform/client/features/processes/process-controls.ts:23-42`.
Test coverage: `tests/service/client/process-controls.test.ts:49-55`.
Conclusion: SATISFIED.

### TC-1.1c — SATISFIED
Requirement: `preparing` identifies in-progress preparation and disables lifecycle/recovery controls.
Implementation evidence: preparing-specific disabled reasons exist in `apps/platform/server/services/processes/process-work-surface.service.ts:105-106`, `apps/platform/server/services/processes/process-work-surface.service.ts:136-137`, `apps/platform/server/services/processes/process-work-surface.service.ts:198-199`, `apps/platform/server/services/processes/process-work-surface.service.ts:231-232`.
Test coverage: `tests/service/client/process-controls.test.ts:74-82`.
Conclusion: SATISFIED.

### TC-1.1c.1 — SATISFIED
Requirement: `rehydrating` is distinct from generic preparing and disables the right controls.
Implementation evidence: rehydrating-specific control states are defined at `apps/platform/server/services/processes/process-work-surface.service.ts:107-109`, `apps/platform/server/services/processes/process-work-surface.service.ts:138-139`, `apps/platform/server/services/processes/process-work-surface.service.ts:200-201`, and `apps/platform/server/services/processes/process-work-surface.service.ts:233-234`.
Test coverage: `tests/service/client/process-controls.test.ts:176-197` covers the rehydrating matrix state directly, even though the test name is descriptive rather than the exact TC ID.
Conclusion: SATISFIED.

### TC-1.1d — SATISFIED
Requirement: `ready` shows prepared readiness while recovery controls remain disabled.
Implementation evidence: ready-state control behavior is encoded at `apps/platform/server/services/processes/process-work-surface.service.ts:103-105`, `apps/platform/server/services/processes/process-work-surface.service.ts:133-135`, `apps/platform/server/services/processes/process-work-surface.service.ts:202-205`, and `apps/platform/server/services/processes/process-work-surface.service.ts:235-238`.
Test coverage: `tests/service/client/process-controls.test.ts:84-90`.
Conclusion: SATISFIED.

### TC-1.1e — SATISFIED
Requirement: `running` shows active execution and disables recovery controls during the run.
Implementation evidence: running-state disabled reasons exist at `apps/platform/server/services/processes/process-work-surface.service.ts:109-110`, `apps/platform/server/services/processes/process-work-surface.service.ts:140-141`, `apps/platform/server/services/processes/process-work-surface.service.ts:206-207`, and `apps/platform/server/services/processes/process-work-surface.service.ts:239-240`.
Test coverage: `tests/service/client/process-controls.test.ts:92-99`.
Conclusion: SATISFIED.

### TC-1.1f — SATISFIED
Requirement: `checkpointing` is distinct and disables lifecycle actions while work settles.
Implementation evidence: checkpointing-specific disabled reasons exist at `apps/platform/server/services/processes/process-work-surface.service.ts:111-112`, `apps/platform/server/services/processes/process-work-surface.service.ts:142-143`, `apps/platform/server/services/processes/process-work-surface.service.ts:208-209`, and `apps/platform/server/services/processes/process-work-surface.service.ts:241-242`.
Test coverage: `tests/service/client/process-controls.test.ts:101-109`.
Conclusion: SATISFIED.

### TC-1.1g — SATISFIED
Requirement: `stale` identifies recoverable drift and enables `rehydrate` instead of `rebuild`.
Implementation evidence: stale-state control behavior is encoded at `apps/platform/server/services/processes/process-work-surface.service.ts:113-115`, `apps/platform/server/services/processes/process-work-surface.service.ts:144-146`, and `apps/platform/server/services/processes/process-work-surface.service.ts:243-246`.
Test coverage: `tests/service/client/process-controls.test.ts:111-116`; `tests/service/server/process-work-surface-api.test.ts:325-383`.
Conclusion: SATISFIED.

### TC-1.1h — SATISFIED
Requirement: `lost` identifies a missing environment and enables rebuild rather than rehydrate.
Implementation evidence: lost-state handling is encoded at `apps/platform/server/services/processes/process-work-surface.service.ts:117-118`, `apps/platform/server/services/processes/process-work-surface.service.ts:148-149`, `apps/platform/server/services/processes/process-work-surface.service.ts:194-197`, and `apps/platform/server/services/processes/process-work-surface.service.ts:224-226`.
Test coverage: `tests/service/client/process-controls.test.ts:118-123`; lost-state rendering is also exercised at `tests/service/client/process-work-surface-page.test.ts:365-392`.
Conclusion: SATISFIED.

### TC-1.1i — SATISFIED
Requirement: `failed` disables start/resume and enables only valid recovery paths.
Implementation evidence: failed-state control behavior is encoded at `apps/platform/server/services/processes/process-work-surface.service.ts:115-116`, `apps/platform/server/services/processes/process-work-surface.service.ts:147-148`, `apps/platform/server/services/processes/process-work-surface.service.ts:190-193`, and `apps/platform/server/services/processes/process-work-surface.service.ts:225-226`.
Test coverage: `tests/service/client/process-controls.test.ts:125-133`.
Conclusion: SATISFIED.

### TC-1.1j — SATISFIED
Requirement: `rebuilding` identifies reconstruction work and disables lifecycle controls during rebuild.
Implementation evidence: rebuilding-specific disabled reasons exist at `apps/platform/server/services/processes/process-work-surface.service.ts:119-120`, `apps/platform/server/services/processes/process-work-surface.service.ts:150-151`, `apps/platform/server/services/processes/process-work-surface.service.ts:210-211`, and `apps/platform/server/services/processes/process-work-surface.service.ts:247-248`.
Test coverage: `tests/service/client/process-controls.test.ts:154-162`.
Conclusion: SATISFIED.

### TC-1.1k — SATISFIED
Requirement: `unavailable` keeps the process surface legible while blocking environment-changing actions with reasons.
Implementation evidence: unavailable-state disabled reasons are sourced from `environment.blockedReason` at `apps/platform/server/services/processes/process-work-surface.service.ts:121-124`, `apps/platform/server/services/processes/process-work-surface.service.ts:152-155`, `apps/platform/server/services/processes/process-work-surface.service.ts:212-215`, and `apps/platform/server/services/processes/process-work-surface.service.ts:249-252`.
Test coverage: `tests/service/client/process-controls.test.ts:164-174`.
Conclusion: SATISFIED.

### TC-1.3a — SATISFIED
Requirement: blocked environment actions show visible disabled reasons.
Implementation evidence: disabled reasons are included in control state and rendered as text at `apps/platform/server/services/processes/process-work-surface.service.ts:321-337` and `apps/platform/client/features/processes/process-controls.ts:37-42`.
Test coverage: `tests/service/client/process-controls.test.ts:58-64`.
Conclusion: SATISFIED.

### TC-1.3b — SATISFIED
Requirement: blocked process actions show visible disabled reasons.
Implementation evidence: the same control pipeline renders process-action disabled reasons without hiding the control at `apps/platform/server/services/processes/process-work-surface.service.ts:256-287` and `apps/platform/client/features/processes/process-controls.ts:37-42`.
Test coverage: `tests/service/client/process-controls.test.ts:66-71`.
Conclusion: SATISFIED.

### TC-1.4a — SATISFIED
Requirement: reload preserves durable environment truth.
Implementation evidence: `convex/processEnvironmentStates.ts:378-386` recomputes stale-vs-ready from canonical inputs on read, and `apps/platform/server/services/processes/process-work-surface.service.ts:374-397` rebuilds the surface from durable store reads on every bootstrap.
Test coverage: `tests/integration/process-work-surface.test.ts:216-310`.
Conclusion: SATISFIED.

### TC-1.5a — SATISFIED
Requirement: the process remains visible without an environment.
Implementation evidence: bootstrap always includes process identity and materials even when environment is absent/lost at `apps/platform/server/services/processes/process-work-surface.service.ts:374-397`.
Test coverage: `tests/service/client/process-work-surface-page.test.ts:365-392`.
Conclusion: SATISFIED.

### TC-2.1a — SATISFIED
Requirement: starting a draft process enters visible preparation state in the same session.
Implementation evidence: `apps/platform/server/services/processes/process-start.service.ts:36-96` returns `environment.state = preparing` and queues async hydration.
Test coverage: `tests/service/server/process-actions-api.test.ts:906-967`; `tests/service/client/process-work-surface-page.test.ts:965-992`.
Conclusion: SATISFIED.

### TC-2.1b — SATISFIED
Requirement: resuming an eligible process enters visible preparation state in the same session when environment work is needed.
Implementation evidence: `apps/platform/server/services/processes/process-resume.service.ts:36-97` persists and returns `preparing`.
Test coverage: `tests/service/server/process-actions-api.test.ts:970-1018`; `tests/service/client/process-work-surface-page.test.ts:995-1016`.
Conclusion: SATISFIED.

### TC-2.2a — SATISFIED
Requirement: current materials hydrate into the environment rather than unrelated project materials.
Implementation evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:1269-1278` builds the plan from current refs plus outputs, and `apps/platform/server/services/processes/environment/process-environment.service.ts:1296-1348` only resolves the IDs in that plan into adapter inputs.
Test coverage: `tests/service/server/process-actions-api.test.ts:1118-1160`.
Conclusion: SATISFIED.

### TC-2.2b — SATISFIED
Requirement: partial working sets still hydrate correctly.
Implementation evidence: the working-set planner preserves empty arrays rather than requiring every category at `apps/platform/server/services/processes/environment/hydration-planner.ts:7-17`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1162-1213`.
Conclusion: SATISFIED.

### TC-2.3a — SATISFIED
Requirement: hydration progress becomes visible.
Implementation evidence: accepted start/resume returns `preparing` immediately and publishes environment upserts through the live hub at `apps/platform/server/services/processes/process-start.service.ts:43-96`, `apps/platform/server/services/processes/process-resume.service.ts:46-97`, and `apps/platform/server/services/processes/live/process-live-normalizer.ts:113-121`.
Test coverage: `tests/service/client/process-live.test.ts:186-205`.
Conclusion: SATISFIED.

### TC-2.3b — SATISFIED
Requirement: hydration failure becomes visible without manual refresh.
Implementation evidence: hydration failures route through `transitionToFailed` / `handleAsyncFailure` at `apps/platform/server/services/processes/environment/process-environment.service.ts:350-357` and `apps/platform/server/services/processes/environment/process-environment.service.ts:1155-1267`.
Test coverage: `tests/service/client/process-live.test.ts:207-287`.
Conclusion: SATISFIED.

### TC-2.4a — SATISFIED
Requirement: running begins after readiness.
Implementation evidence: `executeHydration` upserts `ready`, transitions the process to running, publishes the ready state, and only then starts execution at `apps/platform/server/services/processes/environment/process-environment.service.ts:304-348`.
Test coverage: `tests/service/client/process-live.test.ts:229-261`; `tests/service/server/process-actions-api.test.ts:399-447`.
Conclusion: SATISFIED.

### TC-2.4b — SATISFIED
Requirement: failed preparation does not falsely present the process as running.
Implementation evidence: the failed-preparation branch never calls `transitionProcessToRunning`; it routes directly to `failed` at `apps/platform/server/services/processes/environment/process-environment.service.ts:312-357`.
Test coverage: `tests/service/client/process-live.test.ts:263-287`; `tests/service/server/process-actions-api.test.ts:1023-1055`.
Conclusion: SATISFIED.

### TC-2.5a — SATISFIED
Requirement: writable sources are identifiable.
Implementation evidence: writable `accessMode` is durable at `convex/sourceAttachments.ts:15-21` and rendered as text at `apps/platform/client/features/processes/process-materials-section.ts:226-231`.
Test coverage: `tests/service/server/process-work-surface-api.test.ts:1144-1204`; `tests/service/client/process-materials-section.test.ts:21-30`.
Conclusion: SATISFIED.

### TC-2.5b — SATISFIED
Requirement: read-only sources are identifiable.
Implementation evidence: read-only `accessMode` is durable at `convex/sourceAttachments.ts:15-21` and rendered as text at `apps/platform/client/features/processes/process-materials-section.ts:226-231`.
Test coverage: `tests/service/server/process-work-surface-api.test.ts:1209-1269`; `tests/service/client/process-materials-section.test.ts:10-19`.
Conclusion: SATISFIED.

### TC-3.1a — SATISFIED
Requirement: active execution state is visible while work is running in the environment.
Implementation evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:512-525` publishes `environment.state = running`.
Test coverage: `tests/service/server/process-live-updates.test.ts:755-829`.
Conclusion: SATISFIED.

### TC-3.2a — SATISFIED
Requirement: execution activity is process-facing.
Implementation evidence: execution results are converted to typed process/history/materials/side-work/environment publications at `apps/platform/server/services/processes/environment/process-environment.service.ts:532-600`.
Test coverage: `tests/service/server/process-live-updates.test.ts:225-259`; `tests/service/client/process-environment-panel.test.ts:18-30`.
Conclusion: SATISFIED.

### TC-3.2b — SATISFIED
Requirement: the browser shows readable typed state rather than reconstructing raw fragments.
Implementation evidence: only typed current-object messages are emitted at `apps/platform/server/services/processes/live/process-live-normalizer.ts:54-139`, and the client reducer only switches on typed entity types at `apps/platform/client/app/process-live.ts:138-187`.
Test coverage: `tests/service/client/process-environment-panel.test.ts:32-44`; `tests/service/server/process-live-updates.test.ts:225-259`.
Conclusion: SATISFIED.

### TC-3.3a — SATISFIED
Requirement: waiting is distinct from running.
Implementation evidence: process lifecycle transitions to waiting are explicit in `convex/processes.ts:813-821`, and the client reducer breaks the running environment state when a waiting process summary arrives at `apps/platform/client/app/process-live.ts:156-163`.
Test coverage: `tests/service/client/process-live.test.ts:289-305`.
Conclusion: SATISFIED.

### TC-3.3b — SATISFIED
Requirement: checkpointing is distinct from running.
Implementation evidence: checkpointing state is published after execution side effects at `apps/platform/server/services/processes/environment/process-environment.service.ts:579-600`.
Test coverage: `tests/service/server/process-live-updates.test.ts:832-906`; `tests/service/client/process-live.test.ts:307-329`.
Conclusion: SATISFIED.

### TC-3.4a — SATISFIED
Requirement: execution failure leaves the surface legible with failure state and recovery path.
Implementation evidence: failed execution republishes a failed environment, preserved process, history items, materials, and side work at `apps/platform/server/services/processes/environment/process-environment.service.ts:549-576`.
Test coverage: `tests/service/server/process-live-updates.test.ts:909-1015`; `tests/service/client/process-live.test.ts:447-473`.
Conclusion: SATISFIED.

### TC-4.1a — SATISFIED
Requirement: durable artifact output persists.
Implementation evidence: artifact checkpoint persistence occurs at `apps/platform/server/services/processes/environment/process-environment.service.ts:775-809` through `convex/artifacts.ts:89-141` and `convex/artifacts.ts:164-213`.
Test coverage: `tests/service/server/process-live-updates.test.ts:1132-1210`.
Conclusion: SATISFIED.

### TC-4.1b — SATISFIED
Requirement: checkpointed artifact output remains recoverable after reopen.
Implementation evidence: durable checkpoint visibility lives on the environment row and persists across reopen at `convex/processEnvironmentStates.ts:127-135`.
Test coverage: `tests/integration/process-work-surface.test.ts:507-675`; `convex/processEnvironmentStates.test.ts:232-264`.
Conclusion: SATISFIED.

### TC-4.2a — SATISFIED
Requirement: writable source code checkpoint succeeds against the attached canonical target.
Implementation evidence: writable code targets are passed through the planner at `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-35` and committed by Octokit at `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:147-247`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1217-1253`; `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:178-245`.
Conclusion: SATISFIED.

### TC-4.2b — SATISFIED
Requirement: code checkpoint results are process-visible with source identity and target ref.
Implementation evidence: checkpoint results include `targetLabel` and `targetRef` at `apps/platform/server/services/processes/environment/process-environment.service.ts:857-867`, and the panel renders them at `apps/platform/client/features/processes/process-checkpoint-result.ts:29-38`.
Test coverage: `tests/service/client/process-environment-panel.test.ts:58-69`.
Conclusion: SATISFIED.

### TC-4.3a — SATISFIED
Requirement: read-only attached sources cannot receive code checkpoint writes.
Implementation evidence: the planner skips non-writable targets at `apps/platform/server/services/processes/environment/checkpoint-planner.ts:17-25`, and the checkpoint executor surfaces a failed read-only result instead of writing at `apps/platform/server/services/processes/environment/process-environment.service.ts:892-927`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1255-1287`.
Conclusion: SATISFIED.

### TC-4.4a — SATISFIED
Requirement: artifact checkpoint success is visible on the surface.
Implementation evidence: artifact checkpoint results are normalized into `lastCheckpointResult` at `apps/platform/server/services/processes/environment/process-environment.service.ts:780-797` and rendered in the environment panel at `apps/platform/client/features/processes/process-environment-panel.ts:52-58`.
Test coverage: `tests/service/client/process-environment-panel.test.ts:46-56`.
Conclusion: SATISFIED.

### TC-4.4b — SATISFIED
Requirement: code checkpoint success is visible with source identity and target ref.
Implementation evidence: successful code checkpoint results carry `targetLabel` and `targetRef` at `apps/platform/server/services/processes/environment/process-environment.service.ts:856-877`.
Test coverage: `tests/service/client/process-environment-panel.test.ts:58-69`.
Conclusion: SATISFIED.

### TC-4.5a — SATISFIED
Requirement: artifact checkpoint failure is shown with failure reason / recovery path.
Implementation evidence: generic checkpoint exceptions become failed env state with a failed `lastCheckpointResult` at `apps/platform/server/services/processes/environment/process-environment.service.ts:955-986`.
Test coverage: `tests/service/client/process-environment-panel.test.ts:71-80`.
Conclusion: SATISFIED.

### TC-4.5b — SATISFIED
Requirement: code checkpoint failure is shown with failure reason / recovery path.
Implementation evidence: code-writer failure is caught and turned into a failed env upsert at `apps/platform/server/services/processes/environment/process-environment.service.ts:823-853`.
Test coverage: `tests/service/server/process-live-updates.test.ts:1212-1290`.
Conclusion: SATISFIED.

### TC-5.1a — SATISFIED
Requirement: stale environments are distinct from failed ones.
Implementation evidence: stale projection is explicit in `convex/processEnvironmentStates.ts:378-386` and stale control behavior is explicit in `apps/platform/server/services/processes/process-work-surface.service.ts:188-189`.
Test coverage: `tests/service/server/process-work-surface-api.test.ts:325-383`.
Conclusion: SATISFIED.

### TC-5.1b — SATISFIED
Requirement: lost environments are distinct from absent ones.
Implementation evidence: `lost` is a first-class state in the contract at `apps/platform/shared/contracts/process-work-surface.ts:90-94`, with distinct rebuild-vs-rehydrate behavior at `apps/platform/server/services/processes/process-work-surface.service.ts:194-197` and `apps/platform/server/services/processes/process-work-surface.service.ts:224-226`.
Test coverage: `tests/service/client/process-work-surface-page.test.ts:365-392`; integration rebuild setup at `tests/integration/process-work-surface.test.ts:604-625`.
Conclusion: SATISFIED.

### TC-5.2a — SATISFIED
Requirement: rehydrate refreshes a stale, recoverable working copy from canonical materials.
Implementation evidence: accepted rehydrate uses the stored plan and calls `adapter.rehydrateEnvironment` at `apps/platform/server/services/processes/environment/process-environment.service.ts:109-161` and `apps/platform/server/services/processes/environment/process-environment.service.ts:380-384`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1338-1364`.
Conclusion: SATISFIED.

### TC-5.2b — SATISFIED
Requirement: successful rehydrate updates visible state in the same session.
Implementation evidence: successful rehydrate republishes `ready` through `publishRecoveryOutcome` at `apps/platform/server/services/processes/environment/process-environment.service.ts:385-397` and `apps/platform/server/services/processes/environment/process-environment.service.ts:1104-1119`.
Test coverage: `tests/service/client/process-live.test.ts:569-600`.
Conclusion: SATISFIED.

### TC-5.3a — SATISFIED
Requirement: rebuild replaces a lost environment.
Implementation evidence: accepted rebuild queues `rebuilding`, then `executeRebuild` calls the provider rebuild path and republishes `ready` at `apps/platform/server/services/processes/environment/process-environment.service.ts:195-222` and `apps/platform/server/services/processes/environment/process-environment.service.ts:428-446`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1366-1398`.
Conclusion: SATISFIED.

### TC-5.3b — SATISFIED
Requirement: rebuild does not depend on prior working-copy survival.
Implementation evidence: the LocalProvider rebuild path can create a new environment even when there is no prior working tree at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:263-289`.
Test coverage: `tests/service/server/process-actions-api.test.ts:1400-1433`.
Conclusion: SATISFIED.

### TC-5.4a — SATISFIED
Requirement: durable artifact state survives rebuild.
Implementation evidence: rebuild only replaces the environment; it does not delete or rewrite durable artifact rows, and checkpoint visibility stays on the env-state row at `apps/platform/server/services/processes/environment/process-environment.service.ts:428-446`.
Test coverage: `tests/integration/process-work-surface.test.ts:507-675`.
Conclusion: SATISFIED.

### TC-5.4b — SATISFIED
Requirement: already-persisted durable code work survives rebuild.
Implementation evidence: latest checkpoint visibility is preserved through rebuilding on the client at `apps/platform/client/app/process-live.ts:90-111`.
Test coverage: `tests/service/client/process-live.test.ts:603-634`; integration reopen after checkpoint at `tests/integration/process-work-surface.test.ts:313-389`.
Conclusion: SATISFIED.

### TC-5.5a — SATISFIED
Requirement: rebuild blocked by missing canonical prerequisites shows blocked state and does not present ready.
Implementation evidence: rebuild preflight throws `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` at `apps/platform/server/services/processes/environment/process-environment.service.ts:178-188`.
Test coverage: `tests/service/client/process-work-surface-page.test.ts:1122-1154`; `tests/service/server/process-actions-api.test.ts:1457-1486`.
Conclusion: SATISFIED.

### TC-5.5b — SATISFIED
Requirement: rehydrate blocked when rebuild is required explains that rebuild is needed.
Implementation evidence: `assertRehydrateAvailable` throws `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` with rebuild guidance at `apps/platform/server/services/processes/environment/process-environment.service.ts:1439-1448`.
Test coverage: `tests/service/client/process-work-surface-page.test.ts:1156-1185`; `tests/service/server/process-actions-api.test.ts:1435-1455`.
Conclusion: SATISFIED.

### TC-6.1a — SATISFIED
Requirement: reopen restores latest durable process state, current materials, environment summary, and checkpoint result.
Implementation evidence: the bootstrap service rereads all surface sections from durable state at `apps/platform/server/services/processes/process-work-surface.service.ts:374-397`.
Test coverage: `tests/integration/process-work-surface.test.ts:313-389`; `tests/service/server/process-work-surface-api.test.ts:443-497`.
Conclusion: SATISFIED.

### TC-6.2a — SATISFIED
Requirement: durable work remains visible after the active environment is gone.
Implementation evidence: absent environment summaries can still carry `lastCheckpointResult` at `convex/processEnvironmentStates.ts:127-135`.
Test coverage: `tests/integration/process-work-surface.test.ts:313-389`.
Conclusion: SATISFIED.

### TC-6.3a — SATISFIED
Requirement: durable bootstrap remains usable when live updates fail.
Implementation evidence: bootstrap and websocket are separate, and the client reboots from HTTP before retrying live at `apps/platform/server/routes/processes.ts:155-179` and `apps/platform/client/app/bootstrap.ts:239-295`.
Test coverage: `tests/service/client/process-work-surface-page.test.ts:694-910`; `tests/service/client/process-live-status.test.ts:5-42`.
Conclusion: SATISFIED.

### TC-6.4a — SATISFIED
Requirement: finalized history is not duplicated on reopen.
Implementation evidence: history items are durable rows keyed by `historyItemId`, and the client dedupes incoming live history items by the same ID at `apps/platform/client/app/process-live.ts:26-33`.
Test coverage: `tests/integration/process-work-surface.test.ts:392-449`.
Conclusion: SATISFIED.

### TC-6.4b — SATISFIED
Requirement: prior checkpoint results are shown as existing durable state, not replayed as new work.
Implementation evidence: checkpoint visibility travels in the environment entity at `apps/platform/server/services/processes/live/process-live-normalizer.ts:113-121`, not in history; the client preserves that separation at `apps/platform/client/app/process-live.ts:181-183`.
Test coverage: `tests/service/client/process-live.test.ts:517-540`; `tests/integration/process-work-surface.test.ts:451-503`.
Conclusion: SATISFIED.

## 6. Structural Checks

### Production runtime does not default to stubs — PASS
Evidence: `apps/platform/server/app.ts:145-166` wires `DefaultProviderAdapterRegistry([new LocalProviderAdapter(...), new DaytonaProviderAdapter()])` unless a test-only override is injected, and it constructs `new OctokitCodeCheckpointWriter({ token: env.GITHUB_TOKEN })` unless a test writer is injected.
Evidence: the comments at `apps/platform/server/app.ts:141-166` explicitly mark the single-adapter registry and stub writers as test seams only.
Assessment: production no longer silently defaults to `InMemoryProviderAdapter` or `StubCodeCheckpointWriter`.

### `ExecutionResult` matches the 6-field spec contract — PASS
Evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:120-126` defines exactly `processStatus`, `processHistoryItems`, `outputWrites`, `sideWorkWrites`, `artifactCheckpointCandidates`, and `codeCheckpointCandidates`.
Evidence: execution consumes those fields in `apps/platform/server/services/processes/environment/process-environment.service.ts:532-612` and `apps/platform/server/services/processes/environment/process-environment.service.ts:651-682`.
Evidence: service-level execution contract tests exist at `tests/service/server/script-execution.service.test.ts:40-94`.
Assessment: PASS.

### `EnvironmentProviderAdapter` matches the 7-method spec — PASS
Evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:129-146` defines `ensureEnvironment`, `hydrateEnvironment`, `executeScript`, `rehydrateEnvironment`, `rebuildEnvironment`, and `teardownEnvironment`, plus `providerKind` on the interface; the design's listed operational methods are all present.
Evidence: the real LocalProvider implements the full contract at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:125-298`, and the Daytona skeleton implements the same method surface at `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:31-66`.
Assessment: PASS.

### `sourceAttachments.accessMode` is durable and typed — PASS
Evidence: Convex schema and query projection include `accessMode` at `convex/sourceAttachments.ts:5-29` and `convex/sourceAttachments.ts:52-64`.
Evidence: the shared process-surface contract requires `accessMode` on source refs at `apps/platform/shared/contracts/process-work-surface.ts:324-336`.
Evidence: durability tests exist at `convex/sourceAttachments.test.ts:106-160`.
Assessment: PASS.

### `processEnvironmentStates.workingSetFingerprint` is computed and not always null — PASS
Evidence: `convex/processes.ts:264-318` computes the initial fingerprint at process creation.
Evidence: env-state upserts recompute and persist the fingerprint at `convex/processEnvironmentStates.ts:481-490`.
Evidence: hydration-plan writes also recompute and persist the fingerprint at `convex/processEnvironmentStates.ts:577-585`.
Evidence: direct tests verify 64-char hex output, stale projection, and non-null writes at `convex/processEnvironmentStates.test.ts:385-525`.
Assessment: PASS.

### Fire-and-forget lanes surface failures as visible env state — PASS
Evidence: async hydration, rehydrate, rebuild, execution, and checkpoint paths all wrap fire-and-forget work with `catch` handlers that route to `handleAsyncFailure` or the failure publishers at `apps/platform/server/services/processes/environment/process-environment.service.ts:73-83`, `apps/platform/server/services/processes/environment/process-environment.service.ts:232-263`, `apps/platform/server/services/processes/environment/process-environment.service.ts:470-485`, `apps/platform/server/services/processes/environment/process-environment.service.ts:697-710`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:1155-1267`.
Evidence: execution-failure live tests assert visible failed env state and recovery controls at `tests/service/server/process-live-updates.test.ts:909-1015`.
Assessment: PASS.

### Client renders from `process.controls`, not `availableActions` — PASS
Evidence: the work-surface page passes `activeProcess.controls` into the controls renderer at `apps/platform/client/features/processes/process-work-surface-page.ts:131-161`.
Evidence: the controls component renders every element of `controls` and shows disabled reasons directly at `apps/platform/client/features/processes/process-controls.ts:19-45`.
Evidence: `availableActions` is still used for the response composer gate at `apps/platform/client/features/processes/process-work-surface-page.ts:190-202`, but not for control rendering.
Assessment: PASS.

### Real Octokit writer is on the production path and `GITHUB_TOKEN` is required — PASS
Evidence: `apps/platform/server/config.ts:32-38` makes `GITHUB_TOKEN` mandatory in runtime env parsing.
Evidence: `apps/platform/server/app.ts:164-166` constructs the real writer on the default app path.
Evidence: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:137-145` throws on an empty token.
Evidence: unit tests enforce the constructor failure at `tests/service/server/octokit-code-checkpoint-writer.test.ts:96-99`, and real-network integration tests fail loud if the token is missing at `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:93-104`.
Assessment: PASS.

### No Zod defaults on required fields — FAIL
Evidence: `apps/platform/shared/contracts/process-work-surface.ts:244-246` defaults required `environment.lastCheckpointResult`.
Evidence: `apps/platform/shared/contracts/process-work-surface.ts:258-259` defaults required `process.controls` and `process.hasEnvironment`.
Evidence: `apps/platform/shared/contracts/process-work-surface.ts:328` defaults required `processSourceReference.accessMode`.
Evidence: those schemas are used by the production client response parsers at `apps/platform/client/browser-api/process-work-surface-api.ts:106`, `apps/platform/client/browser-api/process-work-surface-api.ts:128`, `apps/platform/client/browser-api/process-work-surface-api.ts:150`, `apps/platform/client/browser-api/process-work-surface-api.ts:172`, and `apps/platform/client/browser-api/process-work-surface-api.ts:194`.
Assessment: FAIL.

## 7. Anti-Pattern Check

I scanned the Epic 3 shared contracts for defaults on required fields.

Confirmed required-field defaults still present:

`apps/platform/shared/contracts/process-work-surface.ts:244-246`

Field: `environment.lastCheckpointResult`

Why it matters: the client can silently accept a server payload that omits the required latest-checkpoint field and convert it to `null`.

`apps/platform/shared/contracts/process-work-surface.ts:258-259`

Fields: `process.controls`, `process.hasEnvironment`

Why it matters: the client can silently accept a malformed process summary and synthesize a 7-control default set plus `hasEnvironment = false`.

`apps/platform/shared/contracts/process-work-surface.ts:328`

Field: `processSourceReference.accessMode`

Why it matters: a malformed source ref can silently downgrade to `read_only` instead of failing fast.

I verified the masking behavior directly with a local `tsx` probe against the real schemas.

Observed parse result:

```json
{
  "environmentSummaryAccepted": true,
  "parsedLastCheckpointResult": null,
  "processSummaryAccepted": true,
  "parsedControlsLength": 7,
  "parsedHasEnvironment": false,
  "sourceReferenceAccepted": true,
  "parsedAccessMode": "read_only"
}
```

That result is why I am not calling SHIP even though the AC/TC audit and gate both pass.

## 8. Boundary Inventory

### Real production boundaries now in use
`LocalProviderAdapter` is a real provider implementation, not a stub, at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:100-309`.

`OctokitCodeCheckpointWriter` is the real canonical code writer on the production app path at `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:128-247` and `apps/platform/server/app.ts:164-166`.

Artifact durability is real through Convex File Storage at `convex/artifacts.ts:19-40` and `convex/artifacts.ts:89-141`.

Convex-backed environment durability is real through `processEnvironmentStates` at `convex/processEnvironmentStates.ts:49-62` and `convex/processEnvironmentStates.ts:419-592`.

### Purposefully stubbed / deferred boundaries
`DaytonaProviderAdapter` is intentionally a typed skeleton that throws `NOT_IMPLEMENTED` at `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:14-66`.

Deferral reason: the brief explicitly excludes Daytona integration from this review, and the addendum treats hosted Daytona auth/SDK work as research-gated follow-on scope.

`SingleAdapterRegistry`, `InMemoryProviderAdapter`, `FailingProviderAdapter`, `StubCodeCheckpointWriter`, and `FailingCodeCheckpointWriter` remain test seams only.

Evidence: test-seam-only comments at `apps/platform/server/app.ts:141-166`, `apps/platform/server/services/processes/environment/provider-adapter.ts:149-153`, and `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:30-34`.

### Generic but in-scope substrate
`ScriptExecutionService` still uses a generic placeholder TypeScript module source at `apps/platform/server/services/processes/environment/script-execution.service.ts:9-35`.

I am not counting that as a stub for Epic 3 because the brief explicitly excludes process-type-specific orchestration and prompt logic.

## 9. Blocking Findings

### B-1 — Major — Structural
Title: Required-field Zod defaults still mask malformed Epic 3 payloads in the production client.
Spec area: brief structural check `no Zod defaults on required fields`; also undermines durable/server-truth expectations behind AC-1.4 and AC-6.1.
Primary evidence: `apps/platform/shared/contracts/process-work-surface.ts:244-246`, `apps/platform/shared/contracts/process-work-surface.ts:258-259`, `apps/platform/shared/contracts/process-work-surface.ts:328`.
Propagation evidence: `apps/platform/client/browser-api/process-work-surface-api.ts:106`, `apps/platform/client/browser-api/process-work-surface-api.ts:128`, `apps/platform/client/browser-api/process-work-surface-api.ts:150`, `apps/platform/client/browser-api/process-work-surface-api.ts:172`, `apps/platform/client/browser-api/process-work-surface-api.ts:194`.
Observed behavior: local `tsx` parsing accepted an environment summary with no `lastCheckpointResult`, a process summary with no `controls` and no `hasEnvironment`, and a source ref with no `accessMode`, then silently injected defaults.
Why I am treating it as REVISE rather than BLOCK: the gate is green, I found no production-path test-fake defaulting, and I did not find an InMemory-only correctness hole on the shipped Epic 3 behaviors. This is a contract-hygiene / fail-fast defect, not a broken execution lane.
Closure needed: remove the defaults on required fields, update any fixtures that relied on them, and add negative tests mirroring the existing missing-`environment` / missing-`statusLabel` tests.

## 10. Non-Blocking Findings

### N-1 — Minor
Title: `HydrationPlan.fingerprint` is still passed to adapters as an empty string.
Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:1306-1313` explicitly hard-codes `fingerprint: ''` in `buildAdapterHydrationPlan`.
Impact: current Epic 3 stale detection still works because Convex computes/stores `workingSetFingerprint` on the env-state row at `convex/processEnvironmentStates.ts:481-490` and `convex/processEnvironmentStates.ts:577-585`, so this is not a current behavioral break.
Why it still matters: the provider contract in the design includes a real fingerprint field, and today the adapter-facing value is vestigial.
Closure needed: thread the real durable digest into the adapter hydration plan so the provider contract stays honest end-to-end.

## 11. Assumptions And Notes

I treated `TC-1.1c.1` as covered by `tests/service/client/process-controls.test.ts:176-197`, which uses a rehydrating fixture and asserts rehydrating-specific disabled reasons even though the test name is descriptive rather than the exact matrix-row ID.

I did not run the manual verification checklist from `test-plan.md`.

I did not run `npx convex dev`; the brief did not require it, and I am not using that absence as a finding.

Where TC names in historical test files were noisy or reused from earlier epics, I ignored the mismatched names and only used the tests whose assertions actually exercised Epic 3 behavior.

## 12. Ship / Revise / Block Rationale

Why not BLOCK:

The brief says BLOCK is mandatory when the gate fails, when production wiring silently uses test fakes, or when behavior only works on the InMemory store and not the Convex-backed production path.

I did not find any of those conditions on the final tree.

Why not SHIP:

The same brief also says to ship only on clean, truly-passing work.

The remaining required-field defaults are not clean.

They do not break the green gate or the AC/TC behaviors I traced, but they do let the production client silently accept malformed server payloads for required Epic 3 fields.

That is exactly the sort of contract masking this verification round was supposed to flush out.

Final verdict:

REVISE.
