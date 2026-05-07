# Epic 5 Build Summary: Artifact Model and Review Provenance Alignment

## Purpose

This document summarizes what Epic 5, `Artifact Model and Review Provenance
Alignment`, was intended to establish in the Liminal Build platform standup and
what the team implementation log suggests actually happened during delivery.

Primary source set reviewed:

- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/epic.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/tech-design.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/tech-design-server.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/tech-design-client.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/test-plan.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/team-impl-log.md`
- `docs/spec-build/v2/epics/05--artifact-model-and-review-provenance-alignment/impl-run.config.json`

Upstream framing is inherited from the previously reviewed:

- `docs/spec-build/v2/core-platform-prd.md`
- `docs/spec-build/v2/core-platform-arch.md`
- Epic 1 through Epic 4 build-summary context

Notable file-status findings:

- No standalone `decision-memo.md` was present at the Epic 5 root.
- No extra root-level remediation/decision files were present beyond
  `team-impl-log.md` and `impl-run.config.json`.
- The directory contains generated implementation artifacts and stories; these
  were intentionally not read for this report.

This report is not a code audit. It is a spec-intent plus implementation-log
baseline for later comparison against the repo.

## Upstream Intent Relevant to Epic 5

Liminal Build's larger platform intent is to let users and agents plan, shard,
review, and eventually build software in durable process-sized chunks. By Epic
4, the platform had a project shell, process work surface, controlled
execution/checkpointing, and a review/package surface. The missing piece was a
settled artifact model underneath those surfaces.

Epic 5 exists because durable artifact behavior needed to match the actual
product mental model:

- artifacts belong to the project
- processes work with artifacts
- versions are produced by processes
- review eligibility comes from process context
- packages pin exact versions

Without this alignment, later source-management and process-module epics would
inherit a muddled world where one artifact row could still be treated as if it
belonged to one primary process. Epic 5 is the correction before Epic 6 broadens
source-management behavior.

## Why This Alignment Epic Existed After Epic 4

Epic 4 established review and package capabilities, but its delivery surfaced
and partially patched artifact-model drift. Epic 4 added `artifactVersions` and
package snapshots, yet the current repo still retained enough "single primary
process" assumptions for later work to be risky:

- project artifact summaries could still imply process attachment
- review/package code could still derive eligibility from same-process
  production or artifact-row ownership shortcuts
- package publication still blocked some valid mixed-producer package members
- `PlatformStore` still owned too much high-level review/package composition
- there was no mutable process-scoped package-building context for earlier
  pinned versions

Epic 5 therefore is not a new surface. It is an alignment layer over the
existing surfaces so the platform's durable model and user mental model match.

## Epic 5 Goals and Scope

Epic 5 was intended to make the following true:

- artifacts are project-scoped durable entities, not process-owned rows
- processes can reference existing project artifacts without taking ownership
- new artifacts created during process work automatically join project artifact
  state
- later processes can create new versions of existing artifacts
- each artifact version records the process that produced it
- project summaries and process materials derive latest-version labels and
  updated times from versions
- review eligibility depends on current process references and pinned review
  context
- zero-version artifact behavior is explicit and consistent
- package publication can include versions produced by multiple processes in
  the same project when those versions are in the publishing process's bounded
  package-building context
- package review/export remains pinned to explicit versions
- reopen and degraded states classify missing targets, missing versions, and
  missing package members accurately

Out of scope:

- Epic 6 source-attachment management
- cross-project artifact sharing
- standalone artifact library/admin UI
- full archive, turn, chunk, and derived-view behavior
- full onboarding/current-state documentation refresh
- multiple package drafts per process
- historical process-to-artifact relation browser

## What Epic 5 Was Supposed to Put in Place

The intended platform shape after Epic 5:

- `artifacts` rows answer "this artifact exists in this project"
- `artifactVersions.createdByProcessId` answers "this process produced this
  version"
- per-type process state `currentArtifactIds` answers "this process is
  currently working with these artifacts"
- `processPackageContexts` and `processPackageContextMembers` answer "this
  process has explicitly pinned these versions into current package-building
  work"
- `packageSnapshots` and `packageSnapshotMembers` answer "this exact ordered
  set of versions was durably published"

That split is the core of the epic. Every server/client change flows from
keeping those concepts separate.

## Key Server Designs

### Server Posture

Epic 5 keeps one Fastify control plane over Convex. It does not add a new
backend or route family. The key design correction is layering:

- `PlatformStore` should expose durable facts and persistence primitives.
- Review/package services should own semantic policy and context composition.
- Convex can enforce atomic persistence and same-project invariants.
- Fastify/process services own workflow intent: what to checkpoint, when, and
  why.

The server design notes that the accepted shipped shape does not include a
separate `package-context.service.ts` class/file. Instead, mainline remediation
moved review-context behavior into `ReviewContextService` and package
publication/context policy into server-side review helpers. That is explicitly
accepted as design-compatible.

### Durable State Model

Epic 5 defines five durable layers:

- `artifacts`: `projectId`, `displayName`, `createdAt`
- `artifactVersions`: `artifactId`, `versionLabel`, `contentStorageId`,
  `contentKind`, `bytes`, `createdAt`, `createdByProcessId`
- process current refs: per-type state table `currentArtifactIds`
- `processPackageContexts`: one mutable current package-building context per
  process
- `processPackageContextMembers`: ordered, explicit version pins in that current
  context
- immutable `packageSnapshots` and `packageSnapshotMembers`

`processPackageContexts` includes:

- `processId`
- `displayName`
- `packageType`
- `basePackageSnapshotId`
- `updatedAt`

`processPackageContextMembers` includes:

- `packageContextId`
- `position`
- `artifactId`
- `artifactVersionId`
- `displayName`
- `versionLabel`
- `pinnedAt`

The context model is mutable, process-scoped, and intentionally limited to one
current context per process for this epic.

### Artifact Identity and Version Provenance

The server design removes `artifacts.processId`. Artifact identity must not
carry process ownership. The current version label and update time are derived
from latest artifact version rows.

Version provenance remains on `artifactVersions.createdByProcessId`. Browser
contracts expose this as:

- `producedByProcessId`
- `producedByProcessDisplayLabel`

The display label matters because provenance is intended to be visible in the
review experience, not merely recoverable from raw IDs.

### Review Context Resolution

Review context is computed by `ReviewContextService` from:

- current artifact refs
- current package-building context members
- published package snapshots and members

Aligned rules:

- current refs create artifact review context
- pinned package context members can also make artifact identities reachable
- zero-version current refs are omitted from default target lists
- direct artifact access can be valid through current refs or pinned context
- package snapshots published from the process create package targets
- unrelated project artifacts remain unavailable

This replaces artifact-row ownership and same-process-production shortcuts.

### Package Publication Eligibility

Epic 5 removes the rule that every package member version must have
`createdByProcessId === publishingProcessId`.

New rule: a requested package member is allowed only when:

- the artifact belongs to the same project as the publishing process
- the version belongs to that artifact
- the version is either the current version of a currently referenced artifact
  for that process, or an explicit version already pinned in that process's
  current package context

Otherwise the server rejects with `PACKAGE_MEMBER_NOT_ALLOWED`.

### Reopen and Error Taxonomy

The server distinguishes bootstrap degradation from explicit endpoint failures:

- bootstrap `GET /review` favors a `200` workspace envelope with bounded
  `target.status` / `target.error` once project/process context resolves
- target-specific follow-up reads return precise request-level errors

Important codes:

- `REVIEW_TARGET_NOT_FOUND`: artifact/package not available in process review
  context
- `ARTIFACT_VERSION_NOT_FOUND`: explicit version unavailable
- `PACKAGE_MEMBER_UNAVAILABLE`: pinned member version unavailable
- `PACKAGE_MEMBER_NOT_ALLOWED`: publication member outside allowed context or
  project

The design adds exact AppError classes or discriminated result kinds so routes
do not collapse everything into generic review-target failure.

## Key Client Designs

Epic 5 does not add a new browser surface. It changes how existing surfaces
express the model.

### Project Shell

Project artifact rows stop rendering process-ownership language. The slim
artifact summary becomes:

- `artifactId`
- `displayName`
- `currentVersionLabel`
- `updatedAt`

Removed from project artifact summaries:

- `attachmentScope`
- `processId`
- `processDisplayLabel`

This is a small UI change with a large mental-model effect: the project shell
no longer teaches the user that artifacts are attached to one process.

### Process Work Surface

The process work surface keeps showing process-local current materials. It does
not infer reviewability from provenance or ownership. It trusts the server's
aligned `controls.review.enabled` decision.

### Review Workspace

The review workspace keeps its existing state split:

- `reviewWorkspace.error` for fatal request-level failure
- `reviewWorkspace.target` for bounded target-level state

Epic 5 tightens recovery:

- stale explicit version selection triggers a workspace reload with the same
  selection
- stale explicit package-member selection does the same
- the resulting workspace can render bounded unavailable target/member state
  without losing project/process context or target lists

### Version and Member Rendering

Artifact review and the version switcher surface provenance:

- selected version metadata includes producing process
- version rows include producing process display label or ID fallback
- zero-version copy says the artifact exists in process context but has no
  durable version yet
- unavailable-version copy refers to version availability, not process mismatch

Package review treats mixed-producer packages as normal. Unavailable package
members remain visible as pinned-version degradation rather than implying a
process-ownership problem.

## Data Model and State Boundaries

Epic 5 formalizes these boundaries:

- Project artifact identity is durable and project-scoped.
- Version provenance is durable and process-scoped at the version level.
- Process current refs are bounded working state, not historical membership.
- Package context is mutable and process-scoped.
- Package snapshot is immutable and published.
- Browser state mirrors review workspace and selection state, but does not
  decide eligibility.
- Store facades should not assemble review semantics from durable rows.

The important state-boundary correction is that current refs and package
contexts are distinct. Current refs answer "working with now"; package context
answers "explicitly pinned for publication work." This avoids inventing a
generic relation table while still supporting earlier pinned versions.

## Migration, Backfill, and Compatibility

The tech design chooses a direct pre-customer breaking rollout:

1. Add aligned contracts, new package-context tables, store primitives, and
   review-context helpers while the old field can still exist.
2. Flip policy so review eligibility and package publication use current refs,
   package context, and snapshots.
3. Remove `artifacts.processId` and legacy summary fields from schema,
   contracts, fixtures, and tests.

The design explicitly says this is not a widen-migrate-narrow customer data
migration. Dev/local deployments with legacy rows may be reset. A one-off local
helper can exist as developer convenience, but it is not required Epic 5 scope.

The epic also includes PRD backfills:

- the platform may require an interstitial artifact-model alignment epic between
  review/package work and source-management work
- review/package eligibility is bounded by current process reference and pinned
  package context, not the full project artifact set

## Routes, APIs, and Workspace Concepts

Epic 5 reuses existing routes:

- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/processes/:processId`
- `GET /api/projects/:projectId/processes/:processId/review`
- `GET /api/projects/:projectId/processes/:processId/review/artifacts/:artifactId`
- `GET /api/projects/:projectId/processes/:processId/review/packages/:packageId`

