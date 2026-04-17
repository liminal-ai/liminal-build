# Epic 3 Compact Code Review (gpt53-codex)

## Verdict
**REVISE**

Cross-story wiring is mostly present and coherent across start/resume -> preparation -> hydration -> execution -> checkpoint -> recovery -> reopen, but the default runtime path still depends on fake/stub boundaries for provider execution and code checkpoints, and there are production-path integrity gaps called out below.

## Scope / Evidence Read
- Base: `e6c0848`
- Compared to: `HEAD`
- Focused reads executed exactly as requested (coverage map, env services, platform-store grep, process routes grep, contracts head, convex env state head, test stats, 3 key test heads, verify gate tail).
- Test delta (`git diff e6c0848..HEAD --stat -- tests/ convex/*.test.ts`): **26 files changed, 5345 insertions, 59 deletions**.

## Cross-Story Composition Assessment
Composition is connected end-to-end in code:
- Start/resume seed hydration plan and set `preparing` state before async hydration: `apps/platform/server/services/processes/process-start.service.ts:39-71`, `apps/platform/server/services/processes/process-resume.service.ts:42-73`.
- Hydration reads persisted plan, updates env to `ready`, then transitions process to `running`: `apps/platform/server/services/processes/environment/process-environment.service.ts:196-242`.
- Execution moves env `running -> checkpointing`, then checkpoint path can publish materials and final env state with checkpoint result: `.../process-environment.service.ts:399-467`, `521-779`.
- Recovery actions (`rehydrate`/`rebuild`) persist acceptance state and execute async outcomes: `.../process-environment.service.ts:61-176`, `286-353`.
- Reopen/bootstrap reads durable env summary in process surface payload: `apps/platform/server/services/processes/process-work-surface.service.ts:375-397`, `apps/platform/server/services/processes/readers/environment-section.reader.ts:7-10`.

No composition break was found in this chain itself, but see production-readiness findings below.

## Key Findings (ordered by severity)

### 1) Default runtime path is still fake/stub-backed for core Epic 3 execution boundaries (production-blocking)
- `createApp` defaults to `InMemoryProviderAdapter` and `StubCodeCheckpointWriter`: `apps/platform/server/app.ts:130-145`.
- `InMemoryProviderAdapter` is explicitly a fake and returns deterministic in-memory outcomes: `apps/platform/server/services/processes/environment/provider-adapter.ts:39-108`.
- `StubCodeCheckpointWriter` always returns success (no real write): `apps/platform/server/services/processes/environment/code-checkpoint-writer.ts:8-20`.
- Only provider implementations are `InMemoryProviderAdapter` and `FailingProviderAdapter`: `.../provider-adapter.ts:44`, `114`.
- Only code checkpoint writers are `StubCodeCheckpointWriter` and `FailingCodeCheckpointWriter`: `.../code-checkpoint-writer.ts:8`, `23`.

Impact: environment readiness/execution/checkpoint success can be reported without a real provider-backed environment or real code checkpoint persistence.

### 2) `runHydrationAsync` can leak unhandled async failures outside provider-hydrate catch path
- Fire-and-forget call has no `.catch`: `apps/platform/server/services/processes/environment/process-environment.service.ts:57-59`.
- `executeHydration` only wraps provider hydration in try/catch (`216-230`), but subsequent transition/publish path (`233-252`) is outside that try.

Impact: failures after hydration (e.g. transition persistence/publication errors) can escape as unhandled promise rejections and skip deterministic failed-state publication.

### 3) `ConvexPlatformStore.hasCanonicalRecoveryMaterials` is partial vs working-set semantics
- Convex implementation checks only material refs (artifacts/sources), not outputs: `apps/platform/server/services/projects/platform-store.ts:949-955`.
- Recovery precheck helper considers outputs canonical too: `apps/platform/server/services/processes/environment/process-environment.service.ts:959-962`.
- Hydration plan includes output ids: `.../process-environment.service.ts:851-860`.
- In-memory implementation includes outputs in its check: `apps/platform/server/services/projects/platform-store.ts:1595-1608`.

Impact: store-level canonical check parity is inconsistent across implementations and does not fully represent the declared working-set model.

### 4) `workingSetFingerprint` appears dead/unimplemented
- Field exists in environment state schema: `convex/processEnvironmentStates.ts:58-59`.
- Inserts/updates set it to `null`: `convex/processEnvironmentStates.ts:192-193`, `284`.
- No non-null writes or reads found in repo search.

Impact: fingerprint-based stale detection path appears incomplete.

### 5) Gate currently fails
- Requested gate command output reports one failing test:
  - `tests/integration/platform-shell.test.ts` fails at `:232` (`expected 200, received 500`) during production-shell serve assertion.

Impact: repo does not currently pass `verify-all` as run in this review.

## Production-Path Question Checks

### Does `ConvexPlatformStore` persist hydration plans?
**Yes.**
- Store layer calls Convex query/mutation for hydration plan: `apps/platform/server/services/projects/platform-store.ts:870-881`.
- Convex functions persist and read `workingSetPlan` on `processEnvironmentStates`: `convex/processEnvironmentStates.ts:223-300`.

### Does `hasCanonicalRecoveryMaterials` do a real check?
**Partially.**
- It performs a real check for current artifact/source refs in Convex (`platform-store.ts:949-955`), but it does not include outputs even though outputs are part of the working-set/canonical-material model elsewhere.

## Boundary Inventory (stubs/fakes)

| Boundary | Evidence | Intended Role | Default Runtime Uses It? | Production-blocking? |
|---|---|---|---|---|
| `InMemoryProviderAdapter` | `provider-adapter.ts:39-108`; default wiring `app.ts:130` | Fake provider for local/tests | Yes | **Yes** |
| `FailingProviderAdapter` | `provider-adapter.ts:114-143` | Test-only failure injection | No | No |
| `StubCodeCheckpointWriter` | `code-checkpoint-writer.ts:8-20`; default wiring `app.ts:134` | Placeholder checkpoint writer | Yes | **Yes** |
| `FailingCodeCheckpointWriter` | `code-checkpoint-writer.ts:23-39` | Test-only failure injection | No | No |
| `ConvexPlatformStore` “stubbed/partial behavior” | `platform-store.ts:949-955` (`hasCanonicalRecoveryMaterials`) | Real store adapter with partial canonical check | Yes (with live Convex env) | **Partial gap** (needs parity with output-aware model) |

## Gate Result
- Command run: `corepack pnpm run verify-all 2>&1 | tail -30`
- Result: **FAIL** (1 failing test file)
- Failure snippet: `tests/integration/platform-shell.test.ts > serves the built shell through Fastify in production mode`, expected `200`, received `500` at `tests/integration/platform-shell.test.ts:232`.
