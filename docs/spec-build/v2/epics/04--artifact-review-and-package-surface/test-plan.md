# Test Plan: Artifact Review and Package Surface

## Purpose

This document maps every Epic 4 test condition to a planned test file and test approach. It follows the same service-mock philosophy established in Epic 3:

- test Fastify routes, services, and render pipeline at the server boundary
- test client pages, panels, and Mermaid hydration at their public entry points
- test the workspace package (`@liminal-build/markdown-package`) at its exported functions and CLI entry point
- mock only external boundaries

The confidence chain for Epic 4 remains:

```text
AC → TC → Test File / Test Name → Implementation Module
```

Epic 4 adds one extra testing rule beyond Epic 3: the security hardening layers (markdown-it `html: false`, Mermaid directive stripping, DOMPurify config, tar-stream adapter hardening) must each have explicit tests that prove the hardening actually rejects hostile input, not just that the normal path works. These are non-TC decided tests because they defend invariants; each critical hardening step gets at least one dedicated test.

## Verification Tiers

| Script | Command | Notes |
|--------|---------|-------|
| `red-verify` | `corepack pnpm run red-verify` | Red exit gate: format + lint + typecheck + build. No tests. |
| `test:convex` | `corepack pnpm exec vitest run convex --environment node` | Convex function service-mock tests |
| `test:service` | `corepack pnpm exec vitest run tests/service/server --environment node` | Fastify route and service-mock tests |
| `test:client` | `corepack pnpm exec vitest run tests/service/client --environment jsdom` | Client route/page/panel/hydration tests |
| `test:packages` | `corepack pnpm -r --filter "./packages/*" test` | Workspace package tests (new in Epic 4) |
| `verify` | `corepack pnpm run verify` | Standard development gate: `red-verify` + all four test lanes above |
| `green-verify` | `corepack pnpm run green-verify` | Green exit gate: `verify` + no test-file-changes guard |
| `verify-all` | `corepack pnpm run verify-all` | Deep verification: `verify` + integration + e2e (e2e remains an explicit `SKIP:` until implemented) |

The `test:packages` lane is new in Epic 4 and must be wired into both `verify` and `verify-all`. It runs the workspace package's own vitest suite, covering the library and the CLI.

## Test Layers

### Convex Function Service Mocks

Primary confidence layer for new Epic 4 durability logic.

- `convex/artifactVersions.test.ts`
- `convex/packageSnapshots.test.ts`
- `convex/packageSnapshotMembers.test.ts`

### Server Service Mocks

Fastify and render entry-point tests with mocked external boundaries.

- `tests/service/server/review-workspace-api.test.ts`
- `tests/service/server/artifact-review-api.test.ts`
- `tests/service/server/package-review-api.test.ts`
- `tests/service/server/review-export-api.test.ts`
- `tests/service/server/markdown-renderer.test.ts`
- `tests/service/server/process-work-surface-api.test.ts` *(extended, not new)*

### Client Service Mocks

Route/page/panel/hydration tests with mocked browser API and Mermaid library.

- `tests/service/client/review-workspace-page.test.ts`
- `tests/service/client/artifact-review-panel.test.ts`
- `tests/service/client/package-review-panel.test.ts`
- `tests/service/client/version-switcher.test.ts`
- `tests/service/client/package-member-nav.test.ts`
- `tests/service/client/markdown-body.test.ts`
- `tests/service/client/export-trigger.test.ts`
- `tests/service/client/review-router.test.ts`

### Workspace Package Tests

Tests owned by the workspace package, running under `test:packages`.

- `packages/markdown-package/tests/create-from-entries.test.ts`
- `packages/markdown-package/tests/tar-hardening.test.ts`
- `packages/markdown-package/tests/manifest.test.ts`
- `packages/markdown-package/tests/cli.test.ts`

### Wide Integration Tests

Deeper tests against the assembled app and durable state path.

- `tests/integration/review-workspace.test.ts`

### E2E

Planned but not required for the first TDD cycles.

- `tests/e2e/review-workspace.spec.ts`

## Mock Boundaries

| Layer | Mock? | Notes |
|-------|-------|-------|
| WorkOS SDK and session validation | Yes | External auth boundary |
| Convex client HTTP calls | Yes | External durable-store boundary |
| Convex File Storage content fetches (signed-URL HTTP) | Yes | External content boundary; test fixtures supply markdown bytes |
| Browser `fetch` (for client tests) | Yes | HTTP boundary |
| `mermaid` library render function | Yes (in client tests) | Return known SVG fixtures so we test hydration, not Mermaid itself |
| `tar-stream` | No | Library under test — exercise real byte output |
| Fastify routes / review services / renderer / mermaid-sanitize | No | These are the server behavior under test |
| Client router / store / page / panels / hydration | No | These are the client behavior under test |
| `@liminal-build/markdown-package` library functions | No | These are our own code |
| Convex functions under direct `convex/*.test.ts` | No | Test Convex functions directly |
| `isomorphic-dompurify` | No (mostly) | Run for real; mock only when asserting interaction patterns |

## Fixture Strategy

### Shared Fixtures

`tests/fixtures/artifact-versions.ts`
- single-version artifact fixtures (markdown and unsupported)
- two-version artifacts
- three-version artifacts with distinct `createdAt`
- zero-version artifact (identity only)

`tests/fixtures/package-snapshots.ts`
- single-member package snapshot
- multi-member package with `position` ordering
- package with one unavailable member
- package with mixed contentKinds

`tests/fixtures/markdown-content.ts`
- markdown with headings / tables / lists / code blocks (AC-3.1)
- markdown with single mermaid fence
- markdown with multiple mermaid fences
- markdown containing `%%{init}%%` / `%%{config}%%` / `%%{wrap}%%` directives for security testing
- markdown with raw HTML that must be stripped by `html: false`
- markdown with `<style>` / `<script>` / `<iframe>` that DOMPurify must reject
- oversize markdown (>200 KB) for performance bound testing

