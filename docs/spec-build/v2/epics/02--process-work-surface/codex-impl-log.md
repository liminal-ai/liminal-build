# Codex Implementation Log: Epic 2 Process Work Surface

## Run State

- `state`: `STORY_ACTIVE`
- `phase`: `acceptance`
- `updatedAtUtc`: `2026-04-15T04:04:45Z`
- `orchestrator`: `gpt-5.4 xhigh`
- `implementation default lane`: `Codex gpt-5.4 high`
- `implementation escalation lane`: `Codex gpt-5.4 xhigh`
- `story verification lanes`: `Codex gpt-5.4 xhigh` + `Claude Sonnet 4.6 max`
- `feature verification lanes`: `Codex gpt-5.4 xhigh` + `Claude Sonnet 4.6 max`
- `cursor fast-lane preference`: `disabled by default unless the human explicitly enables it`
- `working repo`: `/Users/leemoore/code/liminal-build`
- `spec pack root`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface`
- `initial HEAD`: `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`

## Startup Orientation

This run keeps one Codex orchestrator across the full epic.
Stories are implemented one at a time.
Every story gets a fresh implementer and fresh dual verification.
Default implementation lane is Codex `gpt-5.4 high`.
Larger or riskier stories upgrade to Codex `gpt-5.4 xhigh`.
Default story verification is fresh Codex `gpt-5.4 xhigh` plus fresh Sonnet max.
Cursor fast-lane exists on this machine, but it is not enabled for this run by default.

## Artifact Paths

- `epic`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/epic.md`
- `tech design index`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design.md`
- `tech design client companion`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-client.md`
- `tech design server companion`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-server.md`
- `test plan`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/test-plan.md`
- `story directory`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories`
- `story coverage`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/coverage.md`
- `codex impl log`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/codex-impl-log.md`

## Tech Design Structure

- `config`: `Config B`
- `reason`: The pack uses the expected index + companion structure:
  - `tech-design.md`
  - `tech-design-client.md`
  - `tech-design-server.md`
  - `test-plan.md`

## Lane Availability

### Codex Worker Lane

- `status`: `available`
- `notes`: Native Codex worker/subagent lane is available in this environment.

### Sonnet Verifier Lane

- `status`: `available`
- `command resolution`:
  - `PATH lookup`: not found
  - `fallback path`: `/Users/leemoore/.claude/skills/claude-subagent/scripts/claude-result`
- `smoke check command`:
  - `"/Users/leemoore/.claude/skills/claude-subagent/scripts/claude-result" --json --cwd /Users/leemoore/code/liminal-build exec "Reply with the single word OK." --model claude-sonnet-4-6 --effort low`
- `smoke check result`: success
- `smoke check response`: `OK`
- `smoke check session_id`: `48eef3df-452c-43df-a648-1e42039a1b95`
- `smoke check duration_ms`: `1922`

### Cursor Fast Lane

- `status`: `available but disabled for this run`
- `command resolution`:
  - `PATH lookup`: not found
  - `fallback path`: `/Users/leemoore/.claude/skills/cursor-subagent/scripts/cursor-result`
- `notes`: The helper exists, but the run is currently configured to stay on Codex implementation unless the human explicitly enables Cursor fast-lane.

## Project Policy Intake

### AGENTS.md

- Project uses Convex.
- Convex work must read `convex/_generated/ai/guidelines.md` first.

### Convex AI Guidelines

- Use typed Convex functions and typed contexts.
- Always include validators.
- Do not use `filter` in queries.
- Use bounded reads instead of unbounded `.collect()`.
- Separate high-churn operational data from stable shared records.
- Index names must include all indexed fields.

### README / Repo Baseline

- Repo still describes itself as Story 0 scaffold at top level.
- Required local versions:
  - `Node 24.14.x`
  - `pnpm 10.x`

## Verification Gates

### Current Repo Gate Reality

From the live `package.json` and `vitest.workspace.ts`:

- `red-verify`:
  - `corepack pnpm run format:check && corepack pnpm run lint && corepack pnpm run typecheck && corepack pnpm run build`
- `test:service`:
  - `corepack pnpm exec vitest run tests/service/server --environment node`
- `test:client`:
  - `corepack pnpm exec vitest run tests/service/client --environment jsdom`
- `verify`:
  - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
- `test:integration`:
  - `corepack pnpm exec vitest run tests/integration --environment node`
- `test:e2e`:
  - `node -e "console.log('SKIP: test:e2e scaffolded in Story 0; no executable suite yet')"`
- `verify-all`:
  - `corepack pnpm run verify && corepack pnpm run test:integration && corepack pnpm run test:e2e`

### Design / Test Plan Gate Target

The Epic 2 tech design and test plan expect the repo to grow to:

- `test:convex`:
  - `corepack pnpm exec vitest run --project convex`
- `verify`:
  - `corepack pnpm run red-verify && corepack pnpm run test:convex && corepack pnpm run test:service && corepack pnpm run test:client`
- `green-verify`:
  - `corepack pnpm run verify && corepack pnpm run guard:no-test-changes`
- `verify-all`:
  - `corepack pnpm run verify && corepack pnpm run test:integration && corepack pnpm run test:e2e`

### Locked Gate Policy For This Run

- `story acceptance gate (initial, repo-current)`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
- `feature acceptance gate (initial, repo-current)`: `corepack pnpm run verify && corepack pnpm run test:integration && corepack pnpm run test:e2e`
- `design drift note`: Epic 2 expects a `convex` Vitest workspace and `test:convex` to be added early. Once Story 0 lands that lane, the story and feature gates should be promoted to include `test:convex` so acceptance matches the design target.

## Story Sequence And Dependency Notes

### Story Order

1. `00-foundation`
2. `01-process-entry-and-bootstrap`
3. `02-start-and-resume`
4. `03-conversation-and-current-request`
5. `04-materials-and-outputs`
6. `05-side-work-visibility`
7. `06-live-reconciliation-and-degradation`

### Dependency Shape

- Story 0 establishes shared route, contract, fixtures, and live-update vocabulary.
- Story 1 depends on Story 0 and Epic 1 shell/access seams.
- Story 2 depends on Story 1.
- Story 3 depends on Story 2.
- Story 4 depends on Story 3 in the published story pack, even though the design chunks are conceptually separable.
- Story 5 depends on Stories 3 and 4.
- Story 6 depends on Story 5.

## Boundary Inventory

| Boundary | Status | Story |
|----------|--------|-------|
| WorkOS/session-auth shell boundary | integrated | inherited / Story 1 |
| Project/process access enforcement | integrated | inherited / Story 1 |
| Dedicated process HTML route | stub | Story 1 |
| Durable process-surface bootstrap API | stub | Story 1 |
| Process module registry | stub | Story 1-3 |
| Convex visible history table + request projection | stub | Story 1 / Story 3 |
| Start/resume process actions | stub | Story 2 |
| Response submission path | stub | Story 3 |
| Materials/output projection | stub | Story 4 |
| Side-work summary surface | stub | Story 5 |
| Fastify websocket live transport | stub | Story 6 |
| Client reconnect and degradation handling | stub | Story 6 |

## Artifact Reading Journey

### Tech Design Index

Read: complete.

Working observations:

- Epic 2 is the shared process work surface, not the execution substrate.
- The design is explicitly process-first and keeps process-specific semantics in modules rather than flattening them into a generic blob.
- The highest-risk seam is state coherence across durable bootstrap, live current-object updates, and future archive compatibility.

### Tech Design Client Companion

Read: complete.

Working observations:

- The client stays inside the existing vanilla TypeScript shell and adds a dedicated process route plus a separate `processSurface` store slice.
- Durable bootstrap state and live transport state are intentionally separate.
- `currentRequest` is a first-class live entity and must not be re-derived from chronological history on every update.

### Tech Design Server Companion

Read: complete.

Working observations:

- The server remains a single Fastify control plane with new process routes, readers, builders, and live-hub seams.
- Convex modeling adds `processHistoryItems`, `processSideWorkItems`, `processOutputs`, and a `currentRequestHistoryItemId` pointer on `processes`.
- Convex query discipline is explicit: typed functions, validators, indexes, bounded reads, no `filter`, no unbounded `.collect()`.

### Epic

Read: complete.

Working observations:

- The feature is meant to feel like a real process workspace, not generic chat.
- Same-session coherence, durable return-later behavior, and graceful degradation are first-class requirements.
- The story breakdown aligns cleanly to the design chunking and supports story-by-story orchestration.

### Test Plan

Read: complete.

Working observations:

- Planned total is `92` tests: `61` TC-mapped and `31` non-TC decided tests.
- The design target includes a dedicated `convex` Vitest project and `test:convex` lane.
- Manual verification matters heavily for coherence, reconnect behavior, and live-state trust.

### Story Skim

Read: all story files skimmed.

Working observations:

- The published story pack matches the coverage matrix cleanly.
- Story 0 is pure infrastructure and does not own end-user ACs.
- Story 1 is the first behavior slice and owns both entry/bootstrap and unavailable handling.

### First Story Full Read

`00-foundation.md` read in full.

Working observations:

- Story 0 is foundational only and should avoid introducing user-visible behavior beyond shared vocabulary and helpers.
- Shared contract centralization is a major anti-drift mechanism for the later stories.
- This story is a good candidate for stricter implementation discipline because it sets every downstream seam.

### Second Story Full Read

`01-process-entry-and-bootstrap.md` read in full.

Working observations:

- Story 1 is the first true vertical slice: route entry, durable bootstrap, identity/orientation, and safe unavailable handling.
- Section-envelope stability across `ready`, `empty`, and `error` states is part of the contract, not just an implementation detail.
- `currentRequest` projection is already present at bootstrap time, so Story 1 is not just route wiring.

## Story-Specific Enrichment Discovery

- `implementation prompt files near stories`: none discovered so far
- `coverage artifact present`: yes

## Cumulative Test Baseline

Planned cumulative additions from the Epic 2 test plan:

- Story 0: `0`
- Story 1: `17`
- Story 2: `27`
- Story 3: `47`
- Story 4: `57`
- Story 5: `67`
- Story 6: `92`

Plain-language baseline note:

- The repo currently has pre-existing scaffold tests, but the Epic 2 planned delta is approximately `92` added tests by the end of Story 6.
- Story 1 should land at about `17` Epic 2 tests cumulative.
- Any later story that materially undershoots its expected cumulative total without explanation should be treated as a verification concern.

## Patterns To Carry Forward

- Keep the process surface generic, but keep semantics process-owned.
- Preserve the distinction between chronological history and the pinned unresolved request.
- Preserve the distinction between side-work current summary state and side-work historical moments.
- Treat materials and side-work envelopes as replaceable current-state payloads, not append-only fragments.
- Treat typed current-object live updates as architecture, not convenience.

## Current Diagnosis

The prior stop was a process mistake, not an artifact problem.
The spec pack is orchestration-ready.
The main open setup tension is gate policy:

- the live repo gate is still Story-0-era and lacks `test:convex`
- the design/test plan expect `test:convex` and a `convex` Vitest workspace

The practical implication is:

- Story 0 likely needs to establish the missing Convex test lane early
- until then, current repo gates must be recorded honestly as the baseline

## Setup Completion Note

Initial setup is complete enough to begin story orchestration.
The next dispatch target is `00-foundation.md`.

## Story 0 Preflight

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/00-foundation.md`
- `next story skimmed`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/01-process-entry-and-bootstrap.md`
- `story kind`: `foundation`
- `story base commit`: `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`
- `lane choice`: `Codex gpt-5.4 xhigh`
- `lane rationale`: Story 0 is foundational, architecture-shaping, and sets the shared contracts, fixtures, route vocabulary, and test seams consumed by every later story.
- `story gate override`: `corepack pnpm run typecheck && corepack pnpm run build`
- `expected Epic 2 cumulative test baseline after Story 0`: `about 0 added tests`
- `story-specific warning`: The design expects a future `convex` Vitest lane, but Story 0 should not pretend that lane already exists unless it actually wires it in.

## Story 0 Verification Artifacts

- `verification bundle`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/verification-bundle.md`
- `codex review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/codex-review.md`
- `sonnet review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/sonnet-review.md`
- `sonnet structured result`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/sonnet-review.json`

## Story 0 Verification Summary

- `codex verdict`: `REVISE`
- `sonnet verdict`: `REVISE`
- `overlap`: both reviewers flagged the touched `convex/processes.ts` module as still violating the Epic 2 / Convex-guideline normalization requirement
- `validated unique finding`: Codex flagged a real-looking cross-process `process` live-upsert hole in the Story 0 live foundation
- `nonblocking`: live-unavailable fixture semantics are potentially misleading; Story 1 route bootstrap still falls through to shell loading by design/stub status
- `sonnet lane note`: review content completed successfully in helper output, but the helper's direct write step was denied; the orchestrator materialized `sonnet-review.md` from the captured result for durability

## Story 0 Fix Routing

- `fix list`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/fix-list-round-1.md`
- `disposition`: `fixed` targeted for:
  - Convex normalization in `convex/processes.ts` and duplicate index cleanup
  - cross-process live-update foundation hole
