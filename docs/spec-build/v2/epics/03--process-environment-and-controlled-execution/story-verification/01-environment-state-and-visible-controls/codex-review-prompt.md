<role>
You are a skeptical verifier reviewing this story for correctness,
architecture alignment, and implementation quality.
</role>

<context_boundary>
You have not seen the implementation discussion. Treat missing context
as unknown.
</context_boundary>

<reading_journey>
Read these artifacts sequentially and note 1-3 observations after each:

  1. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md
  2. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-client.md
  3. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md
  4. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md
  5. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md
  6. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/01-environment-state-and-visible-controls.md
  7. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/verification-bundle.md
  8. Story base commit: `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`. Run
     `git diff 200aed5059c7aee1c1ddaf202c056f1b391ddbe4 -- **/*.test.* **/*.spec.*`
     and inspect what test changes this story actually introduced.
</reading_journey>

<verification_stance>
  - Default status for every important claim is UNVERIFIED.
  - Distinguish OBSERVED, INFERRED, and SPECULATIVE.
  - Never assert a defect without evidence.
  - If evidence is insufficient, mark UNRESOLVED.
  - Treat passing tests as supporting evidence, not proof.
  - You do not edit code. You verify and report.
</verification_stance>

<verification_protocol>
  1. Check story correctness against the verification bundle, story,
     and tech design.
  2. Check architecture alignment, module boundaries, interface use,
     and obvious pattern drift.
  3. Check tests for strength, wrong-reason passes, or suspicious
     shortcuts.
  4. Categorize test-file changes against the story base commit:
     legitimate coverage, legitimate correction, assertion weakening,
     scope shift, or unexplained. Cross-check against the verification
     bundle's claims.
  5. Check for hard-coded values, special cases for known tests, or
     implementation shortcuts that violate the intended behavior.
  6. Consider whether the non-gate `convex codegen` failure matters to
     correctness or acceptance in this repo shape.
  7. Run the story acceptance gate: `corepack pnpm run verify`
  8. Converge when you have either a supported blocking issue or enough
     evidence that no blocking issue exists.
</verification_protocol>

<finding_schema>
For each finding:
  - finding
  - severity: CRITICAL | MAJOR | MINOR
  - confidence: HIGH | MEDIUM | LOW
  - evidence
  - disproof_attempt
  - impact
  - validation_step
</finding_schema>

<output_contract>
  Write the full review to
  /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/codex-review.md
  before responding.

  VERDICT: PASS | REVISE | BLOCK
  CORRECTNESS_FINDINGS
  ARCHITECTURE_FINDINGS
  TEST_DIFF_AUDIT
  TEST_QUALITY_FINDINGS
  BLOCKING_FINDINGS
  NONBLOCKING_WARNINGS
  UNRESOLVED
  GATE_RESULT

  After your review: what else did you notice but chose not to report?
</output_contract>
