# Epic 3 Adversarial Verification — Opus 4.6

**Reviewer:** Claude Opus 4.6 (adversarial stance)
**Date:** 2026-04-16
**Epic base:** e6c0848
**HEAD at review:** dd2cb39 (main)

---

## VERDICT: REVISE

The gate passes. The spec coverage is high. The architecture is sound. But the implementation relies on stubs and in-memory fakes at exactly the boundaries where production would hit real systems, and the test suite is structurally unable to detect several classes of failure that the spec explicitly requires handling. Three findings are blocking: silent fire-and-forget error swallowing on recovery paths, behavioral divergence between InMemoryPlatformStore and ConvexPlatformStore on recovery material detection, and artifact content discard during checkpoint persistence. Additional non-blocking findings weaken confidence in the client test layer.

---

## GATE_RESULT

```
Build:        PASS (tsc clean, vite client build clean)
Convex:       PASS  4 files, 13 tests
Server:       PASS 12 files, 106 tests
Client:       PASS 19 files, 152 tests
Integration:  PASS  2 files, 9 tests
E2E:          SKIP (scaffolded, no executable suite)
Total:        280 tests passing, 0 failing
```

All verification tiers pass. E2E is scaffolded but not executable — this is acknowledged in Story 0 and is not blocking for this epic.

---

## ADVERSARIAL_AC_TC_MATRIX

### Flow 1: Viewing Environment State and Control Availability

#### AC-1.1: Environment state visible on first load

| TC | Spec Requirement | Implementation | Disproof Attempt | Verdict |
|----|------------------|----------------|------------------|---------|
| TC-1.1a | Environment state visible on first load | `process-work-surface-api.test.ts` bootstraps with `readyEnvironmentFixture`, asserts `environment.state === 'ready'` | Tried removing environment seeding — test fails correctly. Traced to `DefaultProcessWorkSurfaceService.getSurface()` at `process-work-surface.service.ts:369` which calls `readEnvironment()`. Real Convex path returns `absent` default when no row exists (`processEnvironmentStates.ts:83-96`). | **SATISFIED** |
| TC-1.1b | No active environment renders legible state | Test bootstraps with `absentEnvironmentFixture`, asserts `state === 'absent'` and `statusLabel` present | Verified Convex `getProcessEnvironmentSummary` returns absent summary with statusLabel when no row exists. Client renders "No active environment". | **SATISFIED** |
| TC-1.1c | `preparing` state and control matrix | `process-controls.test.ts` TC-1.1c verifies all 5 lifecycle controls disabled, respond/review follow process state | Checked every switch branch in `resolveStartControlState`, `resolveResumeControlState`, `resolveRehydrateControlState`, `resolveRebuildControlState` at `process-work-surface.service.ts:101-254`. All return disabled for `preparing`. | **SATISFIED** |
| TC-1.1c.1 | `rehydrating` state and control matrix | `process-controls.test.ts` "recovery controls distinguish rehydrating from prep" verifies controls for rehydrating | Confirmed `rehydrating` is in the epic spec (epic.md:167), shared contracts (process-work-surface.ts:86), Convex validator (processEnvironmentStates.ts:22), and all control switch statements. | **SATISFIED** |
| TC-1.1d | `ready` — recovery disabled, start/resume may be enabled | `process-controls.test.ts` TC-1.1d checks rehydrate/rebuild disabled, start enabled | Verified switch branches. | **SATISFIED** |
| TC-1.1e | `running` — recovery disabled during execution | `process-controls.test.ts` TC-1.1e | Verified. | **SATISFIED** |
| TC-1.1f | `checkpointing` — lifecycle disabled until settled | `process-controls.test.ts` TC-1.1f | Verified. | **SATISFIED** |
| TC-1.1g | `stale` — rehydrate enabled, rebuild disabled with reason | `process-controls.test.ts` TC-1.1g | Verified. Note: "stale" is only set via fixture seeding or direct `upsertProcessEnvironmentState` — there is no runtime fingerprint comparison that transitions to stale. See BLOCKING FINDING #3. | **SATISFIED** (control rendering), **WEAKENED** (stale detection — see finding) |
| TC-1.1h | `lost` — rebuild enabled, rehydrate disabled with reason | `process-controls.test.ts` TC-1.1h | Verified. | **SATISFIED** |
| TC-1.1i | `failed` — recovery paths with reasons | `process-controls.test.ts` TC-1.1i | Verified. | **SATISFIED** |
| TC-1.1j | `rebuilding` — lifecycle disabled during rebuild | `process-controls.test.ts` TC-1.1j | Verified. | **SATISFIED** |
| TC-1.1k | `unavailable` — all env controls disabled with reasons | `process-controls.test.ts` TC-1.1k | Verified. Assertion uses `.not.toBeNull()` — weak but functional. | **SATISFIED** |

#### AC-1.2: Stable visible control set

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-1.2a | Stable control set visible in order | `process-controls.test.ts` TC-1.2a asserts `['start','respond','resume','rehydrate','rebuild','review','restart']` order matches | Verified `processSurfaceControlOrder` at `process-work-surface.ts:73-81` matches. Test maps rendered buttons and checks order with `.toEqual()`. | **SATISFIED** |
| TC-1.2b | Disabled controls remain visible | `process-controls.test.ts` TC-1.2b checks button exists AND is disabled | Assertion uses `.not.toBeNull()` then `.toBe(true)` on disabled — adequate. | **SATISFIED** |