- `disposition`: `fix-if-cheap` targeted for:
  - live-unavailable fixture naming/clarity

## Story 0 Verification Round 2 Artifacts

- `verification bundle`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/verification-bundle-round-2.md`
- `codex review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/codex-review-round-2.md`
- `sonnet review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/sonnet-review-round-2.md`
- `sonnet structured result`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/sonnet-review-round-2.json`

## Story 0 Pre-Acceptance Receipt

1. `implementation lane used`: `Codex gpt-5.4 xhigh`
2. `changed files summary`:
   - shared process-surface contracts and live schemas added
   - client route/store/process-live foundations added or extended
   - server websocket/process route/service scaffolds added
   - Convex Epic 2 table skeletons added
   - touched `convex/processes.ts` normalized after fix routing
   - fixtures and one targeted client regression test added
3. `story base commit`: `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`
4. `test diff summary against story base commit`:
   - one new executable test file: `tests/service/client/process-live.test.ts`
   - two tests added:
     - schema rejects mismatched top-level `processId` vs payload `processId`
     - reducer ignores a `process` live message for another process surface
5. `codex verification summary`:
   - round 1: `REVISE`
   - round 2: `PASS`
   - final blocking issues: none
6. `sonnet verification summary`:
   - round 1: `REVISE`
   - round 2: `PASS`
   - direct helper file-write remained flaky, but full review content was captured in JSON and materialized into markdown
