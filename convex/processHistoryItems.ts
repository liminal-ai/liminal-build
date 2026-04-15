import { v } from 'convex/values';

export const processHistoryItemKindValidator = v.union(
  v.literal('user_message'),
  v.literal('process_message'),
  v.literal('progress_update'),
  v.literal('attention_request'),
  v.literal('side_work_update'),
  v.literal('process_event'),
);

export const processHistoryItemLifecycleValidator = v.union(
  v.literal('current'),
  v.literal('finalized'),
);

export const processHistoryItemRequestStateValidator = v.union(
  v.literal('none'),
  v.literal('unresolved'),
  v.literal('resolved'),
  v.literal('superseded'),
);

export const processHistoryItemsTableFields = {
  processId: v.id('processes'),
  kind: processHistoryItemKindValidator,
  lifecycleState: processHistoryItemLifecycleValidator,
  requestState: processHistoryItemRequestStateValidator,
  text: v.string(),
  relatedSideWorkId: v.union(v.id('processSideWorkItems'), v.null()),
  relatedArtifactId: v.union(v.id('artifacts'), v.null()),
  clientRequestId: v.union(v.string(), v.null()),
  createdAt: v.string(),
  finalizedAt: v.union(v.string(), v.null()),
};
