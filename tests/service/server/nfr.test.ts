import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { MarkdownRendererService } from '../../../apps/platform/server/services/rendering/markdown-renderer.service.js';
import { ARTIFACT_CONTENT_FETCH_TIMEOUT_MS } from '../../../apps/platform/server/services/review/artifact-review.service.js';
import {
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import type { PackageError } from '../../../packages/markdown-package/src/errors.js';
import { createPackageStream } from '../../../packages/markdown-package/src/tar/package-io.js';
import { buildApp } from '../../utils/build-app.js';

const TWO_SECONDS_MS = 2_000;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_review_nfr',
        cookiePassword: 'story6-review-nfr-cookie-password',
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
  userId: 'workos-user-1',
  workosUserId: 'workos-user-1',
  email: 'lee@example.com',
  displayName: 'Lee Moore',
};

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-review-nfr-001',
  name: 'Review NFR',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 20,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-nfr-001',
  displayLabel: 'Feature Specification #20',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

function buildTwentyMemberStore() {
  const members = Array.from({ length: 20 }, (_, index) =>
    packageMemberSchema.parse({
      memberId: `package-member-nfr-${index + 1}`,
      position: index,
      artifactId: `artifact-nfr-${index + 1}`,
      displayName: `NFR Artifact ${index + 1}`,
      versionId: `artifact-version-nfr-${index + 1}`,
      versionLabel: `nfr-v${index + 1}`,
      status: 'ready',
    }),
  );
  const firstMember = members[0];

  if (firstMember === undefined) {
    throw new Error('Expected NFR package to include a first member.');
  }

  const packageTarget = packageReviewTargetSchema.parse({
    packageId: 'package-nfr-20',
    displayName: 'Twenty Member NFR Package',
    packageType: 'FeatureSpecificationOutput',
    members,
    selectedMemberId: firstMember.memberId,
    selectedMember: packageMemberReviewSchema.parse({
      memberId: firstMember.memberId,
      status: 'ready',
      artifact: {
        artifactId: firstMember.artifactId,
        displayName: firstMember.displayName,
        currentVersionId: firstMember.versionId,
        currentVersionLabel: firstMember.versionLabel,
        selectedVersionId: firstMember.versionId,
        versions: [
          {
            versionId: firstMember.versionId,
            versionLabel: firstMember.versionLabel,
            isCurrent: true,
            createdAt: '2026-04-23T12:00:00.000Z',
          },
        ],
        selectedVersion: {
          versionId: firstMember.versionId,
          versionLabel: firstMember.versionLabel,
          contentKind: 'markdown',
          bodyStatus: 'ready',
          body: '<h1>NFR Artifact 1</h1>',
          mermaidBlocks: [],
          createdAt: '2026-04-23T12:00:00.000Z',
        },
      },
    }),
    exportability: { available: true },
  });

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
      [projectSummary.projectId]: members.map((member, index) => ({
        artifactId: member.artifactId,
        displayName: member.displayName,
        currentVersionLabel: member.versionLabel,
        attachmentScope: 'process',
        processId: processSummary.processId,
        processDisplayLabel: processSummary.displayLabel,
        updatedAt: `2026-04-23T12:${String(index).padStart(2, '0')}:00.000Z`,
      })),
    },
    artifactVersionsByArtifactId: Object.fromEntries(
      members.map((member, index) => [
        member.artifactId,
        [
          {
            versionId: member.versionId,
            artifactId: member.artifactId,
            versionLabel: member.versionLabel,
            contentStorageId: `storage-nfr-${index + 1}`,
            contentKind: 'markdown' as const,
            bytes: 72,
            createdAt: `2026-04-23T12:${String(index).padStart(2, '0')}:00.000Z`,
            createdByProcessId: processSummary.processId,
          },
        ],
      ]),
    ),
    artifactContentsByVersionId: Object.fromEntries(
      members.map((member) => [
        member.versionId,
        `# ${member.displayName}\n\nNFR package member body for ${member.versionLabel}.`,
      ]),
    ),
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: members.map((member) => member.artifactId),
        sourceAttachmentIds: [],
      },
    },
    reviewPackagesByProcessId: {
      [processSummary.processId]: [packageTarget],
    },
  });
}

