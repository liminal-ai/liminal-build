# Epic 1 Tech Design Decision Memo

## Purpose

This memo records the pre-draft decisions, research grounding, and remaining
discussion items for the Project and Process Shell tech design. It is the
bridge between the Epic 1 spec and the first full tech design draft.

Research was checked on 2026-04-13 using:

- Official docs for Node, Fastify, WorkOS, and related platform references
- `npm view` for current package versions, engine ranges, and peer dependency
  compatibility
- Local reference repos in this workspace: `liminaldb`, `mdv`,
  `liminal-builder`, `liminal-context`, and `pi-mono`

## Status Model

- **Lock now**: Strong recommendation for the first draft unless product or
  architecture explicitly redirects it
- **Spike / discuss**: Recommendation exists, but a short technical spike or a
  product/architecture call should happen before the decision is treated as
  final
- **Defer**: Intentionally out of scope for Epic 1 draft depth

## Recommended Decisions to Lock Now

| Topic | Recommendation | Status | Rationale |
|-------|----------------|--------|-----------|
| Tech design document shape | Use Config B: `tech-design.md`, `tech-design-client.md`, `tech-design-server.md`, `test-plan.md` | Lock now | Epic 1 is a true client + server slice. Forcing it into one index would make the index too dense and make story sharding harder. |
| Runtime line | Use Node.js 24 Active LTS | Lock now | This matches the core platform architecture and is currently a production-safe LTS line. |
| Package manager | Use `pnpm` 10.x with a workspace from day one | Lock now | This is a greenfield multi-surface repo. `pnpm` gives a cleaner workspace model than `npm` without introducing Bun runtime variance into a Node-first platform. |
| Language | Use TypeScript 6.0.x | Lock now | Current stable line. Matches the platform architecture and keeps the stack current without adopting beta tooling. |
| Server framework | Use Fastify 5.8.x | Lock now | Matches the architecture and current stable v5 line. |
| Client build tool | Use Vite 8.0.x | Lock now | Matches the architecture and current stable line; engine requirements are compatible with Node 24. |
| Fastify + Vite integration | Use `@fastify/vite` 9.x as the explicit integration layer | Lock now | The project should be specific, not tool-agnostic. `@fastify/vite` is Fastify-first and designed for full-stack monoliths with Fastify in control of frontend attachment. |
| Route schema strategy | Use Zod-authored shared contracts plus `fastify-type-provider-zod` for Fastify route validation/serialization | Lock now | This gives one source of truth for browser/server contracts while preserving strong Fastify route inference and validation. |
| Client framework stance | Use a Vite-built vanilla TypeScript client for Epic 1; do not add React yet | Lock now | Epic 1 is a shell/list/bootstrap slice, not a component-heavy app. `mdv` already demonstrates a modular vanilla TS shell pattern that fits this scope. |
| Auth implementation | Use server-side WorkOS AuthKit flow through `@workos-inc/node` with sealed session cookies | Lock now | This keeps Fastify as the real auth boundary and avoids splitting auth responsibility between server and client. |
| WorkOS setup workflow | Use the WorkOS CLI (`npx workos@latest`) for AuthKit configuration and environment setup, then adapt the generated Node/Express-oriented scaffolding to Fastify | Lock now | WorkOS now ships an official CLI installer. Current docs list Node.js / Express support, not Fastify-specific support, so the CLI should bootstrap configuration while Fastify integration remains app-owned. |
| Client auth SDK | Do not add `@workos-inc/authkit-js` in Epic 1 | Lock now | The client only needs bootstrap user state and authenticated API access. Client-side AuthKit is unnecessary until there is a true client-owned auth surface. |
| Role model | Use WorkOS for authenticated identity only; keep project owner/member authorization in app-owned durable tables | Lock now | The platform needs project-scoped authorization. WorkOS session claims are useful context, but project membership should remain a platform concern. |
| WorkOS environments | Use separate WorkOS environments/workspaces for `local`, `staging`, and `prod` | Lock now | This matches the current operating model already in use and keeps local auth isolated from cloud deployments. |
| Route model | Use `/projects` and `/projects/:projectId` as primary shell routes, with optional `?processId=` for selected process state | Lock now | This matches the epic's route-derived selected-process stance and avoids prematurely introducing a deeper process route before Epic 2. |
| Shell selection persistence | Keep selected process state route-derived only in Epic 1 | Lock now | This is explicitly settled by the epic and reduces server-side state complexity in the first cut. |
| Project shell partial failures | Use one aggregated project-shell bootstrap endpoint that returns per-section envelopes: `processes`, `artifacts`, and `sourceAttachments` each carry `status`, `items`, and optional `error`; return HTTP `200` when project identity/access succeeds, and reserve request failure codes for auth/access/not-found failures | Lock now | This is the cleanest way to satisfy the epic's partial-failure requirements without forcing client fan-out. It should be documented as a design-time clarification/deviation from the epic's simpler array-only contract. |
| Artifact/source attachment context | Include minimal origin context in shell summaries: project-level vs process-level attachment, plus process label when the item is tied to a specific process | Lock now | Without this, the shell becomes ambiguous once a project has multiple processes. The shell does not need full drill-down, but it does need enough context to answer "why is this here?" |
| Process display-label strategy | Auto-generate process display labels at creation time using process type plus project-local sequence or equivalent durable distinguisher; do not add manual naming UX in Epic 1 | Lock now | The shell needs durable, distinguishable labels immediately, but asking the user to name processes would add friction and extra UX surface before Epic 2. |
| Process summary derivation | Process modules should expose a shell-summary projection contract for `phaseLabel`, `status`, and `nextActionLabel` | Lock now | The generic shell should not read process-specific state fields directly. |
| List scaling | Do not add pagination or virtualization in Epic 1 | Lock now | The Epic 1 NFR targets are modest enough for sorted in-memory lists. Keep the list modules isolated so virtualization can be added later if data proves it necessary. |
| Logout UX | Include sign-out UX in Epic 1 shell chrome using a server-owned logout route with Fastify-native CSRF protection | Lock now | Authenticated entry and durable shell chrome should include a complete sign-out path in the first shell pass, and the CSRF implementation should match the Fastify stack directly. |
| Convex environments | Use `local` Convex per developer workstation, plus shared `staging` and `prod` Convex environments in the cloud | Lock now | This is an environment model, not a team preference. It matches how two developers can work independently while still having shared staging and production backends. |
| Environment setup posture | Assume first-time local environment setup may require high-touch human assistance during implementation | Lock now | The initial implementation should not assume a fully unattended bootstrap. Local Convex has historically involved interactive CLI moments, and WorkOS CLI/auth callback setup plus secret provisioning may also require manual coordination and validation. |
| Live transport scope | Do not implement WebSocket or live-upsert transport in Epic 1 | Lock now | Live process updates belong to the active process surface in Epic 2+. Epic 1 can stay request/response only. |
| MCP scope | Do not add MCP SDK wiring in Epic 1 | Defer | MCP is a later platform seam, not required for project/process shell stand-up. |
| Managed provider scope | Do not design Daytona or Cloudflare provider details into Epic 1 | Defer | Environment/provider seams belong to Epic 3. |

