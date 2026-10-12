import { DatabaseSync, StatementSync } from 'node:sqlite';
import type { DatabaseAdapter } from './database-adapter.js';

export class SqliteDatabaseAdapter implements DatabaseAdapter {
  private db: DatabaseSync;
  private stmtCache = new Map<string, StatementSync>();

  constructor(filePathOrDb: string | DatabaseSync) {
    if (typeof filePathOrDb === 'string') {
      this.db = new DatabaseSync(filePathOrDb);
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    } else {
      this.db = filePathOrDb;
    }
  }

  private getStmt(sql: string): StatementSync {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.getStmt(sql);
    return stmt.all(...params) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.getStmt(sql);
    const result = stmt.get(...params);
    return (result as T) ?? null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const stmt = this.getStmt(sql);
    const info = stmt.run(...params);
    return {
      changes: Number(info.changes),
      lastInsertRowid: info.lastInsertRowid,
    };
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT;');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // Ignored if already closed
    }
  }

  getRawDb(): DatabaseSync {
    return this.db;
  }
}

export function createInMemoryDbAdapter(): SqliteDatabaseAdapter {
  return new SqliteDatabaseAdapter(new DatabaseSync(':memory:'));
}

