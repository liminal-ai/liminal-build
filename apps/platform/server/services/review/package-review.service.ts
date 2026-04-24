import type {
  ArtifactReviewTarget,
  PackageMember,
  PackageReviewTarget,
  ReviewTarget,
} from '../../../shared/contracts/index.js';
import {
  artifactReviewTargetSchema,
  packageReviewTargetSchema,
  reviewTargetSchema,
} from '../../../shared/contracts/index.js';
import type { PlatformStore } from '../projects/platform-store.js';
import type { ArtifactReviewService } from './artifact-review.service.js';

type ReviewLogger = {
  info(fields: Record<string, unknown>, message?: string): void;
};

function buildUnavailableSelectedMember(member: PackageMember) {
  return {
    memberId: member.memberId,
    status: 'unavailable' as const,
    error: {
      code: 'REVIEW_MEMBER_UNAVAILABLE' as const,
      message: 'The pinned package member is currently unavailable.',
    },
  };
}

function buildPinnedArtifactReview(
  artifact: ArtifactReviewTarget,
  member: PackageMember,
): ArtifactReviewTarget {
  const selectedVersionSummary =
    artifact.versions.find((version) => version.versionId === member.versionId) ??
    artifact.versions[0];
  const selectedVersion =
    artifact.selectedVersion === undefined
      ? undefined
      : {
          ...artifact.selectedVersion,
          versionLabel: member.versionLabel,
        };

  return artifactReviewTargetSchema.parse({
    artifactId: artifact.artifactId,
    displayName: member.displayName,
    currentVersionId: member.versionId,
    currentVersionLabel: member.versionLabel,
    selectedVersionId: member.versionId,
    versions:
      selectedVersionSummary === undefined
        ? []
        : [
            {
              ...selectedVersionSummary,
              versionLabel: member.versionLabel,
              isCurrent: true,
            },
          ],
    selectedVersion,
  });
}

export interface PackageReviewService {
  getPackageReview(args: {
    projectId: string;
    processId: string;
    packageId: string;
    memberId?: string;
  }): Promise<PackageReviewTarget | null>;
  getPackageTarget(args: {
    projectId: string;
    processId: string;
    packageId: string;
    memberId?: string;
  }): Promise<ReviewTarget | null>;
}

export class DefaultPackageReviewService implements PackageReviewService {
  constructor(
    private readonly platformStore: PlatformStore,
    private readonly artifactReviewService: ArtifactReviewService,
    private readonly logger?: ReviewLogger,
  ) {}

  async getPackageReview(args: {
    projectId: string;
    processId: string;
    packageId: string;
    memberId?: string;
  }): Promise<PackageReviewTarget | null> {
    const baseTarget = await this.platformStore.getProcessReviewPackage({
      processId: args.processId,
      packageId: args.packageId,
      memberId: args.memberId,
    });

    if (baseTarget === null) {
      return null;
    }

    const selectedMemberId = baseTarget.selectedMember?.memberId ?? baseTarget.selectedMemberId;
    const selectedMember =
      selectedMemberId === undefined
        ? undefined
        : baseTarget.members.find((member) => member.memberId === selectedMemberId);

    if (
      baseTarget.selectedMember?.status !== 'ready' ||
      baseTarget.selectedMember === undefined ||
      selectedMember === undefined
    ) {
      this.logPackageResolved(baseTarget);
      return packageReviewTargetSchema.parse(baseTarget);
    }

    const artifact = await this.artifactReviewService.getArtifactReview({
      projectId: args.projectId,
      processId: args.processId,
      artifactId: selectedMember.artifactId,
      versionId: selectedMember.versionId,
    });

    if (artifact === null) {
      const packageReview = packageReviewTargetSchema.parse({
        ...baseTarget,
        selectedMemberId: selectedMember.memberId,
        selectedMember: buildUnavailableSelectedMember(selectedMember),
      });
      this.logPackageResolved(packageReview);
      return packageReview;
    }

    const packageReview = packageReviewTargetSchema.parse({
      ...baseTarget,
      selectedMemberId: selectedMember.memberId,
      selectedMember: {
        memberId: selectedMember.memberId,
        status: 'ready',
        artifact: buildPinnedArtifactReview(artifact, selectedMember),
      },
    });
    this.logPackageResolved(packageReview);
    return packageReview;
  }

  async getPackageTarget(args: {
    projectId: string;
    processId: string;
    packageId: string;
    memberId?: string;
  }): Promise<ReviewTarget | null> {
    const target = await this.getPackageReview(args);

    if (target === null) {
      return null;
    }

    return reviewTargetSchema.parse({
      targetKind: 'package',
      displayName: target.displayName,
      status: 'ready',
      package: target,
    });
  }

  private logPackageResolved(packageReview: PackageReviewTarget): void {
    this.logger?.info(
      {
        event: 'review.package.resolved',
        packageId: packageReview.packageId,
        memberCount: packageReview.members.length,
        selectedMemberId: packageReview.selectedMemberId ?? null,
        selectedMemberStatus: packageReview.selectedMember?.status ?? null,
        exportabilityAvailable: packageReview.exportability.available,
      },
      'Package review resolved.',
    );
  }
}
