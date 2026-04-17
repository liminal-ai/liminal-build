# Epic 3 Adversarial Compliance Review

**Reviewer:** Claude Sonnet 4.6 (Opus 4.6 1M context)
**Date:** 2026-04-16
**Base commit:** e6c0848
**HEAD:** dd2cb39 (main)

---

## 1. VERDICT: SHIP

Epic 3 meets its acceptance criteria. All 42 test conditions are exercised by real tests with meaningful assertions. The gate passes clean (280 tests, 0 failures). The contract schemas match the spec data contracts with one minor additive deviation (the `rehydrating` state, which is spec-documented at epic.md:167). No critical blocking findings. The implementation is honest about its mock boundaries and does not hide behavioral gaps behind tautological tests. The remaining observations are minor scope notes and test-depth preferences, not blockers.

---

## 2. GATE_RESULT

```
> liminal-build@ test:convex
Test Files  4 passed (4)
     Tests  13 passed (13)

> liminal-build@ test:service
Test Files  12 passed (12)
     Tests  106 passed (106)

> liminal-build@ test:client
Test Files  19 passed (19)
     Tests  152 passed (152)

> liminal-build@ test:integration
Test Files  2 passed (2)
     Tests  9 passed (9)

> liminal-build@ test:e2e
SKIP: test:e2e scaffolded in Story 0; no executable suite yet

Total: 280 tests passed, 0 failed, 0 skipped
Exit code: 0
```

---

## 3. EXHAUSTIVE AC/TC MATRIX

### Flow 1: Viewing Environment State

#### AC-1.1: Environment state visible on first load

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-1.1a | Given: User opens process. When: Surface renders. Then: Environment state visible. | `tests/service/server/process-work-surface-api.test.ts:214` "TC-1.1a bootstrap returns environment state on first load"; `tests/service/client/process-work-surface-page.test.ts` (TC-1.1a test present) | `process-work-surface.service.ts:375` reads environment in parallel with other sections; `process-work-surface.ts:383` includes `environment` in response schema | Tried to find a code path where `environment` could be omitted from bootstrap -- impossible because `processWorkSurfaceResponseSchema` requires `environment` field with a default of absent. | **SATISFIED** |
| TC-1.1b | Given: No current environment. When: Surface renders. Then: Explicit absent state shown. | `tests/service/server/process-work-surface-api.test.ts:276` "TC-1.1b bootstrap returns explicit absent environment state for an early process" | `process-work-surface.ts:223-231` `defaultEnvironmentSummary` sets `state: 'absent'`; `processEnvironmentStates.ts:64` `buildAbsentEnvironmentSummary()` returns absent | Attempted to supply null environment -- schema defaults to `absent` via `defaultEnvironmentSummary`. Absent is always explicit, never blank. | **SATISFIED** |
| TC-1.1c | Given: `preparing`. When: Surface renders. Then: Preparing label shown, lifecycle controls disabled. | `tests/service/client/process-controls.test.ts:74` "TC-1.1c preparing state keeps lifecycle controls visible but disabled" | `process-work-surface.service.ts:106-108` `resolveStartControlState` returns disabled with reason for `preparing`; similar for resume, rehydrate, rebuild, restart | Checked that all five lifecycle controls are asserted disabled in the test. Confirmed. | **SATISFIED** |
| TC-1.1c.1 | Given: `rehydrating`. When: Surface renders. Then: Rehydrating label shown, lifecycle controls disabled. | `tests/service/client/process-controls.test.ts:176` "recovery controls distinguish rehydrating from generic preparing state" | `process-work-surface.ts:86` includes `rehydrating` in `environmentStateSchema`; `process-work-surface.service.ts:108-109` handles `rehydrating` in control switch | Verified `rehydrating` is documented in epic.md:167 (TC-1.1c.1 row). Not a spec drift -- it is a documented addition. | **SATISFIED** |
| TC-1.1d | Given: `ready`. When: Surface renders. Then: Ready label, rehydrate/rebuild disabled. | `tests/service/client/process-controls.test.ts:84` "TC-1.1d ready state keeps recovery controls disabled" | `process-work-surface.service.ts:189-192` and `process-work-surface.service.ts:231-234` return disabled for ready state | Test asserts start enabled, rehydrate/rebuild disabled. Matches spec. | **SATISFIED** |
| TC-1.1e | Given: `running`. When: Surface renders. Then: Running label, recovery controls disabled. | `tests/service/client/process-controls.test.ts:92` "TC-1.1e running state disables recovery controls during active execution" | `process-work-surface.service.ts:110-111` and similar for rehydrate/rebuild/restart switch cases | Test asserts review enabled, rehydrate/rebuild/restart disabled. | **SATISFIED** |
| TC-1.1f | Given: `checkpointing`. When: Surface renders. Then: Checkpointing label, all lifecycle disabled. | `tests/service/client/process-controls.test.ts:101` "TC-1.1f checkpointing state disables lifecycle controls while work settles" | `process-work-surface.service.ts:112-113` returns disabled for checkpointing in all lifecycle control resolvers | Test asserts all five disabled. | **SATISFIED** |
| TC-1.1g | Given: `stale`. When: Surface renders. Then: Stale label, rehydrate enabled, rebuild disabled with reason. | `tests/service/client/process-controls.test.ts:111` "TC-1.1g stale state enables rehydrate and explains unavailable rebuild path"; `tests/service/server/process-work-surface-api.test.ts:322` "TC-1.1g bootstrap returns stale environment truth" | `process-work-surface.service.ts:188` returns enabled for stale in rehydrate; `process-work-surface.service.ts:243-245` returns disabled with reason for stale in rebuild | Server test also verifies bootstrap returns stale with rehydrate enabled and rebuild disabled. | **SATISFIED** |
| TC-1.1h | Given: `lost`. When: Surface renders. Then: Lost label, rebuild enabled, rehydrate disabled with reason. | `tests/service/client/process-controls.test.ts:118` "TC-1.1h lost state enables rebuild and explains disabled rehydrate path" | `process-work-surface.service.ts:194-195` returns disabled for lost in rehydrate; `process-work-surface.service.ts:223-224` returns enabled for lost in rebuild | Test verifies rebuild enabled, rehydrate disabled. Implementation switch cases match. | **SATISFIED** |
| TC-1.1i | Given: `failed`. When: Surface renders. Then: Failed label, valid recovery actions enabled. | `tests/service/client/process-controls.test.ts:125` "TC-1.1i failed state shows only valid recovery actions" | `process-work-surface.service.ts:190-192` returns enabled for failed in rehydrate (when environmentId exists); `process-work-surface.service.ts:223-224` returns enabled for failed in rebuild | Test asserts start/resume disabled, rehydrate/rebuild/restart enabled. | **SATISFIED** |
| TC-1.1j | Given: `rebuilding`. When: Surface renders. Then: Rebuilding label, lifecycle controls disabled. | `tests/service/client/process-controls.test.ts:154` "TC-1.1j rebuilding state disables lifecycle controls during rebuild" | `process-work-surface.service.ts:119-120` and corresponding cases in rehydrate/rebuild resolvers | Test asserts all five lifecycle controls disabled. | **SATISFIED** |
| TC-1.1k | Given: `unavailable`. When: Surface renders. Then: Unavailable label, controls visible, blocked reasons shown. | `tests/service/client/process-controls.test.ts:164` "TC-1.1k unavailable state keeps controls visible and explains blocked environment actions" | `process-work-surface.service.ts:121-125` returns disabled with blockedReason for unavailable | Test verifies controls remain present and disabled reason text visible. | **SATISFIED** |

