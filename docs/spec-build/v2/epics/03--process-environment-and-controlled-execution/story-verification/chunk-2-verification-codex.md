VERDICT: BLOCK

Reviewed commit `6d8a1f1` against:
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/implementation-addendum.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/chunk-1-verification-codex-r2.md`
- `git diff dad936e..6d8a1f1`

Chunk 1’s Convex durability baseline remains intact. Chunk 2 closes part of the remaining gap, but it does not fully close Item 7, and it introduces a new provider-selection defect that violates the tech-design’s durable-provider policy.

## Gap Matrix

| Item | Status | Evidence | Notes |
|---|---|---|---|
| 1. Production default no longer uses `InMemoryProviderAdapter` | SATISFIED | `apps/platform/server/app.ts:145-169` now builds `DefaultProviderAdapterRegistry([new LocalProviderAdapter(...), new DaytonaProviderAdapter()])` and passes that registry into `ScriptExecutionService`, `ProcessEnvironmentService`, `ProcessStartService`, and `ProcessResumeService`. `tests/utils/build-app.ts:13-20` keeps `InMemoryProviderAdapter` only as a test default seam. | The production call path is now `createApp()` -> `ProcessStartService` / `ProcessResumeService` -> `ProcessEnvironmentService` -> `providerAdapterRegistry.resolve(...)`, not the old hard-wired fake. Coverage is mostly unit-level rather than an app-level production wiring test, but the production composition root itself is fixed. |
| 2. Real provider adapter files exist and are wired | WEAKENED | `apps/platform/server/services/processes/environment/local-provider-adapter.ts:149-226,229-345` implements the full interface and does real filesystem work. `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:14-63` exists and every method throws `NOT_IMPLEMENTED`. `apps/platform/server/services/processes/environment/provider-adapter-registry.ts:4-47` resolves `local` and `daytona`. Tests exist at `tests/service/server/local-provider-adapter.test.ts:35-440`, `tests/service/server/daytona-provider-adapter.test.ts:18-70`, and `tests/service/server/provider-adapter-registry.test.ts:14-55`. | The files now exist and the local adapter really spawns `node` (`local-provider-adapter.ts:104-117,229-285`) and really reads artifact content / invokes git clone (`162-226`). I also ran a runtime probe against the production default TS-module payload and it returned a completed `ExecutionResult`, so the local execution lane is real. The weakness is source hydration on real app data: `createApp()` does not inject a clone-URL resolver (`app.ts:149-154`), the durable source model has no repo URL field (`convex/sourceAttachments.ts:5-24,46-57`), and unresolved sources are silently skipped (`local-provider-adapter.ts:194-199`). That means the local adapter is only partially real for source attachments on the production path. |
| 7. `ExecutionResult` shape is extended and consumed end-to-end | NOT CLOSED | The interface now matches the spec at `apps/platform/server/services/processes/environment/provider-adapter.ts:94-100`, consistent with `tech-design-server.md:564-571`. Old `collectCheckpointCandidate` is gone entirely (`rg -n collectCheckpointCandidate` returned no matches). `artifactCheckpointCandidates` and `codeCheckpointCandidates` do reach the checkpoint planner at `apps/platform/server/services/processes/environment/process-environment.service.ts:725-733`. | The orchestrator does not consume the new contract correctly. `processStatus` is only checked for `'failed'` at `process-environment.service.ts:498-519`; there is no lifecycle write path for `waiting`, `completed`, or `interrupted`, and the only lifecycle mutation in `PlatformStore` is `transitionProcessToRunning` (`apps/platform/server/services/projects/platform-store.ts:117,793-797`). `outputWrites` and `sideWorkWrites` are only applied when non-empty (`process-environment.service.ts:618-639`), which breaks replace semantics against the durable replace mutations in `convex/processOutputs.ts:36-99` and `convex/processSideWorkItems.ts:39-91`. Tests were updated to the new fixture shape (`tests/service/server/script-execution.service.test.ts:42-87`, `tests/service/server/process-live-updates.test.ts:717-748,1017-1052`), but I did not find any orchestrator-level test proving lifecycle updates, replace-on-empty behavior, or live publication of script-emitted history/materials/side-work. This does not satisfy `tech-design-server.md:855-860`. |
| 8. Fire-and-forget failures are no longer silently swallowed | WEAKENED | `runHydrationAsync` now catches at `apps/platform/server/services/processes/environment/process-environment.service.ts:70-79`. `runRehydrateAsync` and `runRebuildAsync` now catch at `199-231` instead of using `.catch(() => {})`. `runExecutionAsync` catches at `430-445`. Post-hydration transition to running is wrapped at `282-300`. Visible failed-state helpers exist at `1063-1212`, and execution failure handling is at `549-583`. Tests cover durable failure transitions in `tests/service/server/process-environment-fire-and-forget.test.ts:92-217`, live failed hydration publication in `tests/service/server/process-live-updates.test.ts:491-648`, and live failed execution publication in `tests/service/server/process-live-updates.test.ts:905-1126`. | The code now does the right thing in the main fire-and-forget paths: visible `failed` transitions, live publication attempts, and secondary-failure logging instead of silent `.catch(() => {})`. The weakness is coverage. I did not find tests proving live failed publication for rehydrate or rebuild failures, and I did not find a test where `runExecutionAsync` handles a thrown rejection rather than a returned failed `ExecutionResult`. |
| 12. Default provider switch to `daytona` | SATISFIED | `apps/platform/server/config.ts:24-31` changes `DEFAULT_ENVIRONMENT_PROVIDER_KIND` to default to `'daytona'` and adds `LOCAL_PROVIDER_WORKSPACE_ROOT`. `apps/platform/server/config.ts:36-50` keeps `story0PlaceholderEnv.DEFAULT_ENVIRONMENT_PROVIDER_KIND = 'local'`. `apps/platform/server/app.ts:149-169,171-188` wires both through the registry and process environment services. | The config default change is correct and is actually wired through the production composition root. Separate from this item, the runtime does not honor persisted `providerKind` once an environment row already exists; that is a new defect described below, not a failure of the default-value change itself. |

## Design Decisions

### `HydrationPlan.fingerprint` propagated as `''`

Disposition: acceptable for Chunk 2, but it is a real missing wire.

Evidence:
- `apps/platform/server/services/processes/environment/process-environment.service.ts:1236-1283` builds the adapter-facing `HydrationPlan` and hard-codes `fingerprint: ''`.
- `apps/platform/server/services/processes/environment/local-provider-adapter.ts:222-225` simply echoes `plan.fingerprint` back into `HydrationResult`.
- The durable stale check does not use this field. It is computed from canonical durable state at read time in `convex/processEnvironmentStates.ts:378-385`, and durable writes recompute/store the fingerprint in `convex/processEnvironmentStates.ts:455-463,551-559`.
- The current `EnvironmentSummary` contract still omits both `providerKind` and `workingSetFingerprint` at `apps/platform/shared/contracts/process-work-surface.ts:223-247`, even though the authoritative tech design includes them at `tech-design-server.md:458-478`.

Conclusion:
- The empty string does not break Chunk 1’s stale detection chain today, because stale detection is driven entirely by the durable Convex fingerprint.
- There is still a missing wire: the server contract cannot surface the stored fingerprint to the adapter path, so if a future adapter actually depends on `HydrationPlan.fingerprint`, this chunk has not prepared that contract correctly.

### Optional `getWorkspaceHandle`

Disposition: acceptable as a Chunk 2 extension, but only because Daytona remains a throwing skeleton.

Evidence:
- The spec’d `ProviderAdapter` interface remains six methods at `apps/platform/server/services/processes/environment/provider-adapter.ts:103-120`, matching `tech-design-server.md:573-590`.
- `LocalProviderAdapter` adds `getWorkspaceHandle()` as an adapter-only method at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:337-345`.
- The orchestrator duck-types it at `apps/platform/server/services/processes/environment/process-environment.service.ts:960-979` and falls back to `null` otherwise.
- `DaytonaProviderAdapter` throws `NOT_IMPLEMENTED` for every method, including `executeScript`, at `apps/platform/server/services/processes/environment/daytona-provider-adapter.ts:30-63`.

