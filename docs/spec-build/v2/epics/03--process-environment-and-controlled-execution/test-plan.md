# Test Plan: Process Environment and Controlled Execution

## Purpose

This document maps every Epic 3 test condition to a planned test file and test
approach. It follows the same service-mock philosophy established in the earlier
epics:

- test Fastify routes, action entry points, and websocket publication at the
  server boundary
- test client pages, controls, environment rendering, materials rendering, and
  live reconciliation at their public entry points
- mock only external boundaries

The confidence chain for Epic 3 remains:

```text
AC → TC → Test File / Test Name → Implementation Module
```

Epic 3 adds one extra testing rule beyond Epic 2: environment lifecycle,
checkpoint visibility, and control-state semantics must remain coherent across
durable bootstrap and live updates. That means the test plan has to cover both
request/response entry points and the current-object live update path.

## Verification Tiers

| Script | Command | Notes |
|--------|---------|-------|
| `red-verify` | `corepack pnpm run red-verify` | Red exit gate excludes tests by design; Red tests are expected to error while stubs throw |
| `test:convex` | `corepack pnpm exec vitest run convex --environment node` | Direct Convex function service-mock tests |
| `test:service` | `corepack pnpm exec vitest run tests/service/server --environment node` | Fastify route and service-mock tests |
| `test:client` | `corepack pnpm exec vitest run tests/service/client --environment jsdom` | Client route/page/component/live tests |
| `verify` | `corepack pnpm run verify` | Main development gate |
| `green-verify` | `corepack pnpm run green-verify` | Green exit gate |
| `verify-all` | `corepack pnpm run verify-all` | Deep verification; `test:e2e` remains an explicit `SKIP:` until implemented |

## Test Layers

### Convex Function Service Mocks

Primary confidence layer for new Epic 3 durability logic.

- `convex/processEnvironmentStates.test.ts`
- `convex/sourceAttachments.test.ts`

### Server Service Mocks

Fastify and websocket entry-point tests with mocked external boundaries.

- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-live-updates.test.ts`

### Client Service Mocks

Route/page/component/live tests with mocked browser API and websocket
boundaries.

- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/client/process-controls.test.ts`
- `tests/service/client/process-environment-panel.test.ts`
- `tests/service/client/process-materials-section.test.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-live-status.test.ts`

### Wide Integration Tests

Small number of deeper tests against the assembled app and durable state path.

- `tests/integration/process-work-surface.test.ts`

### E2E

Planned but not required for the first TDD cycles.

- `tests/e2e/process-environment-and-execution.spec.ts`

## Mock Boundaries

| Layer | Mock? | Notes |
|-------|-------|-------|
| WorkOS SDK and session validation | Yes | External auth boundary |
| Provider adapters (`DaytonaProvider`, `LocalProvider`) in route/service tests | Yes | External environment boundary |
| GitHub write boundary / code checkpoint writer | Yes | External canonical-code boundary |
| Browser `fetch` and browser `WebSocket` | Yes | HTTP and live transport boundaries for client tests |
| Fastify routes / services / readers / planners / live normalizer | No | These are the server behavior under test |
| Client router / store / page / control / environment panel / live applier | No | These are the client behavior under test |
| Convex functions under direct `convex/*.test.ts` | No | Test the Convex function directly, not wrapper helpers |

## Fixture Strategy

### Shared Fixtures

`tests/fixtures/process-environment.ts`

- environment summary fixtures for:
  - `absent`
  - `preparing`
  - `rehydrating`
  - `ready`
  - `running`
  - `checkpointing`
  - `stale`
  - `failed`
  - `lost`
  - `rebuilding`
  - `unavailable`
- environment summaries with and without `blockedReason`
- environment summaries with and without `lastCheckpointResult`

`tests/fixtures/process-controls.ts`

- full control set fixture in stable order
- enabled/disabled control fixtures per environment-state matrix
- disabled reason fixtures for process-blocked and environment-blocked actions

`tests/fixtures/checkpoint-results.ts`

- artifact success with project artifact id, artifact version id/label, and version provenance
  - Epic 3 fixture field name remains `versionProvenanceProcessId`; this is the same producing-process identity Epic 5 names `producedByProcessId`
