# Orchestration CLI/SDK Alignment Audit

## Overall Judgment

Recommended approach: **hybrid, leaning toward option 3**.

Liminal Build should not absorb the full `lbuild-impl` CLI/SDK primitive result union into `ExecutionResult`. The CLI/SDK has at least three layers: provider subprocess result, operation envelope, and story-lead orchestration ledger/final package. Liminal Build's current `ExecutionResult` is a lower-level controlled-environment boundary: it tells the platform which process state to transition to, which process-facing rows to write, and which checkpoint candidates to resolve.

The right shape is:

1. Keep `ExecutionResult` as the environment/script boundary, but make it first-class with a shared strict schema and stronger diagnostics.
2. Introduce a higher-level **orchestration result envelope** above it, modeled on `lbuild-impl`'s operation envelope plus story-run/final-package references.
3. Translate orchestration envelopes into `ExecutionResult` side effects: process history, side-work, archive entries, output references, artifact checkpoint candidates, code checkpoint candidates, and source-provenance usage.

That preserves Liminal Build's runtime boundary while letting the richer CLI/SDK model come back into the platform without flattening story orchestration into one script-return object.

## Liminal Build Runtime Shapes Reviewed

Runtime adapter contract:

- `ProviderAdapter` covers ensure, hydrate, execute script, rehydrate, rebuild, teardown, and candidate-content resolution in `apps/platform/server/services/processes/environment/provider-adapter.ts:164`.
- `HydrationPlan` is a process working-set projection with artifact, output, and source inputs, including `repositoryUrl`, `targetRef`, and `accessMode` for sources in `provider-adapter.ts:36` and `provider-adapter.ts:50`.
- `ExecutionResult` currently carries `processStatus`, process history items, optional archive entries, output writes, side-work writes, artifact/code checkpoint candidates, and optional `usedSourceAttachmentIds` in `provider-adapter.ts:153`.
- Checkpoint candidates are reference-based: artifact candidates carry `contentsRef`, and code candidates carry `workspaceRef`, repo-relative `filePath`, and `commitMessage` in `provider-adapter.ts:97` and `provider-adapter.ts:104`.

Execution path:

- `ScriptExecutionService` is a thin adapter wrapper that resolves a provider and calls `adapter.executeScript(...)` in `script-execution.service.ts:361`.
- Local execution writes/runs `_liminal_exec.ts`, reads `_liminal_exec_result.json`, validates it, then validates candidate refs in `local-provider-adapter.ts:193`, `local-provider-adapter.ts:231`, and `local-provider-adapter.ts:239`.
- Daytona follows the same result-file shape in `daytona-provider-adapter.ts:197`, downloads the result JSON, and validates it in `daytona-provider-adapter.ts:248`.
- The current validation is handwritten and partial in both adapters: Local `validateExecutionResult` starts at `local-provider-adapter.ts:369`; Daytona's starts at `daytona-provider-adapter.ts:502`.

Platform side effects:

- `ProcessEnvironmentService` applies `ExecutionResult` side effects before deciding final environment state in `process-environment.service.ts:575`.
- `applyExecutionResultSideEffects` appends process history, finalizes archive entries, replaces current outputs, and replaces current side-work items in `process-environment.service.ts:706`.
- Source provenance is derived from `usedSourceAttachmentIds` or falls back to code checkpoint candidate source ids in `process-environment.service.ts:1769`.
- Failed executions do not carry a top-level failure reason; the platform extracts the most recent finalized history item text in `process-environment.service.ts:1814`.
- Checkpointing bridges `ExecutionResult` candidates into an older `CheckpointCandidate` shape in `process-environment.service.ts:1217`.

Shared contracts:

- Process environment states include `absent`, `preparing`, `ready`, `running`, `checkpointing`, `stale`, `failed`, `lost`, `rebuilding`, and `unavailable` in `shared/contracts/process-work-surface.ts:85`.
- `LastCheckpointResult` is latest-only and surface-oriented in `process-work-surface.ts:214`.
- Process materials include current artifacts, outputs, and sources; source refs expose `accessMode`, `repositoryUrl`, and `targetRef` in `process-work-surface.ts:320`.
- Archive contracts are already stricter than `ExecutionResult`: archive entry kind/body format schemas are at `shared/contracts/archive.ts:59` and `archive.ts:73`, and `archiveEntrySchema` has invariants in `archive.ts:158`.
- Source provenance has a durable relationship/status shape in `shared/contracts/source-management.ts:97`.

