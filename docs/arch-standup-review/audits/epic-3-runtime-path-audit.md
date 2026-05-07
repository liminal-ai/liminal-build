# Epic 3 Runtime Path Audit

## Overall Judgment

Mostly healthy with caveats.

Confirmed: the current runtime path is not just the early in-memory/stub scaffold. The app wires real Local and Daytona provider adapters, durable `processEnvironmentStates`, one-shot TypeScript module execution, Convex File Storage-backed artifact checkpointing, an Octokit-backed code checkpoint writer, source access-mode filtering, latest-only checkpoint projection, and working-set fingerprint stale projection.

Main caveats: credential isolation inside executed scripts is not tight enough for a real sandbox boundary; the default integrated runtime script is still a generic platform payload rather than process-specific AI execution; Daytona is a real SDK adapter but not proven here with live integration; and some projection logic is centralized in helpers but still coordinated across start/resume/environment action paths.

## Targeted Verification

Ran:

```bash
corepack pnpm exec vitest run convex/processEnvironmentStates.test.ts tests/service/server/local-provider-adapter.test.ts tests/service/server/daytona-provider-adapter.test.ts tests/service/server/script-execution.service.test.ts tests/service/server/process-execution-orchestrator.test.ts tests/service/server/code-checkpoint-writer.test.ts tests/service/server/octokit-code-checkpoint-writer.test.ts tests/service/server/platform-store-checkpoint-artifacts.test.ts
```

Result: 8 test files passed, 69 tests passed.

## 1. Provider and Runtime Path

### Confirmed Facts

Provider adapters exist for `local` and `daytona`; `InMemoryProviderAdapter` also exists as a test fake.

- `ProviderKind` is only `'daytona' | 'local'`: `apps/platform/server/services/processes/environment/provider-adapter.ts:11`.
- The provider contract includes ensure, hydrate, execute, rehydrate, rebuild, teardown, and candidate-content resolution: `apps/platform/server/services/processes/environment/provider-adapter.ts:164`.
- `InMemoryProviderAdapter` is explicitly documented as not production-wired: `apps/platform/server/services/processes/environment/provider-adapter.ts:198`.
- Production `createApp` constructs `DefaultProviderAdapterRegistry` with `LocalProviderAdapter` and `DaytonaProviderAdapter`: `apps/platform/server/app.ts:266`.
- Test-only single-adapter fallback is only used when `options.providerAdapter` is supplied: `apps/platform/server/app.ts:270`.

`LocalProviderAdapter` is genuinely implemented and wired through the app path.

- Local creates a real working tree under a configurable root: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:126`.
- Local hydrates artifact contents by reading durable artifact content through `platformStore.getArtifactContent`: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:150`.
- Local clones source attachments using `git clone --depth 1` and optional `--branch`: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:52`.
- Local writes the TypeScript module source to `_liminal_exec.ts`, runs it with Node, and reads `_liminal_exec_result.json`: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:193`.
- Local validates the returned `ExecutionResult` shape and validates checkpoint refs before accepting the result: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:231`.

`DaytonaProviderAdapter` is a real implementation, not a pure skeleton.

- It constructs a real `@daytonaio/sdk` client unless a test `clientFactory` is injected: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:113`.
- It creates sandboxes, uploads artifacts, clones sources, uploads/runs the TS entrypoint, downloads the result JSON, validates it, supports rehydrate/rebuild/teardown, and maps Daytona failures into provider lifecycle states: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:119`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:138`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:197`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:275`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:284`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:314`.
- Config requires `DAYTONA_API_KEY` even if local is selected as default: `apps/platform/server/config.ts:22`.

Default runtime does not silently use `InMemoryProviderAdapter` on real app paths.

- Production registry wiring uses Local + Daytona, not InMemory: `apps/platform/server/app.ts:274`.
- InMemory appears in tests and test utilities as an explicit seam, not in production `createApp`.

Persisted `providerKind` is authoritative once an environment state exists.

- `ProcessEnvironmentService.getAuthoritativeProviderKind` reads `getProcessEnvironmentProviderKind` and only falls back to default if none exists: `apps/platform/server/services/processes/environment/process-environment.service.ts:99`.
- Start/resume do the same persisted-provider lookup before preparing an environment: `apps/platform/server/services/processes/process-start.service.ts:40`, `apps/platform/server/services/processes/process-resume.service.ts:43`.
- Convex stores `providerKind` on `processEnvironmentStates`: `convex/processEnvironmentStates.ts:49`.

### Inferences

The app is currently capable of using Daytona as a real remote provider if environment credentials are valid, but this audit did not perform a live Daytona smoke test. The code is real; runtime readiness depends on external Daytona configuration and availability.

