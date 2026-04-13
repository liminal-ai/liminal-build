import type { ProjectSummary } from '../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import type { PlatformStore } from './platform-store.js';

export class ProjectIndexService {
  constructor(private readonly platformStore: PlatformStore) {}

  async listAccessibleProjects(actor: AuthenticatedActor): Promise<ProjectSummary[]> {
    const projects = await this.platformStore.listAccessibleProjects({
      userId: actor.userId,
    });

    return [...projects].sort((left, right) =>
      right.lastUpdatedAt.localeCompare(left.lastUpdatedAt),
    );
  }
}