`tests/fixtures/mermaid-sources.ts`
- valid flowchart source
- valid sequence diagram
- malformed source that triggers render failure
- source with hostile `%%{init:security=loose}%%` directive
- source with `%%{config: {flowchart: {htmlLabels: "false"}}}%%` string-bypass
- oversize source (>8 KB)

`tests/fixtures/review-workspace.ts`
- workspace with zero targets
- workspace with one artifact target
- workspace with one package target
- workspace with multiple targets (no selection)
- workspace with target in each status: ready, empty, error, unsupported, unavailable

`tests/fixtures/export-responses.ts`
- successful export response
- immediate failure responses (409 non-available, 503 failed)
- expired-URL failure

### Test Utilities

`tests/utils/build-app.ts`
- extend the Fastify test builder with review routes + review services + render pipeline

`tests/utils/render-shell.ts`
- extend the client render helper to mount the review workspace page with mocked HTTP APIs and mocked Mermaid library

`tests/utils/fake-convex-storage.ts`
- fake Convex File Storage that returns predetermined markdown byte streams in response to signed URLs

`tests/utils/mock-mermaid.ts`
- Mermaid library mock that records calls, returns controllable SVG fixtures, and simulates render failures

## Test File Inventory

Every test file below is assigned to exactly one primary chunk. When a test exercises behavior relevant to multiple chunks, it is cited in the secondary chunks' "cross-chunk references" field but counted only once here. This keeps per-chunk arithmetic clean and the file-inventory total authoritative.

| Test File | Layer | Primary Chunk | Primary Focus | Tests | Of Which TC-Mapped |
|-----------|-------|---------------|---------------|-------|---------------------|
| `convex/artifacts.test.ts` (extended) | Convex | 0 + 2 | Schema migration: `contentStorageId` removed; read paths updated to query `artifactVersions` for latest | 4 | 0 |
| `convex/artifactVersions.test.ts` | Convex | 2 | `insertArtifactVersion` typed mutation; list by artifact; get by versionId; latest-version query; content-URL resolution; index usage | 7 | 0 |
| `convex/packageSnapshots.test.ts` | Convex | 4 | `publishPackageSnapshot` transactional insert; list by process; immutability (no update API exposed) | 5 | 0 |
| `convex/packageSnapshotMembers.test.ts` | Convex | 4 | Member insert (happens inside `publishPackageSnapshot`); list by snapshot in position order; pinned-version invariant | 4 | 0 |
| `tests/service/server/review-workspace-api.test.ts` | Service | 1 | Bootstrap contract, target selection logic, review-target envelope, degraded states | 14 | 11 |
| `tests/service/server/artifact-review-api.test.ts` | Service | 2 | Version list, version switching, content retrieval, render error degradation, unsupported fallback | 11 | 8 |
| `tests/service/server/package-review-api.test.ts` | Service | 4 | Snapshot retrieval, member ordering, first-reviewable-member default, `PackageMemberReview` envelope status/error, `exportability` computation | 11 | 8 |
| `tests/service/server/review-export-api.test.ts` | Service | 5 | Two-phase export: phase-1 POST preflight + signed URL; phase-2 GET streams; expired token; member-unavailable between phases; error → HTTP mapping | 10 | 6 |
| `tests/service/server/markdown-renderer.test.ts` | Service | 3 | Render pipeline end-to-end, Mermaid sidecar, sanitization config, directive stripping, `html: false` enforcement, output-side XSS sanity (no residual `<script>` / `on*` / `javascript:`) | 16 | 2 |
| `tests/service/server/process-work-surface-api.test.ts` (extended) | Service | 1 | `controls[review].enabled` consults reviewability; disabled reason populated when no reviewable targets | 4 | 1 |
| `tests/service/server/export-url-signing.test.ts` | Service | 5 | Token mint/verify round-trip; tamper detection; expiry detection | 4 | 0 |
| `tests/service/server/observability.test.ts` | Service | 6 | Log-point coverage: one test per documented log point asserting the structured fields emitted on happy and failure paths | 12 | 0 |
| `tests/service/client/process-work-surface-page.test.ts` (extended) | Service | 1 | `review` control click navigates to review route via `onReview` callback; disabled control does not navigate | 3 | 2 |
| `tests/service/client/review-workspace-page.test.ts` | Service | 1 | Route entry, bootstrap rendering, target-selection state, degraded states, back-to-process control | 14 | 12 |
| `tests/service/client/artifact-review-panel.test.ts` | Service | 2 | Single-artifact render, version switcher integration, unsupported fallback, body-render failure | 8 | 7 |
| `tests/service/client/package-review-panel.test.ts` | Service | 4 | Package composition, member-failure isolation, export trigger gated on exportability, member switching, first-reviewable default render | 11 | 8 |
| `tests/service/client/version-switcher.test.ts` | Service | 2 | Version list render, selection callback, ordering, URL update via pushState | 5 | 2 |
| `tests/service/client/package-member-nav.test.ts` | Service | 4 | Member list render, selection, unavailable-member visual state, ordering, ARIA semantics | 5 | 1 |
| `tests/service/client/markdown-body.test.ts` | Service | 3 | HTML mount, Mermaid placeholder hydration, cache hit/miss, diagram failure, fresh-id generation, SVG sanitization | 10 | 3 |
| `tests/service/client/export-trigger.test.ts` | Service | 5 | Export action lifecycle, success/failure rendering, download-link rendering, re-export after expiry | 6 | 3 |
| `tests/service/client/review-router.test.ts` | Service | 1 | Review-workspace route parsing, query-state deserialization | 4 | 0 |
| `tests/service/client/a11y.test.ts` | Service | 6 | Keyboard navigation + ARIA semantics for version switcher, member nav, target selector, export trigger, back-to-process link, degraded-state, Mermaid failure aria-describedby, unsupported fallback | 18 | 0 |
| `tests/service/client/bundle-budget.test.ts` | Service | 6 | Build the client and assert the review-workspace route's bundle + first-render Mermaid lazy chunk stay at or below 600 KB gzipped delta over baseline | 2 | 0 |
| `packages/markdown-package/tests/create-from-entries.test.ts` | Package | 5 | Streaming API round-trip, manifest as first entry, gzip vs. plain output | 6 | 1 |
| `packages/markdown-package/tests/tar-hardening.test.ts` | Package | 5 | Gzip-bomb cap, per-entry + cumulative byte caps, entry-name filter, symlink/hardlink rejection, path-traversal rejection | 8 | 0 |
| `packages/markdown-package/tests/manifest.test.ts` | Package | 5 | `parseManifest` / `scaffoldManifest` round-trip, metadata + navigation preservation | 4 | 0 |
| `packages/markdown-package/tests/cli.test.ts` | Package | 5 | `mdvpkg create/info/ls/extract/manifest` commands against tmp fixtures | 6 | 0 |
| `tests/integration/review-workspace.test.ts` | Integration | 6 | Durable reopen across target kinds, URL-driven state restoration, export round-trip, `reviewableTargets` reflected across shell/process-surface | 10 | 4 |
| `tests/service/server/nfr.test.ts` | Service | 6 | Performance NFRs: markdown render within 2 s, package review within 2 s, export-start within 2 s; content-cap bounds | 4 | 0 |