## lspec-core CLI/SDK Layout

Package and public surfaces:

- `lbuild-impl` publishes SDK exports from `dist/sdk/index.js` and the CLI binary from `dist/bin/lbuild-impl.js` in `/Users/leemoore/code/lspec-core/package.json:6` and `package.json:26`.
- The package exports root SDK, `./sdk`, `./sdk/contracts`, and `./sdk/errors` in `package.json:8`.
- The public SDK re-exports contracts, errors, and operation functions from `/Users/leemoore/code/lspec-core/src/sdk/index.ts:1`.
- SDK operation exports include `inspect`, `preflight`, `storyImplement`, `storyVerify`, and `storyOrchestrateRun` in `src/sdk/operations/index.ts:4` and `src/sdk/operations/index.ts:16`.

CLI shape:

- CLI command registration is centralized in `src/bin/lbuild-impl.ts:117`, with subcommands listed at `src/bin/lbuild-impl.ts:126`.
- `story-orchestrate` is a command group with `run`, `resume`, `status`, and `validate` subcommands in `src/cli/commands/story-orchestrate.ts:14`.
- CLI wrappers are thin. Example: `story-implement` resolves artifact/progress paths, calls `storyImplement(...)`, and emits the returned envelope in `src/cli/commands/story-implement.ts:60`, `story-implement.ts:69`, and `story-implement.ts:78`.
- `story-orchestrate run` similarly calls the SDK method directly in `src/cli/commands/story-orchestrate-run.ts:53`.
- `story-orchestrate resume` parses optional review/ruling JSON files, then calls `storyOrchestrateResume(...)` in `src/cli/commands/story-orchestrate-resume.ts:174`.

Core runtime:

- Current-state docs explicitly say CLI command modules are thin wrappers around SDK operations in `docs/current-state-tech-design.md:23`, and SDK operations/contracts/errors live under `src/sdk/*` in `docs/current-state-tech-design.md:25`.
- Runtime core owns spec-pack discovery, config, prompt/reference assembly, operation orchestration, provider dispatch, result envelope construction, artifact writing, and progress persistence in `docs/current-state-tech-design.md:29`.
- Provider adapters currently dispatch to Claude Code and Codex in `src/core/provider-adapters/index.ts:18`.

## Primitive and Layered Flow Map

Primitive operations:

- Readiness: `inspect` and `preflight`. `inspect` persists a result envelope after `inspectSpecPack` in `src/sdk/operations/inspect.ts:48` and `inspect.ts:54`. `preflight` composes inspection, config, provider matrix, gate discovery, and prompt asset checks in `src/sdk/operations/preflight.ts:76` and `preflight.ts:203`.
- Story primitives: `story-implement`, `story-continue`, `story-self-review`, and `story-verify` call core runner functions, then finalize typed envelopes. `storyImplement` does this in `src/sdk/operations/story-implement.ts:16` and `story-implement.ts:45`; `storyVerify` does it in `src/sdk/operations/story-verify.ts:16` and `story-verify.ts:49`.
- Fix/epic primitives: `quick-fix`, `epic-cleanup`, `epic-verify`, and `epic-synthesize` are provider-backed bounded operations. `quick-fix` is intentionally less structured internally: the result stores raw provider output preview/log metadata in `src/core/quick-fix.ts:276` and `quick-fix.ts:292`.

Provider layer:

- `ProviderExecutionRequest` includes prompt, cwd, model, reasoning effort, optional resume session id, timeout controls, optional result schema, stream paths, and lifecycle callback in `src/core/provider-adapters/shared.ts:81`.
- `ProviderExecutionResult` includes provider, optional session id, stdout/stderr, exit code, parsed result, parse error, error code, signal, timeout, and elapsed/configured timeout in `shared.ts:96`.
- Provider output is schema-parsed by `parseProviderPayload` in `shared.ts:213`.
- Subprocess environment is filtered through `filterEnv` at `shared.ts:427`; the allowlist itself is in `src/infra/env-allowlist.ts:44`.
- Claude Code and Codex adapters both accept result schemas: Claude passes `--json-schema` in `src/core/provider-adapters/claude-code.ts:36`, while Codex builds a structured output schema for non-resume runs in `src/core/provider-adapters/codex.ts:51`.

Layered orchestration:

