# Epic 4 Build Summary: Artifact Review and Package Surface

## Purpose

This document summarizes what Epic 4, `Artifact Review and Package Surface`,
was intended to establish in the Liminal Build platform standup and what the
team implementation log suggests actually happened during delivery.

Primary source set reviewed:

- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/epic.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/tech-design.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/tech-design-server.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/tech-design-client.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/test-plan.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/team-impl-log.md`
- `docs/spec-build/v2/epics/04--artifact-review-and-package-surface/impl-run.config.json`

Upstream framing is inherited from the previously reviewed:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/core-platform-arch.md`
- Epic 1, Epic 2, and Epic 3 build-summary context

Notable file-status findings:

- No standalone `decision-memo.md` was present at the Epic 4 root.
- No root-level remediation or fix-batch files were present beyond the team
  implementation log and implementation-run config.
- Story and story-verification directories exist but were intentionally not
  read for this review.

This report is not a code audit. It is a spec-intent plus implementation-log
baseline for later comparison against the repo.

## Upstream Intent Relevant to Epic 4

The upstream product and architecture direction says Liminal Build should keep
large software-planning work inside one process-aware platform surface rather
than scattering outputs into detached tools. Epic 1 established the project and
process shell. Epic 2 made the process work surface durable and resumable. Epic
3 introduced controlled execution, disposable environment state, and durable
artifact/checkpoint truth.

Epic 4 is the first real review layer on top of that foundation. It answers the
question: once a process has durable outputs, how does a user inspect them,
reopen them later, see versions, and export a bounded output package without
leaving the platform or confusing process context?

The upstream principles that matter most are:

- Fastify remains the authenticated control plane and review API boundary.
- Convex remains the durable state layer.
- Convex File Storage holds artifact bytes; browser code must not receive raw
  storage URLs.
- Project artifacts are durable project assets, while process context determines
  review eligibility.
- Review is process-aware, not a global document library.
- The filesystem/environment layer from Epic 3 is disposable; review must work
  from durable artifact state even when no active environment exists.

## Epic 4 Goals and Scope

Epic 4 was intended to deliver a process-aware review workspace for durable
process outputs. The user should be able to open review from the process work
surface, see project/process/target identity together, review current and prior
artifact versions, read markdown with preserved structure, view Mermaid
diagrams in place, reopen review later, and see bounded unavailable or degraded
states without stale content leaking.

The epic also builds package review and export substrate:

- durable package snapshot and member storage
- a typed `publishPackageSnapshot` internal mutation
- package review contracts and workspace UI
- `.mpkz` export generation with `_nav.md` manifest
- signed download URL flow

However, package review and export are explicitly split from production package
publication. Epic 4 ships the substrate and test/manual-seeding path, but a
downstream process-module epic must decide when to call
`publishPackageSnapshot` from real production process logic. Artifact review is
user-deliverable immediately after Epic 4; package review/export light up
end-to-end once downstream publication exists.

Out of scope by design:

- global artifact library browsing
- archive, turn, chunk, or transcript browsing
- package authoring/editing/reordering UX
- process-independent document management
- rich non-markdown renderers beyond unsupported fallback
- live-update transport for review
- broad publication/distribution workflows beyond current reviewed-package
  export

## What Epic 4 Was Supposed to Put in Place

At platform level, Epic 4 was supposed to establish:

- a new review route under the existing project/process URL context
- review enablement on the process surface based on actual reviewability
- a durable review workspace bootstrap response
- artifact version storage and current/prior version review
- markdown rendering with hardened sanitization
- Mermaid sidecar extraction and client hydration
- package snapshot and package member persistence
- package member navigation pinned to exact artifact versions
- exportability computed from durable package member availability
- two-phase `.mpkz` package export
- reopen and degraded-state behavior that preserves review context
- a new workspace package, `@liminal-build/markdown-package`, to own package
  archive format concerns

