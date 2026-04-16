# Story 2 Verification Bundle — Round 3 (Current Tree)

## Pickup Note

This bundle is built against the **current working tree**, not against the
round-2 snapshot. Slices 5-9 landed after round-2 verification artifacts were
written and materially changed the Story 2 claim set. The previous round-2
bundle is superseded for acceptance purposes. Prior reviews are preserved as
`codex-review.md`, `codex-review-round-2.md`, `sonnet-review.md`,
`sonnet-review-round-2.md` for historical context.

Orchestration harness has transitioned from `ls-codex-impl` to a hybrid
`ls-team-impl-cc`-shaped run — see `codex-impl-log.md` "Run State — Hybrid
`ls-team-impl-cc` Pickup" section at the bottom of that log.

## Story

- Story: `stories/02-start-or-resume-with-environment-preparation.md`
- Story title: `Story 2: Start or Resume with Environment Preparation`
- Story base commit: `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`
- Gate command: `corepack pnpm run verify`
- Latest implementer-observed gate result: passed (9 convex / 81 server /
  130 client per slice 9 report)

## ACs / TCs In Scope

- `AC-2.1` — `TC-2.1a`, `TC-2.1b`
- `AC-2.2` — `TC-2.2a`, `TC-2.2b`
- `AC-2.3` — `TC-2.3a`, `TC-2.3b`
- `AC-2.4` — `TC-2.4a`, `TC-2.4b`
- `AC-2.5` — `TC-2.5a`, `TC-2.5b`

## Current Claim Set

This is the cumulative claim set across slices 1-9. Reviewers should treat
this as a complete snapshot rather than an incremental delta from round 2.

### Accepted-Action Surface (AC-2.1, AC-2.4 boundary)

- `POST /start` and `POST /resume` return `200` with an updated `process`
  summary plus an `environment` object whose `state` is `preparing` when
  environment work is required.
- Client bootstrap/action patch path applies the returned `environment` in
  the same session.
- `process.hasEnvironment` and `process.controls` are rebuilt using the
  durable environment summary so same-session action responses stay aligned
  with environment truth (this was a Story 1 Fix Batch 01 guarantee preserved
  across Story 2).

### Hydration Planning (AC-2.2)

- New `WorkingSetPlan` persistence in `processEnvironmentStates` covering:
  - current artifact ids
  - current source attachment ids
  - current output ids
- `hydration-planner.ts` derives the plan deterministically from current
  materials; partial working sets (missing categories) are omitted cleanly
  rather than padding with empty placeholders.
- `start` / `resume` call the planner and persist the resulting plan before
  returning `preparing`.
- `PlatformStore` surfaces `getProcessHydrationPlan` /
  `setProcessHydrationPlan` on all implementations, including
  `NullPlatformStore` and `InMemoryPlatformStore`.

### Server-Driven Preparation (AC-2.3, AC-2.4)

- `ProviderAdapter` contract + `InMemoryProviderAdapter` (success path) and
  `FailingProviderAdapter` (failure path) in
  `apps/platform/server/services/processes/environment/provider-adapter.ts`.
- `ProcessEnvironmentService.runHydrationAsync` in
  `apps/platform/server/services/processes/environment/process-environment.service.ts`
  is called fire-and-forget from `start` and `resume` after the initial
  `preparing` response is returned.
- On success, `executeHydration`:
  - persists `environment.state = ready` with `lastHydratedAt` and
    `environmentId` from the adapter,
  - transitions the process to `running` via
    `PlatformStore.transitionProcessToRunning`,
  - publishes an `environment` live upsert plus an environment-aware
    `process` live upsert.
- On failure, `executeHydration`:
  - persists `environment.state = failed` with the adapter's
    `blockedReason`,
  - preserves the prior `environmentId` and `lastHydratedAt` on the failure
    row,
  - publishes an `environment` live upsert with the failed state; does not
    transition the process to `running`.
- `app.ts` wires `ProcessEnvironmentService` with `InMemoryProviderAdapter`
  as the default provider and exposes `providerAdapter` /
  `processEnvironmentService` as `CreateAppOptions` overrides for tests.

### Source Writability Visibility (AC-2.5)

- `accessMode` now durable on `sourceAttachments` and projected into the
  materials envelope (`read_only` vs `read_write`).
- `apps/platform/client/features/processes/process-materials-section.ts`
  renders the access mode label next to each current source.
- Dedicated client coverage in
  `tests/service/client/process-materials-section.test.ts`.

## Files Changed vs Story Base Commit

