import { createClient } from '@libsql/client';
import Stripe from 'stripe';
const base = 'http://127.0.0.1:4310', secret = 'whsec_e2e';
const stripe = new Stripe('sk_test_dummy');
const c = createClient({ url: 'file:.data/bits.db' });
const out = (k, v) => console.log(k.padEnd(44), v);
const j = async (r) => ({ s: r.status, b: await r.text() });

// warm: creates + migrates + seeds the db
await fetch(base + '/api/catalog');
const e = (await c.execute('SELECT id FROM events LIMIT 1')).rows[0];
const t = (await c.execute({ sql: 'SELECT id FROM ticket_types WHERE event_id=?', args: [e.id] })).rows[0];
out('catalog empty before publish', (await j(await fetch(base + '/api/catalog'))).b.slice(0, 60));
await c.execute({ sql: "UPDATE events SET status='published', starts_at='2030-01-01T19:00', policy='All sales final.' WHERE id=?", args: [e.id] });
await c.execute({ sql: 'UPDATE ticket_types SET price_cents=2500, capacity=2, enabled=1 WHERE id=?', args: [t.id] });
out('catalog after publish', (await j(await fetch(base + '/api/catalog'))).b.slice(0, 140));
out('checkout cross-origin -> 403', (await j(await fetch(base + '/api/checkout', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' }))).s);
out('checkout same-origin, bad body -> 400', (await j(await fetch(base + '/api/checkout', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{"kind":"x"}' }))).s);
out('checkout same-origin, dummy Stripe -> 502', (await j(await fetch(base + '/api/checkout', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ticket', ticketTypeId: t.id, qty: 1 }) }))).s);
out('seat freed after Stripe failure', (await c.execute("SELECT status FROM orders ORDER BY created_at DESC LIMIT 1")).rows[0].status);
out('webhook unsigned -> 400', (await j(await fetch(base + '/api/webhook', { method: 'POST', body: '{}' }))).s);
out('webhook bad signature -> 400', (await j(await fetch(base + '/api/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=abc' }, body: '{}' }))).s);

const orderId = crypto.randomUUID();
await c.execute({ sql: "INSERT INTO orders (id,kind,status,amount_cents,expires_at,created_at) VALUES (?, 'ticket','held',5000,?,?)", args: [orderId, new Date(Date.now() + 3e6).toISOString(), new Date().toISOString()] });
await c.execute({ sql: 'INSERT INTO order_items (id,order_id,ticket_type_id,qty,unit_cents) VALUES (?,?,?,2,2500)', args: [crypto.randomUUID(), orderId, t.id] });
const payload = JSON.stringify({ id: 'evt_e2e_1', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_e2e_' + 'a'.repeat(12), payment_status: 'paid', payment_intent: 'pi_e2e', metadata: { order_id: orderId }, customer_details: { email: 'fan@example.com', name: 'Pat Fan' } } } });
const send = () => fetch(base + '/api/webhook', { method: 'POST', headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) }, body: payload });
out('webhook signed -> 200', (await j(await send())).s);
out('webhook replay -> 200', (await j(await send())).s);
out('tickets after replay (expect 2)', (await c.execute('SELECT COUNT(*) n FROM tickets')).rows[0].n);
const codes = (await c.execute('SELECT code FROM tickets')).rows.map((r) => r.code);
const tp = await j(await fetch(`${base}/ticket/${codes[0]}`));
out('ticket page', `${tp.s} qr=${tp.b.includes('data:image/png')} noindex=${tp.b.includes('noindex')}`);
out('ticket bad code -> 404', (await j(await fetch(`${base}/ticket/short`))).s);
out('thanks page', (await j(await fetch(`${base}/thanks?session_id=cs_test_e2e_${'a'.repeat(12)}`))).b.includes('Thank you.'));
out('admin orders unauthenticated', (await fetch(base + '/admin/orders', { redirect: 'manual' })).status);
out('attendees.csv unauthenticated -> 401', (await j(await fetch(`${base}/admin/events/${e.id}/attendees.csv`))).s);
out('cron without secret -> 401', (await j(await fetch(base + '/api/cron/release'))).s);
