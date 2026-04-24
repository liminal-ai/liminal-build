import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  artifactReviewTargetSchema,
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_package_review',
        cookiePassword: 'story4-package-review-cookie-password',
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
  projectId: 'project-package-review-001',
  name: 'Artifact Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 2,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-package-review-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

const olderReadyMember = packageMemberSchema.parse({
  memberId: 'package-member-001',
  position: 0,
  artifactId: 'artifact-001',
  displayName: 'Feature Specification',
  versionId: 'artifact-version-001',
  versionLabel: 'spec-v1',
  status: 'ready',
});

const newerReadyMember = packageMemberSchema.parse({
  memberId: 'package-member-002',
  position: 1,
  artifactId: 'artifact-002',
  displayName: 'Implementation Notes',
  versionId: 'artifact-version-002',
  versionLabel: 'notes-v1',
  status: 'ready',
});

const unavailableFirstMember = packageMemberSchema.parse({
  memberId: 'package-member-003',
  position: 0,
  artifactId: 'artifact-003',
  displayName: 'Architecture Diagram',
  versionId: 'artifact-version-missing',
  versionLabel: 'diagram-v1',
  status: 'unavailable',
});

function buildBasePackageReviewTarget() {
  return packageReviewTargetSchema.parse({
    packageId: 'package-001',
    displayName: 'Feature Specification Package',
    packageType: 'FeatureSpecificationOutput',
    members: [olderReadyMember, newerReadyMember],
    selectedMemberId: olderReadyMember.memberId,
    selectedMember: packageMemberReviewSchema.parse({
      memberId: olderReadyMember.memberId,
      status: 'ready',
      artifact: artifactReviewTargetSchema.parse({
        artifactId: olderReadyMember.artifactId,
        displayName: olderReadyMember.displayName,
        currentVersionId: olderReadyMember.versionId,
        currentVersionLabel: olderReadyMember.versionLabel,
        selectedVersionId: olderReadyMember.versionId,
        versions: [
          {
            versionId: olderReadyMember.versionId,
            versionLabel: olderReadyMember.versionLabel,
            isCurrent: true,
            createdAt: '2026-04-23T12:01:00.000Z',
          },
        ],
      }),
    }),
    exportability: {
      available: true,
    },
  });
}

function buildStore(reviewPackages = [buildBasePackageReviewTarget()]) {
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
          currentVersionLabel: 'spec-v2',
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: '2026-04-23T12:05:00.000Z',
        },
        {
          artifactId: 'artifact-002',
          displayName: 'Implementation Notes',
          currentVersionLabel: 'notes-v1',
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: '2026-04-23T12:03:00.000Z',
        },
      ],
    },
    artifactVersionsByArtifactId: {
      'artifact-001': [
        {
          versionId: 'artifact-version-002-current',
          artifactId: 'artifact-001',
          versionLabel: 'spec-v2',
          contentStorageId: 'storage-spec-v2',
          contentKind: 'markdown',
          bytes: 24,
          createdAt: '2026-04-23T12:05:00.000Z',
          createdByProcessId: processSummary.processId,
        },
        {
          versionId: olderReadyMember.versionId,
          artifactId: 'artifact-001',
          versionLabel: olderReadyMember.versionLabel,
          contentStorageId: 'storage-spec-v1',
          contentKind: 'markdown',
          bytes: 22,
          createdAt: '2026-04-23T12:01:00.000Z',
          createdByProcessId: processSummary.processId,
        },
      ],
      'artifact-002': [
        {
          versionId: newerReadyMember.versionId,
          artifactId: 'artifact-002',
          versionLabel: newerReadyMember.versionLabel,
          contentStorageId: 'storage-notes-v1',
          contentKind: 'markdown',
          bytes: 20,
          createdAt: '2026-04-23T12:03:00.000Z',
          createdByProcessId: processSummary.processId,
        },
      ],
    },
    artifactContentsByVersionId: {
      [olderReadyMember.versionId]: '# Feature Specification v1\n\nPinned package body.',
      'artifact-version-002-current': '# Feature Specification v2\n\nLatest artifact body.',
      [newerReadyMember.versionId]: '# Implementation Notes v1\n\nCurrent notes.',
    },
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: ['artifact-001', 'artifact-002'],
        sourceAttachmentIds: [],
      },
    },
    reviewPackagesByProcessId: {
      [processSummary.processId]: reviewPackages,
    },
  });
}

