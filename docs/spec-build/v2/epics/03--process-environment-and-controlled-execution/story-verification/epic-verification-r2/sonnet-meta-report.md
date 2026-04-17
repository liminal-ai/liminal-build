# Epic 3 Round 2 — Meta-Report (sonnet-adversarial)

**Date:** 2026-04-16  
**Reviewer:** `sonnet-adversarial`  
**Reviews read:** `opus-adversarial`, `gpt54-xhigh`, `gpt53-codex-xhigh`  
**My Phase 1 verdict:** SHIP  
**Updated verdict after reading others:** SHIP (maintained)

---

## 1. Ranking the Other Three Reviews

### Rank 1 — `opus-adversarial`

**Verdict: SHIP. 8 nonblocking findings. 1246 lines.**

This is the strongest of the three. Reasons:

**Rigor of evidence.** Every AC and TC cites a specific test file with line numbers (e.g., `process-controls.test.ts:39-46`, `process-work-surface.test.ts:313`, `process-work-surface.test.ts:451`). The review went one level deeper than I did on multiple surfaces: it found additional test files I didn't audit — `tests/service/server/process-environment-fire-and-forget.test.ts` (481 lines), `tests/service/server/local-provider-adapter.test.ts` (648 lines), `tests/service/server/octokit-code-checkpoint-writer.test.ts` (256 lines), `tests/service/server/daytona-provider-adapter.test.ts` (71 lines), `tests/service/server/platform-store-recovery-materials.test.ts`, `tests/service/server/convex-platform-store-admin-auth.test.ts`. These exist and cover correctness surfaces that matter.

The review also found two security/validation behaviors in `LocalProviderAdapter` I missed: `validateCodeCheckpointCandidates` at `:418–446` (rejects candidates missing `filePath`/`commitMessage`) and `validateCandidateRefs` at `:448–529` (restricts file refs to the working tree). Those are load-bearing guardrails for the checkpoint path.

It also noted the artifact rollback at `convex/artifacts.ts:128–140` — blobs are deleted on any failure in the internalAction, keeping storage clean.

**Honesty about limitations.** Upfront: codex-impl-log skimmed first 200 lines (per brief direction). No false claims of reading the full 2604-line log.

**Calibration.** Eight nonblocking findings, correctly graded. The Zod defaults are called out with full analysis but not inflated to blocking. The NB-7 (client-side `normalizeEnvironmentState` recomputing statusLabel) is a genuine nuance: that helper is used only when the client synthesizes an env summary for a waiting transition with no accompanying server env message — not for server-supplied payloads, where `process-environment-panel.ts:25` trusts the server's `statusLabel` directly. That's a real distinction, correctly made.

**Coverage.** 57 TCs with individual notes. Appendix A provides a full file:line index organized by module. Appendix B proves each of the 14 addendum items is closed with source evidence. This is the most thorough post-audit synthesis.

**One calibration concern.** The NB-8 (integration tests use InMemoryPlatformStore) is a scope observation, not a finding. I agree it's worth noting, but it's borderline-trivial for a nonblocking list that already contains legitimate items.

---

### Rank 2 — `gpt54-xhigh`

**Verdict: REVISE. 1 blocking, 1 nonblocking. 922 lines.**

**Rigor of evidence.** Strong on specific line citations throughout — particularly in the AC audit where it traces the work surface service in detail (e.g., `process-work-surface.service.ts:83–287`, `305–340`, `369–397`). The blocking finding is substantiated by the most concrete empirical evidence of any reviewer: a local `tsx` probe showing that parsing a server payload with `lastCheckpointResult`, `controls`, `hasEnvironment`, and `accessMode` missing still succeeds and injects defaults silently. The output:

```json
{
  "parsedLastCheckpointResult": null,
  "parsedControlsLength": 7,
  "parsedHasEnvironment": false,
  "parsedAccessMode": "read_only"
}
```

That's the best kind of verification: empirical, not inferential.

It also found the octokit integration test file (`tests/integration/octokit-code-checkpoint-writer-integration.test.ts`) and cited real-GitHub test coverage I didn't enumerate. The TC count of 58 reflects counting TC-1.1c.1 explicitly as a separate TC, which is defensible (it's a distinct matrix row).

