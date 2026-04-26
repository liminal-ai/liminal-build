# Test Plan: Artifact Model and Review Provenance Alignment

## Purpose

This document maps every Epic 5 test condition to a planned test file and test
approach. Epic 5 is not a surface-first feature, so the plan leans heavily on
service-mock tests at the durable-state and server-boundary layers. The client
still matters, but the highest-value confidence comes from proving that the new
artifact/package semantics are correct before the browser renders them.

The confidence chain for this epic is:

```text
AC → TC → Test File / Test Name → Implementation Module
```

Epic 5 adds one testing emphasis beyond earlier epics: the difference between
artifact identity, version provenance, current refs, package context, and
published package membership must be tested directly. If those layers collapse
in fixtures or tests, the implementation can accidentally regress to the old
"primary process owns artifact" model without anyone noticing.

## Verification Tiers

| Script | Command | Notes |
|--------|---------|-------|
| `red-verify` | `corepack pnpm run red-verify` | Format, lint, typecheck, and build. No tests. |
| `test:convex` | `corepack pnpm exec vitest run convex --environment node` | Durable-state service-mock tests |
| `test:service` | `corepack pnpm exec vitest run tests/service/server --environment node` | Fastify route and service-mock tests |
| `test:client` | `corepack pnpm exec vitest run tests/service/client --environment jsdom` | Client route/page/panel tests |
| `test:packages` | `corepack pnpm -r --filter "./packages/*" test` | Runs because the repo-level `verify` lane includes it, even though Epic 5 is not expected to add package-workspace tests |
| `test:integration` | `corepack pnpm exec vitest run tests/integration --environment node` | Assembled app integration tests |
| `verify` | `corepack pnpm run verify` | Standard development gate |
| `green-verify` | `corepack pnpm run green-verify` | Standard gate plus test-immutability guard |
| `verify-all` | `corepack pnpm run verify-all` | Deep gate including integration and scaffolded e2e |

## Test Layers

### Convex and Durable-State Tests

These are the primary confidence layer for the model realignment.

- `convex/artifacts.test.ts`
- `convex/packageSnapshots.test.ts`
- `convex/processPackageContexts.test.ts`

### Server Service-Mock Tests

These verify the Fastify and service composition over real internal code and
mocked external boundaries.

- `tests/service/server/review-foundation-contracts.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`
- `tests/service/server/project-shell-bootstrap-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/server/review-workspace-api.test.ts`
- `tests/service/server/artifact-review-api.test.ts`
- `tests/service/server/package-review-api.test.ts`
- `tests/service/server/review-export-api.test.ts`
- `tests/service/server/observability.test.ts`

### Client Service-Mock Tests

These verify the browser's public entry points and bounded degraded rendering.

- `tests/service/client/project-shell-page.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`
- `tests/service/client/review-workspace-page.test.ts`
- `tests/service/client/version-switcher.test.ts`
- `tests/service/client/package-review-panel.test.ts`
- `tests/service/client/package-member-nav.test.ts`

### Integration Tests

These verify durable reopen, cross-surface coherence, and end-to-end policy
alignment through the assembled Fastify app and in-memory store.

- `tests/integration/review-workspace.test.ts`

## Mock Boundaries

| Layer | Mock? | Why |
|-------|-------|-----|
| WorkOS/session validation | Yes | External auth boundary |
| Convex HTTP client in server tests | Yes | External durable-store boundary |
| Browser `fetch` in client tests | Yes | HTTP boundary |
| Signed content URL fetches | Yes | External content boundary |
| Fastify routes and review services | No | They are the behavior under test |
| `PlatformStore` in in-memory/integration tests | No | It is part of the system we are validating |
| Client router, store, pages, panels | No | They are the public client entry points |
| Pure review/package helper functions | No | They are our own logic |

## Fixture Strategy

Epic 5 fixtures must carry the aligned model explicitly. Every fixture group
should make it obvious which layer is being exercised.

### Artifact Fixtures

`tests/fixtures/artifacts.ts`

