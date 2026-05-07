# Epic 6 Build Summary: Source Attachments and Canonical Source Management

## Purpose of This Summary

This report captures the intended and observed build shape for Epic 6, "Source Attachments and Canonical Source Management," as part of the architecture standup review after the first seven Liminal Build platform epics.

Epic 6 sits after the process shell, work surface, controlled execution environment, artifact review/package surface, and artifact provenance alignment work. Its job was to make source code repositories first-class, durable inputs to project and process work without pretending that Liminal Build owns source truth. The spec repeatedly positions GitHub as the canonical source of code, with Liminal Build responsible for attachment metadata, process scoping, environment hydration coordination, freshness signals, and provenance.

This summary is based on the Epic 6 spec pack and implementation log:

- `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/epic.md`
- `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md`
- `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md`
- `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/team-impl-log.md`
- `docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/impl-run.config.json`

A root-level file scan found no separate Epic 6 `tech-design-server.md`, `tech-design-client.md`, decision memo, or remediation document. The relevant server/client detail is consolidated in `tech-design.md` and the implementation log.

## Upstream Intent Relevant to Epic 6

Across the upstream platform direction and Epics 1-5, Liminal Build is becoming a process-oriented software planning and build platform. The first seven epics are intentionally platform-heavy rather than product-complete. They create the technical skeleton that later functional workflows, starting with epic creation, can use.

Epic 6 maps most directly to the upstream need for source-aware process work:

- Projects and processes already exist as durable organizing containers.
- The process work surface already has a materials/current context area.
- Controlled execution already needs hydrated working copies to run tasks in an environment.
- Artifact review and package surfaces already depend on knowing what work was produced and why.
- Artifact provenance alignment already established that outputs need durable identity, version, and review provenance.

Epic 6 extends that provenance story to source inputs. It does not try to implement a full GitHub workflow manager, generic integration catalog, or archival source exploration system. Instead, it gives the platform a reliable way to say: this process used this repository/ref as source material, this writable source received code updates, this working copy may be stale, and this historical provenance remains meaningful even if the current attachment is detached or access later degrades.

## Epic 6 Goals and Scope

Epic 6's core goal was to make GitHub repository attachments manageable, scope-aware, and provenance-bearing across projects and processes.

In scope:

- Attach GitHub repositories at project or process scope.
- Store canonical repository identity in addition to operational clone URLs.
- View source attachment identity, scope, purpose, access mode, target ref, hydration state, freshness, and provenance-related metadata.
- Update mutable source metadata such as purpose, access mode, and target ref.
- Refresh or rehydrate stale/not-hydrated sources when an execution target is available.
- Soft-detach source attachments without erasing historical provenance.
- Resolve process current sources with project/process scope and shadowing rules.
- Record durable source provenance for source-informed work and code-update outputs.
- Support degraded source visibility when attachments are detached, inaccessible, or no longer enrichable.
- Integrate with the existing project shell, process materials surface, and Epic 3 environment hydration/checkpoint behavior.

Out of scope:

- MCP and other external non-repository source types.
- Generic integration/source catalog behavior.
- Full GitHub branch, PR, merge, or permission management workflows.
- Complete environment execution/checkpoint redesign, which remained Epic 3 territory.
- Archive, turn, chunk, and derived source views, which are deferred to Epic 7.
- Review/package artifact alignment changes already owned by Epics 4 and 5.

The epic is therefore a repository-source management layer, not a broad source ingestion platform.

## What Epic 6 Was Supposed to Put in Place

Epic 6 was supposed to turn a pre-existing skeleton into a usable source attachment system.

Before this epic, the platform already had pieces of the model:

- A durable `sourceAttachments` table existed.
- Attachments belonged to a project.
- Attachments could optionally be scoped to a process through nullable `processId`.
- Fields such as `displayName`, `purpose`, `accessMode`, `repositoryUrl`, `targetRef`, `hydrationState`, and `updatedAt` already existed.
- Project shell source summaries and process materials `materials.currentSources` already existed.
- Epic 3 environment hydration/checkpointing already referenced attached sources and repository URLs.

Epic 6 was intended to add the missing management and alignment layer:

