# Epic 3 Implementation Addendum

This addendum captures the gap analysis between Epic 3's specified behavior
and the implemented behavior as of commit `dd2cb39` (post Story 6 + nit-fix
batch). It is the source of truth for the work done to satisfy Epic 3's
acceptance criteria on the production code path, plus the architectural
decisions made during gap analysis that bind subsequent dispatches.

Companion documents:

- `epic.md` — original epic specification (acceptance criteria, scope)
- `tech-design.md`, `tech-design-server.md`, `tech-design-client.md` — original design
- `test-plan.md` — original TC mapping and verification tiers
- `codex-impl-log.md` — running implementation log; this addendum is referenced from it
- `story-verification/epic-verification/` — full verification artifacts (4 reviews + 3 meta-reports + synthesis)

---

## Closure status (as of commit `7ea7c30`)

All 14 gap items have been closed across three fix-batch chunks. Each chunk
dispatched with real implementation (no stubs-as-defaults), fresh Codex
`gpt-5.4 xhigh` verification, and bounded fix slices as needed until the
verifier returned PASS.

**Chunk 1 — Convex durability foundation** (items 4, 5, 6, 9, 11, 13)
- `45f38e5` — feat: Convex durability foundation (Opus 4.7 implementation)
- `dad936e` — fix: admin auth + orphan cleanup + initial fingerprint (Codex GPT-5.4 xhigh verification → fix-batch)

**Chunk 2 — Real provider lane + honest errors** (items 1, 2, 7, 8, 12)
- `6d8a1f1` — feat: real provider lane (Opus 4.7 implementation: real LocalProviderAdapter, DaytonaProviderAdapter skeleton, ExecutionResult contract extension, fire-and-forget cleanup, provider default switch)
- `ad3fdf6` — fix: 5 verifier findings closure (persisted providerKind, side-effect failure visibility, candidate validation, ExecutionResult consumption, fire-and-forget tests)
- `36fd186` — fix: transitionProcessToFailed for full ExecutionResult lifecycle coverage

**Chunk 3 — Real GitHub writer + cleanup** (items 3, 10, 14)
- `d423a4d` — feat: real Octokit code checkpoint writer + client trust + cleanup (3 real GitHub integration tests against `liminal-ai/liminal-build` with branch cleanup)
- `77087d4` — fix: Item 10 in live reducer + strengthen tests + validate CodeCheckpointCandidate
- `6dcc1c8` — fix: remove statusLabel default from environmentSummarySchema (anti-pattern default masking malformed messages)
- `7ea7c30` — fix: remove anti-pattern defaults on state and environment response schemas

Also landed during the closure work:
- `3b6b9f2` — chore: drop dead Buffer references blocking convex dev typecheck (pre-Chunk 1 unblock)

**Test counts:** 36 convex / 167 service / 157 client / 12 integration. All
gates green at every commit. `corepack pnpm run verify` + `test:integration`
+ Convex `tsc --noEmit` all exit 0.

All 14 items are verified closed by Codex GPT-5.4 xhigh:
- Chunk 1 final verify: PASS (all 6 items SATISFIED)
- Chunk 2 final verify: PASS (all 5 items SATISFIED)
- Chunk 3 final verify: PASS (all 3 items SATISFIED + contract hygiene flush)

Four residual required-with-default anti-patterns were flagged during Chunk 3
closure as **non-blocking future cleanup** (not Epic 3 acceptance gates):
`environment.lastCheckpointResult`, `process.controls`, `process.hasEnvironment`,
`processSourceReference.accessMode`. These are schema defaults on other
contract shapes; they do not affect Epic 3 behavior.

**Remaining work for Epic 3 acceptance:**
1. Full four-phase epic re-verification on the final tree (4 reviewers →
   3 meta-reports → fresh GPT-5.4 synthesis). Verdict must be SHIP.
2. Manual Verification Checklist (`test-plan.md:501+`) walked through
   against `npx convex dev` + Fastify/Vite dev server with LocalProviderAdapter
   and the real Octokit code writer.

Later runtime-auth cleanup:
- Fastify no longer uses `CONVEX_DEPLOY_KEY` / Convex admin auth at runtime.
- The live app now uses a shared `CONVEX_API_KEY` passed to service-only public
  Convex wrappers, which validate the key and delegate to internal functions.
- Deploy keys remain a CLI/deployment concern rather than the app-runtime auth
  mechanism for local or production web execution.

---

## Why this exists

