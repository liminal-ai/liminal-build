# Story 4: Provenance and Canonical Source Visibility

### Summary
<!-- Jira: Summary field -->
Show durable process-specific source provenance for repositories that informed work or received durable code updates, with per-entry degradation.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs to understand which canonical sources informed or received process work.
- **Context:** A process has used attached repositories as current material and may have landed durable code work in a writable attached source.
- **Mental Model:** "I can tell which repository and ref informed this process and which writable repository and ref received durable code updates."
- **Key Constraint:** Source provenance complements Epic 5 artifact-version provenance and does not replace artifact ownership or process history.

**Objective**

Record and render process-specific source provenance for `informed_work` and `received_code_update` relationships.

**Scope**

In:

- Durable `sourceProvenance` records with copied repository identity
- Recording `informed_work` when process work uses attached sources as current material
- Recording `received_code_update` when durable code updates land in an attached writable source
- Process provenance endpoint and process work-surface provenance section
- Empty provenance state
- Read-only source exclusion from write-target provenance
- Per-entry degraded provenance fallback to durable identity

Out:

- Archive, turn, chunk, and derived-view behavior
- Provenance for manual refresh
- Artifact-version provenance changes
- Full GitHub PR or branch workflow management

**Dependencies**

- Story 3 current source/freshness surface
- Environment execution and checkpoint signals from Epic 3
- Epic 5 artifact provenance alignment
- [tech-design.md](../tech-design.md) Flow 4
- [test-plan.md](../test-plan.md) Chunk 4 tests

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-4.1:** The user can tell which attached repositories and refs informed the current process work.

- **TC-4.1a: Informing source provenance visible**
  - Given: Process work used one or more attached sources
  - When: User views current source provenance
  - Then: The platform shows which attached repositories and refs informed that work
- **TC-4.1b: Empty provenance state shown for process with no recorded source use**
  - Given: A process has no recorded source provenance yet
  - When: User views current source provenance
  - Then: The platform shows a clear empty provenance state

**AC-4.2:** The user can tell which attached writable repository and ref received a durable code update.

- **TC-4.2a: Receiving source provenance visible**
  - Given: Durable code work landed in an attached writable repository
  - When: User views current source provenance
  - Then: The platform shows which attached repository and target ref received that update

**AC-4.3:** Read-only source attachments never appear as if they received durable code updates.

- **TC-4.3a: Read-only source not shown as write target**
  - Given: A source attachment is read-only
  - When: User views source provenance after code work
  - Then: The platform does not present that source attachment as the durable code-write target

**AC-4.4:** One failing provenance lookup does not fail the rest of the provenance surface.

- **TC-4.4a: One degraded provenance entry does not hide healthy entries**
  - Given: A process has multiple provenance relationships and one cannot fully resolve current attachment context
  - When: User loads process source provenance
  - Then: The healthy provenance entries remain visible and the failing one is returned as a bounded degraded entry
- **TC-4.4b: Degraded provenance entry falls back to durable identity**
  - Given: One provenance lookup cannot enrich current attachment metadata
  - When: The provenance surface loads
  - Then: The degraded entry still shows the durable repository identity and target ref already recorded for that relationship

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
#### Architecture Context

This story records and reads process-specific source provenance. It consumes
attached-source and checkpoint outcomes without changing source lifecycle or
artifact ownership. Convex stores copied immutable repository identity, while
Fastify enriches current attachment context at read time and degrades individual
entries when enrichment fails.

#### Route

| Operation | Method | Path | Service Method |
|---|---|---|---|
| Get process source provenance | `GET` | `/api/projects/:projectId/processes/:processId/source-provenance` | `listProcessSourceProvenance` |

#### Source Provenance Response

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | array of Source Provenance Entry | yes | Process-specific provenance entries ordered by `recordedAt` descending |

#### Durable Provenance Record

| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | yes | Owning project |
| `processId` | string | yes | Process this provenance belongs to |
| `sourceAttachmentId` | string/null | yes | Related attachment when available |
| `relationshipKind` | enum | yes | `informed_work` or `received_code_update` |
| `repositoryFullName` | string | yes | Copied canonical identity |
| `repositoryUrl` | string | yes | Copied operational URL |
| `targetRef` | string/null | yes | Copied ref |
| `eventId` | string/null | yes | Related execution/checkpoint event when present |
| `entryStatus` | enum | yes | `ready` or `degraded` at persistence time when the durable record itself is degraded |
| `degradationReason` | string/null | yes | Durable degradation reason when present |
| `recordedAt` | string | yes | Record timestamp |

#### Source Provenance Entry Enrichment

| Field | Type | Required | Description |
|---|---|---|---|
| `currentAttachmentDisplayName` | string/null | yes | Current attachment display name when enrichment succeeds |
| `currentAttachmentScope` | enum/null | yes | `project` or `process` when enrichment succeeds |
| `currentAttachmentAccessMode` | enum/null | yes | `read_only` or `read_write` when enrichment succeeds |
| `currentAttachmentHydrationState` | enum/null | yes | Current four-state hydration value when enrichment succeeds |
| `currentAttachmentVisibility` | enum | yes | `available`, `detached`, `unavailable`, or `redacted` |
| `entryStatus` | enum | yes | Response resolution status after current-attachment enrichment |
| `degradationReason` | string/null | yes | Response degradation reason when enrichment fails or is redacted |

#### Service Responsibilities

- Record `informed_work` when process work uses attached sources as current process material.
- Record `received_code_update` only from successful durable code update/checkpoint results for writable attachments.
- Never derive write-target provenance from read-only attachments.
- Copy immutable repository identity and target ref onto every provenance row.
- Enrich current attachment context independently per entry when available.
- Redact current attachment details and use `currentAttachmentVisibility: redacted` when access is revoked.
- Return bounded degraded entries when current attachment enrichment fails.

#### Client Responsibilities

- Render informing and receiving provenance in the process work surface.
- Render a clear empty provenance state when no entries exist.
- Render degraded entries with durable repository identity and target ref.
- Keep healthy provenance entries visible when one entry degrades.

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Provenance route and schema | `apps/platform/server/routes/source-management.ts`, `apps/platform/server/schemas/source-management.ts` |
| Provenance orchestration | `apps/platform/server/services/sources/source-provenance.service.ts` |
| Durable provenance rows | `apps/platform/server/services/projects/platform-store.ts`, `convex/sourceProvenance.ts`, `convex/schema.ts` |
| Process provenance UI | `apps/platform/client/features/processes/source-provenance-section.ts` |

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:288), lines 288-329
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:388), lines 388-403
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/tech-design.md:618), lines 618-633
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/06--source-attachments-and-canonical-source-management/test-plan.md:56), lines 56-61

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-4.1a | `tests/service/server/source-management-api.test.ts` | returns informing source provenance |
| TC-4.1b | `tests/service/client/source-provenance-section.test.ts` | renders empty provenance state |
| TC-4.2a | `tests/service/server/source-management-api.test.ts` | returns receiving source provenance |
| TC-4.3a | `tests/service/server/source-management-service.test.ts` | read-only source not recorded as write target |
| TC-4.4a | `tests/service/server/source-management-api.test.ts` | degraded provenance entry does not hide healthy entries |
| TC-4.4b | `tests/service/client/source-provenance-section.test.ts` | degraded provenance falls back to durable identity |

#### Non-TC Decided Tests

None.

#### Technical Notes

- Current attachment fields are response enrichment, not part of the copied immutable provenance identity.
- Refresh does not create provenance.

#### Anti-Shim Requirements

- Prove degraded provenance through the actual API/read surface, not only by inspecting stored rows.

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
- Process source provenance endpoint returns `informed_work` and `received_code_update` entries
- Provenance entries copy immutable repository identity, URL, and target ref
- Read-only sources are never shown as durable code-write targets
- Empty provenance and degraded provenance states are visible in the process surface
- One degraded provenance relationship does not fail the whole provenance read
- Planned tests for TC-4.1a through TC-4.4b are implemented in the files mapped by the test plan
