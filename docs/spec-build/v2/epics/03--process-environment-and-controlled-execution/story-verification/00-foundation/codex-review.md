# Codex Review: Epic 03 Story 0

## READING_JOURNEY_NOTES

1. `tech-design.md`
- OBSERVED: Chunk 0 is explicitly a shared-contract and fixture foundation slice, while provider/runtime/checkpoint implementation remains later-chunk work and is research-gated.
- OBSERVED: The design keeps process lifecycle separate from environment lifecycle; Story 0 should add vocabulary without collapsing those state machines.
- OBSERVED: Source writability is intended as checkpoint-planning input, not a new direct browser action family in this slice.

2. `tech-design-client.md`
- OBSERVED: The client model stays bootstrap-first and live-second on the existing process route; `environment` is an additive first-class entity, not a side fetch.
- OBSERVED: `process.controls` is the stable visible control set; `availableActions` is only the enabled subset kept for backward compatibility.
- INFERRED: Story 0 only needs shared types/builders/defaults here, not Story 1 rendering behavior.

3. `tech-design-server.md`
- OBSERVED: The server companion expects additive shared seams first: environment summary, source `accessMode`, live `environment` entity, and recovery error vocabulary.
- OBSERVED: The design explicitly calls for safe bootstrap degradation to `environment.state = unavailable` rather than whole-surface failure.
- OBSERVED: The server design still treats later provider/orchestrator modules as future work, so Story 0 should not be judged on those behaviors.

4. `epic.md`
- OBSERVED: Story 0 is the shared vocabulary/fixture story for later stories, not an end-user AC owner.
- OBSERVED: The epic requires environment state, control vocabulary, latest checkpoint visibility, source `accessMode`, and live `environment` entities as cross-story contracts.
- OBSERVED: The epic text still carries a small tension on source writability: the action-boundary prose implies possible direct rejection, while the design docs move that concern into checkpoint planning.

5. `test-plan.md`
- OBSERVED: Chunk 0 is intentionally foundation-only and its exit criteria are lighter than later chunks.
- OBSERVED: The plan expects reusable fixtures for environment summaries, controls, checkpoint results, materials, and live messages instead of test-local shape invention.
- OBSERVED: The strongest Story 0 confidence should come from shared-contract tests plus low-blast-radius updates to existing server/client tests.

6. `stories/00-foundation.md`
- OBSERVED: The story scope is additive shared vocabulary, fixtures, error vocabulary, and live-update vocabulary; it explicitly excludes provider/runtime behavior.
- OBSERVED: Definition of Done emphasizes “defined once,” reusable fixtures, and downstream reuse by Stories 1 through 6.
- INFERRED: The main verification lens is downstream readiness and additive compatibility, not UI completeness.

7. `story-verification/00-foundation/verification-bundle.md`
- OBSERVED: The bundle claims additive shared-contract changes, safe default wiring, and reusable fixtures/builders rather than behavior-heavy implementation.
- OBSERVED: The changed-file manifest matches the actual working tree for the claimed Story 0 scope.
- OBSERVED: The claimed fix batches map to bounded cleanup and expectation updates rather than broad scope drift.

8. `git diff e6c08484846aea19d2d6e3483728126fe7da92f2 -- **/*.test.* **/*.spec.*`
- OBSERVED: The test diff is overwhelmingly additive contract alignment: new `environment`, `controls`, and `accessMode` expectations plus one new foundation contract test file.
- OBSERVED: I did not find assertion weakening, scope shift, or unexplained deletions in the changed tests.
- INFERRED: The diff supports the bundle’s claim that Story 0 closed integration fallout with targeted corrections rather than masking regressions.

## VERDICT

PASS

Observed implementation matches the foundation-story intent closely enough to support downstream Story 1 work: shared Epic 03 vocabulary is centralized in shared contracts, emitted through existing bootstrap/live/material seams with additive defaults, and backed by reusable fixture builders and passing gate evidence. I did not find a supported blocking defect.

## CORRECTNESS_FINDINGS

None observed.

## ARCHITECTURE_FINDINGS

None observed at blocking or major severity.

## TEST_DIFF_AUDIT