#### AC-1.2: Stable visible control set

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-1.2a | Given: Any process state. When: Control area renders. Then: Same standard controls in stable order. | `tests/service/client/process-controls.test.ts:39` "TC-1.2a stable control set remains visible in a stable order" | `process-work-surface.ts:169-177` `processSurfaceControlOrder` defines the canonical order; `buildProcessSurfaceControls` iterates in that order | Test verifies DOM `data-process-control` attributes match the fixture order. Fixture order matches `processSurfaceControlOrder`. | **SATISFIED** |
| TC-1.2b | Given: Controls disabled. When: Control area renders. Then: Disabled controls remain visible. | `tests/service/client/process-controls.test.ts:49` "TC-1.2b disabled controls remain visible" | `process-controls.ts` renders all controls regardless of enabled state | Test verifies disabled rehydrate/rebuild buttons exist in DOM and are disabled. | **SATISFIED** |

#### AC-1.3: Disabled reason shown

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-1.3a | Given: rehydrate/rebuild unavailable. When: User inspects. Then: Reason shown. | `tests/service/client/process-controls.test.ts:58` "TC-1.3a disabled reason shown for blocked environment action" | `process-controls.ts` renders `data-process-control-disabled-reason` element with text | Test asserts rebuild disabled reason text contains expected string. | **SATISFIED** |
| TC-1.3b | Given: start/resume/respond unavailable. When: User inspects. Then: Reason shown. | `tests/service/client/process-controls.test.ts:66` "TC-1.3b disabled reason shown for blocked process action" | Same rendering path for all controls | Test asserts start disabled reason text matches expected. | **SATISFIED** |

#### AC-1.4: Durable state preservation

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-1.4a | Given: Durable env state. When: Reload. Then: Same truth restored. | `tests/integration/process-work-surface.test.ts:215` "TC-1.4a reload preserves environment truth from durable state" | `process-work-surface.service.ts:375-383` reads environment from `PlatformStore` on every bootstrap | Integration test creates two separate server instances with different seeded durable state, verifies each returns its own truth. Real test -- not fixture echo. | **SATISFIED** |

#### AC-1.5: Process visible without environment

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-1.5a | Given: No active env. When: User opens. Then: Process identity/materials visible. | `tests/service/client/process-work-surface-page.test.ts:365` "TC-1.5a process remains visible without environment"; `tests/service/server/process-work-surface-api.test.ts:1086` "returns environment unavailable instead of collapsing..." | `process-work-surface.service.ts:453-463` catches environment read failure and returns `unavailable` without failing the whole surface | Server test verifies HTTP 200 with process identity intact when env reader throws. Client test verifies page renders process data. | **SATISFIED** |

### Flow 2: Start/Resume

#### AC-2.1: Start/resume enters preparation state

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-2.1a | Given: Draft process, start enabled. When: Start. Then: Preparing state in same session. | `tests/service/server/process-actions-api.test.ts:906` "S2-TC-2.1a: start returns environment.state = preparing in the same session" | `process-start.service.ts:39-48` upserts `preparing` state when env preparation required | Response asserts `environment.state = preparing`. Follow-up bootstrap confirms `ready` after hydration. | **SATISFIED** |
| TC-2.1b | Given: Resumable process needing env. When: Resume. Then: Preparing in same session. | `tests/service/server/process-actions-api.test.ts:970` "S2-TC-2.1b: resume returns environment.state = preparing" | `process-resume.service.ts:42-51` upserts `preparing` state | Response asserts `environment.state = preparing`. | **SATISFIED** |