The comment in `createApp` still says "Local + Daytona skeleton" at `apps/platform/server/app.ts:269`, but the Daytona adapter itself is no longer merely a skeleton. That comment is stale.

### Concerns

Credential isolation is weak for the local execution path. `LocalProviderAdapter` uses `spawn('node', ...)` without specifying a restricted `env`, so Node inherits the Fastify process environment by default: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:85`. That likely exposes `GITHUB_TOKEN`, `DAYTONA_API_KEY`, Convex service config, and other server secrets to executed script code.

Daytona execution passes `env` as `undefined` to `sandbox.process.executeCommand`: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:209`. Depending on Daytona defaults, this may or may not expose sensitive environment. The code does not explicitly define a minimal sandbox environment.

## 2. Environment State and Projection

### Confirmed Facts

`processEnvironmentStates` exists and is the durable environment lifecycle authority.

- Schema fields include `processId`, `providerKind`, `environmentId`, `state`, `blockedReason`, `lastHydratedAt`, `lastCheckpointAt`, `lastCheckpointResult`, `workingSetPlan`, and `workingSetFingerprint`: `convex/processEnvironmentStates.ts:49`.
- The environment state validator includes absent, preparing, rehydrating, ready, running, checkpointing, stale, failed, lost, rebuilding, and unavailable: `convex/processEnvironmentStates.ts:19`.
- Server service transitions environment state through `upsertEnvironmentState`, which delegates to `platformStore.upsertProcessEnvironmentState`: `apps/platform/server/services/processes/environment/process-environment.service.ts:107`.

`processes.hasEnvironment` is maintained from environment state rather than purely independent process state.

- Convex derives has-environment states from env states: `convex/processEnvironmentStates.ts:72`.
- Every env-state mutation calls `maintainProcessHasEnvironment`: `convex/processEnvironmentStates.ts:507`.
- `setProcessHydrationPlan` also maintains the compatibility flag when creating/updating the row: `convex/processEnvironmentStates.ts:610`.

There is a central projection helper for process controls and summaries.

- `buildProcessSurfaceSummary` derives controls and `hasEnvironment` from a `ProcessSummary` plus `EnvironmentSummary`: `apps/platform/server/services/processes/process-work-surface.service.ts:318`.
- Environment live publications go through `publishEnvironmentUpsert`, which calls `buildProcessSurfaceSummary(args.process, args.environment)`: `apps/platform/server/services/processes/environment/process-environment.service.ts:1269`.
- Start/resume action responses use `buildProcessSurfaceSummaryWithReviewability` with the current environment summary: `apps/platform/server/services/processes/process-start.service.ts:88`, `apps/platform/server/services/processes/process-resume.service.ts:89`.

Action responses and live publications generally recompute summaries with current environment truth.

- Hydration success publishes with the freshly persisted ready environment: `apps/platform/server/services/processes/environment/process-environment.service.ts:357`.
- Execution publishes running/checkpointing/failed/ready states after persisting environment state: `apps/platform/server/services/processes/environment/process-environment.service.ts:542`, `apps/platform/server/services/processes/environment/process-environment.service.ts:639`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1075`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1148`.

### Inferences

The compatibility flag can still drift if code writes directly to `processes.hasEnvironment` outside the env-state mutation path, but the audited runtime path keeps it derived from environment state. Tests also cover the flag flip behavior.

### Concerns

Projection is centralized for environment publications, but start/resume still duplicate hydration-plan assembly and immediate `preparing` state setup before delegating to `ProcessEnvironmentService`: `apps/platform/server/services/processes/process-start.service.ts:57`, `apps/platform/server/services/processes/process-resume.service.ts:58`. This is not a bug, but it is an architectural pressure point.

## 3. Controlled Execution

### Confirmed Facts

Execution is one-shot TypeScript module source.

- The script payload type is exactly `{ format: 'ts-module-source', entrypoint: 'default', source }`: `apps/platform/server/services/processes/environment/provider-adapter.ts:63`.
- The default integrated payload returns that shape: `apps/platform/server/services/processes/environment/script-execution.service.ts:299`.
- Local writes `_liminal_exec.ts`, runs `node --experimental-strip-types`, and requires `_liminal_exec_result.json`: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:193`.
- Daytona uploads the same TS entrypoint and runs `node --experimental-strip-types _liminal_exec.ts`: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:201`.

`ExecutionResult` carries structured outputs and checkpoint candidates close to the remediation shape.

