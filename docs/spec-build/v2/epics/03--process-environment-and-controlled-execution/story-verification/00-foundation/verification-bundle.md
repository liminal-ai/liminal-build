# Story 0 Verification Bundle

## Story

- Story:
  `stories/00-foundation.md`
- Story title:
  `Story 0: Foundation`
- Story base commit:
  `e6c08484846aea19d2d6e3483728126fe7da92f2`

## Targeted Scope

Story 0 is a foundation story and does not own end-user ACs or TCs from the
detailed epic. The implementation claim set is:

- shared environment-summary vocabulary
- shared visible-control vocabulary and stable control-order expectations
- shared checkpoint-result vocabulary
- shared source `accessMode` vocabulary
- shared Epic 03 error response vocabulary
- shared `environment` live-update vocabulary
- reusable fixtures/helpers for environment summaries, controls, checkpoint
  results, materials, and live updates

## Implementation Claim Summary

- Shared contracts were extended additively to include:
  - `process.controls`
  - `process.hasEnvironment`
  - `environment`
  - checkpoint result shapes
  - source `accessMode`
  - live `environment` entities
- Server/bootstrap/live/materials wiring was updated so the new fields are
  emitted from the shared seams with safe defaults.
- Shared test fixtures were expanded with reusable environment, controls, and
  checkpoint-result builders instead of inventing a parallel fixture style.
- Story 0 integration fallout was closed in two bounded fix batches:
  - Fix Batch 01: export and missing required-field cleanup
  - Fix Batch 02: one remaining server test assertion updated for the new
    response shape

## Files Changed

Source and runtime files:

- `apps/platform/shared/contracts/process-work-surface.ts`
- `apps/platform/shared/contracts/live-process-updates.ts`
- `apps/platform/shared/contracts/state.ts`
- `apps/platform/shared/contracts/schemas.ts`
- `apps/platform/server/errors/codes.ts`
- `apps/platform/server/schemas/common.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/processes/process-module-registry.ts`
- `apps/platform/server/services/processes/readers/materials-section.reader.ts`
- `apps/platform/server/services/processes/live/process-live-normalizer.ts`
- `apps/platform/client/app/store.ts`
- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/process-live.ts`

Fixtures and helpers:

- `tests/fixtures/checkpoint-results.ts`
- `tests/fixtures/process-environment.ts`
- `tests/fixtures/process-controls.ts`
- `tests/fixtures/materials.ts`
- `tests/fixtures/sources.ts`
- `tests/fixtures/process-surface.ts`
- `tests/fixtures/live-process.ts`

Tests:

- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/processes-api.test.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-response-composer.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`

## Changed-File Manifest Against Story Base Commit

Tracked diff plus new Story 0 files, excluding orchestration log/fix-batch
artifacts:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/app/process-live.ts`
- `apps/platform/client/app/store.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/errors/codes.ts`
- `apps/platform/server/routes/processes.ts`
- `apps/platform/server/schemas/common.ts`
- `apps/platform/server/services/processes/live/process-live-normalizer.ts`
- `apps/platform/server/services/processes/process-module-registry.ts`
- `apps/platform/server/services/processes/process-work-surface.service.ts`
- `apps/platform/server/services/processes/readers/materials-section.reader.ts`
- `apps/platform/shared/contracts/live-process-updates.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `apps/platform/shared/contracts/schemas.ts`
- `apps/platform/shared/contracts/state.ts`
- `tests/fixtures/checkpoint-results.ts`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/materials.ts`
- `tests/fixtures/process-controls.ts`
- `tests/fixtures/process-environment.ts`
- `tests/fixtures/process-surface.ts`
- `tests/fixtures/sources.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-response-composer.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

## Changed Test Files

Verifiers should inspect:

- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-response-composer.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Diff command for changed tests:

```bash
git diff e6c08484846aea19d2d6e3483728126fe7da92f2 -- **/*.test.* **/*.spec.*
```

## Gate Evidence

Targeted commands reported by the implementer as passing before the full gate:

- `corepack pnpm exec vitest run tests/service/server/process-foundation-contracts.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/process-live-updates.test.ts --environment node`
- `corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom`

Final story gate result:

- Command:
  `corepack pnpm run verify`
- Result:
  `passed`

## Claimed Residual Risks

- Story 0 is green after the fix batches.
- Main follow-on risk claimed by the implementer:
  later Epic 03 stories could drift the shared control derivation or environment
  defaults unless fixtures/tests are updated together.

## Claimed Spec Deviations Or Questions

- Spec deviations:
  `none`
- Open questions:
  `none`
