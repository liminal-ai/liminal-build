# Codex Implementation Log: Epic 03

## Run State

- `state`: `BETWEEN_STORIES`
- `state`: `STORY_ACTIVE`
- `phase`: `waiting-implementer`
- `active_blocking_dependency`: `worker 019d92f8-2833-7160-908f-b0ec433ed9cc`
- `created_at`: `2026-04-15`
- `project_root`: `/Users/leemoore/code/liminal-build`
- `epic_root`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/03--process-environment-and-controlled-execution`
- `current_head`: `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`
- `working_tree_status`: `process-artifacts-only`

Setup completed from a cold start. No prior `codex-impl-log.md` existed in the
epic directory, so this run initialized as `SETUP`. Story 0 dispatch is now in
progress.

Implementer launched:

- worker id: `019d92ac-e2f9-7e61-b0f2-433ae88689bd`
- lane: Codex `gpt-5.4` with reasoning `xhigh`
- dispatch status: launched with one complete Story 0 implementation handoff

### Waiting-State Recovery

- Multiple wait windows elapsed while the implementer was still in the full
  `verify` gate. No blocker signal surfaced during passive waits.
- Recovery action taken:
  orchestrator interrupted for an explicit status harvest rather than replacing
  the worker.
- Recovery outcome:
  worker reported active progress, a nearly complete Story 0 implementation, and
  a remaining full-gate confirmation step. The same worker was reused.

### Implementer Return Summary

- Implementer returned a complete change summary and a failing full-gate report.
- Targeted Story 0 tests passed before the full gate:
  - `corepack pnpm exec vitest run tests/service/server/process-foundation-contracts.test.ts tests/service/server/process-work-surface-api.test.ts tests/service/server/process-live-updates.test.ts --environment node`
  - `corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom`
- Full gate result:
  `corepack pnpm run verify` failed during `typecheck`
- Orchestrator assessment:
  the failures are bounded integration fallout from Story 0's required fields
  becoming mandatory, not a spec or architecture dispute

### Fix Routing

- Fix batch materialized to:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-00-fix-batch-01.md`
- Fix worker:
  reused implementer `019d92ac-e2f9-7e61-b0f2-433ae88689bd`
- Routing reason:
  the failures are concrete typecheck fallout in existing fixtures/exports and
  should be cheaper to close with the same implementer than with a fresh read

### Fix Batch 01 Result

- Result:
  previous typecheck fallout closed
- Remaining failure count:
  `1`
- Remaining failure:
  strict-equality expectation in
  `tests/service/server/process-actions-api.test.ts`
  still assumes the pre-Story-0 response shape and must be updated for
  `process.controls` plus `process.hasEnvironment`

### Fix Batch 02 Routing

- Fix batch materialized to:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-00-fix-batch-02.md`
- Fix worker:
  reused implementer `019d92ac-e2f9-7e61-b0f2-433ae88689bd`
- Routing reason:
  one remaining strict-equality assertion is still pinned to the pre-Story-0
  response shape

### Fix Batch 02 Result

- Remaining strict-equality assertion updated in
  `tests/service/server/process-actions-api.test.ts`
- Full story gate rerun:
  `corepack pnpm run verify`
- Result:
  `passed`

### Verification Launch

- Verification bundle:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/verification-bundle.md`
- Codex verifier worker:
  `019d92bd-6e1b-7040-926b-34b4aeda6f6f`
- Sonnet verifier exec session:
  `43330`
- Sonnet review artifact path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/sonnet-review.md`
- Sonnet structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/sonnet-review.json`

### Codex Verification Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/codex-review.md`
- Verdict:
  `PASS`
- Summary:
  no supported blocking defects; shared vocabulary is centralized, additive, and
  green on `corepack pnpm run verify`
- Nonblocking warnings noted by verifier:
  - shared action-contract groundwork is still partial for later
    rehydrate/rebuild response shapes
  - Story 0 language says `error classes` while the implementation currently
    lands shared error-code vocabulary on top of generic `AppError`
  - doc tension remains around source writability wording between epic and tech
    design

### Sonnet Verification Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/sonnet-review.md`
- Structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/00-foundation/sonnet-review.json`
- Verdict:
  `PASS`
- Summary:
  all critical and major Story 0 foundation obligations satisfied, with only
  minor completeness/documentation warnings

### Verification Synthesis

- Overlap:
  both verifiers agree the shared Story 0 vocabulary is centralized, additive,
  wired through the correct seams, and green on the full story gate
- Meaningful disagreement:
  none
- Convergence rounds run:
  `0`
- Orchestrator decision:
  no additional code change is required before Story 0 acceptance

### Finding Dispositions

- `environmentCompleteLiveFixture` missing despite DoD wording about completion
  markers
  - disposition: `defer`
  - rationale: no current Story 0 producer emits an `environment` `complete`
    event; add this when Story 3 or later stories introduce a real completion
    path rather than inventing synthetic semantics now
- matrix-level disabled-reason control fixtures are still partial
  - disposition: `defer`
  - rationale: Story 0 establishes the vocabulary and reusable builders; Story 1
    and Story 5 will exercise the operational control-state matrix directly
- `PROCESS_ACTION_NOT_AVAILABLE` is not covered by the new foundation test file
  - disposition: `accepted-risk`
  - rationale: pre-existing Epic 2 vocabulary, not a new Story 0 obligation
- shared rehydrate/rebuild response groundwork is still partial
  - disposition: `defer`
  - rationale: owned by the later behavior stories that actually wire those
    actions
- Story 0 wording says `error classes` while implementation lands error-code
  vocabulary on top of `AppError`
  - disposition: `accepted-risk`
  - rationale: matches the current app architecture; documentation can be
    tightened later without blocking Story 0
- source writability wording differs between epic and tech design
  - disposition: `defer`
  - rationale: documentation tension only; not a supported Story 0 code defect
- environment error delivery model is not fully documented
  - disposition: `accepted-risk`
  - rationale: current implementation follows the tech design pattern of
    surfacing environment problems through `environment.state` and
    `blockedReason`
- route-level `controls` assertion is lighter than service-level coverage
  - disposition: `accepted-risk`
  - rationale: service-level foundation test covers the contract and Story 1 can
    add stronger route-level behavior assertions
- default `absent` environment stub could hide forgotten Story 1 reader wiring
  - disposition: `defer`
  - rationale: acceptable safe default for Story 0; Story 1 verification should
    explicitly check reader injection

### Orchestrator Final Check

- Story acceptance gate rerun by orchestrator:
  `corepack pnpm run verify`
- Result:
  `passed`
- Cumulative test baseline:
  prior Epic 03 affected-suite baseline `74`, current affected-suite baseline
  `82`; no regression
- Boundary inventory status:
  unchanged and not worsened

## Story 0 Pre-Acceptance Receipt

1. Implementation lane used
   Codex `gpt-5.4` with reasoning `xhigh`
2. Changed files summary
   shared process/environment contracts, shared error-code vocabulary,
   bootstrap/live/materials wiring, reusable Story 0 fixtures, and supporting
   server/client tests
3. Story base commit hash
   `e6c08484846aea19d2d6e3483728126fe7da92f2`
4. Test diff summary against the story base commit
   additive Story 0 foundation coverage plus legitimate contract-alignment
   corrections; no assertion weakening found
5. Codex verification summary
   `PASS`, no supported blocking defects, three nonblocking warnings
6. Sonnet verification summary
   `PASS`, all critical and major foundation obligations satisfied, minor
   completeness/documentation warnings only
7. Convergence rounds run
   `0`
8. Fixes applied
   Fix Batch 01 closed typecheck fallout; Fix Batch 02 updated one remaining
   strict-equality assertion in `tests/service/server/process-actions-api.test.ts`
9. Exact story gate command(s) and results
   - implementer final gate: `corepack pnpm run verify` -> `passed`
   - Codex verifier gate: `corepack pnpm run verify` -> `passed`
   - Sonnet verifier gate: `corepack pnpm run verify` -> `passed`
   - orchestrator gate: `corepack pnpm run verify` -> `passed`
10. Open risks
    none blocking; nonblocking warning dispositions recorded above

## Story 0 Transition Checkpoint

- Story 0 acceptance:
  accepted
- Story 0 commit:
  `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`
- Commit message:
  `feat: Story 0 - Foundation`
- Post-story cumulative affected-suite baseline:
  `82`
- Baseline movement:
  increased from `74` to `82`, matching the low end of the pre-story expected
  range and showing no regression
- Boundary inventory update:
  unchanged; hosted provider adapter, local provider adapter, and canonical code
  checkpoint boundary remain `stub` and are still future-story work rather than
  worsened regressions
- Story 1 output directory prepared:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls`

## Next Story

- Next story:
  `stories/01-environment-state-and-visible-controls.md`
- Next action:
  reload skill directives, reread Story 1 and its most relevant design sections,
  project the next cumulative baseline, record the new story base commit, and
  dispatch a fresh implementer

## Story 1 Preflight

### Refresh Notes

- Reloaded `ls-codex-impl` before Story 1 dispatch.
- Reread `stories/01-environment-state-and-visible-controls.md` in full.
- Skimmed `stories/02-start-or-resume-with-environment-preparation.md` to keep
  the immediate downstream dependency in view.
- Reread the most relevant Story 1 design/code seams:
  - `tech-design-client.md`
  - `tech-design-server.md`
  - `apps/platform/server/services/processes/process-work-surface.service.ts`
  - `apps/platform/server/routes/processes.ts`
  - `apps/platform/client/features/processes/process-work-surface-page.ts`
  - `apps/platform/client/app/bootstrap.ts`
  - `tests/service/server/process-work-surface-api.test.ts`
  - `tests/service/client/process-work-surface-page.test.ts`

### Preflight Assessment

- Story 0 established the shared contract vocabulary, but
  `DefaultProcessWorkSurfaceService` still returns `defaultEnvironmentSummary`
  unconditionally. Story 1 now needs durable first-load environment truth.
- The process work-surface page still renders action buttons from
  `availableActions` rather than the full stable `controls` array, so Story 1
  must introduce the visible control area promised by the client design.
- Story 1 is the first behavior-heavy bootstrap/render story on top of the new
  environment vocabulary and will likely touch both server projection and client
  composition.
- Story 1 must stop short of Story 2 behavior: no start/resume preparation flow,
  no hydration progress, no controlled execution, and no checkpoint/recovery
  mutations beyond seeded/durable visibility cases.

### Story Base Commit

- Story 1 base commit:
  `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`

### Lane Decision

- Story 1 implementation lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- Why:
  first behavior story in the new environment seam, cross-cutting server/client
  bootstrap work, and a high chance of downstream fix routing if the visible
  control model or durable environment projection is wrong

### Expected Test Baseline

- Prior affected-suite baseline:
  `82`
- Story 1 expectation:
  should add substantial bootstrap/render/control coverage, especially in the
  currently empty or underbuilt Story 1 target files such as
  `tests/service/client/process-controls.test.ts` and
  `tests/service/client/process-environment-panel.test.ts`
- Expected post-Story-1 total:
  about `100-106` affected-suite tests
- Verification concern:
  if Story 1 lands materially below `100` without a clear explanation, treat
  that as a likely coverage gap in the control-state matrix or environment-panel
  work

### Story-Specific Warnings For Implementer

- Replace the current default-environment bootstrap stub with durable first-load
  truth, but keep the process route as the only user entry point.
- Render the stable visible control area from `process.controls`, not only
  enabled actions from `availableActions`.
- Keep seeded/durable recovery-state visibility in scope, but do not implement
  Story 2 start/resume preparation behavior or Story 5 recovery mutations here.
- Preserve the Story 0 additive defaults and shared fixture patterns instead of
  inventing a second bootstrap/live/environment model.

### Story 1 Dispatch

- worker id:
  `019d92c6-bcfb-7b43-af6c-48d8ac314a01`
- lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- dispatch status:
  launched with one complete Story 1 implementation handoff

### Story 1 Implementer Return Summary

- Implementer returned a complete Story 1 report with no blocking questions.
- Reported story gate result:
  `corepack pnpm run verify` -> `passed`
- Additional reported non-gate command:
  `corepack pnpm exec convex codegen` -> failed because no local Convex backend
  was running at `http://127.0.0.1:3210`
- Orchestrator assessment:
  the Story 1 implementation is ready for fresh dual verification; reviewers
  should explicitly evaluate whether the non-gate codegen miss matters in this
  repo shape.

### Story 1 Verification Launch

- Verification bundle:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/verification-bundle.md`
- Codex verifier worker:
  `019d92db-8030-79f2-8d87-a501a0bc28cb`
- Sonnet verifier exec session:
  `47875`
- Sonnet review artifact path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review.md`
- Sonnet structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review.json`

### Story 1 Codex Verification Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/codex-review.md`
- Verdict:
  `REVISE`