#### AC-1.3: Disabled control includes visible reason

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-1.3a | Disabled reason for blocked env action | `process-controls.test.ts` TC-1.3a checks reason text with `.toContain()` | Weak assertion (text match), but the rendering code at `process-controls.ts:30-37` does render `disabledReason` when present. | **SATISFIED** |
| TC-1.3b | Disabled reason for blocked process action | `process-controls.test.ts` TC-1.3b checks exact text with `.toBe()` | Strong assertion. | **SATISFIED** |

#### AC-1.4: State derives from durable truth, not transient client

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-1.4a | Reload preserves environment truth | `process-work-surface.test.ts` (integration) TC-1.4a: bootstraps, modifies env state via store, re-fetches, asserts state matches | Two independent HTTP GETs against InMemoryPlatformStore. Environment state persists because it's in the store, not the client. Would also work against ConvexPlatformStore since both implement `getProcessEnvironmentSummary`. | **SATISFIED** |

#### AC-1.5: Env absence doesn't hide process identity

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-1.5a | Process visible without environment | `process-work-surface-page.test.ts` TC-1.5a checks process name, status, and type visible when environment is absent | Text-based `.toContain()` assertions — weak but functional. Rendering at `process-work-surface-page.ts:98-140` always renders process section regardless of environment. | **SATISFIED** |

---

### Flow 2: Starting or Resuming with Environment Preparation

#### AC-2.1: Start/resume enters visible preparation state

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-2.1a | Start enters preparation state | `process-actions-api.test.ts` S2-TC-2.1a verifies start returns `environment.state === 'preparing'` then later `ready` | Traced to `process-start.service.ts:58-78` which calls `upsertProcessEnvironmentState({ state: 'preparing' })` then fires `runHydrationAsync`. The state transition is durable (persisted to store) before the response returns. | **SATISFIED** |
| TC-2.1b | Resume enters preparation when env work needed | `process-actions-api.test.ts` S2-TC-2.1b verifies resume returns `environment.state === 'preparing'` | Traced to `process-resume.service.ts:57-77`, same pattern. | **SATISFIED** |

#### AC-2.2: Preparation hydrates current materials into environment

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-2.2a | Current materials hydrate into environment | `process-actions-api.test.ts` S2-HC-1 verifies hydration plan seeded from current materials | Plan is seeded via `planHydrationWorkingSet` at `hydration-planner.ts:10-18` and persisted to Convex via `setProcessHydrationPlan`. InMemoryProviderAdapter's `hydrateEnvironment` receives the plan but ignores its contents (always returns success). A real provider would need to actually hydrate files from the plan. **This means the AC is satisfied at the contract level but untested at the behavior level.** | **SATISFIED** (contract), **WEAKENED** (behavior — provider always succeeds) |
| TC-2.2b | Partial working set hydrates correctly | `process-actions-api.test.ts` S2-HC-2 and S2-HC-3 test empty/partial plans | Verified plan construction handles empty arrays. | **SATISFIED** |

#### AC-2.3: Hydration progress/failure visible without manual refresh

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-2.3a | Hydration progress visible | `process-live.test.ts` TC-2.3a applies environment upsert messages, checks state transitions | Client reducer at `process-live.ts:87-117` correctly applies environment updates. Server publishes via `publishEnvironmentUpsert` at `process-environment.service.ts:230-242`. | **SATISFIED** |
| TC-2.3b | Hydration failure visible | `process-live.test.ts` TC-2.3b checks failed state with blockedReason | Server publishes failed environment at `process-environment.service.ts:254-271`. | **SATISFIED** |

#### AC-2.4: Running doesn't begin until working set ready or failure shown

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-2.4a | Running begins after readiness | `process-live.test.ts` TC-2.4a verifies `preparing` -> `ready` -> `running` sequence | Server calls `transitionProcessToRunning` only after successful hydration at `process-environment.service.ts:236-237`. Then fires `runExecutionAsync` at line 245. | **SATISFIED** |
| TC-2.4b | Running doesn't begin after failed prep | `process-live.test.ts` TC-2.4b verifies failed state stays failed | Server takes `else` branch at line 253 on hydration error, sets `state: 'failed'`. Never calls `transitionProcessToRunning`. | **SATISFIED** |

#### AC-2.5: Read-only vs writable sources distinguishable

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-2.5a | Writable source identifiable | `process-materials-section.test.ts` checks `accessMode: 'read_write'` renders | Rendering at `process-materials-section.ts:169-172` shows access mode. Weak assertion (`.toContain()`). | **SATISFIED** |
| TC-2.5b | Read-only source identifiable | Same file checks `accessMode: 'read_only'` | Same rendering path. | **SATISFIED** |

---

### Flow 3: Controlled Execution

#### AC-3.1: Execution beginning and running state visible

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-3.1a | Running execution state visible | `process-live-updates.test.ts` TC-3.1a verifies `environment.state === 'running'` published after hydration | Server `executeExecution` at `process-environment.service.ts:356-377` upserts `state: 'running'` and publishes. | **SATISFIED** |

