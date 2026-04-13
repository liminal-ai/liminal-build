import { WorkOS } from '@workos-inc/node';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { hasLiveConvexConfig, type ServerEnv, story0PlaceholderEnv } from './config.js';
import { AppError } from './errors/app-error.js';
import { story0InternalErrorCode } from './errors/codes.js';
import { cookiesPlugin } from './plugins/cookies.plugin.js';
import { csrfPlugin } from './plugins/csrf.plugin.js';
import { vitePlugin } from './plugins/vite.plugin.js';
import { workosAuthPlugin } from './plugins/workos-auth.plugin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProjectRoutes } from './routes/projects.js';
import { AuthSessionService } from './services/auth/auth-session.service.js';
import { AuthUserSyncService } from './services/auth/auth-user-sync.service.js';
import {
  ConvexPlatformStore,
  NullPlatformStore,
  type PlatformStore,
} from './services/projects/platform-store.js';
import { ProjectAccessService } from './services/projects/project-access.service.js';
import { ProjectCreateService } from './services/projects/project-create.service.js';
import { ProjectIndexService } from './services/projects/project-index.service.js';
import { ProjectShellService } from './services/projects/project-shell.service.js';

export interface CreateAppOptions {
  env?: ServerEnv;
  logger?: boolean;
  authSessionService?: AuthSessionService;
  authUserSyncService?: AuthUserSyncService;
  platformStore?: PlatformStore;
  projectAccessService?: ProjectAccessService;
  projectCreateService?: ProjectCreateService;
  projectIndexService?: ProjectIndexService;
  projectShellService?: ProjectShellService;
}

declare module 'fastify' {
  interface FastifyInstance {
    projectAccessService: ProjectAccessService;
    projectCreateService: ProjectCreateService;
    projectIndexService: ProjectIndexService;
    projectShellService: ProjectShellService;
  }
}

export async function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? story0PlaceholderEnv;
  const platformStore =
    options.platformStore ??
    (hasLiveConvexConfig(env) ? new ConvexPlatformStore(env.CONVEX_URL) : new NullPlatformStore());
  const authSessionService =
    options.authSessionService ??
    new AuthSessionService({
      workosClient: new WorkOS({
        apiKey: env.WORKOS_API_KEY,
        clientId: env.WORKOS_CLIENT_ID,
      }),
      clientId: env.WORKOS_CLIENT_ID,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      redirectUri: env.WORKOS_REDIRECT_URI,
      loginReturnUri: env.WORKOS_LOGIN_RETURN_URI,
    });
  const authUserSyncService = options.authUserSyncService ?? new AuthUserSyncService(platformStore);
  const projectAccessService =
    options.projectAccessService ?? new ProjectAccessService(platformStore);
  const projectCreateService =
    options.projectCreateService ?? new ProjectCreateService(platformStore);
  const projectIndexService = options.projectIndexService ?? new ProjectIndexService(platformStore);
  const projectShellService = options.projectShellService ?? new ProjectShellService(platformStore);
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('projectAccessService', projectAccessService);
  app.decorate('projectCreateService', projectCreateService);
  app.decorate('projectIndexService', projectIndexService);
  app.decorate('projectShellService', projectShellService);

  await app.register(cookiesPlugin, {
    secret: env.WORKOS_COOKIE_PASSWORD,
  });
  await app.register(csrfPlugin);
  await app.register(vitePlugin);
  await app.register(workosAuthPlugin, {
    authSessionService,
    authUserSyncService,
  });
  await app.register(registerAuthRoutes);
  await app.register(registerProjectRoutes);

  app.get('/health', async () => {
    return {
      status: 'ok',
      story: 'story-3-project-shell-summaries',
    };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      code: story0InternalErrorCode,
      message: 'Unhandled Story 3 error.',
    });
  });

  return app;
}
