import type {
  CreateSourceAttachmentRequest,
  SourceAttachmentSummary,
} from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { CreateSourceAttachmentRecord, PlatformStore } from '../projects/platform-store.js';
import type { GitHubRepositoryResolver } from './github-repository-resolver.js';
import { SourceIdentityService } from './source-identity.service.js';

type SourceManagementPlatformStore = PlatformStore & {
  createProjectSourceAttachment: NonNullable<PlatformStore['createProjectSourceAttachment']>;
  createProcessSourceAttachment: NonNullable<PlatformStore['createProcessSourceAttachment']>;
};

export interface SourceManagementService {
  attachProjectSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    input: CreateSourceAttachmentRequest;
  }): Promise<SourceAttachmentSummary>;
  attachProcessSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    input: CreateSourceAttachmentRequest;
  }): Promise<SourceAttachmentSummary>;
}

export class DefaultSourceManagementService implements SourceManagementService {
  constructor(
    private readonly platformStore: SourceManagementPlatformStore,
    private readonly gitHubRepositoryResolver: GitHubRepositoryResolver,
    private readonly sourceIdentityService: SourceIdentityService = new SourceIdentityService(),
  ) {}

  async attachProjectSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    input: CreateSourceAttachmentRequest;
  }): Promise<SourceAttachmentSummary> {
    void args.actor;
    const sourceRecord = await this.prepareSourceAttachment({
      projectId: args.projectId,
      processId: null,
      input: args.input,
    });
    return this.persistSourceAttachment(() =>
      this.platformStore.createProjectSourceAttachment(sourceRecord),
    );
  }

  async attachProcessSource(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    input: CreateSourceAttachmentRequest;
  }): Promise<SourceAttachmentSummary> {
    void args.actor;
    const sourceRecord = await this.prepareSourceAttachment({
      projectId: args.projectId,
      processId: args.processId,
      input: args.input,
    });
    return this.persistSourceAttachment(() =>
      this.platformStore.createProcessSourceAttachment({
        ...sourceRecord,
        processId: args.processId,
      }),
    );
  }

  private async persistSourceAttachment(
    operation: () => Promise<SourceAttachmentSummary>,
  ): Promise<SourceAttachmentSummary> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.message === 'SOURCE_ATTACHMENT_CONFLICT') {
        throw new AppError({
          code: 'SOURCE_ATTACHMENT_CONFLICT',
          message:
            'An active source attachment already exists for this repository, scope, and target ref.',
          statusCode: 409,
        });
      }

      throw error;
    }
  }

  private async prepareSourceAttachment(args: {
    projectId: string;
    processId: string | null;
    input: CreateSourceAttachmentRequest;
  }): Promise<CreateSourceAttachmentRecord> {
    if (args.input.provider !== 'github') {
      throw new AppError({
        code: 'INVALID_SOURCE_ATTACHMENT',
        message: 'Only GitHub-backed source attachments are supported in this flow.',
        statusCode: 422,
      });
    }

    const parsedIdentity = this.sourceIdentityService.parseGitHubRepositoryUrl(
      args.input.repositoryUrl,
    );

    if (parsedIdentity === null) {
      throw new AppError({
        code: 'INVALID_SOURCE_ATTACHMENT',
        message: 'Repository URL must be an https://github.com/<owner>/<repo> repository URL.',
        statusCode: 422,
      });
    }

    const providedRepositoryFullName =
      args.input.repositoryFullName === undefined
        ? undefined
        : this.sourceIdentityService.normalizeRepositoryFullName(args.input.repositoryFullName);

    if (
      providedRepositoryFullName !== undefined &&
      providedRepositoryFullName !== parsedIdentity.repositoryFullName
    ) {
      throw new AppError({
        code: 'INVALID_SOURCE_ATTACHMENT',
        message: 'Provided repositoryFullName must match the repositoryUrl identity.',
        statusCode: 422,
      });
    }

    const normalizedTargetRef = this.sourceIdentityService.normalizeTargetRef(args.input.targetRef);
    const repositoryResolution = await this.gitHubRepositoryResolver.resolveRepository({
      repositoryUrl: parsedIdentity.repositoryUrl,
      targetRef: normalizedTargetRef,
    });

    if (repositoryResolution.kind === 'invalid') {
      throw new AppError({
        code: 'INVALID_SOURCE_ATTACHMENT',
        message: repositoryResolution.message,
        statusCode: 422,
      });
    }

    if (repositoryResolution.kind === 'inaccessible') {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_UNAVAILABLE',
        message: repositoryResolution.message,
        statusCode: 503,
      });
    }

    const resolvedTargetRef =
      args.input.accessMode === 'read_write'
        ? (repositoryResolution.targetRef ?? repositoryResolution.defaultBranch)
        : repositoryResolution.targetRef;

    const resolvedTargetRefKind =
      repositoryResolution.targetRef === null && args.input.accessMode === 'read_write'
        ? 'branch'
        : repositoryResolution.targetRefKind;

    if (args.input.accessMode === 'read_write' && resolvedTargetRefKind !== 'branch') {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_CONFLICT',
        message: 'Writable source attachments must target a branch ref.',
        statusCode: 409,
      });
    }

    const existingAttachments = await this.platformStore.listProjectSourceAttachments({
      projectId: args.projectId,
    });
    const isDuplicate = existingAttachments.some(
      (attachment) =>
        attachment.detachedAt === null &&
        attachment.processId === args.processId &&
        this.sourceIdentityService.normalizeRepositoryFullName(attachment.repositoryFullName) ===
          repositoryResolution.repositoryFullName &&
        attachment.targetRef === resolvedTargetRef,
    );

    if (isDuplicate) {
      throw new AppError({
        code: 'SOURCE_ATTACHMENT_CONFLICT',
        message:
          'An active source attachment already exists for this repository, scope, and target ref.',
        statusCode: 409,
      });
    }

    return {
      projectId: args.projectId,
      provider: 'github',
      displayName: args.input.displayName.trim(),
      purpose: args.input.purpose,
      accessMode: args.input.accessMode,
      repositoryUrl: repositoryResolution.repositoryUrl,
      repositoryFullName: repositoryResolution.repositoryFullName,
      targetRef: resolvedTargetRef,
    };
  }
}
