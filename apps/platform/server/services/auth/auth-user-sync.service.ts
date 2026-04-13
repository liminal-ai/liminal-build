import type { AuthenticatedActor } from './auth-session.service.js';

export class AuthUserSyncService {
  async syncActor(actor: AuthenticatedActor): Promise<void> {
    void actor;
  }
}
