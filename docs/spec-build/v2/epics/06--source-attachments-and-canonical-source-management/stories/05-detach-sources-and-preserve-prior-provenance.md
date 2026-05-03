# Story 5: Detach Sources and Preserve Prior Provenance

### Summary
<!-- Jira: Summary field -->
Allow users to soft-detach source attachments from current use while preserving prior provenance and leaving unrelated sources untouched.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs current source lists to stay accurate without losing history.
- **Context:** A source attachment may no longer be relevant to current project or process work, but earlier process work may already have used it.
- **Mental Model:** "Detaching removes this source from current use. It does not erase work that already relied on it."
- **Key Constraint:** Detach is soft. It excludes the attachment from current active lists but preserves source identity needed for provenance.

**Objective**

Implement detach behavior for project-scoped and process-scoped source attachments.

**Scope**

In:

- DELETE source attachment route
- Soft-detach fields such as `detachedAt` and `detachedByUserId`
- Active-list filtering for project and process source surfaces
- Preserve prior source provenance after detach
- Leave already hydrated working copies unchanged mid-run
- Preserve unrelated current source attachments

Out:

- Hard deletion of source identity
- Rewriting active environment working copies mid-run
- New checkpoint behavior beyond existing failure paths

**Dependencies**

- Story 4 source provenance
- Active source resolver from the tech design
- Existing environment hydration/checkpoint behavior
- [tech-design.md](../tech-design.md) Flow 5 and Active Source Resolution
- [test-plan.md](../test-plan.md) Chunk 5 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-5.1:** The user can detach a source attachment from current project or process use.

- **TC-5.1a: Detach project-scoped source**
  - Given: A project-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current project source attachment state
- **TC-5.1b: Detach process-scoped source**
  - Given: A process-scoped source attachment exists
  - When: User detaches it
  - Then: It no longer appears in the current process source attachment state
- **TC-5.1c: Detach during active process work does not rewrite the current hydrated copy**
  - Given: A running process is still using a previously hydrated working copy that includes an attached source
  - When: User detaches that source from current use
  - Then: The source is removed from future current attachment state without rewriting the already-hydrated working copy mid-run

**AC-5.2:** Detaching a source attachment does not erase prior visible provenance or prior process history that already referenced that source.

- **TC-5.2a: Prior provenance remains after detach**
  - Given: A source attachment previously informed or received process work
  - When: User detaches that source attachment from current use
  - Then: Prior visible provenance and prior process history remain available

**AC-5.3:** Detaching one source attachment does not remove unrelated current source attachments from the same project or process.

- **TC-5.3a: Unrelated attachments remain**
  - Given: A project or process has multiple source attachments
  - When: User detaches one source attachment
  - Then: The unrelated source attachments remain visible and unchanged

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story owns the soft-detach transition from “currently attached” to
“historically referenced.” Fastify owns the detach orchestration and active-list
implications; Convex stores the detach markers durably. The key constraint is
that detach changes future current-source visibility without rewriting an
already hydrated working copy or erasing provenance.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Detach source | `DELETE` | `/api/projects/:projectId/source-attachments/:sourceAttachmentId` | `detachSource` |

#### Detach Response

| Field | Type | Required | Description |
|---|---|---|---|
| `detached` | boolean | yes | Always `true` on success |
| `sourceAttachmentId` | string | yes | Detached source attachment id |
| `detachedAt` | string | yes | Soft-detach timestamp |

#### Durable Behavior

- Detach sets `detachedAt`, `detachedByUserId`, and `updatedAt`.
- Active project source listings filter detached rows.
- Process current-source resolution excludes detached rows.
- Provenance remains readable because entries copy repository identity and may retain nullable `sourceAttachmentId`.
- Detach does not rewrite an already hydrated working copy mid-run.

#### Active Source Resolver Impact

- Exclude rows with `detachedAt`.
- Preserve process-scoped shadowing for remaining active rows.
- Preserve per-row degraded metadata independently.
- Sort visible rows by `updatedAt` descending.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Detach route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Detach orchestration | `apps/platform/server/services/sources/source-management.service.ts` |
| Durable detach markers and active-list filtering | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts`, `convex/schema.ts` |
| Reader/runtime consumers | `apps/platform/server/services/projects/readers/source-section.reader.ts`, `apps/platform/server/services/processes/readers/materials-section.reader.ts`, `apps/platform/server/services/processes/environment/process-environment.service.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:150), lines 150-161
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:635), lines 635-659
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:674), lines 674-709
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:62), lines 62-66

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-5.1a | `tests/service/server/source-management-api.test.ts` | detaches project-scoped source |
| TC-5.1b | `tests/service/server/source-management-api.test.ts` | detaches process-scoped source |
| TC-5.1c | `tests/service/server/process-execution-orchestrator.test.ts` | detach during active process does not rewrite hydrated copy |
| TC-5.2a | `convex/sourceProvenance.test.ts` | prior provenance remains after detach |
| TC-5.3a | `tests/service/client/source-management-ui.test.ts` | unrelated attachments remain after detach |

#### Non-TC Decided Tests

- `convex/sourceAttachments.test.ts`: detached rows are excluded from active listings but still exist durably

#### Technical Notes

- Detach is a future-state change for active source visibility, not a mid-run working-copy rewrite.

#### Anti-Shim Requirements

- Prove detach against both durable state and visible current-source/read behavior.

#### Verification

- Targeted: `pnpm run test:service`
- Targeted: `pnpm run test:convex`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- DELETE soft-detaches project-scoped and process-scoped source attachments
- Detached sources disappear from future current project/process active source lists
- Detach does not mutate an already hydrated working copy mid-run
- Prior provenance remains visible after detach
- Unrelated active source attachments remain visible and unchanged
- Planned tests for TC-5.1a through TC-5.3a are implemented in the files mapped by the test plan
