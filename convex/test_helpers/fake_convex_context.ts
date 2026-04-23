type TestDoc = {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
};

type SeedTables = Record<string, TestDoc[]>;

type EqBuilder = {
  eq(field: string, value: unknown): EqBuilder;
};

class FakeQueryBuilder {
  private readonly criteria: Array<{ field: string; value: unknown }> = [];
  private direction: 'asc' | 'desc' = 'asc';
  private indexName: string | null = null;

  constructor(private readonly rows: TestDoc[]) {}

  withIndex(indexName: string, build: (query: EqBuilder) => EqBuilder): FakeQueryBuilder {
    this.indexName = indexName;
    const builder: EqBuilder = {
      eq: (field, value) => {
        this.criteria.push({ field, value });
        return builder;
      },
    };

    build(builder);
    return this;
  }

  order(direction: 'asc' | 'desc'): FakeQueryBuilder {
    this.direction = direction;
    return this;
  }

  async take(limit: number): Promise<TestDoc[]> {
    return this.results().slice(0, limit);
  }

  async unique(): Promise<TestDoc | null> {
    const results = this.results();

    if (results.length > 1) {
      throw new Error('Expected at most one matching row.');
    }

    return results[0] ?? null;
  }

  private results(): TestDoc[] {
    const filtered = this.rows.filter((row) =>
      this.criteria.every((criterion) => row[criterion.field] === criterion.value),
    );
    const sortField = this.resolveSortField(filtered);

    return [...filtered].sort((left, right) => {
      const leftValue =
        sortField === '_creationTime' ? left._creationTime : String(left[sortField]);
      const rightValue =
        sortField === '_creationTime' ? right._creationTime : String(right[sortField]);

      if (leftValue === rightValue) {
        return 0;
      }

      const comparison = leftValue < rightValue ? -1 : 1;
      return this.direction === 'asc' ? comparison : -comparison;
    });
  }

  private resolveSortField(rows: TestDoc[]): string {
    const indexedSortField = this.resolveIndexedSortField(rows);

    if (indexedSortField !== null) {
      return indexedSortField;
    }

    if (rows.some((row) => 'updatedAt' in row)) {
      return 'updatedAt';
    }

    if (rows.some((row) => 'createdAt' in row)) {
      return 'createdAt';
    }

    return '_creationTime';
  }

  private resolveIndexedSortField(rows: TestDoc[]): string | null {
    if (this.indexName === null || !this.indexName.startsWith('by_')) {
      return null;
    }

    const normalized = this.indexName.slice('by_'.length);
    const andSegments = normalized.split('_and_');
    const trailingSegment = andSegments[andSegments.length - 1] ?? '';
    const sortField =
      andSegments.length === 1 && trailingSegment.includes('_')
        ? trailingSegment.slice(trailingSegment.lastIndexOf('_') + 1)
        : trailingSegment;

    return sortField.length > 0 && rows.some((row) => sortField in row) ? sortField : null;
  }
}

class FakeDb {
  private readonly tables = new Map<string, Map<string, TestDoc>>();
  private nextId = 1;

  constructor(seed: SeedTables) {
    for (const [tableName, rows] of Object.entries(seed)) {
      const table = new Map<string, TestDoc>();

      for (const row of rows) {
        table.set(row._id, { ...row });
      }

      this.tables.set(tableName, table);
    }
  }

  query(tableName: string): FakeQueryBuilder {
    return new FakeQueryBuilder([...this.getTable(tableName).values()]);
  }

  async get(id: string): Promise<TestDoc | null> {
    for (const table of this.tables.values()) {
      const row = table.get(id);

      if (row !== undefined) {
        return { ...row };
      }
    }

    return null;
  }

  async insert(tableName: string, value: Record<string, unknown>): Promise<string> {
    const id = `${tableName}:${this.nextId++}`;
    const row: TestDoc = {
      _id: id,
      _creationTime: Date.now() + this.nextId,
      ...value,
    };

    this.getTable(tableName).set(id, row);
    return id;
  }

  async patch(id: string, value: Record<string, unknown>): Promise<void> {
    const row = this.lookupRow(id);

    if (row === null) {
      throw new Error(`Row ${id} not found.`);
    }

    Object.assign(row, value);
  }

  async delete(id: string): Promise<void> {
    for (const table of this.tables.values()) {
      if (table.delete(id)) {
        return;
      }
    }

    throw new Error(`Row ${id} not found.`);
  }

  list(tableName: string): TestDoc[] {
    return [...this.getTable(tableName).values()].map((row) => ({ ...row }));
  }

  private lookupRow(id: string): TestDoc | null {
    for (const table of this.tables.values()) {
      const row = table.get(id);

      if (row !== undefined) {
        return row;
      }
    }

    return null;
  }