#### AC-3.2: Execution activity as coherent process-facing updates

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-3.2a | Execution activity is process-facing | `process-environment-panel.test.ts` TC-3.2a checks panel renders coherent label | Client renders `statusLabel` from environment summary. Server produces label via Convex `buildEnvironmentSummaryFromRow` at `processEnvironmentStates.ts:83-96`. **However:** the "execution activity" itself is not tested. InMemoryProviderAdapter's `executeScript` returns immediately with success — no process-facing events are emitted during execution. The spec says "coherent process-facing updates" but only environment state transitions are tested, not execution progress. | **SATISFIED** (state transitions), **WEAKENED** (no real execution activity tested) |
| TC-3.2b | Browser doesn't reconstruct raw fragments | `process-environment-panel.test.ts` TC-3.2b checks panel shows state label, not raw data | Client uses `statusLabel` not raw state. | **SATISFIED** |

#### AC-3.3: Distinguishes preparation, running, waiting, checkpointing, settled

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-3.3a | Waiting distinct from running | `process-live.test.ts` TC-3.3a verifies process status `waiting` while environment still `running` | Client reducer correctly keeps process and environment lifecycle separate. | **SATISFIED** |
| TC-3.3b | Checkpointing distinct from running | `process-live-updates.test.ts` TC-3.3b verifies execution success publishes `checkpointing` | Server `executeExecution` transitions to `checkpointing` at line 402. | **SATISFIED** |

#### AC-3.4: Execution failure leaves surface legible

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-3.4a | Failure leaves surface legible | `process-live-updates.test.ts` TC-3.4a verifies failed state with process still visible, controls recomputed | Server publishes failed environment with recomputed controls. Client test `process-live.test.ts` TC-3.4a checks history preserved, controls updated. | **SATISFIED** |

---

### Flow 4: Checkpointing

#### AC-4.1: Artifact outputs checkpoint to durable state

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-4.1a | Durable artifact output persists | `process-live-updates.test.ts` TC-4.1a verifies checkpoint result published. Convex `processEnvironmentStates.test.ts` verifies durable storage of lastCheckpointResult. | **BUT:** `persistCheckpointArtifacts` in `convex/artifacts.ts:71` executes `void artifact.contents` — the content string is explicitly discarded. Only metadata (artifactId, targetLabel, producedAt) is persisted to the `artifacts` table. The `artifactsTableFields` schema has no `contents` field. See BLOCKING FINDING #1. | **WEAKENED** — metadata persists, content does not |
| TC-4.1b | Artifact recoverable after reopen | `processEnvironmentStates.test.ts` TC-4.1b verifies lastCheckpointResult survives across reads | This tests the checkpoint RECORD, not the artifact CONTENT. | **SATISFIED** (record), **WEAKENED** (content) |

#### AC-4.2: Code work checkpoints to canonical source

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-4.2a | Writable source code checkpoint succeeds | `process-actions-api.test.ts` TC-4.2a verifies checkpoint planner includes writable targets | Planner at `checkpoint-planner.ts:18-40` correctly filters by `read_write` access mode. **However:** `StubCodeCheckpointWriter` at `code-checkpoint-writer.ts:8-21` always returns success without doing anything. No real Git write occurs. | **SATISFIED** (planning), **STUBBED** (write) |
| TC-4.2b | Code checkpoint result is process-visible | `process-environment-panel.test.ts` TC-4.2b checks source and ref rendered | Rendering works against fixture data. | **SATISFIED** |

#### AC-4.3: Read-only sources cannot receive checkpoint

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-4.3a | Read-only source excluded from checkpoint | `process-actions-api.test.ts` TC-4.3a verifies planner excludes read_only sources | `checkpoint-planner.ts:28-33` filters by `sourceAccessModes[target.sourceAttachmentId] === 'read_write'`. Tested with specific assertion showing empty `codeTargets`. | **SATISFIED** |

#### AC-4.4: Checkpoint result visible with target details

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-4.4a | Artifact checkpoint visible | `process-environment-panel.test.ts` TC-4.4a checks badge and label rendered | Text assertion with `.toContain()` — weak but functional. | **SATISFIED** |
| TC-4.4b | Code checkpoint visible with ref | `process-environment-panel.test.ts` TC-4.4b checks source and ref | Text assertion. | **SATISFIED** |

#### AC-4.5: Checkpoint failure shown with recovery path

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-4.5a | Artifact checkpoint failure shown | `process-environment-panel.test.ts` TC-4.5a checks failure badge and reason | Text assertion. | **SATISFIED** |
| TC-4.5b | Code checkpoint failure shown | `process-live-updates.test.ts` TC-4.5b verifies failed checkpoint published with failureReason | Uses `expect.any(String)` for failureReason — weak assertion. | **SATISFIED** (weakly) |

---

### Flow 5: Recovery

#### AC-5.1: Distinguishes stale, failed, lost, rebuilding, unavailable

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-5.1a | Stale is distinct | `process-controls.test.ts` TC-1.1g (cross-referenced) renders stale correctly | **Stale is only set via direct store call or fixture.** There is no runtime mechanism that computes a fingerprint and transitions to stale when canonical materials change. See NON-BLOCKING WARNING. | **SATISFIED** (rendering), **NOT IMPLEMENTED** (detection) |
| TC-5.1b | Lost is distinct | `process-controls.test.ts` TC-1.1h | Controls render correctly for lost state. | **SATISFIED** |

