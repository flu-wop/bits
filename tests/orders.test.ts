import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import Stripe from 'stripe';
import { __setDb, prepare } from '@/lib/db';
import { __setMailer, type Mail } from '@/lib/email';
import { getCatalog, releaseExpiredHolds, startDepositCheckout, startTicketCheckout, takenSeats, HOLD_MS, DEPOSIT_TERMS } from '@/lib/orders';
import { handleStripeEvent, type StripeEventLike } from '@/lib/fulfil';
import { checkIn, extractCode, toCsv } from '@/lib/checkin';

const tmp: string[] = [];
async function fileDb(): Promise<Client> {
  const f = path.join(os.tmpdir(), `bits-test-${crypto.randomUUID()}.db`); tmp.push(f);
  const c = createClient({ url: 'file:' + f });
  await prepare(c); __setDb(c); return c;
}
afterEach(() => { for (const f of tmp.splice(0)) for (const x of [f, f + '-wal', f + '-shm']) fs.rmSync(x, { force: true }); __setMailer(null); });

let c: Client; let typeId: string; let mails: Mail[]; let sessions: Record<string, unknown>[]; let refunds: string[];
const NOW = Date.UTC(2027, 0, 10, 15, 0);
const fakeStripe = (failing = false) => ({
  checkout: { sessions: { async create(p: Record<string, unknown>) { if (failing) throw new Error('stripe down'); sessions.push(p); return { id: `cs_test_${sessions.length}_${'x'.repeat(12)}`, url: 'https://checkout.stripe.test/s' }; } } },
  refunds: { async create(p: { payment_intent: string }) { refunds.push(p.payment_intent); return {}; } },
});
const ctx = (over: { failing?: boolean; now?: number } = {}) => ({ client: c, stripe: fakeStripe(over.failing), siteUrl: 'https://example.test', now: over.now ?? NOW });

async function publishWith(opts: { price?: number; capacity?: number; max?: number; open?: string | null; close?: string | null; startsAt?: string } = {}) {
  const e = (await c.execute('SELECT id FROM events LIMIT 1')).rows[0];
  await c.execute({ sql: "UPDATE events SET status='published', starts_at=?, timezone='UTC', venue='The Hall', policy='All sales final.' WHERE id=?", args: [opts.startsAt ?? '2027-03-01T19:00', e.id] });
  typeId = String((await c.execute({ sql: 'SELECT id FROM ticket_types WHERE event_id=?', args: [e.id] })).rows[0].id);
  await c.execute({ sql: 'UPDATE ticket_types SET price_cents=?, capacity=?, max_per_order=?, sales_open=?, sales_close=?, enabled=1 WHERE id=?', args: [opts.price ?? 3500, opts.capacity ?? 5, opts.max ?? 4, opts.open ?? null, opts.close ?? null, typeId] });
}
const paidEvent = (orderId: string, id = `evt_${crypto.randomUUID()}`, extra: Record<string, unknown> = {}): StripeEventLike => ({
  id, type: 'checkout.session.completed',
  data: { object: { id: `cs_test_${orderId}`, payment_status: 'paid', payment_intent: `pi_${orderId}`, metadata: { order_id: orderId }, customer_details: { email: 'fan@example.com', name: 'Pat Fan' }, ...extra } },
});
const deps = (now = NOW) => ({ stripe: fakeStripe(), siteUrl: 'https://example.test', now });

beforeEach(async () => { c = await fileDb(); mails = []; sessions = []; refunds = []; __setMailer(async (m) => { mails.push(m); return { delivered: true }; }); await publishWith(); });

