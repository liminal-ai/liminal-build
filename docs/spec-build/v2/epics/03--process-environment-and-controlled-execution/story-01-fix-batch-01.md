# Story 1 Fix Batch 01

## Context

Story 1 implementation passed the story gate and Sonnet's main review, but the
Codex verifier surfaced a real same-session consistency bug:

- bootstrap is environment-aware
- `start`, `resume`, and `respond` responses rebuild `process` summaries without
  the current durable environment summary
- this can make the page show `environment.state = ready` while the returned
  `process.controls` / `hasEnvironment` regress to absent-environment defaults

The orchestrator confirmed the relevant call sites in:

- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-response.service.ts`

## Must Fix

1. Make `start`, `resume`, and `respond` response summaries environment-aware.
   The returned `process` summary must stay aligned with the current durable
   environment truth instead of rebuilding from the fallback absent-environment
   path.

2. Update the corresponding live/publication path if needed so same-session
   process updates do not contradict the environment panel.

3. Add a focused regression test for at least one real action path, ideally
   `respond` or `resume`:
   - seed a durable non-absent environment, such as `ready`
   - perform the action
   - assert the returned/published `process.hasEnvironment` and
     `process.controls` still reflect that environment state

## Guardrails

- Keep this as a bounded Story 1 consistency fix.
- Do not broaden into Story 2 preparation behavior or Story 5 recovery
  mutations.
- Reuse the existing Story 1 implementation and fixtures rather than redesigning
  the environment/control model.
- After the fix, rerun:
  `corepack pnpm run verify`

## Expected Outcome

- Bootstrap truth and same-session action-response truth remain aligned for the
  Story 1 process surface.
- Review can proceed again without carrying a known same-session coherence bug.
