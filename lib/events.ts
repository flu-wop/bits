import type { Client } from '@libsql/client';
import { db } from '@/lib/db';
import {
  SLUG_RE, TIMEZONES, checkTicketType, cleanText, parseLocalDateTime, publishBlockers, slugify, type Result, type TicketTypeInput,
} from '@/lib/validate';

export type EventRow = {
  id: string; slug: string; title: string; startsAt: string | null; timezone: string; venue: string; description: string; policy: string;
  status: 'draft' | 'published' | 'archived'; createdAt: string; updatedAt: string;
};
export type TicketTypeRow = {
  id: string; eventId: string; name: string; priceCents: number | null; capacity: number | null; maxPerOrder: number;
  salesOpen: string | null; salesClose: string | null; enabled: boolean; sort: number;
};

const toEvent = (r: Record<string, unknown>): EventRow => ({
  id: String(r.id), slug: String(r.slug), title: String(r.title), startsAt: (r.starts_at as string) ?? null, timezone: String(r.timezone),
  venue: String(r.venue), description: String(r.description), policy: String(r.policy ?? ''), status: r.status as EventRow['status'], createdAt: String(r.created_at), updatedAt: String(r.updated_at),
});
const toType = (r: Record<string, unknown>): TicketTypeRow => ({
  id: String(r.id), eventId: String(r.event_id), name: String(r.name), priceCents: r.price_cents == null ? null : Number(r.price_cents),
  capacity: r.capacity == null ? null : Number(r.capacity), maxPerOrder: Number(r.max_per_order), salesOpen: (r.sales_open as string) ?? null,
  salesClose: (r.sales_close as string) ?? null, enabled: Number(r.enabled) === 1, sort: Number(r.sort),
});

export async function listEvents(c?: Client) {
  const client = c ?? (await db());
  const events = (await client.execute('SELECT * FROM events ORDER BY CASE status WHEN \'published\' THEN 0 WHEN \'draft\' THEN 1 ELSE 2 END, COALESCE(starts_at, \'9999\') ASC, created_at DESC')).rows.map(toEvent);
  const types = (await client.execute('SELECT * FROM ticket_types ORDER BY sort, rowid')).rows.map(toType);
  return events.map((e) => ({ ...e, ticketTypes: types.filter((t) => t.eventId === e.id) }));
}

export async function getEvent(id: string, c?: Client) {
  const client = c ?? (await db());
  const r = await client.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [id] });
  if (!r.rows.length) return null;
  const types = (await client.execute({ sql: 'SELECT * FROM ticket_types WHERE event_id = ? ORDER BY sort, rowid', args: [id] })).rows.map(toType);
  return { ...toEvent(r.rows[0]), ticketTypes: types };
}