#### AC-5.2: Rehydrate refreshes recoverable working copy

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-5.2a | Rehydrate refreshes stale copy | `process-actions-api.test.ts` TC-5.2a | Server `rehydrate()` at `process-environment.service.ts:79-108` validates rehydrate is available, transitions to `rehydrating`, fires async rehydrate. InMemoryProviderAdapter returns immediate success. | **SATISFIED** (contract), **STUBBED** (provider) |
| TC-5.2b | Rehydrate updates visible state | `process-live.test.ts` TC-5.2b checks checkpoint preserved during rehydrate | Client reducer correctly preserves checkpoint context when environment transitions. | **SATISFIED** |

#### AC-5.3: Rebuild reconstructs from canonical materials

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-5.3a | Rebuild replaces lost environment | `process-actions-api.test.ts` TC-5.3a | Server `rebuild()` validates state, transitions to `rebuilding`, fires async rebuild. | **SATISFIED** |
| TC-5.3b | Rebuild doesn't depend on prior copy | `process-actions-api.test.ts` TC-5.3b checks new environmentId assigned | Uses `expect.any(String)` — weak but confirms new ID generated. | **SATISFIED** |

#### AC-5.4: Recovery preserves durable state

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-5.4a | Durable artifacts survive rebuild | `process-live.test.ts` TC-5.4b (note: test covers rebuild) checks checkpoint preserved | Client reducer preserves `lastCheckpointResult` across rebuilding state. Server preserves durable data because rebuild only touches environment state, not process/artifact state. | **SATISFIED** |
| TC-5.4b | Durable code persistence survives rebuild | Same — checkpoint result in Convex `processEnvironmentStates` table is independent of rebuild | Verified. | **SATISFIED** |

#### AC-5.5: Missing prerequisites shown as blocked

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-5.5a | Rebuild blocked by missing prerequisite | `process-actions-api.test.ts` verifies 422 `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING` | Server calls `hasCanonicalRecoveryMaterials()` at `process-environment.service.ts:128-136`. **BUT:** See BLOCKING FINDING #2 — InMemoryPlatformStore returns `true` for uninitialized processes where ConvexPlatformStore would return `false`. | **WEAKENED** — tested against wrong store behavior |
| TC-5.5b | Rehydrate blocked when rebuild required | `process-actions-api.test.ts` verifies 409 `PROCESS_ENVIRONMENT_NOT_RECOVERABLE` | Assertion at `process-environment.service.ts:94-99` checks state. | **SATISFIED** |

---

### Flow 6: Return Later and Degraded Operation

#### AC-6.1: Reopen restores durable state

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-6.1a | Reopen restores durable state | `process-work-surface.test.ts` (integration) TC-6.1a creates checkpoint, re-fetches, verifies checkpoint present | Strong integration test with two independent GETs. | **SATISFIED** |

#### AC-6.2: Environment absence doesn't erase durable work

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-6.2a | Durable work remains after environment absence | `process-work-surface.test.ts` (integration) TC-6.2a modifies env to absent, re-fetches, checkpoint still present | Checkpoint stored in `processEnvironmentStates` table, environment state stored separately. | **SATISFIED** |

#### AC-6.3: Live update failure doesn't prevent durable surface

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-6.3a | Durable surface usable when live fails | `process-work-surface-page.test.ts` TC-6.3a renders with `liveConnectionState: 'disconnected'`, verifies process/history/materials visible | Client renders from durable bootstrap data when live connection is down. | **SATISFIED** |

#### AC-6.4: Reopen doesn't duplicate history or restate old checkpoints

| TC | Spec Requirement | Disproof Attempt | Verdict |
|----|------------------|------------------|---------|
| TC-6.4a | Finalized history not duplicated | `process-work-surface.test.ts` (integration) TC-6.4a appends history, re-fetches, checks no duplication via Set size | Strong assertion. | **SATISFIED** |
| TC-6.4b | Prior checkpoint not falsely restated | `process-work-surface.test.ts` (integration) TC-6.4b verifies checkpoint completedAt unchanged across reopens | Strong assertion comparing timestamps. | **SATISFIED** |

---

## BLOCKING_FINDINGS

### FINDING #1: Artifact Content Discarded During Checkpoint Persistence

