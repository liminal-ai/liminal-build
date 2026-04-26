# Epic 5 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Story 0 is a foundation story and does not own end-user ACs or TCs from the
detailed epic. Stories 1 through 5 follow the recommended Epic 5 breakdown and
the finalized tech-design pack.

## Coverage Gate

| AC | TC | Story | Verifying Test File(s) | Delivery Notes |
|---|---|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b | Story 1 | `convex/artifacts.test.ts`; `tests/service/server/process-work-surface-api.test.ts` | Establishes reference-without-ownership behavior |
| AC-1.2 | TC-1.2a, TC-1.2b | Story 1 | `tests/service/server/project-shell-bootstrap-api.test.ts`; `tests/service/client/project-shell-page.test.ts` | Project artifact set remains deduplicated |
| AC-1.3 | TC-1.3a, TC-1.3b | Story 1 | `tests/service/server/process-work-surface-api.test.ts` | Process-local materials visibility only |
| AC-2.1 | TC-2.1a, TC-2.1b | Story 2 | `convex/artifacts.test.ts` | Write path creates versions without reassigning artifact identity |
| AC-2.2 | TC-2.2a, TC-2.2b | Story 2 | `convex/artifacts.test.ts`; `tests/service/server/artifact-review-api.test.ts` | Version provenance remains visible across histories |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 2 | `tests/service/server/project-shell-bootstrap-api.test.ts`; `tests/service/server/artifact-review-api.test.ts`; `tests/integration/review-workspace.test.ts` | Latest-version summaries and earlier-version reviewability |
| AC-3.1 | TC-3.1a, TC-3.1b | Story 3 | `tests/service/server/review-workspace-api.test.ts` | Reviewability comes from process context |
| AC-3.2 | TC-3.2a, TC-3.2b | Story 3 | `tests/service/server/artifact-review-api.test.ts` | Negative and positive eligibility cases |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 3 | `tests/service/server/artifact-review-api.test.ts`; `tests/service/client/version-switcher.test.ts` | Explicit earlier-version selection and current-version stability |
| AC-3.4 | TC-3.4a, TC-3.4b, TC-3.4c | Story 3 | `tests/service/server/review-workspace-api.test.ts`; `tests/service/server/artifact-review-api.test.ts`; `tests/service/client/review-workspace-page.test.ts`; `tests/service/client/version-switcher.test.ts` | Zero-version target-list and direct-review behavior |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 | `convex/packageSnapshots.test.ts`; `tests/service/client/package-review-panel.test.ts` | Mixed-producer package publication within one project |
| AC-4.2 | TC-4.2a, TC-4.2b, TC-4.2c | Story 4 | `convex/packageSnapshots.test.ts`; `convex/processPackageContexts.test.ts` | Current package-building context rule |
| AC-4.3 | TC-4.3a, TC-4.3b | Story 4 | `tests/service/server/package-review-api.test.ts` | Package member pin stability |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 4 | `tests/service/server/package-review-api.test.ts`; `tests/service/server/review-export-api.test.ts`; `tests/service/client/package-review-panel.test.ts` | Mixed-producer package review and export |
| AC-5.1 | TC-5.1a, TC-5.1b | Story 5 | `tests/integration/review-workspace.test.ts` | Durable reopen behavior |
| AC-5.2 | TC-5.2a, TC-5.2b | Story 5 | `tests/service/server/process-work-surface-api.test.ts`; `tests/service/server/package-review-api.test.ts`; `tests/service/client/package-review-panel.test.ts` | Partial degradation |
| AC-5.3 | TC-5.3a, TC-5.3b | Story 5 | `tests/service/server/artifact-review-api.test.ts`; `tests/service/server/package-review-api.test.ts`; `tests/service/client/package-review-panel.test.ts` | Exact failure taxonomy |
| AC-5.4 | TC-5.4a, TC-5.4b | Story 5 | `tests/service/server/review-workspace-api.test.ts`; `tests/service/client/review-workspace-page.test.ts` | Bootstrap versus follow-up read classification |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC | Verifying Test File(s) |
|---|---|---|---|---|
| Path 1.1 | Add an existing project artifact into a later process without changing project artifact identity | Story 1 | TC-1.1a, TC-1.2b | `convex/artifacts.test.ts`; `tests/service/server/project-shell-bootstrap-api.test.ts` |
| Path 1.2 | Show the artifact in the current process materials but not in unrelated process materials | Story 1 | TC-1.3a, TC-1.3b | `tests/service/server/process-work-surface-api.test.ts` |
| Path 1.3 | Persist a later-process revision as a new version with visible provenance and updated latest-version summary | Story 2 | TC-2.1a, TC-2.2a, TC-2.3a | `convex/artifacts.test.ts`; `tests/service/server/project-shell-bootstrap-api.test.ts` |
| Path 1.4 | Open artifact review from the current process, select an earlier version, and keep that version visible even after newer revisions exist | Story 3 | TC-3.1a, TC-3.3a, TC-3.3b | `tests/service/server/artifact-review-api.test.ts`; `tests/service/client/version-switcher.test.ts` |
| Path 1.5 | Direct-open a zero-version artifact in valid process context and get an empty state rather than unavailable | Story 3 | TC-3.4b, TC-3.4c | `tests/service/server/artifact-review-api.test.ts`; `tests/service/client/review-workspace-page.test.ts` |
| Path 2.1 | Seed a current package-building context from current refs and earlier pinned versions | Story 4 | TC-4.2a, TC-4.2c | `convex/processPackageContexts.test.ts` |
| Path 2.2 | Publish one mixed-producer package from valid same-project current context | Story 4 | TC-4.1a, TC-4.2b | `convex/packageSnapshots.test.ts` |
| Path 2.3 | Reopen the package later and keep pinned member versions stable even when newer artifact versions now exist | Story 4 | TC-4.3a, TC-4.3b | `tests/service/server/package-review-api.test.ts` |
| Path 3.1 | Return later to process materials and package review after cross-process updates without losing durable state | Story 5 | TC-5.1a, TC-5.1b | `tests/integration/review-workspace.test.ts` |
| Path 3.2 | Degrade only one unavailable package member and keep the rest of the package readable | Story 5 | TC-5.2b, TC-5.3b | `tests/service/server/package-review-api.test.ts`; `tests/service/client/package-review-panel.test.ts` |
| Path 3.3 | Distinguish missing target, missing explicit version, and unavailable package member in bootstrap and follow-up reads | Story 5 | TC-5.3a, TC-5.4a, TC-5.4b | `tests/service/server/review-workspace-api.test.ts`; `tests/service/server/artifact-review-api.test.ts`; `tests/service/server/package-review-api.test.ts` |
