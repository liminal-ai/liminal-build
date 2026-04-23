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
        );
      }

      return this.buildArtifactVersionError(
        version,
        'This artifact version could not be loaded for review.',
      );
    }

    const rendered = this.markdownRenderer.render({
      markdown,
      themeId: 'light',
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
  ): ArtifactVersionDetail {
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