- Attach/update/refresh/detach routes.
- Richer freshness and hydration details.
- Durable source provenance.
- Conflict and duplicate handling.
- Soft detach semantics.
- Project/process current-source behavior.
- Canonical GitHub identity through `repositoryFullName`.
- Operational clone/write identity through `repositoryUrl`.
- Ref/hydration fields such as `lastHydratedAt`, `lastHydratedResolvedRef`, `lastObservedRemoteResolvedRef`, and `freshnessReason`.

The important architectural move is that Liminal Build does not become the canonical owner of source code. It owns metadata and process memory about source use, while GitHub remains the truth for repository contents.

## Key Server Designs

The server design centers on source management services, Convex persistence, Fastify API routes, and readers that project source state into project/process surfaces.

Planned modules included:

- `convex/sourceAttachments.ts` for attachment lifecycle persistence.
- `convex/sourceProvenance.ts` for durable provenance records.
- `convex/schema.ts` changes for attachment/provenance fields and indexes.
- `apps/platform/shared/contracts/source-management.ts` for shared API contracts.
- `apps/platform/shared/contracts/schemas.ts` and `index.ts` exports.
- Server schemas under `apps/platform/server/schemas/source-management.ts`.
- Fastify routes under `apps/platform/server/routes/source-management.ts`.
- Source services including `source-management.service.ts`, `source-identity.service.ts`, `github-repository-resolver.ts`, `source-refresh.service.ts`, and `source-provenance.service.ts`.
- `platform-store.ts` methods for source lifecycle and provenance access.
- Reader changes in `source-section.reader.ts` and `materials-section.reader.ts`.

The server was expected to enforce:

- Project ownership and process membership/authorization before source operations.
- Attachment scope from the create route rather than from an arbitrary request body flag.
- Repository identity normalization.
- Duplicate/conflict detection.
- Read/write target-ref policy.
- Soft detach rather than destructive deletion.
- Process current-source updates for process-scoped attachments.
- Source freshness transitions.
- Provenance durability even when current attachment enrichment degrades.

The design intentionally kept refresh orchestration narrow. A refresh request is valid only when the platform can resolve a concrete current process working-copy target. Project-scoped refresh from the project shell is disabled or rejected unless there is exactly one current process target.

## Client and UI Concepts

The client design was deliberately embedded in existing surfaces rather than creating a standalone source-management application.

Expected UI surfaces:

- Project source attachment section in the project shell.
- Process materials section source list.
- Process source provenance section.

Expected user-facing concepts:

- Source scope: project or process.
- Repository identity: display name, repository URL, and normalized GitHub full name.
- Purpose: `research`, `review`, `implementation`, or `other`.
- Access mode: `read_only` or `read_write`.
- Target ref: branch, tag, or commit depending on access mode.
- Hydration state: `not_hydrated`, `hydrated`, `stale`, or `unavailable`.
- Freshness reason, including target-ref changes, branch movement, missing working copy, or unavailable source.
- Refresh status, separate from hydration state.
- Detached/degraded provenance visibility.

The project shell should let users attach and manage shared project sources, but it should not imply those sources are automatically current for every process. The process work surface should show current process sources, including process-specific attachments and relevant project-scope attachments, with shadowing behavior when the same repo/ref appears at both scopes.

## Data Model and State Boundaries

Epic 6 extends the source model without collapsing distinct state boundaries.

### Source Attachments

The existing `sourceAttachments` table was expected to gain fields such as:

- `repositoryFullName`
- `lastHydratedAt`
- `lastHydratedResolvedRef`
- `lastObservedRemoteResolvedRef`
- `freshnessReason`
- `refreshStatus`
- `refreshRequestedAt`
- `detachedAt`
- `detachedByUserId`

Expected indexes included:

- `by_projectId_updatedAt`
- `by_projectId_processId_repositoryFullName_targetRef`
- `by_projectId_detachedAt_updatedAt`

Attachments remain current operational records. They answer "what source is currently attached, visible, hydrated, stale, or detached?"

### Source Provenance

Epic 6 adds durable `sourceProvenance` records with fields including:

- `projectId`
- `processId`
- `sourceAttachmentId`
- `relationshipKind`
- `repositoryFullName`
- `repositoryUrl`
- `targetRef`
- `eventId`
- `entryStatus`
- `degradationReason`
- `recordedAt`

