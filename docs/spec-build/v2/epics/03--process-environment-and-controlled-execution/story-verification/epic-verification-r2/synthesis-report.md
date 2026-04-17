# Epic 3 Round 2 Synthesis Report

Date: `2026-04-16`

Author: `Phase 3 synthesis agent`

Scope: final ship-readiness synthesis for Epic 3 Round 2 verification

Tree: current workspace tree at synthesis time

Mandatory inputs read:

- `epic.md`
- `implementation-addendum.md`
- `sonnet-adversarial-review.md`
- `opus-adversarial-review.md`
- `gpt54-xhigh-review.md`
- `gpt53-codex-xhigh-review.json`
- `sonnet-meta-report.md`
- `opus-meta-report.md`
- `gpt54-meta-report.md`
- `gpt53-codex-meta-report.md`

Repo guidance read first:

- `convex/_generated/ai/guidelines.md`
- `docs/onboarding/current-state-index.md`
- `docs/onboarding/current-state-process-work-surface.md`
- `docs/onboarding/current-state-tech-design.md`
- `docs/onboarding/current-state-code-map.md`

Independent verification performed:

- direct source inspection of every cited finding family
- one schema-level `tsx` probe against the live contracts
- one full-response `tsx` probe against production parser entrypoints
- fresh gate run of `corepack pnpm run verify`
- fresh gate run of `corepack pnpm run test:integration`

Coverage counting note:

- The user prompt says `24 ACs + 57 TCs`.
- The current epic document actually contains `28` numbered ACs:
- `5` in section 1
- `5` in section 2
- `4` in section 3
- `5` in section 4
- `5` in section 5
- `4` in section 6
- The current epic document contains `58` TCs if `TC-1.1c.1` is counted separately.
- The document contains `57` TCs only if `TC-1.1c.1` is folded into the matrix row for `TC-1.1c`.
- In the ratings below I score reviewers against the actual epic text, while noting where count mismatches affected calibration.

## 1. Top-Line Verdict

**Verdict: REVISE**

Epic 3 is functionally close to ship-ready, and the runtime no longer hides behind the major Round 1 dishonesty problems.

The production path now uses the real `LocalProviderAdapter`, the real `OctokitCodeCheckpointWriter`, real Convex file-storage artifact persistence, real `workingSetFingerprint` compute-on-write, and real read-time stale projection.

The required gates both pass cleanly on the current tree.

I did not find any remaining fake-wired production path, any gate-fail condition, or any Convex-vs-InMemory correctness hole large enough to justify `BLOCK`.

I also did not find any current-tree defect that invalidates the large body of AC/TC evidence in the Phase 1 reviews.

I am still not calling `SHIP`.

The remaining issue is narrow but real:

- the production client still accepts malformed Epic 3 payloads for spec-required fields because shared response schemas default required values instead of rejecting omissions

I independently verified that behavior twice:

- once by parsing the nested schemas directly
- once by parsing full response payloads through the actual production response schemas

In both probes, payloads missing `environment.lastCheckpointResult`, `process.controls`, `process.hasEnvironment`, and `processSourceReference.accessMode` still parsed successfully and silently injected defaults.

That does not make the feature broken in day-to-day happy-path use.

It does make the contract fail-soft where the epic explicitly says those fields are required-present.

Because the current ship decision is supposed to be made on clean, independently verified acceptance evidence rather than on prior addendum intent alone, that contract masking is a real release blocker for `SHIP`.

So the correct outcome is:

- not `BLOCK`
- not `SHIP`
- `REVISE`, with one must-fix family and a short cleanup pass

## 2. Independent Gate Verification

### Commands Run

1. `corepack pnpm run verify`
2. `corepack pnpm run test:integration`

### `corepack pnpm run verify`

Exit code:

- `0`

Observed counts from my run:

- Convex: `35` tests across `7` files
- Service/server: `163` tests across `20` files
- Service/client: `156` tests across `19` files

Total covered by `verify`:

- `354` tests across `46` files

Observed lane summary:

- format check passed
- lint passed
- typecheck passed
- build passed
- convex test lane passed
- server test lane passed
- client test lane passed

Notable detail:

- current counts are higher than the counts frozen into `implementation-addendum.md:44-46`

### `corepack pnpm run test:integration`

Exit code:

- `0`

Observed counts from my run:

- Integration: `12` tests across `3` files

### Combined Gate Summary

Combined passing tests from the two required commands:

- `366`