**Planned total:** 226 tests
**TC-mapped test rows:** 79 (covering 42 unique TC conditions; some TCs are asserted at both server and client layers)
**Non-TC decided tests:** 147

Every test has exactly one primary chunk. The arithmetic in the chunk breakdown section at the end of this document reconciles to this file inventory row-for-row — no "cross-chunk" slop. 42 unique TCs are the authoritative coverage metric; 226 tests is the authoritative implementation commitment.

## TC → Test Mapping

### `tests/service/server/review-workspace-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a bootstrap returns review workspace for process with reviewable artifact` | Process with one durable artifact version | GET bootstrap | response includes artifact in availableTargets |
| TC-1.1c | `TC-1.1c single reviewable target opens directly` | Process with one target, no selection query | GET bootstrap | response populates `target` with that artifact |
| TC-1.1d | `TC-1.1d multiple targets open in selection state` | Process with two targets, no selection | GET bootstrap | response returns availableTargets; `target` omitted |
| TC-1.1e | `TC-1.1e zero-target direct route opens empty` | Process with zero targets | GET bootstrap | response returns empty availableTargets; `target` omitted |
| TC-1.2a | `TC-1.2a process-aware review context visible` | Accessible process with target | GET bootstrap | `project` and `process` fields populated |
| TC-1.2b | `TC-1.2b target-selection state keeps process context visible` | Multi-target selection state | GET bootstrap | `project` + `process` populated without `target` |
| TC-1.3a | `TC-1.3a single artifact review target identified` | Artifact target selected | GET bootstrap | `target.targetKind === 'artifact'` |
| TC-1.3b | `TC-1.3b output package review target identified` | Package target selected | GET bootstrap | `target.targetKind === 'package'` |
| TC-6.2a | `TC-6.2a missing artifact shows unavailable state` | Bookmark URL for deleted artifact | GET bootstrap | target.status === 'unavailable' |
| TC-6.2b | `TC-6.2b missing package shows unavailable state` | Bookmark URL for deleted snapshot | GET bootstrap | target.status === 'unavailable' |
| TC-6.2c | `TC-6.2c revoked access on direct review route is blocked` | Actor lacks project access | GET bootstrap | 403 `PROJECT_FORBIDDEN` |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `bootstrap returns 401 when unauthenticated` | Route-level auth invariant |
| `bootstrap returns 404 PROCESS_NOT_FOUND for invalid processId` | Standard route failure path |

### `tests/service/server/artifact-review-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.1a | `TC-2.1a new revision becomes current version` | Artifact with two durable versions | GET artifact review | versions[0] has `isCurrent: true`; is the newer one |
| TC-2.1b | `TC-2.1b earlier revision remains reviewable` | Artifact with two versions; query `?versionId=older` | GET artifact review | selectedVersion is the older one; body rendered |
| TC-2.2a | `TC-2.2a artifact identity visible` | Artifact target | GET artifact review | artifactId + displayName returned |
| TC-2.2b | `TC-2.2b version identity visible` | Any version selected | GET artifact review | versionLabel returned on selectedVersion |
| TC-2.3a | `TC-2.3a prior version opens distinctly` | Two versions; query prior | GET artifact review | selectedVersionId ≠ currentVersionId |
| TC-2.3b | `TC-2.3b versions ordered newest to oldest` | Three versions with distinct createdAt | GET artifact review | versions[] sorted descending by createdAt |
| TC-2.4a | `TC-2.4a no durable version state shown` | Artifact with zero versions | GET artifact review | status: empty, identity present, no selectedVersion |
| TC-6.3a | `TC-6.3a artifact body render failure does not hide context` | Content fetch fails (mocked) | GET artifact review | selectedVersion.bodyStatus === 'error'; bodyError populated; version list still returned |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `returns unavailable when query versionId does not exist` | Robust input handling |
| `returns unsupported content kind without attempting content fetch` | Efficiency + correctness for unsupported fallback |
| `content fetch timeout produces bodyStatus error` | Bounded content-retrieval time |

### `tests/service/server/package-review-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1a | `TC-4.1a package review opens as one set` | Package snapshot with three members | GET package review | target.targetKind === 'package'; members.length === 3 |
| TC-4.1b | `TC-4.1b published package stable after artifact revision` | Package pinned at V1; publish V2 of same artifact | GET package review | response shows V1 content, not V2 |
| TC-4.2a | `TC-4.2a package membership visible` | Package with members | GET package review | each member has artifactId, versionId, displayName |
| TC-4.2b | `TC-4.2b package member order visible` | Members with non-zero positions | GET package review | members sorted ascending by position |
| TC-4.3a | `TC-4.3a package context preserved while reviewing one member` | Package with `?memberId=...` | GET package review | packageId + members populated alongside selectedMember |
| TC-4.3b | `TC-4.3b selecting different package member updates reviewed member` | Two queries with different memberIds | GET package review twice | each response's selectedMember.memberId matches query |
| TC-4.3c | `TC-4.3c package opens first reviewable member when no explicit member` | Package with members[0] status=unavailable, members[1] status=ready, no memberId in query | GET package review | selectedMember.memberId === members[1].memberId (first with status: ready) |
| TC-4.4a | `TC-4.4a package remains open when one member fails` | Package with one unavailable member | GET package review | package returned; failing member status: unavailable; others ready |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `response includes export-available flag when all members are ready` | Drives client export-trigger visibility |
| `response omits export-available flag when any member is unavailable` | Matches AC-5.1b |

