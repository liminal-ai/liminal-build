import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { type ServerEnv, story0PlaceholderEnv } from './config.js';
import { AppError } from './errors/app-error.js';
import { story0InternalErrorCode } from './errors/codes.js';
import { cookiesPlugin } from './plugins/cookies.plugin.js';
import { csrfPlugin } from './plugins/csrf.plugin.js';
import { vitePlugin } from './plugins/vite.plugin.js';
import { workosAuthPlugin } from './plugins/workos-auth.plugin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProjectRoutes } from './routes/projects.js';
import type { AuthSessionService } from './services/auth/auth-session.service.js';
import type { AuthUserSyncService } from './services/auth/auth-user-sync.service.js';

export interface CreateAppOptions {
  env?: ServerEnv;
  logger?: boolean;
  authSessionService?: AuthSessionService;
  authUserSyncService?: AuthUserSyncService;
}

export async function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? story0PlaceholderEnv;
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cookiesPlugin, {
    secret: env.WORKOS_COOKIE_PASSWORD,
  });
  await app.register(csrfPlugin);
  await app.register(vitePlugin);
  await app.register(workosAuthPlugin, {
    authSessionService: options.authSessionService,
    authUserSyncService: options.authUserSyncService,
  });
  await app.register(registerAuthRoutes);
  await app.register(registerProjectRoutes);

  app.get('/health', async () => {
    return {
      status: 'ok',
      story: 'story-0-foundation',
    };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      code: story0InternalErrorCode,
      message: 'Unhandled Story 0 scaffold error.',
    });
  });

  return app;
}
