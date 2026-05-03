# Epic 5 Cleanup Batch

## Deferred Items (from story receipts)

### S0-F3: processPackageContexts.test.ts (RESOLVED)
- Origin: Story 0 verifier finding, deferred to Story 4 per test plan
- Status: Resolved in Story 4 — convex tests went from 55 to 60, file now exists
- Action needed: none

## Accepted-Risk Items

### Checkpoint persistence boundary (ACCEPTED)
- Status: Accepted as shipped architecture
- Description: Convex executes atomic checkpoint persistence/upsert bundles and
  enforces cross-record integrity invariants, including same-project artifact
  validation. Fastify/process services own workflow intent: what to
  checkpoint, when, and why.
- Impact: Conscious boundary blur at the persistence-invariant layer, not a
  functional or architectural blocker.
- Action needed: none for Epic 5 closure

## Spec Deviations Noted Across Stories

### SD-1: PlatformStore review/package boundary drift (RESOLVED)
- Noted in: Story 4 self-review, Story 5 self-review, Story 5 implementor
- Status: Remediated after the Epic 5 merge by commits `f33ea92`,
  `849dcce`, and `b231ee6`
- Description: The earlier implementation left package/review policy too wide
  at the store boundary. Main now has `ReviewContextService` plus server-side
  review helpers for package publication/context policy. There is no separate
  `package-context.service.ts` class/file in the accepted shipped shape.
- Impact: Accepted implementation shape. No open cleanup item.
- Action needed: none

### SD-2: InMemoryPlatformStore test-store compatibility shim (RESOLVED)
- Noted in: Story 2 self-review (both initial and post-fix)
- Status: Resolved during the cleanup/remediation sequence
- Description: InMemoryPlatformStore previously carried a synthetic
  artifact-version fallback for seeded test data that lacked explicit version
  rows.
- Impact: Historical test infrastructure issue. No open cleanup item.
- Action needed: none

### SD-3: Legacy optional ownership fields in ArtifactSummary TypeScript shape (RESOLVED)
- Noted in: Story 2 self-review
- Status: Resolved during the cleanup/remediation sequence
- Description: ArtifactSummary previously tolerated legacy optional ownership
  fields for fixture compatibility even though the runtime schema/output
  stripped them.
- Impact: Historical type-level compatibility issue. Current
  `ArtifactSummary` is project-scoped and has no ownership field.
- Action needed: none

## Summary

- 0 items requiring cleanup dispatch
- Package/review boundary drift was remediated after merge by `f33ea92`,
  `849dcce`, and `b231ee6`
- Checkpoint persistence boundary reviewed and accepted for Epic 5 closure
- All story-receipt spec deviations are resolved or accepted for Epic 5 closure
