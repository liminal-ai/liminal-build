# Story 4 Fix List Round 2

- [x] Add a real durable write path for current material refs instead of relying on seeded in-memory state.
- [x] Add a real durable write path for current outputs with exact-set replacement semantics.
- [x] Preserve `linkedArtifactId` through the write/read path so dedupe stays identity-based.
- [x] Add direct Convex tests that prove current-material and current-output writes, replacements, and empty-state clearing.
- [x] Put the Convex durability tests into the standard verify lane.
