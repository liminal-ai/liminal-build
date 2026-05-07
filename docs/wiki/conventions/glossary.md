# Glossary

Liminal Build's canonical platform vocabulary is collected here. Subsystem mechanics live on the linked subsystem pages; the entries below fix the meanings those pages assume. First significant use of any term on another page should link back here so the canonical definition stays in one place.

## Platform Surfaces and Stores

- **Fastify Control Plane** — the platform server under `apps/platform/server/`; mediates between the browser client, sandbox runtimes, and durable stores. Owns auth, orchestration, source hydration, environment lifecycle, error taxonomy, and every integration boundary. No surface bypasses it. Mechanics live in [Server Control Plane](../current-technical-design/server-control-plane.md).
- **Sandbox Runtime** — disposable working-filesystem and one-shot script execution surface attached to a process; never canonical truth and always reconstructible from canonical stores. Each individual instance is an Environment (below). Mechanics live in [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md).
- **Convex** — the durable state platform that owns every durable platform table — projects, processes, artifacts and versions, package snapshots, sources, archive entries, and derived views. Reactive queries with strong consistency power live work surfaces. The Convex app uses its `_generated/` bindings internally; the platform app reaches Convex through `ConvexPlatformStore`, which uses `ConvexHttpClient` from `convex/browser` and string-based function references built with `makeFunctionReference` from `convex/server`, with types drawn from `_generated/dataModel`.
- **GitHub** — canonical store of code state for every writable source attachment. Accessed by Fastify through Octokit for metadata reads (canonical refs, branch heads, repository identity) and code checkpoint writes; working-copy materialization is provider-mediated, not direct.

## Project and Process

- **Project** — top-level durable working container; owns processes, artifacts, package snapshots, and source attachments. Mechanics live in [Project Shell](../current-technical-design/project-shell.md).
- **Process** — durable unit of work inside a project, scoped to exactly one ProcessType, with its own state, phases, current artifact references, and optional environment.
- **ProcessType** — code-defined module that gives a Process its state schema, phase model, and toolset. Process types are crafted in code rather than dynamically authored at runtime.
- **ProductDefinition** — first-party ProcessType for upstream planning artifacts such as briefs, PRDs, technical architecture documents, and supporting research.
- **FeatureSpecification** — first-party ProcessType for producing an implementation-ready spec pack for a single feature.
- **FeatureImplementation** — first-party ProcessType for implementing a feature from an accepted spec pack.
- **Visible History** — the process work-surface presentation history backed by `processHistoryItems`, durable enough for reload but distinct from canonical Archive Entry truth. Mechanics live in [Process Domain](../current-technical-design/process-domain.md) and [Archive and Derived Views](../current-technical-design/archive-and-derived-views.md).

## Environment and Runtime

- **Environment** — disposable working filesystem attached to a process; never canonical truth and always reconstructible from canonical stores. Mechanics live in [Process Runtime and Environments](../current-technical-design/process-runtime-and-environments.md).
- **Provider** — adapter that creates and runs Environments. The implemented set is Local and Daytona; Cloudflare Sandbox is a deferred provider-validation target.
- **ExecutionResult** — structured result returned from one-shot script execution; the side-effect contract between the in-environment executor and the platform, covering process history writes, output writes, side-work writes, artifact and code checkpoint candidates, source usage, and archive entries.
- **Checkpoint** — durable persistence of environment outputs back to canonical stores: Convex artifact versions for artifact work and GitHub code for writable code sources.
- **Hydration** — process-scoped materialization of the working set (current artifact refs, current outputs, active source attachments) into the environment filesystem.
- **Working Set Fingerprint** — environment-scoped signal used for stale detection across rehydrate and rebuild paths.
- **Tool Harness** — controlled execution surface and structured-result boundary between the in-environment executor and the platform; the current shape is an initial script/result-file boundary, with richer process-specific capability manifests still future work.

## Artifacts and Packages

