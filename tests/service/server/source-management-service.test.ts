import { describe, expect, it } from 'vitest';
import { AppError } from '../../../apps/platform/server/errors/app-error.js';
import {
  InMemoryPlatformStore,
  type CreateSourceAttachmentRecord,
  type PlatformStore,
} from '../../../apps/platform/server/services/projects/platform-store.js';
import type {
  GitHubRepositoryResolver,
  GitHubRepositoryResolution,
} from '../../../apps/platform/server/services/sources/github-repository-resolver.js';
import { DefaultSourceManagementService } from '../../../apps/platform/server/services/sources/source-management.service.js';
import {
  DefaultSourceRefreshService,
  type SourceHydrationExecutor,
} from '../../../apps/platform/server/services/sources/source-refresh.service.js';
import { DefaultSourceProvenanceService } from '../../../apps/platform/server/services/sources/source-provenance.service.js';
import {
  processSummarySchema,
  projectSummarySchema,
} from '../../../apps/platform/shared/contracts/index.js';

const projectSummary = projectSummarySchema.parse({
  projectId: 'project-source-management-001',
  name: 'Source Management',
  ownerDisplayName: 'Lee Moore',
  role: 'owner',
  processCount: 1,
  artifactCount: 0,
  sourceAttachmentCount: 0,
  lastUpdatedAt: '2026-05-01T12:00:00.000Z',
});

const processSummary = processSummarySchema.parse({
  processId: 'process-source-management-001',
  displayLabel: 'Feature Implementation #1',
  processType: 'FeatureImplementation',
  status: 'draft',
  phaseLabel: 'Draft',
  nextActionLabel: 'Open the process',
  availableActions: ['open'],
  hasEnvironment: false,
  updatedAt: '2026-05-01T12:00:00.000Z',
});

class StubGitHubRepositoryResolver implements GitHubRepositoryResolver {
  constructor(
    private readonly handler: (args: {
      repositoryUrl: string;
      targetRef: string | null;
    }) => Promise<GitHubRepositoryResolution> | GitHubRepositoryResolution,
  ) {}

  async resolveRepository(args: {
    repositoryUrl: string;
    targetRef: string | null;
  }): Promise<GitHubRepositoryResolution> {
    return this.handler(args);
  }
}

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
  });
}

function buildService(args: {
  store?: ConstructorParameters<typeof DefaultSourceManagementService>[0];
  resolver?: GitHubRepositoryResolver;
}) {
  return new DefaultSourceManagementService(
    args.store ?? buildStore(),
    args.resolver ??
      new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: targetRef === null ? 'none' : 'branch',
        defaultBranch: 'main',
        resolvedRef: targetRef === null ? null : 'a'.repeat(40),
      })),
  );
}

function buildRefreshService(args: {
  store?: InMemoryPlatformStore;
  resolver?: GitHubRepositoryResolver;
  hydrationExecutor?: SourceHydrationExecutor;
}) {
  return new DefaultSourceRefreshService(
    args.store ?? buildStore(),
    args.resolver ??
      new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: targetRef === null ? 'none' : 'branch',
        defaultBranch: 'main',
        resolvedRef: targetRef === null ? null : 'f'.repeat(40),
      })),
    args.hydrationExecutor ?? {
      async refreshRecoverableSource() {
        return {
          kind: 'settled' as const,
          hydratedAt: new Date().toISOString(),
        };
      },
    },
  );
}

function expectAppError(error: unknown, expected: { code: string; statusCode: number }) {
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject(expected);
}