The route family is stable; behavior changes inside the route:

- project shell returns slimmer artifact summaries
- process work surface returns current materials based on current refs
- review bootstrap uses aligned review context
- artifact target endpoint distinguishes missing target from missing explicit
  version
- package target endpoint distinguishes missing package target from missing
  member/pinned version

No new top-level product or artifact-admin route is introduced.

## Test Strategy

The planned test strategy emphasized durable-state and server-boundary tests
because Epic 5 is a model-alignment epic rather than a surface-first feature.

Planned coverage:

- 121 tests across 19 files
- Convex/durable-state tests as primary confidence layer
- server service-mock tests for Fastify and review/package semantics
- client service-mock tests for visible copy, selection fallback, and degraded
  rendering
- integration tests for durable reopen and cross-surface coherence

The plan's key testing stance: fixtures must keep artifact identity, version
provenance, current refs, package context, and snapshots distinct. If tests
collapse those layers, the old primary-process model can quietly reappear.

Important planned coverage:

- project artifact summaries no longer accept/render process-owner fields
- later process reference does not erase earlier lineage
- later process revision appends a version and preserves artifact identity
- producing process is visible on version summaries/details
- review succeeds through current refs despite producer mismatch
- unrelated project artifacts remain unavailable
- zero-version default-list and direct-review behavior are distinct
- explicit version request against zero-version artifact returns
  `ARTIFACT_VERSION_NOT_FOUND`
