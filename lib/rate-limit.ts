import type { Client } from '@libsql/client';

/** Fixed-window counter in the database (works across serverless instances). Returns true when the call is allowed. */
export async function rateLimit(client: Client, key: string, limit: number, windowSec: number, now = Date.now()): Promise<boolean> {
  const cutoff = now - windowSec * 1000;
  const r = await client.execute({
    sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
          ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
            window_start = CASE WHEN window_start <= ? THEN ? ELSE window_start END
          RETURNING count`,
    args: [key, now, cutoff, cutoff, now],
  });
  return Number(r.rows[0].count) <= limit;
}
