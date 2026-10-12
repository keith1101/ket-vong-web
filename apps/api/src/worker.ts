import { D1DatabaseAdapter, type D1DatabaseLike } from '@ketvong/db/d1';
import { configureConfig } from './config.js';
import { setDbForRuntime } from './db.js';
import { createApp } from './app.js';
import { expireOverdueDonations } from './services/donation-service.js';

export interface WorkerEnv extends Record<string, unknown> {
  DB: D1DatabaseLike;
}

export default {
  async fetch(request: Request, env: WorkerEnv, executionContext: unknown): Promise<Response> {
    configureConfig(env);
    setDbForRuntime(new D1DatabaseAdapter(env.DB));
    return createApp().fetch(request, env, executionContext as never);
  },
  async scheduled(_controller: unknown, env: WorkerEnv, executionContext: { waitUntil?: (promise: Promise<unknown>) => void }) {
    configureConfig(env);
    const database = new D1DatabaseAdapter(env.DB);
    const task = expireOverdueDonations(database);
    if (executionContext?.waitUntil) executionContext.waitUntil(task);
    else await task;
  },
};