- mixed-producer packages can publish/review/export within one project
- cross-project and out-of-context package members are rejected
- earlier pinned package-context versions remain eligible
- stale version/member selections reload workspace instead of collapsing it
- observability distinguishes target, version, and member failures

## Implicit Decisions

There is no standalone decision memo, but the tech design records several
decisions:

- Do not add a generic process-to-artifact relation table in Epic 5.
- Keep current refs as the bounded working-set model.
- Add a dedicated mutable package-context model for explicit version pins.
- Remove artifact-level process fields from project artifact summary.
- Keep process-local meaning on process material references.
- Compute review eligibility from process context, not artifact-row ownership.
- Treat zero-version default target list and direct review path differently.
- Allow one current mutable package-building context per process; multi-draft
  package editing is deferred.
- Use direct pre-customer schema cleanup rather than customer-safe migration.
- Keep route family stable; change semantics inside existing routes.
- Put review/package policy above durable store primitives.

## Implementation Log Findings

The implementation log says Epic 5 is complete, merged, and closed on main
after remediation. The final checkpoint is `mainline-closure-alignment`
dated 2026-05-03.

### Run Shape

Configuration:

- primary harness: `claude-code`
- story implementor: Codex `gpt-5.4` high
- quick fixer: Codex `gpt-5.4` high
- story verifier: Codex `gpt-5.4` xhigh
- self-review: 3 passes
- epic verifiers: Codex `gpt-5.4` xhigh and `claude-sonnet` high
- story gate: `corepack pnpm run green-verify`
- epic gate: `corepack pnpm run verify-all`