- **finding:** `convex/artifacts.ts:71` explicitly discards artifact content with `void artifact.contents`. The `artifactsTableFields` schema (lines 9-15) has no `contents` field. When `persistCheckpointArtifacts` is called during the checkpoint flow, only metadata (artifactId, displayName, producedAt) is persisted. The actual artifact output — the bytes the user produced — is thrown away.
- **severity:** CRITICAL
- **confidence:** HIGH
- **evidence:** `convex/artifacts.ts:71` — `void artifact.contents;` followed by `upsertArtifactCheckpoint` at line 73 which only writes `displayName`, `currentVersionLabel: null`, and `updatedAt`. The `checkpointArtifactInputValidator` at line 17-22 accepts `contents: v.string()` but the mutation never stores it.
- **disproof_attempt:** Searched all of `convex/artifacts.ts` for any reference to blob storage, file storage, or content persistence. There is none. The `artifactsTableFields` has exactly 5 fields: `projectId`, `processId`, `displayName`, `currentVersionLabel`, `updatedAt`. No content field exists in the schema (`convex/schema.ts`). Checked InMemoryPlatformStore's `persistCheckpointArtifacts` — same behavior: stores metadata, discards content.
- **impact:** In production, any artifact content generated during controlled execution is silently lost. The checkpoint claims success, the user sees "Checkpoint succeeded", but the actual work product does not persist anywhere. This violates AC-4.1 ("Artifact outputs produced during controlled environment work can checkpoint back to durable artifact state").
- **validation_step:** Add a `contents` (or `storageId`) field to `artifactsTableFields` and verify it's written during checkpoint. Alternatively, document that artifact content storage is deferred to a separate story with a clear storage strategy (Convex file storage, external blob store, etc.).

### FINDING #2: InMemoryPlatformStore.hasCanonicalRecoveryMaterials Returns Wrong Default

- **finding:** `platform-store.ts:1595-1608` — InMemoryPlatformStore returns `true` for processes with no material refs stored, while ConvexPlatformStore (line 949-955) would return `false` for the same scenario. This means recovery path tests pass against InMemoryPlatformStore (rebuild proceeds) when they would fail against Convex (rebuild blocked by "prerequisite missing").
- **severity:** MAJOR
- **confidence:** HIGH
- **evidence:** InMemoryPlatformStore line 1599-1601: `if (materialRefs === undefined && outputs === undefined) { return true; }`. ConvexPlatformStore line 949-955 calls `getCurrentProcessMaterialRefs` which returns `{ artifactIds: [], sourceAttachmentIds: [] }` when no state row exists, making the check `0 > 0 || 0 > 0 → false`.
- **disproof_attempt:** Tried to prove they behave the same. ConvexPlatformStore's `getCurrentProcessMaterialRefs` calls `resolveCurrentProcessMaterialRefs` in `convex/processes.ts` which queries the process-type-specific state table and returns empty arrays when no row exists. InMemoryPlatformStore returns `true` because neither map has an entry. The behavior is definitively different.
- **impact:** TC-5.5a (rebuild blocked by missing prerequisite) may pass in tests but fail differently in production. A process that has never had materials seeded would show as "rebuildable" in tests but would be rejected by Convex with `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING`. The InMemoryPlatformStore also checks `outputs` which the ConvexPlatformStore does not — further divergence.
- **validation_step:** Fix InMemoryPlatformStore to call its own `getCurrentProcessMaterialRefs()` and apply the same logic as ConvexPlatformStore. Remove the `undefined → true` fallback. Re-run tests — any that break reveal tests depending on the wrong behavior.

### FINDING #3: Fire-and-Forget Error Swallowing on Recovery Paths

- **finding:** `process-environment.service.ts:184` and `:193` — both `runRehydrateAsync` and `runRebuildAsync` use `void this.execute...(...).catch(() => {})`, silently swallowing ALL errors including ones that should transition the environment to `failed` state and be visible to the user.
- **severity:** MAJOR
- **confidence:** HIGH
- **evidence:** Line 184: `void this.executeRehydrate(args).catch(() => {});` — Line 193: `void this.executeRebuild(args).catch(() => {});`. If `executeRehydrate` or `executeRebuild` throws an unexpected error (not the ones handled inside those methods), the catch discards it. No state transition occurs. No publication to the client. The environment stays in `rehydrating` or `rebuilding` forever from the user's perspective.
- **disproof_attempt:** Checked whether `executeRehydrate` and `executeRebuild` have their own internal error handling. They do — both have try/catch blocks that publish failure states. But those internal handlers can themselves throw (e.g., if `upsertProcessEnvironmentState` fails during error handling, or if `publishRecoveryFailure` throws). The outer `catch(() => {})` would swallow that secondary failure.
- **impact:** If the error-handling code path itself fails (database unavailable during error recovery), the user sees a permanent "Rehydrating..." or "Rebuilding..." state with no way to know it's stuck. This violates AC-5.2/AC-5.3 (surface shows failure and recovery path) and AC-5.5 (doesn't falsely present ready state — it falsely presents in-progress state instead).
- **validation_step:** Replace `catch(() => {})` with `catch((err) => { /* log error, attempt final state transition to 'failed' or 'unavailable' */ })`. Add a test that simulates the inner error handler itself throwing.

---

## NONBLOCKING_WARNINGS

### WARNING #1: StubCodeCheckpointWriter Masks Real Code Persistence

- **finding:** `code-checkpoint-writer.ts:8-21` — StubCodeCheckpointWriter always returns `{ outcome: 'succeeded' }` regardless of input. All checkpoint tests that exercise the code path use this stub.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** Line 17-18: `return { outcome: 'succeeded' }`. The `FailingCodeCheckpointWriter` exists for failure path testing but no intermediate stub validates input arguments.
- **impact:** When a real CodeCheckpointWriter is connected (GitHub API, Git CLI), any assumptions about argument shape, diff format, or target ref validity will be untested. Not blocking because the tech design explicitly gates GitHub write implementation on research (tech-design-server.md: "Research-gated additions: GitHub writes").
- **validation_step:** Document the stub boundary clearly. When implementing the real writer, add contract tests that validate the StubCodeCheckpointWriter's interface matches the real one.

