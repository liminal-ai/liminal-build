import { type ParsedRoute, parsedRouteSchema } from '../../shared/contracts/index.js';

export function parseRoute(url: URL): ParsedRoute {
  if (url.pathname === '/projects') {
    return parsedRouteSchema.parse({
      kind: 'project-index',
      projectId: null,
      selectedProcessId: null,
    });
  }

  if (url.pathname.startsWith('/projects/')) {
    const projectId = url.pathname.replace('/projects/', '').trim();

    return parsedRouteSchema.parse({
      kind: 'project-shell',
      projectId,
      selectedProcessId: url.searchParams.get('processId'),
    });
  }

  return parsedRouteSchema.parse({
    kind: 'project-index',
    projectId: null,
    selectedProcessId: null,
  });
}

export function buildRouteHref(route: ParsedRoute): string {
  if (route.kind === 'project-index') {
    return '/projects';
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
