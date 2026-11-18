import { CATALOG, isLive } from './_catalog.js';

// Public list of what is currently for sale, so the pages can reveal their pay buttons.
// If Stripe is not configured, nothing is reported and every pay button stays hidden.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(200).json({ items: [] });
  const items = Object.entries(CATALOG)
    .filter(([, v]) => isLive(v))
    .map(([id, v]) => ({ id, kind: v.kind, name: v.name, amount: v.amount, maxQty: v.maxQty }));
  return res.status(200).json({ items });
}
