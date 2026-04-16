VERDICT: REVISE

## AC_TC_COVERAGE

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| AC-4.1 | SATISFIED | OBSERVED: `apps/platform/server/services/projects/platform-store.ts:1348-1449`, `convex/artifacts.ts:58-107`, `tests/service/server/process-live-updates.test.ts:852-929` | Artifact checkpoint persistence is wired through in-memory and Convex store boundaries and publishes a visible latest result. |
| TC-4.1a | SATISFIED | OBSERVED: `convex/artifacts.ts:70-107`, `apps/platform/server/services/processes/environment/process-environment.service.ts:323-352`, `tests/service/server/process-live-updates.test.ts:852-929` | Durable artifact/output/current-ref writes are implemented; live test observes the successful artifact checkpoint result publication. |
| TC-4.1b | SATISFIED | OBSERVED: `convex/processEnvironmentStates.test.ts:203-235`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md:52-57` | Story 4-owned durable-state population is present; full reopen exercise is explicitly deferred to Story 6. |
| AC-4.2 | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-38`, `apps/platform/server/services/processes/environment/process-environment.service.ts:355-421`, `tests/service/server/code-checkpoint-writer.test.ts:8-35` | The positive code-checkpoint path exists, but coverage is more unit-level than the test plan originally described. |
| TC-4.2a | SATISFIED | OBSERVED: `tests/service/server/process-actions-api.test.ts:1118-1147`, `tests/service/server/code-checkpoint-writer.test.ts:8-19`; INFERRED: `apps/platform/server/services/processes/environment/process-environment.service.ts:355-421` | Writable targets are planned and the writer succeeds deterministically; the service then persists the resulting checkpoint summary. |
| TC-4.2b | SATISFIED | OBSERVED: `tests/service/client/process-environment-panel.test.ts:57-68`, `apps/platform/client/features/processes/process-checkpoint-result.ts:22-44` | The process surface shows source identity and target ref for a successful code checkpoint result. |
| AC-4.3 | VIOLATED | OBSERVED: `apps/platform/server/services/processes/environment/checkpoint-planner.ts:17-24`, `tests/service/server/process-actions-api.test.ts:1150-1178`, `apps/platform/server/services/processes/environment/process-environment.service.ts:317-320`, `544-556`, `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md:70-75` | The planner is fail-safe when durable access metadata exists, but the service seeds missing source metadata as `read_write`, which makes the overall checkpoint policy fail-open. |
| TC-4.3a | VIOLATED | OBSERVED/INFERRED: `apps/platform/server/services/processes/environment/process-environment.service.ts:296-320`, `544-556`, `apps/platform/server/services/processes/environment/provider-adapter.ts:50-70`, `tests/service/server/process-live-updates.test.ts:584-595` | A provider candidate whose `sourceAttachmentId` is missing from loaded durable source summaries is treated as writable and can enter code checkpoint planning. |
| AC-4.4 | SATISFIED | OBSERVED: `apps/platform/shared/contracts/process-work-surface.ts:210-244`, `apps/platform/client/features/processes/process-environment-panel.ts:45-61`, `apps/platform/client/features/processes/process-checkpoint-result.ts:22-44` | Latest checkpoint visibility is kept inside the environment payload and rendered clearly on the process surface. |
| TC-4.4a | SATISFIED | OBSERVED: `tests/service/client/process-environment-panel.test.ts:45-55` | Successful artifact checkpoint result renders a visible success badge and target label. |
| TC-4.4b | SATISFIED | OBSERVED: `tests/service/client/process-environment-panel.test.ts:57-68` | Successful code checkpoint result renders source identity and target ref. |
| AC-4.5 | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:366-390`, `425-499`, `tests/service/client/process-environment-panel.test.ts:70-79`, `tests/service/server/process-live-updates.test.ts:932-1010`; INFERRED: `apps/platform/server/services/processes/process-work-surface.service.ts:205-241`, `318-353`, `tests/service/client/process-controls.test.ts:103-124` | Failure results are surfaced durably and live, and the surface control model exposes recovery-oriented controls. |
| TC-4.5a | SATISFIED | OBSERVED: `apps/platform/server/services/processes/environment/process-environment.service.ts:474-499`, `tests/service/client/process-environment-panel.test.ts:70-79` | Artifact checkpoint failures settle a failed latest result with a visible failure reason. |
| TC-4.5b | SATISFIED | OBSERVED: `tests/service/server/process-live-updates.test.ts:932-1010`, `apps/platform/server/services/processes/environment/process-environment.service.ts:366-390` | Failed code checkpoints publish `lastCheckpointResult.failureReason` through live environment state. |

## TDD_INTEGRITY

`TEST_FILES_MODIFIED_SINCE_RED_COMMIT = 1`

`git diff --name-only 20ee27f -- '**/*.test.*' '**/*.spec.*'` returned only `tests/service/server/process-live-updates.test.ts`.

| Hunk | Classification | Evidence |
|---|---|---|
| Import addition for `FailingCodeCheckpointWriter` | Allowed semantic support for the TC-4.5b red-phase writer correction | `git diff 20ee27f -- '**/*.test.*' '**/*.spec.*'` import hunk at file top |
| Import move for `readyEnvironmentFixture` | Formatter-only normalization | Same diff, top-of-file import reorder |
| Waiter change `failed -> ready` | Allowed TC-4.1a waiter correction | `tests/service/server/process-live-updates.test.ts` diff hunk near current `900-907`; green report `.../green-phase-report.md:79-87` |
| Writer swap `StubCodeCheckpointWriter -> FailingCodeCheckpointWriter(...)` | Allowed TC-4.5b red-phase writer correction | `tests/service/server/process-live-updates.test.ts` diff hunk near current `948-950`; green report `.../green-phase-report.md:79-87` |

Assessment: no extra semantic test weakening observed beyond the two explicitly allowed corrections plus incidental import normalization.

Non-TC decided tests versus plan:

- Present and observed:
  - `convex/processEnvironmentStates.test.ts:120-200` covers checkpoint persistence and latest-only overwrite semantics.
  - `tests/service/server/process-actions-api.test.ts:1181-1225` keeps artifact candidates eligible when read-only code candidates are skipped.
  - `tests/service/server/code-checkpoint-writer.test.ts:8-35` covers deterministic stub success/failure outcomes.
  - `tests/service/client/process-materials-section.test.ts:32-43` keeps mixed access-mode labels distinct.
- Partial relative to the written plan:
  - The plan promises a client `TC-4.3a` materials-section assertion and additional bootstrap/environment-panel non-TC checks (`test-plan.md:249-255`, `257-269`, `354-363`), but those specific checks are not evident in the named current Story 4 test files.

## ARCHITECTURE_FINDINGS

- OBSERVED: `CheckpointPlanner` itself enforces `read_write` gating and preserves artifact candidates independently of skipped read-only code candidates (`apps/platform/server/services/processes/environment/checkpoint-planner.ts:16-38`).
- OBSERVED: `CodeCheckpointWriter` is still a deterministic stub/failing fake with no HTTP client or GitHub SDK usage (`apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:1-39`; `apps/platform/server/app.ts:132-143`).
- OBSERVED: environment upserts recompute the published process summary through `buildProcessSurfaceSummary(...)`, preserving the Story 3 cross-story invariant (`apps/platform/server/services/processes/environment/process-environment.service.ts:503-520`; `apps/platform/server/services/processes/process-work-surface.service.ts:318-353`).
- OBSERVED: durable environment checkpoint fields are retained across upserts in both the in-memory and Convex-backed store paths (`apps/platform/server/services/projects/platform-store.ts:1249-1277`; `convex/processEnvironmentStates.ts:129-196`).

## SCOPE_BOUNDARY_CHECK

- OBSERVED: no real HTTP or canonical GitHub integration was introduced. `rg -n "@octokit|octokit" .` returned docs-only references, and the shipped writer remains stubbed (`apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:1-39`; `apps/platform/server/app.ts:132-143`).
- OBSERVED: no Story 5 `rehydrate`/`rebuild` server mutations or browser API actions were added. The process routes exposed here are still bootstrap, `start`, `responses`, `resume`, and websocket only (`apps/platform/server/routes/processes.ts:48-55`, `294-419`).
- OBSERVED: latest-result-only scope is preserved; checkpoint visibility remains on `environment.lastCheckpointResult` and no ordered checkpoint-history entity was added (`stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md:115-124`; `apps/platform/shared/contracts/process-work-surface.ts:210-244`).
- OBSERVED: the green delta remains limited to checkpoint/store/panel/test files. `git diff --name-only 20ee27f` returned: `apps/platform/client/features/processes/process-checkpoint-result.ts`, `apps/platform/server/app.ts`, `apps/platform/server/services/processes/environment/checkpoint-planner.ts`, `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts`, `apps/platform/server/services/processes/environment/process-environment.service.ts`, `apps/platform/server/services/projects/platform-store.ts`, `convex/artifacts.ts`, `convex/processEnvironmentStates.ts`, `tests/service/server/process-live-updates.test.ts`.

## MISSING_SOURCE_METADATA_FALLBACK_ASSESSMENT

Verdict: `flag-as-blocker`.

This fallback is fail-open, not fail-safe. The planner defaults unknown access to `read_only` (`checkpoint-planner.ts:17-24`), but `ProcessEnvironmentService` pre-populates missing `sourceAttachmentId` entries as `read_write` in `buildSourceAccessModes()` (`process-environment.service.ts:544-556`). That weakens both the story requirement that only already-attached writable sources are eligible (`stories/.../04-...md:59-75`) and the server design constraint that only already-attached writable sources may enter code checkpointing (`tech-design-server.md:894-898`).

Disproof attempt: when durable source summaries are present and marked `read_only`, the planner excludes them correctly (`tests/service/server/process-actions-api.test.ts:1150-1178`). The service also widens from current refs to all project source attachments when current refs are empty (`process-environment.service.ts:293-305`), which helps if the durable summary is merely omitted from current refs. The defect remains when the provider candidate references an id missing from those loaded summaries. That branch is reachable today because the default in-memory provider always emits a synthetic code diff (`provider-adapter.ts:50-70`), while the live-update checkpoint tests seed a store with no source attachments at all (`tests/service/server/process-live-updates.test.ts:584-595`).

## BLOCKING_FINDINGS

- finding: Missing durable source metadata is treated as `read_write`, allowing unknown or read-only sources to enter code checkpoint planning and potentially settle a visible `code`/`mixed` checkpoint result.
  severity: MAJOR
  confidence: HIGH
  evidence: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/stories/04-durable-checkpoint-of-artifacts-and-writable-sources.md:59-75`; `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md:894-898`; `apps/platform/server/services/processes/environment/process-environment.service.ts:296-320`; `apps/platform/server/services/processes/environment/process-environment.service.ts:544-556`; `apps/platform/server/services/processes/environment/provider-adapter.ts:50-70`; `tests/service/server/process-live-updates.test.ts:584-595`
  disproof_attempt: `CheckpointPlanner.planFor()` blocks `read_only` targets correctly when access metadata exists (`apps/platform/server/services/processes/environment/checkpoint-planner.ts:17-24`; `tests/service/server/process-actions-api.test.ts:1150-1178`). The failure mode only appears when the candidate id is absent from the loaded durable source summaries.
  impact: The server-side policy is no longer authoritative. In the current Story 4 slice this can misreport a code or mixed checkpoint for a target that was not proven attached and writable; once real canonical writes land, the same behavior would risk persisting to the wrong source boundary.
  validation_step: Make missing source metadata fail closed, add a regression test where `collectCheckpointCandidate()` references a source absent from durable summaries, and rerun `corepack pnpm run verify`.