7. `convergence rounds run`: `0`
8. `fixes applied`:
   - normalized touched `convex/processes.ts`
   - removed the duplicate round-1 compound index situation from `convex/schema.ts`
   - closed the cross-process live `process` upsert hole in schema, fixtures, reducer, and regression test
   - clarified live-unavailable fixture semantics
9. `exact story gate commands and results`:
   - `corepack pnpm run typecheck` -> `PASS`
   - `corepack pnpm run build` -> `PASS`
   - `corepack pnpm exec vitest run tests/service/client/process-live.test.ts --environment jsdom` -> `PASS` (extra confidence check)
10. `open risks`:
   - `none blocking`
   - Story 1 still needs a dedicated process-route bootstrap branch in `bootstrap.ts`
   - websocket plugin remains scaffold-only until later stories add the actual transport registration

## Story 0 Transition Checkpoint

- Story 0 is accepted.
- The cumulative Epic 2 test baseline is now `1` executable test above base because a targeted regression test was added during fix routing. This is above the original chunk plan of `0`, but it is additive quality, not regression.
- Boundary inventory did not worsen. The key foundations moved from absent to scaffolded:
  - process route vocabulary: scaffolded
  - process-surface contract vocabulary: scaffolded
  - live foundation: scaffolded with one regression test
  - Convex Epic 2 tables: scaffolded
