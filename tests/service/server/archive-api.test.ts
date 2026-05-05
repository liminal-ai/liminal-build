import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import {
  InMemoryPlatformStore,
  type ArtifactVersionRecord,
  type StoredSourceProvenanceRecord,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  buildProcessArchiveApiPath,
  buildProcessDerivedArchiveViewsRefreshApiPath,
  processSummarySchema,
  projectSummarySchema,
  type DerivedArchiveView,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  archiveEntryWithArtifactProvenanceFixture,
  archiveEntryWithSourceProvenanceFixture,
  degradedArchiveEntryFixture,
  modelArchiveEntryFixture,
  processEventArchiveEntryFixture,
  readyArchivePageFixture,
  userArchiveEntryFixture,
} from '../../fixtures/archive.js';
import { currentArtifactVersionFixture } from '../../fixtures/artifact-versions.js';
import { lostEnvironmentFixture } from '../../fixtures/process-environment.js';
import { completedProcessFixture } from '../../fixtures/processes.js';
import { readySourceProvenanceFixture } from '../../fixtures/sources.js';
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

const artifactProducingProcessSummary = processSummarySchema.parse({
  ...completedProcessFixture,
  processId: currentArtifactVersionFixture.producedByProcessId,
  displayLabel:
    currentArtifactVersionFixture.producedByProcessDisplayLabel ?? 'Feature Specification #1',
  updatedAt: '2026-04-22T12:00:00.000Z',
});

const resolvedArtifactVersionRecord: ArtifactVersionRecord = {
  versionId: currentArtifactVersionFixture.versionId,
  artifactId: 'artifact-001',
  versionLabel: currentArtifactVersionFixture.versionLabel,
  contentStorageId: 'storage-001',
  contentKind: 'markdown',
  bytes: 128,
  createdAt: currentArtifactVersionFixture.createdAt,
  createdByProcessId: currentArtifactVersionFixture.producedByProcessId,
};

const storedResolvedSourceProvenance: StoredSourceProvenanceRecord = {
  provenanceId: 'provenance-001',
  projectId,
  processId,
  sourceAttachmentId: readySourceProvenanceFixture.sourceAttachmentId,
  relationshipKind: readySourceProvenanceFixture.relationshipKind,
  repositoryFullName: readySourceProvenanceFixture.repositoryFullName,
  repositoryUrl: readySourceProvenanceFixture.repositoryUrl,
  targetRef: readySourceProvenanceFixture.targetRef,
  eventId: null,
  entryStatus: 'ready',
  degradationReason: null,
  recordedAt: readySourceProvenanceFixture.recordedAt,
};

function buildStoreSeed(
  args: {
    access?: 'accessible' | 'forbidden' | 'project_not_found';
    includeProcess?: boolean;
    archiveEntries?: Array<(typeof readyArchivePageFixture.entries)[number]>;
    extraProcesses?: Array<typeof processSummary>;
    artifactVersionsByArtifactId?: Record<string, ArtifactVersionRecord[]>;
    sourceProvenanceByProcessId?: Record<string, StoredSourceProvenanceRecord[]>;
    environmentLost?: boolean;
  } = {},
) {
  return {
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
      [projectId]:
        args.includeProcess === false
          ? []
          : [processSummary, artifactProducingProcessSummary, ...(args.extraProcesses ?? [])],
    },
    archiveEntriesByProcessId: {
      [processId]: args.archiveEntries ?? readyArchivePageFixture.entries,
    },
    artifactVersionsByArtifactId: args.artifactVersionsByArtifactId ?? {
      [resolvedArtifactVersionRecord.artifactId]: [resolvedArtifactVersionRecord],
    },
    sourceProvenanceByProcessId: args.sourceProvenanceByProcessId ?? {
      [processId]: [storedResolvedSourceProvenance],
    },
    processEnvironmentSummariesByProcessId: args.environmentLost
      ? {
          [processId]: lostEnvironmentFixture,
        }
      : undefined,
  };
}

function buildStore(
  args: {
    access?: 'accessible' | 'forbidden' | 'project_not_found';
    includeProcess?: boolean;
    archiveEntries?: Array<(typeof readyArchivePageFixture.entries)[number]>;
    extraProcesses?: Array<typeof processSummary>;
    artifactVersionsByArtifactId?: Record<string, ArtifactVersionRecord[]>;
    sourceProvenanceByProcessId?: Record<string, StoredSourceProvenanceRecord[]>;
    environmentLost?: boolean;
  } = {},
) {
  return new InMemoryPlatformStore(buildStoreSeed(args));
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
        finalizationKey: 'event:archive-api-derived-refresh-conflict',
        sourceObjectId: 'event-archive-api-derived-refresh-conflict',
        bodyFormat: 'none',
        recordedAt: '2026-05-01T12:15:00.000Z',
      });
    }

    await super.replaceDerivedArchiveViews(args);
  }
}

class ThrowingArtifactVersionLookupStore extends InMemoryPlatformStore {
  override async getArtifactVersion(args: {
    versionId: string;
  }): Promise<ArtifactVersionRecord | null> {
    if (args.versionId === currentArtifactVersionFixture.versionId) {
      throw new Error('Artifact version lookup failed.');
    }

    return super.getArtifactVersion(args);
  }
}

