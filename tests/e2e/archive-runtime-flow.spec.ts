import { expect, test } from '@playwright/test';
import {
  AuthSessionService,
  type SessionResolution,
} from '../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../apps/platform/shared/contracts/index.js';
import {
  degradedArchiveEntryFixture,
  readyArchivePageFixture,
  readyArchiveTurnPageFixture,
  readyDerivedArchiveViewsFixture,
} from '../fixtures/archive.js';
import { completedProcessFixture } from '../fixtures/processes.js';
import { buildApp } from '../utils/build-app.js';

const actor = {
  userId: 'workos-user-e2e-archive-1',
  workosUserId: 'workos-user-e2e-archive-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectId = readyArchivePageFixture.entries[0]?.projectId ?? 'project-archive-001';
const processId = readyArchivePageFixture.entries[0]?.processId ?? 'process-archive-001';

class E2EAuthSessionService extends AuthSessionService {
  constructor(private readonly resolution: SessionResolution) {
    super({
      workosClient: {} as never,
      clientId: 'client_e2e_archive',
      cookiePassword: 'e2e-archive-cookie-password-12345',
      redirectUri: 'http://localhost:5001/auth/callback',
      loginReturnUri: 'http://localhost:5001/projects',
    });
  }

  override async resolveSession(): Promise<SessionResolution> {
    return this.resolution;
  }
}

test('renders archive, turns, and derived views through the browser runtime', async ({ page }) => {
  const priorRuntimeMode = process.env.LIMINAL_VITE_RUNTIME_MODE;
  process.env.LIMINAL_VITE_RUNTIME_MODE = 'production';

  const projectSummary = projectSummarySchema.parse({
    projectId,
    name: 'Archive E2E Project',
    ownerDisplayName: 'Lee Moore',
    role: 'owner',
    processCount: 1,
    artifactCount: 0,
    sourceAttachmentCount: 0,
    lastUpdatedAt: '2026-05-05T09:00:00.000Z',
  });
  const processSummary = processSummarySchema.parse({
    ...completedProcessFixture,
    processId,
    displayLabel: 'Archive E2E process',
    updatedAt: '2026-05-05T09:05:00.000Z',
  });
  const store = new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      [`user:${actor.workosUserId}`]: [projectSummary],
    },
    projectAccessByProjectId: {
      [projectId]: {
        kind: 'accessible',
        project: projectSummary,
      },
    },
    processesByProjectId: {
      [projectId]: [processSummary],
    },
    archiveEntriesByProcessId: {
      [processId]: readyArchivePageFixture.entries,
    },
    derivedArchiveViewsByProcessId: {
      [processId]: readyDerivedArchiveViewsFixture.views,
    },
  });
  const app = await buildApp({
    authSessionService: new E2EAuthSessionService({
      actor,
      reason: null,
    }),
    authUserSyncService: new AuthUserSyncService(store),
    platformStore: store,
  });

  try {
    await app.listen({
      port: 0,
      host: '127.0.0.1',
    });
    const address = app.server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected Fastify to listen on a TCP address in e2e test.');
    }

    await page.goto(
      `http://127.0.0.1:${address.port}/projects/${projectId}/processes/${processId}/archive`,
    );

    await expect(page.locator('[data-process-archive-page="true"]')).toBeVisible();
    await expect(page.getByText('Archive E2E process archive')).toBeVisible();
    await expect(page.getByText('Please continue with the archive implementation.')).toBeVisible();
    await expect(
      page.locator(`[data-archive-turn-id="${readyArchiveTurnPageFixture.turns[0]?.turnId}"]`),
    ).toBeVisible();
    await expect(
      page.locator(
        `[data-derived-archive-view-id="${readyDerivedArchiveViewsFixture.views[0]?.derivedViewId}"]`,
      ),
    ).toBeVisible();
    await expect(page.locator('[data-archive-degradation-reason="true"]').first()).toContainText(
      degradedArchiveEntryFixture.degradationReason ?? '',
    );
  } finally {
    await app.close();

    if (priorRuntimeMode === undefined) {
      delete process.env.LIMINAL_VITE_RUNTIME_MODE;
    } else {
      process.env.LIMINAL_VITE_RUNTIME_MODE = priorRuntimeMode;
    }
  }
});
