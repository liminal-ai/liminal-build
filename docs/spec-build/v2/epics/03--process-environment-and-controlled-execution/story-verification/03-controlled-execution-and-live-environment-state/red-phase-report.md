# PLAN

## AC and TC coverage

- AC-3.1 `The process surface shows when controlled execution has begun and when it is still actively running in the environment.`
- TC-3.1a `Running execution state visible`
- Planned tests:
- `tests/service/server/process-live-updates.test.ts` -> `TC-3.1a after hydration completes the environment publishes running state`
- `tests/service/client/process-live.test.ts` -> `TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution`

- AC-3.2 `Live execution activity appears as coherent process-facing updates and environment-state changes rather than as an unmanaged terminal session or raw provider fragments.`
- TC-3.2a `Execution activity is process-facing`
- Planned tests:
- `tests/service/client/process-environment-panel.test.ts` -> `TC-3.2a panel renders running state as a process-facing label`
- `tests/service/server/script-execution.service.test.ts` -> `calls provider.executeScript with correct args`
- TC-3.2b `Browser does not reconstruct raw stream fragments`
- Planned tests:
- `tests/service/client/process-environment-panel.test.ts` -> `TC-3.2b panel shows the current coherent state instead of raw fragments`
- `tests/service/server/script-execution.service.test.ts` -> `returns the provider's result unchanged`

- AC-3.3 `The process surface distinguishes environment preparation, active execution, waiting on user action, checkpointing, and settled process states.`
- TC-3.3a `Waiting is distinct from running`
- Planned tests:
- `tests/service/client/process-live.test.ts` -> `TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution`
- TC-3.3b `Checkpointing is distinct from running`
- Planned tests:
- `tests/service/server/process-live-updates.test.ts` -> `TC-3.3b execution success publishes checkpointing state`
- `tests/service/client/process-live.test.ts` -> `TC-3.3b reducer applies checkpointing as a distinct coherent state`

- AC-3.4 `A failure during controlled execution leaves the process surface legible and exposes the next recovery path without erasing the durable process history that already exists.`
- TC-3.4a `Execution failure leaves surface legible`
- Planned tests:
- `tests/service/server/process-live-updates.test.ts` -> `TC-3.4a execution failure publishes failed environment state with blockedReason while keeping the process surface legible`
- `tests/service/client/process-live.test.ts` -> `TC-3.4a execution failure preserves process identity, history, and materials visibility`

## Non-TC decided tests for the Story 3 chunk from the test plan

- `tests/service/server/process-live-updates.test.ts` -> `live publication emits typed current objects rather than raw fragments`
- `tests/service/server/script-execution.service.test.ts` -> `calls provider.executeScript with correct args`
- `tests/service/server/script-execution.service.test.ts` -> `returns the provider's result unchanged`
- `tests/service/client/process-live.test.ts` -> `environment updates do not wipe unrelated history state`
- `tests/service/client/process-live.test.ts` -> `environment updates do not wipe unrelated materials state`

## Likely failure modes expected in RED

- `ScriptExecutionService.executeFor(...)` throws `NOT_IMPLEMENTED`
- `ProcessEnvironmentService.runExecutionAsync(...)` throws `NOT_IMPLEMENTED` and no execution-state live publication occurs yet
- Hydration success still publishes `environment.state = ready` instead of Story 3 `running`
- No `checkpointing` publication is emitted after execution success
- No execution-failure `failed` publication is emitted after hydration success
- Client reducer and environment panel still trust incoming `statusLabel` too literally instead of enforcing coherent state presentation from `environment.state`

## Green-phase skeleton shape being preserved

- Extend `ProviderAdapter` with `executeScript(...)` and a typed `ExecutionResult`
- Keep provider execution behind a new `ScriptExecutionService` wrapper instead of talking to the provider directly from the controller
- Hook execution off the existing hydration-success branch in `ProcessEnvironmentService`
- Publish live `environment` current objects for `running`, `checkpointing`, and `failed`
- Leave checkpoint persistence and `lastCheckpointResult` unchanged in Story 3

# CHANGES

## Skeleton files created or modified

- Modified `apps/platform/server/services/processes/environment/provider-adapter.ts`
- Added `ExecutionResult`
- Added `ProviderAdapter.executeScript(...)`
- Added deterministic `executeScript(...)` stubs to `InMemoryProviderAdapter` and `FailingProviderAdapter`

- Added `apps/platform/server/services/processes/environment/script-execution.service.ts`
- `ScriptExecutionService` constructor accepts `ProviderAdapter`
- `executeFor(...)` currently throws `AppError { code: 'NOT_IMPLEMENTED' }`

