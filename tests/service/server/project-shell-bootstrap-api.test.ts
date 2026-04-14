import { describe, expect, it } from 'vitest';
import {
  AuthSessionService,
  type SessionResolution,
  sessionCookieName,
} from '../../../apps/platform/server/services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../../../apps/platform/server/services/auth/auth-user-sync.service.js';
import { InMemoryPlatformStore } from '../../../apps/platform/server/services/projects/platform-store.js';
import { ProjectShellService } from '../../../apps/platform/server/services/projects/project-shell.service.js';
import { ArtifactSectionReader } from '../../../apps/platform/server/services/projects/readers/artifact-section.reader.js';
import { ProcessSectionReader } from '../../../apps/platform/server/services/projects/readers/process-section.reader.js';
import { SourceSectionReader } from '../../../apps/platform/server/services/projects/readers/source-section.reader.js';
import {
  currentVersionArtifactFixture,
  noCurrentVersionArtifactFixture,
  processScopedArtifactFixture,
} from '../../fixtures/artifacts.js';
import {
  draftProcessFixture,
  runningProcessFixture,
  waitingProcessFixture,
} from '../../fixtures/processes.js';
import { inaccessibleProjectId, populatedProjectSummary } from '../../fixtures/projects.js';
import {
  hydratedSourceFixture,
  notHydratedSourceFixture,
  staleSourceFixture,
} from '../../fixtures/sources.js';
import { buildApp } from '../../utils/build-app.js';

