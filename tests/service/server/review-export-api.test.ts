import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { HmacExportUrlSigner } from '../../../apps/platform/server/services/review/export-url-signing.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_review_export',
        cookiePassword: 'story5-review-export-cookie-password',
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
  projectId: 'project-review-export-001',
  name: 'Artifact Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 2,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-export-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

function buildStore(includeUnavailableMember = false, useCollidingMemberNames = false) {
  const firstMemberDisplayName = useCollidingMemberNames ? 'Spec' : 'Feature Specification';
  const secondMemberDisplayName = useCollidingMemberNames ? 'Spec' : 'Implementation Notes';

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
          bytes: 49,
          createdAt: '2026-04-23T12:05:00.000Z',
          createdByProcessId: processSummary.processId,
        },
        {
          versionId: 'artifact-version-001-pinned',
          artifactId: 'artifact-001',
          versionLabel: 'spec-v1',
          contentStorageId: 'storage-spec-v1',
          contentKind: 'markdown',
          bytes: 48,
          createdAt: '2026-04-23T12:01:00.000Z',
          createdByProcessId: processSummary.processId,
        },
      ],
      'artifact-002': includeUnavailableMember
        ? []
        : [
            {
              versionId: 'artifact-version-002-pinned',
              artifactId: 'artifact-002',
              versionLabel: 'notes-v1',
              contentStorageId: 'storage-notes-v1',
              contentKind: 'markdown',
              bytes: 41,
              createdAt: '2026-04-23T12:03:00.000Z',
              createdByProcessId: processSummary.processId,
            },
          ],
    },
    artifactContentsByVersionId: {
      'artifact-version-001-pinned': '# Feature Specification v1\n\nPinned package body.',
      'artifact-version-002-current': '# Feature Specification v2\n\nLatest artifact body.',
      'artifact-version-002-pinned': '# Implementation Notes v1\n\nCurrent notes.',
    },
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: ['artifact-001', 'artifact-002'],
        sourceAttachmentIds: [],
      },
    },
    reviewPackagesByProcessId: {
      [processSummary.processId]: [
        {
          packageId: 'package-001',
          displayName: 'Feature Specification Package',
          packageType: 'FeatureSpecificationOutput',
          members: [
            {
              memberId: 'package-member-001',
              position: 0,
              artifactId: 'artifact-001',
              displayName: firstMemberDisplayName,
              versionId: 'artifact-version-001-pinned',
              versionLabel: 'spec-v1',
              status: 'ready',
            },
            {
              memberId: 'package-member-002',
              position: 1,
              artifactId: 'artifact-002',
              displayName: secondMemberDisplayName,
              versionId: 'artifact-version-002-pinned',
              versionLabel: 'notes-v1',
              status: includeUnavailableMember ? 'unavailable' : 'ready',
            },
          ],
          selectedMemberId: 'package-member-001',
          selectedMember: {
            memberId: 'package-member-001',
            status: 'ready',
            artifact: {
              artifactId: 'artifact-001',
              displayName: 'Feature Specification',
              currentVersionId: 'artifact-version-001-pinned',
              currentVersionLabel: 'spec-v1',
              selectedVersionId: 'artifact-version-001-pinned',
              versions: [
                {
                  versionId: 'artifact-version-001-pinned',
                  versionLabel: 'spec-v1',
                  isCurrent: true,
                  createdAt: '2026-04-23T12:01:00.000Z',
                },
              ],
              selectedVersion: {
                versionId: 'artifact-version-001-pinned',
                versionLabel: 'spec-v1',
                contentKind: 'markdown',
                bodyStatus: 'ready',
                body: '<h1>Feature Specification v1</h1>',
                mermaidBlocks: [],
                createdAt: '2026-04-23T12:01:00.000Z',
              },
            },
          },
          exportability: includeUnavailableMember
            ? {
                available: false,
                reason: 'One or more members are unavailable.',
              }
            : {
                available: true,
              },
        },
      ],
    },
  });
}

function readTarEntry(archive: Buffer, entryPath: string): string | null {
  let offset = 0;

  while (offset + 512 <= archive.byteLength) {
    const header = archive.subarray(offset, offset + 512);
    offset += 512;

    if (header.every((byte) => byte === 0)) {
      return null;
    }

    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const size = Number.parseInt(
      header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim() || '0',
      8,
    );
    const content = archive.subarray(offset, offset + size);
    const padding = size % 512 === 0 ? 0 : 512 - (size % 512);

    if (name === entryPath) {
      return content.toString('utf8');
    }

    offset += size + padding;
  }

  return null;
}

