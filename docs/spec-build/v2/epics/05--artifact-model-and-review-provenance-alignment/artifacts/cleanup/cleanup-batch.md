# Epic 5 Cleanup Batch

## Deferred Items (from story receipts)

### S0-F3: processPackageContexts.test.ts (RESOLVED)
- Origin: Story 0 verifier finding, deferred to Story 4 per test plan
- Status: Resolved in Story 4 — convex tests went from 55 to 60, file now exists
- Action needed: none

## Accepted-Risk Items

None across all 6 stories.

## Spec Deviations Noted Across Stories

### SD-1: PlatformStore review composition surface
- Noted in: Story 4 self-review, Story 5 self-review, Story 5 implementor
- Description: PlatformStore still owns part of the review/package composition surface through `listProcessReviewTargets` and `getProcessReviewPackage` instead of the fully narrowed durable-facts-only boundary described in the Epic 5 server tech design.
- Impact: Architectural — the behavior is correct but the service boundary is wider than the tech design specifies. Review policy lives in PlatformStore methods rather than in dedicated review-owned services.
- Recommendation: Architectural cleanup in a follow-on pass, not a functional gap.

### SD-2: InMemoryPlatformStore test-store compatibility shim
- Noted in: Story 2 self-review (both initial and post-fix)
- Description: InMemoryPlatformStore carries a synthetic artifact-version fallback for seeded test data that lack explicit version rows.
- Impact: Test infrastructure only — not a production path.
- Recommendation: Clean up when test fixtures are fully migrated to explicit version rows.

### SD-3: Legacy optional ownership fields in ArtifactSummary TypeScript shape
- Noted in: Story 2 self-review
- Description: ArtifactSummary TypeScript shape still tolerates legacy optional ownership fields for fixture compatibility even though the runtime schema/output strips them.
- Impact: Type-level only — runtime behavior is correct.
- Recommendation: Remove optional fields once all fixture references are updated.

## Summary

- 0 items requiring cleanup dispatch (only deferred item already resolved)
- 3 spec deviations noted as architectural/infrastructure cleanup for later
