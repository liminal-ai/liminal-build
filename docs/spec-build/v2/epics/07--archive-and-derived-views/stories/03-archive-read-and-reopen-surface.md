# Story 3: Archive Read and Reopen Surface

### Summary
<!-- Jira: Summary field -->
Expose process archive reads through authenticated Fastify routes and client surfaces so finalized entries remain visible after reload or environment loss.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who needs process history to remain durable, inspectable, and usable for later long-horizon context management.
- **Context:** The user is running or reviewing a process after source attachments, artifact versions, and source provenance have been established. The user needs to return later, inspect what happened, and trust that derived turns or chunks did not replace the original process record.
- **Mental Model:** "The platform keeps the full record of what happened. Turns, chunks, and summaries are views over that record, not the record itself."
- **Key Constraint:** The archive must preserve finalized low-level entries as canonical truth. It must not store raw streaming deltas, interrupted partial objects, or only pre-summarized history as the durable record.

**Objective**

Add process archive read routes and user-visible archive rendering that read durable canonical entries, enforce project/process access, show empty states, and degrade one unresolved entry without hiding healthy entries.

**Scope**

In:

- `GET /api/projects/{projectId}/processes/{processId}/archive`
- Route auth and project/process access checks
- Cursor/limit validation and invalid-request handling
- `ArchiveReadService.getArchive`
- Client archive read API and archive section rendering
- Empty archive state
- Durable reload/reopen behavior
- Environment-loss archive read behavior
- Per-entry degraded related-context display when context cannot resolve

Out:

- Turn derivation and turn UI
- Derived-view route/UI
- Full artifact/source provenance enrichment, owned by Story 6
- Long-process pagination hardening beyond the basic page contract, completed in Story 7

**Dependencies**

- Story 2 finalization boundary
- Existing Fastify actor resolution and `ProcessAccessService`
- Existing process work surface route and client bootstrap
- [tech-design.md](../tech-design.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
**AC-3.1:** The user can read finalized archive entries for one process.

- **TC-3.1a: Archive entries visible**
  - Given: A process has finalized archive entries
  - When: User opens the archive read surface for that process
  - Then: The finalized entries are visible
- **TC-3.1b: Empty archive state visible**
  - Given: A process has no archive entries
  - When: User opens the archive read surface
  - Then: The platform shows an empty archive state

**AC-3.2:** Reopening a process restores archive entries from durable state.

- **TC-3.2a: Archive survives reload**
  - Given: A process has finalized archive entries
  - When: User reloads or returns to the process later
  - Then: The archive entries are restored from durable state
- **TC-3.2b: Archive survives environment loss**
  - Given: A process environment was discarded after entries were archived
  - When: User opens the process archive
  - Then: The archived entries remain available

**AC-3.3:** Archive reads enforce project and process access boundaries.

- **TC-3.3a: Unauthorized archive read blocked**
  - Given: User does not have access to a project
  - When: User requests a process archive from that project
  - Then: The platform rejects the request and does not leak archive content
- **TC-3.3b: Missing process archive read returns not found**
  - Given: The requested process does not exist in the requested project
  - When: User requests the process archive
  - Then: The platform returns a process-not-found error

**AC-3.4:** One degraded archive entry does not hide healthy archive entries.

- **TC-3.4a: Degraded entry returned with healthy entries**
  - Given: One archive entry has unresolved related context and other entries are healthy
  - When: User reads the archive
  - Then: Healthy entries remain visible and the unresolved entry is returned with degraded metadata

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story owns the first browser-facing canonical archive read surface.

#### Architecture Context

Story 3 is the first user-facing archive story. It exposes durable archive
truth through authenticated Fastify routes and client rendering without relying
on environment state or the live WebSocket stream.

#### Endpoint

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process archive | `GET` | `/api/projects/{projectId}/processes/{processId}/archive` | Returns finalized canonical archive entries for one process |

#### Archive Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `entries` | array of Archive Entry | yes | present | Finalized archive entries for the requested page |
| `page.cursor` | string | no | non-empty when present | Cursor used to fetch this page |
| `page.nextCursor` | string | no | non-empty when present | Cursor for the next page when more entries exist |
| `page.hasMore` | boolean | yes | true or false | Whether more entries are available |

Sort order: archive entries default to ascending `sequence`.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `422` | `INVALID_ARCHIVE_REQUEST` | Cursor or limit is invalid |

#### Implementation Targets

| Area | Files / Modules |
|------|-----------------|
| Archive route and schema | `apps/platform/server/routes/archive.ts`, `apps/platform/server/schemas/archive.ts` |
| Archive read service | `apps/platform/server/services/archive/archive-read.service.ts` |
| Process/archive UI entry | `apps/platform/client/features/processes/archive-section.ts`, `apps/platform/client/app/bootstrap.ts` |

Implementation notes:

- The route lives under the existing process path and uses existing actor resolution and process access checks before archive services run.
- Archive reads depend on durable `archiveEntries`, not live WebSocket state or environment state.
- `ArchiveReadService` enriches related context where available and marks only the affected entry degraded when related context fails.
- Read-time degradation should not mutate canonical archive rows unless the row itself was originally persisted degraded.
- Client rendering should show finalized entries, empty state, degraded metadata, and page state without adding a separate top-level archive app.

#### Design References

- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:404), lines 404-442
- [tech-design.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/tech-design.md:602), lines 602-613
- [test-plan.md](/Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/07--archive-and-derived-views/test-plan.md:50), lines 50-56

#### Test Mapping

| TC | Test File / Check | Test Description |
|----|-------------------|------------------|
| TC-3.1a | `tests/service/client/archive-section.test.ts` | archive entries visible |
| TC-3.1b | `tests/service/client/archive-section.test.ts` | empty archive state visible |
| TC-3.2a | `tests/service/server/archive-api.test.ts` | archive survives reload |
| TC-3.2b | `tests/service/server/archive-api.test.ts` | archive survives environment loss |
| TC-3.3a | `tests/service/server/archive-api.test.ts` | unauthorized archive read blocked |
| TC-3.3b | `tests/service/server/archive-api.test.ts` | missing process archive read returns not found |
| TC-3.4a | `tests/service/server/archive-api.test.ts` | degraded entry returned with healthy entries |

#### Non-TC Decided Tests

- `tests/service/server/archive-api.test.ts`: invalid archive query returns `INVALID_ARCHIVE_REQUEST`

#### Technical Notes

- This story owns the first browser-facing archive read; provenance depth stays minimal here and deepens in Story 6.

#### Anti-Shim Requirements

- Prove archive reads through the actual Fastify route boundary and client rendering, not by calling an internal read helper directly.

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
- Authenticated archive read route returns one bounded page of finalized archive entries
- Unauthorized, forbidden, missing project, missing process, and invalid archive requests use the specified error contract
- Client archive section renders entries, empty state, page state, and degraded entry metadata
- Reload and environment-loss tests prove archive reads use durable state
- One degraded entry does not hide healthy entries
- Tests cover TC-3.1a through TC-3.4a plus invalid archive query handling from the test plan