### WARNING #2: Client Test Suite Relies Heavily on `.toContain()` Text Assertions

- **finding:** `process-work-surface-page.test.ts`, `process-environment-panel.test.ts`, and `process-materials-section.test.ts` overwhelmingly use `.toContain()` for assertions, checking text presence rather than DOM structure or specific element attributes.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `process-work-surface-page.test.ts` has ~40 tests almost exclusively using `.toContain()`. `process-environment-panel.test.ts` has 5 tests all using `.toContain()` or `.not.toBeNull()`. These assertions would pass even if the text appeared in the wrong element, in an error message, or in a completely different section of the page.
- **impact:** A refactoring that moves text to the wrong section, renders it in an invisible element, or nests it incorrectly would not be caught. These tests prove content is rendered somewhere but not that it's rendered correctly. Not blocking because the client rendering is vanilla DOM manipulation with simple structures.
- **validation_step:** No immediate action needed. Consider strengthening when the client layer moves to a component framework with proper testing utilities.

### WARNING #3: Stale Detection Not Runtime-Implemented

- **finding:** The epic spec defines `stale` as a runtime-detectable state (TC-1.1g, AC-5.1), but no code computes working-set fingerprints or transitions to stale based on canonical material drift. The `workingSetFingerprint` field exists in the Convex schema but is always `null`.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `processEnvironmentStates.ts:56` defines `workingSetFingerprint: v.union(v.string(), v.null())`. The `upsertProcessEnvironmentState` mutation at line 192-193 hardcodes `workingSetFingerprint: null` on insert. The tech design mentions fingerprinting (Q6: "working-set fingerprint — SHA-256 digest of canonical inputs") but no implementation computes or compares fingerprints.
- **impact:** Environments will never automatically become stale. Users must manually detect staleness and trigger rehydrate/rebuild. This is acknowledged in the tech design as a research-gated feature, but the spec's AC-5.1 language implies runtime detection.
- **validation_step:** Document that stale detection is deferred. The rendering and control paths for stale are implemented and tested; only the detection trigger is missing.

### WARNING #4: Tautological Test in Foundation Contracts

- **finding:** `process-foundation-contracts.test.ts:29` — `expect(processSurfaceControlOrder).toEqual(stableProcessControlOrderFixture)` asserts a constant equals a fixture that was derived from the same constant.
- **severity:** MINOR
- **confidence:** HIGH
- **evidence:** `processSurfaceControlOrder` is exported from `process-work-surface.ts:73-81`. `stableProcessControlOrderFixture` in `process-controls.ts` fixture is the same array. The test asserts they're equal, which is trivially true and catches nothing.
- **impact:** Zero regression detection value. If the order changes in production code, the fixture would need to be updated too (or the other tests would already fail). No blocking impact.
- **validation_step:** Remove or repurpose the assertion.

### WARNING #5: `expect.any(String)` Used for Critical Values

- **finding:** Several tests use `expect.any(String)` for fields like `historyItemId`, `environmentId`, and `failureReason` where specific value assertions would catch more regressions.
- **severity:** MINOR
- **confidence:** MEDIUM
- **evidence:** `process-actions-api.test.ts:641` (historyItemId), `process-actions-api.test.ts:1404` (environmentId), `process-live-updates.test.ts:1245` (failureReason), `code-checkpoint-writer.test.ts:33` (failureReason).
- **impact:** These assertions pass for ANY non-null string. An implementation that returns wrong IDs or empty reasons would not be caught.
- **validation_step:** Replace with `.toMatch(/^env-/)` or specific expected values where deterministic.

---

## CROSS_STORY_INTEGRATION_GAPS

### GAP #1: Start-to-Checkpoint-to-Recovery Full Chain

**Status:** COVERED. Integration test "drives full start-checkpoint-loss-rebuild-reopen chain" in `process-work-surface.test.ts` exercises the complete lifecycle. Verified it calls start, waits for checkpoint, simulates loss, triggers rebuild, and verifies reopen.

### GAP #2: Live Updates During Recovery

**Status:** COVERED. `process-live-updates.test.ts` includes "publishes rehydrating transition with recomputed summary" and "publishes rebuilding transition with recomputed summary" which verify live publications during recovery.

### GAP #3: Checkpoint Result Surviving Environment Transitions

**Status:** COVERED. `process-live.test.ts` TC-5.2b and TC-5.4b verify checkpoint results survive rehydrate and rebuild transitions in the client reducer.

### GAP #4: Materials Refresh After Checkpoint

**Status:** PARTIALLY COVERED. The server code at `process-environment.service.ts:591-601` calls `readMaterials()` and publishes after artifact checkpoint. The client `process-live.test.ts` has "refreshes materials after artifact checkpoint" which verifies reducer behavior. But the test feeds a fabricated materials message — it does not verify the server actually emits the materials publication. The integration test covers the HTTP path but not the live publication path.

---

## ARCHITECTURE_DRIFT

### Drift #1: `rehydrating` State — RESOLVED

