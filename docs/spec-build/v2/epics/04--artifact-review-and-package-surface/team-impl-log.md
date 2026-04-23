# Team Implementation Log

## Run Overview
- State: BETWEEN_STORIES
- Spec Pack Root: /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/04--artifact-review-and-package-surface
- Current Story: (01 accepted; next: 02-artifact-versions-and-revision-review)
- Current Phase: —
- Last Completed Checkpoint: Story 1 accepted (1 verify round, 0 quick-fixes, converged finding disposed as accepted-risk per epic scope, baseline 406; commit pending)

### CLI issue #17 — RESOLVED 2026-04-23 ~04:30Z (user fixed codex_output_schema)
Coder agent redeployed skill with strict-schema helper (`codex-output-schema.ts`) now wired into all fresh Codex execs. `tests.totalAfterStory` and `tests.deltaFromPriorBaseline` made required-and-nullable internally, normalized out of final envelope if null. Schema-rejection now surfaces correct `PROVIDER_OUTPUT_INVALID` with real detail. Also includes retained-session simplification and prompt/docs alignment for provider payload vs final envelope. Validation: 304 pass, 0 fail. Re-dispatching Story 1 `story-implement` at 04:31Z.

## Issue Status Ledger (consolidated view)

Every CLI / skill issue or observation raised during this run, with current status. Original detail entries below remain authoritative — this is an index for the coder reviewing the run.

