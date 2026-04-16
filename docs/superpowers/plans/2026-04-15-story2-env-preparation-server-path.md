# Story 2 — Server-Driven Environment Preparation (Slice 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After start/resume sets `environment.state = preparing`, a real server path must attempt hydration work; on success it publishes `ready`, on failure it publishes `failed` with a blocked reason — both via the process live hub.

**Architecture:** `ProcessStartService` and `ProcessResumeService` gain a `ProcessEnvironmentService` dependency. After accepting the action and returning HTTP 200, they fire-and-forget `envService.kickOffPreparation()`. That method runs `ensureEnvironment` + `hydrateEnvironment` on a `EnvironmentProviderAdapter`, then upserts `ready` or `failed` state and publishes a live update. A `FakeProviderAdapter` is exported from `provider-adapter.ts` for tests.

**Tech Stack:** TypeScript 5, Fastify 5, Vitest, InMemoryPlatformStore, InMemoryProcessLiveHub

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/platform/server/services/processes/environment/provider-adapter.ts` | CREATE | `EnvironmentProviderAdapter` interface + `FakeProviderAdapter` class |
| `apps/platform/server/services/processes/environment/process-environment.service.ts` | CREATE | `ProcessEnvironmentService` with `kickOffPreparation` |
| `apps/platform/server/services/processes/process-start.service.ts` | MODIFY | Add `ProcessEnvironmentService` param; call `kickOffPreparation` |
| `apps/platform/server/services/processes/process-resume.service.ts` | MODIFY | Same as start service |
| `apps/platform/server/app.ts` | MODIFY | Wire `ProcessEnvironmentService` in factory; add to `CreateAppOptions` |
| `tests/service/server/process-live-updates.test.ts` | MODIFY | Add TC-2.3a (preparing→ready) and TC-2.3b (preparing→failed) |

---

## Task 1: Create provider-adapter.ts

**Files:**
- Create: `apps/platform/server/services/processes/environment/provider-adapter.ts`

- [ ] **Step 1: Write the file**

```typescript
export interface EnsureEnvironmentArgs {
  processId: string;
  projectId: string;
}

export interface EnsuredEnvironment {
  environmentId: string;
}

export interface HydrationPlan {
  artifactIds: string[];
  sourceAttachmentIds: string[];
  outputIds: string[];
}

export interface HydrationResult {
  environmentId: string;
  hydratedAt: string;
}

export interface EnvironmentProviderAdapter {
  readonly providerKind: 'daytona' | 'local';
  ensureEnvironment(args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment>;
  hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult>;
}

/**
 * In-memory fake provider for tests and development.
 * Behavior defaults to 'success'. Pass 'failure' to simulate a broken provider.
 */
export class FakeProviderAdapter implements EnvironmentProviderAdapter {
  readonly providerKind = 'local' as const;

  constructor(private readonly behavior: 'success' | 'failure' = 'success') {}

  async ensureEnvironment(args: EnsureEnvironmentArgs): Promise<EnsuredEnvironment> {
    if (this.behavior === 'failure') {
      throw new Error('Fake provider: ensureEnvironment failed for testing.');
    }
    return { environmentId: `fake-env-${args.processId}` };
  }

