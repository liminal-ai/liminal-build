import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { DefaultTurnDerivationService } from '../../../apps/platform/server/services/archive/turn-derivation.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  archiveEntrySchema,
  buildProcessArchiveTurnsApiPath,
  processSummarySchema,
  projectSummarySchema,
  type ArchiveEntry,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  modelArchiveEntryFixture,
  processEventArchiveEntryFixture,
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
        clientId: 'client_test_turn_derivation',
        cookiePassword: 'story4-turn-derivation-cookie-password-12345',
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
  userId: 'workos-user-turns-1',
  workosUserId: 'workos-user-turns-1',
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

function buildStore(archiveEntries: ArchiveEntry[]) {
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
      [processId]: archiveEntries,
    },
  });
}

async function buildTurnsApp(store: InMemoryPlatformStore) {
  return buildApp({
    authSessionService: createTestAuthSessionService({
      actor,
      reason: null,
    }),
    authUserSyncService: new AuthUserSyncService(store),
    platformStore: store,
  });
}

function buildHappyPathArchiveEntries(): ArchiveEntry[] {
  return [
    makeArchiveEntry(userArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-user-101',
      finalizationKey: 'response:history-user-101',
      sourceObjectId: 'history-user-101',
      sequence: 0,
      recordedAt: '2026-05-01T12:00:00.000Z',
    }),
    makeArchiveEntry(modelArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-model-101',
      finalizationKey: 'model:message-101',
      sourceObjectId: 'message-101',
      sequence: 1,
      recordedAt: '2026-05-01T12:00:01.000Z',
    }),
    makeArchiveEntry(toolCallArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-tool-call-101',
      finalizationKey: 'tool:search:call',
      sourceObjectId: 'tool-call-101',
      relatedToolCallId: 'tool-call-101',
      sequence: 2,
      recordedAt: '2026-05-01T12:00:02.000Z',
    }),
    makeArchiveEntry(toolResultArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-tool-result-101',
      finalizationKey: 'tool:search:result',
      sourceObjectId: 'tool-result-101',
      relatedToolCallId: 'tool-call-101',
      sequence: 3,
      recordedAt: '2026-05-01T12:00:03.000Z',
    }),
    makeArchiveEntry(userArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-user-102',
      finalizationKey: 'response:history-user-102',
      sourceObjectId: 'history-user-102',
      bodyText: 'Please publish the archive route next.',
      sequence: 4,
      recordedAt: '2026-05-01T12:01:00.000Z',
    }),
    makeArchiveEntry(modelArchiveEntryFixture, {
      archiveEntryId: 'archive-entry-model-102',
      finalizationKey: 'model:message-102',
      sourceObjectId: 'message-102',
      bodyText: 'The route is wired and ready for review.',
      sequence: 5,
      recordedAt: '2026-05-01T12:01:02.000Z',
    }),
  ];
}

