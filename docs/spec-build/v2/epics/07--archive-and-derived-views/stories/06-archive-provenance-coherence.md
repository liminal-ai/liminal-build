# Story 6: Archive Provenance Coherence

### Summary
<!-- Jira: Summary field -->
Enrich archive-entry reads with available artifact-version and source provenance while preserving derived-view traceability and owning per-entry lookup-failure degradation semantics.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Connect the Story 3 archive read surface to Epic 5 artifact-version provenance and Epic 6 source provenance without redefining artifact ownership or source attachment lifecycle.

**Scope**

In:

- Archive read enrichment for related artifact version context
- Archive read enrichment for related source provenance context
- Producing-process provenance visibility when artifact version context is available
- Repository identity and ref visibility when source provenance context is available
- Per-entry degraded metadata when source context cannot resolve
- Per-entry degraded metadata when artifact context cannot resolve
- Derived-view provenance traces through source turns to source archive entries
- Preserving Story 3 route/UI behavior while enriching the archive response contract

Out:

- Creating artifact-version provenance records
- Creating source attachment or source provenance lifecycle behavior
- External-source or MCP attachment behavior
- Changing artifact ownership, package ownership, or source attachment shadowing rules
- Hiding archive entries because related records are unavailable
- Replacing Story 3 archive route, access, reload, or bounded-page behavior

**Dependencies**

- Story 5 minimal structural views over turns
- Epic 5 artifact-version provenance contracts
- Epic 6 source provenance contracts
- Existing archive read service and route
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-6.1:** Archive entries can show related artifact-version provenance when available.

- **TC-6.1a: Artifact provenance visible from archive entry**
  - Given: An archive entry relates to an artifact version
  - When: User reads the archive entry
  - Then: The related artifact version and producing-process provenance are visible when available

**AC-6.2:** Archive entries can show related source provenance when available.

- **TC-6.2a: Source provenance visible from archive entry**
  - Given: An archive entry relates to a source that informed or received work
  - When: User reads the archive entry
  - Then: The related repository identity and ref are visible when available

**AC-6.3:** Missing related provenance does not hide archive truth.

- **TC-6.3a: Missing source context degrades one entry**
  - Given: An archive entry references source provenance that cannot be fully resolved
  - When: User reads the archive
  - Then: The archive entry remains visible with degraded source context
- **TC-6.3b: Missing artifact context degrades one entry**
  - Given: An archive entry references artifact context that cannot be fully resolved
  - When: User reads the archive
  - Then: The archive entry remains visible with degraded artifact context

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns read-time provenance enrichment and per-entry related-context degradation.

#### Architecture Context

Story 6 is a read-time enrichment story. It does not extend source lifecycle or
artifact ownership. It deepens the Story 3 archive read surface by enriching
archive-entry reads with related artifact/source context when available and by
owning the lookup-failure degradation semantics for those related records.

#### Related Provenance Fields

| Field | Description |
|---|---|
| `relatedArtifactVersionId` | Related artifact version when the entry points to artifact work |
| `relatedSourceProvenanceId` | Related source provenance entry when the entry points to source work |
| `relatedToolCallId` | Correlation id for tool call/result pairing |
| `entryStatus` | `ready` or `degraded` status for related context in the response |
| `degradationReason` | Reason related context degraded when applicable |

#### Enrichment Sources

| Context | Source |
|---|---|
| Artifact version and producing process | Existing Epic 5 artifact/version provenance services or store helpers |
| Repository identity and ref | Epic 6 source provenance records |
| Tool correlation | Stored `relatedToolCallId` and paired archive entry context |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Archive read enrichment | `apps/platform/server/services/archive/archive-read.service.ts` |
| Artifact/source lookups | `apps/platform/server/services/projects/platform-store.ts`, Epic 6 source provenance read seam |
| Archive client rendering | `apps/platform/client/features/processes/archive-section.ts`, `apps/platform/client/features/processes/derived-archive-views-section.ts` |

Implementation notes:

- Archive entries store nullable related ids. They do not copy or own artifact/source domain records.
- `ArchiveReadService` enriches related context when available and degrades only the affected entry when a lookup fails.
- Story 3 is responsible for displaying degraded entries; this story is responsible for creating the artifact/source-related degraded states that the read surface displays.
- Degraded related-context states do not expose unavailable source or artifact details beyond fields already stored on the archive entry.
- Missing artifact/source context must not hide healthy entries or remove the affected archive entry.
- Derived views preserve provenance by exposing `sourceTurnIds` and `sourceArchiveEntryIds`; source archive entries remain inspectable through the archive read surface.
- This story consumes Epic 5 and Epic 6 records; it does not add source lifecycle or artifact ownership behavior.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:646), lines 646-659
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:353), lines 353-400
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:69), lines 69-72

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-6.1a | `tests/service/server/archive-api.test.ts` | artifact provenance visible from archive entry |
| TC-6.2a | `tests/service/server/archive-api.test.ts` | source provenance visible from archive entry |
| TC-6.3a | `tests/service/server/archive-api.test.ts` | missing source context degrades one entry |
| TC-6.3b | `tests/service/server/archive-api.test.ts` | missing artifact context degrades one entry |

#### Non-TC Decided Tests

None.

#### Technical Notes

- This is read-time enrichment only. Archive rows still own only nullable related ids, not full copied artifact/source domain records.

#### Anti-Shim Requirements

- Prove degradation by failing the actual enrichment dependency and asserting the archive entry still returns, rather than by fabricating a degraded response object directly.

#### Verification

- Targeted: `pnpm run test:service`
- Story gate: `pnpm run green-verify`
- Epic gate: `pnpm run verify-all`

#### Spec Deviations

None.

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Archive entries with `relatedArtifactVersionId` expose artifact version and producing-process provenance when available
- Archive entries with `relatedSourceProvenanceId` expose repository identity and ref when available
- Missing source provenance degrades only the affected entry
- Missing artifact provenance degrades only the affected entry
- Derived views can trace through source turns to source archive entry ids
- Provenance enrichment does not mutate canonical archive truth or redefine artifact/source ownership
- Tests cover TC-6.1a through TC-6.3b
