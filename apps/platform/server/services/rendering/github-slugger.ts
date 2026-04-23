/*
 * Story 0 scaffold.
 * This lightweight slugger intentionally keeps the same API shape later stories
 * will use without pulling vendor code into the repo before the render pipeline
 * itself lands.
 */

export class GithubSlugger {
  private readonly seen = new Map<string, number>();

  slug(value: string): string {
    const base = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const occurrence = this.seen.get(base) ?? 0;
    this.seen.set(base, occurrence + 1);
    return occurrence === 0 ? base : `${base}-${occurrence}`;
  }

  reset(): void {
    this.seen.clear();
  }
}