- code success
- mixed success
- artifact failure with artifact target metadata when available
- code failure
- latest-only overwrite fixtures

`tests/fixtures/materials.ts`

- current sources with `read_only`
- current sources with `read_write`
- mixed writable/read-only source set
- current artifact references with version ids plus outputs used for hydration planning

`tests/fixtures/live-process.ts`

- `environment` snapshot message
- `environment` upsert to `preparing`
- `environment` upsert to `rehydrating`
- `environment` upsert to `ready`
- `environment` upsert to `running`
- `environment` upsert to `checkpointing`
- `environment` upsert with failed checkpoint result
- disconnect / reconnect live-state fixtures

### Test Utilities

`tests/utils/build-app.ts`

- extend the Fastify test builder with environment services, provider-adapter
  stubs, and process route wiring

`tests/utils/render-shell.ts`

- extend the client render helper to mount the process-surface page with
  environment summary, controls, mocked HTTP APIs, and mocked websocket updates

`tests/utils/fake-provider-adapter.ts`

- fake hosted Daytona adapter
- fake local adapter
- helper methods to return preparation, execution, checkpoint, and recovery
  results

## Test File Inventory

| Test File | Layer | Primary Focus | Planned Tests |
|-----------|-------|---------------|---------------|
| `convex/processEnvironmentStates.test.ts` | Convex | durable environment state transitions, latest checkpoint result persistence, latest-only overwrite behavior | 5 |
| `convex/sourceAttachments.test.ts` | Convex | durable `accessMode` support and projection safety | 3 |
| `tests/service/server/process-work-surface-api.test.ts` | Service | bootstrap contract, environment summary shape, section stability | 13 |
| `tests/service/server/process-actions-api.test.ts` | Service | start/resume/rehydrate/rebuild acceptance rules, hydration plan selection, checkpoint planning guards | 10 |
| `tests/service/server/script-execution.service.test.ts` | Service | executor payload contract and process-scoped tool-harness boundary | 2 |
| `tests/service/server/process-live-updates.test.ts` | Service | `environment` entity publication, typed upsert semantics, checkpoint-result live visibility | 7 |
| `tests/service/client/process-work-surface-page.test.ts` | Service | page-level bootstrap, action orchestration, immediate rejection handling, durable render coherence | 13 |
| `tests/service/client/process-controls.test.ts` | Service | stable visible controls, matrix state coverage, disabled reasons | 15 |
| `tests/service/client/process-environment-panel.test.ts` | Service | environment summary rendering, checkpoint visibility, recovery-state presentation | 10 |
| `tests/service/client/process-materials-section.test.ts` | Service | source `accessMode` rendering and no-misleading-checkpoint-path presentation | 4 |
| `tests/service/client/process-live.test.ts` | Service | live `environment` reconciliation, accepted-action vs later-failure behavior, current-object updates | 12 |
| `tests/service/client/process-live-status.test.ts` | Service | live unavailable / reconnect UI | 2 |
| `tests/integration/process-work-surface.test.ts` | Integration | reopen, durable environment summary, latest checkpoint visibility, no-duplication guarantees | 9 |

**Planned total:** 105 tests  
**TC conditions covered:** 58  
**Non-TC decided tests:** 36

Some TC conditions are intentionally asserted at more than one layer:

- server tests verify contract shape and publication behavior
- client tests verify the same behavior renders correctly for the user

## TC → Test Mapping

