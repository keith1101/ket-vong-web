import path from 'node:path';
import { SqliteDatabaseAdapter, type DatabaseAdapter } from '@ketvong/db';
import { config } from './config.js';

let dbInstance: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (!dbInstance) {
    dbInstance = new SqliteDatabaseAdapter(path.resolve(config.dbPath));
  }
  return dbInstance;
}

export function setDbForTesting(mockDb: DatabaseAdapter): void {
  dbInstance = mockDb;
}

