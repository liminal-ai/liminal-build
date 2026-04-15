# Codex Review: Story 0 Foundation

**READING_JOURNEY_OBSERVATIONS**

1. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design.md`
OBSERVED: The design treats Story 0 / Chunk 0 as pure infrastructure: shared contracts, route/state vocabulary, websocket plugin wiring, fixtures, Convex table skeletons, and test utilities, with `0` TC tests and `0` non-TC tests.
OBSERVED: The design explicitly narrows Epic 2 to the process surface, not the full execution substrate, and it explicitly calls out that modified Convex modules should follow the stricter generated Convex guidance rather than preserve scaffold shortcuts.
INFERRED: Foundation quality matters more than breadth here; if shared contracts or touched Convex seams are wrong, later stories inherit the defect.

2. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-client.md`
OBSERVED: The client design introduces a third route kind, a dedicated `processSurface` state slice, and a pure `applyLiveProcessMessage()` helper intended to carry later live-reconciliation behavior.
OBSERVED: The client design keeps Story 0 in scaffold territory by listing stub signatures for later flow modules, but it still expects the route model and live reducer to be stable technical foundations.
INFERRED: Even without Story 1 UI behavior, route parsing, state shape, and live-message semantics need to be internally coherent now because later tests and implementations will reuse them directly.

3. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-server.md`
OBSERVED: The server design expects process routes, websocket integration, a process module registry, and new Convex tables, with explicit emphasis on registering websocket support before routes.
OBSERVED: The durable-state design adds `currentRequestHistoryItemId` to `processes` and says modified Convex modules should use typed registrations, validators, bounded queries, and guideline-compliant indexes.
INFERRED: Story 0 can leave behavior stubbed, but the foundational interfaces and touched persistence seams should already match the intended architecture direction.

4. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/epic.md`
OBSERVED: The epic scope is broad for the later stories, but Story 0 is not supposed to deliver end-user behavior from those AC/TC rows.
OBSERVED: The epic reinforces that the work surface is single-process, process-owned, and must remain coherent through live/disconnected states without flattening into generic chat.
INFERRED: Any Story 0 contract that permits cross-process ambiguity or fakes Story 1+ behavior would be misaligned with the epic’s process-first model.

5. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/test-plan.md`
OBSERVED: Chunk 0 exit criteria are `pnpm typecheck` and `pnpm build`; no executable tests are planned in this story.
OBSERVED: The plan still expects reusable fixtures, render helpers, and Convex table foundations that later stories can trust.
INFERRED: With no test-file changes expected, static contract correctness and architecture alignment carry most of the verification burden here.

6. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/00-foundation.md`
OBSERVED: The story objective is to establish shared route model, vocabulary, fixtures, and test helpers for Stories 1 through 6, while explicitly avoiding user-visible Story 1+ behavior.
OBSERVED: The story’s technical-design table defines single-process live-update semantics and a specific process-surface action vocabulary (`start`, `respond`, `resume`, `review`, `restart`).
INFERRED: The main Story 0 risks are bad foundations, not missing UI behavior.

7. `/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/00-foundation/verification-bundle.md`
OBSERVED: The bundle claims no changed test files, scaffold-only server/client behavior, new shared contracts, a live reducer, Convex table skeletons, and reusable fixtures.
OBSERVED: The bundle itself flags `convex/processes.ts` as a likely scrutiny point because Story 0 touched it while it still contains older Convex shortcuts.
INFERRED: The bundle is directionally honest about scaffolding limits, but its stronger “future story consumer” claims still need to be checked against the actual code.

8. `git diff c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac -- **/*.test.* **/*.spec.*`
OBSERVED: The diff returned no changed `*.test.*` or `*.spec.*` files.
OBSERVED: New `tests/fixtures/*.ts` files exist in the working tree, but they are helpers, not executable test files.
INFERRED: The bundle’s “none” test-diff claim is accurate, so fixture correctness matters disproportionately because there is no test suite exercising these new foundations yet.

VERDICT: REVISE

**CORRECTNESS_FINDINGS**