Combined file count from the two required commands:

- `49`

Gate verdict:

- `PASS`

What this means for ship-readiness:

- there is no mandatory `BLOCK` condition from the gate
- there is no evidence that the current tree is broadly unstable
- the remaining ship decision turns on contract hygiene and release calibration, not on failing validation lanes

### What I Did Not Run

- I did not run the manual verification checklist in `test-plan.md`.
- I did not run `npx convex dev`.
- I did not re-walk the entire manual dev-server path.
- Those were not requested in this dispatch, so I am not using their absence as findings.

## 3. Verifier Ratings

### Scoring rubric

Scores are `1-10`.

Dimensions:

- Rigor of evidence
- Calibration
- Coverage
- Honesty
- Independence

Coverage note:

- I score against the actual epic text: `28` ACs and `57/58` TCs, not the `24` ACs count in the prompt

### Score table

| Reviewer | Rigor | Calibration | Coverage | Honesty | Independence | Notes |
|---|---:|---:|---:|---:|---:|---|
| `gpt54-xhigh` | 10 | 9 | 9 | 9 | 10 | Strongest proof on the decisive issue; slightly narrower sweep on low-severity side findings |
| `opus-adversarial` | 9 | 7 | 10 | 8 | 8 | Deepest breadth and best evidence inventory; undercalled the required-field default issue |
| `sonnet-adversarial` | 8 | 7 | 8 | 8 | 8 | Solid review, but missed more second-order seams and undercalled the same contract defect |
| `gpt53-codex-xhigh` | 3 | 4 | 2 | 4 | 7 | Core concern was directionally right, but deliverable was incomplete and overbroad |

### Overall ranking

1. `gpt54-xhigh`
2. `opus-adversarial`
3. `sonnet-adversarial`
4. `gpt53-codex-xhigh`

### Reviewer-by-reviewer analysis

#### `gpt54-xhigh`

Rigor:

- Best in class.
- It was the only reviewer to prove the key claim behaviorally instead of only textually.
- The schema probe result it reported is reproducible on the current tree.
- I reproduced the same failure mode independently.

Calibration:

- High.
- It correctly separated `REVISE` from `BLOCK`.
- It did not overstate the issue into a broken-runtime claim.
- It did not miss the fact that gates were green and fake production wiring was gone.
- I agree with its core severity call.

Coverage:

- Strong on AC/TC and structural checks.
- Slightly weaker than Opus on secondary seam inventory.
- It did not surface some of the smaller code-quality issues Sonnet and Opus found.

Honesty:

- Strong.
- It clearly stated what it did not run.
- It clearly distinguished direct evidence from inference.

Independence:

- Strongest.
- It produced the most independent proof on the critical dispute.
- Its verdict was not an echo of the other REVISE review; it had its own evidence base.

Bottom line:

- This was the best calibrated review for deciding ship-readiness.

#### `opus-adversarial`

Rigor:

- Very high.
- Strongest breadth of file:line support.
- Best inventory of extra tests and closure evidence.
- Good on real-code-path verification.

Calibration:

- Good on almost everything except the decisive dispute.
- It saw the exact same required-field defaults as the REVISE camp.
- It still left them as nonblocking even though the epic says those fields are required-present and the client parser demonstrably masks their omission.
- That is a material undercall.

Coverage:

- Best overall breadth.
- It inspected more adjacent tests and helper seams than any other reviewer.
- It surfaced real secondary issues others missed.

Honesty:

- Good.
- It disclosed that it skimmed rather than fully re-verifying the impl log.
- Its limits section was less explicit than GPT-5.4’s, but still honest enough.

Independence:

- Good.
- The report was not derivative.
- It added real findings of its own.
- The one place it was less independent was severity calibration around the disputed defaults.

Bottom line:

- Best breadth.
- Not the best final release call.

#### `sonnet-adversarial`

Rigor:

- Good.
- It had real file:line evidence and a usable AC/TC audit.
- It was less exhaustive than Opus and less empirically grounded than GPT-5.4.

Calibration:

- Mixed.
- It correctly kept most secondary issues minor.
- It also undercalled the required-field default masking.
- It additionally miscounted the AC total in Phase 1, which is minor but relevant to scoring discipline.

Coverage:

- Good, not elite.
- It covered the core Epic 3 surfaces well.
- It missed several tests and lower-level guardrails Opus found.

Honesty:

- Good.
- It acknowledged the impl-log skim limitation.
- It did not pretend to do manual verification it had not done.