- Blocking finding:
  action responses (`start` / `resume` / `respond`) rebuild `process.controls`
  and `hasEnvironment` without the current durable environment summary, so the
  same session can show `environment.state = ready` while the returned `process`
  summary regresses to absent-environment disabled reasons
- Gate note:
  Codex verifier passed `corepack pnpm run verify`
- Codegen note:
  Codex verifier treated the non-gate `convex codegen` failure as non-blocking
  in the current repo shape, while noting the local Convex dev path remains
  unverified

### Story 1 Sonnet Verification Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review.md`
- Structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review.json`
- Verdict:
  `PASS`
- Summary:
  Sonnet found all five ACs satisfied and treated the `convex codegen` miss as a
  non-blocking repo-shape issue

### Story 1 Convergence Round 1

- Reason:
  meaningful verifier disagreement on whether same-session action responses stay
  aligned with the durable environment-aware process summary
- Orchestrator evidence check:
  `process-start.service.ts`, `process-resume.service.ts`, and
  `process-response.service.ts` each call `buildProcessSurfaceSummary(result.process)`
  without passing the current environment summary
- Codex reaction:
  technical inconsistency stands, but Codex retracted the certainty that it is
  automatically a Story 1 acceptance blocker on scope grounds
- Sonnet convergence lane:
  two helper executions failed to produce a report artifact or structured result;
  treated as incomplete lane-local failure for convergence only
- Orchestrator decision:
  route a bounded fix anyway because the inconsistency is real, user-visible on
  the same process surface, and cheap enough to close now rather than carrying
  into Story 2

### Story 1 Fix Routing

- Fix batch materialized to:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-01-fix-batch-01.md`
- Fix worker:
  reused implementer `019d92c6-bcfb-7b43-af6c-48d8ac314a01`
- Routing reason:
  same-session action responses must stay aligned with the environment-aware
  Story 1 process summary

### Story 1 Fix Batch 01 Result

- Fixes applied:
  `start`, `resume`, and `respond` now rebuild `process` summaries with the
  current durable environment summary, action publications include the
  environment-aware `process`, and a focused regression was added for `resume`
  with a seeded `ready` environment
- Files changed in fix batch:
  - `apps/platform/server/services/processes/process-start.service.ts`
  - `apps/platform/server/services/processes/process-resume.service.ts`
  - `apps/platform/server/services/processes/process-response.service.ts`
  - `tests/service/server/process-actions-api.test.ts`
- Fix batch gate result:
  `corepack pnpm run verify` -> `passed`
- Orchestrator decision:
  rerun fresh dual verification because post-review code changed

### Story 1 Verification Relaunch

- Codex verifier worker:
  `019d92e7-26d4-7213-994d-c937b9e4642e`
- Sonnet verifier exec session:
  `94442`
- Codex report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/codex-review-round-2.md`
- Sonnet report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review-round-2.md`
- Sonnet structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review-round-2.json`
- Focus:
  verify the post-fix Story 1 code and specifically confirm the same-session
  action-response inconsistency is closed

### Story 1 Codex Verification Round 2 Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/codex-review-round-2.md`
- Verdict:
  `PASS`
- Summary:
  Codex reran the diff review and the full story gate, and independently
  rechecked `start`, `resume`, and `respond` with seeded same-session repros;
  the prior action-response inconsistency is now closed

### Story 1 Sonnet Verification Round 2 Result

- Report path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review-round-2.md`
- Structured result path:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/01-environment-state-and-visible-controls/sonnet-review-round-2.json`
- Verdict:
  `PASS`
- Summary:
  all 17 Story 1 TCs satisfied, full story gate green, and the prior same-session
  action-response inconsistency explicitly marked closed

### Story 1 Verification Synthesis

- Overlap:
  both round-2 verifiers agree Story 1 is now `PASS`, the story gate is green,
  and the previous same-session action-response bug is closed
- Meaningful disagreement:
  none remaining
- Convergence rounds run:
  `1`
- Orchestrator decision:
  no further code change is required before Story 1 acceptance

### Story 1 Finding Dispositions

- `providerKind` remains nullable in Convex storage
  - disposition: `accepted-risk`
  - rationale: explicitly documented Story 1 deviation to avoid pulling Story 2
    provider selection into this slice
- `convex codegen` did not run against a live local backend
  - disposition: `accepted-risk`
  - rationale: not part of the locked story gate in the current repo shape;
    reviewers treated it as non-blocking
- `start` and `respond` do not yet have dedicated same-session regression tests
  - disposition: `defer`
  - rationale: code path fixed and verified by Codex repro plus one focused
    `resume` regression; add explicit symmetric tests when Story 2 deepens those
    action paths
- `deriveProcessSurfaceAvailableActions` may now be dead code
  - disposition: `defer`
  - rationale: cleanup candidate, not a Story 1 correctness blocker
- no direct `convex/processEnvironmentStates.test.ts` exists yet
  - disposition: `defer`
  - rationale: direct Convex-layer coverage becomes more important once Story 2
    and later stories add write paths
- some control-matrix cases still rely on implicit rather than dedicated
  assertions for `respond`/`review`
  - disposition: `accepted-risk`
  - rationale: Story 1 required TC coverage is satisfied and the current logic is
    consistent with the design

### Story 1 Orchestrator Final Check

- Story acceptance gate rerun by orchestrator:
  `corepack pnpm run verify`
- Result:
  `passed`
- Cumulative test baseline:
  prior Epic 03 affected-suite baseline `82`, current affected-suite baseline
  `105`; no regression
- Boundary inventory status:
  unchanged and not worsened

## Story 1 Pre-Acceptance Receipt

1. Implementation lane used
   Codex `gpt-5.4` with reasoning `xhigh`
2. Changed files summary
   durable environment bootstrap projection, environment-aware control
   derivation, new process-surface control/environment UI components, new
   `processEnvironmentStates` read path, and Story 1 server/client/integration
   coverage
3. Story base commit hash
   `200aed5059c7aee1c1ddaf202c056f1b391ddbe4`
4. Test diff summary against the story base commit
   additive Story 1 bootstrap/control/render coverage plus post-review
   regression coverage for same-session action-response alignment
5. Codex verification summary
   round 1 `REVISE` on same-session inconsistency; round 2 `PASS` after fix with
   seeded repro confirmation
6. Sonnet verification summary
   round 1 `PASS`; round 2 `PASS` and explicit confirmation that the same-session
   fix is closed
7. Convergence rounds run
   `1`
8. Fixes applied
   Story 1 Fix Batch 01 updated `start` / `resume` / `respond` to rebuild
   `process` with the current durable environment summary and added a focused
   `resume` regression
9. Exact story gate command(s) and results
   - implementer gate: `corepack pnpm run verify` -> `passed`
   - fix-batch gate: `corepack pnpm run verify` -> `passed`
   - Codex verifier round 2 gate: `corepack pnpm run verify` -> `passed`
   - Sonnet verifier round 2 gate: `corepack pnpm run verify` -> `passed`
   - orchestrator gate: `corepack pnpm run verify` -> `passed`
10. Open risks
    none blocking; nonblocking warning dispositions recorded above

## Story 1 Transition Checkpoint

- Story 1 acceptance:
  accepted
- Story 1 commit:
  `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`
- Commit message:
  `feat: Story 1 - Environment State and Visible Controls`
- Post-story cumulative affected-suite baseline:
  `105`
- Baseline movement:
  increased from `82` to `105`, consistent with Story 1's expected expansion in
  bootstrap/control/render coverage and showing no regression
- Boundary inventory update:
  unchanged; hosted provider adapter, local provider adapter, and canonical code
  checkpoint boundary remain future-story work rather than worsened regressions
- Story 2 output directory prepared:
  `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/02-start-or-resume-with-environment-preparation`

## Next Story

- Next story:
  `stories/02-start-or-resume-with-environment-preparation.md`
- Next action:
  reload skill directives, reread Story 2 and its most relevant design sections,
  project the next cumulative baseline, record the new story base commit, and
  dispatch a fresh implementer

## Story 2 Preflight

### Refresh Notes

- Reloaded `ls-codex-impl` before Story 2 dispatch.
- Reread `stories/02-start-or-resume-with-environment-preparation.md` in full.
- Skimmed `stories/03-controlled-execution-and-live-environment-state.md` to
  keep the immediate downstream seam in view.
- Reread the most relevant Story 2 design/code seams:
  - `apps/platform/server/services/processes/process-start.service.ts`
  - `apps/platform/server/services/processes/process-resume.service.ts`
  - `apps/platform/server/services/projects/platform-store.ts`
  - `apps/platform/shared/contracts/process-work-surface.ts`
  - `apps/platform/client/browser-api/process-work-surface-api.ts`
  - `tests/service/server/process-actions-api.test.ts`
  - `tests/service/client/process-controls.test.ts`
  - `test-plan.md` Story 2-related inventory

### Preflight Assessment

- Current `start` and `resume` still transition directly to generic `running`
  behavior. Story 2 must replace that with visible preparation/hydration flow
  and only move to active running when readiness is confirmed.
- Story 1 established durable environment truth and visible controls, but Story
  2 is the first story that needs operational environment-state transitions and
  current-material hydration behavior.
- Source `accessMode` is now durable and visible, so Story 2 can use it to
  distinguish writable vs read-only attachments before code checkpointing
  matters.
- The new `processEnvironmentStates` read path exists, but direct Convex-layer
  tests are still absent; Story 2 is the first likely story to add meaningful
  environment-state writes and should do so carefully.
- `convex codegen` was non-gating in Story 1 because no local Convex backend was
  running. Story 2 may still need to work around that local limitation if it
  adds new function references.

### Story Base Commit

- Story 2 base commit:
  `326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`

### Lane Decision

- Story 2 implementation lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- Why:
  boundary-heavy first operational environment story, likely Convex/server/client
  coordination, and high risk of fix routing if state transitions or hydration
  planning are wrong

### Expected Test Baseline

- Prior affected-suite baseline:
  `105`
- Story 2 expectation:
  should add another `12-18` tests centered on process actions, environment
  preparation visibility, materials/source access, and accepted-action vs
  later-failure coherence
- Expected post-Story-2 total:
  about `117-123` affected-suite tests
- Verification concern:
  if Story 2 lands materially below `117` without a clear explanation, treat
  that as a likely gap in action-path or preparation/hydration coverage

### Story-Specific Warnings For Implementer

- Replace generic start/resume-to-running behavior with Story 2 preparation
  semantics, but do not implement Story 3 execution or Story 5 recovery flows.
- Keep hydration scoped to the process's current artifacts, outputs, and current
  sources only; do not broaden to unrelated project materials.
- Preserve accepted-action vs later-failure separation: immediate HTTP errors
  only for preflight rejection, later lifecycle problems through environment
  state.
- Use existing Story 1 environment/bootstrap/control seams rather than adding a
  second action/progress model.

### Story 2 Dispatch

- worker id:
  `019d92f0-1f89-77c3-a520-3319c0a5e028`
- lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- dispatch status:
  launched with one complete Story 2 implementation handoff

### Story 2 Waiting-State Recovery

- Multiple wait windows elapsed without a blocker report.
- Interrupt status harvest result:
  worker reported no blocker, no file edits yet, and that it was still in seam
  inspection/prep.
- Logged as:
  `ORCHESTRATOR_STALL`
- Recovery action:
  interrupt once and redirect the worker from inspection into concrete Story 2
  edits; replace the lane if it still does not cross into implementation
- Post-redirect check:
  no Story 2 code delta appeared in the workspace
- Final recovery action:
  replace the worker

### Story 2 Replacement Dispatch

- replacement worker id:
  `019d92f8-2833-7160-908f-b0ec433ed9cc`
- lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- replacement strategy:
  narrowed first-pass scope and required immediate transition from reading into
  concrete Story 2 edits

### Story 2 Replacement Lane Failure

- Human-observed symptom:
  replacement worker appeared to be awaiting instruction
- Orchestrator check:
  repeated wait windows plus zero workspace delta after explicit implementation
  redirects
- Recovery action:
  replacement worker `019d92f8-2833-7160-908f-b0ec433ed9cc` shut down and lane
  replaced again

### Story 2 External Slice Recovery

- Internal Codex worker lane was not reliably usable for Story 2 implementation.
- External Claude helper lane was switched in for bounded implementation slices.
- Successful bounded slices on the current Story 2 tree:
  - Slice 1:
    `start` / `resume` return `environment.state = preparing` in-session when
    environment work is required, and server regression coverage landed in
    `tests/service/server/process-actions-api.test.ts`
  - Slice 2:
    `PlatformStore` test doubles updated for the new
    `upsertProcessEnvironmentState` method so repo-wide `typecheck` returned to
    green
  - Slice 3:
    source `accessMode` now renders in
    `apps/platform/client/features/processes/process-materials-section.ts` and
    dedicated client coverage landed in
    `tests/service/client/process-materials-section.test.ts`
  - Slice 4:
    Story 2 client page tests now use preparation-aware action-response fixtures
    and assert visible preparation state immediately after `start` / `resume`
