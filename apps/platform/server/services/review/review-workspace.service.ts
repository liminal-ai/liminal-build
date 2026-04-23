import type {
  ReviewTarget,
  ReviewTargetSummary,
  ReviewWorkspaceResponse,
  ReviewWorkspaceSelection,
} from '../../../shared/contracts/index.js';
import { reviewWorkspaceResponseSchema } from '../../../shared/contracts/index.js';
import { AppError } from '../../errors/app-error.js';
import { reviewTargetNotFoundErrorCode } from '../../errors/codes.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { ProcessAccessService } from '../processes/process-access.service.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { ArtifactReviewService } from './artifact-review.service.js';
import type { PackageReviewService } from './package-review.service.js';

type SelectedTargetRequest = {
  explicit: boolean;
  targetId: string;
  targetKind: ReviewTargetSummary['targetKind'];
};

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
    private readonly artifactReviewService: ArtifactReviewService,
    private readonly packageReviewService: PackageReviewService,
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
    const selectedTargetRequest = this.resolveSelectedTargetRequest(
      availableTargets,
      args.selection,
    );
    const target =
      selectedTargetRequest === null
        ? undefined
        : await this.buildSelectedTarget({
            projectId: args.projectId,
            processId: args.processId,
            request: selectedTargetRequest,
            selection: args.selection,
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
        reviewTargetId: selectedTargetRequest?.targetId,
      },
      availableTargets,
      target,
    });
  }

  private resolveSelectedTargetRequest(
    availableTargets: ReviewTargetSummary[],
    selection: ReviewWorkspaceSelection | null,
  ): SelectedTargetRequest | null {
    if (selection?.targetKind !== undefined && selection.targetId !== undefined) {
      return {
        explicit: true,
        targetKind: selection.targetKind,
        targetId: selection.targetId,
      };
    }

    if (availableTargets.length === 1) {
      const onlyTarget = availableTargets[0];

      return onlyTarget === undefined
        ? null
        : {
            explicit: false,
            targetKind: onlyTarget.targetKind,
            targetId: onlyTarget.targetId,
          };
    }

    return null;
  }

  private async buildSelectedTarget(args: {
    projectId: string;
    processId: string;
    request: SelectedTargetRequest;
    selection: ReviewWorkspaceSelection | null;
  }): Promise<ReviewTarget | undefined> {
    if (args.request.targetKind === 'package') {
      const target = await this.packageReviewService.getPackageTarget({
        projectId: args.projectId,
        processId: args.processId,
        packageId: args.request.targetId,
        memberId:
          args.selection?.targetKind === 'package' &&
          args.selection.targetId === args.request.targetId
            ? args.selection.memberId
            : undefined,
      });

      if (target === null) {
        if (args.request.explicit) {
          throw this.createReviewTargetNotFoundError();
        }

        return undefined;
      }

      return target;
    }

    const target = await this.artifactReviewService.getArtifactTarget({
      projectId: args.projectId,
      processId: args.processId,
      artifactId: args.request.targetId,
      versionId:
        args.selection?.targetKind === 'artifact' &&
        args.selection.targetId === args.request.targetId
          ? args.selection.versionId
          : undefined,
    });

    if (target === null) {
      if (args.request.explicit) {
        throw this.createReviewTargetNotFoundError();
      }

      return undefined;
    }

    return target;
  }

  private createReviewTargetNotFoundError(): AppError {
    return new AppError({
      code: reviewTargetNotFoundErrorCode,
      message: 'The requested review target could not be found.',
      statusCode: 404,
    });
  }
}
