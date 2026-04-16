# Story 1 Codex Review Round 2

## READING_JOURNEY_NOTES

1. `tech-design.md`
- OBSERVED: Epic 3 is supposed to extend the existing process route, bootstrap, and live seams rather than introduce a parallel environment surface.
- OBSERVED: Durable environment state is server-owned behind `PlatformStore`, and the process summary is expected to be an environment-aware projection.
- INFERRED: Once `process.controls` depends on environment truth, every producer of that summary has to use the same environment-aware projection path.

2. `tech-design-client.md`
- OBSERVED: The client is expected to render the stable control area from `process.controls`, not infer it from transient action lists.
- OBSERVED: The store and live path are both expected to treat `environment` as first-class current-object state.
- INFERRED: Same-session accepted action updates must stay coherent with the already-rendered environment panel.

3. `tech-design-server.md`
- OBSERVED: The server design explicitly calls for immediate same-session updates after accepted actions.
- OBSERVED: Live updates are supposed to carry `environment` as a typed entity alongside `process`, not as an implied side effect.
- INFERRED: The old bug was a real boundary miss, not a cosmetic mismatch.

4. `epic.md`
- OBSERVED: Story 1 promises first-load environment visibility, stable visible controls, disabled reasons, durable truth after reload, and continued process legibility when environment state is bad or absent.
- OBSERVED: The environment/control matrix intentionally covers seeded `stale`, `lost`, `failed`, `rebuilding`, and `unavailable` cases before later stories make those flows operational.

5. `test-plan.md`
- OBSERVED: Story 1 coverage is concentrated on bootstrap truth, control rendering, disabled reasons, and reload durability.
- OBSERVED: Same-session continuity is treated as a real risk area across later stories as well.

6. `stories/01-environment-state-and-visible-controls.md`
- OBSERVED: Story 1 is still narrowly scoped to visibility and durable truth, not to environment preparation or recovery execution.
- OBSERVED: AC-1.4 is the key constraint here: visible environment state and control availability must derive from durable state rather than transient client assumptions.

7. `verification-bundle.md`
- OBSERVED: The updated bundle explicitly claims the same-session action-response inconsistency was fixed in `process-start.service.ts`, `process-resume.service.ts`, and `process-response.service.ts`.
- OBSERVED: The bundle claims a focused regression was added in `tests/service/server/process-actions-api.test.ts`.

8. `git diff 200aed5059c7aee1c1ddaf202c056f1b391ddbe4 -- **/*.test.* **/*.spec.*`
- OBSERVED: The Story 1 diff still mainly strengthens bootstrap/control/rendering coverage, with one new focused same-session regression in `process-actions-api.test.ts`.
- OBSERVED: The new automated fix-batch coverage is centered on `resume`, not all three affected action paths.

VERDICT: PASS

## CORRECTNESS_FINDINGS

- None.
- OBSERVED: On 2026-04-15 I reran seeded same-session repros for `start`, `resume`, and `respond` under a durable `ready` environment using an inline `corepack pnpm exec tsx` harness. Each action returned `process.hasEnvironment = true`, preserved the ready-environment `rehydrate` / `rebuild` disabled reasons, and published an `environment` live upsert alongside the `process` upsert.
- OBSERVED: The three previously implicated services now fetch `PlatformStore.getProcessEnvironmentSummary(...)` before calling `buildProcessSurfaceSummary(...)`, so the action-response projection no longer falls back to the absent-environment default path.

## ARCHITECTURE_FINDINGS

- None.
- OBSERVED: The fix restores the intended projection boundary: bootstrap, action responses, and live publication now all use environment-aware process summaries instead of splitting into bootstrap-aware and action-fallback paths.
- OBSERVED: `start`, `resume`, and `respond` now publish `environment` in their live publication payloads, and the existing normalizer/client reconciliation path already supports first-class `environment` upserts.

## TEST_DIFF_AUDIT

- `tests/integration/process-work-surface.test.ts`
  Classification: legitimate coverage.
  Notes: adds TC-1.4a reload durability against changing durable environment truth.