**Honesty about limitations.** Read the full codex-impl-log (2604 lines, treated as context only). Did not run the manual verification checklist — explicitly stated. No false precision.

**Calibration concern.** The REVISE verdict on the Zod defaults is the central disagreement point. See §2 for full analysis. In brief: gpt54 is right that the defaults mask malformed payloads and is right that the structural check flagged them. The disagreement is whether this rises to REVISE when the addendum explicitly pre-designates them as non-blocking cleanup. I think gpt54's empirical probe strengthens the case, but the addendum's authority over the acceptance gate is decisive.

The AC count of 28 is correct (I miscounted 22 in my Phase 1 review — see §3). The review properly audited all 28.

**Coverage.** All 28 ACs with specific line evidence. All 57+ TCs. Structural checks with individual PASS/FAIL verdicts. Probe output for the Zod issue.

---

### Rank 3 — `gpt53-codex-xhigh`

**Verdict: REVISE. JSON only.**

**The most significant issue:** This reviewer delivered only the JSON output. The brief requires both a markdown review file (at least 500 lines) and a JSON summary. The markdown file was not produced. The JSON is well-formed and hits the key structural facts, but the analysis is a single summary paragraph. This represents roughly half the required deliverable.

**Rigor of evidence within what was delivered.** The JSON lists all structural checks clearly. The `zodDefaultsOnRequired` array is the most comprehensive of any reviewer — 13 fields listed with file:line — but it doesn't distinguish between acceptable nullable-optional defaults (`disabledReason`, `targetRef`, `failureReason`, `environmentId`, `blockedReason`, `lastHydratedAt`, `lastCheckpointAt` — all spec'd as optional-nullable where the default null is semantically correct) and the genuinely problematic required-field defaults (`lastCheckpointResult`, `controls`, `hasEnvironment`, `accessMode`). Lumping all 13 into "blocking" overstates the issue — the first seven are fine.

