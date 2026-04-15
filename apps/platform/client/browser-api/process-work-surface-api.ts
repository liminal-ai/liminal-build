import type { ProcessWorkSurfaceResponse } from '../../shared/contracts/index.js';
import {
  buildProcessWorkSurfaceApiPath,
  processWorkSurfaceResponseSchema,
  requestErrorSchema,
} from '../../shared/contracts/index.js';
import { ApiRequestError } from './auth-api.js';

async function parseRequestError(response: Response) {
  const body = await response.json().catch(() => null);
  return requestErrorSchema.parse(
    body ?? {
      code: 'PROCESS_NOT_FOUND',
      message: `Request failed with status ${response.status}.`,
      status: response.status,
    },
  );
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