Expected indexes included:

- `by_processId_recordedAt`
- `by_sourceAttachmentId_recordedAt`

Provenance is historical memory. It answers "what source did this process use or update?" even if the attachment later disappears from active lists, becomes detached, or loses current enrichment.

### State Boundary

The spec is careful to keep four things separate:

- GitHub repository state: canonical code truth.
- Liminal attachment state: durable metadata about a source relationship.
- Environment working-copy state: hydrated runtime material managed through Epic 3 execution environments.
- Provenance state: immutable process history about source use and code updates.

That separation matters for later software-factory work. It allows a process to know what source informed it without assuming the current sandbox still exists or the repository is still accessible.

## Repository and Source Attachment Lifecycle

The intended lifecycle is:

1. Attach a GitHub repository at project or process scope.
2. Normalize and persist canonical identity.
3. Resolve or validate target ref based on access mode.
4. Show the attachment in project/process surfaces.
5. Hydrate working copies through the existing environment model when execution needs them.
6. Mark sources as hydrated, stale, unavailable, or not hydrated based on observed environment/source state.
7. Refresh when a concrete process execution target is available.
8. Record provenance when source material informs work or receives durable code updates.
9. Soft-detach attachments when no longer active.
10. Preserve historical provenance after detach or access loss.

Detach is explicitly not destructive. Active listings should filter detached rows, but provenance remains durable. Already-hydrated running working copies are not rewritten mid-run because a source was detached. Later checkpoint behavior against a detached source follows the existing failure/degraded path unless the source is reattached.

## Project vs Process Scope

Scope is one of the central architectural concerns in Epic 6.

The create route determines scope:

- Project-scope attach: `POST /api/projects/{projectId}/source-attachments`
- Process-scope attach: `POST /api/projects/{projectId}/processes/{processId}/source-attachments`

Lifecycle actions operate by attachment ID independent of scope:

- Update: `PATCH /api/projects/{projectId}/source-attachments/{sourceAttachmentId}`
- Refresh: `POST /api/projects/{projectId}/source-attachments/{sourceAttachmentId}/refresh`
- Detach: `DELETE /api/projects/{projectId}/source-attachments/{sourceAttachmentId}`

Process source provenance is queried through:

- `GET /api/projects/{projectId}/processes/{processId}/source-provenance`

The duplicate key is active `projectId + processId + repositoryFullName + targetRef`, with missing target refs treated consistently. `purpose` and `accessMode` are mutable metadata and are not part of uniqueness.

The same repository/ref may exist once at project scope and once at process scope. For a given process, a process-scoped attachment shadows the project-scoped attachment for the current-source view. Process-scoped attachments update the current process source refs immediately. Project-scoped attachments create shared rows, but do not automatically become current for every process.

The active source resolution algorithm was intended to:

1. Exclude detached rows.
2. Start from `currentSourceAttachmentIds`.
3. Partition project-scoped and process-scoped rows for the process.
4. Compute a shadow key from `repositoryFullName` and `targetRef`.
5. Include a process-scoped sibling when it shadows an active project row.
6. Prefer the process-scoped source for that process.
7. Sort by `updatedAt` descending.
8. Preserve degraded metadata row by row.

This prevents project sources from becoming accidental global process state while still letting processes inherit or override shared sources.

## Purpose, Access, Target Ref, Freshness, Hydration, and Provenance

Epic 6 defines several important source attributes and keeps their meanings distinct.

Purpose describes why the source is present:

- `research`
- `review`
- `implementation`
- `other`

Access mode describes expected write behavior:

- `read_only` sources can be used as context but should not receive durable code updates.
- `read_write` sources are valid update targets and must resolve to branch-like refs.

Target ref describes what branch/tag/commit the source is attached to. The spec expects:

- `read_write` attachments require branch-like target refs.
- If a `read_write` target ref is omitted, the system resolves and persists the default branch.
- `read_only` attachments may use branch, tag, or commit refs.
- Changing target ref on a hydrated source marks it stale with `freshnessReason: target_ref_changed`.

Hydration state has exactly four values:

- `not_hydrated`
- `hydrated`
- `stale`
- `unavailable`

