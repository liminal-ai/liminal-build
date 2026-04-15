import type {
  ProcessWorkSurfaceResponse,
  RequestError,
  ResumeProcessResponse,
  StartProcessResponse,
} from '../../shared/contracts/index.js';
import {
  buildProcessResumeApiPath,
  buildProcessStartApiPath,
  buildProcessWorkSurfaceApiPath,
  processWorkSurfaceResponseSchema,
  requestErrorSchema,
  resumeProcessResponseSchema,
  startProcessResponseSchema,
} from '../../shared/contracts/index.js';
import { ApiRequestError } from './auth-api.js';

function buildFallbackRequestError(response: Response): RequestError {
  switch (response.status) {
    case 401:
      return {
        code: 'UNAUTHENTICATED',
        message: 'Authenticated access is required.',
        status: 401,
      };
    case 403:
      return {
        code: 'PROJECT_FORBIDDEN',
        message: 'You do not have access to this process.',
        status: 403,
      };
    case 404:
      return {
        code: 'PROCESS_NOT_FOUND',
        message: 'The requested process could not be found.',
        status: 404,
      };
    case 409:
      return {
        code: 'PROCESS_ACTION_NOT_AVAILABLE',
        message: 'This process action is not available right now.',
        status: 409,
      };
    default:
      return {
        code: 'PROCESS_ACTION_FAILED',
        message:
          'The process action could not be completed right now. Try again or reload the page.',
        status: response.status >= 400 ? response.status : 500,
      };
  }
}

async function parseRequestError(response: Response) {
  const body = await response.json().catch(() => null);
  const parsed = requestErrorSchema.safeParse(body);

  if (parsed.success) {
    return parsed.data;
  }

  return buildFallbackRequestError(response);
}

export async function getProcessWorkSurface(args: {
  projectId: string;
  processId: string;
}): Promise<ProcessWorkSurfaceResponse> {
  const response = await fetch(
    buildProcessWorkSurfaceApiPath({
      projectId: args.projectId,
      processId: args.processId,
    }),
    {
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return processWorkSurfaceResponseSchema.parse(await response.json());
}

export async function startProcess(args: {
  projectId: string;
  processId: string;
}): Promise<StartProcessResponse> {
  const response = await fetch(
    buildProcessStartApiPath({
      projectId: args.projectId,
      processId: args.processId,
    }),
    {
      method: 'POST',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return startProcessResponseSchema.parse(await response.json());
}

export async function resumeProcess(args: {
  projectId: string;
  processId: string;
}): Promise<ResumeProcessResponse> {
  const response = await fetch(
    buildProcessResumeApiPath({
      projectId: args.projectId,
      processId: args.processId,
    }),
    {
      method: 'POST',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new ApiRequestError(await parseRequestError(response));
  }

  return resumeProcessResponseSchema.parse(await response.json());
}
