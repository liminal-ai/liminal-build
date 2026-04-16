# Convergence Round 1 — Sonnet Response

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-04-15
**Original verdict:** PASS
**Codex blocking finding:** Action services call `buildProcessSurfaceSummary` without environment; controls derived from absent-fallback after start/resume/respond

---

## 1. What I retract

**Post-review note #3 was wrong.** I wrote: "This is safe for Story 1 since the service now always passes the environment." That claim was false. `getSurface` passes environment; `ProcessStartService`, `ProcessResumeService`, and `ProcessResponseService` do not. The three callers at issue are:

- `process-start.service.ts:35` — `buildProcessSurfaceSummary(result.process)`
- `process-resume.service.ts:35` — `buildProcessSurfaceSummary(result.process)`
- `process-response.service.ts:50,68` — `buildProcessSurfaceSummary(existing.process)` and `buildProcessSurfaceSummary(result.process)`

All three use the `fallbackEnvironmentSummary` default (`state: 'absent'`).

**My AC-1.4 SATISFIED verdict was overconfident.** I validated that the bootstrap read path draws from durable state. I did not validate whether action responses propagate durable environment truth in their returned summaries. Those are two different obligations, and I only checked one.

---

## 2. What I still stand behind

- The bootstrap path is correct: `DefaultProcessWorkSurfaceService.getSurface` reads environment via `EnvironmentSectionReader → PlatformStore.getProcessEnvironmentSummary` and passes it to `buildProcessSurfaceSummary`. The Convex schema and storage layer are correctly implemented.
- All 199 tests pass as reported. The test coverage for the bootstrap read path and control derivation logic is legitimate.
- The architecture is structurally sound: `buildProcessSurfaceSummary` accepts environment as a parameter; the gap is at the call sites, not in the derivation logic.
- AC-1.1, AC-1.2, AC-1.3, AC-1.5 findings stand.

---

## 3. What looks weaker or stronger

**Weaker — AC-1.4 SATISFIED.**  
The durable-state requirement covers more than bootstrap reads. If an action response returns `process.controls.start.enabled = true` (absent fallback) when the environment is actually `stale` (which should disable start), a client holding that response has incorrect control state until a full reload. That is same-session truth contradiction. My original confidence rating of HIGH for AC-1.4 was not earned.

**Stronger — the post-review fallback trap observation.**  
Note #3 correctly identified the absent-fallback as a soft trap but then dismissed it prematurely. Codex's finding validates the concern. The dismissal "safe for Story 1" was the error, not the observation.

---

## 4. Smallest check that resolves the disagreement

In `process-actions-api.test.ts`, seed `InMemoryPlatformStore` with a `stale` environment state for the target process (via `upsertProcessEnvironmentSummary`) before calling `POST /processes/:id/start` (draft→running) or `POST /processes/:id/resume`.

Assert that the returned `process.controls` includes `start.enabled = false` (or `resume.enabled = false`) with reason `"Rehydrate the environment before starting the process."`.

If the action services don't read environment state, the response will have `start.enabled = true` (absent fallback path enables start). That outcome confirms the finding is blocking. If the assertion passes, the services are reading environment state through some path not visible in the source — which would need to be explained.

**The check is one test case, one assertion. The code as written will fail it.**

---

## Revised verdict on AC-1.4

**FAIL** — the action response path does not satisfy the requirement that environment truth comes from durable state. The bootstrap satisfies it; the action services do not. This is a blocking gap under Story 1's AC-1.4 scope.
