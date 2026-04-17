### FINAL VERDICT
BLOCK

On `dd2cb3947392e7dbb1c64eb9f4dcd0d49ce67a9d` (verified on `2026-04-16`), the gate passes and the UI/contract surface is well covered, but the real app path still misses core Epic 3 behavior. The default server boot still uses `InMemoryProviderAdapter` and `StubCodeCheckpointWriter`, the real Convex source path does not durably persist `accessMode`, artifact checkpointing discards payload contents, stale/lost detection is not runtime implemented, and the execution path does not emit the process-facing durable writes Stories 3-5 assume. That leaves AC-3.2, AC-4.1, AC-4.2, and AC-5.1 materially incomplete on the production path.

### VERIFIED FINDINGS TABLE

| Finding | Claimed by | Verified? | Evidence | Severity | Fix effort |
|---|---|---|---|---|---|
| Default runtime boots with a fake environment provider | GPT-5.4, GPT-5.3 Codex | Yes | `apps/platform/server/app.ts:130-145`; `apps/platform/server/services/processes/environment/provider-adapter.ts:39-108`; Epic 3 design expected real provider wiring in `tech-design-server.md:153-163` | Critical | L |
| `StubCodeCheckpointWriter` is the production default and can report success without a write | GPT-5.4, GPT-5.3 Codex, Opus/Haiku | Yes | `apps/platform/server/app.ts:134-145`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`; Epic AC-4.2 requires canonical persistence at `epic.md:369-379` | Critical | M |
| Artifact checkpointing discards content and only keeps metadata/current-output rows | GPT-5.4, Opus/Haiku | Yes | `convex/artifacts.ts:17-22`; `convex/artifacts.ts:70-78`; no content field in `convex/artifacts.ts:9-15`; in-memory path also only stores summaries at `apps/platform/server/services/projects/platform-store.ts:1461-1563`; Epic AC-4.1 at `epic.md:357-367` | Critical | M |
| Real Convex source attachments do not durably persist `accessMode` | GPT-5.4 | Yes | `convex/sourceAttachments.ts:4-22` omits `accessMode`; `convex/sourceAttachments.ts:40-50` does not project it; contracts default it at `apps/platform/shared/contracts/schemas.ts:154-165` and `apps/platform/shared/contracts/process-work-surface.ts:324-332`; materials reader passes it through at `apps/platform/server/services/processes/readers/materials-section.reader.ts:76-94`; Epic requires durable `accessMode` at `tech-design-server.md:121-122` and `epic.md:625-634` | Critical | M |
| `InMemoryPlatformStore.hasCanonicalRecoveryMaterials` diverges from `ConvexPlatformStore` | GPT-5.3 Codex, Opus/Haiku | Yes | Convex checks only material refs at `apps/platform/server/services/projects/platform-store.ts:949-955`; InMemory returns `true` when both maps are unset and also counts outputs at `apps/platform/server/services/projects/platform-store.ts:1595-1608`; rebuild preflight uses both store check and plan check at `apps/platform/server/services/processes/environment/process-environment.service.ts:124-128`, `:959-962` | Major | S |
| Recovery fire-and-forget paths swallow secondary failures with `.catch(() => {})` | Opus/Haiku | Yes | `apps/platform/server/services/processes/environment/process-environment.service.ts:184-193`; recovery fallback also suppresses failures in `:823-848` | Major | S |
| Hydration fire-and-forget path can reject unhandled after the provider step succeeds | GPT-5.3 Codex | Yes | `runHydrationAsync` has no catch at `apps/platform/server/services/processes/environment/process-environment.service.ts:57-59`; only the provider call is inside the first `try` at `:216-230`; later awaited work at `:233-252` can still reject the fire-and-forget promise | Major | S |
| `workingSetFingerprint` is modeled but never used, so runtime stale/lost detection is missing | GPT-5.4, GPT-5.3 Codex, Opus/Haiku | Yes | Field exists at `convex/processEnvironmentStates.ts:49-59`; writes hard-code `null` at `:182-196` and `:273-287`; repo search found no non-null write or comparison; Epic defines stale as fingerprint drift at `tech-design-server.md:301-305` and `epic.md:433-460` | Major | M |
| Execution does not emit the process-facing durable writes later stories assume | GPT-5.4 | Yes | Execution only flips environment state and appends coarse `process_event` history at `apps/platform/server/services/processes/environment/process-environment.service.ts:378-467`; checkpoint path writes artifact/code result summaries but does not write current requests or side work at `:516-779`; existing durable sinks exist but are unused here in `convex/processOutputs.ts:36-100` and `convex/processSideWorkItems.ts:39-92`; Epic AC-3.2 expects coherent process-facing execution activity at `epic.md:307-318` | Major | M |
| Client ignores the contract `environment.statusLabel` and recomputes from `state` | GPT-5.4 | Yes | `apps/platform/client/features/processes/process-environment-panel.ts:27-29`; `apps/platform/client/app/process-live.ts:79-87` | Minor | S |
| Default provider policy is `local`, while Epic 3 design says the default should be `daytona` unless explicitly switched for local development/tests | GPT-5.4 | Yes | `apps/platform/server/config.ts:18-19`, `:23-34`; design policy at `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design-server.md:95-109` | Minor | S |
| `convex/sourceAttachments.ts` violates repo Convex guidance with `queryGeneric` and `ctx:any` | GPT-5.4 | Yes | `convex/sourceAttachments.ts:1`, `:28-36`; repo guidance says use typed Convex APIs and avoid `any` in `convex/_generated/ai/guidelines.md` | Minor | S |
| Raw `process.hasEnvironment` can drift from environment truth | GPT-5.4 | Yes | Process records are created with `hasEnvironment: false` at `convex/processes.ts:250-276` and returned directly at `:475-486`; I found no non-test production write setting it `true`; process surface compensates by deriving from environment at `apps/platform/server/services/processes/process-work-surface.service.ts:290-338` | Minor | S |
| Foundation test includes a tautological fixture-equality assertion | Opus/Haiku | Yes | `tests/service/server/process-foundation-contracts.test.ts:29`; the fixture is cloned from the same constant at `tests/fixtures/process-controls.ts:6` | Minor | XS |
| Client page/panel tests lean heavily on text-presence assertions | Opus/Haiku | Yes | Sampled assertions in `tests/service/client/process-work-surface-page.test.ts` and `tests/service/client/process-environment-panel.test.ts` are dominated by `.toContain()`/presence checks rather than structure/placement checks | Minor | M |
| `verify-all` fails on the current tree | GPT-5.3 Codex | No | My run of `corepack pnpm run verify-all 2>&1 | tail -30` on `2026-04-16` at `dd2cb3947392e7dbb1c64eb9f4dcd0d49ce67a9d` exited `0`; see gate output below | None | None |

### FINDINGS THAT WERE WRONG

- `gpt53-codex-review.md` reported a failing gate. I could not reproduce that on the same current `HEAD` commit (`dd2cb3947392e7dbb1c64eb9f4dcd0d49ce67a9d`) on `2026-04-16`; `verify-all` exited `0`.
- `sonnet-review.md` treated AC-4.1 as satisfied. The code disproves full durable artifact persistence: `convex/artifacts.ts:71` explicitly discards `artifact.contents`, and the artifact schema has no content field.
- `sonnet-review.md` treated AC-4.2 and the real writable-source path as satisfied. The code disproves that on the production path: `StubCodeCheckpointWriter` always returns success without writing (`code-checkpoint-writer.ts:8-20`), and `convex/sourceAttachments.ts` does not durably store `accessMode`.
- `sonnet-review.md` treated TC-2.5a/TC-2.5b as satisfied without qualifying the store path. That is only true on the fixture/InMemory path; the real Convex path falls back to `read_only` because `accessMode` is absent and the schema default fills it in later.
- `sonnet-review.md` said no tautological tests were identified. `tests/service/server/process-foundation-contracts.test.ts:29` compares `processSurfaceControlOrder` to a fixture cloned from the same constant at `tests/fixtures/process-controls.ts:6`.

### MUST-FIX LIST

1. Replace fake default runtime wiring with real provider selection and real provider adapters, or block non-test app boots from silently using `InMemoryProviderAdapter`. Evidence: `apps/platform/server/app.ts:130-145`; missing expected modules from `apps/platform/server/services/processes/environment/` compared with `tech-design-server.md:153-163`.
2. Replace `StubCodeCheckpointWriter` as the default and wire a real canonical code persistence path. Evidence: `apps/platform/server/app.ts:134-145`; `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`.
3. Persist artifact contents or a durable content handle instead of discarding them during checkpoint. Evidence: `convex/artifacts.ts:17-22`; `convex/artifacts.ts:70-78`.
4. Add durable `accessMode` to the real Convex source attachment path and propagate it through server projections. Evidence: `convex/sourceAttachments.ts:4-22`; `convex/sourceAttachments.ts:40-50`; `apps/platform/shared/contracts/schemas.ts:154-165`; `apps/platform/shared/contracts/process-work-surface.ts:324-332`.
5. Align rebuild prerequisite semantics across stores, including how outputs count and what happens when no explicit material row exists. Evidence: `apps/platform/server/services/projects/platform-store.ts:949-955`; `apps/platform/server/services/projects/platform-store.ts:1595-1608`; `apps/platform/server/services/processes/environment/process-environment.service.ts:124-128`; `:959-962`.
6. Remove silent fire-and-forget recovery catches and harden the hydration post-ready path so failures become visible terminal states instead of swallowed or unhandled async failures. Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:57-59`; `:184-193`; `:233-252`; `:823-848`.
7. Implement real stale/lost detection from canonical-material drift, or narrow the epic/story claims accordingly. Evidence: `convex/processEnvironmentStates.ts:49-59`; `:182-196`; `:273-290`; `epic.md:433-460`.
8. Emit real process-facing execution writes, not just environment-state flips and generic `process_event` rows, or narrow Story 3 claims accordingly. Evidence: `apps/platform/server/services/processes/environment/process-environment.service.ts:378-467`; `:516-779`; available-but-unused durable sinks in `convex/processOutputs.ts:36-100` and `convex/processSideWorkItems.ts:39-92`.