function createTestAuthSessionService(resolution: SessionResolution) {
  class TestAuthSessionService extends AuthSessionService {
    constructor() {
      super({
        workosClient: {} as never,
        clientId: 'client_test_story3',
        cookiePassword: 'story3-cookie-password-story3-cookie-password',
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

class ThrowingArtifactSectionReader extends ArtifactSectionReader {
  override async read(
    _args: Parameters<ArtifactSectionReader['read']>[0],
  ): Promise<Awaited<ReturnType<ArtifactSectionReader['read']>>> {
    throw new Error('Artifact summaries failed to load in test.');
  }
}

class ThrowingSourceSectionReader extends SourceSectionReader {
  override async read(
    _args: Parameters<SourceSectionReader['read']>[0],
  ): Promise<Awaited<ReturnType<SourceSectionReader['read']>>> {
    throw new Error('Source summaries failed to load in test.');
  }
}

class ThrowingProcessSectionReader extends ProcessSectionReader {
  override async read(
    _args: Parameters<ProcessSectionReader['read']>[0],
  ): Promise<Awaited<ReturnType<ProcessSectionReader['read']>>> {
    throw new Error('Process summaries failed to load in test.');
  }
}

function buildPopulatedStore() {
  return new InMemoryPlatformStore({
    accessibleProjectsByUserId: {
      'user:workos-user-1': [populatedProjectSummary],
    },
    projectAccessByProjectId: {
      [populatedProjectSummary.projectId]: {
        kind: 'accessible',
        project: populatedProjectSummary,
      },
    },
    processesByProjectId: {
      [populatedProjectSummary.projectId]: [
        draftProcessFixture,
        waitingProcessFixture,
        runningProcessFixture,
      ],
    },
    artifactsByProjectId: {
      [populatedProjectSummary.projectId]: [
        currentVersionArtifactFixture,
        noCurrentVersionArtifactFixture,
        processScopedArtifactFixture,
      ],
    },
    sourceAttachmentsByProjectId: {
      [populatedProjectSummary.projectId]: [
        hydratedSourceFixture,
        notHydratedSourceFixture,
        staleSourceFixture,
      ],
    },
  });
}

describe('project shell bootstrap api', () => {
  it('TC-3.1a returns populated shell section envelopes sorted by updatedAt descending', async () => {
    const platformStore = buildPopulatedStore();
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
      url: `/api/projects/${populatedProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: populatedProjectSummary,
      processes: {
        status: 'ready',
      },
      artifacts: {
        status: 'ready',
      },
      sourceAttachments: {
        status: 'ready',
      },
    });
    expect(
      response.json().processes.items.map((item: { processId: string }) => item.processId),
    ).toEqual([
      waitingProcessFixture.processId,
      runningProcessFixture.processId,
      draftProcessFixture.processId,
    ]);
    expect(
      response.json().artifacts.items.map((item: { artifactId: string }) => item.artifactId),
    ).toEqual([
      processScopedArtifactFixture.artifactId,
      currentVersionArtifactFixture.artifactId,
      noCurrentVersionArtifactFixture.artifactId,
    ]);
    expect(
      response
        .json()
        .sourceAttachments.items.map(
          (item: { sourceAttachmentId: string }) => item.sourceAttachmentId,
        ),
    ).toEqual([
      staleSourceFixture.sourceAttachmentId,
      hydratedSourceFixture.sourceAttachmentId,
      notHydratedSourceFixture.sourceAttachmentId,
    ]);

    await app.close();
  });

  it('TC-6.3a returns an artifact section error without blocking healthy sections', async () => {
    const platformStore = buildPopulatedStore();
    const projectShellService = new ProjectShellService(platformStore, {
      artifactSectionReader: new ThrowingArtifactSectionReader(platformStore),
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
      projectShellService,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${populatedProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processes.status).toBe('ready');
    expect(response.json().sourceAttachments.status).toBe('ready');
    expect(response.json().artifacts).toEqual({
      status: 'error',
      items: [],
      error: {
        code: 'PROJECT_SHELL_ARTIFACTS_LOAD_FAILED',
        message: 'Artifact summaries failed to load in test.',
      },
    });

    await app.close();
  });

  it('TC-6.3b returns a source section error without blocking healthy sections', async () => {
    const platformStore = buildPopulatedStore();
    const projectShellService = new ProjectShellService(platformStore, {
      sourceSectionReader: new ThrowingSourceSectionReader(platformStore),
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
      projectShellService,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${populatedProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processes.status).toBe('ready');
    expect(response.json().artifacts.status).toBe('ready');
    expect(response.json().sourceAttachments).toEqual({
      status: 'error',
      items: [],
      error: {
        code: 'PROJECT_SHELL_SOURCES_LOAD_FAILED',
        message: 'Source summaries failed to load in test.',
      },
    });

    await app.close();
  });

  it('TC-6.3c returns a process section error without blocking healthy sections', async () => {
    const platformStore = buildPopulatedStore();
    const projectShellService = new ProjectShellService(platformStore, {
      processSectionReader: new ThrowingProcessSectionReader(platformStore),
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
      projectShellService,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/api/projects/${populatedProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().artifacts.status).toBe('ready');
    expect(response.json().sourceAttachments.status).toBe('ready');
    expect(response.json().processes).toEqual({
      status: 'error',
      items: [],
      error: {
        code: 'PROJECT_SHELL_PROCESSES_LOAD_FAILED',
        message: 'Process summaries failed to load in test.',
      },
    });

    await app.close();
  });

  it('TC-5.2a, TC-5.2b, and TC-5.2c keep durable shell summaries visible without an environment', async () => {
    const platformStore = buildPopulatedStore();
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
      url: `/api/projects/${populatedProjectSummary.projectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(
      response
        .json()
        .processes.items.every(
          (item: { hasEnvironment: boolean }) => item.hasEnvironment === false,
        ),
    ).toBe(true);
    expect(response.json().artifacts.items).toHaveLength(3);
    expect(response.json().sourceAttachments.items).toHaveLength(3);

    await app.close();
  });

  it('TC-6.2a returns 404 without leaking removed project data', async () => {
    const platformStore = buildPopulatedStore();
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
      url: `/api/projects/${inaccessibleProjectId}`,
      cookies: {
        [sessionCookieName]: 'valid-session-cookie',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: 'PROJECT_NOT_FOUND',
      message: 'The requested project was not found.',
      status: 404,
    });
    expect(JSON.stringify(response.json())).not.toContain(populatedProjectSummary.name);

    await app.close();
  });
});
