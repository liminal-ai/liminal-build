import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fp from 'fastify-plugin';
import { createServer, type ViteDevServer } from 'vite';
import type { ShellBootstrapPayload } from '../../shared/contracts/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    renderShellDocument: (payload: ShellBootstrapPayload, url: string) => Promise<string>;
  }
}

const bootstrapPlaceholder = '__LIMINAL_SHELL_BOOTSTRAP__';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const platformRoot = path.resolve(currentDir, '..', '..');
const clientRoot = path.join(platformRoot, 'client');
const clientIndexPath = path.join(clientRoot, 'index.html');
const builtClientRoot = path.join(platformRoot, 'dist', 'client');
const builtClientIndexPath = path.join(builtClientRoot, 'index.html');

function serializeBootstrapPayload(payload: ShellBootstrapPayload): string {
  return JSON.stringify(payload).replaceAll('<', '\\u003c');
}

function injectBootstrapPayload(source: string, payload: ShellBootstrapPayload): string {
  return source.replace(bootstrapPlaceholder, serializeBootstrapPayload(payload));
}

function resolveRuntimeMode(): 'development' | 'production' | 'test' {
  if (process.env.VITEST !== undefined) {
    return 'test';
  }

  if (
    process.env.NODE_ENV === 'production' ||
    fileURLToPath(import.meta.url).includes(`${path.sep}dist${path.sep}`)
  ) {
    return 'production';
  }

  return 'development';
}

function inferContentType(assetPath: string): string {
  if (assetPath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }

  if (assetPath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }

  if (assetPath.endsWith('.map')) {
    return 'application/json; charset=utf-8';
  }

  if (assetPath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }

  return 'application/octet-stream';
}

export const vitePlugin = fp(
  async (app) => {
    const runtimeMode = resolveRuntimeMode();
    let devServer: ViteDevServer | null = null;

    if (runtimeMode === 'development') {
      devServer = await createServer({
        configFile: path.join(platformRoot, 'vite.config.ts'),
        root: clientRoot,
        appType: 'custom',
        server: {
          middlewareMode: true,
        },
      });
    }

    app.decorate('renderShellDocument', async (payload: ShellBootstrapPayload, url: string) => {
      const htmlTemplatePath =
        runtimeMode === 'production' ? builtClientIndexPath : clientIndexPath;
      const htmlTemplate = await fs.readFile(htmlTemplatePath, 'utf8');
      const htmlWithBootstrap = injectBootstrapPayload(htmlTemplate, payload);

      if (devServer !== null) {
        return devServer.transformIndexHtml(url, htmlWithBootstrap);
      }

      return htmlWithBootstrap;
    });

    if (devServer !== null) {
      app.get('/*', async (request, reply) => {
        const pathname = new URL(request.url, 'http://story1.local').pathname;

        if (
          pathname === '/' ||
          pathname === '/health' ||
          pathname.startsWith('/auth') ||
          pathname.startsWith('/api') ||
          pathname.startsWith('/projects')
        ) {
          return reply.callNotFound();
        }

        reply.hijack();
        await new Promise<void>((resolve, reject) => {
          devServer?.middlewares(request.raw, reply.raw, (error?: Error) => {
            if (error !== undefined) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        if (!reply.raw.writableEnded) {
          reply.raw.statusCode = 404;
          reply.raw.end();
        }
      });
    } else if (runtimeMode === 'production') {
      app.get('/assets/*', async (request, reply) => {
        const pathname = new URL(request.url, 'http://story1.local').pathname;
        const resolvedPath = path.resolve(
          builtClientRoot,
          `.${pathname.startsWith('/') ? pathname : `/${pathname}`}`,
        );

        if (!resolvedPath.startsWith(builtClientRoot)) {
          return reply.callNotFound();
        }

        try {
          const content = await fs.readFile(resolvedPath);
          return reply.type(inferContentType(resolvedPath)).send(content);
        } catch {
          return reply.callNotFound();
        }
      });
    }

    app.addHook('onClose', async () => {
      await devServer?.close();
    });
  },
  {
    name: 'story0-vite-plugin',
  },
);