The most important design move is that Epic 4 deepens artifact durability. Epic
3 had artifact content on the artifact row. Epic 4 changes the model so the
artifact row is project-scoped identity, while content, labels, timestamps, and
process provenance live on `artifactVersions`.

## Key Server Designs

### Route and Service Shape

Epic 4 adds a new Fastify review route family:

- HTML route: `/projects/:projectId/processes/:processId/review`
- bootstrap API: `GET /api/projects/:projectId/processes/:processId/review`
- artifact target API:
  `GET /api/projects/:projectId/processes/:processId/review/artifacts/:artifactId`
- package target API:
  `GET /api/projects/:projectId/processes/:processId/review/packages/:packageId`
- package export POST:
  `POST /api/projects/:projectId/processes/:processId/review/packages/:packageId/export`
- export download GET:
  `GET /api/projects/:projectId/processes/:processId/review/exports/:exportId`

The intended server module set:

- `routes/review.ts`
- `services/review/review-workspace.service.ts`
- `services/review/artifact-review.service.ts`
- `services/review/package-review.service.ts`
- `services/review/export.service.ts`
- `services/review/export-url-signing.ts`
- `services/review/reviewability.ts`
- `services/review/target-resolution.ts`
- `services/rendering/markdown-renderer.service.ts`
- `services/rendering/mermaid-sanitize.ts`
- vendored/owned markdown helpers for heading slugs, anchors, and task lists

The process work surface remains authoritative for process controls, but Epic 4
extends the `review` control enablement logic so the action is enabled only
when the current process review context has at least one reviewable target.

### Durable Data Model

The intended durable model:

- `artifacts`: project-scoped artifact identity only.
- `artifactVersions`: one row per durable revision, with
  `contentStorageId`, `contentKind`, `versionLabel`, `bytes`, `createdAt`, and
  `createdByProcessId`.
- `packageSnapshots`: immutable package publication records for one process
  review context.
- `packageSnapshotMembers`: ordered pinned artifact-version members for a
  package snapshot.

The design says `artifacts.processId`, `artifacts.contentStorageId`,
`artifacts.currentVersionLabel`, and `artifacts.updatedAt` are removed, with
summary fields derived from latest `artifactVersions`. Later Epic 5 alignment
reinforces that artifact-row ownership is not the reviewability rule. Process
refs and pinned review context determine eligibility; version provenance is
provenance, not ownership.

### Artifact Review

Artifact review resolves the artifact identity in the current process review
context, lists versions newest-first, picks the selected version or current
version, fetches content through Fastify, and renders it. Zero-version artifacts
are not available targets and do not enable review entry, but a valid direct
target path can render a `target.status: empty` no-version state.

Content fetch uses Convex File Storage URLs obtained server-side. The design is
explicit that these URLs are public capabilities: they do not expire, are not
browser-safe, and must never be returned in response bodies, logs, or errors.
Fastify is the auth proxy.

### Markdown and Mermaid Rendering

Markdown rendering is server-owned:

- `markdown-it` with `html: false`
- Shiki syntax highlighting
- DOMPurify sanitization
- heading anchors and task-list support
- Mermaid fence interception
- placeholder divs in the rendered HTML
- Mermaid sidecar blocks returned to the client

Mermaid security is intentionally layered. Server-side sanitization strips
`%%{init}%%`, `%%{config}%%`, and `%%{wrap}%%` directives before the browser sees
Mermaid source. Client-side Mermaid uses strict configuration and sanitizes SVG
output with browser `dompurify`.

The `body` field in `ArtifactVersionDetail` is clarified by the tech design as
server-rendered sanitized HTML, not raw markdown source.

### Package Review

A package is a durable snapshot with ordered members pinned to exact artifact
version IDs. It is not a live "latest documents" grouping. Revisions after a
snapshot do not change the package.

Package review:

- loads package identity and ordered members
- computes each member status as `ready`, `unsupported`, or `unavailable`
- defaults to the first `ready` member, falling back to the first durable
  unsupported member when no member is ready
- preserves package context while switching members
- keeps healthy members visible when one member fails
- computes `exportability` server-side

Unsupported members are durable and count for package review/export. Unavailable
members do not.

### Export Pipeline

Export is a two-phase flow:

1. POST export validates exportability and returns `ExportPackageResponse`
   containing `downloadUrl`, `downloadName`, `contentType:
   application/gzip`, `packageFormat: mpkz`, and `expiresAt`.
2. GET the signed URL verifies the HMAC token, re-checks access and
   exportability, and streams `.mpkz` bytes.

The `.mpkz` format is a gzip-wrapped tar archive with `_nav.md` as the manifest
entry. The new `@liminal-build/markdown-package` workspace package owns archive
creation, extraction, inspection, manifest helpers, and the `mdvpkg` CLI.

Hardening requirements include per-entry and total byte caps, gzip-bomb
protection, path traversal checks, NUL/drive-letter/non-NFC path rejection, and
symlink/hardlink/device rejection.

## Key Client Designs

The browser remains the existing Vite-built TypeScript shell. Epic 4 adds a
review route and feature subtree, not a new app or framework.

Client additions include:

- router support for `/projects/:projectId/processes/:processId/review`
- `ReviewWorkspaceState` in the app store
- `browser-api/review-workspace-api.ts`
- `features/review/review-workspace-page.ts`
- `artifact-review-panel.ts`
- `package-review-panel.ts`
- `markdown-body.ts`
- `mermaid-runtime.ts`
- `mermaid-cache.ts`
- `target-selector.ts`
- `version-switcher.ts`
- `package-member-nav.ts`
- `export-trigger.ts`
- `degraded-state.ts`
- `unsupported-fallback.ts`

Review has no live subscription. First paint comes from the durable bootstrap
response. Version and member switches use targeted API calls and update URL
query state via `history.pushState` so browser back/forward and reopen remain
meaningful.

The client renders server-sanitized HTML via `innerHTML`, then hydrates Mermaid
placeholders with cached SVGs. Mermaid render calls must use fresh unique IDs.
Per-diagram failures degrade locally.

The export trigger is rendered only when `target.exportability.available` is
true. The client performs only phase 1 POST. Phase 2 is a normal anchor
navigation to the signed download URL, not a JavaScript fetch.

Accessibility is part of the design:

- version switcher and package member nav use listbox/option semantics
- unavailable members are disabled/non-navigable for activation but still
  handled correctly for keyboard traversal
- export status uses `aria-live`
- target status and degraded states render readable text, not color-only cues
- focus is managed on route entry and selection changes

## Data Model and State Boundaries

Epic 4 is defined by several deliberate boundaries:

- Browser never talks directly to Convex or File Storage.
- Fastify owns auth, project/process access checks, content proxying, rendering,
  export validation, and signed download URLs.
- Convex owns durable identity, versions, snapshots, and members.
- File Storage owns bytes, but storage URLs stay inside Fastify.
- Review state is durable URL/query-driven state plus current bootstrap
  response; there is no live session state to reconstruct.
- Package snapshots and members are immutable after publication.
- Export state in the browser is ephemeral and scoped to the review workspace.

The design also distinguishes two empty states:

- no process review targets: `availableTargets: []` and no `target`
- selected artifact has no versions: `target.status: empty`

This distinction became important during implementation because zero-version
direct-target behavior and target-list reviewability are intentionally not the
same rule.

## Process, Reference, and Pinned Context Behavior

Epic 4 includes an Epic 5 alignment backfill that is important for later review:

- Artifacts are project assets, not rows owned by one primary process.
- Review eligibility starts from the current process review context: process
  artifact refs plus explicitly pinned targets/packages.
- Package snapshots opened from one process context may pin artifact versions
  produced by multiple processes in the same project.