## Recommended Decisions That Need a Spike or Discussion

At this point, no additional stack or product-shape decisions need to block the
first tech design draft. Any new questions that arise should be captured in the
tech design's `Issues Found` or `Open Questions` sections rather than delaying
the first draft.

## Current Research Grounding

### Core Runtime and Tooling

| Area | Current Signal | Recommended Line | Notes |
|------|----------------|------------------|-------|
| Node.js | Official Node releases page lists `v24` as Active LTS and `v24.14.1` as latest LTS | `24.14.x` | Good fit with the platform architecture. |
| TypeScript | `npm view typescript version` → `6.0.2` | `6.0.x` | Stable current line. |
| `@types/node` | `npm view @types/node version` → `25.6.0` | `25.6.x` | Keeps the monorepo aligned with the Node 24 runtime line. |
| pnpm | `npm view pnpm version` → `10.33.0` | `10.x` | Good workspace fit for a greenfield multi-surface repo. |
| Biome | `npm view @biomejs/biome version` → `2.4.11` | `2.4.x` | Recommended over starting with ESLint + Prettier split tooling. |
| `tsx` | `npm view tsx version` → `4.21.0`; engines `>=18` | `4.21.x` | Good fit for the TypeScript Fastify dev runner without adding a separate compile/watch loop. |
| ESLint | `npm view eslint version` → `10.2.0` | Defer | Keep out of the first cut unless Biome proves insufficient for a required rule. |
| Prettier | `npm view prettier version` → `3.8.2` | Defer | Same reason as ESLint. |

