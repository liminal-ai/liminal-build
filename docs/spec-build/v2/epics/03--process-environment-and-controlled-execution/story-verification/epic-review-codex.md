VERDICT: REVISE

**CROSS_STORY_FINDINGS**
- Start/resume, async hydration, and recovery do not compose on the live Convex-backed path. `ProcessStartService` and `ProcessResumeService` seed a `WorkingSetPlan`, but `ConvexPlatformStore` never persists or reloads it, so `ProcessEnvironmentService.executeHydration()` falls back to an empty plan. Evidence: `apps/platform/server/services/processes/process-start.service.ts:51-67`, `apps/platform/server/services/projects/platform-store.ts:799-807`, `apps/platform/server/services/processes/environment/process-environment.service.ts:187-202`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:233-244`.
- Recovery depends on `stale` being a real derived state, but the working-set fingerprint exists only as schema shape and is never written or compared. `stale` is therefore a seeded/manual state, not an integrated outcome of canonical drift. Evidence: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md:312-339`, `convex/processEnvironmentStates.ts:42-52`, `convex/processEnvironmentStates.ts:160-170`, `convex/processes.ts:263-272`.
- Reopen/degraded tests are good at surface restoration, but they mostly seed durable state rather than drive one end-to-end chain from start -> execute -> checkpoint -> lose/recover -> reopen. That makes the epic gate stronger on rendering and reducer behavior than on whole-flow production behavior. Evidence: `tests/integration/process-work-surface.test.ts:196-487`.

**ARCHITECTURE_FINDINGS**
- The execution contract is materially thinner than the approved tech design. The design expects execution to return process status, history items, output writes, side-work writes, and checkpoint candidates; the implementation only returns `succeeded|failed` plus timestamps, and the orchestration layer only flips environment states. Evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:15-23`, `apps/platform/server/services/processes/environment/process-environment.service.ts:359-443`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md:564-570`.
- Shared contracts drifted from the epic by adding `rehydrating` as a first-class environment state. That state now affects server control logic, client checkpoint-preservation logic, and Convex validation even though the epic and tech design only define `absent`, `preparing`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, and `unavailable`. Evidence: `apps/platform/shared/contracts/process-work-surface.ts:83-110`, `apps/platform/server/services/processes/process-work-surface.service.ts:97-151`, `apps/platform/client/app/process-live.ts:90-92`, `apps/platform/client/app/bootstrap.ts:341-345`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:135-174`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:582-588`.

**BOUNDARY_INVENTORY_STATUS**

| boundary | status | assessment |
|---|---|---|
| `DaytonaProviderAdapter` | STUBBED (KNOWN) | App startup still defaults to `InMemoryProviderAdapter`; no real Daytona adapter implementation is present. Evidence: `apps/platform/server/app.ts:130-140`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/pre-verification-cleanup.md:45-46`. |
| `LocalProviderAdapter` | STUBBED (KNOWN) | Same provider boundary status as Daytona: no real local adapter ships in the tree; provider behavior remains test/in-memory. Evidence: `apps/platform/server/app.ts:130-140`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/pre-verification-cleanup.md:45-46`. |
| Real GitHub code checkpoint writer | STUBBED (KNOWN) | The default writer is still `StubCodeCheckpointWriter`; no `@octokit/rest` integration exists in source. Evidence: `apps/platform/server/app.ts:133-140`, `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/pre-verification-cleanup.md:48-49`. |
| Real Convex canonical-material recovery query | STUBBED (KNOWN) | `ConvexPlatformStore.hasCanonicalRecoveryMaterials()` always returns `true`, so missing-prerequisite rejection is not real on the live Convex path. Evidence: `apps/platform/server/services/projects/platform-store.ts:876-878`. |

**AC_TC_MATRIX**

