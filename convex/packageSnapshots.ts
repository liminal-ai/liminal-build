import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import { internalMutation, internalQuery, type MutationCtx } from './_generated/server.js';

export const publishPackageSnapshotMemberInputValidator = v.object({
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
  position: v.number(),
});

const EMPTY_PACKAGE_SNAPSHOT_MEMBERS_ERROR = 'Package snapshot must include at least one member.';
const INVALID_PACKAGE_SNAPSHOT_POSITION_ERROR =
  'Package snapshot member position must be a non-negative integer.';
const DUPLICATE_PACKAGE_SNAPSHOT_POSITION_ERROR =
  'Package snapshot member positions must be unique.';
const PACKAGE_SNAPSHOT_ARTIFACT_VERSION_NOT_FOUND_ERROR =
  'Package snapshot member artifact version not found.';
const PACKAGE_SNAPSHOT_ARTIFACT_VERSION_OWNERSHIP_ERROR =
  'Package snapshot member artifact version must belong to the specified artifact.';
const PACKAGE_SNAPSHOT_ARTIFACT_NOT_FOUND_ERROR = 'Package snapshot member artifact not found.';
const PACKAGE_SNAPSHOT_ARTIFACT_PROJECT_MISMATCH_ERROR =
  'Package snapshot member artifact must belong to the publishing process project.';
const PACKAGE_SNAPSHOT_MEMBER_NOT_ALLOWED_ERROR =
  'Package snapshot member is not allowed in the current package-building context.';

export const packageSnapshotsTableFields = {
  processId: v.id('processes'),
  displayName: v.string(),
  packageType: v.string(),
  publishedAt: v.string(),
};

function toPackageSnapshotRecord(snapshot: {
  _id: Id<'packageSnapshots'>;
  processId: Id<'processes'>;
  displayName: string;
  packageType: string;
  publishedAt: string;
}) {
  return {
    packageSnapshotId: snapshot._id,
    processId: snapshot.processId,
    displayName: snapshot.displayName,
    packageType: snapshot.packageType,
    publishedAt: snapshot.publishedAt,
  };
}

function compareCanonicalContexts(
  left: { _id: Id<'processPackageContexts'>; updatedAt: string },
  right: { _id: Id<'processPackageContexts'>; updatedAt: string },
) {
  const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);

  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  return left._id.localeCompare(right._id);
}

async function listCurrentArtifactIdsForProcess(
  ctx: MutationCtx,
  processRecord: Doc<'processes'>,
): Promise<Array<Id<'artifacts'>>> {
  switch (processRecord.processType) {
    case 'ProductDefinition': {
      const state = await ctx.db
        .query('processProductDefinitionStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      return state?.currentArtifactIds ?? [];
    }
    case 'FeatureSpecification': {
      const state = await ctx.db
        .query('processFeatureSpecificationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      return state?.currentArtifactIds ?? [];
    }
    case 'FeatureImplementation': {
      const state = await ctx.db
        .query('processFeatureImplementationStates')
        .withIndex('by_processId', (query) => query.eq('processId', processRecord._id))
        .unique();

      return state?.currentArtifactIds ?? [];
    }
    default:
      return [];
  }
}

async function listCurrentProcessPackageContextMembers(
  ctx: MutationCtx,
  processId: Id<'processes'>,
) {
  const contexts = await ctx.db
    .query('processPackageContexts')
    .withIndex('by_processId', (query) => query.eq('processId', processId))
    .take(16);
  const canonicalContext = [...contexts].sort(compareCanonicalContexts)[0];

  if (canonicalContext === undefined) {
    return [];
  }

  return ctx.db
    .query('processPackageContextMembers')
    .withIndex('by_packageContextId_position', (query) =>
      query.eq('packageContextId', canonicalContext._id),
    )
    .order('asc')
    .take(256);
}

async function getLatestArtifactVersionForArtifact(ctx: MutationCtx, artifactId: Id<'artifacts'>) {
  const [latestVersion] = await ctx.db
    .query('artifactVersions')
    .withIndex('by_artifactId_createdAt', (query) => query.eq('artifactId', artifactId))
    .order('desc')
    .take(1);

  return latestVersion ?? null;
}

export const listPackageSnapshotsForProcess = internalQuery({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query('packageSnapshots')
      .withIndex('by_processId_publishedAt', (indexQuery) =>
        indexQuery.eq('processId', args.processId as Id<'processes'>),
      )
      .order('desc')
      .take(50);

    return snapshots.map(toPackageSnapshotRecord);
  },
});

export const getPackageSnapshot = internalQuery({
  args: {
    packageSnapshotId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const snapshot = await ctx.db.get(args.packageSnapshotId as Id<'packageSnapshots'>);
      return snapshot === null ? null : toPackageSnapshotRecord(snapshot);
    } catch {
      return null;
    }
  },
});