Independence:

- Good.
- It found several smaller issues that were genuinely its own.
- It was not merely restating the group consensus.

Bottom line:

- A useful adversarial review.
- Not strong enough to carry the ship decision over the line by itself.

#### `gpt53-codex-xhigh`

Rigor:

- Low.
- The report delivered only the JSON half of the requested output.
- It did not provide a real AC-by-AC or TC-by-TC audit.
- It did not provide the required gate-tail evidence.

Calibration:

- Low to moderate.
- It was directionally correct that required-field defaults were the outstanding defect family.
- It was not calibrated in scope.
- It labeled optional or omitted-response fields as required-default blockers.

Coverage:

- Low.
- Structural checklist only.
- No long-form audit.
- No evidence of full-surface review depth.

Honesty:

- Weak.
- The absence of the markdown deliverable matters.
- There was also no meaningful limitations disclosure.

Independence:

- Better than the rest of its scores.
- It at least converged on the same core issue independently.
- But the thinness of the report limits confidence.

Bottom line:

- Useful as corroboration.
- Not strong enough to drive synthesis.

## 4. Independent Verification Crosswalk

This crosswalk covers every substantive code or contract finding surfaced across Phase 1 and Phase 2.

Legend:

- `Real` means the condition exists in the current tree.
- `Not real` means the reviewers were wrong on the current tree.
- `Latent` means the code condition exists but is not currently exercised on the audited production path.
- `Positive evidence` means the item is not a defect but is a real strengthening fact a reviewer surfaced.

| ID | Finding family | Surfaced by | My verification | Bucket |
|---|---|---|---|---|
| F-1 | Required-field defaults on `lastCheckpointResult`, `controls`, `hasEnvironment`, `accessMode` | all 4 Phase 1 reviewers | Real; independently reproduced via schema and full-response probes | MUST FIX |
| F-2 | `InMemoryPlatformStore` lacks read-time stale projection | Sonnet, Opus, meta reports | Real; only Convex path projects `ready -> stale` on read | SHOULD FIX |
| F-3 | response composer still gates on `availableActions.includes('respond')` | Sonnet, Opus meta, GPT-5.4 meta | Real | ACCEPTED-RISK |
| F-4 | `providerKind` allows `null` in Convex env-state row | Sonnet, Sonnet meta | Real | ACCEPTED-RISK |
| F-5 | `HydrationPlan.fingerprint` is still `''` | Sonnet, Opus, GPT-5.4 | Real | SHOULD FIX |
| F-6 | outer/inner checkpoint guards are asymmetrical | Sonnet, Opus meta, GPT-5.4 meta | Real | SHOULD FIX |
| F-7 | `ENV_STATES_WITH_ENVIRONMENT` omits `unavailable` | Sonnet, Sonnet meta, Opus meta | Real but latent; no current mutation writes `state='unavailable'` | ACCEPTED-RISK |
| F-8 | client synthesized environment path recomputes `statusLabel` | Opus, GPT-5.4 meta | Real and narrow | ACCEPTED-RISK |
| F-9 | tech-design sketch still shows 7-method adapter shape | Opus, Opus meta | Real doc drift; refined server design and code use 6 methods + `providerKind` | ACCEPTED-RISK |
| F-10 | integration tests use `InMemoryPlatformStore` | Opus, Sonnet meta, GPT53 meta | Real observation | NOISE |
| F-11 | `NullPlatformStore.hasCanonicalRecoveryMaterials()` always returns `true` | Sonnet meta | Real, but confined to null-object seam | ACCEPTED-RISK |
| F-12 | original tautological foundation-test finding is still open | addendum history, some reviewer closure tables | Not real on current tree; the exact tautology is gone | NOISE |
| F-13 | optional-null defaults in shared contracts are also blockers | GPT53, GPT53 meta | Not real; several cited fields are optional by spec or omitted from the response contract | NOISE |
| F-14 | LocalProvider candidate validation and path guards exist | Opus, Sonnet meta | Positive evidence; real strengthening fact | Positive evidence |
| F-15 | artifact-storage rollback on failure exists | Opus, Sonnet meta | Positive evidence; real strengthening fact | Positive evidence |

## 5. Consolidated Findings

### MUST FIX

#### M-1 — Required `environment.lastCheckpointResult` still defaults instead of failing fast

File:

- `apps/platform/shared/contracts/process-work-surface.ts:244-246`

Spec anchor:

- `epic.md:589`

Current code:

- `lastCheckpointResult: lastCheckpointResultSchema.nullable().default(defaultEnvironmentSummary.lastCheckpointResult)`

Independent verification:

- direct source read confirms the default
- nested-schema probe accepted omission and injected `null`
- full-response probe accepted omission through `processWorkSurfaceResponseSchema`
- full-response probe accepted omission through `startProcessResponseSchema`

Why this is real:

- the epic marks `lastCheckpointResult` as `Required = yes`, `Validation = present`
- the production client still auto-fills that field when the server omits it
- that means the client cannot distinguish "server intentionally returned `null`" from "server forgot to send the field"

Severity:

- MUST FIX

One-line fix instruction:

- remove `.default(...)` from `environmentSummarySchema.lastCheckpointResult` so omitted required checkpoint visibility fails parse

#### M-2 — Required `process.controls` still defaults to a fabricated 7-control array

File:

- `apps/platform/shared/contracts/process-work-surface.ts:258`

Spec anchor:

- `epic.md:620`
- `tech-design-client.md:99-103`

Current code:

- `controls: z.array(processSurfaceControlStateSchema).default(defaultProcessSurfaceControls)`

Independent verification:

- direct source read confirms the default
- nested-schema probe accepted omission and injected `7` controls
- full-response probe accepted omission and injected a fabricated stable control set

Why this is real:

- the epic says `controls` is required-present
- the client design explicitly says the browser must render from the full `controls` array
- if the server regresses and drops the field, the current client quietly invents one

Severity:

- MUST FIX

One-line fix instruction:

- remove `.default(defaultProcessSurfaceControls)` so missing `controls` is rejected rather than synthesized

#### M-3 — Required `process.hasEnvironment` still defaults to `false`

File:

- `apps/platform/shared/contracts/process-work-surface.ts:259`

Spec anchor:

- `epic.md:621`

Current code:

- `hasEnvironment: z.boolean().default(false)`

Independent verification:

- direct source read confirms the default
- nested-schema probe accepted omission and injected `false`
- full-response probe accepted omission and injected `false`

Why this is real:

- the epic marks `hasEnvironment` as required
- the current parser silently turns omission into a semantic statement
- `false` is not a safe inert default here; it changes meaning

Severity:

- MUST FIX

One-line fix instruction:

- remove `.default(false)` so missing `hasEnvironment` is treated as malformed payload, not as "no environment"

#### M-4 — Required `processSourceReference.accessMode` still defaults to `read_only`

Files:

- `apps/platform/shared/contracts/process-work-surface.ts:324-329`
- related mirror: `apps/platform/shared/contracts/schemas.ts:154-159`

Spec anchor:

- `epic.md:634`
- `tech-design-client.md:404`

Current code:

- `accessMode: sourceAccessModeSchema.default('read_only')`

Independent verification:

- direct source read confirms both defaults
- nested-schema probe accepted omission and injected `read_only`
- full-response probe accepted omission and injected `read_only`

Why this is real:

- the epic marks `accessMode` as required-present
- source writability is a first-class Epic 3 behavior surface
- defaulting to `read_only` is safer than defaulting to `read_write`, but it still masks a malformed server payload
- this is exactly the kind of silent contract drift the round was supposed to flush out

Severity:

- MUST FIX

One-line fix instruction:

- remove `.default('read_only')` from process-surface and mirrored source-summary schemas so missing writability fails parse

#### M-5 — Regression tests do not currently enforce failure on those missing required nested fields

Files:

- `tests/service/client/process-live.test.ts:374-425`
- add new parser-regression coverage in client contract tests

Current state:

- there are already negative tests for a missing top-level `environment`
- there are already negative live-message tests for missing `statusLabel`
- there are no matching negative tests for missing `lastCheckpointResult`, `controls`, `hasEnvironment`, or `accessMode`

Why this matters:

- without negative tests, the just-fixed defaults can easily come back
- the current test suite proves only the top-level shape, not these nested required fields

Severity:

- MUST FIX as closure support for M-1 through M-4

One-line fix instruction:

- add parser-regression tests that assert missing required nested fields fail parse in bootstrap and action responses

### SHOULD FIX

#### S-1 — `HydrationPlan.fingerprint` is still hard-coded to `''`

File:

- `apps/platform/server/services/processes/environment/process-environment.service.ts:1306-1313`

Current code:

- `fingerprint: ''`

Independent verification:

- direct source read confirms the placeholder
- no current code path uses that adapter-facing fingerprint for stale detection
- Convex still computes and persists the real fingerprint at `convex/processEnvironmentStates.ts:483-490` and `:577-585`

Why this is not MUST FIX:

- stale detection still works on the production path
- the adapter field is presently vestigial rather than correctness-critical

Why it still deserves work:

- the adapter contract is lying end-to-end
- future maintainers will assume the adapter sees the real digest

One-line fix instruction:

- thread the persisted `workingSetFingerprint` into `buildAdapterHydrationPlan` or remove the field from the adapter contract until it is real

#### S-2 — checkpoint execution uses mismatched outer and inner dependency guards

File:

- `apps/platform/server/services/processes/environment/process-environment.service.ts:602-613`
- `apps/platform/server/services/processes/environment/process-environment.service.ts:693-700`

Current code:

- outer branch runs when any of three conditions is true
- inner branch returns unless both `checkpointPlanner` and `codeCheckpointWriter` are defined

Independent verification:

- direct source read confirms the asymmetry
- production wiring currently sets them together, so the bug is latent

Why this is not MUST FIX:

- I found no current production misconfiguration path that triggers it

Why it still deserves work:

- it creates a silent no-op path under partial wiring
- it is easy to harden now

One-line fix instruction:

- collapse the checkpoint-dependency conditions into one invariant and fail loud if the configuration is partial

#### S-3 — `InMemoryPlatformStore` does not emulate Convex read-time stale projection

Files:

- `apps/platform/server/services/projects/platform-store.ts:1570-1575`
- production reference: `convex/processEnvironmentStates.ts:378-386`

Current code:

- InMemory store just clones the stored environment summary
- Convex store recomputes the current fingerprint and projects `ready` to `stale` at read time

Independent verification:

- direct source read confirms the divergence

Why this is not MUST FIX:

- production path uses Convex
- Convex unit tests cover the real stale-projection behavior

Why it still deserves work:

- end-to-end tests using the InMemory seam cannot cover this production behavior
- it reduces test-fidelity for one of Epic 3’s distinctive durability features

One-line fix instruction:

- either emulate stale projection in the InMemory seam or add an explicit integration harness note plus focused Convex-backed verification for stale reads

#### S-4 — project-level mirror schema still defaults `sourceAttachmentSummary.accessMode`

File:

- `apps/platform/shared/contracts/schemas.ts:154-159`

Current code:

- `accessMode: sourceAccessModeSchema.default('read_only')`

Independent verification:

- direct source read confirms the mirror default

Why it is not part of the verdict-driving must-fix family:

- the ship decision turns on the process-surface parser entrypoints

Why it still deserves work:

- it duplicates the same masking pattern in a sibling contract
- the process shell and related source surfaces should not silently invent writability either

One-line fix instruction:

- remove the mirrored `accessMode` default in `schemas.ts` during the same patch that fixes the process-surface contract

### ACCEPTED-RISK

#### A-1 — response composer still gates on `availableActions.includes('respond')`

File:

- `apps/platform/client/features/processes/process-work-surface-page.ts:190-193`

Independent verification:

- direct source read confirms the composer gate
- the actual button rendering still comes from `process.controls` at `:131-161`

Why this is accepted-risk:

- the spec language in `tech-design-client.md:99-103` is specifically about rendering the stable visible control area
- the response composer is not one of the visible control buttons
- `availableActions` is still explicitly kept for backward-compatible action checks

Disposition:

- acceptable to ship after M-1 through M-5

#### A-2 — `providerKind` is nullable in the Convex env-state row

File:

- `convex/processEnvironmentStates.ts:49-52`
- `convex/processEnvironmentStates.ts:553-557`

Independent verification:

- direct source read confirms `providerKind: v.union(..., v.null())`
- initial hydration-plan row creation inserts `providerKind: null`

Why this is accepted-risk:

- the runtime resolves authoritatively via `getProcessEnvironmentProviderKind() ?? defaultEnvironmentProviderKind`
- current action paths always materialize a real provider before use
- I found no behavioral break on the current tree

Disposition:

- acceptable to ship after the must-fix family lands

#### A-3 — `ENV_STATES_WITH_ENVIRONMENT` omits `unavailable`

File:

- `convex/processEnvironmentStates.ts:72-81`

Independent verification:

- direct source read confirms omission

Important nuance:

