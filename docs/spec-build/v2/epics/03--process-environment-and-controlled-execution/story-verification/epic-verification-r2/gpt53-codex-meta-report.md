# Phase 2 Meta-Report (Compact)
Reviewer: `gpt53-codex-xhigh`
Round: `epic-verification-r2`
Date: `2026-04-16`
Scope: JSON-only comparison of 4 reviews.
Constraint: no spec re-reads; no full-review re-reads.
Compared artifacts:
- `gpt53-codex-xhigh-review.json` (self Phase 1)
- `sonnet-adversarial-review.json`
- `opus-adversarial-review.json`
- `gpt54-xhigh-review.json`

## 1) Ranking Of The 3 Other Reviews
1. `gpt54-xhigh` — best signal-to-noise, correct release gate, and direct proof that required-field defaults mask malformed payloads.
2. `opus-adversarial` — broad, mostly accurate edge-case sweep; weaker prioritization because it downgrades the key contract violation.
3. `sonnet-adversarial` — useful adversarial probes, but over-indexes on speculative non-blockers and underweights the primary contract breach.

## 2) Convergent Findings (All 4 Reviewers)
- CF-1: test/gate execution is green in all reviews.
- CF-1 evidence: all four set `gateRan: true`.
- CF-1 evidence: all four set `gateExitCode: 0`.
- CF-1 evidence: all four report same test counts.
- CF-1 evidence: convex `35`.
- CF-1 evidence: service `163`.
- CF-1 evidence: client `156`.
- CF-1 evidence: integration `12`.

- CF-2: required-field Zod defaults still exist in shared work-surface contracts.
- CF-2 evidence: self marks this as blocking contract mismatch.
- CF-2 evidence: gpt54 marks same issue as blocking B-1.
- CF-2 evidence: sonnet lists same defaults as NB-2.
- CF-2 evidence: opus lists same defaults across NB-1..NB-4.
- CF-2 affected field: `environment.lastCheckpointResult`.
- CF-2 affected field: `process.controls`.
- CF-2 affected field: `process.hasEnvironment`.
- CF-2 affected field: `processSourceReference.accessMode`.

- CF-3: core Epic 3 implementation is largely functionally present.
- CF-3 evidence: no reviewer reports AC violations.
- CF-3 evidence: no reviewer reports TC violations.
- CF-3 evidence: self structural checks are broadly true.
- CF-3 evidence: sonnet and opus both return SHIP (despite caveats).
- CF-3 evidence: gpt54 finds only one blocking family.

- CF-4: stale/readiness fingerprint path is operational at runtime.
- CF-4 evidence: self confirms compute-on-write and compare-at-read checks true.
- CF-4 evidence: gpt54 says stale detection still works despite empty adapter-plan fingerprint.
- CF-4 evidence: sonnet says durable fingerprint path is correct; adapter field is dead.
- CF-4 evidence: opus says no behavioral impact from empty adapter-plan fingerprint.

- CF-5: most additional defects identified by peers are non-blocking quality debt.
- CF-5 evidence: sonnet tags all seven findings nonblocking minor.
- CF-5 evidence: opus tags all eight findings nonblocking minor/trivial.
- CF-5 evidence: gpt54 tags only one secondary nonblocking finding.
- CF-5 evidence: self has no second blocker family.

## 3) Divergent Findings (Disagreement + Adjudication)
- DF-1 topic: release severity of required-field defaults.
- DF-1 disagreement: self + gpt54 => `REVISE`.
- DF-1 disagreement: sonnet + opus => `SHIP` with nonblocking notes.
- DF-1 right side: self + gpt54.
- DF-1 why: round brief explicitly requires no defaults on required fields.
- DF-1 why: defaulting hides contract regressions by auto-filling missing server truth.
- DF-1 why: gpt54 validated parse acceptance of malformed payloads.
- DF-1 why: this is contract integrity, not just style.
- DF-1 impact: can silently distort controls/access/checkpoint visibility.
- DF-1 adjudication: blocker until defaults removed from required fields.

