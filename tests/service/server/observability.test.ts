import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { MarkdownRendererService } from '../../../apps/platform/server/services/rendering/markdown-renderer.service.js';
import {
  artifactReviewTargetSchema,
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';
import { buildApp } from '../../utils/build-app.js';

type LogRecord = Record<string, unknown>;

function createLogCapture() {
  const records: LogRecord[] = [];

  return {
    records,
    logger: {
      level: 'trace',
      stream: {
        write(line: string) {
          records.push(JSON.parse(line) as LogRecord);
        },
      },
      redact: {
        paths: [
          'token',
          '*.token',
          'signedUrl',
          '*.signedUrl',
          'req.headers.authorization',
          'req.url',
        ],
        censor: '[REDACTED]',
      },
    },
  };
}

function createDirectLogger(records: LogRecord[]) {
  return {
    info(fields: LogRecord) {
      records.push({ level: 30, ...fields });
    },
    warn(fields: LogRecord) {
      records.push({ level: 40, ...fields });
    },
    error(fields: LogRecord) {
      records.push({ level: 50, ...fields });
    },
  };
}

function findEvent(records: LogRecord[], event: string): LogRecord {
  const record = records.find((candidate) => candidate.event === event);

  if (record === undefined) {
    throw new Error(`Expected log event ${event}. Captured: ${JSON.stringify(records)}`);
  }

  return record;
}

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_review_observability',
        cookiePassword: 'story6-observability-cookie-password',
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
  projectId: 'project-review-observe-001',
  name: 'Observed Review',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 1,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-04-23T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-review-observe-001',
  displayLabel: 'Feature Specification #1',
  processType: 'FeatureSpecification',
  status: 'running',
  phaseLabel: 'Working',
  nextActionLabel: 'Review the latest output',
  availableActions: ['review'],
  hasEnvironment: false,
  updatedAt: '2026-04-23T12:00:00.000Z',
});

const member = packageMemberSchema.parse({
  memberId: 'package-member-observe-001',
  position: 0,
  artifactId: 'artifact-observe-001',
  displayName: 'Observed Artifact',
  versionId: 'artifact-version-observe-001',
  versionLabel: 'observe-v1',
  status: 'ready',
});
const artifactMarkdown = '# Observed Artifact\n\n```mermaid\n%%{init: {}}%%\ngraph TD\nA-->B\n```';

const packageTarget = packageReviewTargetSchema.parse({
  packageId: 'package-observe-001',
  displayName: 'Observed Package',
  packageType: 'FeatureSpecificationOutput',
  members: [member],
  selectedMemberId: member.memberId,
  selectedMember: packageMemberReviewSchema.parse({
    memberId: member.memberId,
    status: 'ready',
    artifact: artifactReviewTargetSchema.parse({
      artifactId: member.artifactId,
      displayName: member.displayName,
      currentVersionId: member.versionId,
      currentVersionLabel: member.versionLabel,
      selectedVersionId: member.versionId,
      versions: [
        {
          versionId: member.versionId,
          versionLabel: member.versionLabel,
          isCurrent: true,
          createdAt: '2026-04-23T12:00:00.000Z',
        },
      ],
    }),
  }),
  exportability: { available: true },
});

function buildStore(args: { includeContent?: boolean; forbidden?: boolean } = {}) {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [projectSummary],
    },
    projectAccessByProjectId: {
      [projectSummary.projectId]: args.forbidden
        ? { kind: 'forbidden' }
        : { kind: 'accessible', project: projectSummary },
    },
    processesByProjectId: {
      [projectSummary.projectId]: [processSummary],
    },
    artifactsByProjectId: {
      [projectSummary.projectId]: [
        {
          artifactId: member.artifactId,
          displayName: member.displayName,
          currentVersionLabel: member.versionLabel,
          attachmentScope: 'process',
          processId: processSummary.processId,
          processDisplayLabel: processSummary.displayLabel,
          updatedAt: '2026-04-23T12:00:00.000Z',
        },
      ],
    },
    artifactVersionsByArtifactId: {
      [member.artifactId]: [
        {
          versionId: member.versionId,
          artifactId: member.artifactId,
          versionLabel: member.versionLabel,
          contentStorageId: 'storage-observe-001',
          contentKind: 'markdown',
          bytes: Buffer.byteLength(artifactMarkdown, 'utf8'),
          createdAt: '2026-04-23T12:00:00.000Z',
          createdByProcessId: processSummary.processId,
        },
      ],
    },
    artifactContentsByVersionId:
      args.includeContent === false
        ? {}
        : {
            [member.versionId]: artifactMarkdown,
          },
    currentMaterialRefsByProcessId: {
      [processSummary.processId]: {
        artifactIds: [member.artifactId],
        sourceAttachmentIds: [],
      },
    },
    reviewPackagesByProcessId: {
      [processSummary.processId]: [packageTarget],
    },
  });
}

async function buildObservedApp(args: { includeContent?: boolean; forbidden?: boolean } = {}) {
  const logs = createLogCapture();
  const platformStore = buildStore(args);
  const app = await buildApp({
    logger: logs.logger,
    authSessionService: createTestAuthSessionService({ actor, reason: null }),
    authUserSyncService: new AuthUserSyncService(platformStore),
    platformStore,
  });

  return { app, logs };
}

