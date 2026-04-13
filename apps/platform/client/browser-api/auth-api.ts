import {
  type AuthenticatedUser,
  authenticatedUserResponseSchema,
  logoutResponseSchema,
  type LogoutResponse,
  type RequestError,
  requestErrorSchema,
} from '../../shared/contracts/index.js';

export class ApiRequestError extends Error {
  readonly payload: RequestError;

  constructor(payload: RequestError) {
    super(payload.message);
    this.payload = payload;
  }
}

async function parseRequestError(response: Response): Promise<RequestError> {
  const body = await response.json().catch(() => null);
  const fallback = {
    code: 'UNAUTHENTICATED',
    message: `Request failed with status ${response.status}.`,
    status: response.status,
  };

  return requestErrorSchema.parse(body ?? fallback);
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const response = await fetch('/auth/me', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  const payload = authenticatedUserResponseSchema.parse(await response.json());
  return payload.user;
}

export async function signOut(args: { csrfToken: string }): Promise<LogoutResponse> {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': args.csrfToken,
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return logoutResponseSchema.parse(await response.json());
}
