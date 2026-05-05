import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  archiveEntrySchema,
  buildProcessArchiveApiPath,
  buildProcessDerivedArchiveViewsApiPath,
  buildProcessDerivedArchiveViewsRefreshApiPath,
  processSummarySchema,
  projectSummarySchema,
  type ArchiveEntry,
  type DerivedArchiveView,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  modelArchiveEntryFixture,
  processEventArchiveEntryFixture,
  readyDerivedArchiveViewsFixture,
  toolCallArchiveEntryFixture,
  toolResultArchiveEntryFixture,
  turnRangeDerivedArchiveViewFixture,
  userArchiveEntryFixture,
} from '../../fixtures/archive.js';
import { completedProcessFixture } from '../../fixtures/processes.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_derived_archive_views',
        cookiePassword: 'story5-derived-views-cookie-password-12345',
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
  userId: 'workos-user-derived-views-1',
  workosUserId: 'workos-user-derived-views-1',
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

function makeArchiveEntry(base: ArchiveEntry, overrides: Partial<ArchiveEntry>): ArchiveEntry {
  return archiveEntrySchema.parse({
    ...base,
    projectId,
    processId,
    ...overrides,
  });
}

function buildHappyPathArchiveEntries(): ArchiveEntry[] {
  return [
    makeArchiveEntry(userArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-user-401',
      finalizationKey: 'response:history-user-401',
      sourceObjectId: 'history-user-401',
      sequence: 0,
      recordedAt: '2026-05-01T12:40:00.000Z',
    }),
    makeArchiveEntry(modelArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-model-401',
      finalizationKey: 'model:message-401',
      sourceObjectId: 'message-401',
      sequence: 1,
      recordedAt: '2026-05-01T12:40:01.000Z',
    }),
    makeArchiveEntry(toolCallArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-tool-call-401',
      finalizationKey: 'tool:search:call:401',
      sourceObjectId: 'tool-call-401',
      relatedToolCallId: 'tool-call-401',
      sequence: 2,
      recordedAt: '2026-05-01T12:40:02.000Z',
    }),
    makeArchiveEntry(toolResultArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-tool-result-401',
      finalizationKey: 'tool:search:result:401',
      sourceObjectId: 'tool-result-401',
      relatedToolCallId: 'tool-call-401',
      sequence: 3,
      recordedAt: '2026-05-01T12:40:03.000Z',
    }),
    makeArchiveEntry(userArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-user-402',
      finalizationKey: 'response:history-user-402',
      sourceObjectId: 'history-user-402',
      bodyText: 'Please regroup the archive views.',
      sequence: 4,
      recordedAt: '2026-05-01T12:41:00.000Z',
    }),
    makeArchiveEntry(processEventArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-event-402',
      finalizationKey: 'event:402',
      sourceObjectId: 'event-402',
      relatedArtifactVersionId: null,
      relatedSourceProvenanceId: null,
      sequence: 5,
      recordedAt: '2026-05-01T12:41:02.000Z',
    }),
  ];
}

function buildStore(
  args: { archiveEntries?: ArchiveEntry[]; derivedViews?: DerivedArchiveView[] } = {},
) {
  return new InMemoryPlatformStore({
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
      [processId]: args.archiveEntries ?? buildHappyPathArchiveEntries(),
    },
    derivedArchiveViewsByProcessId:
      args.derivedViews === undefined ? undefined : { [processId]: args.derivedViews },
  });
}

async function buildDerivedViewsApp(store: InMemoryPlatformStore) {
  return buildApp({
    authSessionService: createTestAuthSessionService({
      actor,
      reason: null,
    }),
    authUserSyncService: new AuthUserSyncService(store),
    platformStore: store,
  });
}

class ConflictDuringDerivedViewRefreshStore extends InMemoryPlatformStore {
  private mutated = false;

  override async replaceDerivedArchiveViews(args: {
    projectId: string;
    processId: string;
    views: DerivedArchiveView[];
  }): Promise<void> {
    if (!this.mutated) {
      this.mutated = true;
      await this.appendArchiveEntry({
        projectId: args.projectId,
        processId: args.processId,
        entryKind: 'process_event',
        finalizationKey: 'event:derived-refresh-conflict',
        sourceObjectId: 'event-derived-refresh-conflict',
        bodyFormat: 'none',
        recordedAt: '2026-05-01T12:42:00.000Z',
      });
    }

    await super.replaceDerivedArchiveViews(args);
  }
}