  private getTable(tableName: string): Map<string, TestDoc> {
    const existing = this.tables.get(tableName);

    if (existing !== undefined) {
      return existing;
    }

    const table = new Map<string, TestDoc>();
    this.tables.set(tableName, table);
    return table;
  }
}

/**
 * In-memory Convex storage stub. Stores `Blob`s keyed by a synthetic
 * storageId. Mirrors the runtime `ctx.storage.*` interface enough for unit
 * tests that exercise file storage round-trip semantics.
 */
class FakeStorage {
  private readonly blobsByStorageId = new Map<string, Blob>();
  private nextStorageId = 1;

  async store(blob: Blob): Promise<string> {
    const storageId = `kg-${this.nextStorageId++}`;
    this.blobsByStorageId.set(storageId, blob);
    return storageId;
  }

  async get(storageId: string): Promise<Blob | null> {
    return this.blobsByStorageId.get(storageId) ?? null;
  }

  async delete(storageId: string): Promise<void> {
    this.blobsByStorageId.delete(storageId);
  }

  async getUrl(storageId: string): Promise<string | null> {
    if (!this.blobsByStorageId.has(storageId)) {
      return null;
    }
    return `fake://storage/${storageId}`;
  }

  list(): string[] {
    return [...this.blobsByStorageId.keys()];
  }
}

export interface FakeConvexFunctionRegistry {
  /**
   * Register a mutation / query / action handler under its canonical Convex
   * reference name (`module:function`). The fake `ctx.runMutation` /
   * `ctx.runQuery` / `ctx.runAction` then resolves
   * `makeFunctionReference(name)` calls back to this handler by reading
   * `Symbol(functionName)` on the reference.
   */
  register(functionName: string, handler: (ctx: unknown, args: unknown) => Promise<unknown>): void;
}

const FUNCTION_NAME_SYMBOL = Symbol.for('functionName');

function readFunctionName(ref: unknown): string | undefined {
  if (ref === null || typeof ref !== 'object') {
    return undefined;
  }
  // Convex's `makeFunctionReference` stores the canonical name on a symbol
  // keyed by the literal string "functionName". Look it up directly first,
  // then fall back to scanning own symbols (in case the symbol identity drifts
  // across versions or module boundaries).
  const direct = (ref as Record<symbol, unknown>)[FUNCTION_NAME_SYMBOL];
  if (typeof direct === 'string') {
    return direct;
  }
  for (const symbol of Object.getOwnPropertySymbols(ref)) {
    if (symbol.description === 'functionName') {
      const value = (ref as Record<symbol, unknown>)[symbol];
      if (typeof value === 'string') {
        return value;
      }
    }
  }
  return undefined;
}

export function createFakeConvexContext(seed: SeedTables = {}) {
  const db = new FakeDb(seed);
  const storage = new FakeStorage();
  const handlersByName = new Map<string, (ctx: unknown, args: unknown) => Promise<unknown>>();

  function resolveHandler(
    ref: unknown,
  ): ((ctx: unknown, args: unknown) => Promise<unknown>) | undefined {
    // Most registered Convex functions expose `_handler` directly when imported
    // as the source binding (e.g. `import { foo } from './module'`).
    const handler = (ref as { _handler?: (ctx: unknown, args: unknown) => Promise<unknown> })
      ._handler;
    if (typeof handler === 'function') {
      return handler;
    }

    // FunctionReference objects carry their canonical name on a symbol.
    const functionName = readFunctionName(ref);
    if (functionName !== undefined) {
      return handlersByName.get(functionName);
    }

    return undefined;
  }

  async function runMutation(ref: unknown, args: unknown): Promise<unknown> {
    const handler = resolveHandler(ref);
    if (handler === undefined) {
      throw new Error(
        'Fake runMutation could not resolve a handler — register the internal binding with createFakeConvexContext().registry.register(name, handler).',
      );
    }
    return handler({ db, storage, runMutation, runQuery, runAction }, args);
  }

  async function runQuery(ref: unknown, args: unknown): Promise<unknown> {
    const handler = resolveHandler(ref);
    if (handler === undefined) {
      throw new Error(
        'Fake runQuery could not resolve a handler — register the internal binding with createFakeConvexContext().registry.register(name, handler).',
      );
    }
    return handler({ db, storage, runMutation, runQuery, runAction }, args);
  }

  async function runAction(ref: unknown, args: unknown): Promise<unknown> {
    const handler = resolveHandler(ref);
    if (handler === undefined) {
      throw new Error(
        'Fake runAction could not resolve a handler — register the internal binding with createFakeConvexContext().registry.register(name, handler).',
      );
    }
    return handler({ db, storage, runMutation, runQuery, runAction }, args);
  }

  const registry: FakeConvexFunctionRegistry = {
    register(functionName, handler) {
      handlersByName.set(functionName, handler);
    },
  };

  return {
    ctx: {
      db,
      storage,
      runMutation,
      runQuery,
      runAction,
    },
    db,
    storage,
    registry,
  };
}
