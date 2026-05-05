# Team Implementation Log

## Run Overview
- State: PRE_EPIC_VERIFY
- Spec Pack Root: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views
- Current Story: 07-reopen-and-degraded-archive-state
- Current Phase: none

## Run Configuration
- Primary Harness: claude-code
- Story Lead Provider: codex / gpt-5.5 / high
- Story Implementor: codex / gpt-5.4 / high
- Quick Fixer: codex / gpt-5.4 / high
- Story Verifier: codex / gpt-5.4 / xhigh
- Self Review Passes: 3
- Epic Verifier 1: codex / gpt-5.4 / xhigh
- Epic Verifier 2: none / claude-sonnet / high
- Epic Synthesizer: codex / gpt-5.4 / xhigh
- Degraded Diversity: false

## Verification Gates
- Story Gate: corepack pnpm run green-verify
- Story Gate Source: impl-run.config.json verification_gates
- Epic Gate: corepack pnpm run verify-all
- Epic Gate Source: impl-run.config.json verification_gates
- Gate Discovery Rationale: Preflight selected `corepack pnpm run green-verify` and `corepack pnpm run verify-all` from persisted `impl-run.config.json` verification_gates. The initial source was repo-root `package.json` scripts, and preflight persisted those resolved gates for downstream CLI commands.

## Story Sequence
- 00-foundation
- 01-canonical-archive-entry-persistence
- 02-finalization-boundary-between-live-state-and-archive
- 03-archive-read-and-reopen-surface
- 04-turn-derivation
- 05-minimal-structural-views-over-turns
- 06-archive-provenance-coherence
- 07-reopen-and-degraded-archive-state

## Current Continuation Handles
- Story Implementor:
  - Story: none
  - Provider: none
  - Session ID: none
  - Result Artifact: none
- Story Verifier:
  - Story: none
  - Provider: none
  - Session ID: none
  - Result Artifact: none

## Story Receipts
### 00-foundation
- Story Title: Story 0: Foundation
- Implementor Evidence: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/003-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/006-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/007-verify.json
- Story Gate: corepack pnpm run green-verify — pass
- Completion Gate: corepack pnpm run verify-all — pass
- Dispositions:
  - S0-F1: fixed
- Open Risks:
  - none
- Baseline Before: 624
- Baseline After: 630
- Commit: bea8512

### 01-canonical-archive-entry-persistence
- Story Title: Story 1: Canonical Archive Entry Persistence
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/004-implementor.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/015-continue.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/008-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/014-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/018-verify.json
- Story Gate: corepack pnpm run green-verify — pass
- Completion Gate: corepack pnpm run verify-all — pass
- Dispositions:
  - S1-F1: fixed
  - S1-F2: fixed
  - S1-F3: fixed
- Open Risks:
  - none
- Baseline Before: 634
- Baseline After: 641
- Commit: 5330c0d

### 02-finalization-boundary-between-live-state-and-archive
- Story Title: Story 2: Finalization Boundary Between Live State and Archive
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/008-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/011-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/014-verify.json
- Story Gate: corepack pnpm run green-verify — pass
- Completion Gate: corepack pnpm run verify-all — pass
- Dispositions:
  - story2-user-message-bridge-finalization-key: fixed
  - story2-user-message-bridge-key-mismatch: fixed
  - story2-green-verify-format-failure: fixed
  - story2-live-archive-separation-proof-missing: fixed
  - story-02-history-bridge-identity-mismatch: fixed
- Open Risks:
  - none
- Baseline Before: 663
- Baseline After: 670
- Commit: f44ae1f

### 03-archive-read-and-reopen-surface
- Story Title: Story 3: Archive Read and Reopen Surface
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/005-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/008-verify.json
- Story Gate: corepack pnpm run green-verify — pass
- Completion Gate: corepack pnpm run verify-all — pass
- Dispositions:
  - story3-bounded-page-production-read: fixed
- Open Risks:
  - none
- Baseline Before: 651
- Baseline After: 660
- Commit: 7b959bb

### 04-turn-derivation
- Story Title: Story 4: Turn Derivation
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/003-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/005-verify.json
- Story Gate: corepack pnpm run green-verify - pass
- Completion Gate: corepack pnpm run verify-all - pass
- Dispositions:
  - none
- Open Risks:
  - none
- Baseline Before: 682
- Baseline After: 692
- Commit: 4dc43e4

### 05-minimal-structural-views-over-turns
- Story Title: Story 5: Minimal Structural Views Over Turns
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/003-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/007-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/011-verify.json
- Story Gate: corepack pnpm run green-verify - pass
- Completion Gate: corepack pnpm run verify-all - pass
- Dispositions:
  - SV-05-001: fixed
  - SV-05-002: fixed
- Open Risks:
  - none
- Baseline Before: 692
- Baseline After: 701
- Commit: 933b44e