### `tests/service/server/review-export-api.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1a | `TC-5.1a export current reviewed package` | Exportable package | POST export | 200; contentType: application/gzip; body is a valid gzipped tar; stream contains expected entries |
| TC-5.1b | `TC-5.1b export not falsely offered for non-exportable target` | Package with unavailable member | POST export | 409 `REVIEW_EXPORT_NOT_AVAILABLE` immediately; no bytes streamed |
| TC-5.2a | `TC-5.2a export matches reviewed versions` | Package pinned at V1; V2 also exists | POST export | extracted archive contains V1 content (not V2) |
| TC-5.2b | `TC-5.2b export includes manifest of package and version identities` | Exportable package | POST export | extracted archive's first entry is `_nav.md` with package identity + member identities |
| TC-5.3b | `TC-5.3b expired export requires re-export` | Expired signed URL (time advanced past expiresAt) | GET download URL | 404 `REVIEW_TARGET_NOT_FOUND` |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `export rejects when package is deleted between review and export click` | Concurrent state change defense |
| `export rejects with 401 for unauthenticated request` | Auth invariant |
| `export response contentType is application/gzip and packageFormat is mpkz` | Contract shape |

### `tests/service/server/markdown-renderer.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.1a | `TC-3.1a markdown structure preserved` | Markdown with headings, tables, lists, code | render | rendered HTML contains `<h1>`, `<table>`, `<ul>`, `<pre><code>` |
| TC-3.2a (server half) | `TC-3.2a Mermaid block extracted to sidecar` | Markdown with one mermaid fence | render | mermaidBlocks[] contains one entry; body contains a placeholder div with matching blockId |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `markdown-it html: false drops raw <script> tags` | Defense layer 1 |
| `markdown-it html: false drops raw <style> tags` | Defense layer 1 |
| `markdown-it html: false drops raw <iframe> tags` | Defense layer 1 |
| `DOMPurify config rejects inline style attribute` | Defense layer 2 |
| `DOMPurify config rejects form tag` | Defense layer 2 |
| `DOMPurify config allows the narrow data-block-id attribute` | Placeholder id preservation |
| `Mermaid directive strip removes %%{init}%% lines` | CVE-class closure |
| `Mermaid directive strip removes %%{config}%% lines` | CVE-class closure |
| `Mermaid directive strip removes %%{wrap}%% lines` | CVE-class closure |
| `Mermaid directive strip preserves non-directive content` | No over-removal |
| `render error returns structured bodyStatus: error without throwing` | Bounded failure invariant |
| `rendered body contains no <script> tags after sanitization` | Output-side sanity check complementing the input-layer html:false test |
| `rendered body contains no on* event handler attributes after sanitization` | Output-side sanity check for event-handler XSS vectors |
| `rendered body contains no javascript: URIs in href or src after sanitization` | Output-side sanity check for URI-based XSS vectors |

### `tests/service/server/process-work-surface-api.test.ts` (extended)

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `controls[review].enabled is true when process has at least one artifact with a version` | Drives `review` action enablement |
| `controls[review].enabled is false when process has zero versions and zero snapshots` | Reviewability computation correctness |
| `controls[review].enabled is true when process has at least one package snapshot` | Reviewability computation correctness |
| `controls[review].disabledReason is populated when review is not enabled` | Matches epic's disabled-reason stability contract |

### `tests/service/client/review-workspace-page.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-1.1a | `TC-1.1a review workspace page opens from process surface navigation` | Bootstrap response with one artifact target | Mount page | review panel renders for that artifact |
| TC-1.1c | `TC-1.1c single reviewable target opens directly on page load` | Bootstrap with one target, no selection | Mount page | review panel renders that target; no selector |
| TC-1.1d | `TC-1.1d multiple reviewable targets open in selection state` | Bootstrap with multiple targets, no selection | Mount page | target-selector renders; no stale body |
| TC-1.1e | `TC-1.1e zero-target direct review route opens empty state` | Bootstrap with empty availableTargets | Mount page | empty state with process context |
| TC-1.2a | `TC-1.2a process-aware context visible in header` | Any bootstrap | Mount page | header shows project + process + target (when present) |
| TC-1.2b | `TC-1.2b target selection preserves process context` | Multi-target selection | Mount page | header still shows project + process |
| TC-1.3a | `TC-1.3a artifact target identified` | targetKind: artifact | Mount page | panel labels target as one artifact |
| TC-1.3b | `TC-1.3b package target identified` | targetKind: package | Mount page | panel labels target as package |
| TC-1.4a | `TC-1.4a return to process from review` | Any bootstrap | Mount page | header renders link back to process work surface |
| TC-6.2a | `TC-6.2a missing artifact shows unavailable state` | target.status === 'unavailable' (artifact) | Mount page | degraded-state visible |
| TC-6.2b | `TC-6.2b missing package shows unavailable state` | target.status === 'unavailable' (package) | Mount page | degraded-state visible |
| TC-6.2c | `TC-6.2c revoked access on direct URL` | Bootstrap returns 403 | Mount page | route-level unavailable state |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `page renders process context even when target is unavailable` | Context preservation |
| `back-to-process link remains rendered in all states including degraded` | Return path invariant |