- I did not find any current mutation that persists `state='unavailable'`
- the main process-surface projection already compensates for unavailable reads at `process-work-surface.service.ts:294-300`

Why this is accepted-risk:

- the bug is latent rather than currently exercised
- it is more of a future-semantic trap than a present Epic 3 failure

Disposition:

- acceptable to ship after the must-fix family lands, but worth clarifying later

#### A-4 — client synthesized environment state still recomputes `statusLabel`

File:

- `apps/platform/client/app/process-live.ts:79-88`
- `apps/platform/client/app/process-live.ts:159-161`

Independent verification:

- direct source read confirms the synthesized `normalizeEnvironmentState()` path

Why this is accepted-risk:

- it only runs on a narrow waiting-transition synthesis path
- server-sourced environment payloads still carry the authoritative label
- the direct Item 10 regression from Round 1 is closed in `process-environment-panel.ts`

Disposition:

- acceptable to ship after the must-fix family lands

#### A-5 — tech-design index sketch still shows a 7-method adapter contract

Files:

- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/tech-design.md:213-221`
- refined contract: `tech-design-server.md:573-591`
- implementation: `provider-adapter.ts:129-147`

Independent verification:

- direct doc and code read confirms the drift

Why this is accepted-risk:

- this is documentation drift
- the refined server tech design and implementation agree with each other

Disposition:

- acceptable to ship after the must-fix family lands

#### A-6 — `NullPlatformStore.hasCanonicalRecoveryMaterials()` always returns `true`

File:

- `apps/platform/server/services/projects/platform-store.ts:838-840`

Independent verification:

- direct source read confirms the unconditional `true`

Why this is accepted-risk:

- it is confined to the null-object seam
- the live production path does not use `NullPlatformStore`
- no reviewer showed a real production behavior break from it

Disposition:

- acceptable to ship after the must-fix family lands

### NOISE

#### N-1 — GPT53’s overbroad list of "required-default" blockers is not calibrated

Files it overcalled:

- `process-work-surface.ts:164`
- `process-work-surface.ts:217`
- `process-work-surface.ts:219`
- `process-work-surface.ts:234`
- `process-work-surface.ts:237`
- `process-work-surface.ts:238`
- `process-work-surface.ts:243`
- `process-work-surface.ts:414`
- `process-work-surface.ts:422`

Why this is noise:

- `disabledReason`, `targetRef`, `failureReason`, `environmentId`, `blockedReason`, `lastHydratedAt`, and `lastCheckpointAt` are optional-present fields per the epic
- `rehydrate` and `rebuild` response tables do not require `currentRequest`

Spec anchors:

- `epic.md:583-588`
- `epic.md:609`
- `epic.md:655-671`
- `epic.md:700-702`

Disposition:

- reviewer false positive

#### N-2 — "integration tests use InMemoryPlatformStore" is not a defect by itself

Why this is noise:

- it is a testing topology fact
- it becomes a finding only when paired with an uncovered production-only behavior
- that production-only behavior is already captured separately as S-3

Disposition:

- do not count it as its own issue

#### N-3 — the old tautological control-order test defect is closed on the current tree

Files:

- current test: `tests/service/server/process-foundation-contracts.test.ts:23-37`
- fixture: `tests/fixtures/process-controls.ts:1-10`

Independent verification:

- the test now checks `buildProcessSurfaceSummary(...).controls.map(...)`
- it no longer compares `processSurfaceControlOrder` directly to a copied array literal

Why this matters:

- the current test is still not the strongest possible regression guard
- but it is not the same tautology described in the addendum’s historical item 14

Disposition:

- historical blocker is closed

#### N-4 — missing markdown deliverable is a reviewer-quality issue, not a code issue

Applies to:

- `gpt53-codex-xhigh`

Why this is noise in the code synthesis:

- it affects reviewer scoring
- it does not change the code state

Disposition:

- score the reviewer down
- do not count it as a product defect

## 6. Where Reviewers Diverged And Which Side Was Right

### The split

`SHIP` side:

- `sonnet-adversarial`
- `opus-adversarial`

`REVISE` side:

- `gpt54-xhigh`
- `gpt53-codex-xhigh`

### What both sides agreed on

All four reviewers agreed on the facts:

- the four defaults exist
- they are located in the shared work-surface contracts
- production wiring is otherwise real
- gates are green

This was never an evidence dispute.

It was a severity dispute.

### My independent evidence

Direct contract evidence:

- `apps/platform/shared/contracts/process-work-surface.ts:244-246`
- `apps/platform/shared/contracts/process-work-surface.ts:258-259`
- `apps/platform/shared/contracts/process-work-surface.ts:324-329`

Production parser entrypoints:

- `apps/platform/client/browser-api/process-work-surface-api.ts:106`
- `apps/platform/client/browser-api/process-work-surface-api.ts:128`
- `apps/platform/client/browser-api/process-work-surface-api.ts:150`
- `apps/platform/client/browser-api/process-work-surface-api.ts:172`
- `apps/platform/client/browser-api/process-work-surface-api.ts:194`

Spec-required presence:

- `epic.md:589` — `lastCheckpointResult` is required-present
- `epic.md:620` — `controls` is required-present
- `epic.md:621` — `hasEnvironment` is required
- `epic.md:634` — `accessMode` is required

Client-design intent:

- `tech-design-client.md:99-103` says the browser should render from the full `controls` array so disabled controls remain visible

My nested-schema probe output:

```json
{
  "environmentSuccess": true,
  "parsedLastCheckpointResult": null,
  "processSuccess": true,
  "parsedControlsLength": 7,
  "parsedHasEnvironment": false,
  "sourceSuccess": true,
  "parsedAccessMode": "read_only"
}
```

My full-response probe output:

```json
{
  "bootstrapSuccess": true,
  "bootstrap": {
    "lastCheckpointResult": null,
    "controlsLength": 7,
    "hasEnvironment": false,
    "accessMode": "read_only"
  },
  "startSuccess": true,
  "start": {
    "lastCheckpointResult": null,
    "controlsLength": 7,
    "hasEnvironment": false
  }
}
```

### Resolution

The REVISE side was right on the ship decision.

Why:

- the spec says those fields are required-present
- the current production client silently accepts their omission
- the omission is not hypothetical; I reproduced it
- this is exactly a fail-fast contract defect, not merely stylistic cleanup

The SHIP side was still right about two things:

- this defect does not rise to `BLOCK`
- the rest of Epic 3 is substantively implemented and passing

So the correct synthesis is:

- GPT-5.4 had the right release calibration
- Opus and Sonnet had the better breadth on non-blocking secondaries
- GPT53 was directionally aligned on REVISE, but too thin and too broad

## 7. What The Addendum Got Wrong

Short answer:

- yes, the addendum’s classification of the four residual required-with-default contract fields as "non-blocking future cleanup" was wrong

Relevant addendum text:

- `implementation-addendum.md:53-57`

What the addendum said:

- those four defaults were "not Epic 3 acceptance gates"
- they "do not affect Epic 3 behavior"

What my verification shows:

- they do affect Epic 3 parser behavior on the actual production response schemas
- they do not currently break happy-path behavior because the server usually sends the fields
- they do break fail-fast contract behavior because malformed payloads are silently normalized

The precise correction is:

- the addendum was right that these are not `BLOCK` class defects
- the addendum was wrong that they are `SHIP`-safe

I would restate the addendum now as:

- "Residual contract-hardening must-fix before SHIP; not a runtime foundation blocker"

Which of the four were misclassified?

- `environment.lastCheckpointResult`
- `process.controls`
- `process.hasEnvironment`
- `processSourceReference.accessMode`

Why each misclassification matters:

- `lastCheckpointResult`: collapses "missing field" into "null checkpoint result"
- `controls`: collapses "missing control truth" into "fabricated disabled control set"
- `hasEnvironment`: collapses "missing field" into a false semantic statement
- `accessMode`: collapses "missing writability truth" into an invented read-only mode

What the addendum did get right:

- the major Round 1 foundation gaps really are closed
- production defaults are no longer fake
- the remaining dispute is narrow

What else in the addendum is stale rather than wrong:

- the frozen test counts at `implementation-addendum.md:44-46` no longer match the current tree

## 8. Fix List With Effort Estimates

### P0 — contract-hardening patch required before SHIP

#### Fix P0-1

Files:

- `apps/platform/shared/contracts/process-work-surface.ts`

Changes:

- remove `.default(...)` from:
- `environmentSummarySchema.lastCheckpointResult`
- `processSurfaceSummarySchema.controls`
- `processSurfaceSummarySchema.hasEnvironment`
- `processSourceReferenceSchema.accessMode`

Effort:

- `0.5-1` engineer-hours

Risk:

- low

Why first:

- this is the only verdict-driving issue

#### Fix P0-2

Files:

- `apps/platform/shared/contracts/schemas.ts`

Changes:

- remove mirrored `sourceAttachmentSummarySchema.accessMode` default

Effort:

- `<0.5` engineer-hours

Risk:

- low

Why with P0-1:

- same contract family
- same masking pattern

#### Fix P0-3

Files:

- `tests/service/client/process-live.test.ts` or a new focused contract parser test file

Changes:

- add parse-negative tests for missing:
- `environment.lastCheckpointResult`
- `process.controls`
- `process.hasEnvironment`
- `processSourceReference.accessMode`

Effort:

- `1-2` engineer-hours

Risk:

- low

Why required:

- this is the regression net that prevents the same issue from returning

#### Fix P0-4

Validation after patch:

- rerun `corepack pnpm run verify`
- rerun `corepack pnpm run test:integration`
- rerun the same `tsx` probe and confirm all malformed payloads now fail parse

Effort:

- `<0.5` engineer-hours

Risk:

- low

### P1 — worthwhile non-blocking follow-up

#### Fix P1-1

File:

- `apps/platform/server/services/processes/environment/process-environment.service.ts`

Changes:

- thread real `workingSetFingerprint` into `HydrationPlan`

Effort:

- `1-2` engineer-hours

Risk:

- low to medium

#### Fix P1-2

File:

- `apps/platform/server/services/processes/environment/process-environment.service.ts`

Changes:

- align checkpoint dependency guards
- optionally assert impossible partial configuration at construction time

Effort:

- `<1` engineer-hour

Risk:

- low

#### Fix P1-3

File:

- `apps/platform/server/services/projects/platform-store.ts`

Changes:

- decide whether to emulate stale projection in the InMemory seam or explicitly document that Convex-only behavior remains unit-tested but not integration-tested

Effort:

- `1-3` engineer-hours

Risk:

- low

### P2 — future cleanup and documentation

#### Fix P2-1

File:

- `apps/platform/client/features/processes/process-work-surface-page.ts`

Changes:

- gate the response composer from `process.controls` rather than `availableActions`

Effort:

- `<0.5` engineer-hours

Risk:

- very low

#### Fix P2-2

File:

- `apps/platform/client/app/process-live.ts`

Changes:

- remove or narrow the synthetic `statusLabel` recompute path if a paired environment message is always available

Effort:

- `<1` engineer-hour

Risk:

- low

#### Fix P2-3

Files:

- `convex/processEnvironmentStates.ts`
- corresponding docs/tests

Changes:

- clarify or codify whether `unavailable` should count as environment-present for `processes.hasEnvironment`

Effort:

- `1-2` engineer-hours

Risk:

- low to medium because shell summaries may depend on the chosen semantics

#### Fix P2-4

Files:

- `tech-design.md`
- optionally `implementation-addendum.md`

Changes:

- reconcile the index-level 7-method adapter sketch with the refined server contract
- update the addendum note about residual defaults so it reflects the revised ship decision

Effort:

- `<1` engineer-hour

Risk:

- none

## 9. Ship Readiness Grade

Current grade:

- `B`

One-sentence rationale:

- the runtime and durability foundations are now real and passing, but the client still fail-softs required Epic 3 contract fields and therefore the tree is not clean enough to ship as-is

Grade after P0 fixes:

- `A-`

One-sentence rationale:

- after removing the required-field defaults and adding parser-regression coverage, I would be comfortable upgrading this from `REVISE` to `SHIP`

Distance to SHIP:

- close

Estimated delta to SHIP:

- one short contract-hardening patch
- one small regression-test patch
- one quick re-verify pass

## 10. Final Synthesis Summary

What is definitely true on the current tree:

- gates pass
- production no longer defaults to fake provider or fake code writer paths
- artifact checkpointing is real through Convex file storage
- code checkpointing is real through Octokit
- stale detection is real through stored fingerprint plus read-time comparison
- source writability is durable
- fire-and-forget failures no longer silently disappear

What is still not clean enough:

- required Epic 3 contract fields are still being defaulted by the production client parsers

Who was most right:

- `gpt54-xhigh` on the ship decision
- `opus-adversarial` on breadth and supporting evidence

Who was least reliable for synthesis:

- `gpt53-codex-xhigh`

Final ship call:

- `REVISE`

Minimal unblock:

- remove the required-field defaults
- add negative parser tests
- rerun the two gates

If that patch lands cleanly:

- I would expect Epic 3 to be ready for `SHIP`
