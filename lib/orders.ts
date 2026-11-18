import { randomBytes } from 'node:crypto';
import type { Client } from '@libsql/client';
import { localNow } from '@/lib/time';

// Checkout: the browser only says WHICH item and how many. Price, name, limits and redirect URLs are decided here.
// Seats are reserved ("held") in the database before Stripe is called, inside one write transaction, so two buyers
// can never take the same last seat. A hold lasts as long as the Stripe session; capacity counts paid orders plus
// unexpired holds, so abandoned checkouts free their seats on their own (the cron job is only housekeeping).

export const SESSION_MS = 31 * 60 * 1000;          // Stripe requires a session to live at least 30 minutes
export const HOLD_MS = SESSION_MS + 60 * 1000;     // the hold outlives the session by a minute, so a payment can't land after release
export const DEPOSIT_TERMS = 'Deposits are non-refundable once work begins and are fully applied to your package. Full terms: breaksinthesimulation.com/terms';

export interface StripeLike {
  checkout: { sessions: { create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<{ id: string; url: string | null }> } };
}
export type CheckoutCtx = { client: Client; stripe: StripeLike; siteUrl: string; now?: number };
export type CheckoutResult = { ok: true; url: string; orderId: string } | { ok: false; error: string; status: number };

type Q = Pick<Client, 'execute'>;
const isoNow = (now: number) => new Date(now).toISOString();
export const newTicketCode = () => randomBytes(16).toString('base64url'); // 128 bits, unguessable

/** Seats taken for a ticket type: paid orders plus holds that have not expired. */
export async function takenSeats(q: Q, ticketTypeId: string, now: number, excludeOrderId?: string): Promise<number> {
  const r = await q.execute({
    sql: `SELECT COALESCE(SUM(oi.qty), 0) AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.ticket_type_id = ? AND o.id <> ? AND (o.status = 'paid' OR (o.status = 'held' AND o.expires_at > ?))`,
    args: [ticketTypeId, excludeOrderId ?? '', isoNow(now)],
  });
  return Number(r.rows[0].n);
}

/** Opens a write transaction, waiting briefly if another writer holds the lock (SQLITE_BUSY). */
export async function beginWrite(client: Client) {
  for (let attempt = 0; ; attempt++) {
    try { return await client.transaction('write'); }
    catch (e) {
      const busy = e instanceof Error && /SQLITE_BUSY|database is locked/i.test(e.message + String((e as { code?: string }).code));
      if (!busy || attempt >= 40) throw e;
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 35));
    }
  }
}

const fail = (error: string, status: number): CheckoutResult => ({ ok: false, error, status });

export async function startTicketCheckout(input: { ticketTypeId: unknown; qty: unknown }, ctx: CheckoutCtx): Promise<CheckoutResult> {
  const { client, stripe, siteUrl } = ctx; const now = ctx.now ?? Date.now();
  if (typeof input.ticketTypeId !== 'string' || !input.ticketTypeId) return fail('not available', 404);
  const qty = input.qty === undefined ? 1 : input.qty;
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) return fail('Choose how many tickets.', 400);

  const r = await client.execute({
    sql: `SELECT tt.id, tt.name, tt.price_cents, tt.capacity, tt.max_per_order, tt.sales_open, tt.sales_close, tt.enabled,
                 e.id AS event_id, e.title, e.slug, e.status, e.timezone, e.starts_at
          FROM ticket_types tt JOIN events e ON e.id = tt.event_id WHERE tt.id = ?`,
    args: [input.ticketTypeId],
  });
  const t = r.rows[0];
  if (!t || t.status !== 'published' || Number(t.enabled) !== 1 || t.price_cents == null || t.capacity == null) return fail('not available', 404);

  const local = localNow(String(t.timezone), now);
  if (t.sales_open && local < String(t.sales_open)) return fail('Ticket sales have not opened yet.', 409);
  if (t.sales_close && local >= String(t.sales_close)) return fail('Ticket sales have closed.', 409);
  if (t.starts_at && local >= String(t.starts_at)) return fail('This event has started.', 409);
  if (qty > Number(t.max_per_order)) return fail(`You can buy up to ${t.max_per_order} per order.`, 400);

  const price = Number(t.price_cents); const amount = price * qty; const orderId = crypto.randomUUID();
  const tx = await beginWrite(client);
  try {
    const left = Number(t.capacity) - (await takenSeats(tx, String(t.id), now));
    if (qty > left) { await tx.rollback(); return fail(left <= 0 ? 'Sold out.' : `Only ${left} left.`, 409); }
    await tx.execute({ sql: "INSERT INTO orders (id, kind, status, amount_cents, expires_at, created_at) VALUES (?, 'ticket', 'held', ?, ?, ?)", args: [orderId, amount, isoNow(now + HOLD_MS), isoNow(now)] });
    await tx.execute({ sql: 'INSERT INTO order_items (id, order_id, ticket_type_id, qty, unit_cents) VALUES (?, ?, ?, ?, ?)', args: [crypto.randomUUID(), orderId, String(t.id), qty, price] });
    await tx.commit();
  } catch (e) { try { await tx.rollback(); } catch { /* already closed */ } throw e; } finally { tx.close(); }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: qty, price_data: { currency: 'usd', unit_amount: price, product_data: { name: `${t.title}: ${t.name}` } } }],
      metadata: { order_id: orderId, kind: 'ticket' },
      payment_intent_data: { metadata: { order_id: orderId, kind: 'ticket' } },
      expires_at: Math.floor((now + SESSION_MS) / 1000),
      success_url: `${siteUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/Programming-Events`,
    }, { idempotencyKey: `order-${orderId}` });
    if (!session.url) throw new Error('no session url');
    await client.execute({ sql: 'UPDATE orders SET stripe_session_id = ? WHERE id = ? AND stripe_session_id IS NULL', args: [session.id, orderId] });
    return { ok: true, url: session.url, orderId };
  } catch (e) {
    await client.execute({ sql: "UPDATE orders SET status = 'expired', notes = 'checkout could not be created' WHERE id = ? AND status = 'held'", args: [orderId] });
    console.error('ticket checkout failed', e instanceof Error ? e.message : e);
    return fail('Could not start checkout. Please try again or email us.', 502);
  }
}