- Next story target: `01-process-entry-and-bootstrap.md`

## Story 0 Commit

- `commit`: `f97509a75b051a4434cedf6e74f9e85ea333a5a0`
- `message`: `feat: Story 0 - Foundation`

## Story 1 Preflight

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/01-process-entry-and-bootstrap.md`
- `next story skimmed`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/02-start-and-resume.md`
- `story kind`: `standard`
- `story base commit`: `f97509a75b051a4434cedf6e74f9e85ea333a5a0`
- `lane choice`: `Codex gpt-5.4 xhigh`
- `lane rationale`: Story 1 is the first behavior-heavy vertical slice, introduces the dedicated route/bootstrap seam end to end, and touches both client and server boundaries plus unavailable handling.
- `story gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
- `expected Epic 2 cumulative test baseline after Story 1`: `about 18 executable tests total in this run`  
  Story 0 ended at `1` added executable test. Story 1 should add about `17` more.
- `story-specific warnings`:
  - do not leave `process-work-surface` routes falling through to `getProjectShell()` without a dedicated bootstrap path
  - keep section-envelope shapes stable across `ready`, `empty`, and `error`
  - handle unavailable route/access cases without leaking process content

## Story 1 Stall Note

- `issue type`: worker stall / dispatch reliability
- `phase`: `implementing`
- `symptom`: the fresh Story 1 implementer appeared to be waiting for instruction instead of actively executing the initial handoff
- `impact`: the orchestration run looked idle and required user intervention to surface the stall
- `recovery action`: the orchestrator re-issued the Story 1 handoff with `interrupt=true` to force the worker back into an active execution state
- `why this matters for skill work`:
  - the orchestration skill should not assume a spawned worker is actually progressing just because a handoff was sent
  - after story dispatch, the orchestrator should actively confirm the worker leaves the waiting state within a bounded time
  - if the worker appears idle/awaiting-instruction, the orchestrator should auto-interrupt or replace it instead of passively waiting
- `human correction captured`: the user explicitly called out that nothing appeared to be happening and asked that this stall be tracked for improving the skill

## Story 1 Orchestration Wake-Up Note

- `issue type`: async completion handling / orchestrator wake-up failure
- `phase`: `implementing`
- `symptom`: a Story 1 subagent completed and produced a full implementation report, but the orchestrator did not immediately consume that completion and continue into bundle-building / verification
- `root cause diagnosis`: the subagent lane is asynchronous by design, but the orchestrator handled it too much like fire-and-forget work instead of maintaining an active completion checkpoint
- `why this breaks autonomy`: if the orchestrator launches async workers and does not immediately react to completion notifications, story-by-story orchestration stalls even though the worker did its job
- `skill improvement implication`:
  - after every async dispatch, the orchestrator should either remain in an explicit wait loop or immediately re-check for completion on notification
  - completion notifications must be treated as phase-transition triggers, not just informational events
  - a finished worker should immediately cause one of:
    - verification bundle construction
    - fix-routing
    - acceptance gating
  - if that does not happen within a bounded interval, the orchestrator should treat it as its own failure state
- `human correction captured`: the user explicitly pointed out that asynchronous launch without reliable wake-up undermines the whole value of autonomous orchestration

## Skill Update Guidance From Story 1 Failure

This section is written for future skill revision work and for immediate reuse after skill reload.

### Exact Failure

The orchestrator launched a story implementer asynchronously, called `wait_agent`, received a timeout, and failed to preserve an explicit blocked continuation state.

Then, when the worker later completed and produced a real implementation report, the orchestrator did not immediately consume that completion as a mandatory phase transition.

### What The Skill Needs To Say Explicitly

1. After spawning any implementer or verifier, the orchestrator must enter an explicit blocked state:
   - `WAITING_FOR_IMPLEMENTER_REPORT`
   - `WAITING_FOR_CODEX_REVIEW`
   - `WAITING_FOR_SONNET_REVIEW`
2. A `wait_agent` timeout is not a neutral event.
   The skill must require the orchestrator to take one immediate recovery action:
   - wait again
   - inspect lane health
   - interrupt/resend
   - replace the worker
   - switch lanes
   - escalate
3. A completion notification is a mandatory phase-transition trigger.
   The orchestrator must immediately do one of:
   - build the verification bundle
   - launch verification
   - route fixes
   - accept and transition
4. Async delegation is allowed only with an active continuation loop.
   The skill should explicitly forbid fire-and-forget worker launches.
5. If a worker remains idle / awaiting instruction after dispatch, the orchestrator must auto-recover instead of waiting for the human to notice.

### What I Must Do Differently In This Run

- treat every launched subagent as an actively managed dependency on the critical path
- keep explicit note of which agent and which phase is currently blocking progress
- on completion, immediately consume the result and advance the state machine
- if Sonnet helper output is complete but direct file-write fails, materialize the report artifact myself and continue without re-stalling

### Operating Rule For The Rest Of This Session

No launched subagent may remain in a finished or timed-out state without an immediate orchestrator action.

If that happens again, it is an orchestrator failure, not a worker failure.

## Story 1 Verification Artifacts

- `verification bundle`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/01-process-entry-and-bootstrap/verification-bundle.md`
- `codex review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/01-process-entry-and-bootstrap/codex-review.md`
- `second-lane review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/01-process-entry-and-bootstrap/sonnet-review.md`
- `second-lane structured result`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/01-process-entry-and-bootstrap/sonnet-review.json`

## Story 1 Verification Summary

- `codex verdict`: `REVISE` on first pass
- `second-lane verdict`: `PASS` on first pass
- `disagreement points`:
  - conservative `currentRequest` projection in the real Convex path
  - materials reader design alignment and future no-dup/material-ref semantics
- `convergence round 1 outcome`:
  - Codex verifier retracted blocker severity for both issues
  - Codex still stands behind both as non-blocking concerns / future-risk checks
  - second-lane still stands behind `PASS`
- `orchestrator decision after convergence`: no remaining blocking issue proven against Story 1 acceptance scope
- `second-lane file-write note`: helper again returned full structured output but failed direct markdown write; orchestrator materialized the markdown artifact from the captured result

## Story 1 Pre-Acceptance Receipt

1. `implementation lane used`: `Codex gpt-5.4 xhigh`
2. `changed files summary`:
   - dedicated process bootstrap API and HTML route
   - dedicated client process bootstrap branch and process page
   - process access and surface service/readers
   - Story 1 process route open path from project shell
   - Story 1 client and server tests
3. `story base commit`: `f97509a75b051a4434cedf6e74f9e85ea333a5a0`
4. `test diff summary against story base commit`:
   - modified tracked tests:
     - `tests/service/client/project-shell-page.test.ts`
     - `tests/service/server/auth-routes.test.ts`
     - `tests/service/server/processes-api.test.ts`
   - added story tests:
     - `tests/service/client/process-history-section.test.ts`
     - `tests/service/client/process-router.test.ts`
     - `tests/service/client/process-work-surface-page.test.ts`
     - `tests/service/server/process-html-routes.test.ts`
     - `tests/service/server/process-work-surface-api.test.ts`
5. `codex verification summary`:
   - first pass: `REVISE`
   - after convergence: no proven blocker remained
6. `second-lane verification summary`:
   - first pass: `PASS`
   - convergence maintained `PASS`
7. `convergence rounds run`: `1`
8. `fixes applied`: `none`
   - convergence reduced the disagreement below blocking threshold on current evidence
9. `exact story gate commands and results`:
   - `corepack pnpm run red-verify` -> `PASS`
   - `corepack pnpm run test:service` -> `PASS`
   - `corepack pnpm run test:client` -> `PASS`
   - exact chained acceptance gate:
     - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
10. `open risks`:
   - conservative `currentRequest` projection is acceptable for Story 1 but should be revisited in Story 3
   - materials reader currently uses a simpler project-list/filter approach rather than the full process-owned material projection model; acceptable for Story 1, but worth re-checking when Story 4 deepens materials/output behavior

## Story 1 Transition Checkpoint

- Story 1 is accepted.
- The cumulative Epic 2 executable test baseline is now about `18` added executable tests in this run (`1` from Story 0 + about `17` from Story 1), matching the projected Story 1 cumulative target.
- Boundary inventory advanced:
  - dedicated process HTML route: `integrated`
  - durable process-surface bootstrap API: `integrated`
  - process access enforcement for process routes: `integrated`
  - process-surface client bootstrap branch: `integrated`
- Next story target: `02-start-and-resume.md`

## Story 1 Commit

- `commit`: `7308d84e6825f1558a0211b666fa71aebdbec119`
- `message`: `feat: Story 1 - Process Entry and Bootstrap`

## Story 2 Preflight

- `story`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/02-start-and-resume.md`
- `next story skimmed`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/03-conversation-and-current-request.md`
- `story kind`: `standard`
- `story base commit`: `7308d84e6825f1558a0211b666fa71aebdbec119`
- `lane choice`: `Codex gpt-5.4 xhigh`
- `lane rationale`: Story 2 is the first mutation-heavy slice across client, server, and durable state, and it affects same-session correctness plus future Story 3 request continuity.
- `story gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`
- `expected Epic 2 cumulative test baseline after Story 2`: `about 26 executable tests total in this run`
  Story 1 ended at about `18`; Story 2 should add about `8` more.
- `story-specific warnings`:
  - do not quietly implement response submission from Story 3
  - same-session state updates must come from the start/resume action result, not from fake live behavior
  - keep resulting waiting/completed/failed/interrupted state rendering coherent without drifting into Story 6 reconnect logic

## Continued Orchestration Trouble

- `issue type`: critical-path async delegation remains brittle
- `current evidence`:
  - Story 1 already exposed two separate orchestrator failures:
    - worker stall after dispatch
    - worker completion not consumed immediately
  - despite that diagnosis, Story 2 was still launched with the built-in async `spawn_agent` path
  - Story 2 then completed via subagent notification, which means the same fragile pattern is still in use
- `why this is happening`:
  - the built-in subagent tool is asynchronous by design
  - correct use requires a strict blocked-state / wait / consume loop
  - that loop is proving unreliable in practice for this orchestration skill
  - generic delegation guidance and async notifications are too easy to drift with on the critical path
- `what specifically is failing`:
  - after `spawn_agent`, the orchestrator is not being operationally forced into a synchronous control loop
  - timeouts and notifications require immediate continuation behavior, but the current pattern still leaves room for phase drift
  - this is not a worker-quality problem; it is a critical-path control-pattern problem

## Proposed Mitigation Trial

For critical-path implementer and verifier work, try replacing built-in async `spawn_agent` orchestration with the local Codex CLI subagent pattern executed through shell in a blocking session.

### Local References

- `codex-subagent skill reference`:
  - `/Users/leemoore/code/cli-as-subagent-skills/codex-subagent-skill/dist/codex-subagent/SKILL.md`
- `codex-result helper`:
  - `/Users/leemoore/code/cli-as-subagent-skills/codex-subagent-skill/dist/codex-subagent/scripts/codex-result`
- `codex cli`:
  - `/opt/homebrew/bin/codex`

### Why This May Work Better

- the shell session is the blocked object, not a background agent notification
- the orchestrator can stay attached to one command/session until completion
- result harvesting becomes explicit:
  - run `codex exec --json ... > file`
  - keep polling the same shell session if needed
  - extract final output from the JSONL file with `codex-result`
  - continue immediately
- this reduces reliance on remembering to re-enter a built-in async wait loop after spawn/timeout/notification

### Trial Rule

- do not use built-in `spawn_agent` for critical-path story implementer work during the mitigation trial
- do not use built-in `spawn_agent` for critical-path verifier work during the mitigation trial
- if CLI-based Codex work is used, treat it as operationally synchronous:
  - launch
  - stay blocked on the shell session
  - harvest output
  - continue immediately

### Expected Benefit

This does not change the fact that long-running work may require polling, but it changes the control object from “async subagent completion notification” to “explicit shell session still running,” which is easier to manage deterministically inside this skill.

## Mitigation Trial Status

- `current story`: `02-start-and-resume`
- `current plan`: use blocking CLI-based subagent execution for Story 2 fix-routing and verification lanes instead of built-in async `spawn_agent`
- `codex cli verifier pattern`:
  - run `codex exec --json ... > jsonl`
  - stay attached to the shell session until completion
  - extract the final result from the JSONL file
- `second-lane verifier pattern`:
  - continue to use shell-driven helper execution with durable output files
  - treat helper completion as shell-session completion, not as an async notification
- `codex cli fix-routing status`:
  - Story 2 fix round 1 was executed through the local Codex CLI subagent pattern in a blocking shell session
  - the orchestrator stayed on the session, harvested the result from the JSONL artifact, and moved directly into the next phase
  - this is the first clean proof in this run that the CLI-shell pattern is more controllable than built-in async `spawn_agent` for critical-path work

## Story 2 Verification Artifacts

- `verification bundle`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/verification-bundle.md`
- `codex cli review output`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.jsonl`
- `codex cli review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.md`
- `second-lane review output`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/cursor-review.json`
- `second-lane review report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/cursor-review.md`

