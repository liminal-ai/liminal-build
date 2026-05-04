import type {
  CreateSourceAttachmentRequest,
  CreateProcessRequest,
  CreateProcessResponse,
  CreateProjectRequest,
  DetachSourceAttachmentResponse,
  ProjectShellResponse,
  RefreshSourceAttachmentResponse,
  ProjectSummary,
  SourceAttachmentSummary,
  UpdateSourceAttachmentRequest,
} from '../../shared/contracts/index.js';
import {
  createSourceAttachmentRequestSchema,
  createProcessResponseSchema,
  detachSourceAttachmentResponseSchema,
  projectShellResponseSchema,
  projectSummarySchema,
  refreshSourceAttachmentResponseSchema,
  requestErrorSchema,
  sourceAttachmentSummarySchema,
  updateSourceAttachmentRequestSchema,
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
  const response = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: _body.name,
    }),
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return projectShellResponseSchema.parse(await response.json());
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

export async function attachProjectSource(args: {
  projectId: string;
  input: CreateSourceAttachmentRequest;
}): Promise<SourceAttachmentSummary> {
  const body = createSourceAttachmentRequestSchema.parse(args.input);
  const response = await fetch(`/api/projects/${args.projectId}/source-attachments`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return sourceAttachmentSummarySchema.parse(await response.json());
}

export async function updateSourceAttachment(args: {
  projectId: string;
  sourceAttachmentId: string;
  input: UpdateSourceAttachmentRequest;
}): Promise<SourceAttachmentSummary> {
  const body = updateSourceAttachmentRequestSchema.parse(args.input);
  const response = await fetch(
    `/api/projects/${args.projectId}/source-attachments/${args.sourceAttachmentId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return sourceAttachmentSummarySchema.parse(await response.json());
}

export async function refreshSourceAttachment(args: {
  projectId: string;
  sourceAttachmentId: string;
}): Promise<RefreshSourceAttachmentResponse> {
  const response = await fetch(
    `/api/projects/${args.projectId}/source-attachments/${args.sourceAttachmentId}/refresh`,
    {
      method: 'POST',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return refreshSourceAttachmentResponseSchema.parse(await response.json());
}

export async function detachSourceAttachment(args: {
  projectId: string;
  sourceAttachmentId: string;
}): Promise<DetachSourceAttachmentResponse> {
  const response = await fetch(
    `/api/projects/${args.projectId}/source-attachments/${args.sourceAttachmentId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return detachSourceAttachmentResponseSchema.parse(await response.json());
}
