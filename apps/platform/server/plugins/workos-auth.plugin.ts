import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../errors/app-error.js';
import {
  type AuthenticatedActor,
  AuthSessionService,
} from '../services/auth/auth-session.service.js';
import { AuthUserSyncService } from '../services/auth/auth-user-sync.service.js';

export interface WorkosAuthPluginOptions {
  authSessionService?: AuthSessionService;
  authUserSyncService?: AuthUserSyncService;
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: AuthenticatedActor | null;
  }

  interface FastifyInstance {
    authSessionService: AuthSessionService;
    authUserSyncService: AuthUserSyncService;
    requireAuthenticatedActor: (request: FastifyRequest) => Promise<AuthenticatedActor>;
  }
}

export const workosAuthPlugin = fp<WorkosAuthPluginOptions>(
  async (app, options) => {
    const authSessionService = options.authSessionService ?? new AuthSessionService();
    const authUserSyncService = options.authUserSyncService ?? new AuthUserSyncService();

    app.decorate('authSessionService', authSessionService);
    app.decorate('authUserSyncService', authUserSyncService);
    app.decorateRequest('actor', null);
    app.decorate('requireAuthenticatedActor', async (request: FastifyRequest) => {
      if (request.actor === null) {
        throw new AppError({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated shell access is not implemented in Story 0.',
          statusCode: 401,
        });
      }

      return request.actor;
    });

    app.addHook('preHandler', async (request) => {
      request.actor = await authSessionService.getActor();

      if (request.actor !== null) {
        await authUserSyncService.syncActor(request.actor);
      }
    });
  },
  {
    name: 'story0-workos-auth-plugin',
  },
);
