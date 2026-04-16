# Story 0 Fix Batch 01

## Context

Story 0 implementation is largely complete, but the full story gate failed in
`typecheck` after the new Epic 03 shared fields became required.

This is a bounded integration cleanup batch. It is not a redesign request.

## Must Fix

1. Resolve the duplicate `SourceAccessMode` export from
   `apps/platform/shared/contracts/index.ts`.
   Current failure:
   `Module './schemas.js' has already exported a member named 'SourceAccessMode'.`

2. Fix the `environment` live fixture typing in
   `tests/fixtures/live-process.ts`.
   Current failure:
   `Type 'string' is not assignable to type '"environment"'`.

3. Backfill required `environment` state on existing manually constructed
   process-surface state objects in client tests:
   - `tests/service/client/process-response-composer.test.ts`
   - `tests/service/client/process-work-surface-page.test.ts`

4. Backfill required `accessMode` on existing source attachment fixtures/store
   setup objects in server tests:
   - `tests/service/server/process-live-updates.test.ts`
   - `tests/service/server/process-work-surface-api.test.ts`
   - `tests/service/server/processes-api.test.ts`

## Guardrails

- Do not broaden the story scope beyond Story 0 foundation cleanup.
- Preserve the current Story 0 contract shape unless one of the above failures
  proves the shape is internally inconsistent.
- After fixes, rerun the full story gate:
  `corepack pnpm run verify`

## Expected Outcome

- Story 0 foundation contracts and fixtures remain intact.
- The full story gate passes or any remaining failures are surfaced clearly as a
  new bounded batch.
