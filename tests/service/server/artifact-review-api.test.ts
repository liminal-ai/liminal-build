import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { ARTIFACT_CONTENT_FETCH_TIMEOUT_MS } from '../../../apps/platform/server/services/review/artifact-review.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import {
  currentArtifactVersionFixture,
  priorArtifactVersionFixture,
} from '../../fixtures/artifact-versions.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_artifact_review',
        cookiePassword: 'story4-artifact-review-cookie-password',
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

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-review-versions-001',
  name: 'Artifact Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 2,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-versions-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

function buildStore() {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [projectSummary],
    },
    projectAccessByProjectId: {
      [projectSummary.projectId]: {
        kind: 'accessible',
        project: projectSummary,
      },
    },
    processesByProjectId: {
      [projectSummary.projectId]: [processSummary],
    },
    artifactsByProjectId: {
      [projectSummary.projectId]: [
        {
          artifactId: 'artifact-001',
          displayName: 'Feature Specification',
          currentVersionLabel: currentArtifactVersionFixture.versionLabel,
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: currentArtifactVersionFixture.createdAt,
        },
        {
          artifactId: 'artifact-empty-001',
          displayName: 'Empty Artifact',
          currentVersionLabel: null,
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: '2026-04-20T12:00:00.000Z',
        },
      ],
    },
    artifactVersionsByArtifactId: {
      'artifact-001': [
        {
          versionId: currentArtifactVersionFixture.versionId,
          artifactId: 'artifact-001',
          versionLabel: currentArtifactVersionFixture.versionLabel,
          contentStorageId: 'storage-current',
          contentKind: 'markdown',
          bytes: 24,
          createdAt: currentArtifactVersionFixture.createdAt,
          createdByProcessId: processSummary.processId,
        },
        {
          versionId: priorArtifactVersionFixture.versionId,
          artifactId: 'artifact-001',
          versionLabel: priorArtifactVersionFixture.versionLabel,
          contentStorageId: 'storage-prior',
          contentKind: 'markdown',
          bytes: 22,
          createdAt: priorArtifactVersionFixture.createdAt,
          createdByProcessId: processSummary.processId,
        },
      ],
    },
    artifactContentsByVersionId: {
      [currentArtifactVersionFixture.versionId]: '# Current version',
      [priorArtifactVersionFixture.versionId]: '# Prior version',
    },
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: ['artifact-001', 'artifact-empty-001'],
        sourceAttachmentIds: [],
      },
    },
  });
}

describe('artifact review api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-2.1a returns the newest durable revision as the current version', async () => {
    const platformStore = buildStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      artifactId: 'artifact-001',
      currentVersionId: currentArtifactVersionFixture.versionId,
      currentVersionLabel: currentArtifactVersionFixture.versionLabel,
      selectedVersionId: currentArtifactVersionFixture.versionId,
      versions: [
        {
          versionId: currentArtifactVersionFixture.versionId,
          isCurrent: true,
        },
        {
          versionId: priorArtifactVersionFixture.versionId,
          isCurrent: false,
        },
      ],
      selectedVersion: {
        versionId: currentArtifactVersionFixture.versionId,
        versionLabel: currentArtifactVersionFixture.versionLabel,
        bodyStatus: 'ready',
      },
    });

    await app.close();
  });

  it('TC-2.1b and TC-2.3a open a prior revision distinctly from the current one', async () => {
    const platformStore = buildStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-001?versionId=${priorArtifactVersionFixture.versionId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    const responseBody = response.json();

    expect(responseBody).toMatchObject({
      currentVersionId: currentArtifactVersionFixture.versionId,
      selectedVersionId: priorArtifactVersionFixture.versionId,
      selectedVersion: {
        versionId: priorArtifactVersionFixture.versionId,
        versionLabel: priorArtifactVersionFixture.versionLabel,
        bodyStatus: 'ready',
      },
    });
    expect(responseBody.selectedVersion.body).toContain('<h1>Prior version</h1>');

    await app.close();
  });

  it('TC-2.3b returns artifact versions newest to oldest', async () => {
    const platformStore = buildStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(
      response.json().versions.map((version: { versionId: string }) => version.versionId),
    ).toEqual([currentArtifactVersionFixture.versionId, priorArtifactVersionFixture.versionId]);

    await app.close();
  });

  it('TC-2.4a returns the no-version empty state for an owned artifact with no durable revisions', async () => {
    const platformStore = buildStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-empty-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      artifactId: 'artifact-empty-001',
      displayName: 'Empty Artifact',
      versions: [],
    });
    expect(response.json().currentVersionId).toBeUndefined();
    expect(response.json().currentVersionLabel).toBeUndefined();
    expect(response.json().selectedVersionId).toBeUndefined();
    expect(response.json().selectedVersion).toBeUndefined();

    await app.close();
  });

  it('returns a ready empty markdown review when a durable version body is zero-byte', async () => {
    const platformStore = new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [projectSummary],
      },
      projectAccessByProjectId: {
        [projectSummary.projectId]: {
          kind: 'accessible',
          project: projectSummary,
        },
      },
      processesByProjectId: {
        [projectSummary.projectId]: [processSummary],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [
          {
            artifactId: 'artifact-zero-byte-001',
            displayName: 'Zero Byte Spec',
            currentVersionLabel: 'checkpoint-empty',
            attachmentScope: 'process',
            processId: processSummary.processId,
            processDisplayLabel: processSummary.displayLabel,
            updatedAt: '2026-04-23T12:10:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-zero-byte-001': [
          {
            versionId: 'artifact-version-zero-byte-001',
            artifactId: 'artifact-zero-byte-001',
            versionLabel: 'checkpoint-empty',
            contentStorageId: 'storage-zero-byte',
            contentKind: 'markdown',
            bytes: 0,
            createdAt: '2026-04-23T12:10:00.000Z',
            createdByProcessId: processSummary.processId,
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-version-zero-byte-001': '',
      },
      currentMaterialRefsByProcessId: {
        [processSummary.processId]: {
          artifactIds: ['artifact-zero-byte-001'],
          sourceAttachmentIds: [],
        },
      },
    });
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-zero-byte-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      artifactId: 'artifact-zero-byte-001',
      currentVersionId: 'artifact-version-zero-byte-001',
      selectedVersionId: 'artifact-version-zero-byte-001',
      selectedVersion: {
        versionId: 'artifact-version-zero-byte-001',
        versionLabel: 'checkpoint-empty',
        bodyStatus: 'ready',
        body: '',
        mermaidBlocks: [],
      },
    });

    await app.close();
  });

  it('keeps version context visible when artifact body loading times out', async () => {
    const platformStore = buildStore();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      Object.assign(new Error('timed out'), {
        name: 'TimeoutError',
      }),
    );
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        reason: null,
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(ARTIFACT_CONTENT_FETCH_TIMEOUT_MS).toBe(10_000);
    expect(fetchSpy).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      currentVersionId: currentArtifactVersionFixture.versionId,
      selectedVersionId: currentArtifactVersionFixture.versionId,
      selectedVersion: {
        versionId: currentArtifactVersionFixture.versionId,
        bodyStatus: 'error',
        bodyError: {
          code: 'REVIEW_RENDER_FAILED',
        },
      },
    });

    await app.close();
  });
});