- `story-orchestrate validate` runs preflight, discovers story-run state, and captures a baseline seed before expensive provider work in `src/sdk/operations/story-orchestrate.ts:377` and `story-orchestrate.ts:526`.
- `story-orchestrate run` discovers whether to start new, start from primitive artifacts, block on an active/resumable run, or report an accepted attempt in `src/sdk/operations/story-orchestrate.ts:224` and `story-orchestrate.ts:246`.
- `discoverStoryRunState` recognizes `start-new`, `start-from-primitive-artifacts`, `existing-accepted-attempt`, `active-attempt-exists`, `resume-required`, and `ambiguous-story-run` in `src/core/story-run-discovery.ts:49`, `story-run-discovery.ts:99`, `story-run-discovery.ts:129`, `story-run-discovery.ts:138`, `story-run-discovery.ts:147`, and `story-run-discovery.ts:154`.
- Story-run persistence is file-backed: current snapshot, event history, final package, progress, and stream paths are constructed in `src/core/story-run-ledger.ts:40` and `story-run-ledger.ts:108`.
- Story-lead is a bounded planner loop. It can run implement, continue, self-review, verify, quick-fix, accept, request ruling, block, or fail; the action schema is in `src/core/story-orchestrate-contracts.ts:473`, and state validation is asserted in `src/core/story-lead-state-machine.ts:364`.
- `runStoryLead` dispatches child primitives from one story-lead-selected action in `src/core/story-lead.ts:1198` and `story-lead.ts:1951`.
- It records interrupted results with replay boundaries and final packages in `story-lead.ts:1414` and terminal packages in `story-lead.ts:3245`.

## CLI-to-SDK Mapping

The CLI-to-SDK mapping is strong and intentional.

- Package docs say the CLI binary and SDK expose the same operation family in `docs/current-state.md:23`.
- The CLI wrappers pass parsed flags and artifact paths into SDK functions, then emit SDK envelopes. Representative mappings:
  - `story-implement` CLI -> `storyImplement(...)`: `src/cli/commands/story-implement.ts:69`.
  - `story-orchestrate run` CLI -> `storyOrchestrateRun(...)`: `src/cli/commands/story-orchestrate-run.ts:53`.
  - `story-orchestrate resume` CLI -> `storyOrchestrateResume(...)`: `src/cli/commands/story-orchestrate-resume.ts:174`.
  - `story-orchestrate status` CLI -> `storyOrchestrateStatus(...)`: `src/cli/commands/story-orchestrate-status.ts:80`.
- SDK operations are the real public surface: they validate input, allocate artifact paths, call core runtime, finalize a typed envelope, and persist it. The shared `finalizeEnvelope` implementation parses the envelope against the result schema and writes it to disk in `src/sdk/operations/shared.ts:132` and `shared.ts:169`.

## Result/Data Contract Observations

`lspec-core` has a deeper result stack than Liminal Build currently exposes.

Provider subprocess result:

- Provider-level result is operational: stdout/stderr, exit code, parsed payload, parse error, timeout/error code, and session id in `src/core/provider-adapters/shared.ts:96`.
- This maps most closely to a missing lower-level diagnostic layer under Liminal Build's `ExecutionResult`, not to `ExecutionResult` itself.

Operation envelope:

- The public envelope is `command`, `version`, `status`, `outcome`, optional `result`, `errors`, `warnings`, `artifacts`, `startedAt`, and `finishedAt` in `src/sdk/contracts/envelope.ts:17`.
- The core schema enforces status/outcome consistency in `src/core/result-contracts.ts:647`.
- `statusForOutcome` maps many operation-specific outcomes into coarse status in `src/core/result-contracts.ts:591`.
- Artifact refs are generic `{ kind, path }` in `src/core/result-contracts.ts:8`.

Primitive result payloads:

- Story implementor/verifier schemas are strict and add provider/model/session/continuation identity around provider payloads in `src/core/result-contracts.ts:209` and `result-contracts.ts:349`.
- Continuation handles are provider/session/story triples in `result-contracts.ts:201`.
- Quick-fix does not require a structured provider payload; it stores raw output preview/log metadata in `result-contracts.ts:548`.

Story orchestration results:

- Current snapshot includes story-run id, story id, attempt, public status, lifecycle state, current child operation, latest artifacts, continuation handles, event sequence, caller input history, next intent, replay boundary, and update time in `src/core/story-orchestrate-contracts.ts:91`.
- Final package includes outcome, evidence groups, verification, risk/deviation review, diff review, acceptance checks, caller input history, runtime identity, replay boundary, log handoff, cleanup handoff, ruling request, and recommended impl-lead action in `story-orchestrate-contracts.ts:575`.
- Run/resume/status result schemas carry current snapshot path, event history path, final package path, and final package payload in `story-orchestrate-contracts.ts:733`, `story-orchestrate-contracts.ts:802`, and `story-orchestrate-contracts.ts:875`.

