import {
  archiveDerivedViewRefreshRequestSchema,
  archiveDerivedViewPaginationQuerySchema,
  archivePageSchema,
  archivePaginationQuerySchema,
  archiveRouteParamsSchema,
  archiveTurnPageSchema,
  archiveTurnPaginationQuerySchema,
  derivedArchiveViewListResponseSchema,
  derivedArchiveViewRefreshResponseSchema,
  requestErrorSchema,
} from '../../shared/contracts/index.js';

export const getProcessArchiveRouteSchema = {
  params: archiveRouteParamsSchema,
  querystring: archivePaginationQuerySchema,
  response: {
    200: archivePageSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    422: requestErrorSchema,
  },
} as const;

export const getProcessArchiveTurnsRouteSchema = {
  params: archiveRouteParamsSchema,
  querystring: archiveTurnPaginationQuerySchema,
  response: {
    200: archiveTurnPageSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    422: requestErrorSchema,
  },
} as const;

export const getDerivedArchiveViewsRouteSchema = {
  params: archiveRouteParamsSchema,
  querystring: archiveDerivedViewPaginationQuerySchema,
  response: {
    200: derivedArchiveViewListResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    422: requestErrorSchema,
  },
} as const;

export const postRefreshDerivedArchiveViewsRouteSchema = {
  params: archiveRouteParamsSchema,
  body: archiveDerivedViewRefreshRequestSchema,
  response: {
    200: derivedArchiveViewRefreshResponseSchema,
    401: requestErrorSchema,
    403: requestErrorSchema,
    404: requestErrorSchema,
    409: requestErrorSchema,
    422: requestErrorSchema,
  },
} as const;
