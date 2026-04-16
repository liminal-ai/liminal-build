import { WorkOS } from '@workos-inc/node';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { hasLiveConvexConfig, type ServerEnv, story0PlaceholderEnv } from './config.js';
import { AppError } from './errors/app-error.js';
import { internalServerErrorCode } from './errors/codes.js';
import { cookiesPlugin } from './plugins/cookies.plugin.js';
import { csrfPlugin } from './plugins/csrf.plugin.js';
import { vitePlugin } from './plugins/vite.plugin.js';
import { websocketPlugin } from './plugins/websocket.plugin.js';
import { workosAuthPlugin } from './plugins/workos-auth.plugin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProcessRoutes } from './routes/processes.js';
import { registerProjectRoutes } from './routes/projects.js';
import { AuthSessionService } from './services/auth/auth-session.service.js';
import { AuthUserSyncService } from './services/auth/auth-user-sync.service.js';
import {
  InMemoryProcessLiveHub,
  type ProcessLiveHub,
} from './services/processes/live/process-live-hub.js';
import { ProcessModuleRegistry } from './services/processes/process-module-registry.js';
import { ProcessAccessService } from './services/processes/process-access.service.js';
import { CheckpointPlanner } from './services/processes/environment/checkpoint-planner.js';
import {
  StubCodeCheckpointWriter,
  type CodeCheckpointWriter,
} from './services/processes/environment/code-checkpoint-writer.js';
import { ProcessEnvironmentService } from './services/processes/environment/process-environment.service.js';
import {
  InMemoryProviderAdapter,
  type ProviderAdapter,
} from './services/processes/environment/provider-adapter.js';
import { ScriptExecutionService } from './services/processes/environment/script-execution.service.js';
import { ProcessResponseService } from './services/processes/process-response.service.js';
import { ProcessResumeService } from './services/processes/process-resume.service.js';
import { ProcessStartService } from './services/processes/process-start.service.js';
import {
  DefaultProcessWorkSurfaceService,
  type ProcessWorkSurfaceService,
} from './services/processes/process-work-surface.service.js';
import {
  ConvexPlatformStore,
  NullPlatformStore,
  type PlatformStore,
} from './services/projects/platform-store.js';
import { ProcessDisplayLabelService } from './services/projects/process-display-label.service.js';
import { ProcessRegistrationService } from './services/projects/process-registration.service.js';
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
  processLiveHub?: ProcessLiveHub;
  processAccessService?: ProcessAccessService;
  processModuleRegistry?: ProcessModuleRegistry;
  providerAdapter?: ProviderAdapter;
  scriptExecutionService?: ScriptExecutionService;
  checkpointPlanner?: CheckpointPlanner;
  codeCheckpointWriter?: CodeCheckpointWriter;
  processEnvironmentService?: ProcessEnvironmentService;
  processResponseService?: ProcessResponseService;
  processRegistrationService?: ProcessRegistrationService;
  processResumeService?: ProcessResumeService;
  processStartService?: ProcessStartService;
  processWorkSurfaceService?: ProcessWorkSurfaceService;
}

declare module 'fastify' {
  interface FastifyInstance {
    projectAccessService: ProjectAccessService;
    projectCreateService: ProjectCreateService;
    projectIndexService: ProjectIndexService;
    projectShellService: ProjectShellService;
    processAccessService: ProcessAccessService;
    processModuleRegistry: ProcessModuleRegistry;
    processEnvironmentService: ProcessEnvironmentService;
    processResponseService: ProcessResponseService;
    processRegistrationService: ProcessRegistrationService;
    processResumeService: ProcessResumeService;
    processStartService: ProcessStartService;
    processWorkSurfaceService: ProcessWorkSurfaceService;
  }
}