1. finding: The live-update foundation currently permits and even ships a cross-process `process` upsert, which breaks the story’s single-process live contract.
severity: MAJOR
confidence: HIGH
evidence: OBSERVED in [live-process-updates.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/live-process-updates.ts:26) that `process` live messages require a top-level `processId`, an `entityId`, and a `payload`, but do not enforce that those identifiers refer to the same process. OBSERVED in [live-process.ts](/Users/leemoore/code/liminal-build/tests/fixtures/live-process.ts:15) that the shared base fixture sets `processId` from `waitingProcessSurfaceFixture`, while [live-process.ts](/Users/leemoore/code/liminal-build/tests/fixtures/live-process.ts:39) builds `processUpsertLiveFixture` with `entityId` and `payload` from `runningProcessSurfaceFixture`. OBSERVED in [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:41) that those fixtures have different `processId` values. OBSERVED in [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:87) that `applyLiveProcessMessage()` never checks `message.processId` against the current surface before mutating state.
disproof_attempt: I considered whether top-level `processId` was meant to identify only the subscription while payload/entity ids could legally point to another process. I found no support for that in the story contract, epic, or tech design; all three describe a dedicated work surface for one process, and the story contract says `processId` is “Process this live update belongs to.”
impact: Later stories can inherit a bad fixture and a permissive reducer that allow one process surface to accept another process’s process-summary update. That undermines the correctness of the reusable live-update foundation Story 0 was supposed to establish.
validation_step: Build a `process` message whose top-level `processId` differs from `payload.processId`; it currently parses and `applyLiveProcessMessage()` will currently accept and apply it.

**ARCHITECTURE_FINDINGS**

1. finding: The websocket “foundation” stops at Fastify decoration and does not yet wire actual websocket support, so Chunk 0’s websocket setup is only partially realized.
severity: MINOR
confidence: HIGH
evidence: OBSERVED in [websocket.plugin.ts](/Users/leemoore/code/liminal-build/apps/platform/server/plugins/websocket.plugin.ts:1) that the plugin only decorates `processLiveHub`; it never imports or registers `@fastify/websocket`. OBSERVED in [apps/platform/package.json](/Users/leemoore/code/liminal-build/apps/platform/package.json:14) that `@fastify/websocket` is not present in dependencies. OBSERVED in [app.ts](/Users/leemoore/code/liminal-build/apps/platform/server/app.ts:111) that the app does register the placeholder plugin before routes, so assembly order groundwork exists.
disproof_attempt: I considered treating this as intentional scaffolding only, because the bundle says websocket behavior is not implemented yet. That reduces the severity, but it does not change the fact that the specific “websocket plugin wiring” called for by the design/test-plan is not fully present yet.
impact: Later stories still need another round of foundational work before websocket routes can actually be mounted; Story 0 gives naming and DI seams, not complete transport wiring.
validation_step: Add `@fastify/websocket` to the platform package and register it inside `websocket.plugin.ts` before any websocket routes are introduced.

**REUSE_AND_SCOPE_FINDINGS**

1. finding: The process-route foundation is reusable for parsing/path construction and state shape, but not yet for distinct page rendering or process-surface bootstrap.
severity: MINOR
confidence: HIGH
evidence: OBSERVED in [router.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/router.ts:12) that `/projects/:projectId/processes/:processId` is parsed and rebuilt correctly. OBSERVED in [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:151) that every non-index route still loads `getProjectShell()`. OBSERVED in [shell-app.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/shell-app.ts:21) that rendering still chooses between only project index and project shell based on `state.route.projectId === null`.
disproof_attempt: I considered elevating this because the verification bundle lists direct-route test-helper support. I did not, because the bundle also explicitly states that Story 1 process-surface page/bootstrap behavior remains intentionally unimplemented.
impact: Story 0 provides the route vocabulary later stories need, but it does not by itself give a reusable end-to-end direct-process-route path. Future stories still need to finish the page-selection/bootstrap branch.
validation_step: When Story 1 lands, add route-kind-based page switching and a process-surface bootstrap branch so a direct process URL mounts a distinct surface instead of the project shell.

**TEST_DIFF_AUDIT**

OBSERVED: `git diff c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac -- **/*.test.* **/*.spec.*` produced no test-file diff.
OBSERVED: The bundle’s claim of “none” for changed test files is accurate.
OBSERVED: Added helper files exist under `/Users/leemoore/code/liminal-build/tests/fixtures/`, but those are not executable tests and therefore do not contradict the bundle’s test-file claim.
INFERRED: This matches the Chunk 0 test plan, but it also means the new contracts, fixtures, and reducer behavior are effectively untested beyond typecheck/build.

