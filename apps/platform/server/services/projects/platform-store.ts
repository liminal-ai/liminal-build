import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { ProjectShellResponse, ProjectSummary } from '../../../shared/contracts/index.js';

export interface StoredPlatformUser {
  userId: string;
  workosUserId: string;
  email: string | null;
  displayName: string | null;
}

export type ProjectAccessResult =
  | {
      kind: 'accessible';
      project: ProjectSummary;
    }
  | {
      kind: 'forbidden';
    }
  | {
      kind: 'not_found';
    };

export interface PlatformStore {
  upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser>;
  listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]>;
  getProjectAccess(args: { userId: string; projectId: string }): Promise<ProjectAccessResult>;
}

const upsertUserMutation = makeFunctionReference<
  'mutation',
  {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  },
  StoredPlatformUser
>('users:upsertUserFromWorkOS');

const listAccessibleProjectsQuery = makeFunctionReference<
  'query',
  { userId: string },
  ProjectSummary[]
>('projects:listAccessibleProjectSummaries');

const getProjectAccessQuery = makeFunctionReference<
  'query',
  { userId: string; projectId: string },
  ProjectAccessResult
>('projects:getProjectAccess');

export class NullPlatformStore implements PlatformStore {
  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    return {
      userId: args.workosUserId,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
  }

  async listAccessibleProjects(): Promise<ProjectSummary[]> {
    return [];
  }

  async getProjectAccess(): Promise<ProjectAccessResult> {
    return {
      kind: 'not_found',
    };
  }
}

export class ConvexPlatformStore implements PlatformStore {
  private readonly client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    return this.client.mutation(upsertUserMutation, args, {
      skipQueue: true,
    });
  }

  async listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]> {
    return this.client.query(listAccessibleProjectsQuery, args);
  }

  async getProjectAccess(args: {
    userId: string;
    projectId: string;
  }): Promise<ProjectAccessResult> {
    return this.client.query(getProjectAccessQuery, args);
  }
}

export class InMemoryPlatformStore implements PlatformStore {
  private readonly usersByWorkosId = new Map<string, StoredPlatformUser>();
  private readonly projectsByUserId = new Map<string, ProjectSummary[]>();
  private readonly accessByProjectId = new Map<string, ProjectAccessResult>();

  constructor(
    args: {
      users?: StoredPlatformUser[];
      accessibleProjectsByUserId?: Record<string, ProjectSummary[]>;
      projectAccessByProjectId?: Record<string, ProjectAccessResult>;
    } = {},
  ) {
    for (const user of args.users ?? []) {
      this.usersByWorkosId.set(user.workosUserId, user);
    }

    for (const [userId, projects] of Object.entries(args.accessibleProjectsByUserId ?? {})) {
      this.projectsByUserId.set(userId, projects);
    }

    for (const [projectId, result] of Object.entries(args.projectAccessByProjectId ?? {})) {
      this.accessByProjectId.set(projectId, result);
    }
  }

  async upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser> {
    const existing = this.usersByWorkosId.get(args.workosUserId);

    if (existing !== undefined) {
      const nextUser = {
        ...existing,
        email: args.email,
        displayName: args.displayName,
      };
      this.usersByWorkosId.set(args.workosUserId, nextUser);
      return nextUser;
    }

    const nextUser = {
      userId: `user:${args.workosUserId}`,
      workosUserId: args.workosUserId,
      email: args.email,
      displayName: args.displayName,
    };
    this.usersByWorkosId.set(args.workosUserId, nextUser);

    return nextUser;
  }

  async listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]> {
    return this.projectsByUserId.get(args.userId) ?? [];
  }

  async getProjectAccess(args: {
    userId: string;
    projectId: string;
  }): Promise<ProjectAccessResult> {
    const direct = this.accessByProjectId.get(args.projectId);
    if (direct !== undefined) {
      return direct;
    }

    const accessibleProjects = this.projectsByUserId.get(args.userId) ?? [];
    const match = accessibleProjects.find((project) => project.projectId === args.projectId);

    if (match !== undefined) {
      return {
        kind: 'accessible',
        project: match,
      };
    }

    return {
      kind: 'not_found',
    };
  }
}

export function buildEmptyProjectShellResponse(project: ProjectSummary): ProjectShellResponse {
  return {
    project,
    processes: {
      status: 'empty',
      items: [],
    },
    artifacts: {
      status: 'empty',
      items: [],
    },
    sourceAttachments: {
      status: 'empty',
      items: [],
    },
  };
}
