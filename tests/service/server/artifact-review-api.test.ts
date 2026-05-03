import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { ARTIFACT_CONTENT_FETCH_TIMEOUT_MS } from '../../../apps/platform/server/services/review/artifact-review.service.js';
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
          updatedAt: currentArtifactVersionFixture.createdAt,
        },
        {
          artifactId: 'artifact-empty-001',
          displayName: 'Empty Artifact',
          currentVersionLabel: null,
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
    expect(response.json().versions).toEqual([
      expect.objectContaining({
        versionId: currentArtifactVersionFixture.versionId,
        producedByProcessId: processSummary.processId,
        producedByProcessDisplayLabel: processSummary.displayLabel,
      }),
      expect.objectContaining({
        versionId: priorArtifactVersionFixture.versionId,
        producedByProcessId: processSummary.processId,
        producedByProcessDisplayLabel: processSummary.displayLabel,
      }),
    ]);

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

  it('allows artifact review when the current process references an earlier process artifact', async () => {
    const referencedProcessSummary = processSummarySchema.parse({
      ...processSummary,
      processId: 'process-review-reference-001',
      displayLabel: 'Feature Implementation #2',
      updatedAt: '2026-04-23T12:05:00.000Z',
    });
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
        [projectSummary.projectId]: [
          referencedProcessSummary,
          {
            ...processSummary,
            processId: 'process-review-author-001',
            displayLabel: 'Feature Specification #1',
          },
        ],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [
          {
            artifactId: 'artifact-shared-001',
            displayName: 'Shared Technical Design',
            currentVersionLabel: 'design-v2',
            updatedAt: '2026-04-23T12:04:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-shared-001': [
          {
            versionId: 'artifact-version-shared-001',
            artifactId: 'artifact-shared-001',
            versionLabel: 'design-v2',
            contentStorageId: 'storage-shared-001',
            contentKind: 'markdown',
            bytes: 32,
            createdAt: '2026-04-23T12:04:00.000Z',
            createdByProcessId: 'process-review-author-001',
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-version-shared-001': '# Shared Technical Design',
      },
      currentMaterialRefsByProcessId: {
        [referencedProcessSummary.processId]: {
          artifactIds: ['artifact-shared-001'],
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
      url: `/api/projects/${projectSummary.projectId}/processes/${referencedProcessSummary.processId}/review/artifacts/artifact-shared-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      artifactId: 'artifact-shared-001',
      currentVersionLabel: 'design-v2',
      selectedVersion: {
        versionId: 'artifact-version-shared-001',
        producedByProcessId: 'process-review-author-001',
        producedByProcessDisplayLabel: 'Feature Specification #1',
      },
    });

    await app.close();
  });

  it('TC-3.1b and TC-3.3a keep cross-process revisions reviewable from the current process context', async () => {
    const referencedProcessSummary = processSummarySchema.parse({
      ...processSummary,
      processId: 'process-review-reference-002',
      displayLabel: 'Feature Implementation #3',
      processType: 'FeatureImplementation',
      updatedAt: '2026-04-23T12:05:00.000Z',
    });
    const authorProcessSummary = processSummarySchema.parse({
      ...processSummary,
      processId: 'process-review-author-002',
      displayLabel: 'Product Definition #1',
      processType: 'ProductDefinition',
      updatedAt: '2026-04-23T12:01:00.000Z',
    });
    const reviserProcessSummary = processSummarySchema.parse({
      ...processSummary,
      processId: 'process-review-reviser-002',
      displayLabel: 'Feature Specification #2',
      updatedAt: '2026-04-23T12:06:00.000Z',
    });
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
        [projectSummary.projectId]: [
          referencedProcessSummary,
          authorProcessSummary,
          reviserProcessSummary,
        ],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [
          {
            artifactId: 'artifact-cross-process-001',
            displayName: 'Cross-Process Technical Design',
            currentVersionLabel: 'design-v2',
            updatedAt: '2026-04-23T12:06:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-cross-process-001': [
          {
            versionId: 'artifact-cross-process-v2',
            artifactId: 'artifact-cross-process-001',
            versionLabel: 'design-v2',
            contentStorageId: 'storage-cross-process-v2',
            contentKind: 'markdown',
            bytes: 40,
            createdAt: '2026-04-23T12:06:00.000Z',
            createdByProcessId: reviserProcessSummary.processId,
          },
          {
            versionId: 'artifact-cross-process-v1',
            artifactId: 'artifact-cross-process-001',
            versionLabel: 'design-v1',
            contentStorageId: 'storage-cross-process-v1',
            contentKind: 'markdown',
            bytes: 28,
            createdAt: '2026-04-22T18:00:00.000Z',
            createdByProcessId: authorProcessSummary.processId,
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-cross-process-v2': '# Cross-Process Technical Design v2',
        'artifact-cross-process-v1': '# Cross-Process Technical Design v1',
      },
      currentMaterialRefsByProcessId: {
        [referencedProcessSummary.processId]: {
          artifactIds: ['artifact-cross-process-001'],
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

    const currentResponse = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${referencedProcessSummary.processId}/review/artifacts/artifact-cross-process-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const priorResponse = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${referencedProcessSummary.processId}/review/artifacts/artifact-cross-process-001?versionId=artifact-cross-process-v1`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(currentResponse.statusCode).toBe(200);
    expect(currentResponse.json()).toMatchObject({
      artifactId: 'artifact-cross-process-001',
      currentVersionId: 'artifact-cross-process-v2',
      currentVersionLabel: 'design-v2',
      selectedVersionId: 'artifact-cross-process-v2',
      selectedVersion: {
        versionId: 'artifact-cross-process-v2',
        producedByProcessId: reviserProcessSummary.processId,
        producedByProcessDisplayLabel: reviserProcessSummary.displayLabel,
      },
    });

    expect(priorResponse.statusCode).toBe(200);
    expect(priorResponse.json()).toMatchObject({
      artifactId: 'artifact-cross-process-001',
      currentVersionId: 'artifact-cross-process-v2',
      selectedVersionId: 'artifact-cross-process-v1',
      selectedVersion: {
        versionId: 'artifact-cross-process-v1',
        producedByProcessId: authorProcessSummary.processId,
        producedByProcessDisplayLabel: authorProcessSummary.displayLabel,
      },
    });

    await app.close();
  });

  it('TC-3.2a allows artifact review when the current process only has pinned package context for the artifact', async () => {
    const producingProcessSummary = processSummarySchema.parse({
      ...processSummary,
      processId: 'process-review-author-003',
      displayLabel: 'Product Definition #2',
      processType: 'ProductDefinition',
      updatedAt: '2026-04-23T12:03:00.000Z',
    });
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
        [projectSummary.projectId]: [processSummary, producingProcessSummary],
      },
      artifactsByProjectId: {
        [projectSummary.projectId]: [
          {
            artifactId: 'artifact-pinned-only-001',
            displayName: 'Pinned Launch Plan',
            currentVersionLabel: 'plan-v1',
            updatedAt: '2026-04-23T12:03:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-pinned-only-001': [
          {
            versionId: 'artifact-pinned-only-v1',
            artifactId: 'artifact-pinned-only-001',
            versionLabel: 'plan-v1',
            contentStorageId: 'storage-pinned-only-v1',
            contentKind: 'markdown',
            bytes: 30,
            createdAt: '2026-04-23T12:03:00.000Z',
            createdByProcessId: producingProcessSummary.processId,
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-pinned-only-v1': '# Pinned Launch Plan',
      },
      currentMaterialRefsByProcessId: {
        [processSummary.processId]: {
          artifactIds: [],
          sourceAttachmentIds: [],
        },
      },
      processPackageContextsByProcessId: {
        [processSummary.processId]: {
          packageContextId: 'package-context-002',
          processId: processSummary.processId,
          displayName: 'Release Package Draft',
          packageType: 'implementation',
          basePackageSnapshotId: null,
          updatedAt: '2026-04-23T12:04:00.000Z',
        },
      },
      processPackageContextMembersByContextId: {
        'package-context-002': [
          {
            memberId: 'package-context-member-002',
            packageContextId: 'package-context-002',
            position: 0,
            artifactId: 'artifact-pinned-only-001',
            artifactVersionId: 'artifact-pinned-only-v1',
            displayName: 'Pinned Launch Plan',
            versionLabel: 'plan-v1',
            pinnedAt: '2026-04-23T12:04:00.000Z',
          },
        ],
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-pinned-only-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      artifactId: 'artifact-pinned-only-001',
      currentVersionId: 'artifact-pinned-only-v1',
      selectedVersion: {
        versionId: 'artifact-pinned-only-v1',
        producedByProcessId: producingProcessSummary.processId,
        producedByProcessDisplayLabel: producingProcessSummary.displayLabel,
      },
    });

    await app.close();
  });

  it('returns ARTIFACT_VERSION_NOT_FOUND when an explicit artifact version is unavailable', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-001?versionId=artifact-version-missing`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'ARTIFACT_VERSION_NOT_FOUND',
      status: 404,
    });

    await app.close();
  });

  it('TC-3.2b returns REVIEW_TARGET_NOT_FOUND when the process neither references nor pins the artifact', async () => {
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
            artifactId: 'artifact-unrelated-001',
            displayName: 'Unrelated Design Notes',
            currentVersionLabel: 'notes-v1',
            updatedAt: '2026-04-23T12:07:00.000Z',
          },
        ],
      },
      artifactVersionsByArtifactId: {
        'artifact-unrelated-001': [
          {
            versionId: 'artifact-unrelated-v1',
            artifactId: 'artifact-unrelated-001',
            versionLabel: 'notes-v1',
            contentStorageId: 'storage-unrelated-v1',
            contentKind: 'markdown',
            bytes: 18,
            createdAt: '2026-04-23T12:07:00.000Z',
            createdByProcessId: processSummary.processId,
          },
        ],
      },
      artifactContentsByVersionId: {
        'artifact-unrelated-v1': '# Unrelated Design Notes',
      },
      currentMaterialRefsByProcessId: {
        [processSummary.processId]: {
          artifactIds: [],
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-unrelated-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'REVIEW_TARGET_NOT_FOUND',
      status: 404,
    });

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

  it('TC-3.4c returns ARTIFACT_VERSION_NOT_FOUND when an explicit version is requested for a zero-version artifact', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-empty-001?versionId=artifact-version-empty-missing`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'ARTIFACT_VERSION_NOT_FOUND',
      status: 404,
    });

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
        producedByProcessId: processSummary.processId,
        producedByProcessDisplayLabel: processSummary.displayLabel,
        bodyStatus: 'error',
        bodyError: {
          code: 'REVIEW_RENDER_FAILED',
        },
      },
    });

    await app.close();
  });
});
