# Epic 3 — Final Epic Verification Brief (Round 2)

You are one of four independent reviewers performing a full epic-level
verification of Epic 3: Process Environment and Controlled Execution.
Your job is to independently verify that the implementation on the
current tree (HEAD = `43c23df`) satisfies every acceptance criterion
and every test condition in the spec.

## What you are reviewing

The prior epic-level verification (Round 1) returned BLOCK with 14
verified gaps. Three fix-batch chunks (11 commits, ~5,000 lines of
changes) have closed all 14 gaps. This round verifies that the current
tree genuinely ships Epic 3's specified behavior on the production
code path — not just on test fakes.

## Reading journey (MANDATORY — read in order, full files)

1. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/epic.md`
   (~970 lines — the spec, acceptance criteria, and test conditions)
2. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md`
   (~684 lines — system architecture, research-gated decisions)
3. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md`
   (~1175 lines — server module architecture, Convex schema, adapters,
   ExecutionResult contract)
4. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-client.md`
   (~603 lines — client contract, store shape, live reconciliation,
   control rendering)
5. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/test-plan.md`
   (~530 lines — TC-to-test mapping, fixtures, manual verification
   checklist)
6. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/implementation-addendum.md`
   (chunk plan, 14 gap items, architectural decisions locked during
   gap analysis — this is the closure spec for Round 2)
