# Codex Fix Routing Round 3: Story 2 Start and Resume

## Scope

- eliminate dropped async rejections for non-409 start/resume failures
- strengthen AC-2.4 proof at the real server/action boundary

## Files

- [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts)
- [process-work-surface-api.ts](/Users/leemoore/code/liminal-build/apps/platform/client/browser-api/process-work-surface-api.ts)
- [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts)
- [process-actions-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-actions-api.test.ts)

## Outcome

- `409 PROCESS_ACTION_NOT_AVAILABLE`: unchanged stale-action behavior; the current surface remains in place and renders inline `actionError`
- `401 UNAUTHENTICATED`: action handlers reuse the existing login redirect path with `returnTo`
- `403 PROJECT_FORBIDDEN`: the work surface transitions into the unavailable access-denied state
- `404 PROJECT_NOT_FOUND` / `PROCESS_NOT_FOUND`: the work surface transitions into the corresponding unavailable state instead of rejecting off-thread
- unexpected failures: action handlers now convert them into bounded inline `PROCESS_ACTION_FAILED` feedback instead of dropped promise rejections
- malformed or empty action error bodies now fall back to typed request errors by HTTP status

## AC-2.4 Proof Strengthening

- the in-memory platform store can now return richer per-process start/resume outcomes and persist them for subsequent bootstrap reads
- the server action API test now proves:
  - `start` can return `waiting` plus `currentRequest`
  - `resume` can return `completed`
  - `resume` can return `failed`
- each case asserts both the immediate `POST` response and the follow-up `GET` work-surface bootstrap payload

## Gate

- `corepack pnpm exec vitest run tests/service/server/process-actions-api.test.ts` -> `PASS`
- `corepack pnpm exec vitest run tests/service/client/process-work-surface-page.test.ts --environment jsdom` -> `PASS`
- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