## Story 2 Second-Lane Fallback

- initial second-lane attempt used the shell-driven Claude helper
- failure symptom:
  - long-lived shell session
  - zero-byte output file
  - no durable review artifact produced
- disposition:
  - treat the Claude helper lane as unhealthy for Story 2
  - switch the second verifier lane to the approved Cursor CLI fallback using the same blocking shell-session pattern

## Story 2 Verification Summary

- `codex cli verdict`: `REVISE`
- `cursor fallback verdict`: `REVISE`
- `overlap`:
  - client-side stale-action `409 PROCESS_ACTION_NOT_AVAILABLE` handling is missing/incomplete
  - AC-2.4 resulting-state proof is weaker than the happy-path start/resume proof
- `codex-specific stronger claim`:
  - Story 2 does not yet prove the actual work surface can show later settled states in-session without Story 6 live transport
- `cursor-specific framing`:
  - stale-action 409 handling is the clearest spec-level blocker
  - AC-2.4 evidence is partial and needs stronger proof / paused coverage
- `fix list`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/fix-list-round-1.md`

## Story 2 Fix Routing Round 1

- `driver`: `Codex CLI subagent via blocking shell session`
- `prompt`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-1-prompt.md`
- `jsonl artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-1.jsonl`
- `scope`: fix the verifier-agreed Story 2 gaps only
  - add client-side handling for stale-action `409 PROCESS_ACTION_NOT_AVAILABLE`
  - preserve the current process surface and show an inline action-scoped error
  - strengthen Story 2 evidence for resulting waiting/paused/completed/failed/interrupted state visibility without pulling Story 6 transport forward