export const publishPackageSnapshot = internalMutation({
  args: {
    processId: v.id('processes'),
    displayName: v.string(),
    packageType: v.string(),
    members: v.array(publishPackageSnapshotMemberInputValidator),
  },
  handler: async (ctx, args) => {
    if (args.members.length === 0) {
      throw new Error(EMPTY_PACKAGE_SNAPSHOT_MEMBERS_ERROR);
    }

    const processRecord = await ctx.db.get(args.processId);

    if (processRecord === null) {
      throw new Error('Process not found.');
    }

    const [currentArtifactIds, currentPackageContextMembers] = await Promise.all([
      listCurrentArtifactIdsForProcess(ctx, processRecord),
      listCurrentProcessPackageContextMembers(ctx, processRecord._id),
    ]);
    const currentVersionIdsByArtifactId = new Map<string, string>();
    const pinnedVersionIdsByArtifactId = new Map<string, Set<string>>();

    for (const artifactId of currentArtifactIds) {
      const latestVersion = await getLatestArtifactVersionForArtifact(ctx, artifactId);

      if (latestVersion !== null) {
        currentVersionIdsByArtifactId.set(artifactId, latestVersion._id);
      }
    }

    for (const member of currentPackageContextMembers) {
      const artifactVersionIds =
        pinnedVersionIdsByArtifactId.get(member.artifactId) ?? new Set<string>();
      artifactVersionIds.add(member.artifactVersionId);
      pinnedVersionIdsByArtifactId.set(member.artifactId, artifactVersionIds);
    }

    const seenPositions = new Set<number>();
    const validatedMembers: Array<{
      member: (typeof args.members)[number];
      artifact: Doc<'artifacts'>;
      artifactVersion: Doc<'artifactVersions'>;
    }> = [];

    for (const member of args.members) {
      if (!Number.isInteger(member.position) || member.position < 0) {
        throw new Error(INVALID_PACKAGE_SNAPSHOT_POSITION_ERROR);
      }

      if (seenPositions.has(member.position)) {
        throw new Error(DUPLICATE_PACKAGE_SNAPSHOT_POSITION_ERROR);
      }
      seenPositions.add(member.position);

      const artifactVersion = await ctx.db.get(member.artifactVersionId);
      if (artifactVersion === null) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_VERSION_NOT_FOUND_ERROR);
      }

      if (artifactVersion.artifactId !== member.artifactId) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_VERSION_OWNERSHIP_ERROR);
      }

      const artifact = await ctx.db.get(member.artifactId);
      if (artifact === null) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_NOT_FOUND_ERROR);
      }

      if (artifact.projectId !== processRecord.projectId) {
        throw new Error(PACKAGE_SNAPSHOT_ARTIFACT_PROJECT_MISMATCH_ERROR);
      }

      const allowedByCurrentRefs =
        currentVersionIdsByArtifactId.get(member.artifactId) === member.artifactVersionId;
      const allowedByPinnedContext =
        pinnedVersionIdsByArtifactId.get(member.artifactId)?.has(member.artifactVersionId) === true;

      if (!allowedByCurrentRefs && !allowedByPinnedContext) {
        throw new Error(PACKAGE_SNAPSHOT_MEMBER_NOT_ALLOWED_ERROR);
      }

      validatedMembers.push({
        member,
        artifact,
        artifactVersion,
      });
    }

    const packageSnapshotId = await ctx.db.insert('packageSnapshots', {
      processId: args.processId,
      displayName: args.displayName,
      packageType: args.packageType,
      publishedAt: new Date().toISOString(),
    });

    for (const { artifact, artifactVersion, member } of validatedMembers) {
      await ctx.db.insert('packageSnapshotMembers', {
        packageSnapshotId,
        position: member.position,
        artifactId: member.artifactId,
        artifactVersionId: member.artifactVersionId,
        displayName: artifact.displayName,
        versionLabel: artifactVersion.versionLabel,
      });
    }

    return packageSnapshotId;
  },
});
