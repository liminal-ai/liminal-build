VERDICT: PASS

Verified `HEAD` = `dad936e6fea2c89c979c476245d1e2dc0fb699cc` against the prior BLOCK review in `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/chunk-1-verification-codex.md`.

## Defect 1: `ConvexPlatformStore.persistCheckpointArtifacts` lacked admin auth

Status: CLOSED

Evidence:
- `apps/platform/server/config.ts:8-24` makes `CONVEX_DEPLOY_KEY` required in the runtime env schema via `z.string().min(1)`, and `apps/platform/server/config.ts:54-55` enforces that schema at startup through `loadServerEnv()`.
- `apps/platform/server/app.ts:101-105` now plumbs the deploy key into the live store construction path: `new ConvexPlatformStore(env.CONVEX_URL, env.CONVEX_DEPLOY_KEY)`.
- `apps/platform/server/services/projects/platform-store.ts:723-726` changed the constructor signature to `(convexUrl: string, adminDeployKey: string)` and immediately calls `setAdminAuth` via a narrow cast: `(this.client as unknown as { setAdminAuth(token: string): void }).setAdminAuth(adminDeployKey)`.
- The pinned Convex runtime defines `setAdminAuth` as the mechanism that authorizes internal queries, mutations, and actions at `node_modules/.pnpm/convex@1.35.1/node_modules/convex/dist/cjs/browser/http_client.js:121-136`.
- `tests/service/server/convex-platform-store-admin-auth.test.ts:5-29` spies on `ConvexHttpClient.prototype.setAdminAuth`, instantiates `ConvexPlatformStore`, and asserts one call with the configured deploy key. The test does not make HTTP calls and would fail if the constructor stopped invoking `setAdminAuth`.

Reasoning:
- The original root cause was that the production server path invoked an `internalAction` through `ConvexHttpClient` without admin auth. That gap is closed on both the configuration path and the constructor path.
- I did not find any remaining one-argument `new ConvexPlatformStore(...)` call sites in the repo.

## Defect 2: orphaned storage blobs on action failure

Status: CLOSED

Evidence:
- `convex/artifacts.ts:88-139` now wraps the entire upload-plus-mutation flow in a `try/catch`.
- `convex/artifacts.ts:103-117` tracks every successful upload in `uploadedStorageIds` before calling the internal mutation.
- `convex/artifacts.ts:127-138` deletes every tracked storage id on failure, then rethrows the original error with `throw error`.
- `convex/artifacts.test.ts:224-242` reproduces the original single-artifact failure mode by calling the action with a nonexistent `processId` and asserting `storage.list()` is empty afterward.
- `convex/artifacts.test.ts:245-273` verifies a multi-artifact batch failure cleans up all previously uploaded blobs, not just the most recent one, by asserting storage is empty after a three-artifact failure.

Independent adversarial check:
- I additionally forced the 4th `ctx.storage.store()` call to throw in a fake-context harness. Result: `{\"message\":\"Synthetic store failure\",\"storageCount\":0,\"storageIds\":[],\"artifactRows\":0,\"outputRows\":0}`. That confirms the same catch block also cleans partial failures inside the upload loop, not only downstream mutation failures.

Reasoning:
- The prior deterministic orphan path is closed.
- The cleanup does not suppress the original failure: the catch block always rethrows the original exception after attempting cleanup.
- The implementation intentionally swallows individual `ctx.storage.delete()` failures so cleanup attempts cannot replace the primary error. That is acceptable for this fix-batch because it preserves the original cause and still attempts cleanup of every uploaded blob.

## Defect 3: `createProcess` wrote initial env state with `workingSetFingerprint: null`

Status: CLOSED

Evidence:
- `convex/processes.ts:264-318` now inserts the env-state row, inserts the per-process-type state row, computes `initialFingerprint = await computeWorkingSetFingerprint(ctx, processId)`, and patches the env-state row with that value before the mutation returns.
- `convex/processEnvironmentStates.ts:234-292` shows `computeWorkingSetFingerprint()` computing the canonical hash from artifacts, outputs, sources, and `providerKind`.
- `convex/processEnvironmentStates.ts:294-335` shows the helper reading the correct type-specific current-material table for all three supported process types.
- `convex/processes.test.ts:242-268` verifies the stored initial fingerprint is non-null, looks like a SHA-256 hex digest, and exactly matches a fresh `computeWorkingSetFingerprint()` recomputation.
- `convex/processes.test.ts:270-288` verifies every supported process type (`ProductDefinition`, `FeatureSpecification`, `FeatureImplementation`) gets a non-null initial fingerprint.

Reasoning:
- The original defect was that the committed initial env-state row lacked a fingerprint. The fix now computes and patches the fingerprint before `createProcess` completes.
- Although the mutation still inserts the row with `workingSetFingerprint: null` before patching it, Convex mutations commit atomically, so the durable post-mutation state is the patched non-null value, not the transient intermediate write.

## Test review

The new tests are meaningful and not tautological.

- The admin-auth test would fail if `setAdminAuth()` stopped being called.
- The artifact rollback tests would fail if cleanup were removed, if only the last uploaded blob were deleted, or if the original nonexistent-process scenario still leaked storage.
- The fingerprint tests would fail if `createProcess` stopped writing a fingerprint or if the stored value diverged from `computeWorkingSetFingerprint()`.

I did not find any weakened or skipped assertions in the fix-batch diff. The test changes are additive only.

## Gate results

- `corepack pnpm run verify`
  - exit code: `0`
  - convex tests: `34` passed
  - service/server tests: `112` passed
  - client tests: `152` passed
- `corepack pnpm run test:integration`
  - exit code: `0`
  - integration tests: `9` passed
- `corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`
  - exit code: `0`

## New defect search

No new blocking defects found in the fix-batch.

Residual risks worth keeping in mind:
- The admin-auth call relies on a cast to Convex's runtime-only `setAdminAuth` API at `apps/platform/server/services/projects/platform-store.ts:723-726`. That is acceptable on the pinned `convex@1.35.1` dependency and is now test-covered, but future Convex upgrades should re-verify it because TypeScript will not protect this call.
- The orphan cleanup intentionally suppresses individual blob-delete failures at `convex/artifacts.ts:131-136` so the original error is preserved. That means a storage-delete outage could still leave residual orphans, but this does not reintroduce the original deterministic leak and does not mask the primary failure.
