import { deriveEnvironmentStatusLabel } from '../../shared/contracts/index.js';
import type {
  CurrentProcessRequest,
  EnvironmentSummary,
  LiveProcessUpdateMessage,
  ProcessHistoryItem,
  ProcessHistorySectionEnvelope,
  ProcessMaterialsSectionEnvelope,
  ProcessSurfaceSectionError,
  ProcessSurfaceState,
  SideWorkSectionEnvelope,
} from '../../shared/contracts/index.js';

function isStaleMessage(state: ProcessSurfaceState, message: LiveProcessUpdateMessage): boolean {
  if (state.live.subscriptionId !== message.subscriptionId) {
    return false;
  }

  if (state.live.lastSequenceNumber === null) {
    return false;
  }

  return message.sequenceNumber <= state.live.lastSequenceNumber;
}

function mergeHistoryItems(
  items: ProcessHistoryItem[],
  nextItem: ProcessHistoryItem,
): ProcessHistoryItem[] {
  const deduped = items.filter((item) => item.historyItemId !== nextItem.historyItemId);
  deduped.push(nextItem);
  deduped.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return deduped;
}

function buildHistoryEnvelope(
  current: ProcessHistorySectionEnvelope | null,
  nextItem: ProcessHistoryItem,
): ProcessHistorySectionEnvelope {
  return {
    status: 'ready',
    items: mergeHistoryItems(current?.items ?? [], nextItem),
  };
}

function buildSectionErrorEnvelope(
  entityType: 'history' | 'materials' | 'side_work',
  error: ProcessSurfaceSectionError,
): ProcessHistorySectionEnvelope | ProcessMaterialsSectionEnvelope | SideWorkSectionEnvelope {
  if (entityType === 'history') {
    return {
      status: 'error',
      items: [],
      error,
    };
  }

  if (entityType === 'materials') {
    return {
      status: 'error',
      currentArtifacts: [],
      currentOutputs: [],
      currentSources: [],
      error,
    };
  }

  return {
    status: 'error',
    items: [],
    error,
  };
}

function applyCurrentRequest(next: CurrentProcessRequest | null): CurrentProcessRequest | null {
  return next;
}

function normalizeEnvironmentState(
  environment: EnvironmentSummary,
  state: EnvironmentSummary['state'],
): EnvironmentSummary {
  return {
    ...environment,
    state,
    statusLabel: deriveEnvironmentStatusLabel(state),
  };
}

function applyEnvironment(next: EnvironmentSummary): EnvironmentSummary {
  return normalizeEnvironmentState(next, next.state);
}

export interface ApplyLiveProcessMessageArgs {
  state: ProcessSurfaceState;
  message: LiveProcessUpdateMessage;
}

export function applyLiveProcessMessage(args: ApplyLiveProcessMessageArgs): ProcessSurfaceState {
  if (args.state.processId !== null && args.message.processId !== args.state.processId) {
    return args.state;
  }

  if (isStaleMessage(args.state, args.message)) {
    return args.state;
  }

  const nextState: ProcessSurfaceState = {
    ...args.state,
    live: {
      ...args.state.live,
      connectionState: 'connected',
      subscriptionId: args.message.subscriptionId,
      lastSequenceNumber: args.message.sequenceNumber,
      error: null,
    },
  };

  if (args.message.messageType === 'error') {
    const envelope = buildSectionErrorEnvelope(args.message.entityType, args.message.payload);

    if (args.message.entityType === 'history') {
      nextState.history = envelope as ProcessHistorySectionEnvelope;
    }

    if (args.message.entityType === 'materials') {
      nextState.materials = envelope as ProcessMaterialsSectionEnvelope;
    }

    if (args.message.entityType === 'side_work') {
      nextState.sideWork = envelope as SideWorkSectionEnvelope;
    }

    return nextState;
  }

  if (args.message.entityType === 'process') {
    nextState.process = args.message.payload;

    if (nextState.process.status === 'waiting' && nextState.environment?.state === 'running') {
      nextState.environment = normalizeEnvironmentState(nextState.environment, 'ready');
    }

    return nextState;
  }

  if (args.message.entityType === 'history') {
    nextState.history = buildHistoryEnvelope(args.state.history, args.message.payload);
    return nextState;
  }

  if (args.message.entityType === 'current_request') {
    nextState.currentRequest = applyCurrentRequest(args.message.payload);
    return nextState;
  }

  if (args.message.entityType === 'materials') {
    nextState.materials = args.message.payload;
    return nextState;
  }

  if (args.message.entityType === 'environment') {
    nextState.environment = applyEnvironment(args.message.payload);
    return nextState;
  }

  nextState.sideWork = args.message.payload;
  return nextState;
}
