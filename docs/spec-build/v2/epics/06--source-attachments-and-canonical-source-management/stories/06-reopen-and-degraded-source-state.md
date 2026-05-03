# Story 6: Reopen and Degraded Source State

### Summary
<!-- Jira: Summary field -->
Restore durable source-management state across reopen and keep healthy sources visible when one source or access path degrades.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who expects source-management state to survive reloads and partial failures.
- **Context:** The user reloads or reopens a project/process later, or one source becomes unavailable while other sources remain healthy.
- **Mental Model:** "The platform restores source state from durable records and degrades one failing source path without hiding the rest."
- **Key Constraint:** Revoked access and unavailable sources must not leak stale source details.

**Objective**

Complete reopen, access-loss, unavailable-source, and bounded degradation behavior for source-management surfaces.

**Scope**

In:

- Project shell source state restoration
- Process work surface current-source restoration
- Safe unavailable source display
- Revoked project/process access blocking
- One-source failure isolation
- Existing section envelope preservation for project and process reads

Out:

- Archive browsing and derived views
- Background source freshness polling
- External-source/MCP attachment
- Full GitHub workflow management

**Dependencies**

- Story 5 detach behavior
- Project and process readers
- Active source resolver
- [tech-design.md](../tech-design.md) Flow 6
- [test-plan.md](../test-plan.md) Chunk 6 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-6.1:** Reloading or reopening the project shell or process work surface restores the latest durable source attachment state.

- **TC-6.1a: Reopen project source attachment state**
  - Given: User previously opened a project with attached sources
  - When: User reloads or reopens the project later
  - Then: The latest durable project source attachment state is restored
- **TC-6.1b: Reopen process source attachment state**
  - Given: User previously opened a process with attached sources
  - When: User reloads or reopens that process later
  - Then: The latest durable process source attachment state is restored

**AC-6.2:** If a requested source attachment is unavailable or access is revoked, the platform shows an unavailable state and does not leak stale source details.

- **TC-6.2a: Unavailable source attachment shown safely**
  - Given: A source attachment is no longer available
  - When: The current shell or process surface loads
  - Then: The platform shows that unavailable state without leaking stale source details
- **TC-6.2b: Revoked access blocks source management**
  - Given: User no longer has access to the project or process
  - When: User opens the related source-management context
  - Then: The platform blocks access and does not leak source details

**AC-6.3:** If one source attachment fails independently, the rest of the source-management surface remains visible.

- **TC-6.3a: One failing source does not hide healthy sources**
  - Given: A source-management surface includes one unavailable source and other healthy sources
  - When: The surface renders
  - Then: The healthy sources remain visible and only the failing source shows the appropriate stale or unavailable state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story owns the durable read model for source-management after reload,
reopen, access loss, or one-source failure. It is a reader story more than a
lifecycle story: Fastify readers and access services decide what is safe and
visible, while Convex remains the durable source of record. The core design seam
is that one failing source path must degrade locally without hiding healthy
sources.

#### Read Paths

| Operation | Method | Path | Responsibility |
|---|---|---|---|
| Get project shell | `GET` | `/api/projects/{projectId}` | Return project-scoped source attachments with Epic 6 metadata in `sourceAttachments.items` |
| Get process work surface | `GET` | `/api/projects/{projectId}/processes/{processId}` | Return `materials.currentSources` after active-source resolution and shadowing |

#### Reader Responsibilities

- Restore source state from durable Convex records, not from an active environment.
- Exclude detached rows from active current-source lists.
- Apply process-scoped shadowing by `repositoryFullName + targetRef`.
- Preserve existing section envelope behavior.
- Return healthy rows when one source enrichment fails.
- Use `unavailable` state and bounded redaction when the source-of-truth path cannot be safely resolved.
- Block access when project or process access is revoked.

#### Security and Degradation

- All source-management reads require authenticated access.
- Project and process access are enforced server-side.
- Revoked access blocks the whole context and does not leak source details.
- Unavailable source rows expose only safe durable state needed for user understanding.
- One unavailable source does not hide unrelated healthy sources.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Project/process read paths | `apps/platform/server/routes/projects.ts`, `apps/platform/server/routes/processes.ts` |
| Reader behavior and source resolution | `apps/platform/server/services/projects/readers/source-section.reader.ts`, `apps/platform/server/services/processes/readers/materials-section.reader.ts` |
| Active-source resolver | `apps/platform/server/services/processes/readers/materials-section.reader.ts`, `apps/platform/server/services/sources/source-management.service.ts` |
| Client degraded-state rendering | `apps/platform/client/features/projects/source-attachment-section.ts`, `apps/platform/client/features/processes/process-materials-section.ts`, `apps/platform/client/features/processes/source-provenance-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:661), lines 661-672
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:421), lines 421-434
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:67), lines 67-71

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-6.1a | `tests/service/server/projects-api.test.ts` | reopens project source attachment state |
| TC-6.1b | `tests/service/server/process-work-surface-api.test.ts` | reopens process source attachment state |
| TC-6.2a | `tests/service/client/source-management-ui.test.ts` | unavailable source shown safely |
| TC-6.2b | `tests/service/server/source-management-api.test.ts` | revoked access blocks source management |
| TC-6.3a | `tests/service/server/projects-api.test.ts` | one failing source does not hide healthy sources |

#### Non-TC Decided Tests

- `tests/service/server/source-management-api.test.ts`: unavailable or revoked source reads redact current source details while preserving bounded state

#### Technical Notes

- This story owns redaction and degradation behavior at read time, not source lifecycle changes.

#### Anti-Shim Requirements

- Prove unavailable and revoked states through actual route or rendered read behavior, not only fake section-envelope objects.

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
- Project shell reload restores latest durable project source attachment state
- Process work surface reload restores latest durable current-source state
- Unavailable source state is shown safely without leaking stale details
- Revoked access blocks source-management context
- One failing source does not hide healthy sources
- Planned tests for TC-6.1a through TC-6.3a are implemented in the files mapped by the test plan
