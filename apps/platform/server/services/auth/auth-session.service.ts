import type { User, WorkOS } from '@workos-inc/node';

export const sessionCookieName = 'lb_session';
export const authStateCookieName = 'lb_auth_state';
export const authReturnToCookieName = 'lb_auth_return_to';

export interface AuthenticatedActor {
  userId: string;
  workosUserId: string;
  email: string | null;
  displayName: string | null;
}

export type SessionFailureReason = 'missing_session' | 'invalid_session';

export interface SessionResolution {
  actor: AuthenticatedActor | null;
  reason: SessionFailureReason | null;
}

export interface AuthSessionServiceOptions {
  workosClient: WorkOS;
  clientId: string;
  cookiePassword: string;
  redirectUri: string;
  loginReturnUri: string;
}

function buildDisplayName(user: Pick<User, 'firstName' | 'lastName' | 'email'>): string | null {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  if (name.length > 0) {
    return name;
  }

  return user.email;
}

export class AuthSessionService {
  private readonly workosClient: WorkOS;
  private readonly clientId: string;
  private readonly cookiePassword: string;
  private readonly redirectUri: string;
  private readonly loginReturnUri: string;

  constructor(options: AuthSessionServiceOptions) {
    this.workosClient = options.workosClient;
    this.clientId = options.clientId;
    this.cookiePassword = options.cookiePassword;
    this.redirectUri = options.redirectUri;
    this.loginReturnUri = options.loginReturnUri;
  }

  async resolveSession(sessionData?: string): Promise<SessionResolution> {
    if (sessionData === undefined) {
      return {
        actor: null,
        reason: 'missing_session',
      };
    }

    const result = await this.workosClient.userManagement.authenticateWithSessionCookie({
      sessionData,
      cookiePassword: this.cookiePassword,
    });

    if (!result.authenticated) {
      return {
        actor: null,
        reason:
          result.reason === 'no_session_cookie_provided' ? 'missing_session' : 'invalid_session',
      };
    }

    return {
      actor: {
        userId: result.user.id,
        workosUserId: result.user.id,
        email: result.user.email,
        displayName: buildDisplayName(result.user),
      },
      reason: null,
    };
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    return this.workosClient.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state,
    });
  }

  async authenticateWithCode(args: {
    code: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ actor: AuthenticatedActor; sealedSession: string }> {
    const authentication = await this.workosClient.userManagement.authenticateWithCode({
      clientId: this.clientId,
      code: args.code,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      session: {
        sealSession: true,
        cookiePassword: this.cookiePassword,
      },
    });

    return {
      actor: {
        userId: authentication.user.id,
        workosUserId: authentication.user.id,
        email: authentication.user.email,
        displayName: buildDisplayName(authentication.user),
      },
      sealedSession:
        authentication.sealedSession ??
        (() => {
          throw new Error('WorkOS did not return a sealed session for Story 1 callback auth.');
        })(),
    };
  }

  async getLogoutUrl(args: { sessionData: string; returnTo?: string }): Promise<string> {
    return this.workosClient.userManagement
      .loadSealedSession({
        sessionData: args.sessionData,
        cookiePassword: this.cookiePassword,
      })
      .getLogoutUrl({
        returnTo: args.returnTo ?? this.loginReturnUri,
      });
  }

  getLoginReturnUri(): string {
    return this.loginReturnUri;
  }
}