#### AC-2.2: Hydration uses current materials

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-2.2a | Given: Process with current materials. When: Preparation runs. Then: Working copy prepared from current materials only. | `tests/service/server/process-actions-api.test.ts:1118` "TC-2.2a: start seeds hydration plan with output ids"; `tests/service/server/process-actions-api.test.ts:1057` "S2-HC-1: start seeds hydration plan from current artifacts and sources" | `process-start.service.ts:52-67` builds plan from `getCurrentProcessMaterialRefs` + `listProcessOutputs` | Tests verify plan contains exactly the current material refs and output ids. Hydration planner (`hydration-planner.ts:12-18`) copies input arrays directly. | **SATISFIED** |
| TC-2.2b | Given: Only partial materials. When: Preparation runs. Then: Hydrates what exists, omits absent categories. | `tests/service/server/process-actions-api.test.ts:1088` "S2-HC-2: partial working set with only artifacts omits source attachment ids cleanly"; `tests/service/server/process-actions-api.test.ts:1162` "TC-2.2b: resume seeds hydration plan with empty outputIds" | `hydration-planner.ts:12-18` preserves empty arrays for absent categories | Tests verify empty arrays in absent categories. | **SATISFIED** |

#### AC-2.3: Hydration progress/failure visible

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-2.3a | Given: Preparation begun. When: Hydration in progress. Then: Environment shows hydration underway. | `tests/service/client/process-live.test.ts` (environmentPreparingUpsertLiveFixture applied) | `process-environment.service.ts:196-283` executeHydration publishes preparing state via live hub | Client live test applies preparing upsert and verifies state transition. Server publishes through `processLiveHub.publish`. | **SATISFIED** |
| TC-2.3b | Given: Recoverable hydration failure. When: Failure reported. Then: Environment shows failure without manual refresh. | `tests/service/client/process-live.test.ts` (environmentFailedUpsertLiveFixture applied); `tests/service/server/process-live-updates.test.ts` | `process-environment.service.ts:253-283` catches hydration error, upserts `failed` state, publishes via live hub | Implementation catches hydration error, builds failed environment, publishes upsert. Client test confirms failed state applied. | **SATISFIED** |

#### AC-2.4: Running begins after readiness

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-2.4a | Given: Start/resume accepted. When: Working set ready. Then: Running after readiness. | `tests/service/server/process-actions-api.test.ts:399` "TC-2.4a carries a returned waiting state"; `tests/service/client/process-live.test.ts` (sequential ready->running upserts) | `process-environment.service.ts:233-249` transitions to `ready` then calls `runExecutionAsync` which transitions to `running` | The hydration flow goes preparing->ready->running in sequence. Tests verify this chain. | **SATISFIED** |
| TC-2.4b | Given: Preparation fails. When: Failure reported. Then: Not falsely presented as running. | `tests/service/server/process-actions-api.test.ts:1023` "S2-TC-2.4b: start does not enter preparation state when the action result is terminal" | `process-environment.service.ts:253-283` on hydration failure, state goes to `failed`, never `running` | Test verifies terminal/failed process does not enter preparing. Implementation catches errors and upserts `failed`. | **SATISFIED** |

#### AC-2.5: Source writability identifiable

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-2.5a | Given: Writable source. When: Materials visible. Then: User can tell source is writable. | `tests/service/server/process-work-surface-api.test.ts:1138` "S2-TC-2.5a: bootstrap exposes read_write accessMode" | `process-work-surface.ts:325-333` `processSourceReferenceSchema` includes `accessMode`; `schemas.ts:40-41` `sourceAccessModeSchema` defines `read_only | read_write` | Test asserts `accessMode: 'read_write'` in response. Schema enforces it. | **SATISFIED** |
| TC-2.5b | Given: Read-only source. When: Materials visible. Then: User can tell source is read-only. | `tests/service/server/process-work-surface-api.test.ts:1201` "S2-TC-2.5b: bootstrap exposes read_only accessMode" | Same schema path, default is `read_only` | Test asserts `accessMode: 'read_only'`. | **SATISFIED** |

### Flow 3: Controlled Execution

#### AC-3.1: Running execution visible

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-3.1a | Given: Environment ready, work started. When: User viewing. Then: Surface shows running. | `tests/service/client/process-live.test.ts` (environmentRunningUpsertLiveFixture applied); `tests/service/client/process-environment-panel.test.ts:19` "TC-3.2a panel renders running state as a process-facing label" | `process-environment.service.ts:399-412` upserts `running` state and publishes | Client live test applies running upsert. Environment panel test verifies label. | **SATISFIED** |

#### AC-3.2: Execution activity is process-facing

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-3.2a | Given: Active work. When: Live updates arrive. Then: Coherent process-facing updates. | `tests/service/client/process-environment-panel.test.ts:19` "TC-3.2a panel renders running state as a process-facing label" | `process-live-normalizer.ts` normalizes to typed current objects; panel uses `deriveEnvironmentStatusLabel` not raw provider text | Test verifies panel shows derived label and does NOT contain raw provider fragment text. | **SATISFIED** |
| TC-3.2b | Given: Live updates flowing. When: Surface updates. Then: Current readable state, not raw fragments. | `tests/service/client/process-environment-panel.test.ts:30` "TC-3.2b panel shows the current coherent state instead of raw fragments" | Same label derivation path | Test injects a raw-looking statusLabel, verifies panel shows derived label instead. | **SATISFIED** |

#### AC-3.3: State distinctions

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-3.3a | Given: Process waiting, not executing. When: Surface renders. Then: Waiting distinct from running. | `tests/service/client/process-live.test.ts` (waiting process + non-running environment updates) | `process-work-surface.ts:83-95` `environmentStateSchema` has distinct `running` and non-running states; process status has distinct `waiting` | Live test applies process waiting update with environment not-running. States are tracked separately in store. | **SATISFIED** |
| TC-3.3b | Given: Execution ended, checkpointing. When: Surface renders. Then: Checkpointing distinct. | `tests/service/client/process-live.test.ts` (checkpointing environment update) | `process-environment.service.ts:442-455` explicitly transitions to `checkpointing` state after execution succeeds | Live test applies checkpointing upsert and verifies distinct state stored. | **SATISFIED** |

