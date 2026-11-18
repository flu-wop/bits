import Stripe from 'stripe';
import { CATALOG, DEPOSIT_TERMS, isLive } from './_catalog.js';

const SITE_HOSTS = ['breaksinthesimulation.com', 'www.breaksinthesimulation.com'];

// The browser only says WHICH item and how many. Price, name and redirect URLs come from the server.
export function makeHandler({ getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY), catalog = CATALOG } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'payments are not enabled yet' });

    // same-site requests only (production domain, or the deployment's own host for previews)
    let originHost = '';
    try { originHost = new URL(req.headers.origin || '').host; } catch { /* no origin */ }
    const host = req.headers.host || '';
    const okOrigin = originHost && (SITE_HOSTS.includes(originHost) || originHost === host);
    if (!okOrigin) return res.status(403).json({ error: 'origin' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad request' });

    const id = String(body.item || '');
    const item = Object.prototype.hasOwnProperty.call(catalog, id) ? catalog[id] : null;
    if (!isLive(item)) return res.status(404).json({ error: 'not available' });

    const qty = body.qty === undefined ? 1 : body.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > (item.maxQty || 1)) return res.status(400).json({ error: 'quantity' });
    if (item.kind === 'deposit' && body.agree !== true) return res.status(400).json({ error: 'agree to the deposit terms first' });

    const base = `https://${originHost}`;
    try {
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: qty, price_data: { currency: 'usd', unit_amount: item.amount, product_data: { name: item.name } } }],
        metadata: { item: id, kind: item.kind, qty: String(qty) },
        payment_intent_data: { metadata: { item: id, kind: item.kind, qty: String(qty) } },
        custom_text: item.kind === 'deposit' ? { submit: { message: DEPOSIT_TERMS } } : undefined,
        success_url: `${base}/thanks?item=${encodeURIComponent(id)}`,
        cancel_url: `${base}${item.cancelPath || '/'}`,
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('checkout.sessions.create failed', err && err.type, err && err.code);
      return res.status(502).json({ error: 'could not start checkout' });
    }
  };
}

export default makeHandler();
