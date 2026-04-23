const DEFAULT_MAX_ENTRIES = 50;

function createCacheKey(source: string, themeId: string): string {
  return `${themeId}:${source}`;
}

class MermaidCache {
  private readonly entries = new Map<string, string>();

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  get(source: string, themeId: string): string | null {
    const key = createCacheKey(source, themeId);
    const value = this.entries.get(key);

    if (value === undefined) {
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(source: string, themeId: string, svg: string): void {
    const key = createCacheKey(source, themeId);

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, svg);

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.entries.delete(oldestKey);
    }
  }
}

export const mermaidCache = new MermaidCache();
