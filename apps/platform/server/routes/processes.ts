import type { FastifyInstance } from 'fastify';
import {
  processLiveUpdatesPathnamePattern,
  processResponseApiPathnamePattern,
  processResumeApiPathnamePattern,
  processStartApiPathnamePattern,
  processWorkSurfaceApiPathnamePattern,
  processWorkSurfaceRoutePathnamePattern,
} from '../../shared/contracts/index.js';

export const processRoutePatterns = {
  shell: processWorkSurfaceRoutePathnamePattern,
  bootstrap: processWorkSurfaceApiPathnamePattern,
  start: processStartApiPathnamePattern,
  resume: processResumeApiPathnamePattern,
  respond: processResponseApiPathnamePattern,
  live: processLiveUpdatesPathnamePattern,
} as const;

export async function registerProcessRoutes(_app: FastifyInstance): Promise<void> {
  void processRoutePatterns;
}