## NONBLOCKING_WARNINGS

- finding: Story 4 test-plan coverage is partial relative to the documented plan, especially for client-side `TC-4.3a` presentation and some checkpoint/bootstrap non-TC contract checks.
  severity: MINOR
  confidence: MEDIUM
  evidence: `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:249-255`; `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:257-269`; `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md:354-363`; `tests/service/client/process-environment-panel.test.ts:18-81`; `tests/service/client/process-materials-section.test.ts:9-44`
  disproof_attempt: Equivalent assertions may exist elsewhere under different wording, and core behavior is still covered by planner, live-update, writer, and panel tests.
  impact: Regression protection is weaker than the written plan for misleading read-only presentation and bootstrap/latest-result contract details.
  validation_step: Add the missing planned checks or update the plan/report to match the reduced test scope explicitly.

## UNRESOLVED

- No green test in the current set explicitly drives the missing-source-metadata branch; the blocker is derived from the reachable code path plus the default provider/store setup.
- TC-4.1b end-to-end reopen visibility remains intentionally deferred to Story 6; this review verified only Story 4’s durable-state portion.

## GATE_RESULT

Command: `corepack pnpm run verify 2>&1 | tail -30`

Result: `passed`

```text
      Tests  12 passed (12)
   Start at  21:36:28
   Duration  173ms (transform 126ms, setup 0ms, import 209ms, tests 19ms, environment 0ms)


> liminal-build@ test:service /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/server --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  12 passed (12)
      Tests  93 passed (93)
   Start at  21:36:29
   Duration  786ms (transform 1.11s, setup 0ms, import 3.19s, tests 956ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  141 passed (141)
   Start at  21:36:30
   Duration  1.25s (transform 1.53s, setup 0ms, import 3.02s, tests 725ms, environment 9.87s)
```

## WHAT_ELSE

- Fail closed on unknown `sourceAttachmentId` values before code checkpointing and add a dedicated regression test for that branch.
- Add the planned client/bootstrap assertions for Story 4 so checkpoint visibility and read-only presentation are protected at the surface boundary, not only in planner-level tests.
- If same-session artifact visibility matters for UX, consider publishing a materials upsert after `persistCheckpointArtifacts(...)` in a follow-on story.