### SHOULD-FIX LIST

1. Either trust the server-provided `environment.statusLabel` or remove it from the contract, so the client does not maintain a second interpretation. Evidence: `apps/platform/client/features/processes/process-environment-panel.ts:27-29`; `apps/platform/client/app/process-live.ts:79-87`.
2. Bring `process.hasEnvironment` back into sync with environment truth or retire it from raw process summaries. Evidence: `convex/processes.ts:250-276`; `:475-486`; `apps/platform/server/services/processes/process-work-surface.service.ts:290-338`.
3. Bring `convex/sourceAttachments.ts` back into typed Convex compliance. Evidence: `convex/sourceAttachments.ts:1-54`; repo guidance in `convex/_generated/ai/guidelines.md`.
4. Clean up low-value tests: remove the tautological control-order fixture equality and strengthen client page/panel assertions beyond raw text presence. Evidence: `tests/service/server/process-foundation-contracts.test.ts:29`; `tests/fixtures/process-controls.ts:6`; sampled client tests in `tests/service/client/process-work-surface-page.test.ts` and `tests/service/client/process-environment-panel.test.ts`.

### VERIFIER QUALITY RATINGS

| Reviewer | Accuracy | Depth | Calibration | Usefulness | Notes |
|----------|----------|-------|-------------|------------|-------|
| GPT-5.4 | 9 | 10 | 9 | 10 | Best production-path review. It found every blocker I could validate in code and weighted them close to where I landed. |
| GPT-5.3 Codex | 7 | 7 | 8 | 7 | Good compact blocker summary and a valid unique catch on the hydration fire-and-forget path, but it missed the `accessMode` and artifact-content gaps and its gate result was wrong on the current tree. |
| Opus/Haiku (`opus-review.md`) | 8 | 9 | 8 | 8 | Strong AC/TC walkthrough, good recovery/store parity analysis, and correct on artifact discard plus swallowed recovery errors. It underweighted the fake-default-runtime problem, but the core findings held up. |
| Sonnet | 4 | 6 | 2 | 4 | Thorough coverage bookkeeping, but it over-relied on passing tests and fixture paths, missed multiple validated production-path blockers, and the SHIP verdict was materially under-calibrated. |