- `implementation outcome`:
  - added `actionError` to the process-surface client state contract
  - `startCurrentProcess` and `resumeCurrentProcess` now clear stale action errors on entry, apply successful action payloads directly, and trap `PROCESS_ACTION_NOT_AVAILABLE` into in-surface error state instead of surfacing an unhandled rejection
  - the process work-surface page now renders `Start process` and `Resume process` controls plus an inline action error region
  - client test coverage now proves:
    - stale `409` start/resume responses preserve the existing surface and show inline feedback
    - Story 2 action responses can render waiting/completed/failed state transitions at the page boundary
    - reducer-level live process fixtures now include paused/completed/failed/interrupted state transitions as explicit visibility proof
- `gate notes`:
  - focused `process-work-surface-page` execution initially failed when run without `jsdom`; rerunning it with `--environment jsdom` confirmed the test behavior and identified the failure as harness/environmental, not product-level
  - the full Story 2 acceptance gate then passed cleanly:
    - `corepack pnpm run red-verify`
    - `corepack pnpm run test:service`
    - `corepack pnpm run test:client`
- `phase exit`: return to fresh dual verification on the updated Story 2 implementation

## Story 2 Primary Verifier Recovery

- initial replacement attempt:
  - `artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review-stalled.jsonl`
  - `failure shape`: the Codex CLI verifier over-read the implementation and never emitted the requested review artifact
  - `recovery`: treat the lane as stalled, preserve the JSONL, and relaunch a tighter replacement verifier prompt focused on the remaining high-risk seams