- project-scoped artifact with no process-owner fields
- artifact with versions from multiple processes
- zero-version artifact still reachable through current refs
- artifact revised by a later process while retaining one identity

### Process-Ref Fixtures

`tests/fixtures/process-material-refs.ts`

- current refs for one process
- unrelated process with no current ref to the artifact
- process with zero-version current ref

### Package Context Fixtures

`tests/fixtures/package-contexts.ts`

- current package context seeded from current refs
- current package context with earlier pinned version
- reopened package context seeded from published snapshot
- context containing one disallowed unrelated version candidate

### Package Snapshot Fixtures

`tests/fixtures/package-snapshots.ts`

- mixed-producer package snapshot
- snapshot with later newer version outside the pinned member set
- snapshot with one unavailable member
- snapshot with all members readable

### Error Fixtures

`tests/fixtures/review-errors.ts`

- `REVIEW_TARGET_NOT_FOUND`
- `ARTIFACT_VERSION_NOT_FOUND`
- `PACKAGE_MEMBER_UNAVAILABLE`
- `PACKAGE_MEMBER_NOT_ALLOWED`

## File Inventory and Count Ownership

The table below is the authoritative count surface for the planned `121` tests.
Each file has one primary ownership slot for count reconciliation even if later
stories reference that file across more than one chunk.

| Test File | Primary Chunk | Planned Tests |
|-----------|---------------|---------------|
| `tests/service/server/review-foundation-contracts.test.ts` | Chunk 0 | 6 |
| `tests/service/server/process-foundation-contracts.test.ts` | Chunk 0 | 6 |
| `tests/service/server/project-shell-bootstrap-api.test.ts` | Chunk 1 | 8 |
| `tests/service/server/process-work-surface-api.test.ts` | Chunk 1 | 5 |
| `tests/service/client/project-shell-page.test.ts` | Chunk 1 | 5 |
| `convex/artifacts.test.ts` | Chunk 2 | 10 |
| `tests/service/server/artifact-review-api.test.ts` | Chunk 2 | 12 |
| `tests/service/server/review-workspace-api.test.ts` | Chunk 3 | 10 |
| `tests/service/client/review-workspace-page.test.ts` | Chunk 3 | 9 |
| `tests/service/client/version-switcher.test.ts` | Chunk 3 | 8 |
| `convex/packageSnapshots.test.ts` | Chunk 4 | 6 |
| `convex/processPackageContexts.test.ts` | Chunk 4 | 5 |
| `tests/service/server/package-review-api.test.ts` | Chunk 4 | 7 |
| `tests/service/server/review-export-api.test.ts` | Chunk 4 | 2 |
| `tests/service/client/package-review-panel.test.ts` | Chunk 4 | 4 |
| `tests/integration/review-workspace.test.ts` | Chunk 5 | 7 |
| `tests/service/server/observability.test.ts` | Chunk 5 | 4 |
| `tests/service/client/process-work-surface-page.test.ts` | Chunk 5 | 4 |
| `tests/service/client/package-member-nav.test.ts` | Chunk 5 | 3 |
| **Total** | — | **121** |

## TC → Test Mapping

Every TC from the epic appears below. Each row names the primary test file that
owns that condition. Additional client or integration coverage may exist, but
the table below is the authoritative coverage map.

### `convex/artifacts.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.1a | later process can add an existing project artifact to current refs without changing artifact identity | Proves current refs are process-local, not artifact ownership |
| TC-1.1b | later process reference preserves earlier lineage | Validates version provenance remains untouched |
| TC-2.1a | revising an existing artifact creates a new version row | Direct write-path assertion |
| TC-2.1b | revising process does not reassign the artifact to itself | Guards removal of artifact-row ownership |
| TC-2.2a | producing process is recorded on the new version | Direct version-provenance assertion |

