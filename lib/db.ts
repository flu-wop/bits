import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { MIGRATIONS } from '@/db/migrations';
import { seed } from '@/lib/seed';

// One client per server instance. Production uses Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
// Without those, development falls back to a local SQLite file at .data/bits.db (same libSQL API).
let ready: Promise<Client> | null = null;

export function newClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  if (process.env.NODE_ENV === 'production') throw new Error('TURSO_DATABASE_URL is not set');
  fs.mkdirSync(path.join(process.cwd(), '.data'), { recursive: true });
  return createClient({ url: 'file:' + path.join(process.cwd(), '.data', 'bits.db') });
}

export async function migrate(client: Client) {
  await client.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const done = new Set((await client.execute('SELECT version FROM schema_migrations')).rows.map((r) => Number(r.version)));
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    await client.executeMultiple(m.sql);
    await client.execute({ sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', args: [m.version, m.name, new Date().toISOString()] });
  }
}

export async function prepare(client: Client) {
  await client.execute('PRAGMA foreign_keys = ON').catch(() => {});
  await migrate(client);
  await seed(client);
  return client;
}

export function db(): Promise<Client> {
  ready ??= prepare(newClient());
  return ready;
}

/** Tests inject an in-memory client. */
export function __setDb(client: Client | null) {
  ready = client ? Promise.resolve(client) : null;
}