- DF-2 topic: scope of required fields currently defaulted.
- DF-2 disagreement: peers emphasize 4 high-visibility fields.
- DF-2 disagreement: self flags a broader required-default set in same contract module.
- DF-2 right side: combined stance with conservative unblock criteria.
- DF-2 why: minimum unblock must include the common 4 everyone cites.
- DF-2 why: safer remediation audits all required-default hits from self list.
- DF-2 why: partial cleanup risks another hidden parse mask.
- DF-2 adjudication: unblock on full required-field audit, not just 4-line patch.

- DF-3 topic: InMemoryPlatformStore lacks read-time fingerprint stale projection.
- DF-3 disagreement: sonnet + opus flag as nonblocking test-surface gap.
- DF-3 disagreement: self + gpt54 do not elevate it.
- DF-3 right side: sonnet/opus are directionally right on coverage gap.
- DF-3 why: integration stack using in-memory store cannot prove Convex query projection end-to-end.
- DF-3 why: Convex unit tests already cover projection behavior.
- DF-3 why: production path uses Convex store, reducing runtime risk.
- DF-3 adjudication: keep nonblocking; add focused integration seam test if feasible.

- DF-4 topic: composer gating by `availableActions` vs `process.controls`.
- DF-4 disagreement: only sonnet flags it.
- DF-4 right side: sonnet has a valid consistency concern.
- DF-4 why: Epic direction is controls-driven rendering.
- DF-4 why: composer is not the primary action-button renderer.
- DF-4 why: mismatch appears low-risk and localized.
- DF-4 adjudication: nonblocking cleanup for UI contract consistency.

- DF-5 topic: nullable `providerKind` in Convex table schema.
- DF-5 disagreement: only sonnet flags this as spec-shape drift.
- DF-5 right side: implementation side mostly acceptable.
- DF-5 why: null appears transient bootstrap state before provider selection.
- DF-5 why: no functional failure evidence presented.
- DF-5 why: stricter schema could be cleaner but may require migration choreography.
- DF-5 adjudication: document intent or tighten schema in future migration.

- DF-6 topic: `HydrationPlan.fingerprint` passed as empty string to adapter.
- DF-6 disagreement: sonnet/opus/gpt54 flag; self did not call it out in Phase 1.
- DF-6 right side: peers are correct to flag; severity remains nonblocking.
- DF-6 why: current stale detection path remains correct via Convex-computed fingerprint.
- DF-6 why: adapter contract fidelity is degraded.
- DF-6 why: keeping dead/placeholder fields invites confusion.
- DF-6 adjudication: should fix soon, but not release-blocking for Epic outcome.

- DF-7 topic: checkpoint fire-and-forget guard inconsistency.
- DF-7 disagreement: only sonnet reports it.
- DF-7 right side: sonnet likely right on defensive-code quality.
- DF-7 why: outer trigger condition and inner guard differ.
- DF-7 why: misconfigured dependency combinations could silently no-op.
- DF-7 why: production wiring reportedly sets both dependencies together.
- DF-7 adjudication: nonblocking hardening task; add explicit invariant/assertion.

- DF-8 topic: `ENV_STATES_WITH_ENVIRONMENT` excludes `unavailable`.
- DF-8 disagreement: only sonnet reports semantics ambiguity.
- DF-8 right side: unresolved by evidence; ambiguity is real.
- DF-8 why: spec wording about `unavailable` vs `hasEnvironment` is interpretive.
- DF-8 why: no concrete bug evidence beyond semantic uncertainty.
- DF-8 adjudication: clarify product semantics; do not block release on current evidence.

- DF-9 topic: client recomputes `statusLabel` during synthesized transitions.
- DF-9 disagreement: only opus flags this.
- DF-9 right side: opus is right that it is a small contract impurity.
- DF-9 why: server-sourced label preference is the intent.
- DF-9 why: synthesized fallback path is narrow and low-risk.
- DF-9 adjudication: trivial cleanup, nonblocking.

- DF-10 topic: adapter interface “7-method sketch” vs refined 6-method server design.
- DF-10 disagreement: only opus flags doc drift context.
- DF-10 right side: opus is right; this is documentation-layer reconciliation.
- DF-10 why: implementation aligns with refined server tech design.
- DF-10 why: mismatch appears between index sketch and evolved contract.
- DF-10 adjudication: docs hygiene item only.