- `tests/service/client/process-controls.test.ts`
  Classification: legitimate coverage.
  Notes: new matrix coverage for stable controls, disabled reasons, and seeded environment states.

- `tests/service/client/process-live.test.ts`
  Classification: legitimate correction.
  Notes: updates failed-state expectations to match the widened visible-control contract, but remains fixture-level rather than action-service-driven.

- `tests/service/client/process-work-surface-page.test.ts`
  Classification: legitimate coverage plus legitimate correction.
  Notes: adds first-load environment visibility, stable visible controls, checkpoint context, unavailable-state legibility, and updates prior hidden-control expectations to visible disabled controls.

- `tests/service/server/auth-routes.test.ts`
  Classification: legitimate correction.
  Notes: fake store updated to satisfy the widened `PlatformStore` environment-read surface.

- `tests/service/server/process-actions-api.test.ts`
  Classification: legitimate coverage.
  Notes: adds a focused real-action regression for same-session environment-aware summaries on `resume`; this matches the fix-batch requirement.

- `tests/service/server/process-foundation-contracts.test.ts`
  Classification: mixed.
  Notes: control-derivation assertions are legitimate Story 1 coverage; recovery error-code schema assertions are future-facing scope drift beyond Story 1's implemented slice.

- `tests/service/server/process-work-surface-api.test.ts`
  Classification: legitimate coverage.
  Notes: adds bootstrap environment truth, stale/unavailable handling, and latest checkpoint visibility.

- `tests/service/server/processes-api.test.ts`
  Classification: legitimate correction.
  Notes: recording store updated to satisfy the widened `PlatformStore` environment-read surface.

## TEST_QUALITY_FINDINGS

- None blocking.
- OBSERVED: The new automated regression covers `resume` only, which satisfies the fix-batch guardrail of "at least one real action path."
- OBSERVED: I manually exercised `start` and `respond` with the same seeded `ready` environment and saw the same aligned response/live behavior, so I do not consider the missing extra automated cases a revise-worthy gap in this round.

## BLOCKING_FINDINGS

- None.
- BF-1 from the prior review is closed.

## NONBLOCKING_WARNINGS

- OBSERVED: `tests/service/server/process-foundation-contracts.test.ts` still carries future-oriented recovery error-code assertions that are not core Story 1 acceptance evidence.
- OBSERVED: The implementer-reported `corepack pnpm exec convex codegen` failure remains non-gating in this repo shape because the new store calls use `makeFunctionReference(...)` strings rather than generated `api` refs.
- INFERRED: Local Convex-dev-path behavior still was not exercised by that failed codegen run, so confidence here comes from repo tests plus targeted same-session repros rather than from a live local Convex backend session.

## UNRESOLVED

- None.

## GATE_RESULT

- `git diff 200aed5059c7aee1c1ddaf202c056f1b391ddbe4 -- **/*.test.* **/*.spec.*`: inspected on 2026-04-15.
- `corepack pnpm run verify`: PASSED on 2026-04-15.
- Observed sub-results:
  - `format:check`: passed
  - `lint`: passed
  - `typecheck`: passed
  - `build`: passed
  - `test:convex`: 3 files, 9 tests passed
  - `test:service`: 10 files, 67 tests passed
  - `test:client`: 17 files, 122 tests passed
- Additional verifier evidence:
  - Seeded same-session repros for `start`, `resume`, and `respond` under durable `ready` environment returned aligned `process` summaries and published `environment` live upserts.
- Conclusion: the previously reported same-session action-response inconsistency is closed, and I do not have a supported blocking issue for Story 1 after the fix batch.

## After your review: what else did you notice but chose not to report?

- I noticed the original prompt artifact still names `codex-review.md` while this round is explicitly targeting `codex-review-round-2.md`; I treated that as review bookkeeping, not a product issue.
- I also noticed the client action-response patching path still updates `process` and `currentRequest` only, not `environment`. That is fine for the current generic Story 1 lifecycle because the fixed server response no longer contradicts the already-rendered environment panel, but later stories that mutate environment state at acceptance time will need either explicit response-side environment updates or immediate live delivery.