  async hydrateEnvironment(args: {
    environmentId: string;
    plan: HydrationPlan;
  }): Promise<HydrationResult> {
    return {
      environmentId: args.environmentId,
      hydratedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 2: Verify it compiles (checked in later TypeScript build step)**

---

## Task 2: Create process-environment.service.ts

**Files:**
- Create: `apps/platform/server/services/processes/environment/process-environment.service.ts`

- [ ] **Step 1: Write the file**

```typescript
import type { EnvironmentProviderAdapter } from './provider-adapter.js';
import type { ProcessLiveHub } from '../live/process-live-hub.js';
import type { PlatformStore } from '../../projects/platform-store.js';

export class ProcessEnvironmentService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly providerAdapter: EnvironmentProviderAdapter,
    private readonly processLiveHub: ProcessLiveHub,
  ) {}

  /**
   * Fire-and-forget: runs preparation in the background.
   * Returns immediately. Publishes ready or failed live update when done.
   */
  kickOffPreparation(args: { projectId: string; processId: string }): void {
    this.runPreparation(args).catch(() => {
      // runPreparation's own catch block handles all failures;
      // this outer catch ensures no unhandled-rejection warnings.
    });
  }

  private async runPreparation(args: {
    projectId: string;
    processId: string;
  }): Promise<void> {
    const { projectId, processId } = args;

    try {
      const plan = (await this.platformStore.getProcessHydrationPlan({ processId })) ?? {
        artifactIds: [],
        sourceAttachmentIds: [],
        outputIds: [],
      };

      const ensured = await this.providerAdapter.ensureEnvironment({ processId, projectId });
      const hydrated = await this.providerAdapter.hydrateEnvironment({
        environmentId: ensured.environmentId,
        plan,
      });

      const environment = await this.platformStore.upsertProcessEnvironmentState({
        processId,
        providerKind: this.providerAdapter.providerKind,
        state: 'ready',
        environmentId: hydrated.environmentId,
        blockedReason: null,
        lastHydratedAt: hydrated.hydratedAt,
      });

      this.processLiveHub.publish({
        projectId,
        processId,
        publication: { messageType: 'upsert', environment },
      });
    } catch (err) {
      const blockedReason =
        err instanceof Error ? err.message : 'Preparation failed before the environment became ready.';

      const environment = await this.platformStore.upsertProcessEnvironmentState({
        processId,
        providerKind: this.providerAdapter.providerKind,
        state: 'failed',
        environmentId: null,
        blockedReason,
        lastHydratedAt: null,
      });

      this.processLiveHub.publish({
        projectId,
        processId,
        publication: { messageType: 'upsert', environment },
      });
    }
  }
}
```

---

## Task 3: Modify process-start.service.ts

- [ ] **Step 1: Add `ProcessEnvironmentService` import and constructor param**

After the existing `planHydrationWorkingSet` import, add:
```typescript
import type { ProcessEnvironmentService } from './environment/process-environment.service.js';
```

Change constructor to:
```typescript
constructor(
  private readonly platformStore: PlatformStore,
  private readonly processAccessService: ProcessAccessService,
  private readonly processLiveHub: ProcessLiveHub,
  private readonly processEnvironmentService: ProcessEnvironmentService,
) {}
```

- [ ] **Step 2: Call kickOffPreparation after live publish, before return**

After `this.processLiveHub.publish(...)` and before `return`, add:
```typescript
if (requiresEnvironmentPreparation(result.process.status)) {
  this.processEnvironmentService.kickOffPreparation({
    projectId: access.project.projectId,
    processId: access.process.processId,
  });
}
```

---

## Task 4: Modify process-resume.service.ts

Same pattern as Task 3.

---

## Task 5: Modify app.ts

- [ ] **Step 1: Add imports**

```typescript
import { FakeProviderAdapter } from './services/processes/environment/provider-adapter.js';
import { ProcessEnvironmentService } from './services/processes/environment/process-environment.service.js';
```

- [ ] **Step 2: Add to `CreateAppOptions`**

```typescript
processEnvironmentService?: ProcessEnvironmentService;
```

- [ ] **Step 3: Wire in `createApp`**

After `processLiveHub` is assigned:
```typescript
const processEnvironmentService =
  options.processEnvironmentService ??
  new ProcessEnvironmentService(platformStore, new FakeProviderAdapter(), processLiveHub);
```

Pass to start and resume service constructors:
```typescript
new ProcessStartService(platformStore, processAccessService, processLiveHub, processEnvironmentService)
new ProcessResumeService(platformStore, processAccessService, processLiveHub, processEnvironmentService)
```

---

## Task 6: Add tests to process-live-updates.test.ts

Two new `it` blocks inside the existing `describe`:

**TC-2.3a**: Call start → fake provider succeeds → assert live `environment.state = 'ready'`
**TC-2.3b**: Call start → fake provider fails → assert live `environment.state = 'failed'` with blocked reason

Both tests:
1. Build a store seeded with a draft process
2. Create a `ProcessEnvironmentService` with the desired fake adapter
3. Build app passing `processEnvironmentService`
4. Listen on ephemeral port
5. Subscribe WebSocket
6. POST start action
7. `waitFor` environment message with expected state
8. Close socket + app

---

## Test Commands

```bash
# Run focused tests
corepack pnpm vitest run tests/service/server/process-live-updates.test.ts
corepack pnpm vitest run tests/service/server/process-actions-api.test.ts

# Full verify
corepack pnpm run verify
```
