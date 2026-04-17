# Epic 3 Nit-Fix Batch — Verifier A Review (Codex GPT-5.4)

## VERDICT
REVISE

`16/17` items are verified. Items 1-10, 13, 14, 17, 19, 20, and 22 are applied and look correct. Item 11's runtime fix is present, but the added test only verifies reducer handling of a fabricated `materials` message and does not exercise the requested checkpoint-triggered live-publication path.

## PER_ITEM_VERIFICATION
1. Confirmed correct. `rehydrating` is added to the control matrix at `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:166-168` and to the environment-state vocabulary at `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:583-584`; this matches the existing contract/runtime vocabulary.
2. Confirmed correct. Epic wording now uses writable sources / `accessMode: read_write` at `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:22-24` and `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:109`; this aligns with the actual source contract vocabulary.
3. Confirmed correct. Story 0 now uses error-code vocabulary on `AppError` in both the objective and DoD wording at `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/00-foundation.md:18` and `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/00-foundation.md:175`.
4. Confirmed correct. Environment lifecycle `process_event` appends are wired through `appendProcessEvent()` at `apps/platform/server/services/processes/environment/process-environment.service.ts:863-876`, with call sites for preparation start (`...:203-211`), rebuild start (`...:150-161`), execution failure (`...:428-438`, `...:478-488`), and checkpoint settle (`...:634-644`, `...:670-680`, `...:708-718`, `...:767-777`). The durable seam is real in `apps/platform/server/services/projects/platform-store.ts:134-142`, `apps/platform/server/services/projects/platform-store.ts:813-825`, and `convex/processHistoryItems.ts:75-120`.
5. Confirmed correct. No delta was required here: `TC-4.5b` was already present pre-fix, and the post-fix tree still contains the labeled case at `tests/service/server/process-live-updates.test.ts:1170-1248`, driven by `FailingCodeCheckpointWriter` and asserting a failed code checkpoint result.
6. Confirmed correct. `TC-3.4a` was strengthened at `tests/service/server/process-live-updates.test.ts:951-990` to assert `hasEnvironment: true`, recovery controls enabled on the process payload, and failed-environment legibility with a non-empty `blockedReason`. The prior surface-presence check at `...:943` remains.
7. Confirmed correct. Same-session env-aware regressions were added for start at `tests/service/server/process-actions-api.test.ts:316-355` and respond at `tests/service/server/process-actions-api.test.ts:677-724`; both assert the returned process summary is recomputed against the current environment.
8. Confirmed correct. Explicit `review` / `respond` control-matrix coverage was added at `tests/service/client/process-controls.test.ts:135-152`; these assertions inspect real rendered button state, not just fixture data.
9. Confirmed correct. The start -> checkpoint -> lost -> rebuild -> reopen chain is exercised end-to-end at `tests/integration/process-work-surface.test.ts:506-674` using real HTTP calls against `InMemoryPlatformStore`, with durable checkpoint visibility and unique reopened history ids asserted.
10. Confirmed correct. The null-`environmentId` failure edge case is covered at `tests/service/server/process-live-updates.test.ts:570-649`, driving a real failing provider and asserting `state: 'failed'`, `environmentId: null`, and a populated `blockedReason`.
11. Issue found. The runtime fix is present: artifact-checkpoint success now recomputes and publishes `materials` at `apps/platform/server/services/processes/environment/process-environment.service.ts:581-601`, and the live normalizer emits `materials` publications at `apps/platform/server/services/processes/live/process-live-normalizer.ts:91-99`. But the added test at `tests/service/client/process-live.test.ts:723-759` only feeds a fabricated `materials` message into the reducer; it does not drive a successful checkpoint or verify that checkpoint completion actually produces the live `materials` upsert the spec asked for.
13. Confirmed correct. `ConvexPlatformStore` now persists hydration plans via real Convex query/mutation calls at `apps/platform/server/services/projects/platform-store.ts:870-880`, backed by schema and handlers at `convex/processEnvironmentStates.ts:43-58` and `convex/processEnvironmentStates.ts:223-300`. The round-trip test at `convex/processEnvironmentStates.test.ts:266-286` is meaningful.
14. Confirmed correct. `hasCanonicalRecoveryMaterials()` now performs the bounded current-material-ref check at `apps/platform/server/services/projects/platform-store.ts:949-955`, returning true only when current artifacts or current source attachments exist.
17. Confirmed correct. `DEFAULT_ENVIRONMENT_PROVIDER_KIND` is added to server config at `apps/platform/server/config.ts:8-19`, threaded through app construction at `apps/platform/server/app.ts:135-164`, and used in the targeted first-environment upsert paths in `apps/platform/server/services/processes/process-start.service.ts:39-47`, `apps/platform/server/services/processes/process-resume.service.ts:42-50`, and `apps/platform/server/services/processes/environment/process-environment.service.ts:79-86`, `...:142-149`, `...:221-228`, `...:420-427`, `...:757-765`.
19. Confirmed correct. The three non-spec `TC-2.6*` labels were replaced with descriptive names at `tests/service/client/process-work-surface-page.test.ts:1482`, `...:1510`, and `...:1538`; behavior stayed unchanged.
20. Confirmed correct. The requested one-line `setTimeout(..., 0)` durability comment is present at `apps/platform/server/services/processes/environment/process-environment.service.ts:368-370`.
22. Confirmed correct. `environmentCompleteLiveFixture` was added at `tests/fixtures/live-process.ts:200-207`; this closes the missing-fixture gap without changing runtime behavior.