- Current verified baseline on the uncommitted Story 2 tree:
  - `corepack pnpm run verify` -> passed
  - service tests: `74` passing
  - client tests: `128` passing

### Story 2 Remaining Gap Assessment

- Story 2 is not yet accepted or committed.
- Current tree materially covers:
  - visible preparation entry in-session (`AC-2.1`)
  - source writability visibility (`AC-2.5`)
  - parts of accepted-action boundary and returned waiting/completed/failed
    paths (`AC-2.4`)
- Main remaining gap appears to be the middle of the story:
  - hydration planning against current artifacts / outputs / sources (`AC-2.2`)
  - visible hydration progress / recoverable failure without manual refresh
    (`AC-2.3`)

## Startup Orientation

This run keeps one Codex orchestrator across the full epic. Stories will be
implemented one at a time, each story will get a fresh implementer plus fresh
dual verification, default implementation uses Codex `gpt-5.4 high`, riskier
stories upgrade to Codex `gpt-5.4 xhigh`, and default verification uses fresh
Codex `gpt-5.4 xhigh` plus fresh Sonnet max.

No human override was provided for lane preferences during setup, so the run is
initialized with the default lane policy from the skill.

## Artifact Registry

| Artifact | Path | Status |
|----------|------|--------|
| Epic | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md` | present |
| Tech design index | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md` | present |
| Tech design companion | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-client.md` | present |
| Tech design companion | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md` | present |
| Test plan | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md` | present |
| Story directory | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories` | present |
| Story coverage map | `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/coverage.md` | present |

### Story Order

1. `stories/00-foundation.md`
2. `stories/01-environment-state-and-visible-controls.md`
3. `stories/02-start-or-resume-with-environment-preparation.md`
4. `stories/03-controlled-execution-and-live-environment-state.md`
5. `stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md`
6. `stories/05-rehydrate-rebuild-and-recovery.md`
7. `stories/06-return-later-and-degraded-operation.md`

### Story Sequence And Dependency Notes

- Story 0 is the foundation contract story. It defines the shared environment,
  control, checkpoint, source-access, error, and live-update vocabulary used by
  all later stories.
- Story 1 extends the durable process bootstrap with environment truth and the
  full visible control area. This is the first behavior story and the baseline
  for all later route, store, and bootstrap work.
- Story 2 adds start/resume-driven environment preparation, hydration planning,
  and source writability visibility. It depends on Story 1's bootstrap/control
  contract.
- Story 3 adds live execution visibility and environment entity updates over the
  existing websocket seam. It depends on Stories 1 and 2.
- Story 4 adds durable checkpointing for artifacts and writable sources plus
  latest checkpoint result visibility. It depends on Stories 2 and 3.
- Story 5 adds rehydrate/rebuild/recovery behavior and the production paths that
  make recovery-only states operationally reachable. It depends on Stories 1
  and 4.
- Story 6 closes the loop with reopen/degraded-operation behavior and depends on
  Stories 1, 4, and 5.

### Per-Story Implementation Prompts

No per-story implementation prompt files were found near the epic or story
files. The orchestration prompt map below is the authoritative handoff source
unless later artifacts are added.

## Lane Policy

- `orchestrator`: `gpt-5.4` with reasoning `xhigh`
- `implementer_default`: `gpt-5.4` with reasoning `high`
- `implementer_escalation`: `gpt-5.4` with reasoning `xhigh`
- `story_verifier_codex`: `gpt-5.4` with reasoning `xhigh`
- `story_verifier_sonnet`: `claude-sonnet-4-6` with effort `max`
- `feature_verifier_codex`: `gpt-5.4` with reasoning `xhigh`
- `feature_verifier_sonnet`: `claude-sonnet-4-6` with effort `max`
- `third_feature_reviewer`: `gpt-5.3-codex` only if repeated convergence fails
  on a material unresolved issue or the human explicitly requests extra review
  diversity

## Lane Availability

| Lane | Availability | Evidence |
|------|--------------|----------|
| Codex worker lane | available | Current session has Codex worker/subagent tools available |
| Sonnet verifier lane | available | Claude CLI present and `claude-result` helper succeeded against this repo |

### Sonnet Helper Command

- Resolved helper path:
  `/Users/leemoore/.claude/skills/claude-subagent/scripts/claude-result`
- Intended verifier invocation pattern:
  `"$SONNET_HELPER" --json --cwd /Users/leemoore/code/liminal-build exec "$(cat [PROMPT_FILE])" --model claude-sonnet-4-6 --effort max --permission-mode acceptEdits --allowedTools Read,Write,Edit,Bash,Grep,Glob > [RUN_JSON]`

### Helper Smoke Checks

1. Command:
   `claude --version`
   Result:
   `2.1.109 (Claude Code)`
2. Command:
   `"/Users/leemoore/.claude/skills/claude-subagent/scripts/claude-result" --help | sed -n '1,20p'`
   Result:
   helper usage rendered successfully
3. Command:
   `"/Users/leemoore/.claude/skills/claude-subagent/scripts/claude-result" --json --cwd /Users/leemoore/code/liminal-build exec "Reply with OK only." --model claude-sonnet-4-6 --effort max --permission-mode acceptEdits --allowedTools Read,Write,Edit,Bash,Grep,Glob`
   Result:
   success, `result = "OK"`, `session_id = "88a057e1-fcac-4217-af14-effad6fd50d0"`

## Verification Gates

### Story Acceptance Gate

- Locked command:
  `corepack pnpm run verify`
- Reason:
  repo scripts and the Epic 03 test plan identify `verify` as the main
  development gate, and it includes formatting, lint, typecheck, build,
  `test:convex`, `test:service`, and `test:client`.

### Feature Acceptance Gate

- Locked command:
  `corepack pnpm run verify-all`
- Reason:
  repo scripts and the Epic 03 test plan identify `verify-all` as the deeper
  feature gate because it adds integration coverage on top of `verify`. The
  `test:e2e` lane is scaffolded and intentionally returns `SKIP:` today, so the
  feature gate still uses `verify-all` and records the expected `SKIP:` output
  as non-blocking current-state behavior.

## Tech Design Shape

- Tech design shape:
  `Config B` inferred from the artifact layout
- Evidence:
  one design index (`tech-design.md`) plus two companion documents
  (`tech-design-client.md`, `tech-design-server.md`)
- Note:
  the docs do not explicitly say `Config A` or `Config B`; this is an
  orchestrator inference from file structure

## Orchestrator Reading Notes

### Current-State Baseline

- Existing current state is still Fastify-owned on the browser edge with Convex
  behind `PlatformStore`; the browser must not bypass Fastify to talk to Convex
  directly.
- The current process work surface already supports bootstrap plus live
  reconciliation and generic lifecycle actions, but it does not yet own
  environment controls, filesystem visibility, or tool-runtime behavior.
- Current repo behavior remains generic across process types. Epic 03 deepens
  the shared process surface rather than introducing process-type-specific
  orchestration.

### Tech Design Index

- Epic 03 is the first environment/runtime slice layered under the existing
  process route and work surface, not a second product surface.
- The highest-risk design area is state separation between process lifecycle and
  environment lifecycle. The implementation must keep those distinct but
  connected.
- The design is explicit that provider and checkpoint dependencies remain
  security-sensitive boundaries and should be treated as real integration seams.

### Tech Design Client Companion

- No new route kind is added. The dedicated process route remains the sole
  browser entry point for environment work.
- `environment` becomes a first-class durable bootstrap entity and a first-class
  live entity.
- Client rendering must use full `process.controls` for stable visible controls
  rather than showing only enabled actions from `availableActions`.

### Tech Design Server Companion

- The server remains one Fastify monolith; the new environment stack nests under
  the existing process routes and services.
- The main new server seam is `services/processes/environment/` with a provider
  registry, orchestrator, planners, checkpoint writer, and execution service.
- Durable environment lifecycle must live in a new high-churn table
  (`processEnvironmentStates`) rather than being folded into the generic
  `processes` row.

### Epic Notes

- The user mental model is one process with a disposable working environment and
  canonical truth outside the working copy.
- Scope includes real hydration, controlled execution, checkpointing, recovery,
  and reopen behavior; it excludes broader GitHub review and source-management
  product workflows.
- Stable visible controls and durable reopen behavior are explicit product
  requirements, not implementation niceties.

### Test Plan Notes

- Confidence chain remains `AC -> TC -> Test File / Test Name -> Implementation
  Module`.
- New Epic 03 test rule: environment lifecycle, checkpoint visibility, and
  control-state semantics must stay coherent across durable bootstrap plus live
  updates.
- The plan covers 57 TC conditions, 36 non-TC decided tests, and 103 total
  planned tests across Convex, server, client, and integration layers.

### Story 0 Notes

- Story 0 is a true foundation story, so verification should focus on contract
  correctness, shared fixtures, shared error vocabulary, and completeness rather
  than end-user flow behavior.
- Story 0's shared vocabulary is the dependency root for Stories 1 through 6,
  so drift here will amplify downstream.

### Story 1 Notes

- Story 1 is the first behavior-heavy story and establishes durable first-load
  environment truth plus stable visible control rendering.
- Recovery states such as `stale`, `lost`, `failed`, `rebuilding`, and
  `unavailable` are first-load visibility cases in Story 1, while Story 5 owns
  the production flows that make them reachable.

## Boundary Inventory

| Boundary | Status | Story | Notes |
|----------|--------|-------|-------|
| Hosted provider adapter (`DaytonaProviderAdapter`) | `stub` | 2 | New external environment boundary; design references Daytona first |
| Local provider adapter (`LocalProviderAdapter`) | `stub` | 2 | Fast-follow provider against the same contract |
| Canonical code checkpoint writer / GitHub write boundary | `stub` | 4 | New external canonical-code persistence boundary |

If any of the above remains `stub` at feature-level verification, treat it as
blocking unless the human explicitly approves that state earlier in the run.

## Cumulative Test Baseline

Initial Epic 03 affected-suite baseline recorded before Story 0:

- Existing tests in already-present affected suites: `74`
- Planned tests across Epic 03 target files from the test plan: `103`
- Newly planned files currently at baseline zero:
  - `convex/processEnvironmentStates.test.ts`
  - `tests/service/server/script-execution.service.test.ts`
  - `tests/service/client/process-controls.test.ts`
  - `tests/service/client/process-environment-panel.test.ts`

Per-file baseline counts:

| File | Existing test count |
|------|---------------------|
| `convex/sourceAttachments.test.ts` | 0 |
| `convex/processEnvironmentStates.test.ts` | 0 |
| `tests/service/server/process-work-surface-api.test.ts` | 10 |
| `tests/service/server/process-actions-api.test.ts` | 14 |
| `tests/service/server/process-live-updates.test.ts` | 3 |
| `tests/service/server/script-execution.service.test.ts` | 0 |
| `tests/service/client/process-work-surface-page.test.ts` | 29 |
| `tests/service/client/process-controls.test.ts` | 0 |
| `tests/service/client/process-environment-panel.test.ts` | 0 |
| `tests/service/client/process-materials-section.test.ts` | 0 |
| `tests/service/client/process-live.test.ts` | 15 |
| `tests/service/client/process-live-status.test.ts` | 2 |
| `tests/integration/process-work-surface.test.ts` | 1 |

Interpretation:

- Story 0 should create the shared contract and fixture baseline and is likely to
  add new tests without materially reducing counts in existing suites.
- Story 1 should expand bootstrap/control coverage substantially because many of
  the Epic 03-targeted client and server environment tests do not exist yet.

## Prompt Map

### Handoff Structure

Every worker and verifier handoff follows:

1. objective framing
2. reading journey
3. execution or verification
4. report contract

### Severity Rubric

```text
CRITICAL - blocks acceptance unless fixed
MAJOR - serious issue that normally should be fixed before acceptance
MINOR - non-blocking, usually cheaper to fix now than track
```

### Prompt 1: Implementer

