import type { DatabaseAdapter } from '@ketvong/db';

let dbInstance: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (!dbInstance) throw new Error('Database runtime chưa được khởi tạo.');
  return dbInstance;
}

export function setDbForRuntime(database: DatabaseAdapter): void {
  dbInstance = database;
}

export function setDbForTesting(mockDb: DatabaseAdapter): void {
  dbInstance = mockDb;
}

