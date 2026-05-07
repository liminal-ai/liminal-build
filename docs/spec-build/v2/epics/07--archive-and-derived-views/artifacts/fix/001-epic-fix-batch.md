# Epic Fix Batch

- APPROVED: Address `CANON-N005` in `apps/platform/server/services/archive/archive-finalization.service.ts` by aligning `appendFinalizedEntry` handling with the epic schema's optional `sourceObjectId` contract for entry kinds where it is legitimately nullable. Keep the fix bounded to this validation/normalization path.

- APPROVED: Address `CANON-N008` in `apps/platform/server/services/archive/turn-derivation.service.ts` by removing the redundant `hasStoredTurns` round-trip after `storedPage.turns.length === 0` is already known.

- APPROVED: Address `CANON-N009` in `apps/platform/server/routes/archive.ts` by removing the `void archiveRoutePatterns;` dead statement and keeping the route module clean without no-op runtime code.
