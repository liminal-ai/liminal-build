VERDICT: BLOCK

## CROSS_STORY_FINDINGS

### Finding 1
finding: Story 3 never produces the process-facing execution outputs that Stories 4 through 6 depend on.
severity: MAJOR
confidence: HIGH
evidence: `apps/platform/server/services/processes/environment/provider-adapter.ts:15-37`; `apps/platform/server/services/processes/environment/process-environment.service.ts:378-467`; `apps/platform/server/services/processes/environment/process-environment.service.ts:530-746`
disproof_attempt: I searched `ProcessEnvironmentService` for `replaceCurrentProcessOutputs`, `replaceCurrentProcessSideWorkItems`, waiting/completed/interrupted transitions, and current-request writes. The execution path only flips environment state to `running`, `checkpointing`, or `failed`, then optionally runs checkpointing.
impact: Controlled execution cannot produce coherent process-facing activity, waiting states, side work, or output writes from real execution, so Story 3 does not actually feed the downstream checkpoint/reopen stories as designed.
validation_step: Run one real start flow and inspect the durable writes after `executeScript`; only environment-state transitions and a small set of synthetic `process_event` rows should appear.

### Finding 2
finding: The stale/lost recovery story is not reachable from production logic because freshness is modeled but never computed.
severity: MAJOR
confidence: HIGH
evidence: `convex/processEnvironmentStates.ts:49-60`; `convex/processEnvironmentStates.ts:182-210`; `convex/processEnvironmentStates.ts:273-290`
disproof_attempt: I searched the repo for production writes of `state: 'stale'` and `state: 'lost'` and found none outside tests/fixtures. I also traced `workingSetFingerprint` and found it is declared but never written or compared.
impact: Story 5 mostly composes only through seeded durable states and client-side recovery/error patching; real working-copy drift or environment loss will not promote the process into `stale` or `lost` through server-owned logic.
validation_step: Search for `workingSetFingerprint` writes and `state: 'stale'` / `state: 'lost'` transitions; then run a material-change scenario and confirm the environment never becomes stale.

### Finding 3
finding: Writable-source support does not compose from Story 2 into Story 4 on the real Convex path.
severity: MAJOR
confidence: HIGH
evidence: `convex/sourceAttachments.ts:4-22`; `convex/sourceAttachments.ts:40-50`; `apps/platform/shared/contracts/schemas.ts:154-160`; `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-24`
disproof_attempt: I checked whether `accessMode` was persisted or projected anywhere in the real Convex source-attachment module and found that it is not. The shared schema fills the missing field with the default `read_only`, and the checkpoint planner also falls back to `read_only`.
impact: Convex-backed processes cannot durably distinguish writable from read-only sources, so the production path cannot reliably surface `read_write` materials or authorize code checkpointing to attached writable sources.
validation_step: Fetch a process through `ConvexPlatformStore` with a supposedly writable source attachment and inspect the returned materials; `accessMode` will resolve as `read_only` or `undefined`-to-default, not real durable state.

## ARCHITECTURE_FINDINGS

### Finding 4
finding: The shipped app still uses an in-memory fake environment provider as the default runtime implementation.
severity: CRITICAL
confidence: HIGH
evidence: `apps/platform/server/app.ts:130-145`; `apps/platform/server/services/processes/environment/provider-adapter.ts:39-108`; `apps/platform/server/services/processes/environment/`
disproof_attempt: I looked for the tech-design modules that were supposed to close this gap (`environment-orchestrator.ts`, `provider-adapter-registry.ts`, `daytona-provider-adapter.ts`, `local-provider-adapter.ts`) and they do not exist. The only provider implementations in repo are `InMemoryProviderAdapter` and `FailingProviderAdapter`.
impact: Start, resume, hydrate, rehydrate, rebuild, execution, and checkpoint collection are simulated instead of running against a real environment provider, so the epic’s core “controlled execution” promise is not actually delivered.
validation_step: Start a process on `main` without injecting a custom `providerAdapter`; the app will hydrate/execute via `InMemoryProviderAdapter` and create deterministic fake environment ids like `env-mem-*`.