The initial Codex reviewer flagged `rehydrating` as undocumented. **This is incorrect.** The epic spec includes `rehydrating` at epic.md:167 (TC-1.1c.1) and in the Environment Summary data contract at epic.md:584. The implementation matches the spec. No drift.

### Drift #2: Provider Interface — MINOR DRIFT

The tech design (tech-design-server.md) defines 7 methods on `EnvironmentProviderAdapter`: `ensureEnvironment`, `hydrateEnvironment`, `executeScript`, `collectCheckpointCandidate`, `rehydrateEnvironment`, `rebuildEnvironment`, `teardownEnvironment`.

The implementation at `provider-adapter.ts:21-37` defines 5 methods: `hydrateEnvironment`, `executeScript`, `collectCheckpointCandidate`, `rehydrateEnvironment`, `rebuildEnvironment`.

**Missing:** `ensureEnvironment` (folded into `hydrateEnvironment` which returns `environmentId`), `teardownEnvironment` (noted as out of scope in the epic). This is a reasonable simplification documented in the epic scope section.

### Drift #3: Module Boundary for Readers — NO DRIFT

Tech design says `EnvironmentSectionReader` and `MaterialsSectionReader` live under `readers/`. Implementation matches at `apps/platform/server/services/processes/readers/`.

### Drift #4: `providerKind` Allows Null — INTENTIONAL

`processEnvironmentStates.ts:51` allows `v.null()` for `providerKind`. The tech design says `'daytona' | 'local'`. The null is used for the initial `absent` row when no provider has been selected. This is a pragmatic schema extension documented in the nit-fix report (item 14).

---

## BOUNDARY_INVENTORY

| Boundary | Type | Status | Production Risk |
|----------|------|--------|-----------------|
| `ProviderAdapter` (environment lifecycle) | Interface | **STUBBED** — `InMemoryProviderAdapter` always succeeds | HIGH — Real Daytona/local provider will introduce latency, failure modes, and partial results not tested |
| `CodeCheckpointWriter` (Git writes) | Interface | **STUBBED** — `StubCodeCheckpointWriter` always succeeds | MEDIUM — Real Git operations can fail from auth, conflicts, network. Explicitly research-gated. |
| `PlatformStore` (Convex vs InMemory) | Interface | **DUAL IMPL** — ConvexPlatformStore and InMemoryPlatformStore both exist | MEDIUM — Behavioral divergence on `hasCanonicalRecoveryMaterials`. See BLOCKING FINDING #2. |
| `fake_convex_context.ts` (Convex test helper) | Test Helper | **SIMPLIFIED** — No index semantics, auto-detects sort field, cross-table `.get()` | LOW — Only used for Convex function unit tests. Real Convex behavior tested implicitly when ConvexPlatformStore runs against Convex dev. |
| HTTP/WebSocket transport | Real | **IMPLEMENTED** — Fastify routes, WebSocket upgrade | LOW — Real transport in use. |
| Auth (WorkOS) | Interface | **STUBBED** in tests via mock session | LOW — Auth boundary unchanged from Epic 2. |
| Artifact content storage | **NOT IMPLEMENTED** | See BLOCKING FINDING #1 | CRITICAL — Content is accepted but discarded. |

---

## TEST_QUALITY_AUDIT

### Strong Test Files (Specific values, behavioral assertions)
- `process-work-surface.test.ts` (integration) — 6 tests, all with `.toMatchObject()` on specific fields, `.toEqual()` on counts, cross-fetch verification
- `processEnvironmentStates.test.ts` — 4 tests, specific checkpoint data assertions
- `processes.test.ts` — 3 tests, exact ref matching, boundary protection
- `processOutputs.test.ts` — 3 tests, dedup and replacement assertions
- `processSideWorkItems.test.ts` — 3 tests, ordering and boundary protection
- `process-live.test.ts` — 30 tests, strong state transition assertions with `.toMatchObject()` and `.toBe()`
- `script-execution.service.test.ts` — 2 tests, exact arg and result matching

### Adequate Test Files (Mix of strong and weak assertions)
- `process-actions-api.test.ts` — 36 tests, mostly `.toMatchObject()`, 2 instances of `expect.any(String)`
- `process-live-updates.test.ts` — 14 tests, mostly strong, 1 `expect.any(String)`
- `process-work-surface-api.test.ts` — 15 tests, all `.toMatchObject()` or `.toEqual()`
- `process-controls.test.ts` — 17 tests, strong `.toBe()` assertions on disabled state, weak `.not.toBeNull()` in 2 places
- `code-checkpoint-writer.test.ts` — 2 tests, 1 `expect.any(String)`

### Weak Test Files (Predominantly text-based assertions)
- `process-work-surface-page.test.ts` — 36 tests, ~90% use `.toContain()` only
- `process-environment-panel.test.ts` — 5 tests, all `.toContain()` or `.not.toBeNull()`
- `process-materials-section.test.ts` — 3 tests, all `.not.toBeNull()` or `.toContain()`
- `process-response-composer.test.ts` — 2 tests, `.toBeNull()` and `.toContain()`

### Foundation/Fixture Tests (Low value)
- `process-foundation-contracts.test.ts` — 5 tests, includes tautological assertion and fixture-shape checks