Pending refresh is not a fifth hydration state. It is represented through operation metadata such as `refreshStatus` and `refreshRequestedAt`.

Freshness should express why the current attachment may no longer match a usable working copy:

- Target ref changed.
- Remote branch head moved.
- Working copy missing.
- Source unavailable.
- Refresh failed.

For branch refs, freshness compares the remote resolved ref to `lastHydratedResolvedRef`. If the observed remote resolved ref differs, the source becomes stale. Tag and commit refs normally remain hydrated unless unavailable.

Provenance has two relationship kinds:

- `informed_work`
- `received_code_update`

Refresh itself does not create source provenance. Provenance is created when process work uses an attached source or when durable code update output lands in a writable attached source. Read-only sources should not be shown as receiving durable code updates.

## Canonical Source Truth With GitHub

The most important model decision is that GitHub remains canonical source truth.

Epic 6 separates:

- `repositoryUrl`: operational clone/write URL.
- `repositoryFullName`: normalized `owner/name` identity.

`repositoryFullName` is the canonical identity used for uniqueness, conflict detection, shadowing, provenance, and durable historical clarity. `repositoryUrl` remains necessary for operational hydration and write paths.

This split prevents the system from treating different URL forms for the same repository as different sources. It also allows provenance to remain understandable even if operational URLs change, current attachment enrichment is unavailable, or a source has been detached.

The spec intentionally defers full GitHub permission, branch, pull request, and merge workflow management. Epic 6 only asserts enough GitHub identity and ref policy to support reliable attachment, hydration, freshness, and provenance behavior.

## Environment Hydration and Checkpoint Relationship to Epic 3

Epic 6 builds on Epic 3 rather than replacing it.

Epic 3 established environment/provider abstractions, controlled execution, hydration, and checkpointing concepts. Epic 6 supplies the source metadata and lifecycle semantics those environment flows need:

- Which repository/ref should be hydrated.
- Whether a source is read-only or writable.
- Whether the source is stale, unavailable, or not hydrated.
- Whether a project-scoped source can be refreshed against a concrete process environment.
- Whether a source that received a code update should produce durable provenance.
- How missing working copies should be reflected back as stale source state.

The design explicitly avoids rewriting active working copies mid-run when attachments change. That is a sensible boundary for controlled execution: source attachment state changes should affect future hydration/checkpoint decisions, not silently mutate an in-flight execution environment.

The implementation log later shows that this boundary was one of the hard parts of the epic. Fresh verification found issues around production execution provenance reachability, detached-source working-set drift, missing working-copy stale transitions, and refresh target ambiguity. Those issues reinforce that Epic 6's source model is tightly coupled to Epic 3's execution model and should be reviewed together in the implemented codebase.

## Routes, API, and Workspace Concepts

The API design is REST-shaped and workspace-contextual.

Expected source-management routes:

- `POST /api/projects/{projectId}/source-attachments`
- `POST /api/projects/{projectId}/processes/{processId}/source-attachments`
- `PATCH /api/projects/{projectId}/source-attachments/{sourceAttachmentId}`
- `POST /api/projects/{projectId}/source-attachments/{sourceAttachmentId}/refresh`
- `DELETE /api/projects/{projectId}/source-attachments/{sourceAttachmentId}`
- `GET /api/projects/{projectId}/processes/{processId}/source-provenance`

Expected request and response contracts include:

- Provider, currently GitHub.
- Repository URL and optional full name.
- Display name.
- Purpose.
- Access mode.
- Target ref.
- Attachment scope.
- Process display metadata.
- Hydration/freshness fields.
- Refresh status.
- Detach metadata.
- Provenance entries with degraded/current-enrichment information.

Expected error codes include:

- `SOURCE_ATTACHMENT_NOT_FOUND`
- `SOURCE_ATTACHMENT_CONFLICT`
- `SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE`
- `INVALID_SOURCE_ATTACHMENT`
- `SOURCE_ATTACHMENT_UNAVAILABLE`
- Existing auth/project/process codes such as `PROCESS_FORBIDDEN`

Workspace behavior is intentionally split:

- Project shell manages shared source attachments.
- Process work surface shows current sources and provenance relevant to that process.
- Process-scoped sources are immediately relevant to the current process.
- Project-scoped sources are shared candidates, not automatically current for every process.