### `tests/service/server/project-shell-bootstrap-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.2a | new process-created artifact appears in project artifact state immediately | Confirms no separate add-to-project step |
| TC-1.2b | project artifact state remains deduplicated when several processes reference one artifact | Guards against per-process artifact rows |
| TC-2.3a | project artifact summaries show latest version label and update time after later-process revision | Confirms latest-version projection rule |

### `tests/service/server/process-work-surface-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-1.3a | current process materials show a referenced artifact | Validates process-local visibility |
| TC-1.3b | unrelated process does not gain automatic current-material visibility | Guards process-locality |
| TC-5.2a | one unavailable referenced artifact does not fail unrelated current materials | Confirms section-level degradation |

### `tests/service/server/review-workspace-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.1a | process can review referenced artifact created by earlier process | Reviewability from current refs |
| TC-3.1b | process can still review referenced artifact after later revision by another process | Guards against latest-producer mismatch |
| TC-3.4a | zero-version artifact is omitted from default review target list | Target-list rule |
| TC-5.4a | missing review target is classified as review-target failure, not export failure | Bootstrap classification |
| TC-5.4b | missing artifact target, missing version, and unavailable package member remain distinct | Workspace-level classification |

### `tests/service/server/artifact-review-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-2.2b | earlier version provenance remains readable | Uses cross-process version history |
| TC-2.3b | earlier versions remain reviewable | Explicit earlier-version selection |
| TC-3.2a | review succeeds despite primary-process mismatch because reviewability is process-context based | Direct regression guard |
| TC-3.2b | unrelated artifact remains unavailable when not in current refs or pinned context | Negative reviewability case |
| TC-3.3a | selected earlier version is displayed | Explicit version path |
| TC-3.3b | current-version review remains stable after newer versions exist | Guards drift to wrong current/pinned interpretation |
| TC-3.4b | direct zero-version artifact review returns bounded empty state | Empty, not unavailable |
| TC-3.4c | explicit version request against zero-version artifact returns `ARTIFACT_VERSION_NOT_FOUND` | Exact request-level classification |
| TC-5.3a | artifact review unavailable reason reflects missing reference vs missing version accurately | Error taxonomy |

### `convex/packageSnapshots.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.1a | mixed-producer package publication is allowed inside one project | Removes same-process-producer restriction |
| TC-4.1b | cross-project package member is rejected | Same-project boundary |
| TC-4.2a | publishing process can package referenced upstream versions | Current-ref current-version eligibility |
| TC-4.2b | unrelated project artifact version outside current package-building context is rejected | `PACKAGE_MEMBER_NOT_ALLOWED` |

### `convex/processPackageContexts.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.2c | earlier pinned version remains eligible when reopening or editing package context | Core reason for durable package context |

### `tests/service/server/package-review-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.3a | package member opens the pinned version | Snapshot pin integrity |
| TC-4.3b | newer later artifact version does not replace pinned package member | Guards floating membership |
| TC-4.4a | mixed-producer package review succeeds | Cross-process package review |
| TC-5.2b | one unavailable package member does not remove unrelated members | Per-member degradation |
| TC-5.3b | unavailable package member reason reflects pinned-version failure | Error taxonomy |

### `tests/service/server/review-export-api.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.4b | mixed-producer package export succeeds with pinned contents | Export behavior on aligned snapshot |

### `tests/integration/review-workspace.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-5.1a | reopening process artifact materials restores latest durable state after later cross-process update | Durable reopen path |
| TC-5.1b | reopening package review after later artifact activity still resolves pinned members | Durable package reopen path |

## Secondary Client Coverage

These rows are intentionally secondary rather than primary ownership rows. They
make the user-visible obligations explicit so story authors and implementers do
not accidentally treat stale-selection fallback or provenance display as
server-only concerns.

### `tests/service/client/review-workspace-page.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.4b | zero-version direct artifact review renders bounded empty state | User-visible empty-state obligation |
| TC-5.4a | stale target bootstrap renders review-target failure copy, not export-failure copy | UI classification obligation |

### `tests/service/client/version-switcher.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-3.3a | selecting an earlier version updates the rendered artifact review state | Client selection path |
| TC-3.4c | stale explicit version selection falls back to workspace reload and bounded unavailable state | Explicit client recovery obligation |