```xml
<role>
You are the implementer for one story. Your job is to build the smallest
correct implementation that satisfies the story and fits the tech design.
You implement directly. A fresh verifier will review your work later.
</role>

<reading_journey>
Read these artifacts sequentially. After each one, write 1-3 working
observations about what matters for this story.

  1. [TECH_DESIGN_INDEX]
  2. [TECH_DESIGN_COMPANIONS - if provided]
  3. [EPIC - if provided]
  4. [TEST_PLAN]
  5. [STORY]
  6. [IMPLEMENTATION_PROMPT - if provided]
</reading_journey>

<execution>
Follow the confidence chain: AC -> TC -> Test -> Implementation.

Before touching code:
  - list the ACs and TCs you are targeting
  - map the relevant TCs to tests from the test plan
  - identify likely failure modes
  - state your implementation approach

Implementation expectations:
  - implement the story as specified
  - add or update tests that the story and test plan require
  - do not weaken tests to make the build go green
  - do not hard-code visible test inputs
  - follow the tech design's module boundaries and interfaces
  - if the spec seems inconsistent, stop and report it rather than
    coding around it
  - keep seam inspection bounded; if you are still inspecting without
    moving into edits and reportable implementation progress, stop and
    report rather than continuing to wander

Before reporting:
  - self-review against the story's ACs and TCs
  - run the story acceptance gate: [GATE_COMMAND]
  - fix non-controversial issues before you report
</execution>

<report>
Send this message to the orchestrator:

  PLAN: ACs/TCs targeted and implementation approach
  CHANGES: files created or modified
  TESTS: tests added or updated, and why
  GATE_RESULT: exact commands run and pass/fail
  RESIDUAL_RISKS: edge cases not fully closed
  SPEC_DEVIATIONS: any divergence or ambiguity discovered
  OPEN_QUESTIONS: only if genuinely blocking
</report>
```

### Prompt 2: Story Verifier - Codex

```xml
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

  1. [TECH_DESIGN_INDEX]
  2. [TECH_DESIGN_COMPANIONS - if provided]
  3. [EPIC - if provided]
  4. [TEST_PLAN]
  5. [STORY]
  6. [VERIFICATION_BUNDLE]
  7. Story base commit: [STORY_BASE_COMMIT]. Run
     git diff [STORY_BASE_COMMIT] -- **/*.test.* **/*.spec.*
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
  6. Run the story acceptance gate: [GATE_COMMAND]
  7. Converge when you have either a supported blocking issue or enough
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
  Write the full review to [REPORT_PATH] before responding.

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
```

### Prompt 3: Story Verifier - Sonnet

```xml
<role>
You are a compliance verifier. Your job is skeptical AC-by-AC and
TC-by-TC verification that the story was actually implemented as
specified.
</role>

<context_boundary>
You have not seen the implementation discussion. Treat missing context
as unknown.
</context_boundary>

<reading_journey>
Read these artifacts sequentially and note 1-3 observations after each:

  1. [TECH_DESIGN_INDEX]
  2. [TECH_DESIGN_COMPANIONS - if provided]
  3. [EPIC - if provided]
  4. [TEST_PLAN]
  5. [STORY]
  6. [VERIFICATION_BUNDLE]
  7. Story base commit: [STORY_BASE_COMMIT]. Run
     git diff [STORY_BASE_COMMIT] -- **/*.test.* **/*.spec.*
     and inspect what test changes this story actually introduced.
</reading_journey>

<verification_stance>
  - Default status for every requirement is UNVERIFIED.
  - Distinguish OBSERVED, INFERRED, and SPECULATIVE.
  - Never assert a defect without evidence.
  - If evidence is insufficient, mark UNRESOLVED.
  - Treat passing tests as supporting evidence, not proof.
  - You do not edit code. You verify and report.
</verification_stance>

<verification_protocol>
  1. Decompose the story into each AC and TC.
  2. For each item, decide SATISFIED, VIOLATED, or UNRESOLVED with
     evidence.
  3. Check that the required tests exist and actually assert the
     intended behavior.
  4. Categorize test-file changes against the story base commit and
     cross-check them against the verification bundle's claims.
  5. Check mock usage against the test plan.
  6. Identify completeness gaps, weak assertions, or placeholder tests.
  7. Run the story acceptance gate: [GATE_COMMAND]
  8. Converge when the requirement-by-requirement review is complete.
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
  Write the full review to [REPORT_PATH] before responding.

  VERDICT: PASS | REVISE | BLOCK
  AC_TC_COVERAGE: each AC and TC with SATISFIED | VIOLATED | UNRESOLVED
  TEST_DIFF_AUDIT
  TEST_QUALITY_FINDINGS
  MOCK_AUDIT_FINDINGS
  COMPLETENESS_GAPS
  BLOCKING_FINDINGS
  NONBLOCKING_WARNINGS
  UNRESOLVED
  GATE_RESULT

  After your review: what else did you notice but chose not to report?
</output_contract>
```

### Prompt 4: Feature Reviewer - Codex

```xml
<role>
You are reviewing the full implemented feature for correctness,
integration coherence, and architecture alignment across stories.
</role>

<context_boundary>
You did not participate in story-level work. Treat missing context as
unknown.
</context_boundary>

<reading_journey>
Read in order:

  1. [TECH_DESIGN_INDEX]
  2. [TECH_DESIGN_COMPANIONS - if provided]
  3. [EPIC - if provided]
  4. [TEST_PLAN]
  5. [ALL STORY FILES]

Then read the full implementation - all relevant source and test files
for the feature, not just the files that seem obviously central.
</reading_journey>

<verification_stance>
  - Default status is UNVERIFIED.
  - Distinguish OBSERVED, INFERRED, and SPECULATIVE.
  - Never assert a defect without evidence.
  - If evidence is insufficient, mark UNRESOLVED.
  - Passing tests are supporting evidence, not proof.
  - Quote relevant spec or design language before verdicting disputed
    or important items.
</verification_stance>

<verification_protocol>
Focus on what story-level review misses:
  - cross-story integration
  - architecture drift
  - contract inconsistency
  - boundary inventory status
  - correctness gaps that only appear end-to-end
  - coverage blind spots and non-TC test gaps
  - full feature gate result: [FEATURE_GATE_COMMAND]
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
  Write the full review to [REPORT_PATH] before responding.

  VERDICT: PASS | REVISE | BLOCK
  CROSS_STORY_FINDINGS
  ARCHITECTURE_FINDINGS
  BOUNDARY_INVENTORY_STATUS
  COVERAGE_ASSESSMENT
  BLOCKING_FINDINGS
  NONBLOCKING_WARNINGS
  UNRESOLVED
  GATE_RESULT

  After your review: what else did you notice but chose not to report?
</output_contract>
```

### Prompt 5: Feature Reviewer - Sonnet

```xml
<role>
You are reviewing the full implemented feature for spec compliance and
completeness across all stories. Your primary deliverable is a complete
requirements coverage matrix.
</role>

<context_boundary>
You did not participate in story-level work. Treat missing context as
unknown.
</context_boundary>

<reading_journey>
Read in order:

  1. [TECH_DESIGN_INDEX]
  2. [TECH_DESIGN_COMPANIONS - if provided]
  3. [EPIC - if provided]
  4. [TEST_PLAN]
  5. [ALL STORY FILES]

Then read the full implementation - all relevant source and test files
for the feature, not just the files that seem obviously central.
</reading_journey>

<verification_stance>
  - Default every requirement to UNVERIFIED.
  - Distinguish OBSERVED, INFERRED, and SPECULATIVE.
  - Never assert a defect without evidence.
  - If evidence is insufficient, mark UNRESOLVED.
  - Quote requirement language before verdicting important items.
</verification_stance>

<verification_protocol>
  1. Extract every AC and TC from the epic or feature spec. This is
     your checklist.
  2. Map each AC and TC to the story that owns it.
  3. For each requirement, verify the corresponding implementation and
     test evidence. Mark SATISFIED, VIOLATED, or UNRESOLVED with evidence.
  4. Check completeness across stories.
  5. Check test quality and mock usage against the test plan.
  6. Identify anything that fell between stories.
  7. Run the feature acceptance gate: [FEATURE_GATE_COMMAND]
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
  Write the full review to [REPORT_PATH] before responding.

  VERDICT: PASS | REVISE | BLOCK
  AC_TC_MATRIX
  COMPLETENESS_GAPS
  TEST_QUALITY_FINDINGS
  MOCK_AUDIT_FINDINGS
  BLOCKING_FINDINGS
  NONBLOCKING_WARNINGS
  UNRESOLVED
  GATE_RESULT

  After your review: what else did you notice but chose not to report?
</output_contract>
```

## Story 0 Preflight

### Refresh Notes

- Reloaded `ls-codex-impl` before Story 0 dispatch.
- Reread `stories/00-foundation.md` in full.
- Skimmed `stories/01-environment-state-and-visible-controls.md` to keep the
  immediate downstream consumer in view.
- Reread the relevant current-state code seams:
  - `apps/platform/shared/contracts/process-work-surface.ts`
  - `apps/platform/shared/contracts/live-process-updates.ts`
  - `apps/platform/shared/contracts/state.ts`
  - `tests/fixtures/process-surface.ts`
  - `tests/fixtures/live-process.ts`
  - `apps/platform/server/errors/codes.ts`

### Preflight Assessment

- The current shared process-surface contract does not yet include
  `environment`, visible `controls`, `hasEnvironment`, or source `accessMode`.
- The current live-update contract does not yet include an `environment` entity.
- The current process-surface client state does not yet include an
  `environment` slice.
- The repo already has shared fixture directories and helper patterns under
  `tests/fixtures` and `tests/utils`, so Story 0 should extend those patterns
  rather than inventing a new testing style.
- `apps/platform/server/errors/codes.ts` is still carrying Story 0 placeholder
  codes and should become part of the shared Epic 03 error vocabulary.

### Story Base Commit

- Story 0 base commit:
  `e6c08484846aea19d2d6e3483728126fe7da92f2`

### Lane Decision

- Story 0 implementation lane:
  Codex `gpt-5.4` with reasoning `xhigh`
- Why:
  Story 0 is the first story in a new technical seam, it is architecture
  sensitive, and its contract choices fan out into every later Epic 03 story.

### Expected Test Baseline

- Prior affected-suite baseline:
  `74` existing tests across already-present Epic 03-targeted suites
- Story 0 expectation:
  this foundation story should add shared schema/fixture/helper coverage rather
  than broad end-user flow coverage; a healthy increment is about `8-14` tests
  or equivalent new coverage in new test files
- Expected post-Story-0 total:
  about `82-88` affected-suite tests
- Verification concern:
  if the post-story total stays flat, review whether Story 0 added the required
  shared coverage or only changed contracts without durable validation

### Story-Specific Warnings For Implementer

- Keep Story 0 scoped to shared vocabulary, fixtures, helpers, and error
  classes. Do not implement full environment lifecycle behavior owned by later
  stories.
- Extend the existing shared-contract and test-fixture seams instead of adding a
  parallel contract surface or a second fixture style.
- Preserve backward compatibility where Story 1 depends on existing
  process-surface bootstrap and live-update shapes while extending them with the
  new Epic 03 vocabulary.

## Next Action

Story 0 is cleared for dispatch. The next step is to set the log state to
`STORY_ACTIVE`, launch a fresh implementer, then immediately move into the
blocked wait/harvest loop.

## Orchestration Learnings

### Worker-Lane Failures Seen In This Run

- Story 2 exposed a repeated failure mode in the internal Codex worker lane:
  multiple fresh workers remained in inspection or explicit `AWAITING` state
  without crossing into code edits.
- This was not a simple "slow worker" case. We saw:
  - no workspace delta
  - no concrete blocker
  - explicit `AWAITING` replies from micro-workers
  - repeated need to replace workers without meaningful progress
- The external Claude helper lane, when constrained to tiny vertical slices,
  produced real file edits immediately and recovered forward progress.

### What The Current Skill Already Helped With

- The blocked wait/harvest loop and stall rule were useful. They made it clear
  when the orchestrator had stopped doing real state transitions and forced
  explicit recovery actions.
- Logging fix-routing, convergence, and lane replacement decisions prevented the
  run from losing context once Story 1 and Story 2 got messy.
- The "no fire-and-forget" rule is still correct and should remain a hard rule.

### What Was Not Strong Enough

- The skill does not yet force a sufficiently early check for actual
  implementation movement after worker dispatch.
- "Worker is active" is currently too vague. In practice, a worker can be
  "running" while doing nothing useful.
- The skill does not define a hard threshold like:
  - no file edits
  - no blocker
  - no concrete partial output
  after one or two bounded windows -> replace or switch lanes.
- The skill assumes the default Codex worker lane is reliably usable for story
  implementation. In this run, that assumption failed specifically on Story 2.

### Concrete Skill Changes To Add

- Add a **workspace-delta startup check** for implementation workers.
  After dispatch, require one of:
  - file edits in the expected write set
  - a concrete blocker tied to a file/contract
  - a bounded partial output such as a first patch plan tied to named files
  If none appears within the first bounded interval, log `ORCHESTRATOR_STALL`
  and recover immediately.

- Add an **explicit `AWAITING` failure rule**.
  If a worker replies `AWAITING`, treat that as lane failure for implementation
  work, not as neutral status.

- Add a **retry cap for the same worker transport**.
  Example:
  - first stall -> interrupt and redirect
  - second stall with zero file movement -> replace worker
  - third stall across replacements -> switch transport strategy instead of
    spawning another equivalent worker

- Add a **micro-slice rescue mode** section.
  When a story worker stalls, switch from full-story prompts to the smallest
  vertical slice with:
  - explicit file list
  - one concrete behavior change
  - one focused test command
  - no broad exploration allowance

