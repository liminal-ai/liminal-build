# Team Implementation Log

## Run Overview
- State: STORY_ACTIVE
- Spec Pack Root: /Users/leemoore/code/liminal-build-wt-1/docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment
- Tech Design Shape: four-file (tech-design.md + tech-design-server.md + tech-design-client.md + test-plan.md)
- Current Story: 02-versioned-checkpoint-realignment
- Current Phase: implement
- Last Completed Checkpoint: story-0-gate-pass (2026-04-26)

## Run Configuration
- Primary Harness: claude-code (v2.1.119, authenticated, max subscription)
- Story Implementor: codex / gpt-5.4 / high
- Quick Fixer: codex / gpt-5.4 / high
- Story Verifier: codex / gpt-5.4 / xhigh
- Self Review Passes: 3
- Epic Verifier 1: codex / gpt-5.4 / xhigh
- Epic Verifier 2: none / claude-sonnet / high
- Epic Synthesizer: codex / gpt-5.4 / xhigh
- Degraded Diversity: no (Codex available as GPT-capable secondary)
- Prompt Inserts: both absent (non-blocking)

## Provider Availability Matrix
- claude-code: available, authenticated (lee.g.moore@gmail.com, max subscription)
- codex: available, binary present (v0.124.0), auth status unknown (no non-mutating check)
- copilot: available but not selected (codex wins probe order)

## Verification Gates
- Story Gate: `corepack pnpm run green-verify`
- Story Gate Source: repo-root package.json scripts
- Story Gate Rationale: Selected green-verify (verify + test-immutability guard) as strictest standard gate
- Epic Gate: `corepack pnpm run verify-all`
- Epic Gate Source: repo-root package.json scripts
- Epic Gate Rationale: Selected verify-all (verify + integration + e2e) as deep gate
- Candidates Considered: red-verify (no tests, too weak), verify (standard), green-verify (standard + guard), verify-all (deep)
- Preflight persisted verification_gates into impl-run.config.json

## Story Sequence
- 00-foundation (Story 0: Foundation — shared vocabulary, no end-user ACs)
- 01-project-artifact-association-without-process-ownership (Story 1: AC-1.1..1.3, TC-1.1a..1.3b)
- 02-versioned-checkpoint-realignment (Story 2: AC-2.1..2.3, TC-2.1a..2.3b)
- 03-process-scoped-artifact-review-realignment (Story 3: AC-3.1..3.4, TC-3.1a..3.4c)
- 04-cross-process-package-alignment (Story 4: AC-4.1..4.4, TC-4.1a..4.4b)
- 05-reopen-and-degraded-provenance-states (Story 5: AC-5.1..5.4, TC-5.1a..5.4b)

## Current Continuation Handles
- Story Implementor:
  - Story: 00-foundation
  - Provider: codex
  - Session ID: 019dcb8d-54d4-7882-8bd6-b820edf96e06
  - Result Artifact: artifacts/00-foundation/001-implementor.json
  - Self-Review Artifact: artifacts/00-foundation/005-self-review-batch.json
- Story Verifier:
  - Story: 00-foundation
  - Provider: codex
  - Session ID: 019dcba1-b6cb-7d52-8da8-205c598a49ab
  - Result Artifact: artifacts/00-foundation/006-verify.json (initial), artifacts/00-foundation/013-verify.json (followup)

## Story Receipts

### story-00 (Foundation)
- Title: Story 0: Foundation
- Implementor Evidence Refs:
  - artifacts/00-foundation/001-implementor.json (initial)
  - artifacts/00-foundation/005-self-review-batch.json (self-review 3/3 passes)
  - artifacts/00-foundation/008-continue.json (follow-up fixing S0-F1, S0-F2)
  - artifacts/00-foundation/012-self-review-batch.json (post-fix self-review 3/3 passes)
- Verifier Evidence Refs:
  - artifacts/00-foundation/006-verify.json (initial: revise, F1+F2 blocking, F3 minor)
  - artifacts/00-foundation/013-verify.json (followup: F1 resolved, F2 resolved, F3 still-open minor)