### 06-archive-provenance-coherence
- Story Title: Story 6: Archive Provenance Coherence
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/004-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/005-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/009-verify.json
- Story Gate: corepack pnpm run green-verify - pass
- Completion Gate: corepack pnpm run verify-all - pass
- Dispositions:
  - SV-06-01: fixed
  - SV-06-02: fixed
- Open Risks:
  - none
- Baseline Before: 572
- Baseline After: 572
- Commit: e3970d3

### 07-reopen-and-degraded-archive-state
- Story Title: Story 7: Reopen and Degraded Archive State
- Implementor Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json
- Verifier Evidence:
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json
  - /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/009-verify.json
- Story Gate: corepack pnpm run green-verify - pass
- Completion Gate: corepack pnpm run verify-all - pass
- Dispositions:
  - story-07-client-derived-view-shim: fixed
- Open Risks:
  - none
- Baseline Before: 39
- Baseline After: 46
- Commit: 08e45a0

## Cumulative Baselines
- Baseline Before Current Story: 39
- Expected After Current Story: 46
- Latest Actual Total: 46

## Cleanup / Epic Verification
- Cleanup Artifact: none
- Cleanup Status: not-started
- Epic Verification Status: not-started
- Synthesis Status: not-started
- Final Gate Status: not-run

## Open Risks / Accepted Risks
- none

