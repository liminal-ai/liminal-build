# Story 2 Fix Batch 01

## Context

Story 2 Round 3 verification (current tree, on top of base commit
`326d8c9`) produced a `BLOCK` verdict from the Sonnet 4.6 verifier. All
four round-2 blockers were confirmed closed on the current tree:

- server-driven preparation path (`start`/`resume` →
  `ProcessEnvironmentService.runHydrationAsync` → `ready`|`failed`)
- no `process.status='running'` before `environment.state='ready'`
- live publication includes the environment-aware `process` payload after
  successful hydration
- hydration plan includes `outputIds` alongside `artifactIds` and
  `sourceAttachmentIds`

But the gate (`corepack pnpm run verify`) fails on three mechanical items
that each invalidate one of the gate stages. Orchestrator spot-check
confirmed each failure independently.

This batch is deliberately bounded. It does not reopen the Story 2
architectural shape. It closes the three gate failures and nothing else.

Codex Round 3 verification is running in parallel. If Codex surfaces
additional items they will be appended to this batch before dispatch.

## Must Fix

### 1. Biome formatter at `apps/platform/server/services/projects/platform-store.ts:1518`

Formatter rejects the 120-char ternary inline. Biome emits the expected
replacement:

```ts
phaseLabel:
  existing.phaseLabel === 'Preparing environment' ? 'Working' : existing.phaseLabel,
```

There is also an import-sort drift near the top of the file — Biome wants
the `type` imports and value imports in a specific order. `corepack pnpm
exec biome check --write apps/platform/server/services/projects/platform-store.ts`
applies both fixes mechanically.

### 2. `tests/service/server/process-actions-api.test.ts` — `S2-TC-2.1b` (resume returns preparing)

Current assertion expects `process.status: 'running'` on the resume
response. Implementation now correctly returns `status: 'paused'` in the
accepted-action response because Story 2 defers the transition to
`running` until `ProcessEnvironmentService.runHydrationAsync` observes
readiness. The test assertion was stale when slice 9 landed the
server-driven path.

Correct the assertion to `process.status: 'paused'` so the test reflects
the Story 2 contract: resume returns immediately with `environment.state
= 'preparing'` and the process status stays at its pre-resume value
(`paused`) until the async hydration completes and a subsequent live
update advances it to `running`. The environment live test
(`process-live-updates.test.ts`'s `server-driven environment preparation`
describe block) already asserts the later `running` transition — no new
coverage is needed here.

If the test is also asserting on `environment.state`, keep the existing
`'preparing'` expectation for the resume response.

### 3. `tests/service/server/process-actions-api.test.ts` — `TC-2.1c` (interrupted resume available actions)

Current assertion expects `availableActions: []` on the interrupted-resume
response. Implementation returns `availableActions: ['review']` because
Story 1's control-derivation correctly exposes `review` for interrupted
processes (interrupted processes remain reviewable even during
preparation).

Correct the assertion to `availableActions: ['review']`. This matches
Story 1's already-verified control-matrix behavior — it is not a Story 2
semantic change.

## Guardrails

- Keep this as a bounded gate-alignment fix. Do not broaden into Story 3
  execution behavior or Story 5 recovery mutations.
- Do not weaken any other assertions. The only assertion changes allowed
  in this batch are items 2 and 3 above.
- Preserve the Story 2 architectural shape (fire-and-forget hydration,
  no running before ready).
- After fixes, rerun `corepack pnpm run verify`. Expected outcome: all
  stages green (format, lint, typecheck, build, convex tests, service
  tests, client tests).

## Expected Outcome

- `format:check` passes.
- `tests/service/server/process-actions-api.test.ts` passes 25/25.
- Full gate passes.
- Story 2 becomes acceptance-ready pending one fresh verification round
  against the fixed tree.
