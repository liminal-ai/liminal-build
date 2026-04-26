# Epic 3 Pre-Verification Cleanup (Historical)

Historical note:

This document captures pre-round-2 triage only. It is retained for lineage, but
it is not the current Epic 3 status source of truth. Use
`implementation-addendum.md` for the current post-fix implementation and
closure state. A fresh reader should treat the sections below as superseded
historical context unless a later document points back to a specific item.

Compiled from all story-cycle verification artifacts (Stories 0-6).

## Triaged: Fix Now (trivial, cheaper to fix than track)

1. **`deriveProcessSurfaceAvailableActions` may be dead code** (Story 1 defer)
   - Story 1 introduced `process.controls` as the primary control model.
     `availableActions` is still populated for backward compat, but
     `deriveProcessSurfaceAvailableActions` might be unreferenced.
   - Action: grep for references. If dead, delete. If still used, leave.

2. **Fixture traceability drift: `tests/fixtures/process-surface.ts` pairs
   `environment: preparing` with `process.status: running`** (Story 2 nonblocking)
   - Story 2's contract is that process stays at pre-resume status during
     preparation. Fixture is misleading.
   - Action: update fixture to use `status: 'paused'` or `status: 'draft'`
     (whatever the accepted pre-preparation status is) when environment is
     `preparing`. Only if no test depends on the current pairing.

3. **Untested fallback `blockedReason` string (`'Execution failed.'`)** (Story 3 W-3)
   - The `?? 'Execution failed.'` null-coalesce in
     `process-environment.service.ts` is never driven by a test.
   - Action: add one tiny test that drives an execution error with
     `undefined` message and asserts the fallback string appears.

## Triaged: Already Fixed (no action needed)

4. **Missing-source-metadata fail-open fallback** — FIXED in Story 4 verification
   (changed to fail-closed `??= 'read_only'`).

5. **Prerequisite-missing check duck-typing** — FIXED in Story 5 verification
   (refactored to proper `PlatformStore.hasCanonicalRecoveryMaterials`).

6. **`'rehydrating'` missing from Convex validator** — FIXED in Story 5 verification.

7. **Story 0 shared rehydrate/rebuild groundwork** — DELIVERED in Story 5.

8. **Story 0 environment fixture gaps** — ADDRESSED across Stories 1-6.

9. **Story 1 convex/processEnvironmentStates.test.ts** — DELIVERED in Story 4.

## Triaged: Genuine Defer (not this epic's scope)

10. **Real provider integration (Daytona/Local)** — boundary inventory item.
    All providers are stubs. Deferred to provider-integration epic.

11. **Real GitHub code-checkpoint writer** — boundary inventory item.
    `@octokit/rest` not installed; `StubCodeCheckpointWriter` only. Deferred.

12. **`convex codegen` against live backend** — requires running Convex dev
    server. Consistently non-gating across all stories. Deferred.

13. **`ExecutionResult` can't emit `waiting` outcome** — server execution
    contract only carries `succeeded`/`failed`. Client supports `waiting`
    rendering. Deferred until execution-driven waiting semantics land.

14. **Secondary fire-and-forget failures swallowed** — operational hardening.
    The catch-all in `runExecutionAsync`/`runCheckpointAsync` prevents
    unhandled rejections but hides secondary store/publication errors.
    Deferred to observability hardening.

15. **TC-4.1b carry-forward is seeded state, not literal end-to-end chain**
    — integration test seeds durable checkpoint state and verifies reopen,
    but doesn't drive the full write→recovery→reopen sequence in one test.
    Adequate for Story 6 acceptance. Deferred to integration expansion.

16. **Thin server TC-3.4a legibility assertion** (Story 3 W-2)
    — server test checks entity presence not payload content. Client TC-3.4b
    covers the full invariant. Accepted-risk.

## Cleanup Disposition

Items 1-3 are the fix candidates. Items 4-9 already resolved. Items 10-16
are genuine defers that don't block epic acceptance.