- **Artifact** — project-scoped durable identity row; carries no process ownership, only `projectId`, display name, and creation time. Mechanics live in [Artifacts and Versions](../current-technical-design/artifacts-and-versions.md).
- **Artifact Version** — append-only revision row; carries content storage id, version label, byte size, timestamps, and producing-process provenance.
- **Producing Process** — the process that created a particular Artifact Version, recorded on the version row for provenance only and exposed in review contracts as `producedByProcessId`.
- **Package Snapshot** — immutable durable record of one published version set produced from a process review context. Mechanics live in [Review, Package, and Export](../current-technical-design/review-package-and-export.md).
- **Package Member** — ordered entry in a Package Snapshot pinning one exact Artifact Version, allowing cross-process version sets within a single project.
- **Process Package Context** — mutable per-process building context that gathers pinned versions before publication; one current context per process, replaced atomically on upsert.

## Sources

- **Source Attachment** — durable repository relationship at project or process scope, recording purpose, access mode, target ref, hydration state, and freshness metadata. Mechanics live in [Source Management Domain](../current-technical-design/source-management-domain.md).
- **Repository Full Name** — canonical GitHub identity in `owner/name` form; the basis for uniqueness, conflict detection, shadowing, and provenance.
- **Repository URL** — operational clone or write URL distinct from canonical identity; necessary for hydration and write paths but not used as the identity key.
- **Access Mode** — `read_only` or `read_write`. `read_write` requires a branch-like target ref and is the only mode allowed to receive durable code updates.
- **Hydration State** — one of `not_hydrated`, `hydrated`, `stale`, or `unavailable`. Pending refresh is operation status carried separately, not a fifth hydration value.
- **Freshness Reason** — explanation when a source is stale, drawn from `target_ref_changed`, `branch_head_moved`, `working_copy_missing`, `repository_unavailable`, `target_ref_unavailable`, or `access_revoked`.
- **Source Provenance** — immutable record of source use; relationship kinds are `informed_work` for source material that informed work and `received_code_update` for writable sources that received durable code updates.

## Archive and Derived Views

- **Archive Entry** — canonical finalized process history at low-level grain. Entry kinds are `user_message`, `model_message`, `reasoning`, `script_emission`, `tool_call`, `tool_result`, and `process_event`. Raw streaming deltas and partial objects are not archived. Mechanics live in [Archive and Derived Views](../current-technical-design/archive-and-derived-views.md).
- **Finalization Key** — idempotency key supplied at archive append; `processId + finalizationKey` is the uniqueness boundary, with sequence assignment occurring only on first append.
- **Turn** — deterministic grouping over Archive Entries; cached for bounded reads but rebuildable from canonical archive entries and not canonical truth itself.
- **Derived Archive View** — structural projection over Turns. Current view kinds are `turn_range` and `chunk_candidate`. Derived views never carry model-generated summaries.

## Surfaces and Transports

- **Project Shell** — front-door view of one project's processes, artifacts, and source attachments. Mechanics live in [Project Shell](../current-technical-design/project-shell.md).
- **Process Work Surface** — active workspace for one process, showing current phase, materials, side-work summaries, and the controls for start, resume, and respond. Mechanics live in [Process Domain](../current-technical-design/process-domain.md).
- **Review Workspace** — process-aware reader for artifacts and packages, with eligibility derived from current process refs and pinned package context. Mechanics live in [Review, Package, and Export](../current-technical-design/review-package-and-export.md).
- **Live Update** — typed current-object message published to the browser over WebSocket; never raw provider deltas.
- **Upsert** — entity-scoped create/update message; the canonical browser-facing live form for Live Updates.
- **Snapshot** — initial state delivered immediately after a live subscription opens, so the client can render before subsequent upserts arrive.

## Related

- [Conventions Home](./README.md)
- [Top-Tier Domains](../current-technical-architecture/top-tier-domains.md)
- [Cross-Cutting Decisions](../current-technical-architecture/cross-cutting-decisions.md)
