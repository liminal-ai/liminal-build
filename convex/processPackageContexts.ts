import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server.js';

export const processPackageContextsTableFields = {
  processId: v.id('processes'),
  displayName: v.string(),
  packageType: v.string(),
  basePackageSnapshotId: v.union(v.id('packageSnapshots'), v.null()),
  updatedAt: v.string(),
};

export const upsertProcessPackageContextMemberInputValidator = v.object({
  position: v.number(),
  artifactId: v.id('artifacts'),
  artifactVersionId: v.id('artifactVersions'),
  displayName: v.string(),
  versionLabel: v.string(),
});

const MAX_PROCESS_PACKAGE_CONTEXT_ROWS = 16;
const MAX_PROCESS_PACKAGE_CONTEXT_MEMBERS = 256;

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

function toProcessPackageContextRecord(context: {
  _id: Id<'processPackageContexts'>;
  processId: Id<'processes'>;
  displayName: string;
  packageType: string;
  basePackageSnapshotId: Id<'packageSnapshots'> | null;
  updatedAt: string;
}) {
  return {
    packageContextId: context._id,
    processId: context.processId,
    displayName: context.displayName,
    packageType: context.packageType,
    basePackageSnapshotId: context.basePackageSnapshotId,
    updatedAt: context.updatedAt,
  };
}

async function listContextsForProcess(ctx: QueryCtx | MutationCtx, processId: string) {
  return ctx.db
    .query('processPackageContexts')
    .withIndex('by_processId', (indexQuery) =>
      indexQuery.eq('processId', processId as Id<'processes'>),
    )
    .take(MAX_PROCESS_PACKAGE_CONTEXT_ROWS);
}

async function listMembersForContext(
  ctx: QueryCtx | MutationCtx,
  packageContextId: Id<'processPackageContexts'>,
) {
  return ctx.db
    .query('processPackageContextMembers')
    .withIndex('by_packageContextId_position', (indexQuery) =>
      indexQuery.eq('packageContextId', packageContextId),
    )
    .order('asc')
    .take(MAX_PROCESS_PACKAGE_CONTEXT_MEMBERS);
}

export const getCurrentProcessPackageContext = query({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    const contexts = await listContextsForProcess(ctx, args.processId);
    const canonicalContext = [...contexts].sort(compareCanonicalContexts)[0];

    return canonicalContext === undefined ? null : toProcessPackageContextRecord(canonicalContext);
  },
});

export const clearCurrentProcessPackageContext = mutation({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    const contexts = await listContextsForProcess(ctx, args.processId);

    for (const context of contexts) {
      const members = await listMembersForContext(ctx, context._id);

      for (const member of members) {
        await ctx.db.delete(member._id);
      }

      await ctx.db.delete(context._id);
    }

    return null;
  },
});

export const upsertCurrentProcessPackageContext = mutation({
  args: {
    processId: v.string(),
    displayName: v.string(),
    packageType: v.string(),
    basePackageSnapshotId: v.union(v.id('packageSnapshots'), v.null()),
    members: v.array(upsertProcessPackageContextMemberInputValidator),
  },
  handler: async (ctx, args) => {
    const normalizedMembers = [...args.members].sort(
      (left, right) => left.position - right.position,
    );
    const seenPositions = new Set<number>();

    for (const member of normalizedMembers) {
      if (!Number.isInteger(member.position) || member.position < 0) {
        throw new Error('Process package context member position must be a non-negative integer.');
      }

      if (seenPositions.has(member.position)) {
        throw new Error('Process package context member positions must be unique.');
      }

      seenPositions.add(member.position);
    }

    const contexts = await listContextsForProcess(ctx, args.processId);
    const [canonicalContext, ...duplicateContexts] = [...contexts].sort(compareCanonicalContexts);

    if (canonicalContext !== undefined) {
      const existingMembers = await listMembersForContext(ctx, canonicalContext._id);
      const payloadMatchesExisting =
        canonicalContext.displayName === args.displayName &&
        canonicalContext.packageType === args.packageType &&
        canonicalContext.basePackageSnapshotId === args.basePackageSnapshotId &&
        existingMembers.length === normalizedMembers.length &&
        existingMembers.every((member, index) => {
          const candidate = normalizedMembers[index];

          return (
            candidate !== undefined &&
            member.position === candidate.position &&
            member.artifactId === candidate.artifactId &&
            member.artifactVersionId === candidate.artifactVersionId &&
            member.displayName === candidate.displayName &&
            member.versionLabel === candidate.versionLabel
          );
        });

      if (payloadMatchesExisting && duplicateContexts.length === 0) {
        return {
          context: toProcessPackageContextRecord(canonicalContext),
          members: existingMembers.map((member) => ({
            memberId: member._id,
            packageContextId: member.packageContextId,
            position: member.position,
            artifactId: member.artifactId,
            artifactVersionId: member.artifactVersionId,
            displayName: member.displayName,
            versionLabel: member.versionLabel,
            pinnedAt: member.pinnedAt,
          })),
        };
      }
    }

    const updatedAt = new Date().toISOString();
    const packageContextId =
      canonicalContext === undefined
        ? await ctx.db.insert('processPackageContexts', {
            processId: args.processId as Id<'processes'>,
            displayName: args.displayName,
            packageType: args.packageType,
            basePackageSnapshotId: args.basePackageSnapshotId,
            updatedAt,
          })
        : canonicalContext._id;

    if (canonicalContext !== undefined) {
      await ctx.db.patch(packageContextId, {
        displayName: args.displayName,
        packageType: args.packageType,
        basePackageSnapshotId: args.basePackageSnapshotId,
        updatedAt,
      });

      const existingMembers = await listMembersForContext(ctx, packageContextId);
      for (const member of existingMembers) {
        await ctx.db.delete(member._id);
      }
    }

    for (const duplicateContext of duplicateContexts) {
      const duplicateMembers = await listMembersForContext(ctx, duplicateContext._id);

      for (const member of duplicateMembers) {
        await ctx.db.delete(member._id);
      }

      await ctx.db.delete(duplicateContext._id);
    }

    const insertedMembers = [];

    for (const member of normalizedMembers) {
      const memberId = await ctx.db.insert('processPackageContextMembers', {
        packageContextId,
        position: member.position,
        artifactId: member.artifactId,
        artifactVersionId: member.artifactVersionId,
        displayName: member.displayName,
        versionLabel: member.versionLabel,
        pinnedAt: updatedAt,
      });

      insertedMembers.push({
        memberId,
        packageContextId,
        position: member.position,
        artifactId: member.artifactId,
        artifactVersionId: member.artifactVersionId,
        displayName: member.displayName,
        versionLabel: member.versionLabel,
        pinnedAt: updatedAt,
      });
    }

    return {
      context: {
        packageContextId,
        processId: args.processId,
        displayName: args.displayName,
        packageType: args.packageType,
        basePackageSnapshotId: args.basePackageSnapshotId,
        updatedAt,
      },
      members: insertedMembers,
    };
  },
});
