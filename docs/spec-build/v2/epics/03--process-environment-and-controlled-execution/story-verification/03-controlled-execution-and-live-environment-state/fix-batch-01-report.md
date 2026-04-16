# CHANGES

- `apps/platform/server/services/processes/environment/process-environment.service.ts`
  Rationale: captured the current durable process row once at execution start via the existing `platformStore.getProcessRecord(...)` seam, then included `process: buildProcessSurfaceSummary(currentProcess, nextEnvironment)` in all three execution-lane live republishes (`running`, `checkpointing`, and both `failed` paths) without changing durable process status behavior.
- `tests/service/client/process-live.test.ts`
  Rationale: added the required AC-3.4 in-session recovery regression proving a paired `process` + `environment` publication enables `rehydrate` and `rebuild` without reload, and split the two small isolation checks into their own standalone tests.
- `docs/spec-build/v2/epics/03--process-environment-and-controlled-execution/story-verification/03-controlled-execution-and-live-environment-state/fix-batch-01-report.md`
  Rationale: recorded the fix-batch evidence and gate results requested by the batch spec.

# TESTS_ADDED

- `TC-3.4b execution failure republishes recovery controls without refetch`
- `environment updates do not wipe unrelated history state`
- `environment updates do not wipe unrelated materials state`
- Item 3 status: done. The isolation assertions already existed inside `TC-3.4a`, so they were split out as additive standalone tests without changing the existing Story 3 assertions.

# FOCUSED_RUN_RESULT

```text

 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  2 passed (2)
      Tests  33 passed (33)
   Start at  20:50:22
   Duration  611ms (transform 140ms, setup 0ms, import 530ms, tests 314ms, environment 0ms)
```

# GATE_RESULT

passed

```text


 Test Files  11 passed (11)
      Tests  86 passed (86)
   Start at  20:50:08
   Duration  718ms (transform 1.01s, setup 0ms, import 2.98s, tests 858ms, environment 1ms)


> liminal-build@ test:client /Users/leemoore/code/liminal-build
> corepack pnpm exec vitest run tests/service/client --environment jsdom


 RUN  v4.1.4 /Users/leemoore/code/liminal-build


 Test Files  19 passed (19)
      Tests  138 passed (138)
   Start at  20:50:09
   Duration  1.18s (transform 1.34s, setup 0ms, import 2.77s, tests 621ms, environment 9.24s)
```

# PRE_EXISTING_ASSERTIONS_PRESERVED

- Confirmed: no existing Story 2 or red-phase assertions were modified or weakened.
- Intentional test modifications: additive only. Added helper setup plus three new tests in `tests/service/client/process-live.test.ts`; existing Story 3 assertions, mocks, and expectations were left intact.