### Finding 5
finding: Canonical code persistence is stubbed and reports success without writing anywhere.
severity: CRITICAL
confidence: HIGH
evidence: `apps/platform/server/app.ts:133-145`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:1-21`; `apps/platform/server/services/processes/environment/process-environment.service.ts:604-680`
disproof_attempt: I searched the repo for any non-test `CodeCheckpointWriter` implementation beyond the stub/failing doubles and found none. The default writer in `createApp()` is `StubCodeCheckpointWriter`, which always returns `{ outcome: 'succeeded' }`.
impact: The feature can claim a successful code checkpoint, persist that visible result, and reopen later showing it, even though no canonical source was ever updated. That breaks AC-4.2, AC-4.4, AC-5.4b, and AC-6.2 in the production path.
validation_step: Instrument `CodeCheckpointWriter.writeFor()` in a normal app boot and confirm no external write happens before a success result is stored in `environment.lastCheckpointResult`.

### Finding 6
finding: Artifact checkpointing drops the artifact contents and only persists summary metadata.
severity: MAJOR
confidence: HIGH
evidence: `apps/platform/server/services/projects/platform-store.ts:904-925`; `apps/platform/server/services/processes/environment/checkpoint-types.ts:3-8`; `convex/artifacts.ts:17-22`; `convex/artifacts.ts:58-88`
disproof_attempt: I traced artifact checkpoint data end to end. The server sends `contents` into Convex, but `convex/artifacts.ts` explicitly discards it with `void artifact.contents` and only updates summary fields plus a linked output row.
impact: Reopen and rebuild can restore the existence of an artifact row, but not the actual artifact output produced in the environment. The epic’s “canonical artifact state” remains metadata-only.
validation_step: Trigger an artifact checkpoint with unique contents, then inspect the Convex artifact/output tables; the contents will not be stored anywhere in repo-visible durable state.

## CONTRACT_CONSISTENCY

| Contract area | Status | Assessment |
|---|---|---|
| `process.controls` on bootstrap and client render | Consistent | Server derives a full control set in `buildProcessSurfaceSummary()` and the client renders from `process.controls`, not `availableActions`. |
| `environment` as bootstrap/live entity | Consistent | The shared contract, route bootstrap, live normalizer, store, and page all thread `environment` through one current-object model. |
| `lastCheckpointResult` latest-only semantics | Mostly consistent | Bootstrap/live/reopen all treat checkpoint visibility as latest-only, but the underlying artifact/code durability behind that summary is incomplete. |
| `source.accessMode` | Inconsistent | Shared contracts require it, client renders it, and checkpoint planning depends on it, but the Convex source-attachment schema/projection never persists or returns it. |
| `statusLabel` | Inconsistent but non-blocking | The contract carries `statusLabel`, but the client recomputes labels from `state` instead of trusting the server value. |
| process vs environment state separation | Consistent at surface level, incomplete at lifecycle level | The UI receives separate `process.status` and `environment.state`, but execution/recovery logic does not produce the full set of environment/process transitions the design expected. |

## BOUNDARY_INVENTORY

| boundary | status | assessment |
|---|---|---|
| Provider adapters | STUBBED | `createApp()` wires `InMemoryProviderAdapter` by default, and the repo has no Daytona/local production adapters or provider registry. |
| Script execution service | PARTIAL | The service exists, but it is a thin pass-through to the fake provider and has no executable script payload/tool-harness protocol. |
| Code-checkpoint writer | STUBBED | The default writer always reports success and no GitHub/canonical-source implementation exists in repo. |
| Artifact checkpoint writer path | PARTIAL | Artifact checkpoint rows and outputs are written durably, but artifact contents are discarded. |
| `ConvexPlatformStore.getProcessEnvironmentSummary` / `upsertProcessEnvironmentState` | INTEGRATED | The real store and new Convex table exist and do carry `environment.state` and latest checkpoint visibility durably. |
| `ConvexPlatformStore` source writability path | MISSING | The real Convex source-attachment schema/projection has no `accessMode`, so production cannot represent writable sources. |
| Working-set freshness / stale detection | MISSING | `workingSetFingerprint` is declared in durable state but never computed or compared. |
| Live environment entity | INTEGRATED | WebSocket snapshot/upsert flow includes `environment`, and the client applies it as a first-class current-object entity. |
| Client controls/environment UI | INTEGRATED | The page renders a stable control set, disabled reasons, an environment panel, and checkpoint results from the shared contract. |

## AC_TC_MATRIX

### Flow 1

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-1.1 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`; `apps/platform/client/features/processes/process-environment-panel.ts:7-65` | First-load bootstrap includes `environment`, and the client renders it directly. |
| TC-1.1a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:214`; `tests/service/client/process-work-surface-page.test.ts:310` | Environment state is visible on first load. |
| TC-1.1b | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:276`; `tests/service/client/process-work-surface-page.test.ts:339` | Absent environments render explicitly. |
| TC-1.1c | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:97-125`; `tests/service/client/process-controls.test.ts:74` | Preparing state disables lifecycle controls while keeping them visible. |
| TC-1.1c.1 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:107-109`; `apps/platform/server/services/processes/process-work-surface.service.ts:198-201` | Rehydrating has distinct disabled-control behavior and a distinct state label. |
| TC-1.1d | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:101-105`; `tests/service/client/process-controls.test.ts:84` | Ready state is rendered distinctly and keeps recovery controls disabled. |
| TC-1.1e | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:109-110`; `tests/service/client/process-controls.test.ts:92` | Running disables recovery actions. |
| TC-1.1f | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:111-112`; `tests/service/client/process-controls.test.ts:101` | Checkpointing is distinct and blocks lifecycle actions. |
| TC-1.1g | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:187-215`; `tests/service/client/process-controls.test.ts:111` | Stale enables `rehydrate` and explains blocked rebuild. |
| TC-1.1h | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:194-195`; `apps/platform/server/services/processes/process-work-surface.service.ts:223-230`; `tests/service/client/process-controls.test.ts:118` | Lost enables `rebuild` and disables `rehydrate` with a reason. |
| TC-1.1i | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:115-118`; `apps/platform/server/services/processes/process-work-surface.service.ts:223-226`; `tests/service/client/process-controls.test.ts:125` | Failed exposes recovery controls without hiding blocked actions. |
| TC-1.1j | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:119-120`; `apps/platform/server/services/processes/process-work-surface.service.ts:247-248`; `tests/service/client/process-controls.test.ts:154` | Rebuilding is visible and blocks lifecycle actions. |
| TC-1.1k | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:121-124`; `apps/platform/server/services/processes/process-work-surface.service.ts:249-252`; `tests/service/client/process-controls.test.ts:164` | Unavailable preserves the surface and explains blocked actions. |
| AC-1.2 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:305-340`; `apps/platform/client/features/processes/process-controls.ts:6-48` | Control order and visibility are derived from a stable shared control list. |
| TC-1.2a | SATISFIED | `tests/service/client/process-controls.test.ts:39` | Stable control order is covered directly. |
| TC-1.2b | SATISFIED | `tests/service/client/process-controls.test.ts:49` | Disabled controls remain visible. |
| AC-1.3 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:83-287`; `apps/platform/client/features/processes/process-controls.ts:37-41` | Disabled reasons are computed server-side and rendered as readable text. |
| TC-1.3a | SATISFIED | `tests/service/client/process-controls.test.ts:58` | Environment-blocked actions show reasons. |
| TC-1.3b | SATISFIED | `tests/service/client/process-controls.test.ts:66` | Process-blocked actions show reasons. |
| AC-1.4 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`; `tests/integration/process-work-surface.test.ts:215` | Reload/reopen uses durable bootstrap state, not client defaults. |
| TC-1.4a | SATISFIED | `tests/integration/process-work-surface.test.ts:215` | Durable reload behavior is covered. |
| AC-1.5 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:385-397`; `tests/service/client/process-work-surface-page.test.ts:365` | Missing/lost environments do not remove process identity/materials. |
| TC-1.5a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:276`; `tests/service/client/process-work-surface-page.test.ts:365` | Core process surface remains visible without an environment. |

### Flow 2

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-2.1 | SATISFIED | `apps/platform/server/services/processes/process-start.service.ts:36-92`; `apps/platform/server/services/processes/process-resume.service.ts:36-93`; `apps/platform/client/app/bootstrap.ts:878-941` | Start/resume move the current session into `preparing` without a reload. |
| TC-2.1a | SATISFIED | `tests/service/server/process-actions-api.test.ts:191`; `tests/service/client/process-work-surface-page.test.ts:965` | Start returns `preparing` in-session. |
| TC-2.1b | SATISFIED | `tests/service/server/process-actions-api.test.ts:232`; `tests/service/client/process-work-surface-page.test.ts:995` | Resume returns `preparing` in-session. |
| AC-2.2 | VIOLATED | `apps/platform/server/services/processes/process-start.service.ts:52-71`; `apps/platform/server/services/processes/process-resume.service.ts:53-72`; `apps/platform/server/services/processes/environment/provider-adapter.ts:44-52` | The server computes a plan, but the shipped provider never hydrates a real working copy from that plan. |
| TC-2.2a | VIOLATED | `apps/platform/server/services/processes/process-start.service.ts:52-71`; `apps/platform/server/services/processes/environment/provider-adapter.ts:44-52` | Current materials are planned, not actually materialized. |
| TC-2.2b | VIOLATED | `apps/platform/server/services/processes/environment/hydration-planner.ts:8-17`; `apps/platform/server/services/processes/environment/provider-adapter.ts:44-52` | Partial working sets are representable in the plan, but the provider ignores the plan entirely. |
| AC-2.3 | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:177-258`; `apps/platform/client/app/process-live.ts:94-112` | Preparation/failure transitions are published live and rendered without refresh. |
| TC-2.3a | SATISFIED | `tests/service/client/process-live.test.ts:176`; `tests/service/server/process-live-updates.test.ts:414` | Preparation progress is visible as environment-state change. |
| TC-2.3b | SATISFIED | `tests/service/client/process-live.test.ts:197`; `tests/service/server/process-live-updates.test.ts:491` | Hydration failure becomes visible live. |
| AC-2.4 | UNRESOLVED | `apps/platform/server/services/processes/environment/process-environment.service.ts:234-245`; `apps/platform/server/services/processes/environment/provider-adapter.ts:44-52` | The sequencing is present, but “ready” is not backed by a real hydrated workspace. |
| TC-2.4a | UNRESOLVED | `apps/platform/server/services/processes/environment/process-environment.service.ts:234-245` | The process moves to `running` after a synthetic `ready`, but repo code cannot prove a real working set is ready. |
| TC-2.4b | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:256-279`; `tests/service/client/process-live.test.ts:253` | Failed preparation does not mark the process/environment as running. |
| AC-2.5 | VIOLATED | `convex/sourceAttachments.ts:4-22`; `convex/sourceAttachments.ts:40-50`; `apps/platform/shared/contracts/schemas.ts:154-160` | The UI can render access modes, but the real Convex path cannot persist or return writable/read-only distinctions. |
| TC-2.5a | VIOLATED | `convex/sourceAttachments.ts:4-22`; `tests/service/server/process-work-surface-api.test.ts:1138` | Writable sources are only represented in seeded InMemory fixtures, not in real Convex data. |
| TC-2.5b | SATISFIED | `apps/platform/client/features/processes/process-materials-section.ts:221-248`; `tests/service/client/process-materials-section.test.ts:10` | Read-only labeling is visible. |

### Flow 3

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-3.1 | UNRESOLVED | `apps/platform/server/services/processes/environment/process-environment.service.ts:394-417`; `apps/platform/server/services/processes/environment/provider-adapter.ts:55-63` | The surface can show `running`, but the execution path is still fake. |
| TC-3.1a | UNRESOLVED | `tests/service/server/process-live-updates.test.ts:730`; `tests/service/client/process-live.test.ts:279` | Running state is visible, but it is not anchored to a real environment-backed executor. |
| AC-3.2 | VIOLATED | `apps/platform/server/services/processes/environment/provider-adapter.ts:15-18`; `apps/platform/server/services/processes/environment/process-environment.service.ts:378-467` | The browser gets typed objects, but execution never emits substantive process-facing activity from a real runtime. |
| TC-3.2a | VIOLATED | `apps/platform/server/services/processes/environment/process-environment.service.ts:407-455`; `apps/platform/client/app/process-live.ts:158-170` | Live activity is mostly environment state flips and synthetic `process_event` rows, not coherent runtime-driven work updates. |
| TC-3.2b | SATISFIED | `apps/platform/server/services/processes/live/process-live-normalizer.ts:47-114`; `apps/platform/client/app/process-live.ts:120-170`; `tests/service/client/process-live.test.ts:320` | The browser applies typed current-object messages instead of reconstructing raw transport fragments. |
| AC-3.3 | SATISFIED | `apps/platform/client/app/process-live.ts:158-166`; `apps/platform/server/services/processes/environment/process-environment.service.ts:442-455` | The surface keeps running/waiting/checkpointing distinct when those states are present. |
| TC-3.3a | SATISFIED | `apps/platform/client/app/process-live.ts:161-163`; `tests/service/client/process-live.test.ts:279` | Waiting is visually distinct from environment running. |
| TC-3.3b | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:442-455`; `tests/service/client/process-live.test.ts:297` | Checkpointing is a distinct environment state. |
| AC-3.4 | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:419-438`; `tests/service/client/process-live.test.ts:320` | Execution failure leaves the rest of the surface intact. |
| TC-3.4a | SATISFIED | `tests/service/server/process-live-updates.test.ts:884`; `tests/service/client/process-live.test.ts:320` | Failure is visible without erasing history/materials. |

### Flow 4

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-4.1 | VIOLATED | `apps/platform/server/services/projects/platform-store.ts:904-925`; `convex/artifacts.ts:58-88` | Artifact summaries persist, but artifact contents are discarded before durable storage. |
| TC-4.1a | VIOLATED | `convex/artifacts.ts:70-78` | Durable artifact rows are created without the actual produced contents. |
| TC-4.1b | VIOLATED | `tests/integration/process-work-surface.test.ts:312`; `convex/artifacts.ts:70-78` | Reopen restores summary-level artifact state, not the actual checkpointed artifact output. |
| AC-4.2 | VIOLATED | `apps/platform/server/app.ts:133-145`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19`; `convex/sourceAttachments.ts:4-22` | Code checkpoint success is synthetic, and writable-source state is not durable on the real Convex path. |
| TC-4.2a | VIOLATED | `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19` | Successful code checkpoint results are reported without a canonical write. |
| TC-4.2b | VIOLATED | `apps/platform/server/services/processes/environment/process-environment.service.ts:648-679`; `apps/platform/server/services/processes/environment/provider-adapter.ts:65-85` | The UI can show a checkpoint result, but it may refer to fake source ids or a stubbed write path. |
| AC-4.3 | SATISFIED | `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-24`; `tests/service/server/process-actions-api.test.ts:1249` | Read-only checkpoint candidates are excluded. |
| TC-4.3a | SATISFIED | `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-24` | Read-only sources do not become code checkpoint targets. |
| AC-4.4 | VIOLATED | `apps/platform/client/features/processes/process-checkpoint-result.ts:3-35`; `apps/platform/server/services/processes/environment/process-environment.service.ts:648-679` | Artifact/code result UI exists, but code results can be false positives and artifact results omit payload durability. |
| TC-4.4a | SATISFIED | `apps/platform/client/features/processes/process-checkpoint-result.ts:3-35`; `tests/service/client/process-environment-panel.test.ts:45` | Artifact checkpoint result visibility is clear. |
| TC-4.4b | VIOLATED | `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19`; `tests/service/client/process-environment-panel.test.ts:57` | Code checkpoint result visibility is present, but the underlying write may never have happened. |
| AC-4.5 | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:615-645`; `apps/platform/server/services/processes/environment/process-environment.service.ts:684-770` | Checkpoint failures are surfaced durably and live. |
| TC-4.5a | SATISFIED | `tests/service/server/process-live-updates.test.ts:1090`; `tests/service/client/process-environment-panel.test.ts:70` | Artifact checkpoint failures remain visible. |
| TC-4.5b | SATISFIED | `tests/service/server/process-live-updates.test.ts:1170`; `apps/platform/server/services/processes/environment/process-environment.service.ts:615-645` | Code checkpoint failures are surfaced with failure reasons. |

### Flow 5

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-5.1 | SATISFIED | `apps/platform/server/services/processes/process-work-surface.service.ts:183-253`; `apps/platform/client/features/processes/process-environment-panel.ts:25-61` | The surface distinguishes seeded/durable recovery states correctly. |
| TC-5.1a | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:322`; `tests/service/client/process-environment-panel.test.ts:57` | Stale is distinct from failed. |
| TC-5.1b | SATISFIED | `tests/service/server/process-work-surface-api.test.ts:726`; `tests/service/client/process-environment-panel.test.ts:70` | Lost is distinct from absent. |
| AC-5.2 | UNRESOLVED | `apps/platform/server/services/processes/environment/process-environment.service.ts:54-110`; `apps/platform/server/services/processes/environment/provider-adapter.ts:88-97` | State transitions exist, but there is no real recoverable working copy to refresh. |
| TC-5.2a | VIOLATED | `apps/platform/server/services/processes/environment/provider-adapter.ts:88-97` | Rehydrate returns a timestamp and id, not a real refreshed working copy. |
| TC-5.2b | SATISFIED | `tests/service/server/process-live-updates.test.ts:1251`; `tests/service/client/process-live.test.ts:443` | The visible state moves through rehydration in-session. |
| AC-5.3 | VIOLATED | `apps/platform/server/services/processes/environment/process-environment.service.ts:111-173`; `apps/platform/server/services/processes/environment/provider-adapter.ts:99-107` | Rebuild creates a fake environment id and timestamps, not a reconstructed environment from canonical truth. |
| TC-5.3a | VIOLATED | `apps/platform/server/services/processes/environment/provider-adapter.ts:99-107` | Rebuild is not backed by a real provider rebuild operation. |
| TC-5.3b | VIOLATED | `apps/platform/server/services/processes/environment/process-environment.service.ts:141-173` | The flow no longer depends on prior survival, but the reconstructed environment is simulated. |
| AC-5.4 | UNRESOLVED | `tests/integration/process-work-surface.test.ts:506`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19`; `convex/artifacts.ts:70-78` | Artifact summary/result survives recovery, but code durability and artifact payload durability do not. |
| TC-5.4a | SATISFIED | `tests/integration/process-work-surface.test.ts:506` | Artifact rows/results stay visible through rebuild. |
| TC-5.4b | VIOLATED | `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19` | Code persistence cannot survive rebuild when it never hit canonical code truth in the first place. |
| AC-5.5 | SATISFIED | `apps/platform/server/services/processes/environment/process-environment.service.ts:901-952`; `apps/platform/client/app/bootstrap.ts:551-646` | Recovery preflight failures keep the surface blocked rather than falsely ready. |
| TC-5.5a | SATISFIED | `tests/service/server/process-actions-api.test.ts:1433`; `tests/service/client/process-work-surface-page.test.ts:1122` | Missing prerequisites block rebuild cleanly. |
| TC-5.5b | SATISFIED | `tests/service/server/process-actions-api.test.ts:1411`; `tests/service/client/process-work-surface-page.test.ts:1156` | Non-recoverable rehydrate promotes rebuild guidance. |

### Flow 6

| ID | Status | Evidence | Note |
|---|---|---|---|
| AC-6.1 | UNRESOLVED | `apps/platform/server/services/processes/process-work-surface.service.ts:369-397`; `tests/integration/process-work-surface.test.ts:312` | Reopen restores the latest durable summary state, but some checkpoint “success” states are not backed by real canonical durability. |
| TC-6.1a | UNRESOLVED | `tests/integration/process-work-surface.test.ts:312` | The surface restores the latest environment/checkpoint summary, but code checkpoint truth can be synthetic. |
| AC-6.2 | UNRESOLVED | `tests/integration/process-work-surface.test.ts:312`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-19` | Visible checkpoint summaries survive environment absence, but code durability is not real and artifact payload durability is incomplete. |
| TC-6.2a | UNRESOLVED | `tests/integration/process-work-surface.test.ts:312` | Durable visibility survives; underlying code/artifact truth is incomplete. |
| AC-6.3 | SATISFIED | `apps/platform/client/app/bootstrap.ts:91-179`; `apps/platform/client/features/processes/process-work-surface-page.ts:132-151`; `tests/service/client/process-work-surface-page.test.ts:641` | Bootstrap-first behavior keeps the surface usable when live setup fails. |
| TC-6.3a | SATISFIED | `tests/service/client/process-work-surface-page.test.ts:641`; `tests/service/server/process-live-updates.test.ts:186` | Live-update failure does not block durable load. |
| AC-6.4 | SATISFIED | `apps/platform/client/app/process-live.ts:26-43`; `tests/integration/process-work-surface.test.ts:391`; `tests/integration/process-work-surface.test.ts:450` | History dedupe and latest-only checkpoint visibility avoid replay/duplication on reopen. |
| TC-6.4a | SATISFIED | `tests/integration/process-work-surface.test.ts:391`; `tests/service/client/process-live.test.ts:865` | Finalized history is not duplicated on reopen/reconnect. |
| TC-6.4b | SATISFIED | `apps/platform/client/app/process-live.ts:90-112`; `tests/integration/process-work-surface.test.ts:450` | Prior checkpoint result is preserved as existing state, not replayed as new live work. |