- Gate Command: `corepack pnpm run green-verify`
- Gate Result: pass
- Gate Test Counts: convex:54 + server:239 + client:233 + packages:5 = 531
- Dispositions:
  - S0-F1 (legacy versionId → artifactVersionId): fixed
  - S0-F2 (collapsed error taxonomy → exact route-level codes): fixed
  - S0-F3 (missing processPackageContexts.test.ts): defer — test plan assigns this file to Chunk 4 (Story 4), not Chunk 0
- Baseline Before Story: 529 (convex:54 + server:237 + client:233 + packages:5)
- Baseline After Story: 531 (convex:54 + server:239 + client:233 + packages:5)
- Baseline Note: +2 net vs +12 planned. Foundation test files contain 16 tests (review-foundation:11, process-foundation:5) but vocabulary refactoring across 14 existing test files restructured some tests. No regression — count is above prior baseline.
- Open Risks:
  - S0-F3 deferred to Story 4 per test plan chunk assignment
- User Acceptance: accepted

### story-01 (Project Artifact Association Without Process Ownership)
- Title: Story 1: Project Artifact Association Without Process Ownership
- Implementor Evidence Refs:
  - artifacts/01-.../001-implementor.json (initial)
  - artifacts/01-.../005-self-review-batch.json (self-review 3/3 passes)
- Verifier Evidence Refs:
  - artifacts/01-.../006-verify.json (initial: pass, all ACs/TCs verified, no findings)
- Gate Command: `corepack pnpm run green-verify`
- Gate Result: pass
- Gate Test Counts: convex:54 + server:242 + client:233 + packages:5 = 534
- Dispositions: (none — no findings)
- Baseline Before Story: 531 (convex:54 + server:239 + client:233 + packages:5)
- Baseline After Story: 534 (convex:54 + server:242 + client:233 + packages:5)
- Baseline Note: +3 net vs +18 planned. Clean verification pass. Server delta is new story-specific tests.
- Open Risks: none
- User Acceptance: accepted

### story-02 (Versioned Checkpoint Realignment)
- Title: Story 2: Versioned Checkpoint Realignment
- Implementor Evidence Refs:
  - artifacts/02-.../001-implementor.json (initial)
  - artifacts/02-.../005-self-review-batch.json (self-review 3/3 passes)
  - artifacts/02-.../007-continue.json (follow-up fixing SV-02-001)
  - artifacts/02-.../012-self-review-batch.json (post-fix self-review 3/3 passes)
- Verifier Evidence Refs:
  - artifacts/02-.../006-verify.json (initial: revise, SV-02-001 blocking)
  - artifacts/02-.../013-verify.json (followup: pass, SV-02-001 resolved)
- Gate Command: `corepack pnpm run green-verify`
- Gate Result: pass
- Gate Test Counts: convex:55 + server:243 + client:233 + packages:5 = 536
- Dispositions:
  - SV-02-001 (provenance not visible in review UI): fixed
- Baseline Before Story: 534 (convex:54 + server:242 + client:233 + packages:5)
- Baseline After Story: 536 (convex:55 + server:243 + client:233 + packages:5)
- Baseline Note: +2 net vs +22 planned. Convex gained 1 (artifact version provenance), server gained 1 (provenance assertion).
- Open Risks: none
- User Acceptance: accepted

## Cumulative Baselines
- Baseline Before Current Story: 536 (convex:55 + server:243 + client:233 + packages:5)
- Expected After Current Story: 563 (536 + 27 planned for chunk 3)
- Latest Actual Total: 536

## Cleanup / Epic Verification
- Cleanup Artifact: pending
- Cleanup Status: not-started
- Epic Verification Status: not-started

## Open Risks / Accepted Risks
- S0-F3: convex/processPackageContexts.test.ts absent — deferred to Story 4 per test plan Chunk 4 assignment

## Retained Operational Notes

### Epic 5 Shape
- 6 stories (0–5), 121 planned tests across 19 files in 6 chunks
- Story 0 = foundation (shared vocabulary, contracts, error codes, fixtures)
- Stories 1–4 = core model realignment (artifact identity, versioning, review, packages)
- Story 5 = integration/capstone (reopen, degradation, error classification)

### Key Model Changes
- Artifacts become project-scoped durable assets; no single-process ownership
- Version provenance on each artifact version (producedByProcessId)
- Review eligibility from process reference + pinned package context, not ownership
- One mutable package-building context per process; snapshots immutable after publication
- Package members pin explicit versions; mixed-producer allowed within same project

