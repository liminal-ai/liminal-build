# Codex Verification: Optional Environment Defaults

- Reviewer: `codex-optional-defaults-verify`
- Commit: `2e27b1d`
- Verdict: `PASS`

**Summary**
No blocking or nonblocking findings. Commit `2e27b1d` cleanly removes the four `environmentSummarySchema` defaults, the shared schemas now reject payloads that omit those fields, the added negative test is a real parser-failure test, and the audited producers still materialize all four fields before anything reaches `environmentSummarySchema.parse()` or the response schemas.

**Defaults Removed**
- The four target fields no longer use `.default(...)` in [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:233): `environmentId` at line 234, `blockedReason` at line 237, `lastHydratedAt` at line 238, and `lastCheckpointAt` at line 239.
- `defaultEnvironmentSummary` still explicitly carries all four fields as `null`, so callers that spread it remain explicit rather than relying on Zod defaults: [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:223).
- `rg -n "\\.default\\(" apps/platform/shared/contracts/process-work-surface.ts` found only unrelated remaining defaults at [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:164), [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:217), [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:219), [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:408), and [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:416). No other environment-summary default was reintroduced.

**Independent `tsx` Probe**
- I ran `corepack pnpm -C apps/platform exec tsx --eval ...` against the real shared schemas and real fixture payloads.
- `processWorkSurfaceResponseSchema` rejected all four missing fields with `ZodError`, issue path `environment.<field>`, and message `Invalid input: expected string, received undefined`.
- `startProcessResponseSchema`, `resumeProcessResponseSchema`, `rehydrateProcessResponseSchema`, and `rebuildProcessResponseSchema` all did the same for all four fields.

```json
[
  {"schema":"processWorkSurfaceResponseSchema","field":"environmentId","outcome":"rejects","issuePaths":["environment.environmentId"]},
  {"schema":"processWorkSurfaceResponseSchema","field":"blockedReason","outcome":"rejects","issuePaths":["environment.blockedReason"]},
  {"schema":"processWorkSurfaceResponseSchema","field":"lastHydratedAt","outcome":"rejects","issuePaths":["environment.lastHydratedAt"]},
  {"schema":"processWorkSurfaceResponseSchema","field":"lastCheckpointAt","outcome":"rejects","issuePaths":["environment.lastCheckpointAt"]},
  {"schema":"startProcessResponseSchema","field":"environmentId","outcome":"rejects","issuePaths":["environment.environmentId"]},
  {"schema":"startProcessResponseSchema","field":"blockedReason","outcome":"rejects","issuePaths":["environment.blockedReason"]},
  {"schema":"startProcessResponseSchema","field":"lastHydratedAt","outcome":"rejects","issuePaths":["environment.lastHydratedAt"]},
  {"schema":"startProcessResponseSchema","field":"lastCheckpointAt","outcome":"rejects","issuePaths":["environment.lastCheckpointAt"]},
  {"schema":"resumeProcessResponseSchema","field":"environmentId","outcome":"rejects","issuePaths":["environment.environmentId"]},
  {"schema":"resumeProcessResponseSchema","field":"blockedReason","outcome":"rejects","issuePaths":["environment.blockedReason"]},
  {"schema":"resumeProcessResponseSchema","field":"lastHydratedAt","outcome":"rejects","issuePaths":["environment.lastHydratedAt"]},
  {"schema":"resumeProcessResponseSchema","field":"lastCheckpointAt","outcome":"rejects","issuePaths":["environment.lastCheckpointAt"]},
  {"schema":"rehydrateProcessResponseSchema","field":"environmentId","outcome":"rejects","issuePaths":["environment.environmentId"]},
  {"schema":"rehydrateProcessResponseSchema","field":"blockedReason","outcome":"rejects","issuePaths":["environment.blockedReason"]},
  {"schema":"rehydrateProcessResponseSchema","field":"lastHydratedAt","outcome":"rejects","issuePaths":["environment.lastHydratedAt"]},
  {"schema":"rehydrateProcessResponseSchema","field":"lastCheckpointAt","outcome":"rejects","issuePaths":["environment.lastCheckpointAt"]},
  {"schema":"rebuildProcessResponseSchema","field":"environmentId","outcome":"rejects","issuePaths":["environment.environmentId"]},
  {"schema":"rebuildProcessResponseSchema","field":"blockedReason","outcome":"rejects","issuePaths":["environment.blockedReason"]},
  {"schema":"rebuildProcessResponseSchema","field":"lastHydratedAt","outcome":"rejects","issuePaths":["environment.lastHydratedAt"]},
  {"schema":"rebuildProcessResponseSchema","field":"lastCheckpointAt","outcome":"rejects","issuePaths":["environment.lastCheckpointAt"]}
]
```

