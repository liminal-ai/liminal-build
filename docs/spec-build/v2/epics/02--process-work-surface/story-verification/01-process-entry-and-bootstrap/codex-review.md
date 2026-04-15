VERDICT: REVISE

CORRECTNESS_FINDINGS
- `currentRequest` on the production Convex path does not actually preserve the request semantics the Story 1 contract publishes. In [convex/processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:79), the unresolved request projection is rebuilt with `requestKind: 'other'` and `requiredActionLabel: processRecord.nextActionLabel` instead of request-derived values. That still passes schema validation, but it means the shipped bootstrap cannot faithfully render the blocker metadata that the story defines in [01-process-entry-and-bootstrap.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/01-process-entry-and-bootstrap.md:216). This is a real contract drift, not just a test-fixture mismatch, because the current-request panel renders those fields directly.

ARCHITECTURE_FINDINGS
- The materials bootstrap does not follow the design's process-owned projection model. [materials-section.reader.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/readers/materials-section.reader.ts:14) reads all project artifacts and sources, then filters them by `processId`, while [convex/processOutputs.ts](/Users/leemoore/code/liminal-build/convex/processOutputs.ts:6) drops `linkedArtifactId` from the returned output shape. That means the reader cannot implement the tech design's module-selected `materialRefs` flow or the linked-output no-duplication rule described in [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design.md:177) and [tech-design-server.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/tech-design-server.md:540). For any process whose "current materials" include project-scoped refs or outputs already represented by artifacts, Story 1 can return incomplete or duplicated materials on first load, which is an AC-1.4 risk.

TEST_DIFF_AUDIT
- Running `git diff f97509a75b051a4434cedf6e74f9e85ea333a5a0 -- **/*.test.* **/*.spec.*` only shows 57 added lines across three tracked tests: [project-shell-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/project-shell-page.test.ts:1), [auth-routes.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/auth-routes.test.ts:1), and [processes-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/processes-api.test.ts:1).
- That diff under-reports the actual Story 1 test work because the new story-focused suites are still untracked in the working tree and therefore invisible to `git diff` until they are staged or committed.
- The untracked Story 1 suites I inspected and that were exercised by `test:service` / `test:client` are [process-router.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-router.test.ts:1), [process-work-surface-page.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-work-surface-page.test.ts:1), [process-history-section.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-history-section.test.ts:1), [process-html-routes.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-html-routes.test.ts:1), and [process-work-surface-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-work-surface-api.test.ts:1).

TEST_QUALITY_FINDINGS
- The service/API suite validates rich `currentRequest` payloads only through `InMemoryPlatformStore` fixtures in [process-work-surface-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-work-surface-api.test.ts:102), not through the real Convex-backed request projection in [convex/processes.ts](/Users/leemoore/code/liminal-build/convex/processes.ts:79). That is why the runtime `requestKind` / `requiredActionLabel` drift is not caught by the passing tests.
- The materials tests only seed process-scoped artifacts and sources in [process-work-surface-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/process-work-surface-api.test.ts:102), so they never exercise the design-critical cases where relevant materials are project-scoped or where `processOutputs.linkedArtifactId` should suppress duplicate output entries.
- `TC-6.4a` is well covered at the HTML and client layers, but there is no direct service test for the API `GET /api/projects/:projectId/processes/:processId` missing-process response. That leaves the request-level `PROCESS_NOT_FOUND` path less directly guarded than the forbidden path.

BLOCKING_FINDINGS
- The production bootstrap path cannot emit accurate `currentRequest` metadata today; it always degrades the request kind to `'other'` and synthesizes the action label from the process summary. Because Story 1 publishes those fields as part of the bootstrap contract, I do not consider the request projection fully correct yet.
- The materials reader is not aligned with the approved server design, so the "current materials" slice is only correct for the narrow process-scoped fixture shape used in tests. That is too fragile for signing off AC-1.4 as implemented to design.

NONBLOCKING_WARNINGS
- I did not find user-visible shell fallthrough on process routes. The dedicated route/bootstrap split itself looks correct on both client and server.
- I also did not find user-visible Story 2 behavior accidentally shipping here. There is some adjacent scaffolding in the process/live area, but it appears inert for this story and is not what drove the `REVISE` verdict.

UNRESOLVED
- I reviewed the current working tree against base commit `f97509a75b051a4434cedf6e74f9e85ea333a5a0`. The story changes are still uncommitted on `main`, so this verdict applies to the workspace state I inspected, not to a separate story branch or commit I have not seen.
- I did not verify whether the current real process data already stores richer request semantics or project-scoped material relevance elsewhere. The two main findings are based on the published Story 1 / Epic 2 contracts and the concrete code paths present in this workspace.

GATE_RESULT
- `corepack pnpm run red-verify`: PASS
- `corepack pnpm run test:service`: PASS
- `corepack pnpm run test:client`: PASS
- `corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client`: PASS

AFTER_REVIEW_NOTICED_BUT_NOT_REPORTED
- The dedicated process route is implemented cleanly enough that I chose not to write up any separate finding on shell fallthrough; that part of the story looks good.
- Several touched files in the live-update area are formatting-only or inert from a Story 1 behavior standpoint, so I did not treat them as scope-creep findings.
