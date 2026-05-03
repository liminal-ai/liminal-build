# Story 2: Manage Purpose, Access Mode, and Target Ref

### Summary
<!-- Jira: Summary field -->
Allow users to view and update durable source metadata, including target-ref changes that make previously hydrated sources stale.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to attach code repositories to project and process work, control how those repositories are used, and understand which canonical sources informed or received process work.
- **Context:** The user needs each attached repository to show what it is for, whether it can receive code writes, and which ref it targets.
- **Mental Model:** "Purpose, access mode, and target ref are durable properties of the attached source, not transient hints for one run."
- **Key Constraint:** Metadata management must not redefine source identity or artifact ownership.

**Objective**

Make source purpose, access mode, and target ref visible and mutable for existing source attachments.

**Scope**

In:

- Purpose, access mode, and target ref display in project/process surfaces
- Update route for durable source metadata
- Read-only versus writable text display
- Target-ref change stale transition for hydrated rows

Out:

- Initial attach behavior
- Refresh execution
- Provenance recording
- Detach behavior

**Dependencies**

- Story 1 attach behavior
- Story 0 shared contracts
- [tech-design.md](../tech-design.md) Flow 2
- [test-plan.md](../test-plan.md) Chunk 2 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-2.1:** Each source attachment records purpose, access mode, and target ref as durable source metadata.

- **TC-2.1a: Purpose, access mode, and target ref visible**
  - Given: A source attachment exists
  - When: The source attachment appears in the current surface
  - Then: The purpose, access mode, and target ref are visible

**AC-2.2:** The user can update purpose, access mode, and target ref for an existing source attachment.

- **TC-2.2a: Update source metadata**
  - Given: A source attachment exists
  - When: User updates purpose, access mode, or target ref
  - Then: The source attachment stores and displays the updated metadata

**AC-2.3:** Access mode clearly distinguishes read-only and writable source attachments.

- **TC-2.3a: Read-only attachment is identifiable**
  - Given: A source attachment has read-only access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is read-only
- **TC-2.3b: Writable attachment is identifiable**
  - Given: A source attachment has writable access mode
  - When: The source attachment appears in the current surface
  - Then: The user can tell that the source attachment is writable

**AC-2.4:** Updating the target ref updates freshness state when the current hydrated working copy no longer matches the attached source definition.

- **TC-2.4a: Target-ref change marks source stale**
  - Given: A source attachment was previously hydrated
  - When: User changes its target ref
  - Then: The source attachment no longer appears current and indicates that rehydration is required

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story updates durable source metadata without changing canonical source
identity. Fastify owns update validation and writable-ref policy, while Convex
persists the update atomically. The critical behavior is that a target-ref
change can invalidate the previously hydrated working copy and must carry a
freshness transition in the same durable write.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Update source | `PATCH` | `/api/projects/:projectId/source-attachments/:sourceAttachmentId` | `updateSource` |

#### Update Request

| Field | Type | Required | Validation |
|---|---|---|---|
| `purpose` | enum | no | `research`, `review`, `implementation`, `other` |
| `accessMode` | enum | no | `read_only`, `read_write` |
| `targetRef` | string/null | no | non-empty when present |

#### Update Response

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceAttachment` | Source Attachment Summary | yes | Updated durable source attachment state |

#### Service Responsibilities

- Load and update by `sourceAttachmentId` regardless of whether the source is project-scoped or process-scoped.
- Validate authenticated project access and source membership in the project.
- Preserve source identity fields unless an explicit future story changes identity behavior.
- Normalize target ref before persistence.
- If `targetRef` changes while `hydrationState === 'hydrated'`, persist `hydrationState: 'stale'` and a freshness reason such as `target_ref_changed`.
- Enforce writable-ref policy for `read_write` attachments.

#### Client Responsibilities

- Render purpose, access mode, target ref, and updated freshness state as readable text.
- Distinguish `read_only` and `read_write` without relying on color alone.
- Update the current source row in place after a successful PATCH response.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Update route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Metadata update logic | `apps/platform/server/services/sources/source-management.service.ts` |
| Durable source update | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceAttachments.ts` |
| Project/process source rendering | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:331), lines 331-380
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:555), lines 555-572
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:45), lines 45-49

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-2.1a | `tests/service/client/source-attachment-section.test.ts` | displays purpose access mode and target ref |
| TC-2.2a | `tests/service/server/source-management-api.test.ts` | updates source metadata |
| TC-2.3a | `tests/service/client/process-materials-section.test.ts` | identifies read-only source |
| TC-2.3b | `tests/service/client/process-materials-section.test.ts` | identifies writable source |
| TC-2.4a | `convex/sourceAttachments.test.ts` | target-ref change marks hydrated source stale |

#### Non-TC Decided Tests

None.

#### Technical Notes

- This story does not rename source identity; it only updates purpose, access mode, and target ref.
- Target-ref changes must carry the stale transition in the same durable write.

#### Anti-Shim Requirements

- Prove the stale transition through persisted summary state or route response, not only helper logic.

#### Verification

- Targeted: `pnpm run test:convex`
- Targeted: `pnpm run test:client`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Existing source attachments show purpose, access mode, and target ref in current project/process surfaces
- PATCH updates allowed metadata and returns the updated summary
- Read-only and writable states are visible as text
- Target-ref changes mark previously hydrated rows stale and identify the need for rehydration
- Planned tests for TC-2.1a through TC-2.4a are implemented in the files mapped by the test plan
