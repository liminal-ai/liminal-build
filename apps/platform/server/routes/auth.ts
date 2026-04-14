import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  authMeRouteSchema,
  callbackRouteSchema,
  loginRouteSchema,
  logoutRouteSchema,
} from '../schemas/auth.js';
import {
  authReturnToCookieName,
  authStateCookieName,
  sessionCookieName,
} from '../services/auth/auth-session.service.js';

function normalizeReturnTo(value: string | undefined, fallback: string): string {
  if (value === undefined || value.length === 0) {
    return fallback;
  }

  if (!value.startsWith('/')) {
    return fallback;
  }

  return value;
}

function authCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecure,
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/auth/login', { schema: loginRouteSchema }, async (request, reply) => {
    const isSecure = request.protocol === 'https';
    const state = crypto.randomUUID();
    const fallbackReturnTo = new URL(app.authSessionService.getLoginReturnUri()).pathname;
    const returnTo = normalizeReturnTo(request.query.returnTo, fallbackReturnTo);
    const url = await app.authSessionService.getAuthorizationUrl(state);

    app.log.info(
      {
        method: request.method,
        url: request.url,
        returnTo,
      },
      'Starting WorkOS login redirect.',
    );

    reply.setCookie(authStateCookieName, state, {
      ...authCookieOptions(isSecure),
      signed: true,
    });
    reply.setCookie(authReturnToCookieName, returnTo, {
      ...authCookieOptions(isSecure),
      signed: true,
    });

    return reply.redirect(url);
  });

  typedApp.get('/auth/callback', { schema: callbackRouteSchema }, async (request, reply) => {
    const signedStateCookie = request.cookies[authStateCookieName];
    const signedReturnToCookie = request.cookies[authReturnToCookieName];
    const stateCookie = signedStateCookie
      ? request.unsignCookie(signedStateCookie)
      : { valid: false, value: undefined };
    const returnToCookie = signedReturnToCookie
      ? request.unsignCookie(signedReturnToCookie)
      : { valid: false, value: undefined };
    const fallbackReturnTo = new URL(app.authSessionService.getLoginReturnUri()).pathname;
    const returnTo = normalizeReturnTo(
      returnToCookie.valid ? returnToCookie.value : undefined,
      fallbackReturnTo,
    );

    reply.clearCookie(authStateCookieName, { path: '/' });
    reply.clearCookie(authReturnToCookieName, { path: '/' });

    if (request.query.error !== undefined) {
      app.log.warn(
        {
          method: request.method,
          url: request.url,
          error: request.query.error,
        },
        'WorkOS callback returned an error.',
      );
      return reply
        .code(400)
        .type('text/plain')
        .send(`WorkOS callback error: ${request.query.error}`);
    }

    if (
      request.query.code === undefined ||
      request.query.state === undefined ||
      !stateCookie.valid ||
      stateCookie.value !== request.query.state
    ) {
      app.log.warn(
        {
          method: request.method,
          url: request.url,
          hasCode: request.query.code !== undefined,
          hasState: request.query.state !== undefined,
        },
        'Rejected invalid authentication callback state.',
      );
      return reply
        .code(400)
        .type('text/plain')
        .send('Invalid authentication callback state or missing authorization code.');
    }

    const authentication = await app.authSessionService.authenticateWithCode({
      code: request.query.code,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    await app.authUserSyncService.syncActor(authentication.actor);
    const isSecure = request.protocol === 'https';

    reply.setCookie(sessionCookieName, authentication.sealedSession, {
      ...authCookieOptions(isSecure),
    });

    app.log.info(
      {
        method: request.method,
        url: request.url,
        actorId: authentication.actor.userId,
        returnTo,
      },
      'Completed authentication callback and established session.',
    );

    return reply.redirect(returnTo);
  });

  typedApp.get('/auth/me', { schema: authMeRouteSchema }, async (request, reply) => {
    if (request.actor === null) {
      if (request.authFailureReason === 'invalid_session') {
        reply.clearCookie(sessionCookieName, { path: '/' });
      }

      app.log.warn(
        {
          method: request.method,
          url: request.url,
          authFailureReason: request.authFailureReason,
        },
        'Authenticated user lookup failed.',
      );

      return reply.code(401).send({
        code: 'UNAUTHENTICATED',
        message: 'No valid authenticated session is available.',
        status: 401,
      });
    }

    return reply.code(200).send({
      user: {
        id: request.actor.userId,
        email: request.actor.email,
        displayName: request.actor.displayName,
      },
    });
  });

  typedApp.post(
    '/auth/logout',
    {
      schema: logoutRouteSchema,
      onRequest: [app.csrfProtection],
    },
    async (request, reply) => {
      app.log.info(
        {
          method: request.method,
          url: request.url,
          actorId: request.actor?.userId ?? null,
        },
        'Sign-out requested.',
      );
      const logoutUrl =
        request.cookies[sessionCookieName] === undefined
          ? app.authSessionService.getLoginReturnUri()
          : await app.authSessionService.getLogoutUrl({
              sessionData: request.cookies[sessionCookieName],
            });
      reply.clearCookie(sessionCookieName, { path: '/' });
      reply.clearCookie(authStateCookieName, { path: '/' });
      reply.clearCookie(authReturnToCookieName, { path: '/' });

      app.log.info(
        {
          method: request.method,
          url: request.url,
          actorId: request.actor?.userId ?? null,
          redirectUrl: logoutUrl,
        },
        'Sign-out completed.',
      );

      return reply.code(200).send({
        redirectUrl: logoutUrl,
      });
    },
  );
}
