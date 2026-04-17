# Epic 3 Round 2 — Opus Adversarial Review

**Reviewer:** `opus-adversarial`
**Tree HEAD:** `43c23df`
**Date:** 2026-04-16
**Verdict:** SHIP with nonblocking nits

## Headline

After adversarial probing of the tree, I found **zero blocking defects**. The
three fix-batch chunks that closed the 14 Round 1 gaps have genuinely replaced
production stubs with real implementations on every path the spec exercises.
`corepack pnpm run verify` exits 0 (354 tests across convex, service, and
client lanes). `corepack pnpm run test:integration` exits 0 (12 tests across
3 files). Production wiring in `apps/platform/server/app.ts` constructs the
real `LocalProviderAdapter`, the typed `DaytonaProviderAdapter` skeleton
(throws `NOT_IMPLEMENTED` loud), and the real `OctokitCodeCheckpointWriter`
(throws loud on empty `GITHUB_TOKEN`). The `ExecutionResult` contract has all
6 spec fields. The working-set fingerprint is computed in Convex and stored
on every env state mutation, with a real read-time stale projection. The
`hasCanonicalRecoveryMaterials` divergence between `InMemoryPlatformStore`
and `ConvexPlatformStore` is closed — both now check artifacts + sources +
outputs.

I list 8 nonblocking findings: 4 Zod defaults on spec-required fields
already explicitly acknowledged as nonblocking cleanup by the Implementation
Addendum, 1 minor spec/impl divergence on the `EnvironmentProviderAdapter`
interface (7 methods in `tech-design.md:213-222` vs 6 methods + a
`providerKind` property in `tech-design-server.md:573-591` — impl follows
the refined server-side spec), 1 empty-string `fingerprint` passed to the
adapter in the orchestrator's hydration plan (no behavioral impact: the
durable fingerprint is computed separately in Convex), 1 inherited
client-side `deriveEnvironmentStatusLabel` recomputation kept for
client-synthesized transitions (not for server-provided payloads), and
1 minor scope observation on integration tests using `InMemoryPlatformStore`.

## Reading journey confirmation

I read all 7 reading-journey files in full:

1. `epic.md` (971 lines) — full read, including every AC, TC, matrix row,
   data contract, error response, and non-functional requirement.
2. `tech-design.md` (684 lines) — full read. Covers decision record,
   validation, module boundaries, system view, provider adapter sketch
   (7-method version), durable-state stance, chunk breakdown.
3. `tech-design-server.md` (1175 lines) — full read. Covers module
   architecture, Convex field outline for `processEnvironmentStates`, the
   refined 6-method `EnvironmentProviderAdapter` + `providerKind`
   property, `ExecutionResult` 6-field contract (line 564-571),
   checkpoint planning, flows 1–6, test files.
4. `tech-design-client.md` (603 lines) — full read. Covers bootstrap
   consequence, AppState extensions, browser API, controls render rule
   (line 99-103), live apply contract, flows 1–5.
5. `test-plan.md` (530 lines) — full read. Covers TC-to-test mapping for
   every test file, mock boundaries, fixture strategy, manual verification
   checklist.
6. `implementation-addendum.md` — full read. The Round 1 closure spec. 14
   gap items distributed across 3 chunks. Architectural decisions locked
   during gap analysis. Four residual required-with-default
   anti-patterns flagged as nonblocking cleanup.
7. `codex-impl-log.md` — skimmed the first 200 lines for run-state
   context; skipped deeper re-verification against the log per brief
   direction ("skim for context, don't re-verify against").

## Gate run evidence

### `corepack pnpm run verify`

```
> liminal-build@ verify /Users/leemoore/code/liminal-build
> corepack pnpm run red-verify && corepack pnpm run test:convex && corepack pnpm run test:service && corepack pnpm run test:client

> liminal-build@ red-verify /Users/leemoore/code/liminal-build
> corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build

> liminal-build@ format:check /Users/leemoore/code/liminal-build
> corepack pnpm exec biome check ...
Checked 179 files in 14ms. No fixes applied.

> liminal-build@ lint /Users/leemoore/code/liminal-build
> corepack pnpm exec biome lint ...
Checked 180 files in 24ms. No fixes applied.

> liminal-build@ typecheck /Users/leemoore/code/liminal-build
> corepack pnpm exec tsc --noEmit -p tsconfig.json && corepack pnpm --filter @liminal-build/platform typecheck
> @liminal-build/platform@ typecheck /Users/leemoore/code/liminal-build/apps/platform
> tsc --noEmit -p tsconfig.server.json && tsc --noEmit -p tsconfig.client.json

> @liminal-build/platform@ build /Users/leemoore/code/liminal-build/apps/platform
> corepack pnpm run clean && corepack pnpm run build:server && corepack pnpm run build:client

dist/client/index.html                  0.42 kB │ gzip:  0.28 kB
dist/client/assets/index-fSWBRINv.js  126.11 kB │ gzip: 30.31 kB

✓ built in 35ms

> liminal-build@ test:convex
> corepack pnpm exec vitest run convex --environment node

 Test Files  7 passed (7)
      Tests  35 passed (35)

> liminal-build@ test:service
> corepack pnpm exec vitest run tests/service/server --environment node

 Test Files  20 passed (20)
      Tests  163 passed (163)

> liminal-build@ test:client
> corepack pnpm exec vitest run tests/service/client --environment jsdom

 Test Files  19 passed (19)
      Tests  156 passed (156)
```

Gate exit code: **0**.

### `corepack pnpm run test:integration`

```
> liminal-build@ test:integration /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/integration --environment node

 Test Files  3 passed (3)
      Tests  12 passed (12)
   Duration  5.92s
```

Integration exit code: **0**.

**Totals:** convex 35, service 163, client 156, integration 12 = **366 tests
passing**.

## AC-by-AC audit

### AC-1.1 — Environment state visible on first load

**Status:** SATISFIED.

`convex/processEnvironmentStates.ts:352-391` defines
`getProcessEnvironmentSummary` which returns a real `EnvironmentSummary`
including the 11-value `state` enum. Production bootstrap runs through
`apps/platform/server/services/processes/readers/environment-section.reader.ts`
which delegates to `platformStore.getProcessEnvironmentSummary`. The
bootstrap response at
`apps/platform/server/routes/processes.ts` (via
`ProcessWorkSurfaceService`) includes `environment` as a first-class
section. Server test
`tests/service/server/process-work-surface-api.test.ts:217-277`
asserts the full environment payload including `state` on a real HTTP
`GET` against the assembled Fastify app.

### AC-1.2 — Stable visible control set

**Status:** SATISFIED.

Contract: the stable 7-control order is defined at
`apps/platform/shared/contracts/process-work-surface.ts:169-177` as
`['start','respond','resume','rehydrate','rebuild','review','restart']`.
Builder: `buildProcessSurfaceControls` at
`process-work-surface.ts:189-210` iterates the stable order and produces
one `ProcessSurfaceControlState` per action. Client renderer:
`apps/platform/client/features/processes/process-controls.ts:19-45`
iterates `args.controls` (the full set) and renders every control,
including disabled ones. Tests
`tests/service/client/process-controls.test.ts:39-46` (TC-1.2a) and
`:49-56` (TC-1.2b) assert stable order and visible-but-disabled
behavior.

### AC-1.3 — Disabled reason visible on blocked controls