| ID | Status | Evidence / note |
|---|---|---|
| AC-1.1 | SATISFIED | Bootstrap + control matrix coverage exists at server and client layers. Evidence: `tests/service/server/process-work-surface-api.test.ts:214`, `tests/service/client/process-controls.test.ts:71`. |
| TC-1.1a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:214`, `tests/service/client/process-work-surface-page.test.ts:310`. |
| TC-1.1b | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:276`, `tests/service/client/process-work-surface-page.test.ts:339`. |
| TC-1.1c | SATISFIED | `tests/service/client/process-controls.test.ts:71`. |
| TC-1.1d | SATISFIED | `tests/service/client/process-controls.test.ts:81`. |
| TC-1.1e | SATISFIED | `tests/service/client/process-controls.test.ts:89`. |
| TC-1.1f | SATISFIED | `tests/service/client/process-controls.test.ts:98`. |
| TC-1.1g | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:322`, `tests/service/client/process-controls.test.ts:108`. |
| TC-1.1h | SATISFIED | `tests/service/client/process-controls.test.ts:115`. |
| TC-1.1i | SATISFIED | `tests/service/client/process-controls.test.ts:122`. |
| TC-1.1j | SATISFIED | `tests/service/client/process-controls.test.ts:132`. |
| TC-1.1k | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:1086`, `tests/service/client/process-controls.test.ts:142`. |
| AC-1.2 | SATISFIED | Full visible control rendering is stable and durable-summary-driven. Evidence: `tests/service/client/process-controls.test.ts:36-46`. |
| TC-1.2a | SATISFIED | `tests/service/client/process-controls.test.ts:36`. |
| TC-1.2b | SATISFIED | `tests/service/client/process-controls.test.ts:46`. |
| AC-1.3 | SATISFIED | Disabled reasons render as text, not hidden state. Evidence: `tests/service/client/process-controls.test.ts:55-63`. |
| TC-1.3a | SATISFIED | `tests/service/client/process-controls.test.ts:55`. |
| TC-1.3b | SATISFIED | `tests/service/client/process-controls.test.ts:63`. |
| AC-1.4 | SATISFIED | Durable reload behavior is verified. Evidence: `tests/integration/process-work-surface.test.ts:196`. |
| TC-1.4a | SATISFIED | `tests/integration/process-work-surface.test.ts:196`. |
| AC-1.5 | SATISFIED | Absent/lost environment does not hide process state or materials. Evidence: `tests/service/server/process-work-surface-api.test.ts:276`, `tests/service/client/process-work-surface-page.test.ts:365`. |
| TC-1.5a | SATISFIED | `tests/service/client/process-work-surface-page.test.ts:365`. |
| AC-2.1 | SATISFIED | Start/resume enter visible preparation in-session. Evidence: `tests/service/server/process-actions-api.test.ts:813`, `tests/service/client/process-work-surface-page.test.ts:965-1018`. |
| TC-2.1a | SATISFIED | `tests/service/server/process-actions-api.test.ts:813`, `tests/service/client/process-work-surface-page.test.ts:965`. |
| TC-2.1b | SATISFIED | `tests/service/server/process-actions-api.test.ts:877`, `tests/service/client/process-work-surface-page.test.ts:995`. |
| AC-2.2 | VIOLATED | The live Convex path drops the hydration plan and hydrates with empty inputs. Evidence: `apps/platform/server/services/processes/process-start.service.ts:51-67`, `apps/platform/server/services/projects/platform-store.ts:799-807`, `apps/platform/server/services/processes/environment/process-environment.service.ts:187-202`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:233-244`. |
| TC-2.2a | VIOLATED | The accepted start path seeds a plan, but `ConvexPlatformStore` never reloads it for async hydration. Evidence: same as AC-2.2. |
| TC-2.2b | VIOLATED | Partial-working-set handling is only real in `InMemoryPlatformStore`; the live Convex path still hydrates empty arrays. Evidence: same as AC-2.2. |
| AC-2.3 | SATISFIED | Preparation/failure visibility is wired through live upserts. Evidence: `tests/service/client/process-live.test.ts:176-197`, `tests/service/server/process-live-updates.test.ts:414-491`. |
| TC-2.3a | SATISFIED | `tests/service/client/process-live.test.ts:176`. |
| TC-2.3b | SATISFIED | `tests/service/client/process-live.test.ts:197`, `tests/service/server/process-live-updates.test.ts:491`. |
| AC-2.4 | SATISFIED | Running is only entered after hydration success, not on failed preparation. Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:198-244`, `tests/service/client/process-live.test.ts:219-253`. |
| TC-2.4a | SATISFIED | `tests/service/client/process-live.test.ts:219`. |
| TC-2.4b | SATISFIED | `tests/service/client/process-live.test.ts:253`. |
| AC-2.5 | SATISFIED | Source writability is visible in bootstrap and materials rendering. Evidence: `tests/service/server/process-work-surface-api.test.ts:1138-1201`, `tests/service/client/process-materials-section.test.ts:10-32`. |
| TC-2.5a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:1138`, `tests/service/client/process-materials-section.test.ts:21`. |
| TC-2.5b | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:1201`, `tests/service/client/process-materials-section.test.ts:10`. |
| AC-3.1 | SATISFIED | The integrated execution path publishes `running`. Evidence: `tests/service/server/process-live-updates.test.ts:649`, `tests/service/client/process-live.test.ts:511`. |
| TC-3.1a | SATISFIED | `tests/service/server/process-live-updates.test.ts:649`. |
| AC-3.2 | UNRESOLVED | The browser normalizes typed current objects, but the server execution path does not emit process-facing execution artifacts/history/side-work from real execution. Evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:15-23`, `apps/platform/server/services/processes/environment/process-environment.service.ts:359-443`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:306-317`. |
| TC-3.2a | UNRESOLVED | Fixture/manual-message tests prove reducer behavior, not a server-produced execution activity stream. Evidence: `tests/service/client/process-live.test.ts:279-347`, contrasted with `apps/platform/server/services/processes/environment/process-environment.service.ts:359-443`. |
| TC-3.2b | SATISFIED | Live messages are typed current objects, not raw fragments. Evidence: `apps/platform/shared/contracts/live-process-updates.ts:1-96`, `tests/service/server/process-live-updates.test.ts:186`. |
| AC-3.3 | UNRESOLVED | `checkpointing` is real, but the integrated execution path cannot organically transition to `waiting` because the execution contract only returns `succeeded|failed`. Evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:15-23`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:319-329`. |
| TC-3.3a | UNRESOLVED | `waiting` rendering is covered by reducer/fixture tests, but no server execution path can publish it today. Evidence: `tests/service/client/process-live.test.ts:279`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/pre-verification-cleanup.md:54-56`. |
| TC-3.3b | SATISFIED | `checkpointing` is published by the live execution path. Evidence: `tests/service/server/process-live-updates.test.ts:726`, `apps/platform/server/services/processes/environment/process-environment.service.ts:418-443`. |
| AC-3.4 | SATISFIED | Execution failure keeps the process surface legible and exposes recovery controls. Evidence: `tests/service/server/process-live-updates.test.ts:803`, `tests/service/client/process-live.test.ts:320-347`. |
| TC-3.4a | SATISFIED | `tests/service/server/process-live-updates.test.ts:803`, `tests/service/client/process-live.test.ts:320`. |
| AC-4.1 | SATISFIED | Artifact checkpoint persistence is implemented through real store writes. Evidence: `convex/artifacts.ts:53-98`, `tests/service/server/process-live-updates.test.ts:982`, `tests/integration/process-work-surface.test.ts:293`. |
| TC-4.1a | SATISFIED | `tests/service/server/process-live-updates.test.ts:982`. |
| TC-4.1b | SATISFIED | `tests/integration/process-work-surface.test.ts:293`. |
| AC-4.2 | UNRESOLVED | Process-visible code checkpoint results exist, but the canonical GitHub write boundary is still stubbed. Evidence: `apps/platform/server/app.ts:133-140`, `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/pre-verification-cleanup.md:48-49`. |
| TC-4.2a | UNRESOLVED | The app does not actually persist to canonical GitHub truth yet. Evidence: same as AC-4.2. |
| TC-4.2b | SATISFIED | The surface shows source identity and target ref in the latest checkpoint result. Evidence: `tests/service/client/process-environment-panel.test.ts:57`. |
| AC-4.3 | SATISFIED | Read-only sources are excluded from code checkpoint planning. Evidence: `apps/platform/server/services/processes/environment/checkpoint-planner.ts:12-36`, `tests/service/server/process-actions-api.test.ts:1156`, `tests/service/client/process-materials-section.test.ts:32`. |
| TC-4.3a | SATISFIED | `tests/service/server/process-actions-api.test.ts:1156`, `tests/service/client/process-materials-section.test.ts:32`. |
| AC-4.4 | SATISFIED | Latest checkpoint visibility is coherent and latest-only. Evidence: `apps/platform/client/features/processes/process-environment-panel.ts:1-55`, `tests/service/client/process-environment-panel.test.ts:45-57`. |
| TC-4.4a | SATISFIED | `tests/service/client/process-environment-panel.test.ts:45`. |
| TC-4.4b | SATISFIED | `tests/service/client/process-environment-panel.test.ts:57`. |
| AC-4.5 | SATISFIED | Failure is visible with a next recovery path. Evidence: `tests/service/server/process-live-updates.test.ts:1062`, `tests/service/client/process-environment-panel.test.ts:70`. |
| TC-4.5a | SATISFIED | `tests/service/client/process-environment-panel.test.ts:70`. |
| TC-4.5b | SATISFIED | `tests/service/server/process-live-updates.test.ts:1062`. |
| AC-5.1 | UNRESOLVED | The surface can render `stale`, but the implementation never derives/stores a working-set fingerprint or marks an environment stale from canonical drift. Evidence: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md:312-339`, `convex/processEnvironmentStates.ts:42-52`, `convex/processEnvironmentStates.ts:160-170`, `convex/processes.ts:263-272`. |
| TC-5.1a | UNRESOLVED | `stale` is a seeded state today, not an integrated stale-detection outcome. Evidence: same as AC-5.1. |
| TC-5.1b | SATISFIED | `lost` is distinct in rendering and rebuild acceptance. Evidence: `tests/service/client/process-controls.test.ts:115`, `tests/service/server/process-actions-api.test.ts:1261`. |
| AC-5.2 | SATISFIED | Under a recoverable stale/failed precondition, `rehydrate` works and preserves checkpoint context in-session. Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:57-107`, `tests/service/server/process-actions-api.test.ts:1233`, `tests/service/client/process-live.test.ts:443`. |
| TC-5.2a | SATISFIED | `tests/service/server/process-actions-api.test.ts:1233`. |
| TC-5.2b | SATISFIED | `tests/service/client/process-live.test.ts:443`, `tests/service/server/process-live-updates.test.ts:1143`. |
| AC-5.3 | SATISFIED | Rebuild reconstructs from plan inputs and does not depend on prior handle survival. Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:108-166`, `tests/service/server/process-actions-api.test.ts:1261-1289`. |
| TC-5.3a | SATISFIED | `tests/service/server/process-actions-api.test.ts:1261`. |
| TC-5.3b | SATISFIED | `tests/service/server/process-actions-api.test.ts:1289`. |
| AC-5.4 | UNRESOLVED | Artifact durability survives recovery, but real canonical code persistence is still stubbed. Evidence: artifact path `tests/integration/process-work-surface.test.ts:293`; code-write boundary `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`. |
| TC-5.4a | SATISFIED | Artifact state remains visible after reopen/recovery seeding. Evidence: `tests/integration/process-work-surface.test.ts:293`. |
| TC-5.4b | UNRESOLVED | Code durability beyond process-visible latest-result is still blocked by the GitHub writer stub. Evidence: same as AC-5.4. |
| AC-5.5 | UNRESOLVED | Rehydrate-blocked handling is real, but rebuild prerequisite rejection is not trustworthy on live Convex because `hasCanonicalRecoveryMaterials()` is stubbed `true`. Evidence: `apps/platform/server/services/projects/platform-store.ts:876-878`, `tests/service/server/process-actions-api.test.ts:1340`. |
| TC-5.5a | UNRESOLVED | Missing-prerequisite rejection depends on an expected Convex store stub. Evidence: same as AC-5.5. |
| TC-5.5b | SATISFIED | Rehydrate-not-recoverable rejection is implemented and surfaced. Evidence: `tests/service/server/process-actions-api.test.ts:1318`, `tests/service/client/process-work-surface-page.test.ts:1156`. |
| AC-6.1 | SATISFIED | Reopen restores durable process/material/environment/checkpoint state. Evidence: `tests/integration/process-work-surface.test.ts:293-431`. |
| TC-6.1a | SATISFIED | `tests/integration/process-work-surface.test.ts:293`. |
| AC-6.2 | SATISFIED | Last checkpoint result remains visible after the environment is absent. Evidence: `tests/integration/process-work-surface.test.ts:293`. |
| TC-6.2a | SATISFIED | `tests/integration/process-work-surface.test.ts:293`. |
| AC-6.3 | SATISFIED | Durable bootstrap remains usable when live transport fails. Evidence: `tests/service/client/process-work-surface-page.test.ts:694`, `apps/platform/client/app/bootstrap.ts:172-239`. |
| TC-6.3a | SATISFIED | `tests/service/client/process-work-surface-page.test.ts:694`. |
| AC-6.4 | SATISFIED | Reopen does not duplicate finalized history or replay checkpoint results as new work. Evidence: `tests/integration/process-work-surface.test.ts:372-431`, `tests/service/client/process-live.test.ts:391`. |
| TC-6.4a | SATISFIED | `tests/integration/process-work-surface.test.ts:372`. |
| TC-6.4b | SATISFIED | `tests/integration/process-work-surface.test.ts:431`, `tests/service/client/process-live.test.ts:391`. |