- replacement primary verifier:
  - `artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.jsonl`
  - `materialized report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.md`
  - `result`: full Story 2 gate executed cleanly and the verifier isolated one remaining blocker

## Story 2 Reverification Summary

- `codex replacement verdict`: `REVISE`
- `cursor fallback verdict`: `PASS`
- `cursor caveat`: Cursor shell execution failed in-session, so the second lane did not independently rerun the gate; its report was materialized from the saved transcript and code inspection
- `codex blocker`:
  - non-`PROCESS_ACTION_NOT_AVAILABLE` start/resume failures still become dropped async rejections
  - cause:
    - `bootstrap.ts` rethrows non-409 action failures
    - `shell-app.ts` invokes action handlers with `void`
  - impact:
    - forbidden/not-found/server/network action failures have no coherent same-session recovery path even though Story 2 owns same-session action behavior
- `codex nonblocking notes`:
  - Story 2 action implementations still transition through a generic running baseline, but the current page/reducer proof is adequate for accepted Story 2 scope
  - shell-summary versus process-surface action derivation remains a seam worth watching, but it is not the current blocker
- `gate result from replacement codex verifier`:
  - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
- `next action`: route Story 2 fix round 2 for the remaining client-side async failure handling gap

## Story 2 Fix Routing Round 2 And Round 3