Unlike Epic 4, the log records gate-discovery rationale and candidates
considered.

### Story Summary

Story 0, Foundation:

- Implemented shared vocabulary, contracts, error codes, and fixtures.
- Initial verifier found blocking issues: legacy `versionId` naming and
  collapsed error taxonomy.
- Follow-ups fixed both.
- Missing `processPackageContexts.test.ts` was deferred correctly to Story 4.
- Gate passed; baseline moved from 529 to 531.

Story 1, Project Artifact Association Without Process Ownership:

- Clean verifier pass with no findings.
- Confirmed project/process read-model changes for no process ownership.
- Gate passed; baseline moved to 534.

Story 2, Versioned Checkpoint Realignment:

- Initial verifier found provenance was not visible in review UI.
- Follow-up fixed provenance visibility.
- Gate passed; baseline moved to 536.

Story 3, Process-Scoped Artifact Review Realignment:

- Initial verifier found stale version selection collapsed the workspace instead
  of using reload fallback.
- Follow-up fixed this.
- Gate passed; baseline moved to 545.

Story 4, Cross-Process Package Alignment:

- Initial verifier found package-context Convex functions were public rather
  than internal.
- Quick fix converted them to `internalQuery` / `internalMutation`.
- Deferred Story 0 package-context test coverage landed here.
- Gate passed; baseline moved to 550.

Story 5, Reopen and Degraded Provenance States:

- Initial implementor claimed zero changed files and existing coverage.
- Verifier caught missing stale package-member reload fallback.
- Follow-up fixed it.
- Gate passed; baseline moved to 551.

### Cleanup and Mainline Remediation

Cleanup status is complete. The log records:

- cleanup artifact: `artifacts/cleanup/cleanup-batch.md`
- cleanup fixed SD-1 and SD-3 in round 1
- cleanup fixed SD-2 after verifier rejection in round 2
- `verify-all` passed after cleanup with 573 tests:
  - convex: 60
  - server: 249
  - client: 237
  - packages: 5
  - integration: 22

Mainline closure notes say Epic 5 merged to main, then package/review boundary
drift was remediated by commits:

- `f33ea92`
- `849dcce`
- `b231ee6`

Those commits moved review-context behavior into `ReviewContextService` and
package publication/context policy into server-side review helpers. The shipped
shape intentionally does not include a separate `package-context.service.ts`
class/file.

### Verification Evidence

The final recorded evidence:

- story gates passed on each story
- final story baseline after stories: 551 tests
- epic gate passed after cleanup/remediation: 573 tests
- open risks: none, except one accepted checkpoint persistence boundary

The planned 121-test increase did not appear as a net test-count increase. The
log explains actual net delta was +22 before cleanup because existing tests
were restructured during vocabulary alignment. Future reviewers should look at
semantic coverage, not just net count.

### Accepted Boundary

Checkpoint persistence boundary was accepted:

- Convex may execute atomic checkpoint persistence/upsert bundles.
- Convex may enforce cross-record integrity invariants such as same-project
  artifact validation.
- Fastify/process services own workflow intent.

This is explicitly not considered a blocker for Epic 5 closure.

## Completed Work

Based on the spec and log, Epic 5 completed:

- project artifact summary slimming
- artifact ownership language removal from project shell
- artifact-row process ownership removal/alignment
- version provenance exposure in review contracts/UI
- current refs preserved as bounded process working set
- review context service for process-scoped eligibility
- zero-version review behavior clarification
- explicit version/member error taxonomy
- mutable process package context tables and write/read behavior
- package publication validation based on same-project plus context eligibility
- mixed-producer package publication/review/export support
- stale version selection reload fallback
- stale package-member selection reload fallback
- package/review boundary remediation after merge
- cleanup and final verify-all pass

## Deviations and Pivots

Notable pivots and implementation-shape adjustments:

- Design initially described `package-context.service.ts`, but shipped shape
  uses package policy helpers in the review module, accepted as equivalent.