### `tests/service/client/process-controls.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1c | `TC-1.1c preparing state renders preparing label and disables recovery controls` | Bootstrap with `environment.state = preparing` and full control set | Mount controls | Preparing state shown; start/resume/rehydrate/rebuild/restart disabled |
| TC-1.1c.1 | `TC-1.1c.1 rehydrating state renders rehydrating label and disables recovery controls` | Bootstrap with `environment.state = rehydrating` and full control set | Mount controls | Rehydrating state shown; start/resume/rehydrate/rebuild/restart disabled |
| TC-1.1d | `TC-1.1d ready state renders ready label and keeps recovery controls disabled` | Bootstrap with `environment.state = ready` | Mount controls | Ready label shown; rehydrate/rebuild disabled |
| TC-1.1e | `TC-1.1e running state renders running label and disables recovery controls` | Bootstrap with `environment.state = running` | Mount controls | Running label shown; recovery controls disabled |
| TC-1.1f | `TC-1.1f checkpointing state renders checkpointing label and disables lifecycle controls` | Bootstrap with `environment.state = checkpointing` | Mount controls | Checkpointing label shown; start/resume/rehydrate/rebuild/restart disabled |
| TC-1.1g | `TC-1.1g stale state enables rehydrate and explains unavailable rebuild path` | Bootstrap with `environment.state = stale` | Mount controls | Rehydrate enabled; rebuild disabled with reason |
| TC-1.1h | `TC-1.1h lost state enables rebuild and explains disabled rehydrate path` | Bootstrap with `environment.state = lost` | Mount controls | Rebuild enabled; rehydrate disabled with reason |
| TC-1.1i | `TC-1.1i failed state shows only valid recovery actions` | Bootstrap with `environment.state = failed` | Mount controls | Start/resume disabled; valid recovery actions remain enabled |
| TC-1.1j | `TC-1.1j rebuilding state shows rebuilding label and disables lifecycle controls` | Bootstrap with `environment.state = rebuilding` | Mount controls | Rebuilding label shown; lifecycle controls disabled |
| TC-1.1k | `TC-1.1k unavailable state keeps controls visible and explains blocked environment actions` | Bootstrap with `environment.state = unavailable` | Mount controls | Controls remain visible; blocked actions explain unavailability |
| TC-1.2a | `TC-1.2a stable control set remains visible in a stable order` | Mixed enabled/disabled control set | Mount controls | All standard controls render in fixed order |
| TC-1.2b | `TC-1.2b disabled controls remain visible` | One or more controls disabled | Mount controls | Disabled controls remain rendered |
| TC-1.3a | `TC-1.3a disabled reason shown for blocked environment action` | Disabled `rehydrate` or `rebuild` with reason | Mount controls | Reason text visible |
| TC-1.3b | `TC-1.3b disabled reason shown for blocked process action` | Disabled `start`, `resume`, `respond`, `review`, or `restart` with reason | Mount controls | Reason text visible |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `control order remains stable when enabled states change across rerenders` | Guards against subtle layout churn not captured by one static TC |

### `tests/service/client/process-work-surface-page.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a environment state is visible on first load` | Bootstrap payload with populated `environment` | Mount page | Environment panel rendered on first paint |
| TC-1.1b | `TC-1.1b absent environment still renders a legible state` | Bootstrap payload with `environment.state = absent` | Mount page | Absent state visible, no broken layout |
| TC-1.5a | `TC-1.5a process remains visible without environment` | Bootstrap payload with absent or lost environment | Mount page | Process identity, materials, and process state remain visible |
| TC-2.1a | `TC-2.1a start enters preparation state in the same session` | Draft process with enabled `start`; accepted start response | Click `start` | Page updates to visible preparation state without reload |
| TC-2.1b | `TC-2.1b resume enters preparation state when environment work is needed` | Resumable process with enabled `resume`; accepted resume response | Click `resume` | Page updates to visible preparation state |
| TC-3.4a | `TC-3.4a execution failure leaves the page legible` | Existing rendered surface then failed environment update | Apply update | Core process sections remain visible with failure state |
| TC-5.2a | `TC-5.2a accepted rehydrate enters rehydrating in the same session` | Stale environment with enabled `rehydrate`; accepted rehydrate response | Click `rehydrate` | Page updates to `environment.state = rehydrating` without reload |
| TC-5.5a | `TC-5.5a rebuild blocked by missing canonical prerequisite shows immediate action rejection` | Rebuild request rejected with prerequisite error | Click `rebuild` | `actionError` visible, no false ready state |
| TC-5.5b | `TC-5.5b rehydrate blocked when rebuild is required shows immediate action rejection` | Rehydrate request rejected with recoverability error | Click `rehydrate` | `actionError` visible with rebuild guidance |
| TC-6.3a | `TC-6.3a durable surface remains usable when live updates fail` | Bootstrap success, websocket connection fails | Mount page | Process and environment remain readable |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `request-level action error clears after later successful action` | Keeps action error UX from becoming sticky noise |
| `rehydrate and rebuild do not collapse the page back to generic loading UI` | Guards against regressions in same-session continuity |
| `environment panel and controls render together without duplicate status text` | Layout coherence test for the new surface composition |