**COVERAGE_ASSESSMENT**
- Blind spot: the passing service/integration suites exercise `InMemoryPlatformStore`, not `ConvexPlatformStore`, so the live-store hydration-plan no-op in `apps/platform/server/services/projects/platform-store.ts:799-807` is invisible to the gate.
- Blind spot: stale/recovery coverage is mostly seeded-state coverage. I did not find a test that changes canonical materials, recomputes a fingerprint, and proves the environment becomes `stale` organically.
- Blind spot: execution/live tests verify environment transitions and latest checkpoint visibility, but not a server-produced `waiting`/`completed`/`interrupted` chain from real `executeScript()` output. The current client tests cover those states through manual live-message fixtures.
- Blind spot: reopen coverage validates durable restoration well, but it usually seeds checkpoint state instead of driving a single integrated write -> recovery -> reopen chain.
- Non-TC test presence: the suite contains useful hardening coverage outside the epic taxonomy, including reducer-preservation tests and several extra labels such as `TC-2.6*`, `TC-3.6*`, and `TC-6.5*` in `tests/service/client/process-work-surface-page.test.ts` and `tests/service/server/process-actions-api.test.ts`. Those tests add value, but they also make traceability noisier than the story/test-plan matrix.

**BLOCKING_FINDINGS**
1. finding: Live Convex-backed hydration runs with an empty working set.
   severity: MAJOR
   confidence: HIGH
   evidence: `apps/platform/server/services/processes/process-start.service.ts:51-67`; `apps/platform/server/services/projects/platform-store.ts:799-807`; `apps/platform/server/services/processes/environment/process-environment.service.ts:187-202`; spec `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:233-244`
   impact: The accepted HTTP start/resume path composes correctly only with `InMemoryPlatformStore`. On the real Convex store, current artifacts, outputs, and attached sources are not available to async hydration, so AC-2.2 is broken on the live durable path and downstream recovery work inherits the same gap.
   validation_step: Persist `WorkingSetPlan` in `ConvexPlatformStore`, reload it in `executeHydration()`, and add a test that runs start/resume against the Convex-backed store path rather than the in-memory store.