describe('turn derivation service and route', () => {
  it('TC-4.1a turns derived from archive', async () => {
    const store = buildStore(buildHappyPathArchiveEntries());
    const app = await buildTurnsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveTurnsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      turns: [
        {
          turnId: `${processId}:turn:0`,
          turnIndex: 0,
          turnStatus: 'ready',
        },
        {
          turnId: `${processId}:turn:1`,
          turnIndex: 1,
          turnStatus: 'ready',
        },
      ],
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    await app.close();
  });

  it('TC-4.1b empty archive produces empty turn view', async () => {
    const store = buildStore([]);
    const app = await buildTurnsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveTurnsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      turns: [],
      page: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    await app.close();
  });

  it('TC-4.2a turn includes archive entry references', async () => {
    const store = buildStore(buildHappyPathArchiveEntries());
    const app = await buildTurnsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveTurnsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      turns: [
        {
          archiveEntryIds: [
            'archive-entry-user-101',
            'archive-entry-model-101',
            'archive-entry-tool-call-101',
            'archive-entry-tool-result-101',
          ],
        },
        {
          archiveEntryIds: ['archive-entry-user-102', 'archive-entry-model-102'],
        },
      ],
    });

    await app.close();
  });

  it('TC-4.4a degraded turn returned', async () => {
    const degradedEntries = [
      makeArchiveEntry(userArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-user-201',
        finalizationKey: 'response:history-user-201',
        sourceObjectId: 'history-user-201',
        sequence: 0,
        recordedAt: '2026-05-01T12:10:00.000Z',
      }),
      makeArchiveEntry(toolResultArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-tool-result-201',
        finalizationKey: 'tool:orphaned:result',
        sourceObjectId: 'tool-result-201',
        relatedToolCallId: 'missing-tool-call-201',
        sequence: 1,
        recordedAt: '2026-05-01T12:10:01.000Z',
      }),
      makeArchiveEntry(userArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-user-202',
        finalizationKey: 'response:history-user-202',
        sourceObjectId: 'history-user-202',
        bodyText: 'Continue with the healthy turn.',
        sequence: 2,
        recordedAt: '2026-05-01T12:11:00.000Z',
      }),
      makeArchiveEntry(modelArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-model-202',
        finalizationKey: 'model:message-202',
        sourceObjectId: 'message-202',
        bodyText: 'Healthy turn output remains visible.',
        sequence: 3,
        recordedAt: '2026-05-01T12:11:02.000Z',
      }),
    ];
    const store = buildStore(degradedEntries);
    const app = await buildTurnsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveTurnsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      turns: [
        {
          turnId: `${processId}:turn:0`,
          turnStatus: 'degraded',
          degradationReason:
            'Tool result archive-entry-tool-result-201 could not match tool call missing-tool-call-201.',
        },
        {
          turnId: `${processId}:turn:1`,
          turnStatus: 'ready',
        },
      ],
    });

    await app.close();
  });

  it('returns a bounded turn page with hasMore metadata for long archives', async () => {
    const archiveEntries = Array.from({ length: 55 }, (_, index) => {
      const sequenceBase = index * 2;

      return [
        makeArchiveEntry(userArchiveEntryFixture, {
          archiveEntryId: `archive-entry-user-turn-page-${index}`,
          finalizationKey: `response:turn-page-${index}`,
          sourceObjectId: `history-turn-page-${index}`,
          bodyText: `Turn page user ${index}`,
          sequence: sequenceBase,
          recordedAt: `2026-05-01T14:${String(index).padStart(2, '0')}:00.000Z`,
        }),
        makeArchiveEntry(modelArchiveEntryFixture, {
          archiveEntryId: `archive-entry-model-turn-page-${index}`,
          finalizationKey: `model:turn-page-${index}`,
          sourceObjectId: `message-turn-page-${index}`,
          bodyText: `Turn page model ${index}`,
          sequence: sequenceBase + 1,
          recordedAt: `2026-05-01T14:${String(index).padStart(2, '0')}:01.000Z`,
        }),
      ];
    }).flat();
    const store = buildStore(archiveEntries);
    const app = await buildTurnsApp(store);
    const response = await app.inject({
      method: 'GET',
      url: buildProcessArchiveTurnsApiPath({ projectId, processId }),
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      turns: expect.arrayContaining([
        expect.objectContaining({
          turnId: `${processId}:turn:0`,
        }),
        expect.objectContaining({
          turnId: `${processId}:turn:49`,
        }),
      ]),
      page: {
        cursor: null,
        nextCursor: '49',
        hasMore: true,
      },
    });
    expect(response.json().turns).toHaveLength(50);

    await app.close();
  });

  it('pre-user-message entries form deterministic turn zero', async () => {
    const store = buildStore([
      makeArchiveEntry(processEventArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-event-301',
        finalizationKey: 'event:301',
        sourceObjectId: 'event-301',
        sequence: 0,
        recordedAt: '2026-05-01T12:20:00.000Z',
      }),
      makeArchiveEntry(userArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-user-301',
        finalizationKey: 'response:history-user-301',
        sourceObjectId: 'history-user-301',
        sequence: 1,
        recordedAt: '2026-05-01T12:20:05.000Z',
      }),
      makeArchiveEntry(modelArchiveEntryFixture, {
        archiveEntryId: 'archive-entry-model-301',
        finalizationKey: 'model:message-301',
        sourceObjectId: 'message-301',
        sequence: 2,
        recordedAt: '2026-05-01T12:20:06.000Z',
      }),
    ]);
    const service = new DefaultTurnDerivationService(store, {
      assertProcessAccess: async () => ({
        kind: 'accessible' as const,
        project: projectSummary,
        process: processSummary,
      }),
    });

    const turns = await service.rebuildTurns({ projectId, processId });

    expect(turns).toEqual([
      {
        turnId: `${processId}:turn:0`,
        processId,
        turnIndex: 0,
        archiveEntryIds: ['archive-entry-event-301'],
        startedAt: '2026-05-01T12:20:00.000Z',
        endedAt: '2026-05-01T12:20:00.000Z',
        turnStatus: 'ready',
        degradationReason: null,
      },
      {
        turnId: `${processId}:turn:1`,
        processId,
        turnIndex: 1,
        archiveEntryIds: ['archive-entry-user-301', 'archive-entry-model-301'],
        startedAt: '2026-05-01T12:20:05.000Z',
        endedAt: '2026-05-01T12:20:06.000Z',
        turnStatus: 'ready',
        degradationReason: null,
      },
    ]);
  });

  it('turn-cache rebuild preserves stable turn provenance for derived views', async () => {
    const store = buildStore(buildHappyPathArchiveEntries());
    const service = new DefaultTurnDerivationService(store, {
      assertProcessAccess: async () => ({
        kind: 'accessible' as const,
        project: projectSummary,
        process: processSummary,
      }),
    });

    const firstTurns = await service.rebuildTurns({ projectId, processId });
    await store.appendArchiveEntry({
      projectId,
      processId,
      entryKind: 'user_message',
      finalizationKey: 'response:history-user-103',
      sourceObjectId: 'history-user-103',
      bodyText: 'Add one more turn after the rebuild.',
      bodyFormat: 'plain_text',
      recordedAt: '2026-05-01T12:02:00.000Z',
    });
    await store.appendArchiveEntry({
      projectId,
      processId,
      entryKind: 'model_message',
      finalizationKey: 'model:message-103',
      sourceObjectId: 'message-103',
      bodyText: 'The new turn is cached without changing prior turn ids.',
      bodyFormat: 'plain_text',
      recordedAt: '2026-05-01T12:02:02.000Z',
    });

    const secondTurns = await service.rebuildTurns({ projectId, processId });

    expect(firstTurns.map((turn) => turn.turnId)).toEqual([
      `${processId}:turn:0`,
      `${processId}:turn:1`,
    ]);
    expect(secondTurns.map((turn) => turn.turnId)).toEqual([
      `${processId}:turn:0`,
      `${processId}:turn:1`,
      `${processId}:turn:2`,
    ]);
    const [firstTurn, secondTurn] = firstTurns;
    expect(firstTurn).toBeDefined();
    expect(secondTurn).toBeDefined();
    if (firstTurn === undefined || secondTurn === undefined) {
      throw new Error('Expected the initial rebuild to produce two turns.');
    }
    expect(secondTurns[0]).toMatchObject(firstTurn);
    expect(secondTurns[1]).toMatchObject(secondTurn);
  });
});