| # | Short Title | Status | Resolved how / Notes |
|---|---|---|---|
| 1 | CLI binary lacks +x (must invoke via `node`) | **OPEN** | `bin/ls-impl-cli.cjs` still `-rw-r--r--` after redeploy (checked 2026-04-23 ~10:30Z). Orchestrator workaround continues to work. Fix: `chmod +x` in the skill package or install step. |
| 2 | Config schema has 2 epic-verifier slots, user wanted 4 | **DESIGN CONSTRAINT** | Not a bug. Run plan: first `epic-verify` with gpt-5.4/xhigh + claude-sonnet-4.6/high; second `epic-verify` with gpt-5.3-codex/xhigh + claude-opus-4.7/xhigh by swapping the config; both reports fed into `epic-synthesize`. |
| 3 | "max" reasoning effort not in documented enum | **ACCEPTED / MAPPED** | User's "opus 4.7 max" mapped to `reasoning_effort: xhigh` (closest semantic). No CLI error; preflight accepted. |
| 4 | Model-name validation unknown until preflight | **CONFIRMED OK** | Preflight accepted all model names (`gpt-5.4`, `gpt-5.3-codex`, `claude-sonnet-4.6`). Not validated strictly by CLI, just passed through to providers. Works in practice. |
| 5 | Only 2 story-verifier slots | **DESIGN CONSTRAINT** | Matches Epic 4's requested verifier count. No fix needed for this run. |
| 6 | No CLI flag for extra verifiers beyond config | **DESIGN CONSTRAINT** | Everything config-driven. Same as #2; worked around with config swap between passes. |
| 7 | Preflight silently persists `verification_gates` into `impl-run.config.json` | **OPEN** | Behavior is useful but `setup/12-run-setup.md` still says "do not rewrite an existing run's config." Either document the persistence as expected, or make it opt-in/opt-out via a flag. Not destructive for this run. |
| 8 | Story gate picked `green-verify` rather than `verify` | **NOT AN ISSUE** | Stricter-is-better; `green-verify` ≡ `verify + guard:no-test-changes` (SKIP stub in this repo). Observation only. |
| 9 | Gate discovery doesn't explain its selection rationale in envelope | **OPEN (minor)** | `storyGateSource: "repo-root package.json scripts"` but no field showing which candidates were considered. Would help operator mental model. |
| 10 | Artifact directory naming mismatch — docs said `story-<id>/`, CLI writes `<id>/` | **RESOLVED (docs updated)** | `operations/33-artifact-contracts.md` re-checked 2026-04-23 ~10:30Z now shows `<story-id>/` (no `story-` prefix) — matches CLI behavior. |
| 11 | 🚨 Codex output parser broken — "Provider stdout was not exact JSON" | **RESOLVED 2026-04-23 ~00:45Z (user patch)** | Folded into the round of fixes that decoupled self-review from story-implement and aligned prompt output schema. `story-self-review` retry at 03:26Z succeeded cleanly (see #13). The root JSONL-parse gap was closed by the same patch pass. |
| 12 | CLI was validating session IDs against team-impl-log state | **RESOLVED 2026-04-23 ~02:45Z (user patch)** | Inappropriate validation removed by user per explicit directive ("the cli SHOULD NOT BE VALIDATING session id's in the log"). Confirmed by successful `story-self-review --provider codex --session-id <id>` at 03:26Z with the same handle the prior call rejected. |
| 13 | Codex prompt-output schema ≠ CLI validation schema | **RESOLVED 2026-04-23 ~03:26Z (user patch)** | See full entry below. Post-fix schema shape is `outcome / planSummary / changedFiles:[{path,reason}] / tests:{added,modified,removed,totalAfterStory,deltaFromPriorBaseline} / gatesRun / selfReview:{passesRun,findingsFixed,findingsSurfaced} / openQuestions / specDeviations / recommendedNextStep`. Confirmed working across Story 0 self-review + 4 verify rounds + 3 quick-fixes. |
| 14 | `quick-fix` artifacts under `artifacts/quick-fix/` (not story dir); absent from `operations/33-artifact-contracts.md` | **PARTIAL — docs updated, CLI behavior unchanged** | `operations/33-artifact-contracts.md` now lists a `quick-fix` artifact inside `<story-id>/` (as `007-quick-fix.json`), but the CLI actually wrote Story 0's 3 quick-fix results to `artifacts/quick-fix/001-quick-fix.json`, `002-...`, `003-...`. The doc and behavior still disagree. Fix direction: either have `quick-fix --story-id <id>` land inside the story dir, or keep the top-level `quick-fix/` and update the doc accordingly. |
| 15 | `quick-fix` envelope inlines ~196 KB of raw provider stdout as `result.rawProviderOutput` | **STATUS UNKNOWN** | Not re-verified after the 2026-04-23 ~04:30Z redeploy. To confirm, check the size of the next quick-fix envelope (first quick-fix in Story 1 or later). If still ~200 KB, recommend capping or replacing with a stream-log pointer. |
| 16 | Orchestrator's first quick-fix monitor used wrong glob and fell through to stale status | **RESOLVED — orchestrator's bug** | Not a CLI issue. Fixed by re-arming the monitor on the explicit `artifacts/quick-fix/progress/001-quick-fix.status.json` path. Kept on record so future orchestrators know story-agnostic ops live elsewhere. |
| 17 | 🚨 BLOCKING — `codex_output_schema` invalid for OpenAI strict structured outputs | **RESOLVED 2026-04-23 ~04:30Z (user patch)** | Coder agent's fix: `tests.totalAfterStory` / `tests.deltaFromPriorBaseline` made required-and-nullable internally, normalized out of final envelope if null. Shared `codex-output-schema.ts` helper now wired into every fresh Codex exec (so all ops with fresh codex sessions are hardened, not just story-implement). Also: schema-rejection failures now surface the real `invalid_json_schema` detail instead of the misleading `PROVIDER_UNAVAILABLE` surface. Story 1 `story-implement` re-dispatched at ~10:20Z, running successfully at the time of this update. |
| 18 (new) | CLI prints "Default sub command ... not found in subCommands." when run without args | **OPEN (minor UX)** | Running `node bin/ls-impl-cli.cjs` with no args now prints a help block then a literal `Default sub command [hint text] not found in subCommands.` error. The hint itself is helpful but the trailing "not found" line looks like a bug in the arg-parser library. Cosmetic; doesn't affect real use since operators always pass a subcommand. |

### Open items requiring no code fix (user-side or run-level decisions)

- Coverage/coherence-review artifact restoration at epic closeout — `docs/.bak/epic-04-stories/{coverage.md,coherence-review.md}` need a user decision whether to re-author via `ls-publish-epic` or accept as defer.
- Local Convex dev-DB has a pre-existing `artifacts` row in the old shape (missing `createdAt`) that blocked one codegen attempt during Story 0. Out-of-run dev-env cleanup; not Story-0 scope.


## Story 0 verification round 1 — dispositions (pending receipt)

**Finding 1 — `story0-contract-validation-too-permissive` / `SV2-S0-001` (convergent across both verifiers, major, blocking, quick-fix scope)**
- Disposition: **fixed** (via `quick-fix`, request file: `artifacts/00-foundation/quick-fix-request-contract-hardening.md`)
- Rationale: Real defect. Shared Zod contracts are the whole point of Story 0 and Story 0 explicitly specifies ISO 8601 UTC validation on timestamp fields plus status-conditional error/artifact presence. Bundled three tightenings into a single quick-fix: (a) ISO-8601-UTC regex on `createdAt`/`expiresAt`, (b) `reviewTargetSchema` + `packageMemberReviewSchema` become status-conditional via discriminated union or refinement, (c) `requestErrorSchema` enforces the Epic 4 code→status pairing table from the epic's Error Responses section.

**Finding 2(a) — `story0-coverage-artifact-missing` (verifier-1 only, major, blocking, quick-fix scope)**
- Disposition: **defer**
- Rationale: `coverage.md` is an **epic-level spec artifact produced by `ls-publish-epic`**, not a Story 0 implementation deliverable. Confirmed by comparing Epic 03's `stories/coverage.md` (same opening-sentence pattern, same AC/TC traceability table shape). User intentionally moved Epic 4's `coverage.md` and `coherence-review.md` from `stories/` to `docs/.bak/epic-04-stories/` at 2026-04-22 17:00 — 3+ hours before this impl session started at 20:14. That deliberate pre-session spec-pack state is not a Story 0 impl gap; it's an epic-level spec-pack concern to be re-authored (or not) at epic closeout, likely by re-running `ls-publish-epic`. Not a Story-0 quick-fix target.

**Finding 2(b) — downstream stories 01 and 03 still redefine vocabulary (verifier-1 only)**
- Disposition: **accepted-risk**
- Rationale: Self-contained Jira-shard stories are the `ls-publish-epic` convention, not a Story-0 impl defect. Spot-checked Epic 03's `stories/01-environment-state-and-visible-controls.md`: it redefines `Endpoint`, `Process Work Surface Response`, `Environment Summary`, `Process Control State`, `Process Summary Additions`, and `Error Responses` inside the story file — exact same pattern as Epic 4's Story 01. Story 0's DoD line reads *"Story files and the coverage artifact can reference Story 0 without redefining shared review vocabulary"* — "can reference" is a capability statement (shared vocab is now available in `apps/platform/shared/contracts/review-workspace.ts`), not a mandate to edit downstream story files. The shared TypeScript contract is authoritative at runtime regardless of what the spec-shard MDs say. Story 0 foundation objective is satisfied.

Verifier-1 additionally raised one `openQuestion` ("Was `coverage.md` intentionally replaced by another artifact path?"). Answer recorded: yes, intentionally moved to `docs/.bak/epic-04-stories/` pre-session by user. Answer belongs in the Finding 2(a) rationale above.

Mock/shim audit findings from both verifiers (markdown-renderer scaffold, markdown-it-anchor/markdown-task-lists no-op, packages/markdown-package `NOT_IMPLEMENTED` throws, github-slugger lightweight stand-in): **not treated as findings** — these are expected Story 0 scaffold behavior. Later chunks (Stories 3 and 5) replace them. Both verifiers classified them as observations rather than blocking findings.

Both verifiers ran `green-verify` + `verify-all` independently in their fresh sessions; both gates passed. No regressions; baseline stays at 376.

## Run Configuration
- Primary Harness: claude-code
- Story Implementor: codex / gpt-5.4 / high
- Quick Fixer: codex / gpt-5.4 / medium
- Story Verifier 1: codex / gpt-5.4 / xhigh
- Story Verifier 2: codex / gpt-5.3-codex / high
- Self Review Passes: 3
- Epic Verifier 1: codex / gpt-5.4 / xhigh
- Epic Verifier 2: none / claude-sonnet-4.6 / high
- Epic Synthesizer: codex / gpt-5.4 / xhigh
- Degraded Diversity: false

## Verification Gates
- Story Gate: corepack pnpm run green-verify
- Story Gate Source: repo-root package.json scripts (auto-discovered by preflight; stricter than the `verify` lane I'd predicted)
- Epic Gate: corepack pnpm run verify-all
- Epic Gate Source: repo-root package.json scripts (auto-discovered by preflight)

## Story Sequence
- 00-foundation
- 01-review-entry-and-workspace-bootstrap
- 02-artifact-versions-and-revision-review
- 03-markdown-and-mermaid-review
- 04-package-review-workspace
- 05-package-export
- 06-reopen-unavailable-and-degraded-review-states

## Current Continuation Handles
- Story Implementor:
  - Story: 01-review-entry-and-workspace-bootstrap
  - Provider: codex
  - Session ID: 019db9dc-dacb-76f3-b2d3-56a6594da7bb
  - Result Artifact: artifacts/01-review-entry-and-workspace-bootstrap/002-implementor.json (outcome ready-for-verification)

### Handle history
- Story 0 implementor: codex / 019db7b8-474f-7ec2-8880-c5fa78a33561 (extracted from stdout after adapter failure; used in round-1 self-review retry post-patch)

## Story Receipts

### 01-review-entry-and-workspace-bootstrap
- Story Title: Story 1: Review Entry and Workspace Bootstrap
- Implementor Evidence:
  - `artifacts/01-review-entry-and-workspace-bootstrap/002-implementor.json` (outcome `ready-for-verification`, 24 files changed, 7 internal gates pass; session `019db9dc-dacb-76f3-b2d3-56a6594da7bb`)
  - First `001-implementor.json` attempt was `PROVIDER_UNAVAILABLE` due to CLI issue #17 (codex_output_schema strict-mode rejection); retried successfully after user patch.
- Self-Review Evidence:
  - `artifacts/01-review-entry-and-workspace-bootstrap/006-self-review-batch.json` (3/3 passes; 4 findings fixed during self-review, 0 surfaced; 1 declared spec deviation about Convex-backed package path awaiting downstream publisher)
- Verifier Evidence:
  - Round 1: `artifacts/01-review-entry-and-workspace-bootstrap/007-verify-batch.json` (outcome `revise`; both verifiers converge on the same package-path observation)
- Story Gate: `corepack pnpm run green-verify` — **pass** (final orchestrator-owned run at ~10:50Z, exit 0; both verifiers independently passed `green-verify` + `verify-all` earlier in their fresh sessions)
- Gate Tests: 406 total (implementor+self-review consistent reporting; gate exit 0 confirms)
- Dispositions:
  - `S1-F001` / `SV2-01` convergent finding — "Package review path is test-shim only; Convex-backed production runtime cannot expose/resolve package targets" → **accepted-risk**
    - Rationale: This is Epic 4's **explicit scope decision**, not a Story 1 defect. From `epic.md` In-Scope section: *"Platform Substrate; End-User Behavior Lights Up When Downstream Process-Module Epics Publish"* — `publishPackageSnapshot` ships as a typed internal mutation with no production caller until a downstream process-module epic invokes it. Story 4's own spec states *"package review remains exercisable through tests and manual Convex seeding"* until that downstream epic lands. Story 1 owns review ENTRY (route + bootstrap + target-selection seam) on both `artifact` and `package` targetKinds — which it correctly implements at the seam level with in-memory package coverage. Production-path package resolution is out of Epic 4's ownership boundary. Both verifiers' `fresh-fix-path` recommendation would force out-of-scope work into Story 1.
    - Unverified ACs from verifiers: AC-1.1 (package branch), TC-1.1d (multi-target w/ package), AC-1.3b, TC-1.3b. All concern **production-path** package review; all covered by in-memory/test path in Story 1 and will be exercised end-to-end in Story 4 via seeded Convex fixtures, with live production-path coverage lighting up when a downstream epic calls `publishPackageSnapshot`.
    - Carried forward: lights-up testability in Story 4; production end-to-end verification in a future process-module epic.
- Open Risks:
  - Same as disposition above (package production path pending downstream epic). No new risk introduced by Story 1.
- Baseline Before: 381
- Baseline After: 406 (+25)
- User Acceptance: pending commit
- Acceptance Rationale: 1 verifier round, 1 convergent finding correctly re-scoped as epic-scope decision (not Story 1 defect), self-review added the real review wiring, 4 internal self-review fixes applied, 7 implementor-side gates + both verifier gates + orchestrator's independent gate all pass, baseline up +25 with no regressions, review route/bootstrap/target-selection seam correctly delivered for both targetKinds.

### 00-foundation
- Story Title: Story 0: Foundation
- Implementor Evidence:
  - `artifacts/00-foundation/001-implementor.json` (status blocked — CLI adapter bug; work landed on disk and gate passed per agent self-report)
- Self-Review Evidence:
  - `artifacts/00-foundation/010-self-review-batch.json` (3/3 passes, outcome ready-for-verification; 1 fix applied — added missing unsupported/bounded-error review fixtures)
- Verifier Evidence:
  - Round 1: `artifacts/00-foundation/011-verify-batch.json` (revise; 2 major blocking findings + coverage observation)
  - Round 2: `artifacts/00-foundation/012-verify-batch.json` (revise; codegen + schema refinement gaps + coverage rebound)
  - Round 3: `artifacts/00-foundation/013-verify-batch.json` (revise; `query` → `internalQuery` boundary violation + ISO-8601 semantic tightening + coverage rebound)
  - Round 4: `artifacts/00-foundation/014-verify-batch.json` (revise with all findings non-blocking: minor position validation + coverage observation)
- Quick-fix Evidence (3 rounds total):
  - `artifacts/quick-fix/001-quick-fix.json` — ISO 8601 UTC helper + status-conditional refinements on `ReviewTarget` / `PackageMemberReview` + `requestErrorSchema` code→status pairing
  - `artifacts/quick-fix/002-quick-fix.json` — Convex codegen re-run + `ArtifactVersionDetail` contentKind-conditional refinement + `ReviewTarget` rejects mixed artifact+package
  - `artifacts/quick-fix/003-quick-fix.json` — Converted all new Convex reads from public `query` → `internalQuery` (closes direct browser→Convex path, restores Fastify auth-proxy boundary)
- Story Gate: `corepack pnpm run green-verify` — **pass** (final orchestrator-owned run, exit 0)
- Gate Tests: convex 41 / service 177 / client 161 / packages 2 = **381 total**
- Dispositions:
  - (round 1) `story0-contract-validation-too-permissive` / `SV2-S0-001` → **fixed** via quick-fix 001 (ISO-8601, status-conditional fields, code→status pairing)
  - (round 1) `story0-coverage-artifact-missing` → **defer**: `coverage.md` is an epic-level spec artifact produced by `ls-publish-epic`, not Story-0 scope; user deliberately moved to `docs/.bak/epic-04-stories/` pre-session. Re-author at epic closeout.
  - (round 1) downstream-story vocabulary redefinition → **accepted-risk**: self-contained Jira-shard stories are the `ls-publish-epic` convention; Epic 03's stories 01/03 show identical pattern; Story 0 DoD "can reference" is satisfied by shared vocab existing in the TypeScript contract.
  - (round 2) `S0-F1` convex codegen not run → **fixed** via quick-fix 002 (`convex codegen` rerun; api.d.ts updated)
  - (round 2) `S0-F2` schema still accepts impossible combos → **fixed** via quick-fix 002 (`contentKind`-conditional; mixed artifact+package rejected)
  - (round 2) `S0-F001` (V2 coverage rebound) → **defer** (same rationale as round 1)
  - (round 3) `SV1-F1` new Convex reads registered as public `query` → **fixed** via quick-fix 003 (`internalQuery` conversion)
  - (round 3) `SV1-F2` ISO-8601 regex is shape-only → **defer** (non-blocking; regex catches wrong shapes; semantic date validity is enhancement, out of foundation scope)
  - (round 3) `S0-F001` (V2 coverage rebound) → **defer** (same rationale)
  - (round 4) `S0-F001` position validation gap → **accepted-risk**: Zod shared contract enforces `int >= 0` at the API boundary; Convex `v.number()` has no built-in int/nonneg primitive; production callers flow through PlatformStore; handler-level defense-in-depth to be added when Story 4 lands `publishPackageSnapshot`'s production caller path.
  - (round 4) `S0-OBS-001` coverage observation (V2 downgraded from major/blocking to observation/non-blocking) → **defer** (same rationale)
- Open Risks:
  - **Dev-DB schema-mismatch**: local Convex dev backend has at least one pre-existing `artifacts` row using the old shape (missing `createdAt`), surfaced during quick-fix 003's codegen attempt. Pre-customer stance permits direct schema edit without migration, so this is a local dev cleanup (reset dev DB or seed a `createdAt`). Non-blocking; not part of Story 0 scope.
  - **`publishPackageSnapshot` position validation**: carried to Story 4 cleanup batch.
- Baseline Before: 370
- Baseline After: 381 (+11; story-plan expected +4 TC-0 tests, the additional +7 are contract-validation tests added by the 3 quick-fix rounds)
- User Acceptance: pending commit
- Acceptance Rationale: 4 verifier rounds, 0 blocking findings remain, story gate pass, baseline up with no regressions, self-review + implementor work intact on disk, all spec-pack contract vocabulary in place as Story 0 foundation for Stories 1–6. Residual findings are disposed per rationale above.

## Cumulative Baselines
- Baseline Before Current Story: 406 (post-Story-1 accepted; next story's "before")
- Expected After Current Story: TBD at Story 2 start
- Latest Actual Total: 406 (post-Story-1 final gate at ~10:50Z, exit 0)

### Baseline history
| Story | Before | After | Delta | Notes |
|---|---|---|---|---|
| (pre-Story-0 baseline) | — | 370 | — | convex 41 + service 168 + client 161; captured 2026-04-23 via `verify` |
| 00-foundation | 370 | 381 | +11 | +4 from `review-foundation-contracts.test.ts` TC-0 + 2 from `packages/markdown-package/tests/scaffold.test.ts` + 5 from 3 quick-fix contract-validation tests |
| 01-review-entry-and-workspace-bootstrap | 381 | 406 | +25 | +3 new test files (review-workspace-api, review-workspace-page, review-router); +tests from 7 modified suites; 1 round of verify, no quick-fix cycles needed |

## Cleanup / Epic Verification
- Cleanup Artifact: pending
- Cleanup Status: not-started
- Epic Verification Status: not-started
- Synthesis Status: not-started
- Final Gate Status: not-run

## Open Risks / Accepted Risks
- none

---

## Retained Notes (carry-forward across compaction)

### Spec pack shape
- Four-file tech design: `tech-design.md` + `tech-design-client.md` (736 L) + `tech-design-server.md` (1516 L) + `test-plan.md` (738 L)
- Epic: `epic.md` (992 L)
- 7 stories under `stories/`; all read in full
- Public prompt inserts: both absent

### Epic core summary
- Epic 4 = first durable review + package surface for Liminal Build
- Adopts MDV's `.mpkz` (tar+gzip + `_nav.md`) as export format; workspace pkg `@liminal-build/markdown-package` at `packages/markdown-package/` (lifted from `references/mdv/src/pkg/`)
- **Storage model change**: Epic 3's `artifacts` table trimmed to identity-only (`projectId`, `processId`, `displayName`, `createdAt`); `contentStorageId` / `currentVersionLabel` / `updatedAt` REMOVED; relocated to new `artifactVersions` table. Pre-customer stance permits direct schema edit.
- 3 new Convex tables: `artifactVersions`, `packageSnapshots`, `packageSnapshotMembers`
- Typed internal mutations Epic 4 ships (no production caller): `insertArtifactVersion`, `publishPackageSnapshot`
- Server-rendered HTML (markdown-it `html:false` + Shiki + vendored anchor/slugger + task-list + DOMPurify with `FORBID_TAGS: ['style','math','form']`, `FORBID_ATTR: ['style']`, `ADD_ATTR: ['data-block-id']`) + client-side Mermaid hydration via placeholder divs
- Mermaid directive strip regex: `/^\s*%%\{\s*(?:init|config|wrap)[^%]*%%/gm` (server-side only; closes LobeChat/Docmost CVE class)
- **Two-phase export**: POST mints signed HMAC-SHA-256 URL (15-min expiry, reusable within window); GET streams `.mpkz` via `createPackageFromEntries`. Expired → 404 `REVIEW_TARGET_NOT_FOUND`.
- Storage URLs are **public capability** (no auth, no expiry, no revocation short of blob delete) — Fastify acts as auth-proxy; structural pino redaction rule in logger
- Tar hardening: 256 MB archive cap, 64 MB per-entry cap, entry-name filter (`\0`, `[A-Z]:`, non-NFC), reject symlink/hardlink/device/fifo

### Story → Chunk mapping
| Story | Chunk | ACs | Test count |
|-------|-------|-----|------------|
| 0 Foundation | 0 | supports all | 4 |
| 1 Review Entry & Bootstrap | 1 | AC-1.1..1.4 | 39 |
| 2 Artifact Versions | 2 | AC-2.1..2.4 | 31 |
| 3 Markdown & Mermaid | 3 | AC-3.1..3.4 | 26 |
| 4 Package Review Workspace | 4 | AC-4.1..4.4 | 36 |
| 5 Package Export (two-phase) | 5 | AC-5.1..5.3 | 44 |
| 6 Reopen/Unavailable/Degraded | 6 | AC-6.1..6.3 + NFR + a11y + observability | 46 |
| **Total** | | | **226** |

- Linear chain Chunk 0→1→2→3→4→5→6; each later chunk depends on earlier ones being real (no artifact review before `artifactVersions` exists, no render before body fetch path, no package review before single-artifact render, no export before package response shape stable, no reopen/degraded before durable shapes are complete)
- Story 0 owns monorepo wiring: add `packages/*` to `pnpm-workspace.yaml`, add `test:packages` script to root `package.json` + wire into `verify` and `verify-all`, add project reference to root tsconfig
- Story 0 also owns the `artifacts` storage-model rewrite (removes 3 fields, adds `createdAt`)
- Story 2 rewrites Epic 3's checkpoint writer path to call `insertArtifactVersion` rather than overwriting
- Story 4 provides `publishPackageSnapshot` typed internal mutation (no production caller in this epic)

### Key contracts / error codes
- Request-level: 401 UNAUTHENTICATED, 403 PROJECT_FORBIDDEN, 404 PROJECT_NOT_FOUND / PROCESS_NOT_FOUND / REVIEW_TARGET_NOT_FOUND, 409 REVIEW_EXPORT_NOT_AVAILABLE, 503 REVIEW_EXPORT_FAILED
- Inside review envelope: REVIEW_TARGET_UNSUPPORTED, REVIEW_RENDER_FAILED, REVIEW_MEMBER_UNAVAILABLE
- `Artifact content fetch timeout`: `ARTIFACT_CONTENT_FETCH_TIMEOUT_MS = 10_000` (export constant so tests can patch)
- Empty-state dual: `availableTargets: []` (no targets) vs. `target.status: 'empty'` (artifact with 0 versions)
- Bundle-size budget: ≤600 KB gzipped delta over Epic 1–3 baseline

### Verification tier shape (current package.json)
- `red-verify` = format:check + lint + typecheck + build
- `verify` = `red-verify` + `test:convex` + `test:service` + `test:client`
- `green-verify` = `verify` + `guard:no-test-changes` (guard is SKIP — not implemented)
- `verify-all` = `verify` + `test:integration` + `test:e2e` (e2e is SKIP — not implemented)
- **NEW for Epic 4, to be added in Story 0**: `test:packages` = `corepack pnpm -r --filter "./packages/*" test`; to be wired into `verify` and `verify-all`

### User-intent deviations and CLI constraints (logged per user request)
**Config intent from orchestration prompt:**
- Story implementor: gpt-5.4 / high  → matches default; configured as-is
- Story verifiers (2): gpt-5.4 / xhigh AND gpt-5.3-codex / high  → configured as-is (verifier 2 deviates from default claude-sonnet/high)
- Epic verifiers intended (4): gpt-5.4 xhigh, gpt-5.3-codex xhigh, claude-opus-4.7 "max", claude-sonnet-4.6 high
- quick_fixer: not specified by user → default (codex/gpt-5.4/medium)
- epic_synthesizer: not specified by user → default (codex/gpt-5.4/xhigh)

**Deviations / CLI issues noted:**
1. **CLI binary shipped without execute permission.** `bin/ls-impl-cli.cjs` at skill path lacks `+x`; cannot be invoked directly from shell. Workaround used: `node /Users/leemoore/.claude/skills/ls-claude-impl/bin/ls-impl-cli.cjs ...`. This should be fixed in the skill package so the shebang on line 1 actually works.
2. **Config schema supports only 2 epic verifiers (`epic_verifiers` array fixed at 2).** User requested 4. Pass 1 configured with GPT + Claude Sonnet diversity (gpt-5.4/xhigh + claude-sonnet-4.6/high). Pass 2 planned at epic-verify time with gpt-5.3-codex/xhigh + claude-opus-4.7/xhigh (swap config, re-run `epic-verify`, both passes feed into `epic-synthesize`).
3. **"max" reasoning effort is not in the documented enum** (`high`, `medium`, `xhigh`). User's "opus 4.7 max" mapped to `reasoning_effort: xhigh` for closest semantic fit.
4. **Model-name validation is unknown until preflight runs.** Documented defaults use `gpt-5.4` and `claude-sonnet`. Fields `gpt-5.3-codex` and `claude-sonnet-4.6` are unvalidated guesses based on user-supplied names. Will fall back to supported names if preflight rejects.
5. **Role-config file only has 2 story-verifier slots** (`story_verifier_1`, `story_verifier_2`). User specified 2 — fits. But no room for additional story-verifier diversity if user ever wants more.
6. **No CLI flag to specify additional epic verifiers or synthesizer diversity.** Everything is driven from `impl-run.config.json`.

### Blockers / open decisions
- None. Preflight returned `ready`. Proceeding to Stage 3 (story cycle) with `00-foundation`.

### Preflight findings (2026-04-23T00:21:06Z)
- Status: `ready`; no blockers; no warnings; no config-validation notes.
- Model/effort validation: preflight accepted all configured names — `gpt-5.4`, `gpt-5.3-codex`, `claude-sonnet-4.6` and efforts `high`, `medium`, `xhigh` without complaint. Does NOT prove those are first-class supported; may just mean the CLI doesn't hard-validate the strings against a known enum. Test will be whether `story-implement` etc. actually dispatch successfully to those models.
- Provider matrix:
  - primary `claude-code` 2.1.117 available, authenticated (lee.g.moore@gmail.com, subscriptionType: max)
  - secondary `codex` 0.122.0 available, authStatus: unknown (codex CLI lacks non-mutating auth status command; proceed best-effort)
- Prompt assets: base prompts and snippets ready.
- Preflight artifact: `artifacts/preflight/001-preflight.json`

### Additional CLI/skill observations (append as encountered)
7. **Preflight side-effects the config file.** `preflight` automatically persists a resolved `verification_gates` block into `impl-run.config.json` ("Persisted resolved verification_gates into impl-run.config.json for downstream CLI commands"). This is useful but not documented in `setup/12-run-setup.md` (which says "validate it by reading it; do not rewrite an existing run's config unless the user has asked for a change"). Orchestrator authored config gets mutated by the tool without an opt-out. Not destructive in this run but surprising. Formatting was also reflowed (indentation tweaks).
8. **Story gate picked was `green-verify`, not `verify`.** The skill's own prose ("verify" is described as Standard development gate) versus what precedence-order discovery produced in this repo was `green-verify`. Because this repo's `green-verify` decomposes to `verify + guard:no-test-changes` and `guard:no-test-changes` is a SKIP stub, the two currently produce identical behavior, but the choice is worth noting. Gate-discovery logic evidently prefers the "greenest" named gate when multiple qualify.
9. **Gate discovery produced no explanation of WHY `green-verify` won over `verify`.** The preflight envelope has `storyGateSource: "repo-root package.json scripts"` with no field explaining the selection criterion. For gate discovery across the precedence order (flags → config → scripts → policy → CI), it would help to surface which candidate names were considered and why one won.
10. **Artifact directory naming mismatch.** `operations/33-artifact-contracts.md` documents `<spec-pack-root>/artifacts/story-<id>/` but the CLI writes to `<spec-pack-root>/artifacts/<id>/` (no `story-` prefix). For example, Story 0's artifacts live in `artifacts/00-foundation/` not `artifacts/story-00-foundation/`. Either the skill docs or the CLI should update to match; both reading recovery and operator mental models depend on the path being correct.

11. **🚨 BLOCKING CLI BUG — codex output parser is broken.** `story-implement` for `00-foundation` failed with `PROVIDER_OUTPUT_INVALID`, detail: "Provider stdout was not exact JSON." The failure is **entirely in the ls-impl-cli output adapter, not in the provider work**.

    What actually happened:
    - codex-cli 0.122.0 ran for ~14 minutes and completed substantive Story 0 implementation work (47 files changed/added, including monorepo wiring, workspace package scaffold, Convex schema change + 3 new tables, shared contracts, rendering scaffolds, fixtures, and one new test file).
    - The codex agent self-reported `{"status":"completed","story":"00-foundation","summary":"Implemented the Story 0 foundation for Epic 4: ...","verification":{"storyGate":{"command":"corepack pnpm run green-verify","status":"passed"}, ...}}` — i.e. it claimed it had already run and passed the story gate itself.
    - Codex's stdout format is **JSONL** (one JSON object per line, one per event): `{"type":"item.completed","item":{...}}`, then another event, then `{"type":"turn.completed","usage":{...}}`. The structured result is nested in `.item.text` on the final `agent_message` event — that inner `.text` value is itself a JSON string and must be parsed a second time.
    - The ls-impl-cli's codex adapter appears to expect **"exact JSON"** — a single top-level JSON document on stdout. So it saw JSONL and failed.
    - CLI set `status: "failed"` and `phase: "finalizing"` on the progress file at 00:36:59, and the result envelope recorded `PROVIDER_OUTPUT_INVALID` / `blocked`.
    - None of the 3 self-review passes ran (`selfReviewPassesCompleted: 0 / 3`) because the CLI fell over before dispatching them.

    The fix (for whoever reads this log): the codex adapter needs to parse stdout as JSONL, filter for `{"type":"item.completed","item":{"type":"agent_message"}}`, take the last such event (or the one paired with `turn.completed`), and then JSON.parse its `.item.text` field to get the structured result. Also handle the case where the agent's verification block declares the gate was self-run (this may be relevant for self-review accounting).

    The `turn.completed` envelope also reports usage ({"input_tokens":10384568,"cached_input_tokens":10195712,"output_tokens":46086}) which the CLI may want to surface on the result envelope.

    **User-facing consequence**: every codex-backed bounded operation (story-implement, story-verify for codex verifiers, quick-fix, epic-verify for codex verifiers, epic-synthesize) will fail the same way until this parser is fixed. All four verifier slots and the synthesizer in our config currently route to codex, so **the whole orchestration is blocked on this one bug** until either (a) the adapter is fixed, (b) we switch all roles to claude-code (which defeats the diversity intent), or (c) we manually accept Story 0 and route around the CLI for each story.

### Blocking decision — Story 0 disposition
- Codex's work is on disk (47 files, most new, all look consistent with the story spec).
- Gate run at 00:38Z PASSED (`corepack pnpm run green-verify`, exit 0). Baseline moved 370 → 376 tests (+6: 4 from `review-foundation-contracts.test.ts` + 2 from `packages/markdown-package/tests/scaffold.test.ts`). Story 0 spec intent satisfied on disk.
- Self-review did not run inside the old coupled story-implement — work is first-draft codex output.

### Skill update (re-read 2026-04-23 ~00:45Z, after user patched the skill)
- Bounded operations count: 9 → **10**. New public op: `story-self-review` (split out of `story-implement`).
- `story-implement` now documents itself as "the initial implementation pass only" — self-review is no longer coupled.
- `story-self-review` flags: `--spec-pack-root`, `--story-id`, `--provider`, `--session-id` (all required); optional `--passes 1..5` override.
- Story cycle expanded from 5 → **6 steps**: (1) implement → (2) self-review → (3) verify → (4) gate → (5) baseline check → (6) receipt + commit.
- `Current Phase` vocabulary now includes `self-review`.
- `CONTINUATION_HANDLE_INVALID` error code now applies to both `story-continue` AND `story-self-review`.
- Fix-routing doc adds an explicit rule: "Run `story-self-review` after a clean `story-implement` or `story-continue` result before launching `story-verify`."
- **CLI version flag still reports v1.0.0** even though ops list changed — version bump appears to have been missed; worth flagging to the CLI maintainer so operators can detect which build they're on.

### Resuming Story 0: extracted continuation handle
- Codex emits a `{"type":"thread.started","thread_id":"..."}` JSONL event on connect. For Story 0, `thread_id = 019db7b8-474f-7ec2-8880-c5fa78a33561`.
- The ls-impl-cli result envelope for the blocked story-implement did NOT surface this session handle (because the adapter failed to parse codex stdout); had to grep the raw stream log to recover it.
- **CLI/skill suggestion**: when the codex adapter fails output-parse, it should still extract and surface `thread_id` into the envelope's continuation handle so recovery doesn't require log-grepping. Even a "partial" envelope with just `provider` + `session_id` + `error` would be enough to resume.
- Next action: dispatch `story-self-review --provider codex --session-id 019db7b8-474f-7ec2-8880-c5fa78a33561` and see whether the codex adapter behaves on the self-review path or exhibits the same JSONL parse issue.

### CLI issue #13 — Codex prompt-output schema ≠ CLI validation schema (RESOLVED 2026-04-23 ~03:26Z by user fix — retry of `story-self-review` at 03:26 succeeded cleanly with 3/3 passes and `ready-for-verification`. The post-fix codex agent produces the CLI-expected shape: `outcome`, `planSummary`, `changedFiles: [{path, reason}]`, `tests: {added, modified, removed, totalAfterStory, deltaFromPriorBaseline}`, `gatesRun: [{command, result}]`, `selfReview: {passesRun, findingsFixed, findingsSurfaced}`, `openQuestions`, `specDeviations`, `recommendedNextStep`. Likely a prompt-template correction. Keeping this entry for the audit trail.)

### CLI issue #17 — 🚨 BLOCKING: codex_output_schema is invalid for OpenAI structured outputs (Story 1 story-implement)
- Dispatched `story-implement --story-id 01-review-entry-and-workspace-bootstrap` at 2026-04-23 04:24:15Z.
- CLI failed in 4 seconds with envelope `{code: "PROVIDER_UNAVAILABLE", message: "Provider execution failed for codex.", detail: "Reading additional input from stdin..."}`.
- Root cause in `artifacts/01-.../streams/001-implementor.stdout.log`: codex's first API call to OpenAI returned:
  ```json
  {"type":"error","error":{"type":"invalid_request_error","code":"invalid_json_schema","message":"Invalid schema for response_format 'codex_output_schema': In context=('properties', 'tests'), 'required' is required to be supplied and to be an array including every key in properties. Missing 'totalAfterStory'.","param":"text.format.schema"},"status":400}
  ```
- **Problem**: the CLI's `codex_output_schema` (passed via codex's `response_format` / `text.format.schema`) has a `tests` object where `properties` includes `totalAfterStory` but `required` does not. OpenAI's strict structured-outputs mode requires every property key to be in `required` (optionals are expressed via `type: [..., 'null']`, not omission from `required`).
- **Why this wasn't caught earlier**: Story 0's story-implement also produced a result, but the adapter's pre-schema fix rejected it on the post-codex-output side (`PROVIDER_OUTPUT_INVALID`). The user patched self-review's prompt/schema alignment, which was what let Story 0 complete via self-review. The story-implement path's schema wasn't end-to-end exercised after the patch until now.
- **Fix direction**: audit the codex-output Zod-to-JSON-schema conversion the CLI uses for story-implement's expected output. Specifically the `tests` sub-schema needs `totalAfterStory` added to its `required` array. Also audit every nested object in the schema — any property not in `required` will trigger the same OpenAI rejection in strict mode. The `.optional()` → JSON-schema translation may need to emit `type: [<real-type>, 'null']` and include the key in `required` rather than omit it.
- Also check `story-continue`, `quick-fix`, `story-verify`, `epic-verify`, `epic-synthesize` schemas — they may have the same latent bug and fail the first time they hit OpenAI with a strict-mode response format. `story-self-review` and `story-verify` have succeeded recently for Story 0, so those are probably fine.
- Waiting for user agent to fix the schema; retry same command once ready. No point re-running `story-implement` on the same schema.

### CLI observations #14–16 (new, from Story 0 quick-fix run at 03:43Z)
14. **Quick-fix artifacts land under `artifacts/quick-fix/`**, not under the story's own dir. Discoverable but not documented in `operations/33-artifact-contracts.md` (which lists `<spec-pack-root>/artifacts/story-<id>/`, `cleanup/`, and `epic/` — quick-fix isn't enumerated there). The layout actually written is `artifacts/quick-fix/001-quick-fix.json` + `artifacts/quick-fix/progress/001-quick-fix.{status.json,progress.jsonl}` + `artifacts/quick-fix/streams/001-quick-fix.{stdout,stderr}.log`. Add a `quick-fix/` row to the artifacts-directory layout in `33-artifact-contracts.md` so orchestrators know where to poll.
15. **Quick-fix result envelope is ~200 KB because it inlines the full provider stdout** as `result.rawProviderOutput` (string). For this run, stdout was ~196 KB of codex JSONL and the whole stream got stringified into the envelope field. Orchestrators that `Read` the envelope to route will blow their context window. Consider either (a) capping or truncating `rawProviderOutput` in the envelope (the stream files on disk already preserve the full output), or (b) replacing it with a pointer to the stream log. Per `operations/30-cli-operations.md` `quick-fix` is declared "provider-native free-form output" but the envelope scale is surprising.
16. **My own bug, not the CLI's**: my first quick-fix monitor was scoped to `artifacts/00-foundation/progress/*quick-fix*.status.json` and fell through to the newest status.json overall when its glob missed, prematurely declaring "TERMINAL" because the stale `011-verify-batch.status.json` was already completed. Fixed by re-arming the monitor on the explicit quick-fix status path. Keeping the note so future orchestrators author their monitors against the right directory for story-agnostic ops.
- The CLI's Zod validator for both `story-implement` and `story-self-review` rejects every payload codex produces with `PROVIDER_OUTPUT_INVALID`.
- The actual payload codex emits in its final `agent_message.text`:
  ```json
  {
    "status": "completed",
    "story": "00-foundation",
    "summary": "...",
    "selfReview": {"pass":1,"status":"completed","focus":"...","fixesApplied":[...]},
    "changedFiles": ["path1", "path2", ...],
    "verification": {"storyGate":{"command":"...","status":"passed"},"epicGate":{"command":"...","status":"not_run"}},
    "notes": [...]
  }
  ```
- The CLI schema wants keys like `outcome` (strict enum), `planSummary`, `changedFiles` as objects (not strings), `tests: object`, `gatesRun: array`, `selfReview: {findingsFixed: array, findingsSurfaced: array}`, `openQuestions: array`, `specDeviations: array`, `recommendedNextStep: string`. It explicitly rejects the codex-emitted root keys (`status`, `story`, `summary`, `verification`, `notes`) and `selfReview.{pass,status,focus,fixesApplied}` as "unexpected".
- **The codex agent prompt evidently instructs codex to produce a different schema from what the CLI validates.** Either the prompt template needs to be rewritten to match the CLI schema, or the CLI schema needs to match what the prompt already asks for (and what codex consistently produces across implement AND self-review).
- **Real work is still happening on disk**: self-review pass 1 for Story 0 added `unsupportedReviewWorkspaceFixture` at line 88 of `tests/fixtures/review-workspace.ts` — a real, correct fill-in of a missing fixture. So the work is not wasted; only the CLI's read of the completion payload is.
- Because pass 1's payload is rejected, the CLI stubs passes 2 and 3 as `skipped` with reason "Self-review stopped before pass 1 completed because provider execution failed." That skip-reason is misleading — the provider succeeded; it was the adapter that failed.

### CLI issue #12 — CLI is reading/validating session IDs from team-impl-log.md (must be removed)
- Ran `story-self-review --provider codex --session-id 019db7b8-474f-7ec2-8880-c5fa78a33561 --story-id 00-foundation` at 02:45:51Z.
- CLI failed instantly (10 ms) with `{"code":"CONTINUATION_HANDLE_INVALID","message":"Continuation handle ... was not found for story '00-foundation'."}`.
- **The CLI is validating session IDs against the team-impl-log (or another orchestrator-owned source).** This is wrong on two counts per the design contract:
  1. **The CLI is stateless by design.** `onboarding/03-operating-model.md` says explicitly: "The CLI is intentionally stateless across calls … Recovery strategy. The CLI restores no state between calls; you decide what to replay." Reading orchestrator state to validate an input is a stateful operation dressed up as validation.
  2. **The orchestrator owns the continuation handle — full stop.** `team-impl-log.md` is the orchestrator's durable state surface. The CLI must treat `--provider` + `--session-id` as opaque passthrough inputs and hand them straight to the provider adapter (`codex resume <id>`, copilot equivalent, etc.). If the provider rejects the handle, surface the provider's error. Do not pre-check against `team-impl-log.md` or any store the CLI maintains.
- Error-message wording also needs revision once the validation is removed: "not found for story '00-foundation'" implies a story→session map inside the CLI that must not exist.
- Fix in progress by user's other agent; will retry same command once the validation is removed.
- Artifact path the CLI wrote: `artifacts/00-foundation/005-self-review-batch.json`. Artifact numbering pattern appears to be `<fixed-slot-per-op>-<op-name>` (e.g., implementor=001, self-review=005). Confirm whether this is intentional vs. a bug — either way it's worth documenting so recovery can find the right file.