### Modified

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processEnvironmentStates.ts`
- `convex/processes.ts`
- `docs/spec-build/v2/core-platform-prd.md` *(6-line Feature 5 clarification — arguably not Story 2, but low-risk)*
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md` *(Provider Selection Policy — Story 2 alignment)*
- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

### New (untracked)

- `apps/platform/server/services/processes/environment/hydration-planner.ts`
- `apps/platform/server/services/processes/environment/process-environment.service.ts`
- `apps/platform/server/services/processes/environment/provider-adapter.ts`
- `tests/service/client/process-materials-section.test.ts`

### Out-of-Scope Working-Tree Drift (do not verify as Story 2)

Untracked items that are parallel spec-drafting work by the user, not Story 2:

- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/epic.md`
- `docs/spec-build/v2/epics/05--source-attachments-and-canonical-source-management/epic.md`
- `docs/superpowers/` (skill install artifacts)

These may or may not be folded into the Story 2 commit per the user's
"don't be picky" instruction. They do not affect the verification gate.

## Changed Test Files (Diff Target)

Run this against the story base commit:

```bash
git diff 326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579 -- **/*.test.* **/*.spec.*
```

Expected changed test files:

- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-materials-section.test.ts` (new)
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Notable test-change to classify carefully:

- **`process-actions-api.test.ts` TC-2.1a bootstrap assertion** was updated
  in slice 9 from expecting `state: 'preparing'` in a follow-up
  GET-bootstrap to expecting `state: 'ready'`. Justification per
  `impl-slice9-report.md`: the `InMemoryProviderAdapter` resolves as a
  microtask, so by the time a subsequent `app.inject()` is processed the
  background hydration has already completed. The accompanying check on the
  `POST /start` response itself still asserts `preparing`. Reviewers should
  judge whether this is a legitimate timing-aware assertion correction
  rather than assertion weakening.

## Specific Review Focus

Round 2 reviewers flagged these as blocking. Slices 8-9 target them
directly; round 3 should confirm closure:

1. **Server-driven preparation path exists.**
   - Does `start`/`resume` trigger real hydration work after returning
     `preparing`?
   - Does the environment eventually transition to `ready` or `failed`?
   - Is that transition visible via live publication?
2. **No running before ready.**
   - After a failed preparation, does the process stay off `running`?
   - Are there any code paths where `process.status = running` without an
     adjoining `environment.state = ready`?
3. **Live publication includes environment-aware process.**
   - After successful hydration, does the live `process` payload reflect
     the environment-aware control/environment fields, not a fallback
     absent-environment shape?
4. **Hydration plan is complete.**
   - Does the plan include `outputIds`? (Round 2 flagged this as initially
     missing.)
5. **Test diff hygiene.**
   - Are test changes legitimate coverage or corrections, or was any
     assertion weakened?
6. **Mock audit.**
   - `InMemoryProviderAdapter` and `FailingProviderAdapter` are the only
     new external-boundary fakes. Are they consistent with the test plan's
     mock strategy?

## Boundary Inventory Status

| Boundary | Status | Notes |
|----------|--------|-------|
| `InMemoryProviderAdapter` | `stub` (intentional for Story 2) | Real hosted provider (`DaytonaProviderAdapter`) scheduled for later story |
| `LocalProviderAdapter` | `not started` | Fast-follow provider not in Story 2 scope |
| `DaytonaProviderAdapter` | `not started` | Hosted provider; scheduled |
| Canonical code checkpoint writer (GitHub) | `not started` | Owned by Story 4 |

The Story 2 provider-adapter abstraction is the seam the later adapters
plug into. Reviewers should confirm the interface shape is adequate for
later providers without requiring redesign.

## Non-TC Decided Tests Expected For Story 2

Per the test plan, these exist alongside the TC-mapped tests:

- Durable bootstrap visibility of preparation state after start/resume
- Hydration plan seeded from current artifacts / outputs / sources
- Partial working set (missing categories) handled cleanly
- Client-side live reconciliation sequencing (preparation progress,
  preparation failure, readiness gating running)
- Source `accessMode` rendering for both `read_only` and `read_write`

## Verifier Dispatch Hints

Reviewers are in fresh sessions and have not seen the slice-by-slice
history. Read this bundle first, then the spec artifacts, then run the
gate. Apply the verification stance from the hybrid harness (finding
schema with evidence, disproof attempt, impact, validation step). The
story gate command is `corepack pnpm run verify` and should be run by
the verifier after code inspection, not before.
