## SLICE_PLAN

AC-2.5: make source `accessMode` visibly distinguish `read_only` vs `read_write`.

Two changes to `process-materials-section.ts`:
1. Set `data-access-mode` attribute on each source `<li>` for programmatic identification.
2. Render an "Access: read only" / "Access: read write" detail line (underscore→space formatting matches existing `formatHydrationStateLabel` pattern).

Tests written first (TDD): three focused tests covering read-only text, read-write text, and attribute-based distinguishability using the pre-existing `writableProcessSourceReferenceFixture` and `mixedAccessProcessMaterialsFixture` fixtures.

## FILES_CHANGED

- `apps/platform/client/features/processes/process-materials-section.ts` — added `data-access-mode` attribute and "Access" detail line to source rendering block (lines ~209–212 inserted)
- `tests/service/client/process-materials-section.test.ts` — new file; 3 tests for AC-2.5
- `tests/fixtures/materials.ts` — no changes required (fixtures already included `writableProcessSourceReferenceFixture` and composite fixtures)

## TEST_COMMANDS

```
npx vitest run tests/service/client/process-materials-section.test.ts --environment jsdom
corepack pnpm exec vitest run tests/service/client --environment jsdom
```

## TEST_RESULTS

```
# Slice tests
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  407ms

# Full client suite (regression)
Test Files  18 passed (18)
     Tests  125 passed (125)
  Duration  1.25s
```

## BLOCKERS

None.