## Test Strategy

The test plan called for 47 automated tests: 35 acceptance-condition tests plus 12 additional non-AC tests.

Expected layers:

- Convex persistence tests for `sourceAttachments` and `sourceProvenance`.
- Fastify/service API tests for source-management routes and process work surface API integration.
- Client tests for project source sections, process materials, and source provenance UI.
- Environment/provider tests for source hydration, refresh, and execution integration.

The plan expected mocks for GitHub repository resolution and environment providers. Service tests should not require live GitHub access.

Important test themes included:

- Schema acceptance of Epic 6 source fields.
- Deriving `repositoryFullName` from common GitHub URL forms.
- Rejecting non-GitHub URLs.
- Rejecting repository URL/full-name mismatches.
- Rejecting read/write tag or commit refs.
- Resolving missing read/write target refs to a default branch.
- Duplicate/conflict behavior.
- Project/process shadowing.
- Detached rows excluded from active lists but retained durably.
- Branch head movement marking a source stale.
- Refresh request failures versus failed refresh results.
- Degraded/redacted provenance behavior.
- Pending refresh represented outside hydration state.

The manual checklist correctly referenced `pnpm run convex:dev`, matching the repo's local backend startup guidance.

## Implicit Decisions

Epic 6 contains several architectural decisions that are not necessarily packaged as a standalone decision memo:

- GitHub is canonical source truth; Liminal Build owns attachment metadata and process provenance.
- Repository identity must be normalized to `repositoryFullName`.
- Operational URL and canonical identity must both be stored.
- Source attachments are soft-detached, not deleted.
- Provenance copies source identity at record time rather than depending on live attachment lookup.
- Refresh is an operation status, not a hydration state.
- Project-scoped refresh is only valid when a single concrete process execution target exists.
- Read/write sources require branch-like refs.
- Project-scope sources do not automatically become current in every process.
- Process-scope attachments can shadow project-scope attachments for the same repo/ref.
- Current source state, working-copy state, and provenance state must remain separate.

These decisions are central to the platform's later ability to build against source repositories without becoming a brittle mirror of GitHub or a hidden global process state machine.

## Implementation Log Findings

The implementation log reports all seven Epic 6 stories accepted and committed, but the overall epic was administratively closed before formal epic verification converged.

The run configuration used a team implementation workflow with Codex-based implementation and verification roles. Story gates primarily used `corepack pnpm run green-verify`, while epic-level gates used `corepack pnpm run verify-all`.

Story-level receipts:

- Story 0, foundation: accepted and committed after `verify-all` passed. Test baseline moved from 557 to 561. Commit: `95c4ae0`.
- Story 1, attach repositories: initial verifier findings were fixed, `verify-all` passed, and baseline moved from 595 to 598. Commits: `7f305f3`, `c7df4ce`.
- Story 2, metadata: verifier findings were fixed, `verify-all` passed, and local baseline moved from 18 to 21 for the relevant slice. Commit: `8f388f4`.
- Story 3, hydration/freshness: verification found a blocker around project-scope refresh target ambiguity. The implementation lead ruled that project-shell refresh should be hidden/disabled unless exactly one current process target exists for a project-scoped source. The gate passed after fixes. Commits: `fc67296`, `2349fb2`.
- Story 4, provenance: accepted through outer verification after implementation did not run `verify-all` internally. Outer `green-verify` and `verify-all` passed. Commits: `0078b6b`, `8337b38`.
- Story 5, detach: accepted through the same outer acceptance pattern, with outer gates passing. Commits: `87727e5`, `18921ef`.
- Story 6, reopen/degraded behavior: final verifier passed, outer gates passed. Commit: `48c4d4e`.

The log then records cleanup and epic verification turbulence:

- Cleanup review found no accepted-risk or deferred items and produced an empty cleanup batch.
- The first epic verification batch blocked; one verifier completed with revise, while the other failed due to provider unavailability.
- A rerun completed both Codex lanes but still found blocking issues requiring implementation follow-up.
- A later rerun still blocked and recorded several significant blockers: provenance recording semantics, production execution provenance reachability, detached-source working-set drift, missing working-copy stale transitions, shadow-sibling resolution, gate failure from nested Biome config, and `NullPlatformStore` fallback behavior.
- A follow-up fix worker addressed a broad delta touching source refresh/provenance services, active process source resolution, source readers, Convex source attachment logic, execution provider adapters, process environment state, platform store behavior, and startup tests.
- A persistent synthesis verifier reported that recorded epic blockers appeared fixed in the current workspace and that focused service/API/Convex checks passed.

However, the final closeout is explicit: the epic was closed administratively by user directive on 2026-05-04. Formal epic verification and synthesis were stopped before convergence, and the final gate was not run after the last epic-fix implementation pass.

That distinction matters for this architecture review. The implementation appears to have received substantial story-level verification and targeted post-fix review, but Epic 6 should not be treated as having a clean, fully converged epic-complete receipt.

## Completed Work Indicated by the Log

The implementation trail indicates that Epic 6 likely delivered the intended major surfaces:

- Source attachment schema and contract extensions.
- GitHub identity normalization and validation.
- Project/process attach behavior.
- Metadata update behavior.
- Hydration/freshness state behavior.
- Refresh target ambiguity handling.
- Source provenance recording and retrieval.
- Soft detach behavior.
- Reopen/degraded source visibility behavior.
- Active source resolution and shadowing fixes.
- Environment/provider integration touchpoints for working-copy and checkpoint-related source state.

Because the final epic verification loop stopped before convergence, these should be considered implemented-but-needing-codebase-confirmation rather than conclusively verified by the build process.

## Deviations and Pivots

The main explicit pivot was project-scoped refresh behavior.

The original desire for refreshing source attachments had to be constrained by the reality that a project-scoped source may correspond to multiple process execution targets or none. The final ruling was:

- Hide or disable project-shell refresh unless exactly one current process target can be resolved.
- Backend should reject ambiguous project-scoped refresh with a refresh-not-available response.

This is a good example of the platform learning that source freshness is not purely project metadata; it depends on a concrete environment and working-copy target.

Other implementation-log deviations were less product-level and more integration-level:

- Provenance needed follow-up to ensure production execution paths could actually record it.
- Detached-source behavior needed fixes to avoid working-set drift.
- Missing working copies needed reliable stale transitions.
- Shadow sibling resolution needed correction.
- Fallback platform store behavior needed alignment.
- Tooling/config noise from nested Biome config affected gates.

These imply the epic's conceptual model was sound but touched more existing architecture seams than a simple CRUD source-management feature would.

## Verification Evidence

Evidence supporting implementation confidence:

- Each story reached acceptance and was committed.
- Multiple story-level gates reported `green-verify` or `verify-all` passing.
- Story-level verifier findings were fixed during implementation.
- The Story 3 ambiguity received an explicit implementation ruling and fix.
- A cleanup review found no accepted-risk/deferred items.
- Persistent synthesis review after epic-fix work reported recorded blockers appeared fixed and focused service/API/Convex checks passed.

Evidence limiting confidence:

- Epic verification did not converge.
- Final synthesis was skipped by directive.
- Final gate was not run after the last epic-fix implementation pass.
- Some important fixes happened late and touched execution provider, source refresh, provenance, reader, store, and Convex layers.
- The log itself marks the closeout as administrative rather than a fully verified epic-complete receipt.

For future review, Epic 6 should be treated as high-value but requiring implementation reality checks.

## Risks, Tradeoffs, and Open Questions

Key risks and tradeoffs:

- Source state crosses many platform boundaries: project shell, process work surface, execution environment, checkpointing, artifact provenance, and package surfaces.
- Project-scope versus process-scope behavior is subtle and likely to regress if future features treat project sources as globally current.
- Refresh depends on concrete process execution targets, so UI affordances and backend validation must remain aligned.
- Durable provenance must not rely on live attachment enrichment, or historical records will degrade too aggressively.
- Read/write source policy must stay strict enough to avoid treating commits/tags as writable targets.
- GitHub identity normalization needs to be consistent across APIs, persistence, shadowing, and provenance.
- Missing working-copy detection is easy to lose because it lives between source metadata and environment provider behavior.
- Soft detach must remove active availability without breaking historical process memory.