- Some high-level review/package logic initially remained in the wrong layer
  after merge; follow-up commits remediated boundary drift.
- Story 5 initially assumed no changes were needed; verification found a real
  missing fallback.
- Test-count deltas were far below planned additions due to restructuring
  existing tests rather than adding all planned tests net-new.
- The implementation accepted a boundary where Convex owns atomic persistence
  and integrity invariants while Fastify owns intent.

## Risks, Tradeoffs, and Open Questions

Risks and tradeoffs:

- Direct pre-customer schema cleanup is fine now but would not be sufficient
  after customer data exists.
- One current package context per process is enough for this slice but may not
  support future multi-draft authoring.
- Keeping process current refs bounded avoids a generic relation table, but it
  means historical relation browsing is deferred.
- Boundary discipline matters: review/package policy must not drift back into
  `PlatformStore` or Convex facts-only layers.
- Mixed-producer package rules require careful same-project and in-context
  validation to avoid broadening publication to the full project artifact set.
- User-visible provenance depends on resolving process display labels; missing
  labels need graceful fallback.
- Test-count delta alone under-represents coverage changes.

Open question from the design:

- Should a later epic support more than one draft package context per process?
  Epic 5 intentionally does not answer this.

## Intentional Deferrals

Do not treat these as missing Epic 5 work:

- multi-draft package editing for one process
- cross-project artifact reuse
- standalone artifact library/admin UI
- historical process-to-artifact relation browser
- full source attachment management
- archive/turn/chunk/derived-view behavior
- full onboarding/current-state docs refresh
- customer-safe migration/backfill process

## How Epic 5 Contributes to the Larger Standup

Epic 5 is one of the platform standup's model-correction epics. It makes the
artifact world durable enough for later functional process epics:

- epic creation can produce and revise project artifacts without owning them
  forever
- spec packs can mix outputs from PRD, tech design, and story-sharding
  processes
- review can stay process-scoped without hiding cross-process provenance
- packages can pin exact versions rather than drifting to latest
- Epic 6 source-management work can build on a stable artifact/provenance model

In the larger architecture, Epic 5 turns a collection of workable local
decisions from Epic 4 into a coherent platform rulebook.

## Assessment Notes for Later Review

Future reviewers comparing spec intent to implementation reality should verify:

- `artifacts` rows no longer encode single-process ownership.
- Project artifact summaries no longer include or render `attachmentScope`,
  `processId`, or `processDisplayLabel`.
- Process materials still show process-local current refs and do not become a
  project-wide artifact list.
- Referencing an existing project artifact from a later process does not modify
  artifact identity or erase prior provenance.
- Checkpointing a revision of an existing artifact appends an artifact version
  rather than reassigning the artifact.
- `artifactVersions.createdByProcessId` is populated and exposed as
  `producedByProcessId` in review contracts.
- Review UI renders producing-process display labels or stable fallback IDs.
- Latest project/process artifact summaries derive label and timestamp from
  latest versions.
- `ReviewContextService` owns process-scoped review eligibility.
- `PlatformStore` does not retain high-level `listProcessReviewTargets` /
  `getProcessReviewPackage` composition semantics as primary policy.
- Review eligibility includes current refs and explicit pinned package context,
  and excludes unrelated project artifacts.
- Zero-version artifacts are omitted from default targets but direct review can
  return a bounded empty state.
- Explicit version lookup against a zero-version artifact returns
  `ARTIFACT_VERSION_NOT_FOUND`.
- Bootstrap and target-specific routes classify errors differently as designed.
- Stale explicit version selection reloads workspace and preserves orientation.
- Stale explicit package-member selection reloads workspace and preserves
  package context.
- `processPackageContexts` and `processPackageContextMembers` exist and enforce
  one canonical current context per process.
- Package context upsert is idempotent, cleans duplicates, and replaces members
  atomically.
- Reopened package contexts can keep earlier pinned versions eligible.
- Package publication rejects cross-project members and out-of-context project
  versions with `PACKAGE_MEMBER_NOT_ALLOWED`.
- Package publication allows mixed-producer members when same-project and
  in-context.
- Package review/export resolves pinned versions, not latest versions.
- One unavailable package member does not remove unrelated package members.
- Observability distinguishes target-not-found, version-not-found,
  member-unavailable, and member-not-allowed cases.
- Post-merge boundary remediation commits (`f33ea92`, `849dcce`, `b231ee6`) are
  present in the code lineage being reviewed, or their effects are otherwise
  incorporated.
- Final verification should be compared against the post-cleanup `573` test
  baseline, not only the story-level `551` baseline.