### Error Taxonomy
- REVIEW_TARGET_NOT_FOUND (404): artifact/package not in process review context
- ARTIFACT_VERSION_NOT_FOUND (404): explicit version unavailable
- PACKAGE_MEMBER_UNAVAILABLE (404): pinned member version unavailable
- PACKAGE_MEMBER_NOT_ALLOWED (409): member version outside publishing context or project

### Test Layers
- Convex/durable-state: primary confidence layer
- Server service-mock: Fastify routes over real code, mocked external boundaries
- Client service-mock: browser entry points and degraded rendering
- Integration: durable reopen, cross-surface coherence

### Fixture Files
- tests/fixtures/artifacts.ts, process-material-refs.ts, package-contexts.ts, package-snapshots.ts, review-errors.ts

### Verification Tiers
- red-verify: format + lint + typecheck + build (no tests)
- verify: red-verify + all test suites
- green-verify: verify + test-immutability guard (story gate)
- verify-all: verify + integration + e2e (epic gate)

### Monitoring Procedure for Backgrounded Provider Calls
**Sources:** `03-operating-model.md` lines 34-36, `20-story-cycle.md` line 21.

When a provider-backed CLI call is backgrounded:
- Poll the **progress files in `artifacts/<story>/progress/`** — specifically `status.json` (or `NNN-<role>.status.json`), checking `updatedAt`, `lastOutputAt`, and `lastEvent`.
- Also check the **stream logs** in `artifacts/<story>/streams/` (`NNN-<role>.stdout.log`, `NNN-<role>.stderr.log`).
- Poll on a **5-minute cadence**. Do not poll more frequently.
- Do **not** watch the background task runner's stdout capture file (`/private/tmp/.../tasks/<id>.output`). That file is a harness artifact, not the CLI's progress surface. The CLI writes structured progress to `artifacts/`.

**Incident (Story 0 implementation):** The orchestrator set up a `tail -f` Monitor on the background task runner's stdout file instead of on the CLI's progress files. That file was 0 bytes because the CLI writes to `artifacts/`, not to captured stdout. The Monitor timed out after 10 minutes watching nothing. After manual diagnosis found the correct files, the orchestrator overcorrected to 30-second polling instead of the documented 5-minute cadence.

**Root cause:** At the moment of tool selection, the orchestrator treated monitoring as a generic tool-use task ("watch a background process") and reached for a familiar `tail -f` pattern instead of applying the specific file paths documented in the onboarding materials. The carry-forward notes contained the correct answer ("Use `status.json`, `updatedAt`, `lastOutputAt`, stream logs to monitor") but the information did not get applied at the bridge between "I know the procedure" and "I'm now selecting tools." The docs named the right files; the orchestrator watched something else.

**Corrective:** All subsequent backgrounded provider calls must use a Monitor on the actual progress status file in `artifacts/<story>/progress/`, checking for status changes and stall conditions (no `lastOutputAt` update within the silence timeout), on a 5-minute cadence.

### Tooling Observation: Monitor Lifecycle
Only one Monitor should be active at a time since CLI operations are sequential. Old monitors from prior phases complete or time out naturally but remain visible in the Claude Code status area as stale entries, creating confusion about how many monitors are actually running. **Fix:** Use `TaskStop` to explicitly stop the current monitor before arming a new one at each phase transition. This keeps exactly one active monitor at all times. The skill should document this as part of the monitoring procedure: stop the prior monitor, then arm the next one.

### Tooling Observation: CLI Flag Names
`story-continue` requires `--followup-text` (or `--followup-file`), not `--response-text`. The error message was clear (`INVALID_INVOCATION: Provide exactly one of --followup-file or --followup-text`), but the orchestrator initially guessed the wrong flag. The operations doc (`30-cli-operations.md`) presumably documents the exact flags — reading it before first use of each command would prevent this class of error.

### Tooling Observation: Monitor Re-arm Cadence
The Monitor tool has a max timeout of 600000ms (10 min). With a 5-minute polling cadence, that gives exactly 2 checks per monitor lifetime before timeout. Provider-backed CLI calls regularly run 10-20 minutes, so re-arming after timeout is expected and normal. A persistent monitor option exists but would run for the full session — overkill for a single operation watch.