- `artifactVersions.createdByProcessId` records provenance but should not be
  used as the sole reviewability or ownership check.
- Zero-version artifacts are excluded from `availableTargets` but can show an
  empty state through a valid direct target path.

This is one of the main platform-model refinements introduced by Epic 4.

## Test Strategy

The test plan maps AC to TC to test file and adds a large non-TC invariant
suite. Planned coverage was 226 tests across 29 files, with 42 unique TCs and
79 TC-mapped rows because many conditions are asserted at both server and
client layers.

Planned test lanes:

- `red-verify`: format, lint, typecheck, build
- `test:convex`
- `test:service`
- `test:client`
- `test:packages`
- `verify`
- `green-verify`
- `verify-all`

The new `test:packages` lane is required because Epic 4 adds
`packages/markdown-package`.

The test plan emphasizes hardening tests beyond product TCs:

- markdown raw HTML is dropped
- DOMPurify rejects unsafe tags/attrs
- Mermaid directives are stripped
- Mermaid SVGs are sanitized client-side
- export token tampering and expiry fail correctly
- archive path and byte-cap defenses work
- storage URLs are redacted in logs
- review controls reflect reviewability
- package snapshot immutability holds
- package export manifest is first in archive
- bundle size stays under a 600 KB gzipped delta budget
- NFR smoke tests cover markdown render, package render, version switch, and
  phase-1 export preparation timing

Manual verification in the test plan includes a small doc drift: it says to
start Convex with `npx convex dev`, while current repo instructions say to use
`pnpm run convex:dev` because local worktree ports must be honored.

## Implicit Decisions

There is no standalone decision memo, but the tech design records several
decisions that function as the decision record:

- `.mpkz` replaces an earlier zip assumption; content type is
  `application/gzip`.
- `body` in the artifact response means sanitized HTML, not raw markdown.
- Export is two-phase, not inline streaming from the POST.
- Artifact rows are identity-only; all version-specific state moves to
  `artifactVersions`.
- Package publication API ships without a production caller.
- Unsupported-but-durable package members remain exportable.
- Mermaid directive stripping is server-side.
- `markdown-it` runs with `html: false`; downstream process modules must emit
  pure markdown rather than raw HTML.
- Review enablement stays server-side and is projected into existing controls.
- Review bootstrap returns bounded unavailable target state after
  project/process context resolves.
- Review has no live transport in the first cut.
- Single-secret HMAC export signing ships first; key rotation is deferred.

## Implementation Log Findings

The implementation log indicates that all stories were eventually accepted and
that final gates passed, but the route to that result exposed several platform
and orchestration lessons.

### Delivery Pattern

The run used:

- primary harness: `claude-code`
- story implementor: Codex `gpt-5.4` high
- story verifiers: Codex `gpt-5.4` xhigh and `gpt-5.3-codex` high
- quick fixer: initially medium, later changed to xhigh
- self-review: 3 passes
- story gate: `corepack pnpm run green-verify`
- epic gate: `corepack pnpm run verify-all`

The final `impl-run.config.json` shows `quick_fixer.reasoning_effort:
xhigh`, reflecting the mid-run adjustment after Story 2 churn.

### Story-Level Summary

Story 0, Foundation:

- Landed workspace package scaffolding, review contracts, Convex schema changes,
  new tables, rendering scaffolds, and fixtures.
- Required four verifier rounds and three quick fixes.
- Fixed overly permissive contract validation, codegen/schema refinement gaps,
  and accidental public Convex query exposure.
- Left dev-DB schema mismatch as a pre-customer local cleanup concern.

Story 1, Review Entry and Workspace Bootstrap:

- Initially accepted a package read path that only worked in in-memory tests.
- User review caused a reopen; the log explicitly says the original
  accepted-risk rationale was wrong.
- Follow-ups wired real Convex package read paths and seeded-package integration
  coverage.
