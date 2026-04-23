import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalMutation, internalQuery } from './_generated/server.js';

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
      .take(args.limit ?? 50);

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