### Test Count Summary
- **Total:** 280 tests (13 Convex + 106 server + 152 client + 9 integration)
- **Strong assertions:** ~160 tests
- **Weak assertions:** ~50 tests (primarily client page/panel tests)
- **Adequate:** ~65 tests
- **Tautological:** 1 test
- **Skipped/pending:** 0
- **E2E:** 0 (scaffolded, not executable)

---

## PRODUCTION_PATH_ANALYSIS

### What Works Only on InMemoryPlatformStore

1. **Recovery material detection:** InMemoryPlatformStore returns `true` for uninitialized processes; ConvexPlatformStore returns `false`. Tests for TC-5.5a pass but would behave differently on Convex. (BLOCKING #2)

2. **Hydration plan round-trip:** After the nit-fix batch, hydration plans ARE persisted to Convex via `setProcessHydrationPlan`. This was fixed. Verified in `processEnvironmentStates.test.ts`.

### What Works Only with InMemoryProviderAdapter

3. **Hydration always succeeds:** Real providers may fail to hydrate, return partial results, or timeout. Only `FailingProviderAdapter` is tested for the failure path — no partial failure.

4. **Execution always succeeds:** `InMemoryProviderAdapter.executeScript` returns immediate success. Real execution would have timeouts, streaming output, and partial progress.

5. **Checkpoint candidate always well-formed:** Real providers may return empty artifacts, malformed diffs, or candidates for read-only sources.

### What Works Only with StubCodeCheckpointWriter

6. **Code checkpoint always succeeds:** Real Git operations fail from authentication, merge conflicts, branch protection, network errors.

---

## UNRESOLVED

1. **Artifact content storage strategy** — The schema has no field for content. The mutation accepts content but discards it. No tech design question addresses where content bytes go. This needs a design decision before the checkpoint flow can claim to persist actual work.

2. **Stale detection mechanism** — The spec describes stale as a meaningful state but no runtime code detects it. The tech design identifies fingerprinting as the approach but no implementation exists. Deferred is acceptable, but the boundary should be explicitly documented.

3. **E2E test suite** — Scaffolded but not executable. Acceptable for epic delivery but creates verification gap for browser-to-server integration.

---

## WHAT_ELSE

1. **The `void artifact.contents` line is suspicious.** This is the kind of line that passes code review because it "handles" the variable (no unused-variable lint warning) while doing nothing. In a codebase with TypeScript strict mode, this is a deliberate choice to accept content and throw it away. Either the team knew content storage was deferred and left a breadcrumb, or someone forgot to implement it. Either way, the checkpoint flow claims success while discarding the user's actual work product.

2. **The fire-and-forget pattern is systematic.** Three separate async methods use `void promise.catch(() => {})`. This isn't a one-off oversight — it's a pattern the team adopted. The inner try/catch blocks in `executeRehydrate` and `executeRebuild` handle expected failures, but the outer catch handles unexpected ones by ignoring them. In a system that promises "the process surface shows the failure and the next recovery path" (AC-5.5), silently swallowing errors is architecturally hostile to the spec's guarantees.

3. **The InMemoryPlatformStore's `hasCanonicalRecoveryMaterials` default was an intentional choice** (line 1599 comment: "no explicit signal — treat as present"). This suggests the team knowingly chose to make the test path more permissive than the production path. The comment reads like a pragmatic workaround during development, but it creates a real behavioral divergence that should not ship.

4. **The nit-fix batch addressed real issues** but the three major findings from the initial Codex review (working-set persistence, stale detection, execution lifecycle) were only partially addressed. Item 12 (Convex hydration-plan persistence) was fixed. Items 1 and 3 remain.

5. **The test coverage numbers look good (280 tests) but the distribution is skewed.** 152 of 280 tests are client-side, and ~50 of those use weak assertions. The server and Convex layers have strong tests but there are only 9 integration tests covering the full stack. The ratio should concern anyone betting on these tests catching regressions.

6. **The `FailingProviderAdapter` and `FailingCodeCheckpointWriter` are well-designed** for testing complete failure paths. What's missing is a "flaky" adapter that sometimes fails, returns partial results, or times out — the failure modes that actually occur in production.

7. **The Convex `fake_convex_context.ts` has a `.get()` method that searches all tables.** This means a test could accidentally find a row from the wrong table by ID and not notice. Real Convex requires table-scoped gets. This hasn't caused a visible problem yet but it's a lurking test correctness issue.

---

## VERDICT JUSTIFICATION

**REVISE**, not BLOCK, because:

- The gate passes. All 280 tests pass. The build is clean.
- The architecture is sound and matches the tech design with minor, justified drift.
- The spec coverage is high — every AC has at least one test, every TC has at least one assertion.
- The three blocking findings are real but bounded: they affect checkpoint content durability, one test-production behavioral divergence, and error recovery reliability. None of them cause data corruption in the current codebase because the stubbed boundaries prevent real data from flowing through the affected paths.

**REVISE**, not SHIP, because:

- The artifact content discard is a silent data loss vector that will become critical the moment a real provider is connected.
- The InMemoryPlatformStore behavioral divergence means the recovery prerequisite check has never been tested against production semantics.
- The fire-and-forget error swallowing creates permanent stuck states that no user can recover from if the error handler itself fails.

These three findings are fixable without architectural changes. Fix them, re-run the gate, and this epic ships.