### `tests/service/client/process-environment-panel.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.2b | `TC-4.2b code checkpoint result is process-visible` | Environment summary with successful code checkpoint result | Mount panel | Source target and target ref visible |
| TC-4.4a | `TC-4.4a artifact checkpoint result is visible` | Environment summary with successful artifact checkpoint result | Mount panel | Artifact checkpoint success and artifact version details visible |
| TC-4.4b | `TC-4.4b code checkpoint result is visible` | Environment summary with successful code checkpoint result | Mount panel | Code checkpoint success visible |
| TC-4.5a | `TC-4.5a artifact checkpoint failure is shown` | Environment summary with failed artifact checkpoint result | Mount panel | Artifact failure visible with target metadata when available |
| TC-4.5b | `TC-4.5b code checkpoint failure is shown` | Environment summary with failed code checkpoint result | Mount panel | Code failure visible |
| TC-5.1a | `TC-5.1a stale environment is distinct` | `environment.state = stale` | Mount panel | Stale label visible |
| TC-5.1b | `TC-5.1b lost environment is distinct` | `environment.state = lost` | Mount panel | Lost label visible |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `renders lastHydratedAt and lastCheckpointAt when present` | Important environment diagnostics not represented as separate TCs |
| `renders no checkpoint result block when none has settled yet` | Guards latest-only checkpoint semantics |
| `renders blockedReason for unavailable or failed states` | Supports recovery understanding beyond action controls |

### `tests/service/client/process-materials-section.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.5a | `TC-2.5a writable source is identifiable` | Materials with `read_write` source | Mount section | Writable label visible |
| TC-2.5b | `TC-2.5b read-only source is identifiable` | Materials with `read_only` source | Mount section | Read-only label visible |
| TC-4.3a | `TC-4.3a read-only source does not present a code-checkpoint path` | Materials with read-only source and latest checkpoint result for other targets | Mount section | No misleading writable outcome implied for read-only source |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `mixed writable and read-only sources remain individually labeled` | Guards against label bleed across source rows |

### `tests/service/client/process-live.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|-------|
| TC-2.3a | `TC-2.3a hydration progress becomes visible through environment live updates` | Existing surface state + environment preparing update | Apply live message | Environment state becomes preparing |
| TC-2.3b | `TC-2.3b hydration failure becomes visible through environment live updates` | Accepted action state + failed environment update | Apply live message | Environment state becomes failed/unavailable |
| TC-2.4a | `TC-2.4a running begins after readiness` | Preparing state then ready/running upserts | Apply sequential messages | Running state appears only after readiness |
| TC-2.4b | `TC-2.4b running does not begin after failed preparation` | Preparing state then failed update | Apply live message | Running state never appears |
| TC-3.1a | `TC-3.1a running execution state is visible` | Running environment update | Apply live message | Environment state becomes running |
| TC-3.2a | `TC-3.2a execution activity is process-facing` | Process/history/environment upserts | Apply live messages | Store remains in coherent current-object state |
| TC-3.2b | `TC-3.2b browser does not reconstruct raw stream fragments` | Typed environment/process upserts only | Apply live messages | Store updates directly from current-object payloads |
| TC-3.3a | `TC-3.3a waiting is distinct from running` | Process waiting update plus non-running environment update | Apply live messages | Waiting shown without running state |
| TC-3.3b | `TC-3.3b checkpointing is distinct from running` | Environment checkpointing update | Apply live message | Checkpointing stored distinctly |
| TC-5.2b | `TC-5.2b rehydrate updates visible state in the same session` | Accepted rehydrate then ready/running environment update | Apply live messages | Page/store move from stale/rehydrating to ready/running |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `environment updates do not wipe unrelated history state` | Guards current-object entity isolation |
| `environment updates do not wipe unrelated materials state` | Same concern for materials envelope |