- `fix list`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/fix-list-round-2.md`
- initial round 2 dispatch:
  - `artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-2-superseded.jsonl`
  - `issue`: the first follow-up fix prompt only targeted the async-failure blocker even though the verifier had established two blockers
  - `disposition`: superseded before acceptance; preserved as evidence of prompt-scope recovery
- active round 3 dispatch:
  - `artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-3.jsonl`
  - `materialized report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-fix-round-3.md`
  - `driver`: Codex CLI subagent via blocking shell session
- `implementation outcome`:
  - `bootstrap.ts` now routes non-409 action failures into bounded in-session recovery behavior instead of letting them escape via `void`ed async handlers
  - `process-work-surface-api.ts` now falls back to typed request errors by HTTP status when action endpoints return malformed or empty error bodies
  - `platform-store.ts` now supports richer per-process start/resume result overrides in the in-memory store so server tests can prove returned action outcomes directly
  - `process-actions-api.test.ts` now proves waiting plus `currentRequest`, completed, and failed outcomes through the real `POST` action boundary and follow-up `GET` bootstrap reads
- `gate notes`:
  - the first full gate attempt failed on formatting only
  - the fix worker applied the exact `biome format` changes and reran the required gate cleanly
  - final gate:
    - `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
- `orchestrator control note`:
  - the superseded round 2 CLI worker was still alive after round 3 began
  - the orchestrator terminated the stale round 2 shell lane so only one critical-path CLI worker remained active
- `phase exit`: return to fresh dual verification on the updated Story 2 implementation

## Story 2 Final Verification Summary

- `primary codex verifier`: `PASS`
  - `artifact`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.jsonl`
  - `materialized report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.md`
  - `gate`: `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client` -> `PASS`
- `second-lane cursor verifier`: `PASS`
  - `session`: `f660e102-3ac5-432e-b525-76eec9959ced`
  - `materialized report`: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/cursor-review.md`
  - `caveat`: Cursor's command runner rejected the requested shell gate, so the second lane is code-inspection-only for this round
- `convergence`:
  - both fresh verifiers agree the two previously blocking seams are closed
  - no verifier found a Story 2 acceptance blocker after round 3
- `nonblocking residual risks`:
  - `interrupted` remains reducer-proven rather than action-boundary-proven in a dedicated `POST` -> `GET` server test
  - malformed or empty action error body fallback lacks a targeted test
  - empty-body `404` fallback can only infer `PROCESS_NOT_FOUND`, not `PROJECT_NOT_FOUND`
- `acceptance decision`: accept Story 2 as implemented
- `next action`: stage and commit Story 2, then advance orchestration to Story 3

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

### Prompt 1: Implementer - Shared Implementation Prompt

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

### Prompt 2: Story Verifier - Codex (`gpt-5.4 xhigh`)

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

### Prompt 3: Story Verifier - Sonnet (`claude sonnet 4.6 max`)

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

### Prompt 4: Feature Reviewer - Codex (`gpt-5.4 xhigh`)

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

### Prompt 5: Feature Reviewer - Sonnet (`claude sonnet 4.6 max`)

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
