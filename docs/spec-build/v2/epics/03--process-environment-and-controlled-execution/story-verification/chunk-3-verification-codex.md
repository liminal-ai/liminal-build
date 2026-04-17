VERDICT: REVISE

Reviewed commit `d423a4d95f644007b108a1575ed605aa841ae173` against the Epic 3 implementation addendum, the authoritative `tech-design-server.md` sections, the Chunk 2 r2 verifier note, and the diff from `36fd186..d423a4d`.

## Verification Matrix

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| 3. Real Octokit code checkpoint writer | SATISFIED | `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:1-309`; `apps/platform/server/app.ts:158-165`; `apps/platform/server/config.ts:32-38`; `apps/platform/server/index.ts:48-54`; `package.json:37-39`; `pnpm-lock.yaml:9-13,656-658,2054-2059`; `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:93-265` | Real writer exists, uses `@octokit/rest@22.0.1`, authenticates from `GITHUB_TOKEN`, writes via `repos.createOrUpdateFileContents`, invents no branches or PRs, and returns structured failures for auth/conflict/network paths. Production `createApp` defaults to `OctokitCodeCheckpointWriter`. I ran the dedicated GitHub integration test with verbose output and observed live GitHub `GET`/`PUT` traffic; it passed 3/3 tests. Cleanup/isolation is good in practice, but slightly weaker than requested because it uses suite-level `afterAll` rather than per-test `try/finally`. |
| 10. Client trusts `environment.statusLabel` | NOT CLOSED | `apps/platform/client/features/processes/process-environment-panel.ts:24-26`; `apps/platform/client/app/process-live.ts:79-98`; `tests/service/client/process-live.test.ts:297-344`; `tests/service/client/process-environment-panel.test.ts:18-42` | The panel render path is fixed: it now renders `args.environment.statusLabel` directly. But the live reducer still rewrites every incoming environment update with `deriveEnvironmentStatusLabel(state)`, so live-updated UIs still do not trust the server contract. The updated panel tests are also weakened: both custom labels equal the canonical derived strings, so they would still pass if recomputation were reintroduced in the panel. |
| 14. Tautological assertion | SATISFIED | `tests/service/server/process-foundation-contracts.test.ts:23-36` | The tautological `expect(processSurfaceControlOrder).toEqual(stableProcessControlOrderFixture)` assertion is gone. The test still meaningfully verifies control ordering by asserting `summary.controls.map((control) => control.actionId)`. |

## CodeCheckpointCandidate Interface Drift Assessment

Authoritative spec shape at `tech-design-server.md:600-616` defines:

```text
sourceAttachmentId
displayName
targetRef
accessMode
workspaceRef
```

Implementation now requires extra fields on the shared provider contract:
- `filePath`: `apps/platform/server/services/processes/environment/provider-adapter.ts:91-115`
- `commitMessage`: `apps/platform/server/services/processes/environment/provider-adapter.ts:91-115`

Assessment:
- `filePath` looks necessary for the current architecture. `workspaceRef` is only a working-tree file location; `ProcessEnvironmentService` resolves it to file contents and separately passes `candidate.filePath` to the writer (`apps/platform/server/services/processes/environment/process-environment.service.ts:1046-1068`). Deriving canonical repo path from `workspaceRef` would be ambiguous and unsafe because `workspaceRef` is not specified as repo-relative.
- `commitMessage` does not look strictly necessary. The writer could synthesize a deterministic default such as `Checkpoint <filePath>`. Making it required is a policy choice, not clearly demanded by the spec.
- Because both fields are required on the shared provider contract, this is not just a private implementation detail. If the team wants this shape long-term, the spec should be amended. If not, `commitMessage` should likely become optional with a writer/orchestrator fallback.

Downstream breakage:
- No in-repo consumer is broken; all repo-visible gates pass.
- But there is a real robustness gap: `LocalProviderAdapter.validateExecutionResult()` only validates top-level arrays, not the nested candidate object shape (`apps/platform/server/services/processes/environment/local-provider-adapter.ts:363-406`). It later checks only `workspaceRef` / `contentsRef` path validity (`apps/platform/server/services/processes/environment/local-provider-adapter.ts:411-491`).
- Result: a script that still emits the authoritative 5-field spec can slip through provider validation without `filePath` / `commitMessage` and then fail later in checkpoint planning/writing with a less clear error. That is a new defect introduced by the interface drift.

## repositoryUrl Propagation Completeness

Status: largely complete, and it does close the Chunk 2 source-clone-resolver gap.

Evidence:
- Durable schema requires `repositoryUrl`: `convex/sourceAttachments.ts:5-29`
- Table uses those fields in schema root: `convex/schema.ts:60-62`
- Convex projection returns it on every source summary: `convex/sourceAttachments.ts:52-63`
- Shared project-shell contract requires it: `apps/platform/shared/contracts/schemas.ts:154-169`
- Shared process-work-surface contract requires it: `apps/platform/shared/contracts/process-work-surface.ts:324-336`
- Materials projection includes it: `apps/platform/server/services/processes/readers/materials-section.reader.ts:82-95`
- Hydration plan fails loud instead of fabricating/skipping: `apps/platform/server/services/processes/environment/process-environment.service.ts:1330-1345`
- Local provider now clones from `source.repositoryUrl` directly and throws on clone failure: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:164-180`
- Code checkpoint bridging resolves `repositoryUrl` from durable source summaries: `apps/platform/server/services/processes/environment/process-environment.service.ts:1046-1068`
- Octokit writer parses `repositoryUrl` into `owner/repo`: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:163-173,250-259`

