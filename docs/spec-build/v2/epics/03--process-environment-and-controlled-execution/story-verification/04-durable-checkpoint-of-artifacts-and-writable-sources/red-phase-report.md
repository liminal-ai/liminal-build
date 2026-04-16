# PLAN

## AC and TC coverage plan

- `AC-4.1 Durable artifact checkpoint`
  - `TC-4.1a`
    - File: `tests/service/server/process-live-updates.test.ts`
    - Test: `TC-4.1a publishes a successful checkpoint result through the environment upsert`
  - `TC-4.1b`
    - File: `convex/processEnvironmentStates.test.ts`
    - Test: `TC-4.1b durable-state portion only — reopen exercise in Story 6`
    - Note: Story 4 owns durable state population only; reopen restoration remains deferred to Story 6.
- `AC-4.2 Writable-source code checkpoint`
  - `TC-4.2a`
    - File: `tests/service/server/process-actions-api.test.ts`
    - Test: `TC-4.2a plans writable source code checkpoint targets`
  - `TC-4.2b`
    - File: `tests/service/client/process-environment-panel.test.ts`
    - Test: `TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly`
- `AC-4.3 Read-only source exclusion`
  - `TC-4.3a`
    - File: `tests/service/server/process-actions-api.test.ts`
    - Test: `TC-4.3a excludes read_only sources from code checkpoint planning`
- `AC-4.4 Checkpoint result visibility`
  - `TC-4.4a`
    - File: `tests/service/client/process-environment-panel.test.ts`
    - Test: `TC-4.4a artifact checkpoint result renders an outcome badge and target label`
  - `TC-4.4b`
    - File: `tests/service/client/process-environment-panel.test.ts`
    - Test: `TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly`
- `AC-4.5 Checkpoint failure visibility`
  - `TC-4.5a`
    - File: `tests/service/client/process-environment-panel.test.ts`
    - Test: `TC-4.5a artifact checkpoint failure renders a failed badge and failure reason`
  - `TC-4.5b`
    - File: `tests/service/server/process-live-updates.test.ts`
    - Test: `TC-4.5b publishes a failed checkpoint result with failureReason through the environment upsert`

## Non-TC decided tests from the test plan

- `convex/processEnvironmentStates.test.ts`
  - `stores lastCheckpointResult and lastCheckpointAt on environment upsert`
  - `stores and overwrites lastCheckpointResult with latest-only semantics`
- `tests/service/server/process-actions-api.test.ts`
  - `S4-NT-1 artifact candidates remain eligible even when code candidates are skipped`
- `tests/service/server/code-checkpoint-writer.test.ts`
  - `resolves a successful code checkpoint write for writable sources`
  - `returns a failed outcome with failureReason when canonical code persistence fails`

## Likely RED failure modes

- `CheckpointPlanner.planFor()` rejects with `NOT_IMPLEMENTED`.
- `CodeCheckpointWriter` stub implementations reject with `NOT_IMPLEMENTED`.
- `upsertProcessEnvironmentState` accepts checkpoint fields at the type/validator seam but does not persist them yet.
- `ProcessEnvironmentService` reaches `checkpointing` but does not publish a settled `lastCheckpointResult`.
- `process-environment-panel` still lacks the clearer outcome-badge presentation Story 4 expects.

## Green-phase implementation approach

- Implement `CheckpointPlanner.planFor()` to classify `artifact` / `code` / `mixed` / clean-skip and enforce `read_write` gating.
- Implement `CodeCheckpointWriter.writeFor()` fake success/failure variants without real HTTP or `@octokit/rest`.
- Extend checkpoint execution after `checkpointing` to collect provider candidates, persist artifact outputs, write code diffs, settle `lastCheckpointResult`, and emit one `process_event`.
- Update the environment panel to render a clear succeeded/failed outcome badge plus target label/ref/failure messaging.

# CHANGES

- Added checkpoint skeleton types in `apps/platform/server/services/processes/environment/checkpoint-types.ts`.
- Extended `ProviderAdapter` with `collectCheckpointCandidate()` and stubbed it in `InMemoryProviderAdapter` / `FailingProviderAdapter`.
- Added `CheckpointPlanner` and `CodeCheckpointWriter` modules with red-phase `NOT_IMPLEMENTED` behavior.
- Extended `ProcessEnvironmentService` constructor for optional checkpoint seams and added the private `runCheckpointAsync()` red seam.
- Extended `PlatformStore.upsertProcessEnvironmentState()` signatures to accept `lastCheckpointAt` and `lastCheckpointResult`.
- Added `persistCheckpointArtifacts()` as a typed red seam on `PlatformStore`.
- Extended `convex/processEnvironmentStates.ts` validators to accept checkpoint fields without implementing persistence yet.
- Added 13 Story 4 red tests across Convex, server, and client seams.

# TEST_ADDITIONS

## `convex/processEnvironmentStates.test.ts`

- `stores lastCheckpointResult and lastCheckpointAt on environment upsert`
- `stores and overwrites lastCheckpointResult with latest-only semantics`
- `TC-4.1b durable-state portion only — reopen exercise in Story 6`

## `tests/service/server/process-actions-api.test.ts`

- `TC-4.2a plans writable source code checkpoint targets`
- `TC-4.3a excludes read_only sources from code checkpoint planning`
- `S4-NT-1 artifact candidates remain eligible even when code candidates are skipped`

## `tests/service/server/process-live-updates.test.ts`

- `TC-4.1a publishes a successful checkpoint result through the environment upsert`
- `TC-4.5b publishes a failed checkpoint result with failureReason through the environment upsert`