### `tests/service/client/process-live-status.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.3a | `TC-6.3a retry state is visible when live updates are unavailable` | Live error / reconnecting state | Mount status component | Status text and retry affordance visible |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `status component renders nothing when live state is healthy and idle noise would be distracting` | Keeps status UI minimal when no signal is needed |

### `tests/service/server/process-actions-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.2a | `TC-2.2a current materials hydrate into the environment` | Process with current artifact references and versions, outputs, and sources; provider stub | POST `start` or `resume` | Provider receives hydration plan built from current materials only |
| TC-2.2b | `TC-2.2b process with partial working set still hydrates correctly` | Process with only a subset of material categories | POST `start` or `resume` | Hydration plan omits absent categories and still accepts |
| TC-4.2a | `TC-4.2a writable source code checkpoint succeeds` | Successful execution with writable source candidate and GitHub writer stub | Trigger checkpoint path | Code checkpoint writer called for attached writable source |
| TC-5.2a | `TC-5.2a rehydrate refreshes stale working copy` | Recoverable stale environment | POST `rehydrate` | Accepted response returns `environment.state = rehydrating` and provider rehydrate path is called |
| TC-5.3a | `TC-5.3a rebuild replaces lost environment` | Lost environment state | POST `rebuild` | Provider rebuild path called and accepted |
| TC-5.3b | `TC-5.3b rebuild does not depend on prior working copy survival` | Missing environment handle but canonical inputs available | POST `rebuild` | Rebuild accepted without prior handle |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `start rejects immediately when environment lifecycle is unavailable before acceptance` | Verifies accepted-action boundary |
| `rehydrate rejects immediately when environment is not recoverable` | Same boundary for recovery actions |
| `rebuild rejects immediately when canonical prerequisites are missing` | Same boundary for rebuild |
| `checkpoint planner excludes read-only source candidates from code checkpoint work` | Server-side resolution of the write-not-allowed ambiguity |

### `tests/service/server/process-live-updates.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.2b | `TC-3.2b live publication emits typed current objects rather than raw fragments` | Provider/executor emits progress data | Publish/live flow | Browser-facing payload is typed current-object state |
| TC-4.1a | `TC-4.1a durable artifact output persists and latest result is published live` | Successful artifact checkpoint after execution | Publish/live flow | Environment live payload includes latest artifact checkpoint result with artifact target/version metadata |
| TC-4.5b | `TC-4.5b code checkpoint failure is shown through live environment state` | Failed code checkpoint after accepted action | Publish/live flow | Environment payload includes failed latest checkpoint result |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `websocket snapshot includes environment entity` | New live contract requirement |
| `environment upsert uses the same subscription and sequencing rules as other entities` | Guards contract consistency |
| `checkpoint visibility travels inside environment payload rather than a separate checkpoint entity` | Guards latest-only transport design |
| `live error for secondary entities does not erase the current environment summary` | Keeps degradation isolated |

### `tests/service/server/process-work-surface-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a bootstrap returns environment state on first load` | Accessible process with environment summary | GET bootstrap | Response includes `environment.state` |
| TC-1.1b | `TC-1.1b bootstrap returns explicit absent environment state` | Accessible process with absent environment summary | GET bootstrap | Response includes `environment.state = absent` |
| TC-1.5a | `TC-1.5a bootstrap keeps process identity and materials visible without environment` | Accessible process with absent or lost environment | GET bootstrap | Process and materials remain present |
| TC-2.5a | `TC-2.5a bootstrap returns writable source access mode` | Current sources include `read_write` attachment | GET bootstrap | Source projection includes `accessMode = read_write` |
| TC-2.5b | `TC-2.5b bootstrap returns read-only source access mode` | Current sources include `read_only` attachment | GET bootstrap | Source projection includes `accessMode = read_only` |
| TC-5.1a | `TC-5.1a bootstrap returns stale environment distinctly` | Durable environment state is stale | GET bootstrap | Response includes `environment.state = stale` |
| TC-5.1b | `TC-5.1b bootstrap returns lost environment distinctly` | Durable environment state is lost | GET bootstrap | Response includes `environment.state = lost` |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `bootstrap returns environment summary in the primary response contract` | Contract-critical even if client tests cover rendering |
| `bootstrap returns latest checkpoint result when one exists, including artifact version metadata for artifact checkpoints` | Contract-critical reopen shape |
| `bootstrap returns environment unavailable instead of failing the whole surface when environment data cannot be read` | Section-level degradation equivalent for the new environment slice |
| `bootstrap returns source accessMode in current source references` | Contract-critical materials extension |
| `bootstrap omits no core process data when environment is absent or lost` | Prevents environment state from eclipsing process truth |
| `bootstrap preserves latest-only checkpoint semantics and does not expose an ordered checkpoint list` | Guards scope discipline |

