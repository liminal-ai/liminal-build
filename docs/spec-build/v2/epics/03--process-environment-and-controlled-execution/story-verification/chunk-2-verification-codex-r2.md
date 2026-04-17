VERDICT: REVISE

Reviewed:
- prior report: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/chunk-2-verification-codex.md`
- design references: `implementation-addendum.md`, `tech-design-server.md`
- code delta: `git diff 6d8a1f1..ad3fdf6`

## Finding Closure

### Item 7 (ExecutionResult consumption) — PARTIAL

Closed parts:
- `PlatformStore` now has explicit lifecycle transitions for `waiting`, `completed`, and `interrupted` in addition to `running`, with matching `ConvexPlatformStore` and `InMemoryPlatformStore` implementations at `apps/platform/server/services/projects/platform-store.ts:117-120`, `apps/platform/server/services/projects/platform-store.ts:888-914`, and `apps/platform/server/services/projects/platform-store.ts:1397-1415`.
- Matching Convex mutations now exist for those added statuses at `convex/processes.ts:372-397`.
- The orchestrator now handles every `ExecutionResult.processStatus` value explicitly: the `failed` branch is handled in `executeExecution`, and the helper switch is exhaustive for the remaining union members at `apps/platform/server/services/processes/environment/process-environment.service.ts:549-597` and `apps/platform/server/services/processes/environment/process-environment.service.ts:1362-1388`.
- `outputWrites` and `sideWorkWrites` are now always applied, including empty arrays, so durable replace semantics are honored at `apps/platform/server/services/processes/environment/process-environment.service.ts:648-678`.
- The fix-batch added meaningful orchestrator-level tests for:
  - non-empty writes producing durable history/output/side-work plus live publication and lifecycle transition: `tests/service/server/process-execution-orchestrator.test.ts:295-428`
  - empty arrays clearing durable rows and live panels: `tests/service/server/process-execution-orchestrator.test.ts:430-510`
  - status coverage for `running`, `waiting`, `completed`, and `interrupted`: `tests/service/server/process-execution-orchestrator.test.ts:512-563`

Remaining gap:
- There is still no `transitionProcessToFailed` / `markProcessFailed` path in `PlatformStore` or `convex/processes.ts`. I explicitly searched for `transitionProcessToFailed|markProcessFailed` and found no matches.
- When `executionResult.processStatus === 'failed'`, `executeExecution` still bypasses the lifecycle helper, marks only the environment as `failed`, and republishes `currentProcess` unchanged at `apps/platform/server/services/processes/environment/process-environment.service.ts:549-573`.
- Because of that, the new lifecycle plumbing does not fully cover all 5 `processStatus` values at the store/mutation layer, and the new status-matrix test does not cover `failed`.

Conclusion:
- The original Item 7 gap is mostly fixed, but not fully closed against the stricter closure target in this pass.

### Item 8 (fire-and-forget cleanup) — CLOSED

Evidence:
- Fire-and-forget entrypoints now route async rejections into visible failure handling instead of silent swallow: `apps/platform/server/services/processes/environment/process-environment.service.ts:73-83`, `apps/platform/server/services/processes/environment/process-environment.service.ts:232-263`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:457-485`.
- Shared terminal-state helpers exist and publish durable/live failed state: `apps/platform/server/services/processes/environment/process-environment.service.ts:1101-1247`.
- Strengthened tests now cover:
  - rehydrate rejection -> failed durable/live state: `tests/service/server/process-environment-fire-and-forget.test.ts:205-260`
  - rebuild rejection -> failed durable/live state: `tests/service/server/process-environment-fire-and-forget.test.ts:313-378`
  - thrown execution rejection (not just returned failed `ExecutionResult`) -> failed durable/live state: `tests/service/server/process-environment-fire-and-forget.test.ts:385-480`

### New Defect 1 (persisted providerKind ignored after first env creation) — CLOSED