- `ExecutionResult` includes process status, process history items, optional archive entries, output writes, side-work writes, artifact checkpoint candidates, code checkpoint candidates, and used source attachment ids: `apps/platform/server/services/processes/environment/provider-adapter.ts:153`.
- Artifact candidates point to provider-owned `contentsRef`: `apps/platform/server/services/processes/environment/provider-adapter.ts:97`.
- Code candidates include source attachment id, access mode, workspace ref, repo-relative file path, and commit message: `apps/platform/server/services/processes/environment/provider-adapter.ts:104`.
- The orchestrator resolves candidate refs into actual checkpoint content through the provider adapter before planning checkpoints: `apps/platform/server/services/processes/environment/process-environment.service.ts:1217`.

The executor/tool boundary avoids giving sandbox code direct Convex/GitHub API objects. Sandbox code writes files and result JSON; server-side code resolves contents and performs Convex/GitHub writes later.

- Scripts communicate via `_liminal_exec_result.json`: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:209`.
- The checkpoint writer is server-side and Octokit-backed, constructed in `createApp`: `apps/platform/server/app.ts:294`.
- The script result only declares candidates; the orchestrator later resolves and writes them: `apps/platform/server/services/processes/environment/process-environment.service.ts:927`.

### Inferences

The default runtime script is authentic enough to exercise the real hydration/execution/checkpoint plumbing, but it is not yet a process-specific AI worker. It generates a runtime brief and optional source note from hydrated files: `apps/platform/server/services/processes/environment/script-execution.service.ts:16`.

### Concerns

The tool boundary does not explicitly strip server environment variables from executed scripts. That means the sandbox code may not receive direct API clients, but it may still be able to read raw credentials from `process.env` in local execution.

`validateExecutionResult` in `LocalProviderAdapter` only validates some top-level arrays and code candidate fields; many nested fields are cast rather than fully schema-validated: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:369`. This is acceptable for trusted developer-machine execution, but it is thin for untrusted model-generated code.

## 4. Hydration and Checkpointing

### Confirmed Facts

Hydration is process-scoped and based on current process material refs, current outputs, and active source attachments.

- Start and resume build a hydration plan from current material refs, current outputs, and active process source attachments: `apps/platform/server/services/processes/process-start.service.ts:57`, `apps/platform/server/services/processes/process-resume.service.ts:58`.
- `ProcessEnvironmentService.buildHydrationPlan` uses current material refs, process outputs, and active process sources: `apps/platform/server/services/processes/environment/process-environment.service.ts:1466`.
- `buildAdapterHydrationPlan` enriches the ID plan into artifact/source/output inputs and fails if a referenced source cannot be resolved: `apps/platform/server/services/processes/environment/process-environment.service.ts:1501`.
- Hydration is not broad project materialization; the adapter receives only the working-set plan inputs.

Artifact contents are durably stored in Convex File Storage on the real Convex path.

- Convex action stores each checkpoint artifact as a Blob with `ctx.storage.store`: `convex/artifacts.ts:126`.
- The storage id is passed to the row-writing mutation: `convex/artifacts.ts:160`.
- Fetching artifact content reads the latest version storage id and calls `ctx.storage.get`: `convex/artifacts.ts:319`.
- The production `PlatformStore.persistCheckpointArtifacts` calls the service-only Convex action: `apps/platform/server/services/projects/platform-store.ts:2158`.

Artifact checkpointing appends artifact versions without transferring artifact ownership.

- Existing artifact id is validated within the process project, otherwise a new checkpoint artifact id is created: `apps/platform/server/services/projects/platform-store.ts:3634`.
- Versions record `createdByProcessId`: `apps/platform/server/services/projects/platform-store.ts:3672`.
- Checkpointing updates process outputs/current material refs to include checkpointed artifact ids rather than moving artifact ownership to another process: `apps/platform/server/services/projects/platform-store.ts:3724`.

There is a real GitHub/Octokit code checkpoint writer.

- Production wiring constructs `OctokitCodeCheckpointWriter` and fails loud if `GITHUB_TOKEN` is missing: `apps/platform/server/app.ts:294`.
- The writer parses GitHub repository URLs, reads existing file SHA, and calls `createOrUpdateFileContents` on the target branch: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:134`.
- It rejects missing target refs: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:176`.

Read-only sources are excluded/fail-closed for code checkpointing.

- `CheckpointPlanner` filters non-`read_write` code diffs into `skippedReadOnly`: `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16`.
- The orchestrator records a failed checkpoint result when code work only targeted read-only sources and no artifact checkpoint succeeded: `apps/platform/server/services/processes/environment/process-environment.service.ts:1109`.

`lastCheckpointResult` is latest-only and projected through environment state.