### `tests/service/client/artifact-review-panel.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.1a | `TC-2.1a artifact panel marks newest version as current` | Two-version target, newest first | Mount panel | switcher marks newest as `currentVersionId` |
| TC-2.1b | `TC-2.1b prior version body renders when selected` | selectedVersionId is older version | Mount panel | body area shows older version content |
| TC-2.2a | `TC-2.2a artifact identity rendered` | Artifact target | Mount panel | displayName visible |
| TC-2.2b | `TC-2.2b version identity rendered` | Any selected version | Mount panel | versionLabel visible alongside body |
| TC-2.4a | `TC-2.4a no-version state shown without version switcher` | target.status === 'empty' | Mount panel | no switcher; clear no-version affordance; identity still visible |
| TC-3.4a | `TC-3.4a unsupported artifact fallback rendered` | selectedVersion.contentKind === 'unsupported' | Mount panel | unsupported-fallback component; no markdown-body mount |
| TC-6.3a | `TC-6.3a body render failure preserves panel context` | selectedVersion.bodyStatus === 'error' | Mount panel | version switcher + identity remain; body area shows error affordance |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `panel never renders fallback and body simultaneously` | Mode-exclusivity invariant |

### `tests/service/client/version-switcher.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-2.3a | `TC-2.3a selecting prior version updates target` | Two-version list | Click prior version | new versionId becomes selection; body refreshes |
| TC-2.3b | `TC-2.3b versions rendered newest to oldest` | Three versions with distinct createdAt | Mount switcher | DOM order descending |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `switcher order remains stable across version-count changes` | Layout invariant |
| `switcher marks selected version distinctly from current version when they differ` | Distinguishes selection from latest |
| `selecting a version updates the URL via history.pushState` | Reopenability invariant |

### `tests/service/client/package-review-panel.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.1a | `TC-4.1a package panel renders as one set` | Package target with three members | Mount panel | package identity + member nav + first member rendered |
| TC-4.2a | `TC-4.2a package membership visible` | Package with members | Mount panel | member nav lists each member |
| TC-4.2b | `TC-4.2b member order visible` | Members with increasing positions | Mount panel | DOM order matches position ascending |
| TC-4.3a | `TC-4.3a package context preserved with selected member` | Package with selectedMember | Mount panel | package identity + nav render alongside member detail |
| TC-4.3c | `TC-4.3c first reviewable member default` | Package with members[0] status=unavailable, members[1] status=ready | Mount panel | selectedMember is members[1] (first with status: ready); members[0] rendered non-navigable |
| TC-4.4a | `TC-4.4a package remains open when one member fails` | One unavailable member | Mount panel | package identity + member nav + healthy members render; unavailable member non-navigable |
| TC-5.1b | `TC-5.1b export trigger hidden for non-exportable package` | Package with unavailable member | Mount panel | export trigger not rendered |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `export trigger rendered for fully-exportable package` | Positive case for AC-5.1 |
| `unavailable member hover does not attempt to fetch content` | No-fetch-on-unavailable invariant |
| `selectedMember is rendered via the same artifact review panel used for single-artifact review` | Composition invariant |

### `tests/service/client/package-member-nav.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-4.3b | `TC-4.3b selecting different member updates detail` | Two members rendered | Click different member | API call fired with new memberId |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `members rendered in position order` | Layout invariant |
| `selected member visually distinguished` | UX invariant |
| `unavailable member rendered non-navigably with affordance` | Degraded-state consistency |
| `member nav does not collapse when one member is unavailable` | AC-4.4 visual integrity |