**Calibration.** The blocking finding is correctly identified (Zod defaults on required fields) but not correctly scoped (the seven nullable-optional ones shouldn't be in the blocking list). The nonblocking section contains exactly one item: "No `.catch(() => {})` silent-swallow pattern found" — which is confirmation of a fix, not a finding. The reviewer didn't find anything novel.

**Coverage.** The JSON's structuralChecks and blockingFindings arrays are correct at the assertion level. But without the markdown, there's no AC/TC audit to evaluate.

---

## 2. Findings — Agreement and Disagreement With Other Reviewers

### The Zod Defaults Dispute (gpt54-xhigh and gpt53-codex-xhigh: REVISE; opus-adversarial and I: SHIP)

**What they found:** Four required-field Zod defaults remain in `apps/platform/shared/contracts/process-work-surface.ts`:
- `lastCheckpointResult: .nullable().default(null)` (line 246)
- `controls: .default(defaultProcessSurfaceControls)` (line 258)
- `hasEnvironment: .boolean().default(false)` (line 259)
- `accessMode: sourceAccessModeSchema.default('read_only')` (line 328)

**Do these exist in my review?** Yes. I listed all four as NB-2 in my review, explicitly flagging them as anti-patterns.

**Do I agree with the severity (REVISE for gpt54)?** No, and here is the precise reasoning:

1. The implementation addendum (the closure spec this round verifies against) explicitly classifies these four as "**non-blocking future cleanup (not Epic 3 acceptance gates)**" (addendum, lines 52–57). This is an authorial designation that pre-commits to a standard.

2. The brief's SHIP/REVISE/BLOCK scoring criteria define three BLOCK conditions: gate fails, production wiring silently uses test fakes, AC requires behavior only working on InMemory but not Convex. None of these applies to schema hygiene.

3. gpt54's probe demonstrates that a malformed payload silently parses successfully. This is real. But the question is whether it constitutes a behavioral regression on Epic 3's specified behavior — and it does not. The production server always emits these fields on every code path I traced. The defaults only matter if the server regressed.

4. Calling this REVISE over the addendum's explicit non-blocking designation creates an inconsistency: if these defaults are REVISE-worthy now, they should have been REVISE-worthy in Round 1 verification too, since they existed before the fix batches. But Round 1's synthesis focused on the 14 real behavioral gaps.

**Where I concede to gpt54.** The TSX probe is the strongest argument. If I were advising on what to fix before shipping, I'd fix the defaults. But "I'd fix this" and "this is a REVISE condition per the addendum's acceptance criteria" are different claims. The addendum controls.

**Verdict:** The four defaults are real anti-patterns. They are correctly in every reviewer's nonblocking list. gpt54's REVISE position is intellectually defensible — the brief's structural check explicitly asks to find these — but it misapplies the addendum's authority over this acceptance gate.

### Fire-and-Forget Handling (all four reviewers: SATISFIED)

All four reviewers independently confirmed that the original silent `.catch(() => {})` from Gap Item 8 is genuinely closed. gpt53 explicitly noted "No `.catch(() => {})` silent-swallow pattern found." Agreement is unanimous.

### ExecutionResult Contract (all four reviewers: SATISFIED)

All four independently confirmed all 6 fields present. Agreement unanimous.

### Production Wiring (all four reviewers: SATISFIED)

All four confirmed real adapters wired. Agreement unanimous. Opus added the most detail about the explicit test-seam comments at `app.ts:141–166`.

### InMemory vs Convex stale projection divergence (all four reviewers: nonblocking)

Opus named this NB-8. I named this NB-1. gpt54 did not call it out explicitly but mentioned fingerprint computation. gpt53 listed `fingerprintComparedAtRead: true` in structural checks. No reviewer called this blocking. Agreement: nonblocking scope observation.

---

## 3. Findings They Caught That I Missed

**Three genuine gaps in my review:**

### Gap 1 — Additional test file coverage (missed by me, found by opus-adversarial)

Opus identified test files I didn't read or enumerate:
- `tests/service/server/process-environment-fire-and-forget.test.ts` (481 lines) — covers all five fire-and-forget failure paths explicitly
- `tests/service/server/local-provider-adapter.test.ts` (648 lines) — covers the real LocalProvider implementation
- `tests/service/server/octokit-code-checkpoint-writer.test.ts` (256 lines) — covers the real Octokit writer (also found by gpt54)
- `tests/service/server/daytona-provider-adapter.test.ts` (71 lines) — asserts NOT_IMPLEMENTED on every method
- `tests/service/server/platform-store-recovery-materials.test.ts` — tests `hasCanonicalRecoveryMaterials` parity between stores
- `tests/service/server/convex-platform-store-admin-auth.test.ts` — tests the admin-auth wiring for internal Convex calls
- `tests/integration/octokit-code-checkpoint-writer-integration.test.ts` — real GitHub integration tests (also found by gpt54)

My review mentioned these test lanes existed but didn't probe these files. The existence of `process-environment-fire-and-forget.test.ts` at 481 lines is particularly significant — it means the fire-and-forget failure paths have substantially more coverage than my review suggested.

**Why I missed it:** I searched for the test files named in the tech design's primary test file inventory and stopped there. The implementation added additional test files not in the original plan.

### Gap 2 — LocalProvider security validation (missed by me, found by opus-adversarial)

Opus found `validateCodeCheckpointCandidates` at `local-provider-adapter.ts:418–446` and `validateCandidateRefs` at `local-provider-adapter.ts:448–529`. The first rejects checkpoint candidates that are missing `filePath` or `commitMessage`. The second restricts workspace refs to paths within the sandbox working tree (a path traversal guard).

These are real security behaviors that AC-4.2, AC-4.3, and the overall security model depend on. I didn't read `local-provider-adapter.ts` past line 60 and missed these guardrails.

### Gap 3 — AC count (miscounted by me; correct count from gpt54)

My Phase 1 review stated "22 ACs" throughout. The actual count is 28:
- Feature 1: 5 (AC-1.1 through AC-1.5)
- Feature 2: 5 (AC-2.1 through AC-2.5)
- Feature 3: 4 (AC-3.1 through AC-3.4)
- Feature 4: 5 (AC-4.1 through AC-4.5)
- Feature 5: 5 (AC-5.1 through AC-5.5)
- Feature 6: 4 (AC-6.1 through AC-6.4)
- Total: 28

My JSON has `"acSatisfied": 22` which is wrong; it should be 28. All 28 are SATISFIED, but the count is incorrect. I also stated "22 ACs" in my verdict and headline. gpt54 got 28 right; opus didn't state a count.

---

## 4. Findings I Caught That They Missed

**Four findings in my review that none of the others named:**

### Finding 1 — `NullPlatformStore.hasCanonicalRecoveryMaterials` always returns `true`

I noted at `platform-store.ts:838–840` that `NullPlatformStore.hasCanonicalRecoveryMaterials()` returns `true` unconditionally. This means if a test were to instantiate `NullPlatformStore` and call rebuild, the prerequisite check would never block. The NullPlatformStore is only used when Convex config is absent, so this is fine in practice — but it's a different null-object-pattern choice from what the other stores do.

None of the other reviewers specifically identified this.

### Finding 2 — `runCheckpointAsync` outer vs inner guard mismatch

I called out the inconsistency at `process-environment.service.ts:602–613, 693`:
- Outer guard (line 602): fires `runCheckpointAsync` if `checkpointPlanner !== undefined || codeCheckpointWriter !== undefined || artifactCheckpointPersistence !== platformStore`
- Inner guard (line 693): bails if `checkpointPlanner === undefined || codeCheckpointWriter === undefined`

These guards are OR vs AND, so there's an edge case where the outer fires but the inner bails silently. In production both are always set together, so this doesn't manifest. But it's a latent inconsistency. No other reviewer flagged this.

### Finding 3 — `ENV_STATES_WITH_ENVIRONMENT` omits `'unavailable'`

I found at `convex/processEnvironmentStates.ts:72–81` that `ENV_STATES_WITH_ENVIRONMENT` doesn't include `'unavailable'`. When an environment enters `unavailable`, `deriveHasEnvironment` returns `false` and `processes.hasEnvironment` is set to false. This may or may not be correct depending on whether `unavailable` means "lifecycle path is blocked but a working environment may still exist" or "no environment." The spec doesn't say explicitly. None of the other reviewers flagged this.

### Finding 4 — `providerKind` allows null in Convex schema

I noted at `convex/processEnvironmentStates.ts:51` that `providerKind` is `v.union(v.literal('daytona'), v.literal('local'), v.null())`. The tech-design-server.md spec shows only `'daytona' | 'local'` without null. The null comes from `setProcessHydrationPlan` inserting a row before any provider is assigned. This is a minor schema divergence from the spec. No other reviewer called it out.

---

## 5. Updated Verdict

**SHIP — unchanged.**

The three other reviewers independently confirm the core SHIP conditions:
- Gate passes (all four reviewers ran it; all got exit code 0)
- Production wiring is real (unanimous: real LocalProvider, real Octokit writer, real Convex durability)
- All 28 ACs are SATISFIED on the production code path (my miscounted 22 are all SATISFIED; gpt54's correct 28 are all SATISFIED)
- All TCs are SATISFIED (57 per my count; 58 per gpt54 counting TC-1.1c.1 separately)
- Fire-and-forget failures surface as durable failed state (unanimous, confirmed by gpt53's explicit probe)

The Zod defaults dispute does not change my verdict because:
1. The addendum explicitly pre-designates these four as non-blocking cleanup items, not Epic 3 acceptance gates
2. None of the three BLOCK conditions defined by the brief applies
3. The production code always sends these fields correctly on every traced code path

The test files I missed (Gap 1) strengthen the SHIP case rather than weaken it — there is more test coverage than my review accounted for, particularly for fire-and-forget paths.

The AC count correction (28, not 22) is a factual error in my Phase 1 review but doesn't affect the verdict — all 28 are SATISFIED.

The LocalProvider validation guardrails I missed (Gap 2) are security-relevant positives that make the implementation stronger than I described. They don't add any doubt.

---

## 6. What I'd Take From Each Review for a Best Synthesis

### From `opus-adversarial`:

**Take:** The full test file inventory. The synthesis review should explicitly enumerate the test files that landed beyond the original plan — particularly `process-environment-fire-and-forget.test.ts`, `local-provider-adapter.test.ts`, `octokit-code-checkpoint-writer.test.ts`, and `platform-store-recovery-materials.test.ts`. These demonstrate coverage depth that goes beyond what the test plan projected.

**Take:** The LocalProvider security validation analysis. The synthesis should note that `validateCodeCheckpointCandidates` and `validateCandidateRefs` are load-bearing guardrails for AC-4.2 and AC-4.3.

**Take:** Appendix B's chunk-by-chunk closure verification pattern. This is the cleanest way to confirm that all 14 Round 1 gap items are closed with source evidence.

**Skip:** NB-8 (integration tests use InMemory). This is an architectural fact of the test setup, not a meaningful finding.

### From `gpt54-xhigh`:

**Take:** The TSX probe output demonstrating the Zod defaults masking behavior. Even if this doesn't change the verdict to REVISE, the synthesis should include the empirical observation: parsing a payload with missing required fields silently succeeds. This is the most concrete available evidence of the anti-pattern, and it belongs in the synthesis's anti-pattern section.

**Take:** The work surface service line citations (`process-work-surface.service.ts:83–287`, `305–340`, `369–397`). The synthesis would benefit from citing the control derivation logic in that file — it's where the stable control set is built, and it's the most important AC-1.2/AC-1.3 production evidence.

**Take:** The correct AC count of 28, the TC-1.1c.1 separate enumeration, and the octokit integration test reference.

**Skip:** The REVISE verdict. The Zod defaults are real anti-patterns that need eventual cleanup, but the addendum's authority over this acceptance gate is the right tiebreaker.

### From `gpt53-codex-xhigh`:

**Take:** The comprehensive zodDefaultsOnRequired array as a scan surface — all 13 fields enumerated is useful for exhaustive reference, even though the correct classification distinguishes the 4 genuinely problematic ones from the 9 acceptable nullable-optional ones.

**Take:** The nonblocking confirmation of fire-and-forget fix as a positive assertion ("No `.catch(() => {})` silent-swallow pattern found") — this is a clean one-liner that the synthesis should include.

**Skip:** The REVISE verdict for the same reasons as gpt54.

**Note for synthesis:** gpt53 did not produce a markdown file. The synthesis should note this gap but not penalize the underlying findings in the JSON, which are substantively correct.

---

## Summary Table

| Dimension | opus-adversarial | gpt54-xhigh | gpt53-codex-xhigh | sonnet-adversarial |
|-----------|-----------------|-------------|-------------------|-------------------|
| Verdict | SHIP | REVISE | REVISE | SHIP |
| Gate ran | Yes | Yes | Yes | Yes |
| AC count stated | Not stated | 28 ✓ | Not stated | 22 ✗ (should be 28) |
| TC count stated | 57 | 58 | Not stated | 57 |
| Blocking findings | 0 | 1 (Zod defaults) | 1 (Zod defaults) | 0 |
| Nonblocking findings | 8 | 1 | 1 | 7 |
| File:line evidence quality | Very high | High | Low (JSON only) | High |
| Markdown delivered | Yes (1246 lines) | Yes (922 lines) | No ✗ | Yes (637 lines) |
| Test files discovered beyond plan | Yes ✓ | Partial | No | No |
| LocalProvider validation found | Yes ✓ | No | No | No |
| TSX probe run | No | Yes ✓ | No | No |
| Correct on Zod verdict | Yes | Defensible | Defensible | Yes |

**Best composite source for synthesis:**
- Evidence backbone: opus-adversarial (most thorough)
- Empirical Zod proof: gpt54-xhigh (TSX probe)
- Anti-pattern scan completeness: gpt53-codex-xhigh (13-field list)
- Adversarial gaps (NB-6, NB-7): sonnet-adversarial (checkpoint guard mismatch, ENV_STATES_WITH_ENVIRONMENT)