### App Stack

| Area | Current Signal | Recommended Line | Notes |
|------|----------------|------------------|-------|
| Fastify | `npm view fastify version` → `5.8.4` | `5.8.x` | Architecture-aligned control plane. |
| Vite | `npm view vite version` → `8.0.8`; `npm view vite engines` → `^20.19.0 || >=22.12.0` | `8.0.x` | Compatible with Node 24. |
| Vitest | `npm view vitest version` → `4.1.4`; engines include Node 20/22/24 lines | `4.1.x` | Good fit for both server and client service-mock testing. |
| Playwright | `npm view @playwright/test version` → `1.59.1`; engines `>=18` | `1.59.x` | Good for a thin e2e layer and manual smoke support. |
| jsdom | `npm view jsdom version` → `29.0.2` | `29.x` | Useful if the client remains vanilla TS instead of React. |
| Testing Library DOM | `npm view @testing-library/dom version` → `10.4.1` | `10.4.x` | Optional, but a good fit for user-visible DOM assertions in vanilla-client tests. |
| MSW | `npm view msw version` → `2.13.2` | Defer | Useful for local/manual mock mode; not required for the first draft. |

### Data, Auth, and Contracts

| Area | Current Signal | Recommended Line | Notes |
|------|----------------|------------------|-------|
| Convex | `npm view convex version` → `1.35.1` | `1.35.x` | Matches the platform architecture's durable-state stance. |
| Zod | `npm view zod version` → `4.3.6` | `4.3.x` | Current stable line. |
| fastify-type-provider-zod | `npm view fastify-type-provider-zod version` → `6.1.0`; peer deps require `fastify ^5.5.0` and `zod >=4.1.5` | `6.1.x` | Clean fit with Fastify 5 + Zod 4. |
| Zod contract authoring stance | Author shared browser/server contracts as Zod schemas first, export inferred TS types from those schemas, and import `z` from `zod/v4` | Lock now | This keeps validation and type inference aligned and avoids parallel hand-written interface drift. |
| Fastify type-provider usage | Re-apply `withTypeProvider<ZodTypeProvider>()` at route/plugin scope rather than assuming it propagates globally | Lock now | Fastify type providers are scope-local; documenting this now prevents inference loss across plugin boundaries. |
| `fastify-plugin` | `npm view fastify-plugin version` → `5.1.0` | `5.1.x` | Small but useful addition for typed internal plugins and decorations in the Fastify app. |
| WorkOS Node SDK | `npm view @workos-inc/node version` → `8.12.1`; engines `>=20.15.0` | `8.12.x` | Good fit with Node 24 and server-owned auth. |
| WorkOS AuthKit JS SDK | WorkOS docs list `v0.20.0` as latest as of 2026-03-24 | Defer in Epic 1 | Not needed if the client does not own auth. |
| `@fastify/cookie` | `npm view @fastify/cookie version` → `11.0.2` | `11.0.x` | Likely addition if using sealed session cookies with Fastify. |
| `@fastify/csrf-protection` | `npm view @fastify/csrf-protection version` → `7.1.0` | `7.1.x` if logout ships | Better fit than `csrf-csrf` because it is Fastify-native and integrates directly with `@fastify/cookie`. |
| `@fastify/swagger` + `openapi-types` | `npm view @fastify/swagger version` → `9.7.0`; `npm view openapi-types version` → `12.1.3` | Defer unless API docs are added in Epic 1 | `fastify-type-provider-zod` lists them as peers for its Swagger integration, but Epic 1 does not need OpenAPI output yet. |
| `@fastify/websocket` | `npm view @fastify/websocket version` → `11.2.0` | Defer | Not needed for Epic 1's request/response shell. |
| MCP SDK | `npm view @modelcontextprotocol/sdk version` → `1.29.0` | Defer | Future platform seam, not shell-first scope. |

