import { WorkOS } from '@workos-inc/node';
import Fastify from 'fastify';
import type { FastifyServerOptions } from 'fastify';
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
import { registerReviewRoutes } from './routes/review.js';
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
  type CodeCheckpointWriter,
  OctokitCodeCheckpointWriter,
} from './services/processes/environment/code-checkpoint-writer.js';
import { DaytonaProviderAdapter } from './services/processes/environment/daytona-provider-adapter.js';
import { LocalProviderAdapter } from './services/processes/environment/local-provider-adapter.js';
import { ProcessEnvironmentService } from './services/processes/environment/process-environment.service.js';
import {
  DefaultProviderAdapterRegistry,
  type ProviderAdapterRegistry,
  SingleAdapterRegistry,
} from './services/processes/environment/provider-adapter-registry.js';
import type { ProviderAdapter } from './services/processes/environment/provider-adapter.js';
import { ScriptExecutionService } from './services/processes/environment/script-execution.service.js';
import { ProcessResponseService } from './services/processes/process-response.service.js';
import { ProcessResumeService } from './services/processes/process-resume.service.js';
import { ProcessStartService } from './services/processes/process-start.service.js';
import {
  DefaultProcessWorkSurfaceService,
  type ProcessWorkSurfaceService,
} from './services/processes/process-work-surface.service.js';
import { MarkdownRendererService } from './services/rendering/markdown-renderer.service.js';
import { DefaultExportService, type ExportService } from './services/review/export.service.js';
import { HmacExportUrlSigner } from './services/review/export-url-signing.js';
import {
  DefaultArtifactReviewService,
  type ArtifactReviewService,
} from './services/review/artifact-review.service.js';
import {
  DefaultPackageReviewService,
  type PackageReviewService,
} from './services/review/package-review.service.js';
import {
  DefaultReviewWorkspaceService,
  type ReviewWorkspaceService,
} from './services/review/review-workspace.service.js';
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
  logger?: FastifyServerOptions['logger'];
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
  providerAdapterRegistry?: ProviderAdapterRegistry;
  scriptExecutionService?: ScriptExecutionService;
  checkpointPlanner?: CheckpointPlanner;
  codeCheckpointWriter?: CodeCheckpointWriter;
  processEnvironmentService?: ProcessEnvironmentService;
  processResponseService?: ProcessResponseService;
  processRegistrationService?: ProcessRegistrationService;
  processResumeService?: ProcessResumeService;
  exportService?: ExportService;
  artifactReviewService?: ArtifactReviewService;
  packageReviewService?: PackageReviewService;
  reviewWorkspaceService?: ReviewWorkspaceService;
  processStartService?: ProcessStartService;
  processWorkSurfaceService?: ProcessWorkSurfaceService;
}

const defaultLogger: NonNullable<FastifyServerOptions['logger']> = {
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.url',
      'token',
      '*.token',
      'signed_url',
      '*.signed_url',
      'signedUrl',
      '*.signedUrl',
      'EXPORT_SIGNING_SECRET',
      '*.EXPORT_SIGNING_SECRET',
    ],
    censor: '[REDACTED]',
  },
};

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
    exportService: ExportService;
    artifactReviewService: ArtifactReviewService;
    packageReviewService: PackageReviewService;
    reviewWorkspaceService: ReviewWorkspaceService;
    processStartService: ProcessStartService;
    processWorkSurfaceService: ProcessWorkSurfaceService;
  }
}

export async function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? story0PlaceholderEnv;
  const app = Fastify({
    logger: options.logger ?? defaultLogger,
  });
  // ConvexPlatformStore uses the shared Convex API key when calling the
  // service-only artifact wrappers. This keeps runtime auth scoped to the
  // specific server-to-Convex seams Fastify needs.
  const platformStore =
    options.platformStore ??
    (hasLiveConvexConfig(env)
      ? new ConvexPlatformStore(env.CONVEX_URL, env.CONVEX_API_KEY)
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
    new ProcessRegistrationService(
      platformStore,
      processDisplayLabelService,
      projectAccessService,
      env.DEFAULT_ENVIRONMENT_PROVIDER_KIND,
    );
  const processResponseService =
    options.processResponseService ??
    new ProcessResponseService(platformStore, processAccessService, processLiveHub);
  // Test seam: when a single `providerAdapter` is supplied, the registry
  // resolves every providerKind to that adapter so existing tests that pass
  // `FailingProviderAdapter` etc. continue to work. Production wires real
  // adapters (Local + Daytona skeleton) via `DefaultProviderAdapterRegistry`.
  const providerAdapterRegistry: ProviderAdapterRegistry =
    options.providerAdapterRegistry ??
    (options.providerAdapter !== undefined
      ? new SingleAdapterRegistry(options.providerAdapter)
      : new DefaultProviderAdapterRegistry([
          new LocalProviderAdapter(platformStore, {
            workspaceRoot: env.LOCAL_PROVIDER_WORKSPACE_ROOT ?? undefined,
          }),
          new DaytonaProviderAdapter(platformStore, {
            apiKey: env.DAYTONA_API_KEY,
            apiUrl: env.DAYTONA_API_URL,
            target: env.DAYTONA_TARGET,
            gitHubToken: env.GITHUB_TOKEN,
          }),
        ]));
  const scriptExecutionService =
    options.scriptExecutionService ?? new ScriptExecutionService(providerAdapterRegistry);
  const checkpointPlanner = options.checkpointPlanner ?? new CheckpointPlanner();
  // Test seam: when `options.codeCheckpointWriter` is supplied (e.g.,
  // `StubCodeCheckpointWriter` or `FailingCodeCheckpointWriter`) tests drive
  // the orchestrator without touching real GitHub. Production omits the
  // option and constructs the real Octokit-backed writer; if `GITHUB_TOKEN`
  // is missing or empty the writer's constructor throws so we fail loud
  // rather than silently falling back to the stub.
  const codeCheckpointWriter =
    options.codeCheckpointWriter ?? new OctokitCodeCheckpointWriter({ token: env.GITHUB_TOKEN });
  const processEnvironmentService =
    options.processEnvironmentService ??
    new ProcessEnvironmentService(
      platformStore,
      processAccessService,
      providerAdapterRegistry,
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
  const markdownRenderer = await MarkdownRendererService.create({ logger: app.log });
  const exportUrlSigner = new HmacExportUrlSigner(env.REVIEW_EXPORT_HMAC_SECRET);
  const exportService =
    options.exportService ??
    new DefaultExportService(platformStore, exportUrlSigner, env.APP_ORIGIN);
  const artifactReviewService =
    options.artifactReviewService ??
    new DefaultArtifactReviewService(platformStore, markdownRenderer, app.log);
  const packageReviewService =
    options.packageReviewService ??
    new DefaultPackageReviewService(platformStore, artifactReviewService, app.log);
  const reviewWorkspaceService =
    options.reviewWorkspaceService ??
    new DefaultReviewWorkspaceService(
      platformStore,
      processAccessService,
      artifactReviewService,
      packageReviewService,
    );
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
  app.decorate('exportService', exportService);
  app.decorate('artifactReviewService', artifactReviewService);
  app.decorate('packageReviewService', packageReviewService);
  app.decorate('reviewWorkspaceService', reviewWorkspaceService);
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
  await app.register(registerReviewRoutes);

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
