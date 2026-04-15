import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type {
  ArtifactSummary,
  CurrentProcessRequest,
  ProcessHistoryItem,
  ProcessOutputReference,
  ProcessSummary,
  ProjectShellResponse,
  ProjectSummary,
  SideWorkItem,
  SourceAttachmentSummary,
} from '../../../shared/contracts/index.js';

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

export type ProjectCreateResult =
  | {
      kind: 'created';
      project: ProjectSummary;
    }
  | {
      kind: 'name_conflict';
    };

export type ProcessCreateResult = {
  kind: 'created';
  process: ProcessSummary;
};

export interface PlatformStore {
  upsertUserFromWorkOS(args: {
    workosUserId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<StoredPlatformUser>;
  listAccessibleProjects(args: { userId: string }): Promise<ProjectSummary[]>;
  getProjectAccess(args: { userId: string; projectId: string }): Promise<ProjectAccessResult>;
  createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult>;
  createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult>;
  getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null>;
  listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]>;
  listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]>;
  listProjectSourceAttachments(args: { projectId: string }): Promise<SourceAttachmentSummary[]>;
  listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]>;
  getCurrentProcessRequest(args: { processId: string }): Promise<CurrentProcessRequest | null>;
  listProcessOutputs(args: { processId: string }): Promise<ProcessOutputReference[]>;
  listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]>;
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

const createProjectMutation = makeFunctionReference<
  'mutation',
  { ownerUserId: string; name: string },
  ProjectCreateResult
>('projects:createProject');

const createProcessMutation = makeFunctionReference<
  'mutation',
  {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  },
  ProcessCreateResult
>('processes:createProcess');

const listProjectProcessesQuery = makeFunctionReference<
  'query',
  { projectId: string },
  ProcessSummary[]
>('processes:listProjectProcessSummaries');

const getProcessRecordQuery = makeFunctionReference<
  'query',
  { processId: string },
  (ProcessSummary & { projectId: string }) | null
>('processes:getProcessRecord');

const listProjectArtifactsQuery = makeFunctionReference<
  'query',
  { projectId: string },
  ArtifactSummary[]
>('artifacts:listProjectArtifactSummaries');

const listProjectSourceAttachmentsQuery = makeFunctionReference<
  'query',
  { projectId: string },
  SourceAttachmentSummary[]
>('sourceAttachments:listProjectSourceAttachmentSummaries');

const listProcessHistoryItemsQuery = makeFunctionReference<
  'query',
  { processId: string },
  ProcessHistoryItem[]
>('processHistoryItems:listProcessHistoryItems');

const getCurrentProcessRequestQuery = makeFunctionReference<
  'query',
  { processId: string },
  CurrentProcessRequest | null
>('processes:getCurrentProcessRequest');

const listProcessOutputsQuery = makeFunctionReference<
  'query',
  { processId: string },
  ProcessOutputReference[]
>('processOutputs:listProcessOutputs');

const listProcessSideWorkItemsQuery = makeFunctionReference<
  'query',
  { processId: string },
  SideWorkItem[]
>('processSideWorkItems:listProcessSideWorkItems');

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

  async createProject(): Promise<ProjectCreateResult> {
    return {
      kind: 'name_conflict',
    };
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    const now = new Date().toISOString();
    const availableActions: ProcessSummary['availableActions'] = ['open'];

    return {
      kind: 'created',
      process: {
        processId: `process:${args.projectId}:1`,
        displayLabel: args.displayLabel,
        processType: args.processType,
        status: 'draft',
        phaseLabel: 'Draft',
        nextActionLabel: 'Open the process',
        availableActions,
        hasEnvironment: false,
        updatedAt: now,
      },
    };
  }

  async getProcessRecord(): Promise<(ProcessSummary & { projectId: string }) | null> {
    return null;
  }

  async listProjectProcesses(): Promise<ProcessSummary[]> {
    return [];
  }

  async listProjectArtifacts(): Promise<ArtifactSummary[]> {
    return [];
  }

  async listProjectSourceAttachments(): Promise<SourceAttachmentSummary[]> {
    return [];
  }

  async listProcessHistoryItems(): Promise<ProcessHistoryItem[]> {
    return [];
  }

  async getCurrentProcessRequest(): Promise<CurrentProcessRequest | null> {
    return null;
  }

  async listProcessOutputs(): Promise<ProcessOutputReference[]> {
    return [];
  }

  async listProcessSideWorkItems(): Promise<SideWorkItem[]> {
    return [];
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

  async createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult> {
    return this.client.mutation(createProjectMutation, args, {
      skipQueue: true,
    });
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    return this.client.mutation(createProcessMutation, args, {
      skipQueue: true,
    });
  }

  async listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]> {
    return this.client.query(listProjectProcessesQuery, args);
  }

  async getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null> {
    return this.client.query(getProcessRecordQuery, args);
  }

  async listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]> {
    return this.client.query(listProjectArtifactsQuery, args);
  }

  async listProjectSourceAttachments(args: {
    projectId: string;
  }): Promise<SourceAttachmentSummary[]> {
    return this.client.query(listProjectSourceAttachmentsQuery, args);
  }

  async listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]> {
    return this.client.query(listProcessHistoryItemsQuery, args);
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.client.query(getCurrentProcessRequestQuery, args);
  }

  async listProcessOutputs(args: { processId: string }): Promise<ProcessOutputReference[]> {
    return this.client.query(listProcessOutputsQuery, args);
  }

  async listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]> {
    return this.client.query(listProcessSideWorkItemsQuery, args);
  }
}

