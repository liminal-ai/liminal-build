# Known Hardening and Deferrals

The seven-epic platform standup is durable end to end, but a small set of items are still being firmed up against production reality, several capabilities are intentionally deferred, and a handful of process lessons from the standup remain load-bearing for future design work. The items below are categorized as active hardening, deferred capabilities, or open lessons. Each carries a pointer to the relevant [design page](../current-technical-design/README.md) and, where applicable, to the post-standup review evidence that surfaced it. Active hardening items are work in flight; deferred capabilities are intentional non-decisions, not gaps; the lessons are guidance for designing on top of what already landed.

## Active Hardening

These four items remain in active hardening. None are described as broken; each names a specific concern that is in flight against the platform's production path rather than its test-only path. The pointer cell links to the design page that owns the surface and, parenthetically, to the standup-review evidence that named the concern.

| Item | Why | Pointer |
|-|-|-|
| Sandbox environment-variable allowlist | The sandbox script-execution path currently inherits a broad parent-process environment rather than enforcing an explicit allowlist. The expected shape is a minimal, named-only env passthrough so generated [process](../conventions/glossary.md) code cannot read app secrets from `process.env`. This matters most as script payloads move from substrate-validation to model-generated work. | [process-runtime-and-environments.md](../current-technical-design/process-runtime-and-environments.md) (and [standup review 03](../../arch-standup-review/03-process-environment-controlled-execution-build-summary.md)) |
| Strict [ExecutionResult](../conventions/glossary.md) schema validation | The top-level `ExecutionResult` is parsed at the Fastify boundary, but several nested payloads are still cast rather than schema-validated. The expected shape is a single shared schema reused across Local, Daytona, tests, and any orchestration translator, with malformed nested data rejected at the controlled-execution boundary before it can reach checkpointing, history, source provenance, or archive paths. | [shared-contracts.md](../current-technical-design/shared-contracts.md) (and [standup review 03](../../arch-standup-review/03-process-environment-controlled-execution-build-summary.md)) |
| Epic 6 source-management implementation review | Source attachments and source provenance shipped story by story, but the epic was administratively closed before the formal verification loop converged. Source semantics cross identity, authorization, scope shadowing, environment hydration, checkpoint planning, and durable provenance, so a focused implementation-review pass is expected before heavier product surfaces are layered on. | [source-management-domain.md](../current-technical-design/source-management-domain.md) (and [standup review 06](../../arch-standup-review/06-source-attachments-canonical-source-management-build-summary.md)) |
| Epic 3 manual checklist closeout | The controlled-execution path passed full verification only after the in-memory provider stub was replaced with a real local provider and a real GitHub checkpoint writer, which moved the epic from story-level green to epic-level green. The remaining work is a manual recovery and rebuild walkthrough against running Convex and Fastify with the real local provider and Octokit writer. | [process-runtime-and-environments.md](../current-technical-design/process-runtime-and-environments.md) (and [standup review 03](../../arch-standup-review/03-process-environment-controlled-execution-build-summary.md)) |

## Deferred Capabilities

Each row below names something the architecture allows for and the team has chosen not to build yet. Design pages should treat these as deferred — present in the platform's mental model, absent from current behavior — rather than as missing or partial functionality.

| Capability | Why Deferred | Pointer |
|-|-|-|
| Cloudflare Sandbox provider validation | The provider abstraction is shaped for a third managed provider beyond Local and Daytona, and Cloudflare Sandbox is named in the architecture as a candidate. End-to-end validation against a hosted Cloudflare provider has not been exercised and is held until provider research closes. | [process-runtime-and-environments.md](../current-technical-design/process-runtime-and-environments.md) |
| MCP and external sources | Source Attachments are GitHub-canonical for now, with `repositoryFullName` as normalized identity and `repositoryUrl` as the operational URL. MCP servers and other non-repository hosts are deferred until the GitHub-only model has matured through real process work. | [source-management-domain.md](../current-technical-design/source-management-domain.md) |
| Model-generated archive turn summaries | Derived archive views are deliberately structural only, supporting `turn_range` and `chunk_candidate` over canonical archive entries. Summarized turn views — generated text, model-authored chunk descriptions — are deferred until process-specific context strategies exist to govern them. | [archive-and-derived-views.md](../current-technical-design/archive-and-derived-views.md) |
| Multi-draft package contexts | Each process has one mutable Process Package Context with explicit pinned member versions. Multi-draft package authoring, where a process holds several concurrent in-flight package drafts, is deferred. | [review-package-and-export.md](../current-technical-design/review-package-and-export.md) |
| `lspec-core` orchestration envelope above `ExecutionResult` | The platform's controlled-execution result remains the lower side-effect boundary: history writes, output writes, side-work writes, and artifact/code checkpoint candidates. A higher orchestration envelope adapted from `lspec-core` primitives sits above that boundary in the [repository layout](../conventions/repository-layout.md) adjacent to `packages/lbuild-impl`, but no runtime control path consumes it yet. The deferral is positioned, not abandoned: the next move is a focused translator spike rather than a merge into `ExecutionResult`. | [process-runtime-and-environments.md](../current-technical-design/process-runtime-and-environments.md) and [repository-layout.md](../conventions/repository-layout.md) |

## Open Process Lessons

Three lessons from the standup remain load-bearing for any new design that touches the platform's existing surfaces. They are not commandments — they are guidance for catching the same shape of defect earlier next time. Each lesson is grounded in the standup review evidence and is worth recalling before approving a design that resembles it.

### Story-Level Green Is Not Epic-Level Green

Epic 3 surfaced this most clearly: the in-memory provider stub passed every story-level acceptance gate while masking the production code path. Epic-level review later returned a block, and a three-chunk closure program was needed to bring the runtime up to the spec the stories had already claimed. The expected shape when designing or reviewing on top of an existing surface is to confirm that the path producing the test-green is also the path that runs at runtime, not a stub or in-memory shim that has accidentally become the default. The standup review for Epic 3 is the canonical reference for what happens when this is not checked ([standup review 03](../../arch-standup-review/03-process-environment-controlled-execution-build-summary.md)).

### Stub Defaults Mask Gaps

Closely related but distinct: when a stub is acceptable to ship and then becomes the default that runtime accidentally depends on, gaps in the real implementation hide until late-stage verification. The Epic 3 in-memory provider, the original stub checkpoint writer, and the schema defaults that quietly accepted malformed environment payloads are all examples. The expected design posture is that stubs and not-yet-implemented skeletons fail fast — visible errors, no silently-acceptable defaults — so that the real code path is the only path with a green outcome. Epic 4 reinforced the same lesson when an early Story 1 acceptance was reopened because a package read path worked only against in-memory tests ([standup review 04](../../arch-standup-review/04-artifact-review-package-surface-build-summary.md)).

### Same-Session Control Republish Invariant

Epic 3 also surfaced a structural invariant: any environment transition that changes the visible controls on the [process work surface](../current-technical-design/process-domain.md) must republish the `process` upsert alongside the `environment` upsert. Story 1 found action responses recomputing `process` summaries without the current environment summary; Story 3 found execution-lane live publications updating `environment` but not the environment-aware `process`. In both cases the work surface showed controls that were inconsistent with the new environment state until a manual reload. The expected shape when designing a live update that spans process and environment domains is to publish them together as a coherent pair rather than to publish the changed slice alone.

## Related

- [Architecture Overview](./overview.md)
- [Cross-Cutting Decisions](./cross-cutting-decisions.md)
- [Key Runtime Flows](./key-runtime-flows.md)
- [Reference Material](../reference/README.md)
