# CHANGES

- `apps/platform/server/services/processes/environment/checkpoint-planner.ts`
  Implemented `CheckpointPlanner.planFor(...)` with access-mode gating. Writable sources become code targets, read-only sources are excluded into `skippedReadOnly`, and artifact candidates remain eligible even when code targets are skipped.
- `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts`
  Implemented the deterministic Story 4 fakes. `StubCodeCheckpointWriter.writeFor(...)` now resolves `succeeded`, and `FailingCodeCheckpointWriter.writeFor(...)` now resolves `failed` with a configured reason.
- `apps/platform/server/services/processes/environment/process-environment.service.ts`
  Completed the async checkpoint lane after execution success. It now collects provider checkpoint candidates, plans artifact/code targets, persists artifact checkpoints, writes code checkpoints, aggregates the final result into `lastCheckpointResult`, updates `lastCheckpointAt`, settles the environment to `ready` or `failed`, and publishes environment upserts with recomputed process summaries so the Story 3 cross-story invariant remains intact.
- `apps/platform/server/services/projects/platform-store.ts`
  Implemented durable checkpoint writes across the null, in-memory, and Convex-backed store boundary. Environment upserts now retain or overwrite `lastCheckpointAt` / `lastCheckpointResult` correctly, and `persistCheckpointArtifacts(...)` now writes checkpointed artifact/output summaries plus current material refs.
- `convex/artifacts.ts`
  Added the Convex artifact checkpoint persistence mutation and wired it to update artifact summaries, process outputs, current process material refs, and process/project touch timestamps.
- `convex/processEnvironmentStates.ts`
  Completed persistence for `lastCheckpointAt` and `lastCheckpointResult` so latest-only checkpoint state is stored durably instead of being dropped on upsert.
- `apps/platform/client/features/processes/process-checkpoint-result.ts`
  Updated the environment checkpoint block to render the outcome badge hook plus explicit target label, target ref, and failure reason text expected by Story 4 visibility tests.
- `apps/platform/server/app.ts`
  Wired default `CheckpointPlanner` and `StubCodeCheckpointWriter` instances into the app composition root so the checkpoint lane runs by default without any real HTTP/GitHub calls.

# TEST_RESULTS

- Story 4 red tests green: `13/13`
- Focused Story 4 lane passed with all targeted files green:

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  5 passed (5)
      Tests  48 passed (48)
   Start at  21:30:00
   Duration  641ms (transform 257ms, setup 0ms, import 864ms, tests 450ms, environment 0ms)
```

# GATE_RESULT

passed

- Focused command:
  `corepack pnpm exec vitest run convex/processEnvironmentStates.test.ts tests/service/server/process-actions-api.test.ts tests/service/server/process-live-updates.test.ts tests/service/client/process-environment-panel.test.ts tests/service/server/code-checkpoint-writer.test.ts 2>&1 | tail -40`

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  5 passed (5)
      Tests  48 passed (48)
   Start at  21:30:00
   Duration  641ms (transform 257ms, setup 0ms, import 864ms, tests 450ms, environment 0ms)
```

- Full command:
  `corepack pnpm run verify 2>&1 | tail -20`

```text


 Test Files  12 passed (12)
      Tests  93 passed (93)
   Start at  21:30:11
   Duration  754ms (transform 1.16s, setup 0ms, import 3.05s, tests 890ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  141 passed (141)
   Start at  21:30:13
   Duration  1.14s (transform 1.53s, setup 0ms, import 2.73s, tests 602ms, environment 8.84s)
```

# TEST_FILE_DIFFS_FROM_RED

test corrections: red-phase writer + waiter mistakes, not assertion weakening

- `tests/service/server/process-live-updates.test.ts`
  `TC-4.1a` waiter correction near red line 849: changed the waiter from `state === 'failed'` to `state === 'ready'`. Red-phase setup error; correction makes test exercise its stated AC.
- `tests/service/server/process-live-updates.test.ts`
  `TC-4.5b` writer correction near red line 929: replaced `new StubCodeCheckpointWriter()` with `new FailingCodeCheckpointWriter('test code checkpoint failure')` and added the matching import. Red-phase setup error; correction makes test exercise its stated AC.
- No other semantic test-file changes were made during green. The only remaining diff in that file is formatter-only import/whitespace normalization in the same file.

# RESIDUAL_RISKS

- Same-session materials live refresh after artifact checkpoint is not covered by a dedicated test in this story. Artifact durability is exercised, but the green implementation does not publish a separate materials upsert after checkpoint persistence.
- The checkpoint lane still uses deterministic fake provider/code-writer integrations, as required by Story 4's no-real-HTTP constraint. Real provider/canonical source integrations remain future work.
- Artifact checkpoint persistence currently stores durable artifact summary/output linkage in the repo's existing model, but it does not introduce a new artifact-body storage/archive surface in this story.

# SPEC_DEVIATIONS

- When a provider checkpoint candidate references a source attachment that is missing from the currently loaded durable source summaries, `ProcessEnvironmentService` currently falls back to treating that candidate as writable so the checkpoint lane can still execute. Durable `read_only` sources still gate correctly when present, but the missing-metadata fallback is looser than the ideal "durable source policy is always resolved first" design.
