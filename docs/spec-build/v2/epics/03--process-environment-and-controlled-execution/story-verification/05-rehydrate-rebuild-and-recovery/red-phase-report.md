# Story 5 RED Phase Report

Date: `2026-04-15`
Story: `05-rehydrate-rebuild-and-recovery`
Phase: `RED`

## Scope Executed

Skeleton added without green behavior:

- `POST /api/projects/:projectId/processes/:processId/rehydrate`
- `POST /api/projects/:projectId/processes/:processId/rebuild`
- `ProcessEnvironmentService.rehydrate(...)` stub
- `ProcessEnvironmentService.rebuild(...)` stub
- `ProviderAdapter.rehydrateEnvironment(...)` stub
- `ProviderAdapter.rebuildEnvironment(...)` stub
- browser API calls for rehydrate/rebuild
- client page wiring for rehydrate/rebuild actions
- contract/schema updates for `rehydrating`, recovery responses, and `NOT_IMPLEMENTED`

Hard-rule status:

- Green behavior not implemented
- Server recovery entry points currently return `501 NOT_IMPLEMENTED`
- Stories 2-4 start/resume/respond behavior preserved

## Story 5 Test Inventory

New RED tests added: `13`

### `tests/service/server/process-actions-api.test.ts`

- `TC-5.2a rehydrate refreshes stale working copy`
- `TC-5.3a rebuild replaces lost environment`
- `TC-5.3b rebuild does not depend on prior working copy survival`
- `rehydrate rejects immediately when environment is not recoverable`
- `rebuild rejects immediately when canonical prerequisites are missing`
- `rehydrate rejects immediately when environment lifecycle is unavailable before acceptance`

### `tests/service/server/process-live-updates.test.ts`

- `publishes a rehydrating environment transition with a recomputed process summary when rehydrate is accepted`
- `publishes a rebuilding environment transition with a recomputed process summary when rebuild is accepted`

### `tests/service/client/process-live.test.ts`

- `TC-5.2b rehydrate keeps the latest checkpoint result visible while recovery is in progress`
- `TC-5.4b rebuilding keeps the latest checkpoint result visible while recovery is in progress`

### `tests/service/client/process-controls.test.ts`

- `recovery controls distinguish rehydrating from generic preparing state`

### `tests/service/client/process-work-surface-page.test.ts`

- `TC-5.5a rebuild blocked by missing canonical prerequisite keeps the blocked recovery reason visible on the surface`
- `TC-5.5b rehydrate blocked when rebuild is required promotes rebuild guidance on the visible recovery controls`

## AC / TC Coverage In This RED Slice

- `AC-5.1`: recovery state distinction continued through control-state coverage, with new `rehydrating` distinction test added
- `AC-5.2`: `TC-5.2a` server acceptance path added; `TC-5.2b` client recovery-state preservation added
- `AC-5.3`: `TC-5.3a` and `TC-5.3b` server rebuild acceptance tests added
- `AC-5.4`: client durable checkpoint visibility preservation added for in-session recovery transitions
- `AC-5.5`: page-level blocked recovery visibility tests added

Note:

- The epic test plan places `TC-5.4a` and `TC-5.4b` deeper in integration coverage.
- For this RED slice, durable-truth preservation is asserted at the client/store layer in the user-requested files.

## Verification

### Typecheck

Command:

```sh
corepack pnpm typecheck
```

Result: passed

### RED Gate

Command:

```sh
corepack pnpm run red-verify 2>&1 | tail -30
```

Exact gate output:

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
dist/client/assets/index-C7CcfmIG.js  123.56 kB │ gzip: 29.79 kB

✓ built in 32ms
```

Result: passed

### Failing-Test Probe

Server probe command:

```sh
corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts tests/service/server/process-live-updates.test.ts --environment node
```

Observed result:

- `8` new Story 5 tests failed
- all server failures were caused by the intentional `501 NOT_IMPLEMENTED` recovery stubs

Failure summary:

- `TC-5.2a rehydrate refreshes stale working copy` expected `200`, received `501`
- `TC-5.3a rebuild replaces lost environment` expected `200`, received `501`
- `TC-5.3b rebuild does not depend on prior working copy survival` expected `200`, received `501`
- `rehydrate rejects immediately when environment is not recoverable` expected `409`, received `501`
- `rebuild rejects immediately when canonical prerequisites are missing` expected `422`, received `501`
- `rehydrate rejects immediately when environment lifecycle is unavailable before acceptance` expected `503`, received `501`
- `publishes a rehydrating environment transition with a recomputed process summary when rehydrate is accepted` expected `200`, received `501`
- `publishes a rebuilding environment transition with a recomputed process summary when rebuild is accepted` expected `200`, received `501`

Client probe command:

```sh
corepack pnpm exec vitest run tests/service/client/process-live.test.ts tests/service/client/process-controls.test.ts tests/service/client/process-work-surface-page.test.ts --environment jsdom
```

Observed result:

- `5` new Story 5 tests failed
- all client failures were caused by missing recovery behavior, not harness drift

Failure summary:

- `recovery controls distinguish rehydrating from generic preparing state`
  received `preparing` copy instead of distinct `rehydrating` copy
- `TC-5.2b rehydrate keeps the latest checkpoint result visible while recovery is in progress`
  reducer wiped `lastCheckpointResult`
- `TC-5.4b rebuilding keeps the latest checkpoint result visible while recovery is in progress`
  reducer wiped `lastCheckpointResult`
- `TC-5.5a rebuild blocked by missing canonical prerequisite keeps the blocked recovery reason visible on the surface`
  page kept old environment blocked reason instead of surfacing prerequisite failure
- `TC-5.5b rehydrate blocked when rebuild is required promotes rebuild guidance on the visible recovery controls`
  page left rebuild disabled instead of promoting rebuild guidance

## RED Conclusion

The Story 5 skeleton is in place and the RED lane is behaving as intended:

- compile/build gates pass
- new recovery tests are present
- all `13` new Story 5 tests fail
- failures are for the right reasons:
  - server: intentional `NOT_IMPLEMENTED` recovery stubs
  - client: missing recovery-state distinction / preservation / blocked-state promotion behavior
