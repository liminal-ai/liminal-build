import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../errors/app-error.js';
import {
  type AuthenticatedActor,
  type AuthSessionService,
  type SessionFailureReason,
  sessionCookieName,
} from '../services/auth/auth-session.service.js';
import type { AuthUserSyncService } from '../services/auth/auth-user-sync.service.js';

export interface WorkosAuthPluginOptions {
  authSessionService?: AuthSessionService;
  authUserSyncService?: AuthUserSyncService;
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: AuthenticatedActor | null;
    authFailureReason: SessionFailureReason | null;
  }

  interface FastifyInstance {
    authSessionService: AuthSessionService;
    authUserSyncService: AuthUserSyncService;
    requireAuthenticatedActor: (request: FastifyRequest) => Promise<AuthenticatedActor>;
  }
}

export const workosAuthPlugin = fp<WorkosAuthPluginOptions>(
  async (app, options) => {
    const authSessionService = options.authSessionService;
    const authUserSyncService = options.authUserSyncService;

    if (authSessionService === undefined || authUserSyncService === undefined) {
      throw new Error('workosAuthPlugin requires fully constructed auth services.');
    }

    app.decorate('authSessionService', authSessionService);
    app.decorate('authUserSyncService', authUserSyncService);
    app.decorateRequest('actor', null);
    app.decorateRequest('authFailureReason', null);
    app.decorate('requireAuthenticatedActor', async (request: FastifyRequest) => {
      if (request.actor === null) {
        throw new AppError({
          code: 'UNAUTHENTICATED',
          message: 'Authenticated access is required.',
          statusCode: 401,
        });
      }

      return request.actor;
    });

    app.addHook('preHandler', async (request) => {
      const resolution = await authSessionService.resolveSession(
        request.cookies[sessionCookieName],
      );
      request.actor = resolution.actor;
      request.authFailureReason = resolution.reason;

      if (request.actor !== null) {
        request.actor = await authUserSyncService.syncActor(request.actor);
      }
    });
  },
  {
    name: 'story1-workos-auth-plugin',
  },
);
