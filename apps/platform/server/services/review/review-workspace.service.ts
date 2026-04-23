import type {
  ArtifactVersionDetail,
  ReviewTarget,
  ReviewTargetSummary,
  ReviewWorkspaceResponse,
  ReviewWorkspaceSelection,
} from '../../../shared/contracts/index.js';
import {
  artifactReviewTargetSchema,
  reviewTargetSchema,
  reviewWorkspaceResponseSchema,
} from '../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { MarkdownRendererService } from '../rendering/markdown-renderer.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';

function buildArtifactVersionId(args: {
  artifactId: string;
  versionLabel: string;
  updatedAt: string;
}) {
  return `${args.artifactId}:${args.versionLabel}:${args.updatedAt}`;
}

export interface ReviewWorkspaceService {
  getWorkspace(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    selection: ReviewWorkspaceSelection | null;
  }): Promise<ReviewWorkspaceResponse>;
}

export class DefaultReviewWorkspaceService implements ReviewWorkspaceService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly processAccessService: ProcessAccessService,
    private readonly markdownRenderer: MarkdownRendererService,
  ) {}

  async getWorkspace(args: {
    actor: AuthenticatedActor;
    projectId: string;
    processId: string;
    selection: ReviewWorkspaceSelection | null;
  }): Promise<ReviewWorkspaceResponse> {
    const access = await this.processAccessService.assertProcessAccess(args);
    const availableTargets = await this.platformStore.listProcessReviewTargets({
      projectId: args.projectId,
      processId: args.processId,
    });
    const selectedSummary = this.resolveSelectedTarget(availableTargets, args.selection);
    const target =
      selectedSummary === null
        ? undefined
        : await this.buildSelectedTarget({
            projectId: args.projectId,
            processId: args.processId,
            summary: selectedSummary,
          });

    return reviewWorkspaceResponseSchema.parse({
      project: {
        projectId: access.project.projectId,
        name: access.project.name,
        role: access.project.role,
      },
      process: {
        processId: access.process.processId,
        displayLabel: access.process.displayLabel,
        processType: access.process.processType,
        reviewTargetKind: target?.targetKind,
        reviewTargetId: selectedSummary?.targetId,
      },
      availableTargets,
      target,
    });
  }

  private resolveSelectedTarget(
    availableTargets: ReviewTargetSummary[],
    selection: ReviewWorkspaceSelection | null,
  ): ReviewTargetSummary | null {
    if (selection?.targetKind !== undefined && selection.targetId !== undefined) {
      return (
        availableTargets.find(
          (target) =>
            target.targetKind === selection.targetKind && target.targetId === selection.targetId,
        ) ?? null
      );
    }

    if (availableTargets.length === 1) {
      return availableTargets[0] ?? null;
    }

    return null;
  }

  private async buildSelectedTarget(args: {
    projectId: string;
    processId: string;
    summary: ReviewTargetSummary;
  }): Promise<ReviewTarget | undefined> {
    if (args.summary.targetKind === 'package') {
      const target = await this.platformStore.getProcessReviewPackage({
        processId: args.processId,
        packageId: args.summary.targetId,
      });

      if (target === null) {
        return undefined;
      }

      return reviewTargetSchema.parse({
        targetKind: 'package',
        displayName: target.displayName,
        status: 'ready',
        package: target,
      });
    }

    const target = await this.buildArtifactTarget({
      projectId: args.projectId,
      processId: args.processId,
      artifactId: args.summary.targetId,
    });

    if (target === null) {
      return undefined;
    }

    return target;
  }

  private async buildArtifactTarget(args: {
    projectId: string;
    processId: string;
    artifactId: string;
  }): Promise<ReviewTarget | null> {
    const [artifacts, currentMaterialRefs, latestVersion] = await Promise.all([
      this.platformStore.listProjectArtifacts({
        projectId: args.projectId,
      }),
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.platformStore.getLatestArtifactVersion({
        artifactId: args.artifactId,
      }),
    ]);
    const reviewableArtifactIds = new Set(currentMaterialRefs.artifactIds);
    const artifact = artifacts.find(
      (candidate) =>
        candidate.artifactId === args.artifactId &&
        reviewableArtifactIds.has(candidate.artifactId) &&
        candidate.currentVersionLabel !== null,
    );

    if (artifact === undefined || latestVersion === null || artifact.currentVersionLabel === null) {
      return null;
    }

    const versionId = buildArtifactVersionId({
      artifactId: artifact.artifactId,
      versionLabel: artifact.currentVersionLabel,
      updatedAt: artifact.updatedAt,
    });
    const artifactReview = artifactReviewTargetSchema.parse({
      artifactId: artifact.artifactId,
      displayName: artifact.displayName,
      currentVersionId: versionId,
      currentVersionLabel: artifact.currentVersionLabel,
      selectedVersionId: versionId,
      versions: [
        {
          versionId,
          versionLabel: artifact.currentVersionLabel,
          isCurrent: true,
          createdAt: artifact.updatedAt,
        },
      ],
      selectedVersion:
        latestVersion.contentKind === 'unsupported'
          ? ({
              versionId,
              versionLabel: artifact.currentVersionLabel,
              contentKind: 'unsupported',
              createdAt: artifact.updatedAt,
            } satisfies ArtifactVersionDetail)
          : undefined,
    });

    if (latestVersion.contentKind === 'unsupported') {
      return reviewTargetSchema.parse({
        targetKind: 'artifact',
        displayName: artifact.displayName,
        status: 'unsupported',
        error: {
          code: 'REVIEW_TARGET_UNSUPPORTED',
          message: 'This artifact format is not reviewable in the current release.',
        },
        artifact: artifactReview,
      });
    }

    const content = await this.platformStore.getArtifactContent({
      artifactId: args.artifactId,
    });

    if (content === null) {
      return null;
    }

    const rendered = this.markdownRenderer.render({
      markdown: content,
      themeId: 'light',
    });
    const selectedVersion: ArtifactVersionDetail = {
      versionId,
      versionLabel: artifact.currentVersionLabel,
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
      createdAt: artifact.updatedAt,
    };

    return reviewTargetSchema.parse({
      targetKind: 'artifact',
      displayName: artifact.displayName,
      status: 'ready',
      artifact: artifactReviewTargetSchema.parse({
        ...artifactReview,
        selectedVersion,
      }),
    });
  }
}
