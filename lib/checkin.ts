import type { Client } from '@libsql/client';
import { db } from '@/lib/db';

export type CheckinResult =
  | { ok: true; status: 'checked_in'; holder: string | null; ticketType: string; event: string }
  | { ok: false; status: 'already' | 'unknown' | 'void'; checkedInAt?: string; holder?: string | null; event?: string };

/** Pulls the ticket code out of whatever the scanner or typist gives us (a ticket URL or the bare code). */
export function extractCode(input: string): string {
  const t = input.trim();
  const m = t.match(/\/ticket\/([A-Za-z0-9_-]{16,64})/);
  return m ? m[1] : t;
}

/** Marks a ticket as used. One conditional UPDATE, so two scanners hitting the same code can't both succeed. */
export async function checkIn(input: string, c?: Client, now = Date.now()): Promise<CheckinResult> {
  const client = c ?? (await db());
  const code = extractCode(input);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) return { ok: false, status: 'unknown' };
  const t = (await client.execute({
    sql: `SELECT t.id, t.holder_name, t.checked_in_at, o.status AS order_status, tt.name AS type_name, e.title
          FROM tickets t JOIN orders o ON o.id = t.order_id JOIN ticket_types tt ON tt.id = t.ticket_type_id JOIN events e ON e.id = tt.event_id WHERE t.code = ?`,
    args: [code],
  })).rows[0];
  if (!t) return { ok: false, status: 'unknown' };
  if (t.order_status !== 'paid') return { ok: false, status: 'void', holder: (t.holder_name as string) ?? null, event: String(t.title) };
  const r = await client.execute({ sql: 'UPDATE tickets SET checked_in_at = ? WHERE id = ? AND checked_in_at IS NULL', args: [new Date(now).toISOString(), t.id] });
  if (r.rowsAffected === 0) return { ok: false, status: 'already', checkedInAt: String(t.checked_in_at ?? ''), holder: (t.holder_name as string) ?? null, event: String(t.title) };
  return { ok: true, status: 'checked_in', holder: (t.holder_name as string) ?? null, ticketType: String(t.type_name), event: String(t.title) };
}

export async function undoCheckIn(ticketId: string, c?: Client) {
  const client = c ?? (await db());
  await client.execute({ sql: 'UPDATE tickets SET checked_in_at = NULL WHERE id = ?', args: [ticketId] });
}

export async function listOrders(c?: Client, limit = 200) {
  const client = c ?? (await db());
  return (await client.execute({
    sql: `SELECT o.id, o.kind, o.status, o.email, o.name, o.amount_cents, o.created_at, o.paid_at, o.emailed_at, o.notes,
                 (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id) AS tickets,
                 (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id AND t.checked_in_at IS NOT NULL) AS used
          FROM orders o WHERE o.status <> 'held' OR o.created_at > ? ORDER BY o.created_at DESC LIMIT ?`,
    args: [new Date(Date.now() - 3600_000).toISOString(), limit],
  })).rows;
}

export async function attendees(eventId: string, c?: Client) {
  const client = c ?? (await db());
  return (await client.execute({
    sql: `SELECT t.id, t.code, t.holder_name, t.checked_in_at, tt.name AS type_name, o.email, o.name AS buyer, o.status, o.paid_at
          FROM tickets t JOIN ticket_types tt ON tt.id = t.ticket_type_id JOIN orders o ON o.id = t.order_id
          WHERE tt.event_id = ? ORDER BY o.paid_at, t.rowid`,
    args: [eventId],
  })).rows;
}

/** CSV with spreadsheet-formula injection neutralised (a buyer's name can't run as a formula in Excel). */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
