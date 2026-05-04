import {
  createSourceAttachmentRequestSchema,
  detachSourceAttachmentResponseSchema,
  listProcessSourceProvenanceResponseSchema,
  refreshSourceAttachmentResponseSchema,
  requestErrorSchema,
  sourceAttachmentSummarySchema,
  sourceAttachmentRouteParamsSchema,
  processSourceAttachmentsRouteParamsSchema,
  projectSourceAttachmentsRouteParamsSchema,
  updateSourceAttachmentRequestSchema,
} from '../../shared/contracts/index.js';

export const createProjectSourceAttachmentRouteSchema = {
  params: projectSourceAttachmentsRouteParamsSchema,
  body: createSourceAttachmentRequestSchema,
  response: {
    201: sourceAttachmentSummarySchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const createProcessSourceAttachmentRouteSchema = {
  params: processSourceAttachmentsRouteParamsSchema,
  body: createSourceAttachmentRequestSchema,
  response: {
    201: sourceAttachmentSummarySchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const updateSourceAttachmentRouteSchema = {
  params: sourceAttachmentRouteParamsSchema,
  body: updateSourceAttachmentRequestSchema,
  response: {
    200: sourceAttachmentSummarySchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const refreshSourceAttachmentRouteSchema = {
  params: sourceAttachmentRouteParamsSchema,
  response: {
    200: refreshSourceAttachmentResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    503: requestErrorSchema,
  },
} as const;

export const detachSourceAttachmentRouteSchema = {
  params: sourceAttachmentRouteParamsSchema,
  response: {
    200: detachSourceAttachmentResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;

export const listProcessSourceProvenanceRouteSchema = {
  params: processSourceAttachmentsRouteParamsSchema,
  response: {
    200: listProcessSourceProvenanceResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
  },
} as const;
