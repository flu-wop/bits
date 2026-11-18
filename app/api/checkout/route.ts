import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { stripe, siteUrl, stripeConfigured } from '@/lib/stripe';
import { startTicketCheckout, startDepositCheckout } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  // Same-origin only: a form on another site must not be able to start checkouts through us.
  const origin = req.headers.get('origin');
  if (!origin || origin !== siteUrl()) return json({ error: 'forbidden' }, 403);
  if (!stripeConfigured()) return json({ error: 'Payments are not available yet.' }, 503);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  const client = await db();
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const allowed = await rateLimit(client, `checkout:${ip}`, 8, 600, Date.now());
  if (!allowed) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  const ctx = { client, stripe: stripe() as never, siteUrl: siteUrl() };
  const r = body.kind === 'deposit'
    ? await startDepositCheckout({ offerKey: body.offer, agree: body.agree }, ctx)
    : body.kind === 'ticket' ? await startTicketCheckout({ ticketTypeId: body.ticketTypeId, qty: body.qty }, ctx)
    : { ok: false as const, error: 'bad request', status: 400 };
  return r.ok ? json({ url: r.url }) : json({ error: r.error }, r.status);
}