## 4) Updated Verdict
- Updated verdict: `REVISE` (unchanged).
- Change from peer input: confidence increased, direction unchanged.
- Why unchanged: the only cross-review critical issue is still unresolved.
- Why unchanged: both REVISE reviewers independently converge on same blocker.
- Why unchanged: SHIP reviewers also acknowledge the same defaults exist.
- Why unchanged: disagreement is severity, not factual existence.
- Decision rule used: explicit round requirement beats “currently works” rationale.

## 5) Synthesis Recommendation (Single Best Verdict + Fix List)
- Best synthesized verdict: `REVISE` now, `SHIP` after a narrow contract-hardening patch set.

- SR-1 (P0 blocker): remove `.default(...)` from all required work-surface fields.
- SR-1 minimum required fields to fix immediately:
- SR-1 field: `environment.lastCheckpointResult`.
- SR-1 field: `process.controls`.
- SR-1 field: `process.hasEnvironment`.
- SR-1 field: `processSourceReference.accessMode`.
- SR-1 completion check: malformed payload missing any required field must fail parse.

- SR-2 (P0 blocker): run a full required-field default audit in `process-work-surface.ts`.
- SR-2 reason: self Phase 1 identified additional required-default candidates.
- SR-2 action: verify each flagged field against required/nullable semantics.
- SR-2 action: keep nullable fields nullable, but still required-present when spec says so.
- SR-2 action: do not rely on schema defaults to infer server truth.

- SR-3 (P0 blocker): add regression tests that enforce required-field parse failures.
- SR-3 test type: contract parser tests with intentionally missing required keys.
- SR-3 test type: one test per required field family.
- SR-3 pass criterion: parser rejects with explicit validation error.

- SR-4 (P1 nonblocking): thread real fingerprint into `HydrationPlan` adapter input.
- SR-4 reason: keeps adapter contract truthful and removes dead-field ambiguity.
- SR-4 note: stale detection already works; this is correctness hygiene.

- SR-5 (P1 nonblocking): align optional composer gating with `process.controls`.
- SR-5 reason: eliminates mixed rendering criteria in client surface.

- SR-6 (P1 nonblocking): tighten checkpoint dependency guard invariants.
- SR-6 reason: avoid silent no-op if dependency set is partially configured.

- SR-7 (P2 docs/semantics): resolve `unavailable` + `hasEnvironment` semantics explicitly.
- SR-7 reason: remove ambiguity for future maintainers and test authors.

- SR-8 (P2 test surface): optionally add integration seam asserting Convex stale projection path.
- SR-8 reason: complements existing Convex unit coverage when in-memory store is used elsewhere.

## Compact Bottom Line
- Common factual center: implementation is mostly solid and tested.
- Critical exception: required-field defaults still permit silent contract drift.
- Final recommendation: treat that exception as release-blocking.
- Ship condition: remove required-field defaults + add negative parser tests.

## Reviewer Snapshot (Compact)
- `gpt53-codex-xhigh`: strongest call is blocker severity on required-field defaults.
- `gpt53-codex-xhigh`: did not elevate adapter-plan fingerprint placeholder.
- `sonnet-adversarial`: strongest call is broad adversarial sweep of edge conditions.
- `sonnet-adversarial`: weakest call is SHIP despite acknowledging required-field defaults.
- `opus-adversarial`: strongest call is clear separation of implementation drift vs doc drift.
- `opus-adversarial`: weakest call is SHIP severity under explicit no-defaults brief.
- `gpt54-xhigh`: strongest call is empirical parse probe validating masking behavior.
- `gpt54-xhigh`: weakest call is narrower peripheral issue coverage than adversarial peers.
- Cross-check outcome: ranking stability remained unchanged after full JSON comparison.
- Confidence level in final synthesis: high.
- Primary uncertainty remaining: exact breadth of additional required-default fields beyond the shared four.
- Risk if shipped without P0 fix: silent client acceptance of malformed server contracts.
- Risk if revised per synthesis: low residual release risk, mostly hygiene follow-ups.
