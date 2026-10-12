import type { DatabaseAdapter } from './database-adapter.js';

export interface D1ResultMeta {
  changes?: number;
  last_row_id?: number | string;
  [key: string]: unknown;
}

export interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  meta?: D1ResultMeta;
  error?: string;
}

export interface D1ExecResult {
  count?: number;
  duration?: number;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(columnName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T extends D1PreparedStatementLike>(statements: T[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1BatchStatement {
  sql: string;
  params?: unknown[];
}

function assertSuccess(result: { success: boolean; error?: string }): void {
  if (!result.success) {
    throw new Error(result.error || 'D1 không thể thực thi câu lệnh SQL.');
  }
}

function normalizeLastInsertRowid(value: number | string | undefined): number | bigint {
  if (value === undefined) return 0;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : BigInt(value);
}

export class D1DatabaseAdapter implements DatabaseAdapter {
  readonly kind = 'd1' as const;

  constructor(private readonly db: D1DatabaseLike) {}

  private prepare(sql: string, params: unknown[] = []): D1PreparedStatementLike {
    const statement = this.db.prepare(sql);
    return params.length > 0 ? statement.bind(...params) : statement;
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.prepare(sql, params).all<T>();
    assertSuccess(result);
    return result.results || [];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return (await this.prepare(sql, params).first<T>()) ?? null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const result = await this.prepare(sql, params).run();
    assertSuccess(result);
    return {
      changes: Number(result.meta?.changes || 0),
      lastInsertRowid: normalizeLastInsertRowid(result.meta?.last_row_id),
    };
  }

  /**
   * D1 không hỗ trợ transaction callback giống SQLite. Các thao tác cần
   * atomic phải dùng batchExecute(), vì D1 batch được commit/rollback như một
   * transaction duy nhất.
   */
  async transaction<T>(_fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    throw new Error('D1 không hỗ trợ transaction callback; dùng batchExecute() cho thao tác atomic.');
  }

  async batchExecute(statements: D1BatchStatement[]): Promise<Array<{ changes: number; lastInsertRowid: number | bigint }>> {
    const results = await this.db.batch(
      statements.map((statement) => this.prepare(statement.sql, statement.params || []))
    );
    results.forEach(assertSuccess);
    return results.map((result) => ({
      changes: Number(result.meta?.changes || 0),
      lastInsertRowid: normalizeLastInsertRowid(result.meta?.last_row_id),
    }));
  }
}