### `tests/service/client/package-review-panel.test.ts`

| TC | Test Description | Coverage Notes |
|----|------------------|----------------|
| TC-4.4a | mixed-producer package renders as normal package review state | User-visible package alignment |
| TC-5.2b | one unavailable package member leaves unrelated members visible | Client-side partial degradation |
| TC-5.3b | selected member failure copy refers to unavailable pinned version rather than ownership mismatch | User-visible taxonomy |

## Non-TC Decided Tests

Epic 5 also needs defensive tests that are not one-to-one with a TC but protect
the alignment itself:

- project-shell artifact rows no longer render ownership language
- review enablement on the process work surface is false when the process has
  only zero-version refs and no package targets
- selecting a stale explicit version triggers workspace reload fallback instead
  of collapsing the whole workspace into a fatal error
- selecting a stale explicit package member triggers workspace reload fallback
- package snapshot publication from current context preserves member order
- observability events emit exact error reasons for version and member failures

## Work Breakdown by Chunk

### Chunk 0: Foundations

**Scope:** Contract changes, error-code additions, store-boundary narrowing,
package-context fixtures, and migration scaffolding.

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q2`, `Q3`, `Q4`
- `tech-design-server.md` → `Durable State Model`, `Store Boundary Changes`, `Shared Contract Shapes`, `Error Taxonomy`
- `tech-design-client.md` → `Contract and State Changes`, `Review Version Contracts`

**Relevant files:**

- `tests/service/server/review-foundation-contracts.test.ts`
- `tests/service/server/process-foundation-contracts.test.ts`

**Non-TC decided tests:**

- artifact summary schema no longer accepts process-owner fields
- review-target error schema accepts `ARTIFACT_VERSION_NOT_FOUND`,
  `PACKAGE_MEMBER_UNAVAILABLE`, and `PACKAGE_MEMBER_NOT_ALLOWED`
- `ReviewWorkspaceState` continues distinguishing request failure from bounded
  target degradation

**Test Count:** 12

### Chunk 1: Project Artifact Association Without Process Ownership

**Scope:** Project-shell artifact summary, current refs, and process-local
materials visibility.

**ACs:** AC-1.1 through AC-1.3

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q2`, `Work Breakdown`
- `tech-design-server.md` → `Flow 1: Referencing Project Artifacts From Process Work`
- `tech-design-client.md` → `Flow 1: Project Shell Artifact Summary`, `Flow 2: Process Work Surface Review Entry`

**Relevant files:**

- `tests/service/server/project-shell-bootstrap-api.test.ts`
- `tests/service/server/process-work-surface-api.test.ts`
- `tests/service/client/project-shell-page.test.ts`

**Non-TC decided tests:**

- project shell removes "Attached to X process" copy entirely
- process-surface review control does not infer eligibility from artifact
  provenance

**Test Count:** 18

### Chunk 2: Versioned Checkpoint Realignment

**Scope:** Artifact revision write path, latest-version projection, and earlier
version readability.

**ACs:** AC-2.1 through AC-2.3

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q5`
- `tech-design-server.md` → `Durable State Model`, `Flow 2: Creating a New Version Without Reassigning the Artifact`, `Shared Contract Shapes`
- `tech-design-client.md` → `artifact-review-panel.ts`, `Review Version Contracts`

**Relevant files:**

- `convex/artifacts.test.ts`
- `tests/service/server/artifact-review-api.test.ts`
- `tests/integration/review-workspace.test.ts`

**Non-TC decided tests:**

- checkpoint write preserves artifact identity when artifact id is supplied
- project and process reads both derive `updatedAt` from latest version rather
  than from artifact-row ownership state
- artifact review payload includes `producedByProcessId` on version summaries and
  selected version detail

**Test Count:** 22

### Chunk 3: Process-Scoped Artifact Review Realignment

**Scope:** Review target eligibility, explicit version selection, zero-version
behavior, and bootstrap versus follow-up read handling.

**ACs:** AC-3.1 through AC-3.4

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q3`
- `tech-design-server.md` → `Flow 3: Review Context Resolution`, `Flow 5: Reopen and Degraded Provenance States`, `Error Taxonomy`
- `tech-design-client.md` → `Flow 3: Review Workspace Bootstrap`, `Flow 4: Explicit Version Selection`, `Review Workspace Fallback Handling`