class StoredDerivedViewsOnlyStore extends InMemoryPlatformStore {
  override async listArchiveEntries(): Promise<never> {
    throw new Error('Derived-view reload should reuse stored structural views.');
  }
}

describe('derived archive view service and route', () => {
  it('TC-5.1a derived view returned for turn range', async () => {
    const app = await buildDerivedViewsApp(buildStore());
    const response = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          viewKind: 'turn_range',
          bodyText: 'Turn 0',
        }),
      ]),
    });

    await app.close();
  });

  it('TC-5.2a derived view identifies boundary and TC-5.3a/TC-5.3b preserve provenance', async () => {
    const app = await buildDerivedViewsApp(buildStore());
    const response = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          derivedViewId: `${processId}:derived-view:turn_range:0-0`,
          turnRange: {
            startIndex: 0,
            endIndex: 0,
          },
          sourceTurnIds: [`${processId}:turn:0`],
          sourceArchiveEntryIds: [
            'archive-entry-user-401',
            'archive-entry-model-401',
            'archive-entry-tool-call-401',
            'archive-entry-tool-result-401',
          ],
        }),
      ]),
    });

    await app.close();
  });

  it('TC-5.5a derived view failure leaves archive readable', async () => {
    const store = new ConflictDuringDerivedViewRefreshStore({
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
        [processId]: buildHappyPathArchiveEntries(),
      },
    });
    const app = await buildDerivedViewsApp(store);

    const refresh = await app.inject({
      method: 'POST',
      url: buildProcessDerivedArchiveViewsRefreshApiPath({ projectId, processId }),
      payload: {},
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const archive = await app.inject({
      method: 'GET',
      url: buildProcessArchiveApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(refresh.statusCode).toBe(409);
    expect(archive.statusCode).toBe(200);
    expect(archive.json()).toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({
          finalizationKey: 'event:derived-refresh-conflict',
        }),
      ]),
    });

    await app.close();
  });

  it('TC-7.1b derived view restores after reload from stored views when rebuild is unavailable', async () => {
    const store = new StoredDerivedViewsOnlyStore({
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
      derivedArchiveViewsByProcessId: {
        [processId]: readyDerivedArchiveViewsFixture.views,
      },
    });
    const app = await buildDerivedViewsApp(store);
    const storedViews = await store.listDerivedArchiveViews({ processId });

    const first = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const second = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toEqual({
      views: storedViews,
    });
    expect(second.json()).toEqual(first.json());

    await app.close();
  });

  it('caps derived archive lists at 50 structural views', async () => {
    const archiveEntries = Array.from({ length: 40 }, (_, index) => {
      const sequenceBase = index * 2;

      return [
        makeArchiveEntry(userArchiveEntryFixture, {
          archiveEntryId: `archive-entry-user-bounded-${index}`,
          finalizationKey: `response:bounded-${index}`,
          sourceObjectId: `history-bounded-${index}`,
          bodyText: `User message ${index}`,
          sequence: sequenceBase,
          recordedAt: `2026-05-01T13:${String(index).padStart(2, '0')}:00.000Z`,
        }),
        makeArchiveEntry(modelArchiveEntryFixture, {
          archiveEntryId: `archive-entry-model-bounded-${index}`,
          finalizationKey: `model:bounded-${index}`,
          sourceObjectId: `message-bounded-${index}`,
          bodyText: `Model message ${index}`,
          sequence: sequenceBase + 1,
          recordedAt: `2026-05-01T13:${String(index).padStart(2, '0')}:01.000Z`,
        }),
      ];
    }).flat();
    const app = await buildDerivedViewsApp(buildStore({ archiveEntries }));
    const response = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().views).toHaveLength(50);

    await app.close();
  });

  it('chunk_candidate stays structural and stale derived views rebuild from current turns', async () => {
    const store = buildStore({
      derivedViews: [
        {
          ...turnRangeDerivedArchiveViewFixture,
          derivedViewId: 'stale-derived-view',
          sourceTurnIds: ['stale-turn-id'],
          sourceArchiveEntryIds: ['stale-archive-entry-id'],
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
    });
    const app = await buildDerivedViewsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          derivedViewId: `${processId}:derived-view:chunk_candidate:0-1`,
          viewKind: 'chunk_candidate',
          bodyText: 'Chunk candidate turns 0-1',
          sourceTurnIds: [`${processId}:turn:0`, `${processId}:turn:1`],
        }),
      ]),
    });
    expect(response.json().views).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ derivedViewId: 'stale-derived-view' })]),
    );

    await app.close();
  });
});