describe('ticket checkout', () => {
  it('prices on the server and holds the seats', async () => {
    const r = await startTicketCheckout({ ticketTypeId: typeId, qty: 2 }, ctx());
    expect(r.ok).toBe(true);
    const s = sessions[0] as any;
    expect(s.line_items[0]).toMatchObject({ quantity: 2, price_data: { unit_amount: 3500, currency: 'usd' } });
    expect(s.metadata.kind).toBe('ticket');
    expect(s.expires_at).toBeGreaterThan(NOW / 1000 + 30 * 60);
    expect(await takenSeats(c, typeId, NOW)).toBe(2);
    const o = (await c.execute('SELECT * FROM orders')).rows[0];
    expect(o).toMatchObject({ status: 'held', amount_cents: 7000 });
  });
  it('refuses invalid, disabled, draft and out-of-window requests', async () => {
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 0 }, ctx())).ok).toBe(false);
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 1.5 }, ctx())).ok).toBe(false);
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: '2' }, ctx())).ok).toBe(false);
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 5 }, ctx())).ok).toBe(false);
    expect((await startTicketCheckout({ ticketTypeId: 'nope', qty: 1 }, ctx())).ok).toBe(false);
    await c.execute('UPDATE ticket_types SET enabled = 0');
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).toMatchObject({ ok: false, status: 404 });
    await c.execute('UPDATE ticket_types SET enabled = 1');
    await c.execute("UPDATE events SET status = 'draft'");
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).toMatchObject({ ok: false, status: 404 });
    expect(sessions).toHaveLength(0);
  });
  it('respects the sales window and event start (in the event timezone)', async () => {
    await publishWith({ open: '2027-01-11T00:00' });
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).toMatchObject({ ok: false, status: 409 });
    await publishWith({ close: '2027-01-10T14:00' });
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).toMatchObject({ ok: false, status: 409 });
    await publishWith({ startsAt: '2027-01-10T10:00' });
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).toMatchObject({ ok: false, status: 409 });
  });
  it('never oversells under concurrent buyers (8 buyers, 3 seats)', async () => {
    await publishWith({ capacity: 3, max: 1 });
    const rs = await Promise.all(Array.from({ length: 8 }, () => startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())));
    expect(rs.filter((r) => r.ok)).toHaveLength(3);
    expect(rs.filter((r) => !r.ok).every((r) => !r.ok && r.error === 'Sold out.')).toBe(true);
    expect(await takenSeats(c, typeId, NOW)).toBe(3);
  });
  it('a multi-ticket order cannot exceed what is left', async () => {
    await publishWith({ capacity: 5, max: 4 });
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 4 }, ctx())).ok).toBe(true);
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 2 }, ctx())).toMatchObject({ ok: false, error: 'Only 1 left.' });
  });
  it('abandoned holds free their seats once they expire', async () => {
    await publishWith({ capacity: 2, max: 2 });
    await startTicketCheckout({ ticketTypeId: typeId, qty: 2 }, ctx());
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).ok).toBe(false);
    const later = NOW + HOLD_MS + 1000;
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx({ now: later }))).ok).toBe(true);
    expect(await releaseExpiredHolds(c, later)).toBe(1);
  });
  it('frees the seats at once if Stripe cannot create the session', async () => {
    await publishWith({ capacity: 1, max: 1 });
    expect(await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx({ failing: true }))).toMatchObject({ ok: false, status: 502 });
    expect((await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())).ok).toBe(true);
  });
  it('catalog hides unpriced/disabled items and reports seats left', async () => {
    await startTicketCheckout({ ticketTypeId: typeId, qty: 2 }, ctx());
    const cat = await getCatalog(c, NOW);
    expect(cat.events[0].ticketTypes[0]).toMatchObject({ left: 3, soldOut: false, onSale: true, priceCents: 3500 });
    await c.execute('UPDATE ticket_types SET enabled = 0');
    expect((await getCatalog(c, NOW)).events).toHaveLength(0);
    expect((await getCatalog(c, NOW)).deposits).toHaveLength(0);
  });
});

describe('deposit checkout', () => {
  beforeEach(async () => { await c.execute("UPDATE deposit_offers SET amount_cents = 50000, enabled = 1 WHERE key = 'discovery'"); });
  it('uses the admin-set amount, ignores anything from the browser, and needs agreement', async () => {
    expect(await startDepositCheckout({ offerKey: 'discovery', agree: false }, ctx())).toMatchObject({ ok: false, status: 400 });
    expect(await startDepositCheckout({ offerKey: 'residency', agree: true }, ctx())).toMatchObject({ ok: false, status: 404 });
    expect((await startDepositCheckout({ offerKey: 'discovery', agree: true, amount: 1 } as never, ctx())).ok).toBe(true);
    const s = sessions[0] as any;
    expect(s.line_items[0].price_data.unit_amount).toBe(50000);
    expect(s.custom_text.submit.message).toBe(DEPOSIT_TERMS);
  });
});