class ThrowingSourceProvenanceLookupStore extends InMemoryPlatformStore {
  override async listProcessSourceProvenance(args: {
    processId: string;
  }): Promise<StoredSourceProvenanceRecord[]> {
    if (args.processId === processId) {
      throw new Error('Source provenance lookup failed.');
    }

    return super.listProcessSourceProvenance(args);
  }
}

describe('archive API', () => {
  const storedReadySourceProvenance = {
    provenanceId: readySourceProvenanceFixture.provenanceId,
    projectId,
    processId,
    sourceAttachmentId: readySourceProvenanceFixture.sourceAttachmentId,
    relationshipKind: readySourceProvenanceFixture.relationshipKind,
    repositoryFullName: readySourceProvenanceFixture.repositoryFullName,
    repositoryUrl: readySourceProvenanceFixture.repositoryUrl,
    targetRef: readySourceProvenanceFixture.targetRef,
    eventId: null,
    entryStatus: readySourceProvenanceFixture.entryStatus,
    degradationReason: readySourceProvenanceFixture.degradationReason,
    recordedAt: readySourceProvenanceFixture.recordedAt,
  } as const;

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

  it('TC-6.1a artifact provenance visible from archive entry', async () => {
    const store = buildStore({
      archiveEntries: [
        {
          ...processEventArchiveEntryFixture,
          relatedSourceProvenanceId: null,
        },
      ],
      artifactVersionsByArtifactId: {
        'artifact-001': [
          {
            versionId: currentArtifactVersionFixture.versionId,
            artifactId: 'artifact-001',
            versionLabel: currentArtifactVersionFixture.versionLabel,
            contentStorageId: 'storage-001',
            contentKind: 'markdown',
            bytes: 128,
            createdAt: currentArtifactVersionFixture.createdAt,
            createdByProcessId: currentArtifactVersionFixture.producedByProcessId,
          },
        ],
      },
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
      entries: [archiveEntryWithArtifactProvenanceFixture],
    });

    await app.close();
  });

  it('TC-6.2a source provenance visible from archive entry', async () => {
    const store = buildStore({
      archiveEntries: [
        {
          ...processEventArchiveEntryFixture,
          relatedArtifactVersionId: null,
          relatedSourceProvenanceId: readySourceProvenanceFixture.provenanceId,
        },
      ],
      sourceProvenanceByProcessId: {
        [processId]: [storedReadySourceProvenance],
      },
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
      entries: [archiveEntryWithSourceProvenanceFixture],
    });

    await app.close();
  });

  it('TC-6.3a missing source context degrades one entry', async () => {
    const store = buildStore({
      archiveEntries: [
        userArchiveEntryFixture,
        {
          ...processEventArchiveEntryFixture,
          relatedArtifactVersionId: null,
          relatedSourceProvenanceId: 'provenance-missing-001',
        },
      ],
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
          archiveEntryId: processEventArchiveEntryFixture.archiveEntryId,
          entryStatus: 'degraded',
          degradationReason: 'Related source provenance is unavailable.',
        }),
      ],
    });

    await app.close();
  });

  it('source provenance lookup failure degrades one entry without failing the archive page', async () => {
    const store = new ThrowingSourceProvenanceLookupStore(
      buildStoreSeed({
        archiveEntries: [
          userArchiveEntryFixture,
          {
            ...processEventArchiveEntryFixture,
            relatedArtifactVersionId: null,
            relatedSourceProvenanceId: readySourceProvenanceFixture.provenanceId,
          },
        ],
      }),
    );
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
          archiveEntryId: processEventArchiveEntryFixture.archiveEntryId,
          entryStatus: 'degraded',
          degradationReason: 'Related source provenance is unavailable.',
        }),
      ],
    });

    await app.close();
  });

  it('TC-6.3b artifact lookup failure degrades one entry', async () => {
    const store = new ThrowingArtifactVersionLookupStore(
      buildStoreSeed({
        archiveEntries: [
          userArchiveEntryFixture,
          {
            ...processEventArchiveEntryFixture,
            relatedSourceProvenanceId: null,
          },
        ],
      }),
    );
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
          archiveEntryId: processEventArchiveEntryFixture.archiveEntryId,
          entryStatus: 'degraded',
          degradationReason: 'Related artifact version is unavailable.',
        }),
      ],
    });
    expect(
      response
        .json()
        .entries.find(
          (entry: { archiveEntryId: string }) =>
            entry.archiveEntryId === processEventArchiveEntryFixture.archiveEntryId,
        ),
    ).not.toHaveProperty('relatedArtifactProvenance');

    await app.close();
  });

  it('derived-view refresh conflict returns ARCHIVE_DERIVATION_CONFLICT', async () => {
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
        [processId]: readyArchivePageFixture.entries,
      },
    });
    const app = await buildArchiveApp(store);
    const response = await app.inject({
      method: 'POST',
      url: buildProcessDerivedArchiveViewsRefreshApiPath({ projectId, processId }),
      payload: {},
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: 'ARCHIVE_DERIVATION_CONFLICT',
      message: 'Derived views could not be refreshed safely from the current archive state.',
      status: 409,
    });

    await app.close();
  });
});