2. finding: Stale/recovery freshness is not implemented end-to-end.
   severity: MAJOR
   confidence: HIGH
   evidence: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md:312-339`; `convex/processEnvironmentStates.ts:42-52`; `convex/processEnvironmentStates.ts:160-170`; `convex/processes.ts:263-272`; repo-wide `workingSetFingerprint` search only finds null declarations/initializations
   impact: `stale` is currently a fixture/seeded state, not a computed runtime outcome of canonical drift. That leaves TC-5.1a and the real rehydrate-from-drift story unresolved even though the surface can render the state once it exists.
   validation_step: Compute and store a fingerprint on hydration/rebuild, compare it against canonical inputs on bootstrap or material changes, transition to `stale` when it drifts, and add an integration test that drives canonical-input change -> `stale` -> `rehydrate`.

3. finding: The server execution contract cannot produce the process-facing lifecycle the epic and tech design require.
   severity: MAJOR
   confidence: HIGH
   evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:15-23`; `apps/platform/server/services/processes/environment/process-environment.service.ts:359-443`; `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md:564-570`; spec `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:306-325`
   impact: Actual execution can move the environment through `running`, `checkpointing`, and `failed`, but it cannot emit process-facing history, side-work, or `waiting`/`completed`/`interrupted` status transitions from the real execution path. AC-3.2a and TC-3.3a therefore remain fixture-driven rather than end-to-end real.
   validation_step: Expand `ExecutionResult` and `ProcessEnvironmentService` to persist/publish process status, history, side-work, and checkpoint candidates from execution, then add a server live-update test that reaches `waiting` without manual message injection.

