# Convergence Round 1b — Sonnet Response

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-04-15  
**Original verdict:** PASS  
**Codex blocking finding:** Action services call `buildProcessSurfaceSummary` without environment; controls derived from `absent` fallback after start/resume/respond

---

## 1. What I retract

**AC-1.4 SATISFIED was wrong.** I verified the bootstrap read path; I did not verify the action response path. These are separate obligations and I only checked one.

The code confirms the gap:

- `process-start.service.ts:35` — `buildProcessSurfaceSummary(result.process)` — no environment
- `process-resume.service.ts:35` — `buildProcessSurfaceSummary(result.process)` — no environment
- `process-response.service.ts:50,68` — `buildProcessSurfaceSummary(existing.process)` / `buildProcessSurfaceSummary(result.process)` — no environment

`buildProcessSurfaceSummary` defaults to `fallbackEnvironmentSummary` (`state: 'absent'`, `process-work-surface.service.ts:75–77`). `resolveStartControlState('absent')` and `resolveResumeControlState('absent')` both return `enabledState()` (lines 126, 152). So a process with a durable `stale` environment gets `start.enabled = true` and `resume.enabled = true` in action responses — directly contradicting what `getSurface` would return for the same process.

---

## 2. What I still stand behind

- The bootstrap path is correct: `DefaultProcessWorkSurfaceService.getSurface` reads environment via `EnvironmentSectionReader` and passes it at `process-work-surface.service.ts:404`.
- The derivation logic in `buildProcessSurfaceSummary` is correct; the gap is at the call sites.
- Schema, storage layer (Convex), and `EnvironmentSectionReader` are correctly implemented.
- AC-1.1, AC-1.2, AC-1.3, AC-1.5 findings stand.

---

## 3. What now looks weaker or stronger

**Weaker — AC-1.4 HIGH confidence.** The same-session action response path is a direct AC-1.4 obligation: environment truth must come from durable state, not a hardcoded fallback. Action responses are primary client-facing output; a client holding a stale-correct, start-enabled response will show enabled controls that the next `getSurface` will disable.

**Stronger — the original fallback concern.** I flagged `fallbackEnvironmentSummary` as a potential trap in the original review. I then dismissed it as safe because `getSurface` passes environment. That was the error — the three action services were not in scope of that check and they all hit the trap.

---

## 4. Smallest check that resolves the disagreement

In `process-actions-api.test.ts`: seed `InMemoryPlatformStore` with `state: 'stale'` for the target process via `upsertProcessEnvironmentSummary`. Call `POST /processes/:id/start` (draft→running) or `POST /processes/:id/resume`. Assert the returned `process.controls.start.enabled === false` (or `resume.enabled === false`) with `disabledReason` containing `"Rehydrate"`.

The code as written fails this assertion — the absent fallback enables both controls. That outcome confirms the finding is blocking.

---

## Revised verdict on AC-1.4

**FAIL** — action services do not read environment state before building the returned surface summary. Bootstrap satisfies AC-1.4; action responses do not.