**Status:** SATISFIED.

`process-controls.ts:37-42` appends a `<p data-process-control-disabled-reason>`
when `control.disabledReason !== null`. Tests at
`process-controls.test.ts:58-72` (TC-1.3a: blocked `rebuild` with stale
environment) and `:66-72` (TC-1.3b: blocked `start` with preparing
environment) exercise that rendering path.

### AC-1.4 — Derived from durable state, not client guesses

**Status:** SATISFIED.

Bootstrap reads durable environment state via
`platformStore.getProcessEnvironmentSummary` (Convex query at
`convex/processEnvironmentStates.ts:352-391`). Client renders whatever
comes back. `tests/service/client/process-work-surface-page.test.ts:310+`
(TC-1.1a) and integration reopen tests at
`tests/integration/process-work-surface.test.ts` verify the same
environment fields round-trip through a reload.

### AC-1.5 — Process remains visible without environment

**Status:** SATISFIED.

`buildProcessSurfaceSummary` in
`apps/platform/server/services/processes/process-work-surface.service.ts`
returns a `ProcessSurfaceSummary` even when the environment summary is
`absent`. The bootstrap surface still returns `process`, `history`,
`materials`, `currentRequest`, and `sideWork` sections. Test
`tests/service/server/process-work-surface-api.test.ts:279+` (TC-1.1b)
and the dedicated TC-1.5a coverage confirm process identity and
materials remain present for a draft/absent-environment process.

### AC-2.1 — Start/resume enters preparation state in session

**Status:** SATISFIED.

Start flow: `apps/platform/server/services/processes/process-start.service.ts`
(action service) delegates to `ProcessEnvironmentService`. Resume flow:
`process-resume.service.ts` delegates similarly. The environment service
upserts `state='preparing'` BEFORE returning the accepted response and
publishes a `process` + `environment` upsert to the live hub:
`process-environment.service.ts` patterns for same-session update are
the standard `upsertEnvironmentState` followed by `publishEnvironmentUpsert`
(see similar sequence at lines 130-153 for `rehydrate`).

Tests:
- `tests/service/server/process-actions-api.test.ts` covers TC-2.1a/2.1b.
- `tests/service/client/process-work-surface-page.test.ts:TC-2.1a`
  covers same-session page update.

### AC-2.2 — Current materials hydrate into environment

**Status:** SATISFIED.

The hydration planner builds the plan from current material refs:
`process-environment.service.ts:1269-1279` reads via
`getCurrentProcessMaterialRefs` + `listProcessOutputs` through the
platform store. The plan is enriched at
`buildAdapterHydrationPlan` (`:1291-1349`) with display names, target
refs, accessMode, and repositoryUrl drawn from durable source records.
The `LocalProviderAdapter.hydrateEnvironment`
(`local-provider-adapter.ts:138-190`) clones only the sources in the
plan, not every project source. Tests:
`process-actions-api.test.ts:TC-2.2a` (hydration plan reflects only
current materials) and `:TC-2.2b` (partial working set).

### AC-2.3 — Hydration progress and failure visible

**Status:** SATISFIED.

Progress: `process-environment.service.ts:282-290` emits a
`history_item` + `preparing` environment upsert before hydration. Success
upserts `state='ready'` (`:304-311`). Failure: the inner try/catch at
`:295-314` records the error reason, then `transitionToFailed` at
`:1221-1267` upserts `state='failed'` with `blockedReason` and publishes
the failed environment as an env upsert.

Tests: `process-live-updates.test.ts:TC-2.3a/2.3b`.

### AC-2.4 — Running begins only after readiness or recoverable failure

**Status:** SATISFIED.

`executeHydration` at `process-environment.service.ts:266-358` first
calls `ensureEnvironment`+`hydrateEnvironment`, sets `state='ready'`, and
only then transitions the process to `running` and kicks off execution
(via `runExecutionAsync` at `:457-486`). If hydration or the
running-transition fails, the code takes the `transitionToFailed` branch
(`:349-357`) without entering `running`.

Tests: `process-live.test.ts:TC-2.4a/2.4b` exercise client-side
transition sequences for the ready→running and failure-no-running paths.

### AC-2.5 — Writable vs read-only source visibility

**Status:** SATISFIED.

`sourceAttachments.accessMode` is a durable required field at
`convex/sourceAttachments.ts:15` with
`v.union(v.literal('read_only'), v.literal('read_write'))`. Projection
returns it at `:56`. Client renders it in
`apps/platform/client/features/processes/process-materials-section.ts`.

Tests: `tests/service/client/process-materials-section.test.ts` covers
TC-2.5a/2.5b; `process-work-surface-api.test.ts:TC-2.5a/2.5b` covers
the durable contract shape.

### AC-3.1 — Running execution state visible

**Status:** SATISFIED.

Execution kickoff (`executeExecution` at `:488-649`) upserts
`state='running'` and publishes an environment upsert (`:512-525`).
Tests: `process-live-updates.test.ts:TC-3.1a`,
`process-live.test.ts:TC-3.1a`.

### AC-3.2 — Process-facing updates, not raw fragments

**Status:** SATISFIED.

Live publications emit typed `ProcessSurfaceSummary`,
`EnvironmentSummary`, `ProcessHistoryItem`, `ProcessMaterialsSectionEnvelope`
envelopes via `publishEnvironmentUpsert` at `:1075-1101`. There is no
raw stdout/stderr stream on the browser path. The client live reducer
(`apps/platform/client/app/process-live.ts:118-188`) only handles typed
entity updates (`process`, `history`, `current_request`, `materials`,
`side_work`, `environment`).

Tests: `process-live-updates.test.ts:TC-3.2a/3.2b`.

### AC-3.3 — Preparing/running/waiting/checkpointing/settled distinct

**Status:** SATISFIED.

Environment state enum has 11 distinct values (contract at
`process-work-surface.ts` / `processEnvironmentStates.ts:19-31`).
Process status has its own enum. Transitions from running to
checkpointing land at `process-environment.service.ts:583-600`.
Transition from running to waiting via
`transitionProcessForExecutionStatus` at `:1392-1419` preserves the
distinction.

Tests: `process-live.test.ts:TC-3.3a/3.3b`.

### AC-3.4 — Execution failure leaves surface legible

**Status:** SATISFIED.

Failure path at `process-environment.service.ts:549-577` still publishes
materials, side work, current request, and history — the env state goes
to `failed` with a `blockedReason` but the rest of the surface remains
intact. Client reducer at `process-live.ts:156-163` treats the process
entity update as an independent patch that doesn't clear other sections.

Tests: `process-actions-api.test.ts:TC-3.4a`,
`process-work-surface-page.test.ts` and `process-live.test.ts`.

### AC-4.1 — Artifact outputs checkpoint durably

**Status:** SATISFIED.

`persistCheckpointArtifacts` at `convex/artifacts.ts:89-142` is a real
`internalAction` that uploads each content blob to Convex File Storage,
then delegates to an internal mutation (`:164-213`) which writes the
artifact row with `contentStorageId` and the matching
`processOutputs` row. Rollback at `:128-140` deletes uploaded blobs on
any failure. Reopen reads back the durable artifact row via
`listProjectArtifactSummaries` at `:42-74`.

Production wiring: `ConvexPlatformStore.persistCheckpointArtifacts`
calls the Convex action with admin auth (`platform-store.ts`).
Orchestrator call: `process-environment.service.ts:775-779`.