On-disk artifacts:

- Operation envelopes are persisted under `artifacts/`, with provider progress and stream files next to them. The artifact contract describes result envelopes at `src/skills/ls-impl/operations/33-artifact-contracts.md:132` and runtime progress artifacts at `33-artifact-contracts.md:191`.
- Provider-backed operations also write `progress/*.status.json`, `progress/*.progress.jsonl`, and `streams/*.stdout/stderr.log` according to `src/skills/ls-impl/operations/30-cli-operations.md:209`.

## Alignment/Mismatch With `ExecutionResult`

Strong alignment:

- Both systems distinguish controlled execution from durable platform effects. Liminal Build scripts declare checkpoint candidates and the server writes them; lspec-core provider runs return structured payloads and SDK/core layers wrap/persist them.
- `ExecutionResult.archiveEntries` can represent lspec-core operation envelopes, provider stream summaries, story-run events, and final package references. Liminal Build archive contracts already support process events, tool calls/results, structured bodies, degradation, and provenance in `shared/contracts/archive.ts:59` and `archive.ts:158`.
- `ExecutionResult.sideWorkWrites` maps well to child operation status: implement, self-review, verify, quick-fix, epic verify, and synthesis.
- `ExecutionResult.outputWrites` plus artifact checkpoint candidates map to lspec-core durable result envelopes/final packages when those should become platform artifacts.
- `usedSourceAttachmentIds` and code checkpoint candidates align with source provenance and read/write source handling.
- Liminal Build already has a checkpoint writer that prevents writing read-only sources through `CheckpointPlanner` in `checkpoint-planner.ts:17`.

Important mismatches:

- `ExecutionResult` is a single returned object from a script. `story-orchestrate` is a multi-step durable state machine with snapshots, events, child operations, caller input, replay boundaries, and final packages.
- Liminal process status is `running | waiting | completed | failed | interrupted` in `provider-adapter.ts:131`; lspec-core envelope status is `ok | needs-user-decision | blocked | error`, with many operation outcomes. A direct merge would blur process lifecycle, operation routing, and runtime failure.
- `ExecutionResult` has no top-level structured error/failure object. lspec-core envelopes always carry `errors[]` and `warnings[]`.
- Liminal Build validation is not shared-contract validation. It checks top-level arrays and some code candidate fields, then casts nested fields. lspec-core uses strict Zod schemas and invariant checks for the public envelope and operation payloads.
- Liminal Build current side-effect application replaces current outputs and side-work items from each `ExecutionResult` in `process-environment.service.ts:748` and `process-environment.service.ts:755`; lspec-core story orchestration expects appendable event history and durable child-operation evidence.
- lspec-core artifact paths are spec-pack filesystem paths; Liminal Build canonical artifacts are platform/project artifacts with archive/source provenance.
- lspec-core progress and streams are first-class recovery/diagnostic artifacts; `ExecutionResult` only has final side effects and checkpoint candidates.
- lspec-core continuation handles expose provider/session details. Liminal Build should treat those as runtime/orchestration internals, not as process lifecycle status.

Security note:

- lspec-core filters subprocess environment through an allowlist (`env-allowlist.ts:44` and `provider-adapters/shared.ts:427`).
- Liminal Build's Local provider currently spawns Node without an explicit restricted `env` in `local-provider-adapter.ts:87`; Daytona passes `undefined` env to `executeCommand` in `daytona-provider-adapter.ts:209`. This is adjacent to the sandbox leakage concern and should be fixed independently of the result-shape decision.

## Recommended Integration Approach

Use a three-layer result model.

Layer 1: provider/runtime execution diagnostics.

- Add an internal `RuntimeInvocationResult` equivalent to lspec-core's `ProviderExecutionResult`: provider kind, invocation id, exit code, signal, stdout/stderr refs or redacted previews, parse error, timeout/stall/startup metadata.
- This should not be exposed directly as process completion state.

Layer 2: hardened `ExecutionResult`.

