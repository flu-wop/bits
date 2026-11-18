import { beforeEach, describe, expect, it } from 'vitest';
import type { Client } from '@libsql/client';
import { freshDb } from './helpers';
import { migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { createEvent, deleteTicketType, getEvent, listEvents, saveTicketType, setEventStatus, updateEvent } from '@/lib/events';
import { listDepositOffers, saveDepositOffer } from '@/lib/deposits';
import { rateLimit } from '@/lib/rate-limit';

let c: Client;
beforeEach(async () => { c = await freshDb(); });

describe('schema + seed', () => {
  it('seeds three disabled deposit offers and one placeholder draft event', async () => {
    const offers = await listDepositOffers(c);
    expect(offers.map((o) => o.key)).toEqual(['discovery', 'event-ops', 'residency']);
    expect(offers.every((o) => !o.enabled && o.amountCents === null)).toBe(true);
    const events = await listEvents(c);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ slug: 'first-ticketed-event', status: 'draft' });
    expect(events[0].ticketTypes).toHaveLength(1);
    expect(events[0].ticketTypes[0]).toMatchObject({ name: 'General Admission', enabled: false, priceCents: null, capacity: null });
  });
  it('is idempotent (seed and migrate can run again)', async () => {
    await migrate(c); await seed(c); await seed(c);
    expect(await listDepositOffers(c)).toHaveLength(3);
    expect(await listEvents(c)).toHaveLength(1);
  });
  it('the database itself refuses an enabled ticket type or offer without price/capacity/amount', async () => {
    const e = (await listEvents(c))[0];
    await expect(c.execute({ sql: 'UPDATE ticket_types SET enabled = 1 WHERE id = ?', args: [e.ticketTypes[0].id] })).rejects.toThrow();
    await expect(c.execute("UPDATE deposit_offers SET enabled = 1 WHERE key = 'discovery'")).rejects.toThrow();
    await expect(c.execute("UPDATE deposit_offers SET amount_cents = 10 WHERE key = 'discovery'")).rejects.toThrow();
  });
});

describe('events', () => {
  it('creates with unique slugs', async () => {
    const a = await createEvent('Sunset Showcase'); const b = await createEvent('Sunset Showcase');
    expect(a.ok && b.ok).toBe(true);
    const events = await listEvents(c);
    expect(events.map((e) => e.slug)).toEqual(expect.arrayContaining(['sunset-showcase', 'sunset-showcase-2']));
    expect((await createEvent('   ')).ok).toBe(false);
  });
  it('updates details and validates them', async () => {
    const { id } = (await createEvent('Night One')) as { ok: true; id: string };
    const good = { title: 'Night One', slug: 'night-one', startsAt: '2027-03-05T19:30', timezone: 'America/Chicago', venue: 'The Venue', description: 'hi' };
    expect(await updateEvent(id, good)).toEqual({ ok: true });
    expect((await getEvent(id))?.startsAt).toBe('2027-03-05T19:30');
    expect((await updateEvent(id, { ...good, slug: 'Bad Slug' })).ok).toBe(false);
    expect((await updateEvent(id, { ...good, slug: 'first-ticketed-event' })).ok).toBe(false);
    expect((await updateEvent(id, { ...good, timezone: 'Mars/Base' })).ok).toBe(false);
    expect((await updateEvent(id, { ...good, startsAt: 'soon' })).ok).toBe(false);
  });
  it('cannot publish the placeholder, can publish once complete, and can archive', async () => {
    const e = (await listEvents(c))[0];
    const blocked = await setEventStatus(e.id, 'published');
    expect(blocked.ok).toBe(false);
    expect(blocked.ok === false && blocked.error).toMatch(/placeholder/);
    await updateEvent(e.id, { title: 'Sunset Showcase 2027', slug: 'sunset-showcase-2027', startsAt: '2027-03-05T19:30', timezone: 'America/Chicago', venue: 'The Venue', description: '' });
    expect((await setEventStatus(e.id, 'published')).ok).toBe(false); // no enabled ticket type yet
    const t = e.ticketTypes[0];
    expect(await saveTicketType(e.id, t.id, { name: 'General Admission', priceCents: 3500, capacity: 120, maxPerOrder: 6, salesOpen: null, salesClose: null, enabled: true })).toEqual({ ok: true });
    expect(await setEventStatus(e.id, 'published')).toEqual({ ok: true });
    expect((await getEvent(e.id))?.status).toBe('published');
    expect(await setEventStatus(e.id, 'archived')).toEqual({ ok: true });
  });
});