## COVERAGE_ASSESSMENT

The epic has strong contract/UI test coverage around:

- stable visible controls and disabled reasons
- bootstrap/live threading of `environment`
- latest-only checkpoint-result rendering
- reload/reopen and live-retry behavior

The highest-risk blind spots are structural:

- No test exercises `ConvexPlatformStore`; all touched server/integration tests build `InMemoryPlatformStore` instead. Evidence: `tests/service/server/process-actions-api.test.ts:1-170`; `tests/service/server/process-live-updates.test.ts:1-173`; `tests/integration/process-work-surface.test.ts:1-120`.
- No touched test drives a real provider implementation; the suite only uses `InMemoryProviderAdapter` or `FailingProviderAdapter`.
- No repo-visible test covers a real canonical code write; `code-checkpoint-writer.test.ts` only exercises the stub/failing doubles.
- The plan called for `convex/sourceAttachments.test.ts`, but there is no such file in repo, and the real Convex source-attachment module still does not model `accessMode`.
- `test:e2e` still prints a scaffold skip, so there is no browser-level end-to-end confirmation of a real environment or checkpoint flow.

Useful non-TC decided coverage is present:

- control-order stability
- checkpoint-context preservation during rehydrate/rebuild
- dedupe of finalized history on reconnect/reopen
- section degradation without collapsing the whole process surface