describe('webhook', () => {
  async function held(qty = 2) { const r = await startTicketCheckout({ ticketTypeId: typeId, qty }, ctx()); if (!r.ok) throw new Error(r.error); return r.orderId; }
  it('marks paid, makes unique tickets, emails QR codes', async () => {
    const id = await held(2);
    await handleStripeEvent(c, paidEvent(id), deps());
    expect((await c.execute({ sql: 'SELECT status, email FROM orders WHERE id=?', args: [id] })).rows[0]).toMatchObject({ status: 'paid', email: 'fan@example.com' });
    const codes = (await c.execute('SELECT code FROM tickets')).rows.map((r) => String(r.code));
    expect(codes).toHaveLength(2); expect(new Set(codes).size).toBe(2); expect(codes.every((x) => x.length >= 22)).toBe(true);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe('fan@example.com');
    expect(mails[0].text).toContain(`https://example.test/ticket/${codes[0]}`);
    expect(mails[0].html).toContain('data:image/png;base64,');
    expect(mails[0].text).toContain('All sales final.');
  });
  it('is idempotent: the same event or a second completion makes no extra tickets or emails', async () => {
    const id = await held(2); const ev = paidEvent(id);
    await handleStripeEvent(c, ev, deps());
    expect(await handleStripeEvent(c, ev, deps())).toMatchObject({ duplicate: true });
    await handleStripeEvent(c, paidEvent(id), deps()); // different event id, same order
    expect((await c.execute('SELECT COUNT(*) AS n FROM tickets')).rows[0].n).toBe(2);
    expect(mails).toHaveLength(1);
  });
  it('ignores unpaid sessions and unknown orders', async () => {
    const id = await held(1);
    await handleStripeEvent(c, paidEvent(id, undefined, { payment_status: 'unpaid' }), deps());
    await handleStripeEvent(c, paidEvent('does-not-exist'), deps());
    expect((await c.execute({ sql: 'SELECT status FROM orders WHERE id=?', args: [id] })).rows[0].status).toBe('held');
    expect((await c.execute('SELECT COUNT(*) AS n FROM tickets')).rows[0].n).toBe(0);
  });
  it('a failed handler lets Stripe retry (event is not marked processed)', async () => {
    const id = await held(1);
    const broken = { ...deps(), stripe: { refunds: { create: async () => { throw new Error('x'); } } } };
    const orig = c.transaction.bind(c);
    (c as any).transaction = async () => { throw new Error('db blip'); };
    const ev = paidEvent(id);
    await expect(handleStripeEvent(c, ev, broken)).rejects.toThrow('db blip');
    (c as any).transaction = orig;
    expect((await c.execute('SELECT COUNT(*) AS n FROM stripe_events')).rows[0].n).toBe(0);
    await handleStripeEvent(c, ev, deps());
    expect((await c.execute({ sql: 'SELECT status FROM orders WHERE id=?', args: [id] })).rows[0].status).toBe('paid');
  });
  it('payment after the hold lapsed: honoured if seats remain, auto-refunded if they were taken', async () => {
    await publishWith({ capacity: 1, max: 1 });
    const a = await held(1);
    await releaseExpiredHolds(c, NOW + HOLD_MS + 1);
    await handleStripeEvent(c, paidEvent(a), deps(NOW + HOLD_MS + 2));
    expect((await c.execute({ sql: 'SELECT status FROM orders WHERE id=?', args: [a] })).rows[0].status).toBe('paid');

    await c.execute('DELETE FROM tickets'); await c.execute('DELETE FROM order_items'); await c.execute('DELETE FROM orders');
    const b = await held(1);
    await releaseExpiredHolds(c, NOW + HOLD_MS + 1);
    const later = NOW + HOLD_MS + 5;
    const r2 = await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx({ now: later }));
    expect(r2.ok).toBe(true);
    await handleStripeEvent(c, paidEvent(b, 'evt_late'), deps(later));
    const row = (await c.execute({ sql: 'SELECT status, notes FROM orders WHERE id=?', args: [b] })).rows[0];
    expect(row.status).toBe('refunded'); expect(String(row.notes)).toContain('refunded automatically');
    expect(refunds).toEqual([`pi_${b}`]);
    expect((await c.execute({ sql: 'SELECT COUNT(*) AS n FROM tickets WHERE order_id = ?', args: [b] })).rows[0].n).toBe(0);
  });
  it('expired session releases the hold; refund event voids the tickets', async () => {
    const id = await held(1);
    await handleStripeEvent(c, { id: 'evt_exp', type: 'checkout.session.expired', data: { object: { metadata: { order_id: id } } } }, deps());
    expect((await c.execute({ sql: 'SELECT status FROM orders WHERE id=?', args: [id] })).rows[0].status).toBe('expired');
    const id2 = await held(1);
    await handleStripeEvent(c, paidEvent(id2), deps());
    await handleStripeEvent(c, { id: 'evt_ref', type: 'charge.refunded', data: { object: { payment_intent: `pi_${id2}`, refunded: true } } }, deps());
    expect((await c.execute({ sql: 'SELECT status FROM orders WHERE id=?', args: [id2] })).rows[0].status).toBe('refunded');
    const code = String((await c.execute({ sql: 'SELECT code FROM tickets WHERE order_id=?', args: [id2] })).rows[0].code);
    expect(await checkIn(code, c)).toMatchObject({ ok: false, status: 'void' });
  });
  it('deposit payment emails a receipt and makes no tickets', async () => {
    await c.execute("UPDATE deposit_offers SET amount_cents = 50000, enabled = 1 WHERE key = 'discovery'");
    const r = await startDepositCheckout({ offerKey: 'discovery', agree: true }, ctx());
    if (!r.ok) throw new Error(r.error);
    await handleStripeEvent(c, paidEvent(r.orderId), deps());
    expect(mails[0].subject).toBe('We received your deposit');
    expect(mails[0].text).toContain('$500.00');
    expect((await c.execute('SELECT COUNT(*) AS n FROM tickets')).rows[0].n).toBe(0);
  });
});

