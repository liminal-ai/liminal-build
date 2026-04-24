import type {
  ArtifactReviewTarget,
  ArtifactVersionDetail,
  ReviewTarget,
  ReviewTargetError,
} from '../../../shared/contracts/index.js';
import { artifactReviewTargetSchema, reviewTargetSchema } from '../../../shared/contracts/index.js';
import type { MarkdownRendererService } from '../rendering/markdown-renderer.service.js';
import type { ArtifactVersionRecord, PlatformStore } from '../projects/platform-store.js';

export const ARTIFACT_CONTENT_FETCH_TIMEOUT_MS = 10_000;

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
  getArtifactTarget(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ReviewTarget | null>;
}

export class DefaultArtifactReviewService implements ArtifactReviewService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly markdownRenderer: MarkdownRendererService,
    private readonly logger?: ReviewLogger,
  ) {}

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

  private async readArtifactReviewState(args: {
    projectId: string;
    processId: string;
    artifactId: string;
    versionId?: string;
  }): Promise<ArtifactReviewState | null> {
    const [artifacts, versionRecords] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.listArtifactVersions({
        artifactId: args.artifactId,
      }),
    ]);

    const artifact = artifacts.find((candidate) => candidate.artifactId === args.artifactId);

    if (artifact === undefined || artifact.processId !== args.processId) {
      return null;
    }

    const currentVersion = versionRecords[0];
    const selectedVersionRecord =
      args.versionId === undefined
        ? currentVersion
        : versionRecords.find((candidate) => candidate.versionId === args.versionId);

    if (args.versionId !== undefined && selectedVersionRecord === undefined) {
      return null;
    }

    const versions = versionRecords.map((version, index) => ({
      versionId: version.versionId,
      versionLabel: version.versionLabel,
      isCurrent: index === 0,
      createdAt: version.createdAt,
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
          : await this.buildArtifactVersionDetail(selectedVersionRecord),
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
  ): Promise<ArtifactVersionDetail> {
    if (version.contentKind === 'unsupported') {
      return {
        versionId: version.versionId,
        versionLabel: version.versionLabel,
        contentKind: 'unsupported',
        createdAt: version.createdAt,
      };
    }

    const contentUrl = await this.platformStore.getArtifactVersionContentUrl({
      versionId: version.versionId,
    });

    if (contentUrl === null) {
      return this.buildArtifactVersionError(
        version,
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
          'Artifact version loading timed out before review content became available.',
          'timeout',
        );
      }

      return this.buildArtifactVersionError(
        version,
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
    };
  }

  private buildArtifactVersionError(
    version: ArtifactVersionRecord,
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
    };
  }
}