**Relevant files:**

- `tests/service/server/review-workspace-api.test.ts`
- `tests/service/server/artifact-review-api.test.ts`
- `tests/service/client/review-workspace-page.test.ts`

**Non-TC decided tests:**

- bootstrap uses bounded unavailable target state for stale selection
- client version-selection fallback preserves workspace orientation
- zero-version artifact copy distinguishes empty from unavailable
- version switcher and selected-version panel render `producedByProcessId`
  metadata clearly

**Test Count:** 27

### Chunk 4: Cross-Process Package Alignment

**Scope:** Current package-building context, cross-process publish eligibility,
package review, and package export.

**ACs:** AC-4.1 through AC-4.4

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q4`
- `tech-design-server.md` → `Durable State Model`, `Flow 4: Current Package Context and Publication`, `Package Context Shapes`
- `tech-design-client.md` → `Flow 5: Package Member Selection and Degraded Members`, `package-review-panel.ts`

**Relevant files:**

- `convex/packageSnapshots.test.ts`
- `convex/processPackageContexts.test.ts`
- `tests/service/server/package-review-api.test.ts`
- `tests/service/server/review-export-api.test.ts`
- `tests/service/client/package-member-nav.test.ts`

**Non-TC decided tests:**

- reopened package context seeds from published snapshot members
- export trigger remains visible for aligned mixed-producer package
- unavailable member stays disabled but visible in member navigation

**Test Count:** 23

### Chunk 5: Reopen and Degraded Provenance States

**Scope:** Durable reopen, partial degradation, exact classification, and
observability.

**ACs:** AC-5.1 through AC-5.4

**Relevant Tech Design Sections:**

- `tech-design.md` → `Q3`, `Q5`
- `tech-design-server.md` → `Flow 5: Reopen and Degraded Provenance States`, `Error Taxonomy`, `Observability`
- `tech-design-client.md` → `Flow 3: Review Workspace Bootstrap`, `Flow 4: Explicit Version Selection`, `Flow 5: Package Member Selection and Degraded Members`

**Relevant files:**

- `tests/service/server/review-workspace-api.test.ts`
- `tests/service/server/artifact-review-api.test.ts`
- `tests/service/server/package-review-api.test.ts`
- `tests/service/server/observability.test.ts`
- `tests/integration/review-workspace.test.ts`
- `tests/service/client/process-work-surface-page.test.ts`

**Non-TC decided tests:**

- stale explicit selection does not lose target list or process context
- unavailable package member preserves exportability reason messaging
- observability emits distinct reason codes for target, version, and member failures

**Test Count:** 19

## Count Reconciliation

| Chunk | Tests |
|-------|-------|
| Chunk 0 | 12 |
| Chunk 1 | 18 |
| Chunk 2 | 22 |
| Chunk 3 | 27 |
| Chunk 4 | 23 |
| Chunk 5 | 19 |
| **Total** | **121** |

## Manual Verification Checklist

1. Open a project shell with several artifacts and confirm artifact rows no
   longer mention attachment to one process.
2. Open a process that references an artifact first created elsewhere and
   confirm review is still available.
3. Open artifact review on an earlier version, then create a later version and
   confirm the earlier version remains selectable.
4. Open a zero-version artifact directly and confirm the workspace shows an
   empty artifact state rather than a generic unavailable error.
5. Review a mixed-producer package and confirm the pinned member versions stay
   stable even when newer versions exist.
6. Simulate one unavailable package member and confirm the package still shows
   other members plus a bounded degraded state for the missing member.