## Reference-System Adoption Cut Line

| Reference | Keep | Do Not Keep |
|-----------|------|-------------|
| `liminaldb` | Auth middleware patterns, Fastify-served shell bootstrap, role-aware access handling | The iframe/module-frame shell as the default app composition |
| `mdv` | Modular vanilla TS app-shell composition, client state-store ideas, verification-script discipline | The current esbuild-based build pipeline and document-viewer-specific module structure |
| `liminal-builder` | Typed stream/upsert concepts for later epics | Any Epic 1 dependency on live transcript transport |
| `liminal-context` | Archive-vs-derived-view thinking for later epics | Any attempt to pull archive/chunk infrastructure into Epic 1 |
| `pi-mono` | Runtime/provider inspiration for later epic research | Any wholesale UI or runtime adoption in Epic 1 |

## Proposed Design Direction for the First Draft

The first draft should assume one integrated Fastify-owned app surface. Fastify
handles auth, shell-page delivery, API routes, and server-owned bootstrap data.
The client is a Vite-built vanilla TypeScript app that mounts into a single
shell root through `@fastify/vite` and manages:

- project index rendering
- project shell routing and restoration
- selected-process focus state
- section-level empty, error, and unavailable states

Server-side design should assume one durable read model for the project shell
that can return project identity plus summary projections for processes,
artifacts, and source attachments. The shell should treat those summaries as
projection data, not raw storage shapes. The bootstrap response should use
per-section status envelopes so the shell can render partial failures without
falling back to client fan-out.

The testing plan should assume:

- Fastify `inject()` service-mock tests for auth, access control, project create,
  project shell reads, process create, and unavailable states
- Client service-mock tests at the page/module entry points with mocked API
  boundaries
- A thin Playwright layer for critical shell paths after the app exists
- Verification scripts defined on day one: `red-verify`, `verify`,
  `green-verify`, and `verify-all`

## Questions to Discuss Before Drafting

1. Do we want to accept a design-time deviation from the epic's current project
   shell response contract so the aggregated bootstrap can express section-level
   partial failures cleanly? Current recommendation: yes.

## Questions to Keep Open but Not Block the Draft

These should stay visible in the design, but they should not prevent drafting:

- Exact file tree and workspace package split
- Exact naming of the client state store and server summary-projection modules
- Whether the first shell styles use CSS modules or plain colocated CSS files
- Whether dev-only mock handlers are added in the first implementation pass or
  after core service-mock tests exist

## Source Notes

Key official sources used in this memo:

- Node.js releases: [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases)
- Fastify LTS: [fastify.dev/docs/latest/Reference/LTS](https://fastify.dev/docs/latest/Reference/LTS/)
- Vite releases and guide: [vite.dev/releases](https://vite.dev/releases) and [vite.dev/guide](https://vite.dev/guide/)
- WorkOS AuthKit vanilla Node guide: [workos.com/docs/authkit/vanilla/nodejs](https://workos.com/docs/authkit/vanilla/nodejs)
- WorkOS AuthKit JS SDK releases: [workos.com/docs/sdks/authkit-js](https://workos.com/docs/sdks/authkit-js)
- WorkOS AuthKit + FGA roles: [workos.com/docs/fga/authkit-integration](https://workos.com/docs/fga/authkit-integration)
- Convex docs: [docs.convex.dev](https://docs.convex.dev)

Package versions and engine ranges were checked from the npm registry on
2026-04-13 via `npm view`.