- Modified `apps/platform/server/services/processes/environment/process-environment.service.ts`
- Added optional `ScriptExecutionService` dependency slot
- Added post-hydration hook call to `runExecutionAsync(...)`
- Added `runExecutionAsync(...)` placeholder that throws `NOT_IMPLEMENTED`

# TEST_ADDITIONS

- Added `tests/service/server/script-execution.service.test.ts`
- `calls provider.executeScript with correct args`
- `returns the provider's result unchanged`

- Modified `tests/service/server/process-live-updates.test.ts`
- Added describe block `server-driven environment execution`
- `TC-3.1a after hydration completes the environment publishes running state`
- `TC-3.3b execution success publishes checkpointing state`
- `TC-3.4a execution failure publishes failed environment state with blockedReason while keeping the process surface legible`

- Modified `tests/service/client/process-live.test.ts`
- `TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution`
- `TC-3.3b reducer applies checkpointing as a distinct coherent state`
- `TC-3.4a execution failure preserves process identity, history, and materials visibility`

- Added `tests/service/client/process-environment-panel.test.ts`
- `TC-3.2a panel renders running state as a process-facing label`
- `TC-3.2b panel shows the current coherent state instead of raw fragments`

# RED_VERIFY_GATE

## Command

`corepack pnpm run red-verify 2>&1 | tail -60`

## Result

`passed`

## Tail

```text

> liminal-build@ red-verify /Users/leemoore/code/liminal-build
> corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build


> liminal-build@ format:check /Users/leemoore/code/liminal-build
> corepack pnpm exec biome check --formatter-enabled=true --linter-enabled=false --assist-enabled=false apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 160 files in 12ms. No fixes applied.

> liminal-build@ lint /Users/leemoore/code/liminal-build
> corepack pnpm exec biome lint apps convex tests docs/setup README.md package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json biome.json playwright.config.ts vitest.workspace.ts .env.example .gitignore

Checked 161 files in 20ms. No fixes applied.

> liminal-build@ typecheck /Users/leemoore/code/liminal-build
> corepack pnpm exec tsc --noEmit -p tsconfig.json && corepack pnpm --filter @liminal-build/platform typecheck


> @liminal-build/platform@ typecheck /Users/leemoore/code/liminal-build/apps/platform
> tsc --noEmit -p tsconfig.server.json && tsc --noEmit -p tsconfig.client.json


> liminal-build@ build /Users/leemoore/code/liminal-build
> corepack pnpm --filter @liminal-build/platform build


> @liminal-build/platform@ build /Users/leemoore/code/liminal-build/apps/platform
> corepack pnpm run clean && corepack pnpm run build:server && corepack pnpm run build:client


> @liminal-build/platform@ clean /Users/leemoore/code/liminal-build/apps/platform
> node -e "require('fs').rmSync('dist', { recursive: true, force: true })"


> @liminal-build/platform@ build:server /Users/leemoore/code/liminal-build/apps/platform
> tsc -p tsconfig.server.json


> @liminal-build/platform@ build:client /Users/leemoore/code/liminal-build/apps/platform
> vite build

vite v8.0.8 building client environment for production...
transforming...✓ 116 modules transformed.
rendering chunks...
computing gzip size...
dist/client/index.html                  0.42 kB │ gzip:  0.28 kB
dist/client/assets/index-Ckfu23hD.js  121.81 kB │ gzip: 29.54 kB

✓ built in 35ms
```

# TEST_FAILURE_EVIDENCE

## Probe command

`corepack pnpm exec vitest run tests/service/server/script-execution.service.test.ts tests/service/server/process-live-updates.test.ts tests/service/client/process-live.test.ts tests/service/client/process-environment-panel.test.ts 2>&1 | tail -80`

## Probe tail