function buildTwentyMemberPackageStore() {
  const smokeProjectSummary = projectSummarySchema.parse({
    ...projectSummary,
    projectId: 'project-package-review-smoke-20',
    artifactCount: 20,
  });
  const smokeProcessSummary = processSummarySchema.parse({
    ...processSummary,
    processId: 'process-package-review-smoke-20',
    displayLabel: 'Feature Specification #20',
  });
  const members = Array.from({ length: 20 }, (_, index) =>
    packageMemberSchema.parse({
      memberId: `package-member-smoke-${index + 1}`,
      position: index,
      artifactId: `artifact-smoke-${index + 1}`,
      displayName: `Smoke Artifact ${index + 1}`,
      versionId: `artifact-version-smoke-${index + 1}`,
      versionLabel: `smoke-v${index + 1}`,
      status: 'ready',
    }),
  );
  const selectedMember = members[0];

  if (selectedMember === undefined) {
    throw new Error('Expected smoke package fixture to include at least one member.');
  }

  const packageId = 'package-smoke-20';
  const artifactVersionsByArtifactId = Object.fromEntries(
    members.map((member, index) => [
      member.artifactId,
      [
        {
          versionId: member.versionId,
          artifactId: member.artifactId,
          versionLabel: member.versionLabel,
          contentStorageId: `storage-smoke-${index + 1}`,
          contentKind: 'markdown' as const,
          bytes: 72,
          createdAt: `2026-04-23T12:${String(index).padStart(2, '0')}:00.000Z`,
          createdByProcessId: smokeProcessSummary.processId,
        },
      ],
    ]),
  );
  const artifactContentsByVersionId = Object.fromEntries(
    members.map((member) => [
      member.versionId,
      `# ${member.displayName}\n\nSmoke package member body for ${member.versionLabel}.`,
    ]),
  );
  const packageTarget = packageReviewTargetSchema.parse({
    packageId,
    displayName: 'Twenty Member Smoke Package',
    packageType: 'FeatureSpecificationOutput',
    members,
    selectedMemberId: selectedMember.memberId,
    selectedMember: packageMemberReviewSchema.parse({
      memberId: selectedMember.memberId,
      status: 'ready',
      artifact: artifactReviewTargetSchema.parse({
        artifactId: selectedMember.artifactId,
        displayName: selectedMember.displayName,
        currentVersionId: selectedMember.versionId,
        currentVersionLabel: selectedMember.versionLabel,
        selectedVersionId: selectedMember.versionId,
        versions: [
          {
            versionId: selectedMember.versionId,
            versionLabel: selectedMember.versionLabel,
            isCurrent: true,
            createdAt: '2026-04-23T12:00:00.000Z',
          },
        ],
      }),
    }),
    exportability: {
      available: true,
    },
  });

  return {
    packageId,
    project: smokeProjectSummary,
    process: smokeProcessSummary,
    store: new InMemoryPlatformStore({
      accessibleProjectsByUserId: {
        'user:workos-user-1': [smokeProjectSummary],
      },
      projectAccessByProjectId: {
        [smokeProjectSummary.projectId]: {
          kind: 'accessible',
          project: smokeProjectSummary,
        },
      },
      processesByProjectId: {
        [smokeProjectSummary.projectId]: [smokeProcessSummary],
      },
      artifactsByProjectId: {
        [smokeProjectSummary.projectId]: members.map((member, index) => ({
          artifactId: member.artifactId,
          displayName: member.displayName,
          currentVersionLabel: member.versionLabel,
          attachmentScope: 'process',
          processId: smokeProcessSummary.processId,
          processDisplayLabel: smokeProcessSummary.displayLabel,
          updatedAt: `2026-04-23T12:${String(index).padStart(2, '0')}:00.000Z`,
        })),
      },
      artifactVersionsByArtifactId,
      artifactContentsByVersionId,
      currentMaterialRefsByProcessId: {
        [smokeProcessSummary.processId]: {
          artifactIds: members.map((member) => member.artifactId),
          sourceAttachmentIds: [],
        },
      },
      reviewPackagesByProcessId: {
        [smokeProcessSummary.processId]: [packageTarget],
      },
    }),
  };
}