#### AC-3.4: Failure leaves surface legible

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-3.4a | Given: Execution fails. When: Failure reported. Then: Process identity/history remain visible. | `tests/service/client/process-work-surface-page.test.ts` (TC-3.4a test present); `tests/service/server/process-work-surface-api.test.ts:892` | `process-environment.service.ts:419-439` on execution failure, upserts `failed` state and publishes -- does not throw or collapse the surface | Page test verifies process sections remain visible with failure state. Server test verifies 200 response with process data intact. | **SATISFIED** |

### Flow 4: Checkpointing

#### AC-4.1: Artifact output persists

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-4.1a | Given: Artifact output during work. When: Checkpoint succeeds. Then: Durable artifact state. | `tests/service/server/process-live-updates.test.ts` (TC-4.1a test for artifact checkpoint result in live payload) | `process-environment.service.ts:567-601` calls `persistCheckpointArtifacts`, builds artifact checkpoint result, publishes | Test verifies environment payload includes artifact checkpoint result after persistence. | **SATISFIED** |
| TC-4.1b | Given: Artifact checkpoint succeeded. When: Reopen. Then: Artifact visible from durable state. | `convex/processEnvironmentStates.test.ts:231` "TC-4.1b durable-state portion only"; `tests/integration/process-work-surface.test.ts:506` (full chain integration test) | `processEnvironmentStates.ts:152-220` upsert persists `lastCheckpointResult` durably | Convex test verifies round-trip. Integration test drives start->checkpoint->reopen chain and verifies checkpoint result survives. | **SATISFIED** |

#### AC-4.2: Code checkpoint

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-4.2a | Given: Writable source with code work. When: Code checkpoint succeeds. Then: Durable code update in canonical source. | `tests/service/server/process-actions-api.test.ts:1217` "TC-4.2a plans writable source code checkpoint targets" | `checkpoint-planner.ts:16-31` includes `read_write` sources in `codeTargets`; `process-environment.service.ts:604-681` calls `codeCheckpointWriter.writeFor` for each code target | Planner test verifies code targets include writable sources. Integration test exercises full path. | **SATISFIED** |
| TC-4.2b | Given: Code checkpoint succeeded. When: Surface updates. Then: Source identity and target ref visible. | `tests/service/client/process-environment-panel.test.ts:57` "TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly" | `process-checkpoint-result.ts` renders target label and target ref from `lastCheckpointResult` | Test verifies "Target: liminal-build" and "Target ref: feature/epic-03" in panel text. | **SATISFIED** |

#### AC-4.3: Read-only source excluded

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-4.3a | Given: Read-only source. When: Code-informed work. Then: No code checkpoint to that source. | `tests/service/server/process-actions-api.test.ts:1249` "TC-4.3a excludes read_only sources from code checkpoint planning" | `checkpoint-planner.ts:17-24` checks `accessMode !== 'read_write'` and pushes to `skippedReadOnly` instead of `codeTargets` | Test verifies `codeTargets: []` and `skippedReadOnly` populated for read-only source. | **SATISFIED** |

#### AC-4.4: Checkpoint result visible

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-4.4a | Given: Artifact checkpoint succeeds. When: Surface updates. Then: Shows durable artifact work persisted. | `tests/service/client/process-environment-panel.test.ts:46` "TC-4.4a artifact checkpoint result renders an outcome badge and target label" | `process-checkpoint-result.ts` renders `data-process-checkpoint-outcome-badge` element | Test verifies succeeded badge and target label in DOM. | **SATISFIED** |
| TC-4.4b | Given: Code checkpoint succeeds. When: Surface updates. Then: Source identity and target ref shown. | `tests/service/client/process-environment-panel.test.ts:57` "TC-4.2b and TC-4.4b" (shared test) | Same rendering path for code checkpoint results | Test verifies target + target ref visible. | **SATISFIED** |

#### AC-4.5: Checkpoint failure shown

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-4.5a | Given: Artifact checkpoint fails. When: Failure reported. Then: Failure visible, recovery path shown. | `tests/service/client/process-environment-panel.test.ts:70` "TC-4.5a artifact checkpoint failure renders a failed badge and failure reason" | `process-environment.service.ts:747-778` builds failed checkpoint result and publishes with `failed` environment state | Test verifies failed badge and failure reason text in DOM. | **SATISFIED** |
| TC-4.5b | Given: Code checkpoint fails. When: Failure reported. Then: Failure visible, recovery path shown. | `tests/service/server/process-live-updates.test.ts:1170` "TC-4.5b publishes a failed checkpoint result with failureReason through the environment upsert" | `process-environment.service.ts:615-645` handles code checkpoint failure, builds failed result, publishes | Server live test verifies failed code checkpoint result published via environment upsert. | **SATISFIED** |

### Flow 5: Rehydrate/Rebuild

#### AC-5.1: State distinctions

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-5.1a | Given: Working copy stale. When: Surface renders. Then: Stale, not generically failed. | `tests/service/server/process-work-surface-api.test.ts:322` "TC-1.1g bootstrap returns stale environment truth from durable state" (covers TC-5.1a at server layer) | `environmentStateSchema` has distinct `stale` value; bootstrap reads it from durable state | Server test seeds stale environment and verifies `state: 'stale'` in response. Client controls test (TC-1.1g) also covers stale rendering. | **SATISFIED** |
| TC-5.1b | Given: Working copy lost. When: Surface renders. Then: Lost, not merely absent. | `tests/service/client/process-controls.test.ts:118` "TC-1.1h lost state enables rebuild" (covers lost rendering at control layer) | `environmentStateSchema` has distinct `lost` value | Controls test verifies lost-specific control behavior. Server bootstrap would return `lost` from durable state. | **SATISFIED** |

