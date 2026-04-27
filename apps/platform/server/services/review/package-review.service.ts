import type {
  ArtifactReviewTarget,
  PackageMember,
  PackageReviewTarget,
  ReviewTarget,
} from '../../../shared/contracts/index.js';
import {
  artifactReviewTargetSchema,
  packageMemberReviewSchema,
  packageMemberSchema,
  packageReviewTargetSchema,
  reviewTargetErrorSchema,
  reviewTargetSchema,
} from '../../../shared/contracts/index.js';
import type {
  ArtifactVersionRecord,
  PackageSnapshotMemberRecord,
  PackageSnapshotRecord,
  PlatformStore,
} from '../projects/platform-store.js';
import type { ArtifactReviewService } from './artifact-review.service.js';

type ReviewLogger = {
  info(fields: Record<string, unknown>, message?: string): void;
};

function buildUnavailableSelectedMember(member: PackageMember, message?: string) {
  return {
    memberId: member.memberId,
    status: 'unavailable' as const,
    error: reviewTargetErrorSchema.parse({
      code: 'PACKAGE_MEMBER_UNAVAILABLE',
      message: message ?? 'The pinned package member is currently unavailable.',
    }),
  };
}

function buildUnsupportedSelectedMember(member: PackageMember) {
  return {
    memberId: member.memberId,
    status: 'unsupported' as const,
    error: reviewTargetErrorSchema.parse({
      code: 'REVIEW_TARGET_UNSUPPORTED',
      message: 'This artifact format is not reviewable in the current release.',
    }),
  };
}

