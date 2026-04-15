import fastifyWebsocket from '@fastify/websocket';
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
    await app.register(fastifyWebsocket);
    app.decorate('processLiveHub', options.processLiveHub ?? new NoopProcessLiveHub());
  },
  {
    name: 'story6-websocket-plugin',
  },
);