async function uniqueSlug(client: Client, base: string, exceptId?: string) {
  for (let i = 1; i < 200; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const r = await client.execute({ sql: 'SELECT id FROM events WHERE slug = ?', args: [slug] });
    if (!r.rows.length || String(r.rows[0].id) === exceptId) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createEvent(title: string, c?: Client): Promise<Result<{ id: string }>> {
  const client = c ?? (await db());
  const t = cleanText(title, 120, 'Title', true);
  if (!t.ok) return t;
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const slug = await uniqueSlug(client, slugify(t.value));
  await client.execute({ sql: 'INSERT INTO events (id, slug, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', args: [id, slug, t.value, 'draft', now, now] });
  return { ok: true, id };
}

export type EventFields = { title: string; slug: string; startsAt: string; timezone: string; venue: string; description: string; policy?: string };

export async function updateEvent(id: string, f: EventFields, c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const title = cleanText(f.title, 120, 'Title', true); if (!title.ok) return title;
  const venue = cleanText(f.venue, 160, 'Venue'); if (!venue.ok) return venue;
  const desc = cleanText(f.description, 2000, 'Description'); if (!desc.ok) return desc;
  const policy = cleanText(f.policy ?? '', 600, 'Ticket policy'); if (!policy.ok) return policy;
  const when = parseLocalDateTime(f.startsAt); if (!when.ok) return when;
  if (!(TIMEZONES as readonly string[]).includes(f.timezone)) return { ok: false, error: 'Pick a timezone from the list.' };
  const slug = f.slug.trim();
  if (!SLUG_RE.test(slug) || slug.length > 60) return { ok: false, error: 'Web address may use lowercase letters, numbers and single hyphens (60 max).' };
  const taken = await client.execute({ sql: 'SELECT id FROM events WHERE slug = ? AND id <> ?', args: [slug, id] });
  if (taken.rows.length) return { ok: false, error: 'Another event already uses that web address.' };
  const r = await client.execute({
    sql: 'UPDATE events SET title=?, slug=?, starts_at=?, timezone=?, venue=?, description=?, policy=?, updated_at=? WHERE id=?',
    args: [title.value, slug, when.value, f.timezone, venue.value, desc.value, policy.value, new Date().toISOString(), id],
  });
  return r.rowsAffected ? { ok: true } : { ok: false, error: 'Event not found.' };
}

export async function setEventStatus(id: string, status: EventRow['status'], c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const e = await getEvent(id, client);
  if (!e) return { ok: false, error: 'Event not found.' };
  if (status === 'published') {
    const blockers = publishBlockers({ title: e.title, startsAt: e.startsAt, venue: e.venue, ticketTypes: e.ticketTypes });
    if (blockers.length) return { ok: false, error: 'Not ready to publish: ' + blockers.join(' ') };
  }
  await client.execute({ sql: 'UPDATE events SET status=?, updated_at=? WHERE id=?', args: [status, new Date().toISOString(), id] });
  return { ok: true };
}

export async function saveTicketType(eventId: string, typeId: string | null, t: TicketTypeInput, c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const name = cleanText(t.name, 80, 'Name', true); if (!name.ok) return name;
  const problem = checkTicketType({ ...t, name: name.value });
  if (problem) return { ok: false, error: problem };
  if (!(await getEvent(eventId, client))) return { ok: false, error: 'Event not found.' };
  if (typeId) {
    const r = await client.execute({
      sql: 'UPDATE ticket_types SET name=?, price_cents=?, capacity=?, max_per_order=?, sales_open=?, sales_close=?, enabled=? WHERE id=? AND event_id=?',
      args: [name.value, t.priceCents, t.capacity, t.maxPerOrder, t.salesOpen, t.salesClose, t.enabled ? 1 : 0, typeId, eventId],
    });
    return r.rowsAffected ? { ok: true } : { ok: false, error: 'Ticket type not found.' };
  }
  const sort = Number((await client.execute({ sql: 'SELECT COALESCE(MAX(sort),0)+1 AS n FROM ticket_types WHERE event_id=?', args: [eventId] })).rows[0].n);
  await client.execute({
    sql: 'INSERT INTO ticket_types (id, event_id, name, price_cents, capacity, max_per_order, sales_open, sales_close, enabled, sort) VALUES (?,?,?,?,?,?,?,?,?,?)',
    args: [crypto.randomUUID(), eventId, name.value, t.priceCents, t.capacity, t.maxPerOrder, t.salesOpen, t.salesClose, t.enabled ? 1 : 0, sort],
  });
  return { ok: true };
}

export async function deleteTicketType(eventId: string, typeId: string, c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const used = await client.execute({ sql: 'SELECT 1 FROM order_items WHERE ticket_type_id = ? LIMIT 1', args: [typeId] });
  if (used.rows.length) return { ok: false, error: 'This ticket type has orders. Switch it off instead of deleting it.' };
  const r = await client.execute({ sql: 'DELETE FROM ticket_types WHERE id=? AND event_id=?', args: [typeId, eventId] });
  return r.rowsAffected ? { ok: true } : { ok: false, error: 'Ticket type not found.' };
}