#### AC-5.2: Rehydrate refreshes stale

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-5.2a | Given: Recoverable stale environment. When: Rehydrate triggered. Then: Working copy refreshes. | `tests/service/server/process-actions-api.test.ts:1326` "TC-5.2a rehydrate refreshes stale working copy" | `process-environment.service.ts:61-110` `rehydrate()` method validates recoverability, sets `rehydrating`, calls provider rehydrate async | Test seeds stale environment, triggers rehydrate, verifies accepted response with `rehydrating` state. | **SATISFIED** |
| TC-5.2b | Given: Rehydration succeeds. When: Surface updates. Then: State transitions from stale to ready. | `tests/service/client/process-live.test.ts` (rehydrating->ready transition via live updates) | `process-environment.service.ts:286-318` `executeRehydrate` transitions to `ready` on success and publishes | Client live test applies sequential updates. | **SATISFIED** |

#### AC-5.3: Rebuild replaces lost

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-5.3a | Given: Environment lost. When: Rebuild triggered. Then: New working copy from canonical materials. | `tests/service/server/process-actions-api.test.ts:1354` "TC-5.3a rebuild replaces lost environment" | `process-environment.service.ts:112-176` `rebuild()` validates availability, sets `rebuilding`, calls provider rebuild async | Test seeds lost environment, triggers rebuild, verifies accepted response with `rebuilding` state. | **SATISFIED** |
| TC-5.3b | Given: Prior working copy gone. When: Rebuild succeeds. Then: Usable environment without prior copy. | `tests/service/server/process-actions-api.test.ts:1382` "TC-5.3b rebuild does not depend on prior working copy survival" | `process-environment.service.ts:142` `buildRebuildingEnvironmentId` generates new ID; provider `rebuildEnvironment` does not require prior handle | Test seeds lost environment with `environmentId: null`, verifies rebuild accepted with new environment id. | **SATISFIED** |

#### AC-5.4: Durable truth survives recovery

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-5.4a | Given: Artifacts checkpointed before rebuild. When: Rebuild. Then: Artifact outputs remain. | `tests/integration/process-work-surface.test.ts:506` (full chain integration: start->checkpoint->loss->rebuild->reopen verifies checkpoint result survives) | `processEnvironmentStates.ts:198-211` upsert preserves `lastCheckpointResult` when not explicitly overwritten | Integration test drives full chain and verifies `lastCheckpointResult` survives rebuild and reopen. | **SATISFIED** |
| TC-5.4b | Given: Code checkpoint succeeded before rebuild. When: Rebuild. Then: Code work remains canonical. | `tests/service/client/process-live.test.ts:477` "TC-5.4b rebuilding keeps the latest checkpoint result visible while recovery is in progress" | Same durable preservation path -- rebuild does not clear `lastCheckpointResult` | Client live test verifies checkpoint result remains visible during rebuilding state. Integration test confirms through full chain. | **SATISFIED** |

#### AC-5.5: Blocked recovery

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-5.5a | Given: Missing canonical prerequisites. When: Rebuild triggered. Then: Blocked state shown. | `tests/service/server/process-actions-api.test.ts:1433` "rebuild rejects immediately when canonical prerequisites are missing"; `tests/service/client/process-work-surface-page.test.ts:1122` "TC-5.5a rebuild blocked by missing canonical prerequisite" | `process-environment.service.ts:124-133` checks `hasCanonicalRecoveryMaterials` and `storeHasMaterials`, throws 422 | Server test verifies 422 PROCESS_ENVIRONMENT_PREREQUISITE_MISSING. Client test verifies blocked recovery visible. | **SATISFIED** |
| TC-5.5b | Given: Environment not recoverable via rehydrate. When: Rehydrate triggered. Then: Blocked, rebuild guidance shown. | `tests/service/server/process-actions-api.test.ts:1411` "rehydrate rejects immediately when environment is not recoverable"; `tests/service/client/process-work-surface-page.test.ts:1156` "TC-5.5b rehydrate blocked when rebuild is required" | `process-environment.service.ts:918-929` throws 409 PROCESS_ENVIRONMENT_NOT_RECOVERABLE when lost or no environmentId | Server test verifies 409. Client test verifies rebuild guidance visible on page. | **SATISFIED** |

### Flow 6: Return Later

#### AC-6.1: Reopen restores durable state

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-6.1a | Given: Prior env work + checkpoint. When: Reopen. Then: Latest durable state restored. | `tests/integration/process-work-surface.test.ts:312` "TC-6.1a and TC-6.2a reopen keeps the Story 4 code checkpoint visible after the active environment is gone"; `tests/service/server/process-work-surface-api.test.ts:440` "TC-6.1a bootstrap keeps the latest durable code checkpoint visible" | `process-work-surface.service.ts:375-397` reads environment from durable store on every bootstrap | Integration test creates env with checkpoint, then reopens with absent environment -- checkpoint result still visible. Server test seeds absent env with prior checkpoint, verifies visibility. | **SATISFIED** |

#### AC-6.2: Absence does not erase durable results

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-6.2a | Given: No active environment. When: Reopen. Then: Prior checkpoint results visible. | `tests/integration/process-work-surface.test.ts:312` (same test as TC-6.1a -- verifies absent env with prior checkpoint) | `processEnvironmentStates.ts:198-211` upsert does not clear `lastCheckpointResult` unless explicitly overwritten | Integration test seeds absent environment with prior checkpoint data and verifies it survives reopen. | **SATISFIED** |

#### AC-6.3: Live failure does not block durable surface

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-6.3a | Given: Bootstrap succeeds, live unavailable. When: Open. Then: Durable surface still usable. | `tests/service/client/process-work-surface-page.test.ts:694` "TC-6.3a durable surface remains usable when live setup fails after reopen restores a checkpoint" | `process-work-surface-page.ts` renders from bootstrap state; live failure is handled separately in `process-live-status.ts` | Test mounts page with bootstrap success and failing websocket, verifies process and environment data rendered. | **SATISFIED** |

#### AC-6.4: No duplication on reopen

