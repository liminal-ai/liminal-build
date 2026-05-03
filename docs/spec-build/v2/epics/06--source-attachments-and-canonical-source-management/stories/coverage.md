# Epic 6 Story Coverage

Stories published from [../epic.md](../epic.md). Business epic not requested.

Story 0 is a foundation story and does not own end-user ACs or TCs from the detailed epic. Stories 1 through 6 follow the recommended Epic 6 breakdown and the finalized tech-design/test-plan pack.

## Coverage Gate

| AC | TC | Story | Verifying Test File(s) | Delivery Notes |
|---|---|---|---|---|
| AC-1.1 | TC-1.1a, TC-1.1b | Story 1 | `tests/service/server/source-management-api.test.ts` | Project and process attach routes create durable source attachments |
| AC-1.2 | TC-1.2a | Story 1 | `tests/service/client/source-attachment-section.test.ts` | Created source identity and scope render immediately |
| AC-1.3 | TC-1.3a, TC-1.3b, TC-1.3c | Story 1 | `tests/service/server/source-management-api.test.ts`; `convex/sourceAttachments.test.ts`; `tests/service/server/source-management-service.test.ts` | Exact duplicate rules use canonical identity, scope, and target ref |
| AC-1.4 | TC-1.4a, TC-1.4b | Story 1 | `tests/service/server/source-management-api.test.ts` | Invalid or inaccessible repositories create no partial row |
| AC-2.1 | TC-2.1a | Story 2 | `tests/service/client/source-attachment-section.test.ts` | Purpose, access mode, and target ref visible |
| AC-2.2 | TC-2.2a | Story 2 | `tests/service/server/source-management-api.test.ts` | PATCH updates durable source metadata |
| AC-2.3 | TC-2.3a, TC-2.3b | Story 2 | `tests/service/client/process-materials-section.test.ts` | Read-only and writable attachments are distinguishable |
| AC-2.4 | TC-2.4a | Story 2 | `convex/sourceAttachments.test.ts` | Target-ref changes mark hydrated sources stale |
| AC-3.1 | TC-3.1a | Story 3 | `tests/service/client/source-management-ui.test.ts` | Four hydration/freshness states render |
| AC-3.2 | TC-3.2a, TC-3.2b, TC-3.2c | Story 3 | `tests/service/client/source-management-ui.test.ts` | Recovery path shown only for recoverable states |
| AC-3.3 | TC-3.3a, TC-3.3b | Story 3 | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-management-ui.test.ts` | Refresh updates one source in place and shows pending progress |
| AC-4.1 | TC-4.1a, TC-4.1b | Story 4 | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-provenance-section.test.ts` | Informing source provenance and empty state |
| AC-4.2 | TC-4.2a | Story 4 | `tests/service/server/source-management-api.test.ts` | Durable code-update provenance visible |
| AC-4.3 | TC-4.3a | Story 4 | `tests/service/server/source-management-service.test.ts` | Read-only sources never appear as write targets |
| AC-4.4 | TC-4.4a, TC-4.4b | Story 4 | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-provenance-section.test.ts` | Per-entry provenance degradation preserves healthy entries |
| AC-5.1 | TC-5.1a, TC-5.1b, TC-5.1c | Story 5 | `tests/service/server/source-management-api.test.ts`; `tests/service/server/process-execution-orchestrator.test.ts` | Soft detach removes future current use without rewriting active working copy |
| AC-5.2 | TC-5.2a | Story 5 | `convex/sourceProvenance.test.ts` | Prior provenance remains after detach |
| AC-5.3 | TC-5.3a | Story 5 | `tests/service/client/source-management-ui.test.ts` | Unrelated current sources remain visible |
| AC-6.1 | TC-6.1a, TC-6.1b | Story 6 | `tests/service/server/projects-api.test.ts`; `tests/service/server/process-work-surface-api.test.ts` | Durable project/process source state restores on reopen |
| AC-6.2 | TC-6.2a, TC-6.2b | Story 6 | `tests/service/client/source-management-ui.test.ts`; `tests/service/server/source-management-api.test.ts` | Unavailable and revoked access states are safe |
| AC-6.3 | TC-6.3a | Story 6 | `tests/service/server/projects-api.test.ts` | One failing source does not hide healthy sources |

## Integration Path Trace

| Path Segment | Description | Owning Story | Relevant TC | Verifying Test File(s) |
|---|---|---|---|---|
| Path 1.1 | Attach a GitHub repository at project scope from the project shell | Story 1 | TC-1.1a, TC-1.2a | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-attachment-section.test.ts` |
| Path 1.2 | Attach the same repository at process scope without colliding with the project-scoped source | Story 1 | TC-1.1b, TC-1.3c | `tests/service/server/source-management-api.test.ts`; `tests/service/server/source-management-service.test.ts` |
| Path 1.3 | Prevent an exact duplicate attach for the same scope and target ref | Story 1 | TC-1.3a, TC-1.3b | `tests/service/server/source-management-api.test.ts`; `convex/sourceAttachments.test.ts` |
| Path 2.1 | Show source purpose, access mode, and target ref after attach | Story 2 | TC-2.1a, TC-2.3a, TC-2.3b | `tests/service/client/source-attachment-section.test.ts`; `tests/service/client/process-materials-section.test.ts` |
| Path 2.2 | Update target ref and mark a hydrated source stale | Story 2 | TC-2.2a, TC-2.4a | `tests/service/server/source-management-api.test.ts`; `convex/sourceAttachments.test.ts` |
| Path 3.1 | Render stale/not-hydrated/unavailable states with correct recovery affordances | Story 3 | TC-3.1a, TC-3.2a, TC-3.2b, TC-3.2c | `tests/service/client/source-management-ui.test.ts` |
| Path 3.2 | Refresh one recoverable source and keep the rest of the list visible | Story 3 | TC-3.3a, TC-3.3b | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-management-ui.test.ts` |
| Path 4.1 | Record and display sources that informed process work | Story 4 | TC-4.1a, TC-4.1b | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-provenance-section.test.ts` |
| Path 4.2 | Record and display writable source that received durable code updates while excluding read-only write targets | Story 4 | TC-4.2a, TC-4.3a | `tests/service/server/source-management-api.test.ts`; `tests/service/server/source-management-service.test.ts` |
| Path 4.3 | Degrade one provenance entry while keeping healthy provenance entries visible | Story 4 | TC-4.4a, TC-4.4b | `tests/service/server/source-management-api.test.ts`; `tests/service/client/source-provenance-section.test.ts` |
| Path 5.1 | Detach project-scoped and process-scoped sources from future current use | Story 5 | TC-5.1a, TC-5.1b | `tests/service/server/source-management-api.test.ts` |
| Path 5.2 | Detach during active process work without rewriting the hydrated working copy | Story 5 | TC-5.1c | `tests/service/server/process-execution-orchestrator.test.ts` |
| Path 5.3 | Preserve prior provenance and unrelated current sources after detach | Story 5 | TC-5.2a, TC-5.3a | `convex/sourceProvenance.test.ts`; `tests/service/client/source-management-ui.test.ts` |
| Path 6.1 | Reopen project and process surfaces and restore durable source state | Story 6 | TC-6.1a, TC-6.1b | `tests/service/server/projects-api.test.ts`; `tests/service/server/process-work-surface-api.test.ts` |
| Path 6.2 | Show unavailable source safely or block revoked access without leaking source details | Story 6 | TC-6.2a, TC-6.2b | `tests/service/client/source-management-ui.test.ts`; `tests/service/server/source-management-api.test.ts` |
| Path 6.3 | Render healthy sources when one source independently fails | Story 6 | TC-6.3a | `tests/service/server/projects-api.test.ts` |