### CROSS-REVIEWER CALIBRATION INSIGHT

The SHIP-to-BLOCK spread came from reviewers answering different questions. Sonnet mostly answered, "Are the contracts, reducers, and tests coherent?" GPT-5.4 mostly answered, "Does the real default runtime deliver Epic 3's promised behavior on the production path?" Opus/Haiku and GPT-5.3 sat between those bars.

Future epic-review prompts should explicitly require all of the following:

- Evaluate against the epic ACs plus the tech-design boundary inventory, not just test coverage.
- Verify the real default app wiring, not only mocked test seams.
- Trace `InMemoryPlatformStore` and `ConvexPlatformStore` separately and call out any behavioral divergence.
- Re-run the gate on the exact current commit and report both exit code and timestamp.
- Distinguish "acceptable test double used in tests" from "stub used as the app's default production implementation."

### GATE RESULT

Command run on `2026-04-16` at `dd2cb3947392e7dbb1c64eb9f4dcd0d49ce67a9d`:

```text
corepack pnpm run verify-all 2>&1 | tail -30
```

Exit code: `0`

Observed tail:

```text
> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  152 passed (152)
   Start at  09:35:57
   Duration  1.16s (transform 1.44s, setup 0ms, import 2.83s, tests 644ms, environment 8.99s)


> liminal-build@ test:integration /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/integration --environment node


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  09:35:58
   Duration  420ms (transform 215ms, setup 0ms, import 505ms, tests 147ms, environment 0ms)


> liminal-build@ test:e2e /Users/leemoore/code/liminal-build
> node -e "console.log('SKIP: test:e2e scaffolded in Story 0; no executable suite yet')"

SKIP: test:e2e scaffolded in Story 0; no executable suite yet
```
