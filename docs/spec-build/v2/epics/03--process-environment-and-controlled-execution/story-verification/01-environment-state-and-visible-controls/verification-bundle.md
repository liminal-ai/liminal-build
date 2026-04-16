# Story 1 Verification Bundle

## Story

- Story:
  `stories/01-environment-state-and-visible-controls.md`
- Story title:
  `Story 1: Environment State and Visible Controls`
- Story base commit:
  `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`

## ACs / TCs Targeted

- `AC-1.1`
  - `TC-1.1a`
  - `TC-1.1b`
  - `TC-1.1c`
  - `TC-1.1d`
  - `TC-1.1e`
  - `TC-1.1f`
  - `TC-1.1g`
  - `TC-1.1h`
  - `TC-1.1i`
  - `TC-1.1j`
  - `TC-1.1k`
- `AC-1.2`
  - `TC-1.2a`
  - `TC-1.2b`
- `AC-1.3`
  - `TC-1.3a`
  - `TC-1.3b`
- `AC-1.4`
  - `TC-1.4a`
- `AC-1.5`
  - `TC-1.5a`

## Implementation Claim Summary

- Replaced the Story 0 bootstrap-time `defaultEnvironmentSummary` stub with a
  durable environment read path so first-load process surfaces can show real
  environment truth.
- Added server-side environment-section reading and process/control derivation so
  `process.controls`, `process.hasEnvironment`, and `environment` reflect durable
  process + environment state together.
- Added the Story 1 UI layer for stable visible controls and environment summary:
  - `process-controls.ts`
  - `process-environment-panel.ts`
  - `process-checkpoint-result.ts`
- Updated the process work-surface page to render the stable control area from
  `process.controls` rather than only showing enabled actions from
  `availableActions`.
- Added durable-store support and Convex schema/state support for
  `processEnvironmentStates`.
- Added Story 1 test coverage for:
  - first-load environment visibility
  - stable visible controls
  - disabled reasons
  - seeded environment-state matrix behavior
  - durable reload/reopen environment truth
- After review, fixed same-session action-response consistency so `start`,
  `resume`, and `respond` rebuild `process` summaries with the current durable
  environment summary instead of the fallback absent-environment path.

## Files Changed

Tracked diff files:

- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processes.ts`
- `convex/schema.ts`
- `tests/fixtures/process-controls.ts`
- `tests/fixtures/process-surface.ts`
- `tests/integration/process-work-surface.test.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

New untracked Story 1 files:

- `apps/platform/client/features/processes/process-checkpoint-result.ts`
- `apps/platform/client/features/processes/process-controls.ts`
- `apps/platform/client/features/processes/process-environment-panel.ts`
- `apps/platform/server/services/processes/readers/environment-section.reader.ts`
- `convex/processEnvironmentStates.ts`
- `tests/service/client/process-controls.test.ts`

Post-review fix-batch files:

- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-response.service.ts`
- `tests/service/server/process-actions-api.test.ts`

## Changed-File Manifest Against Story Base Commit

All Story 1 implementation files, excluding orchestration log/process artifacts:

- `apps/platform/client/features/processes/process-checkpoint-result.ts`
- `apps/platform/client/features/processes/process-controls.ts`
- `apps/platform/client/features/processes/process-environment-panel.ts`
- `apps/platform/client/features/processes/process-work-surface-page.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/processes/readers/environment-section.reader.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processEnvironmentStates.ts`
- `convex/processes.ts`
- `convex/schema.ts`
- `tests/fixtures/process-controls.ts`
- `tests/fixtures/process-surface.ts`
- `tests/integration/process-work-surface.test.ts`
- `tests/service/client/process-controls.test.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

## Changed Test Files

Verifiers should inspect:

- `tests/integration/process-work-surface.test.ts`
- `tests/service/client/process-controls.test.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Diff command for changed tests:

```bash
git diff 200aed5059c7aee1c1ddaf202c056f1b391ddbe4 -- **/*.test.* **/*.spec.*
```

## Tests Added Or Updated

- Added `tests/service/client/process-controls.test.ts` for stable visible
  controls, disabled reasons, and seeded environment-state control matrix cases.
- Updated `tests/service/client/process-work-surface-page.test.ts` for first-load
  environment visibility, absent/lost/unavailable rendering, stable controls,
  and latest checkpoint context.
- Updated `tests/service/server/process-work-surface-api.test.ts` and
  `tests/service/server/process-foundation-contracts.test.ts` for durable
  environment bootstrap, control derivation, unavailable degradation, and latest
  checkpoint visibility.
- Updated `tests/integration/process-work-surface.test.ts` for reload durability.
- Updated surrounding expectation files to align with the new Story 1 contract:
  - `tests/service/client/process-live.test.ts`
  - `tests/service/server/process-actions-api.test.ts`
  - `tests/service/server/processes-api.test.ts`
  - `tests/service/server/auth-routes.test.ts`
- Added post-review regression coverage for same-session environment-aware action
  summaries in `tests/service/server/process-actions-api.test.ts`.

## Gate Evidence

Commands reported by the implementer:

- `corepack pnpm exec convex codegen`
  - failed because local Convex backend was not running at
    `http://127.0.0.1:3210`
- `corepack pnpm exec tsc --noEmit -p tsconfig.json`
  - passed
- `corepack pnpm exec vitest run tests/service/server/process-foundation-contracts.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/process-actions-api.test.ts --environment node`
  - passed
- `corepack pnpm exec vitest run tests/service/client/process-controls.test.ts tests/service/client/process-work-surface-page.test.ts --environment jsdom`
  - passed
- `corepack pnpm exec vitest run tests/integration/process-work-surface.test.ts --environment node`
  - passed
- `corepack pnpm exec biome format --write apps/platform/server/services/processes/process-work-surface.service.ts apps/platform/server/services/projects/platform-store.ts convex/processEnvironmentStates.ts tests/fixtures/process-surface.ts tests/integration/process-work-surface.test.ts tests/service/client/process-work-surface-page.test.ts tests/service/server/process-foundation-contracts.test.ts`
  - passed
- `corepack pnpm run verify`
  - passed
- Post-review fix batch:
  - `corepack pnpm run verify`
    - passed

## Claimed Residual Risks

- Recovery controls can now render truthfully for seeded `stale`, `lost`, and
  `failed` states, but Story 5 behavior is still intentionally out of scope, so
  `rehydrate` and `rebuild` remain non-operational here.
- Legacy processes with no `processEnvironmentStates` row fall back to durable
  `absent`; if any preexisting non-absent environment truth exists outside the
  new table, it would still need migration/backfill.
- No dedicated action-specific websocket regression test was added; confidence on
  the same-session fix relies on the action service path plus existing live test
  coverage.

## Claimed Spec Deviations Or Questions

- Claimed spec deviation:
  `convex/processEnvironmentStates.ts` stores `providerKind` as nullable until an
  environment is actually provisioned, to keep Story 1 bootstrap in scope
  without forcing Story 2 provider selection behavior earlier than intended.
- Open questions:
  `none`
