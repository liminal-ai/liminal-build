# Story 3: Hydration and Freshness Management

### Summary
<!-- Jira: Summary field -->
Show canonical source hydration/freshness state and let users refresh recoverable stale or not-yet-hydrated source attachments in place.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to know whether attached code sources are current before relying on them.
- **Context:** The user opens a project shell or process work surface with attached repositories and needs to see whether each source is `not_hydrated`, `hydrated`, `stale`, or `unavailable`.
- **Mental Model:** "A source can be attached but not ready. If it is stale or not hydrated, I can request recovery. If it is unavailable, the system should not pretend recovery is currently possible."
- **Key Constraint:** Pending refresh is operation metadata, not a fifth hydration state.

**Objective**

Expose four-state source freshness and implement the refresh path for recoverable sources.

**Scope**

In:

- Four hydration states in project and process source surfaces
- `lastHydratedAt` and `freshnessReason` visibility
- Refresh/rehydration action for `stale` and `not_hydrated`
- No false recovery action for `unavailable`
- Settled, pending, and failed refresh response handling
- In-place update of one refreshed source without hiding other sources

Out:

- Initial source attachment
- Metadata update flow
- Provenance recording
- Background polling
- Separate live source-management subscription

**Dependencies**

- Story 2 source metadata visibility
- Environment refresh/rehydration seam
- GitHub resolver for branch/ref freshness checks
- [tech-design.md](../tech-design.md) Flow 3
- [test-plan.md](../test-plan.md) Chunk 3 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** Each source attachment shows whether it is not hydrated, hydrated, stale, or unavailable.

- **TC-3.1a: Hydration and freshness state visible**
  - Given: One or more source attachments exist
  - When: The current shell or process surface renders them
  - Then: Each source attachment shows its current hydration or freshness state

**AC-3.2:** If a source attachment is `stale` or `not_hydrated`, the platform shows a rehydration or refresh path. `Unavailable` attachments do not falsely promise recovery.

- **TC-3.2a: Rehydration path shown for stale source**
  - Given: A source attachment is stale
  - When: The source attachment appears in the current surface
  - Then: The platform shows that rehydration or refresh is available
- **TC-3.2b: Recovery not falsely offered when unavailable**
  - Given: A source attachment is unavailable and not currently recoverable
  - When: The source attachment appears in the current surface
  - Then: The platform does not falsely present a recovery path that cannot currently succeed
- **TC-3.2c: Recovery path shown for not-yet-hydrated source**
  - Given: A source attachment is not yet hydrated
  - When: The source attachment appears in the current surface
  - Then: The platform shows that hydration or refresh is available

**AC-3.3:** Rehydrating or refreshing one source attachment updates that source state without erasing the rest of the source-management surface.

- **TC-3.3a: Source refresh updates in place**
  - Given: User requests rehydration or refresh for one stale or not-yet-hydrated source attachment
  - When: The request succeeds
  - Then: That source attachment updates in place without hiding the rest of the source list
- **TC-3.3b: Refresh progress is visible while the request is in flight**
  - Given: User requested refresh for one source attachment
  - When: The request is still in progress
  - Then: The current surface shows that refresh is in progress for that source attachment

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story is the operational freshness layer for attached sources. It does not
create source identity or provenance; it decides whether an attached source is
usable, stale, recoverable, or unavailable, and it surfaces the refresh path
for recoverable states. Fastify owns the refresh policy and branch-resolution
checks, while Convex stores the durable freshness snapshot fields and refresh
operation metadata.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Refresh source | `POST` | `/api/projects/:projectId/source-attachments/:sourceAttachmentId/refresh` | `refreshSource` |

#### Refresh Response

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceAttachment` | Source Attachment Summary | no | Present when refresh settles in the request |
| `refreshStatus` | enum | yes | `settled`, `pending`, or `failed` |
| `refreshRequestedAt` | string | no | Time a pending refresh was accepted |

#### Freshness Policy

- `not_hydrated`: durable attachment exists but no successful hydration has been recorded.
- `hydrated`: current working copy matches the durable source definition.
- `stale`: durable attachment exists but the working copy no longer matches or is recoverably missing.
- `unavailable`: canonical source or access path cannot be resolved safely.
- Recoverable missing working copy is represented as `stale` with `freshnessReason`, not as a fifth enum value.
- Branch refs can become `stale` when remote resolution differs from `lastHydratedResolvedRef`.
- Tag or commit refs usually remain `hydrated`; if they can no longer be resolved, they become `unavailable`.
- Freshness is evaluated on surface reads and explicit refresh requests. Epic 6 does not add background polling.

#### Service Responsibilities

- Accept refresh only for recoverable attachments.
- Return a request-level `SOURCE_ATTACHMENT_REFRESH_NOT_AVAILABLE` error when refresh cannot be accepted.
- Return `refreshStatus: settled` when freshness check or rehydration completes in the request.
- Return `refreshStatus: pending` and persist refresh progress metadata when longer work is accepted.
- Return `refreshStatus: failed` when accepted refresh work resolves into a visible failed result for that attachment.

#### Client Responsibilities

- Render the four canonical hydration states as readable text.
- Show refresh/hydration controls for `stale` and `not_hydrated`.
- Avoid showing a false recovery control for `unavailable`.
- Render pending refresh progress for the single source attachment without hiding the rest of the list.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Refresh route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Refresh orchestration and branch checks | `apps/platform/server/services/sources/source-refresh.service.ts`, `apps/platform/server/services/sources/github-repository-resolver.ts` |
| Durable freshness snapshot fields | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts`, `convex/schema.ts` |
| Refresh UI state | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:230), lines 230-287
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:574), lines 574-616
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:50), lines 50-55

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-3.1a | `tests/service/client/source-management-ui.test.ts` | renders all hydration and freshness states |
| TC-3.2a | `tests/service/client/source-management-ui.test.ts` | shows refresh action for stale source |
| TC-3.2b | `tests/service/client/source-management-ui.test.ts` | does not offer recovery for unavailable source |
| TC-3.2c | `tests/service/client/source-management-ui.test.ts` | shows hydration action for not hydrated source |
| TC-3.3a | `tests/service/server/source-management-api.test.ts` | refresh updates one source in place |
| TC-3.3b | `tests/service/client/source-management-ui.test.ts` | shows refresh progress while pending |

#### Non-TC Decided Tests

- `tests/service/server/source-management-service.test.ts`: branch-head movement marks a hydrated source stale using durable snapshot fields
- `tests/service/server/source-management-api.test.ts`: request-level refresh errors differ from `refreshStatus: failed`
- `tests/service/client/source-management-ui.test.ts`: pending refresh does not render as a fifth hydration state

#### Technical Notes

- Branch freshness compares current remote resolution with `lastHydratedResolvedRef`.
- Keep pending refresh as operation metadata, not a hydration-state enum value.

#### Anti-Shim Requirements

- Prove stale/unavailable state through persisted summary or route behavior, not by toggling a local enum in isolation.

#### Verification

- Targeted: `pnpm run test:service`
- Targeted: `pnpm run test:client`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Project and process source surfaces show all four canonical hydration states
- Stale and not-yet-hydrated sources expose a refresh or hydration path
- Unavailable sources do not show a recovery action that cannot currently succeed
- Refresh responses update one source in place or show pending progress
- Pending refresh does not appear as a fifth hydration state
- Planned tests for TC-3.1a through TC-3.3b are implemented in the files mapped by the test plan
