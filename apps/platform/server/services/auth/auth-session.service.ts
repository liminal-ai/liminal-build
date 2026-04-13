import type { WorkOS } from '@workos-inc/node';

export interface AuthenticatedActor {
  userId: string;
  workosUserId: string;
  email: string | null;
  displayName: string | null;
}

export class AuthSessionService {
  constructor(private readonly workosClient: WorkOS | null = null) {}

  async getActor(): Promise<AuthenticatedActor | null> {
    void this.workosClient;
    return null;
  }
}