- `tests/service/server/process-foundation-contracts.test.ts`: legitimate coverage. New focused Story 0 test for control order, mixed `accessMode`, checkpoint-result vocabulary, and recovery error codes.
- `tests/service/client/process-live.test.ts`: legitimate coverage. Adds first-class `environment` live upsert handling and preserves checkpoint-result visibility on failure updates.
- `tests/service/server/process-live-updates.test.ts`: legitimate coverage plus legitimate correction. Adds `environment` snapshot/upsert assertions and aligns source fixtures with `accessMode`.
- `tests/service/server/process-work-surface-api.test.ts`: legitimate correction. Updates expected bootstrap payloads for `environment` and `accessMode`.
- `tests/service/server/process-actions-api.test.ts`: legitimate correction. Updates process action response expectations for the new `controls` and `hasEnvironment` fields.
- `tests/service/client/process-work-surface-page.test.ts`: legitimate correction. Updates page-state fixtures to include the new `environment` slot.
- `tests/service/client/process-response-composer.test.ts`: legitimate correction. Adds `environment: null` to the process-surface state fixture.
- `tests/service/server/processes-api.test.ts`: legitimate correction. Adds `accessMode` to the source attachment fixture shape.
- Overall classification: legitimate coverage and legitimate corrections only. I found no assertion weakening, unexplained test churn, or suspicious wrong-reason passes in the diff itself.

## TEST_QUALITY_FINDINGS

None observed.

## BLOCKING_FINDINGS

None.

## NONBLOCKING_WARNINGS

- finding: Shared Epic 03 action-contract groundwork is still partial.
  severity: MINOR
  confidence: MEDIUM
  evidence: OBSERVED in `apps/platform/shared/contracts/process-work-surface.ts` that Story 0 adds `environment` summary types and rehydrate/rebuild path builders, but only `startProcessResponseSchema` and `resumeProcessResponseSchema` exist and both still omit `environment`; there are no shared rehydrate/rebuild response schemas yet.
  disproof_attempt: I checked `stories/00-foundation.md` and the verification bundle. They do not claim Story 0 implements rehydrate/rebuild behavior, and the current repo passes all tests with this narrower scope.
  impact: Later Epic 03 stories will still need another cross-cutting shared-contract touch in the Story 0 foundation file instead of building entirely on already-settled action response vocabulary.
  validation_step: Either add placeholder shared response schemas now or tighten the Story 0/bundle wording so downstream readers do not assume those action contracts are already part of the foundation.

- finding: Story wording about “error classes” is broader than the implementation that landed.
  severity: MINOR
  confidence: MEDIUM
  evidence: OBSERVED in `stories/00-foundation.md` and `epic.md` that Story 0 is described as establishing recovery error classes, while the implementation adds shared request-error codes/constants in `apps/platform/shared/contracts/schemas.ts` and `apps/platform/server/errors/codes.ts` but no dedicated recovery-specific error subclasses/helpers beyond the existing generic `AppError`.
  disproof_attempt: The current server architecture already standardizes on `AppError`, so dedicated subclasses are not required for current behavior, and no failing test or broken seam demonstrates a runtime defect.
  impact: This is mainly a documentation/readability gap, but later implementers may expect prebuilt typed recovery-error helpers that are not actually present.
  validation_step: Either add explicit helper constructors/subclasses or narrow the story wording from “error classes” to “shared error-code vocabulary.”

## UNRESOLVED

- OBSERVED: `epic.md` still says the action-acceptance boundary includes cases where “the requested source is not writable,” while `tech-design.md` and `tech-design-server.md` explicitly resolve source writability as checkpoint-planning logic rather than a direct `start`/`resume`/`rehydrate`/`rebuild` rejection path.
- DISPOSITION: UNRESOLVED documentation tension, not a supported Story 0 code defect.
- WHY IT STAYS UNRESOLVED: Story 0 only introduces shared vocabulary and tests; it does not yet implement the later checkpoint/recovery behavior needed to prove which interpretation later stories will follow.

## GATE_RESULT

- Command: `corepack pnpm run verify`
- Result: PASS
- Observed details:
  - `red-verify` passed
  - `test:convex`: 3 files, 9 tests passed
  - `test:service`: 10 files, 62 tests passed
  - `test:client`: 16 files, 105 tests passed

## AFTER_REVIEW

What else I noticed but chose not to report as a finding:

- `test-plan.md` contains an internal count mismatch (`103` planned tests in the inventory summary vs `93` in the chunk running total). I treated that as doc drift, not Story 0 implementation failure.
- `apps/platform/server/app.ts` still logs “Epic 1 platform error” in the generic error handler. That looks like historical wording residue rather than an Epic 03 correctness problem.
- The foundation intentionally uses additive defaults such as `defaultEnvironmentSummary` and default `read_only` `accessMode`; that can hide missing producer wiring, but in this story the bundle explicitly claims safe-default wiring, and the surrounding code/tests are consistent with that approach.