Open questions for later review:

- Are source provenance entries recorded from all production execution paths, not only tests or narrow service flows?
- Does the current implementation reliably mark missing working copies stale?
- Are process materials, project shell summaries, and API responses all using the same active-source resolution logic?
- Does detach leave running working copies alone while preventing future active use?
- Do package/export surfaces from Epic 4/5 consume source provenance consistently after Epic 6?
- Is GitHub permission/access degradation represented clearly enough for users without overpromising recoverability?

## Intentional Deferrals

Several non-deliveries are intentional and should not be treated as Epic 6 misses:

- MCP/external non-repository source attachment support is deferred beyond this repository-focused epic.
- Archive, turn, chunk, and derived source views are deferred to Epic 7.
- Full GitHub workflow management, including PRs, merges, branch policy, and permission repair flows, is out of scope.
- A generic source integration framework is out of scope.
- Full execution/checkpoint redesign remains owned by Epic 3 architecture.
- Artifact review/package semantics remain owned by Epics 4 and 5, with Epic 6 supplying source input provenance.

## Contribution to the Larger Platform Standup

Epic 6 is a key bridge between Liminal Build's process model and real software repositories.

Before this epic, the platform could organize projects and processes, display work surfaces, run controlled execution, and review/package artifacts. But the system still needed a durable way to understand the source repositories that inform and receive that work.

Epic 6 contributes:

- Canonical repository identity.
- Source lifecycle management.
- Project/process source scoping.
- Source freshness and hydration metadata.
- Repository-aware provenance.
- A stronger connection between process work and controlled execution.
- A foundation for later software-factory behavior, where ready spec packs and execution harnesses build stories against actual codebases.

Architecturally, this epic tightens the platform's claim that process outputs should be traceable to their inputs. It also exposes one of the standup's most important integration challenges: source management is not isolated CRUD. It is a coordination layer among identity, authorization, process scope, environment state, and artifact provenance.

## Assessment Notes for Later Review

Future reviewers comparing spec intent to implementation reality should verify the following in the codebase:

- Confirm `sourceAttachments` includes the Epic 6 fields for canonical identity, hydration/freshness, refresh status, and soft detach.
- Confirm `sourceProvenance` exists and stores immutable source identity at record time.
- Confirm detached source attachments are excluded from active listings but not physically deleted.
- Confirm `repositoryFullName` is normalized consistently from GitHub URLs and used in uniqueness, conflict detection, shadowing, and provenance.
- Confirm non-GitHub URLs and repository URL/full-name mismatches are rejected.
- Confirm `read_write` sources require branch-like refs and resolve missing refs to a default branch before persistence.
- Confirm changing target ref on a hydrated source marks it stale with the expected freshness reason.
- Confirm hydration states remain limited to `not_hydrated`, `hydrated`, `stale`, and `unavailable`.
- Confirm pending refresh is represented through refresh operation metadata, not as another hydration state.
- Confirm project-scoped refresh is hidden/disabled and backend-rejected unless exactly one current process execution target can be resolved.
- Confirm process-scoped attachments immediately affect current process source refs.
- Confirm project-scoped attachments do not automatically become current for every process.
- Confirm process-scoped attachments shadow project-scoped attachments with the same repository/ref for that process.
- Confirm active source resolution is centralized or at least consistent across project shell, process materials, APIs, and environment hydration.
- Confirm source provenance records `informed_work` and `received_code_update` only in the appropriate execution/output paths.
- Confirm read-only sources are never presented as recipients of durable code updates.
- Confirm refresh alone does not create provenance.
- Confirm missing working copies transition attachments to stale with an appropriate freshness reason.
- Confirm detached/access-lost provenance entries degrade gracefully while preserving recorded repository identity.
- Confirm `NullPlatformStore` or test/in-memory fallback behavior matches production semantics closely enough not to mask source bugs.
- Confirm the final post-fix state passes the repo's current verification suite, especially source-management, process materials, process environment, provenance, and package/export tests.
- Confirm whether any late epic-fix changes after the last logged gate are covered by current tests.

Given the implementation log's administrative closeout, reviewers should give Epic 6 extra attention. The story trail is strong, but the final epic-level verification receipt is intentionally incomplete.