- Convex state stores a single nullable `lastCheckpointResult`: `convex/processEnvironmentStates.ts:57`.
- Upsert preserves or overwrites that field depending on whether a new value is supplied: `convex/processEnvironmentStates.ts:488`.
- Execution checkpointing writes artifact/code/mixed success and failure results back into environment state: `apps/platform/server/services/processes/environment/process-environment.service.ts:973`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1038`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1075`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1123`, `apps/platform/server/services/processes/environment/process-environment.service.ts:1184`.

### Inferences

The checkpoint path is real but intentionally narrow: single-file direct GitHub writes, no branch invention, no PR workflow, and no model-side credential use.

### Concerns

Source code checkpointing assumes `repositoryUrl` can be parsed as `https://github.com/<owner>/<repo>`: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:250`. That is aligned with current GitHub-only scope, but it is not a generic VCS abstraction.

Artifact checkpointing is durable in Convex, but in-memory store tests mirror it with maps rather than actual File Storage: `apps/platform/server/services/projects/platform-store.ts:3664`. That is fine as a test seam but should not be mistaken for production behavior.

## 5. Fingerprint and Recovery

### Confirmed Facts

`workingSetFingerprint` is written and compared at runtime for stale detection.

- The env table stores `workingSetFingerprint`: `convex/processEnvironmentStates.ts:59`.
- Fingerprints are computed from artifact version labels, output revision labels, source target refs/hydration states, and provider kind: `convex/processEnvironmentStates.ts:189`.
- `upsertProcessEnvironmentState` recomputes and patches the fingerprint after writing the final env row: `convex/processEnvironmentStates.ts:496`.
- `setProcessHydrationPlan` also recomputes and patches the fingerprint: `convex/processEnvironmentStates.ts:619`.
- `getProcessEnvironmentSummary` projects `ready` as `stale` when the current computed fingerprint differs from the stored one: `convex/processEnvironmentStates.ts:393`.
- `ProcessEnvironmentService.buildAdapterHydrationPlan` requires a persisted fingerprint and passes it to adapters: `apps/platform/server/services/processes/environment/process-environment.service.ts:1497`.

`rehydrate` and `rebuild` are meaningfully different.

- Rehydrate requires stale/failed state with an existing `environmentId`; lost or null environment ids require rebuild: `apps/platform/server/services/processes/environment/process-environment.service.ts:1642`.
- Rebuild is allowed for lost or failed states and checks canonical recovery materials before proceeding: `apps/platform/server/services/processes/environment/process-environment.service.ts:1679`.
- Local rehydrate reuses the same environment and calls hydrate; rebuild tears down the previous environment and ensures a new one: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:252`.
- Daytona rehydrate looks up and ensures an existing sandbox is usable; rebuild tears down and creates/hydrates a new sandbox: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:275`.

Missing/recoverability/material checks are not merely cosmetic.

- Rebuild checks both a planned working set and store-level canonical materials; if none exist, it returns `PROCESS_ENVIRONMENT_PREREQUISITE_MISSING`: `apps/platform/server/services/processes/environment/process-environment.service.ts:193`.
- Hydration fails loud if artifact content is missing: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:155`, `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:151`.
- Missing source attachments in a hydration plan fail loud rather than fabricating a repository URL: `apps/platform/server/services/processes/environment/process-environment.service.ts:1541`.
- Daytona missing sandbox maps to `lost`: `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:345`.

### Inferences

The stale projection is read-time, not a stored-state mutation. That is a good user-surface behavior, but callers that read the raw row directly would not see `stale`. The audited app path reads through `getProcessEnvironmentSummary`.

### Concerns

`upsertProcessEnvironmentState` writes a new fingerprint after every state change, including transitions to `ready`. If material changes happen between setting a hydration plan and marking ready, the stored fingerprint may represent the later material set rather than the exact material set actually hydrated. The code mitigates this by keeping `workingSetPlan` on the env row and by computing from that plan when present, but future changes should preserve that invariant: `convex/processEnvironmentStates.ts:249`.

## Recommended Next Actions

Small:

- Update the stale `createApp` comment that still calls Daytona a skeleton.
- Add a regression test that proves production `createApp` without provider overrides does not include `InMemoryProviderAdapter` or `StubCodeCheckpointWriter`.
- Tighten `ExecutionResult` validation with a shared schema instead of top-level casts.

Medium:

- Explicitly sanitize the environment passed to Local and Daytona script execution. Pass a minimal allowlist rather than inheriting Fastify process secrets.
- Centralize start/resume hydration-plan preparation behind the same environment service helper used for rehydrate/rebuild.
- Add a live Daytona smoke test path that can be run manually or in an opt-in integration job.

Large:

- Replace the generic integrated default runtime payload with process-specific execution contracts once functional process epics begin.
- Introduce a true tool-harness capability manifest for sandbox code so scripts can request operations without ambient filesystem/process/environment access.
- Evolve code checkpointing from direct single-file GitHub writes into a richer branch/PR/checkpoint policy once the product needs collaborative code review flows.
