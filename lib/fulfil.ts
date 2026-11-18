import type { Client } from '@libsql/client';
import QRCode from 'qrcode';
import { sendMail } from '@/lib/email';
import { beginWrite, newTicketCode, takenSeats } from '@/lib/orders';
import { formatLocal } from '@/lib/time';

// Webhook side: everything here must be safe to run twice (Stripe retries) and safe out of order.

export interface StripeEventLike { id: string; type: string; data: { object: Record<string, any> } }
export interface RefunderLike { refunds: { create(p: { payment_intent: string; reason?: string }, o?: { idempotencyKey?: string }): Promise<unknown> } }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function handleStripeEvent(client: Client, ev: StripeEventLike, deps: { stripe: RefunderLike; siteUrl: string; now?: number }): Promise<{ handled: boolean; duplicate?: boolean; orderId?: string }> {
  const now = deps.now ?? Date.now(); const iso = new Date(now).toISOString();
  // Record the event first; a second delivery of the same id changes nothing.
  const ins = await client.execute({ sql: 'INSERT OR IGNORE INTO stripe_events (event_id, type, processed_at) VALUES (?, ?, ?)', args: [ev.id, ev.type, iso] });
  if (ins.rowsAffected === 0) return { handled: false, duplicate: true };
  try {
    const obj = ev.data.object;
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      if (obj.payment_status !== 'paid') return { handled: false };
      const orderId = obj.metadata?.order_id as string | undefined;
      if (!orderId) return { handled: false };
      const done = await markPaid(client, orderId, {
        sessionId: String(obj.id), paymentIntent: obj.payment_intent ? String(obj.payment_intent) : null,
        email: (obj.customer_details?.email ?? obj.customer_email ?? null) as string | null, name: (obj.customer_details?.name ?? null) as string | null,
      }, deps, now);
      if (done) await sendOrderEmail(client, orderId, deps.siteUrl, now);
      return { handled: true, orderId };
    }
    if (ev.type === 'checkout.session.expired') {
      const orderId = obj.metadata?.order_id as string | undefined;
      if (orderId) await client.execute({ sql: "UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'held'", args: [orderId] });
      return { handled: true, orderId };
    }
    if (ev.type === 'charge.refunded') {
      const pi = obj.payment_intent ? String(obj.payment_intent) : null;
      if (pi && obj.refunded === true) await client.execute({ sql: "UPDATE orders SET status = 'refunded' WHERE payment_intent_id = ? AND status = 'paid'", args: [pi] });
      return { handled: true };
    }
    return { handled: false };
  } catch (e) {
    // Let Stripe retry: forget the event so the retry is processed.
    await client.execute({ sql: 'DELETE FROM stripe_events WHERE event_id = ?', args: [ev.id] }).catch(() => {});
    throw e;
  }
}

/** Marks the order paid and creates its tickets, atomically. Returns true when this call did the work. */
async function markPaid(client: Client, orderId: string, p: { sessionId: string; paymentIntent: string | null; email: string | null; name: string | null }, deps: { stripe: RefunderLike }, now: number): Promise<boolean> {
  const tx = await beginWrite(client);
  let oversold = false;
  try {
    const o = (await tx.execute({ sql: 'SELECT id, kind, status FROM orders WHERE id = ?', args: [orderId] })).rows[0];
    if (!o || o.status === 'paid' || o.status === 'refunded') { await tx.rollback(); return false; }
    const items = (await tx.execute({ sql: 'SELECT ticket_type_id, qty FROM order_items WHERE order_id = ?', args: [orderId] })).rows;
    if (o.kind === 'ticket' && o.status === 'expired') {
      // The hold lapsed before payment landed: only honour it if the seats are still free.
      for (const it of items) {
        const cap = (await tx.execute({ sql: 'SELECT capacity FROM ticket_types WHERE id = ?', args: [it.ticket_type_id] })).rows[0];
        if (Number(cap.capacity) - (await takenSeats(tx, String(it.ticket_type_id), now, orderId)) < Number(it.qty)) oversold = true;
      }
    }
    const iso = new Date(now).toISOString();
    if (oversold) {
      await tx.execute({ sql: "UPDATE orders SET status = 'refunded', email = ?, name = ?, payment_intent_id = ?, stripe_session_id = COALESCE(stripe_session_id, ?), notes = 'sold out while paying: refunded automatically' WHERE id = ?", args: [p.email, p.name, p.paymentIntent, p.sessionId, orderId] });
      await tx.commit();
      if (p.paymentIntent) await deps.stripe.refunds.create({ payment_intent: p.paymentIntent, reason: 'requested_by_customer' }, { idempotencyKey: `oversold-${orderId}` });
      return false;
    }
    await tx.execute({ sql: "UPDATE orders SET status = 'paid', paid_at = ?, email = ?, name = ?, payment_intent_id = ?, stripe_session_id = COALESCE(stripe_session_id, ?) WHERE id = ?", args: [iso, p.email, p.name, p.paymentIntent, p.sessionId, orderId] });
    if (o.kind === 'ticket') {
      for (const it of items) for (let i = 0; i < Number(it.qty); i++) {
        await tx.execute({ sql: 'INSERT INTO tickets (id, order_id, ticket_type_id, code, holder_name, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [crypto.randomUUID(), orderId, it.ticket_type_id, newTicketCode(), p.name, iso] });
      }
    }
    await tx.commit();
    return true;
  } catch (e) { try { await tx.rollback(); } catch { /* closed */ } throw e; } finally { tx.close(); }
}

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 360 });
}

