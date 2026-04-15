import type { LiveProcessUpdateMessage } from '../../../../shared/contracts/index.js';
import {
  normalizeProcessLiveMessages,
  type ProcessLivePublication,
} from './process-live-normalizer.js';

export interface ProcessLiveSubscription {
  close(): void;
}

export interface ProcessLiveHub {
  subscribe(args: {
    actorId: string;
    projectId: string;
    processId: string;
    send: (message: LiveProcessUpdateMessage) => void;
    initialPublication?: ProcessLivePublication;
  }): ProcessLiveSubscription;
  publish(args: {
    projectId: string;
    processId: string;
    publication: ProcessLivePublication;
  }): void;
}

export class NoopProcessLiveHub implements ProcessLiveHub {
  subscribe(): ProcessLiveSubscription {
    return {
      close(): void {},
    };
  }

  publish(): void {}
}
type ProcessStreamSubscriber = {
  actorId: string;
  lastSequenceNumber: number;
  send: (message: LiveProcessUpdateMessage) => void;
};

type ProcessStreamState = {
  subscribers: Map<string, ProcessStreamSubscriber>;
};

function buildStreamKey(args: { projectId: string; processId: string }): string {
  return `${args.projectId}:${args.processId}`;
}

function buildSubscriptionId(): string {
  return globalThis.crypto.randomUUID();
}

export class InMemoryProcessLiveHub implements ProcessLiveHub {
  private readonly streams = new Map<string, ProcessStreamState>();

  subscribe(args: {
    actorId: string;
    projectId: string;
    processId: string;
    send: (message: LiveProcessUpdateMessage) => void;
    initialPublication?: ProcessLivePublication;
  }): ProcessLiveSubscription {
    const streamKey = buildStreamKey(args);
    const streamState = this.ensureStream(streamKey);
    const subscriptionId = buildSubscriptionId();
    const subscriber: ProcessStreamSubscriber = {
      actorId: args.actorId,
      lastSequenceNumber: 0,
      send: args.send,
    };
    streamState.subscribers.set(subscriptionId, subscriber);

    if (args.initialPublication !== undefined) {
      this.publishToSubscriber({
        projectId: args.projectId,
        processId: args.processId,
        publication: args.initialPublication,
        subscriptionId,
        subscriber,
      });
    }

    return {
      close: () => {
        const stream = this.streams.get(streamKey);

        if (stream === undefined) {
          return;
        }

        stream.subscribers.delete(subscriptionId);

        if (stream.subscribers.size === 0) {
          this.streams.delete(streamKey);
        }
      },
    };
  }

  publish(args: {
    projectId: string;
    processId: string;
    publication: ProcessLivePublication;
  }): void {
    const streamKey = buildStreamKey(args);
    const streamState = this.streams.get(streamKey);

    if (streamState === undefined) {
      return;
    }

    for (const [subscriptionId, subscriber] of streamState.subscribers.entries()) {
      this.publishToSubscriber({
        projectId: args.projectId,
        processId: args.processId,
        publication: args.publication,
        subscriptionId,
        subscriber,
      });
    }
  }

  private publishToSubscriber(args: {
    projectId: string;
    processId: string;
    publication: ProcessLivePublication;
    subscriptionId: string;
    subscriber: ProcessStreamSubscriber;
  }): void {
    const messages = normalizeProcessLiveMessages({
      subscriptionId: args.subscriptionId,
      processId: args.processId,
      startingSequenceNumber: args.subscriber.lastSequenceNumber,
      publication: args.publication,
    });

    for (const message of messages) {
      args.subscriber.send(message);
      args.subscriber.lastSequenceNumber = message.sequenceNumber;
    }
  }

  private ensureStream(streamKey: string): ProcessStreamState {
    const existing = this.streams.get(streamKey);

    if (existing !== undefined) {
      return existing;
    }

    const nextState: ProcessStreamState = {
      subscribers: new Map(),
    };
    this.streams.set(streamKey, nextState);
    return nextState;
  }
}