- Add a **transport fallback rule**.
  If the Codex worker lane repeatedly stalls without edits, allow the
  orchestrator to switch to a reliable external helper lane for bounded
  implementation slices while still preserving the same verification contract.

- Add a **log structure rule**.
  Keep the prompt map and static setup material separate from the rolling run
  journal so the newest operational issues are easy to scan at the bottom of
  the log.

### Current Recommendation

- Keep using the orchestration state machine and dual verification model.
- Strengthen the skill around worker-start health, explicit `AWAITING`
  detection, and transport fallback.
- Treat "no edits + no blocker + repeated waiting" as a first-class failure
  pattern, not as ordinary slow progress.

### Handoff Note For Skill-Maintainer Agents

- The purpose of this section is to make the run learnings easy to mine back
  into the orchestration skill itself.
- If a future agent is updating `ls-codex-impl`, prioritize the evidence in:
  - `Story 2 Waiting-State Recovery`
  - `Story 2 Replacement Dispatch`
  - `Story 2 Replacement Lane Failure`
  - this `Orchestration Learnings` section
- The most important improvement target from this run is not verifier quality.
  It is implementation-lane startup detection and recovery when workers remain
  in inspection or explicit `AWAITING` mode without producing file edits.

## Story 2 Handoff Status

### Current Acceptance State

- Story 2 is **not accepted**.
- Story 2 is **not committed**.
- The current Story 2 implementation tree is materially ahead of the first
  Story 2 review bundle and remains uncommitted.

### Terminology Correction

- For this run, the remaining Story 2 issues are best described as
  **unfinished acceptance work**, not generic "blockers", unless they actually
  prevent any further progress.
- Real blockers encountered in this run were:
  - implementation workers that stayed in inspection / `AWAITING`
  - red gate failures from mechanical follow-on changes
- The remaining Story 2 gap is primarily that the story is still **not done** at
  the level required for acceptance.

### Story 2 Chronology

1. Story 2 initial internal Codex workers stalled repeatedly:
   - no workspace delta
   - no concrete blocker
   - repeated `AWAITING`
   - multiple lane replacements without useful edits
2. Orchestration switched to bounded external helper slices.
3. Early successful Story 2 slices established:
   - `start` / `resume` return `environment.state = preparing` in-session
   - client bootstrap/action patch applies returned `environment`
   - source `read_only` / `read_write` visibility in the materials section
   - client page assertions for visible preparation state after `start` /
     `resume`
   - client live/store assertions for preparation progress/failure sequencing
4. Hydration-planning work then landed:
   - `WorkingSetPlan`
   - `getProcessHydrationPlan` / `setProcessHydrationPlan`
   - `hydration-planner.ts`
   - plan persistence from `start` / `resume`
5. Follow-on mechanical fixes were required:
   - store test doubles updated repeatedly as `PlatformStore` expanded
   - formatting drift in new files
   - hydration-plan output coverage initially red until the planner actually
     included `outputIds`
6. Later external slices also introduced a minimal provider-backed/server-driven
   preparation path on the current tree:
   - `apps/platform/server/services/processes/environment/provider-adapter.ts`
   - `apps/platform/server/services/processes/environment/process-environment.service.ts`
   - `apps/platform/server/app.ts` wiring for those services
   Attribution is partially uncertain because some later external slices did not
   reliably emit report artifacts before changing the tree.

### Story 2 Review History

- **Round 1 Codex review:** `REVISE`
  - current outputs absent from hydration path
  - no real server-driven preparation / progress / failure path
  - process presented as `running` before readiness
- **Round 1 Sonnet review:** `REVISE`
  - agreed that planning-only was not enough for AC-2.2
- Additional Story 2 slices landed after those reviews.
- **Round 2 Codex review:** `REVISE`
  - still said provider-backed hydration execution and no-running-before-ready
    were not sufficient on the reviewed tree
- **Round 2 Sonnet review:** `REVISE`
  - same essential conclusion: planning and UI were strong, but AC-2.2 through
    AC-2.4 were not fully satisfied strongly enough for acceptance
- Important note:
  the current working tree has moved forward again after the round-2 review
  artifacts. The latest review artifacts may therefore understate what is now in
  the tree.

### Current Working-Tree State

Observed modified tracked files against Story 2 base commit
`326d8c9cc4ac6455f70bc9a9fe9c5c9ab1b81579`:

- `apps/platform/client/app/bootstrap.ts`
- `apps/platform/client/features/processes/process-materials-section.ts`
- `apps/platform/server/app.ts`
- `apps/platform/server/services/processes/process-resume.service.ts`
- `apps/platform/server/services/processes/process-start.service.ts`
- `apps/platform/server/services/projects/platform-store.ts`
- `apps/platform/shared/contracts/process-work-surface.ts`
- `convex/processEnvironmentStates.ts`
- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`
- `tests/fixtures/live-process.ts`
- `tests/fixtures/process-surface.ts`
- `tests/service/client/process-live.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/server/auth-routes.test.ts`
- `tests/service/server/process-actions-api.test.ts`
- `tests/service/server/process-live-updates.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/processes-api.test.ts`

Observed untracked Story 2-relevant files:

- `apps/platform/server/services/processes/environment/hydration-planner.ts`
- `apps/platform/server/services/processes/environment/process-environment.service.ts`
- `apps/platform/server/services/processes/environment/provider-adapter.ts`
- `tests/service/client/process-materials-section.test.ts`

Observed unrelated / suspicious doc drift that should be triaged before any
Story 2 commit:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/`
- `docs/spec-build/v2/epics/05--source-attachments-and-canonical-source-management/`

The Story 2 server design doc also changed:

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`

That may be legitimate alignment or stray helper drift and should be reviewed
before commit.

### Latest Verified Green Baseline

The current Story 2 tree was observed green on:

- `corepack pnpm run verify`

Latest observed totals on the current tree:

- Convex tests: `9`
- Server tests: `79`
- Client tests: `130`

This means the current tree is internally consistent enough to build and pass
the repository gate, but it has **not** yet been re-reviewed from scratch after
all later Story 2 slices landed.

### What The Current Tree Clearly Delivers

- visible `preparing` environment state in-session after `start` / `resume`
- durable bootstrap reflection of that `preparing` state
- client page assertions for visible preparation state after `start` / `resume`
- source `read_only` vs `read_write` visibility in server bootstrap and client
  materials rendering
- hydration-plan persistence including:
  - artifacts
  - sources
  - outputs
- client live/store tests for:
  - preparation progress
  - preparation failure
  - readiness before running
  - no running after failed preparation
- minimal provider/service files now exist for server-driven hydration work:
  - `provider-adapter.ts`
  - `process-environment.service.ts`
  - `app.ts` wiring

### What Still Needs Fresh Verification

Because later slices landed after the last review artifacts, the next harness
should freshly verify:

1. whether the new `ProcessEnvironmentService` and provider adapter path are
   actually invoked from `start` / `resume` in the current tree
2. whether that path is strong enough to satisfy AC-2.2 through AC-2.4
3. whether the process is still presented as `running` before readiness in any
   user-visible path
4. whether the new provider/service files have direct server test coverage in
   `tests/service/server/process-live-updates.test.ts`
5. whether the doc changes should stay or be reverted before any commit

### Recommended Next Move For Another Harness

- Treat the current tree as the new Story 2 baseline.
- Build a fresh Story 2 verification bundle from the **current** tree, not the
  existing round-2 bundle.
- Re-run fresh dual verification on the current tree before deciding whether
  Story 2 is now acceptable or still needs one more implementation slice.

---

## Run State — Hybrid `ls-team-impl-cc` Pickup

- `state`: `STORY_ACTIVE`
- `phase`: `verification`
- `story`: `stories/02-start-or-resume-with-environment-preparation.md`
- `harness`: hybrid — `ls-team-impl-cc` process discipline with Codex `gpt-5.4 xhigh` in place of Sonnet for implementation and one verifier lane
- `picked_up_at`: `2026-04-15`
- `picked_up_by`: fresh Claude Opus 4.6 orchestrator (this session)

### Why the harness change

Previous `ls-codex-impl` run stalled inside Story 2. Internal Codex worker lane
repeatedly returned `AWAITING` with zero workspace delta. External Claude
helper micro-slices produced the current tree forward through slice 9. The
orchestration learnings are preserved earlier in this log and are now folded
into the hybrid lane policy below.

### Lane Policy (hybrid)

| Role | Model | Dispatch path |
|------|-------|---------------|
| Orchestrator | Claude Opus 4.6 | This session. Does not edit code. Runs gate. |
| Implementer | Codex `gpt-5.4` reasoning `xhigh` | via `codex-subagent` skill inside an Opus Claude Code teammate |
| Verifier A | Codex `gpt-5.4` reasoning `xhigh`, fresh session | same pattern, fresh teammate per verification round |
| Verifier B | Claude Sonnet 4.6 max, fresh session | general-purpose Agent, `model: sonnet` |
| Rescue | on-demand Claude subagents via `Agent` | only when Codex implementer stalls per safeguard below |

### Carried-Forward Safeguards (from Story 2 learnings)

1. **Workspace-delta startup check.** After Codex dispatch, require a first
   meaningful file edit or a concrete blocker tied to a named file/contract
   within one bounded window. No delta + no blocker → harvest status.
2. **Explicit `AWAITING` = lane failure.** Not slow progress.
3. **Retry cap per transport.** First stall → interrupt and redirect. Second
   stall with zero movement → replace worker. Third stall → switch transport
   to a Claude subagent for bounded slices.
4. **Skill reload every story boundary.**
5. **Orchestrator runs the gate** (`corepack pnpm run verify`) before any
   acceptance commit. Never delegated, never trusted from reports alone.

### Current Tree Status (inherited)

- HEAD: `326d8c9` (Story 1 accepted)
- Story 2 base commit: `326d8c9`
- Working tree: Story 2 slices 1-9 landed, uncommitted
- Last gate result: `corepack pnpm run verify` → passed (9 convex / 81 server /
  130 client) per slice 9 report
- Gap from round-2 reviews (server-driven hydration, no-running-before-ready)
  was the target of slices 8-9; not yet re-verified by fresh reviewers

### Immediate Action Queue

1. Build Round 3 verification bundle against the current tree (includes slices
   1-9, including the new `environment/` server services and live-update
   transitions).
2. Dispatch Codex `xhigh` verifier + Sonnet 4.6 max verifier in parallel
   against the current tree.
3. On dual PASS → stage all Story 2 paths + any adjacent non-Story-2 uncommitted
   work the user is happy to fold in (per explicit instruction: don't be picky
   about commit hygiene) and commit `feat: Story 2 — start or resume with
   environment preparation`.
4. On REVISE → route a bounded Codex fix slice, re-verify, then commit.
5. Advance to Story 3 (controlled execution + live environment state) under
   the hybrid TDD cycle (red-phase commit, then green, then dual verify).

### Diagnostic: Teammate-Managed Codex Exec Gets Orphaned (2026-04-15)

**Symptom:** Story 2 Round 3 Codex verifier dispatched twice via a Claude
Code teammate using the `codex-subagent` skill. Both times `codex exec`
started, emitted `thread.started` + `turn.started` + one agent intro
message + 2–3 successful shell reads, then stopped writing to the jsonl
with **no `turn.completed` signal**. `ps` showed no live `codex exec`
subprocess; `lsof` showed no open write fd on the jsonl; the session id
was preserved but zero tokens reported and no error line was ever written
to the jsonl.

**Investigation steps:**
- Confirmed Codex CLI works: direct `codex exec --json "Reply with OK"`
  completed cleanly with `turn.completed` and proper usage stats
- Confirmed codex-cli 0.120.0, `model_reasoning_effort=xhigh` default,
  `model_context_window=1050000` — no resource/config issue
- Confirmed zsh init scripts are tiny (.zprofile 79B, .zshrc 141B,
  .zshenv 373B) — no shell-init hang
- Confirmed no OOM / Jetsam / memorystatus kills in `log show` for the
  last hour
- Confirmed the teammate-dispatched jsonl had no `turn.completed`, no
  `thread.failed`, no stderr file (`codex-subagent` redirects
  `2>/dev/null` by default, swallowing errors)

**Root cause:** The Claude Code teammate spawned `codex exec` as a child
process during its turn. When the teammate reported back to the
orchestrator (e.g., "monitor armed, continuing to work" per my
instruction `do NOT let yourself get blocked waiting synchronously —
poll actively`), the teammate returned control and went idle. Its child
`codex exec` process was orphaned/reaped mid-turn. Codex had done 2–3
shell reads, was in the middle of reasoning, and the process
disappeared before it could emit `turn.completed`.

**Fix:** Dispatch `codex exec` **directly from the orchestrator's own
Bash session** using `run_in_background`. The orchestrator session is
the long-lived root. Its Bash children survive independently until they
exit. The background Bash tool's completion notification is the
reliable signal that `codex exec` finished (clean or not).

Skeleton:

```bash
codex exec --json - < /tmp/codex-prompt.txt \
  > /tmp/codex-run.jsonl \
  2> /tmp/codex-run.err
