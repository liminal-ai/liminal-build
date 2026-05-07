# Cross-Cutting Decisions

Platform-wide decisions are settled across all eight top-tier domains and shape every subsystem's design surface. The eight decisions below are the ones that would be expensive to relitigate piecemeal and that downstream design pages inherit rather than rediscover. Each is presented in Choice / Rationale / Consequence form: a one-or-two-sentence definition, a three-row table that names the rationale, the propagated consequence, and the design pages that inherit it, then a short elaboration of what consuming subsystems can rely on.

## Process Types Are Code-Defined Modules

Each [ProcessType](../conventions/glossary.md) — [ProductDefinition](../conventions/glossary.md), [FeatureSpecification](../conventions/glossary.md), [FeatureImplementation](../conventions/glossary.md), and any future first-party type — is shaped as a code module with its own state schema, phase model, and toolset. Process types are crafted in code rather than authored at runtime as configuration.

| | |
|-|-|
| **Rationale** | Crafted process semantics need typed state, phase-aware logic, and explicit persistence per type; a generic dynamic-schema engine cannot give process work the rigor the platform is built for |
| **Consequence** | New process types arrive through code, schema changes, and process-module registry wiring — not by editing a runtime configuration object |
| **Inherited By** | [Process Domain](../current-technical-design/process-domain.md), [Server Control Plane](../current-technical-design/server-control-plane.md), [Convex Durable State and Projections](../current-technical-design/convex-durable-state-and-projections.md) |

The shape is partly in place today: the `processType` enum and per-type durable state tables (`productDefinitionStates`, `featureSpecificationStates`, `featureImplementationStates`) live in Convex schema, and a `ProcessModuleRegistry` class exists and is decorated on the Fastify app. The default registry is constructed empty, and the `start`, `resume`, and work-surface services do not yet dispatch through it to resolve per-type behavior — full module-driven dispatch is a hardening item rather than the live control flow. A downstream designer should still reach for a new module entry, a typed process state table, and a phase model the work surface can read, and design pages can rely on per-type tables and process-specific readers being the intended path. Generic workflow abstractions are avoided until repetition across types proves a real shared shape.

## Filesystem Is Working State Only

The sandbox filesystem is always a disposable working copy and never canonical truth. Every working set is reconstructible from Convex artifact versions and GitHub source attachments through hydration.

| | |
|-|-|
| **Rationale** | The platform must survive sandbox loss, environment rebuilds, and provider changes without losing artifact or code truth; making the filesystem canonical would tie process durability to sandbox survival |
| **Consequence** | Hydration and checkpointing are core platform responsibilities, and unpublished local changes can be lost if a sandbox is discarded before its outputs reach Convex or GitHub |
| **Inherited By** | [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md), [Artifacts and Versions](../current-technical-design/artifacts-and-versions.md), [Source Management Domain](../current-technical-design/source-management-domain.md) |

A subsystem that handles environment work should treat the filesystem as scratch and route durable outputs through artifact-version writes or writable [Source Attachment](../conventions/glossary.md) checkpoints. Recovery paths can rely on canonical stores being authoritative on read, and the working-set fingerprint is the expected signal for stale detection across rehydrate and rebuild. Design pages should avoid surfacing filesystem state as a source of process truth in the UI.

## Artifact Identity vs Version Provenance

`artifacts` rows carry only project-scoped identity — `projectId`, display name, and creation time. `artifactVersions` carry content storage id, version label, byte size, timestamps, and the producing-process reference. Process ownership lives on the version, not on the artifact.

| | |
|-|-|
| **Rationale** | Review and package eligibility need project-scoped artifact identity that several processes can revise over time; a single primary-process owner on the artifact would prevent later processes from cleanly producing new versions of the same asset |
| **Consequence** | Producing-process provenance flows through `artifactVersions.createdByProcessId` (exposed in review contracts as `producedByProcessId`), and project artifact summaries derive their current label and updated time from the latest version row |
| **Inherited By** | [Artifacts and Versions](../current-technical-design/artifacts-and-versions.md), [Review, Package, and Export](../current-technical-design/review-package-and-export.md), [Process Domain](../current-technical-design/process-domain.md) |