export async function startDepositCheckout(input: { offerKey: unknown; agree: unknown }, ctx: CheckoutCtx): Promise<CheckoutResult> {
  const { client, stripe, siteUrl } = ctx; const now = ctx.now ?? Date.now();
  if (typeof input.offerKey !== 'string') return fail('not available', 404);
  const r = await client.execute({ sql: 'SELECT id, label, amount_cents, enabled FROM deposit_offers WHERE key = ?', args: [input.offerKey] });
  const o = r.rows[0];
  if (!o || Number(o.enabled) !== 1 || o.amount_cents == null) return fail('not available', 404);
  if (input.agree !== true) return fail('Please agree to the deposit terms first.', 400);

  const amount = Number(o.amount_cents); const orderId = crypto.randomUUID();
  const tx = await beginWrite(client);
  try {
    await tx.execute({ sql: "INSERT INTO orders (id, kind, status, amount_cents, expires_at, created_at) VALUES (?, 'deposit', 'held', ?, ?, ?)", args: [orderId, amount, isoNow(now + HOLD_MS), isoNow(now)] });
    await tx.execute({ sql: 'INSERT INTO order_items (id, order_id, deposit_offer_id, qty, unit_cents) VALUES (?, ?, ?, 1, ?)', args: [crypto.randomUUID(), orderId, String(o.id), amount] });
    await tx.commit();
  } catch (e) { try { await tx.rollback(); } catch { /* closed */ } throw e; } finally { tx.close(); }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amount, product_data: { name: String(o.label) } } }],
      metadata: { order_id: orderId, kind: 'deposit' },
      payment_intent_data: { metadata: { order_id: orderId, kind: 'deposit' } },
      custom_text: { submit: { message: DEPOSIT_TERMS } },
      expires_at: Math.floor((now + SESSION_MS) / 1000),
      success_url: `${siteUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/Build-Systems#start-a-project`,
    }, { idempotencyKey: `order-${orderId}` });
    if (!session.url) throw new Error('no session url');
    await client.execute({ sql: 'UPDATE orders SET stripe_session_id = ? WHERE id = ? AND stripe_session_id IS NULL', args: [session.id, orderId] });
    return { ok: true, url: session.url, orderId };
  } catch (e) {
    await client.execute({ sql: "UPDATE orders SET status = 'expired', notes = 'checkout could not be created' WHERE id = ? AND status = 'held'", args: [orderId] });
    console.error('deposit checkout failed', e instanceof Error ? e.message : e);
    return fail('Could not start checkout. Please try again or email us.', 502);
  }
}

/** Housekeeping: marks lapsed holds as expired. Capacity already ignores them, so this only keeps the data tidy. */
export async function releaseExpiredHolds(client: Client, now = Date.now()): Promise<number> {
  const r = await client.execute({ sql: "UPDATE orders SET status = 'expired' WHERE status = 'held' AND expires_at <= ?", args: [isoNow(now)] });
  return r.rowsAffected;
}

/** What the public pages may offer right now (server decides; nothing here is trusted from the browser). */
export async function getCatalog(client: Client, now = Date.now()) {
  const events = (await client.execute("SELECT id, slug, title, starts_at, timezone, venue, description, policy FROM events WHERE status = 'published' ORDER BY COALESCE(starts_at, '9999')")).rows;
  const out = [];
  for (const e of events) {
    const local = localNow(String(e.timezone), now);
    const types = (await client.execute({ sql: 'SELECT * FROM ticket_types WHERE event_id = ? AND enabled = 1 ORDER BY sort, rowid', args: [e.id] })).rows;
    const items = [];
    for (const t of types) {
      if (t.price_cents == null || t.capacity == null) continue;
      const open = !(t.sales_open && local < String(t.sales_open)) && !(t.sales_close && local >= String(t.sales_close)) && !(e.starts_at && local >= String(e.starts_at));
      const left = Math.max(0, Number(t.capacity) - (await takenSeats(client, String(t.id), now)));
      items.push({ id: String(t.id), name: String(t.name), priceCents: Number(t.price_cents), maxPerOrder: Math.min(Number(t.max_per_order), Math.max(left, 1)), left, soldOut: left <= 0, onSale: open });
    }
    if (items.length) out.push({ id: String(e.id), slug: String(e.slug), title: String(e.title), startsAt: (e.starts_at as string) ?? null, timezone: String(e.timezone), venue: String(e.venue), description: String(e.description), policy: String(e.policy), ticketTypes: items });
  }
  const deposits = (await client.execute('SELECT key, label, amount_cents FROM deposit_offers WHERE enabled = 1 AND amount_cents IS NOT NULL ORDER BY sort')).rows
    .map((d) => ({ key: String(d.key), label: String(d.label), amountCents: Number(d.amount_cents) }));
  return { events: out, deposits };
}