## REGRESSION_CHECK
No weakened assertions found. `git diff --unified=0 68b73c6..dd2cb39 -- tests` shows the only deleted test lines are import adjustments and the three `TC-2.6*` names in `tests/service/client/process-work-surface-page.test.ts`; no pre-existing `expect(...)` assertion was removed or loosened. TC-3.4a was strengthened in place at `tests/service/server/process-live-updates.test.ts:943-990`.

## SCOPE_CHECK
No unintended runtime scope expansion found. `git diff --name-only 68b73c6..dd2cb39` stays within the targeted docs, the environment/history/hydration-plan/provider-kind codepaths, directly related Convex persistence changes, and the matching tests/fixtures. Excluded items 15, 16, and 18 are untouched. The extra edits in `tests/service/server/auth-routes.test.ts` and `tests/service/server/processes-api.test.ts` are bounded compatibility updates for the new `PlatformStore.appendProcessHistoryItem()` seam.

## NEW_TEST_QUALITY
Most of the new coverage is meaningful. Items 6, 7, 8, 9, 10, and 13 add non-tautological assertions over real behavior, and item 5 remains a meaningful pre-existing test. The weak point is item 11: the new client test proves reducer behavior for a `materials` upsert, but it does not prove the checkpoint path actually emits that upsert. A smaller nit is that `tests/integration/process-work-surface.test.ts:670` compares an array's length to the length of its own `.map(...)` result; the adjacent uniqueness check at `...:671` carries the real value.

## BLOCKING_FINDINGS
None.

## NONBLOCKING_WARNINGS
- Item 11 should add a stronger test that drives a real checkpoint/live-publication sequence; the current reducer-only test would not fail if `ProcessEnvironmentService` stopped publishing `materials`.
- Doc vocabulary still has stale wording outside the explicit batch edits: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md:873` still says `recovery error classes`, and `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/00-foundation.md:14` still says `already-attached writable repositories`.
- Residual null-provider persistence remains in absent-row seed paths at `convex/processes.ts:263-276` and `convex/processEnvironmentStates.ts:273-287`. That does not undermine the targeted service fix for item 17, but `providerKind: null` can still exist on rows created before first environment preparation.

## GATE_RESULT
Command: `corepack pnpm run verify 2>&1 | tail -30`

```text
      Tests  13 passed (13)
   Start at  06:54:32
   Duration  174ms (transform 126ms, setup 0ms, import 210ms, tests 20ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  106 passed (106)
   Start at  06:54:33
   Duration  867ms (transform 1.15s, setup 0ms, import 3.19s, tests 1.02s, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  152 passed (152)
   Start at  06:54:34
   Duration  1.17s (transform 1.41s, setup 0ms, import 2.83s, tests 638ms, environment 9.28s)
```
