import type { AuthenticatedUser } from '../../shared/contracts/index.js';

function unsupportedApi(message: string): never {
  throw new Error(`Story 0 scaffold: ${message}`);
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  unsupportedApi('getAuthenticatedUser() is not implemented yet.');
}

export async function signOut(_args: { csrfToken: string }): Promise<void> {
  unsupportedApi('signOut() is not implemented yet.');
}
