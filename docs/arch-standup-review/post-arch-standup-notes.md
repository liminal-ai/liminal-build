# Post Architecture Standup Notes

Working notes for short-term cleanup, hardening, and validation items discovered
during the architecture standup review. This is intentionally a living brain
dump, not a polished architecture document.

Context for new readers:

- Liminal Build is a process-first platform for planning and building software
  in epic-sized chunks.
- The first seven platform epics stood up the technical skeleton: projects,
  process work surface, controlled environments, artifact review/packages,
  artifact provenance, source attachments/provenance, and archive/derived
  views.
- The next major functional process is expected to be Epic Creation. These notes
  capture short-term issues to handle before or while building that process.

Key terms used below:

- `Process`: a durable unit of work inside a project, such as product
  definition, feature specification, or feature implementation.
- `Environment`: a disposable working filesystem/sandbox attached to a process.
  It is working state only, not canonical truth.
- `Provider`: an adapter that creates/runs environments. Current relevant
  providers include Local and Daytona.
- `ExecutionResult`: the structured result returned after a script runs inside
  an environment. It tells the platform which durable side effects to apply.
- `Checkpoint`: persisting environment outputs back to canonical stores, such as
  Convex artifact versions or GitHub code updates.
- `Archive`: finalized canonical process memory. It is separate from live UI
  updates and visible process history.

## Epic 3 Runtime Path

Epic 3 introduced controlled execution: a process can hydrate an environment,
run a TypeScript script through a provider, and checkpoint outputs back to
canonical stores. The current implementation is mostly healthy, but the items
below should be handled or watched as the platform moves from substrate tests to
real process execution.

### Sandbox Script Environment Leakage

Concern: executed scripts may inherit server process environment variables.
This would weaken the sandbox boundary because generated process code could
read app secrets from `process.env`.

Current read:

- `LocalProviderAdapter` runs `node` without passing a restricted `env`, so the
  child process likely inherits Fastify server secrets.
- Daytona execution also does not explicitly pass a minimal environment.
- This matters once scripts are model-generated or otherwise not fully trusted.

Recommendation:

- Pass an explicit minimal environment allowlist to local script execution.
- Do the same for Daytona execution if Daytona supports explicit env control.
- Default to no app secrets in sandbox script execution.

Effort: medium.

Priority: high before untrusted/model-generated execution.

### Default Runtime Payload Is Generic

Concern: the integrated runtime payload proves plumbing, but it is not yet a
process-specific AI execution contract.

Current read:

- It writes a runtime brief / audit-style artifact.
- That is fine for Epic 3 substrate validation.
- Epic Creation should not rely on this as the final process runtime behavior.

Recommendation:

- Treat process-specific execution contracts as part of the first functional
  process build.
- Keep the generic payload as a smoke-test/default path only.

Effort: large, but naturally belongs to functional process implementation.

Priority: normal.

### Execution Result Validation

Concern: provider adapters validate the top-level `ExecutionResult` shape, but
some nested payloads are cast rather than fully schema-validated.

Why it matters: `ExecutionResult` is the boundary between sandbox execution and
durable platform writes. Malformed nested data should be rejected at this
boundary before it reaches checkpointing, history, source provenance, or archive
paths.

Research status:

- No broad external research needed.
- The `lspec-core` alignment audit answered the main architecture question:
  keep `ExecutionResult` as the lower controlled-execution side-effect boundary,
  and keep richer orchestration envelopes above it.
- Remaining work is a focused schema/design spike, not conceptual discovery.

Recommendation:

- Move `ExecutionResult` validation to a shared schema.
- Reuse that schema in Local, Daytona, and tests.
- Validate translated `lspec-core` outputs against the same schema when an
  orchestration flow produces runtime side effects.

Effort: small/medium.

Priority: medium.

### Process/Environment Projection Drift

Concern: process controls depend on both process state and environment state.
Most projection logic appears centralized, but start/resume still assemble some
environment preparation state directly.

Why it matters: the process work surface shows actions and disabled reasons
based on both process lifecycle and environment lifecycle. If action responses,
live updates, and bootstrap reads compute those differently, the UI can show
stale or incorrect controls.

Research status:

- No separate research needed right now.
- This is not a known broken area. It is a drift risk to handle when this code
  is next touched.

Recommendation:

- Keep watching for drift between action responses, live publications, and
  bootstrap summaries.
- Consider centralizing start/resume hydration-plan preparation through the
  environment service if this area changes again.
- Establish one canonical projection/helper boundary for process summary,
  environment summary, controls, and disabled reasons.
- Make bootstrap, start, resume, rehydrate, rebuild, and live publications all
  use that boundary.
- Add focused regression tests for same-session control correctness after
  environment transitions such as `preparing`, `ready`, `stale`, `failed`, and
  `lost`/rebuildable.

Effort: small/medium.

Priority: low unless bugs appear.

## lspec-core Integration Direction

Context: `lspec-core` is a separate repo containing an orchestration CLI and SDK
for epic-build flows. The CLI commands are thin wrappers over SDK methods. It
has useful primitives for operation envelopes, layered flows, story-run ledgers,
progress events, and continuation/replay handles.

Current read: `lspec-core` is broadly aligned with the Liminal Build platform
trajectory, but it should not be merged directly into `ExecutionResult`.

Recommended mental model:

- `lspec-core` is the orchestration brain: operation envelopes, layered flows,
  story-run ledger, progress events, continuation/replay handles.
- Liminal Build `ExecutionResult` is the controlled runtime side-effect
  boundary: process history writes, output writes, side-work writes, artifact
  checkpoint candidates, code checkpoint candidates, source usage, archive
  entries.
- Liminal Build platform state is the durable projection layer: process surface,
  artifacts, source provenance, package context, archive entries, turns, and
  derived views.

Preferred integration shape:

1. Provider/runtime diagnostics below `ExecutionResult`.
2. Hardened `ExecutionResult` at the controlled execution boundary.
3. Higher-level orchestration envelope above `ExecutionResult`, borrowing from
   `lspec-core` primitives and flow ledger concepts.

Implication:

- Keep `ExecutionResult` focused on "what durable side effects should this
  execution produce?"
- Translate richer `lspec-core` flow results into Liminal Build writes:
  process history, side work, archive entries, output refs, artifact/code
  checkpoint candidates, source provenance, and package context.
- Do not let `ExecutionResult` become a full orchestration transcript or story
  runner ledger.

Recommended next work:

- Add strict shared schema validation for `ExecutionResult`.
- Do a small orchestration-envelope translator spike:
  `lspec-core` operation/flow result -> Liminal Build process/runtime writes.
- Use that spike to decide which `lspec-core` primitives should become native
  platform concepts and which should stay behind an adapter.

Effort: medium.

Priority: medium/high before merging `lspec-core` into the platform.
