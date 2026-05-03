import type {
  PackageSnapshotMemberWriteInput,
  PlatformStore,
  ProcessPackageContextMemberRecord,
  ProcessPackageContextRecord,
} from '../projects/platform-store.js';

export const packageSnapshotMemberNotAllowedError =
  'Package snapshot member is not allowed in the current package-building context.';

export async function listEligiblePackageArtifactVersionIds(args: {
  platformStore: Pick<
    PlatformStore,
    | 'getCurrentProcessMaterialRefs'
    | 'getLatestArtifactVersion'
    | 'getCurrentProcessPackageContext'
    | 'listProcessPackageContextMembers'
  >;
  processId: string;
}): Promise<string[]> {
  const [currentMaterialRefs, currentPackageContextMembers] = await Promise.all([
    args.platformStore.getCurrentProcessMaterialRefs({
      processId: args.processId,
    }),
    listCurrentProcessPackageContextMembers({
      platformStore: args.platformStore,
      processId: args.processId,
    }),
  ]);
  const eligibleVersionIds = new Set<string>();

  for (const artifactId of currentMaterialRefs.artifactIds) {
    const latestVersion = await args.platformStore.getLatestArtifactVersion({
      artifactId,
    });

    if (latestVersion !== null) {
      eligibleVersionIds.add(latestVersion.versionId);
    }
  }

  for (const member of currentPackageContextMembers) {
    eligibleVersionIds.add(member.artifactVersionId);
  }

  return [...eligibleVersionIds];
}

export async function listCurrentProcessPackageContextMembers(args: {
  platformStore: Pick<
    PlatformStore,
    'getCurrentProcessPackageContext' | 'listProcessPackageContextMembers'
  >;
  processId: string;
}): Promise<ProcessPackageContextMemberRecord[]> {
  const currentPackageContext = await args.platformStore.getCurrentProcessPackageContext?.({
    processId: args.processId,
  });

  if (
    currentPackageContext === undefined ||
    currentPackageContext === null ||
    args.platformStore.listProcessPackageContextMembers === undefined
  ) {
    return [];
  }

  return args.platformStore.listProcessPackageContextMembers({
    packageContextId: currentPackageContext.packageContextId,
  });
}

export function assertPackageMembersEligible(args: {
  members: PackageSnapshotMemberWriteInput[];
  eligibleArtifactVersionIds: string[];
}): void {
  const eligibleVersionIds = new Set(args.eligibleArtifactVersionIds);

  for (const member of args.members) {
    if (!eligibleVersionIds.has(member.artifactVersionId)) {
      throw new Error(packageSnapshotMemberNotAllowedError);
    }
  }
}

export async function resolvePackageContextMembers(args: {
  platformStore: Pick<PlatformStore, 'getPackageSnapshot' | 'listPackageSnapshotMembers'>;
  processId: string;
  basePackageSnapshotId: string | null;
  members: Array<{
    position: number;
    artifactId: string;
    artifactVersionId: string;
    displayName: string;
    versionLabel: string;
  }>;
}): Promise<typeof args.members> {
  if (args.basePackageSnapshotId === null || args.members.length > 0) {
    return args.members;
  }

  const snapshot = await args.platformStore.getPackageSnapshot({
    packageSnapshotId: args.basePackageSnapshotId,
  });

  if (snapshot === null) {
    throw new Error('Base package snapshot not found.');
  }

  if (snapshot.processId !== args.processId) {
    throw new Error('Base package snapshot does not belong to the requested process.');
  }

  return (
    await args.platformStore.listPackageSnapshotMembers({
      packageSnapshotId: args.basePackageSnapshotId,
    })
  ).map((member) => ({
    position: member.position,
    artifactId: member.artifactId,
    artifactVersionId: member.artifactVersionId,
    displayName: member.displayName,
    versionLabel: member.versionLabel,
  }));
}

export function packageContextPayloadMatches(args: {
  existingContext: ProcessPackageContextRecord | null;
  existingMembers: ProcessPackageContextMemberRecord[];
  displayName: string;
  packageType: string;
  basePackageSnapshotId: string | null;
  members: Array<{
    position: number;
    artifactId: string;
    artifactVersionId: string;
    displayName: string;
    versionLabel: string;
  }>;
}): boolean {
  const normalizedInputMembers = [...args.members].sort(
    (left, right) => left.position - right.position,
  );

  return (
    args.existingContext !== null &&
    args.existingContext.displayName === args.displayName &&
    args.existingContext.packageType === args.packageType &&
    args.existingContext.basePackageSnapshotId === args.basePackageSnapshotId &&
    args.existingMembers.length === normalizedInputMembers.length &&
    args.existingMembers.every((member, index) => {
      const candidate = normalizedInputMembers[index];
      return (
        candidate !== undefined &&
        member.position === candidate.position &&
        member.artifactId === candidate.artifactId &&
        member.artifactVersionId === candidate.artifactVersionId &&
        member.displayName === candidate.displayName &&
        member.versionLabel === candidate.versionLabel
      );
    })
  );
}