Conclusion:
- The prior Chunk 2 weakness is closed: LocalProvider no longer silently skips unresolvable sources.
- I did not find a missing projection in the repo-visible read paths.

## Production Fail-Loud Verification

Satisfied.

Evidence:
- Runtime env requires `GITHUB_TOKEN: z.string().min(1)`: `apps/platform/server/config.ts:32-38`
- Production boot path loads env then passes it into `createApp`: `apps/platform/server/index.ts:48-54`
- Production app wiring defaults to real writer, not stub: `apps/platform/server/app.ts:158-165`
- Writer constructor throws clear error on missing/empty token: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:137-145`
- Integration test also fails loud if token is unavailable; it does not skip: `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:93-100`

About the `buildApp` helper:
- `tests/utils/build-app.ts:21-32` does default tests to `StubCodeCheckpointWriter`.
- I do not consider that a regression of Item 3 because it is test-only helper wiring, while production `createApp` now defaults to the real writer and the dedicated GitHub integration test exercises the real path.
- Residual risk remains that most service tests still do not exercise app-level production GitHub wiring; that risk is mitigated, not eliminated, by the dedicated integration lane.

## Test Isolation

What is good:
- Unique branch names per run: `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:73-75`
- Each test creates a disposable branch from the current default branch: `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:140-157`
- Cleanup deletes all created branches and logs orphans on failure: `tests/integration/octokit-code-checkpoint-writer-integration.test.ts:106-138`
- I ran:
  - `corepack pnpm run test:integration`
  - `corepack pnpm exec vitest run tests/integration/octokit-code-checkpoint-writer-integration.test.ts --environment node --reporter verbose`
- The dedicated verbose run executed 3/3 real GitHub tests and showed live GitHub API traffic.
- After the run, `git ls-remote --heads https://github.com/liminal-ai/liminal-build.git 'refs/heads/liminal-checkpoint-test/*'` returned no heads, so I found no orphaned test branches.

Weakness:
- Cleanup is suite-level `afterAll`, not per-test `try/finally`. That is slightly weaker than the requested isolation pattern because a hard runner abort between branch creation and `afterAll` could still orphan a branch.

## Remaining deriveEnvironmentStatusLabel Usages

`apps/platform/client/features/processes/process-environment-panel.ts:24-26`
- Correct. This render path now trusts `args.environment.statusLabel` directly.

`apps/platform/client/app/bootstrap.ts:567-599`
- Acceptable. These branches synthesize local `lost` / `unavailable` summaries for action-error handling when no server-supplied replacement label exists yet.

`apps/platform/shared/contracts/process-work-surface.ts:223-237`
- Acceptable. `defaultEnvironmentSummary` is a default for absent environment state, not a rewrite of an existing server payload.

`apps/platform/client/app/process-live.ts:79-98`
- Not acceptable. This path recomputes `statusLabel` from `state` for every live environment message, even though the live payload already carries `EnvironmentSummary`.
- This is the same contract violation as Item 10, just moved from initial render to live reconciliation.

Test evidence:
- `tests/service/client/process-live.test.ts:297-344` explicitly codifies the recomputation bug by expecting checkpointing and failure fragments to be replaced with `deriveEnvironmentStatusLabel(...)`.
- `tests/service/client/process-environment-panel.test.ts:18-42` was updated, but the new assertions are weak because both labels used are the canonical derived strings.

## Gate Results

`corepack pnpm run verify`
- Exit: 0
- Red-verify substeps passed: format check, lint, typecheck, build
- Convex tests: 7 files / 35 tests passed
- Server service tests: 20 files / 162 tests passed
- Client service tests: 19 files / 152 tests passed

`corepack pnpm run test:integration`
- Exit: 0
- Integration tests: 3 files / 12 tests passed

`corepack pnpm exec vitest run tests/integration/octokit-code-checkpoint-writer-integration.test.ts --environment node --reporter verbose`
- Exit: 0
- Dedicated Octokit integration tests: 1 file / 3 tests passed
- Real GitHub requests were observed in the test output, so the GitHub lane was not skipped

`corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`
- Exit: 0

## New Defects Found

1. `LocalProviderAdapter` does not runtime-validate the new nested `CodeCheckpointCandidate` fields.
   Evidence: `apps/platform/server/services/processes/environment/local-provider-adapter.ts:363-406,474-489`
   Impact: scripts that still emit the authoritative spec shape can pass provider validation without `filePath` / `commitMessage`, then fail later in checkpointing with a less direct error. This is the main concrete risk introduced by the interface drift.

2. `OctokitCodeCheckpointWriter.parseGitHubRepository()` is inconsistent with the repo-url contract.
   Evidence: `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:250-257`
   Notes:
   - It rejects valid GitHub repo names containing `.` because of `([^/.]+)`.
   - It accepts extra trailing path segments (`(?:/.*)?`), even though the surrounding contracts/comments describe `repositoryUrl` as a canonical clone URL.
   - That means the writer is more permissive than the LocalProvider clone path for malformed URLs, and more restrictive than GitHub for dotted repo names.
