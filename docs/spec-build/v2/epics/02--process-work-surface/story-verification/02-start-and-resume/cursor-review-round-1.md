# Story 2 Start and Resume — Cursor Review

Materialized by the orchestrator from the saved Cursor session output because the helper did not emit a ready-to-save review file directly.

## VERDICT: REVISE

Cursor's second-opinion review landed on `REVISE`.

## Core Cursor Position

Highest-signal concerns:

1. Client-side stale-action failure handling is incomplete.
   - `PROCESS_ACTION_NOT_AVAILABLE` should surface as an inline action error while preserving the current surface.
   - `startCurrentProcess` / `resumeCurrentProcess` currently have no client-side recovery path for a rejected action.

2. AC-2.4 evidence is only partial.
   - waiting / completed / failed / interrupted transitions are exercised in the reducer-level `process-live.test.ts`
   - but not proven at the page level after an action flow
   - the `paused` settled-state branch is also missing from the current reducer test matrix

## Cursor Notes

- Cursor did not independently run the shell gate in its own runtime, but it inspected the spec artifacts, implementation, and tests and still concluded the story should be revised.
- Cursor treated Story 2's use of shared live-message reducer semantics as reasonable for vocabulary reuse, but weaker than a full page-level proof of AC-2.4.
- Cursor did not see Story 3 scope creep as the main issue.