### `convex/processEnvironmentStates.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `upserts one environment row per process and resolves it by processId` | Core table behavior |
| `stores and overwrites lastCheckpointResult with latest-only semantics while preserving artifact version metadata` | Guards latest-result design |
| `marks lost environment without mutating process lifecycle state` | Preserves state separation |
| `stores workingSetFingerprint used for stale detection` | Supports rehydrate vs rebuild semantics |
| `stores blockedReason separately from process nextActionLabel` | Preserves environment/process state separation |

### `convex/sourceAttachments.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `source attachment summaries include accessMode in durable reads` | Required contract extension |
| `existing hydrationState and targetRef projection remain intact after accessMode addition` | Guards backward compatibility |
| `process-associated source rows keep process linkage while adding accessMode` | Guards summary context integrity |

### `tests/service/server/script-execution.service.test.ts`

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `executor receives TypeScript module source payload with explicit default entrypoint contract` | Makes the payload protocol executable instead of implicit |
| `executor receives only process-scoped tool API and cannot reach raw GitHub or Convex credentials` | Security boundary promised by the design should be testable |
| `rebuild tears down the prior environment when the provider requires explicit cleanup` | Keeps teardown behavior from remaining purely implicit |

### `tests/integration/process-work-surface.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.4a | `TC-1.4a reload preserves environment truth` | Seed process with environment summary, then mutate durable env state before reload | Reload route | Reloaded surface reflects durable environment truth |
| TC-4.1b | `TC-4.1b artifact output remains recoverable after reopen` | Successful artifact checkpoint | Reopen route | Latest checkpoint result and durable artifact version state visible |
| TC-5.4a | `TC-5.4a durable artifact state survives rebuild` | Checkpoint artifact success, then rebuild | Reopen after rebuild | Artifact version state remains visible |
| TC-5.4b | `TC-5.4b durable code persistence survives rebuild` | Successful writable-source checkpoint, then rebuild | Reopen after rebuild | Latest checkpoint result and durable source state remain visible |
| TC-6.1a | `TC-6.1a reopen restores durable state` | Prior environment work and latest checkpoint result | Reopen route | Surface restores latest durable state |
| TC-6.2a | `TC-6.2a durable work remains after environment absence` | Remove current environment after successful checkpoint | Reopen route | Durable result still visible |
| TC-6.4a | `TC-6.4a finalized history is not duplicated on reopen` | Settled environment/history events | Reopen route | No duplicate history rows |
| TC-6.4b | `TC-6.4b prior checkpoint result is not falsely restated as new work` | Successful checkpoint before reopen | Reopen route | Latest result shown as existing state only |

**Non-TC decided tests**

| Test Name | Reason |
|-----------|--------|
| `live disconnect banner clears after reconnect and fresh bootstrap` | Assembled reconnect behavior beyond unit store tests |

## Chunk Breakdown and Test Counts

The chunk tables below track primary TC-condition coverage plus additional
non-TC decided tests for each implementation slice. Cross-cutting contract and
integration tests may support more than one chunk, so the file-inventory total
above remains the authoritative planned test count across all layers.

Two execution-boundary tests in `tests/service/server/script-execution.service.test.ts`
are tracked only at the file-inventory level because they protect the shared
tool-harness contract across multiple chunks rather than belonging cleanly to
one slice.

### Chunk 0: Infrastructure

**Scope:** Shared contracts, environment summary shapes, `processEnvironmentStates`
table skeleton, fixtures, provider stubs, test utilities.

**TC conditions:** 0  
**Additional non-TC tests:** 0  
**Exit criteria:** `pnpm typecheck` and `pnpm build` succeed with scaffolding in
place.

### Chunk 1: Environment Summary and Controls