**NONBLOCKING_WARNINGS**
1. finding: The implementation introduces an undocumented `rehydrating` environment state.
   severity: MINOR
   confidence: HIGH
   evidence: `apps/platform/shared/contracts/process-work-surface.ts:83-110`; `apps/platform/server/services/processes/process-work-surface.service.ts:97-151`; `apps/platform/client/app/process-live.ts:90-92`; `apps/platform/client/app/bootstrap.ts:341-345`; spec `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:135-174`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:582-588`
   impact: The user-facing contract, control matrix, and durable schema are no longer perfectly aligned. Reviewers and downstream implementers must reason about a state the epic never names.
   validation_step: Either collapse `rehydrating` back into `preparing`, or update the epic, tech design, stories, and tests so the extra state is explicitly sanctioned.

2. finding: The gate is strong on UI/reducer behavior but weak on production-store and whole-chain validation.
   severity: MINOR
   confidence: HIGH
   evidence: `tests/integration/process-work-surface.test.ts:1-487`; `tests/service/server/process-live-updates.test.ts:649-1207`; `tests/service/client/process-live.test.ts:176-826`
   impact: The suite gives high confidence in rendering and live message application, but medium confidence in the real Fastify + Convex durable path and in one-pass start -> execute -> checkpoint -> recover -> reopen behavior.
   validation_step: Add one deep test lane that runs against the Convex-backed store implementation and one end-to-end chain test that exercises write, recovery, and reopen together.

**GATE_RESULT**
`corepack pnpm run verify-all 2>&1 | tail -40`

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  103 passed (103)
   Start at  05:41:22
   Duration  840ms (transform 1.21s, setup 0ms, import 3.24s, tests 1.01s, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  148 passed (148)
   Start at  05:41:23
   Duration  1.18s (transform 1.36s, setup 0ms, import 2.77s, tests 687ms, environment 9.41s)


> liminal-build@ test:integration /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/integration --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  05:41:25
   Duration  426ms (transform 240ms, setup 0ms, import 539ms, tests 135ms, environment 0ms)


> liminal-build@ test:e2e /Users/leemoore/code/liminal-build
> node -e "console.log('SKIP: test:e2e scaffolded in Story 0; no executable suite yet')"

SKIP: test:e2e scaffolded in Story 0; no executable suite yet
```

**WHAT_ELSE**
- No unexpected external stub beyond the documented boundary inventory surfaced in this pass.
- The user-visible surface work is generally solid: controls, checkpoint rendering, live status, degraded bootstrap, and checkpoint latest-result semantics are all coherent.
- I would ship after the live Convex hydration-plan gap is fixed and after we either implement or explicitly de-scope the missing execution/stale-detection behavior. In the current state, the test gate is green, but the epic still has real integration drift in the durable/runtime path.
