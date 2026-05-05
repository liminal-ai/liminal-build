import { v } from 'convex/values';

export const archiveEntryKindValidator = v.union(
  v.literal('user_message'),
  v.literal('model_message'),
  v.literal('reasoning'),
  v.literal('script_emission'),
  v.literal('tool_call'),
  v.literal('tool_result'),
  v.literal('process_event'),
);

export const archiveEntryLifecycleStateValidator = v.literal('finalized');

export const archiveBodyFormatValidator = v.union(
  v.literal('plain_text'),
  v.literal('markdown'),
  v.literal('structured'),
  v.literal('none'),
);

export const archiveEntryStatusValidator = v.union(v.literal('ready'), v.literal('degraded'));

export const archiveEntryBodyDataValidator = v.object({
  jsonText: v.string(),
});

export const archiveEntriesTableFields = {
  projectId: v.string(),
  processId: v.id('processes'),
  entryKind: archiveEntryKindValidator,
  sequence: v.number(),
  lifecycleState: archiveEntryLifecycleStateValidator,
  finalizationKey: v.string(),
  sourceObjectId: v.union(v.string(), v.null()),
  bodyText: v.union(v.string(), v.null()),
  bodyData: v.union(archiveEntryBodyDataValidator, v.null()),
  bodyFormat: archiveBodyFormatValidator,
  relatedArtifactVersionId: v.union(v.id('artifactVersions'), v.null()),
  relatedSourceProvenanceId: v.union(v.string(), v.null()),
  relatedToolCallId: v.union(v.string(), v.null()),
  entryStatus: archiveEntryStatusValidator,
  degradationReason: v.union(v.string(), v.null()),
  recordedAt: v.string(),
};
