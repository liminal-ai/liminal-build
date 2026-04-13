import type {
  CreateProcessRequest,
  CreateProcessResponse,
  CreateProjectRequest,
  ProjectShellResponse,
  ProjectSummary,
} from '../../shared/contracts/index.js';
import {
  createProcessResponseSchema,
  projectShellResponseSchema,
  projectSummarySchema,
  requestErrorSchema,
} from '../../shared/contracts/index.js';
import { ApiRequestError } from './auth-api.js';

async function parseRequestError(response: Response) {
  const body = await response.json().catch(() => null);
  return requestErrorSchema.parse(
    body ?? {
      code: 'PROJECT_NOT_FOUND',
      message: `Request failed with status ${response.status}.`,
      status: response.status,
    },
  );
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await fetch('/api/projects', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return projectSummarySchema.array().parse(await response.json());
}

export async function createProject(_body: CreateProjectRequest): Promise<ProjectShellResponse> {
  throw new Error('Story 1 does not implement project creation yet.');
}

export async function getProjectShell(_args: {
  projectId: string;
  selectedProcessId?: string | null;
}): Promise<ProjectShellResponse> {
  const searchParams = new URLSearchParams();

  if (_args.selectedProcessId !== undefined && _args.selectedProcessId !== null) {
    searchParams.set('processId', _args.selectedProcessId);
  }

  const response = await fetch(
    `/api/projects/${_args.projectId}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`,
    {
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return projectShellResponseSchema.parse(await response.json());
}

export async function createProcess(_args: {
  projectId: string;
  processType: CreateProcessRequest['processType'];
}): Promise<CreateProcessResponse> {
  const response = await fetch(`/api/projects/${_args.projectId}/processes`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      processType: _args.processType,
    }),
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return createProcessResponseSchema.parse(await response.json());
}