## Setup Notes
- CLI onboarding completed with `lbuild-impl` and `lbuild-impl skill ls-impl`.
- Operating model: the live caller is impl-lead/orchestrator; CLI/provider roles implement and verify bounded operations only. Acceptance, final gates, recovery, and routing are not delegated.
- Durable recovery files: `team-impl-log.md`, `impl-run.config.json`, and CLI envelopes under `artifacts/`.
- Inspect result: status `ok`, outcome `ready`; tech design shape is two-file; prompt inserts are absent; `stories/coverage.md` was ignored as non-story markdown.
- Provider probe: `codex --version` succeeded with `codex-cli 0.128.0`; Copilot probe skipped per first-available algorithm.
- Preflight `001-preflight.json` was blocked because `claude --version` timed out; direct `claude --version` then succeeded with `2.1.128 (Claude Code)`, and retry `002-preflight.json` returned `ready`.
- Successful preflight provider matrix: primary `claude-code` authenticated-known, version `2.1.128 (Claude Code)`; secondary `codex` binary-present, version `codex-cli 0.128.0`, auth status unknown.
- Successful preflight artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/preflight/002-preflight.json`.
- Story 0 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `405`.
- Story 0 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/003-implementor.json`; completed with outcome `ready-for-verification`.
- Story 0 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/006-verify.json`; verifier requested revision with open finding `S0-F1`.
- Story 0 quick-fix artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/001-quick-fix.json`; story-lead routed follow-up verification after this fix.
- Story 0 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/007-verify.json`; outcome `pass`, no open findings, `S0-F1` fixed, `corepack pnpm run green-verify` passed.
- Story 0 final package artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/00-foundation/story-lead/001-final-package.json`; terminal `blocked` because completion gate `corepack pnpm run verify-all` failed in unrelated `packages/lbuild-impl` integration dependency resolution.
- Root `test:integration` was corrected to `corepack pnpm exec vitest run --dir tests/integration --environment node`, preserving the pnpm workspace exclusion for virtual package `packages/lbuild-impl`.
- App integration test `OctokitCodeCheckpointWriter` now retries transient GitHub 502/503/504 responses during disposable branch creation.
- Completion gate `corepack pnpm run verify-all` passed after the root integration command fix and GitHub retry hardening.
- Story 1 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/002-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `565`.
- Story 1 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/004-implementor.json`; completed with outcome `ready-for-verification`.
- Story 1 caller ruling artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/012-caller-ruling.json`; ruling `primitive-only evidence is sufficient; defer TC-1.1/TC-1.4 service/API proof`.
- Story 1 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/014-verify.json`; verifier resolved the scope dispute and surfaced blocking finding `S1-F3` because the primitive exports were absent from the tracked runtime surface.
- Story 1 implementor continuation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/015-continue.json`; implementor restored `appendArchiveEntry` and `listArchiveEntries`, reran the targeted Story 1 suite, and passed `corepack pnpm run green-verify`.
- Story 1 second follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/01-canonical-archive-entry-persistence/018-verify.json`; outcome `pass`, finding `S1-F3` resolved, no open findings remain under ruling 012.
- Story 1 story-lead had one recoverable planner-output interruption after artifact `015-continue.json`; `story-orchestrate resume` replayed from the last valid artifact boundary and completed the missing verifier step with a fresh child provider session.
- Story 2 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `566`.
- Story 2 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/003-implementor.json`; completed with outcome `ready-for-verification`.
- Story 2 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/005-verify.json`; verifier surfaced the initial compatibility-bridge finalization-key blocker.
- Story 2 quick-fix artifacts: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/002-quick-fix.json`, `003-quick-fix.json`, and `004-quick-fix.json`; these iteratively repaired bridge finalization-key reuse, live/archive separation coverage, formatting, and persisted-history identity handling in the execution-result finalization path.
- Story 2 follow-up verifier artifacts: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/02-finalization-boundary-between-live-state-and-archive/008-verify.json`, `011-verify.json`, and `014-verify.json`; final verifier outcome `pass`, all open findings resolved, `green-verify` and `verify-all` both passed.
- Story 3 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `567`.
- Story 3 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/003-implementor.json`; completed with outcome `ready-for-verification`.
- Story 3 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/005-verify.json`; verifier surfaced the unbounded production Convex archive read as the only blocking finding.
- Story 3 quick-fix artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/005-quick-fix.json`; quick-fix tightened the Convex archive query to fetch one bounded page plus lookahead via the index instead of collecting the full archive, and updated the fake Convex query helper to support the required range operators.
- Story 3 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/03-archive-read-and-reopen-surface/008-verify.json`; outcome `pass`, the bounded-page blocker was resolved, and `green-verify` passed.
- Story 4 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `568`.
- Story 4 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/003-implementor.json`; completed with outcome `ready-for-verification`.
- Story 4 verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/04-turn-derivation/005-verify.json`; outcome `pass`, no open findings, and both `green-verify` and `verify-all` passed in the impl-lead acceptance lane.
- Story 5 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `570`.
- Story 5 story-lead run started and is currently in `running_child_operation` on `story-implement`; current snapshot `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/story-lead/001-current.json`.
- Story 5 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/003-implementor.json`; completed with outcome `ready-for-verification`.
- Story 5 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/007-verify.json`; verifier returned `revise` with blockers `SV-05-001` and `SV-05-002`.
- Story 5 quick-fix artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/006-quick-fix.json`; quick-fix moved raw derived-archive-view storage behind api-key-checked wrappers and corrected degraded-view client proof to use real turn derivation + derived-view service output.
- Story 5 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/05-minimal-structural-views-over-turns/011-verify.json`; outcome `pass`, `SV-05-001` and `SV-05-002` resolved, and no open findings remain.
- Story 6 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `572`.
- Story 6 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/004-implementor.json`; completed with outcome `ready-for-verification`.
- Story 6 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/005-verify.json`; verifier returned `revise` with blockers `SV-06-01` and `SV-06-02`.
- Story 6 quick-fix artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/007-quick-fix.json`; quick-fix changed archive provenance enrichment to degrade affected entries instead of rejecting the whole read and corrected TC-6.3b to prove read-time artifact lookup degradation via a throwing enrichment dependency.
- Story 6 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/06-archive-provenance-coherence/009-verify.json`; outcome `pass`, `SV-06-01` and `SV-06-02` resolved, and no open findings remain.
- Story 7 validation artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/001-story-validate.json`; outcome `ready`, story-run selection `start-new`, baseline seed `572`.
- Story 7 implementor artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/004-implementor.json`; completed with outcome `ready-for-verification`.
- Story 7 initial verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/005-verify.json`; verifier returned `revise` with blocker `story-07-client-derived-view-shim`.
- Story 7 quick-fix artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/quick-fix/008-quick-fix.json`; quick-fix removed the fabricated degraded derived-view bootstrap path and preserved archive usability by surfacing real derived-view route failure state instead.
- Story 7 follow-up verifier artifact: `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/artifacts/07-reopen-and-degraded-archive-state/009-verify.json`; outcome `pass`, `story-07-client-derived-view-shim` resolved, and no open findings remain.
- Convex rule: before any Convex code work, read `convex/_generated/ai/guidelines.md`.

## Spec-Pack Carry-Forward Notes
- Story 0 establishes shared contracts, route schemas, Convex archive skeletons, store method signatures, fixtures, and compatibility skeletons only.
- Story 1 owns canonical archive-entry persistence: sequence, idempotency, taxonomy validation, and bounded ordered reads.
- Story 2 owns finalization boundaries and trusted completion hooks, excluding raw deltas and interrupted partials from archive truth.
- Story 3 owns authenticated archive read route/client surface, durable reload/environment-loss reads, empty state, access checks, and per-entry degraded metadata.
- Story 4 owns deterministic turn derivation and cached rebuildable turn projections without mutating archive entries.
- Story 5 owns non-summarizing structural derived views over turns, list/refresh routes, provenance to turns/archive entries, degraded/conflict behavior, and client rendering.
- Story 6 owns read-time artifact/source provenance enrichment and per-entry related-context degradation without copying or owning related domain records.
- Story 7 owns reload/environment-loss hardening, derived-failure isolation, bounded read limits, pagination state, and feasible observability.
- Test plan now expects 52 planned automated tests: 41 named TC tests and 11 non-TC guard tests across Convex, Fastify service/API, client, and existing live/process separation tests.