function buildPinnedArtifactReview(
  artifact: ArtifactReviewTarget,
  member: PackageMember,
): ArtifactReviewTarget {
  const selectedVersionSummary =
    artifact.versions.find((version) => version.versionId === member.artifactVersionId) ??
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
    currentVersionId: member.artifactVersionId,
    currentVersionLabel: member.versionLabel,
    selectedVersionId: member.artifactVersionId,
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

type PackageMemberSelectionState = {
  member: PackageMember;
  selectedMember: NonNullable<PackageReviewTarget['selectedMember']>;
};

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
    const snapshot = await this.platformStore.getPackageSnapshot({
      packageSnapshotId: args.packageId,
    });

    if (snapshot === null || snapshot.processId !== args.processId) {
      return null;
    }

    const members = await this.platformStore.listPackageSnapshotMembers({
      packageSnapshotId: snapshot.packageSnapshotId,
    });

    if (members.length === 0) {
      return null;
    }

    const packageReview = await this.buildPackageReview({
      projectId: args.projectId,
      snapshot,
      members,
      requestedMemberId: args.memberId,
    });

    if (packageReview === null) {
      return null;
    }

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

  private async buildPackageReview(args: {
    projectId: string;
    snapshot: PackageSnapshotRecord;
    members: PackageSnapshotMemberRecord[];
    requestedMemberId?: string;
  }): Promise<PackageReviewTarget | null> {
    const memberStates = await Promise.all(
      args.members.map((member) => this.buildMemberSelectionState(args.projectId, member)),
    );
    const requestedEntry =
      args.requestedMemberId === undefined
        ? null
        : (memberStates.find((entry) => entry.member.memberId === args.requestedMemberId) ?? null);
    const missingRequestedEntry =
      args.requestedMemberId === undefined || requestedEntry !== null
        ? null
        : this.buildMissingRequestedMemberState(args.requestedMemberId);
    const selectedEntry =
      missingRequestedEntry ??
      requestedEntry ??
      memberStates.find((entry) => entry.member.status === 'ready') ??
      memberStates[0] ??
      null;

    if (selectedEntry === null) {
      return null;
    }

    return packageReviewTargetSchema.parse({
      packageId: args.snapshot.packageSnapshotId,
      displayName: args.snapshot.displayName,
      packageType: args.snapshot.packageType,
      members: memberStates
        .map((entry) => entry.member)
        .sort((left, right) => left.position - right.position),
      selectedMemberId: selectedEntry.selectedMember.memberId,
      selectedMember: selectedEntry.selectedMember,
      exportability: this.buildExportability(memberStates.map((entry) => entry.member.status)),
    });
  }

  private async buildMemberSelectionState(
    projectId: string,
    member: PackageSnapshotMemberRecord,
  ): Promise<PackageMemberSelectionState> {
    const pinnedVersion = await this.platformStore.getArtifactVersion({
      versionId: member.artifactVersionId,
    });

    if (pinnedVersion === null || pinnedVersion.artifactId !== member.artifactId) {
      return this.buildUnavailableMemberState(member);
    }

    if (pinnedVersion.contentKind === 'unsupported') {
      return this.buildUnsupportedMemberState(member);
    }

    return this.buildReadyMemberState(projectId, member, pinnedVersion);
  }

  private buildMissingRequestedMemberState(memberId: string): PackageMemberSelectionState {
    return {
      member: packageMemberSchema.parse({
        memberId,
        position: 0,
        artifactId: 'unavailable-artifact',
        displayName: 'Unavailable package member',
        artifactVersionId: 'unavailable-version',
        versionLabel: 'unavailable',
        status: 'unavailable',
      }),
      selectedMember: packageMemberReviewSchema.parse({
        memberId,
        status: 'unavailable',
        error: reviewTargetErrorSchema.parse({
          code: 'PACKAGE_MEMBER_UNAVAILABLE',
          message: 'The requested package member is currently unavailable.',
        }),
      }),
    };
  }

  private buildUnavailableMemberState(
    member: PackageSnapshotMemberRecord,
  ): PackageMemberSelectionState {
    const packageMember = packageMemberSchema.parse({
      memberId: member.memberId,
      position: member.position,
      artifactId: member.artifactId,
      displayName: member.displayName,
      artifactVersionId: member.artifactVersionId,
      versionLabel: member.versionLabel,
      status: 'unavailable',
    });

    return {
      member: packageMember,
      selectedMember: packageMemberReviewSchema.parse(
        buildUnavailableSelectedMember(packageMember),
      ),
    };
  }

  private buildUnsupportedMemberState(
    member: PackageSnapshotMemberRecord,
  ): PackageMemberSelectionState {
    const packageMember = packageMemberSchema.parse({
      memberId: member.memberId,
      position: member.position,
      artifactId: member.artifactId,
      displayName: member.displayName,
      artifactVersionId: member.artifactVersionId,
      versionLabel: member.versionLabel,
      status: 'unsupported',
    });

    return {
      member: packageMember,
      selectedMember: packageMemberReviewSchema.parse(
        buildUnsupportedSelectedMember(packageMember),
      ),
    };
  }

  private async buildReadyMemberState(
    projectId: string,
    member: PackageSnapshotMemberRecord,
    pinnedVersion: ArtifactVersionRecord,
  ): Promise<PackageMemberSelectionState> {
    const packageMember = packageMemberSchema.parse({
      memberId: member.memberId,
      position: member.position,
      artifactId: member.artifactId,
      displayName: member.displayName,
      artifactVersionId: member.artifactVersionId,
      versionLabel: member.versionLabel,
      status: 'ready',
    });
    const artifact = await this.artifactReviewService.getArtifactReviewByVersion({
      projectId,
      artifactId: member.artifactId,
      versionId: pinnedVersion.versionId,
    });

    if (artifact === null) {
      return {
        member: packageMemberSchema.parse({
          ...packageMember,
          status: 'unavailable',
        }),
        selectedMember: packageMemberReviewSchema.parse(
          buildUnavailableSelectedMember(packageMember),
        ),
      };
    }

    return {
      member: packageMember,
      selectedMember: packageMemberReviewSchema.parse({
        memberId: member.memberId,
        status: 'ready',
        artifact: buildPinnedArtifactReview(artifact, packageMember),
      }),
    };
  }

  private buildExportability(statuses: Array<PackageMember['status']>) {
    if (statuses.every((status) => status === 'ready')) {
      return { available: true as const };
    }

    const reason = statuses.some((status) => status === 'unsupported')
      ? 'One or more members are unavailable or unsupported.'
      : 'One or more members are unavailable.';

    return {
      available: false as const,
      reason,
    };
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