**CONVEX_GUIDELINE_FINDINGS**

1. finding: `convex/processes.ts` was modified for Story 0 but still preserves the exact Convex patterns the Epic 2 design says modified modules should stop using.
severity: MAJOR
confidence: HIGH
evidence: OBSERVED in [processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:1) that the module still uses `queryGeneric` / `mutationGeneric`. OBSERVED in [processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:37) and [processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:64) that handlers still use `ctx: any` / `args: any`. OBSERVED in [processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:38) that `listProjectProcessSummaries` still performs an unbounded `.collect()`. OBSERVED in [schema.ts](/Users/leemoore/code/liminal-build/convex/schema.ts:23) that Story 0 added a guideline-compliant `by_projectId_and_updatedAt` index but also kept the old `by_projectId_updatedAt`, and the modified query still uses the old name. OBSERVED in the repo-required Convex guidance and in [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design.md:47) plus [tech-design-server.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-server.md:264) that new and modified Convex modules for Epic 2 are supposed to use generated registrations, typed contexts, bounded queries, and explicit guideline-compliant indexes.
disproof_attempt: I considered whether Story 0 could reasonably limit itself to adding `currentRequestHistoryItemId` and defer all cleanup. I rejected that as sufficient disproof because the design explicitly carves out “new and modified Convex modules” as in-scope for guideline compliance, and `processes.ts` is the core table Story 0 changed.
impact: The story leaves a touched foundation module carrying forward weak typing, unbounded reads, and outdated index usage right where later stories will need to rely on process/current-request durability. That is architecture debt in a newly-touched seam, not untouched legacy debt.
validation_step: Migrate `convex/processes.ts` to generated `query` / `mutation`, typed contexts/ids, bounded reads, and the normalized index naming before later stories depend on the new `currentRequestHistoryItemId` field.

**BLOCKING_FINDINGS**

OBSERVED: The live-update contract/fixture foundation is internally inconsistent for `process` messages and can mutate one process surface with another process’s payload.
OBSERVED: The modified `convex/processes.ts` module does not meet the stricter Epic 2 / generated Convex guidance despite Story 0 touching it for new foundation data.
INFERRED: Those two issues are enough to require revision before treating Story 0 as a trustworthy foundation for later stories.

**NONBLOCKING_WARNINGS**

OBSERVED: [routes/processes.ts](/Users/leemoore/code/liminal-build/apps/platform/server/routes/processes.ts:20) is a naming scaffold only; it exports route patterns but registers no Fastify routes yet.
OBSERVED: The client-side process route is parsed and stored, but current rendering still falls back to project-shell behavior for any route with a `projectId`.
OBSERVED: The story implementation under review exists entirely in the working tree on top of the base commit; `HEAD` is still `c9a63ef2b71e7bdfa380a6c7313f3a2b38e7c9ac`, so added files appear via `git status` rather than `git diff <base>`.

**UNRESOLVED**

UNRESOLVED: I did not find executable tests covering `applyLiveProcessMessage()`, the new shared live schemas, or the new fixtures, so the live foundation is only statically verified here.
UNRESOLVED: Because the process-route/websocket layers are intentionally scaffold-only, I cannot prove from this story alone whether later stories will extend these seams cleanly or need to replace parts of them.

**GATE_RESULT**

OBSERVED: `corepack pnpm run typecheck && corepack pnpm run build` exited successfully on April 14, 2026 in `/Users/leemoore/code/liminal-build`.
OBSERVED: TypeScript completed for the root project and `@liminal-build/platform`, and the client build completed successfully with Vite.
INFERRED: The gate result is supporting evidence that the foundation compiles, but it does not disprove the contract and architecture issues above.

After your review: what else did you notice but chose not to report?

OBSERVED: The verification bundle’s changed-file manifest matches the code-focused working-tree changes I found, aside from additional review-artifact docs that are outside the implementation surface.
OBSERVED: The new shared contracts are generally well organized: process-surface contracts are split from legacy shell contracts instead of overloading the existing shell schemas.
OBSERVED: The story stayed disciplined about not implementing Story 1+ visible UI modules; the review concerns are mostly about foundation correctness and touched-seam quality, not scope creep into later behavior.