describe('review workspace observability', () => {
  it('emits review workspace bootstrap logs from the real route', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.workspace.bootstrap')).toMatchObject({
      availableTargetCount: 2,
      responseStatus: 200,
    });
    await app.close();
  });

  it('emits artifact resolved logs from the real artifact route', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/${member.artifactId}`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.artifact.resolved')).toMatchObject({
      artifactId: member.artifactId,
      selectedVersionId: member.versionId,
      contentKind: 'markdown',
      bodyStatus: 'ready',
    });
    await app.close();
  });

  it('emits artifact content fetch failure logs from the real artifact route', async () => {
    const { app, logs } = await buildObservedApp({ includeContent: false });

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/artifacts/${member.artifactId}`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.artifact.content-fetch-failed')).toMatchObject({
      artifactId: member.artifactId,
      selectedVersionId: member.versionId,
      errorCode: 'REVIEW_RENDER_FAILED',
      reason: 'missing_content_url',
    });
    await app.close();
  });

  it('emits markdown render failure logs from the real renderer', async () => {
    const logs = createLogCapture();
    const renderer = await MarkdownRendererService.create({
      logger: createDirectLogger(logs.records),
    });

    renderer.render({ markdown: null as unknown as string, themeId: 'light' });

    expect(findEvent(logs.records, 'review.markdown.render-failed')).toMatchObject({
      errorCode: 'REVIEW_RENDER_FAILED',
      stage: 'parse',
    });
  });

  it('emits Mermaid directive stripped logs from the real renderer', async () => {
    const logs = createLogCapture();
    const renderer = await MarkdownRendererService.create({
      logger: createDirectLogger(logs.records),
    });

    renderer.render({
      markdown: '```mermaid\n%%{init: {}}%%\ngraph TD\nA-->B\n```',
      themeId: 'light',
      artifactId: member.artifactId,
      selectedVersionId: member.versionId,
    });

    expect(findEvent(logs.records, 'review.mermaid.directive-stripped')).toMatchObject({
      artifactId: member.artifactId,
      selectedVersionId: member.versionId,
      blockId: 'mermaid-block-1',
      directive: 'init',
    });
  });

  it('emits package review resolved logs from the real package route', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/${packageTarget.packageId}`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.package.resolved')).toMatchObject({
      packageId: packageTarget.packageId,
      memberCount: 1,
      selectedMemberId: member.memberId,
      selectedMemberStatus: 'ready',
      exportabilityAvailable: true,
    });
    await app.close();
  });

  it('emits export requested logs from the real export route', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/${packageTarget.packageId}/export`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.export.requested')).toMatchObject({
      packageId: packageTarget.packageId,
      actorId: `user:${actor.userId}`,
      result: 'success',
    });
    await app.close();
  });

  it('emits export downloaded logs from the real download route', async () => {
    const { app, logs } = await buildObservedApp();
    const exportResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/packages/${packageTarget.packageId}/export`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });
    const downloadUrl = new URL(exportResponse.json().downloadUrl);

    await app.inject({
      method: 'GET',
      url: `${downloadUrl.pathname}${downloadUrl.search}`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.export.downloaded')).toMatchObject({
      packageId: packageTarget.packageId,
      exportId: exportResponse.json().exportId,
      result: 'success',
    });
    await app.close();
  });

  it('emits export download failed logs without token prefixes', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review/exports/export-observe?token=secret-token-value`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.export.download-failed')).toMatchObject({
      exportId: 'export-observe',
      result: 'failure',
    });
    expect(JSON.stringify(logs.records)).not.toContain('secret-token-value');
    expect(JSON.stringify(logs.records)).not.toContain('tokenPrefix');
    await app.close();
  });

  it('emits access blocked logs from the real route', async () => {
    const logs = createLogCapture();
    const platformStore = buildStore();
    const app = await buildApp({
      logger: logs.logger,
      authSessionService: createTestAuthSessionService({
        actor: null,
        reason: 'missing_session',
      }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review`,
    });

    expect(findEvent(logs.records, 'review.access-blocked')).toMatchObject({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      reason: 'UNAUTHENTICATED',
    });
    await app.close();
  });

  it('emits unavailable target logs from the real route', async () => {
    const { app, logs } = await buildObservedApp();

    await app.inject({
      method: 'GET',
      url: `/api/projects/${projectSummary.projectId}/processes/${processSummary.processId}/review?targetKind=artifact&targetId=artifact-missing`,
      cookies: { [sessionCookieName]: 'valid-session-cookie' },
    });

    expect(findEvent(logs.records, 'review.target.unavailable')).toMatchObject({
      targetKind: 'artifact',
      targetId: 'artifact-missing',
      reason: 'REVIEW_TARGET_NOT_FOUND',
    });
    await app.close();
  });

  it('redacts secret-like token fields through the real pino stream', async () => {
    const logs = createLogCapture();
    const platformStore = buildStore();
    const app = await buildApp({
      logger: logs.logger,
      authSessionService: createTestAuthSessionService({ actor, reason: null }),
      authUserSyncService: new AuthUserSyncService(platformStore),
      platformStore,
    });

    app.log.info({ event: 'redaction.probe', token: 'secret-token-value' }, 'redaction probe');

    expect(findEvent(logs.records, 'redaction.probe')).toMatchObject({
      token: '[REDACTED]',
    });
    expect(JSON.stringify(logs.records)).not.toContain('secret-token-value');
    await app.close();
  });
});