describe('source-management service', () => {
  it('derives repositoryFullName from valid HTTPS GitHub URLs with and without .git', async () => {
    const service = buildService({});

    const withoutDotGit = await service.attachProjectSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      input: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(withoutDotGit.repositoryFullName).toBe('liminal-ai/liminal-build');

    const serviceWithDotGit = buildService({
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/reference-repo',
        targetRef,
        targetRefKind: 'branch',
        defaultBranch: 'main',
        resolvedRef: 'b'.repeat(40),
      })),
    });

    const withDotGit = await serviceWithDotGit.attachProjectSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      input: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/reference-repo.git',
        displayName: 'reference-repo',
        purpose: 'research',
        accessMode: 'read_only',
        targetRef: 'main',
      },
    });

    expect(withDotGit.repositoryFullName).toBe('liminal-ai/reference-repo');
  });

  it('rejects mismatched repositoryUrl and repositoryFullName', async () => {
    const service = buildService({});

    await expect(
      service.attachProjectSource({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        projectId: projectSummary.projectId,
        input: {
          provider: 'github',
          repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
          repositoryFullName: 'liminal-ai/different-repo',
          displayName: 'liminal-build',
          purpose: 'implementation',
          accessMode: 'read_only',
          targetRef: 'main',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectAppError(error, {
        code: 'INVALID_SOURCE_ATTACHMENT',
        statusCode: 422,
      });
      return true;
    });
  });

  it('rejects non-GitHub URLs in the repository-only attach flow', async () => {
    const service = buildService({});

    await expect(
      service.attachProjectSource({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        projectId: projectSummary.projectId,
        input: {
          provider: 'github',
          repositoryUrl: 'https://gitlab.com/liminal-ai/liminal-build',
          displayName: 'liminal-build',
          purpose: 'implementation',
          accessMode: 'read_only',
          targetRef: 'main',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectAppError(error, {
        code: 'INVALID_SOURCE_ATTACHMENT',
        statusCode: 422,
      });
      return true;
    });
  });

  it('rejects read_write sources that target tags or commits', async () => {
    const tagService = buildService({
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: 'tag',
        defaultBranch: 'main',
        resolvedRef: 'c'.repeat(40),
      })),
    });
    const commitService = buildService({
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: 'commit',
        defaultBranch: 'main',
        resolvedRef: 'd'.repeat(40),
      })),
    });

    await expect(
      tagService.attachProjectSource({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        projectId: projectSummary.projectId,
        input: {
          provider: 'github',
          repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
          displayName: 'liminal-build',
          purpose: 'implementation',
          accessMode: 'read_write',
          targetRef: 'v1.0.0',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectAppError(error, {
        code: 'SOURCE_ATTACHMENT_CONFLICT',
        statusCode: 409,
      });
      return true;
    });

    await expect(
      commitService.attachProjectSource({
        actor: {
          userId: 'workos-user-1',
          workosUserId: 'workos-user-1',
          email: 'lee@example.com',
          displayName: 'Lee Moore',
        },
        projectId: projectSummary.projectId,
        input: {
          provider: 'github',
          repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
          displayName: 'liminal-build',
          purpose: 'implementation',
          accessMode: 'read_write',
          targetRef: '0123456789abcdef0123456789abcdef01234567',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectAppError(error, {
        code: 'SOURCE_ATTACHMENT_CONFLICT',
        statusCode: 409,
      });
      return true;
    });
  });

  it('resolves a missing targetRef on read_write to the repository default branch before persistence', async () => {
    const store = buildStore();
    const service = buildService({
      store,
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef: null,
        targetRefKind: 'none',
        defaultBranch: 'develop',
        resolvedRef: null,
      })),
    });

    const attachment = await service.attachProjectSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      input: {
        provider: 'github',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        displayName: 'liminal-build',
        purpose: 'implementation',
        accessMode: 'read_write',
        targetRef: null,
      },
    });

    expect(attachment.targetRef).toBe('develop');
  });

  it('TC-1.3c allows the same repository at project and process scope', async () => {
    const store = buildStore();
    const service = buildService({
      store,
    });

    const baseInput: Omit<CreateSourceAttachmentRecord, 'projectId'> & { displayName: string } = {
      provider: 'github',
      displayName: 'liminal-build',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    };

    const projectAttachment = await service.attachProjectSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      input: baseInput,
    });
    const processAttachment = await service.attachProcessSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      input: baseInput,
    });

    expect(projectAttachment.attachmentScope).toBe('project');
    expect(processAttachment.attachmentScope).toBe('process');
    expect(processAttachment.processId).toBe(processSummary.processId);
  });

  it('branch-head movement marks a hydrated source stale using durable resolved-ref snapshot fields', async () => {
    const store = buildStore();
    const created = await store.createProjectSourceAttachment({
      projectId: projectSummary.projectId,
      provider: 'github',
      displayName: 'liminal-build',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    });

    await store.updateSourceAttachment({
      projectId: projectSummary.projectId,
      sourceAttachmentId: created.sourceAttachmentId,
      purpose: created.purpose,
      accessMode: created.accessMode,
      targetRef: created.targetRef,
      hydrationState: 'hydrated',
      freshnessReason: null,
      lastHydratedAt: '2026-05-01T12:00:00.000Z',
      lastHydratedResolvedRef: 'a'.repeat(40),
      lastObservedRemoteResolvedRef: 'a'.repeat(40),
    });

    const refreshService = buildRefreshService({
      store,
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: 'branch',
        defaultBranch: 'main',
        resolvedRef: 'b'.repeat(40),
      })),
    });

    const synchronized = await refreshService.synchronizeProjectSourceAttachments({
      projectId: projectSummary.projectId,
      sourceAttachments: await store.listProjectSourceAttachments({
        projectId: projectSummary.projectId,
      }),
    });

    expect(synchronized[0]).toMatchObject({
      sourceAttachmentId: created.sourceAttachmentId,
      hydrationState: 'stale',
      freshnessReason: 'branch_head_moved',
      lastObservedRemoteResolvedRef: 'b'.repeat(40),
    });

    await expect(
      store.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: created.sourceAttachmentId,
      }),
    ).resolves.toMatchObject({
      sourceAttachmentId: created.sourceAttachmentId,
      hydrationState: 'stale',
      freshnessReason: 'branch_head_moved',
      lastObservedRemoteResolvedRef: 'b'.repeat(40),
    });
  });

  it('updates by sourceAttachmentId even when the project attachment list is capped before that row', async () => {
    const backingStore = buildStore();

    for (let index = 0; index < 205; index += 1) {
      await backingStore.createProjectSourceAttachment({
        projectId: projectSummary.projectId,
        provider: 'github',
        displayName: `liminal-build-${index}`,
        purpose: 'implementation',
        accessMode: 'read_only',
        repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef: `feature/story-${index}`,
      });
    }

    const targetAttachment = (
      await backingStore.listProjectSourceAttachments({
        projectId: projectSummary.projectId,
      })
    ).at(-1);

    if (targetAttachment === undefined) {
      throw new Error('Expected the seed data to include a source attachment update target.');
    }

    const cappedStore = {
      getProjectSourceAttachment: backingStore.getProjectSourceAttachment.bind(backingStore),
      listProjectSourceAttachments: async (args: { projectId: string }) =>
        (await backingStore.listProjectSourceAttachments(args)).slice(0, 200),
      createProjectSourceAttachment: backingStore.createProjectSourceAttachment.bind(backingStore),
      createProcessSourceAttachment: backingStore.createProcessSourceAttachment.bind(backingStore),
      updateSourceAttachment: backingStore.updateSourceAttachment.bind(backingStore),
    } as unknown as PlatformStore & {
      getProjectSourceAttachment: NonNullable<PlatformStore['getProjectSourceAttachment']>;
      createProjectSourceAttachment: NonNullable<PlatformStore['createProjectSourceAttachment']>;
      createProcessSourceAttachment: NonNullable<PlatformStore['createProcessSourceAttachment']>;
      updateSourceAttachment: NonNullable<PlatformStore['updateSourceAttachment']>;
    };

    const service = buildService({
      store: cappedStore,
      resolver: new StubGitHubRepositoryResolver(({ repositoryUrl, targetRef }) => ({
        kind: 'resolved',
        repositoryUrl,
        repositoryFullName: 'liminal-ai/liminal-build',
        targetRef,
        targetRefKind: 'branch',
        defaultBranch: 'main',
        resolvedRef: 'e'.repeat(40),
      })),
    });

    const updated = await service.updateSource({
      actor: {
        userId: 'workos-user-1',
        workosUserId: 'workos-user-1',
        email: 'lee@example.com',
        displayName: 'Lee Moore',
      },
      projectId: projectSummary.projectId,
      sourceAttachmentId: targetAttachment.sourceAttachmentId,
      input: {
        purpose: 'review',
        accessMode: 'read_write',
        targetRef: 'feature/story-205-updated',
      },
    });

    expect(updated).toMatchObject({
      sourceAttachmentId: targetAttachment.sourceAttachmentId,
      purpose: 'review',
      accessMode: 'read_write',
      targetRef: 'feature/story-205-updated',
    });

    expect(
      (
        await cappedStore.listProjectSourceAttachments({
          projectId: projectSummary.projectId,
        })
      ).some((attachment) => attachment.sourceAttachmentId === targetAttachment.sourceAttachmentId),
    ).toBe(false);

    await expect(
      backingStore.getProjectSourceAttachment({
        projectId: projectSummary.projectId,
        sourceAttachmentId: targetAttachment.sourceAttachmentId,
      }),
    ).resolves.toMatchObject({
      sourceAttachmentId: targetAttachment.sourceAttachmentId,
      purpose: 'review',
      accessMode: 'read_write',
      targetRef: 'feature/story-205-updated',
    });
  });

  it('TC-4.3a read-only source not recorded as write target', async () => {
    const store = buildStore();
    const readOnlyAttachment = await store.createProcessSourceAttachment({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      provider: 'github',
      displayName: 'liminal-build',
      purpose: 'implementation',
      accessMode: 'read_only',
      repositoryUrl: 'https://github.com/liminal-ai/liminal-build',
      repositoryFullName: 'liminal-ai/liminal-build',
      targetRef: 'main',
    });
    const provenanceService = new DefaultSourceProvenanceService(store);

    await provenanceService.recordReceivedCodeUpdates({
      projectId: projectSummary.projectId,
      processId: processSummary.processId,
      codeTargets: [
        {
          sourceAttachmentId: readOnlyAttachment.sourceAttachmentId,
          repositoryUrl: readOnlyAttachment.repositoryUrl,
          targetRef: readOnlyAttachment.targetRef,
          filePath: 'src/index.ts',
          diff: 'updated content',
          commitMessage: 'checkpoint',
        },
      ],
    });

    await expect(
      store.listProcessSourceProvenance({
        processId: processSummary.processId,
      }),
    ).resolves.toEqual([]);
  });
});