Tests: `convex/artifacts.test.ts`, `process-actions-api.test.ts`,
`process-live-updates.test.ts:TC-4.1a`,
`process-work-surface.test.ts:TC-4.1b` (integration reopen).

### AC-4.2 — Writable source receives durable code persistence

**Status:** SATISFIED.

`OctokitCodeCheckpointWriter` at `code-checkpoint-writer.ts:134-248` is
a real implementation wired as the production default
(`app.ts:164-165`). The writer calls `getContent` to read the existing
SHA, then `createOrUpdateFileContents` to commit the file to the
target ref. No branch invention.

Orchestrator: `process-environment.service.ts:812-854` iterates
`plan.codeTargets`, calls `codeCheckpointWriter.writeFor`, and on
success records a `LastCheckpointResult` with `outcome='succeeded'`
and the real commit SHA.

Tests: `octokit-code-checkpoint-writer.test.ts` (writer unit, 256
lines); `process-actions-api.test.ts:TC-4.2a`;
`process-environment-panel.test.ts:TC-4.2b`.

### AC-4.3 — Read-only sources never offer code checkpointing

**Status:** SATISFIED.

`checkpoint-planner.ts` filters code checkpoint candidates by
`accessMode`. Read-only sources become `skippedReadOnly` entries that
surface as failed `LastCheckpointResult` with `failureReason='Code
checkpoint was blocked because the attached source is not writable.'`
(`process-environment.service.ts:892-927`).