### `tests/service/client/markdown-body.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-3.1a | `TC-3.1a markdown HTML mounts with structure preserved` | Body HTML with headings/tables/lists/code | Mount body | DOM contains expected structure |
| TC-3.2a (client half) | `TC-3.2a Mermaid placeholder hydrated with rendered SVG` | Body with placeholder + sidecar entry | Mount body | placeholder replaced with sanitized SVG (Mermaid mocked to return known SVG) |
| TC-3.3a | `TC-3.3a Mermaid diagram failure degrades locally` | Mermaid mock throws for one source; second source renders | Mount body | one placeholder shows error affordance; other renders; panel remains intact |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `cache hit returns same SVG without re-calling mermaid.render` | LRU cache behavior |
| `cache miss stores rendered SVG keyed on fnv1a(source):themeId` | LRU cache behavior |
| `each mermaid.render call uses a fresh unique id` | Known Mermaid footgun (#4369) |
| `re-mount with same body does not re-hydrate already-rendered placeholders` | Efficiency |
| `client-side SVG sanitization rejects foreignObject` | Defense layer |
| `client-side SVG sanitization runs before SVG insertion` | Ordering invariant |
| `non-placeholder DOM content is preserved during hydration` | Safety invariant |

### `tests/service/client/export-trigger.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-5.1a | `TC-5.1a successful export renders download link` | API mocks 200 export response | Click export | download link renders with downloadName + downloadUrl |
| TC-5.3a | `TC-5.3a export failure does not close review` | API returns 503 | Click export | failure affordance renders; surrounding panel remains operational |
| TC-5.3b | `TC-5.3b expired export requires re-export` | Two successive export clicks; first response's URL is expired | Two clicks | both POSTs fire; second renders a fresh download link |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `export button disabled during in-flight request` | State integrity |
| `export state transitions are atomic` | No leaked "exporting" state after completion |
| `failure affordance clears when a subsequent export succeeds` | UX consistency |

### `tests/service/client/review-router.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `review-workspace route parses projectId and processId from path` | Route parsing correctness |
| `review-workspace route parses targetKind, targetId, versionId, memberId from query` | Selection deserialization |
| `missing optional query fields resolve to empty selection` | Robust input |
| `invalid targetKind value falls back to undefined selection` | Robust input |

### `convex/artifactVersions.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `inserts artifact version with contentStorageId pointer` | Core table behavior |
| `lists versions by artifactId ordered by createdAt descending` | Drives AC-2.3b |
| `resolves storage URL for a version via internalQuery` | Fastify integration |
| `uses by_artifactId_createdAt index for version list queries` | Performance invariant |
| `uses by_createdByProcessId_createdAt index for reviewability count` | Performance invariant |

### `convex/packageSnapshots.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `inserts package snapshot with processId and publishedAt` | Core table behavior |
| `lists snapshots by processId ordered by publishedAt descending` | Drives reviewability count |
| `snapshot rows are immutable — no update function is exposed` | Immutability invariant |

### `convex/packageSnapshotMembers.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `inserts members with pinned artifactVersionId` | Pin invariant (AC-4.1b) |
| `lists members by packageSnapshotId ordered by position ascending` | Drives AC-4.2b |
| `member row cannot be updated after snapshot publication` | Immutability invariant |
| `reports unavailable status when pinned artifactVersionId no longer resolves` | Drives AC-4.4a |

### `packages/markdown-package/tests/create-from-entries.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `round-trip: create from entries → extract → members match input` | Core API correctness |
| `manifest entry is first in archive` | AC-5.2b invariant |
| `compress: true produces gzipped tar (.mpkz)` | Format correctness |
| `compress: false produces plain tar (.mpk)` | Format correctness |
| `Readable stream does not buffer entire archive in memory` | Streaming invariant (measure peak memory during large input) |
| `entries are written in iteration order` | Ordering invariant |

### `packages/markdown-package/tests/tar-hardening.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `createGunzip enforces maxOutputLength cap` | Gzip-bomb defense |
| `per-entry byte counter rejects oversize entries` | Memory DoS defense |
| `cumulative byte counter rejects oversize archives` | Memory DoS defense |
| `entry-name filter rejects NUL byte` | Injection defense |
| `entry-name filter rejects drive-letter prefix (C:) on POSIX input` | Cross-platform defense |
| `extract rejects symlink entry type` | Link-attack defense |
| `extract rejects hardlink entry type` | Link-attack defense |
| `extract rejects ..-traversal in entry path` | Path-traversal defense |

### `packages/markdown-package/tests/manifest.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `parseManifest reads structured metadata from fenced YAML block` | Format correctness |
| `scaffoldManifest produces markdown with YAML + navigation list` | Format correctness |
| `parseManifest → scaffoldManifest round-trip preserves structure` | Round-trip invariant |
| `missing metadata block produces empty metadata with raw content preserved` | Robust input |

### `packages/markdown-package/tests/cli.test.ts`

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `mdvpkg create writes .mpkz when compress flag is set` | CLI correctness |
| `mdvpkg ls lists members in package order` | CLI correctness |
| `mdvpkg extract writes members to output directory with package order preserved` | CLI correctness |
| `mdvpkg manifest prints _nav.md content` | CLI correctness |
| `mdvpkg info prints metadata and member count` | CLI correctness |
| `mdvpkg commands exit non-zero on invalid package path` | Error handling |

### `tests/integration/review-workspace.test.ts`

| TC | Test Name | Setup | Action | Assert |
|----|-----------|-------|--------|--------|
| TC-6.1a | `TC-6.1a reopen artifact review from durable state` | Seed review workspace; simulate reload with same URL | GET bootstrap twice | second response matches first target content |
| TC-6.1b | `TC-6.1b reopen package review from durable state` | Seed package review; reload | GET bootstrap twice | second response matches first target content |

**Non-TC decided tests:**

| Test Name | Reason |
|-----------|--------|
| `export round-trip: request export → download → inspect contents` | End-to-end export integration |
| `bookmark URL survives server restart with durable state intact` | Durability invariant |
| `reopening with stale selection (deleted version) returns unavailable without leaking prior content` | Graceful degradation |
| `controls[review].enabled reflects durable state after version insert` | Cross-route projection consistency |
| `controls[review].enabled reflects durable state after package snapshot publication` | Cross-route projection consistency |
| `export failure mid-stream (phase 2) results in truncated client download without server-side crash` | Stream-error safety |
| `export round-trip: phase 1 POST → phase 2 GET → extract → verify contents` | End-to-end export integration |

## Non-Functional Requirement Verification

Epic 4's NFRs are validated with dedicated tests alongside the feature test suite. These live under `tests/service/server/nfr.test.ts`.

| NFR | Test | Approach |
|-----|------|----------|
| Markdown artifact up to 200 KB renders within 2 s | `renders 200 KB markdown within 2 s` | Synthesize a 200 KB markdown fixture (representative structure: 500 paragraphs, 20 tables, 30 code blocks, 10 mermaid fences); invoke `MarkdownRendererService.render` directly; assert duration |
| Package of up to 20 members renders within 2 s | `renders 20-member package within 2 s` | Fixture package with 20 small-markdown members; call package review service; assert end-to-end duration |
| Switching between known versions updates within 1 s | (covered by `version-switcher.test.ts` timing assertion on API round-trip with mocked 50 ms API) | Client test with mocked API that resolves after a fixed delay; assert total time from click to render < 1 s under the 50 ms mock |
| Export preparation (phase 1) begins within 2 s | `phase-1 POST returns within 2 s for 20-member package` | Call export route via `app.inject`; assert phase-1 response time under 2 s with Convex reads mocked at realistic fixture delay |

## Accessibility Verification

Covered by `tests/service/client/a11y.test.ts` — 18 non-TC tests that enforce keyboard navigation, ARIA semantics, focus management, and non-color status indication:

**Keyboard navigation:**
| Test | Asserts |
|------|---------|
| version switcher arrow keys move focus | Arrow-up/arrow-down cycle focus across version list items |
| version switcher Enter fires selection | Enter on focused version triggers `onSelect` callback |
| package member nav arrow keys skip unavailable | Arrow keys move focus over ready members, skipping `aria-disabled` ones |
| package member nav Enter fires selection | Enter on focused ready member triggers `onSelect` |
| target selector is keyboard navigable | Arrow + Enter cycle through available targets |
| export trigger is keyboard activatable | Tab to button; Enter and Space both fire click handler |
| back-to-process link is standard anchor | `<a href>` with visible text; reachable via Tab |

**ARIA semantics:**
| Test | Asserts |
|------|---------|
| version switcher marks selection with `aria-selected` | Selected version row has `aria-selected="true"`; others have `aria-selected="false"` |
| version switcher uses `role="listbox"` + `role="option"` | Container and item roles set |
| package member nav marks unavailable with `aria-disabled` | Unavailable members carry `aria-disabled="true"` |
| package member nav uses `role="listbox"` + `role="option"` | Same semantic structure as version switcher |
| export trigger state changes announced via `aria-live` | `aria-live="polite"` region updates on idle → in-flight → success/failure transitions |
| Mermaid diagram failure uses `aria-describedby` | Failed diagram slot is programmatically associated with its error message |

**Focus management:**
| Test | Asserts |
|------|---------|
| route entry focuses page heading | Page `<h1>` has `tabindex="-1"` and receives focus on mount |
| version switch preserves switcher focus | After version change, focus stays in switcher for continued arrow navigation |
| member switch preserves member-nav focus | Same invariant for package member nav |

**Non-color and text indication:**
| Test | Asserts |
|------|---------|
| review-target status renders as readable text | Status ("Unavailable", "Unsupported format", etc.) present as DOM text, not color-only |
| degraded-state component renders title + message as readable text | DOM includes both `title` and `message` as text content |
| unsupported-fallback renders identity + explanatory text | Displays artifact displayName, version label, and the "not reviewable in this release" paragraph; supported-kinds line present |

## Observability Verification

Covered by `tests/service/server/observability.test.ts` — 12 non-TC tests that assert structured log lines land with expected fields on both happy and failure paths. One test per documented log point (see server doc §Observability).

## Chunk Breakdown and Test Counts

Every test file is assigned to exactly one primary chunk. Cross-chunk references (when a test's behavior is exercised during a later chunk) appear in the "Cross-chunk references" field but do not double-count.

### Chunk 0: Foundation

**Scope:** Monorepo wiring (`pnpm-workspace.yaml`, root `package.json`, root `tsconfig.json`), workspace package scaffold with build/test/typecheck scripts, shared contracts (Zod schemas for review responses + error codes), **Artifact storage model change — remove `contentStorageId`, `currentVersionLabel`, and `updatedAt` from the `artifacts` table; add `createdAt`. This is a schema rewrite under the repo's pre-customer stance; no user-data-preservation migration**, three new Convex tables (`artifactVersions`, `packageSnapshots`, `packageSnapshotMembers`), typed internal-mutation skeletons (`insertArtifactVersion`, `publishPackageSnapshot`), vendored `github-slugger` + `markdown-it-anchor` stubs, purpose-built task-list renderer skeleton, render service skeleton, test fixtures.

**ACs:** supports all
**TC conditions:** 0
**Additional non-TC tests:** 4 (`convex/artifacts.test.ts` extended for storage-model-change validation)
**Exit criteria:** `pnpm typecheck` and `pnpm build` succeed with all scaffolding in place; Convex schema validates; workspace package builds; `pnpm test:packages` runs to green (empty suites).

### Chunk 1: Review Entry and Workspace Bootstrap

**Scope:** Review route module, review workspace service, process-surface `controls[review].enabled` consultation, `process-work-surface-page.ts` wiring to navigate on review click, target-resolution + reviewability pure modules, review workspace page shell, router extension, bootstrap wiring, store slice.

**ACs:** AC-1.1 through AC-1.4
**TC conditions:** 10
**Files (primary chunk):** `review-workspace-api.test.ts`, `process-work-surface-api.test.ts` (extended), `process-work-surface-page.test.ts` (extended), `review-workspace-page.test.ts`, `review-router.test.ts`
**Per-file test count:** 14 + 4 + 3 + 14 + 4 = 39
**Relevant docs:** `tech-design.md` §System View, §Module Architecture Overview; `tech-design-server.md` §Flow 1; `tech-design-client.md` §Flow 0, §Flow 1

### Chunk 2: Artifact Versions and Revision Review

**Scope:** **Rewrite Epic 3 checkpoint path** to call `insertArtifactVersion` instead of overwriting `artifacts.contentStorageId`; `insertArtifactVersion` mutation implementation; `artifactVersions` reads; `getLatestArtifactVersion` helper on `PlatformStore`; read-path rewrite for every caller of the three removed `artifacts` fields (`contentStorageId`, `currentVersionLabel`, `updatedAt`) including `materials-section.reader.ts`; artifact review service; content retrieval via Convex File Storage URL; artifact review panel; version switcher; URL-based version selection.

**ACs:** AC-2.1 through AC-2.4
**TC conditions:** 7
**Files (primary chunk):** `convex/artifactVersions.test.ts`, `artifact-review-api.test.ts`, `artifact-review-panel.test.ts`, `version-switcher.test.ts`
**Per-file test count:** 7 + 11 + 8 + 5 = 31
**Relevant docs:** `tech-design-server.md` §Durable State Model, §Artifact Storage Model Change, §Flow 2; `tech-design-client.md` §Flow 2

### Chunk 3: Markdown and Mermaid Rendering

**Scope:** Markdown renderer service (markdown-it + Shiki + DOMPurify), Mermaid sanitize module (directive stripping), vendored `github-slugger` + `markdown-it-anchor` implementations, purpose-built task-list renderer implementation, client-side markdown body component, Mermaid runtime + cache + SVG sanitize, bounded diagram failure, unsupported fallback component.

**ACs:** AC-3.1 through AC-3.4
**TC conditions:** 4
**Files (primary chunk):** `markdown-renderer.test.ts`, `markdown-body.test.ts`
**Per-file test count:** 16 + 10 = 26
**Relevant docs:** `tech-design-server.md` §Flow 3; `tech-design-client.md` §Flow 3

### Chunk 4: Package Review Workspace

**Scope:** Typed `publishPackageSnapshot` internal mutation + member insert transactional invariants; `packageSnapshots` + `packageSnapshotMembers` reads; package review service with first-reviewable-member default; `PackageMemberReview` envelope with status/error/artifact?; member list; package context preservation; member-failure degradation; exportability computation.

**ACs:** AC-4.1 through AC-4.4
**TC conditions:** 8
**Files (primary chunk):** `convex/packageSnapshots.test.ts`, `convex/packageSnapshotMembers.test.ts`, `package-review-api.test.ts`, `package-review-panel.test.ts`, `package-member-nav.test.ts`
**Per-file test count:** 5 + 4 + 11 + 11 + 5 = 36
**Relevant docs:** `tech-design-server.md` §Flow 4; `tech-design-client.md` §Flow 4

### Chunk 5: Package Export (Two-Phase)

**Scope:** `createPackageFromEntries` streaming API on the workspace package; tar hardening (gzip-bomb cap, per-entry + cumulative byte caps, entry-name filter, path-traversal rejection); two-phase export service (phase-1 POST returns signed URL JSON; phase-2 GET streams bytes); signed URL mint + verify; expired-URL 404; `mdvpkg` CLI polish; export trigger UI with download-link render; `_nav.md` manifest generation and round-trip.

**ACs:** AC-5.1 through AC-5.3
**TC conditions:** 5
**Files (primary chunk):** `review-export-api.test.ts`, `export-url-signing.test.ts`, `export-trigger.test.ts`, `create-from-entries.test.ts`, `tar-hardening.test.ts`, `manifest.test.ts`, `cli.test.ts`
**Per-file test count:** 10 + 4 + 6 + 6 + 8 + 4 + 6 = 44
**Relevant docs:** `tech-design.md` §Workspace Package; `tech-design-server.md` §Flow 5, §Workspace Package; `tech-design-client.md` §Flow 5

### Chunk 6: Reopen, Degraded Operation, NFR, Observability, A11y

**Scope:** Durable reopen integration tests across target kinds; unavailable/unsupported state rendering on reload; bounded render-failure envelope on reload; revoked-access handling on direct URLs; NFR performance assertions; observability log-point coverage; accessibility semantics.

**ACs:** AC-6.1 through AC-6.3 + NFRs + Observability + A11y
**TC conditions:** 8
**Files (primary chunk):** `review-workspace.test.ts` (integration), `nfr.test.ts`, `observability.test.ts`, `a11y.test.ts`, `bundle-budget.test.ts`
**Per-file test count:** 10 + 4 + 12 + 18 + 2 = 46
**Relevant docs:** `tech-design-server.md` §Flow 6, §Observability; `tech-design-client.md` §Flow 6, §Accessibility

### Chunk Totals Reconciliation

| Chunk | Files | Tests | Of which TC-mapped |
|-------|-------|-------|---------------------|
| 0 | `convex/artifacts.test.ts` | 4 | 0 |
| 1 | 5 files | 39 | 16 |
| 2 | 4 files | 31 | 9 |
| 3 | 2 files | 26 | 5 |
| 4 | 5 files | 36 | 9 |
| 5 | 7 files | 44 | 10 |
| 6 | 5 files | 46 | 30 (reopen + degraded TCs spanning AC-6) |
| **Total** | **29 files** | **226 tests** | **79 TC-mapped rows** |

The 79 TC-mapped row count reflects that TCs are frequently asserted at both server and client layers (for example, TC-1.1a's entry behavior is tested at the process work-surface page AND TC-1.1a's bootstrap behavior is tested at the review workspace page — one TC, two test rows). The 42 unique TCs are the authoritative coverage metric; 226 tests is the authoritative implementation commitment.

Reconciliation check: per-file test counts in the inventory sum to **226**; per-chunk totals (4 + 39 + 31 + 26 + 36 + 44 + 46) sum to **226**. File inventory and chunk summary match exactly — no slop.

Round 4 deltas: markdown-renderer gained 3 output-side XSS sanity tests (Chunk 3 +3); a11y expanded from 8 → 18 (Chunk 6 +10); bundle-budget is a new 2-test file (Chunk 6 +2, +1 file).

## Manual Verification Checklist

1. Start local Convex (`npx convex dev`) and the Fastify/Vite dev server.
2. Sign in through the local WorkOS environment.
3. Open a process with at least one durable artifact version. Confirm the process work surface enables the `review` action (its `controls[review].enabled === true` because reviewable targets exist).
4. Click `review` and confirm the route navigates to `/projects/:projectId/processes/:processId/review` and the workspace loads.
5. Confirm the review workspace shows project identity, process identity, and the artifact target clearly.
6. Open an artifact with multiple versions. Confirm the version switcher lists versions newest-first and the current version is marked.
7. Select a prior version and confirm the body re-renders; confirm the URL updates via `history.pushState` so browser back returns to the prior selection.
8. Open a markdown artifact containing headings, tables, lists, code blocks with syntax highlighting, and at least one Mermaid diagram. Confirm rendering structure and diagram are visible.
9. Open a markdown artifact containing a `%%{init}%%` directive. Confirm the directive is stripped and the diagram renders with strict security level.
10. Open a markdown artifact whose format is `contentKind: unsupported`. Confirm the fallback affordance renders with artifact + version identity visible.
11. Open an artifact whose version content is (intentionally) broken. Confirm the body shows a bounded error affordance while the version switcher and identity remain visible.
12. Open a package snapshot with multiple members. Confirm member nav lists members in package order and the first member is selected by default.
13. Switch to a later package member. Confirm package context remains visible while the member detail updates.
14. Publish a new revision of an artifact whose prior version is pinned in an existing package snapshot. Reopen the package and confirm it still points to the pinned version.
15. Open a package with one intentionally unavailable member. Confirm the package remains open, the unavailable member is non-navigable with a clear affordance, and the healthy members remain reviewable.
16. Trigger an export on a fully-exportable package. Confirm the response includes a download link, download succeeds, and the `.mpkz` archive contains `_nav.md` + one entry per member.
17. Run `mdvpkg info` / `mdvpkg ls` / `mdvpkg manifest` on the downloaded `.mpkz` and confirm the outputs match expectations.
18. Trigger an export on a package with one unavailable member. Confirm the server rejects with `REVIEW_EXPORT_NOT_AVAILABLE` and the review workspace remains operational.
19. Reopen a review URL after server restart. Confirm durable review state is restored and no stale content leaks in.
20. Revoke review access (remove project membership) and reopen a direct review URL. Confirm access is blocked with a route-level unavailable state and no review content is leaked.