export class InMemoryPlatformStore implements PlatformStore {
  private readonly usersByWorkosId = new Map<string, StoredPlatformUser>();
  private readonly projectsByUserId = new Map<string, ProjectSummary[]>();
  private readonly accessByProjectId = new Map<string, ProjectAccessResult>();
  private readonly processesByProjectId = new Map<string, ProcessSummary[]>();
  private readonly artifactsByProjectId = new Map<string, ArtifactSummary[]>();
  private readonly sourceAttachmentsByProjectId = new Map<string, SourceAttachmentSummary[]>();
  private readonly processHistoryItemsByProcessId = new Map<string, ProcessHistoryItem[]>();
  private readonly currentRequestsByProcessId = new Map<string, CurrentProcessRequest | null>();
  private readonly processOutputsByProcessId = new Map<string, ProcessOutputReference[]>();
  private readonly processSideWorkItemsByProcessId = new Map<string, SideWorkItem[]>();

  constructor(
    args: {
      users?: StoredPlatformUser[];
      accessibleProjectsByUserId?: Record<string, ProjectSummary[]>;
      projectAccessByProjectId?: Record<string, ProjectAccessResult>;
      processesByProjectId?: Record<string, ProcessSummary[]>;
      artifactsByProjectId?: Record<string, ArtifactSummary[]>;
      sourceAttachmentsByProjectId?: Record<string, SourceAttachmentSummary[]>;
      processHistoryItemsByProcessId?: Record<string, ProcessHistoryItem[]>;
      currentRequestsByProcessId?: Record<string, CurrentProcessRequest | null>;
      processOutputsByProcessId?: Record<string, ProcessOutputReference[]>;
      processSideWorkItemsByProcessId?: Record<string, SideWorkItem[]>;
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

    for (const [projectId, summaries] of Object.entries(args.processesByProjectId ?? {})) {
      this.processesByProjectId.set(projectId, summaries);
    }

    for (const [projectId, summaries] of Object.entries(args.artifactsByProjectId ?? {})) {
      this.artifactsByProjectId.set(projectId, summaries);
    }

    for (const [projectId, summaries] of Object.entries(args.sourceAttachmentsByProjectId ?? {})) {
      this.sourceAttachmentsByProjectId.set(projectId, summaries);
    }

    for (const [processId, items] of Object.entries(args.processHistoryItemsByProcessId ?? {})) {
      this.processHistoryItemsByProcessId.set(processId, items);
    }

    for (const [processId, request] of Object.entries(args.currentRequestsByProcessId ?? {})) {
      this.currentRequestsByProcessId.set(processId, request);
    }

    for (const [processId, outputs] of Object.entries(args.processOutputsByProcessId ?? {})) {
      this.processOutputsByProcessId.set(processId, outputs);
    }

    for (const [processId, items] of Object.entries(args.processSideWorkItemsByProcessId ?? {})) {
      this.processSideWorkItemsByProcessId.set(processId, items);
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

  async createProject(args: { ownerUserId: string; name: string }): Promise<ProjectCreateResult> {
    const existingProjects = this.projectsByUserId.get(args.ownerUserId) ?? [];

    if (
      existingProjects.some(
        (project) => project.role === 'owner' && project.name.trim() === args.name.trim(),
      )
    ) {
      return {
        kind: 'name_conflict',
      };
    }

    const now = new Date().toISOString();
    const project = {
      projectId: `project-${this.accessByProjectId.size + 1}`,
      name: args.name,
      ownerDisplayName:
        this.usersByWorkosId.get(args.ownerUserId.replace(/^user:/, ''))?.displayName ??
        this.usersByWorkosId.get(args.ownerUserId.replace(/^user:/, ''))?.email ??
        null,
      role: 'owner' as const,
      processCount: 0,
      artifactCount: 0,
      sourceAttachmentCount: 0,
      lastUpdatedAt: now,
    };

    this.projectsByUserId.set(args.ownerUserId, [project, ...existingProjects]);
    this.accessByProjectId.set(project.projectId, {
      kind: 'accessible',
      project,
    });

    return {
      kind: 'created',
      project,
    };
  }

  async createProcess(args: {
    projectId: string;
    processType: ProcessSummary['processType'];
    displayLabel: string;
  }): Promise<ProcessCreateResult> {
    const existingProcesses = this.processesByProjectId.get(args.projectId) ?? [];
    const now = new Date().toISOString();
    const availableActions: ProcessSummary['availableActions'] = ['open'];
    const process = {
      processId: `process-${existingProcesses.length + 1}`,
      displayLabel: args.displayLabel,
      processType: args.processType,
      status: 'draft' as const,
      phaseLabel: 'Draft',
      nextActionLabel: 'Open the process',
      availableActions,
      hasEnvironment: false,
      updatedAt: now,
    };

    this.processesByProjectId.set(args.projectId, [process, ...existingProcesses]);
    this.updateProjectSummary(args.projectId, (project) => ({
      ...project,
      processCount: project.processCount + 1,
      lastUpdatedAt: now,
    }));

    return {
      kind: 'created',
      process,
    };
  }

  async getProcessRecord(args: {
    processId: string;
  }): Promise<(ProcessSummary & { projectId: string }) | null> {
    for (const [projectId, processes] of this.processesByProjectId.entries()) {
      const match = processes.find((process) => process.processId === args.processId);

      if (match !== undefined) {
        return {
          ...match,
          projectId,
        };
      }
    }

    return null;
  }

  async listProjectProcesses(args: { projectId: string }): Promise<ProcessSummary[]> {
    return this.processesByProjectId.get(args.projectId) ?? [];
  }

  async listProjectArtifacts(args: { projectId: string }): Promise<ArtifactSummary[]> {
    return this.artifactsByProjectId.get(args.projectId) ?? [];
  }

  async listProjectSourceAttachments(args: {
    projectId: string;
  }): Promise<SourceAttachmentSummary[]> {
    return this.sourceAttachmentsByProjectId.get(args.projectId) ?? [];
  }

  async listProcessHistoryItems(args: { processId: string }): Promise<ProcessHistoryItem[]> {
    return this.processHistoryItemsByProcessId.get(args.processId) ?? [];
  }

  async getCurrentProcessRequest(args: {
    processId: string;
  }): Promise<CurrentProcessRequest | null> {
    return this.currentRequestsByProcessId.get(args.processId) ?? null;
  }

  async listProcessOutputs(args: { processId: string }): Promise<ProcessOutputReference[]> {
    return this.processOutputsByProcessId.get(args.processId) ?? [];
  }

  async listProcessSideWorkItems(args: { processId: string }): Promise<SideWorkItem[]> {
    return this.processSideWorkItemsByProcessId.get(args.processId) ?? [];
  }

  private updateProjectSummary(
    projectId: string,
    update: (project: ProjectSummary) => ProjectSummary,
  ): void {
    for (const [userId, projects] of this.projectsByUserId.entries()) {
      const nextProjects = projects.map((project) =>
        project.projectId === projectId ? update(project) : project,
      );
      this.projectsByUserId.set(userId, nextProjects);
    }

    const directAccess = this.accessByProjectId.get(projectId);
    if (directAccess?.kind === 'accessible') {
      this.accessByProjectId.set(projectId, {
        kind: 'accessible',
        project: update(directAccess.project),
      });
    }
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
