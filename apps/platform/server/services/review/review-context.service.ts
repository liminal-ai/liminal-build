import type { ReviewTargetSummary } from '../../../shared/contracts/index.js';
import type {
  PlatformStore,
  ProcessPackageContextMemberRecord,
} from '../projects/platform-store.js';
import { buildReviewTargetSummaries, includesArtifactInReviewContext } from './review-context.js';

export interface ReviewContextService {
  listAvailableTargets(args: {
    projectId: string;
    processId: string;
  }): Promise<ReviewTargetSummary[]>;
  canReviewArtifact(args: { processId: string; artifactId: string }): Promise<boolean>;
}

export class DefaultReviewContextService implements ReviewContextService {
  constructor(private readonly platformStore: PlatformStore) {}

  async listAvailableTargets(args: {
    projectId: string;
    processId: string;
  }): Promise<ReviewTargetSummary[]> {
    const [reviewContextArtifactIds, packageTargets] = await Promise.all([
      this.listReviewContextArtifactIds(args.processId),
      this.listPackageTargetCandidates(args.processId),
    ]);
    const artifacts =
      reviewContextArtifactIds.length === 0
        ? []
        : await this.listProjectArtifactsByIds(args.projectId, reviewContextArtifactIds);
    const artifactTargets = (
      await Promise.all(
        artifacts.map(async (artifact) => {
          const latestVersion = await this.platformStore.getLatestArtifactVersion({
            artifactId: artifact.artifactId,
          });

          if (latestVersion === null) {
            return null;
          }

          return {
            publishedAt: latestVersion.createdAt,
            targetKind: 'artifact' as const,
            targetId: artifact.artifactId,
            displayName: artifact.displayName,
          };
        }),
      )
    ).filter((target): target is NonNullable<typeof target> => target !== null);

    return buildReviewTargetSummaries([...artifactTargets, ...packageTargets]);
  }

  async canReviewArtifact(args: { processId: string; artifactId: string }): Promise<boolean> {
    const [currentMaterialRefs, packageContextMembers] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({
        processId: args.processId,
      }),
      this.listProcessPackageContextMembers(args.processId),
    ]);

    return includesArtifactInReviewContext({
      artifactId: args.artifactId,
      currentArtifactIds: currentMaterialRefs.artifactIds,
      packageContextArtifactIds: packageContextMembers.map((member) => member.artifactId),
    });
  }

  private async listProjectArtifactsByIds(projectId: string, artifactIds: string[]) {
    if (this.platformStore.listProjectArtifactsByIds !== undefined) {
      return this.platformStore.listProjectArtifactsByIds({
        projectId,
        artifactIds,
      });
    }

    const allowedArtifactIds = new Set(artifactIds);
    const projectArtifacts = await this.platformStore.listProjectArtifacts({
      projectId,
    });

    return projectArtifacts.filter((artifact) => allowedArtifactIds.has(artifact.artifactId));
  }

  private async listReviewContextArtifactIds(processId: string): Promise<string[]> {
    const [currentMaterialRefs, packageContextMembers] = await Promise.all([
      this.platformStore.getCurrentProcessMaterialRefs({
        processId,
      }),
      this.listProcessPackageContextMembers(processId),
    ]);

    return [
      ...new Set([
        ...currentMaterialRefs.artifactIds,
        ...packageContextMembers.map((member) => member.artifactId),
      ]),
    ];
  }

  private async listPackageTargetCandidates(processId: string) {
    const packageSnapshots = await this.platformStore.listPackageSnapshotsForProcess({
      processId,
    });
    const packageMembers = await Promise.all(
      packageSnapshots.map((snapshot) =>
        this.platformStore.listPackageSnapshotMembers({
          packageSnapshotId: snapshot.packageSnapshotId,
        }),
      ),
    );

    return packageSnapshots
      .filter((_, index) => (packageMembers[index]?.length ?? 0) > 0)
      .map((snapshot) => ({
        publishedAt: snapshot.publishedAt,
        targetKind: 'package' as const,
        targetId: snapshot.packageSnapshotId,
        displayName: snapshot.displayName,
      }));
  }

  private async listProcessPackageContextMembers(
    processId: string,
  ): Promise<ProcessPackageContextMemberRecord[]> {
    const currentPackageContext = await this.platformStore.getCurrentProcessPackageContext?.({
      processId,
    });

    if (
      currentPackageContext === undefined ||
      currentPackageContext === null ||
      this.platformStore.listProcessPackageContextMembers === undefined
    ) {
      return [];
    }

    return this.platformStore.listProcessPackageContextMembers({
      packageContextId: currentPackageContext.packageContextId,
    });
  }
}