Evidence:
- Provider-kind lookup is centralized in `getAuthoritativeProviderKind` and reused by `upsertEnvironmentState` at `apps/platform/server/services/processes/environment/process-environment.service.ts:85-107`.
- Existing-row operations now read the persisted provider kind rather than the config default:
  - rehydrate: `apps/platform/server/services/processes/environment/process-environment.service.ts:114-137`
  - rebuild: `apps/platform/server/services/processes/environment/process-environment.service.ts:168-203`
  - hydration/ensure: `apps/platform/server/services/processes/environment/process-environment.service.ts:266-311`
  - rehydrate async: `apps/platform/server/services/processes/environment/process-environment.service.ts:360-406`
  - rebuild async: `apps/platform/server/services/processes/environment/process-environment.service.ts:408-455`
  - execute: `apps/platform/server/services/processes/environment/process-environment.service.ts:488-587`
  - checkpoint: `apps/platform/server/services/processes/environment/process-environment.service.ts:711-751`
- Start/resume paths now seed `preparing` with the persisted provider kind instead of blindly reusing the config default: `apps/platform/server/services/processes/process-start.service.ts:36-54` and `apps/platform/server/services/processes/process-resume.service.ts:36-55`.
- Durable persistence preserves the existing provider kind when appropriate in both stores:
  - Convex: `convex/processEnvironmentStates.ts:393-500`
  - In-memory: `apps/platform/server/services/projects/platform-store.ts:1541-1580`
- Regression coverage is strong. `tests/service/server/process-execution-orchestrator.test.ts:565-711` proves an env created as `local` stays `local` after config flips to `daytona` across resumed execution, rehydrate, and rebuild, and that the daytona adapter is never called.

### New Defect 2 (applyExecutionResultSideEffects suppressed persistence failures) — CLOSED

Evidence:
- `applyExecutionResultSideEffects` no longer catches/log-warns/continues; failures now propagate out of the method at `apps/platform/server/services/processes/environment/process-environment.service.ts:648-678`.
- The outer execution path catches those failures, flips the environment to `failed`, and publishes the failure state at `apps/platform/server/services/processes/environment/process-environment.service.ts:611-645`.
- Regression coverage is direct: `tests/service/server/process-execution-orchestrator.test.ts:713-796` simulates an output persistence failure, verifies failed durable/live state, and asserts `console.warn` was not called.

### New Defect 3 (candidate validation did not check file existence) — CLOSED

Evidence:
- `validateCandidateRefs` is now async end-to-end, is awaited from `executeScript`, and checks both working-tree containment and actual file existence via `fs.stat` for artifact `contentsRef` and code `workspaceRef` at `apps/platform/server/services/processes/environment/local-provider-adapter.ts:274-285` and `apps/platform/server/services/processes/environment/local-provider-adapter.ts:448-529`.
- `resolveCandidateContents` no longer falls back to the raw ref string when a file read fails; it throws at `apps/platform/server/services/processes/environment/process-environment.service.ts:1540-1569`.
- Runtime-facing tests cover both missing artifact refs and missing workspace refs and require a failed `ExecutionResult`:
  - missing artifact `contentsRef`: `tests/service/server/local-provider-adapter.test.ts:367-410`
  - missing code `workspaceRef`: `tests/service/server/local-provider-adapter.test.ts:412-456`

## Gate Results

- `corepack pnpm run verify`
  - exit code: `0`
  - Convex tests: `34` passed
  - server tests: `151` passed
  - client tests: `152` passed
- `corepack pnpm run test:integration`
  - exit code: `0`
  - integration tests: `9` passed
- `corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`
  - exit code: `0`

Additional targeted verifier probes:
- `corepack pnpm exec vitest run tests/service/server/process-execution-orchestrator.test.ts` -> `8` passed
- `corepack pnpm exec vitest run tests/service/server/process-environment-fire-and-forget.test.ts` -> `6` passed
- `corepack pnpm exec vitest run tests/service/server/local-provider-adapter.test.ts` -> `14` passed

## New Defects Found

No new fix-batch-specific production defects found beyond the remaining Item 7 partial closure above.

Residual risk, not counted as a new defect:
- Side-effect application is still non-transactional. If history append succeeds and a later output/side-work replace fails, earlier history rows can remain durable before the environment flips to `failed`. I do not count this as newly introduced by `ad3fdf6` because the same write ordering already existed before the fix-batch, but the fix does not address atomic rollback.