- Added unsupported fallback reviewability and cross-kind newest-first target
  ordering.
- Final acceptance had passing gates, with flaky/pre-existing integration-test
  concerns deferred outside Story 1.

Story 2, Artifact Versions and Revision Review:

- Had the highest churn: six verify rounds, five quick fixes, and two
  story-continue attempts.
- Fixed tech-design deviations, the storage URL pattern, version caps,
  checkpoint writer timestamp authority, XSS in placeholder rendering,
  zero-version direct-target regression, and project artifact summary cap.
- The log identifies this as an orchestration failure mode: non-trivial
  integration fixes were routed through quick-fix without enough context.

Story 3, Markdown and Mermaid Review:

- Accepted after three verifier rounds.
- Fixed client SVG sanitization to use DOMPurify, directive-only Mermaid fence
  behavior, version-ID traceability, zero-byte body handling, and 200 KB render
  smoke proof.
- Log reports no open risks after acceptance.

Story 4, Package Review Workspace:

- Accepted after five verifier rounds and four follow-ups.
- Fixed snapshot immutability, publish invariants, process ownership validation,
  persisted member display/version labels, server-side label derivation, and
  20-member/2-second performance proof.
- Open risk was dev-DB migration noise for newly required member fields under
  pre-customer direct schema changes.

Story 5, Package Export:

- Accepted after six verifier rounds and five `story-continue` follow-ups.
- Fixed token 404 shapes, export traceability, missing
  `EXPORT_SIGNING_SECRET` in env template, archive path collisions,
  no-store cache headers, token-failure logging, URL validation, expired URL
  UX, package-scoped export state races, HEAD preflight side effects,
  end-to-end streaming, and `aria-live` export messaging.
- Deferred NFR/observability items to Story 6 and a minor bootstrap error
  taxonomy issue to cleanup.

Story 6, Reopen, Unavailable, and Degraded Review States:

- The log has two acceptance receipts. The earlier 540-test receipt was
  superseded by a later 541-test receipt that added the missing Chunk 6
  production NFR/a11y/observability work.
- Final acceptance reports four verifier rounds, four follow-ups, and
  `verify-all` passing with 541 tests.
- Fixed stale selection races, error-path guards, explicit missing-member
  behavior, production ARIA semantics, production observability/log redaction,
  and disabled-member keyboard traversal.
- The final Story 6 receipt says open risks: none.

### Verification Evidence

The final baseline in the log is 541 tests:

- convex: 54
- service: 234
- client: 226
- packages: 5
- integration: 22

The final story receipt reports `corepack pnpm run green-verify` and
`corepack pnpm run verify-all` passing. Earlier receipts show the baseline
growing from 370 pre-Story-0 to 541 after Story 6.

### Problems Encountered and Fixes

Important implementation/orchestration problems:

- CLI/codex output parsing and schema issues blocked early story execution.
- The CLI initially validated continuation handles against orchestrator log
  state, which the log identifies as contrary to the CLI's stateless design.
- Quick-fix artifacts and docs disagreed on artifact directory layout.
- Quick-fix envelopes were large because they inlined raw provider output.
- Story 1 showed the danger of accepting in-memory or shim behavior where the
  production Convex read path is in scope.
- Story 2 showed that broad invariant changes need story-continue context, not
  narrow quick-fix routing.
- Story 6 showed that story files can understate test-plan chunk scope; the
  test plan must be used as an implementation source, not just the story DoD.

### Residual Risks From the Log

The final log says no open risks, but future reviewers should still treat these
as things to verify:

- dev DB schema mismatch under direct pre-customer schema edits may hide
  migration assumptions
- docs/log drift around whether `artifacts.processId` was retained or removed
- route/error taxonomy for bootstrap versus target-specific endpoints
- storage URL redaction and non-exposure
- exported archive cache headers and token expiry behavior
- package publication path remains substrate-only until downstream process
  modules call it

## How the Build Appears to Have Gone