describe('review export api', () => {
  it('TC-5.1a and TC-5.2 export the current package as a pinned .mpkz archive with manifest metadata', async () => {
    const platformStore = buildStore();
    const infoLogs: Array<Record<string, unknown>> = [];
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
      logger: {
        stream: {
          write(line: string) {
            const log = JSON.parse(line) as Record<string, unknown>;
            if (log.level === 30) {
              infoLogs.push(log);
            }
          },
        },
      },
    });

    const exportResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001/export`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json()).toMatchObject({
      contentType: 'application/gzip',
      packageFormat: 'mpkz',
    });
    const exportBody = exportResponse.json();

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `${new URL(exportBody.downloadUrl).pathname}${new URL(exportBody.downloadUrl).search}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('application/gzip');
    expect(downloadResponse.headers['cache-control']).toBe('private, no-store, max-age=0');
    expect(downloadResponse.headers.pragma).toBe('no-cache');
    expect(downloadResponse.headers.expires).toBe('0');

    const archiveBytes =
      downloadResponse.rawPayload instanceof Buffer
        ? downloadResponse.rawPayload
        : Buffer.from(downloadResponse.body, 'binary');
    const archive = gunzipSync(archiveBytes);
    const manifest = readTarEntry(archive, '_nav.md');
    const specification = readTarEntry(archive, '1-feature-specification.md');

    expect(manifest).toContain('packageId: package-001');
    expect(manifest).toContain('spec-v1');
    expect(specification).toContain('Pinned package body.');
    expect(specification).not.toContain('Latest artifact body.');
    expect(infoLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'review.export.requested',
          packageId: 'package-001',
          processId: processSummary.processId,
          actorId: 'user:workos-user-1',
          exportId: exportBody.exportId,
          result: 'success',
        }),
        expect.objectContaining({
          event: 'review.export.downloaded',
          packageId: 'package-001',
          exportId: exportBody.exportId,
          result: 'success',
        }),
      ]),
    );

    await app.close();
  });

  it('preserves package members with colliding display names as distinct archive paths', async () => {
    const platformStore = buildStore(false, true);
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

    const exportResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001/export`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });
    const exportBody = exportResponse.json();
    const downloadUrl = new URL(exportBody.downloadUrl);

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `${downloadUrl.pathname}${downloadUrl.search}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(downloadResponse.statusCode).toBe(200);

    const archiveBytes =
      downloadResponse.rawPayload instanceof Buffer
        ? downloadResponse.rawPayload
        : Buffer.from(downloadResponse.body, 'binary');
    const archive = gunzipSync(archiveBytes);
    const manifest = readTarEntry(archive, '_nav.md');
    const firstSpec = readTarEntry(archive, '1-spec.md');
    const secondSpec = readTarEntry(archive, '2-spec.md');

    expect(manifest).toContain('[Spec (spec-v1)](1-spec.md)');
    expect(manifest).toContain('[Spec (notes-v1)](2-spec.md)');
    expect(firstSpec).toContain('Pinned package body.');
    expect(secondSpec).toContain('Current notes.');

    await app.close();
  });

  it('TC-5.1b rejects export preflight when a package member is unavailable', async () => {
    const platformStore = buildStore(true);
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
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001/export`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: 'REVIEW_EXPORT_NOT_AVAILABLE',
    });

    await app.close();
  });

  it('TC-5.3a maps unexpected export preparation failures to REVIEW_EXPORT_FAILED', async () => {
    const platformStore = buildStore();
    platformStore.listPackageSnapshotMembers = async () => {
      throw new Error('simulated package snapshot member read failure');
    };
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
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-001/export`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: 'REVIEW_EXPORT_FAILED',
    });

    await app.close();
  });

  it.each([
    {
      label: 'missing',
      exportId: 'export-missing-token',
      token: null,
      expectedFailurePackageId: null,
    },
    {
      label: 'malformed',
      exportId: 'export-malformed-token',
      token: 'not-a-signed-token',
      expectedFailurePackageId: null,
    },
    {
      label: 'tampered',
      exportId: 'export-tampered',
      token: `${new HmacExportUrlSigner('story0-review-export-hmac-secret-placeholder').mint({
        exportId: 'export-tampered',
        packageSnapshotId: 'package-001',
        actorId: 'workos-user-1',
        expiresAt: '2026-04-24T00:00:00.000Z',
      })}tampered`,
      expectedFailurePackageId: 'package-001',
    },
    {
      label: 'expired',
      exportId: 'export-expired',
      token: new HmacExportUrlSigner('story0-review-export-hmac-secret-placeholder').mint({
        exportId: 'export-expired',
        packageSnapshotId: 'package-001',
        actorId: 'workos-user-1',
        expiresAt: '2026-04-01T00:00:00.000Z',
      }),
      expectedFailurePackageId: 'package-001',
    },
  ])('TC-5.3b returns REVIEW_TARGET_NOT_FOUND when the signed export URL token is $label', async ({
    exportId,
    token,
    expectedFailurePackageId,
  }) => {
    const platformStore = buildStore();
    const warnLogs: Array<Record<string, unknown>> = [];
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
      logger: {
        stream: {
          write(line: string) {
            const log = JSON.parse(line) as Record<string, unknown>;
            if (log.level === 40) {
              warnLogs.push(log);
            }
          },
        },
      },
    });
    const url =
      token === null
        ? `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/exports/${exportId}`
        : `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/exports/${exportId}?token=${encodeURIComponent(token)}`;

    const response = await app.inject({
      method: 'GET',
      url,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('private, no-store, max-age=0');
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers.expires).toBe('0');
    expect(response.json()).toMatchObject({
      code: 'REVIEW_TARGET_NOT_FOUND',
    });
    expect(warnLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'review.export.download-failed',
          packageId: expectedFailurePackageId,
          exportId,
          result: 'failure',
        }),
      ]),
    );

    await app.close();
  });
});
