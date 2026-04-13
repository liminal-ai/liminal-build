import type { ProjectShellResponse } from '../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from './platform-store.js';
import { buildEmptyProjectShellResponse } from './platform-store.js';

export class ProjectShellService {
  constructor(private readonly platformStore: PlatformStore) {}

  async getShell(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ProjectShellResponse> {
    const access = await this.platformStore.getProjectAccess({
      userId: args.actor.userId,
      projectId: args.projectId,
    });

    if (access.kind !== 'accessible') {
      throw new Error('Project shell access must be validated before reading shell state.');
    }

    return buildEmptyProjectShellResponse(access.project);
  }
}