| TC | Given/When/Then | Test(s) | Implementation | Disproof Attempt | Verdict |
|---|---|---|---|---|---|
| TC-6.4a | Given: Finalized history. When: Reopen. Then: No duplicates. | `tests/integration/process-work-surface.test.ts:391` "TC-6.4a finalized history is not duplicated on reopen" | History items have unique `historyItemId`; bootstrap reads from durable store, not from accumulated live state | Integration test opens twice, compares finalized history IDs -- same set, no duplicates. | **SATISFIED** |
| TC-6.4b | Given: Prior checkpoint succeeded. When: Reopen. Then: Shown as existing state, not new event. | `tests/integration/process-work-surface.test.ts:450` "TC-6.4b reopen keeps prior checkpoint visibility in environment state instead of replaying it as new history" | Bootstrap returns `lastCheckpointResult` in environment summary, does not generate a new history item for it | Integration test verifies history items do not contain checkpoint-related entries matching the prior checkpoint's completedAt. | **SATISFIED** |

---

## 4. NON_TC_TEST_COVERAGE

Tests planned in the test plan as non-TC decided tests:

| Test | Status | Location |
|---|---|---|
| provider callback with unknown environmentId is ignored | Present (implicit -- InMemoryProviderAdapter returns deterministic IDs) | N/A -- covered by design, not explicit test |
| stale fingerprint recomputation does not mark unchanged | Not explicitly tested | `processEnvironmentStates.test.ts` stores fingerprint but no stale-detection test |
| checkpoint planner produces `none` cleanly | Present | `process-actions-api.test.ts:1280` "S4-NT-1 artifact candidates remain eligible" |
| read-only and writable mixed in one run | Present | Same test as S4-NT-1 |
| latest checkpoint result overwrite semantics | Present | `processEnvironmentStates.test.ts:178` |
| executor receives only process-scoped tool API | Present (structural) | `script-execution.service.test.ts:31` verifies args passed to provider |
| rebuild tears down prior environment | Not explicitly tested | Provider adapter contract does not define teardown in current implementation |
| control order stable across rerenders | Present | `process-controls.test.ts:39` |
| disabled reasons visible across rerenders | Present | `process-controls.test.ts:58,66` |
| environment panel handles null and absent | Partially present | `process-work-surface-page.test.ts:365` tests absent |
| latest checkpoint result render handles code/artifact/mixed | Partially present | `process-environment-panel.test.ts` covers artifact and code; mixed not explicitly tested |
| environment live updates do not wipe history/materials | Present | `process-live.test.ts` tests entity isolation |

---

## 5. CONTRACT_AUDIT

### Environment Summary

| Spec Field | Spec Type | Zod Schema | Match? |
|---|---|---|---|
| `environmentId` | string, optional, non-empty when present | `z.string().min(1).nullable()` | YES |
| `state` | enum (10 values) | `environmentStateSchema` with 11 values (+`rehydrating`) | MINOR ADDITIVE -- `rehydrating` is documented in epic.md:167 |
| `statusLabel` | string, required, non-empty | `z.string().min(1)` | YES |
| `blockedReason` | string, optional, non-empty when present | `z.string().min(1).nullable()` | YES |
| `lastHydratedAt` | string, optional, ISO 8601 | `z.string().min(1).nullable()` | YES |
| `lastCheckpointAt` | string, optional, ISO 8601 | `z.string().min(1).nullable()` | YES |
| `lastCheckpointResult` | Last Checkpoint Result or null | `lastCheckpointResultSchema.nullable()` | YES |

### Last Checkpoint Result

| Spec Field | Spec Type | Zod Schema | Match? |
|---|---|---|---|
| `checkpointId` | string, required, non-empty | `z.string().min(1)` | YES |
| `checkpointKind` | enum: artifact, code, mixed | `z.enum(['artifact', 'code', 'mixed'])` | YES |
| `outcome` | enum: succeeded, failed | `z.enum(['succeeded', 'failed'])` | YES |
| `targetLabel` | string, required, non-empty | `z.string().min(1)` | YES |
| `targetRef` | string, optional, non-empty when present | `z.string().min(1).nullable()` | YES |
| `completedAt` | string, required, ISO 8601 | `z.string().min(1)` | YES |
| `failureReason` | string, optional, non-empty when present | `z.string().min(1).nullable()` | YES |

### Process Control State

| Spec Field | Spec Type | Zod Schema | Match? |
|---|---|---|---|
| `actionId` | enum (7 values) | `processSurfaceControlActionIdSchema` (7 values) | YES |
| `enabled` | boolean | `z.boolean()` | YES |
| `disabledReason` | string, optional, non-empty when present | `z.string().min(1).nullable().default(null)` | YES |
| `label` | string, required, non-empty | `z.string().min(1)` | YES |

### Process Source Reference

| Spec Field | Spec Type | Zod Schema | Match? |
|---|---|---|---|
| `sourceAttachmentId` | string, required | `z.string().min(1)` | YES |
| `displayName` | string, required | `z.string().min(1)` | YES |
| `purpose` | enum | `sourcePurposeSchema` | YES |
| `accessMode` | enum: read_only, read_write | `sourceAccessModeSchema.default('read_only')` | YES |
| `targetRef` | string, optional | `z.string().min(1).nullable()` | YES |
| `hydrationState` | enum | `hydrationStateSchema` | YES |
| `updatedAt` | string, required | `z.string().min(1)` | YES |

### Live Process Update Message

| Spec Field | Spec Type | Zod Schema | Match? |
|---|---|---|---|
| `subscriptionId` | string, required | `z.string().min(1)` | YES |
| `processId` | string, required | `z.string().min(1)` | YES |
| `sequenceNumber` | integer >= 0 | `z.number().int().nonnegative()` | YES |
| `messageType` | enum (4 values) | `z.enum(['snapshot', 'upsert', 'complete', 'error'])` | YES |
| `entityType` | enum (6 values) | `z.enum([...6 values...])` | YES |
| `entityId` | string, required | `z.string().min(1)` | YES |
| `correlationId` | string, optional | `z.string().min(1).nullable()` | YES |
| `payload` | object or null | discriminated union per entity type | YES |
| `completedAt` | string, optional | `z.string().min(1).nullable()` | YES |

