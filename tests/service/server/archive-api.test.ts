import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  buildProcessArchiveApiPath,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  degradedArchiveEntryFixture,
  modelArchiveEntryFixture,
  readyArchivePageFixture,
  userArchiveEntryFixture,
} from '../../fixtures/archive.js';
import { lostEnvironmentFixture } from '../../fixtures/process-environment.js';
import { completedProcessFixture } from '../../fixtures/processes.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_archive_api',
        cookiePassword: 'story3-archive-api-cookie-password-12345',
        redirectUri: 'http://localhost:5001/auth/callback',
        loginReturnUri: 'http://localhost:5001/projects',
      });
    }

    override async resolveSession(): Promise<SessionResolution> {
      return resolution;
    }
  }

  return new TestAuthSessionService();
}

const actor = {
  userId: 'workos-user-archive-1',
  workosUserId: 'workos-user-archive-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectId = userArchiveEntryFixture.projectId;
const processId = userArchiveEntryFixture.processId;

const projectSummary = projectSummarySchema.parse({
  projectId,
  name: 'Archive Story Project',
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
  displayLabel: 'Archive replay process',
  updatedAt: '2026-05-05T09:05:00.000Z',
});

function buildStore(
  args: {
    access?: 'accessible' | 'forbidden' | 'project_not_found';
    includeProcess?: boolean;
    archiveEntries?: Array<(typeof readyArchivePageFixture.entries)[number]>;
    environmentLost?: boolean;
  } = {},
) {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      [`user:${actor.workosUserId}`]: args.access === 'accessible' ? [projectSummary] : [],
    },
    projectAccessByProjectId: {
      [projectId]:
        args.access === 'forbidden'
          ? { kind: 'forbidden' as const }
          : args.access === 'project_not_found'
            ? { kind: 'not_found' as const }
            : {
                kind: 'accessible' as const,
                project: projectSummary,
              },
    },
    processesByProjectId: {
      [projectId]: args.includeProcess === false ? [] : [processSummary],
    },
    archiveEntriesByProcessId: {
      [processId]: args.archiveEntries ?? readyArchivePageFixture.entries,
    },
    processEnvironmentSummariesByProcessId: args.environmentLost
      ? {
          [processId]: lostEnvironmentFixture,
        }
      : undefined,
  });
}

async function buildArchiveApp(
  store: InMemoryPlatformStore,
  resolution: SessionResolution = {
    actor,
    reason: null,
  },
) {
  return buildApp({
    authSessionService: createTestAuthSessionService(resolution),
    authUserSyncService: new AuthUserSyncService(store),
    platformStore: store,
  });
}

describe('archive API', () => {
  it('TC-3.2a archive survives reload', async () => {
    const store = buildStore();
    const app = await buildArchiveApp(store);
    const url = buildProcessArchiveApiPath({ projectId, processId });

    const first = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const second = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toEqual(second.json());
    expect(first.json()).toMatchObject({
      entries: readyArchivePageFixture.entries,
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    await app.close();
  });

  it('TC-3.2b archive survives environment loss', async () => {
    const store = buildStore({
      environmentLost: true,
      archiveEntries: [userArchiveEntryFixture, modelArchiveEntryFixture],
    });
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entries: [userArchiveEntryFixture, modelArchiveEntryFixture],
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    await app.close();
  });

  it('TC-3.3a unauthorized archive read blocked', async () => {
    const store = buildStore({
      access: 'forbidden',
    });
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      code: 'PROJECT_FORBIDDEN',
      message: 'You do not have access to this process.',
      status: 403,
    });

    await app.close();
  });

  it('TC-3.3b missing process archive read returns not found', async () => {
    const store = buildStore({
      includeProcess: false,
    });
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: 'PROCESS_NOT_FOUND',
      message: 'The requested process could not be found.',
      status: 404,
    });

    await app.close();
  });

  it('TC-3.4a degraded entry displayed with healthy entries', async () => {
    const store = buildStore({
      archiveEntries: [userArchiveEntryFixture, degradedArchiveEntryFixture],
    });
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      entries: [
        expect.objectContaining({
          archiveEntryId: userArchiveEntryFixture.archiveEntryId,
          entryStatus: 'ready',
        }),
        expect.objectContaining({
          archiveEntryId: degradedArchiveEntryFixture.archiveEntryId,
          entryStatus: 'degraded',
          degradationReason: degradedArchiveEntryFixture.degradationReason,
        }),
      ],
    });

    await app.close();
  });

  it('invalid archive query returns INVALID_ARCHIVE_REQUEST', async () => {
    const store = buildStore();
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'GET',
      url: `${buildProcessArchiveApiPath({ projectId, processId })}?cursor=banana`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: 'INVALID_ARCHIVE_REQUEST',
      message: 'Archive pagination parameters were invalid.',
      status: 422,
    });

    await app.close();
  });
});