The Epic 3 stories were committed (Stories 0-6, plus pre-verification cleanup
and nit-fix batch). Story-level dual verification passed each story. The
four-phase epic-level verification then surfaced a structural pattern: the
visible surface, contracts, control rendering, and live publication paths
are real and tested, but the production runtime defaults to test fakes
(`InMemoryProviderAdapter`, `StubCodeCheckpointWriter`) and several durable
persistence requirements were satisfied at the contract/test-fixture layer
but not at the production schema layer.

Final synthesis verdict (GPT-5.4 xhigh, with independent code-evidence
verification): **BLOCK**. Eight must-fix items validated in source. Six
should-fix items validated.

This addendum exists because shipping with stubs as production defaults
would compound through subsequent epics — we'd build on a foundation
that pretends to work but doesn't. Every gap below is independently
verified against code, not just inherited from a reviewer's claim.

---

## Verified gaps

Each item lists the source file path, line range, and severity. Severity
follows the synthesis classification. All items independently re-verified
in the current tree.

### Critical — production runtime is dishonest

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| 1 | Default runtime wires `InMemoryProviderAdapter` as the production provider | `apps/platform/server/app.ts:130` | Critical |
| 2 | No real provider adapter files exist (`local-provider-adapter.ts` and `daytona-provider-adapter.ts` were spec'd as NEW; neither is in repo) | `apps/platform/server/services/processes/environment/` directory contents | Critical |
| 3 | `StubCodeCheckpointWriter` returns `{ outcome: 'succeeded' }` with no real Git write; wired as default | `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:17-19`; `apps/platform/server/app.ts:134` | Critical |

### Major — durable persistence broken on production path

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| 4 | `convex/artifacts.ts:71` discards artifact content with `void artifact.contents;`. Schema (`:9-15`) has no field for content. | `convex/artifacts.ts:9-15, 70-78` | Major |
| 5 | `convex/sourceAttachments.ts` schema (`:4-22`) has no `accessMode` field. Spec contract requires `accessMode` as durable required field. Projection (`:40-50`) doesn't return it. | `convex/sourceAttachments.ts:4-22, 40-50`; `apps/platform/shared/contracts/process-work-surface.ts:325-333` | Major |
| 6 | `workingSetFingerprint` is hardcoded to `null` on every write. No compute or compare code exists in repo. | `convex/processEnvironmentStates.ts:59, 193, 284`; `convex/processes.ts:273` | Major |
| 7 | `ExecutionResult` interface has only `outcome | completedAt | failureReason`. Spec contract requires 6 fields including `processStatus` 5-value enum, `processHistoryItems`, `outputWrites`, `sideWorkWrites`, `artifactCheckpointCandidates`, `codeCheckpointCandidates`. | `apps/platform/server/services/processes/environment/provider-adapter.ts:15-19`; spec at `tech-design-server.md:564-571` | Major |
| 8 | Fire-and-forget recovery uses `.catch(() => {})` (silent swallow). `runHydrationAsync` has no catch at all; post-ready transition is outside the inner try. Result: secondary failures can strand environments in `rehydrating`/`rebuilding`. | `apps/platform/server/services/processes/environment/process-environment.service.ts:57-59, 184, 193` | Major |
| 9 | `hasCanonicalRecoveryMaterials` diverges between stores. Convex (`:949-955`) checks artifacts+sources only. InMemory (`:1595-1608`) checks artifacts+sources+outputs AND has an `if (undefined && undefined) return true` fallback Convex doesn't. Tests pass against InMemory; production behaves differently. | `apps/platform/server/services/projects/platform-store.ts:949-955, 1595-1608` | Major |

### Minor — cleanup

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| 10 | Client recomputes `environment.statusLabel` from state instead of trusting the server contract value | `apps/platform/client/features/processes/process-environment-panel.ts:28` | Minor |
| 11 | `convex/sourceAttachments.ts:1, 28, 31, 36` uses `queryGeneric`, `ctx: any`, `any` types throughout. Explicit violation of Convex Field Outline (tech-design-server.md:321-329). | `convex/sourceAttachments.ts:1, 28, 31, 36` | Minor |
| 12 | `DEFAULT_ENVIRONMENT_PROVIDER_KIND` defaults to `local`. Spec says `daytona` for shared/remote, `local` only when explicitly switched for trusted dev. | `apps/platform/server/config.ts:18`; spec at `tech-design-server.md:107` | Minor |
| 13 | `processes.hasEnvironment` is never set `true`. Process surface compensates by deriving from environment summary, but raw process consumers can drift. Spec says it should be derived/maintained from `processEnvironmentStates`. | `convex/processes.ts:258, 327` (insert false); spec at `tech-design-server.md:404-420` | Minor |
| 14 | Tautological foundation test: `expect(processSurfaceControlOrder).toEqual(stableProcessControlOrderFixture)` where the fixture is `[...processSurfaceControlOrder]`. Trivially true. | `tests/service/server/process-foundation-contracts.test.ts:29`; `tests/fixtures/process-controls.ts` | Minor |

---

## Chunk structure for closure

These 14 items group into three coherent chunks with real dependency order.
Each chunk dispatches as a single fix-batch with its own dual verification
round. They are NOT new stories (no new ACs; no red-phase needed because the
existing tests marked VIOLATED in the GPT-5.4 review are the red signal).

### Chunk 1 — Convex durability foundation

**Items:** 4, 5, 6, 9, 11, 13 (durable persistence, schema additions, store alignment, typed compliance)

Why grouped: All Convex / PlatformStore layer. None depend on provider work. Must land first because Chunk 2's `LocalProviderAdapter` reads `accessMode` durably and the new `ExecutionResult` shape produces data the checkpoint planner reads against this durability layer.

### Chunk 2 — Real provider lane and honest error handling

**Items:** 1, 2, 7, 8, 12 (LocalProviderAdapter, ExecutionResult contract extension, default switch, fire-and-forget cleanup)

Why grouped: All about making the execution lane real and non-lying. LocalProvider produces the new `ExecutionResult` shape, so they change together. Error handling lives in the same file (`process-environment.service.ts`) and shares the "make execution honest" theme.

### Chunk 3 — Real GitHub writer plus cleanup

**Items:** 3, 10, 14 (OctokitCodeCheckpointWriter, client trusts statusLabel, drop tautological test)

Why grouped: GitHub writer is its own external integration with no dependency on Chunks 1 or 2. Cleanup items ride along.

After Chunk 3: re-run the four-phase epic verification on the final tree.

---

## Architectural decisions locked during gap analysis

These decisions bind subsequent dispatches. They were made during Chunk 1
planning conversation and reflect both spec interpretation and current
infrastructure constraints.

### Storage strategy for artifacts

Artifact content lives in **Convex File Storage**, not inline in the
artifact row. Schema field is `contentStorageId: v.id('_storage')` (required,
not nullable — every checkpointed artifact has content somewhere).

Rationale:
- Convex documents have a 1MB cap, which artifacts will eventually exceed
- File storage avoids read amplification (metadata queries don't pay the content bandwidth)
- The 100GB included on the Pro plan + 50GB egress/month easily covers the projected usage shape (~10-50KB markdown documents, generated artifacts)
- Single canonical store for non-code documents matches the data model: GitHub canonical for code, Convex File Storage canonical for non-code documents, sandbox volume transient/disposable

### Convex runtime

All Epic 3 Convex code uses the **default V8 isolate runtime**. No file uses
`'use node'`. SHA-256 hashing uses Web Crypto (`globalThis.crypto.subtle.digest`).
Blob construction uses `new Blob([str])`. Storage operations use `ctx.storage.*`.

Rationale: faster cold start, sandboxed, recommended path. Node-flavored work
(child_process for sandbox exec, Octokit for GitHub) lives in the Fastify
server which already runs Node 24.

### Mutation vs action for artifact persistence

`persistCheckpointArtifacts` becomes an **`internalAction`** (not mutation)
that calls `ctx.storage.store(new Blob([content]))` then runs an
**`internalMutation`** to write the artifact row with the resulting
`contentStorageId`.

Rationale: mutations cannot call `ctx.storage.store` (mutations are pure DB
transactions; storage operations are side effects). The action+internal-mutation
split is the canonical Convex pattern.

### Public vs internal Convex functions

New persistence and orchestration functions are `internalAction` /
`internalMutation`, accessed via `internal.X.Y` references from the action
and from the server's PlatformStore via the internal API. They are not part
of the browser-callable surface.

Rationale: spec direction (tech-design-server.md:448-449); easier to enforce
authorization and contract surface area.

### Storage cleanup on artifact delete

Same-mutation cleanup: when an artifact row is deleted, the same mutation
calls `ctx.storage.delete(row.contentStorageId)`. No scheduled GC.

Rationale: simplest; transactional with the row delete; no orphan accumulation.

### Stale detection: read-time comparison, write-time storage

`workingSetFingerprint` is computed and **stored** on every mutation that
touches the env state row. Stale detection happens at **read time**: the
bootstrap path computes the current canonical fingerprint, compares to the
stored fingerprint on the env row, and projects `state` as `stale` when
divergent (with `state` otherwise being `ready`).

Rationale: spec language ("ready: environment exists and the fingerprint
matches current canonical inputs") reads naturally as read-time comparison.
Single point of comparison; no fan-out coupling into every canonical mutation.

### Fingerprint inputs and algorithm

Inputs (per spec at `tech-design.md:312-329`):
- current artifact ids and current version labels
- current output ids and current revision labels
- current source attachment ids
- source `targetRef`
- source `hydrationState`
- provider kind

Algorithm:
- Build stable JSON object with fixed key order
- Sort each input collection by id before serialization
- Serialize to UTF-8 JSON
- Compute SHA-256, store hex digest as `workingSetFingerprint`

Compute lives in a single function under `convex/processEnvironmentStates.ts`
(or a co-located helper) that reads from the relevant tables directly.

### Provider strategy for Epic 3

Implement **`LocalProviderAdapter` first** (smaller surface, no external
auth research needed). `DaytonaProviderAdapter` may ship as a typed skeleton
that throws `NotImplementedError` — Daytona auth/SDK research remains
gated and is not required to unblock Epic 3 acceptance.

Rationale: spec (tech-design-server.md:65-71) makes Local a contract-compatible
fast follow. Local is sufficient to prove the contract is real and to satisfy
all Epic 3 ACs against a working provider.

### Schema migrations

**No migrations.** No data preservation. Pre-customer development; existing
data in dev DB is throwaway. Schema breaking changes land as direct edits.

Rationale: explicit user direction. The migration discipline (`@convex-dev/migrations`
+ widen-migrate-narrow pattern) becomes mandatory before paying customers and
will be picked up at that point, not preemptively.

### FakeConvexContext storage support

The fake context at `convex/test_helpers/fake_convex_context.ts` gets an
in-memory storage implementation (Map of storageId → Blob, supporting
`store`, `get`, `delete`, `getUrl`). Required for unit tests on the new
artifact action and any other Convex code that exercises file storage.

### Honest stubs

Test fakes (`InMemoryProviderAdapter`, `FailingProviderAdapter`,
`FailingCodeCheckpointWriter`) remain available as test seams. They are
**not** wired as production defaults after this work. Production wiring
selects a real implementation (`LocalProviderAdapter` for dev,
`DaytonaProviderAdapter` for shared/remote — the latter throwing
`NotImplementedError` until Daytona research closes).

---

## Explicitly out of scope (still)

These items remain deferred per the original Epic 3 scope. They were
re-validated as out of scope during gap analysis:

- Real `DaytonaProviderAdapter` implementation. Auth flow, SDK composition,
  and adapter wiring remain research-gated. A typed skeleton ships;
  full integration is follow-on work.
- User-initiated environment discard / teardown control.
- Full GitHub PR / branch / review workflows. Code checkpointing writes
  directly to the attached writable target ref per spec at
  `tech-design-server.md:951-959`.
- Ordered checkpoint-results browser surface. Latest-only this epic.
- Full canonical archive entry taxonomy (Feature 5 follow-on).
- Cloudflare or other managed providers beyond Daytona + Local.
- E2E test suite. Scaffolded but not executable; documented as intentional
  for the first TDD cycles. Not gating epic acceptance.
- Process-type-specific orchestration (current_request shape per process
  type, side-work emission per process type). Generic `ExecutionResult`
  fields land per spec; per-process-type interpretation is per-process-type
  epic territory.

---

## Verification plan for closure

Each chunk dispatches as a single fix-batch with its own dual verification.

After each chunk:
1. Orchestrator gate: `corepack pnpm run verify` exits 0
2. Dual verification: Codex `gpt-5.4 xhigh` + Sonnet 4.6 max, both fresh sessions, both reading the post-fix tree
3. On REVISE: bounded fix slice, re-verify, then commit
4. On dual PASS: commit chunk

After Chunk 3 (final):
1. **Re-run the full four-phase epic verification** — fresh Phase 1 reviews
   from GPT-5.4 xhigh, GPT-5.3-codex xhigh, Sonnet 4.6 max adversarial, and
   Opus 1m max adversarial; Phase 2 cross-reviewer meta-reports; Phase 3
   fresh GPT-5.4 xhigh synthesis with independent code verification
2. Synthesis verdict must be SHIP for Epic 3 to be accepted
3. Manual Verification Checklist (`test-plan.md:501+`) must run end-to-end
   against `npx convex dev` + Fastify/Vite dev server with `LocalProviderAdapter`
   and the real Octokit code writer

Acceptance criteria: synthesis SHIP + manual checklist clean = Epic 3 done.