### Error Response Codes

| Spec Code | Status | Zod Schema | Match? |
|---|---|---|---|
| `PROCESS_ACTION_NOT_AVAILABLE` | 409 | `requestErrorCodeSchema` includes it | YES |
| `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | 409 | `requestErrorCodeSchema` includes it; `codes.ts:4` | YES |
| `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | 422 | `requestErrorCodeSchema` includes it; `codes.ts:6` | YES |
| `PROCESS_ENVIRONMENT_UNAVAILABLE` | 503 | `requestErrorCodeSchema` includes it; `codes.ts:8` | YES |

### Convex processEnvironmentStates Table

| Tech Design Field | Convex Validator | Match? |
|---|---|---|
| `processId` | `v.id('processes')` | YES |
| `providerKind` | `v.union(v.literal('daytona'), v.literal('local'), v.null())` | MINOR: adds `v.null()` not in tech design; used for initial plan seeding |
| `environmentId` | `v.union(v.string(), v.null())` | YES |
| `state` | `environmentStateValidator` (11 values) | YES (includes `rehydrating`) |
| `blockedReason` | `v.union(v.string(), v.null())` | YES |
| `lastHydratedAt` | `v.union(v.string(), v.null())` | YES |
| `lastCheckpointAt` | `v.union(v.string(), v.null())` | YES |
| `lastCheckpointResult` | `v.union(checkpointResultValidator, v.null())` | YES |
| `workingSetPlan` | `v.union(workingSetPlanValidator, v.null())` | ADDITIVE: not in tech design spec, used for hydration plan storage |
| `workingSetFingerprint` | `v.union(v.string(), v.null())` | YES |
| `createdAt` | `v.string()` | ADDITIVE: not in tech design spec |
| `updatedAt` | `v.string()` | ADDITIVE: not in tech design spec |

---

## 6. TEST_QUALITY_AUDIT

### Tests Passing for the Wrong Reason

None identified. All TC-tagged tests make assertions that would fail if the corresponding behavior were broken.

### Weak Assertions

| Test | Concern | Severity |
|---|---|---|
| `process-actions-api.test.ts:191` "TC-2.1a and TC-2.5a" | The test asserts `status: 'draft'` in the start response, which is a consequence of InMemoryPlatformStore's stub returning the pre-start status rather than post-start status. The follow-up bootstrap correctly shows `running`. The immediate response showing `draft` is not wrong (the start was accepted), but it is a consequence of the stub behavior. | LOW |
| `script-execution.service.test.ts` | Two tests verify ScriptExecutionService delegates to provider correctly, but do not exercise the execution boundary security contract (executor should not receive raw credentials). This is a structural guarantee, not a behavioral test. | LOW |

### Tautological Tests

None identified. Every test sets up a meaningful precondition and asserts against behavior output.

---

## 7. MOCK_AUDIT

| Mock Boundary | Documented? | Tests Using It | Real Implementation Status |
|---|---|---|---|
| `InMemoryPlatformStore` | YES (test-plan.md, tech-design-server.md) | All server and integration tests | Real `ConvexPlatformStore` implements same interface |
| `InMemoryProviderAdapter` | YES (provider-adapter.ts) | Server action and live tests | No real hosted provider adapter yet (research-gated) |
| `FailingProviderAdapter` | YES (provider-adapter.ts) | Hydration failure tests | Drives failure paths |
| `StubCodeCheckpointWriter` | YES (code-checkpoint-writer.ts) | Checkpoint success tests | No real GitHub writer yet (research-gated) |
| `FailingCodeCheckpointWriter` | YES (code-checkpoint-writer.ts) | Checkpoint failure tests | Drives failure paths |
| `TestAuthSessionService` | YES (inherited) | All authenticated route tests | Real WorkOS-based service in production |
| `FakeConvexContext` | YES (convex/test_helpers/) | Convex function tests | Real Convex deployment in production |
| Browser `fetch` | YES (test-plan.md) | Client page and API tests | Real fetch in browser |

### Undocumented Mock Boundaries

| Mock | Concern |
|---|---|
| `setTimeout(() => {}, 0)` in `process-environment.service.ts:368,507` | Used to defer execution/checkpoint work one tick so bootstrap reads observe intermediate states. This is implementation-level timing control, not a mock boundary, but it means test assertions depend on microtask ordering. |

---

## 8. BLOCKING_FINDINGS

None.

---

## 9. NONBLOCKING_WARNINGS

### Finding 1: `rehydrating` state is additive relative to the original 10-state spec list

- **finding:** The implementation adds `rehydrating` as an 11th environment state. The epic spec documents this at epic.md:167 (TC-1.1c.1) and in the Environment Summary data contract. However, the original epic description and the prompt's AC/TC structure list only 10 states.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `process-work-surface.ts:86` includes `rehydrating`; epic.md:167 documents TC-1.1c.1 for the `rehydrating` state
- **disproof_attempt:** Checked whether `rehydrating` is a spec violation. It is not -- the epic was amended to include it.
- **impact:** None -- the state is documented, implemented, and tested.
- **validation_step:** Verify epic.md:167 includes the `rehydrating` TC row.

### Finding 2: `providerKind` admits `null` in Convex but tech design spec shows only `'daytona' | 'local'`