```text
  },
}

+ Received:
undefined

 ❯ tests/service/server/process-live-updates.test.ts:751:34
    749|     await app.close();
    750|
    751|     expect(checkpointingMessage).toMatchObject({
       |                                  ^
    752|       messageType: 'upsert',
    753|       entityType: 'environment',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/10]⎯

 FAIL  tests/service/server/process-live-updates.test.ts > server-driven environment execution > TC-3.4a execution failure publishes failed environment state with blockedReason while keeping the process surface legible
AssertionError: expected undefined to match object { messageType: 'upsert', …(3) }

- Expected:
{
  "entityId": "environment",
  "entityType": "environment",
  "messageType": "upsert",
  "payload": {
    "blockedReason": "Execution failed after hydration completed.",
    "state": "failed",
  },
}

+ Received:
undefined

 ❯ tests/service/server/process-live-updates.test.ts:832:27
    830|     await app.close();
    831|
    832|     expect(failedMessage).toMatchObject({
       |                           ^
    833|       messageType: 'upsert',
    834|       entityType: 'environment',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/10]⎯

 FAIL  tests/service/server/script-execution.service.test.ts > script execution service > calls provider.executeScript with correct args
Error: Script execution is not implemented yet.
 ❯ ScriptExecutionService.executeFor apps/platform/server/services/processes/environment/script-execution.service.ts:12:11
     10|     void args;
     11|
     12|     throw new AppError({
       |           ^
     13|       code: notImplementedErrorCode,
     14|       message: 'Script execution is not implemented yet.',
 ❯ tests/service/server/script-execution.service.test.ts:26:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/10]⎯

 FAIL  tests/service/server/script-execution.service.test.ts > script execution service > returns the provider's result unchanged
AssertionError: promise rejected "Error: Script execution is not implemente… { …(2) }" instead of resolving
 ❯ tests/service/server/script-execution.service.test.ts:51:6
     49|         environmentId: 'environment-execution-002',
     50|       }),
     51|     ).resolves.toEqual(providerResult);
       |      ^
     52|   });
     53| });

Caused by: Error: Script execution is not implemented yet.
 ❯ ScriptExecutionService.executeFor apps/platform/server/services/processes/environment/script-execution.service.ts:12:11
 ❯ tests/service/server/script-execution.service.test.ts:47:15

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { code: 'NOT_IMPLEMENTED', statusCode: 501 }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/10]⎯


 Test Files  4 failed (4)
      Tests  10 failed | 24 passed (34)
   Start at  20:25:13
   Duration  595ms (transform 197ms, setup 0ms, import 626ms, tests 319ms, environment 0ms)
```

## Failure classification by new test

- `tests/service/server/script-execution.service.test.ts` -> `calls provider.executeScript with correct args`
- Failure reason: explicit `NOT_IMPLEMENTED` from `ScriptExecutionService.executeFor(...)`

- `tests/service/server/script-execution.service.test.ts` -> `returns the provider's result unchanged`
- Failure reason: explicit `NOT_IMPLEMENTED` from `ScriptExecutionService.executeFor(...)`

- `tests/service/server/process-live-updates.test.ts` -> `TC-3.1a after hydration completes the environment publishes running state`
- Failure reason: behavior absent; hydration success still publishes `ready`, so no `running` environment live message exists

- `tests/service/server/process-live-updates.test.ts` -> `TC-3.3b execution success publishes checkpointing state`
- Failure reason: behavior absent; no execution success path publishes `checkpointing`

- `tests/service/server/process-live-updates.test.ts` -> `TC-3.4a execution failure publishes failed environment state with blockedReason while keeping the process surface legible`
- Failure reason: behavior absent; execution failure path is not wired after hydration success, so no failed execution upsert is emitted

- `tests/service/client/process-live.test.ts` -> `TC-3.1a / TC-3.3a reducer keeps waiting distinct from active environment execution`
- Failure reason: behavior absent; reducer leaves a previously running environment untouched when the process moves to `waiting`

- `tests/service/client/process-live.test.ts` -> `TC-3.3b reducer applies checkpointing as a distinct coherent state`
- Failure reason: behavior absent; reducer accepts the raw transport-facing `statusLabel` instead of normalizing the coherent checkpointing label from `environment.state`

- `tests/service/client/process-live.test.ts` -> `TC-3.4a execution failure preserves process identity, history, and materials visibility`
- Failure reason: behavior absent; reducer preserves identity/history/materials but still trusts a raw failure `statusLabel` instead of coherent failed-state presentation

- `tests/service/client/process-environment-panel.test.ts` -> `TC-3.2a panel renders running state as a process-facing label`
- Failure reason: behavior absent; panel renders raw incoming `statusLabel` instead of the coherent running label derived from state

- `tests/service/client/process-environment-panel.test.ts` -> `TC-3.2b panel shows the current coherent state instead of raw fragments`
- Failure reason: behavior absent; panel renders raw incoming `statusLabel` instead of the coherent checkpointing label derived from state

# SPEC_CONCERNS

- The Story 3 contract exposes `environment.statusLabel` as already user-visible, but AC-3.2b also says the browser must not surface raw fragments. Green phase needs an explicit decision on whether normalization is server-only, client-defensive, or both.
- The story clearly requires `waiting` to be distinct from `environment.state = running`, but it does not explicitly say whether a process `waiting` update alone should clear a stale running environment state in the client before a later environment upsert arrives.
