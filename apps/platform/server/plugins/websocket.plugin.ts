import fp from 'fastify-plugin';
import {
  NoopProcessLiveHub,
  type ProcessLiveHub,
} from '../services/processes/live/process-live-hub.js';

export interface WebsocketPluginOptions {
  processLiveHub?: ProcessLiveHub;
}

declare module 'fastify' {
  interface FastifyInstance {
    processLiveHub: ProcessLiveHub;
  }
}

export const websocketPlugin = fp<WebsocketPluginOptions>(
  async (app, options) => {
    app.decorate('processLiveHub', options.processLiveHub ?? new NoopProcessLiveHub());
  },
  {
    name: 'story0-websocket-plugin',
  },
);
