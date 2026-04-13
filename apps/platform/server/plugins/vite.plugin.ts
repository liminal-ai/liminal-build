import fp from 'fastify-plugin';
import type { ShellBootstrapPayload } from '../../shared/contracts/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    renderShellDocument: (payload: ShellBootstrapPayload) => string;
  }
}

function serializeBootstrapPayload(payload: ShellBootstrapPayload): string {
  return JSON.stringify(payload).replaceAll('<', '\\u003c');
}

export const vitePlugin = fp(
  async (app) => {
    app.decorate('renderShellDocument', (payload: ShellBootstrapPayload) => {
      const serializedPayload = serializeBootstrapPayload(payload);

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Liminal Build Platform Shell</title>
  </head>
  <body>
    <div id="app">Story 0 shell scaffold. Client bundle integration lands in later stories.</div>
    <script>window.__SHELL_BOOTSTRAP__ = ${serializedPayload};</script>
  </body>
</html>`;
    });
  },
  {
    name: 'story0-vite-plugin',
  },
);
