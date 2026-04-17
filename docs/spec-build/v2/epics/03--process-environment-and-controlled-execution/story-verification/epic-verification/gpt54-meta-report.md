# Epic 3 Meta-Report (GPT-5.4)

I read all four reviews and spot-checked the main disputed evidence paths. I also reran `corepack pnpm run verify-all` on 2026-04-16; it exited `0` with 280 passing tests and the expected scaffolded `test:e2e` skip.

Note: `opus-review.md` was actually produced by Haiku because of a model-selection failure. I am ranking the document by content quality, not by the filename label.

## 1. Ranking: Best to Worst

1. **`gpt54-review.md`**
   Strengths: Best evidence-to-conclusion chain, strongest production-path analysis, and the most accurate read of the epic’s real promises versus what the shipped default runtime actually does. It correctly identifies the fake default provider, stub code checkpoint writer, missing durable `accessMode`, dropped artifact payloads, dead `workingSetFingerprint`, and the missing process-facing execution writes.
   Weaknesses: It is the strictest review and sometimes evaluates against spec intent more than the currently passing test suite.
   What I’d take: Use this as the primary decision document for final verdict and blocker list.

2. **`opus-review.md` (Haiku-produced)**
   Strengths: Strongest AC/TC-by-AC/TC walkthrough after `gpt54`, correct gate read, strong test-quality audit, and good catches on artifact-content loss, InMemory-vs-Convex recovery divergence, and swallowed recovery-path errors.
   Weaknesses: It underweights several core blockers by treating fake/stub boundaries as more acceptable than the epic text allows.
   What I’d take: Use this review for recovery-path risk, test-quality critique, and store-parity concerns.

3. **`gpt53-codex-review.md`**
   Strengths: Concise, sharp, and directionally right about the biggest architectural problem: the default runtime is still fake/stub-backed. It also correctly flags dead `workingSetFingerprint` and the recovery-material parity gap.
   Weaknesses: Too incomplete for sole use, and its gate result is wrong on the current tree.
   What I’d take: Use it as a short blocker summary, not as the definitive review.

4. **`sonnet-review.md`**
   Strengths: Excellent coverage bookkeeping and clear contract/test inventory. Helpful for proving that many UI/contract surfaces are wired and that the suite is broad.
   Weaknesses: Too credulous about “tests pass therefore epic ships.” It normalizes real production-path gaps that the epic text does not treat as optional.
   What I’d take: Use it as a coverage appendix and minor-drift checklist only.

## 2. Where the Reviews Agree

- All four reviews agree that the browser-facing contract and UI threading are mostly coherent: `environment`, stable controls, live upserts, and reopen/bootstrap behavior are all present and heavily tested.
- All four reviews agree that provider execution and code checkpointing currently sit behind stub/fake boundaries. The disagreement is about severity, not the fact.
- Most reviewers agree that the suite is strong at contract/UI coverage but weak on real production-path confidence because it leans heavily on `InMemoryPlatformStore` and fixtures.
- Most reviewers agree that stale/lost support is much stronger at the rendering/bootstrap layer than at the runtime-detection layer.

## 3. Where the Reviews Disagree

- **Gate status:** `gpt53-codex` says fail; the other three say pass. Current evidence favors pass: `verify-all` succeeded on 2026-04-16.
- **Are fake/stub runtime boundaries acceptable?** `gpt54` and `gpt53-codex` say no; `opus` says revise but bounded; `sonnet` says ship. My spot-check supports the stricter view: [app.ts](/Users/leemoore/code/liminal-build/apps/platform/server/app.ts:130) still defaults to `InMemoryProviderAdapter` and `StubCodeCheckpointWriter`.
- **Artifact durability:** `gpt54` and `opus` say artifact checkpointing is incomplete because [convex/artifacts.ts](/Users/leemoore/code/liminal-build/convex/artifacts.ts:61) accepts `contents` and then discards it with `void artifact.contents`; `sonnet` treats metadata persistence as sufficient.
- **Writable source durability:** `gpt54` says this is blocking because [convex/sourceAttachments.ts](/Users/leemoore/code/liminal-build/convex/sourceAttachments.ts:1) does not persist `accessMode`, while shared contracts default it and checkpoint planning depends on it. The others miss or underweight this. My spot-check supports `gpt54`.
- **Freshness/recovery truth:** `gpt54`, `gpt53-codex`, and `opus` all argue that `workingSetFingerprint` is modeled but not implemented. My spot-check supports them: [convex/processEnvironmentStates.ts](/Users/leemoore/code/liminal-build/convex/processEnvironmentStates.ts:49) defines it, but current writes leave it `null`.
- **Execution composition:** `gpt54` says execution does not produce the process-facing writes that downstream stories assume. My spot-check supports this: [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:397) moves environment state through `running` and `checkpointing`, but does not write current requests, side work, or final process outcomes in that path.

## 4. Synthesized Final Verdict

**Final verdict: BLOCK.**

Why:

- The epic text promises a **real** first usable environment loop: controlled execution, durable artifact checkpointing, durable code checkpointing to canonical truth, and recovery based on stale/lost semantics.
- The current implementation passes tests and has strong UI/contract coverage, but the default runtime still boots with a fake provider and a stub checkpoint writer, the real Convex path does not durably model source writability, artifact checkpointing drops payload contents, and stale detection is not runtime-driven.
- Those are not cosmetic gaps. They cut directly into the epic’s core claims.

If the standard were only “the process surface can render and simulate the environment lifecycle cleanly,” this would be closer to **REVISE**. But if the standard is the epic as written, the weight of the evidence still lands on **BLOCK**.
