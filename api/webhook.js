import Stripe from 'stripe';

// Stripe needs the exact raw request body to verify its signature.
export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export function makeHandler({ getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_unset') } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(503).end();
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).end();

    let event;
    try {
      event = getStripe().webhooks.constructEvent(await rawBody(req), sig, secret);
    } catch (err) {
      console.error('webhook signature check failed');
      return res.status(400).end();
    }

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.payment_status === 'paid') {
        // Vercel log + Stripe dashboard are the order record. Receipts are sent by Stripe.
        console.log('PAID', JSON.stringify({ id: s.id, item: s.metadata && s.metadata.item, qty: s.metadata && s.metadata.qty,
          amount: s.amount_total, email: s.customer_details && s.customer_details.email }));
      }
    }
    return res.status(200).json({ received: true });
  };
}

export default makeHandler();
