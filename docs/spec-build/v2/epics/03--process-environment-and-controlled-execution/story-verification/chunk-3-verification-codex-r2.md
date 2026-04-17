VERDICT: REVISE

Reviewed workspace `HEAD=77087d467cb0` (target slice `77087d4`).

## Closure Matrix

### Item 10 closure in `process-live.ts` — CLOSED

- Incoming `environment` live messages are now applied verbatim through `applyEnvironment()`. The old recomputation path is gone: ordinary environment upserts now return `next` unchanged, with only checkpoint-context preservation for `rehydrating` / `rebuilding` continuity (`apps/platform/client/app/process-live.ts:94-110,181-183`).
- The reducer therefore now trusts `payload.statusLabel` from `LiveProcessUpdateMessage` for live environment updates.
- `deriveEnvironmentStatusLabel` is still imported in this file, but it is only used for the separate local synthesis path when a `process` message flips a `running` environment to `ready` on waiting (`apps/platform/client/app/process-live.ts:1,79-87,156-161`). That does not rewrite incoming `environment` payloads.
- The two previously accepted derivations remain in place:
  - `defaultEnvironmentSummary` (`apps/platform/shared/contracts/process-work-surface.ts:223-236`)
  - bootstrap-side synthetic `lost` / `unavailable` handling (`apps/platform/client/app/bootstrap.ts:567-599`)

### Item 10 tests strengthened — CLOSED

- `tests/service/client/process-environment-panel.test.ts:18-43` now uses non-canonical custom labels for both running and checkpointing, then asserts the rendered text equals those exact strings.
- `tests/service/client/process-live.test.ts:296-345` does the same for checkpointing and failed live updates.
- `tests/service/client/process-live.test.ts:348-371` also verifies the rendered failure panel preserves the raw server string (`State: provider.exec.stderr.chunk`), so a recomputation regression would now fail visibly.
- The render path itself continues to read `args.environment.statusLabel` directly (`apps/platform/client/features/processes/process-environment-panel.ts:22-26`).

### `CodeCheckpointCandidate` runtime validation — CLOSED

- `validateExecutionResult()` now calls `validateCodeCheckpointCandidates()` before accepting parsed script output (`apps/platform/server/services/processes/environment/local-provider-adapter.ts:363-415`).
- `validateCodeCheckpointCandidates()` rejects any candidate whose `filePath` or `commitMessage` is absent, `undefined`, empty, or whitespace-only because it requires `typeof === 'string'` and `trim().length > 0` (`apps/platform/server/services/processes/environment/local-provider-adapter.ts:418-445`).
- Invalid script output is converted into a failed `ExecutionResult` via `buildFailureExecutionResult(...)` in `executeScript()` (`apps/platform/server/services/processes/environment/local-provider-adapter.ts:230-234`), surfacing a meaningful failure message in `processHistoryItems[0].text`.
- Tests cover both missing-property cases:
  - missing `filePath`: `tests/service/server/local-provider-adapter.test.ts:462-519`
  - missing `commitMessage`: `tests/service/server/local-provider-adapter.test.ts:521-571`
- Residual test gap only: the new tests do not explicitly cover blank-string / whitespace-only values, although the runtime validator would reject them.

## Gate Results

- `corepack pnpm run verify`: exit `0`
  - Convex: 7 files / 35 tests passed
  - Server service: 20 files / 163 tests passed
  - Client service: 19 files / 152 tests passed
- `corepack pnpm run test:integration`: exit `0`
  - 3 files / 12 tests passed
  - `tests/integration/octokit-code-checkpoint-writer-integration.test.ts` contains exactly 3 real-GitHub tests (`:179`, `:208`, `:248`), and its `beforeAll` fails loud if `GITHUB_TOKEN` is missing (`:93-99`), so the green suite means those 3 ran and passed.
- `corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`: exit `0`

## New Defects

### 1. Missing live `payload.statusLabel` is silently accepted and defaulted to `"Not prepared"`

- `environmentSummarySchema` still gives `statusLabel` a default (`apps/platform/shared/contracts/process-work-surface.ts:233-236`).
- `environment` live messages reuse that schema verbatim (`apps/platform/shared/contracts/live-process-updates.ts:87-92`).
- I confirmed the runtime behavior with a direct schema probe using `corepack pnpm exec tsx -e ...`:
  - an `environment` live message with `state: 'ready'` and no `statusLabel` parsed successfully and injected `statusLabel: "Not prepared"`
  - the same message with `statusLabel: ''` was correctly rejected
- Impact: the Item 10 contract violation is fixed for well-formed messages, but malformed live messages missing `statusLabel` now degrade to an incorrect absent-state label instead of being rejected or repaired with a state-consistent fallback.

## Coverage Search

- I did not find evidence that the strengthened tests weakened any other coverage.
- The changed client assertions are stricter, server test volume increased by one test, and the integration lane remained fully green.
- The only new gap I found is the malformed-live-message case above; there is no explicit negative test covering missing or empty `statusLabel` on incoming environment live messages.
