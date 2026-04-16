# Story 0 Fix Batch 02

## Context

Fix Batch 01 closed the prior typecheck fallout. The full story gate now has one
remaining failing assertion.

## Must Fix

1. Update the strict response assertion in
   `tests/service/server/process-actions-api.test.ts` so it matches the Story 0
   contract shape that now includes:
   - `process.controls`
   - `process.hasEnvironment`

## Exact Failure

`tests/service/server/process-actions-api.test.ts > process actions api > TC-3.6b can keep the process waiting when a follow-up request is returned`

The response now includes the new Story 0 fields, but the test is still doing a
deep equality check against the old response shape.

## Guardrails

- Keep this as a minimal contract-alignment fix.
- Do not broaden Story 0 beyond this failing assertion unless a second gate run
  reveals a new bounded issue.
- After the fix, rerun:
  `corepack pnpm run verify`
