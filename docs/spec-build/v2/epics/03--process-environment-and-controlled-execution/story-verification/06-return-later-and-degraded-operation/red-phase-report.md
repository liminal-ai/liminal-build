# Story 6 RED Phase Report

Date: `2026-04-15`
Story: `06-return-later-and-degraded-operation`
Phase: `RED`

## Scope Executed

This was a verification-heavy RED slice. No green behavior was implemented.

Added in this pass:

- one test-only fixture for reopened absent-environment checkpoint state:
  `codeCheckpointedAbsentEnvironmentProcessWorkSurfaceFixture`
- `6` new Story 6 tests across integration, server API, client page, and client live reconciliation

Hard-rule status:

- no new routes, services, or provider integrations added
- no green implementation work added
- Story 6 behavior is being verified against existing durable bootstrap and live-degradation seams

## Story 6 Test Inventory

New RED tests added: `6`

### `tests/integration/process-work-surface.test.ts`

- `TC-6.1a and TC-6.2a reopen keeps the Story 4 code checkpoint visible after the active environment is gone`
- `TC-6.4a finalized history is not duplicated on reopen`
- `TC-6.4b reopen keeps prior checkpoint visibility in environment state instead of replaying it as new history`

### `tests/service/server/process-work-surface-api.test.ts`

- `TC-6.1a bootstrap keeps the latest durable code checkpoint visible when the environment is absent on reopen`

### `tests/service/client/process-work-surface-page.test.ts`

- `TC-6.3a durable surface remains usable when live setup fails after reopen restores a checkpoint`

### `tests/service/client/process-live.test.ts`

- `TC-6.4b environment checkpoint visibility remains separate from finalized history`

## AC / TC Coverage In This RED Slice

- `AC-6.1 / TC-6.1a`: integration reopen flow plus server bootstrap contract assertion
- `AC-6.2 / TC-6.2a`: integration reopen flow proves checkpoint/material visibility remains after active environment absence
- `AC-6.3 / TC-6.3a`: client page bootstrap + websocket failure path keeps durable surface usable
- `AC-6.4 / TC-6.4a`: integration reopen flow asserts finalized history ids do not duplicate
- `AC-6.4 / TC-6.4b`: integration reopen flow plus client live reducer assertion keep checkpoint visibility separate from history replay
- `TC-4.1b` carry-forward exercise: the integration reopen test uses a durable code checkpoint with writable source context and confirms it is still visible after reopen

## Targeted Test Probe

Node probe command:

```sh
corepack pnpm exec vitest run tests/integration/process-work-surface.test.ts tests/service/server/process-work-surface-api.test.ts --environment node
```

Observed result:

- `2` files passed
- `21` total tests passed
- all `4` new Story 6 node-side tests passed immediately

Client probe command:

```sh
corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts tests/service/client/process-live.test.ts --environment jsdom
```

Observed result:

- `2` files passed
- `67` total tests passed
- all `2` new Story 6 client-side tests passed immediately

## Verification

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
[2K
transforming...✓ 116 modules transformed.
rendering chunks...
computing gzip size...
dist/client/index.html                  0.42 kB │ gzip:  0.29 kB
dist/client/assets/index-DG4i2-1C.js  126.17 kB │ gzip: 30.33 kB

✓ built in 29ms
```

Result: passed

### Full Verify

Command:

```sh
corepack pnpm run verify 2>&1 | tail -30
```

Exact gate output:

```text
      Tests  12 passed (12)
   Start at  22:40:22
   Duration  166ms (transform 119ms, setup 0ms, import 199ms, tests 18ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  102 passed (102)
   Start at  22:40:23
   Duration  778ms (transform 1.16s, setup 0ms, import 3.07s, tests 921ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  148 passed (148)
   Start at  22:40:24
   Duration  1.15s (transform 1.60s, setup 0ms, import 2.97s, tests 643ms, environment 8.86s)
```

Result: passed

## RED Conclusion

Story 6 behaved like a verification story rather than a missing-implementation story:

- `6` new Story 6 tests were added
- `6` of `6` passed immediately
- `0` failed for a product-behavior gap
- durable reopen, checkpoint persistence, and live-degradation behavior already existed strongly enough to satisfy the new coverage
