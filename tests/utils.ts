// Test helpers: a minimal in-memory Supabase mock and a fake Request builder.
// The mock intentionally implements only the query patterns the actions use.

type Row = Record<string, unknown>;

function uuid(): string {
  // jsdom + Node exposes crypto.randomUUID
  return globalThis.crypto.randomUUID();
}

class MockQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  private op: "select" | "insert" | "delete" = "select";
  private insertRows: Row[] = [];
  private returnInserted = false;
  private filtersEq: Array<[string, unknown]> = [];
  private filtersIn: Array<[string, unknown[]]> = [];
  private orderKey: string | null = null;
  private orderAsc = true;

  constructor(
    private db: Record<string, Row[]>,
    private table: string,
  ) {}

  select(_cols = "*"): this {
    if (this.op === "insert") this.returnInserted = true;
    else this.op = "select";
    return this;
  }

  insert(row: Row | Row[]): this {
    this.op = "insert";
    this.insertRows = Array.isArray(row) ? row : [row];
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  eq(key: string, value: unknown): this {
    this.filtersEq.push([key, value]);
    return this;
  }

  in(key: string, values: unknown[]): this {
    this.filtersIn.push([key, values]);
    return this;
  }

  order(key: string, opts: { ascending: boolean }): this {
    this.orderKey = key;
    this.orderAsc = opts.ascending;
    return this;
  }

  single(): Promise<{ data: Row | null; error: { message: string } | null }> {
    return Promise.resolve(this.runSingle("single"));
  }

  maybeSingle(): Promise<{
    data: Row | null;
    error: { message: string } | null;
  }> {
    return Promise.resolve(this.runSingle("maybeSingle"));
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: unknown;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return (
      this.filtersEq.every(([k, v]) => row[k] === v) &&
      this.filtersIn.every(([k, vs]) => vs.includes(row[k]))
    );
  }

  private run(): { data: unknown; error: null } {
    if (this.op === "insert") {
      const stamped = this.insertRows.map((r) => ({
        id: r.id ?? uuid(),
        created_at: r.created_at ?? new Date().toISOString(),
        updated_at: r.updated_at ?? new Date().toISOString(),
        ...r,
      }));
      this.db[this.table] ??= [];
      this.db[this.table].push(...stamped);
      return {
        data: this.returnInserted ? stamped : null,
        error: null,
      };
    }
    if (this.op === "delete") {
      const before = this.db[this.table] ?? [];
      this.db[this.table] = before.filter((r) => !this.matches(r));
      return { data: null, error: null };
    }
    // select
    let rows = (this.db[this.table] ?? []).filter((r) => this.matches(r));
    if (this.orderKey) {
      const key = this.orderKey;
      rows = [...rows].sort((a, b) => {
        const av = a[key] as string | number;
        const bv = b[key] as string | number;
        if (av === bv) return 0;
        return this.orderAsc ? (av > bv ? 1 : -1) : av > bv ? -1 : 1;
      });
    }
    return { data: rows, error: null };
  }

  private runSingle(mode: "single" | "maybeSingle"): {
    data: Row | null;
    error: { message: string } | null;
  } {
    const result = this.run();
    if (this.op === "insert") {
      const inserted = (result.data as Row[]) ?? [];
      if (inserted.length === 0) {
        return mode === "maybeSingle"
          ? { data: null, error: null }
          : { data: null, error: { message: "no rows" } };
      }
      return { data: inserted[0], error: null };
    }
    const rows = (result.data as Row[]) ?? [];
    if (rows.length === 0) {
      return mode === "maybeSingle"
        ? { data: null, error: null }
        : { data: null, error: { message: "no rows" } };
    }
    return { data: rows[0], error: null };
  }
}

export type MockSupabase = {
  from: (table: string) => MockQuery;
  db: Record<string, Row[]>;
  seed: (table: string, rows: Row[]) => void;
};

export function createMockSupabase(): MockSupabase {
  const db: Record<string, Row[]> = {
    groups: [],
    members: [],
    expenses: [],
    expense_shares: [],
  };
  return {
    db,
    from: (table: string) => new MockQuery(db, table),
    seed: (table, rows) => {
      db[table] ??= [];
      db[table].push(...rows);
    },
  };
}

export function makeRequest(
  fields: Record<string, string | string[] | null | undefined>,
): { formData: () => Promise<FormData> } {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.append(k, v);
  }
  return { formData: async () => fd };
}
