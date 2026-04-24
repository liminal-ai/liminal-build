# Story 5: Package Export

### Summary
<!-- Jira: Summary field -->
Export the currently reviewed package as a bounded `.mpkz` archive with an `_nav.md` manifest, while keeping the review workspace open when export fails or a prior download URL expires.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Deliver the package-export pipeline for reviewed package snapshots so the user can request a bounded archive from the same workspace. Until a downstream process-module epic publishes package snapshots in normal product flow, this story is exercised through tests and manual Convex seeding.

**Scope**

In:

- Offer export only when the currently reviewed target is an exportable package
- Validate exportability before issuing download metadata
- Return a bounded `.mpkz` archive for the currently reviewed package snapshot
- Include an `_nav.md` manifest that identifies the package and included artifact version identities
- Keep the review workspace open when export preparation fails or an earlier download URL has expired

Out:

- Package publication workflow
- Alternative export formats beyond first-cut `.mpkz`
- Global export history or download-library browsing
- Editing package composition before export

**Dependencies**

- Story 4 package review workspace
- Story 4 package snapshot publication handoff through `publishPackageSnapshot`
- Liminal Build markdown package library for `.mpk` and `.mpkz` archive handling
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
These package-export test conditions are exercisable through tests and manual Convex seeding until a downstream process-module epic publishes durable package snapshots in normal product flow.

**AC-5.1:** The user can export the currently reviewed package from the review workspace.

- **TC-5.1a: Export current package**
  - Given: User is reviewing one exportable package
  - When: User exports the package
  - Then: The platform returns a markdown package (`.mpkz`) export for that currently reviewed package
- **TC-5.1b: Export not falsely offered for non-exportable target**
  - Given: User is reviewing a target that is not currently exportable
  - When: The review workspace renders
  - Then: The platform does not falsely present an export path for that target

**AC-5.2:** The exported package reflects the artifact versions currently shown in the review package rather than an unrelated or stale package composition.

- **TC-5.2a: Export matches reviewed versions**
  - Given: User is reviewing one package with identified artifact versions
  - When: User exports it
  - Then: The exported package reflects those reviewed versions
- **TC-5.2b: Export includes manifest of package and version identities**
  - Given: User exports one reviewed package
  - When: The export is prepared
  - Then: The export includes an `_nav.md` manifest identifying the package and the artifact versions included in it

**AC-5.3:** If export preparation fails, the review workspace remains open and shows a clear export failure without erasing the current review state.

- **TC-5.3a: Export failure does not close review**
  - Given: User is reviewing one package
  - When: Export preparation fails
  - Then: The review workspace remains open and the export failure is shown clearly
- **TC-5.3b: Expired export requires re-export**
  - Given: User previously received an export URL and that URL has expired
  - When: User attempts to use the expired export
  - Then: The platform requires a new export request without erasing the current review state

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
This story adds export preflight, signed download metadata, and archive streaming for the currently reviewed package snapshot.

#### Endpoints

| Operation | Method | Path | Description |
|---|---|---|---|
| Request package export | `POST` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}/export` | Phase 1 of export. Validates exportability, mints a signed download URL with bounded expiry, returns an `ExportPackageResponse` including `downloadUrl` and `expiresAt` |
| Download package export | `GET` | `/api/projects/{projectId}/processes/{processId}/review/exports/{exportId}` | Phase 2 of export. Consumes the signed token issued by the POST, re-verifies access and exportability, and streams the `.mpkz` archive as `application/gzip`. Returns `404 REVIEW_TARGET_NOT_FOUND` when the token is expired, tampered, or missing |

#### Package Exportability

Note: The canonical shared contract definitions are established in Story 0 (Foundation). This story references the same shapes for self-contained readability; Story 0's `review-workspace.ts` is authoritative at runtime.

| `available` | Other fields | Semantics |
|---|---|---|
| `true` | *(no other fields)* | Every package member is `status: ready`; the export action is offered |
| `false` | `reason: string` (required, non-empty) | At least one package member is `unsupported` or `unavailable`; the export action is hidden and the reason may be surfaced |

#### Export Package Response

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `exportId` | string | yes | non-empty | Stable export identifier |
| `downloadName` | string | yes | non-empty, ends in `.mpkz` for first-cut export | Suggested file name for the export |
| `downloadUrl` | string | yes | valid URL | Download location for the exported package |
| `contentType` | string | yes | `application/gzip` | First-cut export content type |
| `packageFormat` | enum | yes | `mpkz` | Liminal Build markdown package format identifier |
| `expiresAt` | string | yes | ISO 8601 UTC | Time the export URL expires |

The first-cut export format is a Liminal Build markdown package (`.mpkz`): a gzip-wrapped tar archive containing one file per package member alongside an `_nav.md` manifest. The manifest is itself a reviewable markdown document that records the package identity, package-level metadata, and the included artifact version identities in a navigation tree. An uncompressed `.mpk` variant exists in the underlying format but is not emitted by first-cut web export.

After `expiresAt`, the user must request a new export.

#### Non-Functional Requirements

- Export preparation for one bounded package begins within 2 seconds under normal conditions.
- The export action is keyboard reachable from the review workspace.
- Export URLs are bounded and expire after issuance.
- Export requests and export failures are traceable by package ID.

#### Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested package does not exist in the requested review context, or the download token is expired, tampered, or missing |
| `409` | `REVIEW_EXPORT_NOT_AVAILABLE` | Requested review target cannot currently be exported |
| `503` | `REVIEW_EXPORT_FAILED` | Export preparation failed |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Export is offered only for exportable reviewed packages
- Export preflight returns bounded signed-download metadata and the resulting archive name ends in `.mpkz`
- The exported archive matches the reviewed package snapshot and includes an `_nav.md` manifest with package and artifact version identities
- Export preparation failure leaves the review workspace open with the current review state intact
- Expired download URLs require a fresh export request without erasing review context
- Export preparation begins within 2 seconds under normal conditions, and the export action remains keyboard reachable
- Export URLs remain bounded and expiring, and expired, tampered, or missing download tokens return `404 REVIEW_TARGET_NOT_FOUND`
- Export requests and export failures are traceable by package ID
- Story tests cover TC-5.1a through TC-5.1b, TC-5.2a through TC-5.2b, and TC-5.3a through TC-5.3b