A downstream designer can rely on the artifact row never holding `processId`, `attachmentScope`, or `currentVersionLabel`. Process current refs and pinned package context carry the working relationship; provenance is for display and history, not eligibility. Checkpoint paths should append a new version with the producing process recorded, rather than updating the artifact row in place or transferring ownership to the latest writer.

## Review Eligibility From Process Refs and Pinned Context

Review and package eligibility are computed from current process artifact refs and the [Process Package Context](../conventions/glossary.md) for the publishing process — never from artifact-row ownership or producing-process shortcuts. Mixed-producer packages are allowed when every member is same-project and in-context.

| | |
|-|-|
| **Rationale** | A process must be able to review and combine project artifacts that other processes created or revised, and package members must compose across planning, specification, and implementation work without floating to later revisions automatically |
| **Consequence** | `ReviewContextService` resolves eligibility from current refs, package context members, and published snapshots; package publication validates same-project plus in-context membership and rejects out-of-context project versions with `PACKAGE_MEMBER_NOT_ALLOWED` |
| **Inherited By** | [Review, Package, and Export](../current-technical-design/review-package-and-export.md), [Artifacts and Versions](../current-technical-design/artifacts-and-versions.md), [Server Control Plane](../current-technical-design/server-control-plane.md) |

Designs that touch review or packaging should treat current refs and pinned context members as the eligibility input, with `producedByProcessId` reserved for display fallback. Package snapshots and members are immutable after publication and can carry versions from multiple processes within a project. Zero-version artifacts are excluded from default target lists but remain valid as direct-target empty states reached through a known artifact identity.

## Canonical Archive at Low-Level Grain

`archiveEntries` records only finalized history at seven canonical entry kinds: `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event`. Streaming deltas, partial objects, and model-generated summaries are not archived. Turns and structural derived views are projections over the archive, not canonical truth.

| | |
|-|-|
| **Rationale** | Long-horizon context management, chunking, retrieval, and any later summarization strategy need full-fidelity finalized material; storing only grouped or compressed history would make later view generation lossy and brittle |
| **Consequence** | The append path is finalized-only and idempotent on `processId + finalizationKey`; sequence assignment happens once per first append; turns and derived views are cached but rebuildable, and degraded enrichment degrades individual entries rather than failing whole reads |
| **Inherited By** | [Archive and Derived Views](../current-technical-design/archive-and-derived-views.md), [Process Domain](../current-technical-design/process-domain.md), [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md) |

A downstream designer should route accepted user responses, completed model and runtime objects, finalized script and tool output, and durable process events through `ArchiveFinalizationService` with an explicit [Finalization Key](../conventions/glossary.md). The legacy `processHistoryItems` table remains the work-surface presentation read model and should not be confused with canonical archive truth. Derived views can be deleted and rebuilt from turns without affecting archive entries, and structural views like `chunk_candidate` are expected to remain non-summarizing.

## Section-Envelope Graceful Degradation

Composite endpoints — process bootstrap, review workspace bootstrap, project shell — return `200` with per-section status envelopes when one section is degraded. Request-level failures are reserved for actual request-level problems such as auth, project access, or invalid parameters.

| | |
|-|-|
| **Rationale** | Composite endpoints serving the project shell, process work surface, and review workspace shouldn't fail end-to-end when one section is degraded; the user needs the surrounding context to remain readable while the affected section explains itself |
| **Consequence** | Sections carry their own status (`section.status: "error"`, `target.status: "empty"`, `target.status: "unavailable"`, and similar) with bounded reasons; healthy sections still render, and live degradation never collapses the whole surface |
| **Inherited By** | [Server Control Plane](../current-technical-design/server-control-plane.md), [Client Surfaces](../current-technical-design/client-surfaces.md), [Shared Contracts](../current-technical-design/shared-contracts.md) |