**Negative Tests**
- The commit added a helper that removes one named environment field from a full bootstrap payload at [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:187).
- The added parameterized test at [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:441) directly calls `processWorkSurfaceResponseSchema.parse(malformedPayload)`, catches the thrown error, asserts it is a `ZodError`, and asserts the issue payload mentions the missing field. This is real parser-failure coverage for each of the four fields, not a side-effect assertion.

**Caller Audit**
- Contract default object: [process-work-surface.ts](/Users/leemoore/code/liminal-build/apps/platform/shared/contracts/process-work-surface.ts:223) explicitly sets all four fields.
- Server bootstrap composer: [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:75) builds the fallback environment by parsing `defaultEnvironmentSummary`; [process-work-surface.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-work-surface.service.ts:457) builds the unavailable fallback by spreading `defaultEnvironmentSummary` and overriding only `state`, `statusLabel`, and `blockedReason`, so the other three fields remain present.
- Store parse callers: [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:201), [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:825), [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:1732), and [platform-store.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/projects/platform-store.ts:1761) all either spread `defaultEnvironmentSummary`/`summary` or explicitly materialize `environmentId`, `blockedReason`, `lastHydratedAt`, and `lastCheckpointAt`.
- Convex producers: [processEnvironmentStates.ts](/Users/leemoore/code/liminal-build/convex/processEnvironmentStates.ts:88) and [processEnvironmentStates.ts](/Users/leemoore/code/liminal-build/convex/processEnvironmentStates.ts:118) directly return `EnvironmentSummary` objects with all four fields; the mutation path persists and reads `lastCheckpointAt` explicitly on both insert and patch at [processEnvironmentStates.ts](/Users/leemoore/code/liminal-build/convex/processEnvironmentStates.ts:450).
- Action response composers: [process-start.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-start.service.ts:43), [process-resume.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-resume.service.ts:46), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:131), and [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:198) obtain `environment` via the validated store/upsert helper and then feed that object into the response schema parse calls at [process-start.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-start.service.ts:93), [process-resume.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/process-resume.service.ts:94), [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:156), and [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:226).
- Live publication builders: [process-live-normalizer.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/live/process-live-normalizer.ts:61) and [process-live-normalizer.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/live/process-live-normalizer.ts:129) do not reconstruct environment payloads at all; they forward `publication.environment` as an `EnvironmentSummary`. Upstream publisher [process-environment.service.ts](/Users/leemoore/code/liminal-build/apps/platform/server/services/processes/environment/process-environment.service.ts:1073) likewise forwards a validated `EnvironmentSummary`.
- Test fixtures: [process-environment.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-environment.ts:12) defines a base environment with all four fields and every fixture routes through `environmentSummarySchema.parse()` at [process-environment.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-environment.ts:22); [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:88) builds full work-surface payloads from those fixtures, and the action-response fixtures at [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:354), [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:376), [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:409), and [process-surface.ts](/Users/leemoore/code/liminal-build/tests/fixtures/process-surface.ts:419) all embed complete environment payloads.
- Additional test doubles outside `tests/fixtures/` also preserve completeness by spreading `defaultEnvironmentSummary`: [processes-api.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/processes-api.test.ts:269) and [auth-routes.test.ts](/Users/leemoore/code/liminal-build/tests/service/server/auth-routes.test.ts:543).
- Client-side derived environment objects preserve all existing fields by spreading the current validated environment before overriding specific fields: [bootstrap.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/bootstrap.ts:571) and [process-live.ts](/Users/leemoore/code/liminal-build/apps/platform/client/app/process-live.ts:94).
- Result: no in-repo caller regression found. I did not find any producer that would send an environment object into parsing or publication without explicit values for `environmentId`, `blockedReason`, `lastHydratedAt`, and `lastCheckpointAt`.

**Regression Checks**
- `corepack pnpm run verify`: exit `0`
  - Convex: `36` tests passed
  - Service: `167` tests passed
  - Client: `161` tests passed
- `corepack pnpm run test:integration`: exit `0`
  - Integration: `12` tests passed
- `corepack pnpm exec tsc --noEmit -p convex/tsconfig.json`: exit `0`
- No new silent-catch pattern in product code. The only new `catch` in this commit is the test-local `ZodError` capture at [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:449), and it is immediately asserted.
- No tests were weakened. `git show 2e27b1d` shows one new helper and one new negative test in [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:187) and [process-live.test.ts](/Users/leemoore/code/liminal-build/tests/service/client/process-live.test.ts:441), with no relaxed assertions elsewhere.
- No previously passing suite regressed in the required lanes; all required commands completed successfully.
