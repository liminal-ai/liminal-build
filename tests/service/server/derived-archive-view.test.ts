import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { detachedSourceFixture } from '../../fixtures/sources.js';
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
  archiveEntryReads = 0;

  override async listArchiveEntries(): Promise<never> {
    this.archiveEntryReads += 1;
    throw new Error('Derived-view reload should reuse stored structural views.');
  }
}

class StoredTurnsForDerivedViewStore extends InMemoryPlatformStore {
  archiveEntryReads = 0;

  override async listArchiveEntries(args: {
    processId: string;
    cursor?: string | null;
    limit: number;
  }) {
    this.archiveEntryReads += 1;
    return super.listArchiveEntries(args);
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
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
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

  it('derived views degrade when turn rebuilds observe detached source provenance on reopen', async () => {
    const detachedProvenanceId = 'provenance-detached-derived-view-1';
    const app = await buildDerivedViewsApp(
      new InMemoryPlatformStore({
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
          [processId]: [
            makeArchiveEntry(userArchiveEntryFixture, {
              archiveEntryId: 'archive-entry-user-detached-derived-1',
              finalizationKey: 'response:history-user-detached-derived-1',
              sourceObjectId: 'history-user-detached-derived-1',
              sequence: 0,
              recordedAt: '2026-05-01T12:44:00.000Z',
            }),
            makeArchiveEntry(processEventArchiveEntryFixture, {
              archiveEntryId: 'archive-entry-event-detached-derived-1',
              finalizationKey: 'event:detached-derived-1',
              sourceObjectId: 'event-detached-derived-1',
              relatedArtifactVersionId: null,
              relatedSourceProvenanceId: detachedProvenanceId,
              sequence: 1,
              recordedAt: '2026-05-01T12:44:01.000Z',
            }),
          ],
        },
        sourceAttachmentsByProjectId: {
          [projectId]: [detachedSourceFixture],
        },
        sourceProvenanceByProcessId: {
          [processId]: [
            {
              provenanceId: detachedProvenanceId,
              projectId,
              processId,
              sourceAttachmentId: detachedSourceFixture.sourceAttachmentId,
              relationshipKind: 'informed_work',
              repositoryFullName: detachedSourceFixture.repositoryFullName,
              repositoryUrl: detachedSourceFixture.repositoryUrl,
              targetRef: detachedSourceFixture.targetRef,
              eventId: null,
              entryStatus: 'ready',
              degradationReason: null,
              recordedAt: '2026-05-01T12:44:01.000Z',
            },
          ],
        },
      }),
    );
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
          viewStatus: 'degraded',
          degradationReason: 'source_detached',
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
    const storedViews = await store.listDerivedArchiveViews({
      processId,
      cursor: null,
      limit: 50,
    });

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
      views: storedViews.views,
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
    });
    expect(first.json().views).toHaveLength(readyDerivedArchiveViewsFixture.views.length);
    expect(second.json()).toEqual(first.json());
    expect(store.archiveEntryReads).toBe(0);

    await app.close();
  });

  it('rebuilds missing derived views from cached turns without rereading archive entries', async () => {
    const store = new StoredTurnsForDerivedViewStore({
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
      archiveTurnsByProcessId: {
        [processId]: [
          {
            turnId: `${processId}:turn:0`,
            processId,
            turnIndex: 0,
            archiveEntryIds: [
              'archive-entry-user-401',
              'archive-entry-model-401',
              'archive-entry-tool-call-401',
              'archive-entry-tool-result-401',
            ],
            startedAt: '2026-05-01T12:40:00.000Z',
            endedAt: '2026-05-01T12:40:03.000Z',
            turnStatus: 'ready',
            degradationReason: null,
          },
          {
            turnId: `${processId}:turn:1`,
            processId,
            turnIndex: 1,
            archiveEntryIds: ['archive-entry-user-402', 'archive-entry-event-402'],
            startedAt: '2026-05-01T12:41:00.000Z',
            endedAt: '2026-05-01T12:41:02.000Z',
            turnStatus: 'ready',
            degradationReason: null,
          },
        ],
      },
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
    expect(response.json().views).toHaveLength(3);
    expect(store.archiveEntryReads).toBe(0);

    await app.close();
  });

  it('returns a bounded derived view page with continuation metadata', async () => {
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
    expect(response.json().page).toMatchObject({
      cursor: null,
      hasMore: true,
    });
    expect(response.json().page.nextCursor).toEqual(expect.any(String));

    const second = await app.inject({
      method: 'GET',
      url: `${buildProcessDerivedArchiveViewsApiPath({ projectId, processId })}?cursor=${encodeURIComponent(response.json().page.nextCursor)}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      views: expect.any(Array),
      page: {
        cursor: response.json().page.nextCursor,
        nextCursor: null,
        hasMore: false,
      },
    });
    expect(second.json().views).toHaveLength(10);

    await app.close();
  });

  it('chunk_candidate stays structural and archive appends invalidate cached derived views for rebuild', async () => {
    const store = buildStore();
    const app = await buildDerivedViewsApp(store);
    const first = await app.inject({
      method: 'GET',
      url: buildProcessDerivedArchiveViewsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    await store.appendArchiveEntry({
      projectId,
      processId,
      entryKind: 'user_message',
      finalizationKey: 'response:cache-invalidation-403',
      sourceObjectId: 'history-cache-invalidation-403',
      bodyText: 'Add one more archive turn after the cached views were read.',
      bodyData: null,
      bodyFormat: 'plain_text',
      recordedAt: '2026-05-01T12:42:00.000Z',
    });
    await store.appendArchiveEntry({
      projectId,
      processId,
      entryKind: 'model_message',
      finalizationKey: 'model:cache-invalidation-403',
      sourceObjectId: 'message-cache-invalidation-403',
      bodyText: 'The new turn should appear after cache invalidation.',
      bodyData: null,
      bodyFormat: 'markdown',
      recordedAt: '2026-05-01T12:42:02.000Z',
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
    expect(first.json().views).toHaveLength(3);
    expect(second.json()).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          derivedViewId: `${processId}:derived-view:turn_range:2-2`,
          viewKind: 'turn_range',
          bodyText: 'Turn 2',
          sourceTurnIds: [`${processId}:turn:2`],
        }),
      ]),
    });
    expect(second.json().views).toHaveLength(5);

    await app.close();
  });
});
