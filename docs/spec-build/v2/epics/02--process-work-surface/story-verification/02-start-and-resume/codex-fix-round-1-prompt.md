You are the implementer for Story 2 fix-routing round 1 in `/Users/leemoore/code/liminal-build`.

You are not alone in the codebase. Do not revert edits you did not make. Work only on the bounded Story 2 fix list below.

Read these artifacts:
1. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/stories/02-start-and-resume.md
2. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/verification-bundle.md
3. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/codex-review.md
4. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/cursor-review.md
5. /Users/leemoore/code/liminal-build/docs/spec-build/v2/epics/02--process-work-surface/story-verification/02-start-and-resume/fix-list-round-1.md

Implement only these bounded fixes:

1. Add coherent client-side handling for stale-action `409 PROCESS_ACTION_NOT_AVAILABLE`
- preserve the current process surface
- surface an inline / in-surface action error
- add client test coverage

2. Strengthen Story 2 evidence for AC-2.4 resulting-state visibility
- add the missing `paused` settled-state coverage if Story 2 still owns it
- strengthen proof of resulting-state visibility at the accepted Story 2 boundary
- do not implement full Story 6 live transport

Constraints:
- stay within Story 2 scope
- do not implement Story 3 response submission
- do not implement Story 6 reconnect/live transport

Run the Story 2 gate before finishing:
corepack pnpm run red-verify && corepack pnpm run test:service && corepack pnpm run test:client

In your final answer, output exactly:

PLAN
CHANGES
TESTS
GATE_RESULT
RESIDUAL_RISKS
SPEC_DEVIATIONS
OPEN_QUESTIONS

Then list exact changed file paths.
