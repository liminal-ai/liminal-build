import type {
  CreateProcessRequest,
  CreateProcessResponse,
  CreateProjectRequest,
  ProjectShellResponse,
  ProjectSummary,
} from '../../shared/contracts/index.js';

function unsupportedApi(message: string): never {
  throw new Error(`Story 0 scaffold: ${message}`);
}

export async function listProjects(): Promise<ProjectSummary[]> {
  unsupportedApi('listProjects() is not implemented yet.');
}

export async function createProject(_body: CreateProjectRequest): Promise<ProjectShellResponse> {
  unsupportedApi('createProject() is not implemented yet.');
}

export async function getProjectShell(_args: {
  projectId: string;
  selectedProcessId?: string | null;
}): Promise<ProjectShellResponse> {
  unsupportedApi('getProjectShell() is not implemented yet.');
}

export async function createProcess(_args: {
  projectId: string;
  processType: CreateProcessRequest['processType'];
}): Promise<CreateProcessResponse> {
  unsupportedApi('createProcess() is not implemented yet.');
}