describe('stripe signature (real library)', () => {
  const stripe = new Stripe('sk_test_dummy');
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: {} } });
  it('accepts a correctly signed payload', () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe('evt_1');
  });
  it('rejects a tampered body, a wrong secret and a missing header', () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => stripe.webhooks.constructEvent(payload + ' ', header, secret)).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, header, 'whsec_other')).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, '', secret)).toThrow();
  });
});

describe('check-in', () => {
  it('works once per ticket, also from a pasted URL, even with two scanners at once', async () => {
    const id = (await startTicketCheckout({ ticketTypeId: typeId, qty: 1 }, ctx())) as { orderId: string };
    await handleStripeEvent(c, paidEvent(id.orderId), deps());
    const code = String((await c.execute('SELECT code FROM tickets')).rows[0].code);
    expect(extractCode(`https://example.test/ticket/${code}`)).toBe(code);
    const rs = await Promise.all([checkIn(`https://example.test/ticket/${code}`, c), checkIn(code, c), checkIn(code, c)]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(rs.filter((r) => !r.ok && r.status === 'already')).toHaveLength(2);
    expect(await checkIn('not-a-real-code-1234567890', c)).toMatchObject({ ok: false, status: 'unknown' });
    expect(await checkIn("x'; DROP TABLE tickets;--", c)).toMatchObject({ ok: false, status: 'unknown' });
  });
});

describe('csv', () => {
  it('quotes properly and defuses spreadsheet formulas', () => {
    const csv = toCsv([['a', 'b,c', 'say "hi"'], ['=HYPERLINK("x")', '+1', null]]);
    expect(csv).toBe('a,"b,c","say ""hi"""\r\n"\'=HYPERLINK(""x"")",\'+1,\r\n');
  });
});
