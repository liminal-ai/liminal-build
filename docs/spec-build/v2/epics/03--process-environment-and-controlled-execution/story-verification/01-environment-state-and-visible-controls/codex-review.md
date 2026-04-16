# Story 1 Codex Review

## READING_JOURNEY_NOTES

1. `tech-design.md`
- OBSERVED: Epic 3 is supposed to extend the existing process route and bootstrap/live seam, not create a parallel environment surface.
- OBSERVED: Environment lifecycle is intentionally a second state machine, separate from process status.
- INFERRED: Any code that rebuilds `process.controls` without the current `environment` summary is at risk of violating the design's state-separation rule.

2. `tech-design-client.md`
- OBSERVED: The client is supposed to render the stable visible control area from `process.controls`, not infer controls from `availableActions`.
- OBSERVED: `environment` is a first-class durable bootstrap entity, not an optional side fetch.
- INFERRED: Same-session updates need to preserve the same process/environment truth the bootstrap establishes, or the page can contradict itself after an action.

3. `tech-design-server.md`
- OBSERVED: Environment work is nested under the existing process control plane; Fastify remains the owner of action acceptance and projection.
- OBSERVED: The bootstrap contract is explicitly widened to include environment summary and latest checkpoint visibility.
- INFERRED: Once `process` summaries depend on environment state, all process-summary producers need the same environment-aware projection path, not just the bootstrap reader.

4. `epic.md`
- OBSERVED: The epic promises first-load environment visibility, stable visible controls, disabled reasons, and durable reload truth.
- OBSERVED: The environment/control matrix explicitly covers seeded `stale`, `lost`, `failed`, `rebuilding`, and `unavailable` states even before later recovery stories make them operationally reachable.
- OBSERVED: The process surface must remain legible even when environment work is absent, lost, or failed.

5. `test-plan.md`
- OBSERVED: The plan expects bootstrap and visible-control behavior to remain coherent across durable bootstrap and live/current-object updates.
- OBSERVED: The planned server/client coverage is strongest around bootstrap, controls, and environment rendering.
- INFERRED: If action-response and live-publication paths are not checked against seeded environment states, a wrong-reason pass is plausible.

6. `stories/01-environment-state-and-visible-controls.md`
- OBSERVED: Story 1 is narrowly scoped to first-view environment truth and visible controls; hydration/recovery mutations are explicitly out of scope.
- OBSERVED: AC-1.4 requires environment truth and control availability to derive from durable process and environment state, not client assumptions.
- INFERRED: Even though recovery behavior is deferred, any existing action flow that rewrites control state still needs to respect the new durable environment contract.

7. `verification-bundle.md`
- OBSERVED: The bundle claims the Story 0 `defaultEnvironmentSummary` stub was replaced with a durable read path and that `process.controls`/`hasEnvironment` now reflect durable process + environment state together.
- OBSERVED: The claimed coverage additions concentrate on bootstrap, control rendering, and reload durability.
- INFERRED: The bundle does not claim any validation of start/resume/respond paths against seeded environment truth.

8. `git diff 200aed5059c7aee1c1ddaf202c056f1b391ddbe4 -- **/*.test.* **/*.spec.*`
- OBSERVED: The diff adds substantial Story 1 bootstrap/control coverage and updates older UI expectations from hidden invalid actions to visible disabled controls.
- OBSERVED: The only live-test behavior change is a broader failed-state `availableActions` expectation in `tests/service/client/process-live.test.ts`.
- INFERRED: None of the changed tests exercise an in-session start/resume/respond response while a durable non-absent environment exists.

## VERDICT

REVISE

## CORRECTNESS_FINDINGS

- BF-1 is a correctness failure against AC-1.4 and the verification bundle's claim that `process.controls` and `hasEnvironment` reflect durable process + environment truth together.

## ARCHITECTURE_FINDINGS

- BF-1 is also the primary architecture finding: the environment-aware process summary is implemented only on the bootstrap path, not on the existing action-response/live-publication path.

## TEST_DIFF_AUDIT

- `tests/integration/process-work-surface.test.ts`
  Classification: legitimate coverage.
  Notes: Adds TC-1.4a reload durability for environment truth.

- `tests/service/client/process-controls.test.ts`
  Classification: legitimate coverage.
  Notes: New matrix coverage for visible controls, disabled reasons, and stable order.

- `tests/service/client/process-work-surface-page.test.ts`
  Classification: legitimate coverage plus legitimate correction.
  Notes: Adds first-load environment rendering and updates prior expectations from disappearing invalid controls to visible disabled controls.

- `tests/service/server/process-work-surface-api.test.ts`
  Classification: legitimate coverage.
  Notes: Verifies bootstrap environment summary, stale/unavailable degradation, and checkpoint visibility.

- `tests/service/server/process-foundation-contracts.test.ts`
  Classification: mixed.
  Notes: Control-derivation assertions are legitimate coverage; the added request-error assertions for future recovery codes are scope shift beyond Story 1's implemented slice.

- `tests/service/client/process-live.test.ts`
  Classification: scope shift.
  Notes: Broadens failed-state `availableActions` expectations to include `rehydrate` and `rebuild`, but does not verify that real server emissions actually preserve environment-aware summaries.