function buildVersionSwitchStore() {
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
          artifactId: 'artifact-version-switch-nfr',
          displayName: 'Version Switch Artifact',
          currentVersionLabel: 'v2',
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: '2026-04-23T12:02:00.000Z',
        },
      ],
    },
    artifactVersionsByArtifactId: {
      'artifact-version-switch-nfr': [
        {
          versionId: 'artifact-version-switch-v2',
          artifactId: 'artifact-version-switch-nfr',
          versionLabel: 'v2',
          contentStorageId: 'storage-version-switch-v2',
          contentKind: 'markdown',
          bytes: 64,
          createdAt: '2026-04-23T12:02:00.000Z',
          createdByProcessId: processSummary.processId,
        },
        {
          versionId: 'artifact-version-switch-v1',
          artifactId: 'artifact-version-switch-nfr',
          versionLabel: 'v1',
          contentStorageId: 'storage-version-switch-v1',
          contentKind: 'markdown',
          bytes: 64,
          createdAt: '2026-04-23T12:01:00.000Z',
          createdByProcessId: processSummary.processId,
        },
      ],
    },
    artifactContentsByVersionId: {
      'artifact-version-switch-v2': '# Version Switch Artifact\n\nCurrent version body.',
      'artifact-version-switch-v1': '# Version Switch Artifact\n\nPrior version body.',
    },
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: ['artifact-version-switch-nfr'],
        sourceAttachmentIds: [],
      },
    },
  });
}

async function consumeStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function* packageEntries<T>(entries: T[]): AsyncIterable<T> {
  for (const entry of entries) {
    yield entry;
  }
}

describe('review workspace non-functional requirements', () => {
  it('renders a 200 KB markdown artifact within 2 seconds', async () => {
    const renderer = await MarkdownRendererService.create();
    const paragraph =
      'This paragraph keeps the review renderer busy with ordinary markdown text.\n\n';
    const markdown = `# Large Review Artifact\n\n${paragraph.repeat(
      Math.ceil((200 * 1024) / paragraph.length),
    )}`;
    const startedAt = performance.now();
    const result = renderer.render({ markdown, themeId: 'light' });
    const durationMs = performance.now() - startedAt;

    expect(result.bodyStatus).toBe('ready');
    expect(result.body).toContain('<h1>Large Review Artifact</h1>');
    expect(durationMs).toBeLessThan(TWO_SECONDS_MS);
  });

  it('returns a 20-member package review within 2 seconds', async () => {
    const platformStore = buildTwentyMemberStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const startedAt = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-nfr-20`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    const durationMs = performance.now() - startedAt;

    expect(response.statusCode).toBe(200);
    expect(response.json().members).toHaveLength(20);
    expect(durationMs).toBeLessThan(TWO_SECONDS_MS);

    await app.close();
  });

  it('switches artifact versions within 2 seconds', async () => {
    const platformStore = buildVersionSwitchStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const startedAt = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/artifact-version-switch-nfr?versionId=artifact-version-switch-v1`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    const durationMs = performance.now() - startedAt;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      selectedVersionId: 'artifact-version-switch-v1',
    });
    expect(durationMs).toBeLessThan(TWO_SECONDS_MS);

    await app.close();
  });

  it('prepares export metadata for a 20-member package within 2 seconds', async () => {
    const platformStore = buildTwentyMemberStore();
    const app = await buildApp({
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });
    const startedAt = performance.now();
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/package-nfr-20/export`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    const durationMs = performance.now() - startedAt;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ packageFormat: 'mpkz' });
    expect(durationMs).toBeLessThan(TWO_SECONDS_MS);

    await app.close();
  });

  it('honors review content timeout and package archive size caps', async () => {
    expect(ARTIFACT_CONTENT_FETCH_TIMEOUT_MS).toBe(10_000);
    expect(MAX_ARCHIVE_BYTES).toBe(256 * 1024 * 1024);

    const oversizeEntryStream = createPackageStream({
      compress: false,
      manifest: {
        metadata: { packageId: 'package-size-cap' },
        items: [{ title: 'Oversize', path: 'oversize.md' }],
      },
      entries: packageEntries([
        {
          path: 'oversize.md',
          content: Readable.from(['x']),
          size: MAX_ENTRY_BYTES + 1,
        },
      ]),
    });

    await expect(consumeStream(oversizeEntryStream)).rejects.toMatchObject({
      code: 'ENTRY_TOO_LARGE',
    } satisfies Partial<PackageError>);

    const archiveCapStream = createPackageStream({
      compress: false,
      maxTotalBytes: 1,
      manifest: {
        metadata: { packageId: 'package-archive-cap' },
        items: [{ title: 'Archive Cap', path: 'archive-cap.md' }],
      },
      entries: packageEntries([{ path: 'archive-cap.md', content: 'Archive body.' }]),
    });

    await expect(consumeStream(archiveCapStream)).rejects.toMatchObject({
      code: 'ARCHIVE_TOO_LARGE',
    } satisfies Partial<PackageError>);
  });
});