Conclusion:
- `getWorkspaceHandle` is optional, not required.
- Today that is safe enough because the only adapter that needs a filesystem working tree is `LocalProviderAdapter`, and the Daytona path never reaches checkpoint planning because it throws earlier.
- If a future real remote adapter returns candidate refs that are not directly readable by the server, this should become a first-class contract method rather than a duck-typed extension.

## Gate Results

- `corepack pnpm run verify`
  - exit code: `0`
  - convex tests: `34` passed
  - server tests: `138` passed
  - client tests: `152` passed
- `corepack pnpm run test:integration`
  - exit code: `0`
  - integration tests: `9` passed
- `corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`
  - exit code: `0`

## New Defects Found

- High: persisted `providerKind` is ignored after first creation.
  - The tech design says the stored `providerKind` must remain authoritative after the first environment creation (`tech-design-server.md:84-112`).
  - The implementation always resolves and rewrites using the current config default instead. See `apps/platform/server/services/processes/process-start.service.ts:40-47`, `apps/platform/server/services/processes/process-resume.service.ts:43-50`, and repeated `this.defaultEnvironmentProviderKind` use in `apps/platform/server/services/processes/environment/process-environment.service.ts:102,165,242,332,377,471,485,719,1075,1123,1175`.
  - Effect: if a process was created under `daytona` and the operator later changes config to `local` (or vice versa), resume, rehydrate, rebuild, execution, and checkpointing can use the wrong adapter and overwrite the env row with the new default.

- High: `applyExecutionResultSideEffects` silently suppresses persistence failures.
  - `apps/platform/server/services/processes/environment/process-environment.service.ts:591-647` catches history/output/side-work write failures, logs `console.warn`, and then continues.
  - Because those errors are swallowed rather than rethrown, the outer execution path can advance to checkpointing or ready while durable history, outputs, or side-work are partially missing.
  - This reintroduces invisible data loss in a different part of the execution lane, even though the explicit fire-and-forget `.catch(() => {})` sites were cleaned up.

- Medium: `LocalProviderAdapter` does not actually validate candidate-file existence.
  - `apps/platform/server/services/processes/environment/local-provider-adapter.ts:275-285` says it rejects nonexistent refs, but `validateCandidateRefs()` at `448-489` only checks path containment, not existence.
  - `apps/platform/server/services/processes/environment/process-environment.service.ts:1473-1496` then falls back to returning the raw ref string if the file read fails.
  - I confirmed this with a runtime probe: a result file containing `contentsRef: 'missing-artifact.md'` was accepted as a successful `ExecutionResult` instead of being converted to failure. That can feed checkpoint planning bogus path strings instead of real artifact/code contents.

I did not find skipped tests or commented-out assertions in the diff. The main problem is not hidden failures in the gate lane; it is that the production execution/orchestration behavior still diverges from the authoritative server design.