## PRODUCTION_PATH_GAPS

1. `ConvexPlatformStore` can durably store environment summary and hydration plans, but it has no real provider integration behind those states.
2. `ConvexPlatformStore` plus `convex/sourceAttachments.ts` cannot represent writable/read-only source truth, so production code-checkpoint eligibility is broken even before the stub writer is considered.
3. The production artifact checkpoint path stores summary rows and linked outputs but drops the actual artifact contents.
4. The recovery model depends on seeded or manually patched `stale`/`lost` states because no production freshness comparison computes them.
5. All repo-visible integration tests validate these flows only with `InMemoryPlatformStore`, so the real Convex-backed path is under-tested exactly where the epic adds the most behavior.

## BLOCKING_FINDINGS

1. The app ships a fake environment provider as the default runtime implementation.
2. Canonical code checkpointing is stubbed and can report false-success durable results.
3. Writable-source truth is not durably represented on the real Convex path.
4. Artifact checkpointing drops the artifact payload.
5. Execution does not emit the process-facing state that downstream stories rely on.
6. Freshness/loss detection is modeled but not implemented.

## NONBLOCKING_WARNINGS

1. The client recomputes `environment.statusLabel` from `state` instead of rendering the server-provided contract field directly. Evidence: `apps/platform/client/features/processes/process-environment-panel.ts:27-29`; `apps/platform/client/app/process-live.ts:79-87`.
2. `DEFAULT_ENVIRONMENT_PROVIDER_KIND` defaults to `local`, which diverges from the daytona-first server design documented in the tech design. Evidence: `apps/platform/server/config.ts:15-31`.
3. `convex/sourceAttachments.ts` still uses `queryGeneric` and `ctx: any`, which is specifically at odds with the Convex guidance the repo asks reviewers/implementers to follow. Evidence: `convex/sourceAttachments.ts:1-54`.

