import type { LiveProcessUpdateMessage } from '../../../../shared/contracts/index.js';

export interface ProcessLiveSubscription {
  close(): void;
}

export interface ProcessLiveHub {
  subscribe(args: {
    actorId: string;
    projectId: string;
    processId: string;
    send: (message: LiveProcessUpdateMessage) => void;
  }): ProcessLiveSubscription;
  publish(args: {
    projectId: string;
    processId: string;
    messages: LiveProcessUpdateMessage[];
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
