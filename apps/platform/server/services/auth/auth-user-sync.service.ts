import type { PlatformStore } from '../projects/platform-store.js';
import type { AuthenticatedActor } from './auth-session.service.js';

export class AuthUserSyncService {
  constructor(private readonly platformStore: PlatformStore) {}

  async syncActor(actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    const syncedUser = await this.platformStore.upsertUserFromWorkOS({
      workosUserId: actor.workosUserId,
      email: actor.email,
      displayName: actor.displayName,
    });

    return {
      userId: syncedUser.userId,
      workosUserId: syncedUser.workosUserId,
      email: syncedUser.email,
      displayName: syncedUser.displayName,
    };
  }
}