## UNRESOLVED

1. I did not run a manual authenticated browser session against a live Convex deployment and real provider credentials, because no real provider or canonical code writer implementation is present in repo.
2. The gate output was captured via `tail -40`, so I only saw the successful end of `verify-all`; the command exited `0`, which implies the earlier lint/typecheck/build steps also passed.

## GATE_RESULT

`corepack pnpm run verify-all 2>&1 | tail -40` exited `0` on `2026-04-16`.

Observed tail:

- server/service lane passed: `12` files, `106` tests
- client lane passed: `19` files, `152` tests
- integration lane passed: `2` files, `9` tests
- `test:e2e` is still scaffolded and printed `SKIP: test:e2e scaffolded in Story 0; no executable suite yet`

## WHAT_ELSE

1. The client/server contract threading for `environment`, `controls`, and latest checkpoint visibility is cleaner than the production runtime behind it. The UI layer is much closer to the tech design than the provider/checkpoint boundaries are.
2. The review surface still contains some legacy TC naming drift (`TC-6.5`, mixed Story 2/3 numbering in later client tests). It does not break behavior, but it makes end-to-end traceability noisier than the story coverage doc suggests.
3. `process.hasEnvironment` remains a compatibility field and is not maintained on the real Convex process row after environment creation; the process work surface compensates by deriving `hasEnvironment` from `environment`, but shell-level consumers of raw process summaries can still drift from environment truth.