A subsystem that returns composite payloads should classify failures locally — missing related context, unavailable enrichment, stale selection — and surface them through section-level status envelopes. Target-specific follow-up endpoints can return precise request-level errors such as `REVIEW_TARGET_NOT_FOUND`, `ARTIFACT_VERSION_NOT_FOUND`, or `PACKAGE_MEMBER_UNAVAILABLE` while bootstrap stays bounded. Client designs should render degraded states with readable reasons rather than collapsing the whole route.

## One-Shot Script Execution at the Sandbox Boundary

Every interaction with the sandbox is a one-shot TypeScript module execution. The control plane sends one script payload, the in-environment executor runs it, and one structured [ExecutionResult](../conventions/glossary.md) returns. There is no persistent shell, no streaming script protocol, and no daemonized executor in the sandbox.

| | |
|-|-|
| **Rationale** | The platform stays in control of every transition between sandbox and durable state; a persistent or streaming executor would push canonical-write decisions into the sandbox and complicate recovery across providers |
| **Consequence** | Providers expose lifecycle and one-shot execution only; the result carries process history items, output writes, side-work writes, artifact and code checkpoint candidates, source usage, and archive entries that the server interprets into durable state |
| **Inherited By** | [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md), [Server Control Plane](../current-technical-design/server-control-plane.md), [Archive and Derived Views](../current-technical-design/archive-and-derived-views.md) |

A subsystem that adds a new provider, tool path, or runtime payload should keep the boundary at the result object and let the server decide what becomes archive truth, what becomes an artifact version, and what becomes a code checkpoint. Sandboxes should not hold GitHub or Convex credentials and should not write canonical state directly; passing an explicit minimal environment-variable allowlist into script execution remains an active hardening item — see [Known Hardening](./known-hardening-and-deferrals.md). A daemonized executor remains a future optimization and should not be assumed by the provider abstraction.

## Browsers Consume Typed Upserts, Never Raw Provider Deltas

Live updates to the browser are entity-scoped typed [Snapshot](../conventions/glossary.md) and [Upsert](../conventions/glossary.md) messages over WebSocket, normalized by Fastify before send. Snapshots are sent immediately after a subscription opens. Raw model-provider deltas and partial JSON never cross the browser boundary.

| | |
|-|-|
| **Rationale** | The browser-facing live model needs current-object semantics so the UI can render coherently after reload, reconnect, or section degradation; reconstructing state from raw provider streams would couple the client to provider event shapes and complicate recovery |
| **Consequence** | The control plane normalizes provider and runtime events into typed `snapshot`, `upsert`, `complete`, and `error` messages reconciled by `subscriptionId` and `sequenceNumber`; entity types include `process`, `history`, `current_request`, `materials`, `side_work`, and `environment` |
| **Inherited By** | [Client Surfaces](../current-technical-design/client-surfaces.md), [Server Control Plane](../current-technical-design/server-control-plane.md), [Shared Contracts](../current-technical-design/shared-contracts.md), [Process Domain](../current-technical-design/process-domain.md) |

A subsystem that publishes live state should send a snapshot first, then upserts keyed by entity identity, with finalized history items merged by `historyItemId` to prevent duplication. Client designs can rely on bootstrap-first reconnect and on section-level live failures degrading only the affected section. Action responses that change control truth — start, resume, respond, environment transitions — should republish the process summary alongside the changed entity so the work surface stays coherent in-session.

## Related

- [Architecture Overview](./overview.md)
- [Top-Tier Domains](./top-tier-domains.md)
- [Key Runtime Flows](./key-runtime-flows.md)
- [Known Hardening and Deferrals](./known-hardening-and-deferrals.md)
- [Conventions: Glossary](../conventions/glossary.md)
