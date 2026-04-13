import type { ProjectSummary } from '../../../shared/contracts/index.js';

export class ProjectIndexService {
  async listAccessibleProjects(): Promise<ProjectSummary[]> {
    return [];
  }
}
