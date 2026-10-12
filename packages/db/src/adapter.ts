// Giữ đường dẫn cũ cho code local/test; implementation Node nằm riêng để
// Worker Cloudflare chỉ import D1 adapter và không kéo node:sqlite vào bundle.
export * from './sqlite-adapter.js';
export type { DatabaseAdapter } from './database-adapter.js';