/** Sends the confirmation (tickets with QR codes, or a deposit receipt). Safe to call twice: it skips if already sent unless forced. */
export async function sendOrderEmail(client: Client, orderId: string, siteUrl: string, now = Date.now(), force = false): Promise<boolean> {
  const o = (await client.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] })).rows[0];
  if (!o || o.status !== 'paid' || !o.email) return false;
  if (o.emailed_at && !force) return false;
  const money = `$${(Number(o.amount_cents) / 100).toFixed(2)}`;
  let subject: string, text: string, html: string;
  if (o.kind === 'ticket') {
    const rows = (await client.execute({ sql: `SELECT t.code, tt.name AS type_name, e.title, e.starts_at, e.venue, e.policy FROM tickets t JOIN ticket_types tt ON tt.id = t.ticket_type_id JOIN events e ON e.id = tt.event_id WHERE t.order_id = ? ORDER BY t.rowid`, args: [orderId] })).rows;
    if (!rows.length) return false;
    const ev = rows[0]; const when = formatLocal((ev.starts_at as string) ?? null);
    subject = `Your tickets: ${ev.title}`;
    const links = rows.map((r, i) => `Ticket ${i + 1} (${r.type_name}): ${siteUrl}/ticket/${r.code}`).join('\n');
    text = `You're in. ${ev.title}\n${when}${ev.venue ? `\n${ev.venue}` : ''}\n\nShow the QR code on each ticket at the door:\n${links}\n\nTotal paid: ${money}\n${ev.policy ? `\n${ev.policy}\n` : ''}\nBreaks In The Simulation`;
    const blocks: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const url = `${siteUrl}/ticket/${rows[i].code}`;
      const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', margin: 1, width: 360 });
      blocks.push(`<div style="margin:20px 0;padding:16px;border:2px solid #111"><p style="margin:0 0 8px"><strong>Ticket ${i + 1}</strong> · ${esc(String(rows[i].type_name))}</p><img alt="QR code for ticket ${i + 1}" width="180" height="180" src="data:image/png;base64,${png.toString('base64')}"><p style="margin:8px 0 0"><a href="${esc(url)}">Open ticket</a></p></div>`);
    }
    html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:560px"><h1 style="font-size:22px">You're in.</h1><p><strong>${esc(String(ev.title))}</strong><br>${esc(when)}${ev.venue ? `<br>${esc(String(ev.venue))}` : ''}</p><p>Show the QR code on each ticket at the door. Some email apps hide images: the “Open ticket” link always works.</p>${blocks.join('')}<p>Total paid: ${money}</p>${ev.policy ? `<p>${esc(String(ev.policy))}</p>` : ''}<p>Breaks In The Simulation</p></div>`;
  } else {
    const item = (await client.execute({ sql: 'SELECT d.label FROM order_items oi JOIN deposit_offers d ON d.id = oi.deposit_offer_id WHERE oi.order_id = ?', args: [orderId] })).rows[0];
    subject = 'We received your deposit';
    text = `Thank you. We received your deposit of ${money}${item ? ` for ${item.label}` : ''}.\n\nWe'll be in touch shortly to start your project.\n\nDeposits are non-refundable once work begins and are fully applied to your package. Full terms: breaksinthesimulation.com/terms\n\nBreaks In The Simulation`;
    html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:560px"><h1 style="font-size:22px">Thank you.</h1><p>We received your deposit of ${money}${item ? ` for ${esc(String(item.label))}` : ''}. We'll be in touch shortly to start your project.</p><p>Deposits are non-refundable once work begins and are fully applied to your package. <a href="https://breaksinthesimulation.com/terms">Full terms</a></p><p>Breaks In The Simulation</p></div>`;
  }
  const r = await sendMail({ to: String(o.email), subject, text, html });
  if (r.delivered || process.env.NODE_ENV !== 'production') await client.execute({ sql: 'UPDATE orders SET emailed_at = ? WHERE id = ?', args: [new Date(now).toISOString(), orderId] });
  return r.delivered;
}
