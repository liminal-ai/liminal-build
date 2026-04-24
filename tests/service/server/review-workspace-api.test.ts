import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { readyArtifactReviewTargetFixture } from '../../fixtures/artifact-versions.js';
import { exportablePackageFixture } from '../../fixtures/package-snapshots.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_review_workspace',
        cookiePassword: 'story4-review-workspace-cookie-password',
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
  projectId: 'project-review-001',
  name: 'Artifact Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 1,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

function buildStore(args: { includeArtifact?: boolean; includePackage?: boolean } = {}) {
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
      [projectSummary.projectId]: args.includeArtifact
        ? [
            {
              artifactId: readyArtifactReviewTargetFixture.artifactId,
              displayName: readyArtifactReviewTargetFixture.displayName,
              currentVersionLabel:
                readyArtifactReviewTargetFixture.currentVersionLabel ?? 'review-1',
              attachmentScope: 'process',
              processId: processSummary.processId,
              processDisplayLabel: processSummary.displayLabel,
              updatedAt: '2026-04-23T12:00:00.000Z',
            },
          ]
        : [],
    },
    artifactVersionsByArtifactId: args.includeArtifact
      ? {
          [readyArtifactReviewTargetFixture.artifactId]: [
            {
              versionId:
                readyArtifactReviewTargetFixture.currentVersionId ?? 'artifact-version-001',
              artifactId: readyArtifactReviewTargetFixture.artifactId,
              versionLabel:
                readyArtifactReviewTargetFixture.currentVersionLabel ?? 'checkpoint-20260422120000',
              contentStorageId: 'storage-ready-artifact-review',
              contentKind: 'markdown',
              bytes: 48,
              createdAt:
                readyArtifactReviewTargetFixture.versions[0]?.createdAt ??
                '2026-04-23T12:00:00.000Z',
              createdByProcessId: processSummary.processId,
            },
          ],
        }
      : {},
    artifactContentsByVersionId: args.includeArtifact
      ? {
          [readyArtifactReviewTargetFixture.currentVersionId ?? 'artifact-version-001']:
            '# Feature Specification\n\nCurrent review body.',
        }
      : {},
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: args.includeArtifact ? [readyArtifactReviewTargetFixture.artifactId] : [],
        sourceAttachmentIds: [],
      },
    },
    reviewPackagesByProcessId: {
      [processSummary.processId]: args.includePackage ? [exportablePackageFixture] : [],
    },
  });

  return platformStore;
}

describe('review workspace api', () => {
  it('TC-1.1c single reviewable target opens directly with process context visible', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: {
        projectId: projectSummary.projectId,
        name: projectSummary.name,
        role: projectSummary.role,
      },
      process: {
        processId: processSummary.processId,
        displayLabel: processSummary.displayLabel,
        processType: processSummary.processType,
        reviewTargetKind: 'artifact',
        reviewTargetId: readyArtifactReviewTargetFixture.artifactId,
      },
      availableTargets: [
        {
          targetKind: 'artifact',
          targetId: readyArtifactReviewTargetFixture.artifactId,
          displayName: readyArtifactReviewTargetFixture.displayName,
        },
      ],
      target: {
        targetKind: 'artifact',
        status: 'ready',
        displayName: readyArtifactReviewTargetFixture.displayName,
      },
    });

    await app.close();
  });

  it('TC-1.1d multiple reviewable targets open in selection state without stale target content', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
      includePackage: true,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: processSummary.processId,
      },
      availableTargets: [
        {
          targetKind: 'artifact',
          targetId: readyArtifactReviewTargetFixture.artifactId,
        },
        {
          targetKind: 'package',
          targetId: exportablePackageFixture.packageId,
        },
      ],
    });
    expect(response.json().target).toBeUndefined();

    await app.close();
  });

  it('TC-1.1e direct review route with zero targets returns the empty target state payload', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      availableTargets: [],
      process: {
        processId: processSummary.processId,
      },
    });
    expect(response.json().target).toBeUndefined();

    await app.close();
  });

  it('TC-1.3b explicit package selection keeps the target kind visible as package', async () => {
    const platformStore = buildStore({
      includePackage: true,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${exportablePackageFixture.packageId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        reviewTargetKind: 'package',
        reviewTargetId: exportablePackageFixture.packageId,
      },
      target: {
        targetKind: 'package',
        displayName: exportablePackageFixture.displayName,
        status: 'ready',
      },
    });

    await app.close();
  });

  it('TC-6.1a reopens artifact review from durable route state after a reload', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
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
    const url = `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=artifact&targetId=${readyArtifactReviewTargetFixture.artifactId}`;
    const firstResponse = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const secondResponse = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toMatchObject(firstResponse.json());

    await app.close();
  });

  it('TC-6.1b reopens package review from durable route state after a reload', async () => {
    const platformStore = buildStore({
      includePackage: true,
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
    const url = `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=${exportablePackageFixture.packageId}`;
    const firstResponse = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const secondResponse = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toMatchObject(firstResponse.json());

    await app.close();
  });

  it('TC-6.2a keeps process context visible when the requested artifact version is unavailable', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=artifact&targetId=${readyArtifactReviewTargetFixture.artifactId}&versionId=artifact-version-missing`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: {
        projectId: projectSummary.projectId,
      },
      process: {
        processId: processSummary.processId,
        reviewTargetKind: 'artifact',
        reviewTargetId: readyArtifactReviewTargetFixture.artifactId,
      },
      target: {
        targetKind: 'artifact',
        displayName: readyArtifactReviewTargetFixture.displayName,
        status: 'unavailable',
        error: {
          code: 'REVIEW_TARGET_NOT_FOUND',
        },
      },
    });
    expect(response.json().target.artifact).toBeUndefined();

    await app.close();
  });

  it('TC-6.2b keeps the workspace open with an unavailable package target when the package is gone', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=package&targetId=package-missing-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      process: {
        processId: processSummary.processId,
        reviewTargetKind: 'package',
        reviewTargetId: 'package-missing-001',
      },
      availableTargets: [
        {
          targetKind: 'artifact',
          targetId: readyArtifactReviewTargetFixture.artifactId,
        },
      ],
      target: {
        targetKind: 'package',
        displayName: 'Unavailable package',
        status: 'unavailable',
        error: {
          code: 'REVIEW_TARGET_NOT_FOUND',
        },
      },
    });
    expect(response.json().target.package).toBeUndefined();

    await app.close();
  });

  it('TC-6.2c blocks direct review routes when project access is revoked', async () => {
    const platformStore = buildStore({
      includeArtifact: true,
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
      processAccessService: {
        async getProcessAccess() {
          return {
            kind: 'forbidden' as const,
          };
        },
        async assertProcessAccess() {
          throw new Error(
            'assertProcessAccess should not be called for forbidden HTML review routes.',
          );
        },
      } as never,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Access denied');
    expect(response.body).not.toContain(readyArtifactReviewTargetFixture.displayName);

    await app.close();
  });
});
