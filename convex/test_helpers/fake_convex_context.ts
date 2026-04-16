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

  constructor(private readonly rows: TestDoc[]) {}

  withIndex(_indexName: string, build: (query: EqBuilder) => EqBuilder): FakeQueryBuilder {
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
    if (rows.some((row) => 'updatedAt' in row)) {
      return 'updatedAt';
    }

    if (rows.some((row) => 'createdAt' in row)) {
      return 'createdAt';
    }

    return '_creationTime';
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

export function createFakeConvexContext(seed: SeedTables = {}) {
  const db = new FakeDb(seed);

  return {
    ctx: {
      db,
    },
    db,
  };
}