## `tests/service/client/process-environment-panel.test.ts`

- `TC-4.4a artifact checkpoint result renders an outcome badge and target label`
- `TC-4.2b and TC-4.4b code checkpoint result renders source target and ref clearly`
- `TC-4.5a artifact checkpoint failure renders a failed badge and failure reason`

## `tests/service/server/code-checkpoint-writer.test.ts`

- `resolves a successful code checkpoint write for writable sources`
- `returns a failed outcome with failureReason when canonical code persistence fails`

# RED_VERIFY_GATE

Command:

```bash
corepack pnpm run red-verify 2>&1 | tail -30
```

Tail:

```text
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
dist/client/assets/index-B-7t4JW_.js  121.98 kB │ gzip: 29.60 kB

✓ built in 28ms
```

Result: `passed`

# TEST_FAILURE_EVIDENCE

## Exact required probe

Command:

```bash
corepack pnpm exec vitest run convex/processEnvironmentStates.test.ts tests/service/server/process-actions-api.test.ts tests/service/server/process-live-updates.test.ts tests/service/client/process-environment-panel.test.ts 2>&1 | tail -80
```

Tail:

```text

 FAIL  tests/service/server/process-actions-api.test.ts > checkpoint planner > S4-NT-1 artifact candidates remain eligible even when code candidates are skipped
AssertionError: promise rejected "Error: NOT_IMPLEMENTED: CheckpointPlanner…" instead of resolving
 ❯ tests/service/server/process-actions-api.test.ts:1208:6
    1206|         },
    1207|       }),
    1208|     ).resolves.toEqual({
       |      ^
    1209|       artifactTargets: [
    1210|         {

Caused by: Error: NOT_IMPLEMENTED: CheckpointPlanner.planFor
 ❯ CheckpointPlanner.planFor apps/platform/server/services/processes/environment/checkpoint-planner.ts:11:11
 ❯ tests/service/server/process-actions-api.test.ts:1185:15

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/11]⎯

 FAIL  tests/service/server/process-live-updates.test.ts > server-driven environment execution > TC-4.1a publishes a successful checkpoint result through the environment upsert
AssertionError: expected undefined to match object { messageType: 'upsert', …(2) }

- Expected:
{
  "entityType": "environment",
  "messageType": "upsert",
  "payload": {
    "lastCheckpointResult": {
      "checkpointKind": "artifact",
      "outcome": "succeeded",
    },
  },
}

+ Received:
undefined

 ❯ tests/service/server/process-live-updates.test.ts:917:41
    915|     await app.close();
    916|
    917|     expect(successfulCheckpointMessage).toMatchObject({
       |                                         ^
    918|       messageType: 'upsert',
    919|       entityType: 'environment',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/11]⎯

 FAIL  tests/service/server/process-live-updates.test.ts > server-driven environment execution > TC-4.5b publishes a failed checkpoint result with failureReason through the environment upsert
AssertionError: expected undefined to match object { messageType: 'upsert', …(2) }

- Expected:
{
  "entityType": "environment",
  "messageType": "upsert",
  "payload": {
    "lastCheckpointResult": {
      "checkpointKind": "code",
      "failureReason": Any<String>,
      "outcome": "failed",
    },
  },
}

+ Received:
undefined

 ❯ tests/service/server/process-live-updates.test.ts:997:37
    995|     await app.close();
    996|
    997|     expect(failedCheckpointMessage).toMatchObject({
       |                                     ^
    998|       messageType: 'upsert',
    999|       entityType: 'environment',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/11]⎯


 Test Files  4 failed (4)
      Tests  11 failed | 35 passed (46)
   Start at  21:07:01
   Duration  654ms (transform 266ms, setup 0ms, import 854ms, tests 463ms, environment 0ms)
```

## Supplemental full-new-test classification

Command:

```bash
corepack pnpm exec vitest run convex/processEnvironmentStates.test.ts tests/service/server/process-actions-api.test.ts tests/service/server/process-live-updates.test.ts tests/service/client/process-environment-panel.test.ts tests/service/server/code-checkpoint-writer.test.ts --reporter=json --outputFile /tmp/story4-red-tests.json
```

Summary:

- `13` new tests failed
- `35` pre-existing tests passed in the same files
- JSON evidence written to `/tmp/story4-red-tests.json`

Classification:

- `convex/processEnvironmentStates.test.ts`
  - All 3 failures are expected `behavior absent` failures: checkpoint fields remain `null` because persistence is not implemented yet.
- `tests/service/server/process-actions-api.test.ts`
  - All 3 failures are expected `NOT_IMPLEMENTED` failures from `CheckpointPlanner.planFor`.
- `tests/service/server/process-live-updates.test.ts`
  - Both failures are expected `behavior absent` failures: no environment upsert carries a settled `lastCheckpointResult`.
- `tests/service/client/process-environment-panel.test.ts`
  - All 3 failures are expected `behavior absent` failures: no outcome badge is rendered yet.
- `tests/service/server/code-checkpoint-writer.test.ts`
  - Both failures are expected `NOT_IMPLEMENTED` failures from the stub writer implementations.

Assessment: `ALL_FAIL_FOR_RIGHT_REASON = true`

# SPEC_CONCERNS

- The story’s required failing-test probe omits the standalone writer file. I kept the exact requested probe intact and added one supplemental JSON run so the report can classify all 13 new tests, including `tests/service/server/code-checkpoint-writer.test.ts`.
- The story scope wants a deterministic failing writer variant for later green tests, but the red-phase rule explicitly says stub methods should throw `NOT_IMPLEMENTED`. This report follows the red rule so the new writer tests stay red for the intended reason.
