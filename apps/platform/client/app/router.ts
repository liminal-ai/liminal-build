import {
  buildProcessWorkSurfacePath,
  type ParsedRoute,
  parsedRouteSchema,
} from '../../shared/contracts/index.js';

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
}

export function parseRoute(url: URL): ParsedRoute {
  const pathname = normalizePathname(url.pathname);

  if (pathname === '/projects') {
    return parsedRouteSchema.parse({
      kind: 'project-index',
      projectId: null,
      selectedProcessId: null,
      processId: null,
    });
  }

  const processMatch = pathname.match(/^\/projects\/([^/]+)\/processes\/([^/]+)$/);

  if (processMatch !== null) {
    const [, projectId, processId] = processMatch;

    return parsedRouteSchema.parse({
      kind: 'process-work-surface',
      projectId,
      selectedProcessId: null,
      processId,
    });
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);

  if (projectMatch !== null) {
    const [, projectId] = projectMatch;

    return parsedRouteSchema.parse({
      kind: 'project-shell',
      projectId,
      selectedProcessId: url.searchParams.get('processId'),
      processId: null,
    });
  }

  return parsedRouteSchema.parse({
    kind: 'project-index',
    projectId: null,
    selectedProcessId: null,
    processId: null,
  });
}

export function buildRouteHref(route: ParsedRoute): string {
  if (route.kind === 'project-index') {
    return '/projects';
  }

  if (route.kind === 'process-work-surface') {
    return buildProcessWorkSurfacePath({
      projectId: route.projectId ?? '',
      processId: route.processId ?? '',
    });
  }

  const url = new URL(`/projects/${route.projectId ?? ''}`, 'http://story0.local');

  if (route.selectedProcessId !== null) {
    url.searchParams.set('processId', route.selectedProcessId);
  }

  return `${url.pathname}${url.search}`;
}

export function navigateTo(
  route: ParsedRoute,
  options: { replace?: boolean } = {},
  targetWindow: Window & typeof globalThis = window,
): void {
  const nextHref = buildRouteHref(route);

  if (options.replace === true) {
    targetWindow.history.replaceState({}, '', nextHref);
    return;
  }

  targetWindow.history.pushState({}, '', nextHref);
}