export async function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? story0PlaceholderEnv;
  // ConvexPlatformStore needs admin auth so it can call internal Convex
  // functions — notably the Epic 3 artifact persistence internalAction
  // (`artifacts:persistCheckpointArtifacts`). The deploy key is plumbed
  // through to the constructor and passed to `ConvexHttpClient.setAdminAuth`.
  const platformStore =
    options.platformStore ??
    (hasLiveConvexConfig(env)
      ? new ConvexPlatformStore(env.CONVEX_URL, env.CONVEX_DEPLOY_KEY)
      : new NullPlatformStore());
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
  const processLiveHub = options.processLiveHub ?? new InMemoryProcessLiveHub();
  const processAccessService =
    options.processAccessService ?? new ProcessAccessService(platformStore, projectAccessService);
  const processModuleRegistry = options.processModuleRegistry ?? new ProcessModuleRegistry();
  const processDisplayLabelService = new ProcessDisplayLabelService(platformStore);
  const processRegistrationService =
    options.processRegistrationService ??
    new ProcessRegistrationService(platformStore, processDisplayLabelService, projectAccessService);
  const processResponseService =
    options.processResponseService ??
    new ProcessResponseService(platformStore, processAccessService, processLiveHub);
  const providerAdapter = options.providerAdapter ?? new InMemoryProviderAdapter();
  const scriptExecutionService =
    options.scriptExecutionService ?? new ScriptExecutionService(providerAdapter);
  const checkpointPlanner = options.checkpointPlanner ?? new CheckpointPlanner();
  const codeCheckpointWriter = options.codeCheckpointWriter ?? new StubCodeCheckpointWriter();
  const processEnvironmentService =
    options.processEnvironmentService ??
    new ProcessEnvironmentService(
      platformStore,
      processAccessService,
      providerAdapter,
      processLiveHub,
      scriptExecutionService,
      checkpointPlanner,
      codeCheckpointWriter,
      env.DEFAULT_ENVIRONMENT_PROVIDER_KIND,
    );
  const processStartService =
    options.processStartService ??
    new ProcessStartService(
      platformStore,
      processAccessService,
      processLiveHub,
      processEnvironmentService,
      env.DEFAULT_ENVIRONMENT_PROVIDER_KIND,
    );
  const processResumeService =
    options.processResumeService ??
    new ProcessResumeService(
      platformStore,
      processAccessService,
      processLiveHub,
      processEnvironmentService,
      env.DEFAULT_ENVIRONMENT_PROVIDER_KIND,
    );
  const processWorkSurfaceService =
    options.processWorkSurfaceService ??
    new DefaultProcessWorkSurfaceService(platformStore, processAccessService);
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('projectAccessService', projectAccessService);
  app.decorate('projectCreateService', projectCreateService);
  app.decorate('projectIndexService', projectIndexService);
  app.decorate('projectShellService', projectShellService);
  app.decorate('processAccessService', processAccessService);
  app.decorate('processModuleRegistry', processModuleRegistry);
  app.decorate('processEnvironmentService', processEnvironmentService);
  app.decorate('processResponseService', processResponseService);
  app.decorate('processRegistrationService', processRegistrationService);
  app.decorate('processResumeService', processResumeService);
  app.decorate('processStartService', processStartService);
  app.decorate('processWorkSurfaceService', processWorkSurfaceService);

  await app.register(cookiesPlugin, {
    secret: env.WORKOS_COOKIE_PASSWORD,
  });
  await app.register(csrfPlugin);
  await app.register(vitePlugin);
  await app.register(websocketPlugin, {
    processLiveHub,
  });
  await app.register(workosAuthPlugin, {
    authSessionService,
    authUserSyncService,
  });
  await app.register(registerAuthRoutes);
  await app.register(registerProjectRoutes);
  await app.register(registerProcessRoutes);

  app.get('/health', async () => {
    return {
      status: 'ok',
      story: 'story-6-live-reconciliation-and-degradation',
    };
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      app.log.warn(
        {
          method: request.method,
          url: request.url,
          actorId: request.actor?.userId ?? null,
          code: error.code,
          statusCode: error.statusCode,
        },
        'Request failed with an application error.',
      );
      return reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
        status: error.statusCode,
      });
    }

    app.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
        actorId: request.actor?.userId ?? null,
      },
      'Unhandled Epic 1 platform error.',
    );
    return reply.code(500).send({
      code: internalServerErrorCode,
      message: 'Unhandled Epic 1 platform error.',
    });
  });

  return app;
}