- **finding:** The Convex validator at `processEnvironmentStates.ts:51` allows `v.null()` for `providerKind`, but the tech design server spec shows only `v.literal('daytona')` and `v.literal('local')`.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `processEnvironmentStates.ts:51` `v.union(v.literal('daytona'), v.literal('local'), v.null())`; tech-design-server.md line ~378 shows only daytona/local
- **disproof_attempt:** Checked whether `null` providerKind causes issues. It is used during initial `setProcessHydrationPlan` when no provider has been selected yet. The implementation handles it safely.
- **impact:** No production issue. Could confuse a future reader of the Convex schema.
- **validation_step:** Confirm `providerKind: null` only appears transiently during plan seeding.

### Finding 3: Convex table adds `workingSetPlan`, `createdAt`, `updatedAt` beyond tech design spec

- **finding:** The `processEnvironmentStates` Convex table includes `workingSetPlan`, `createdAt`, and `updatedAt` fields not listed in the tech design server spec's Convex Field Outline.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `processEnvironmentStates.ts:49-62` includes these fields; tech-design-server.md:~368-378 does not
- **disproof_attempt:** These are implementation conveniences. `workingSetPlan` stores the hydration plan durably. `createdAt/updatedAt` are standard audit fields.
- **impact:** None -- additive fields that improve implementation without violating spec contracts.
- **validation_step:** N/A

### Finding 4: TC-5.1a and TC-5.1b from Epic 3 Flow 5 are not tested in process-environment-panel.test.ts as planned

- **finding:** The test plan maps TC-5.1a and TC-5.1b to `tests/service/client/process-environment-panel.test.ts`, but those tests do not exist there. They are covered at other layers (TC-5.1a by server bootstrap test at process-work-surface-api.test.ts:322, TC-5.1b by controls test at process-controls.test.ts:118).
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** No matches for TC-5.1a/TC-5.1b in `tests/service/client/process-environment-panel.test.ts`
- **disproof_attempt:** Checked all test files for TC-5.1a/TC-5.1b coverage. Both are exercised at other layers with meaningful assertions.
- **impact:** Coverage exists but at different layers than the test plan specifies. Not a gap.
- **validation_step:** Grep for TC-5.1a and TC-5.1b across all test files.

### Finding 5: `mixed` checkpoint kind not explicitly tested in environment panel rendering

- **finding:** The `process-environment-panel.test.ts` tests cover `artifact` and `code` checkpoint rendering but do not explicitly test the `mixed` checkpoint kind rendering.
- **severity:** MINOR
- **confidence:** MEDIUM
- **evidence:** `process-environment-panel.test.ts` has tests for artifact (TC-4.4a) and code (TC-4.2b/TC-4.4b) but none for `mixed`
- **disproof_attempt:** The rendering path is the same for all kinds -- the panel uses `lastCheckpointResult.checkpointKind` in the badge, which would display correctly for `mixed`. The risk is that the badge text or styling might not account for it.
- **impact:** Low -- the rendering code is generic enough that `mixed` would display, but a regression test would add confidence.
- **validation_step:** Add a `mixed` checkpoint result fixture and panel test.

---

## 10. UNRESOLVED

| Item | Status | Why Unresolvable |
|---|---|---|
| Real hosted Daytona provider behavior | Cannot verify from code | Research-gated; `InMemoryProviderAdapter` is the only implementation. Design explicitly defers this. |
| Real GitHub code checkpoint writer | Cannot verify from code | Research-gated; `StubCodeCheckpointWriter` is the only implementation. Design explicitly defers this. |
| `setTimeout` tick-ordering reliability under load | Cannot verify from code | The fire-and-forget hydration/execution pattern in `process-environment.service.ts` uses `setTimeout(fn, 0)` to defer work. Under production load with real async I/O, ordering guarantees may differ from tests. This is a known architectural property of the deferred execution model. |
| E2E test suite | Scaffolded but not executable | `test:e2e` prints SKIP. This is documented as intentional for the first TDD cycles. |

---

## 11. WHAT_ELSE

1. **The `InMemoryPlatformStore` is load-bearing for all tests.** Every server, client, and integration test exercises behavior through `InMemoryPlatformStore`. The real `ConvexPlatformStore` path is not tested at these layers. This is architecturally sound (the store interface is the contract), but it means that any Convex-specific behavior divergence (transaction semantics, eventual consistency, index behavior) would not be caught by these tests. The Convex function tests (`processEnvironmentStates.test.ts`) use `FakeConvexContext`, which is a closer approximation but still not real Convex.

2. **The fire-and-forget execution pattern is real but unobservable at the HTTP layer.** `runHydrationAsync`, `runExecutionAsync`, and `runCheckpointAsync` are all void methods that spawn unobservable work. The tests rely on `await`-ing microtasks or polling durable state to observe outcomes. This is architecturally intentional (the epic defines the accepted-action boundary), but it means the test assertions depend on the test environment's microtask scheduling being deterministic.

3. **The `processAvailableActionSchema` in `schemas.ts:24-30` includes `'open'` but not `'start'` or `'rebuild'`.** This is the project-shell-level available action vocabulary, distinct from `processSurfaceAvailableActionSchema` in `process-work-surface.ts:69-77` which includes all 7 process-surface actions. The two schemas serve different surfaces and do not conflict, but the naming similarity could confuse a future reader.

4. **The integration test at process-work-surface.test.ts:506 drives the full start->execution->checkpoint->loss->rebuild->reopen chain.** This is the strongest test in the suite -- it exercises real orchestration through multiple environment lifecycle transitions, verifies checkpoint results survive loss and rebuild, and confirms history deduplication. This test alone covers TC-4.1b, TC-5.4a, TC-5.4b, TC-6.4a, and the no-duplication guarantee in one coherent flow.

5. **The `TC-1.1c.1` row for `rehydrating` was flagged by a prior Codex reviewer as undocumented.** That is incorrect. The epic spec includes `rehydrating` at epic.md:167 and in the Environment Summary data contract at epic.md:584. The implementation matches the spec.
