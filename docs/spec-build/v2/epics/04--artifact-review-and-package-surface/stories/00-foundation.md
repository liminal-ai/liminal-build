# Story 0: Foundation

### Summary
<!-- Jira: Summary field -->
Create the shared artifact-version, review-target, package-member, exportability, downstream package-publication, and review-error vocabulary used by all later Epic 4 stories.

### Description
<!-- Jira: Description field -->
**User Profile**

- **Primary User:** A technical founder, tech lead, staff engineer, or agentic operator who wants to review process outputs inside the same platform surface where the process work happened instead of exporting drafts into a separate viewer.
- **Context:** The user has a process with one or more durable artifact outputs or output sets and needs to inspect current and prior revisions, read markdown-centric content, review Mermaid diagrams, and export a bounded output package when needed.
- **Mental Model:** "This process has durable outputs. I can open the current artifact or package, see exactly which version I am reviewing, move between review and active process context, and return later without losing the draft I reviewed."
- **Key Constraint:** The review surface must stay process-aware and version-aware without turning into a generic document-management product, archive browser, or broader publication workflow in the same epic.

**Objective**

Establish the shared review-workspace vocabulary, package snapshot vocabulary, downstream publication-handoff vocabulary, error-code vocabulary, fixtures, and helpers required by Stories 1 through 6.

**Scope**

In:

- Shared review-workspace route and endpoint vocabulary
- Shared downstream publisher handoff vocabulary for durable package snapshots
- Shared process-aware review context and target-summary shapes
- Shared artifact-version, markdown-body, Mermaid-block, and unsupported-format vocabulary
- Shared package-member, package-exportability, and export-response vocabulary
- Shared review error codes and request-level error responses
- Reusable fixtures and helpers for ready, empty, unsupported, unavailable, and degraded review states

Out:

- User-visible review-entry behavior owned by Story 1
- Artifact version-history interaction owned by Story 2
- Markdown and Mermaid rendering behavior owned by Story 3
- Package review behavior owned by Story 4
- Package export behavior owned by Story 5
- Reopen, unavailable, and degraded review handling owned by Story 6

**Dependencies**

- Epic 2 process work surface and current-materials visibility
- Epic 3 durable artifact and output checkpointing plus review entry from the process surface
- [tech-design.md](../tech-design.md), [tech-design-client.md](../tech-design-client.md), [tech-design-server.md](../tech-design-server.md)
- [test-plan.md](../test-plan.md)

### Acceptance Criteria
<!-- Jira: Acceptance Criteria field -->
This infrastructure story does not own end-user acceptance criteria from the detailed epic.

It establishes the shared review, package, export, and error vocabulary consumed by Stories 1 through 6.

### Technical Design
<!-- Jira: Technical Notes or sub-section of Description -->
The shared vocabulary below is the baseline contract later stories implement and test against.

#### Review Surface and Publication Handoff

| Operation | Method | Path | Description |
|---|---|---|---|
| Get process review workspace | `GET` | `/api/projects/{projectId}/processes/{processId}/review` | Returns the current review workspace bootstrap for one process |
| Get artifact review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/artifacts/{artifactId}` | Returns review data for one artifact and its versions |
| Get package review target | `GET` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}` | Returns review data for one output package and its members |
| Publish package snapshot | `Internal mutation` | `publishPackageSnapshot` | Persists one durable ordered package snapshot for downstream process-module publication flows from one process review context; pinned members may come from multiple processes in the same project |
| Request package export | `POST` | `/api/projects/{projectId}/processes/{processId}/review/packages/{packageId}/export` | Validates exportability and returns signed download metadata for one reviewed package |
| Download package export | `GET` | `/api/projects/{projectId}/processes/{processId}/review/exports/{exportId}` | Streams the `.mpkz` export for one previously requested package export |

Epic 5 alignment backfill: artifacts are project-scoped identities, not
single-process-owned rows. Reviewability in Story 0 vocabulary is therefore
process-context / pinned-target based, and any package snapshot published from
one process context may still pin artifact versions produced by other processes
in the same project.

#### Shared Review Vocabulary

| Contract Element | Values |
|---|---|
| `process.reviewTargetKind` | `artifact`, `package` |
| `review.target.status` | `ready`, `empty`, `error`, `unsupported`, `unavailable` |
| `artifact.contentKind` | `markdown`, `unsupported` |
| `artifact.bodyStatus` | `ready`, `error` |
| `package.member.status` | `ready`, `unsupported`, `unavailable` |
| `package.exportability.available` | `true`, `false` |
| `export.packageFormat` | `mpkz` |