7. `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/codex-impl-log.md`
   (full implementation history + orchestration learnings — skim for
   context, don't re-verify against)

## Implementation inventory (where the work actually landed)

### Server

```
apps/platform/server/services/processes/environment/
├── process-environment.service.ts
├── provider-adapter.ts                     # EnvironmentProviderAdapter interface
├── provider-adapter-registry.ts
├── local-provider-adapter.ts               # Real implementation (Chunk 2)
├── daytona-provider-adapter.ts             # Typed skeleton, throws NotImplementedError
├── hydration-planner.ts
├── checkpoint-planner.ts
├── code-checkpoint-writer.ts               # OctokitCodeCheckpointWriter (Chunk 3)
├── script-execution.service.ts
└── checkpoint-types.ts

apps/platform/server/services/processes/readers/environment-section.reader.ts
apps/platform/server/services/processes/live/process-live-normalizer.ts  (modified)
apps/platform/server/services/projects/platform-store.ts  (modified)
apps/platform/server/routes/processes.ts  (modified)
apps/platform/server/app.ts  (wires real provider + real code writer)
apps/platform/server/config.ts
```

### Convex

```
convex/schema.ts  (processEnvironmentStates table + sourceAttachments.accessMode + artifacts.contentStorageId)
convex/processEnvironmentStates.ts
convex/processes.ts  (modified)
convex/sourceAttachments.ts  (modified + typed compliance)
convex/artifacts.ts  (internal action + internal mutation pattern)
convex/test_helpers/fake_convex_context.ts  (in-memory storage stub for tests)
```

### Client

```
apps/platform/client/features/processes/process-work-surface-page.ts  (modified)
apps/platform/client/features/processes/process-environment-panel.ts
apps/platform/client/features/processes/process-controls.ts
apps/platform/client/features/processes/process-checkpoint-result.ts
apps/platform/client/app/bootstrap.ts  (modified)
apps/platform/client/app/process-live.ts  (modified)
apps/platform/client/app/store.ts  (modified)
apps/platform/client/browser-api/process-work-surface-api.ts  (modified)
```

### Shared contracts

```
apps/platform/shared/contracts/process-work-surface.ts  (modified)
apps/platform/shared/contracts/live-process-updates.ts  (modified)
apps/platform/shared/contracts/state.ts  (modified)
```

## Required output

You must produce TWO files:

1. `story-verification/epic-verification-r2/<your-reviewer-id>-review.md`
   — full review with evidence, at least 500 lines. See structure below.
2. `story-verification/epic-verification-r2/<your-reviewer-id>-review.json`
   — machine-readable summary with exactly these fields:

```json
{
  "reviewerId": "gpt54-xhigh | gpt53-codex-xhigh | sonnet-adversarial | opus-adversarial",
  "verdict": "SHIP | REVISE | BLOCK",
  "gateRan": true | false,
  "gateExitCode": 0 | <non-zero>,
  "testCounts": { "convex": <n>, "service": <n>, "client": <n>, "integration": <n> },
  "acSatisfied": <count>,
  "acViolated": <count>,
  "tcSatisfied": <count>,
  "tcViolated": <count>,
  "blockingFindings": [
    {
      "id": "B-1",
      "severity": "critical | major | minor",
      "ac": "AC-X.Y",
      "title": "one line",
      "file": "path:line-line",
      "evidence": "what you observed in the code",
      "spec": "what the spec says should be true"
    }
  ],
  "nonblockingFindings": [ /* same shape */ ]
}
```

## Markdown review structure (for the `.md` file)

1. **Verdict and headline findings** — first 10 lines. Ship/revise/block,
   count of blockers, most important evidence.
2. **Reading journey confirmation** — confirm you read each of the 7
   reading-journey files in full (or honestly state which parts you
   skimmed and why).
3. **Gate run evidence** — run `corepack pnpm run verify` and
   `corepack pnpm run test:integration` and paste the real tail output,
   not a summary. If the gate fails, stop and report.
4. **AC-by-AC audit** — for every AC (AC-1.1 through AC-6.4), state
   SATISFIED or VIOLATED with file:line evidence. Cite specific code.
5. **TC-by-TC audit** — for every TC listed in the spec (TC-1.1a
   through TC-6.4b, including all matrix rows), state SATISFIED or
   VIOLATED with file:line evidence. Note which test file covers it.
6. **Structural checks** — verify:
   - Production runtime does NOT default to stubs (app.ts wiring)
   - `ExecutionResult` matches spec-shaped 6 fields (tech-design-server.md:564-571)
   - `EnvironmentProviderAdapter` methods match the 7-method spec
     (tech-design.md:213-222)
   - `sourceAttachments.accessMode` is durable and typed
     (tech-design-server.md:384-389)
   - `processEnvironmentStates.workingSetFingerprint` is computed
     (not always null)
   - Fire-and-forget lanes surface failures as visible env state
     (tech-design-server.md:677-690 — acceptance-vs-later-failure
     boundary)
   - Client renders from `process.controls`, not `availableActions`
     (tech-design-client.md:99-103)
   - Real Octokit writer on production path; `GITHUB_TOKEN` required
     (not silent-mock)
7. **Anti-pattern check** — scan the Zod contracts for defaults on
   required fields. List any you find.
8. **Boundary inventory** — list everything that is still stubbed on
   purpose (e.g., DaytonaProviderAdapter skeleton). Confirm each has
   a clear deferral reason.
9. **Blocking findings** — full list with evidence and spec citation.
10. **Non-blocking findings** — list with evidence and what they'd
    need for closure.
11. **Ship/revise/block rationale** — why this verdict.

## Adversarial framing (Opus and Sonnet reviewers only)

Your job is to find problems, not confirm the implementation works.
Before you call anything SATISFIED, prove to yourself that it actually
works in production — not just that a test passes. Challenge:

- Does the test actually exercise the production code path or is it
  running against a test fake that masks the real behavior?
- Is a schema validator's default value hiding a contract violation?
- Does an error handler swallow a failure into a log line instead of
  surfacing it as durable state?
- Are there code paths where `InMemoryPlatformStore` and
  `ConvexPlatformStore` diverge in a way tests don't catch?
- Does the server wire actually use the real adapter, or does
  some config path quietly fall back to a stub?

Be rigorous. Assume there are problems. Prove things work before
accepting they work.

## Scoring honesty

- If you run the gate and it fails, that's a BLOCK regardless of
  everything else. Report the failure.
- If production wiring silently uses test fakes, that's BLOCK.
- If any AC requires behavior that only works on InMemoryPlatformStore
  test seams but not on the Convex-backed production path, that's BLOCK.
- REVISE is for real issues that are scoped to specific fixable items.
- SHIP is only for trees where every AC/TC is SATISFIED on the real
  production path AND the gate runs clean AND nothing material is
  stubbed for production.

## Not your responsibility

You are NOT verifying:
- Daytona provider integration (research-gated, out of scope per addendum)
- Full GitHub PR/branch/review workflows (Feature 5)
- User-initiated environment discard (out of scope)
- Process-type-specific orchestration (per-process-type epic territory)
- E2E Playwright suite (scaffolded but not executable per addendum)

See the addendum's "Explicitly out of scope" section for the full list.

## Independence

Do not read the other reviewers' review files. Do not read the Round 1
review files or the Round 1 synthesis. Come to your own verdict based
on reading the spec and the current tree.

## Time budget

This is an ~8-12 minute task for a skilled reviewer who reads carefully
and cites evidence. Do not rush the gate (it takes 4-6 minutes by
itself). Do not skip reading the spec files.
