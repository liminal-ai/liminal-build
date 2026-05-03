import type {
  ArtifactReviewTarget,
  ArtifactVersionDetail,
  ReviewTarget,
  ReviewTargetError,
} from '../../../shared/contracts/index.js';
import { artifactReviewTargetSchema, reviewTargetSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { artifactVersionNotFoundErrorCode } from '../../errors/codes.js';
import type { ArtifactVersionRecord, PlatformStore } from '../projects/platform-store.js';
import type { MarkdownRendererService } from '../rendering/markdown-renderer.service.js';
import {
  DefaultReviewContextService,
  type ReviewContextService,
} from './review-context.service.js';

export const ARTIFACT_CONTENT_FETCH_TIMEOUT_MS = 10_000;

function buildArtifactVersionNotFoundError(args: {
  artifactId: string;
  versionId: string;
}): AppError {
  return new AppError({
    code: artifactVersionNotFoundErrorCode,
    message: `Artifact version ${args.versionId} is unavailable for artifact ${args.artifactId}.`,
    statusCode: 404,
  });
}

type ReviewLogger = {
  info(fields: Record<string, unknown>, message?: string): void;
  warn(fields: Record<string, unknown>, message?: string): void;
};

type ArtifactReviewState = {
  artifact: ArtifactReviewTarget;
  status: 'ready' | 'empty' | 'unsupported';
  error?: ReviewTargetError;
};

export interface ArtifactReviewService {
  getArtifactReview(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ArtifactReviewTarget | null>;
  getArtifactReviewByVersion(args: {
    projectId: string;
    artifactId: string;
    versionId: string;
  }): Promise<ArtifactReviewTarget | null>;
  getArtifactTarget(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ReviewTarget | null>;
}

export class DefaultArtifactReviewService implements ArtifactReviewService {
  private readonly reviewContextService: ReviewContextService;

  constructor(
    private readonly platformStore: PlatformStore,
    private readonly markdownRenderer: MarkdownRendererService,
    private readonly logger?: ReviewLogger,
    reviewContextService?: ReviewContextService,
  ) {
    this.reviewContextService =
      reviewContextService ?? new DefaultReviewContextService(platformStore);
  }

  async getArtifactReview(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ArtifactReviewTarget | null> {
    const state = await this.readArtifactReviewState(args);
    return state?.artifact ?? null;
  }

  async getArtifactTarget(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ReviewTarget | null> {
    const state = await this.readArtifactReviewState(args);

    if (state === null) {
      return null;
    }

    return reviewTargetSchema.parse({
      targetKind: 'artifact',
      displayName: state.artifact.displayName,
      status: state.status,
      error: state.error,
      artifact: state.artifact,
    });
  }

  async getArtifactReviewByVersion(args: {
    projectId: string;
    artifactId: string;
    versionId: string;
  }): Promise<ArtifactReviewTarget | null> {
    const state = await this.readArtifactReviewState(
      {
        projectId: args.projectId,
        processId: '',
        artifactId: args.artifactId,
        versionId: args.versionId,
      },
      {
        skipProcessContextCheck: true,
      },
    );

    return state?.artifact ?? null;
  }

  private async readArtifactReviewState(
    args: {
      projectId: string;
      processId: string;
      artifactId: string;
      versionId?: string;
    },
    options: {
      skipProcessContextCheck?: boolean;
    } = {},
  ): Promise<ArtifactReviewState | null> {
    const [artifacts, versionRecords, processCanReviewArtifact] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.listArtifactVersions({
        artifactId: args.artifactId,
      }),
      options.skipProcessContextCheck
        ? Promise.resolve(true)
        : this.reviewContextService.canReviewArtifact({
            processId: args.processId,
            artifactId: args.artifactId,
          }),
    ]);

    const artifact = artifacts.find((candidate) => candidate.artifactId === args.artifactId);

    if (artifact === undefined || !processCanReviewArtifact) {
      return null;
    }

    const processIds = Array.from(
      new Set(versionRecords.map((version) => version.createdByProcessId)),
    );
    const processRecords =
      (await this.platformStore.listProcessesByIds?.({
        processIds,
      })) ?? [];
    const processDisplayLabelsById = new Map(
      processRecords.map((processRecord) => [processRecord.processId, processRecord.displayLabel]),
    );

    const currentVersion = versionRecords[0];
    const selectedVersionRecord =
      args.versionId === undefined
        ? currentVersion
        : versionRecords.find((candidate) => candidate.versionId === args.versionId);

    if (args.versionId !== undefined && selectedVersionRecord === undefined) {
      throw buildArtifactVersionNotFoundError({
        artifactId: args.artifactId,
        versionId: args.versionId,
      });
    }

    const versions = versionRecords.map((version, index) => ({
      versionId: version.versionId,
      versionLabel: version.versionLabel,
      isCurrent: index === 0,
      createdAt: version.createdAt,
      producedByProcessId: version.createdByProcessId,
      producedByProcessDisplayLabel:
        processDisplayLabelsById.get(version.createdByProcessId) ?? null,
    }));

    const artifactReview = artifactReviewTargetSchema.parse({
      artifactId: artifact.artifactId,
      displayName: artifact.displayName,
      currentVersionId: currentVersion?.versionId,
      currentVersionLabel: currentVersion?.versionLabel,
      selectedVersionId: selectedVersionRecord?.versionId,
      versions,
      selectedVersion:
        selectedVersionRecord === undefined
          ? undefined
          : await this.buildArtifactVersionDetail(
              selectedVersionRecord,
              processDisplayLabelsById.get(selectedVersionRecord.createdByProcessId) ?? null,
            ),
    });

    if (selectedVersionRecord !== undefined) {
      this.logger?.info(
        {
          event: 'review.artifact.resolved',
          artifactId: artifactReview.artifactId,
          selectedVersionId: selectedVersionRecord.versionId,
          contentKind:
            artifactReview.selectedVersion?.contentKind ?? selectedVersionRecord.contentKind,
          bodyStatus: artifactReview.selectedVersion?.bodyStatus ?? null,
        },
        'Artifact review resolved.',
      );
    }

    if (currentVersion === undefined) {
      return {
        artifact: artifactReview,
        status: 'empty',
      };
    }

    if (selectedVersionRecord?.contentKind === 'unsupported') {
      return {
        artifact: artifactReview,
        status: 'unsupported',
        error: {
          code: 'REVIEW_TARGET_UNSUPPORTED',
          message: 'This artifact format is not reviewable in the current release.',
        },
      };
    }

    return {
      artifact: artifactReview,
      status: 'ready',
    };
  }

  private async buildArtifactVersionDetail(
    version: ArtifactVersionRecord,
    producedByProcessDisplayLabel: string | null,
  ): Promise<ArtifactVersionDetail> {
    if (version.contentKind === 'unsupported') {
      return {
        versionId: version.versionId,
        versionLabel: version.versionLabel,
        contentKind: 'unsupported',
        createdAt: version.createdAt,
        producedByProcessId: version.createdByProcessId,
        producedByProcessDisplayLabel,
      };
    }

    const contentUrl = await this.platformStore.getArtifactVersionContentUrl({
      versionId: version.versionId,
    });

    if (contentUrl === null) {
      return this.buildArtifactVersionError(
        version,
        producedByProcessDisplayLabel,
        'This artifact version could not be loaded for review.',
        'missing_content_url',
      );
    }

    let markdown: string;

    try {
      const response = await fetch(contentUrl, {
        signal: AbortSignal.timeout(ARTIFACT_CONTENT_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        return this.buildArtifactVersionError(
          version,
          producedByProcessDisplayLabel,
          'This artifact version could not be loaded for review.',
          `http_${response.status}`,
        );
      }

      markdown = await response.text();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        return this.buildArtifactVersionError(
          version,
          producedByProcessDisplayLabel,
          'Artifact version loading timed out before review content became available.',
          'timeout',
        );
      }

      return this.buildArtifactVersionError(
        version,
        producedByProcessDisplayLabel,
        'This artifact version could not be loaded for review.',
        'fetch_failed',
      );
    }

    const rendered = this.markdownRenderer.render({
      markdown,
      themeId: 'light',
      artifactId: version.artifactId,
      selectedVersionId: version.versionId,
    });

    return {
      versionId: version.versionId,
      versionLabel: version.versionLabel,
      contentKind: 'markdown',
      bodyStatus: rendered.bodyStatus,
      ...(rendered.bodyStatus === 'ready'
        ? {
            body: rendered.body,
            mermaidBlocks: rendered.mermaidBlocks,
          }
        : {
            bodyError: rendered.bodyError,
          }),
      createdAt: version.createdAt,
      producedByProcessId: version.createdByProcessId,
      producedByProcessDisplayLabel,
    };
  }

  private buildArtifactVersionError(
    version: ArtifactVersionRecord,
    producedByProcessDisplayLabel: string | null,
    message: string,
    reason = 'render_failed',
  ): ArtifactVersionDetail {
    this.logger?.warn(
      {
        event: 'review.artifact.content-fetch-failed',
        artifactId: version.artifactId,
        selectedVersionId: version.versionId,
        errorCode: 'REVIEW_RENDER_FAILED',
        reason,
      },
      'Artifact review content fetch failed.',
    );

    return {
      versionId: version.versionId,
      versionLabel: version.versionLabel,
      contentKind: 'markdown',
      bodyStatus: 'error',
      bodyError: {
        code: 'REVIEW_RENDER_FAILED',
        message,
      },
      createdAt: version.createdAt,
      producedByProcessId: version.createdByProcessId,
      producedByProcessDisplayLabel,
    };
  }
}