- `tests/service/server/process-actions-api.test.ts`
  Classification: legitimate correction with residual gap.
  Notes: Aligns response fixtures with the new summary contract, but still does not exercise action responses against seeded environment truth.

- `tests/service/server/auth-routes.test.ts`
  Classification: legitimate correction.
  Notes: Fake store updated to satisfy the widened `PlatformStore` interface.

- `tests/service/server/processes-api.test.ts`
  Classification: legitimate correction.
  Notes: Recording store updated to satisfy the widened `PlatformStore` interface.

## TEST_QUALITY_FINDINGS

- finding: The changed test set does not cover action responses or live publications when a durable non-absent environment already exists, so the new environment-aware summary contract can regress after an in-session action without any test failing.
  severity: MAJOR
  confidence: HIGH
  evidence: `tests/service/server/process-work-surface-api.test.ts` and `tests/integration/process-work-surface.test.ts` cover bootstrap/reload; `tests/service/client/process-controls.test.ts` covers fixture rendering; `tests/service/server/process-actions-api.test.ts` still asserts action responses without seeding environment summaries; `tests/service/client/process-live.test.ts` only checks fixture application.
  disproof_attempt: I looked for any changed server/client/integration test that seeds `ready`/`stale`/`lost` environment state and then performs `start`, `resume`, or `respond`. I did not find one.
  impact: The suite passes even though the action-response path can return `hasEnvironment: false` and no-environment disabled reasons while the durable environment remains `ready`.
  validation_step: Add service and client tests that seed a non-absent environment, perform `start`, `resume`, or `respond`, and assert the returned/published `process` summary remains environment-consistent or is paired with an environment upsert.

## BLOCKING_FINDINGS

- finding: Start/resume/respond responses rebuild `process.controls` and `hasEnvironment` without the current durable environment summary, so an in-session action can immediately contradict the environment panel until a full bootstrap reload.
  severity: MAJOR
  confidence: HIGH
  evidence: `buildProcessSurfaceSummary()` defaults to `fallbackEnvironmentSummary` when no environment is supplied in [apps/platform/server/services/processes/process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:318). `ProcessStartService`, `ProcessResumeService`, and `ProcessResponseService` all call it without fetching environment at [process-start.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-start.service.ts:35), [process-resume.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-resume.service.ts:35), and [process-response.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-response.service.ts:50). I reproduced this with targeted `tsx` runs on April 15, 2026: a waiting process with durable `ready` environment returned `response.process.hasEnvironment = false` plus no-environment disabled reasons after `respond`; a paused process with the same durable `ready` environment did the same after `resume`.
  disproof_attempt: I checked whether the same action publications include an `environment` upsert that would immediately repair the contradiction. They do not: the start/resume/response publications only include `process` and current-request/history payloads in those services.
  impact: Story 1's new visible-control contract is only correct on bootstrap. After an in-session action, the page can show `environment.state = ready` while `process.controls` and `hasEnvironment` regress to the default absent-environment interpretation, violating AC-1.4 and the bundle's implementation claim.
  validation_step: Update all process-summary producers on action/live paths to project from durable environment truth as well, then add a regression test that seeds `ready` or `stale` environment state and asserts post-action summaries stay aligned with it.

## NONBLOCKING_WARNINGS

- OBSERVED: `corepack pnpm run verify` passed locally.
- OBSERVED: The implementer-reported `corepack pnpm exec convex codegen` failure is reproducibly non-gating in this repo shape because the story uses `makeFunctionReference(...)` strings rather than generated `api` references for the new environment query.
- INFERRED: That codegen failure still means the local Convex dev path was not exercised during the story, so environment-state behavior was validated at type/build/test layers, not against a running local Convex deployment.

## UNRESOLVED

- OBSERVED: I did not find `rehydrate` or `rebuild` route/client handlers in the current code.
- SPECULATIVE: Story 1 may intentionally allow enabled recovery controls to exist as non-operational placeholders because recovery mutations are out of scope, but the story text does not explicitly say whether an enabled control may no-op in this slice.
- VALIDATION NEEDED: Confirm with the story author whether Story 1's enabled recovery controls are intended to be informational-only placeholders or whether they should remain disabled until their actions exist.

## GATE_RESULT

- `corepack pnpm run verify`: PASSED on 2026-04-15.
- Observed sub-results:
  - `format:check`: passed
  - `lint`: passed
  - `typecheck`: passed
  - `build`: passed
  - `test:convex`: 3 files, 9 tests passed
  - `test:service`: 10 files, 66 tests passed
  - `test:client`: 17 files, 122 tests passed
- Conclusion: The acceptance gate is green, but it does not catch BF-1.

## After your review: what else did you notice but chose not to report?

- I noticed `tests/service/server/process-foundation-contracts.test.ts` now asserts future-oriented recovery error codes that are not part of Story 1's core slice. I treated that as test-scope drift, not a product defect.
- I also noticed the verification bundle's changed-file summary does not call out the action/live consistency gap, but I did not treat that omission itself as a separate finding.