Epic 4 appears to have landed its intended platform shape, but not in a straight
line. The implementation log reads like a successful but expensive integration
epic:

- The spec/tech design was unusually detailed and caught several design repairs
  before implementation.
- The build found real production-path gaps, especially where in-memory tests
  masked missing Convex integration.
- Verification was effective at finding security, durability, state-race,
  accessibility, and observability gaps.
- Several stories required many rounds, but most findings were fixed rather
  than accepted away.
- The final receipts report passing gates and a substantial test baseline.

The main architectural outcome is positive: Epic 4 appears to have turned
artifact outputs into reviewable, versioned, packageable durable platform
objects. The main process outcome is sobering: this surface is broad enough
that quick fix loops and story-file-only implementation can miss cross-cutting
requirements unless the orchestrator actively reads adjacent code and the test
plan.

## Completed Work

Based on the spec and log, Epic 4 completed:

- review route and workspace bootstrap
- process-surface review action wiring
- reviewability computation
- artifact version persistence and review
- latest/prior version switching
- zero-version direct-target empty state
- markdown render pipeline
- Mermaid directive stripping and client hydration
- unsupported artifact fallback
- package snapshot and member persistence
- package review with ordered members and pinned versions
- package member unavailable/degraded behavior
- two-phase `.mpkz` export
- signed export URL mint/verify
- archive generation via workspace package
- `mdvpkg` package tooling
- NFR, observability, accessibility, and bundle-budget test coverage
- structural logging and redaction
- stale selection guards in client switching paths

## Deviations and Pivots

Notable pivots from early assumptions:

- Export changed from zip-ish language to `.mpkz` tar+gzip.
- Export changed from single-phase inline streaming to POST metadata plus signed
  GET.
- Artifact rows changed from holding mutable latest content to identity-only
  rows plus append-only version records.
- Package publication was clarified as substrate-only in Epic 4.
- The original Story 1 acceptance of package-read shims was reversed.
- Quick-fix routing was tightened after Story 2 because integration fixes
  needed retained story context.
- Story 6 acceptance was effectively superseded after missing NFR/a11y/logging
  production coverage was discovered.

Potential drift to verify:

- The retained notes in `team-impl-log.md` say the storage model kept
  `processId` on `artifacts`, while the tech design repeatedly says
  `processId` is removed. The design/alignment text should be treated as
  normative unless code proves otherwise.

## Risks, Tradeoffs, and Open Questions

Technical risks and tradeoffs:

- Storage URLs are public capabilities. Any accidental exposure is a serious
  boundary failure.
- Server-rendered HTML plus client `innerHTML` depends on the sanitization
  pipeline staying correct and tested.
- Mermaid remains a heavy browser dependency, hence the bundle budget.
- `tar-stream` is pinned but called out as lightly maintained; replacement or
  vendoring is deferred.
- Export signing uses a single HMAC secret; key rotation is deferred.
- Package publication is an internal API without a production caller in this
  epic, so real user-facing package review/export depends on later process
  modules.
- Direct schema edits are acceptable pre-customer but would need migration
  planning later.
- Review contract versioning is deferred.
- Non-markdown renderers are deferred.
- Live review updates are deferred.

Open questions for later review:

- Did the final implementation truly remove artifact-row process ownership, or
  did some compatibility field remain?
- Are reviewability checks consistently process-ref/pinned-context based rather
  than provenance based?
- Do package snapshots support multi-process members within the same project?
- Does the code enforce package immutability with no update API?
- Are all storage URL paths covered by structural redaction?
- Are manual/test docs updated to use `pnpm run convex:dev` instead of
  `npx convex dev`?

## Intentional Deferrals

Do not treat these as missing Epic 4 work:

- production process-module caller of `publishPackageSnapshot`
- package authoring/editing/reordering UX
- global artifact library
- full archive/transcript browser
- non-markdown rich renderers
- review live-update subscription
- theme switching with Mermaid re-render
- ordered package-history UI
- export signing key rotation
- review contract version negotiation
- replacement of `tar-stream`
- customer-safe schema migrations

## How Epic 4 Contributes to the Larger Standup

Epic 4 is a key transition from "processes can produce durable outputs" to
"outputs are reviewable product objects." It gives the platform a real artifact
review layer, a version model, a package snapshot model, and an export format.

For the larger Liminal Build platform, this matters because future functional
process epics, especially epic creation, will need to produce specs, tech
designs, story packs, and eventually build packages that users can inspect and
carry forward. Epic 4 supplies the review/export substrate those process
modules should call rather than inventing per-process viewers.

It also proves several architectural habits that should continue:

- process-aware surfaces instead of detached tools
- durable canonical outputs independent of active environments
- server-owned security boundaries around agentic content
- append-only version history rather than mutable latest-only documents
- pinned package snapshots rather than floating output sets
- explicit degraded states instead of stale content leakage

## Assessment Notes for Later Review

Future reviewers comparing spec intent to implementation reality should verify:

- The review route exists at
  `/projects/:projectId/processes/:processId/review` and the corresponding API
  route family matches the spec.
- The process work surface `review` control is enabled only when reviewable
  targets exist and disabled with a readable reason when not.
- Shell/process action projections do not drift from the process-surface review
  enablement rule.
- `artifacts` are truly project-scoped identity rows, and removed fields
  (`contentStorageId`, `currentVersionLabel`, `updatedAt`, and artifact-row
  ownership) are not still relied on.
- `artifactVersions` is the single source of truth for content pointer, version
  label, created time, content kind, bytes, and process provenance.
- Epic 3 checkpoint writing appends `artifactVersions` instead of overwriting
  artifact content.
- Artifact summaries derive current label and updated time from latest version
  rows.
- Reviewability starts from process refs or pinned context, not from
  `createdByProcessId` alone.
- Zero-version artifacts are excluded from target lists but can render the
  direct-target empty state when validly reached.
- Fastify fetches Convex File Storage content internally and never returns,
  logs, or exposes storage URLs to the browser.
- Logger redaction structurally catches storage URLs and export-sensitive
  fields.
- Markdown rendering uses `html: false`, DOMPurify, Shiki, task lists, heading
  anchors, and emits sanitized HTML plus Mermaid sidecar.
- Mermaid directive stripping happens server-side and client SVG sanitization
  uses browser `dompurify`.
- Mermaid render failures are per-diagram, not whole-artifact failures.
- Unsupported artifacts show identity/version/status without raw byte exposure.
- Package snapshots and members are immutable after publication.
- `publishPackageSnapshot` validates non-empty members, member ownership/project
  consistency, unique positions, integer/nonnegative positions, and derives
  display/version labels server-side if the implementation log fixes landed.
- Package members pin exact artifact version IDs and remain stable after later
  artifact revisions.
- Package review defaults to the first ready member, then durable unsupported
  fallback.
- Package member unavailable states do not hide healthy members.
- Exportability is durability-based: unsupported members can export;
  unavailable members block export.
- POST export returns signed metadata only; GET signed URL streams `.mpkz`.
- Signed export URLs expire, reject tampering, use `Cache-Control: no-store`,
  and can be regenerated without closing review.
- Export archive includes `_nav.md` first and member files for pinned versions,
  with collision-safe paths.
- Tar/gzip hardening exists in `@liminal-build/markdown-package`.
- `test:packages` is wired into default verification.
- Final tests actually include NFR, observability, accessibility, and
  bundle-budget coverage against production code, not only scaffold or fixture
  behavior.
- The final Story 6 state corresponds to the later 541-test receipt, not the
  earlier superseded 540-test receipt.
- Any current docs that tell developers to run `npx convex dev` are reconciled
  with repo instructions to use `pnpm run convex:dev`.
