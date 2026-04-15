import type {
  CurrentProcessRequest,
  LiveProcessUpdateMessage,
  ProcessHistoryItem,
  ProcessMaterialsSectionEnvelope,
  ProcessSurfaceSectionError,
  ProcessSurfaceSummary,
  SideWorkSectionEnvelope,
} from '../../../../shared/contracts/index.js';

export interface ProcessLivePublication {
  messageType: 'snapshot' | 'upsert' | 'complete' | 'error';
  correlationId?: string | null;
  completedAt?: string | null;
  process?: ProcessSurfaceSummary;
  historyItems?: ProcessHistoryItem[];
  currentRequest?: CurrentProcessRequest | null;
  materials?: ProcessMaterialsSectionEnvelope;
  sideWork?: SideWorkSectionEnvelope;
  sectionErrors?: Partial<
    Record<'history' | 'materials' | 'side_work', ProcessSurfaceSectionError>
  >;
}

export function normalizeProcessLiveMessages(args: {
  subscriptionId: string;
  processId: string;
  startingSequenceNumber: number;
  publication: ProcessLivePublication;
}): LiveProcessUpdateMessage[] {
  let nextSequenceNumber = args.startingSequenceNumber;
  const nextMessage = <
    TMessage extends Omit<
      LiveProcessUpdateMessage,
      'subscriptionId' | 'processId' | 'sequenceNumber' | 'correlationId' | 'completedAt'
    >,
  >(
    message: TMessage,
  ): LiveProcessUpdateMessage => {
    nextSequenceNumber += 1;

    return {
      subscriptionId: args.subscriptionId,
      processId: args.processId,
      sequenceNumber: nextSequenceNumber,
      correlationId: args.publication.correlationId ?? null,
      completedAt: args.publication.completedAt ?? null,
      ...message,
    } as LiveProcessUpdateMessage;
  };

  const messages: LiveProcessUpdateMessage[] = [];

  if (args.publication.process !== undefined && args.publication.messageType !== 'error') {
    messages.push(
      nextMessage({
        messageType: args.publication.messageType,
        entityType: 'process',
        entityId: args.publication.process.processId,
        payload: args.publication.process,
      }),
    );
  }

  if (args.publication.messageType !== 'error') {
    for (const historyItem of args.publication.historyItems ?? []) {
      messages.push(
        nextMessage({
          messageType: args.publication.messageType,
          entityType: 'history',
          entityId: historyItem.historyItemId,
          payload: historyItem,
        }),
      );
    }
  }

  if (args.publication.currentRequest !== undefined && args.publication.messageType !== 'error') {
    messages.push(
      nextMessage({
        messageType: args.publication.messageType,
        entityType: 'current_request',
        entityId: 'current_request',
        payload: args.publication.currentRequest,
      }),
    );
  }

  if (args.publication.materials !== undefined && args.publication.messageType !== 'error') {
    messages.push(
      nextMessage({
        messageType: args.publication.messageType,
        entityType: 'materials',
        entityId: 'materials',
        payload: args.publication.materials,
      }),
    );
  }

  if (args.publication.sideWork !== undefined && args.publication.messageType !== 'error') {
    messages.push(
      nextMessage({
        messageType: args.publication.messageType,
        entityType: 'side_work',
        entityId: 'side_work',
        payload: args.publication.sideWork,
      }),
    );
  }

  for (const [entityType, sectionError] of Object.entries(args.publication.sectionErrors ?? {})) {
    if (sectionError === undefined) {
      continue;
    }

    messages.push(
      nextMessage({
        messageType: 'error',
        entityType: entityType as 'history' | 'materials' | 'side_work',
        entityId: entityType,
        payload: sectionError,
      }),
    );
  }

  return messages;
}