describe('package review api', () => {
  it('TC-4.1a and TC-4.2a/b return one package as an ordered multi-member review set', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      packageId: 'package-001',
      packageType: 'FeatureSpecificationOutput',
      members: [
        {
          memberId: olderReadyMember.memberId,
          artifactId: olderReadyMember.artifactId,
          versionId: olderReadyMember.versionId,
          status: 'ready',
        },
        {
          memberId: newerReadyMember.memberId,
          artifactId: newerReadyMember.artifactId,
          versionId: newerReadyMember.versionId,
          status: 'ready',
        },
      ],
      selectedMemberId: olderReadyMember.memberId,
      selectedMember: {
        memberId: olderReadyMember.memberId,
        status: 'ready',
        artifact: {
          artifactId: olderReadyMember.artifactId,
          selectedVersionId: olderReadyMember.versionId,
        },
      },
      exportability: {
        available: true,
      },
    });

    await app.close();
  });

  it('TC-4.1b keeps the package pinned to the published member version after a later artifact revision', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.selectedMember.artifact.currentVersionId).toBe(olderReadyMember.versionId);
    expect(body.selectedMember.artifact.selectedVersionId).toBe(olderReadyMember.versionId);
    expect(body.selectedMember.artifact.versions).toHaveLength(1);
    expect(body.selectedMember.artifact.selectedVersion.body).toContain('Pinned package body.');
    expect(body.selectedMember.artifact.selectedVersion.body).not.toContain(
      'Latest artifact body.',
    );

    await app.close();
  });

  it('TC-4.3a and TC-4.3b preserve package context while switching the reviewed member', async () => {
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001?memberId=${newerReadyMember.memberId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      packageId: 'package-001',
      members: expect.arrayContaining([
        expect.objectContaining({ memberId: olderReadyMember.memberId }),
        expect.objectContaining({ memberId: newerReadyMember.memberId }),
      ]),
      selectedMemberId: newerReadyMember.memberId,
      selectedMember: {
        memberId: newerReadyMember.memberId,
        status: 'ready',
        artifact: {
          artifactId: newerReadyMember.artifactId,
          selectedVersionId: newerReadyMember.versionId,
        },
      },
    });

    await app.close();
  });

  it('TC-4.3c defaults to the first reviewable member when no explicit member is selected', async () => {
    const platformStore = buildStore([
      packageReviewTargetSchema.parse({
        packageId: 'package-002',
        displayName: 'Mixed Package',
        packageType: 'FeatureSpecificationOutput',
        members: [unavailableFirstMember, newerReadyMember],
        selectedMemberId: unavailableFirstMember.memberId,
        selectedMember: packageMemberReviewSchema.parse({
          memberId: unavailableFirstMember.memberId,
          status: 'unavailable',
          error: {
            code: 'REVIEW_MEMBER_UNAVAILABLE',
            message: 'The pinned package member is currently unavailable.',
          },
        }),
        exportability: {
          available: false,
          reason: 'One or more members are unavailable.',
        },
      }),
    ]);
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-002`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      selectedMemberId: newerReadyMember.memberId,
      selectedMember: {
        memberId: newerReadyMember.memberId,
        status: 'ready',
      },
      exportability: {
        available: false,
      },
    });

    await app.close();
  });

  it('returns an unavailable selected member when an explicit memberId is missing', async () => {
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
    const missingMemberId = 'package-member-missing';
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001?memberId=${missingMemberId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      packageId: 'package-001',
      members: expect.arrayContaining([
        expect.objectContaining({ memberId: olderReadyMember.memberId, status: 'ready' }),
        expect.objectContaining({ memberId: newerReadyMember.memberId, status: 'ready' }),
      ]),
      selectedMemberId: missingMemberId,
      selectedMember: {
        memberId: missingMemberId,
        status: 'unavailable',
        error: {
          code: 'REVIEW_MEMBER_UNAVAILABLE',
        },
      },
    });
    expect(response.json().selectedMember.artifact).toBeUndefined();

    await app.close();
  });

  it('TC-4.4a keeps the package open when one member is unavailable without hiding healthy members', async () => {
    const platformStore = buildStore([
      packageReviewTargetSchema.parse({
        packageId: 'package-003',
        displayName: 'Unavailable Member Package',
        packageType: 'FeatureSpecificationOutput',
        members: [olderReadyMember, unavailableFirstMember],
        selectedMemberId: olderReadyMember.memberId,
        selectedMember: packageMemberReviewSchema.parse({
          memberId: olderReadyMember.memberId,
          status: 'ready',
          artifact: artifactReviewTargetSchema.parse({
            artifactId: olderReadyMember.artifactId,
            displayName: olderReadyMember.displayName,
            currentVersionId: olderReadyMember.versionId,
            currentVersionLabel: olderReadyMember.versionLabel,
            selectedVersionId: olderReadyMember.versionId,
            versions: [
              {
                versionId: olderReadyMember.versionId,
                versionLabel: olderReadyMember.versionLabel,
                isCurrent: true,
                createdAt: '2026-04-23T12:01:00.000Z',
              },
            ],
          }),
        }),
        exportability: {
          available: false,
          reason: 'One or more members are unavailable.',
        },
      }),
    ]);
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
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-003?memberId=${unavailableFirstMember.memberId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      packageId: 'package-003',
      members: expect.arrayContaining([
        expect.objectContaining({
          memberId: olderReadyMember.memberId,
          status: 'ready',
        }),
        expect.objectContaining({
          memberId: unavailableFirstMember.memberId,
          status: 'unavailable',
        }),
      ]),
      selectedMemberId: unavailableFirstMember.memberId,
      selectedMember: {
        memberId: unavailableFirstMember.memberId,
        status: 'unavailable',
        error: {
          code: 'REVIEW_MEMBER_UNAVAILABLE',
        },
      },
      exportability: {
        available: false,
        reason: 'One or more members are unavailable or unsupported.',
      },
    });

    await app.close();
  });

  it('smoke returns a 20-member package review within the Story 4 timing target', async () => {
    const { packageId, process, project, store: platformStore } = buildTwentyMemberPackageStore();
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
    const startedAt = Date.now();

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project.projectId}/processes/${process.processId}/review/packages/${packageId}`,
        cookies: {
          [sessionCookieName]: 'valid-session-cookie',
        },
      });
      const elapsedMs = Date.now() - startedAt;
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.members).toHaveLength(20);
      expect(body.selectedMember).toMatchObject({
        memberId: 'package-member-smoke-1',
        status: 'ready',
      });
      expect(elapsedMs).toBeLessThan(2_000);
    } finally {
      await app.close();
    }
  });
});