describe('ticket types', () => {
  it('adds, edits, refuses enabling without price, deletes', async () => {
    const e = (await listEvents(c))[0];
    const input = { name: 'VIP', priceCents: null, capacity: null, maxPerOrder: 4, salesOpen: null, salesClose: null, enabled: false };
    expect(await saveTicketType(e.id, null, input)).toEqual({ ok: true });
    expect((await saveTicketType(e.id, null, { ...input, enabled: true })).ok).toBe(false);
    const vip = (await getEvent(e.id))!.ticketTypes.find((t) => t.name === 'VIP')!;
    expect(await saveTicketType(e.id, vip.id, { ...input, priceCents: 9000, capacity: 20, enabled: true })).toEqual({ ok: true });
    expect((await getEvent(e.id))!.ticketTypes.find((t) => t.id === vip.id)).toMatchObject({ priceCents: 9000, capacity: 20, enabled: true });
    expect(await deleteTicketType(e.id, vip.id)).toEqual({ ok: true });
  });
  it('cannot edit or delete a ticket type through another event', async () => {
    const e = (await listEvents(c))[0]; const other = (await createEvent('Other')) as { id: string };
    const t = e.ticketTypes[0];
    expect((await deleteTicketType(other.id, t.id)).ok).toBe(false);
    expect((await saveTicketType(other.id, t.id, { name: 'x', priceCents: null, capacity: null, maxPerOrder: 1, salesOpen: null, salesClose: null, enabled: false })).ok).toBe(false);
  });
  it('refuses to delete a ticket type that has orders', async () => {
    const e = (await listEvents(c))[0]; const t = e.ticketTypes[0];
    await c.execute({ sql: "INSERT INTO orders (id, kind, status, amount_cents, created_at) VALUES ('o1','ticket','paid',3500,'2027-01-01')", args: [] });
    await c.execute({ sql: "INSERT INTO order_items (id, order_id, ticket_type_id, qty, unit_cents) VALUES ('i1','o1',?,1,3500)", args: [t.id] });
    const r = await deleteTicketType(e.id, t.id);
    expect(r.ok).toBe(false);
  });
});

describe('deposit offers', () => {
  it('needs an amount to be switched on', async () => {
    const [d] = await listDepositOffers(c);
    expect((await saveDepositOffer(d.id, { label: d.label, amountCents: null, enabled: true })).ok).toBe(false);
    expect(await saveDepositOffer(d.id, { label: d.label, amountCents: 25000, enabled: true })).toEqual({ ok: true });
    expect((await listDepositOffers(c))[0]).toMatchObject({ amountCents: 25000, enabled: true });
    expect((await saveDepositOffer(d.id, { label: d.label, amountCents: 99_999_999, enabled: false })).ok).toBe(false);
  });
});

describe('rate limit', () => {
  it('allows the limit, blocks beyond it, resets after the window', async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(await rateLimit(c, 'k', 3, 60, t0 + i)).toBe(true);
    expect(await rateLimit(c, 'k', 3, 60, t0 + 10)).toBe(false);
    expect(await rateLimit(c, 'other', 3, 60, t0 + 10)).toBe(true);
    expect(await rateLimit(c, 'k', 3, 60, t0 + 61_000)).toBe(true);
  });
});
