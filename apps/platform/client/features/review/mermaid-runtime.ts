import createDOMPurify from 'dompurify';
import mermaid from 'mermaid';

let initializedThemeId: string | null = null;
let renderCounter = 0;
let domPurify: ReturnType<typeof createDOMPurify> | null = null;

function resolveMermaidTheme(themeId: string): 'dark' | 'default' {
  return themeId === 'dark' ? 'dark' : 'default';
}

function getDomPurify(): ReturnType<typeof createDOMPurify> {
  if (domPurify === null) {
    domPurify = createDOMPurify(window);
  }

  return domPurify;
}

export function initializeMermaid(themeId: string): void {
  if (initializedThemeId === themeId) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    logLevel: 'fatal',
    theme: resolveMermaidTheme(themeId),
    flowchart: {
      htmlLabels: false,
    },
  });
  initializedThemeId = themeId;
}

export function sanitizeMermaidSvg(svg: string): string {
  return getDomPurify().sanitize(svg, {
    USE_PROFILES: {
      svg: true,
      svgFilters: true,
    },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['style', 'onload', 'onerror', 'onmouseover', 'onclick'],
  });
}

export async function renderMermaid(args: {
  source: string;
  themeId: string;
}): Promise<{ svg: string } | { error: string }> {
  initializeMermaid(args.themeId);

  try {
    renderCounter += 1;
    const { svg } = await mermaid.render(`mermaid-runtime-${renderCounter}`, args.source);

    return {
      svg: sanitizeMermaidSvg(svg),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Diagram rendering failed.',
    };
  }
}
