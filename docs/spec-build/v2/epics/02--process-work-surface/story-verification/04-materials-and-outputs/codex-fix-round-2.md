# Story 4 Fix Round 2

## Objective

Close the remaining blocker from the post-fix review: the reader/bootstrap path was now correct, but the app still lacked real durable writer surfaces for current material refs and current outputs outside seeded in-memory tests.

## Changes Made

- added `processes:setCurrentProcessMaterialRefs` to persist the exact current artifact/source set with same-project validation
- added `processOutputs:replaceCurrentProcessOutputs` to replace the exact current output set, preserve `linkedArtifactId`, and delete stale omitted rows
- exposed both writers through `PlatformStore` so future process modules have a real server-side path to call
- added direct Convex tests for exact-set write/read, stale clearing, linked-artifact preservation, output replacement, and cross-project rejection
- added `test:convex` and folded it into `pnpm run verify` so the durable layer is part of the standard gate

## Verification

- `corepack pnpm run verify` -> PASS

## Result

The Story 4 blocker is closed: current materials and outputs now have shipped durable writer paths plus direct Convex-layer verification, rather than depending only on seeded `InMemoryPlatformStore` state in service tests.