Tests: `process-actions-api.test.ts:TC-4.3a` ("checkpoint planner
excludes read-only source candidates").

### AC-4.4 — Checkpoint result visible

**Status:** SATISFIED.

`LastCheckpointResult` is embedded inside `EnvironmentSummary` per
spec (epic.md:693). Success results are rendered by
`process-checkpoint-result.ts`. The `buildCheckpointResult` helper at
`process-environment.service.ts:1490-1507` includes all 7 spec fields
(checkpointId, checkpointKind, outcome, targetLabel, targetRef,
completedAt, failureReason).

Tests: `process-environment-panel.test.ts:TC-4.4a/4.4b`.

### AC-4.5 — Checkpoint failure shown with recovery path

**Status:** SATISFIED.

Failure paths at `process-environment.service.ts:819-854` (code write
failed) and `:955-985` (top-level catch) record a failed
`LastCheckpointResult`, upsert env `state='failed'` with a
meaningful `blockedReason`, and publish a visible history item
("Checkpoint failed.").

Tests: `process-live-updates.test.ts:TC-4.5a/4.5b`.

### AC-5.1 — Stale/failed/lost/rebuilding/unavailable distinct

**Status:** SATISFIED.

All 11 enum values exist in the environment state contract. The
critical stale projection (distinguishing `stale` from plain `ready`)
happens at Convex query time:
`convex/processEnvironmentStates.ts:382-386`. Dedicated test at
`convex/processEnvironmentStates.test.ts:484` verifies the projection.

Tests: `process-work-surface-api.test.ts:TC-5.1a/5.1b`,
`process-environment-panel.test.ts:TC-5.1a/5.1b`.

### AC-5.2 — Rehydrate refreshes recoverable environment

**Status:** SATISFIED.

`ProcessEnvironmentService.rehydrate` (`:109-161`) preflight-checks at
`assertRehydrateAvailable` (`:1421-1456`), upserts
`state='rehydrating'` with a `blockedReason`, publishes the
in-flight env update, and kicks off `runRehydrateAsync` (`:232-247`).
`executeRehydrate` (`:360-406`) calls the adapter's
`rehydrateEnvironment`, upserts `state='ready'` on success, and
publishes the ready env.

Tests: `process-actions-api.test.ts:TC-5.2a`;
`process-live.test.ts:TC-5.2b`.

### AC-5.3 — Rebuild reconstructs from canonical truth

**Status:** SATISFIED.

`ProcessEnvironmentService.rebuild` (`:163-230`) checks recovery
prerequisites via both the working-set plan and
`hasCanonicalRecoveryMaterials`. Now that both stores match
(`platform-store.ts:1122-1133` Convex, `:1826-1834` InMemory), the
prerequisite gate is uniform across production and test paths.
`runRebuildAsync` (`:249-264`) and `executeRebuild` (`:408-455`)
call the adapter's `rebuildEnvironment`.
`LocalProviderAdapter.rebuildEnvironment`
(`local-provider-adapter.ts:258-289`) tears down any prior env,
ensures a new one, and hydrates from the plan.

Tests: `process-actions-api.test.ts:TC-5.3a/5.3b`.

### AC-5.4 — Durable state survives recovery

**Status:** SATISFIED.

`processOutputs`, `artifacts` (with `contentStorageId`), and
`sourceAttachments` are durable and independent of the
`processEnvironmentStates` row. Rebuild creates a new env row but
doesn't touch material rows. Integration test
`process-work-surface.test.ts:313` (TC-5.4a) exercises this;
`:451` (TC-5.4b) exercises code-checkpoint persistence across rebuild.

### AC-5.5 — Blocked recovery remains visible and non-misleading

**Status:** SATISFIED.

`assertRebuildAvailable` throws `PROCESS_ACTION_NOT_AVAILABLE` (409) or
`PROCESS_ENVIRONMENT_UNAVAILABLE` (503) at preflight.
`assertRehydrateAvailable` throws `PROCESS_ENVIRONMENT_NOT_RECOVERABLE`
(409) with `"Rehydrate is blocked because rebuild is required first."`
when the env is lost or the environmentId is null (`:1439-1449`). The
rebuild prerequisite check (`:182-188`) throws
`PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` (422) when canonical inputs
are absent.

Tests: `process-actions-api.test.ts:TC-5.5a/5.5b`;
`process-work-surface-page.test.ts:TC-5.5a/5.5b`.

### AC-6.1 — Reopen restores durable state

**Status:** SATISFIED.

Bootstrap is a single durable read. Server-side:
`DefaultProcessWorkSurfaceService` composes `project`, `process`,
`history`, `materials`, `currentRequest`, `sideWork`, `environment`
sections in one response. Integration test at
`process-work-surface.test.ts:TC-6.1a` exercises the reopen after prior
env work + checkpoint result.

### AC-6.2 — Environment absence does not erase durable results

**Status:** SATISFIED.

Artifact rows, source rows, and the `lastCheckpointResult` column live
independently of current `environmentId`. The Convex env query at
`processEnvironmentStates.ts:374-376` returns an `absent` summary if the
env row is missing but does not clear checkpoint history. Integration
test at `process-work-surface.test.ts:TC-6.2a`.

### AC-6.3 — Durable surface usable when live updates fail

**Status:** SATISFIED.

Bootstrap and live are decoupled. The client bootstrap path does not
depend on the WebSocket. If the WS handshake fails, the page renders
durable state and `ProcessLiveStatus` shows the retry affordance.

Tests: `process-live-status.test.ts:TC-6.3a`;
`process-work-surface-page.test.ts:TC-6.3a`.

### AC-6.4 — No duplicate history or falsely restated checkpoints

**Status:** SATISFIED.

History dedup by `historyItemId` at
`process-live.ts:26-34` (`mergeHistoryItems`). Checkpoint result is a
single replaceable field on the environment summary — there is no
append-only list.

Tests: `process-work-surface.test.ts:TC-6.4a/6.4b`.

## TC-by-TC audit

| TC | Status | File:Line | Notes |
|----|--------|-----------|-------|
| TC-1.1a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:217` | Real Fastify HTTP + InMemoryPlatformStore seam; asserts `environment`, `controls`, `hasEnvironment`. |
| TC-1.1a (client) | SATISFIED | `tests/service/client/process-work-surface-page.test.ts:310` | Page render with bootstrap fixture. |
| TC-1.1b | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:279` | Draft process → `environment.state = absent`. |
| TC-1.1c | SATISFIED | `tests/service/client/process-controls.test.ts:74` | Preparing state disables lifecycle controls. |
| TC-1.1c.1 | SATISFIED | Same file, nearby; `rehydrating` behaves equivalently to `preparing` in the control fixture family. |
| TC-1.1d | SATISFIED | `process-controls.test.ts:84` | Ready state disables `rehydrate`/`rebuild`. |
| TC-1.1e | SATISFIED | `process-controls.test.ts:92` | Running state disables recovery. |
| TC-1.1f | SATISFIED | `process-controls.test.ts:101` | Checkpointing state disables lifecycle. |
| TC-1.1g | SATISFIED | `process-controls.test.ts:111` | Stale: rehydrate enabled, rebuild disabled with reason. |
| TC-1.1h | SATISFIED | `process-controls.test.ts:118` | Lost: rebuild enabled, rehydrate disabled with reason. |
| TC-1.1i | SATISFIED | `process-controls.test.ts:125` | Failed: start/resume disabled; recovery actions available. |
| TC-1.1j | SATISFIED | `process-controls.test.ts:154` | Rebuilding disables lifecycle. |
| TC-1.1k | SATISFIED | `process-controls.test.ts:164` | Unavailable: controls visible, blocked reason readable. |
| TC-1.2a | SATISFIED | `process-controls.test.ts:39` | Stable order. |
| TC-1.2b | SATISFIED | `process-controls.test.ts:49` | Disabled controls still rendered. |
| TC-1.3a | SATISFIED | `process-controls.test.ts:58` | Rebuild blocked reason visible. |
| TC-1.3b | SATISFIED | `process-controls.test.ts:66` | Start blocked reason visible. |
| TC-1.4a | SATISFIED | `tests/integration/process-work-surface.test.ts` (TC-1.4a) | Reload preserves env truth. |
| TC-1.5a | SATISFIED | `process-work-surface-api.test.ts:TC-1.5a` + `process-work-surface-page.test.ts:TC-1.5a`. |
| TC-2.1a | SATISFIED | `process-actions-api.test.ts:TC-2.1a` + `process-work-surface-page.test.ts:TC-2.1a`. |
| TC-2.1b | SATISFIED | `process-actions-api.test.ts:TC-2.1b` + `process-work-surface-page.test.ts:TC-2.1b`. |
| TC-2.2a | SATISFIED | `process-actions-api.test.ts:TC-2.2a` | Provider gets a hydration plan built from current materials only. |
| TC-2.2b | SATISFIED | `process-actions-api.test.ts:TC-2.2b` | Partial working set hydrates. |
| TC-2.3a | SATISFIED | `process-live-updates.test.ts:TC-2.3a` + `process-live.test.ts:TC-2.3a`. |
| TC-2.3b | SATISFIED | `process-live-updates.test.ts:TC-2.3b` + `process-live.test.ts:TC-2.3b`. |
| TC-2.4a | SATISFIED | `process-live-updates.test.ts:TC-2.4a` + `process-live.test.ts:TC-2.4a`. |
| TC-2.4b | SATISFIED | `process-actions-api.test.ts:TC-2.4b` + `process-live.test.ts:TC-2.4b`. |
| TC-2.5a | SATISFIED | `process-work-surface-api.test.ts:TC-2.5a`; `process-materials-section.test.ts:TC-2.5a`. |
| TC-2.5b | SATISFIED | Same files; read-only. |
| TC-3.1a | SATISFIED | `process-live-updates.test.ts:TC-3.1a` + `process-live.test.ts:TC-3.1a`. |
| TC-3.2a | SATISFIED | `process-live-updates.test.ts:TC-3.2a` + `process-live.test.ts:TC-3.2a`. |
| TC-3.2b | SATISFIED | `process-live-updates.test.ts:TC-3.2b` + `process-live.test.ts:TC-3.2b`. |
| TC-3.3a | SATISFIED | `process-live-updates.test.ts:TC-3.3a` + `process-live.test.ts:TC-3.3a`. |
| TC-3.3b | SATISFIED | `process-live-updates.test.ts:TC-3.3b` + `process-live.test.ts:TC-3.3b`. |
| TC-3.4a | SATISFIED | `process-actions-api.test.ts:TC-3.4a` + `process-work-surface-page.test.ts:TC-3.4a`. |
| TC-4.1a | SATISFIED | `process-actions-api.test.ts:TC-4.1a` + `process-live-updates.test.ts:TC-4.1a`. |
| TC-4.1b | SATISFIED | `process-work-surface.test.ts:TC-4.1b` (integration). |
| TC-4.2a | SATISFIED | `process-actions-api.test.ts:TC-4.2a`. |
| TC-4.2b | SATISFIED | `process-environment-panel.test.ts:TC-4.2b`; `process-live-updates.test.ts:TC-4.2b`. |
| TC-4.3a | SATISFIED | `process-actions-api.test.ts:TC-4.3a`; `process-materials-section.test.ts:TC-4.3a`. |
| TC-4.4a | SATISFIED | `process-environment-panel.test.ts:TC-4.4a`; `process-live-updates.test.ts:TC-4.4a`. |
| TC-4.4b | SATISFIED | `process-environment-panel.test.ts:TC-4.4b`; `process-live-updates.test.ts:TC-4.4b`. |
| TC-4.5a | SATISFIED | `process-live-updates.test.ts:TC-4.5a`; `process-environment-panel.test.ts:TC-4.5a`. |
| TC-4.5b | SATISFIED | `process-live-updates.test.ts:TC-4.5b`; `process-live.test.ts:TC-4.5b`. |
| TC-5.1a | SATISFIED | `process-work-surface-api.test.ts:TC-5.1a`; `process-environment-panel.test.ts:TC-5.1a`. |
| TC-5.1b | SATISFIED | Same files; lost. |
| TC-5.2a | SATISFIED | `process-actions-api.test.ts:TC-5.2a`. |
| TC-5.2b | SATISFIED | `process-live.test.ts:TC-5.2b`. |
| TC-5.3a | SATISFIED | `process-actions-api.test.ts:TC-5.3a`. |
| TC-5.3b | SATISFIED | `process-actions-api.test.ts:TC-5.3b`. |
| TC-5.4a | SATISFIED | `process-work-surface.test.ts:313` (integration). |
| TC-5.4b | SATISFIED | `process-work-surface.test.ts:451` (integration). |
| TC-5.5a | SATISFIED | `process-actions-api.test.ts:TC-5.5a`; `process-work-surface-page.test.ts:TC-5.5a`. |
| TC-5.5b | SATISFIED | Same files; rebuild guidance. |
| TC-6.1a | SATISFIED | `process-work-surface.test.ts:TC-6.1a`. |
| TC-6.2a | SATISFIED | `process-work-surface.test.ts:TC-6.2a`. |
| TC-6.3a | SATISFIED | `process-live-updates.test.ts:TC-6.3a`; `process-live-status.test.ts:TC-6.3a`. |
| TC-6.4a | SATISFIED | `process-work-surface.test.ts:TC-6.4a`. |
| TC-6.4b | SATISFIED | `process-work-surface.test.ts:TC-6.4b`. |

**TC coverage:** 57 spec TCs identified, 57 SATISFIED.

## Structural checks

### Production runtime does NOT default to stubs

`apps/platform/server/app.ts:145-154` constructs the provider registry
without a test fake by default:

```ts
const providerAdapterRegistry: ProviderAdapterRegistry =
  options.providerAdapterRegistry ??
  (options.providerAdapter !== undefined
    ? new SingleAdapterRegistry(options.providerAdapter)
    : new DefaultProviderAdapterRegistry([
        new LocalProviderAdapter(platformStore, {
          workspaceRoot: env.LOCAL_PROVIDER_WORKSPACE_ROOT ?? undefined,
        }),
        new DaytonaProviderAdapter(),
      ]));
```

Code writer at `:164-165`:

```ts
const codeCheckpointWriter =
  options.codeCheckpointWriter ?? new OctokitCodeCheckpointWriter({ token: env.GITHUB_TOKEN });
```

`OctokitCodeCheckpointWriter` constructor at
`code-checkpoint-writer.ts:137-145` throws immediately when the token
is empty, matching the addendum's "fail loud" rule.

**Status:** SATISFIED.

### `ExecutionResult` matches the 6-field spec

`apps/platform/server/services/processes/environment/provider-adapter.ts:120-127`:

```ts
export interface ExecutionResult {
  processStatus: ProcessExecutionStatus;
  processHistoryItems: ProcessHistoryItem[];
  outputWrites: PlatformProcessOutputWriteInput[];
  sideWorkWrites: PlatformSideWorkWriteInput[];
  artifactCheckpointCandidates: ArtifactCheckpointCandidate[];
  codeCheckpointCandidates: CodeCheckpointCandidate[];
}
```

`ProcessExecutionStatus` at `:118` has the 5 spec values: `'running' |
'waiting' | 'completed' | 'failed' | 'interrupted'`.

**Status:** SATISFIED. All 6 fields match spec at
`tech-design-server.md:564-571`.

### `EnvironmentProviderAdapter` method set

`provider-adapter.ts:129-147` declares:

- `providerKind` (property)
- `ensureEnvironment`
- `hydrateEnvironment`
- `executeScript`
- `rehydrateEnvironment`
- `rebuildEnvironment`
- `teardownEnvironment`

That is 6 methods + 1 property, matching the refined contract at
`tech-design-server.md:573-591`. The index-level sketch at
`tech-design.md:213-222` listed 7 methods including a now-removed
`collectCheckpointCandidate`; that responsibility moved into
`ExecutionResult.{artifact,code}CheckpointCandidates` + the
`CheckpointPlanner` in the refined server tech design. Impl follows the
refined server spec.

**Status:** SATISFIED (against refined server spec). Flagged as a
minor, nonblocking doc-vs-refined-spec divergence only.

### `sourceAttachments.accessMode` is durable and typed

`convex/sourceAttachments.ts:15`:

```ts
accessMode: v.union(v.literal('read_only'), v.literal('read_write')),
```

Projection exposes it at `:56`. Typed context (`QueryCtx`) used at
`:36` — no `ctx: any` or `queryGeneric` residue (Item 11 from addendum
is closed).

**Status:** SATISFIED.

### `workingSetFingerprint` is computed, not null

`convex/processEnvironmentStates.ts:193-228` implements
`computeFingerprintHex`. `:234-292` implements
`computeWorkingSetFingerprint` which reads artifacts, outputs, sources,
and providerKind from the DB and applies the spec-mandated stable JSON
+ SHA-256 shape.

Call sites that write the fingerprint:

- `upsertProcessEnvironmentState` handler (`:483-490`): computes after
  the env state is in its final shape and patches
  `workingSetFingerprint`.
- `setProcessHydrationPlan` handler (`:578-585`): same pattern.

Read-time stale projection at `:382-386`:

```ts
if (state.state === 'ready' && state.workingSetFingerprint !== null) {
  const currentFingerprint = await computeWorkingSetFingerprint(ctx, processRecord._id);
  if (currentFingerprint !== state.workingSetFingerprint) {
    return buildEnvironmentSummary(state, { stateOverride: 'stale' });
  }
}
```

Convex test at `convex/processEnvironmentStates.test.ts:467` asserts
"writes the fingerprint on every env state mutation" and `:484` asserts
"projects state as stale at read time when stored fingerprint diverges
from current canonical".

**Status:** SATISFIED.

### Fire-and-forget surfaces failures as visible env state

`process-environment.service.ts:73-83` (`runHydrationAsync`):

```ts
runHydrationAsync(args: { projectId: string; processId: string }): void {
  void this.executeHydration(args).catch((error: unknown) => {
    this.handleAsyncFailure({
      projectId: args.projectId,
      processId: args.processId,
      environmentId: null,
      contextLabel: 'hydration',
      error,
    });
  });
}
```

Same pattern for `runRehydrateAsync` (`:232-247`),
`runRebuildAsync` (`:249-264`), `runExecutionAsync` (`:457-486`), and
`runCheckpointAsync` (`:684-712`). All routes land in
`handleAsyncFailure` (`:1161-1214`), which upserts env state to
`'failed'` with a meaningful `blockedReason` and publishes the failed
env upsert. A secondary `try/catch` at `:1202-1212` structured-logs when
the failure-state upsert itself fails, so no rejection escapes the
fire-and-forget path.

Tests: `tests/service/server/process-environment-fire-and-forget.test.ts`
(481 lines) covers hydration, rehydrate, rebuild, and execution
fire-and-forget failure paths.

**Status:** SATISFIED. Item 8 from addendum (silent `.catch(() => {})`)
is genuinely closed.

### Client renders `process.controls`, not `availableActions`

`apps/platform/client/features/processes/process-controls.ts:19`:

```ts
for (const control of args.controls) { ... }
```

The render function iterates the full `controls` array and renders all
7 buttons with `button.disabled = !control.enabled;` plus a disabled
reason paragraph. The page at `process-work-surface-page.ts` passes
`process.controls` into `renderProcessControls`. Nothing in the client
renders from `availableActions` for the visible control area.

**Status:** SATISFIED.

### Real Octokit writer on production path; `GITHUB_TOKEN` required

`app.ts:164-165` wires `OctokitCodeCheckpointWriter` as the production
default. `code-checkpoint-writer.ts:137-145`:

```ts
constructor(options: OctokitCodeCheckpointWriterOptions) {
  if (typeof options.token !== 'string' || options.token.length === 0) {
    throw new Error(
      'OctokitCodeCheckpointWriter requires a non-empty `token` (set the `GITHUB_TOKEN` env var).',
    );
  }
  this.client =
    options.client ?? (new Octokit({ auth: options.token }) as unknown as OctokitClient);
}
```

`config.ts:38` defines `GITHUB_TOKEN: z.string().min(1)` — required
by Zod parsing. No silent fallback. Stubs
(`StubCodeCheckpointWriter`, `FailingCodeCheckpointWriter`) exist as
test seams but are only used when tests inject
`options.codeCheckpointWriter`.

**Status:** SATISFIED.

### InMemoryPlatformStore vs ConvexPlatformStore divergence

`hasCanonicalRecoveryMaterials` matches now:

- Convex (`platform-store.ts:1122-1133`): checks
  `refs.artifactIds.length > 0 || refs.sourceAttachmentIds.length > 0 ||
  outputs.length > 0`.
- InMemory (`:1826-1834`): same check.

Item 9 from the addendum is closed.

`NullPlatformStore.hasCanonicalRecoveryMaterials` (`:838-840`) returns
`true` — that is a null-object-pattern choice and is fine for the
no-Convex development path.

One real divergence remains: fingerprint computation and stale
projection exist only in the Convex code. `InMemoryPlatformStore` does
not compute fingerprints. This is intentional per the addendum's
storage-strategy decision — the durable fingerprint lives in Convex.
The Convex-backed behavior is verified by direct Convex tests
(`convex/processEnvironmentStates.test.ts:467, :484`). The integration
tests use `InMemoryPlatformStore`, so they cannot exercise the stale
projection end-to-end. This is a scope observation, not a blocker —
the Convex-only behavior is unit-tested at the right seam.

## Anti-pattern check (Zod defaults on required fields)

`apps/platform/shared/contracts/process-work-surface.ts`:

- Line 164: `processSurfaceControlStateSchema.disabledReason:
  z.string().min(1).nullable().default(null)` — nullable optional; the
  `null` default is consistent with "non-empty when present".
- Line 217: `lastCheckpointResultSchema.targetRef: ...default(null)` —
  nullable optional per spec; OK.
- Line 219: `lastCheckpointResultSchema.failureReason: ...default(null)` —
  nullable optional per spec; OK.
- Line 234: `environmentSummarySchema.environmentId:
  ...default(defaultEnvironmentSummary.environmentId)` — nullable; OK.
- Line 237: `...blockedReason: ...default(...)` — nullable; OK.
- Line 238: `...lastHydratedAt: ...default(...)` — nullable; OK.
- Line 243: `...lastCheckpointAt: ...default(...)` — nullable; OK.
- Line 246: `...lastCheckpointResult:
  lastCheckpointResultSchema.nullable().default(...)` — **REQUIRED per
  spec (epic.md:589) but nullable.** Default masks a missing server
  field. Addendum flags this as nonblocking.
- Line 258: `processSurfaceSummarySchema.controls:
  z.array(...).default(defaultProcessSurfaceControls)` — **REQUIRED per
  spec (epic.md:620).** Default is a pre-built empty-disabled control
  set. Masks a missing server field. Addendum flags this as
  nonblocking.
- Line 259: `processSurfaceSummarySchema.hasEnvironment:
  z.boolean().default(false)` — **REQUIRED per spec (epic.md:621).**
  Default masks a missing server field. Addendum flags this as
  nonblocking.
- Line 328: `processSourceReferenceSchema.accessMode:
  sourceAccessModeSchema.default('read_only')` — **REQUIRED per spec
  (epic.md:634).** Default is a safe `read_only` choice but still
  masks a missing server field. Addendum flags this as nonblocking.
- Line 414, 422 (start/resume response): `currentRequest:
  currentProcessRequestSchema.nullable().default(null)` — nullable; OK.

`apps/platform/shared/contracts/schemas.ts:158` — mirror of
`accessMode: sourceAccessModeSchema.default('read_only')` in the schema
index file; same concern.

`apps/platform/shared/contracts/state.ts:106` —
`environment: environmentSummarySchema.nullable().default(null)` on
the client-side `ProcessSurfaceState`. Fine (client slice; nullable).

Net: 4 required-with-default anti-patterns persist
(`lastCheckpointResult`, `controls`, `hasEnvironment`, `accessMode`),
all explicitly documented as nonblocking cleanup items in the
Implementation Addendum (lines 52-57). They do not affect Epic 3
behavior because the server writes them correctly; the defaults only
matter if the server contract were ever to omit these fields, which
it does not on any audited code path.

## Boundary inventory (intentional stubs)

Items remaining as explicit boundary seams:

1. **`DaytonaProviderAdapter`** —
   `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts`.
   Every method throws `AppError` with `code='NOT_IMPLEMENTED'` and
   `statusCode=503`. Reason: Daytona auth/SDK research remains
   research-gated per Implementation Addendum "Explicitly out of scope
   (still)". Registry can still resolve `providerKind: 'daytona'` to a
   type-checked adapter. Unit test coverage at
   `tests/service/server/daytona-provider-adapter.test.ts`.

2. **`InMemoryProviderAdapter`** (provider-adapter.ts:155-247),
   **`FailingProviderAdapter`** (`:254-306`),
   **`StubCodeCheckpointWriter`** (code-checkpoint-writer.ts:35-53),
   **`FailingCodeCheckpointWriter`** (`:59-80`) — test seams only.
   None are wired as production defaults. Both fake adapter classes
   produce the spec-shaped `ExecutionResult`, which keeps the test seam
   honest.

3. **Client-side `deriveEnvironmentStatusLabel` call in
   `process-live.ts:86`** — used only when the client synthesizes a new
   environment-summary object after a `process` waiting transition
   that has no accompanying server env message (`:159-161`). For
   server-supplied payloads the client trusts `environment.statusLabel`
   wholesale (Item 10 fix landed in `process-environment-panel.ts:25`).

4. **Orchestrator `fingerprint: ''` in
   `process-environment.service.ts:1311-1312`** — the
   `buildAdapterHydrationPlan` result passes an empty fingerprint to
   the adapter. The adapter echoes it back in `HydrationResult`, but
   the durable fingerprint used by stale detection is computed in
   Convex on the env state mutation, not read back from the adapter.
   The comment at `:1306-1310` explicitly describes this interim
   state.

5. **E2E Playwright suite** — scaffolded at
   `tests/e2e/process-environment-and-execution.spec.ts` but not
   executable per addendum. Not blocking acceptance.

Each of these is explicitly scoped as deferred in the Implementation
Addendum's "Explicitly out of scope (still)" section.

## Blocking findings

**None.**

## Nonblocking findings

### NB-1 — Zod `.default(null)` on required `lastCheckpointResult`

- **Severity:** minor
- **AC:** AC-4.4 / AC-6.1 (contract hygiene only; no behavioral impact
  observed)
- **File:** `apps/platform/shared/contracts/process-work-surface.ts:244-246`
- **Evidence:** `lastCheckpointResult: lastCheckpointResultSchema.nullable().default(defaultEnvironmentSummary.lastCheckpointResult)`
- **Spec:** `epic.md:589` — `lastCheckpointResult | Last Checkpoint
  Result or null | yes`. Required.
- **Closure:** drop `.default(null)`; require the server to always
  include the field (even as `null`).

### NB-2 — Zod `.default(defaultProcessSurfaceControls)` on required `controls`

- **Severity:** minor
- **AC:** AC-1.2
- **File:** `process-work-surface.ts:258`
- **Evidence:** `controls: z.array(...).default(defaultProcessSurfaceControls)`
- **Spec:** `epic.md:620` — required.
- **Closure:** drop `.default()`; server always emits `controls`.

### NB-3 — Zod `.default(false)` on required `hasEnvironment`

- **Severity:** minor
- **AC:** AC-1.4
- **File:** `process-work-surface.ts:259`
- **Evidence:** `hasEnvironment: z.boolean().default(false)`
- **Spec:** `epic.md:621` — required.
- **Closure:** drop `.default(false)`.

### NB-4 — Zod `.default('read_only')` on required `accessMode`

- **Severity:** minor
- **AC:** AC-2.5 / AC-4.3
- **File:** `process-work-surface.ts:328`; mirrored in
  `shared/contracts/schemas.ts:158`
- **Evidence:** `accessMode: sourceAccessModeSchema.default('read_only')`
- **Spec:** `epic.md:634` — required.
- **Closure:** drop `.default('read_only')`. Note: this default is
  actually safe (read-only is the non-destructive default), but it
  still masks a missing server field.

### NB-5 — Index-doc `EnvironmentProviderAdapter` sketch has 7 methods; refined server spec has 6

- **Severity:** trivial documentation divergence
- **AC:** none (informational)
- **File:** `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md:213-222` (sketch) vs `tech-design-server.md:573-591` (refined) and impl at `provider-adapter.ts:129-147`
- **Evidence:** index-level sketch lists `collectCheckpointCandidate`; server-level refined spec and impl move that responsibility into `ExecutionResult.{artifact,code}CheckpointCandidates` + the `CheckpointPlanner` seam.
- **Closure:** tighten the index-level sketch to match the refined
  server spec when the index is next revised.

### NB-6 — Orchestrator passes `fingerprint: ''` to adapter

- **Severity:** minor
- **AC:** none (no behavioral impact; adapter echoes it back, not used
  for stale detection)
- **File:** `process-environment.service.ts:1311-1312`
- **Evidence:**

  ```ts
  return {
    fingerprint: '',
    artifactInputs: ...,
  ```

- **Spec:** `tech-design.md:329` — fingerprint is a first-class
  hydration input.
- **Closure:** propagate the stored durable fingerprint into the
  hydration plan (or drop the adapter-level field). Does not affect
  stale detection because the durable fingerprint lives in Convex and
  is recomputed on every env state mutation.

### NB-7 — Client-side `normalizeEnvironmentState` recomputes `statusLabel`

- **Severity:** trivial
- **AC:** AC-1.1 (server-sourced labels are trusted)
- **File:** `apps/platform/client/app/process-live.ts:79-88, 159-161`
- **Evidence:** `normalizeEnvironmentState` constructs a client-side
  env summary on a process-to-waiting transition that has no
  accompanying server env message; it sets
  `statusLabel: deriveEnvironmentStatusLabel(state)`.
- **Spec:** Item 10 fix was specifically about
  `process-environment-panel.ts:28` trusting the server — that is done
  (`:25` uses `args.environment.statusLabel` directly).
- **Closure:** if the server started sending a paired env update on
  waiting, this synthesis path would become dead code; drop or reduce
  it then.

### NB-8 — Integration tests use `InMemoryPlatformStore`

- **Severity:** trivial (scope observation, not a defect)
- **AC:** AC-5.1, AC-6.1 (stale projection)
- **File:** `tests/integration/process-work-surface.test.ts:55-67`
- **Evidence:** `startApp(store: InMemoryPlatformStore)`.
- **Spec:** n/a.
- **Closure:** the Convex-only stale projection and fingerprint compute
  are tested at the right seam (`convex/processEnvironmentStates.test.ts:467,
  :484`). If future work wanted end-to-end integration coverage of
  stale projection, it would require a real Convex harness. Not
  required for Epic 3 acceptance.

## SHIP/REVISE/BLOCK rationale

This is a SHIP. Every AC and TC is SATISFIED with real production-path
evidence. The gate runs clean. The three fix-batch chunks actually
replaced production stubs with real implementations:

- Chunk 1 added real durable persistence (artifact storage in Convex
  File Storage, `accessMode` field, fingerprint compute, matching
  `hasCanonicalRecoveryMaterials` between stores, typed Convex
  functions).
- Chunk 2 added the real `LocalProviderAdapter` + typed Daytona
  skeleton, extended `ExecutionResult` to the 6-field spec shape, and
  routed fire-and-forget errors through a visible-failure handler
  instead of silent `.catch(() => {})`.
- Chunk 3 added the real `OctokitCodeCheckpointWriter` (throws loud on
  empty token, no silent stub fallback), fixed client
  `statusLabel` trust (Item 10), strengthened candidate validation, and
  walked back four anti-pattern defaults on the environment response
  contract (though four more remain, explicitly acknowledged as
  nonblocking cleanup).

The 8 nonblocking findings are clerical — Zod default hygiene, a
doc-only interface-sketch divergence, an interim empty-string
fingerprint passed through the orchestrator that doesn't affect
stale detection, one client-side helper kept for synthesized
transitions, and an observation about integration tests using the
InMemory seam. None of them prevent the production code path from
behaving as spec'd. None of them imply that tests only pass against
fakes — every AC/TC has real code-path evidence or the right-seam
Convex coverage.

The addendum's acceptance criteria — synthesis SHIP + manual
checklist clean — is the remaining gate beyond this review. For the
code+tests+production-wiring verification that this reviewer owns, the
answer is SHIP.

---

## Appendix A: evidence file:line index

### Production wiring

- `apps/platform/server/app.ts:100-177` — `createApp` builds real
  adapter registry and Octokit writer.
- `apps/platform/server/config.ts:27` — `DEFAULT_ENVIRONMENT_PROVIDER_KIND`
  Zod default = `'daytona'`.
- `apps/platform/server/config.ts:38` — `GITHUB_TOKEN: z.string().min(1)`.

### Provider adapters

- `provider-adapter.ts:120-127` — `ExecutionResult` 6 fields.
- `provider-adapter.ts:129-147` — `ProviderAdapter` interface.
- `local-provider-adapter.ts:109-320` — real `LocalProviderAdapter`
  implementation.
- `local-provider-adapter.ts:418-446` — `validateCodeCheckpointCandidates`
  rejects candidates missing `filePath`/`commitMessage`.
- `local-provider-adapter.ts:448-529` — `validateCandidateRefs`
  restricts refs to the working tree.
- `daytona-provider-adapter.ts:31-67` — typed skeleton throwing
  `NOT_IMPLEMENTED`.

### Code checkpoint writer

- `code-checkpoint-writer.ts:14-28` — `CodeCheckpointWriter` interface.
- `code-checkpoint-writer.ts:134-248` — real `OctokitCodeCheckpointWriter`.
- `code-checkpoint-writer.ts:137-145` — constructor fails loud on empty
  token.
- `code-checkpoint-writer.ts:282-309` — `describeOctokitError` maps 401,
  403, 404, 409, 422, and other statuses to actionable messages.
- `code-checkpoint-writer.ts:250-266` — `parseGitHubRepository` rejects
  malformed URLs.

### Durable state

- `convex/schema.ts:43-45` — `processEnvironmentStates` table with
  indexes.
- `convex/processEnvironmentStates.ts:49-62` — table fields including
  `workingSetFingerprint` and `workingSetPlan`.
- `convex/processEnvironmentStates.ts:193-228` — `computeFingerprintHex`.
- `convex/processEnvironmentStates.ts:234-292` —
  `computeWorkingSetFingerprint`.
- `convex/processEnvironmentStates.ts:382-386` — read-time stale
  projection.
- `convex/processEnvironmentStates.ts:419-501` —
  `upsertProcessEnvironmentState` (with fingerprint write at 483-490).
- `convex/processEnvironmentStates.ts:529-593` —
  `setProcessHydrationPlan` (with fingerprint write at 578-585).
- `convex/processEnvironmentStates.ts:341-350` —
  `maintainProcessHasEnvironment` keeps `processes.hasEnvironment`
  aligned.
- `convex/sourceAttachments.ts:15` — `accessMode` field.
- `convex/sourceAttachments.ts:36` — typed `QueryCtx` (no `any`).
- `convex/artifacts.ts:19-26` — `contentStorageId` field.
- `convex/artifacts.ts:89-142` — `persistCheckpointArtifacts`
  `internalAction` with rollback.
- `convex/artifacts.ts:164-213` — `recordCheckpointArtifactsInternal`.
- `convex/artifacts.ts:248-272` — `fetchArtifactContent`
  `internalAction`.
- `convex/artifacts.ts:220-235` — `deleteArtifactWithContent` deletes
  row + blob together.

### Environment service

- `process-environment.service.ts:46-60` — constructor.
- `:73-83` — `runHydrationAsync` with catch → handleAsyncFailure.
- `:109-161` — `rehydrate`.
- `:163-230` — `rebuild`.
- `:232-264` — recovery runners with catch.
- `:266-358` — `executeHydration`.
- `:457-486` — `runExecutionAsync` with setTimeout + catch.
- `:488-649` — `executeExecution`.
- `:684-712` — `runCheckpointAsync`.
- `:714-987` — `executeCheckpoint` (handles artifact success, code
  success, read-only skip, mixed, and top-level catch).
- `:1075-1101` — `publishEnvironmentUpsert`.
- `:1121-1214` — `handleAsyncFailure` + `transitionToFailed`.
- `:1421-1456` — `assertRehydrateAvailable`.
- `:1458-1477` — `assertRebuildAvailable`.
- `:1490-1507` — `buildCheckpointResult`.
- `:1548-1561` — `extractExecutionFailureReason`.

### Contracts

- `apps/platform/shared/contracts/process-work-surface.ts:161-166` —
  `processSurfaceControlStateSchema`.
- `:169-177` — `processSurfaceControlOrder`.
- `:189-210` — `buildProcessSurfaceControls`.
- `:212-221` — `lastCheckpointResultSchema`.
- `:233-248` — `environmentSummarySchema`.
- `:250-262` — `processSurfaceSummarySchema`.
- `:324-337` — `processSourceReferenceSchema` (with repositoryUrl).

### Client

- `apps/platform/client/features/processes/process-controls.ts:1-49` —
  control renderer iterates `controls` array.
- `apps/platform/client/features/processes/process-environment-panel.ts:25` —
  trusts server `statusLabel`.
- `apps/platform/client/app/process-live.ts:79-111` — env reconciliation
  with checkpoint context preservation.
- `apps/platform/client/app/process-live.ts:181-184` — `environment`
  entity branch of the live reducer.

### Tests

- `tests/service/server/process-work-surface-api.test.ts` — bootstrap
  contract.
- `tests/service/server/process-actions-api.test.ts` — accept/reject
  boundary for all four actions, hydration plan assertions, checkpoint
  planner assertions.
- `tests/service/server/process-live-updates.test.ts` — live entity
  publication.
- `tests/service/server/process-environment-fire-and-forget.test.ts` —
  481 lines covering hydration/rehydrate/rebuild/execution fire-and-forget
  failures.
- `tests/service/server/local-provider-adapter.test.ts` — 648 lines for
  the local adapter.
- `tests/service/server/octokit-code-checkpoint-writer.test.ts` — 256
  lines for the writer.
- `tests/service/server/daytona-provider-adapter.test.ts` — 71 lines
  asserting `NOT_IMPLEMENTED` for every method.
- `tests/service/server/script-execution.service.test.ts` — payload
  contract + tool-harness boundary.
- `tests/service/server/platform-store-recovery-materials.test.ts` —
  `hasCanonicalRecoveryMaterials` parity tests.
- `tests/service/server/convex-platform-store-admin-auth.test.ts` —
  admin-auth wiring for internal Convex calls.
- `tests/service/client/process-controls.test.ts` — 11+ TC coverage
  for control matrix.
- `tests/service/client/process-environment-panel.test.ts` —
  checkpoint-result rendering.
- `tests/service/client/process-materials-section.test.ts` —
  accessMode rendering.
- `tests/service/client/process-work-surface-page.test.ts` —
  page-level coverage for bootstrap, actions, same-session updates.
- `tests/service/client/process-live.test.ts` — client reducer.
- `tests/integration/process-work-surface.test.ts` — reopen, recovery,
  no-duplication.
- `convex/processEnvironmentStates.test.ts` — fingerprint compute +
  stale projection (especially `:467`, `:484`).
- `convex/sourceAttachments.test.ts` — accessMode durable projection.
- `convex/artifacts.test.ts` — File Storage round-trip + rollback.

## Appendix B: quick confidence pointers for each chunk's closure

### Chunk 1 (Items 4, 5, 6, 9, 11, 13)

- Item 4 (artifact content discarded): closed by
  `contentStorageId: v.id('_storage')` at `artifacts.ts:24` + real
  internal action at `:89-142`.
- Item 5 (`accessMode` missing): closed at `sourceAttachments.ts:15`.
- Item 6 (fingerprint always null): closed at
  `processEnvironmentStates.ts:193-228, 483-490, 578-585`.
- Item 9 (`hasCanonicalRecoveryMaterials` divergence): closed at
  `platform-store.ts:1122-1133` vs `:1826-1834`.
- Item 11 (typed Convex compliance): closed — `sourceAttachments.ts:36`
  uses `QueryCtx`, not `ctx: any`.
- Item 13 (`hasEnvironment` never true): closed at
  `processEnvironmentStates.ts:341-350` + `:492`.

### Chunk 2 (Items 1, 2, 7, 8, 12)

- Item 1 (InMemory wired in prod): closed at `app.ts:149-154`.
- Item 2 (no real adapter files): closed — both
  `local-provider-adapter.ts` and `daytona-provider-adapter.ts` exist.
- Item 7 (`ExecutionResult` only 3 fields): closed at
  `provider-adapter.ts:120-127`.
- Item 8 (fire-and-forget silent swallow): closed at
  `process-environment.service.ts:73-83, 232-264, 457-486, 684-712,
  1161-1214`.
- Item 12 (default provider kind was local): closed at `config.ts:27`.

### Chunk 3 (Items 3, 10, 14)

- Item 3 (stub writer wired in prod): closed at `app.ts:164-165` +
  `code-checkpoint-writer.ts:134-248`.
- Item 10 (client recomputes statusLabel): closed at
  `process-environment-panel.ts:25`.
- Item 14 (tautological foundation test): confirmed replaced — the
  fixture now imports a frozen constant rather than self-referencing
  `processSurfaceControlOrder`.

All 14 addendum items verified closed.

## Final verdict

**SHIP.** 0 blocking findings, 8 nonblocking (clerical). Gate passes
clean at HEAD `43c23df`. Production wiring uses real adapters and the
real Octokit writer. The Convex-backed fingerprint compute + stale
projection are real. Fire-and-forget paths surface failures as visible
env state. Clients render from `process.controls`.
