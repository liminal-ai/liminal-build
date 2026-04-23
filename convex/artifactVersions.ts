import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalMutation, internalQuery } from './_generated/server.js';

// Pre-customer ceiling: raise the default list size until a downstream epic adds pagination.
export const ARTIFACT_VERSION_LIST_DEFAULT_LIMIT = 500;

export const artifactContentKindValidator = v.union(
  v.literal('markdown'),
  v.literal('unsupported'),
);

export const artifactVersionsTableFields = {
  artifactId: v.id('artifacts'),
  versionLabel: v.string(),
  contentStorageId: v.id('_storage'),
  contentKind: artifactContentKindValidator,
  bytes: v.number(),
  createdAt: v.string(),
  createdByProcessId: v.id('processes'),
};

function toArtifactVersionRecord(version: {
  _id: Id<'artifactVersions'>;
  artifactId: Id<'artifacts'>;
  versionLabel: string;
  contentStorageId: Id<'_storage'>;
  contentKind: 'markdown' | 'unsupported';
  bytes: number;
  createdAt: string;
  createdByProcessId: Id<'processes'>;
}) {
  return {
    versionId: version._id,
    artifactId: version.artifactId,
    versionLabel: version.versionLabel,
    contentStorageId: version.contentStorageId,
    contentKind: version.contentKind,
    bytes: version.bytes,
    createdAt: version.createdAt,
    createdByProcessId: version.createdByProcessId,
  };
}

export const listArtifactVersions = internalQuery({
  args: {
    artifactId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('artifactVersions')
      .withIndex('by_artifactId_createdAt', (indexQuery) =>
        indexQuery.eq('artifactId', args.artifactId as Id<'artifacts'>),
      )
      .order('desc')
      .take(args.limit ?? ARTIFACT_VERSION_LIST_DEFAULT_LIMIT);

    return versions.map(toArtifactVersionRecord);
  },
});

export const getArtifactVersion = internalQuery({
  args: {
    versionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const version = await ctx.db.get(args.versionId as Id<'artifactVersions'>);
      return version === null ? null : toArtifactVersionRecord(version);
    } catch {
      return null;
    }
  },
});

export const getLatestArtifactVersion = internalQuery({
  args: {
    artifactId: v.string(),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('artifactVersions')
      .withIndex('by_artifactId_createdAt', (indexQuery) =>
        indexQuery.eq('artifactId', args.artifactId as Id<'artifacts'>),
      )
      .order('desc')
      .take(1);

    return versions[0] === undefined ? null : toArtifactVersionRecord(versions[0]);
  },
});

export const listArtifactsByProducingProcess = internalQuery({
  args: {
    processId: v.string(),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('artifactVersions')
      .withIndex('by_createdByProcessId_createdAt', (indexQuery) =>
        indexQuery.eq('createdByProcessId', args.processId as Id<'processes'>),
      )
      .order('desc')
      .take(ARTIFACT_VERSION_LIST_DEFAULT_LIMIT);

    const artifactIds: Id<'artifacts'>[] = [];
    const seenArtifactIds = new Set<Id<'artifacts'>>();

    for (const version of versions) {
      if (seenArtifactIds.has(version.artifactId)) {
        continue;
      }

      seenArtifactIds.add(version.artifactId);
      artifactIds.push(version.artifactId);
    }

    return artifactIds;
  },
});

export const getArtifactVersionContentUrl = internalQuery({
  args: {
    versionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const version = await ctx.db.get(args.versionId as Id<'artifactVersions'>);
      if (version === null) {
        return null;
      }

      return ctx.storage.getUrl(version.contentStorageId);
    } catch {
      return null;
    }
  },
});

export const insertArtifactVersion = internalMutation({
  args: {
    artifactId: v.id('artifacts'),
    versionLabel: v.string(),
    contentStorageId: v.id('_storage'),
    contentKind: artifactContentKindValidator,
    bytes: v.number(),
    createdByProcessId: v.id('processes'),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('artifactVersions', {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});