**Scope:** Durable bootstrap of environment state, stable visible controls,
disabled reasons, latest checkpoint render shell.
**ACs:** AC-1.1 to AC-1.5
**TC conditions:** 17
**Additional non-TC tests:** 8
**Relevant docs:** `tech-design.md` §System View, §Module Boundaries;
`tech-design-client.md` §Flow 1, §Flow 2;
`tech-design-server.md` §Flow 1

### Chunk 2: Start, Resume, and Hydration Preparation

**Scope:** Start/resume accepted-action path, hydration planning, immediate
rejection boundaries, source access-mode visibility.
**ACs:** AC-2.1 to AC-2.5
**TC conditions:** 10
**Additional non-TC tests:** 6
**Relevant docs:** `tech-design-client.md` §Flow 3, §Flow 4;
`tech-design-server.md` §Flow 2

### Chunk 3: Controlled Execution and Live Environment State

**Scope:** Running/waiting/checkpointing distinctions, live current-object
reconciliation, failure legibility.
**ACs:** AC-3.1 to AC-3.4
**TC conditions:** 6
**Additional non-TC tests:** 5
**Relevant docs:** `tech-design-client.md` §Flow 5;
`tech-design-server.md` §Flow 3

### Chunk 4: Checkpointing of Artifacts and Writable Sources

**Scope:** Artifact/code checkpoint success, latest checkpoint result
visibility, read-only exclusions, failure presentation.
**ACs:** AC-4.1 to AC-4.5
**TC conditions:** 9
**Additional non-TC tests:** 7
**Relevant docs:** `tech-design-client.md` §Flow 4;
`tech-design-server.md` §Flow 4

### Chunk 5: Rehydrate, Rebuild, and Recovery

**Scope:** Stale/lost/failed distinctions, recovery actions, durable truth across
recovery.
**ACs:** AC-5.1 to AC-5.5
**TC conditions:** 10
**Additional non-TC tests:** 4
**Relevant docs:** `tech-design-client.md` §Flow 3;
`tech-design-server.md` §Flow 5

### Chunk 6: Return Later and Degraded Operation

**Scope:** Reopen, durable latest checkpoint visibility, live unavailable
behavior, no-duplication guarantees.
**ACs:** AC-6.1 to AC-6.4
**TC conditions:** 5
**Additional non-TC tests:** 4
**Relevant docs:** `tech-design-client.md` §Flow 1, §Flow 5;
`tech-design-server.md` §Flow 6

**File-inventory running total:** 105 planned tests across all layers

## Manual Verification Checklist

1. Start local Convex and the Fastify/Vite dev server.
2. Sign in through the local WorkOS environment.
3. Open a process route and verify the environment panel renders on first load.
4. Verify the full stable control set is visible, including disabled controls.
5. Open fixtures for `preparing`, `rehydrating`, `ready`, `stale`, `lost`,
   `failed`, and `unavailable` environment states and confirm each state renders distinctly.
6. Start a draft process and confirm the page moves into visible preparation
   without a full reload.
7. Resume a resumable process and confirm the page updates in-session.
8. Trigger a stale environment and confirm `rehydrate` is available while
   `rebuild` explains why it is blocked, then trigger `rehydrate` and confirm
   the surface enters `rehydrating` before later readiness or failure.
9. Trigger a lost environment and confirm `rebuild` is available while
   `rehydrate` explains why it is blocked.
10. Trigger a blocked `rehydrate` and a blocked `rebuild` and confirm each
    shows an immediate readable rejection.
11. Seed writable and read-only sources and confirm `accessMode` renders
    correctly.
12. Trigger an artifact checkpoint success and confirm the latest checkpoint
    result appears in the environment panel with the project artifact target and
    resulting version details.
13. Trigger a code checkpoint success and confirm the target source and target
    ref are visible.
14. Trigger a checkpoint failure and confirm the latest checkpoint result shows
    failure without erasing the rest of the page.
15. Remove the active environment after a successful checkpoint and reopen the
    route; confirm durable results remain visible.
16. Disconnect live transport and confirm the surface remains readable.
17. Reconnect and confirm no finalized history rows or checkpoint results appear
    duplicated.