```

With `run_in_background: true` on the Bash tool. Capture stderr
explicitly — do NOT use the `2>/dev/null` pattern the codex-subagent
skill defaults to.

**Rule going forward:** Do not route long-running external CLI tasks
(Codex exec, any multi-minute external command) through a Claude Code
teammate unless the teammate blocks synchronously on the full lifetime
of the subprocess. The teammate layer is cheap context but an unsafe
lifecycle manager. Prefer direct `run_in_background` dispatch for
codex exec and monitor the jsonl for `turn.completed` or stall.

**Secondary fix:** Always capture stderr from `codex exec`. The skill's
default `2>/dev/null` pattern is unsafe for diagnosis.

## Story 2 Transition Checkpoint

- Story 2 acceptance: accepted
- Story 2 commit: `06eb084`
- Commit message: `feat: Story 2 — Start or Resume with Environment Preparation`
- Cumulative test baseline: 9 convex + 81 server + 130 client = 220 passing
- Baseline movement: 105 (post-Story 1) → 220 (post-Story 2). Large increase
  reflects the Story 2 bootstrap/action/live/client-surface expansion plus
  fix-batch assertion corrections.
- Boundary inventory: `InMemoryProviderAdapter` introduced as the seeded
  provider stub for Story 2. `DaytonaProviderAdapter` and
  `LocalProviderAdapter` remain not-yet-implemented; slated for later stories
  and epic-level verification will require honest disposition. The
  `code-checkpoint-writer.ts` (GitHub write boundary) is a Story 4 concern.

### Round 3 Dual Verification Evidence

- Codex Round 3 verifier: `gpt-5.4 xhigh` via direct-Bash `codex exec`
  dispatch (the proven pattern — see Diagnostic block above)
  - Verdict: PASS
  - Gate: passed
  - Blocking findings: 0
  - Round-2 blockers closed: yes (all 4)
  - Review: `story-verification/02-start-or-resume-with-environment-preparation/codex-review-round-3.md`
- Sonnet Round 3 verifier: `claude-sonnet-4-6` one-shot Agent
  - Initial verdict (pre-fix): BLOCK on 3 gate items (biome + 2 test assertions)
  - Post-fix confirm verdict: PASS
  - Review: `story-verification/.../sonnet-review-round-3.md` (initial) +
    `sonnet-review-round-3-confirm.md` (post-fix)

### Fix Batch 01 Applied

- Fix batch: `story-02-fix-batch-01.md`
- Items: (1) biome autofix on `platform-store.ts`, (2) `S2-TC-2.1b` assertion
  `status: 'running'` → `'paused'` (Story 2 preserves pre-resume status until
  async hydration observes readiness), (3) `TC-2.1c` assertion
  `availableActions: []` → `['review']` (Story 1 control-derivation). All
  three confirmed as corrections, not assertion weakening.

### Orchestration Learnings From This Run

- **Teammate-managed codex exec dies mid-turn.** The `ls-team-impl-cc`
  teammate pattern does not reliably keep `codex exec` alive when the
  teammate returns control to the orchestrator. Use direct Bash
  `run_in_background` dispatch for codex exec.
- **Always capture stderr.** The codex-subagent skill's
  `2>/dev/null` default hides diagnostic output.
- **Avoid over-correction under pressure.** When a verification lane fails
  repeatedly, the impulse to skip verification is as wrong as the impulse
  to keep churning. The correct move is to diagnose the lane failure and
  find a working dispatch pattern — which is what direct Bash
  `run_in_background` provided.

## Next Story

- Next story: `stories/03-controlled-execution-and-live-environment-state.md`
- Approach:
  - Reload hybrid `ls-team-impl-cc` skill shape in context
  - Story 3 red phase: direct `codex exec` for implementer (skeleton + failing
    tests for AC-3.1 through AC-3.4), orchestrator commits the red baseline
  - Story 3 green phase: direct `codex exec` for implementer (green the tests)
  - Dual verify: direct `codex exec` for Codex verifier + one-shot Sonnet
    Agent for Sonnet verifier
  - Use proven dispatch pattern: Bash `run_in_background` with explicit
    stderr capture and `turn.completed` / exit-code monitoring

## Story 3 Preflight

- `state`: `STORY_ACTIVE`
- `phase`: `red`
- Story: `stories/03-controlled-execution-and-live-environment-state.md`
- Story base commit: `06eb084` (Story 2 just accepted)
- Lane: Codex `gpt-5.4` reasoning `xhigh` via direct Bash `codex exec` (proven pattern)

### Preflight Assessment

- Story 3 extends the Story 2 `ProcessEnvironmentService` / provider seam with
  a script-execution step. The environment transitions: preparing → ready →
  running → checkpointing → settled, with `failed` as a recoverable branch at
  any stage.
- Primary new server file: `services/processes/environment/script-execution.service.ts`
- Modified: `process-environment.service.ts` (add an execute step after ready),
  `process-live-normalizer.ts` (emit coherent process-facing execution updates
  rather than raw provider fragments), possibly
  `process-environment-panel.ts` client rendering.
- Client side: `process-live.ts` needs to reconcile `running` and
  `checkpointing` environment states with existing preparing/ready handling.
- Story 3 **must not** implement Story 4 checkpoint writes. `checkpointing`
  state is visible but `lastCheckpointResult` behavior remains Story 4 work.

### Expected Test Baseline

- Prior cumulative: 220 passing (9/81/130)
- Story 3 new coverage (from test plan):
  - `tests/service/server/script-execution.service.test.ts` — new file, ~2 tests
  - `tests/service/server/process-live-updates.test.ts` — ~4 new tests for
    running/checkpointing/failed execution transitions
  - `tests/service/client/process-live.test.ts` — ~3 new tests for execution
    state reducer behavior
  - `tests/service/client/process-environment-panel.test.ts` — rendering
    updates for running/checkpointing labels
  - `tests/service/client/process-controls.test.ts` — running/checkpointing
    state-matrix additions (may already be covered by Story 1 baseline)
- Expected post-Story-3 total: ~232–240

### Story-Specific Warnings For Implementer

- Do NOT implement Story 4 checkpoint writes. `environment.state =
  checkpointing` is visible but no canonical artifact or code persistence
  happens in this story. `lastCheckpointResult` population is out of scope.
- Do NOT implement Story 5 recovery mutations.
- Live execution updates must be process-facing coherent objects, not raw
  provider stream fragments. The existing live normalizer pattern is the
  correct seam.
- Preserve the accepted-action vs later-failure boundary established in
  Story 2.
- The existing `ProviderAdapter` interface already has `executeScript` in
  the tech design — use that seam.

## Story 3 Transition Checkpoint

- Story 3 acceptance: accepted
- Story 3 red-phase commit: `414879a`
- Story 3 acceptance commit: `5dd159f` (`feat: Story 3 — Controlled Execution and Live Environment State`)
- Convergence rounds run: 1
- Cumulative test baseline: 9 convex + 86 server + 138 client = 233 passing
- Baseline movement: 220 (post-Story-2) → 233 (post-Story-3). Matches expected ~10-13 delta; well within pre-story projection.
- Boundary inventory: `ScriptExecutionService` + `ProviderAdapter.executeScript` now provider-backed via `InMemoryProviderAdapter` / `FailingProviderAdapter` stubs (still test-only adapters — hosted/local providers not yet implemented). `code-checkpoint-writer.ts` remains unimplemented (Story 4 work).

### Story 3 Round 1 Dual Verification

- Sonnet Round 1: PASS with 3 nonblocking warnings (W-1 missing isolation tests, W-2 thin server legibility assertion, W-3 untested fallback blockedReason)
- Codex Round 1: REVISE with 1 MAJOR/HIGH blocker — same-session execution-failure publication didn't recompute process.controls, so rehydrate/rebuild stayed disabled until reload; violated AC-3.4 in-session recovery path. Sonnet missed this; Codex caught it. Same pattern as Story 1 Fix Batch 01.

### Story 3 Fix Batch 01

- Spec: `story-03-fix-batch-01.md`
- Item 1 (required): all 3 execution-lane live publications (`running`, `checkpointing`, `failed`) now include an env-aware `process` summary via `buildProcessSurfaceSummary(currentProcess, nextEnvironment)`. Current process read once per execution run via existing `platformStore.getProcessRecord(...)`.
- Item 2 (required): added `TC-3.4b execution failure republishes recovery controls without refetch` — drives paired process+env failure publication on a running surface and asserts rehydrate/rebuild enable without reload.
- Item 3 (preferred): split out two standalone isolation tests (`environment updates do not wipe unrelated history state`, `... materials state`) addressing Sonnet W-1.
- Implementer fix-batch modified only `process-environment.service.ts` and added tests to `process-live.test.ts`. No existing assertions changed.

### Story 3 Round 2 Dual Verification

- Sonnet Round 2: PASS. Codex blocker closed; W-1 closed by Item 3; W-2 and W-3 remain accepted-risk.
- Codex Round 2: PASS. Original blocker closed, 0 blocking, 0 new warnings, test diff additive-only, no regression in Story 1/2/3 assertions.

### Orchestration Learnings (Story 3)

- The hybrid-direct-Bash codex exec dispatch worked cleanly for all three Codex roles in this story (red implementer, green implementer, fix implementer, round-1 verifier, round-2 verifier). Total 5 successful codex exec runs in one story with zero stalls. The diagnosed pattern holds.
- Parallel dispatch (codex exec + one-shot Sonnet Agent) was stable — no cross-lane interference.
- The finding Codex caught and Sonnet missed mirrors the Story 1 Fix Batch pattern: whenever a live publication can change the env-derived control state, the publication must carry a recomputed `process` summary. This is a cross-story invariant worth hoisting into a helper or codifying in contracts later. Logging for future orchestrators.

## Story 4 Preflight

- `state`: `STORY_ACTIVE`
- `phase`: `red`
- Story: `stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md`
- Story base commit: `5dd159f`
- Lane: Codex `gpt-5.4` reasoning `xhigh` via direct Bash `codex exec` (proven pattern)

### Preflight Assessment

- Story 4 introduces the REAL durable checkpoint path. Artifact outputs persist to canonical artifact state; writable-source code persists to canonical code truth (GitHub). `lastCheckpointResult` populated for the first time.
- Primary new server files: `services/processes/environment/checkpoint-planner.ts`, `services/processes/environment/code-checkpoint-writer.ts` (GitHub write boundary)
- Extended: `process-environment.service.ts` (checkpoint step after execution success), `ProviderAdapter.collectCheckpointCandidate(...)`, `platform-store.ts` (checkpoint-result writes)
- `checkpointing` env state already wired in Story 3 — Story 4 populates what happens DURING checkpointing and sets `lastCheckpointResult`.
- Client: `process-environment-panel.ts` renders latest checkpoint result (target, outcome, failureReason).

### Scope Boundaries

- In scope: checkpoint PLANNING (decide artifact vs code target + writable source guard), artifact output persistence, code checkpoint via GitHub writer, `lastCheckpointResult` population, checkpoint failure visibility with retry path.
- Out of scope: Story 5 rehydrate/rebuild (no recovery mutations); Story 6 reopen restoration (TC-4.1b is explicitly deferred to Story 6); ordered checkpoint-history (epic owns only latest-result in this slice); full GitHub review/branching/PR workflows.
- Read-only source guard is critical for AC-4.3 — the planner must refuse code checkpointing for `accessMode = 'read_only'` attachments.

### Expected Test Baseline

- Prior cumulative: 233 passing (9/86/138)
- Story 4 expected additions (from test plan):
  - `convex/processEnvironmentStates.test.ts` — +3-5 tests on lastCheckpointResult persistence + latest-only overwrite
  - `tests/service/server/process-actions-api.test.ts` — +4-6 tests on checkpoint planning guards
  - `tests/service/server/process-live-updates.test.ts` — +2-3 tests on checkpoint-result live visibility
  - `tests/service/client/process-environment-panel.test.ts` — +2-3 tests on checkpoint result rendering
  - Possibly new file for code-checkpoint-writer tests if GitHub boundary gets direct coverage
- Expected post-Story-4: ~243–253

### Story-Specific Warnings For Implementer

- `code-checkpoint-writer.ts` is the GitHub write boundary — implement as a stub/fake that can succeed/fail deterministically for tests. Do NOT make real HTTP calls. `@octokit/rest` is the candidate package per tech-design but actual wiring may be deferred to the real-provider epic.
- Read-only source guard (AC-4.3): planner refuses code-checkpoint target for `accessMode === 'read_only'` attachments. Test this explicitly.
- `lastCheckpointResult` is latest-only — when a new checkpoint settles, it replaces prior visible result. Do NOT introduce an append-only checkpoint history table.
- Checkpoint failure does NOT silently drop work (AC-4.5) — it must surface with a retry/recovery path visible to the user.
- Do NOT implement Story 5 rehydrate/rebuild mutations. Do NOT implement Story 6 reopen restoration; TC-4.1b will be end-to-end exercisable in Story 6.

## Epic 3 Orchestration Debrief

### Codex Dispatch Pattern

**What broke:** The `ls-team-impl-cc` teammate pattern — spawning an Opus
Claude Code teammate who loads `codex-subagent` and manages `codex exec` —
is structurally unsafe for long-running Codex tasks. The teammate's child
process (`codex exec`) gets orphaned/reaped when the teammate returns control
to the orchestrator. Both dispatch attempts died mid-turn with no
`turn.completed` event, no stderr (swallowed by `2>/dev/null`), and no
visible error. Diagnosis took ~45 minutes across 3 failed attempts because
the orchestrator passively waited instead of investigating after the first
failure.

**What works:** Direct `codex exec` via `Bash` with `run_in_background: true`
from the orchestrator's own session. The child process is owned by the
session's shell, survives until natural exit, and the `run_in_background`
completion notification is the reliable signal. Stderr must be captured to a
separate file (`2> /tmp/codex-run.err`) — never use the codex-subagent skill's
default `2>/dev/null` pattern.

**Rule for future orchestration:** Never route long-running external CLI
tasks through a Claude Code teammate. Teammates are cheap context wrappers
but unsafe lifecycle managers. Dispatch codex exec directly and monitor the
jsonl for `turn.completed` or stall.

### Passive Waiting vs Active Investigation

The orchestrator waited 20 minutes on the first stalled Codex dispatch
before investigating, then spent another 10 minutes on a retry before
diagnosing the root cause. The user had to push multiple times before the
orchestrator shifted from waiting to investigating.

**Rule:** After any external dispatch, set a 5-minute investigation
threshold, not a 20-minute passive wait. If 5 minutes pass with no progress
signal, actively investigate: check the process table, read stderr, inspect
the jsonl event stream, run a smoke test. Don't arm a monitor and go idle.

### Smoke Test Before Long Dispatch

A 10-second `codex exec --json "Reply with OK"` smoke test would have
confirmed whether the CLI was alive before committing to a 15-minute
verification run. The orchestrator skipped this on the first dispatch and
wasted ~25 minutes before discovering the CLI worked fine (the dispatch
mechanism was the problem, not the CLI).

**Rule:** Before any Codex dispatch expected to take >5 minutes, run a smoke
test to confirm the CLI is operational.

### Over-Correction Under Pressure

When the user expressed frustration about churning on Codex dispatch
failures, the orchestrator panic-proposed skipping verification entirely.
The user correctly called this out. The swing from one extreme to the other
is an emotional reaction, not a judgment call.

**Rule:** When a lane fails repeatedly, the correct response is to
investigate the root cause and find a working pattern. It is NOT to skip the
verification step, and it is NOT to keep retrying the same broken pattern.
Hold steady; diagnose; adapt.

### Sonnet Systematically Misses What Codex Catches

Across Stories 2-5, Sonnet consistently returned PASS while Codex found
MAJOR blockers:

- **Story 3:** Sonnet PASS, Codex REVISE — same-session execution-failure
  publication didn't recompute `process.controls` (AC-3.4 recovery path).
- **Story 4:** Sonnet PASS (accepted fail-open as risk), Codex REVISE —
  `buildSourceAccessModes` defaulted unknown sources to `read_write` instead
  of fail-closed `read_only` (AC-4.3 violation).
- **Story 5:** Sonnet PASS, Codex REVISE — `rehydrating` not in Convex
  validator + prerequisite check only reachable in test store.

This matches the `ls-team-impl-cc` warning about model-family bias. Cross-
family verification caught 4 legitimate blockers that same-family would have
missed.

**Rule:** Never treat dual Sonnet/Opus PASS as equivalent to Codex + Sonnet
PASS. Cross-family verification is structurally important.

### Fix Batches Are the Norm

Every story from 2-5 required a fix batch after initial verification. This
is the expected outcome of the verify-then-fix cycle, not a sign of poor
implementation. Budget ~30% of story time for the fix-verify loop.

### Codex Red-Phase Test Setup Errors

In Story 4, Codex wrote red-phase tests with contradictory setups (TC-4.1a
waiting for `failed` while asserting success; TC-4.5b using success writer
while asserting failure). Codex caught its own errors during green and
correctly stopped rather than silently patching — good discipline. But the
errors shouldn't have been written in the first place.

**Rule:** Red-phase prompts should include an explicit self-verification
step: "Before reporting, re-read each test and confirm the setup (fixtures,
stubs, waiters) is coherent with the expected assertion."

### Convex AI Guidelines Not Enforced in Implementer Reading Journeys

The CLAUDE.md directive says to always read `convex/_generated/ai/guidelines.md`
first when working on Convex code. The orchestrator's explicit prompts for
Stories 3-6 did NOT include this file in the reading journey. Some Codex runs
picked it up by reading CLAUDE.md independently, but enforcement was
inconsistent. Additionally, `npx convex dev` reported the AI files were out
of date — so even when read, guidelines may have been stale.

**Rule:** When the repo's CLAUDE.md specifies mandatory reading for a
technology, the orchestrator's prompts must explicitly include those files
in the reading journey. Also run `npx convex ai-files update` before any
implementation pass that touches Convex code.

### Convex Module Path Naming Restrictions

`npx convex dev` rejected `convex/test-helpers/fake-convex-context.ts`
because Convex module paths cannot contain hyphens — only alphanumeric
characters, underscores, or periods. The orchestrator initially fixed only
the directory name and missed the filename having hyphens too. Both path
components needed renaming.

**Rule:** When fixing Convex path issues, use `find convex -name "*-*"` to
find every hyphenated path in one pass. Don't fix one component and assume
the rest are fine.

### Verification Gate Does Not Exercise Convex Deployment

`corepack pnpm run verify` does not run `npx convex dev` or `npx convex
codegen`. Schema changes that break Convex deployment (hyphenated paths,
missing validators) are invisible to the gate and only surface when someone
tries to deploy.

**Workaround:** Before accepting an epic that touches Convex schema,
manually run `npx convex dev` at least once to confirm the schema deploys
cleanly.

### Epic-Level Review Finds Production-Path Gaps Story-Level Cannot

Codex's epic-level review surfaced three MAJOR production-path gaps that no
story-level review caught: ConvexPlatformStore hydration-plan persistence
is a stub, stale-detection fingerprint not implemented, and execution
contract can't produce waiting/history/side-work. These are all "in-memory
path works, production path doesn't" gaps — structurally invisible to
story-level review because every story tests against InMemoryPlatformStore.

**Rule:** Epic-level review is not optional. The reviewer's prompt should
explicitly ask: "For every critical AC, trace the implementation path
through the REAL store, not just the test store. Flag any behavior that
works on the test double but is stubbed or absent on the production store."

### Context Window Management

This session processed 7 stories, multiple fix batches, and dual
verification on each. Context compression kicked in at several points. The
impl log, committed code, and verification artifacts served as durable state
that survived compression.

**Rule:** For runs over 4-5 stories, write ALL significant decisions and
learnings to the impl log immediately — not at the end. If it's not in the
log or the code, it doesn't survive context compression.

### What Worked Well

- **Direct Bash codex exec dispatch** — once discovered, worked for ALL
  subsequent runs with zero failures across Stories 3-6.
- **TDD red-phase commit** — committed red baseline gave verifiers a clean
  diff target for test-change classification.
- **Fix batch spec files** — writing fix scope to markdown before dispatch
  kept fixes bounded and gave verifiers clear references.
- **Cross-family verification** — Codex caught 4 blockers Sonnet missed.
- **Pre-verification cleanup batch** — surfaced 3 genuine fixable items
  from the compiled deferred/accepted-risk list.
- **User pushback was diagnostic signal.** Every time the user pushed back,
  it pointed at a real process failure. Treat frustration as a symptom of a
  real problem, not as noise to manage.

---

## 2026-04-16 — Proper Epic-Level Verification (4-Phase) — VERDICT: BLOCK

User correctly called out that the prior story-level "epic verification"
(Codex + Sonnet running story-shape reviews of the epic) was NOT a real
epic-level verification. The actual `ls-team-impl` epic verification has
four phases (parallel reviews → meta-reports → fresh synthesis → fixes),
not a single dual review.

### Phase 1 — Four Parallel Adversarial Reviews

Tree under review: `dd2cb39` (after pre-verification cleanup + nit-fix batch).
Reviewers used full-codebase reads, with Claude reviewers given explicitly
adversarial prompts ("find what's wrong; assume problems exist").

| Reviewer | Verdict | Session/Thread ID | Notes |
|----------|---------|-------------------|-------|
| GPT-5.4 xhigh | **BLOCK** | `019d95f3-f215-7022-827a-a18c66c6e9a1` | Best production-path read |
| GPT-5.3-codex xhigh | **REVISE** | `019d95fe-680e-75f3-8ef9-0019ee1a4352` | First attempt overflowed context; compact retry succeeded |
| Sonnet 4.6 max (adversarial) | **SHIP** | `31ae0b12-6eb6-4931-9481-126a4ed82bb8` | Under-calibrated — over-relied on passing tests |
| Opus 1m max (adversarial) | **REVISE** (Haiku fallback) | n/a | Failed to land Opus despite multiple dispatch patterns; review is from Haiku 4.5 |

### Phase 2 — Meta-Reports

Each reviewer read all 4 reviews and produced a meta-report ranking the
others. Codex `--resume` does not work with `exec` mode (exit code 2),
so Codex meta-reports ran as fresh sessions; Claude meta-reports resumed.
3 of 4 meta-reports landed. Opus/Haiku meta blocked twice on permissions.

### Phase 3 — Synthesis (Fresh GPT-5.4 xhigh)

A fresh GPT-5.4 xhigh agent read all 7 prior reports, independently verified
every claim against source code, and rated the verifiers. Output:
`synthesis-report.md`.

### Final Synthesis Verdict: **BLOCK**

Gate passes (271 tests, exit 0 verified by synthesis agent), but the real
production path materially under-delivers Epic 3 promises:

**Must-fix (8 items):**
1. Default runtime boots with `InMemoryProviderAdapter` — replace with real provider selection
2. `StubCodeCheckpointWriter` is the production default — wire real canonical code persistence
3. `convex/artifacts.ts` discards `artifact.contents` — persist content or durable handle
4. `convex/sourceAttachments.ts` doesn't durably persist `accessMode` — add to schema + projections
5. `InMemoryPlatformStore.hasCanonicalRecoveryMaterials` diverges from Convex implementation
6. Fire-and-forget recovery paths swallow secondary failures with `.catch(() => {})`; hydration post-ready can reject unhandled
7. `workingSetFingerprint` modeled but never written or compared — stale/lost detection missing at runtime
8. Execution doesn't emit process-facing durable writes (current requests, side-work) — only environment flips + coarse `process_event`

**Should-fix (4 items):**
1. Client recomputes `environment.statusLabel` instead of trusting contract value
2. `process.hasEnvironment` can drift from environment truth
3. `convex/sourceAttachments.ts` violates Convex guidelines (`queryGeneric`, `ctx:any`)
4. Tautological foundation test + over-reliance on text-presence client assertions

**Findings the synthesis agent disproved:**
- GPT-5.3-codex's failing-gate claim (verified clean on `dd2cb39`)
- Sonnet's AC-4.1, AC-4.2, TC-2.5a/b satisfaction claims (production path falsifies all three)
- Sonnet's "no tautological tests" claim (one exists at `process-foundation-contracts.test.ts:29`)

### Verifier Calibration Ratings (from synthesis agent)

| Reviewer | Accuracy | Depth | Calibration | Usefulness |
|----------|----------|-------|-------------|------------|
| GPT-5.4 | 9 | 10 | 9 | 10 |
| GPT-5.3 Codex | 7 | 7 | 8 | 7 |
| Opus/Haiku | 8 | 9 | 8 | 8 |
| Sonnet | 4 | 6 | 2 | 4 |

**Insight:** SHIP-to-BLOCK spread came from reviewers answering different
questions. Sonnet asked "are contracts/reducers/tests coherent?" GPT-5.4
asked "does the real default runtime deliver Epic 3's promised behavior?"
Future epic-review prompts must explicitly require:
- Evaluation against ACs + boundary inventory, not just test coverage
- Verification of real default app wiring, not just mocked seams
- Separate analysis of `InMemoryPlatformStore` vs `ConvexPlatformStore`
- Gate re-run with timestamp + commit SHA in the report
- Distinction between "test double" and "stub-as-production-default"

### Files Generated (epic-verification directory)

All paths relative to
`docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/epic-verification/`:

**Phase 1 — Reviews:**
- `gpt54-review.md` (34.6K, BLOCK)
- `gpt53-codex-review.md` (6.9K, REVISE)
- `sonnet-review.md` (50.4K, SHIP)
- `opus-review.md` (46K, REVISE — Haiku fallback)

**Phase 2 — Meta-Reports:**
- `gpt54-meta-report.md` (6.1K)
- `gpt53-codex-meta-report.md` (6.8K)
- `sonnet-meta-report.md` (2.9K)
- (Opus/Haiku meta-report not produced — write blocked twice)

**Phase 3 — Synthesis:**
- `synthesis-report.md` (14.7K — final BLOCK verdict + verified findings table + verifier ratings)

### Orchestration Issues Encountered

1. **Helper CLI model flag inconsistency.** `claude-subagent` helper sometimes
   silently fell back to Haiku 4.5 when dispatching Opus 4.6 / Sonnet 4.6
   despite the `--model` flag. Direct `claude` CLI invocation worked. Need
   to verify model in result JSON before accepting any Claude subagent output.

2. **Opus 1m API ConnectionRefused** on direct CLI dispatch even after
   pattern-matching a verified working invocation. Could not get a real
   Opus review for Phase 1.

3. **Codex `exec --resume` fails with exit code 2.** Phase 2 Codex meta-reports
   had to run as fresh sessions instead of resumed. Sessions captured for
   audit but unusable for resume.

4. **Sonnet write tool permission-blocked twice** during Phase 2. Had to
   extract content from session JSON and write manually.

5. **GPT-5.3-codex context overflow** on first Phase 1 attempt — 1M context
   was insufficient for full epic + tech-design + codebase read. Compact
   prompt (skip spec re-read, point at code) succeeded.

### Status After Phase 3

Epic 3 is **NOT shippable** in current form. The story-level work is
durable-state-coherent; the production-path wiring (real providers, real
checkpoint writer, durable Convex schema for `accessMode` + artifact
contents + `workingSetFingerprint`) is the gap.

**Phase 4 (fixes) has NOT been started.** Awaiting human direction on
disposition of the 8 must-fix items.

---

## Phase 4 Closure — Three-Chunk Fix Execution

Phase 4 executed as three sequential fix-batch chunks. No new stories; no
new ACs. The 14 verified gaps (8 must-fix + 6 should-fix from the synthesis
report) were grouped by coherent dependency ordering and dispatched with
full real implementation (no stubs-as-defaults, no shims). Each chunk
received dedicated Codex `gpt-5.4 xhigh` verification with bounded fix
slices as needed until the verifier returned PASS.

### Pre-Chunk 1 unblock

`3b6b9f2` — chore: drop dead Buffer references blocking convex dev typecheck

Two `Buffer` references (checkpoint-types.ts:6, platform-store.ts:918)
from an earlier speculative slice prevented `npx convex dev` typecheck
from passing. No real producer ever returned Buffer. Trivial two-line
removal by Opus 4.7 subagent.

### Chunk 1 — Convex Durability Foundation

**Items closed:** 4, 5, 6, 9, 11, 13
**Implementer:** Opus 4.7 subagent (one-shot fix-batch dispatch)
**Verifier:** Codex `gpt-5.4 xhigh` direct bash dispatch

Commits:
- `45f38e5` — feat: Convex durability foundation (schema migrations,
  `accessMode` durable field + projection, typed `query` compliance on
  sourceAttachments, artifact content persistence via `contentStorageId`
  and internal action + internal mutation pattern, `workingSetFingerprint`
  read-time comparison + write-time storage, aligned
  `hasCanonicalRecoveryMaterials` semantics between Convex and InMemory
  stores, `processes.hasEnvironment` derivation from env state)
- `dad936e` — fix: verifier findings closure (admin auth wiring on
  ConvexHttpClient for internal action calls, orphan cleanup on
  `ctx.storage.store` failure, `workingSetFingerprint` write on the
  initial `createProcess` env state insert)

Architectural decisions carried through:
- Convex File Storage for artifact contents — `contentStorageId: v.id('_storage')`
- All Convex code in default V8 runtime — no `'use node'` anywhere
- Internal functions for server-only orchestration
- Same-mutation orphan cleanup on artifact delete
- Web Crypto SHA-256 for fingerprint; stable JSON with fixed key order
- No schema migrations — breaking changes landed directly (pre-customer dev)
- FakeConvexContext gained in-memory storage implementation for tests

Final Chunk 1 gate: 34 convex / 112 service / 152 client / 9 integration.
Codex verdict: PASS, all 6 items SATISFIED.

### Chunk 2 — Real Provider Lane + Honest Error Handling

**Items closed:** 1, 2, 7, 8, 12
**Implementer:** Opus 4.7 subagent
**Verifier:** Codex `gpt-5.4 xhigh`

Commits:
- `6d8a1f1` — feat: real provider lane (real `LocalProviderAdapter` with
  working-tree management + child_process execution + real canonical
  hydration; `DaytonaProviderAdapter` typed skeleton throwing
  `NotImplementedError` until Daytona research closes; `ExecutionResult`
  contract extension to the full spec'd 6 fields; fire-and-forget `.catch`
  cleanup with terminal-state transitions; provider default switch to
  `daytona` for shared/remote, `local` only when explicitly dev-selected)
- `ad3fdf6` — fix: 5 Codex verifier findings
  - persisted `providerKind` now authoritative on resume/rehydrate/rebuild
    (was re-resolving from current config on every call)
  - side-effect failure visibility: `applyExecutionResultSideEffects` now
    propagates history/output/side-work persistence failures to visible
    env state (was `console.warn` + continue — the same silent-swallow
    pattern Item 8 was supposed to fix)
  - candidate validation: `LocalProviderAdapter.validateCandidateRefs`
    now checks file existence, not just path containment
  - `ExecutionResult` consumption: `processStatus` 5-value enum handled
    for all states; outputs/sideWork always replaced per spec (was only
    applied when non-empty, breaking replace semantics)
  - fire-and-forget tests for rehydrate/rebuild/runExecution rejection
- `36fd186` — fix: `transitionProcessToFailed` for full `ExecutionResult`
  lifecycle coverage (orchestrator gained `transitionProcessToWaiting`,
  `transitionProcessToCompleted`, `transitionProcessToInterrupted`, but
  missed `transitionProcessToFailed` — when execution returned
  `processStatus: 'failed'` the env flipped failed but process status
  stayed stale; incoherent state)

Final Chunk 2 gate: 34 convex / 152 service / 152 client / 9 integration.
Codex verdict: PASS, all 5 items SATISFIED (Item 7 required 2 fix slices
to close fully; final closure at `36fd186`).

### Chunk 3 — Real Octokit Code Checkpoint Writer + Cleanup

**Items closed:** 3, 10, 14
**Implementer:** Opus 4.7 subagent (Chunk 3 feat); Codex `gpt-5.4 xhigh`
(subsequent fix slices)
**Verifier:** Codex `gpt-5.4 xhigh`

Commits:
- `d423a4d` — feat: real Octokit code checkpoint writer
  (`OctokitCodeCheckpointWriter` using `@octokit/rest 22.0.1`; direct
  write to attached writable `targetRef` per spec — no branch invention;
  server-side fail-closed for `read_only` attachments + unknown source
  IDs; env var `GITHUB_TOKEN` required, fail-loud if missing rather
  than silent mock; 3 real integration tests against
  `liminal-ai/liminal-build` with branch cleanup; client trusts
  `environment.statusLabel` from server contract in the panel;
  tautological foundation test dropped)
- `77087d4` — fix: Item 10 closure in live reducer (apps/platform/client/app/process-live.ts:79-98
  was still recomputing `statusLabel` from state on every live update
  even after the panel was fixed — same Item 10 violation, different
  file); strengthened panel and live tests (fixtures used custom
  statusLabel that happened to equal canonical derived string — tests
  would still pass if recomputation were reintroduced); runtime
  validation added for `CodeCheckpointCandidate.filePath`/`commitMessage`
- `6dcc1c8` — fix: remove `statusLabel` default from
  `environmentSummarySchema` (the Zod default of `'Not prepared'` meant
  a malformed live message with `state: 'ready'` but no `statusLabel`
  would parse successfully and display an absent-state label on a ready
  environment — spec says `statusLabel` is required, non-empty;
  contract violation masked by schema default). Negative tests added for
  missing + empty `statusLabel`.
- `7ea7c30` — fix: remove anti-pattern defaults on `state` and
  `environment` response schemas (Codex flagged `state` as the same
  anti-pattern as `statusLabel`; a sweep also found `environment`
  field defaults on response schemas). Verified these were only
  masking test-fixture sloppiness, not real production bugs —
  server-side response construction was already always including
  `environment` correctly.

Final Chunk 3 gate: 34 convex / 152 service / 152 client / 9 integration
(test count unchanged but test rigor strengthened via removal of
default-masking).

Codex verdict: PASS, all 3 items SATISFIED plus contract hygiene flush.

Residual: 4 required-with-default anti-patterns on other contract
shapes (`environment.lastCheckpointResult`, `process.controls`,
`process.hasEnvironment`, `processSourceReference.accessMode`) flagged
as **non-blocking future cleanup** — they don't affect Epic 3 behavior.

### Phase 4 Closure Summary

| Chunk | Commits | Items Closed | Final Verdict |
|-------|---------|--------------|---------------|
| 1 | `45f38e5`, `dad936e` | 4, 5, 6, 9, 11, 13 | PASS |
| 2 | `6d8a1f1`, `ad3fdf6`, `36fd186` | 1, 2, 7, 8, 12 | PASS |
| 3 | `d423a4d`, `77087d4`, `6dcc1c8`, `7ea7c30` | 3, 10, 14 | PASS |

All 14 gap items closed. Current tree post `7ea7c30`:
- `corepack pnpm run verify`: exit 0
- `corepack pnpm run test:integration`: exit 0
- `tsc --noEmit -p convex/tsconfig.json`: exit 0
- 34 convex / 152 service / 152 client / 9 integration tests

### Orchestration Learnings Carried Forward

1. **Direct Codex bash dispatch is the reliable pattern.** Every
   successful Codex run in Phase 4 used `codex exec --json "prompt" > jsonl`
   via Bash `run_in_background: true`. No `codex-subagent` wrapper;
   no shell `&`; no teammate managed codex instance.

2. **Codex `gpt-5.4 xhigh` is rigorous but finds narrow-scope defects
   on fix-batch re-verification.** Several chunks needed 2-3 bounded
   fix slices before the verifier returned PASS. This is a feature,
   not a failure — the verifier catches the next layer of defects
   exposed by the fix itself (e.g., removing `statusLabel` default
   exposed `state` default; removing one fail-open path exposed a
   similar pattern elsewhere).

3. **Schema defaults on required fields are an anti-pattern** that
   accumulates as fixtures grow. Removal exposes all callers that
   were implicitly relying on the default. When doing this kind of
   cleanup, expect a ripple of test-fixture fixes.

4. **Convex `setAdminAuth` is `@internal` in the public types.** The
   fix-batch used a narrowed type cast. Worth tracking for Convex
   upgrades but not worth sidestepping via alternative patterns
   (the internal-action+internal-mutation pattern is canonical;
   admin auth is the canonical way to call it from a long-lived
   Fastify-side ConvexHttpClient).

5. **Real external integration (Octokit) adds value to the test
   suite.** The 3 integration tests against `liminal-ai/liminal-build`
   prove the path works end-to-end, catch auth shape issues,
   exercise branch cleanup, and give manual-verification-checklist
   confidence. Worth the slight complexity of env-var requirement
   and test isolation.

6. **When an honest stub refuses to boot** (e.g., `GITHUB_TOKEN`
   missing), the test suite runs unit-mocked paths but integration
   tests fail-loud at startup. This is the right shape — the
   alternative (silent mock) hides missing credentials and becomes
   a production surprise.

---

## Phase 5 — Final Epic Verification and Manual Acceptance (PENDING)

After all three chunks closed, the final Epic 3 acceptance work:

1. **Full four-phase epic re-verification** on the post-`7ea7c30` tree:
   - Phase 1: fresh reviews from GPT-5.4 xhigh, GPT-5.3-codex xhigh,
     Sonnet 4.6 max adversarial, Opus 1m max adversarial
   - Phase 2: cross-reviewer meta-reports
   - Phase 3: fresh GPT-5.4 xhigh synthesis with independent code
     verification
   - Required verdict: SHIP
2. **Manual Verification Checklist** (`test-plan.md:501+`) walked
   end-to-end against `npx convex dev` + Fastify/Vite dev server with
   `LocalProviderAdapter` and the real Octokit code checkpoint writer.
3. Convex dev server verified clean on the current tree
   (`3b6b9f2` unblocked typecheck; re-verify post-Chunk-3).

Only after both (1) and (2) pass does Epic 3 close.