- Move `ExecutionResult` into a shared strict schema, preferably near `shared/contracts` or a server/shared runtime contract module.
- Validate every nested field: process history item shape, archive entries, output writes, side-work writes, artifact candidates, code candidates, and source ids.
- Add structured failure metadata while retaining history item text for user-facing summaries. A minimal shape would be `failure?: { code, message, detail?, retryable? }`.
- Keep checkpoint candidates reference-based. Do not embed full lspec-core operation payload unions directly.

Layer 3: orchestration result/envelope above `ExecutionResult`.

- Introduce a platform `OrchestrationResultEnvelope` inspired by lspec-core's `CliResultEnvelope`: `operation`, `version`, `status`, `outcome`, `errors`, `warnings`, `artifactRefs`, `progressRefs`, `startedAt`, `finishedAt`, and optional `resultRef`/`schemaKey`.
- Add story/process orchestration fields where needed: current snapshot ref, event history ref, final package ref, replay boundary, current child operation, caller input refs, and child operation summaries.
- The platform translator should convert orchestration envelopes into `ExecutionResult` side effects for process history, side-work, archive entries, outputs, checkpoints, and provenance.

Concretely for `lbuild-impl` merge-back:

- Call SDK methods directly from the platform/orchestrator when running in-process; do not shell the CLI unless isolation requires it.
- Preserve CLI-compatible envelopes as archive structured entries or platform artifacts.
- Translate `story-orchestrate` final packages into platform artifact checkpoints and archive entries, not into the base `ExecutionResult` type.
- Translate child operation envelopes into side-work rows and archive/tool-result rows.
- Treat `needs-ruling` / `needs-user-decision` as Liminal `processStatus: waiting`.
- Treat `blocked` as either `waiting` with a current request when user/actionable, or `failed` when runtime/system invalid; this needs an explicit mapping table.
- Treat `interrupted` as Liminal `processStatus: interrupted` and preserve replay boundary in the higher orchestration envelope.

## Specific Risks/Mismatches

1. **Overloaded `ExecutionResult` risk**: Absorbing all CLI/SDK result shapes into `ExecutionResult` would tie the platform runtime boundary to one implementation runtime's story/epic semantics.
2. **Thin validation risk**: Current adapter validation can accept malformed nested archive/history/output data. That is the direct sandbox leakage-adjacent risk.
3. **Failure semantics risk**: Liminal extracts failure reason from history text; lspec-core has structured errors. Without a structured failure field, platform failure handling stays brittle.
4. **Status taxonomy risk**: lspec `blocked`, `error`, `needs-user-decision`, `needs-ruling`, `interrupted`, `pass`, and `revise` do not map one-to-one to Liminal process status.
5. **Artifact canonicality risk**: lspec artifact paths are disk evidence. Liminal Build must convert or bind them into platform artifacts/archive entries instead of treating paths as durable product truth.
6. **Progress loss risk**: If only final `ExecutionResult` is stored, Liminal loses lspec-core's progress/status/stream observability and recovery trail.
7. **Continuation leakage risk**: Provider session ids should remain orchestration internals unless the product intentionally exposes retained sessions.
8. **Source provenance risk**: `deriveUsedSourceAttachmentIds` falls back to code checkpoint candidates only. Read-only source usage needs explicit reporting if lspec-core consumes hydrated source context without writing code.
9. **Replace-vs-append risk**: Liminal's current output/side-work replacement model is not enough for story-run event history and child-operation audit trails.
10. **Environment leakage risk**: Local and Daytona execution should receive explicit minimal envs before more powerful orchestration payloads are run in those environments.

## Next Steps

1. Add a strict shared schema for Liminal `ExecutionResult` and use it from Local, Daytona, and test adapters.
2. Add structured execution failure metadata to `ExecutionResult`; keep process-history text as display/audit evidence, not the only failure carrier.
3. Define a platform `OrchestrationResultEnvelope` above `ExecutionResult`, borrowing lspec-core's envelope fields and adding platform refs for archive/artifact/progress/final package.
4. Write a status/outcome mapping table from lspec-core outcomes to Liminal process status, current request, environment state, side-work status, and archive status.
5. Build a translator spike: one `story-orchestrate validate`, one `story-orchestrate run completed`, one `needs-ruling`, and one `interrupted` fixture mapped into Liminal archive/process/output/checkpoint shapes.
6. Preserve progress/stream artifacts as archive entries or platform artifact refs, with redaction rules.
7. Sanitize Local and Daytona script environments with an explicit allowlist before running any merged-back orchestration runtime.
8. Extend source usage reporting so read-only source reads can generate `informed_work` provenance even when no code checkpoint candidate exists.