#### Review Target Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `position` | integer | yes | `>= 0` | Review-target order within the current process review context, as published or otherwise pinned for that process |
| `targetKind` | enum | yes | `artifact` or `package` | Review target kind |
| `targetId` | string | yes | non-empty | Stable review target identifier |
| `displayName` | string | yes | non-empty | Human-readable target label |

**Sort order:** Available review targets are ordered by `position`.

#### Artifact Version Summary

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `versionId` | string | yes | non-empty | Stable version identifier |
| `versionLabel` | string | yes | non-empty | Human-readable version or revision label |
| `isCurrent` | boolean | yes | boolean | Whether this is the current durable version |
| `createdAt` | string | yes | ISO 8601 UTC | Time the version became durable |

**Sort order:** Versions are ordered newest to oldest by `createdAt`.

#### Package Member

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `memberId` | string | yes | non-empty | Stable package member identifier |
| `position` | integer | yes | `>= 0` | Package-defined review order position |
| `artifactId` | string | yes | non-empty | Artifact identifier for this member |
| `displayName` | string | yes | non-empty | Artifact display name in the package |
| `versionId` | string | yes | non-empty | Durable artifact version identifier for this package snapshot member |
| `versionLabel` | string | yes | non-empty | Durable artifact version label for this package snapshot member |
| `status` | enum | yes | `ready`, `unsupported`, or `unavailable` | Reviewability state for this member |

#### Package Exportability

| `available` | Other fields | Semantics |
|---|---|---|
| `true` | *(no other fields)* | The snapshot has at least one durable member and no package member is `unavailable`; `unsupported` members do not by themselves block export |
| `false` | `reason: string` (required, non-empty) | The snapshot has zero durable members or at least one package member is `unavailable`; the export action is hidden and the reason may be surfaced |

#### Review Target Error

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `code` | string | yes | non-empty | Stable machine-readable review error code |
| `message` | string | yes | non-empty | Human-readable review error summary |

#### Review Target Error Codes

| Code | Description |
|---|---|
| `REVIEW_TARGET_NOT_FOUND` | The requested review target (artifact, artifact version, or package) is no longer available in the review context |
| `REVIEW_TARGET_UNSUPPORTED` | The current target or selected member cannot be rendered in the first-cut review workspace, but its identity remains visible |
| `REVIEW_RENDER_FAILED` | The current target identity loaded, but bounded body or diagram rendering failed |
| `REVIEW_MEMBER_UNAVAILABLE` | One package member is unavailable in the current package review context |

`REVIEW_TARGET_NOT_FOUND` is valid in two places:

- as a request-level `404` when a target-specific endpoint or download URL
  cannot be resolved
- as a bounded `ReviewTargetError.code` value when review-workspace bootstrap
  can still return project/process context but the selected target is no longer
  available in that context

#### Shared Error Responses

| Status | Code | Description |
|---|---|---|
| `401` | `UNAUTHENTICATED` | User is not authenticated |
| `403` | `PROJECT_FORBIDDEN` | User does not have access to the requested project |
| `404` | `PROJECT_NOT_FOUND` | Requested project does not exist |
| `404` | `PROCESS_NOT_FOUND` | Requested process does not exist in the requested project |
| `404` | `REVIEW_TARGET_NOT_FOUND` | Requested artifact, artifact version, or package does not exist in the requested review context |
| `409` | `REVIEW_EXPORT_NOT_AVAILABLE` | Requested review target cannot currently be exported |
| `503` | `REVIEW_EXPORT_FAILED` | Export preparation failed |

See the tech design document for full architecture, implementation targets, and test mapping.

### Definition of Done
<!-- Jira: Definition of Done or Acceptance Criteria footer -->
- Shared review-workspace, artifact-version, package-member, exportability, and review-error vocabulary is defined once and referenced by later stories
- Shared package-publication handoff vocabulary includes `publishPackageSnapshot` for downstream process-module publishers
- Reusable fixtures cover ready, empty, unsupported, unavailable, and bounded-error review states
- Package snapshot fixtures cover ordered members, stable member version identities, and mixed healthy versus degraded member states
- Export fixtures cover available packages (including unsupported-but-durable members), unavailable packages, and signed-download metadata
- Story files and the coverage artifact can reference Story 0 without redefining shared review vocabulary
